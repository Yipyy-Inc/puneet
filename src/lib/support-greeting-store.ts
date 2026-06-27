"use client";

import { useSyncExternalStore } from "react";

import { supportGreetings } from "@/data/support-greetings";
import type { VoicemailGreeting } from "@/types/calling";

// Module store for the Yipyy support-line voicemail greetings. The seed is
// static (no clock dependency), so this initializes eagerly and the same
// snapshot is safe on both server and client.

let state: VoicemailGreeting[] = supportGreetings.map((g) => ({ ...g }));
const listeners = new Set<() => void>();

function commit(next: VoicemailGreeting[]) {
  state = next;
  listeners.forEach((l) => l());
}

/** Make one greeting the active one (radio select); the rest become inactive. */
export function setActiveGreeting(id: string) {
  commit(state.map((g) => ({ ...g, isActive: g.id === id })));
}

/** Save an edited greeting script. */
export function updateGreetingScript(id: string, transcription: string) {
  commit(
    state.map((g) =>
      g.id === id
        ? { ...g, transcription, lastUpdated: new Date().toISOString() }
        : g,
    ),
  );
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot(): VoicemailGreeting[] {
  return state;
}

export function useSupportGreetings(): VoicemailGreeting[] {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
