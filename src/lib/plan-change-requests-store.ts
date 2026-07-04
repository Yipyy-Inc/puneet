"use client";

import { useSyncExternalStore } from "react";

import type { BillingCycle } from "@/types/facility-billing";

// Owner-submitted plan-change REQUESTS. A request does NOT change the plan — it
// is submitted to Yipyy for review and approved by a staffer in the Super Admin
// Subscriptions section. Backed by a session module store + localStorage.

export type PlanChangeRequestStatus = "pending" | "approved" | "declined";

export interface PlanChangeRequest {
  id: string;
  facilityId: number;
  facilityName: string;
  fromTierId: string;
  fromPlanName: string;
  toTierId: string;
  toPlanName: string;
  billingCycle: BillingCycle;
  amount: number;
  requestedAt: string;
  status: PlanChangeRequestStatus;
}

export type SubmitPlanChangeInput = Omit<PlanChangeRequest, "status">;

const STORAGE_KEY = "yipyy.plan-change-requests";
let state: PlanChangeRequest[] = [];
let hydrated = false;
const listeners = new Set<() => void>();

function hydrate() {
  if (hydrated || typeof window === "undefined") return;
  hydrated = true;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) state = JSON.parse(raw) as PlanChangeRequest[];
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

/** `id`/`requestedAt` are supplied by the caller (an event handler). */
export function submitPlanChangeRequest(
  input: SubmitPlanChangeInput,
): PlanChangeRequest {
  hydrate();
  const request: PlanChangeRequest = { ...input, status: "pending" };
  state = [request, ...state];
  persist();
  listeners.forEach((l) => l());
  return request;
}

function subscribe(listener: () => void) {
  hydrate();
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot() {
  return state;
}

const EMPTY: PlanChangeRequest[] = [];
function getServerSnapshot() {
  return EMPTY;
}

export function usePlanChangeRequests(): PlanChangeRequest[] {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
