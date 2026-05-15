// Intelligent Waitlist matching engine. Pure functions — no React, no
// localStorage. Given the current waitlist + day's appointments + staff
// configuration, returns the waitlist entries that have a matching open
// slot today (or this week) along with mobile-grooming driving-time deltas.
//
// Design goals:
//   1. Read-only: the matcher returns recommendations but never mutates state.
//   2. Cheap: O(entries × days × slots-per-day-per-stylist) — fine for hundreds
//      of waitlist entries even on a low-end machine.
//   3. Testable: every preference check is its own function so future
//      changes (e.g. adding a "preferred-station" preference) don't churn
//      the top-level matcher.

import type {
  GroomingAppointment,
  GroomingPackage,
  ServiceArea,
  StaffServiceAreaSchedule,
  Stylist,
} from "@/types/grooming";
import type {
  GroomingWaitlistEntry,
  WaitlistExpectedDate,
  WaitlistExpectedTime,
} from "@/data/grooming-waitlist";
import { getStaffAreaForDate } from "@/lib/service-areas";

const DEFAULT_SERVICE_DURATION_MIN = 60;
const DAY_START_MIN = 8 * 60; // 08:00
const DAY_END_MIN = 19 * 60; // 19:00
const EXACT_TIME_TOLERANCE_MIN = 15;

// ─── Time helpers ────────────────────────────────────────────────────────────

function timeToMin(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

function minToTime(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function periodForStartMin(startMin: number): "morning" | "afternoon" | "evening" {
  if (startMin < 12 * 60) return "morning";
  if (startMin < 17 * 60) return "afternoon";
  return "evening";
}

// ─── Open-slot discovery ─────────────────────────────────────────────────────

export type OpenSlot = {
  stylistId: string;
  stylistName: string;
  date: string;
  startTime: string;
  endTime: string;
  durationMin: number;
};

/**
 * Build the list of contiguous gaps in a stylist's day. Counts only
 * non-cancelled / non-no-show appointments toward "busy" time. The free
 * region is the daily working window minus busy intervals, clipped to the
 * facility's operating hours.
 */
export function findOpenSlotsForDay(
  date: string,
  stylists: Pick<Stylist, "id" | "name" | "status">[],
  appointments: GroomingAppointment[],
): OpenSlot[] {
  const out: OpenSlot[] = [];
  for (const stylist of stylists) {
    if (stylist.status !== "active") continue;
    const busy = appointments
      .filter(
        (a) =>
          a.date === date &&
          a.stylistId === stylist.id &&
          a.status !== "cancelled" &&
          a.status !== "no-show",
      )
      .map((a) => ({
        start: timeToMin(a.startTime),
        end: timeToMin(a.endTime),
      }))
      .sort((x, y) => x.start - y.start);

    let cursor = DAY_START_MIN;
    for (const block of busy) {
      if (block.start > cursor) {
        out.push({
          stylistId: stylist.id,
          stylistName: stylist.name,
          date,
          startTime: minToTime(cursor),
          endTime: minToTime(block.start),
          durationMin: block.start - cursor,
        });
      }
      cursor = Math.max(cursor, block.end);
    }
    if (cursor < DAY_END_MIN) {
      out.push({
        stylistId: stylist.id,
        stylistName: stylist.name,
        date,
        startTime: minToTime(cursor),
        endTime: minToTime(DAY_END_MIN),
        durationMin: DAY_END_MIN - cursor,
      });
    }
  }
  return out;
}

// ─── Preference checks ───────────────────────────────────────────────────────

/** True when the candidate date satisfies the entry's expectedDate variant. */
export function dateMatchesPreference(
  candidateDate: string,
  pref: WaitlistExpectedDate | undefined,
  legacyDate: string | undefined,
  todayISO: string,
): boolean {
  if (!pref) {
    // Legacy entries had a flat `date` field; treat it as an exact preference.
    return !legacyDate || candidateDate === legacyDate;
  }
  switch (pref.kind) {
    case "asap":
      return candidateDate >= todayISO;
    case "specific-date":
      return candidateDate === pref.date;
    case "day-of-week": {
      const dow = new Date(candidateDate + "T00:00:00").getDay();
      return pref.daysOfWeek.includes(dow);
    }
  }
}

/** True when the slot's start time satisfies the entry's expectedTime preference. */
export function timeMatchesPreference(
  slotStart: string,
  pref: WaitlistExpectedTime | undefined,
  legacyWindow: GroomingWaitlistEntry["preferredTimeWindow"],
): boolean {
  const startMin = timeToMin(slotStart);
  if (!pref) {
    if (!legacyWindow || legacyWindow === "anytime") return true;
    if (legacyWindow === "morning") return startMin < 12 * 60;
    if (legacyWindow === "afternoon") return startMin >= 12 * 60;
    return true;
  }
  switch (pref.kind) {
    case "anytime":
      return true;
    case "period":
      return periodForStartMin(startMin) === pref.period;
    case "exact-time": {
      const wanted = timeToMin(pref.time);
      return Math.abs(startMin - wanted) <= EXACT_TIME_TOLERANCE_MIN;
    }
  }
}

/** True when the slot's stylist is acceptable to the entry. */
export function stylistMatchesPreference(
  slotStylistId: string,
  slotStylistName: string,
  entry: GroomingWaitlistEntry,
): boolean {
  if (entry.preferredStylistIds && entry.preferredStylistIds.length > 0) {
    return entry.preferredStylistIds.includes(slotStylistId);
  }
  if (entry.preferredStylistName) {
    return (
      entry.preferredStylistName.toLowerCase() === slotStylistName.toLowerCase()
    );
  }
  return true;
}

// ─── Mobile driving-time estimate ────────────────────────────────────────────

/**
 * Deterministic mock distance estimate (in minutes) between two postal codes.
 * Real implementation would call a routing API; this is just a stable hash
 * so the UI shows plausible numbers in the demo.
 */
function postalDistanceMinutes(a: string, b: string): number {
  const norm = (s: string) =>
    s.toUpperCase().replace(/\s+/g, "").slice(0, 3);
  const fa = norm(a);
  const fb = norm(b);
  if (fa === fb) return 4;
  let diff = 0;
  for (let i = 0; i < 3; i++) {
    diff += Math.abs((fa.charCodeAt(i) || 0) - (fb.charCodeAt(i) || 0));
  }
  // Squash into a sensible 5–35 minute range deterministically.
  return Math.min(35, 5 + (diff % 30));
}

/**
 * Estimate the additional driving time needed to insert this waitlist client
 * into the day's existing route. Returns the smallest detour minutes across
 * adjacent stops; if no stops exist on the date, returns the time from home
 * base (approximated as 8 minutes for the demo).
 */
export function estimateExtraDrivingMinutes(
  clientPostalCode: string | undefined,
  appointmentsOnDate: GroomingAppointment[],
): number {
  if (!clientPostalCode) return 0;
  const stopsWithPostal = appointmentsOnDate
    .map((a) => {
      // The appointment doesn't carry a postal code today; use the owner's
      // phone number's last 3 digits as a stable mock-postal so the deltas
      // vary between stops without invented data.
      const mockPostal = `H${(a.ownerPhone.replace(/\D/g, "").slice(-3) || "000").slice(0, 3)}`;
      return { startTime: a.startTime, postal: mockPostal };
    })
    .sort((x, y) => x.startTime.localeCompare(y.startTime));
  if (stopsWithPostal.length === 0) {
    return 8; // From home base — stable demo value.
  }
  let minDetour = Infinity;
  for (const stop of stopsWithPostal) {
    minDetour = Math.min(
      minDetour,
      postalDistanceMinutes(clientPostalCode, stop.postal),
    );
  }
  return Number.isFinite(minDetour) ? minDetour : 8;
}

// ─── Top-level match function ────────────────────────────────────────────────

export type WaitlistMatch = {
  entry: GroomingWaitlistEntry;
  slot: OpenSlot;
  /** Mobile-only: extra driving minutes to insert the client. */
  extraDrivingMinutes?: number;
};

export type FindAvailableMatchesOptions = {
  /** Entries to consider (typically: status === "waiting" only). */
  entries: GroomingWaitlistEntry[];
  /** All appointments — used both for gap detection and route estimation. */
  appointments: GroomingAppointment[];
  /** Active stylists. */
  stylists: Pick<Stylist, "id" | "name" | "status">[];
  /** Package catalogue so the matcher can pick the right service duration. */
  packages: Pick<GroomingPackage, "id" | "name" | "duration">[];
  /** Mobile grooming context — gates mobile-area coverage and driving estimate. */
  mobileEnabled: boolean;
  certainAreaEnabled: boolean;
  staffSchedules: StaffServiceAreaSchedule[];
  serviceAreas: ServiceArea[];
  /** Days to look ahead from `todayISO`. Default = 7 (the spec's "today or this week"). */
  daysAhead?: number;
  /** Today's ISO date — defaults to system today. */
  todayISO?: string;
};

/**
 * Returns waitlist entries that currently have a matching open slot in the
 * next `daysAhead` days, with each match's earliest viable slot attached.
 * Ranked by oldest waiting entry first so first-come-first-served is honored.
 */
export function findAvailableMatches({
  entries,
  appointments,
  stylists,
  packages,
  mobileEnabled,
  certainAreaEnabled,
  staffSchedules,
  serviceAreas,
  daysAhead = 7,
  todayISO,
}: FindAvailableMatchesOptions): WaitlistMatch[] {
  const today =
    todayISO ?? new Date().toISOString().split("T")[0];

  // Filter out expired entries and non-waiting statuses up front.
  const candidates = entries.filter((e) => {
    if ((e.status ?? "waiting") !== "waiting") return false;
    if (e.validUntil && e.validUntil < today) return false;
    return true;
  });

  // Build the candidate-date list, ordered earliest first.
  const dates: string[] = [];
  for (let i = 0; i <= daysAhead; i++) {
    const d = new Date(today + "T00:00:00");
    d.setDate(d.getDate() + i);
    dates.push(d.toISOString().split("T")[0]);
  }

  function durationForService(name: string): number {
    const match = packages.find(
      (p) => p.name.toLowerCase() === name.toLowerCase(),
    );
    return match?.duration ?? DEFAULT_SERVICE_DURATION_MIN;
  }

  const matches: WaitlistMatch[] = [];
  for (const entry of candidates) {
    const requiredDuration = durationForService(entry.serviceName);
    let found: WaitlistMatch | null = null;

    for (const date of dates) {
      if (
        !dateMatchesPreference(date, entry.expectedDate, entry.date, today)
      ) {
        continue;
      }
      const slots = findOpenSlotsForDay(date, stylists, appointments);
      for (const slot of slots) {
        if (slot.durationMin < requiredDuration) continue;
        if (!timeMatchesPreference(slot.startTime, entry.expectedTime, entry.preferredTimeWindow)) {
          continue;
        }
        if (!stylistMatchesPreference(slot.stylistId, slot.stylistName, entry)) {
          continue;
        }
        // Mobile coverage check — when the entry has a postal code AND mobile
        // grooming is enabled, the stylist must cover the client's postal on
        // this date.
        if (mobileEnabled && entry.postalCode) {
          const stylist = stylists.find((s) => s.id === slot.stylistId);
          // `Stylist.staffId` is the field that links to the area schedule;
          // not all stylist mocks set it, so fall back to the stylist id.
          const staffId =
            (stylist as Stylist | undefined)?.staffId ?? slot.stylistId;
          if (certainAreaEnabled) {
            const area = getStaffAreaForDate(
              staffId,
              date,
              staffSchedules,
              serviceAreas,
            );
            if (!area) continue;
            if (area.type === "postal" && area.postalCodes) {
              const norm = (s: string) =>
                s.toUpperCase().replace(/\s+/g, "");
              const code = norm(entry.postalCode);
              const covered = area.postalCodes.some((pc) =>
                code.startsWith(norm(pc)),
              );
              if (!covered) continue;
            }
          }
        }
        // Slot is acceptable — clip to the service duration.
        const startMin = timeToMin(slot.startTime);
        const acceptedSlot: OpenSlot = {
          ...slot,
          endTime: minToTime(startMin + requiredDuration),
          durationMin: requiredDuration,
        };
        const isMobile =
          mobileEnabled && (entry.postalCode || entry.source === "online-booking");
        const extraDrivingMinutes = isMobile
          ? estimateExtraDrivingMinutes(
              entry.postalCode,
              appointments.filter(
                (a) =>
                  a.date === date &&
                  a.stylistId === slot.stylistId &&
                  a.status !== "cancelled" &&
                  a.status !== "no-show",
              ),
            )
          : undefined;
        found = {
          entry,
          slot: acceptedSlot,
          extraDrivingMinutes,
        };
        break;
      }
      if (found) break;
    }

    if (found) matches.push(found);
  }

  // FIFO ranking: oldest waiting entry first.
  return matches.sort((a, b) =>
    a.entry.addedAt.localeCompare(b.entry.addedAt),
  );
}
