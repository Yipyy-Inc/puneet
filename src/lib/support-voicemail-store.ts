"use client";

import { useSyncExternalStore } from "react";

import { buildSupportVoicemails } from "@/data/support-voicemails";
import type {
  SupportVoicemail,
  SupportVoicemailStatus,
} from "@/types/support-call";

// Module store for the admin Voicemail inbox. Seeded from the live clock on the
// client only (lazy init) so SSR returns a stable empty array and hydration
// stays in lockstep — same pattern as the other admin support stores.

let state: SupportVoicemail[] | null = null;
const EMPTY: SupportVoicemail[] = [];
const listeners = new Set<() => void>();

function ensureInit() {
  if (state === null && typeof window !== "undefined") {
    state = buildSupportVoicemails(Date.now());
  }
}

function emit() {
  listeners.forEach((l) => l());
}

function patch(id: string, fn: (v: SupportVoicemail) => SupportVoicemail) {
  ensureInit();
  if (!state) return;
  state = state.map((v) => (v.id === id ? fn(v) : v));
  emit();
}

/** Mark a voicemail as played (clears its NEW badge). */
export function markVoicemailPlayed(id: string) {
  patch(id, (v) => (v.isNew ? { ...v, isNew: false } : v));
}

export function setVoicemailStatus(id: string, status: SupportVoicemailStatus) {
  patch(id, (v) => ({ ...v, status }));
}

function subscribe(listener: () => void) {
  ensureInit();
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot(): SupportVoicemail[] {
  ensureInit();
  return state ?? EMPTY;
}

function getServerSnapshot(): SupportVoicemail[] {
  return EMPTY;
}

export function useSupportVoicemails(): SupportVoicemail[] {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
