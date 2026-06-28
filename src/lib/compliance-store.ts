"use client";

import { useSyncExternalStore } from "react";

import {
  retentionPolicies,
  type RetentionPolicy,
} from "@/data/system-administration";

// Mutable retention-policy store for the Compliance Tools → Data Retention
// Settings tab (editable retention periods per data type). localStorage +
// BroadcastChannel. Eager. Seeds from the static retentionPolicies.

const STORAGE_KEY = "yipyy-compliance-retention";
const CHANNEL = "yipyy-compliance-retention";

const SEED: RetentionPolicy[] = retentionPolicies.map((p) => ({ ...p }));
let state: RetentionPolicy[] = SEED;
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
    if (raw) state = JSON.parse(raw) as RetentionPolicy[];
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

function commit(next: RetentionPolicy[]) {
  state = next;
  persist();
  emit();
  ensureChannel();
  channel?.postMessage({ kind: "sync" });
}

export type RetentionPatch = Partial<
  Pick<RetentionPolicy, "retentionPeriod" | "action" | "status" | "policyName">
>;

/** Edit a retention policy's period / action / status. */
export function updateRetentionPolicy(id: string, patch: RetentionPatch) {
  ensureReady();
  commit(
    state.map((p) =>
      p.id === id
        ? { ...p, ...patch, lastModified: new Date().toISOString() }
        : p,
    ),
  );
}

function subscribe(listener: () => void) {
  ensureReady();
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot(): RetentionPolicy[] {
  return state;
}

function getServerSnapshot(): RetentionPolicy[] {
  return SEED;
}

export function useRetentionPolicies(): RetentionPolicy[] {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
