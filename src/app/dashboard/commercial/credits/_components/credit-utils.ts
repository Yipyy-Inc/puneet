import type { LedgerKind, LedgerStatus } from "@/types/credit-ledger";

export const CREDIT_REASONS = [
  "Service credit — outage SLA",
  "Goodwill credit — support delay",
  "Onboarding credit",
  "Migration assistance credit",
  "Promotional credit",
  "Other",
];

export const DISCOUNT_REASONS = [
  "Promotional discount",
  "Loyalty / retention",
  "Volume discount",
  "Competitive match",
  "Goodwill",
  "Other",
];

export const DISCOUNT_DURATIONS = [
  "1 month",
  "3 months",
  "6 months",
  "12 months",
  "Forever",
];

export const TAB_DEFS = [
  { value: "all", label: "All" },
  { value: "active_credits", label: "Active Credits" },
  { value: "active_discounts", label: "Active Discounts" },
  { value: "expired", label: "Expired" },
] as const;

export type TabValue = (typeof TAB_DEFS)[number]["value"];

export const TYPE_BADGE: Record<LedgerKind, string> = {
  credit: "border-sky-500/20 bg-sky-500/10 text-sky-600 dark:text-sky-300",
  discount:
    "border-violet-500/20 bg-violet-500/10 text-violet-600 dark:text-violet-300",
};

export const STATUS_BADGE: Record<LedgerStatus, string> = {
  active:
    "border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300",
  expired:
    "border-slate-400/20 bg-slate-400/10 text-slate-500 dark:text-slate-400",
};

export function formatMoney(amount: number, currency = "USD"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(iso: string | null): string {
  if (!iso) return "Never";
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
