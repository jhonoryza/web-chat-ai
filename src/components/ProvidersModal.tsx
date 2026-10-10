import { useState } from "react";
import { useStore } from "../lib/store";
import { fetchModels, normalizeBaseURL, mixedBlocked } from "../lib/api";
import { uid } from "../lib/utils";
import type { Provider } from "../lib/types";
import { confirmDialog, toast } from "./dialogs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "./ui/dialog";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Button } from "./ui/button";

function ProviderForm({
  initial,
  onDone,
}: {
  initial: Provider | null;
  onDone: () => void;
}) {
  const upsertProvider = useStore((s) => s.upsertProvider);
  const log = useStore((s) => s.log);

  const [name, setName] = useState(initial?.name ?? "");
  const [baseURL, setBaseURL] = useState(initial?.baseURL ?? "https://api.openai.com/v1");
  const [apiKey, setApiKey] = useState(initial?.apiKey ?? "");
  const [defaultModel, setDefaultModel] = useState(initial?.defaultModel ?? "");
  const [models, setModels] = useState<string[]>(initial?.models ?? []);
  const [showKey, setShowKey] = useState(false);
  const [status, setStatus] = useState("");

  const mixed = mixedBlocked(normalizeBaseURL(baseURL));

  const onFetch = async () => {
    const base = normalizeBaseURL(baseURL);
    const key = apiKey.trim();
    const pname = name.trim() || "Provider";
    if (!base) {
      setStatus("Enter a base URL first.");
      return;
    }
    setStatus("Fetching…");
    const t0 = performance.now();
    try {
      const ids = await fetchModels(base, key);
      if (!ids.length) {
        setStatus("No models returned.");
        return;
      }
      setModels(ids);
      log({
        type: "models",
        provider: pname,
        status: "ok",
        ms: performance.now() - t0,
        count: ids.length,
        req: "GET " + base + "/models",
      });
      setStatus(`Got ${ids.length} models ✓ — tap one to set it as default.`);
    } catch (e) {
      const msg = String((e as Error)?.message ?? e).slice(0, 300);
      log({
        type: "models",
        provider: pname,
        status: "error",
        ms: performance.now() - t0,
        req: "GET " + base + "/models",
        err: msg,
      });
      setStatus(
        e instanceof TypeError
          ? mixedBlocked(base)
            ? "Blocked: this page is HTTPS but the URL is http:// (mixed content). Use an https:// endpoint."
            : "Could not reach it — check the URL, or CORS may be blocking browser requests."
          : msg
      );
    }
  };

  const onSave = () => {
    const base = normalizeBaseURL(baseURL);
    if (!base) {
      toast("Base URL is required");
      return;
    }
    upsertProvider({
      id: initial?.id ?? uid(),
      name: name.trim() || "Provider",
      baseURL: base,
      apiKey: apiKey.trim(),
      models,
      defaultModel: defaultModel.trim(),
    });
    toast("Provider saved ✓");
    onDone();
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>
          <i className={"fa-solid " + (initial ? "fa-pen" : "fa-plus")} style={{ marginRight: 8 }} />
          {initial ? "Edit provider" : "Add provider"}
        </DialogTitle>
        <DialogDescription>
          Base URL looks like https://api.openai.com/v1 — no trailing /chat/completions.
        </DialogDescription>
      </DialogHeader>
      <div className="field">
        <Label>Name</Label>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. DeepSeek"
        />
      </div>
      <div className="field">
        <Label>Base URL</Label>
        <Input
          value={baseURL}
          onChange={(e) => setBaseURL(e.target.value)}
          placeholder="https://api.openai.com/v1"
          inputMode="url"
        />
        <div className="warn-note" style={{ display: mixed ? "block" : "none" }}>
          <b>Mixed content:</b> this page is served over HTTPS, so your browser will block
          requests to an <b>http://</b> URL. Use an <b>https://</b> endpoint instead.
        </div>
      </div>
      <div className="field">
        <Label>
          API key <span style={{ fontWeight: 400 }}>(stored only in this browser)</span>
        </Label>
        <div className="pw-wrap">
          <Input
            type={showKey ? "text" : "password"}
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="sk-…"
            autoComplete="off"
          />
          <button type="button" title="Show/hide" onClick={() => setShowKey(!showKey)}>
            <i className={showKey ? "fa-solid fa-eye-slash" : "fa-solid fa-eye"} />
          </button>
        </div>
      </div>
      <div className="field">
        <Label>Models</Label>
        <div className="btn-row" style={{ margin: "0 0 8px" }}>
          <Button variant="ghost" type="button" onClick={onFetch}>
            ↻ Fetch models
          </Button>
        </div>
        <div className="model-chips">
          {models.map((id) => (
            <button
              key={id}
              type="button"
              className="chip"
              title="Use as default model"
              onClick={() => {
                setDefaultModel(id);
                toast("Default: " + id);
              }}
            >
              {id}
            </button>
          ))}
        </div>
        <Label style={{ marginTop: 8 }}>
          Default model <span style={{ fontWeight: 400 }}>(or type any ID)</span>
        </Label>
        <Input
          value={defaultModel}
          onChange={(e) => setDefaultModel(e.target.value)}
          placeholder="e.g. deepseek-chat"
        />
      </div>
      <div className="btn-row">
        <Button variant="primary" type="button" style={{ flex: 2 }} onClick={onSave}>
          Save
        </Button>
        <Button variant="ghost" type="button" onClick={onDone}>
          Cancel
        </Button>
      </div>
      {status ? (
        <p className="sub" style={{ margin: "10px 0 0" }}>
          {status}
        </p>
      ) : null}
    </>
  );
}

export function ProvidersModal() {
  const open = useStore((s) => s.modals.providers);
  const closeModal = useStore((s) => s.closeModal);
  const providers = useStore((s) => s.settings.providers);
  const deleteProvider = useStore((s) => s.deleteProvider);
  const [editing, setEditing] = useState<Provider | "new" | null>(null);

  const close = () => {
    setEditing(null);
    closeModal("providers");
  };

  const onDelete = async (p: Provider) => {
    const ok = await confirmDialog({
      title: "Delete provider",
      message: `Delete provider "${p.name}"?`,
    });
    if (ok) deleteProvider(p.id);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) close();
      }}
    >
      <DialogContent>
        {editing ? (
          <ProviderForm
            key={editing === "new" ? "new" : editing.id}
            initial={editing === "new" ? null : editing}
            onDone={() => setEditing(null)}
          />
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>
                <i className="fa-solid fa-plug" style={{ marginRight: 8 }} />
                Providers
              </DialogTitle>
              <DialogDescription>
                Each provider needs a name, base URL and your API key. Keys stay in this
                browser only.
              </DialogDescription>
            </DialogHeader>
            <div>
              {providers.length === 0 && (
                <p className="sub">No providers yet. Add one to start chatting</p>
              )}
              {providers.map((p) => (
                <div className="prov-row" key={p.id}>
                  <div className="pi">
                    <b>{p.name}</b>
                    <span>{p.baseURL}</span>
                  </div>
                  <button className="mini-btn" onClick={() => setEditing(p)}>
                    Edit
                  </button>
                  <button
                    className="mini-btn"
                    aria-label="Delete provider"
                    onClick={() => onDelete(p)}
                  >
                    <i className="fa-solid fa-trash" />
                  </button>
                </div>
              ))}
              <button
                className="btn primary"
                style={{ marginTop: 6 }}
                onClick={() => setEditing("new")}
              >
                <i className="fa-solid fa-plus" /> Add provider
              </button>
              <button
                className="btn ghost"
                style={{ width: "100%", marginTop: 10 }}
                onClick={close}
              >
                Done
              </button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default ProvidersModal;
