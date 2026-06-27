import {
  CheckCircle2,
  PhoneIncoming,
  PhoneMissed,
  PhoneOutgoing,
  Voicemail,
  type LucideIcon,
} from "lucide-react";

import type {
  SupportCallDirection,
  SupportCallLogStatus,
  SupportDepartment,
} from "@/types/support-call";

export const DIRECTION_META: Record<
  SupportCallDirection,
  { label: string; icon: LucideIcon; box: string }
> = {
  inbound: {
    label: "Inbound",
    icon: PhoneIncoming,
    box: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  },
  outbound: {
    label: "Outbound",
    icon: PhoneOutgoing,
    box: "bg-sky-500/10 text-sky-600 dark:text-sky-400",
  },
};

export const STATUS_META: Record<
  SupportCallLogStatus,
  { label: string; badge: string; icon: LucideIcon }
> = {
  completed: {
    label: "Completed",
    badge:
      "border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300",
    icon: CheckCircle2,
  },
  missed: {
    label: "Missed",
    badge: "border-rose-500/20 bg-rose-500/10 text-rose-600 dark:text-rose-300",
    icon: PhoneMissed,
  },
  voicemail: {
    label: "Voicemail",
    badge:
      "border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-300",
    icon: Voicemail,
  },
};

export const DEPARTMENT_META: Record<
  SupportDepartment,
  { label: string; pill: string }
> = {
  billing: {
    label: "Billing",
    pill: "border-orange-500/20 bg-orange-500/10 text-orange-600 dark:text-orange-300",
  },
  technical: {
    label: "Technical",
    pill: "border-blue-500/20 bg-blue-500/10 text-blue-600 dark:text-blue-300",
  },
  general: {
    label: "General",
    pill: "border-slate-400/20 bg-slate-400/10 text-slate-600 dark:text-slate-300",
  },
};

/** Seconds → "m:ss", or "—" for a zero-length (missed) call. */
export function formatDuration(seconds: number): string {
  if (seconds <= 0) return "—";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/** Compact list-row timestamp: time if today, otherwise a short date. */
export function formatRowTime(iso: string, nowMs: number): string {
  const d = new Date(iso);
  if (isSameDay(d, new Date(nowMs))) {
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

/** Full timestamp for the detail panel. */
export function formatFullTime(iso: string): string {
  return new Date(iso).toLocaleString([], {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export type TimeRange = "all" | "today" | "7d" | "30d";

export function inTimeRange(
  iso: string,
  range: TimeRange,
  nowMs: number,
): boolean {
  if (range === "all") return true;
  const t = new Date(iso).getTime();
  if (range === "today") {
    const start = new Date(nowMs);
    start.setHours(0, 0, 0, 0);
    return t >= start.getTime();
  }
  const days = range === "7d" ? 7 : 30;
  return nowMs - t <= days * 86_400_000;
}

export const TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: "all", label: "All Types" },
  { value: "inbound", label: "Inbound" },
  { value: "outbound", label: "Outbound" },
];

export const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: "all", label: "All Statuses" },
  { value: "completed", label: "Completed" },
  { value: "missed", label: "Missed" },
  { value: "voicemail", label: "Voicemail" },
];

export const TIME_OPTIONS: { value: TimeRange; label: string }[] = [
  { value: "all", label: "All Time" },
  { value: "today", label: "Today" },
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
];
