"use client";

import { useSyncExternalStore } from "react";

import { buildSupportRecordings } from "@/data/support-recordings";
import type { SupportRecording } from "@/types/support-call";

// Module store for the admin Recordings tab. Seeded from the live clock on the
// client only (lazy init) so SSR returns a stable empty array and hydration
// stays in lockstep — same pattern as the other admin support stores.

let state: SupportRecording[] | null = null;
const EMPTY: SupportRecording[] = [];
const listeners = new Set<() => void>();

function ensureInit() {
  if (state === null && typeof window !== "undefined") {
    state = buildSupportRecordings(Date.now());
  }
}

function emit() {
  listeners.forEach((l) => l());
}

/** Clear an AI flag — removes the recording from "Needs Review". */
export function clearRecordingFlag(id: string) {
  ensureInit();
  if (!state) return;
  state = state.map((r) =>
    r.id === id ? { ...r, flagged: false, flagReason: null } : r,
  );
  emit();
}

function subscribe(listener: () => void) {
  ensureInit();
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot(): SupportRecording[] {
  ensureInit();
  return state ?? EMPTY;
}

function getServerSnapshot(): SupportRecording[] {
  return EMPTY;
}

export function useSupportRecordings(): SupportRecording[] {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
