"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Plus, StickyNote } from "lucide-react";
import { toast } from "sonner";

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
    <Card>
      <CardContent className="pt-6">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-muted-foreground text-xs font-medium tracking-wider uppercase">
            <StickyNote className="mr-1.5 inline size-3" />
            Notes
          </p>
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground h-6 gap-1 text-[10px]"
            onClick={() => setAdding(true)}
          >
            <Plus className="size-3" />
            Add
          </Button>
        </div>

        {adding && (
          <div className="mb-3 space-y-2">
            <Textarea
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              placeholder="Add a note..."
              className="min-h-[60px] text-sm"
              autoFocus
            />
            <div className="flex gap-2">
              <Button size="sm" className="h-7 text-xs" onClick={handleAdd}>
                Save
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                onClick={() => {
                  setAdding(false);
                  setNewNote("");
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        {notes.length === 0 && !adding ? (
          <p className="text-muted-foreground py-4 text-center text-xs">
            No notes yet
          </p>
        ) : (
          <div className="space-y-3">
            {notes.map((note) => (
              <div key={note.id} className="text-sm">
                <p>{note.content}</p>
                <p className="text-muted-foreground mt-1 text-xs">
                  {note.staffName} · {formatRelative(note.timestamp)}
                </p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
