"use client";

import { useSyncExternalStore } from "react";

import type { FacilityNotification } from "@/types/facility";

/**
 * Facility notification-retention config (spec Table 43): how long READ
 * notifications are kept before auto-archiving. Persisted like the other stores
 * (localStorage + BroadcastChannel) so the choice survives reload and syncs
 * across tabs. The archive itself is NOT a separate data source — it's a derived
 * timestamp cutoff over the same notification store (see `isNotificationArchived`).
 */
export type RetentionDays = 7 | 14 | 30 | 90;

export const RETENTION_OPTIONS: RetentionDays[] = [7, 14, 30, 90];

const DEFAULT_RETENTION: RetentionDays = 30;
const STORAGE_KEY = "yipyy-notification-retention-v1";
const CHANNEL = "yipyy-notification-retention-v1";
const DAY_MS = 86_400_000;

let state: RetentionDays = DEFAULT_RETENTION;
let ready = false;
const listeners = new Set<() => void>();
let channel: BroadcastChannel | null = null;

function isRetention(v: unknown): v is RetentionDays {
  return v === 7 || v === 14 || v === 30 || v === 90;
}

function emit() {
  listeners.forEach((cb) => cb());
}

function persist() {
  try {
    window.localStorage.setItem(STORAGE_KEY, String(state));
  } catch {
    // ignore (SSR / quota)
  }
}

function load() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed = raw != null ? Number(raw) : null;
    if (isRetention(parsed)) state = parsed;
  } catch {
    // ignore malformed
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

export function getNotificationRetention(): RetentionDays {
  return state;
}

export function setNotificationRetention(days: RetentionDays): void {
  ensureReady();
  if (state === days) return;
  state = days;
  persist();
  emit();
  ensureChannel();
  channel?.postMessage({ kind: "sync" });
}

function subscribe(callback: () => void): () => void {
  ensureReady();
  listeners.add(callback);
  return () => {
    listeners.delete(callback);
  };
}

function getSnapshot(): RetentionDays {
  return state;
}

function getServerSnapshot(): RetentionDays {
  return DEFAULT_RETENTION;
}

export function useNotificationRetention(): RetentionDays {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/**
 * A notification is archived once it has been READ and its age exceeds the
 * retention window. Unread notifications are never archived regardless of age.
 */
export function isNotificationArchived(
  n: Pick<FacilityNotification, "read" | "timestamp">,
  retentionDays: RetentionDays,
  now: number,
): boolean {
  if (!n.read) return false;
  return now - new Date(n.timestamp).getTime() > retentionDays * DAY_MS;
}
