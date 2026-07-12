"use client";

import { useSyncExternalStore } from "react";

// Per-staff "show my performance to the staff member" flag, controlled by a
// manager on the staff profile (C2) and read by the staff's My Performance page.
// Keyed by the StaffProfile id (fs-*). Persists to localStorage; mock only.
// TODO: move to a real store/API when a backend exists.

const STORAGE_KEY = "staff-performance-visibility-v1";

function load(): Record<string, boolean> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}");
  } catch {
    return {};
  }
}

let state: Record<string, boolean> = load();
const listeners = new Set<() => void>();

function emit() {
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      /* ignore */
    }
  }
  listeners.forEach((l) => l());
}

export function isPerformanceVisible(
  staffId: string | null | undefined,
): boolean {
  return !!(staffId && state[staffId]);
}

export function setPerformanceVisibility(staffId: string, on: boolean): void {
  state = { ...state, [staffId]: on };
  emit();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Reactive read of the visibility flag for one staff member. */
export function usePerformanceVisibility(
  staffId: string | null | undefined,
): boolean {
  return useSyncExternalStore(
    subscribe,
    () => isPerformanceVisible(staffId),
    () => false,
  );
}
