import type { Client, Membership, ClientPackage } from "@/types/client";
import type { Invoice } from "@/types/booking";

export type BenefitKind =
  | "package_credit"
  | "membership_discount"
  | "store_credit"
  | "loyalty_points";

export interface AppliedBenefit {
  kind: BenefitKind;
  label: string;
  description: string;
  savings: number;
  // Display-only metadata
  badgeTone: "emerald" | "blue" | "violet" | "amber";
  // What the benefit consumed (for audit display only)
  meta?: {
    creditsUsed?: number;
    percent?: number;
    storeCreditApplied?: number;
    pointsRedeemed?: number;
    packageName?: string;
    membershipPlan?: string;
  };
}

export interface BenefitsEvaluation {
  applied: AppliedBenefit[];
  totalSavings: number;
  /** The final amount the client owes after applying all enabled benefits. */
  adjustedTotal: number;
}

interface EvaluateOptions {
  /** When the user has manually toggled a benefit OFF, its kind appears here. */
  disabledKinds?: Set<BenefitKind>;
}

/**
 * Resolve which benefits a client is eligible for and compute the optimal
 * combination, applied in the priority order:
 *   Package → Membership → Discount → Store Credit → Tax
 *
 * The function never mutates the invoice. Callers display the result; they may
 * also persist it onto the invoice object when the booking transitions from
 * Estimate → Open at check-in.
 */
export function evaluateBenefits(
  client: Pick<Client, "membership" | "packages" | "storeCredit">,
  invoice: Pick<Invoice, "subtotal" | "items" | "taxAmount" | "total">,
  options: EvaluateOptions = {},
): BenefitsEvaluation {
  const disabled = options.disabledKinds ?? new Set<BenefitKind>();
  const applied: AppliedBenefit[] = [];
  let runningSubtotal = invoice.subtotal;

  // 1) Package credit — covers a service line at face value if the package
  //    has remaining credits and the moduleId matches a service item.
  if (!disabled.has("package_credit")) {
    const packageBenefit = pickPackageBenefit(client.packages, invoice);
    if (packageBenefit) {
      applied.push(packageBenefit);
      runningSubtotal -= packageBenefit.savings;
    }
  }

  // 2) Membership discount — percentage off the (remaining) subtotal.
  if (!disabled.has("membership_discount")) {
    const membershipBenefit = pickMembershipBenefit(
      client.membership,
      runningSubtotal,
    );
    if (membershipBenefit) {
      applied.push(membershipBenefit);
      runningSubtotal -= membershipBenefit.savings;
    }
  }

  // 3) Store credit — applied as a flat reduction (capped at remaining due).
  if (!disabled.has("store_credit")) {
    const storeCreditBenefit = pickStoreCreditBenefit(
      client.storeCredit?.balance ?? 0,
      runningSubtotal + invoice.taxAmount,
    );
    if (storeCreditBenefit) {
      applied.push(storeCreditBenefit);
    }
  }

  const totalSavings = applied.reduce((sum, b) => sum + b.savings, 0);
  const adjustedTotal = Math.max(0, invoice.total - totalSavings);

  return {
    applied,
    totalSavings: Math.round(totalSavings * 100) / 100,
    adjustedTotal: Math.round(adjustedTotal * 100) / 100,
  };
}

function pickPackageBenefit(
  packages: ClientPackage[] | undefined,
  invoice: Pick<Invoice, "items">,
): AppliedBenefit | null {
  if (!packages || packages.length === 0) return null;

  const eligible = packages.find((p) => p.remainingCredits > 0);
  if (!eligible) return null;

  // Try to find a service line that matches the package's module.
  const matchingItem =
    invoice.items.find(
      (item) => item.moduleId && item.moduleId === eligible.moduleId,
    ) ?? invoice.items.find((item) => !item.type || item.type === "service");

  if (!matchingItem) return null;

  // The package covers up to one credit's worth at this line's unit price.
  const savings =
    Math.min(matchingItem.unitPrice, eligible.pricePerCredit) *
    Math.min(matchingItem.quantity, 1);

  if (savings <= 0) return null;

  return {
    kind: "package_credit",
    label: "Package Credit",
    description: `${eligible.name} · 1 credit applied (${eligible.remainingCredits - 1} remaining)`,
    savings: Math.round(savings * 100) / 100,
    badgeTone: "emerald",
    meta: { creditsUsed: 1, packageName: eligible.name },
  };
}

function pickMembershipBenefit(
  membership: Membership | undefined,
  remainingSubtotal: number,
): AppliedBenefit | null {
  if (!membership) return null;
  if (membership.status !== "active") return null;
  const pct = membership.benefits.discountPercent;
  if (!pct || pct <= 0) return null;
  if (remainingSubtotal <= 0) return null;

  const savings = (remainingSubtotal * pct) / 100;
  return {
    kind: "membership_discount",
    label: `${membership.plan} Membership`,
    description: `${pct}% off services`,
    savings: Math.round(savings * 100) / 100,
    badgeTone: "blue",
    meta: { percent: pct, membershipPlan: membership.plan },
  };
}

function pickStoreCreditBenefit(
  balance: number,
  outstandingAmount: number,
): AppliedBenefit | null {
  if (balance <= 0) return null;
  if (outstandingAmount <= 0) return null;
  const applied = Math.min(balance, outstandingAmount);
  if (applied <= 0) return null;

  return {
    kind: "store_credit",
    label: "Store Credit",
    description: `$${applied.toFixed(2)} of $${balance.toFixed(2)} balance applied`,
    savings: Math.round(applied * 100) / 100,
    badgeTone: "violet",
    meta: { storeCreditApplied: applied },
  };
}
