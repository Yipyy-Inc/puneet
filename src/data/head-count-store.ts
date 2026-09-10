import {
  onDailyCareRecords,
  reportDailyCareWriteError,
  writeDailyCareRecord,
} from "@/lib/api/daily-care-records";

// ============================================================================
// Head-count (Last Call rollcall) store — records the completed rollcall for a
// requiresHeadCount step, keyed by facility + date + step. Components subscribe
// via useSyncExternalStore. A record's presence marks the Last Call step
// complete; the Daily Care List reads it to gate/close the step.
// ============================================================================

export type CannotLocateEntry = {
  guestId: string;
  note?: string;
};

export type HeadCountRecord = {
  stepId: string;
  /** ISO date "YYYY-MM-DD" */
  date: string;
  staffName: string;
  staffInitials: string;
  /** "HH:MM" the count was completed. */
  completedAt: string;
  insideGuestIds: string[];
  cannotLocate: CannotLocateEntry[];
  /** Total dogs the count covered. */
  total: number;
  /** Manager override note — required when any dog could not be located. */
  overrideNote?: string;
};

type Listener = () => void;

const recordsByKey = new Map<string, HeadCountRecord>();
const listeners = new Set<Listener>();

const EMPTY_IDS: ReadonlySet<string> = new Set();

// Cache of "completed step ids for a (facility, date)" — rebuilt on mutation so
// useSyncExternalStore gets a referentially-stable Set between changes.
let idsCacheKey = "";
let idsCache: ReadonlySet<string> = EMPTY_IDS;

// A CACHE of `daily_care_records` (kind head_count), keyed by day and step.
// The facility is the session's, on the server; `facilityId` is kept for the
// callers and decides nothing.
function keyFor(_facilityId: number, date: string, stepId: string): string {
  return `${date}::${stepId}`;
}

onDailyCareRecords((date, records) => {
  for (const key of [...recordsByKey.keys()]) {
    if (key.startsWith(`${date}::`)) recordsByKey.delete(key);
  }
  for (const r of records) {
    if (r.kind !== "head_count") continue;
    recordsByKey.set(`${date}::${r.subject}`, {
      ...(r.payload as Partial<HeadCountRecord>),
      stepId: r.subject,
      date,
    } as HeadCountRecord);
  }
  notify();
});

function notify(): void {
  // Invalidate the derived cache; the next read rebuilds it.
  idsCacheKey = "";
  for (const l of listeners) l();
}

export const headCountStore = {
  /** The completed record for a step on a day, or null. */
  getSnapshot(
    facilityId: number,
    date: string,
    stepId: string,
  ): HeadCountRecord | null {
    return recordsByKey.get(keyFor(facilityId, date, stepId)) ?? null;
  },

  /** Step ids with a completed head count for a (facility, date). Stable
   *  reference between mutations — safe for useSyncExternalStore. */
  getCompletedStepIds(facilityId: number, date: string): ReadonlySet<string> {
    void facilityId;
    const key = date;
    if (key !== idsCacheKey) {
      const ids = new Set<string>();
      const prefix = `${key}::`;
      for (const recordKey of recordsByKey.keys()) {
        if (recordKey.startsWith(prefix)) {
          ids.add(recordKey.slice(prefix.length));
        }
      }
      idsCacheKey = key;
      idsCache = ids.size === 0 ? EMPTY_IDS : ids;
    }
    return idsCache;
  },

  subscribe(listener: Listener): () => void {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },

  /** Persist a completed head count and mark the step done. */
  complete(
    facilityId: number,
    date: string,
    stepId: string,
    record: HeadCountRecord,
  ): void {
    const key = keyFor(facilityId, date, stepId);
    recordsByKey.set(key, record);
    notify();
    // The safety record goes to the server; the step is undone if refused.
    writeDailyCareRecord({
      date,
      kind: "head_count",
      subject: stepId,
      payload: { ...record },
    }).catch((error: unknown) => {
      recordsByKey.delete(key);
      notify();
      reportDailyCareWriteError(error);
    });
  },
};
