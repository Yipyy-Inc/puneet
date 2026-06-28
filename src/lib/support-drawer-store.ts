"use client";

import { useSyncExternalStore } from "react";

// Cross-route controller for the "Yipyy Support" drawer (SupportCenter). The
// drawer lives in the facility layout, so any page (e.g. /facility/help) can
// open it to a specific tab via openSupportDrawer("chat") without prop drilling
// or navigation. Lightweight module store, consistent with the repo's other
// useSyncExternalStore stores. No clock → getSnapshot === getServerSnapshot.

export type SupportDrawerTab = "chat" | "ticket" | "faq";

interface SupportDrawerState {
  open: boolean;
  tab: SupportDrawerTab;
}

let state: SupportDrawerState = { open: false, tab: "chat" };
const listeners = new Set<() => void>();

function set(next: Partial<SupportDrawerState>) {
  state = { ...state, ...next };
  listeners.forEach((l) => l());
}

/** Open the drawer, optionally jumping straight to a tab (defaults to chat). */
export function openSupportDrawer(tab: SupportDrawerTab = "chat") {
  set({ open: true, tab });
}

export function closeSupportDrawer() {
  set({ open: false });
}

export function setSupportDrawerOpen(open: boolean) {
  set({ open });
}

export function setSupportDrawerTab(tab: SupportDrawerTab) {
  set({ tab });
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot(): SupportDrawerState {
  return state;
}

export function useSupportDrawer(): SupportDrawerState {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
