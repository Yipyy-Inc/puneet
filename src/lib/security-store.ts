"use client";

import { useSyncExternalStore } from "react";

import {
  activeSessions,
  ipWhitelist,
  mfaSettings,
  passwordPolicies,
  type IPWhitelist,
  type MFASettings,
  type PasswordPolicy,
  type SessionManagement,
} from "@/data/security-compliance";

// Mutable security store for the Security Management page (Access Control tab):
// MFA users, IP rules, active sessions, password policies + a per-role
// "MFA required" map. Persisted to localStorage + synced across tabs. Eager.

export interface SecurityState {
  mfa: MFASettings[];
  ips: IPWhitelist[];
  sessions: SessionManagement[];
  policies: PasswordPolicy[];
  mfaRequiredByRole: Record<string, boolean>;
}

export interface IpRuleInput {
  ipAddress: string;
  description: string;
  status: IPWhitelist["status"];
}

// The current admin's own session (so "Terminate All Except Mine" can exclude
// it, and the row can't terminate itself). First active session = "mine".
export const CURRENT_SESSION_ID =
  activeSessions.find((s) => s.status === "Active")?.id ??
  activeSessions[0]?.id ??
  "";

const STORAGE_KEY = "yipyy-security";
const CHANNEL = "yipyy-security";

function buildSeed(): SecurityState {
  return {
    mfa: mfaSettings.map((m) => ({ ...m })),
    ips: ipWhitelist.map((i) => ({ ...i })),
    sessions: activeSessions.map((s) => ({ ...s })),
    policies: passwordPolicies.map((p) => ({ ...p })),
    mfaRequiredByRole: {
      system_administrator: true,
      financial_auditor: true,
      account_manager: false,
      technical_support: false,
      sales_team: false,
    },
  };
}

const SEED: SecurityState = buildSeed();
let state: SecurityState = SEED;
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
    if (raw) state = JSON.parse(raw) as SecurityState;
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

function commit(next: SecurityState) {
  state = next;
  persist();
  emit();
  ensureChannel();
  channel?.postMessage({ kind: "sync" });
}

function nowIso() {
  return new Date().toISOString();
}

function newIpId() {
  counter += 1;
  return `ip-${Date.now().toString(36)}-${counter}`;
}

/* ----------------------------- MFA ----------------------------- */

/** Disable MFA for a user (must re-enable). */
export function disableMfa(id: string) {
  ensureReady();
  commit({
    ...state,
    mfa: state.mfa.map((m) =>
      m.id === id ? { ...m, mfaEnabled: false, status: "Inactive" } : m,
    ),
  });
}

/** Reset MFA — clears enrollment + backup codes, back to "Pending Setup". */
export function resetMfa(id: string) {
  ensureReady();
  commit({
    ...state,
    mfa: state.mfa.map((m) =>
      m.id === id
        ? { ...m, mfaEnabled: false, status: "Pending Setup", backupCodes: 0 }
        : m,
    ),
  });
}

/* ----------------------------- IPs ----------------------------- */

export function addIp(input: IpRuleInput, addedBy: string) {
  ensureReady();
  const rule: IPWhitelist = {
    id: newIpId(),
    ipAddress: input.ipAddress,
    description: input.description,
    addedBy,
    addedAt: nowIso(),
    lastUsed: nowIso(),
    accessCount: 0,
    status: input.status,
  };
  commit({ ...state, ips: [rule, ...state.ips] });
}

export function updateIp(id: string, input: IpRuleInput) {
  ensureReady();
  commit({
    ...state,
    ips: state.ips.map((i) => (i.id === id ? { ...i, ...input } : i)),
  });
}

export function removeIp(id: string) {
  ensureReady();
  commit({ ...state, ips: state.ips.filter((i) => i.id !== id) });
}

export function setIpStatus(id: string, status: IPWhitelist["status"]) {
  ensureReady();
  commit({
    ...state,
    ips: state.ips.map((i) => (i.id === id ? { ...i, status } : i)),
  });
}

/* --------------------------- Sessions -------------------------- */

export function terminateSession(id: string) {
  ensureReady();
  commit({
    ...state,
    sessions: state.sessions.map((s) =>
      s.id === id ? { ...s, status: "Terminated" } : s,
    ),
  });
}

/** Terminate every active session except the given one ("mine"). */
export function terminateAllSessionsExcept(currentId: string) {
  ensureReady();
  commit({
    ...state,
    sessions: state.sessions.map((s) =>
      s.id !== currentId && s.status === "Active"
        ? { ...s, status: "Terminated" }
        : s,
    ),
  });
}

/* --------------------------- Policies -------------------------- */

export function updatePolicy(id: string, patch: Partial<PasswordPolicy>) {
  ensureReady();
  commit({
    ...state,
    policies: state.policies.map((p) =>
      p.id === id ? { ...p, ...patch, lastModified: nowIso() } : p,
    ),
  });
}

/* ------------------------ MFA by role -------------------------- */

export function setMfaRequiredForRole(roleId: string, required: boolean) {
  ensureReady();
  commit({
    ...state,
    mfaRequiredByRole: { ...state.mfaRequiredByRole, [roleId]: required },
  });
}

/* ---------------------------- hook ----------------------------- */

function subscribe(listener: () => void) {
  ensureReady();
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot(): SecurityState {
  return state;
}

function getServerSnapshot(): SecurityState {
  return SEED;
}

export function useSecurity(): SecurityState {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
