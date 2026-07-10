// ============================================================================
// Manual journal notes — free-text, non-task entries a staff member adds to a
// guest's Guest Journal (e.g. "Owner called — told them Bella is doing great.").
// Stored alongside care-log executions so the Activity Log can show them in one
// timeline with author + time. Components subscribe via useSyncExternalStore.
// ============================================================================

export type JournalNote = {
  id: string;
  guestId: string;
  /** ISO date "YYYY-MM-DD" the note belongs to. */
  date: string;
  /** "HH:MM" within that day. */
  time: string;
  author: string;
  authorInitials: string;
  text: string;
  /** ISO timestamp when the note was added. */
  createdAt: string;
};

type Listener = () => void;

// Copy-on-write: every add swaps in a fresh array, so getSnapshot is a
// referentially-stable value between changes (safe for useSyncExternalStore).
let notes: JournalNote[] = [];
const listeners = new Set<Listener>();

function notify(): void {
  for (const l of listeners) l();
}

export const journalNotesStore = {
  getSnapshot(): JournalNote[] {
    return notes;
  },

  subscribe(listener: Listener): () => void {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },

  add(note: Omit<JournalNote, "id">): void {
    notes = [
      ...notes,
      {
        ...note,
        id: `note-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      },
    ];
    notify();
  },

  getForGuest(guestId: string): JournalNote[] {
    return notes.filter((n) => n.guestId === guestId);
  },
};
