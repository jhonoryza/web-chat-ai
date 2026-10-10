import { useEffect, useState } from "react";
import { useStore } from "../lib/store";
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
  const setWebSearch = useStore((s) => s.setWebSearch);
  const [key, setKey] = useState(tinyfishKey);
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (open) {
      setKey(tinyfishKey);
      setShow(false);
    }
  }, [open, tinyfishKey]);

  const close = () => closeModal("webSearch");

  const onSave = () => {
    const v = key.trim();
    if (!v) {
      toast("Paste your API key first");
      return;
    }
    setTinyfishKey(v);
    toast("TinyFish key saved ✓");
  };

  const onRemove = () => {
    setTinyfishKey("");
    setWebSearch(false);
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
            Search the web via TinyFish before the model answers. Free tier: 500
            searches/hour.
          </DialogDescription>
        </DialogHeader>
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
          <Button variant="primary" style={{ flex: 2 }} onClick={onSave}>
            Save
          </Button>
          <Button variant="ghost" onClick={onRemove}>
            Remove key
          </Button>
          <Button variant="ghost" onClick={close}>
            Done
          </Button>
        </div>
        <p className="sub">
          Toggle <i className="fa-solid fa-globe" /> di composer untuk mengaktifkan search.
        </p>
      </DialogContent>
    </Dialog>
  );
}

export default WebSearchModal;
