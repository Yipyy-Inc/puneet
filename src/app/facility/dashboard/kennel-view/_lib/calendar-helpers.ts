import type { OccupancyKennel, RoomBlock, BookingWorkflowStatus } from "./calendar-types";

export function toLocalISODate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function startOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() - day);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * True when [aStart, aEnd] overlaps [bStart, bEnd] inclusive.
 * Inputs are ISO date strings (YYYY-MM-DD).
 */
export function dateRangesOverlap(
  aStart: string,
  aEnd: string,
  bStart: string,
  bEnd: string,
): boolean {
  return aStart <= bEnd && bStart <= aEnd;
}

/**
 * True when a given ISO date falls within [start, end] inclusive.
 */
export function dateWithinRange(
  date: string,
  start: string,
  end: string,
): boolean {
  return date >= start && date <= end;
}

export function getBookingBarClasses(
  bookingStatus: BookingWorkflowStatus | undefined,
): string {
  switch (bookingStatus) {
    case "pending":
      return "border-l-4 border-l-amber-500 bg-amber-50/95 dark:border-l-amber-400 dark:bg-amber-900/30";
    case "confirmed":
      return "border-l-4 border-l-blue-500 bg-blue-50/95 dark:border-l-blue-400 dark:bg-blue-900/30";
    case "checked_in":
      return "border-l-4 border-l-emerald-500 bg-emerald-50/95 dark:border-l-emerald-400 dark:bg-emerald-900/30";
    case "completed":
      return "border-l-4 border-l-slate-400 bg-slate-100/95 dark:border-l-slate-500 dark:bg-slate-800/40";
    default:
      return "border-l-4 border-l-blue-500 bg-blue-50/95 dark:border-l-blue-400 dark:bg-blue-900/30";
  }
}

/**
 * Same status palette as the bar — but without the `border-l-4` accent. Used
 * by surfaces (e.g. modal header) where the left-edge border looks out of
 * place because the surface itself already has a rounded outer border.
 */
export function getBookingSurfaceClasses(
  bookingStatus: BookingWorkflowStatus | undefined,
): string {
  switch (bookingStatus) {
    case "pending":
      return "bg-amber-50/95 dark:bg-amber-900/30";
    case "confirmed":
      return "bg-blue-50/95 dark:bg-blue-900/30";
    case "checked_in":
      return "bg-emerald-50/95 dark:bg-emerald-900/30";
    case "completed":
      return "bg-slate-100/95 dark:bg-slate-800/40";
    default:
      return "bg-blue-50/95 dark:bg-blue-900/30";
  }
}

export function getBookingTextClass(
  bookingStatus: BookingWorkflowStatus | undefined,
): string {
  switch (bookingStatus) {
    case "pending":
      return "text-amber-900 dark:text-amber-200";
    case "confirmed":
      return "text-blue-900 dark:text-blue-200";
    case "checked_in":
      return "text-emerald-900 dark:text-emerald-200";
    case "completed":
      return "text-slate-700 dark:text-slate-200";
    default:
      return "text-blue-900 dark:text-blue-200";
  }
}

export function getStatusLabel(status: BookingWorkflowStatus): string {
  switch (status) {
    case "pending":
      return "Pending";
    case "confirmed":
      return "Confirmed";
    case "checked_in":
      return "Checked-in";
    case "completed":
      return "Checked-out";
  }
}

export function isRoomBlockedOnDate(
  blocks: RoomBlock[],
  roomId: string,
  date: string,
): RoomBlock | undefined {
  return blocks.find(
    (b) =>
      b.roomId === roomId &&
      dateWithinRange(date, b.startDate, b.endDate),
  );
}

/**
 * Determine whether moving a booking to `targetRoomId` for [checkIn, checkOut]
 * conflicts with any existing booking on that room or any blocked range.
 */
export function detectMoveConflict(
  kennels: OccupancyKennel[],
  blocks: RoomBlock[],
  movingBookingId: number | undefined,
  targetRoomId: string,
  checkIn: string,
  checkOut: string,
): boolean {
  // Conflict with another booking on the target room
  const conflictWithBooking = kennels.some((k) => {
    if (k.id !== targetRoomId) return false;
    if (!k.checkIn || !k.checkOut) return false;
    if (movingBookingId !== undefined && k.bookingId === movingBookingId) {
      return false;
    }
    return dateRangesOverlap(checkIn, checkOut, k.checkIn, k.checkOut);
  });
  if (conflictWithBooking) return true;

  // Conflict with a blocked range on the target room
  const conflictWithBlock = blocks.some(
    (b) =>
      b.roomId === targetRoomId &&
      dateRangesOverlap(checkIn, checkOut, b.startDate, b.endDate),
  );
  return conflictWithBlock;
}

export function isPastWeek(rangeEnd: Date, today: Date): boolean {
  const end = startOfDay(rangeEnd);
  const todayStart = startOfDay(today);
  return end < todayStart;
}
