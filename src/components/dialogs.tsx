import { useEffect, useRef, useSyncExternalStore } from "react";
import type { ReactNode } from "react";

/* =====================================================================
   Promise-based dialogs (confirm / prompt / TinyFish key) — no native
   confirm()/prompt()/alert() anywhere. Render <DialogHost/> once at the
   app root; call confirmDialog()/promptDialog()/promptTinyFishKey()
   from anywhere and await the result.
   Styling reuses the reference index.css classes: .dialog-scrim,
   .dialog, .dialog-btns, .field, .btn, .steps.
   ===================================================================== */

type DialogReq =
  | {
      kind: "confirm";
      title: string;
      message: string;
      okText: string;
      cancelText: string;
      danger: boolean;
      resolve: (v: boolean) => void;
    }
  | {
      kind: "prompt";
      title: string;
      label: string;
      value: string;
      placeholder: string;
      okText: string;
      cancelText: string;
      resolve: (v: string | null) => void;
    }
  | { kind: "tinyfish"; resolve: (v: string | null) => void };

let req: DialogReq | null = null;
const reqSubs = new Set<() => void>();
function setReq(r: DialogReq | null) {
  req = r;
  reqSubs.forEach((fn) => fn());
}
function subscribeReq(fn: () => void) {
  reqSubs.add(fn);
  return () => {
    reqSubs.delete(fn);
  };
}
function getReq() {
  return req;
}

/** Resolve the pending request with its "cancelled" value. */
function cancelCurrent() {
  const cur = req;
  setReq(null);
  if (!cur) return;
  if (cur.kind === "confirm") cur.resolve(false);
  else cur.resolve(null);
}

export function confirmDialog(o: {
  title: string;
  message: string;
  okText?: string;
  cancelText?: string;
  danger?: boolean;
}): Promise<boolean> {
  return new Promise((resolve) => {
    setReq({
      kind: "confirm",
      title: o.title,
      message: o.message,
      okText: o.okText ?? "Delete",
      cancelText: o.cancelText ?? "Cancel",
      danger: o.danger ?? true,
      resolve,
    });
  });
}

export function promptDialog(o: {
  title: string;
  label?: string;
  value?: string;
  placeholder?: string;
  okText?: string;
  cancelText?: string;
}): Promise<string | null> {
  return new Promise((resolve) => {
    setReq({
      kind: "prompt",
      title: o.title,
      label: o.label ?? "",
      value: o.value ?? "",
      placeholder: o.placeholder ?? "",
      okText: o.okText ?? "Save",
      cancelText: o.cancelText ?? "Cancel",
      resolve,
    });
  });
}

/** Modal asking for the TinyFish API key, with how-to steps. */
export function promptTinyFishKey(): Promise<string | null> {
  return new Promise((resolve) => {
    setReq({ kind: "tinyfish", resolve });
  });
}

function Scrim({
  onCancel,
  children,
}: {
  onCancel: () => void;
  children: ReactNode;
}) {
  return (
    <div
      className="dialog-scrim"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      {children}
    </div>
  );
}

export function DialogHost() {
  const r = useSyncExternalStore(subscribeReq, getReq);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const okRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!r) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") cancelCurrent();
    };
    document.addEventListener("keydown", onKey);
    const t = setTimeout(() => {
      if (r.kind === "confirm") okRef.current?.focus();
      else inputRef.current?.focus();
    }, 30);
    return () => {
      document.removeEventListener("keydown", onKey);
      clearTimeout(t);
    };
  }, [r]);

  if (!r) return null;

  if (r.kind === "confirm") {
    const done = (v: boolean) => {
      setReq(null);
      r.resolve(v);
    };
    return (
      <Scrim onCancel={() => done(false)}>
        <div className="dialog" role="alertdialog" aria-modal="true">
          <h3>{r.title}</h3>
          <p className="msg">{r.message}</p>
          <div className="dialog-btns">
            <button className="btn" onClick={() => done(false)}>
              {r.cancelText}
            </button>
            <button
              ref={okRef}
              className={r.danger ? "btn danger-solid" : "btn primary"}
              onClick={() => done(true)}
            >
              {r.okText}
            </button>
          </div>
        </div>
      </Scrim>
    );
  }

  if (r.kind === "prompt") {
    const done = (v: string | null) => {
      setReq(null);
      r.resolve(v);
    };
    const submit = () => done(inputRef.current?.value ?? "");
    return (
      <Scrim onCancel={() => done(null)}>
        <div className="dialog" role="dialog" aria-modal="true">
          <h3>{r.title}</h3>
          <div className="field">
            {r.label ? <label>{r.label}</label> : null}
            <input
              ref={inputRef}
              type="text"
              autoComplete="off"
              spellCheck={false}
              defaultValue={r.value}
              placeholder={r.placeholder}
              onKeyDown={(e) => {
                if (e.key === "Enter") submit();
                e.stopPropagation();
              }}
            />
          </div>
          <div className="dialog-btns">
            <button className="btn" onClick={() => done(null)}>
              {r.cancelText}
            </button>
            <button ref={okRef} className="btn primary" onClick={submit}>
              {r.okText}
            </button>
          </div>
        </div>
      </Scrim>
    );
  }

  // tinyfish
  const done = (v: string | null) => {
    setReq(null);
    r.resolve(v);
  };
  const save = () => {
    const v = inputRef.current?.value.trim() ?? "";
    if (!v) {
      toast("Paste your API key first");
      return;
    }
    done(v);
  };
  return (
    <Scrim onCancel={() => done(null)}>
      <div className="dialog" role="dialog" aria-modal="true">
        <h3>
          <i className="fa-solid fa-globe" style={{ marginRight: 8 }} />
          TinyFish API key
        </h3>
        <p className="sub">
          Web search needs a free TinyFish key. It is stored only in this browser.
        </p>
        <ol className="steps">
          <li>
            Buka{" "}
            <a href="https://agent.tinyfish.ai/" target="_blank" rel="noopener">
              agent.tinyfish.ai
            </a>{" "}
            lalu daftar / login.
          </li>
          <li>
            Copy <b>API key</b> dari dashboard.
          </li>
          <li>
            Tempel di bawah lalu <b>Save</b>.
          </li>
        </ol>
        <div className="field">
          <label>API key</label>
          <input
            ref={inputRef}
            type="password"
            placeholder="Paste key…"
            autoComplete="off"
            onKeyDown={(e) => {
              if (e.key === "Enter") save();
              e.stopPropagation();
            }}
          />
        </div>
        <div className="dialog-btns">
          <button className="btn" onClick={() => done(null)}>
            Cancel
          </button>
          <button ref={okRef} className="btn primary" onClick={save}>
            Save &amp; enable
          </button>
        </div>
      </div>
    </Scrim>
  );
}

/* =====================================================================
   Toaster — <Toaster/> once at app root; toast(msg) from anywhere.
   Reuses #toast / #toast.show styling from index.css.
   ===================================================================== */

let toastData: { id: number; msg: string } | null = null;
const toastSubs = new Set<() => void>();
let toastTimer: ReturnType<typeof setTimeout> | null = null;

export function toast(msg: string) {
  toastData = { id: Date.now(), msg };
  toastSubs.forEach((fn) => fn());
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toastData = null;
    toastSubs.forEach((fn) => fn());
  }, 2300);
}

export function Toaster() {
  const t = useSyncExternalStore(
    (fn) => {
      toastSubs.add(fn);
      return () => {
        toastSubs.delete(fn);
      };
    },
    () => toastData
  );
  return (
    <div id="toast" className={t ? "show" : ""} role="status" aria-live="polite">
      {t?.msg ?? ""}
    </div>
  );
}

/* =====================================================================
   copyText — clipboard with legacy fallback, same behavior as reference.
   ===================================================================== */

export async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    toast("Copied ✓");
  } catch {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand("copy");
      toast("Copied ✓");
    } catch {
      toast("Copy failed");
    }
    ta.remove();
  }
}
