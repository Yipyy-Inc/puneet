// ============================================================================
// Pet health-attention flags (A4.3) — mutable in-memory store keyed by
// date + guest. Mirrors shift-notes-store.ts: components subscribe via
// useSyncExternalStore. A flag marks a pet as needing attention for that day;
// toggling it again clears it. The manager notification is represented by a
// sonner toast at the call site (real push is a TODO there).
// ============================================================================

export type PetFlag = {
  reason?: string;
  createdBy: string;
  /** ISO timestamp when the flag was raised. */
  createdAt: string;
};

type Listener = () => void;

const flagsByKey = new Map<string, PetFlag>();
const listeners = new Set<Listener>();

// Cached, stable snapshot of every guest id with a flag on any day — powers the
// journal guest-list ⚑ (A8.2). Rebuilt on mutation so useSyncExternalStore gets
// a referentially-stable value between changes.
let flaggedIdsSnapshot: Set<string> = new Set();

function keyFor(date: string, guestId: string): string {
  return `${date}::${guestId}`;
}

function rebuildFlaggedIds(): void {
  const ids = new Set<string>();
  for (const key of flagsByKey.keys()) {
    const guestId = key.split("::")[1];
    if (guestId) ids.add(guestId);
  }
  flaggedIdsSnapshot = ids;
}

function notify(): void {
  rebuildFlaggedIds();
  for (const l of listeners) l();
}

export const petFlagsStore = {
  /** The flag for one pet on one day, or null. Stable reference between changes. */
  getSnapshot(date: string, guestId: string): PetFlag | null {
    return flagsByKey.get(keyFor(date, guestId)) ?? null;
  },

  /** Guest ids flagged on any day (A8.2). Stable reference between changes. */
  getFlaggedGuestIds(): Set<string> {
    return flaggedIdsSnapshot;
  },

  subscribe(listener: Listener): () => void {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },

  /** Raise (set) a pet's flag for a day idempotently — never clears an
   *  existing flag. Used by the health-concern path, where logging a concern
   *  must always leave the pet flagged regardless of prior state. */
  raise(date: string, guestId: string, flag: PetFlag): void {
    flagsByKey.set(keyFor(date, guestId), flag);
    notify();
  },

  /** Toggle a pet's flag for a day. Returns the new flagged state. */
  toggle(date: string, guestId: string, flag: PetFlag): boolean {
    const key = keyFor(date, guestId);
    if (flagsByKey.has(key)) {
      flagsByKey.delete(key);
      notify();
      return false;
    }
    flagsByKey.set(key, flag);
    notify();
    return true;
  },
};
