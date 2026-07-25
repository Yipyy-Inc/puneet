"use client";

import { useSyncExternalStore } from "react";

// Per-staff clock in/out state (mock). Keyed by StaffProfile id (fs-*).
// TODO: back with real time-clock / attendance when a backend exists; true
// offline queueing belongs in the native app, not this web repo.

interface ClockState {
  clockedIn: boolean;
  /** ISO timestamp of the current clock-in; present while clockedIn is true. */
  clockedInAt?: string;
  /** ISO timestamp of the most recent clock-out. */
  clockedOutAt?: string;
  /** Duration of the just-completed session, in whole minutes. */
  lastSessionMinutes?: number;
}

const DEFAULT: ClockState = { clockedIn: false };
let byStaff = new Map<string, ClockState>();
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function setState(staffId: string, next: ClockState) {
  const map = new Map(byStaff);
  map.set(staffId, next);
  byStaff = map;
  emit();
}

/** Explicitly clock a staff member IN, stamping the start time. Idempotent:
 *  if they're already clocked in, the existing clockedInAt is preserved. Pass
 *  `atIso` to restore a prior start time (e.g. undoing an accidental
 *  clock-out) instead of stamping the current moment. */
export function clockIn(staffId: string, atIso?: string): ClockState {
  const current = byStaff.get(staffId) ?? DEFAULT;
  if (current.clockedIn) return current;
  const next: ClockState = {
    clockedIn: true,
    clockedInAt: atIso ?? new Date().toISOString(),
  };
  setState(staffId, next);
  return next;
}

/** Explicitly clock a staff member OUT, stamping the end time and computing
 *  the just-finished session's duration. Idempotent if already clocked out. */
export function clockOut(staffId: string): ClockState {
  const current = byStaff.get(staffId) ?? DEFAULT;
  if (!current.clockedIn) return current;
  const clockedOutAt = new Date().toISOString();
  const lastSessionMinutes = current.clockedInAt
    ? Math.max(
        0,
        Math.round(
          (new Date(clockedOutAt).getTime() -
            new Date(current.clockedInAt).getTime()) /
            60_000,
        ),
      )
    : undefined;
  const next: ClockState = {
    clockedIn: false,
    clockedOutAt,
    lastSessionMinutes,
  };
  setState(staffId, next);
  return next;
}

/**
 * @deprecated A blind toggle is accident-prone (one stray tap flips the state).
 * Prefer the intention-revealing {@link clockIn} / {@link clockOut}. Kept for
 * backward compatibility; delegates to them so behavior is identical.
 */
export function toggleClock(staffId: string): boolean {
  const current = byStaff.get(staffId) ?? DEFAULT;
  const next = current.clockedIn ? clockOut(staffId) : clockIn(staffId);
  return next.clockedIn;
}

export function useClock(staffId: string | null | undefined): ClockState {
  return useSyncExternalStore(
    subscribe,
    () => (staffId ? (byStaff.get(staffId) ?? DEFAULT) : DEFAULT),
    () => DEFAULT,
  );
}
