"use client";

import { useSyncExternalStore } from "react";

import {
  dataSubjectRequests,
  type DataSubjectRequest,
} from "@/data/security-compliance";

// Mutable data-subject-request store (GDPR Art. 20 export / Art. 17 erasure /
// rejection). Seeds from the static dataSubjectRequests. localStorage +
// BroadcastChannel. Eager.

const STORAGE_KEY = "yipyy-dsr";
const CHANNEL = "yipyy-dsr";

const SEED: DataSubjectRequest[] = dataSubjectRequests.map((r) => ({ ...r }));
let state: DataSubjectRequest[] = SEED;
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
    if (raw) state = JSON.parse(raw) as DataSubjectRequest[];
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

function commit(next: DataSubjectRequest[]) {
  state = next;
  persist();
  emit();
  ensureChannel();
  channel?.postMessage({ kind: "sync" });
}

function nowIso() {
  return new Date().toISOString();
}

/** Article 20: mark a request as exported (Completed + export file). */
export function markRequestExported(id: string, exportFileUrl: string) {
  ensureReady();
  commit(
    state.map((r) =>
      r.id === id
        ? {
            ...r,
            status: "Completed",
            completedAt: nowIso(),
            exportFileUrl,
          }
        : r,
    ),
  );
}

/** Article 17: anonymize or permanently delete the requester's records. */
export function eraseRequest(id: string, method: "Anonymize" | "Delete") {
  ensureReady();
  commit(
    state.map((r) =>
      r.id === id
        ? {
            ...r,
            status: "Completed",
            completedAt: nowIso(),
            deletionConfirmation: true,
            notes:
              method === "Delete"
                ? "Records permanently deleted (Art. 17)."
                : "Records anonymized (Art. 17).",
          }
        : r,
    ),
  );
}

/** Reject a request with a reason. */
export function rejectRequest(id: string, reason: string) {
  ensureReady();
  commit(
    state.map((r) =>
      r.id === id ? { ...r, status: "Rejected", rejectionReason: reason } : r,
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

function getSnapshot(): DataSubjectRequest[] {
  return state;
}

function getServerSnapshot(): DataSubjectRequest[] {
  return SEED;
}

export function useDataSubjectRequests(): DataSubjectRequest[] {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
