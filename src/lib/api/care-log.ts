import type { CareLogEntry } from "@/app/api/care-log/route";

// ============================================================================
// The care log, from Postgres.
//
// Replaces `src/data/care-log-store.ts` for the booking page's FEEDING and
// MEDICATIONS panels: a module-level `let executions` with a hand-rolled
// subscribe, seeded from fixtures and lost on reload.
//
// The Guest Journal and Daily Care still use that store — they carry photos,
// health observations and generated task schedules that this does not model
// yet — so both exist for now, and the debt map says which is which.
// ============================================================================

export type { CareLogEntry };

export interface LogCareInput {
  bookingRef: number;
  petRef?: number | null;
  /** The scheduled slot this executes, e.g. `feed-1001-08:00`. */
  taskKey: string;
  taskType: CareLogEntry["taskType"];
  outcome: string;
  /** Defaults to today, server-side. */
  occurredOn?: string;
  /** "HH:MM". Defaults to now, server-side. */
  executedAt?: string;
  servedAt?: string | null;
  notes?: string | null;
  /**
   * Per-task-type extras: how a kennel was cleaned, how long an add-on ran, how
   * a dog engaged, a health observation, why a task was missed.
   *
   * Never photos. The board's "Add photo" button appends `mock://photo-1` and
   * there is nothing behind it — see migration 20260820180000.
   */
  details?: Record<string, unknown>;
}

export const careLogKeys = {
  all: ["care-log"] as const,
  forBooking: (bookingRef: number) => ["care-log", bookingRef] as const,
  forDate: (date: string) => ["care-log", "on", date] as const,
};

export const careLogQueries = {
  forBooking: (bookingRef: number) => ({
    queryKey: careLogKeys.forBooking(bookingRef),
    queryFn: async (): Promise<CareLogEntry[]> => {
      const response = await fetch(`/api/care-log?bookingRef=${bookingRef}`);
      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as {
          error?: string;
        };
        throw new Error(body.error ?? "Could not read the care log.");
      }
      return (await response.json()) as CareLogEntry[];
    },
    // A booking's log is read while somebody is standing at the kennel; a
    // stale minute is fine, a refetch on every focus is noise.
    staleTime: 60_000,
  }),

  /**
   * One DAY across every guest, for the Daily Care board.
   *
   * No facility parameter. `care_log_entries` is scoped by RLS to bookings the
   * caller can read, so this is already "today, where I work" — and the board
   * is the screen somebody refreshes between kennels, so a stale minute is
   * worse here than on a single booking.
   */
  forDate: (date: string) => ({
    queryKey: careLogKeys.forDate(date),
    queryFn: async (): Promise<CareLogEntry[]> => {
      const response = await fetch(`/api/care-log?on=${date}`);
      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as {
          error?: string;
        };
        throw new Error(body.error ?? "Could not read the day's care log.");
      }
      return (await response.json()) as CareLogEntry[];
    },
    staleTime: 15_000,
  }),
};

export async function logCare(input: LogCareInput): Promise<CareLogEntry> {
  const response = await fetch("/api/care-log", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as {
      error?: string;
    };
    throw new Error(body.error ?? "Could not record that.");
  }
  return (await response.json()) as CareLogEntry;
}
