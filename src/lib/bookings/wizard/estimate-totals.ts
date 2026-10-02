import { computeTax, type TaxConfig } from "@/lib/settings/tax";

// ============================================================================
// The estimate's bottom lines (the client's mock, 2026-10-01): Subtotal, each
// tax by the facility's own settings ("GST 5%", "QST 9.975%"), Total.
//
// A booking's price is saved WITHOUT tax — tax is charged at payment, by the
// same `computeTax` — so this is what the client will pay, shown, not what is
// written. The wizard's footer ("ESTIMATE $794.48") shows the same Total.
// ============================================================================

export interface EstimateTotals {
  subtotal: number;
  taxes: Array<{ name: string; rate: number; amount: number }>;
  total: number;
  /** The facility's prices already contain the tax: shown, not added. */
  included: boolean;
}

export function estimateTotals(
  subtotal: number,
  config: TaxConfig,
): EstimateTotals {
  const cents = Math.round(subtotal * 100);
  const tax = computeTax(cents, config);
  const taxes = tax.lines.map((line) => ({
    name: line.name,
    rate: line.rate,
    amount: line.amountCents / 100,
  }));
  const included = config.pricesIncludeTax;
  return {
    subtotal,
    taxes,
    total: included ? subtotal : (cents + tax.totalCents) / 100,
    included,
  };
}
