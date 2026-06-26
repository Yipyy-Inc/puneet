"use client";

import { useSyncExternalStore } from "react";

// Auto-renew toggles made from the commercial Subscriptions table. Kept in a
// module store (not local component state) so a toggle persists across
// navigation — e.g. flip a row, open the facility's Billing tab, come back.

const overrides = new Map<string, boolean>();
const listeners = new Set<() => void>();
let snapshot: Record<string, boolean> = {};

function rebuild() {
  snapshot = Object.fromEntries(overrides);
}

export function setAutoRenewOverride(subscriptionId: string, value: boolean) {
  overrides.set(subscriptionId, value);
  rebuild();
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
function getSnapshot() {
  return snapshot;
}
const EMPTY: Record<string, boolean> = {};
function getServerSnapshot() {
  return EMPTY;
}

export function useAutoRenewOverrides(): Record<string, boolean> {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
