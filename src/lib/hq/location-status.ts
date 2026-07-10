import type { LocationHours, LocationWeeklyHours } from "@/types/location";

// Shared live-status derivations for the HQ Command Center (Network Status Bar
// + Location Cards). Live counts are not held in a dedicated store yet, so they
// are derived deterministically from the real data layer — no fabricated
// numbers. Swap these helpers when a live head-count feed lands.

export type OpenState = "open" | "limited" | "closed";

const DAY_KEYS: (keyof LocationWeeklyHours)[] = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
];

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

function spanMinutes(h: LocationHours): number {
  return h.closed ? 0 : toMinutes(h.close) - toMinutes(h.open);
}

function maxWeeklySpan(hours: LocationWeeklyHours): number {
  return Math.max(...DAY_KEYS.map((k) => spanMinutes(hours[k])));
}

/** Open right now (full schedule) / Limited (open but on a reduced day) / Closed. */
export function deriveOpenState(
  hours: LocationWeeklyHours,
  now: Date,
): OpenState {
  const today = hours[DAY_KEYS[now.getDay()]];
  if (today.closed) return "closed";
  const nowMins = now.getHours() * 60 + now.getMinutes();
  const open = toMinutes(today.open);
  const close = toMinutes(today.close);
  if (nowMins < open || nowMins >= close) return "closed";
  return close - open < maxWeeklySpan(hours) ? "limited" : "open";
}

export const OPEN_STATE_META: Record<
  OpenState,
  { label: string; className: string }
> = {
  open: {
    label: "Open",
    className:
      "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20",
  },
  limited: {
    label: "Limited Hours",
    className:
      "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20",
  },
  closed: {
    label: "Closed",
    className: "bg-muted text-muted-foreground border-transparent",
  },
};

/**
 * Occupied count from capacity × occupancy rate; null when the service is not
 * offered at this location (so callers can omit it entirely).
 */
export function liveCount(
  capacity: number | undefined,
  occupancyRate: number,
): number | null {
  if (!capacity) return null;
  return Math.min(capacity, Math.round((capacity * occupancyRate) / 100));
}
