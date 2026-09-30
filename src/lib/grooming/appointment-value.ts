/**
 * What a groom is worth: its service and its own add-ons.
 *
 * `totalPrice` (the booking's `total_cost`) held both until 2026-09-30, when a
 * booking's add-ons became bill lines; a revenue tile that went on summing
 * `totalPrice` alone would have dropped every add-on sold since. An older
 * groom still carries its add-ons inside `totalPrice` and has no lines, so the
 * sum is right for both.
 */
export function appointmentValue(apt: {
  totalPrice?: number;
  addOnsTotal?: number;
}): number {
  return (apt.totalPrice ?? 0) + (apt.addOnsTotal ?? 0);
}
