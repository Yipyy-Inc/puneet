"use client";

import { useSyncExternalStore } from "react";

import { integrations, type Integration } from "@/data/system-administration";

// Mutable integrations store for the System Configuration → Integrations list
// and the integration detail page. Supports Reconnect (Error→Active), Update
// Credentials, and Test Connection. localStorage + BroadcastChannel. Eager.

const STORAGE_KEY = "yipyy-integrations";
const CHANNEL = "yipyy-integrations";

const SEED: Integration[] = integrations.map((i) => ({ ...i }));
let state: Integration[] = SEED;
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
    if (raw) state = JSON.parse(raw) as Integration[];
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

function commit(next: Integration[]) {
  state = next;
  persist();
  emit();
  ensureChannel();
  channel?.postMessage({ kind: "sync" });
}

function nowIso() {
  return new Date().toISOString();
}

/** Reconnect an errored integration — clears the error and marks it Active. */
export function reconnectIntegration(id: string) {
  ensureReady();
  commit(
    state.map((i) =>
      i.id === id
        ? {
            ...i,
            status: "Active",
            errorMessage: undefined,
            testStatus: "Passed",
            lastSync: nowIso(),
            lastSuccessfulCall: nowIso(),
          }
        : i,
    ),
  );
}

/** Record a credentials rotation (updates the lastUpdated stamp). */
export function updateIntegrationCredentials(id: string) {
  ensureReady();
  commit(
    state.map((i) =>
      i.id === id
        ? {
            ...i,
            credentials: {
              ...i.credentials,
              lastUpdated: nowIso().slice(0, 10),
            },
          }
        : i,
    ),
  );
}

export interface TestConnectionResult {
  ok: boolean;
  message: string;
}

/** Test a connection — honest: an errored/inactive integration fails. */
export function testIntegrationConnection(id: string): TestConnectionResult {
  ensureReady();
  const integ = state.find((i) => i.id === id);
  if (!integ) return { ok: false, message: "Integration not found." };
  const ok = integ.status === "Active" || integ.status === "Testing";
  commit(
    state.map((i) =>
      i.id === id
        ? {
            ...i,
            testStatus: ok ? "Passed" : "Failed",
            lastSync: nowIso(),
            lastSuccessfulCall: ok ? nowIso() : i.lastSuccessfulCall,
          }
        : i,
    ),
  );
  return ok
    ? { ok: true, message: `${integ.name} connection verified.` }
    : {
        ok: false,
        message: integ.errorMessage ?? `${integ.name} connection failed.`,
      };
}

function subscribe(listener: () => void) {
  ensureReady();
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot(): Integration[] {
  return state;
}

function getServerSnapshot(): Integration[] {
  return SEED;
}

export function useIntegrations(): Integration[] {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
