import type { ChatMessage, Conversation } from './types';

export function normalizeBaseURL(u: string | null | undefined): string {
  let s = String(u ?? '').trim().replace(/\/+$/, '');
  if (s && !/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(s)) s = 'http://' + s;
  return s;
}

export function mixedBlocked(u: string | null | undefined): boolean {
  return (
    typeof location !== 'undefined' &&
    location.protocol === 'https:' &&
    /^http:\/\//i.test(u || '')
  );
}

export async function fetchModels(base: string, apiKey: string): Promise<string[]> {
  const headers: Record<string, string> = {};
  if (apiKey) headers['Authorization'] = 'Bearer ' + apiKey;
  const r = await fetch(base + '/models', { headers });
  if (!r.ok) throw new Error('HTTP ' + r.status);
  const j = await r.json();
  const ids: string[] = ((j && j.data) || []).map((x: { id?: string }) => x.id).filter(Boolean).sort();
  return ids;
}

export function redactForLog(obj: unknown): unknown {
  return JSON.parse(
    JSON.stringify(obj, (k, v) => {
      if (k === 'url' && typeof v === 'string' && v.indexOf('data:') === 0) {
        return '[image ~' + Math.round((v.length * 0.75) / 1024) + ' KB — redacted]';
      }
      return v;
    }),
  );
}

export interface ChatPayloadMessage {
  role: string;
  content: ChatMessage['content'];
}

export interface ChatPayload {
  model: string;
  messages: ChatPayloadMessage[];
  stream: boolean;
  stream_options: { include_usage: boolean };
  temperature: number;
  max_tokens?: number;
}

export function buildPayload(conv: Conversation, model: string, searchCtx: string): ChatPayload {
  const msgs: ChatPayloadMessage[] = [];
  if (conv.system && conv.system.trim()) msgs.push({ role: 'system', content: conv.system.trim() });
  conv.messages.forEach((m) => {
    if (m.err) return;
    if (m.role !== 'user' && m.role !== 'assistant') return;
    if (typeof m.content === 'string' && !m.content.trim()) return;
    msgs.push({ role: m.role, content: m.content });
  });
  if (searchCtx) {
    for (let i = msgs.length - 1; i >= 0; i--) {
      if (msgs[i].role !== 'user') continue;
      const c = msgs[i].content;
      if (typeof c === 'string') msgs[i].content = searchCtx + '\n\n---\n\nPertanyaan user:\n' + c;
      else msgs[i].content = [{ type: 'text', text: searchCtx + '\n\n---\n\nPertanyaan user:' }, ...c];
      break;
    }
  }
  const body: ChatPayload = {
    model,
    messages: msgs,
    stream: true,
    stream_options: { include_usage: true },
    temperature: conv.temperature,
  };
  if (conv.maxTokens > 0) body.max_tokens = conv.maxTokens;
  return body;
}

export interface StreamResult {
  usage: { prompt_tokens: number; completion_tokens: number } | null;
  rawSample: string;
}

export async function sendChatStream(opts: {
  base: string;
  apiKey: string;
  payload: ChatPayload;
  signal: AbortSignal;
  onToken: (tok: string) => void;
}): Promise<StreamResult> {
  const { base, apiKey, payload, signal, onToken } = opts;
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (apiKey) headers['Authorization'] = 'Bearer ' + apiKey;
  const res = await fetch(base + '/chat/completions', {
    method: 'POST',
    headers,
    signal,
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    let detail = '';
    try {
      const t = await res.text();
      try {
        detail = JSON.parse(t).error.message || t;
      } catch {
        detail = t;
      }
    } catch {
      detail = '(no response body)';
    }
    throw new Error('HTTP ' + res.status + (detail ? ': ' + String(detail).slice(0, 300) : ''));
  }
  if (!res.body) throw new Error('Empty response body');
  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let buf = '';
  let rawSample = '';
  let usage: StreamResult['usage'] = null;
  for (;;) {
    const r = await reader.read();
    if (r.done) break;
    const chunkText = dec.decode(r.value, { stream: true });
    if (rawSample.length < 3000) rawSample += chunkText;
    buf += chunkText;
    const lines = buf.split('\n');
    buf = lines.pop() ?? '';
    for (const ln of lines) {
      const t = ln.trim();
      if (!t.startsWith('data:')) continue;
      const d = t.slice(5).trim();
      if (d === '[DONE]') continue;
      try {
        const j = JSON.parse(d);
        if (j.usage) usage = j.usage;
        const ch0 = j.choices && j.choices[0];
        const dl = (ch0 && (ch0.delta || ch0.message)) || {};
        const c = dl.content || dl.text;
        if (c) onToken(c);
      } catch {
        /* partial chunk, ignore */
      }
    }
  }
  return { usage, rawSample };
}
