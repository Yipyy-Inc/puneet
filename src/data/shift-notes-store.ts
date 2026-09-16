import {
  onDailyCareRecords,
  reportDailyCareWriteError,
  writeDailyCareRecord,
} from "@/lib/api/daily-care-records";

// ============================================================================
// Shift-handoff notes — a CACHE of `daily_care_records` (kind shift_note),
// keyed by date. It was the whole truth, in one browser tab, under a
// hard-coded facility id. The server scopes by the session's facility, so the
// callers no longer pass one: `petFlagsStore` never did, and the id they were
// passing was the fixture's 11.
// Components subscribe via useSyncExternalStore, so a note left from the
// dialog shows up in the banner (and any other subscriber) at once.
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

function keyFor(date: string): string {
  return date;
}

// Filled from the server whenever the board loads a day.
onDailyCareRecords((date, records) => {
  notesByKey.set(
    date,
    records
      .filter((r) => r.kind === "shift_note")
      .map((r) => ({
        id: r.id,
        author: String(r.payload.author ?? r.createdByName ?? ""),
        createdAt: String(r.payload.createdAt ?? r.createdAt),
        text: String(r.payload.text ?? ""),
      })),
  );
  notify();
});

function notify(): void {
  for (const l of listeners) l();
}

export const shiftNotesStore = {
  getSnapshot(date: string): ShiftNote[] {
    return notesByKey.get(keyFor(date)) ?? EMPTY;
  },

  subscribe(listener: Listener): () => void {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },

  add(
    date: string,
    note: { author: string; text: string; createdAt: string },
  ): void {
    const key = keyFor(date);
    seq += 1;
    const entry: ShiftNote = {
      id: `shift-note-${date}-${seq}`,
      author: note.author,
      createdAt: note.createdAt,
      text: note.text,
    };
    notesByKey.set(key, [...(notesByKey.get(key) ?? []), entry]);
    notify();
    // Written through; taken back off the board if the write is refused.
    writeDailyCareRecord({
      date,
      kind: "shift_note",
      payload: {
        text: note.text,
        author: note.author,
        createdAt: note.createdAt,
      },
    }).catch((error: unknown) => {
      notesByKey.set(
        key,
        (notesByKey.get(key) ?? []).filter((n) => n.id !== entry.id),
      );
      notify();
      reportDailyCareWriteError(error);
    });
  },
};
