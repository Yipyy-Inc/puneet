/**
 * Format a booking ID for display.
 *
 * Same numbering as invoices — Booking #10001 has Invoice #10001.
 * Starts at 5 digits (10001), auto-expands as needed.
 */
export function formatBookingRef(id: number): string {
  return `#${10000 + id}`;
}
