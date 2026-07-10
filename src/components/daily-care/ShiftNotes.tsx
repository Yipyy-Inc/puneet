"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { StickyNote } from "lucide-react";
import { toast } from "sonner";
import { useCurrentUser } from "@/hooks/use-current-user";
import { shiftNotesStore } from "@/data/shift-notes-store";

type Props = {
  facilityId: number;
  /** ISO date "YYYY-MM-DD" the note belongs to (the day being viewed). */
  date: string;
};

export function ShiftNotes({ facilityId, date }: Props) {
  // Author comes from the single current-staff source (F2).
  const { user } = useCurrentUser();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");

  const handleSubmit = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    // Stamp author + time on submit, then persist to the store.
    shiftNotesStore.add(facilityId, date, {
      author: user.name,
      text: trimmed,
      createdAt: new Date().toISOString(),
    });
    toast.success("Shift note saved for the next shift.");
    setText("");
    setOpen(false);
  };

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <StickyNote className="mr-2 size-4" />
        Shift Notes
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Shift Notes</DialogTitle>
            <DialogDescription>
              Leave a handoff note for whoever works the next shift.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Label htmlFor="shift-note">Notes for the next shift:</Label>
            <Textarea
              id="shift-note"
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={4}
              placeholder="e.g. Bella didn't finish breakfast — keep an eye on her at dinner."
              autoFocus
            />
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={text.trim().length === 0}>
              Save note
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
