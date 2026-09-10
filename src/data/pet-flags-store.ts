import {
  onDailyCareRecords,
  removePetFlag,
  reportDailyCareWriteError,
  writeDailyCareRecord,
} from "@/lib/api/daily-care-records";

// ============================================================================
// Pet health-attention flags (A4.3), keyed by date + guest — a cache of
// `daily_care_records` that components read via useSyncExternalStore. A flag
// marks a pet as needing attention for that day; toggling it again clears it.
// Nothing notifies a manager: a flag is on the board for whoever looks.
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

// A CACHE of `daily_care_records` (kind pet_flag): filled from the server
// whenever the board loads a day, and every change written through. It was a
// Map in one tab, and "manager notified" was a toast.
onDailyCareRecords((date, records) => {
  for (const key of [...flagsByKey.keys()]) {
    if (key.startsWith(`${date}::`)) flagsByKey.delete(key);
  }
  for (const r of records) {
    if (r.kind !== "pet_flag") continue;
    flagsByKey.set(keyFor(date, r.subject), {
      reason: r.payload.reason ? String(r.payload.reason) : undefined,
      createdBy: String(r.payload.createdBy ?? r.createdByName ?? ""),
      createdAt: String(r.payload.createdAt ?? r.createdAt),
    });
  }
  notify();
});

/** Write a raised flag; on refusal, put back `before` — what was there. */
function persist(
  date: string,
  guestId: string,
  flag: PetFlag | null,
  before: PetFlag | null,
) {
  const key = keyFor(date, guestId);
  const write = flag
    ? writeDailyCareRecord({
        date,
        kind: "pet_flag",
        subject: guestId,
        payload: { ...flag },
      })
    : removePetFlag(date, guestId);
  return write.catch((error: unknown) => {
    // Put the board back the way the server has it.
    if (flag) {
      if (before) flagsByKey.set(key, before);
      else flagsByKey.delete(key);
    } else if (before) {
      flagsByKey.set(key, before);
    }
    notify();
    reportDailyCareWriteError(error);
  });
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
    const before = flagsByKey.get(keyFor(date, guestId)) ?? null;
    flagsByKey.set(keyFor(date, guestId), flag);
    notify();
    void persist(date, guestId, flag, before);
  },

  /** Toggle a pet's flag for a day. Returns the new flagged state. */
  toggle(date: string, guestId: string, flag: PetFlag): boolean {
    const key = keyFor(date, guestId);
    if (flagsByKey.has(key)) {
      const before = flagsByKey.get(key)!;
      flagsByKey.delete(key);
      notify();
      removePetFlag(date, guestId).catch((error: unknown) => {
        flagsByKey.set(key, before);
        notify();
        reportDailyCareWriteError(error);
      });
      return false;
    }
    flagsByKey.set(key, flag);
    notify();
    void persist(date, guestId, flag, null);
    return true;
  },
};
