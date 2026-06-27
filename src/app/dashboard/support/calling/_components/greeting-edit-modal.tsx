"use client";

import { useState } from "react";
import { Save } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { updateGreetingScript } from "@/lib/support-greeting-store";
import type { VoicemailGreeting } from "@/types/calling";

interface GreetingEditModalProps {
  greeting: VoicemailGreeting | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function GreetingEditModal({
  greeting,
  open,
  onOpenChange,
}: GreetingEditModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        {greeting && (
          // Keyed by id so opening a different greeting remounts the form with
          // fresh initial state (no derive-state-from-props effect needed).
          <EditForm
            key={greeting.id}
            greeting={greeting}
            onClose={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function EditForm({
  greeting,
  onClose,
}: {
  greeting: VoicemailGreeting;
  onClose: () => void;
}) {
  const [script, setScript] = useState(greeting.transcription);
  const trimmed = script.trim();
  const canSave = trimmed.length > 0 && trimmed !== greeting.transcription;

  function handleSave() {
    if (!canSave) return;
    updateGreetingScript(greeting.id, trimmed);
    toast.success(`${greeting.name} greeting updated`);
    onClose();
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>Edit “{greeting.name}” greeting</DialogTitle>
        <DialogDescription>
          This is the script callers hear when this greeting is active.
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-2">
        <Textarea
          value={script}
          onChange={(e) => setScript(e.target.value)}
          rows={7}
          placeholder="Write the greeting script…"
          className="resize-none text-sm"
        />
        <p className="text-muted-foreground text-right text-[11px]">
          {script.length} characters · ~
          {Math.round(script.split(/\s+/).filter(Boolean).length / 2.5)}s read
          time
        </p>
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button
          onClick={handleSave}
          disabled={!canSave}
          className="gap-2 bg-emerald-600 text-white hover:bg-emerald-700"
        >
          <Save className="size-4" />
          Save greeting
        </Button>
      </DialogFooter>
    </>
  );
}
