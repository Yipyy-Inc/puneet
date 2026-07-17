// Mock groomer-facing reminders (Spec Tables 81 & 82).
//
// Two evening/day-of nudges a real scheduler would fire to each working
// groomer. There is no scheduler in the prototype, so these are pure builders
// (mirroring src/lib/grooming-pickup-notifications.ts): given a groomer + the
// appointment book they return the exact message string. The Groomers-tab
// "Send test reminder" actions push the result to the in-app feed + a toast.
//
//   (a) Morning reminder  (default 7:30 AM) — the day's first appointment,
//       with its alert notes (Table 80 pattern via getEffectiveAlertNotes).
//   (b) 30-minute reminder — fires before each appointment.

import type { GroomingAppointment } from "@/types/grooming";
import { getEffectiveAlertNotes } from "@/lib/api/grooming";
import { getAppointmentsForStylistOnDate } from "@/lib/grooming-scheduling";

/** Default morning-reminder send time (Table 81) — configurable per facility. */
export const DEFAULT_MORNING_REMINDER_TIME = "07:30";
/** Minutes before an appointment the pre-visit reminder fires (Table 82). */
export const UPCOMING_REMINDER_LEAD_MINUTES = 30;
/** Deep link to the groomer's day schedule. */
export const GROOMER_SCHEDULE_LINK = "/facility/dashboard/services/grooming";

function to12Hour(hhmm: string): string {
  const [h, m] = hhmm.split(":").map(Number);
  if (Number.isNaN(h)) return hhmm;
  const ampm = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 || 12;
  return `${hour12}:${String(m ?? 0).padStart(2, "0")} ${ampm}`;
}

function timeToMin(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

// ─── (a) Morning reminder (Table 81) ─────────────────────────────────────────

export interface MorningReminder {
  stylistId: string;
  stylistName: string;
  hasAppointments: boolean;
  firstPetName?: string;
  firstTime?: string;
  /** Effective alert-note texts for the first appointment. */
  alerts: string[];
  message: string;
}

export function buildMorningReminder(input: {
  stylistId: string;
  stylistName: string;
  /** Day to report on (YYYY-MM-DD) — normally today. */
  dateStr: string;
  /** The whole appointment book — needed for alert carry-forward. */
  appointments: GroomingAppointment[];
  scheduleLink?: string;
}): MorningReminder {
  const { stylistId, stylistName, dateStr, appointments } = input;
  const scheduleLink = input.scheduleLink ?? GROOMER_SCHEDULE_LINK;

  const day = getAppointmentsForStylistOnDate(stylistId, dateStr, appointments);

  if (day.length === 0) {
    return {
      stylistId,
      stylistName,
      hasAppointments: false,
      alerts: [],
      message: `Good morning, ${stylistName}! You have no appointments scheduled today. Enjoy the day off!`,
    };
  }

  const first = day[0];
  const alerts = getEffectiveAlertNotes(first, appointments).map((n) => n.text);
  // Table 80 — alert notes must ride along in the morning reminder.
  const alertSegment =
    alerts.length > 0 ? ` ${alerts.map((a) => `⚠ ${a}`).join(" ")}` : "";

  const message = `Your first appointment today is ${first.petName} at ${to12Hour(
    first.startTime,
  )}.${alertSegment} View schedule: ${scheduleLink}`;

  return {
    stylistId,
    stylistName,
    hasAppointments: true,
    firstPetName: first.petName,
    firstTime: to12Hour(first.startTime),
    alerts,
    message,
  };
}

// ─── (b) 30-minute pre-visit reminder (Table 82) ─────────────────────────────

export function buildUpcomingReminder(input: {
  appointment: GroomingAppointment;
  minutesUntil: number;
}): string {
  const { appointment: a, minutesUntil } = input;
  const when =
    minutesUntil > 0 ? `${minutesUntil} minutes from now` : "starting now";
  return `${a.petName} (${a.packageName}) is scheduled for ${to12Hour(
    a.startTime,
  )} — ${when}. Owner: ${a.ownerPhone}.`;
}

/**
 * Pick the appointment a "30-minute reminder" test should target: the next
 * one today that hasn't started yet (with its real countdown). If the day is
 * already over (or empty), falls back to the first appointment of the day and
 * the canonical 30-minute lead so the demo still reads naturally. Returns null
 * only when the groomer has no appointments that day.
 */
export function selectUpcomingReminderTarget(input: {
  stylistId: string;
  dateStr: string;
  appointments: GroomingAppointment[];
  /** Minutes since midnight "now" — the caller passes the wall clock. */
  nowMinutes: number;
}): { appointment: GroomingAppointment; minutesUntil: number } | null {
  const { stylistId, dateStr, appointments, nowMinutes } = input;
  const day = getAppointmentsForStylistOnDate(stylistId, dateStr, appointments);
  if (day.length === 0) return null;

  const next = day.find((a) => timeToMin(a.startTime) >= nowMinutes);
  if (next) {
    return {
      appointment: next,
      minutesUntil: timeToMin(next.startTime) - nowMinutes,
    };
  }
  return { appointment: day[0], minutesUntil: UPCOMING_REMINDER_LEAD_MINUTES };
}
