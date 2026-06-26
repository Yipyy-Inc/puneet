import type { MissedCallStatus } from "@/types/support-call";

export function formatWait(seconds: number): string {
  if (seconds < 60) return `${seconds}s waiting`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${s}s waiting`;
}

export function formatMinutesAgo(min: number): string {
  if (min < 1) return "just now";
  if (min < 60) return `${min} min ago`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h}h ${m}m ago` : `${h}h ago`;
}

export const MISSED_STATUS_META: Record<
  MissedCallStatus,
  { label: string; className: string }
> = {
  unresolved: {
    label: "Unresolved",
    className:
      "border-rose-500/20 bg-rose-500/10 text-rose-600 dark:text-rose-300",
  },
  called_back: {
    label: "Called Back",
    className:
      "border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300",
  },
  pending: {
    label: "Pending",
    className:
      "border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-300",
  },
};
