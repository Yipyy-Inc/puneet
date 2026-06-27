"use client";

import { useSyncExternalStore } from "react";

import { buildRecentCalls } from "@/data/dialer-recents";
import type { RecentCall } from "@/types/dialer";

// Module store backing the Dialer "Recent Contacts" list. Seeded from the live
// clock on the client only (lazy init), so SSR returns a stable empty array and
// hydration stays in lockstep — same pattern as the other admin support stores.

let state: RecentCall[] | null = null;
const EMPTY: RecentCall[] = [];
const listeners = new Set<() => void>();

function ensureInit() {
  if (state === null && typeof window !== "undefined") {
    state = buildRecentCalls(Date.now());
  }
}

function emit() {
  listeners.forEach((l) => l());
}

/** Record an outbound call to a facility — floats it to the top of Recent
 *  Contacts (deduped by facility, capped at 5). */
export function recordOutboundCall(call: {
  facilityId: number;
  facilityName: string;
  number: string;
}) {
  ensureInit();
  if (!state) return;
  const entry: RecentCall = {
    id: `rc-${call.facilityId}-${Date.now()}`,
    facilityId: call.facilityId,
    facilityName: call.facilityName,
    number: call.number,
    at: new Date().toISOString(),
  };
  state = [
    entry,
    ...state.filter((c) => c.facilityId !== call.facilityId),
  ].slice(0, 5);
  emit();
}

function subscribe(listener: () => void) {
  ensureInit();
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot(): RecentCall[] {
  ensureInit();
  return state ?? EMPTY;
}

function getServerSnapshot(): RecentCall[] {
  return EMPTY;
}

export function useRecentCalls(): RecentCall[] {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
