"use client";

import { useState, useSyncExternalStore } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { StickyNote, Pencil } from "lucide-react";
import { toast } from "sonner";
import { petCareNotesStore } from "@/data/pet-care-notes";

type Props = {
  guestId: string;
  petName: string;
  /** The pet record's own notes — shown when no stay override has been set. */
  fallbackNote?: string;
};

/**
 * Stay-long care note editor (A4.5 / A8.4). Shows the pet's current care note
 * and lets staff set/edit it for the whole stay. The note persists in the
 * pet-care-notes store and surfaces as the sticky-note indicator on every
 * PetRow across Daily Care.
 */
export function PetCareNoteCard({ guestId, petName, fallbackNote }: Props) {
  const override = useSyncExternalStore(
    petCareNotesStore.subscribe,
    () => petCareNotesStore.getSnapshot(guestId),
    () => petCareNotesStore.getSnapshot(guestId),
  );
  const effective = override ?? fallbackNote ?? "";

  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");

  function openEditor() {
    setDraft(effective);
    setOpen(true);
  }

  function handleSave() {
    petCareNotesStore.set(guestId, draft);
    setOpen(false);
    toast.success(
      draft.trim()
        ? `Care note saved for ${petName}.`
        : `Care note cleared for ${petName}.`,
    );
  }

  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50/60 p-3 dark:border-amber-900/40 dark:bg-amber-950/20">
      <div className="flex items-start gap-2">
        <StickyNote className="mt-0.5 size-4 shrink-0 text-amber-500" />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold text-amber-700 dark:text-amber-300">
            Stay care note
          </p>
          {effective ? (
            <p className="mt-0.5 text-sm whitespace-pre-wrap">{effective}</p>
          ) : (
            <p className="text-muted-foreground mt-0.5 text-sm italic">
              No care note yet — e.g. &ldquo;Needs extra cuddle time&rdquo;.
            </p>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={openEditor}
          className="h-7 shrink-0 gap-1 text-xs"
        >
          <Pencil className="size-3.5" />
          {effective ? "Edit" : "Add"}
        </Button>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base">
              Care note · {petName}
            </DialogTitle>
            <DialogDescription>
              Persists for the whole stay and shows throughout Daily Care.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={3}
            placeholder="e.g. Call owner if she refuses food twice"
            className="resize-none"
          />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave}>Save note</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
