import { useStore } from './store';
import { trunc } from './utils';

export class TinyfishError extends Error {
  code: 'BAD_KEY' | 'NET' | 'RATE' | 'HTTP';
  constructor(code: 'BAD_KEY' | 'NET' | 'RATE' | 'HTTP', message: string) {
    super(message);
    this.code = code;
    this.name = 'TinyfishError';
  }
}

export interface TinyfishResult {
  title?: string;
  url?: string;
  snippet?: string;
  date?: string;
  position?: number;
  site_name?: string;
}

export interface TinyfishPage {
  url: string;
  final_url?: string;
  title?: string;
  text?: string;
}

const TF_SEARCH_URL = 'https://api.search.tinyfish.ai';
const TF_FETCH_URL = 'https://api.fetch.tinyfish.ai';

export async function tinyfishSearch(query: string, apiKey: string): Promise<TinyfishResult[]> {
  const t0 = performance.now();
  let res: Response;
  try {
    res = await fetch(TF_SEARCH_URL + '?query=' + encodeURIComponent(query), {
      headers: { 'X-API-Key': apiKey },
    });
  } catch {
    throw new TinyfishError('NET', 'network unreachable');
  }
  const ms = performance.now() - t0;
  if (res.status === 401 || res.status === 403) throw new TinyfishError('BAD_KEY', 'API key ditolak');
  if (res.status === 429) throw new TinyfishError('RATE', 'rate limit — coba lagi nanti');
  if (!res.ok) throw new TinyfishError('HTTP', 'HTTP ' + res.status);
  const j = await res.json();
  const results: TinyfishResult[] = j.results || [];
  useStore.getState().log({
    type: 'web-search',
    provider: 'TinyFish',
    model: 'search',
    status: 'ok',
    ms,
    http: res.status,
    count: results.length,
    req: trunc('GET ' + TF_SEARCH_URL + '?query=' + query.slice(0, 120), 300),
    res: trunc(
      results
        .slice(0, 5)
        .map((r) => (r.title || '') + ' — ' + (r.url || ''))
        .join('\n'),
      1200,
    ),
  });
  return results;
}

export async function tinyfishFetch(urls: string[], apiKey: string): Promise<TinyfishPage[]> {
  const t0 = performance.now();
  const res = await fetch(TF_FETCH_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-API-Key': apiKey },
    body: JSON.stringify({ urls, format: 'markdown' }),
  });
  if (res.status === 401 || res.status === 403) throw new TinyfishError('BAD_KEY', 'API key ditolak');
  if (!res.ok) throw new TinyfishError('HTTP', 'HTTP ' + res.status);
  const j = await res.json();
  useStore.getState().log({
    type: 'web-fetch',
    provider: 'TinyFish',
    model: 'fetch',
    status: 'ok',
    ms: performance.now() - t0,
    http: res.status,
    count: urls.length,
    req: trunc('POST ' + TF_FETCH_URL + ' ' + JSON.stringify(urls), 300),
    res: '',
  });
  return j.results || [];
}

export function buildSearchContext(query: string, results: TinyfishResult[]): string {
  const dateStr = new Date().toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  let c = '[Konteks pencarian web — query: "' + query + '" | tanggal: ' + dateStr + ']\n';
  results.slice(0, 5).forEach((r, i) => {
    c +=
      '\n' +
      (i + 1) +
      '. ' +
      (r.title || '(tanpa judul)') +
      '\n   ' +
      (r.url || '') +
      '\n   ' +
      String(r.snippet || '').slice(0, 300) +
      (r.date ? ' (' + r.date + ')' : '');
  });
  c +=
    '\n\nInstruksi: data di atas adalah HASIL LIVE dari internet hari ini, bukan training data. ' +
    'Pakai untuk menjawab pertanyaan user di bawah bila relevan, dan sebutkan sumbernya (nama situs). ' +
    'Jangan bilang kamu tidak bisa browsing.';
  return c;
}

const URL_RE = /https?:\/\/[^\s)<>\]]+/g;

export async function gatherWebContext(text: string, apiKey: string): Promise<string> {
  const results = await tinyfishSearch(text, apiKey);
  let ctx = buildSearchContext(text, results);
  const urls = [...new Set(text.match(URL_RE) || [])].slice(0, 2);
  if (urls.length) {
    try {
      const pages = await tinyfishFetch(urls, apiKey);
      pages.forEach((pg) => {
        if (pg && pg.text)
          ctx += '\n\n[Isi halaman: ' + (pg.title || pg.url) + ']\n' + String(pg.text).slice(0, 6000);
      });
    } catch {
      /* lanjut dengan snippets saja */
    }
  }
  return ctx;
}
