import { useStore, getActiveConversation, getActiveProvider } from './store';
import type { ChatMessage, ContentPart } from './types';
import { normalizeBaseURL, mixedBlocked, buildPayload, sendChatStream, redactForLog } from './api';
import { gatherWebContext, TinyfishError } from './tinyfish';
import { gatherSearxngContext, DEFAULT_SEARXNG_URL } from './searxng';
import { trunc } from './utils';
import { toast, promptDialog, promptTinyFishKey } from '../components/dialogs';

function searchFailedNote(m: string): string {
  return (
    '[Pencarian web GAGAL (' +
    m +
    '). Sampaikan ke user dengan jujur bahwa pencarian web gagal dan kamu menjawab tanpa data internet. ' +
    'Jangan mengklaim berhasil browsing.]'
  );
}

function patchLastAssistant(convId: string, patch: Partial<ChatMessage>): void {
  const s = useStore.getState();
  const c = s.conversations.find((x) => x.id === convId);
  if (!c || !c.messages.length) return;
  const idx = c.messages.length - 1;
  const last = c.messages[idx];
  if (last.role !== 'assistant') return;
  s.patchConversation(convId, { messages: [...c.messages.slice(0, idx), { ...last, ...patch }] });
}

export async function sendMessage(): Promise<void> {
  const st = useStore.getState();
  const text = st.composerDraft.trim();
  const images = st.pendingImages;
  if ((!text && !images.length) || st.streaming) return;

  const p = getActiveProvider();
  if (!p) {
    toast('Add a provider first');
    st.openModal('providers');
    return;
  }

  let conv = getActiveConversation();
  if (!conv) {
    st.newConversation();
    conv = getActiveConversation();
  }
  if (!conv) return; // should not happen
  const convId = conv.id;

  let model = useStore.getState().selModelId;
  if (model === '__custom') {
    const mid = await promptDialog({
      title: 'Custom model',
      label: 'Model ID',
      placeholder: 'e.g. deepseek-chat',
      okText: 'Use model',
    });
    if (!mid || !mid.trim()) return;
    model = mid.trim();
    useStore.getState().selectModel(model);
  }
  if (!model) {
    toast('Pick a model first');
    return;
  }

  const parts: ContentPart[] = [];
  if (text) parts.push({ type: 'text', text });
  images.forEach((u) => parts.push({ type: 'image_url', image_url: { url: u } }));
  const content: ChatMessage['content'] =
    parts.length === 1 && parts[0].type === 'text' ? text : parts;

  const isFirstUser = conv.messages.filter((m) => m.role === 'user').length === 0;
  st.pushMessage(convId, { role: 'user', content, ts: Date.now() });
  if (isFirstUser && text) st.patchConversation(convId, { title: text.slice(0, 42) });
  st.setComposerDraft('');
  st.clearPendingImages();

  st.pushMessage(convId, { role: 'assistant', content: '', ts: Date.now() });

  // ---- stream ----
  st.setStreaming(true);
  const aborter = new AbortController();
  st.setAborter(aborter);

  // ---- optional web search (TinyFish / SearXNG) ----
  let searchCtx = '';
  const wss = useStore.getState().settings;
  if (wss.webSearch) {
    if ((wss.searchProvider || 'tinyfish') === 'searxng') {
      const sxBase = (wss.searxngUrl || DEFAULT_SEARXNG_URL).replace(/\/+$/, '');
      try {
        searchCtx = await gatherSearxngContext(text, sxBase, wss.tinyfishKey);
      } catch (e) {
        const m = String((e as Error)?.message ?? e).slice(0, 200);
        useStore.getState().log({
          type: 'web-search',
          provider: 'SearXNG',
          model: 'search',
          status: 'error',
          err: m,
        });
        toast('Web search gagal: ' + m);
        searchCtx = searchFailedNote(m);
      }
    } else {
    let key = useStore.getState().settings.tinyfishKey;
    if (!key) {
      const k = await promptTinyFishKey();
      if (!k) {
        useStore.getState().setWebSearch(false);
        useStore.getState().setStreaming(false);
        return;
      }
      key = k;
      useStore.getState().setTinyfishKey(key);
    }
    try {
      searchCtx = await gatherWebContext(text, key);
    } catch (e) {
      if (e instanceof TinyfishError && e.code === 'BAD_KEY') {
        useStore.getState().log({
          type: 'web-search',
          provider: 'TinyFish',
          model: 'search',
          status: 'error',
          err: 'Invalid API key (HTTP 401/403)',
        });
        toast('TinyFish key ditolak — cek lagi');
        const k2 = await promptTinyFishKey();
        if (k2) {
          useStore.getState().setTinyfishKey(k2);
          try {
            searchCtx = await gatherWebContext(text, k2);
          } catch (e2) {
            const m2 = String((e2 as Error)?.message ?? e2).slice(0, 200);
            useStore.getState().log({
              type: 'web-search',
              provider: 'TinyFish',
              model: 'search',
              status: 'error',
              err: m2,
            });
            toast('Web search gagal: ' + m2);
            searchCtx = searchFailedNote(m2);
          }
        } else {
          useStore.getState().setWebSearch(false);
        }
      } else {
        const m3 = String((e as Error)?.message ?? e).slice(0, 200);
        useStore.getState().log({
          type: 'web-search',
          provider: 'TinyFish',
          model: 'search',
          status: 'error',
          err: m3,
        });
        toast('Web search gagal, lanjut tanpa search');
        searchCtx = searchFailedNote(m3);
      }
    }
    }
  }

  const prov =
    useStore.getState().settings.providers.find((x) => x.id === conv.providerId) ?? p;
  const base = normalizeBaseURL(prov.baseURL);
  const convNow = getActiveConversation();
  const payloadObj = buildPayload(convNow ?? conv, model, searchCtx);
  const rawReq = trunc(JSON.stringify(redactForLog(payloadObj), null, 2));

  let acc = '';
  let rawSample = '';
  const t0 = performance.now();
  try {
    const { usage, rawSample: rs } = await sendChatStream({
      base,
      apiKey: prov.apiKey,
      payload: payloadObj,
      signal: aborter.signal,
      onToken: (tok) => {
        acc += tok;
        useStore.getState().appendStreamToken(tok);
      },
    });
    rawSample = rs;
    useStore.getState().log({
      type: 'chat',
      provider: prov.name,
      model,
      status: 'ok',
      ms: performance.now() - t0,
      http: 200,
      tok: usage ? { pt: usage.prompt_tokens || 0, ct: usage.completion_tokens || 0 } : null,
      req: rawReq,
      res: trunc(acc),
      raw: trunc(rawSample, 3000),
    });
  } catch (e) {
    const err = e as Error;
    if (err && err.name === 'AbortError') {
      useStore.getState().log({
        type: 'chat',
        provider: prov.name,
        model,
        status: 'stopped',
        ms: performance.now() - t0,
        req: rawReq,
        res: trunc(acc),
        raw: trunc(rawSample, 3000),
      });
      if (!acc) useStore.getState().appendStreamToken('(stopped)');
    } else if (err instanceof TypeError) {
      useStore.getState().log({
        type: 'chat',
        provider: prov.name,
        model,
        status: 'error',
        ms: performance.now() - t0,
        req: rawReq,
        err: 'Network error — request never reached the provider. ' + String(err.message || 'fetch failed'),
      });
      patchLastAssistant(convId, {
        err: true,
        content:
          '**Network error** — the request never reached the provider.\n\n' +
          (mixedBlocked(base)
            ? 'The base URL uses **http://** while this page is loaded over **https://** — browsers block that (mixed content).\n\nUse an **https://** endpoint instead.\n\n'
            : 'This usually means the provider blocks browser requests (**CORS**) or the base URL is wrong.\n') +
          'Check the base URL in Providers, and for local models (Ollama) start with `OLLAMA_ORIGINS=*`.\n\n' +
          '`' +
          (err.message || 'fetch failed') +
          '`',
      });
    } else {
      useStore.getState().log({
        type: 'chat',
        provider: prov.name,
        model,
        status: 'error',
        ms: performance.now() - t0,
        req: rawReq,
        err: String(err.message || err).slice(0, 300),
      });
      patchLastAssistant(convId, {
        err: true,
        content: '**Request failed**\n\n`' + (err.message || String(err)) + '`',
      });
    }
  } finally {
    useStore.getState().setStreaming(false);
    useStore.getState().setAborter(null);
  }
  useStore.getState().patchConversation(convId, {});
}

export function stopStream(): void {
  useStore.getState().aborter?.abort();
}
