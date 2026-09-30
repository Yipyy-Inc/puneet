import type { PricingRuleAdjustment } from "@/lib/pricing-rules";
import {
  customFeeLine,
  type CustomFeeCharge,
} from "@/lib/pricing/service-charge-lines";
import type { CustomFee } from "@/types/boarding";

// ============================================================================
// AN ESTIMATE'S FEES, ONE LINE EACH (2026-09-30).
//
// The booking form wrote the facility's automatic fees into ONE line with
// everything else the price held beyond the service and its add-ons ("Fees and
// adjustments"), and a booking made from the estimate took that money into its
// own price. So no fee was a fee line: the invoice did not name it, a report
// that counts fees by rule could not see it — and the till, which adds an
// at-checkout fee a bill does not carry, added it again.
//
// Now each fee is a line of the estimate, carrying the rule that charged it
// (`feeId`), in the shape the server writes a fee onto a bill (`customFeeLine`):
// the same name, unit price, quantity and tax. Converting the estimate writes
// those lines as they stand (lib/estimates/convert-estimate.ts).
// ============================================================================

/** An estimate line that charges one of the facility's fees. */
export interface EstimateFeeLine {
  label: string;
  /** One unit. Negative for a fee the facility set up as a discount. */
  amount: number;
  quantity: number;
  /** Only when the fee is not taxed; absent means taxed, as on every line. */
  taxable?: false;
  feeId: string;
}

/**
 * The fees the form's pricing applied, as estimate lines. Only what it
 * applied: a fee that discount stacking dropped is not in `adjustments`, and a
 * fee the facility has since deleted has no rule to name.
 */
export function estimateFeeLines(input: {
  adjustments: readonly PricingRuleAdjustment[];
  fees: readonly CustomFee[];
}): EstimateFeeLine[] {
  const byId = new Map(input.fees.map((fee) => [fee.id, fee]));
  return input.adjustments.flatMap((adjustment) => {
    if (adjustment.source !== "custom_fee" || !adjustment.feeId) return [];
    const fee = byId.get(adjustment.feeId);
    if (!fee) return [];
    // The charge the pricing worked out, rebuilt, so the line is the one the
    // server would have written for it — cap and all.
    const charge: CustomFeeCharge = {
      unitAmount: adjustment.unitAmount ?? Math.abs(adjustment.amount),
      quantity: adjustment.quantity ?? 1,
      total: Math.abs(adjustment.amount),
      isDiscount: adjustment.adjustmentKind === "discount",
    };
    const line = customFeeLine(fee, charge);
    return [
      {
        label: line.name,
        amount: line.unitPrice,
        quantity: line.quantity,
        ...(line.taxable ? {} : { taxable: false as const }),
        feeId: line.feeId,
      },
    ];
  });
}
