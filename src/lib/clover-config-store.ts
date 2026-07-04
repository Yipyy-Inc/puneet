"use client";

import { useSyncExternalStore } from "react";

// Platform-level Clover Fiserv payment-processing config (how Yipyy charges
// facilities). Credentials are treated as encrypted at rest in production; this
// mock persists to localStorage and the UI masks secrets after entry.

export type CloverEnvironment = "sandbox" | "production";

export interface CloverConfig {
  merchantId: string;
  /** Private App Secret — encrypted server-side in production. */
  appSecret: string;
  appId: string;
  environment: CloverEnvironment;
  currency: string;
  /** Auto-generate an invoice at the start of each billing cycle. */
  autoInvoice: boolean;
  /** Auto-charge the card on file on the invoice due date. */
  autoCharge: boolean;
  /** Clover webhook signing secret (shown once on generation). */
  webhookSecret: string;
  /** True once credentials have been saved at least once. */
  configured: boolean;
}

const DEFAULT_CONFIG: CloverConfig = {
  merchantId: "",
  appSecret: "",
  appId: "",
  environment: "sandbox",
  currency: "USD",
  autoInvoice: true,
  autoCharge: true,
  webhookSecret: "",
  configured: false,
};

const STORAGE_KEY = "yipyy.clover-config";
let state: CloverConfig = DEFAULT_CONFIG;
let hydrated = false;
const listeners = new Set<() => void>();

function hydrate() {
  if (hydrated || typeof window === "undefined") return;
  hydrated = true;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) state = { ...DEFAULT_CONFIG, ...JSON.parse(raw) };
  } catch {
    // Ignore malformed storage.
  }
}

function persist() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Storage unavailable.
  }
}

export function updateCloverConfig(patch: Partial<CloverConfig>): void {
  hydrate();
  state = { ...state, ...patch };
  persist();
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  hydrate();
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useCloverConfig(): CloverConfig {
  return useSyncExternalStore(
    subscribe,
    () => {
      hydrate();
      return state;
    },
    () => DEFAULT_CONFIG,
  );
}

/** Mask a secret for display after entry (keeps the last 4 chars). */
export function maskSecret(value: string): string {
  if (!value) return "";
  return value.length <= 4 ? "••••" : `••••••••${value.slice(-4)}`;
}
