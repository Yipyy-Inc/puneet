import type { FeedingEntry, MedicationEntry } from "@/types/booking";

export interface PendingCareItem {
  kind: "feeding" | "medication";
  /** "Dinner", "Apoquel 8:00am", etc. */
  label: string;
  /** "today @ 6:00pm" — display-only context */
  scheduleNote?: string;
  /** Used by the banner to scroll to the right section. */
  domId: string;
  isCritical?: boolean;
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

  return {
    pending,
    hasCritical: pending.some((p) => p.isCritical),
  };
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
