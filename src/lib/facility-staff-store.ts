"use client";

import { useSyncExternalStore } from "react";

// Per-facility staff store. Holds each facility's staff list in memory, keyed by
// facility id, so edits (add / change role / deactivate) persist while the admin
// switches profile tabs or navigates between facilities. Resets on a full page
// reload (no backend). Each facility seeds lazily on first access.

export type StaffStatus = "active" | "inactive" | "invited";

export interface StaffAccount extends Record<string, unknown> {
  id: string;
  name: string;
  email: string;
  role: string;
  status: StaffStatus;
  lastLogin: string | null;
}

const byFacility = new Map<number, StaffAccount[]>();
const listeners = new Set<() => void>();
const EMPTY: StaffAccount[] = [];

function emit() {
  listeners.forEach((l) => l());
}

function get(facilityId: number): StaffAccount[] {
  return byFacility.get(facilityId) ?? EMPTY;
}

function commit(facilityId: number, next: StaffAccount[]) {
  byFacility.set(facilityId, next);
  emit();
}

/**
 * Seed a facility's staff once (idempotent — safe to call during render). The
 * thunk runs only the first time a facility is accessed; later it is a no-op so
 * persisted edits are kept.
 */
export function ensureFacilityStaffSeeded(
  facilityId: number,
  seed: () => StaffAccount[],
) {
  if (!byFacility.has(facilityId)) {
    byFacility.set(facilityId, seed());
  }
}

export function addStaffAccount(facilityId: number, account: StaffAccount) {
  commit(facilityId, [account, ...get(facilityId)]);
}

export function setStaffRole(facilityId: number, id: string, role: string) {
  commit(
    facilityId,
    get(facilityId).map((s) => (s.id === id ? { ...s, role } : s)),
  );
}

export function deactivateStaffAccount(facilityId: number, id: string) {
  commit(
    facilityId,
    get(facilityId).map((s) =>
      s.id === id ? { ...s, status: "inactive" as StaffStatus } : s,
    ),
  );
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useFacilityStaff(facilityId: number): StaffAccount[] {
  return useSyncExternalStore(
    subscribe,
    () => get(facilityId),
    () => get(facilityId),
  );
}
