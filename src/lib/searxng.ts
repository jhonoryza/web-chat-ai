import { useStore } from './store';
import { tinyfishFetch } from './tinyfish';
import { trunc } from './utils';

export const DEFAULT_SEARXNG_URL = 'https://sxng.labkita.my.id';

export interface SearxngResult {
  title?: string;
  url?: string;
  snippet?: string;
  date?: string;
}

export async function searxngSearch(baseUrl: string, query: string): Promise<SearxngResult[]> {
  const t0 = performance.now();
  const url = baseUrl + '/search?q=' + encodeURIComponent(query) + '&format=json';
  let res: Response;
  try {
    res = await fetch(url);
  } catch {
    throw new Error('tidak bisa mencapai ' + baseUrl + ' — cek URL / koneksi');
  }
  const ms = performance.now() - t0;
  if (!res.ok) throw new Error('SearXNG HTTP ' + res.status);
  const j = await res.json();
  const results: SearxngResult[] = ((j && j.results) || []).map((r: any) => ({
    title: r.title || '',
    url: r.url || '',
    snippet: r.content || '',
    date: r.publishedDate || undefined,
  }));
  useStore.getState().log({
    type: 'web-search',
    provider: 'SearXNG',
    model: 'search',
    status: 'ok',
    ms,
    http: res.status,
    count: results.length,
    req: trunc('GET ' + baseUrl + '/search?q=' + query.slice(0, 120), 300),
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

export function buildSearxngContext(query: string, results: SearxngResult[]): string {
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

export async function gatherSearxngContext(
  text: string,
  baseUrl: string,
  tinyfishKey: string,
): Promise<string> {
  const results = await searxngSearch(baseUrl, text);
  let ctx = buildSearxngContext(text, results);
  const urls = [...new Set(text.match(URL_RE) || [])].slice(0, 2);
  if (urls.length && tinyfishKey) {
    try {
      const pages = await tinyfishFetch(urls, tinyfishKey);
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
