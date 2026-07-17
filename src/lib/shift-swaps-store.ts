/**
 * Shift-swap store — the single source of truth for shift-swap request status.
 *
 * Previously the swaps page held these in local `useState`, so a decision made
 * anywhere else (e.g. the notification bell's inline Approve/Decline) could not
 * be reflected. This store follows the same persisted pattern as System A
 * (useSyncExternalStore + localStorage + BroadcastChannel) so the swaps page,
 * the bell dropdown, and the full Notifications page all read/write the same
 * state and stay in sync across tabs.
 */

import { useSyncExternalStore } from "react";

import { enhancedShiftSwaps } from "@/data/scheduling";
import type { EnhancedShiftSwap } from "@/types/scheduling";

const STORAGE_KEY = "yipyy-shift-swaps-v1";
const CHANNEL = "yipyy-shift-swaps-v1";

const SEED: EnhancedShiftSwap[] = enhancedShiftSwaps;

let state: EnhancedShiftSwap[] = SEED;
let ready = false;
const listeners = new Set<() => void>();
let channel: BroadcastChannel | null = null;

function emit() {
  listeners.forEach((cb) => cb());
}

function persist() {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore (SSR / quota)
  }
}

function load() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) state = JSON.parse(raw) as EnhancedShiftSwap[];
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

function commit(next: EnhancedShiftSwap[]) {
  state = next;
  persist();
  emit();
  ensureChannel();
  channel?.postMessage({ kind: "sync" });
}

export function getShiftSwaps(): EnhancedShiftSwap[] {
  return state;
}

/**
 * Resolve a shift-swap in place (approve or deny). Mirrors the swaps page's
 * previous local `decide` — stamps reviewer + review date so the swaps page and
 * any other reader show the resolved row identically. No-op if the swap is
 * missing or already in the requested status.
 */
export function decideShiftSwap(
  id: string,
  status: "approved" | "denied",
  notes?: string,
): void {
  ensureReady();
  if (!state.some((s) => s.id === id && s.status !== status)) return;
  commit(
    state.map((s) =>
      s.id === id
        ? {
            ...s,
            status,
            reviewedAt: new Date().toISOString().split("T")[0],
            reviewedBy: "emp-1",
            reviewNotes: notes || undefined,
          }
        : s,
    ),
  );
}

export function subscribeToShiftSwaps(callback: () => void): () => void {
  ensureReady();
  listeners.add(callback);
  return () => {
    listeners.delete(callback);
  };
}

function getSnapshot(): EnhancedShiftSwap[] {
  return state;
}

function getServerSnapshot(): EnhancedShiftSwap[] {
  return SEED;
}

export function useShiftSwaps(): EnhancedShiftSwap[] {
  return useSyncExternalStore(
    subscribeToShiftSwaps,
    getSnapshot,
    getServerSnapshot,
  );
}
