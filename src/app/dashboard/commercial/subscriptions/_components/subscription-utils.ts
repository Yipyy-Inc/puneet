import type { SubscriptionBillingStatus } from "@/lib/api/subscriptions";

export const STATUS_TABS: {
  value: "all" | SubscriptionBillingStatus;
  label: string;
}[] = [
  { value: "all", label: "All" },
  { value: "active", label: "Active" },
  { value: "trial", label: "Trial" },
  { value: "past_due", label: "Past Due" },
  { value: "paused", label: "Paused" },
  { value: "cancelled", label: "Cancelled" },
];

export const STATUS_BADGE: Record<SubscriptionBillingStatus, string> = {
  active:
    "border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300",
  trial:
    "border-violet-500/20 bg-violet-500/10 text-violet-600 dark:text-violet-300",
  past_due:
    "border-rose-500/20 bg-rose-500/10 text-rose-600 dark:text-rose-300",
  paused:
    "border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-300",
  cancelled:
    "border-slate-400/20 bg-slate-400/10 text-slate-600 dark:text-slate-300",
};

export const STATUS_LABEL: Record<SubscriptionBillingStatus, string> = {
  active: "Active",
  trial: "Trial",
  past_due: "Past Due",
  paused: "Paused",
  cancelled: "Cancelled",
};

export function formatMoney(amount: number, currency = "USD"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatCycle(cycle: string): string {
  return cycle === "yearly"
    ? "Yearly"
    : cycle === "quarterly"
      ? "Quarterly"
      : "Monthly";
}

export function formatRenewal(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
