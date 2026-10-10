import { useEffect, useRef } from "react";
import type { ChangeEvent, KeyboardEvent } from "react";
import { useStore, getActiveProvider } from "../lib/store";
import { sendMessage, stopStream } from "../lib/chat";
import { promptDialog, promptTinyFishKey, toast } from "./dialogs";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "./ui/dropdown-menu";

function Tick({ on }: { on: boolean }) {
  return (
    <span
      className="flex w-4 flex-none items-center justify-center text-[11px] text-[var(--accent)]"
      style={{ visibility: on ? "visible" : "hidden" }}
    >
      <i className="fa-solid fa-check" />
    </span>
  );
}

export function Composer() {
  const composerDraft = useStore((s) => s.composerDraft);
  const setComposerDraft = useStore((s) => s.setComposerDraft);
  const pendingImages = useStore((s) => s.pendingImages);
  const addPendingImage = useStore((s) => s.addPendingImage);
  const removePendingImage = useStore((s) => s.removePendingImage);
  const streaming = useStore((s) => s.streaming);
  const providers = useStore((s) => s.settings.providers);
  const webSearch = useStore((s) => s.settings.webSearch);
  const searchProvider = useStore((s) => s.settings.searchProvider);
  const tinyfishKey = useStore((s) => s.settings.tinyfishKey);
  const selProviderId = useStore((s) => s.selProviderId);
  const selModelId = useStore((s) => s.selModelId);
  const selectProvider = useStore((s) => s.selectProvider);
  const selectModel = useStore((s) => s.selectModel);
  const setWebSearch = useStore((s) => s.setWebSearch);
  const setTinyfishKey = useStore((s) => s.setTinyfishKey);
  const provider = useStore(getActiveProvider);

  const taRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // autogrow, max 180px
  useEffect(() => {
    const ta = taRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = Math.min(ta.scrollHeight, 180) + "px";
  }, [composerDraft]);

  const processImage = (f: File) => {
    if (!f.type || !f.type.startsWith("image/")) {
      toast("Only images please");
      return;
    }
    const url = URL.createObjectURL(f);
    const img = new Image();
    img.onload = () => {
      const max = 1568;
      const s = Math.min(1, max / Math.max(img.width, img.height));
      const w = Math.max(1, Math.round(img.width * s));
      const h = Math.max(1, Math.round(img.height * s));
      const c = document.createElement("canvas");
      c.width = w;
      c.height = h;
      c.getContext("2d")?.drawImage(img, 0, 0, w, h);
      URL.revokeObjectURL(url);
      addPendingImage(c.toDataURL("image/jpeg", 0.85));
      toast("Image attached");
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      toast("Could not read that image");
    };
    img.src = url;
  };

  const onFiles = (e: ChangeEvent<HTMLInputElement>) => {
    [...(e.target.files ?? [])].forEach(processImage);
    e.target.value = "";
  };

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const toggleSearch = async () => {
    if (webSearch) {
      setWebSearch(false);
      toast("Web search OFF");
      return;
    }
    // TinyFish needs an API key; builtin search is keyless.
    if (searchProvider === "tinyfish" && !tinyfishKey) {
      const k = await promptTinyFishKey();
      if (!k) return;
      setTinyfishKey(k);
    }
    setWebSearch(true);
    toast("Web search ON — " + (searchProvider === "tinyfish" ? "TinyFish" : "Builtin"));
  };

  const customModel = async () => {
    const mid = await promptDialog({
      title: "Custom model",
      label: "Model ID",
      placeholder: "e.g. deepseek-chat",
      okText: "Use model",
    });
    if (mid && mid.trim()) selectModel(mid.trim());
  };

  const models = provider?.models ?? [];
  const customSel = selModelId && !models.includes(selModelId) ? selModelId : null;

  return (
    <div id="composer">
      <div className="wrap">
        <div id="attachBar">
          {pendingImages.map((u, i) => (
            <div className="thumb" key={i}>
              <img src={u} alt={"attachment " + (i + 1)} />
              <button
                title="Remove"
                aria-label="Remove image"
                onClick={() => removePendingImage(i)}
              >
                <i className="fa-solid fa-xmark" />
              </button>
            </div>
          ))}
        </div>
        <div className="composer-box">
          <textarea
            id="composer-input"
            ref={taRef}
            rows={1}
            placeholder="How can I help you today?"
            value={composerDraft}
            disabled={streaming}
            onChange={(e) => setComposerDraft(e.target.value)}
            onKeyDown={onKeyDown}
          />
          <div className="composer-bar">
            <button
              className="tool-btn"
              title="Attach image"
              onClick={() => fileRef.current?.click()}
            >
              <i className="fa-solid fa-plus" />
            </button>
            <button
              className={"ws-toggle" + (webSearch ? " search-on" : "")}
              title={webSearch ? `Web search ON (${searchProvider === "tinyfish" ? "TinyFish" : "Builtin"}) — tap to turn off` : "Search the web"}
              onClick={toggleSearch}
            >
              <i className="fa-solid fa-globe" />
              <span>Web search</span>
            </button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="dd-trigger"
                  aria-label="Provider"
                  disabled={providers.length === 0}
                >
                  <span className="lbl">{provider?.name ?? "No providers"}</span>
                  <i className="fa-solid fa-chevron-down chev" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                {providers.length === 0 ? (
                  <div className="dd-empty">No providers</div>
                ) : (
                  providers.map((p) => (
                    <DropdownMenuItem key={p.id} onSelect={() => selectProvider(p.id)}>
                      <Tick on={p.id === selProviderId} />
                      <span className="line-clamp-2 min-w-0 flex-1">{p.name}</span>
                    </DropdownMenuItem>
                  ))
                )}
              </DropdownMenuContent>
            </DropdownMenu>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="dd-trigger"
                  aria-label="Model"
                  disabled={!provider}
                >
                  <span className="lbl">{selModelId || "Select model"}</span>
                  <i className="fa-solid fa-chevron-down chev" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                {models.length === 0 && !customSel ? (
                  <div className="dd-empty">No models</div>
                ) : (
                  models.map((m) => (
                    <DropdownMenuItem key={m} onSelect={() => selectModel(m)}>
                      <Tick on={m === selModelId} />
                      <span className="line-clamp-2 min-w-0 flex-1">{m}</span>
                    </DropdownMenuItem>
                  ))
                )}
                {customSel && (
                  <DropdownMenuItem onSelect={() => selectModel(customSel)}>
                    <Tick on={true} />
                    <span className="line-clamp-2 min-w-0 flex-1">{customSel} ✓</span>
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={customModel}>
                  <Tick on={false} />
                  <span className="min-w-0 flex-1">Custom model ID…</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <div className="bar-spacer" />
            {streaming ? (
              <button
                className="tool-btn danger"
                title="Stop generating"
                onClick={stopStream}
              >
                <i className="fa-solid fa-stop" />
              </button>
            ) : (
              <button className="send-btn" title="Send" onClick={() => sendMessage()}>
                <i className="fa-solid fa-arrow-up" />
              </button>
            )}
          </div>
        </div>
        <div className="privacy">
          <i className="fa-solid fa-lock" /> Keys &amp; chats never leave this browser —
          except to your provider&apos;s API.
        </div>
      </div>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={onFiles}
      />
    </div>
  );
}

export default Composer;
