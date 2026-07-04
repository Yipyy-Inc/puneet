import type {
  DepositRule,
  DepositRuleSet,
  DepositRefundPolicy,
} from "@/types/deposit-rules";
import { SERVICE_TYPES_FOR_DEPOSITS } from "@/types/deposit-rules";

const STORAGE_KEY = "yipyy:deposit-rules";

export const defaultDepositRules: DepositRuleSet = [
  {
    id: "deposit-boarding",
    scope: "service",
    serviceType: "boarding",
    amountType: "percentage",
    amount: 30,
    enabled: true,
    label: "Boarding — 30% deposit",
  },
  {
    id: "deposit-grooming",
    scope: "service",
    serviceType: "grooming",
    amountType: "fixed",
    amount: 25,
    enabled: true,
    label: "Grooming — $25 deposit",
  },
  {
    id: "deposit-daycare",
    scope: "service",
    serviceType: "daycare",
    amountType: "fixed",
    amount: 0,
    enabled: false,
    label: "Daycare — no deposit",
  },
  {
    id: "deposit-training",
    scope: "service",
    serviceType: "training",
    amountType: "percentage",
    amount: 50,
    enabled: true,
    label: "Training — 50% deposit",
  },
  {
    id: "deposit-high-value",
    scope: "booking_value",
    amountType: "percentage",
    amount: 25,
    minBookingValue: 200,
    enabled: true,
    label: "Bookings over $200 — 25% deposit",
  },
];

export function ensureAllServiceRules(rules: DepositRuleSet): DepositRuleSet {
  // Drop stale service rules for services that no longer support deposits
  // (e.g. retail/vet from an older persisted set), then backfill any missing.
  const supported = new Set<string>(SERVICE_TYPES_FOR_DEPOSITS);
  rules = rules.filter(
    (r) =>
      r.scope !== "service" ||
      (r.serviceType != null && supported.has(r.serviceType)),
  );
  const present = new Set(
    rules
      .filter((r) => r.scope === "service" && r.serviceType)
      .map((r) => r.serviceType as string),
  );
  const missing = SERVICE_TYPES_FOR_DEPOSITS.filter((s) => !present.has(s)).map(
    (s): DepositRule => ({
      id: `deposit-${s}`,
      scope: "service",
      serviceType: s,
      amountType: "fixed",
      amount: 0,
      enabled: false,
      label: `${s.charAt(0).toUpperCase() + s.slice(1)} — no deposit`,
    }),
  );
  const hasThreshold = rules.some((r) => r.scope === "booking_value");
  const thresholdRule: DepositRule[] = hasThreshold
    ? []
    : [
        {
          id: "deposit-high-value",
          scope: "booking_value",
          amountType: "percentage",
          amount: 25,
          minBookingValue: 200,
          enabled: false,
          label: "Bookings over $200 — 25% deposit",
        },
      ];
  return [...rules, ...missing, ...thresholdRule];
}

export function loadDepositRules(): DepositRuleSet {
  if (typeof window === "undefined") return defaultDepositRules;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultDepositRules;
    const parsed = JSON.parse(raw) as DepositRuleSet;
    return ensureAllServiceRules(parsed);
  } catch {
    return defaultDepositRules;
  }
}

export function saveDepositRules(rules: DepositRuleSet): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(rules));
}

// ── Deposit refund policy (what happens to a deposit on cancellation) ────────

const REFUND_POLICY_KEY = "yipyy:deposit-refund-policy";

export const defaultDepositRefundPolicy: DepositRefundPolicy = {
  type: "full_before_window",
  refundBeforeHours: 24,
};

export function loadDepositRefundPolicy(): DepositRefundPolicy {
  if (typeof window === "undefined") return defaultDepositRefundPolicy;
  try {
    const raw = window.localStorage.getItem(REFUND_POLICY_KEY);
    if (!raw) return defaultDepositRefundPolicy;
    return {
      ...defaultDepositRefundPolicy,
      ...(JSON.parse(raw) as Partial<DepositRefundPolicy>),
    };
  } catch {
    return defaultDepositRefundPolicy;
  }
}

export function saveDepositRefundPolicy(policy: DepositRefundPolicy): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(REFUND_POLICY_KEY, JSON.stringify(policy));
}

export function computeDepositAmount(
  rule: DepositRule,
  bookingTotal: number,
): number {
  if (rule.amountType === "percentage") {
    return Math.round(bookingTotal * (rule.amount / 100) * 100) / 100;
  }
  return rule.amount;
}

export function findApplicableDepositRule(
  service: string | undefined,
  bookingTotal: number,
  rules: DepositRuleSet = defaultDepositRules,
): DepositRule | null {
  const enabled = rules.filter((r) => r.enabled && r.amount > 0);
  if (service) {
    const serviceRule = enabled.find(
      (r) => r.scope === "service" && r.serviceType === service,
    );
    if (serviceRule) return serviceRule;
  }
  const thresholdRule = enabled.find(
    (r) =>
      r.scope === "booking_value" &&
      typeof r.minBookingValue === "number" &&
      bookingTotal >= r.minBookingValue,
  );
  return thresholdRule ?? null;
}
