// ============================================================================
// The tip a booking carries that no payment has collected yet.
//
// `bookings.tip_amount` is the tip the booking CARRIES: the owner pledged it in
// the pre-arrival form (yipyy_go_pledge_tip, 20260913135000), or it was added
// when the booking was made. `payments.tip` is what was actually COLLECTED,
// and its signed sum is net of refunds. The checkout and the pay link start
// their tip at the difference, so a pledge is offered once and never taken
// twice.
//
// Pure, so the booking page, the dashboard card and the server-rendered pay
// link all use one rule.
// ============================================================================

/** Dollars still to collect; zero when nothing is carried, or it is taken. */
export function tipStillToCollect(
  tipOnBooking: number | null | undefined,
  tipsCollected: number | null | undefined,
): number {
  const carried = Number(tipOnBooking ?? 0);
  const collected = Number(tipsCollected ?? 0);
  // An unreadable figure offers nothing, rather than a tip that may be paid.
  if (!Number.isFinite(carried) || !Number.isFinite(collected)) return 0;
  // A refund can leave the signed sum below zero; it never raises the pledge.
  const remaining = carried - Math.max(0, collected);
  return Math.max(0, Math.round(remaining * 100) / 100);
}
