/**
 * Cross-location schedule conflict detection.
 *
 * When the shared staff pool is enabled, the same staff member can be
 * assigned to multiple locations. Without this check, you can accidentally
 * schedule them at Plateau 9-5 and at NDG 1-3 the same day — which the
 * staff member can't physically honor.
 *
 * This module is the single source of truth — every shift creation /
 * edit flow should call `findShiftConflicts()` before saving.
 */

export interface CrossLocationShift {
  id: string;
  staffId: string;
  locationId: string;
  /** ISO date — e.g. "2026-04-25" */
  date: string;
  /** "HH:MM" 24-hour */
  start: string;
  end: string;
}

export interface ScheduleConflict {
  /** Time-of-day window where the two shifts overlap, in minutes from midnight */
  overlapStart: number;
  overlapEnd: number;
  /** Existing shift conflicting with the proposed shift */
  conflictingShift: CrossLocationShift;
}

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map((n) => parseInt(n, 10));
  return (h ?? 0) * 60 + (m ?? 0);
}

function overlap(
  aStart: number,
  aEnd: number,
  bStart: number,
  bEnd: number,
): { start: number; end: number } | null {
  const start = Math.max(aStart, bStart);
  const end = Math.min(aEnd, bEnd);
  return start < end ? { start, end } : null;
}

/**
 * Find every shift on the same day, for the same staff member, at a
 * different location, whose time window overlaps the proposed shift.
 *
 * Pass `excludeShiftId` when editing — the shift being edited should
 * not flag itself.
 */
export function findShiftConflicts(
  proposed: CrossLocationShift,
  existingShifts: CrossLocationShift[],
  excludeShiftId?: string,
): ScheduleConflict[] {
  const conflicts: ScheduleConflict[] = [];
  const pStart = toMinutes(proposed.start);
  const pEnd = toMinutes(proposed.end);

  for (const shift of existingShifts) {
    if (shift.id === proposed.id || shift.id === excludeShiftId) continue;
    if (shift.staffId !== proposed.staffId) continue;
    if (shift.date !== proposed.date) continue;
    // Same staff, same day — overlap check
    const sStart = toMinutes(shift.start);
    const sEnd = toMinutes(shift.end);
    const win = overlap(pStart, pEnd, sStart, sEnd);
    if (!win) continue;
    // Even same-location overlap is a problem (double-booking) but the
    // cross-location case is the high-signal one.
    conflicts.push({
      overlapStart: win.start,
      overlapEnd: win.end,
      conflictingShift: shift,
    });
  }

  return conflicts;
}

export function formatConflictWindow(conflict: ScheduleConflict): string {
  const fmt = (mins: number) => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  };
  return `${fmt(conflict.overlapStart)}–${fmt(conflict.overlapEnd)}`;
}
