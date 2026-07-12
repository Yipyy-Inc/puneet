"use client";

import { useSyncExternalStore } from "react";
import type { OperationsCalendarEvent } from "@/lib/operations-calendar";

// ============================================================================
// Recurring custom-module events (spec 7.5 / Task 39 / Table 84).
// A mock store tracking cancellations at two scopes:
//   • this occurrence only (by event id)
//   • all future occurrences (by recurrenceSeriesId, from a date forward)
// Plus pure helpers for the recurrence pattern label + occurrence list.
// TODO: back with a real recurrence-series service when the API exists.
// ============================================================================

const cancelledOccurrences = new Set<string>();
const cancelledSeriesFrom = new Map<string, number>();

let version = 0;
const listeners = new Set<() => void>();
function emit() {
  version += 1;
  listeners.forEach((listener) => listener());
}
function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function cancelOccurrence(eventId: string): void {
  cancelledOccurrences.add(eventId);
  emit();
}

export function cancelSeriesFrom(seriesId: string, from: Date): void {
  cancelledSeriesFrom.set(seriesId, from.getTime());
  emit();
}

export function isOccurrenceCancelled(event: OperationsCalendarEvent): boolean {
  if (cancelledOccurrences.has(event.id)) return true;
  if (event.recurrenceSeriesId) {
    const from = cancelledSeriesFrom.get(event.recurrenceSeriesId);
    if (from != null && event.start.getTime() >= from) return true;
  }
  return false;
}

/** Subscribe a component to cancellation changes (returns a change counter). */
export function useRecurringCancellations(): number {
  return useSyncExternalStore(
    subscribe,
    () => version,
    () => 0,
  );
}

// ── Pattern + occurrences ────────────────────────────────────────────────────

function timeLabel(date: Date): string {
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

/** "Every Monday at 10:00 AM" style label (null when not recurring). */
export function recurrencePatternLabel(
  recurrence: string | undefined,
  start: Date,
): string | null {
  if (!recurrence || recurrence === "none") return null;
  const time = timeLabel(start);
  const weekday = start.toLocaleDateString("en-US", { weekday: "long" });
  switch (recurrence) {
    case "daily":
      return `Every day at ${time}`;
    case "weekly":
      return `Every ${weekday} at ${time}`;
    case "biweekly":
      return `Every other ${weekday} at ${time}`;
    case "monthly":
      return `Monthly on day ${start.getDate()} at ${time}`;
    case "custom":
      return `Custom recurrence at ${time}`;
    default:
      return `Repeats at ${time}`;
  }
}

/** The next `count` occurrence dates from `start` for a recurrence frequency. */
export function computeOccurrences(
  start: Date,
  recurrence: string,
  count: number,
): Date[] {
  return Array.from({ length: count }, (_, index) => {
    const next = new Date(start);
    if (recurrence === "daily") {
      next.setDate(next.getDate() + index);
    } else if (recurrence === "weekly" || recurrence === "custom") {
      next.setDate(next.getDate() + index * 7);
    } else if (recurrence === "biweekly") {
      next.setDate(next.getDate() + index * 14);
    } else if (recurrence === "monthly") {
      next.setMonth(next.getMonth() + index);
    } else {
      next.setDate(next.getDate() + index * 7);
    }
    return next;
  });
}
