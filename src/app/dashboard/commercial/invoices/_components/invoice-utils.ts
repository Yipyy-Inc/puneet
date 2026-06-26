import type {
  PlatformInvoice,
  PlatformInvoiceStatus,
} from "@/types/platform-invoices";

export type RangePreset = "month" | "30d" | "3m" | "year" | "all" | "custom";

export const RANGE_OPTIONS: { value: RangePreset; label: string }[] = [
  { value: "month", label: "This month" },
  { value: "30d", label: "Last 30 days" },
  { value: "3m", label: "Last 3 months" },
  { value: "year", label: "This year" },
  { value: "all", label: "All time" },
  { value: "custom", label: "Custom range" },
];

export const STATUS_TABS: {
  value: "All" | PlatformInvoiceStatus;
  label: string;
}[] = [
  { value: "All", label: "All" },
  { value: "Paid", label: "Paid" },
  { value: "Sent", label: "Sent" },
  { value: "Overdue", label: "Overdue" },
  { value: "Draft", label: "Draft" },
  { value: "Void", label: "Void" },
];

export const STATUS_BADGE: Record<PlatformInvoiceStatus, string> = {
  Paid: "border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300",
  Sent: "border-sky-500/20 bg-sky-500/10 text-sky-600 dark:text-sky-300",
  Overdue: "border-rose-500/20 bg-rose-500/10 text-rose-600 dark:text-rose-300",
  Draft:
    "border-slate-400/20 bg-slate-400/10 text-slate-600 dark:text-slate-300",
  Void: "border-muted bg-muted text-muted-foreground line-through",
};

export function formatMoney(amount: number, currency = "USD"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function rangeFromPreset(
  preset: RangePreset,
  now: Date,
  customFrom?: string,
  customTo?: string,
): { from: Date; to: Date } {
  // End of today, so invoices issued "today" (parsed as UTC midnight) are not
  // excluded in positive-offset timezones.
  const to = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    23,
    59,
    59,
    999,
  );
  switch (preset) {
    case "month":
      return { from: new Date(now.getFullYear(), now.getMonth(), 1), to };
    case "30d": {
      const from = new Date(to);
      from.setDate(from.getDate() - 30);
      return { from, to };
    }
    case "3m":
      return { from: new Date(now.getFullYear(), now.getMonth() - 2, 1), to };
    case "year":
      return { from: new Date(now.getFullYear(), 0, 1), to };
    case "custom":
      return {
        from: customFrom ? new Date(customFrom) : new Date(2000, 0, 1),
        to: customTo ? new Date(customTo) : to,
      };
    case "all":
    default:
      return { from: new Date(2000, 0, 1), to };
  }
}

export function isWithinRange(iso: string, from: Date, to: Date): boolean {
  const d = new Date(iso);
  return d >= from && d <= to;
}

export function isCurrentMonth(iso: string, now: Date): boolean {
  const d = new Date(iso);
  return (
    d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
  );
}

/** Whole hours until an auto-send timestamp (date-only), floored at 0. */
export function hoursUntil(iso: string, now: Date): number {
  const target = new Date(iso).getTime();
  return Math.max(0, Math.round((target - now.getTime()) / 3_600_000));
}

export function invoiceTotals(invoices: PlatformInvoice[]) {
  const sum = (pred: (i: PlatformInvoice) => boolean) =>
    invoices.filter(pred).reduce((s, i) => s + i.amount, 0);
  return {
    collected: sum((i) => i.status === "Paid"),
    outstanding: sum((i) => i.status === "Sent" || i.status === "Overdue"),
    overdue: sum((i) => i.status === "Overdue"),
  };
}
