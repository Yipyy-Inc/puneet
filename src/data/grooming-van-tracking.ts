// Mock real-time tracking pings for mobile grooming vans. Pings are
// generated deterministically for the current day from the day's
// appointments so the live-tracking UI has plausible data without needing
// real GPS. Yesterday's pings auto-expire — the helper filters by today.

import type { VanLocationPing } from "@/types/grooming";

/** Stable hash → [0, 1) so the mock generator is deterministic per id. */
function hash01(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h) / 2 ** 31;
}

/**
 * Generate a deterministic list of pings for one van across the working
 * day. The pings simulate a van that drives between stops, sits at each
 * stop for the appointment duration, then drives to the next. The result
 * is intentionally repeatable so the UI looks the same on each render.
 */
export function generateMockVanPings(args: {
  vanId: string;
  date: string;
  appointments: Array<{
    id: string;
    startTime: string;
    endTime: string;
    address?: string;
  }>;
  /** "Now" in minutes-since-midnight. Caller passes this so the matter of
   *  what's "current" can be controlled in tests / scenarios. */
  nowMinutes: number;
  /** Override the van's per-stop duration delay in minutes; defaults to 0. */
  extraDelayPerStopMin?: number;
}): VanLocationPing[] {
  const { vanId, date, appointments, nowMinutes, extraDelayPerStopMin = 0 } =
    args;
  if (appointments.length === 0) return [];

  const sorted = [...appointments].sort((a, b) =>
    a.startTime.localeCompare(b.startTime),
  );
  const pings: VanLocationPing[] = [];
  const seed = hash01(vanId);

  function toMin(t: string): number {
    const [h, m] = t.split(":").map(Number);
    return h * 60 + m;
  }
  function toIso(minutes: number): string {
    const d = new Date(date + "T00:00:00");
    d.setMinutes(d.getMinutes() + minutes);
    return d.toISOString();
  }

  // Anchor coordinates around a fake facility base, deterministic per van.
  const baseLat = 45.5 + seed * 0.05;
  const baseLng = -73.6 + seed * 0.05;

  for (let i = 0; i < sorted.length; i++) {
    const apt = sorted[i];
    const startMin = toMin(apt.startTime);
    const endMin = toMin(apt.endTime) + extraDelayPerStopMin;

    // Driving pings before the appointment — one every 3 minutes for the 9
    // minutes leading up to start, with moving coordinates.
    for (let m = 9; m >= 3; m -= 3) {
      const t = startMin - m;
      if (t < 6 * 60 || t > nowMinutes) continue;
      pings.push({
        id: `ping-${vanId}-${apt.id}-pre-${m}`,
        vanId,
        recordedAt: toIso(t),
        lat: baseLat + (seed + i + m / 30) * 0.01,
        lng: baseLng + (seed - m / 30) * 0.01,
      });
    }

    // Stopped pings during the appointment — same coordinates every 3 minutes.
    const stopLat = baseLat + (seed + i) * 0.012;
    const stopLng = baseLng + (seed - i) * 0.012;
    for (let t = startMin; t <= endMin; t += 3) {
      if (t > nowMinutes) break;
      pings.push({
        id: `ping-${vanId}-${apt.id}-stop-${t}`,
        vanId,
        recordedAt: toIso(t),
        lat: stopLat,
        lng: stopLng,
        address: apt.address ?? `Stop ${i + 1} · ${apt.id}`,
        currentAppointmentId: apt.id,
      });
    }
  }
  return pings;
}

/**
 * Demo scenarios baked into the live-tracking view so a manager can see
 * the different states represented without waiting for real GPS. The
 * `extraDelayPerStopMin` knob lets us simulate a stop that's running long
 * to demonstrate the delay-flag feature.
 */
export const trackingScenarios: Record<
  string,
  { extraDelayPerStopMin?: number; noTrackingAllDay?: boolean }
> = {
  // van-1: tracking active, on schedule.
  "van-1": {},
  // van-2: stuck at a stop 30 minutes past schedule — should fire the delay
  // notification.
  "van-2": { extraDelayPerStopMin: 30 },
  // van-3 (if present): no data all day.
  "van-3": { noTrackingAllDay: true },
};
