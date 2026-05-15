// Derive live status + delay flags from a van's ping history. Pure
// functions — no React, no localStorage — so they're easy to test and
// reason about. The UI feeds them ping arrays and gets back a structured
// description it can render.

import type {
  GroomingAppointment,
  VanLiveStatus,
  VanLocationPing,
} from "@/types/grooming";

/** Minutes a ping must be older than for the van to be considered "stale." */
const STALE_THRESHOLD_MIN = 3;
/** Extra minutes beyond the scheduled duration before the delay flag fires. */
export const DELAY_FLAG_GRACE_MIN = 15;

function timeBetweenMin(aIso: string, bIso: string): number {
  return Math.abs(new Date(aIso).getTime() - new Date(bIso).getTime()) / 60_000;
}

function timeToMin(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

/** Filter a ping list to a single ISO date, ordered earliest first. */
export function pingsForDate(
  pings: VanLocationPing[],
  vanId: string,
  date: string,
): VanLocationPing[] {
  return pings
    .filter((p) => p.vanId === vanId && p.recordedAt.startsWith(date))
    .sort((a, b) => a.recordedAt.localeCompare(b.recordedAt));
}

export type VanLiveSummary = {
  vanId: string;
  status: VanLiveStatus;
  /** Latest ping, when any exist for the day. */
  latestPing?: VanLocationPing;
  /** ISO of the moment the van became stationary at the current location. */
  stoppedSinceIso?: string;
  /** Minutes elapsed since the van stopped (only when status = "stopped"). */
  stoppedForMin?: number;
  /** Current appointment the van is at (if pings include the link). */
  currentAppointmentId?: string;
  /** When stopped at an appointment longer than its expected duration plus
   *  the grace window — a gentle delay heads-up for the manager. */
  delay?: {
    /** Scheduled minutes for the current appointment. */
    scheduledMin: number;
    /** Minutes the van has been at the stop. */
    actualMin: number;
    /** Minutes over schedule. */
    overMin: number;
    appointment: GroomingAppointment;
  };
};

/**
 * Derive a van's live status. Two pings within `STALE_THRESHOLD_MIN` minutes
 * of the latest with different coordinates → driving. Within threshold but
 * same coordinates → stopped. Latest older than threshold → no-location.
 * No pings for the day → no-data-all-day.
 */
export function deriveVanLiveStatus(args: {
  vanId: string;
  pings: VanLocationPing[];
  appointments: GroomingAppointment[];
  /** "Now" as an ISO string — supplied so tests can pin a deterministic time. */
  nowIso?: string;
  /** "Today" ISO date. Defaults to system today. */
  todayDate?: string;
}): VanLiveSummary {
  const now = args.nowIso ? new Date(args.nowIso) : new Date();
  const today = args.todayDate ?? now.toISOString().split("T")[0];
  const dayPings = pingsForDate(args.pings, args.vanId, today);

  if (dayPings.length === 0) {
    return { vanId: args.vanId, status: "no-data-all-day" };
  }

  const latest = dayPings[dayPings.length - 1];
  const minutesSinceLatest = timeBetweenMin(now.toISOString(), latest.recordedAt);

  if (minutesSinceLatest > STALE_THRESHOLD_MIN) {
    return {
      vanId: args.vanId,
      status: "no-location",
      latestPing: latest,
    };
  }

  // Within threshold — driving vs stopped depends on whether the van has
  // moved. Compare against the earliest ping inside the threshold window.
  const recent = dayPings.filter(
    (p) =>
      timeBetweenMin(now.toISOString(), p.recordedAt) <= STALE_THRESHOLD_MIN,
  );
  const hasMoved = recent.some(
    (p) =>
      p.lat !== undefined &&
      latest.lat !== undefined &&
      (Math.abs((p.lat ?? 0) - (latest.lat ?? 0)) > 0.0001 ||
        Math.abs((p.lng ?? 0) - (latest.lng ?? 0)) > 0.0001),
  );

  if (hasMoved) {
    return {
      vanId: args.vanId,
      status: "driving",
      latestPing: latest,
    };
  }

  // Stopped — when the van first stopped at this position. Walk backward
  // through pings collecting the run with the same coordinates.
  let stoppedSinceIso = latest.recordedAt;
  for (let i = dayPings.length - 2; i >= 0; i--) {
    const p = dayPings[i];
    if (
      p.lat !== undefined &&
      latest.lat !== undefined &&
      Math.abs(p.lat - latest.lat) <= 0.0001 &&
      Math.abs((p.lng ?? 0) - (latest.lng ?? 0)) <= 0.0001
    ) {
      stoppedSinceIso = p.recordedAt;
    } else {
      break;
    }
  }
  const stoppedForMin = Math.round(
    timeBetweenMin(now.toISOString(), stoppedSinceIso),
  );

  // Delay heuristic — only fires when we know which appointment the van is
  // at AND the actual stop duration exceeds scheduled + grace.
  let delay: VanLiveSummary["delay"];
  if (latest.currentAppointmentId) {
    const apt = args.appointments.find(
      (a) => a.id === latest.currentAppointmentId,
    );
    if (apt) {
      const scheduledMin =
        timeToMin(apt.endTime) - timeToMin(apt.startTime);
      const overMin = stoppedForMin - scheduledMin;
      if (overMin >= DELAY_FLAG_GRACE_MIN) {
        delay = {
          scheduledMin,
          actualMin: stoppedForMin,
          overMin,
          appointment: apt,
        };
      }
    }
  }

  return {
    vanId: args.vanId,
    status: "stopped",
    latestPing: latest,
    stoppedSinceIso,
    stoppedForMin,
    currentAppointmentId: latest.currentAppointmentId,
    delay,
  };
}

/** Human-readable label + Tailwind color helper for a live status. */
export function describeVanStatus(status: VanLiveStatus): {
  label: string;
  dot: string;
  bg: string;
  text: string;
} {
  switch (status) {
    case "driving":
      return {
        label: "Driving",
        dot: "bg-sky-500 animate-pulse",
        bg: "bg-sky-50 dark:bg-sky-950/30",
        text: "text-sky-800 dark:text-sky-200",
      };
    case "stopped":
      return {
        label: "Stopped",
        dot: "bg-emerald-500",
        bg: "bg-emerald-50 dark:bg-emerald-950/30",
        text: "text-emerald-800 dark:text-emerald-200",
      };
    case "no-location":
      return {
        label: "No location data",
        dot: "bg-amber-500",
        bg: "bg-amber-50 dark:bg-amber-950/30",
        text: "text-amber-800 dark:text-amber-200",
      };
    case "no-data-all-day":
      return {
        label: "No data all day",
        dot: "bg-slate-400",
        bg: "bg-slate-100 dark:bg-slate-800/50",
        text: "text-slate-700 dark:text-slate-300",
      };
  }
}
