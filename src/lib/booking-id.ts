/**
 * Generate a human-readable booking reference from the numeric ID and date.
 *
 * Format: BK-YYYY-MM-NNNNNNN
 * Example: BK-2026-04-0000017
 *
 * Supports 9,999,999 bookings per month — hundreds of millions per year.
 * The numeric ID is still used internally for routing and data lookups.
 */
export function formatBookingRef(id: number, startDate?: string): string {
  if (startDate) {
    const d = new Date(startDate + "T00:00:00");
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    return `BK-${year}-${month}-${String(id).padStart(7, "0")}`;
  }
  return `BK-${String(id).padStart(7, "0")}`;
}
