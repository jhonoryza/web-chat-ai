import { useEffect, useState } from "react";
import { useStore, getActiveConversation } from "../lib/store";
import type { Conversation } from "../lib/types";
import { toast } from "./dialogs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "./ui/dialog";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { Button } from "./ui/button";

function ConvForm({ conv, onDone }: { conv: Conversation; onDone: () => void }) {
  const patchConversation = useStore((s) => s.patchConversation);
  const [system, setSystem] = useState(conv.system ?? "");
  const [temperature, setTemperature] = useState(conv.temperature ?? 0.7);
  const [maxTokens, setMaxTokens] = useState(conv.maxTokens ?? 0);

  const onSave = () => {
    patchConversation(conv.id, { system, temperature, maxTokens });
    toast("Settings saved ✓");
    onDone();
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>
          <i className="fa-solid fa-gear" style={{ marginRight: 8 }} />
          Chat settings
        </DialogTitle>
        <DialogDescription>Applies to this conversation only.</DialogDescription>
      </DialogHeader>
      <div className="field">
        <Label>
          System prompt <span style={{ fontWeight: 400 }}>(optional)</span>
        </Label>
        <Textarea
          rows={3}
          value={system}
          onChange={(e) => setSystem(e.target.value)}
          placeholder="e.g. You are a cheerful coding buddy…"
        />
      </div>
      <div className="field">
        <Label>
          Temperature: <span>{temperature.toFixed(1)}</span>
        </Label>
        <input
          type="range"
          min={0}
          max={2}
          step={0.1}
          value={temperature}
          onChange={(e) => setTemperature(parseFloat(e.target.value))}
        />
      </div>
      <div className="field">
        <Label>
          Max tokens: <span>{maxTokens === 0 ? "Auto" : maxTokens}</span>
        </Label>
        <input
          type="range"
          min={0}
          max={16000}
          step={256}
          value={maxTokens}
          onChange={(e) => setMaxTokens(parseInt(e.target.value, 10))}
        />
        <div className="range-val">0 = provider default</div>
      </div>
      <DialogFooter>
        <Button variant="primary" style={{ flex: 2 }} onClick={onSave}>
          Save
        </Button>
        <Button variant="ghost" onClick={onDone}>
          Cancel
        </Button>
      </DialogFooter>
    </>
  );
}

export function ConvSettingsModal() {
  const open = useStore((s) => s.modals.convSettings);
  const closeModal = useStore((s) => s.closeModal);
  const conv = useStore(getActiveConversation);
  const newConversation = useStore((s) => s.newConversation);

  // like the reference: opening settings with no active chat creates one first
  useEffect(() => {
    if (open && !conv) newConversation();
  }, [open, conv, newConversation]);

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) closeModal("convSettings");
      }}
    >
      <DialogContent>{conv ? <ConvForm key={conv.id} conv={conv} onDone={() => closeModal("convSettings")} /> : null}</DialogContent>
    </Dialog>
  );
}

export default ConvSettingsModal;
