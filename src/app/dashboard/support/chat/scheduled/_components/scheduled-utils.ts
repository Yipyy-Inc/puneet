import { Mail, MessagesSquare, type LucideIcon } from "lucide-react";

import type { ScheduledChannel } from "@/types/scheduled-support-message";

export const CHANNEL_META: Record<
  ScheduledChannel,
  { label: string; icon: LucideIcon; badge: string }
> = {
  chat: {
    label: "Chat",
    icon: MessagesSquare,
    badge: "border-sky-500/20 bg-sky-500/10 text-sky-600 dark:text-sky-300",
  },
  email: {
    label: "Email",
    icon: Mail,
    badge:
      "border-violet-500/20 bg-violet-500/10 text-violet-600 dark:text-violet-300",
  },
};

export type ChannelFilter = "all" | ScheduledChannel;

export const CHANNEL_FILTERS: { key: ChannelFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "chat", label: "Chat" },
  { key: "email", label: "Email" },
];

/** Day header, e.g. "Mon, Jun 29, 2026". */
export function formatDay(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/** Send time, e.g. "9:00 AM". */
export function formatClock(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

/** "Sending now…" once due, otherwise a relative countdown. */
export function timeUntil(iso: string, nowMs: number): string {
  const ms = new Date(iso).getTime() - nowMs;
  if (ms <= 0) return "Sending now…";
  const m = Math.round(ms / 60_000);
  if (m < 60) return `in ${m}m`;
  const h = Math.round(m / 60);
  if (h < 48) return `in ${h}h`;
  const d = Math.round(h / 24);
  return `in ${d}d`;
}

export function isDue(iso: string, nowMs: number): boolean {
  return new Date(iso).getTime() - nowMs <= 0;
}

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

/** Split an ISO timestamp into local date (YYYY-MM-DD) + time (HH:MM) parts
 *  for the DatePicker / TimePickerLux inputs. */
export function isoToParts(iso: string): { date: string; time: string } {
  const d = new Date(iso);
  return {
    date: `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`,
    time: `${pad2(d.getHours())}:${pad2(d.getMinutes())}`,
  };
}

/** Recombine local date + time parts back into an ISO timestamp. */
export function partsToIso(date: string, time: string): string {
  const [y, mo, da] = date.split("-").map(Number);
  const [h, mi] = time.split(":").map(Number);
  return new Date(y, mo - 1, da, h, mi, 0, 0).toISOString();
}
