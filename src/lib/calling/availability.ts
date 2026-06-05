import type { CallAvailability } from "@/types/staff";

// ============================================================
// Call-availability presentation + ring-pool logic. A staff
// member who is busy or away is temporarily removed from the
// inbound ring group / Round-Robin pool (but stays online).
// ============================================================

export const CALL_AVAILABILITY_OPTIONS: CallAvailability[] = [
  "available",
  "busy",
  "away",
];

export const CALL_AVAILABILITY_META: Record<
  CallAvailability,
  { label: string; description: string; dot: string; text: string }
> = {
  available: {
    label: "Available",
    description: "Receiving calls",
    dot: "bg-green-500",
    text: "text-green-600",
  },
  busy: {
    label: "Busy",
    description: "On a task — no calls",
    dot: "bg-orange-500",
    text: "text-orange-600",
  },
  away: {
    label: "Away",
    description: "Stepped out — no calls",
    dot: "bg-gray-400",
    text: "text-gray-500",
  },
};

/** Default timeout (minutes) after which busy/away auto-resets to available. */
export const DEFAULT_AVAILABILITY_TIMEOUT_MIN = 30;
export const AVAILABILITY_TIMEOUT_OPTIONS = [15, 30, 45, 60, 90] as const;

/** Only "available" staff are included in the ring group / Round-Robin pool. */
export function inRingPool(status: CallAvailability | undefined): boolean {
  return (status ?? "available") === "available";
}

/** mm:ss countdown formatting for the auto-reset timer. */
export function formatCountdown(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = Math.max(0, totalSeconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}
