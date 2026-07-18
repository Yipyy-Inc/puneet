import type { FeedingEntry, MedicationEntry } from "@/types/booking";
import { getIncidentsForBooking } from "@/data/incidents";

export interface PendingCareItem {
  kind: "feeding" | "medication" | "incident_care";
  /** "Dinner", "Apoquel 8:00am", etc. */
  label: string;
  /** "today @ 6:00pm" — display-only context */
  scheduleNote?: string;
  /** Used by the banner to scroll to the right section. */
  domId: string;
  isCritical?: boolean;
  /** Set on incident-sourced items (2B) so the banner can name the incident
   *  reference, e.g. "Wound cream (Incident INC-007)". */
  incidentId?: string;
}

export interface CareCompletionStatus {
  pending: PendingCareItem[];
  hasCritical: boolean;
}

const FEEDING_DOM_ID = "care-feeding-section";
const MEDICATION_DOM_ID = "care-medication-section";

/** Stable IDs the banner can scroll to. */
export const careSectionDomIds = {
  feeding: FEEDING_DOM_ID,
  medication: MEDICATION_DOM_ID,
};

function isToday(iso: string, now: Date): boolean {
  const d = new Date(iso);
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

function isSameOrEarlierToday(iso: string, now: Date): boolean {
  const d = new Date(iso);
  if (!isToday(iso, now)) return d.getTime() <= now.getTime();
  return d.getTime() <= now.getTime();
}

/**
 * Returns any meals or medication doses that were scheduled for today but
 * have not yet been logged. Used to gate checkout — if anything pending
 * remains, staff get a warning banner with Review / Continue Anyway.
 */
export function getPendingCareItems(
  feeding: FeedingEntry[] | undefined,
  medications: MedicationEntry[] | undefined,
  /** When set, incident-sourced care for this booking (2B) is included, each
   *  tagged with its incident reference. */
  bookingId?: number,
  now: Date = new Date(),
): CareCompletionStatus {
  const pending: PendingCareItem[] = [];

  // Feeding entries don't carry a date stamp on the schedule itself; treat any
  // entry whose status is "pending" and whose time has already passed today as
  // unlogged. (Mock data uses time-of-day strings like "18:00".)
  (feeding ?? []).forEach((entry) => {
    if (entry.status !== "pending") return;
    if (!isFeedingTimePassed(entry.time, now)) return;
    pending.push({
      kind: "feeding",
      label: entry.label,
      scheduleNote: `today @ ${formatTime(entry.time)}`,
      domId: FEEDING_DOM_ID,
    });
  });

  (medications ?? []).forEach((med) => {
    med.doses.forEach((dose) => {
      if (dose.status !== "pending") return;
      if (!isSameOrEarlierToday(dose.scheduledAt, now)) return;
      pending.push({
        kind: "medication",
        label: `${med.name} ${formatDoseTime(dose.scheduledAt)}`,
        scheduleNote: med.dosage,
        domId: MEDICATION_DOM_ID,
        isCritical: med.isCritical,
      });
    });
  });

  // Incident-sourced care (2B) for this booking, tagged with the incident ref.
  if (bookingId != null) {
    pending.push(...getPendingIncidentCareItems(bookingId, now));
  }

  return {
    pending,
    hasCritical: pending.some((p) => p.isCritical),
  };
}

function humanizeCareFrequency(freq: string): string {
  return freq.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Incident medications and active care actions for a booking that haven't been
 * logged today (no careLog entry today referencing them). Each carries its
 * incident id so the banner can render "… (Incident INC-007)".
 */
function getPendingIncidentCareItems(
  bookingId: number,
  now: Date,
): PendingCareItem[] {
  const items: PendingCareItem[] = [];

  for (const incident of getIncidentsForBooking(bookingId)) {
    const medLoggedToday = new Set<string>();
    const actionLoggedToday = new Set<string>();
    for (const entry of incident.careLogs) {
      if (!isToday(entry.loggedAt, now)) continue;
      if (entry.medicationId) medLoggedToday.add(entry.medicationId);
      if (entry.careActionId) actionLoggedToday.add(entry.careActionId);
    }

    for (const med of incident.incidentMedications) {
      if (medLoggedToday.has(med.id)) continue;
      items.push({
        kind: "medication",
        label: med.name,
        scheduleNote: med.frequency,
        domId: MEDICATION_DOM_ID,
        isCritical: med.critical,
        incidentId: incident.id,
      });
    }

    for (const action of incident.careActions) {
      if (!action.active) continue;
      if (actionLoggedToday.has(action.id)) continue;
      items.push({
        kind: "incident_care",
        label: action.name,
        scheduleNote: humanizeCareFrequency(action.frequency),
        domId: MEDICATION_DOM_ID,
        incidentId: incident.id,
      });
    }
  }

  return items;
}

function isFeedingTimePassed(timeStr: string, now: Date): boolean {
  const match = /^(\d{1,2}):(\d{2})$/.exec(timeStr);
  if (!match) return true;
  const h = parseInt(match[1], 10);
  const m = parseInt(match[2], 10);
  if (now.getHours() > h) return true;
  if (now.getHours() === h && now.getMinutes() >= m) return true;
  return false;
}

function formatTime(timeStr: string): string {
  const match = /^(\d{1,2}):(\d{2})$/.exec(timeStr);
  if (!match) return timeStr;
  const h = parseInt(match[1], 10);
  const m = parseInt(match[2], 10);
  const period = h >= 12 ? "pm" : "am";
  const display = h % 12 === 0 ? 12 : h % 12;
  return `${display}:${m.toString().padStart(2, "0")}${period}`;
}

function formatDoseTime(iso: string): string {
  const d = new Date(iso);
  return d
    .toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    })
    .toLowerCase()
    .replace(" ", "");
}
