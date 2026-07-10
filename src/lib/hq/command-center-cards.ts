import { bookings } from "@/data/bookings";
import { clients } from "@/data/clients";
import { deriveLocationId } from "@/data/locations";
import { getOverdueTasks } from "@/data/facility-tasks";
import { incidents } from "@/data/incidents";
import { sharedStaffPool } from "@/data/hq-analytics";
import {
  findShiftConflicts,
  type CrossLocationShift,
} from "@/lib/hq/schedule-conflicts";
import type { Booking } from "@/types/booking";

export interface UpcomingBookingChip {
  id: number;
  petName: string;
  service: string;
  startDate: string;
}

export interface LocationAlerts {
  overdueTasks: number;
  staffConflicts: number;
  incidents: number;
  total: number;
}

// Statuses that no longer count as "upcoming" (already happening or finished).
const PAST_OR_ACTIVE = new Set([
  "checked_in",
  "in_progress",
  "ready",
  "completed",
  "no_show",
  "cancelled",
  "declined",
]);

function petNameForBooking(booking: Booking): string {
  const client = clients.find((c) => c.id === booking.clientId);
  if (!client) return "Pet";
  const petId = Array.isArray(booking.petId) ? booking.petId[0] : booking.petId;
  return client.pets.find((p) => p.id === petId)?.name ?? "Pet";
}

/**
 * The location's next scheduled bookings (soonest first), derived from the mock
 * bookings set (anchored to the current data month) and mapped to the location
 * via deriveLocationId. Returns up to `limit` chips.
 */
export function getUpcomingBookings(
  locationId: string,
  limit = 3,
): UpcomingBookingChip[] {
  return bookings
    .filter(
      (b) =>
        deriveLocationId(b.id) === locationId &&
        !PAST_OR_ACTIVE.has(b.status) &&
        Boolean(b.startDate),
    )
    .sort((a, b) => a.startDate.localeCompare(b.startDate))
    .slice(0, limit)
    .map((b) => ({
      id: b.id,
      petName: petNameForBooking(b),
      service: b.service,
      startDate: b.startDate,
    }));
}

// Every staff shift across the network, flattened once for conflict detection.
const ALL_SHIFTS: CrossLocationShift[] = sharedStaffPool.flatMap((m) =>
  m.upcomingShifts.map((s, i) => ({
    id: `${m.staffId}-${i}`,
    staffId: m.staffId,
    locationId: s.locationId,
    date: s.date,
    start: s.start,
    end: s.end,
  })),
);

/**
 * Active alerts for a location: overdue care tasks, cross-location staff
 * scheduling conflicts, and open/investigating incidents — all mapped to the
 * location from the real data layer. Zero counts mean no banner is shown.
 */
export function getLocationAlerts(locationId: string): LocationAlerts {
  const overdueTasks = getOverdueTasks().filter(
    (t) => deriveLocationId(t.bookingId) === locationId,
  ).length;

  const staffConflicts = ALL_SHIFTS.filter(
    (s) =>
      s.locationId === locationId &&
      findShiftConflicts(s, ALL_SHIFTS, s.id).length > 0,
  ).length;

  const incidentCount = incidents.filter(
    (i) =>
      (i.status === "open" || i.status === "investigating") &&
      deriveLocationId(i.id) === locationId,
  ).length;

  return {
    overdueTasks,
    staffConflicts,
    incidents: incidentCount,
    total: overdueTasks + staffConflicts + incidentCount,
  };
}

/** Builds the red-banner summary, e.g. "2 overdue tasks · 1 staff conflict". */
export function formatAlertBanner(alerts: LocationAlerts): string {
  const parts: string[] = [];
  const plural = (n: number, word: string) =>
    `${n} ${word}${n === 1 ? "" : "s"}`;
  if (alerts.overdueTasks > 0)
    parts.push(plural(alerts.overdueTasks, "overdue task"));
  if (alerts.staffConflicts > 0)
    parts.push(plural(alerts.staffConflicts, "staff conflict"));
  if (alerts.incidents > 0)
    parts.push(plural(alerts.incidents, "open incident"));
  return parts.join(" · ");
}
