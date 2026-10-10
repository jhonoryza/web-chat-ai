import { useRef } from "react";
import { useStore } from "../lib/store";
import { db } from "../lib/db";
import type { Conversation, Provider } from "../lib/types";
import { confirmDialog, toast } from "./dialogs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "./ui/dialog";
import { Button } from "./ui/button";

export function BackupModal() {
  const open = useStore((s) => s.modals.backup);
  const closeModal = useStore((s) => s.closeModal);
  const settings = useStore((s) => s.settings);
  const conversations = useStore((s) => s.conversations);
  const clearAllConversations = useStore((s) => s.clearAllConversations);
  const fileRef = useRef<HTMLInputElement>(null);

  const close = () => closeModal("backup");

  const onExport = () => {
    const data = {
      app: "web-chat-ai",
      version: 1,
      exportedAt: new Date().toISOString(),
      settings: {
        theme: settings.theme,
        providers: settings.providers,
        activeProviderId: settings.activeProviderId,
      },
      conversations,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "web-chat-ai-backup-" + new Date().toISOString().slice(0, 10) + ".json";
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    toast("Backup downloaded ✓");
  };

  const onImportFile = async (file: File) => {
    try {
      const d = JSON.parse(await file.text());
      if (!d || d.app !== "web-chat-ai" || !Array.isArray(d.conversations))
        throw new Error("bad file");
      const nProv = d.settings?.providers?.length ?? 0;
      const ok = await confirmDialog({
        title: "Restore backup",
        okText: "Restore",
        danger: false,
        message:
          "Replace everything in this browser with this backup?\n" +
          `(${d.conversations.length} chats, ${nProv} providers)`,
      });
      if (!ok) return;
      const convs = (d.conversations as Conversation[])
        .slice()
        .sort((a, b) => b.updatedAt - a.updatedAt);
      const providers: Provider[] = Array.isArray(d.settings?.providers)
        ? d.settings.providers
        : [];
      const first = convs[0] ?? null;
      const prov =
        providers.find((p) => p.id === (first?.providerId ?? d.settings?.activeProviderId)) ??
        providers[0] ??
        null;
      await db.clear();
      for (const c of convs) await db.put(c);
      useStore.setState((s) => ({
        settings: {
          ...s.settings,
          theme: d.settings?.theme || "dark",
          providers,
          activeProviderId: d.settings?.activeProviderId || null,
        },
        conversations: convs,
        activeConvId: first?.id ?? null,
        selProviderId: first?.providerId ?? prov?.id ?? null,
        selModelId: first?.model || prov?.defaultModel || "",
      }));
      toast("Backup restored ✓");
    } catch {
      toast("That file is not a valid backup");
    }
  };

  const onClearAll = async () => {
    if (conversations.length === 0) {
      toast("Nothing to clear");
      return;
    }
    const ok = await confirmDialog({
      title: "Delete all chats",
      message: `Delete ALL ${conversations.length} conversations? This cannot be undone.`,
    });
    if (!ok) return;
    clearAllConversations();
    close();
    toast("All chats cleared");
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
            <i className="fa-solid fa-floppy-disk" style={{ marginRight: 8 }} />
            Backup &amp; restore
          </DialogTitle>
          <DialogDescription>
            Everything is a single JSON file: providers, settings and all conversations.
          </DialogDescription>
        </DialogHeader>
        <div className="btn-row" style={{ marginTop: 0 }}>
          <Button variant="primary" style={{ flex: 1 }} onClick={onExport}>
            <i className="fa-solid fa-download" /> Export JSON
          </Button>
          <Button variant="ghost" style={{ flex: 1 }} onClick={() => fileRef.current?.click()}>
            <i className="fa-solid fa-upload" /> Import JSON
          </Button>
        </div>
        <p className="sub" style={{ marginTop: 12 }}>
          Import <b>replaces</b> everything currently stored in this browser. Export first if
          you are unsure.
        </p>
        <hr
          style={{ border: 0, borderTop: "1px solid var(--border)", margin: "16px 0" }}
        />
        <button className="btn danger-zone" onClick={onClearAll}>
          <i className="fa-solid fa-trash" />
          Delete all conversations
        </button>
        <div className="btn-row">
          <Button variant="ghost" style={{ width: "100%" }} onClick={close}>
            Done
          </Button>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          hidden
          onChange={(e) => {
            if (e.target.files?.length) onImportFile(e.target.files[0]);
            e.target.value = "";
          }}
        />
      </DialogContent>
    </Dialog>
  );
}

export default BackupModal;
