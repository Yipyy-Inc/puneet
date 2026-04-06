"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { useAiText } from "@/hooks/use-ai-text";
import { AiGenerateButton } from "@/components/shared/AiGenerateButton";

interface Note {
  id: string;
  content: string;
  staffName: string;
  timestamp: string;
}

function formatRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return "yesterday";
  return `${days}d ago`;
}

const MOCK_NOTES: Note[] = [
  {
    id: "n1",
    content:
      "Client called to confirm drop-off time. Arriving at 2:30 PM instead of 2:00 PM.",
    staffName: "Amy Chen",
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "n2",
    content:
      "Buddy needs medication at 8am and 6pm. Pill is in the labeled bag — give with food.",
    staffName: "Jessica Martinez",
    timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
  },
];

export function BookingNotes() {
  const [notes, setNotes] = useState<Note[]>(MOCK_NOTES);
  const [adding, setAdding] = useState(false);
  const [newNote, setNewNote] = useState("");
  const ai = useAiText({ type: "booking_note", maxWords: 60 });

  const handleAdd = () => {
    if (!newNote.trim()) return;
    setNotes([
      {
        id: `n-${Date.now()}`,
        content: newNote,
        staffName: "You",
        timestamp: new Date().toISOString(),
      },
      ...notes,
    ]);
    setNewNote("");
    setAdding(false);
    toast.success("Note added");
  };

  return (
    <div className="space-y-3">
      {/* Add note — always visible input */}
      {adding ? (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Note</span>
            <AiGenerateButton
              onClick={async () => {
                const result = await ai.generate({
                  petName: "Pet",
                  serviceName: "Booking",
                });
                if (result) setNewNote(result);
              }}
              isGenerating={ai.isGenerating}
            />
          </div>
          <Textarea
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            placeholder="Write a note..."
            className="min-h-[120px] resize-y text-sm leading-7"
            autoFocus
          />
          <div className="flex gap-2">
            <Button
              size="sm"
              className="h-8 gap-1.5 text-xs"
              onClick={handleAdd}
            >
              <Plus className="size-3" />
              Save Note
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-xs"
              onClick={() => {
                setAdding(false);
                setNewNote("");
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setAdding(true)}
          className="border-muted hover:border-foreground/20 hover:bg-muted/50 flex w-full items-center gap-2 rounded-md border border-dashed px-3 py-2.5 text-sm transition-colors"
        >
          <Plus className="text-muted-foreground size-4" />
          <span className="text-muted-foreground">Add a note...</span>
        </button>
      )}

      {/* Notes list */}
      {notes.length === 0 ? (
        <p className="text-muted-foreground py-2 text-center text-xs">
          No notes yet
        </p>
      ) : (
        <div className="space-y-2">
          {notes.map((note) => (
            <div
              key={note.id}
              className="bg-muted/20 rounded-md border px-3 py-2"
            >
              <p className="text-sm">{note.content}</p>
              <p className="text-muted-foreground mt-1 text-xs">
                {note.staffName} · {formatRelative(note.timestamp)}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
