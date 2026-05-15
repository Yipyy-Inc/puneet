// Step 3 — Date & Time helpers for the grooming booking dialog.
//
// Pure functions only — they consume the data the dialog already has
// (appointments, stylist availability, settings) and return the structures
// the slot-grid / density-calendar / mobile route preview render.

import type {
  GroomingAppointment,
  StylistAvailability,
} from "@/types/grooming";
import { driveMinutes, pseudoCoord } from "@/lib/route-planning";

// ─── Types ───────────────────────────────────────────────────────────────────

export type SlotStatus = "available" | "conflict";

export interface SlotEntry {
  /** HH:MM (24-hour) — the start of this slot. */
  startTime: string;
  /** HH:MM (24-hour) — start + serviceDurationMin. */
  endTime: string;
  status: SlotStatus;
  /**
   * True when staff should preferentially pick this slot. With Smart
   * Scheduling off, every available slot is recommended (no filter). With
   * Smart Scheduling on, recommended = available AND buffer-clean.
   */
  recommended: boolean;
  /** Existing appointment id this slot collides with, if any. */
  conflictWithApptId?: string;
  /**
   * Drive minutes from the prior appointment to this slot's address.
   * Populated only when the mobile-grooming context was passed to the
   * compute helper.
   */
  driveMinFromPrev?: number;
}

export type DayDensity = "plenty" | "limited" | "waitlist" | "off";

export interface WorkWindow {
  startTime: string; // HH:MM
  endTime: string; // HH:MM
}

// ─── Time math (HH:MM ↔ minutes) ─────────────────────────────────────────────

function timeToMin(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

function minToTime(total: number): string {
  const clamped = Math.max(0, Math.min(24 * 60, total));
  const h = Math.floor(clamped / 60);
  const m = clamped % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

// ─── Working window + appointment filters ────────────────────────────────────

/**
 * The stylist's working window for the day of the week, or null if they
 * don't work that day. dayOfWeek follows JS convention (0 = Sunday).
 */
export function getStylistWorkWindow(
  stylistId: string,
  dayOfWeek: number,
  availability: StylistAvailability[],
): WorkWindow | null {
  const rec = availability.find(
    (a) => a.stylistId === stylistId && a.dayOfWeek === dayOfWeek,
  );
  if (!rec || !rec.isAvailable) return null;
  return { startTime: rec.startTime, endTime: rec.endTime };
}

/** Active appointments for this stylist on this date, in chronological order. */
export function getAppointmentsForStylistOnDate(
  stylistId: string,
  dateStr: string,
  appointments: GroomingAppointment[],
): GroomingAppointment[] {
  return appointments
    .filter(
      (a) =>
        a.stylistId === stylistId &&
        a.date === dateStr &&
        a.status !== "cancelled" &&
        a.status !== "no-show",
    )
    .sort((a, b) => a.startTime.localeCompare(b.startTime));
}

// ─── Slot grid ───────────────────────────────────────────────────────────────

export interface ComputeSlotGridArgs {
  stylistId: string;
  dateStr: string;
  /** Service duration in minutes — drives the size of each slot block. */
  serviceDurationMin: number;
  /** Slot spacing in minutes (15 / 30 / 60). */
  slotGranularityMin: number;
  workWindow: WorkWindow;
  existingAppointments: GroomingAppointment[];
  smartSchedulingEnabled: boolean;
  /** Minutes of free space required before AND after the slot when smart is on. */
  bufferMin: number;
  /**
   * When provided, each available slot gets a drive-time annotation from the
   * prior stop. `newAddressSeed` is hashed via pseudoCoord (matches the
   * route planner's synthetic coord scheme) so drive estimates stay stable.
   */
  mobile?: {
    newAddressSeed: string;
    /** Falls back to this when the slot has no prior appointment on the route. */
    facilityBaseSeed?: string;
  };
}

export function computeSlotGrid(args: ComputeSlotGridArgs): SlotEntry[] {
  const {
    stylistId,
    dateStr,
    serviceDurationMin,
    slotGranularityMin,
    workWindow,
    existingAppointments,
    smartSchedulingEnabled,
    bufferMin,
    mobile,
  } = args;

  const stylistAppts = getAppointmentsForStylistOnDate(
    stylistId,
    dateStr,
    existingAppointments,
  );

  const windowStart = timeToMin(workWindow.startTime);
  const windowEnd = timeToMin(workWindow.endTime);

  const slots: SlotEntry[] = [];
  if (serviceDurationMin <= 0 || slotGranularityMin <= 0) return slots;

  for (
    let start = windowStart;
    start + serviceDurationMin <= windowEnd;
    start += slotGranularityMin
  ) {
    const end = start + serviceDurationMin;
    const conflict = stylistAppts.find((a) => {
      const aStart = timeToMin(a.startTime);
      const aEnd = timeToMin(a.endTime);
      return start < aEnd && end > aStart;
    });

    const slot: SlotEntry = {
      startTime: minToTime(start),
      endTime: minToTime(end),
      status: conflict ? "conflict" : "available",
      recommended: false,
      conflictWithApptId: conflict?.id,
    };

    if (!conflict) {
      // Recommendation: when Smart Scheduling is on, require `bufferMin`
      // minutes of free space on both sides. When off, every available
      // slot is treated equally.
      if (smartSchedulingEnabled && bufferMin > 0) {
        const bufferedStart = start - bufferMin;
        const bufferedEnd = end + bufferMin;
        const tooClose = stylistAppts.some((a) => {
          const aStart = timeToMin(a.startTime);
          const aEnd = timeToMin(a.endTime);
          return bufferedStart < aEnd && bufferedEnd > aStart;
        });
        slot.recommended = !tooClose;
      } else {
        slot.recommended = true;
      }

      if (mobile) {
        // Previous stop on the route = the latest appointment that ends at
        // or before this slot starts. Fall back to the facility base if
        // this is the first stop.
        const prev = [...stylistAppts]
          .filter((a) => timeToMin(a.endTime) <= start)
          .sort((a, b) => b.endTime.localeCompare(a.endTime))[0];
        const prevSeed = prev
          ? `${prev.petName}-${prev.ownerName}-${prev.ownerPhone}`
          : mobile.facilityBaseSeed;
        if (prevSeed) {
          slot.driveMinFromPrev = driveMinutes(
            pseudoCoord(prevSeed),
            pseudoCoord(mobile.newAddressSeed),
          );
        }
      }
    }

    slots.push(slot);
  }

  return slots;
}

// ─── Density (calendar dot) ──────────────────────────────────────────────────

export interface ComputeDayDensityArgs {
  stylistId: string;
  dateStr: string;
  workWindow: WorkWindow | null;
  existingAppointments: GroomingAppointment[];
  serviceDurationMin: number;
  slotGranularityMin: number;
  smartSchedulingEnabled: boolean;
  bufferMin: number;
}

/**
 * One of:
 *   plenty   — ≥ 50% of slots fit cleanly (green dot)
 *   limited  — some slots fit but the day is filling up (amber dot)
 *   waitlist — no clean slots (red dot, waitlist-only)
 *   off      — stylist doesn't work this day (no dot)
 */
export function computeDayDensity(args: ComputeDayDensityArgs): DayDensity {
  if (!args.workWindow) return "off";
  const slots = computeSlotGrid({
    stylistId: args.stylistId,
    dateStr: args.dateStr,
    serviceDurationMin: args.serviceDurationMin,
    slotGranularityMin: args.slotGranularityMin,
    workWindow: args.workWindow,
    existingAppointments: args.existingAppointments,
    smartSchedulingEnabled: args.smartSchedulingEnabled,
    bufferMin: args.bufferMin,
  });
  if (slots.length === 0) return "waitlist";
  const recommendedCount = slots.filter((s) => s.recommended).length;
  if (recommendedCount === 0) return "waitlist";
  const ratio = recommendedCount / slots.length;
  if (ratio >= 0.5) return "plenty";
  return "limited";
}

// ─── Address seed helper (mirrors route-planner-page.tsx) ───────────────────

/**
 * Synthetic address seed used everywhere drive-time is computed off the
 * pseudo-coord scheme. Matches the route planner so a stop renders in the
 * same map position whether it's a confirmed appointment or a tentative
 * slot in the booking dialog.
 */
export function appointmentAddressSeed(apt: {
  petName: string;
  ownerName: string;
  ownerPhone: string;
}): string {
  return `${apt.petName}-${apt.ownerName}-${apt.ownerPhone}`;
}
