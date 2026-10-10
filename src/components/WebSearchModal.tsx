import { useEffect, useState } from "react";
import { useStore } from "../lib/store";
import { DEFAULT_SEARXNG_URL } from "../lib/searxng";
import { toast } from "./dialogs";
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

export function WebSearchModal() {
  const open = useStore((s) => s.modals.webSearch);
  const closeModal = useStore((s) => s.closeModal);
  const tinyfishKey = useStore((s) => s.settings.tinyfishKey);
  const setTinyfishKey = useStore((s) => s.setTinyfishKey);
  const searchProvider = useStore((s) => s.settings.searchProvider || "searxng");
  const setSearchProvider = useStore((s) => s.setSearchProvider);
  const searxngUrl = useStore((s) => s.settings.searxngUrl || DEFAULT_SEARXNG_URL);
  const setSearxngUrl = useStore((s) => s.setSearxngUrl);
  const [key, setKey] = useState(tinyfishKey);
  const [url, setUrl] = useState(searxngUrl);
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (open) {
      setKey(tinyfishKey);
      setUrl(searxngUrl);
      setShow(false);
    }
  }, [open, tinyfishKey, searxngUrl]);

  const close = () => closeModal("webSearch");

  const onSaveKey = () => {
    const v = key.trim();
    if (!v) {
      toast("Paste your API key first");
      return;
    }
    setTinyfishKey(v);
    toast("TinyFish key saved ✓");
  };

  const onSaveUrl = () => {
    const v = url.trim().replace(/\/+$/, "");
    if (!v) {
      toast("Isi URL SearXNG dulu");
      return;
    }
    setSearxngUrl(v);
    toast("SearXNG URL saved ✓");
  };

  const onRemoveKey = () => {
    setTinyfishKey("");
    setKey("");
    toast("Key removed");
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) close();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            <i className="fa-solid fa-globe" style={{ marginRight: 8 }} />
            Web search
          </DialogTitle>
          <DialogDescription>
            Search the web before the model answers. Hasil disuntik ke context + sumber
            disebutkan.
          </DialogDescription>
        </DialogHeader>

        <div className="field">
          <Label>Provider</Label>
          <div className="seg-row">
            <button
              type="button"
              className={"seg-btn" + (searchProvider === "searxng" ? " on" : "")}
              onClick={() => setSearchProvider("searxng")}
            >
              SearXNG
            </button>
            <button
              type="button"
              className={"seg-btn" + (searchProvider === "tinyfish" ? " on" : "")}
              onClick={() => setSearchProvider("tinyfish")}
            >
              TinyFish
            </button>
          </div>
        </div>

        {searchProvider === "searxng" ? (
          <>
            <div className="field">
              <Label>
                SearXNG URL <span style={{ fontWeight: 400 }}>(tanpa API key)</span>
              </Label>
              <div className="pw-wrap">
                <Input
                  type="text"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://sxng.labkita.my.id"
                  autoComplete="off"
                />
              </div>
              <p className="sub" style={{ margin: "6px 0 0" }}>
                Milik sendiri, gratis, tanpa key. Isi URL di pesan otomatis dibaca bila
                TinyFish key terisi di bawah.
              </p>
            </div>
            <div className="btn-row">
              <Button variant="primary" style={{ flex: 2 }} onClick={onSaveUrl}>
                Save
              </Button>
              <Button variant="ghost" onClick={close}>
                Done
              </Button>
            </div>
          </>
        ) : (
          <>
            <ol className="steps">
              <li>
                Daftar gratis di{" "}
                <a href="https://agent.tinyfish.ai/" target="_blank" rel="noopener">
                  agent.tinyfish.ai
                </a>
                .
              </li>
              <li>
                Copy <b>API key</b> dari dashboard, tempel di bawah.
              </li>
            </ol>
            <div className="field">
              <Label>
                API key <span style={{ fontWeight: 400 }}>(tersimpan hanya di browser ini)</span>
              </Label>
              <div className="pw-wrap">
                <Input
                  type={show ? "text" : "password"}
                  value={key}
                  onChange={(e) => setKey(e.target.value)}
                  placeholder="Paste key…"
                  autoComplete="off"
                />
                <button type="button" title="Show/hide" onClick={() => setShow(!show)}>
                  <i className={show ? "fa-solid fa-eye-slash" : "fa-solid fa-eye"} />
                </button>
              </div>
            </div>
            <div className="btn-row">
              <Button variant="primary" style={{ flex: 2 }} onClick={onSaveKey}>
                Save
              </Button>
              <Button variant="ghost" onClick={onRemoveKey}>
                Remove key
              </Button>
              <Button variant="ghost" onClick={close}>
                Done
              </Button>
            </div>
          </>
        )}
        <p className="sub">
          Toggle <i className="fa-solid fa-globe" /> di composer untuk mengaktifkan search.
        </p>
      </DialogContent>
    </Dialog>
  );
}

export default WebSearchModal;
