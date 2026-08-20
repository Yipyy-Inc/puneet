import type { DailyCarePayload } from "@/app/api/daily-care/route";

// ============================================================================
// Who the Daily Care board is looking after.
//
// Replaces `getCurrentGuests()` from `src/data/boarding.ts`, which filtered a
// fixture array to `status === "checked-in"` — so the board listed animals that
// were not in the building, with feeding schedules nobody had given, and staff
// ticked them off.
// ============================================================================

export const dailyCareKeys = {
  all: ["daily-care"] as const,
  forDate: (date: string) => ["daily-care", date] as const,
};

export const dailyCareQueries = {
  forDate: (date: string) => ({
    queryKey: dailyCareKeys.forDate(date),
    queryFn: async (): Promise<DailyCarePayload> => {
      const response = await fetch(`/api/daily-care?date=${date}`);
      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as {
          error?: string;
        };
        throw new Error(body.error ?? "Could not read today's guests.");
      }
      return (await response.json()) as DailyCarePayload;
    },
    // Somebody arriving or leaving changes this board, and it is left open on a
    // screen by the kennels all day.
    staleTime: 30_000,
  }),
};
