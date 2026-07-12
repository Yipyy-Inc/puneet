"use client";

import { useSyncExternalStore } from "react";

// Per-staff clock in/out state (mock). Keyed by StaffProfile id (fs-*).
// TODO: back with real time-clock / attendance when a backend exists; true
// offline queueing belongs in the native app, not this web repo.

interface ClockState {
  clockedIn: boolean;
  since?: string;
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

export function toggleClock(staffId: string): boolean {
  const current = byStaff.get(staffId) ?? DEFAULT;
  const next: ClockState = current.clockedIn
    ? { clockedIn: false }
    : { clockedIn: true, since: new Date().toISOString() };
  const map = new Map(byStaff);
  map.set(staffId, next);
  byStaff = map;
  emit();
  return next.clockedIn;
}

export function useClock(staffId: string | null | undefined): ClockState {
  return useSyncExternalStore(
    subscribe,
    () => (staffId ? (byStaff.get(staffId) ?? DEFAULT) : DEFAULT),
    () => DEFAULT,
  );
}
