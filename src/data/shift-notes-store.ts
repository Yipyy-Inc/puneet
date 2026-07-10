// ============================================================================
// Shift-handoff notes — mutable in-memory store keyed by facility + date.
// Mirrors daily-care-config-store.ts: components subscribe via
// useSyncExternalStore, so a note left from the dialog shows up in the banner
// (and any other subscriber) without prop-drilling or an API round-trip.
// ============================================================================

export type ShiftNote = {
  id: string;
  author: string;
  /** ISO timestamp stamped when the note was left. */
  createdAt: string;
  text: string;
};

type Listener = () => void;

const notesByKey = new Map<string, ShiftNote[]>();
const listeners = new Set<Listener>();

// Shared stable reference for empty keys — returning a fresh [] from
// getSnapshot would loop useSyncExternalStore.
const EMPTY: ShiftNote[] = [];

let seq = 0;

function keyFor(facilityId: number, date: string): string {
  return `${facilityId}::${date}`;
}

function notify(): void {
  for (const l of listeners) l();
}

export const shiftNotesStore = {
  getSnapshot(facilityId: number, date: string): ShiftNote[] {
    return notesByKey.get(keyFor(facilityId, date)) ?? EMPTY;
  },

  subscribe(listener: Listener): () => void {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },

  add(
    facilityId: number,
    date: string,
    note: { author: string; text: string; createdAt: string },
  ): void {
    const key = keyFor(facilityId, date);
    seq += 1;
    const entry: ShiftNote = {
      id: `shift-note-${facilityId}-${date}-${seq}`,
      author: note.author,
      createdAt: note.createdAt,
      text: note.text,
    };
    notesByKey.set(key, [...(notesByKey.get(key) ?? []), entry]);
    notify();
  },
};
