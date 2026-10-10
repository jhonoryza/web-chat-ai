import { useEffect, useMemo, useRef } from "react";
import type { ReactNode } from "react";
import { useStore, getActiveConversation } from "../lib/store";
import { renderMarkdown, delegateCopyClicks } from "../lib/markdown";
import { MASCOT_DATA_URI } from "../lib/assets";
import type { ChatMessage } from "../lib/types";
import { copyText } from "./dialogs";

function msgText(m: ChatMessage): string {
  if (typeof m.content === "string") return m.content;
  const out: string[] = [];
  for (const p of m.content) {
    if (p.type === "text") out.push(p.text);
  }
  return out.join("\n");
}

function msgImages(m: ChatMessage): string[] {
  if (typeof m.content === "string") return [];
  const out: string[] = [];
  for (const p of m.content) {
    if (p.type === "image_url") out.push(p.image_url.url);
  }
  return out;
}

function MessageView({ m, cursor }: { m: ChatMessage; cursor: boolean }) {
  const isUser = m.role === "user";
  const html = useMemo(
    () =>
      isUser
        ? null
        : renderMarkdown(
            (typeof m.content === "string" ? m.content : msgText(m)) + (cursor ? "▍" : "")
          ),
    [isUser, m.content, cursor]
  );
  const imgs = isUser ? msgImages(m) : [];

  return (
    <div className={"msg " + (isUser ? "user" : "assistant")}>
      <div className={"bubble" + (m.err ? " err" : "")}>
        {isUser ? (
          <>
            {imgs.length > 0 && (
              <div className="imgs">
                {imgs.map((u, i) => (
                  <img key={i} src={u} alt={"attached image " + (i + 1)} loading="lazy" />
                ))}
              </div>
            )}
            <div style={{ whiteSpace: "pre-wrap" }}>{msgText(m)}</div>
          </>
        ) : (
          <div className="md" dangerouslySetInnerHTML={{ __html: html ?? "" }} />
        )}
        <button
          className="copy-btn"
          title="Copy message"
          aria-label="Copy message"
          onClick={(e) => {
            e.stopPropagation();
            copyText(msgText(m));
          }}
        >
          <i className="fa-solid fa-copy" />
        </button>
      </div>
    </div>
  );
}

export function ChatView() {
  const conv = useStore(getActiveConversation);
  const providers = useStore((s) => s.settings.providers);
  const streaming = useStore((s) => s.streaming);
  const openModal = useStore((s) => s.openModal);

  const scrollRef = useRef<HTMLDivElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const nearBottom = useRef(true);
  const convIdRef = useRef<string | null>(null);

  // delegated copy-button handling for code blocks rendered from markdown
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const cleanup = delegateCopyClicks(el);
    if (typeof cleanup === "function") return cleanup;
  }, []);

  // track whether the user is near the bottom
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onScroll = () => {
      nearBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 140;
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  const messages = conv?.messages ?? [];
  const convId = conv?.id ?? null;

  // auto-scroll after every render when near bottom; force on conversation switch
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    if (convIdRef.current !== convId) {
      convIdRef.current = convId;
      el.scrollTop = el.scrollHeight;
      nearBottom.current = true;
      return;
    }
    if (nearBottom.current) el.scrollTop = el.scrollHeight;
  });


  let body: ReactNode = null;
  // Note: when providers exist and there are no messages, <App/> renders
  // <Hero/> instead of <ChatView/>, so only the no-provider onboarding lives here.
  if (messages.length > 0) {
    body = messages.map((m, i) => (
      <MessageView
        key={i}
        m={m}
        cursor={streaming && i === messages.length - 1 && m.role === "assistant" && !m.err}
      />
    ));
  } else if (providers.length === 0) {
      body = (
        <div className="empty">
          <img
            className="mascot"
            src={MASCOT_DATA_URI}
            alt="DeepSea whale logo"
            style={{ width: 88, height: 88, borderRadius: 22, boxShadow: "var(--shadow)" }}
          />
          <h2>Bring your own key</h2>
          <p>
            DeepSea is a privacy-first chat client. No backend, no account, no analytics —
            your API keys and conversations live <b>only in this browser</b>.
          </p>
          <div className="steps">
            <div className="step">
              <span className="n">1</span>
              <span>Add a provider: give it a name, its API base URL and your API key.</span>
            </div>
            <div className="step">
              <span className="n">2</span>
              <span>
                Hit <b>Fetch models</b> to pull its model list, or type any model ID by hand.
              </span>
            </div>
            <div className="step">
              <span className="n">3</span>
              <span>Start chatting. Requests go straight from your browser to the provider.</span>
            </div>
          </div>
          <button
            className="btn primary"
            style={{ maxWidth: 280, margin: "0 auto" }}
            onClick={() => openModal("providers")}
          >
            <i className="fa-solid fa-plug" /> Add your first provider
          </button>
          <div className="cors-note">
            <i className="fa-solid fa-globe" /> <b>CORS note:</b> most cloud providers
            (OpenAI, DeepSeek, OpenRouter, Groq…) already allow browser requests. For a local
            model like Ollama, start it with <b>OLLAMA_ORIGINS=*</b> or the browser will block
            the call.
          </div>
        </div>
      );
  }

  return (
    <div id="messages" ref={scrollRef}>
      <div className="wrap" ref={wrapRef}>
        {body}
      </div>
    </div>
  );
}

export default ChatView;
