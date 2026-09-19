import type { BookingHistoryEntry } from "@/app/api/bookings/[ref]/history/route";

export type { BookingHistoryEntry };

async function fetchHistory(ref: number): Promise<BookingHistoryEntry[]> {
  const res = await fetch(`/api/bookings/${ref}/history`);
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as {
      error?: string;
    } | null;
    throw new Error(body?.error ?? `Request failed (${res.status})`);
  }
  return (await res.json()) as BookingHistoryEntry[];
}

/** One booking's recorded changes, newest first (GET /api/bookings/[ref]/history). */
export const bookingHistoryQueries = {
  forBooking: (ref: number) => ({
    queryKey: ["bookings", "history", ref] as const,
    queryFn: () => fetchHistory(ref),
  }),
};
