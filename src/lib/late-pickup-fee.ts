import { getStoredPricingRules } from "@/lib/pricing-rules";

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
  scopeKey?: string | number;
}

export function computeLatePickupFee(input: LateFeeInput): LateFeeResult | null {
  const rules = getStoredPricingRules(input.scopeKey);
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
