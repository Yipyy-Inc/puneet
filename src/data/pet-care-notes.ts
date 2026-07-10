// ============================================================================
// Pet care notes (A4.5 / A8.4) — a stay-long, per-pet care note that persists
// across the whole reservation and is visible throughout Daily Care. Keyed by
// guest (pet) id. Components subscribe via useSyncExternalStore; the scheduler
// reads the note onto every ScheduledTask.careNote (falling back to the pet
// record's own notes when no override has been set).
//
// Examples: "Needs extra cuddle time", "Call owner if she refuses food twice".
// ============================================================================

type Listener = () => void;

// Copy-on-write map: every mutation swaps in a fresh Map, so the snapshot is a
// referentially-stable value between changes (safe for useSyncExternalStore)
// that flips reference when a note is edited.
let notesByGuest: ReadonlyMap<string, string> = new Map();
const listeners = new Set<Listener>();

function notify(): void {
  for (const l of listeners) l();
}

export const petCareNotesStore = {
  /** The stay-long care note override for a pet, or null if none set. */
  getSnapshot(guestId: string): string | null {
    return notesByGuest.get(guestId) ?? null;
  },

  /** The full note map — stable reference between mutations. Passed to the
   *  scheduler so ScheduledTask.careNote re-derives when a note changes. */
  getNotesMap(): ReadonlyMap<string, string> {
    return notesByGuest;
  },

  subscribe(listener: Listener): () => void {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },

  /** Set (or, with an empty string, clear) a pet's stay-long care note. */
  set(guestId: string, note: string): void {
    const trimmed = note.trim();
    const next = new Map(notesByGuest);
    if (trimmed) {
      next.set(guestId, trimmed);
    } else {
      next.delete(guestId);
    }
    notesByGuest = next;
    notify();
  },
};
