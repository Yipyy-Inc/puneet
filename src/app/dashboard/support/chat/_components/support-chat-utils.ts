import type { ConversationStatus } from "@/types/support-chat";

export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export const STATUS_META: Record<
  ConversationStatus,
  { label: string; className: string }
> = {
  open: {
    label: "Open",
    className: "border-sky-500/20 bg-sky-500/10 text-sky-600 dark:text-sky-300",
  },
  pending: {
    label: "Pending",
    className:
      "border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-300",
  },
  resolved: {
    label: "Resolved",
    className:
      "border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300",
  },
};

export function accountHealth(status: string): {
  label: string;
  className: string;
} {
  if (status === "active")
    return {
      label: "Healthy",
      className:
        "border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300",
    };
  if (status === "suspended")
    return {
      label: "At risk",
      className:
        "border-rose-500/20 bg-rose-500/10 text-rose-600 dark:text-rose-300",
    };
  return {
    label: "Needs attention",
    className:
      "border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-300",
  };
}

/** Deterministic small count for the "open tickets" quick stat. */
export function stableCount(seed: number, max: number): number {
  let h = 0;
  const s = String(seed);
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h % (max + 1);
}
