"use client";

import { useSyncExternalStore } from "react";

import {
  facilityNotificationFeed,
  type FacilityNotificationItem,
} from "@/data/facility-notification-feed";

// Mutable facility notification feed store — drives the bell drawer + the
// /facility/notifications center. Tracks read state, sorted most-recent-first.
// localStorage + BroadcastChannel. Eager.

const STORAGE_KEY = "yipyy-facility-notifications";
const CHANNEL = "yipyy-facility-notifications";

const SEED: FacilityNotificationItem[] = [...facilityNotificationFeed]
  .map((n) => ({ ...n }))
  .sort((a, b) => a.minutesAgo - b.minutesAgo);

let state: FacilityNotificationItem[] = SEED;
let ready = false;
const listeners = new Set<() => void>();
let channel: BroadcastChannel | null = null;

function emit() {
  listeners.forEach((l) => l());
}

function persist() {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore
  }
}

function load() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) state = JSON.parse(raw) as FacilityNotificationItem[];
  } catch {
    // ignore
  }
}

function ensureChannel() {
  if (channel || typeof window === "undefined") return;
  channel = new BroadcastChannel(CHANNEL);
  channel.onmessage = () => {
    load();
    emit();
  };
}

function ensureReady() {
  if (ready || typeof window === "undefined") return;
  ready = true;
  load();
  ensureChannel();
}

function commit(next: FacilityNotificationItem[]) {
  state = next;
  persist();
  emit();
  ensureChannel();
  channel?.postMessage({ kind: "sync" });
}

export function markNotificationRead(id: string) {
  ensureReady();
  if (!state.some((n) => n.id === id && !n.read)) return;
  commit(state.map((n) => (n.id === id ? { ...n, read: true } : n)));
}

export function markAllNotificationsRead() {
  ensureReady();
  if (!state.some((n) => !n.read)) return;
  commit(state.map((n) => (n.read ? n : { ...n, read: true })));
}

function subscribe(listener: () => void) {
  ensureReady();
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot(): FacilityNotificationItem[] {
  return state;
}

function getServerSnapshot(): FacilityNotificationItem[] {
  return SEED;
}

export function useFacilityNotifications(): FacilityNotificationItem[] {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
