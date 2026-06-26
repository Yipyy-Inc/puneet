"use client";

import { useSyncExternalStore } from "react";

import {
  ONBOARDING_DISMISS_THRESHOLD,
  ONBOARDING_FACILITY_ID,
  defaultOnboardingStatuses,
  onboardingSteps,
} from "@/data/facility-onboarding";
import type {
  OnboardingStepDef,
  OnboardingStepStatus,
} from "@/types/facility-onboarding";

// Live store for the facility onboarding checklist. Backs the facility
// onboarding page, the persistent dashboard banner, AND the admin Facility-
// Profile setup card — all read the same progress. Within a tab a module store
// keeps subscribers in sync; across tabs/portals a BroadcastChannel relays each
// change and localStorage persists it (same origin, so the admin card mirrors
// the facility's progress both live and across reloads). Mirrors the
// use-support-inbox / billing-self-service-store pattern.

const STORAGE_KEY = `yipyy-onboarding-${ONBOARDING_FACILITY_ID}`;

interface OnboardingState {
  statuses: Record<string, OnboardingStepStatus>;
  dismissed: boolean;
}

function seed(): OnboardingState {
  return { statuses: { ...defaultOnboardingStatuses }, dismissed: false };
}

let state: OnboardingState = seed();
const listeners = new Set<() => void>();

// --- real-time transport (BroadcastChannel = shared WebSocket) -------------

type RealtimeEvent = { kind: "state"; state: OnboardingState };

let channel: BroadcastChannel | null = null;
let channelReady = false;

function ensureChannel() {
  if (channelReady || typeof window === "undefined") return;
  channelReady = true;
  channel = new BroadcastChannel("yipyy-facility-onboarding");
  channel.onmessage = (e) => {
    const ev = e.data as RealtimeEvent;
    if (ev.kind === "state") applyState(ev.state, false);
  };
}

function publish(ev: RealtimeEvent) {
  ensureChannel();
  channel?.postMessage(ev);
}

function persist(next: OnboardingState) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // ignore storage failures
  }
}

function applyState(next: OnboardingState, broadcast: boolean) {
  state = next;
  listeners.forEach((l) => l());
  persist(next);
  if (broadcast) publish({ kind: "state", state: next });
}

// --- hydration (SSR-safe; call from a mount effect, never at module init) --

let loaded = false;
export function loadPersistedOnboarding() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  ensureChannel();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw) as Partial<OnboardingState>;
    const merged: OnboardingState = {
      statuses: { ...defaultOnboardingStatuses, ...(parsed.statuses ?? {}) },
      dismissed: Boolean(parsed.dismissed),
    };
    // Local apply only — don't re-broadcast our own load.
    state = merged;
    listeners.forEach((l) => l());
  } catch {
    // ignore parse/storage failures
  }
}

// --- mutations -------------------------------------------------------------

export function setStepStatus(id: string, status: OnboardingStepStatus) {
  applyState({ ...state, statuses: { ...state.statuses, [id]: status } }, true);
}

/** First interaction with a step moves not-started → in-progress. */
export function startStep(id: string) {
  if (state.statuses[id] === "not_started") setStepStatus(id, "in_progress");
}

export function markStepComplete(id: string) {
  setStepStatus(id, "complete");
}

export function resetStep(id: string) {
  setStepStatus(id, "not_started");
}

export function dismissOnboardingBanner() {
  applyState({ ...state, dismissed: true }, true);
}

export function restoreOnboardingBanner() {
  applyState({ ...state, dismissed: false }, true);
}

export function resetOnboarding() {
  applyState(seed(), true);
}

// --- selectors -------------------------------------------------------------

export interface OnboardingStepView extends OnboardingStepDef {
  status: OnboardingStepStatus;
}

export interface OnboardingProgress {
  steps: OnboardingStepView[];
  completed: number;
  total: number;
  percent: number;
  allComplete: boolean;
  canDismiss: boolean;
  dismissed: boolean;
}

function derive(s: OnboardingState): OnboardingProgress {
  const steps: OnboardingStepView[] = onboardingSteps.map((d) => ({
    ...d,
    status: s.statuses[d.id] ?? "not_started",
  }));
  const completed = steps.filter((x) => x.status === "complete").length;
  const total = steps.length;
  return {
    steps,
    completed,
    total,
    percent: Math.round((completed / total) * 100),
    allComplete: completed === total,
    canDismiss: completed >= ONBOARDING_DISMISS_THRESHOLD,
    dismissed: s.dismissed,
  };
}

// --- React subscription ----------------------------------------------------

function subscribe(listener: () => void) {
  ensureChannel();
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot() {
  return state;
}

// Not server-fetched state — just a stable seed so the SSR snapshot matches the
// client's first render. Persisted state is loaded later via a mount effect.
const HYDRATION_SEED = seed();
function getServerSnapshot() {
  return HYDRATION_SEED;
}

export function useFacilityOnboarding(): OnboardingProgress {
  const s = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  return derive(s);
}
