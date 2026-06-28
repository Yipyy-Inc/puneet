"use client";

import { useSyncExternalStore } from "react";

import {
  dataBackups,
  dataRecoveries,
  type DataBackup,
  type DataRecovery,
} from "@/data/system-administration";

// Mutable data-management store: backup history, recovery operations, the
// backup-schedule config, and the two-admin restore-approval requests.
// localStorage + BroadcastChannel. Eager.

export interface BackupSchedule {
  enabled: boolean;
  frequency: "Daily" | "Weekly" | "Monthly";
  time: string; // "HH:mm"
  retentionDays: number;
  recipients: string[];
}

export interface RestoreRequest {
  id: string;
  backupId: string;
  backupName: string;
  scope: string;
  requestedBy: string;
  requestedAt: string;
  expiresAt: string;
  notifiedAdmins: string[];
  // Stored decision; "expired" is derived from expiresAt (see restoreRequestStatus).
  status: "pending" | "approved" | "rejected";
  approvedBy?: string;
  decidedAt?: string;
  reason?: string;
}

export type RestoreRequestStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "expired";

export interface DataManagementState {
  backups: DataBackup[];
  recoveries: DataRecovery[];
  requests: RestoreRequest[];
  schedule: BackupSchedule;
}

export const RESTORE_EXPIRY_MS = 4 * 60 * 60 * 1000; // 4 hours

const STORAGE_KEY = "yipyy-data-management";
const CHANNEL = "yipyy-data-management";

function hashChecksum(id: string): string {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) {
    h = Math.imul(h ^ id.charCodeAt(i), 16777619);
  }
  // Expand to a longer hex string for a realistic-looking checksum.
  let out = "";
  let v = h >>> 0;
  for (let i = 0; i < 8; i++) {
    out += (v & 0xf).toString(16);
    v = Math.imul(v ^ (v >>> 4), 16777619) >>> 0;
  }
  return `sha256:${out}${out}`;
}

function buildSeed(): DataManagementState {
  return {
    backups: dataBackups.map((b) => ({ ...b })),
    recoveries: dataRecoveries.map((r) => ({ ...r })),
    // One pre-existing request that already expired (no 2nd approval in 4h).
    requests: [
      {
        id: "restore-seed-001",
        backupId: "backup-002",
        backupName: "Pet Paradise Miami - Manual Backup",
        scope: "Facility",
        requestedBy: "Thomas Anderson",
        requestedAt: "2025-12-01T10:00:00Z",
        expiresAt: "2025-12-01T14:00:00Z",
        notifiedAdmins: ["John Smith"],
        status: "pending",
      },
    ],
    schedule: {
      enabled: true,
      frequency: "Daily",
      time: "02:00",
      retentionDays: 30,
      recipients: ["ops-team@company.com", "dba-team@company.com"],
    },
  };
}

const SEED: DataManagementState = buildSeed();
let state: DataManagementState = SEED;
let ready = false;
let counter = 0;
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
    if (raw) state = JSON.parse(raw) as DataManagementState;
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

function commit(next: DataManagementState) {
  state = next;
  persist();
  emit();
  ensureChannel();
  channel?.postMessage({ kind: "sync" });
}

function nowIso() {
  return new Date().toISOString();
}

function newId(prefix: string) {
  counter += 1;
  return `${prefix}-${Date.now().toString(36)}-${counter}`;
}

/** Effective status of a restore request (derives "expired" from expiresAt). */
export function restoreRequestStatus(
  req: RestoreRequest,
  nowMs: number,
): RestoreRequestStatus {
  if (req.status !== "pending") return req.status;
  return new Date(req.expiresAt).getTime() < nowMs ? "expired" : "pending";
}

/* ----------------------------- Backups ----------------------------- */

/** Verify a backup's integrity — sets a checksum + Verified status. */
export function verifyBackup(id: string) {
  ensureReady();
  commit({
    ...state,
    backups: state.backups.map((b) =>
      b.id === id
        ? { ...b, verificationStatus: "Verified", checksum: hashChecksum(id) }
        : b,
    ),
  });
}

export function deleteBackup(id: string) {
  ensureReady();
  commit({ ...state, backups: state.backups.filter((b) => b.id !== id) });
}

/* ---------------------- Restore approval flow ---------------------- */

/** Admin A: request a restore. Notifies the other System admins; expires in 4h. */
export function createRestoreRequest(
  backup: DataBackup,
  requestedBy: string,
  notifiedAdmins: string[],
) {
  ensureReady();
  const requestedAt = nowIso();
  const expiresAt = new Date(Date.now() + RESTORE_EXPIRY_MS).toISOString();
  const req: RestoreRequest = {
    id: newId("restore"),
    backupId: backup.id,
    backupName: backup.backupName,
    scope: backup.scope,
    requestedBy,
    requestedAt,
    expiresAt,
    notifiedAdmins,
    status: "pending",
  };
  commit({ ...state, requests: [req, ...state.requests] });
}

/** Admin B: approve a pending request → executes the restore (adds a recovery). */
export function approveRestoreRequest(id: string, approver: string) {
  ensureReady();
  const req = state.requests.find((r) => r.id === id);
  if (!req || restoreRequestStatus(req, Date.now()) !== "pending") return;
  const recovery: DataRecovery = {
    id: newId("recovery"),
    recoveryName: `Restore: ${req.backupName}`,
    backupId: req.backupId,
    backupName: req.backupName,
    recoveryType: "Full",
    requestedBy: req.requestedBy,
    requestedAt: req.requestedAt,
    startTime: nowIso(),
    status: "In Progress",
    targetLocation: "Production Database",
    itemsToRestore: ["All data in scope"],
    progress: 0,
  };
  commit({
    ...state,
    requests: state.requests.map((r) =>
      r.id === id
        ? {
            ...r,
            status: "approved",
            approvedBy: approver,
            decidedAt: nowIso(),
          }
        : r,
    ),
    recoveries: [recovery, ...state.recoveries],
  });
}

/** Admin B: reject a pending request. */
export function rejectRestoreRequest(
  id: string,
  approver: string,
  reason: string,
) {
  ensureReady();
  commit({
    ...state,
    requests: state.requests.map((r) =>
      r.id === id
        ? {
            ...r,
            status: "rejected",
            approvedBy: approver,
            decidedAt: nowIso(),
            reason,
          }
        : r,
    ),
  });
}

/* ----------------------------- Schedule ---------------------------- */

export function updateSchedule(patch: Partial<BackupSchedule>) {
  ensureReady();
  commit({ ...state, schedule: { ...state.schedule, ...patch } });
}

export function addScheduleRecipient(email: string) {
  ensureReady();
  if (state.schedule.recipients.includes(email)) return;
  commit({
    ...state,
    schedule: {
      ...state.schedule,
      recipients: [...state.schedule.recipients, email],
    },
  });
}

export function removeScheduleRecipient(email: string) {
  ensureReady();
  commit({
    ...state,
    schedule: {
      ...state.schedule,
      recipients: state.schedule.recipients.filter((e) => e !== email),
    },
  });
}

/* ------------------------------ hook ------------------------------- */

function subscribe(listener: () => void) {
  ensureReady();
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot(): DataManagementState {
  return state;
}

function getServerSnapshot(): DataManagementState {
  return SEED;
}

export function useDataManagement(): DataManagementState {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
