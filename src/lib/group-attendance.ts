"use client";

import { useSyncExternalStore } from "react";

// ============================================================================
// Per-dog check-in state for group / multi-pet custom-module events
// (spec 7.3 / Tables 81–82). Keyed by `${eventId}::${attendeeId}`.
// TODO: back with the real check-in service when it exists.
// ============================================================================

const checkedIn = new Set<string>([
  "group-paws-express::att-1",
  "group-paws-express::att-2",
  "group-yodas-splash::att-5",
  "group-yodas-splash::att-6",
]);

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

function attendanceKey(eventId: string, attendeeId: string): string {
  return `${eventId}::${attendeeId}`;
}

export function isAttendeeCheckedIn(
  eventId: string,
  attendeeId: string,
): boolean {
  return checkedIn.has(attendanceKey(eventId, attendeeId));
}

export function toggleAttendeeCheckIn(
  eventId: string,
  attendeeId: string,
): void {
  const key = attendanceKey(eventId, attendeeId);
  if (checkedIn.has(key)) {
    checkedIn.delete(key);
  } else {
    checkedIn.add(key);
  }
  emit();
}

/** Subscribe a component to attendance changes (returns a change counter). */
export function useAttendeeCheckIns(): number {
  return useSyncExternalStore(
    subscribe,
    () => version,
    () => 0,
  );
}
