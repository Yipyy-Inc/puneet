/**
 * Format a booking ID for display.
 *
 * Same numbering as invoices — Booking #10001 has Invoice #10001.
 * Starts at 5 digits (10001), auto-expands as needed.
 */
export function formatBookingRef(id: number): string {
  return `#${10000 + id}`;
}

/**
 * The booking refs a typed number could mean, most likely first.
 *
 * A booking is SHOWN as `#` + (10000 + ref) — "#10896" is ref 896 — but the
 * ref itself travels in URLs, e-mails and the database ("/bookings/896").
 * Somebody pasting either into a search box means the same booking, and the
 * number alone cannot say which form it is in. So both are offered: the
 * displayed form first when there is a "#" or it reaches 10000, then the raw
 * ref. Nothing that is not a whole positive number is a booking.
 */
export function bookingRefCandidates(input: string): number[] {
  const trimmed = input.trim();
  const match = /^#?\s*(\d{1,12})$/.exec(trimmed);
  if (!match) return [];
  const n = Number(match[1]);
  if (!Number.isSafeInteger(n) || n <= 0) return [];
  const displayed = n > 10000 ? n - 10000 : null;
  const hashed = trimmed.startsWith("#");
  const out = hashed ? [displayed, n] : n > 10000 ? [displayed, n] : [n];
  return [...new Set(out.filter((v): v is number => v !== null && v > 0))];
}
