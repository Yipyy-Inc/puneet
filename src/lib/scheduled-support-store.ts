"use client";

import { useSyncExternalStore } from "react";

import { buildScheduledSupportMessages } from "@/data/scheduled-support-messages";
import type {
  ScheduledChannel,
  ScheduledSupportMessage,
} from "@/types/scheduled-support-message";

// Module store for the admin "Scheduled Messages" view. The seed is anchored to
// the real clock, so initialization happens lazily on the client (never during
// SSR) — getServerSnapshot returns a stable empty array, which keeps hydration
// in lockstep before the client fills the list in.

let state: ScheduledSupportMessage[] | null = null;
const EMPTY: ScheduledSupportMessage[] = [];
const listeners = new Set<() => void>();

function ensureInit() {
  if (state === null && typeof window !== "undefined") {
    state = buildScheduledSupportMessages(Date.now());
  }
}

function emit() {
  listeners.forEach((l) => l());
}

export interface ScheduledEdit {
  body: string;
  channel: ScheduledChannel;
  scheduledFor: string;
}

/** Remove a queued message (the Cancel action). */
export function cancelScheduled(id: string) {
  ensureInit();
  if (!state) return;
  state = state.filter((m) => m.id !== id);
  emit();
}

/** Apply edits from the compose modal, re-sorting by send time. */
export function updateScheduled(id: string, patch: ScheduledEdit) {
  ensureInit();
  if (!state) return;
  state = state
    .map((m) => (m.id === id ? { ...m, ...patch } : m))
    .sort((a, b) => (a.scheduledFor < b.scheduledFor ? -1 : 1));
  emit();
}

function subscribe(listener: () => void) {
  ensureInit();
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot(): ScheduledSupportMessage[] {
  ensureInit();
  return state ?? EMPTY;
}

function getServerSnapshot(): ScheduledSupportMessage[] {
  return EMPTY;
}

export function useScheduledSupport(): ScheduledSupportMessage[] {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
