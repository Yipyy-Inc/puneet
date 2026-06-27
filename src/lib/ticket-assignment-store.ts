"use client";

import { useSyncExternalStore } from "react";

// Inline ticket assignments made from the support ticket list. Module store
// (not local state) so an assignment persists while navigating the admin —
// keyed by ticket id → agent name.

const assignments = new Map<string, string>();
const listeners = new Set<() => void>();
let snapshot: Record<string, string> = {};

function rebuild() {
  snapshot = Object.fromEntries(assignments);
}

export function assignTicket(ticketId: string, agentName: string) {
  assignments.set(ticketId, agentName);
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
const EMPTY: Record<string, string> = {};
function getServerSnapshot() {
  return EMPTY;
}

export function useTicketAssignments(): Record<string, string> {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
