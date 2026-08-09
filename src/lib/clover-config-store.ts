"use client";

import { useSyncExternalStore } from "react";

// ============================================================================
// Platform-level billing preferences, in this browser.
//
// ── WHAT IS NO LONGER HERE ─────────────────────────────────────────────────
//
// `appSecret`, `merchantId`, `appId` and `webhookSecret`. A form wrote all four
// to window.localStorage in plaintext and the UI reported them "saved
// (encrypted)". Nothing server-side ever read them — the real credentials are
// environment variables — so their entire effect was to leave the credential
// that lets somebody charge cards sitting in every platform admin's browser,
// readable by any script on the page and surviving sign-out.
//
// Masking it for display was never protection: masking happens after the value
// has already been stored and sent. Removing the field is.
//
// Whether those credentials RESOLVE is a question the server answers, without
// disclosing them — /api/payments/clover/platform, which returns booleans.
//
// ── WHAT IS STILL HERE, AND WHY IT IS LABELLED ─────────────────────────────
//
// Two subscription-billing toggles, which nothing reads either. They stay
// because they record intended behaviour that has not been built, and the
// screen says so on its face rather than presenting them as live settings.
// They are preferences, not credentials; the harm was never persistence.
// ============================================================================

export interface CloverConfig {
  /** Auto-generate an invoice at the start of each billing cycle. Unwired. */
  autoInvoice: boolean;
  /** Auto-charge the card on file on the invoice due date. Unwired. */
  autoCharge: boolean;
}

const DEFAULT_CONFIG: CloverConfig = {
  autoInvoice: true,
  autoCharge: true,
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
    if (!raw) return;

    // Read ONLY the two fields that still exist. A browser that used the old
    // shape has an App Secret in this key right now, and spreading the parsed
    // object would carry it straight back into memory — so the discarded fields
    // are dropped here and overwritten on the next write below.
    const parsed = JSON.parse(raw) as Partial<CloverConfig>;
    state = {
      autoInvoice: parsed.autoInvoice ?? DEFAULT_CONFIG.autoInvoice,
      autoCharge: parsed.autoCharge ?? DEFAULT_CONFIG.autoCharge,
    };
    // Overwrite immediately rather than waiting for a write that may never
    // come: the secret is gone from memory above, but it is still ON DISK until
    // this key is replaced, and a browser nobody touches again would keep it.
    persist();
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
