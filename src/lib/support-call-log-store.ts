"use client";

import { useSyncExternalStore } from "react";

import { buildSupportCallLog } from "@/data/support-call-log";
import type { FollowUpStatus } from "@/types/communications";
import type { SupportCallLogEntry } from "@/types/support-call";

// Module store for the admin Call Log. Seeded from the live clock on the client
// only (lazy init) so SSR returns a stable empty array and hydration stays in
// lockstep — same pattern as the other admin support stores. Detail-panel edits
// (follow-up, assignment, tags, notes) persist here across row selections and
// tab switches.

let state: SupportCallLogEntry[] | null = null;
const EMPTY: SupportCallLogEntry[] = [];
const listeners = new Set<() => void>();

function ensureInit() {
  if (state === null && typeof window !== "undefined") {
    state = buildSupportCallLog(Date.now());
  }
}

function emit() {
  listeners.forEach((l) => l());
}

function patch(
  id: string,
  fn: (e: SupportCallLogEntry) => SupportCallLogEntry,
) {
  ensureInit();
  if (!state) return;
  state = state.map((e) => (e.id === id ? fn(e) : e));
  emit();
}

export function setCallFollowUp(id: string, followUpStatus: FollowUpStatus) {
  patch(id, (e) => ({ ...e, followUpStatus }));
}

export function setCallAssigned(id: string, assignedTo: string | null) {
  patch(id, (e) => ({ ...e, assignedTo }));
}

export function setCallTags(id: string, tags: string[]) {
  patch(id, (e) => ({ ...e, tags }));
}

export function setCallNotes(id: string, notes: string) {
  patch(id, (e) => ({ ...e, notes }));
}

function subscribe(listener: () => void) {
  ensureInit();
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot(): SupportCallLogEntry[] {
  ensureInit();
  return state ?? EMPTY;
}

function getServerSnapshot(): SupportCallLogEntry[] {
  return EMPTY;
}

export function useSupportCallLog(): SupportCallLogEntry[] {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
