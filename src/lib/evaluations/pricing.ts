// ============================================================================
// What an evaluation costs, and what of it comes back — the client's mock
// (2026-10-02):
//
//   Price                  $45 per pet
//   Allow multiple pets    2nd pet at 50%
//   Take a deposit         Full price  ·  "Paid now · credited to their first
//                                          day if approved"
//                          50%         ·  "50% now, rest at check-in"
//
// Pure, so the wizard's Summary, the server's re-price of a customer's
// request and the store credit an approval grants are one calculation.
// ============================================================================

/** Every pet after the first in one evaluation pays this share ("2nd pet at 50%"). */
export const ADDITIONAL_PET_SHARE = 0.5;

const cents = (n: number) => Math.round(n * 100) / 100;

/**
 * Each pet's price, in the order they were picked: the first at the full
 * price, the rest at half when several pets share one evaluation.
 */
export function evaluationPetPrices(
  price: number,
  petCount: number,
  multiPet: boolean,
): number[] {
  const unit = Math.max(0, price);
  return Array.from({ length: Math.max(0, petCount) }, (_, index) =>
    index === 0 || !multiPet ? cents(unit) : cents(unit * ADDITIONAL_PET_SHARE),
  );
}

export function evaluationTotal(
  price: number,
  petCount: number,
  multiPet: boolean,
): number {
  return cents(
    evaluationPetPrices(price, petCount, multiPet).reduce((s, p) => s + p, 0),
  );
}

/** The deposit a rule of `percent` takes on `total` (full price = 100). */
export function evaluationDeposit(total: number, percent: number): number {
  if (!(percent > 0) || !(total > 0)) return 0;
  return cents((total * Math.min(100, percent)) / 100);
}

/**
 * The store credit an approval grants one pet — the database's rule
 * (private.grant_evaluation_credit), here so a screen can say it: an equal
 * share of what the evaluation was paid, the last pet by number taking the
 * cent a split leaves over, so when every pet passes exactly what was paid
 * comes back. A pet not approved keeps its share as the evaluation's fee;
 * nothing paid, nothing credited.
 */
export function evaluationCreditShare(input: {
  /** What the booking has been paid, net of refunds, tips aside. */
  paid: number;
  petCount: number;
  /** The pet's place among the booking's pets by pet number, from 0. */
  petIndex: number;
}): number {
  const { paid, petCount, petIndex } = input;
  if (!(paid > 0) || petCount < 1 || petIndex < 0 || petIndex >= petCount) {
    return 0;
  }
  const share = cents(paid / petCount);
  return petIndex === petCount - 1
    ? cents(paid - share * (petCount - 1))
    : share;
}
