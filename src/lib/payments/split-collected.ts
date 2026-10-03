// ============================================================================
// A part payment, read back into what the ledger records.
//
// The payment dialog's "Custom amount" asks for what the customer HANDS OVER
// — tax included, as the mock's "Collecting now" says. The ledger keeps the
// supply and its tax apart (20260819210000), and the card routes add the tax
// to a supply themselves (`taxToAddCents`). So the figure typed has to be
// turned back into the supply whose supply-plus-tax it is.
//
// There is no formula for that: tax is rounded per line, and per compound
// step, so `supply × (1 + rate)` does not invert exactly. This searches the
// cents around the estimate with the SAME tax function the server uses, and
// returns the largest supply whose total does not exceed what was asked — so
// the customer is never charged a cent more than the figure on the button,
// and the button shows the figure that will actually be charged.
// ============================================================================

export interface CollectedSplit {
  subtotalCents: number;
  taxCents: number;
  totalCents: number;
}

/**
 * @param collectedCents what the customer pays now, tax included, tip excluded
 * @param owedCents      the supply still owed (`balanceOf`, in cents)
 * @param taxFor         the tax a supply of so many cents adds — the facility's
 *                       own (`taxToAddCents` on the server, the same split
 *                       client-side)
 */
export function splitCollected(
  collectedCents: number,
  owedCents: number,
  taxFor: (subtotalCents: number) => number,
): CollectedSplit {
  const none = { subtotalCents: 0, taxCents: 0, totalCents: 0 };
  if (!Number.isFinite(collectedCents) || collectedCents <= 0) return none;
  if (!Number.isFinite(owedCents) || owedCents <= 0) return none;

  // Everything that is owed, and no more: a custom amount above the balance
  // is the balance.
  const fullTax = taxFor(owedCents);
  if (collectedCents >= owedCents + fullTax) {
    return {
      subtotalCents: owedCents,
      taxCents: fullTax,
      totalCents: owedCents + fullTax,
    };
  }

  const rate = fullTax / owedCents;
  let supply = Math.min(
    owedCents,
    Math.max(0, Math.floor(collectedCents / (1 + rate))),
  );
  // The estimate lands within a cent or two; walk to the exact answer.
  while (
    supply < owedCents &&
    supply + 1 + taxFor(supply + 1) <= collectedCents
  ) {
    supply += 1;
  }
  while (supply > 0 && supply + taxFor(supply) > collectedCents) {
    supply -= 1;
  }
  const tax = supply > 0 ? taxFor(supply) : 0;
  return { subtotalCents: supply, taxCents: tax, totalCents: supply + tax };
}
