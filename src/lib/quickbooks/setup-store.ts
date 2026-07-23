"use client";

import { useSyncExternalStore } from "react";

import { scopeKey, type QuickBooksScope } from "./connection-store";

// ============================================================================
// QuickBooks setup progress (Phase 3).
//
// Separate from connection-store on purpose: that store answers "can we talk to
// QuickBooks", this one answers "has the facility finished setting it up". A
// connection can be live while setup is half-done, and an expiry must not throw
// away the steps already completed.
//
// Persisted because the wizard has to survive a reload. A facility that
// connects, closes the tab and comes back must land on the step they left, not
// be silently treated as fully set up.
//
// Phase 3.5 extends this with the Table 3 sync settings.
// ============================================================================

const STORAGE_KEY = "yipyy-quickbooks-setup";
const CHANNEL = "yipyy-quickbooks-setup";

export interface QuickBooksSetupState {
  /** Step 2 (3C): the facility has confirmed this is the right company. Until
   *  they do, no mapping and no syncing should happen — everything downstream
   *  would be pointed at the wrong books. */
  companyConfirmed: boolean;
  /** Step 3 (3.3): the facility has seen the account health check and moved on.
   *  Passing it isn't required — clicking past the amber rows is allowed. */
  accountsReviewed: boolean;
  /** The amber gaps they clicked past, carried forward so the setup summary can
   *  show what was skipped rather than letting it disappear. */
  accountWarnings: string[];
  /** Step 4 (3.4): the facility has been through the mapping screen. */
  mappingsReviewed: boolean;
}

export const EMPTY_SETUP: QuickBooksSetupState = Object.freeze({
  companyConfirmed: false,
  accountsReviewed: false,
  accountWarnings: Object.freeze([]) as unknown as string[],
  mappingsReviewed: false,
});

type SetupMap = Record<string, QuickBooksSetupState>;

const EMPTY_MAP: SetupMap = Object.freeze({});

let state: SetupMap = EMPTY_MAP;
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
    if (raw) state = JSON.parse(raw) as SetupMap;
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

function commit(next: SetupMap) {
  state = next;
  persist();
  emit();
  ensureChannel();
  channel?.postMessage({ kind: "sync" });
}

function subscribe(listener: () => void) {
  ensureReady();
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getQuickBooksSetup(
  scope: QuickBooksScope,
): QuickBooksSetupState {
  ensureReady();
  return state[scopeKey(scope)] ?? EMPTY_SETUP;
}

export function useQuickBooksSetup(
  scope: QuickBooksScope,
): QuickBooksSetupState {
  const key = scopeKey(scope);
  return useSyncExternalStore(
    subscribe,
    () => state[key] ?? EMPTY_SETUP,
    () => EMPTY_SETUP,
  );
}

export function patchQuickBooksSetup(
  scope: QuickBooksScope,
  patch: Partial<QuickBooksSetupState>,
): QuickBooksSetupState {
  ensureReady();
  const key = scopeKey(scope);
  const next = { ...(state[key] ?? EMPTY_SETUP), ...patch };
  commit({ ...state, [key]: next });
  return next;
}

/** Wipe setup progress — on disconnect, so a facility connecting a different
 *  company is asked to confirm it rather than inheriting the last answer. */
export function resetQuickBooksSetup(scope: QuickBooksScope): void {
  ensureReady();
  const key = scopeKey(scope);
  if (!(key in state)) return;
  const next = { ...state };
  delete next[key];
  commit(next);
}
