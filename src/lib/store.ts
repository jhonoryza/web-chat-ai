import { create } from 'zustand';
import type { ChatMessage, Conversation, LogEntry, Provider, Settings } from './types';
import { db } from './db';
import { uid } from './utils';

const LS_SETTINGS = 'wca_settings_v1';
const LOG_MAX = 200;

export type ModalKey = 'providers' | 'convSettings' | 'backup' | 'webSearch';

const defaultSettings: Settings = {
  theme: 'dark',
  providers: [],
  activeProviderId: null,
  activeConvId: null,
  tinyfishKey: '',
  webSearch: true,
  searchProvider: 'searxng',
  searxngUrl: 'https://sxng.labkita.my.id',
};

function loadInitialSettings(): Settings {
  try {
    const raw = localStorage.getItem(LS_SETTINGS);
    if (raw) {
      const s = JSON.parse(raw);
      if (s && typeof s === 'object') return { ...defaultSettings, ...s };
    }
  } catch {
    /* ignore */
  }
  return { ...defaultSettings };
}

export interface State {
  settings: Settings;
  conversations: Conversation[];
  activeConvId: string | null;
  reqLog: LogEntry[];
  streaming: boolean;
  aborter: AbortController | null;
  logOpen: boolean;
  mobileNavOpen: boolean;
  modals: Record<ModalKey, boolean>;
  pendingImages: string[];
  composerDraft: string;
  selProviderId: string | null;
  selModelId: string;

  initialize: () => Promise<void>;
  setTheme: (t: 'dark' | 'light') => void;
  upsertProvider: (p: Provider) => void;
  deleteProvider: (id: string) => void;
  setActiveProviderId: (id: string | null) => void;
  setTinyfishKey: (k: string) => void;
  setWebSearch: (b: boolean) => void;
  setSearchProvider: (p: 'tinyfish' | 'searxng') => void;
  setSearxngUrl: (u: string) => void;
  newConversation: () => void;
  loadConversation: (id: string) => void;
  deleteConversation: (id: string) => Promise<void>;
  clearAllConversations: () => Promise<void>;
  patchConversation: (id: string, patch: Partial<Conversation>) => void;
  pushMessage: (convId: string, msg: ChatMessage) => void;
  appendStreamToken: (tok: string) => void;
  selectProvider: (id: string) => void;
  selectModel: (id: string) => void;
  log: (e: Partial<LogEntry>) => void;
  clearLog: () => void;
  setStreaming: (b: boolean) => void;
  setAborter: (a: AbortController | null) => void;
  setLogOpen: (b: boolean) => void;
  setMobileNavOpen: (b: boolean) => void;
  openModal: (m: ModalKey) => void;
  closeModal: (m: ModalKey) => void;
  closeAllModals: () => void;
  addPendingImage: (u: string) => void;
  removePendingImage: (i: number) => void;
  clearPendingImages: () => void;
  setComposerDraft: (d: string) => void;
}

const closedModals: Record<ModalKey, boolean> = {
  providers: false,
  convSettings: false,
  backup: false,
  webSearch: false,
};

export const useStore = create<State>()((set, get) => {
  // selProviderId/selModelId mirror the active conversation, else the provider default
  const setSelFromConv = (conv: Conversation | null) => {
    const { settings } = get();
    const p =
      settings.providers.find((x) => x.id === settings.activeProviderId) ||
      settings.providers.find((x) => x.id === conv?.providerId) ||
      settings.providers[0] ||
      null;
    set({
      selProviderId: conv?.providerId ?? p?.id ?? null,
      selModelId: conv?.model || p?.defaultModel || '',
    });
  };

  return {
    settings: loadInitialSettings(),
    conversations: [],
    activeConvId: null,
    reqLog: [],
    streaming: false,
    aborter: null,
    logOpen: false,
    mobileNavOpen: false,
    modals: { ...closedModals },
    pendingImages: [],
    composerDraft: '',
    selProviderId: null,
    selModelId: '',

    initialize: async () => {
      await db.init();
      const conversations = (await db.all()).sort((a, b) => b.updatedAt - a.updatedAt);
      set({ conversations });
      const s0 = get();
      if (!s0.settings.activeProviderId && s0.settings.providers.length) {
        s0.setActiveProviderId(s0.settings.providers[0].id);
      }
      const st = get().settings;
      const conv = conversations.find((c) => c.id === st.activeConvId) || null;
      set({
        activeConvId: conv ? conv.id : null,
        settings: { ...st, activeConvId: conv ? conv.id : null },
      });
      setSelFromConv(conv);
    },

    setTheme: (theme) => set((s) => ({ settings: { ...s.settings, theme } })),

    upsertProvider: (p) =>
      set((s) => {
        const exists = s.settings.providers.some((x) => x.id === p.id);
        const providers = exists
          ? s.settings.providers.map((x) => (x.id === p.id ? p : x))
          : [...s.settings.providers, p];
        return {
          settings: {
            ...s.settings,
            providers,
            activeProviderId: s.settings.activeProviderId ?? p.id,
          },
        };
      }),

    deleteProvider: (id) =>
      set((s) => {
        const providers = s.settings.providers.filter((x) => x.id !== id);
        return {
          settings: {
            ...s.settings,
            providers,
            activeProviderId:
              s.settings.activeProviderId === id ? providers[0]?.id ?? null : s.settings.activeProviderId,
          },
        };
      }),

    setActiveProviderId: (id) => set((s) => ({ settings: { ...s.settings, activeProviderId: id } })),
    setTinyfishKey: (k) => set((s) => ({ settings: { ...s.settings, tinyfishKey: k } })),
    setWebSearch: (b) => set((s) => ({ settings: { ...s.settings, webSearch: b } })),
    setSearchProvider: (p) => set((s) => ({ settings: { ...s.settings, searchProvider: p } })),
    setSearxngUrl: (u) => set((s) => ({ settings: { ...s.settings, searxngUrl: u } })),

    newConversation: () => {
      const st = get().settings;
      const p =
        st.providers.find((x) => x.id === st.activeProviderId) || st.providers[0] || null;
      const c: Conversation = {
        id: uid(),
        title: 'New chat',
        providerId: p ? p.id : null,
        model: p ? p.defaultModel || '' : '',
        system: '',
        temperature: 0.7,
        maxTokens: 0,
        messages: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      set((s) => ({
        conversations: [c, ...s.conversations],
        activeConvId: c.id,
        settings: { ...s.settings, activeConvId: c.id },
      }));
      setSelFromConv(c);
      void db.put(c);
    },

    loadConversation: (id) => {
      const { conversations, settings } = get();
      const c = conversations.find((x) => x.id === id);
      if (!c) return;
      const activeProviderId =
        c.providerId && settings.providers.some((p) => p.id === c.providerId)
          ? c.providerId
          : settings.activeProviderId;
      set({
        activeConvId: id,
        settings: { ...settings, activeConvId: id, activeProviderId },
        mobileNavOpen: false,
      });
      setSelFromConv(c);
    },

    deleteConversation: async (id) => {
      await db.del(id);
      const { conversations, activeConvId, settings } = get();
      const next = conversations.filter((x) => x.id !== id);
      const newActive = activeConvId === id ? next[0]?.id ?? null : activeConvId;
      set({
        conversations: next,
        activeConvId: newActive,
        settings: { ...settings, activeConvId: newActive },
      });
      setSelFromConv(next.find((x) => x.id === newActive) ?? null);
    },

    clearAllConversations: async () => {
      await db.clear();
      const { settings } = get();
      set({
        conversations: [],
        activeConvId: null,
        settings: { ...settings, activeConvId: null },
      });
      setSelFromConv(null);
    },

    patchConversation: (id, patch) => {
      const { conversations } = get();
      const c = conversations.find((x) => x.id === id);
      if (!c) return;
      const next = { ...c, ...patch, updatedAt: Date.now() };
      set({ conversations: conversations.map((x) => (x.id === id ? next : x)) });
      void db.put(next);
    },

    pushMessage: (convId, msg) => {
      const { conversations } = get();
      const c = conversations.find((x) => x.id === convId);
      if (!c) return;
      const next = { ...c, messages: [...c.messages, msg], updatedAt: Date.now() };
      set({ conversations: conversations.map((x) => (x.id === convId ? next : x)) });
      void db.put(next);
    },

    appendStreamToken: (tok) => {
      const { activeConvId, conversations } = get();
      if (!activeConvId) return;
      const c = conversations.find((x) => x.id === activeConvId);
      if (!c || !c.messages.length) return;
      const last = c.messages[c.messages.length - 1];
      if (last.role !== 'assistant' || typeof last.content !== 'string') return;
      const next = {
        ...c,
        messages: [...c.messages.slice(0, -1), { ...last, content: last.content + tok }],
      };
      set({ conversations: conversations.map((x) => (x.id === activeConvId ? next : x)) });
      // no db write during streaming; persisted when the stream finishes
    },

    selectProvider: (id) => {
      const { settings, activeConvId } = get();
      const p = settings.providers.find((x) => x.id === id);
      if (!p) return;
      set({
        selProviderId: id,
        selModelId: p.defaultModel || '',
        settings: { ...settings, activeProviderId: id },
      });
      if (activeConvId) get().patchConversation(activeConvId, { providerId: id, model: p.defaultModel || '' });
    },

    selectModel: (id) => {
      set({ selModelId: id });
      const { activeConvId } = get();
      if (activeConvId) get().patchConversation(activeConvId, { model: id });
    },

    log: (e) =>
      set((s) => {
        const entry: LogEntry = {
          ts: Date.now(),
          type: 'chat',
          provider: '',
          model: '',
          status: 'ok',
          ms: 0,
          http: 0,
          tok: null,
          count: null,
          req: '',
          res: '',
          raw: '',
          err: '',
          ...e,
        };
        const reqLog = [entry, ...s.reqLog];
        if (reqLog.length > LOG_MAX) reqLog.length = LOG_MAX;
        return { reqLog };
      }),

    clearLog: () => set({ reqLog: [] }),
    setStreaming: (b) => set({ streaming: b }),
    setAborter: (a) => set({ aborter: a }),
    setLogOpen: (b) => set({ logOpen: b }),
    setMobileNavOpen: (b) => set({ mobileNavOpen: b }),
    openModal: (m) => set((s) => ({ modals: { ...s.modals, [m]: true } })),
    closeModal: (m) => set((s) => ({ modals: { ...s.modals, [m]: false } })),
    closeAllModals: () => set({ modals: { ...closedModals } }),
    addPendingImage: (u) => set((s) => ({ pendingImages: [...s.pendingImages, u] })),
    removePendingImage: (i) =>
      set((s) => ({ pendingImages: s.pendingImages.filter((_, j) => j !== i) })),
    clearPendingImages: () => set({ pendingImages: [] }),
    setComposerDraft: (d) => set({ composerDraft: d }),
  };
});

// Persist settings to localStorage whenever the settings slice changes.
useStore.subscribe((s, prev) => {
  if (s.settings !== prev.settings) {
    try {
      localStorage.setItem(LS_SETTINGS, JSON.stringify(s.settings));
    } catch {
      /* ignore */
    }
  }
});

export function getActiveConversation(): Conversation | null {
  const s = useStore.getState();
  return s.conversations.find((c) => c.id === s.activeConvId) ?? null;
}

export function getActiveProvider(): Provider | null {
  const s = useStore.getState();
  return (
    s.settings.providers.find((p) => p.id === s.settings.activeProviderId) ||
    s.settings.providers[0] ||
    null
  );
}
