import type { PricingRules } from "@/lib/settings/pricing";

// ============================================================================
// What a guest owes for being collected late.
//
// ── THE RULES ARE PASSED IN, NOT FETCHED ──────────────────────────────────
//
// This used to call `getStoredPricingRules(scopeKey)` itself, which read
// localStorage — so the fee depended on which browser the front desk happened
// to be standing at. The rules now come from `facility_settings` through
// `usePricingRules()`, and a pure function cannot reach a React hook, so the
// caller hands them over.
//
// That is also the better shape regardless: this decides money, and a function
// that decides money should take its inputs rather than go looking for them.
// ============================================================================

export interface LateFeeResult {
  amount: number;
  label: string;
  ruleId: string;
  minutesLate: number;
}

export interface LateFeeInput {
  serviceId: string;
  scheduledEndIso: string;
  actualEndIso: string;
  petCount?: number;
  basePrice?: number;
  /** The facility's own rules, from `usePricingRules()`. */
  rules: PricingRules;
}

export function computeLatePickupFee(
  input: LateFeeInput,
): LateFeeResult | null {
  const { rules } = input;
  // No rule is the ordinary state for a facility that has not set one up, and
  // it means no fee — never a default fee.
  if (!rules?.latePickupFees?.length) return null;

  const scheduled = new Date(input.scheduledEndIso);
  const actual = new Date(input.actualEndIso);
  if (Number.isNaN(scheduled.getTime()) || Number.isNaN(actual.getTime())) {
    return null;
  }

  const minutesLate = (actual.getTime() - scheduled.getTime()) / 60000;
  if (minutesLate <= 0) return null;

  const petCount = Math.max(1, input.petCount ?? 1);
  const basePrice = input.basePrice ?? 0;

  for (const fee of rules.latePickupFees) {
    if (!fee.enabled) continue;
    if (fee.condition !== "late_pickup") continue;
    if (
      fee.applicableServices &&
      fee.applicableServices.length > 0 &&
      !fee.applicableServices.includes(input.serviceId)
    ) {
      continue;
    }

    const billable = minutesLate - Math.max(0, fee.graceMinutes);
    if (billable <= 0) continue;

    let amount = 0;
    switch (fee.feeType) {
      case "flat":
        amount = fee.amount;
        break;
      case "per_hour":
        amount = Math.ceil(billable / 60) * fee.amount;
        break;
      case "per_30min":
        amount = Math.ceil(billable / 30) * fee.amount;
        break;
      case "per_minute":
        amount = billable * fee.amount;
        break;
      case "extra_night":
        amount = basePrice;
        break;
    }

    if (fee.maxFee != null) amount = Math.min(amount, fee.maxFee);
    if (amount <= 0) continue;

    const scopeMultiplier = fee.scope === "per_pet" ? petCount : 1;
    amount = amount * Math.max(1, scopeMultiplier);

    return {
      amount: Math.round(amount * 100) / 100,
      label: fee.name || "Late Pickup Fee",
      ruleId: fee.id,
      minutesLate: Math.round(minutesLate),
    };
  }

  return null;
}
