"use client";

import { useSyncExternalStore } from "react";

import { systemAlerts, type SystemAlert } from "@/data/system-health";

// Mutable system-alerts store. Seeds from the static `systemAlerts` and lets the
// Alerts page acknowledge / resolve / escalate alerts. Persisted to localStorage
// + synced across tabs (BroadcastChannel), mirroring the other module stores.
// Eager (the seed has absolute timestamps, no now-anchoring needed).

export type AlertSeverity = SystemAlert["severity"];

const STORAGE_KEY = "yipyy-alerts";
const CHANNEL = "yipyy-alerts";

const SEED: SystemAlert[] = systemAlerts.map((a) => ({ ...a }));
let alerts: SystemAlert[] = SEED;
let ready = false;
const listeners = new Set<() => void>();
let channel: BroadcastChannel | null = null;

function emit() {
  listeners.forEach((l) => l());
}

function persist() {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(alerts));
  } catch {
    // ignore
  }
}

function load() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) alerts = JSON.parse(raw) as SystemAlert[];
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

function commit(next: SystemAlert[]) {
  alerts = next;
  persist();
  emit();
  ensureChannel();
  channel?.postMessage({ kind: "sync" });
}

/** Acknowledge an alert — records who and when. */
export function acknowledgeAlert(alertId: string, by: string) {
  ensureReady();
  commit(
    alerts.map((a) =>
      a.alertId === alertId
        ? {
            ...a,
            status: "Acknowledged",
            acknowledgedAt: new Date().toISOString(),
            acknowledgedBy: by,
          }
        : a,
    ),
  );
}

/** Resolve an alert with a resolution note. */
export function resolveAlert(alertId: string, note: string, by: string) {
  ensureReady();
  commit(
    alerts.map((a) =>
      a.alertId === alertId
        ? {
            ...a,
            status: "Resolved",
            resolvedAt: new Date().toISOString(),
            resolution: note,
            resolvedBy: by,
          }
        : a,
    ),
  );
}

/** Escalate an alert to a new severity with an escalation note. */
export function escalateAlert(
  alertId: string,
  newSeverity: AlertSeverity,
  note: string,
  by: string,
) {
  ensureReady();
  commit(
    alerts.map((a) =>
      a.alertId === alertId
        ? {
            ...a,
            previousSeverity: a.severity,
            severity: newSeverity,
            status: a.status === "Resolved" ? a.status : "Investigating",
            escalatedAt: new Date().toISOString(),
            escalatedBy: by,
            escalationNote: note,
          }
        : a,
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

function getSnapshot(): SystemAlert[] {
  return alerts;
}

function getServerSnapshot(): SystemAlert[] {
  return SEED;
}

export function useAlerts(): SystemAlert[] {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
