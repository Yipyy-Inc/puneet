/**
 * What a booking's service and its own add-ons come to.
 *
 * `totalCost` held both until 2026-09-30, when a booking's add-ons became bill
 * lines (`addOnsTotal`, inside `extrasTotal`). A screen that means "the price
 * of this booking" — a client's spend, a list's Total, the base a percentage
 * is taken of — reads this, so it shows and charges what it did before. A
 * booking made before then still carries its add-ons inside `totalCost` and
 * has no lines, so the sum is right for both.
 *
 * It is NOT the bill: `amountDue` is, with everything added at the counter
 * and the discount. And it is NOT the tax base of the service: that is
 * `totalCost` alone, because the add-ons are taxed as the lines they are.
 */
export function bookingValue(booking: {
  totalCost?: number;
  addOnsTotal?: number;
}): number {
  return (booking.totalCost ?? 0) + (booking.addOnsTotal ?? 0);
}
