"use client";

import { useSyncExternalStore } from "react";

import type { TenantAuditLog } from "@/data/tenant-logs";

// Facility impersonation. A temporary token (base64 payload, 30-min expiry) is
// handed to a NEW tab via ?impersonate=. That tab establishes a per-tab session
// (sessionStorage — scoped to the one tab), shows the amber admin banner, logs
// every action to a cross-tab audit store (BroadcastChannel, so the admin's
// Facility-Profile Audit Logs see it live), and "sends" the notice email.

const SESSION_KEY = "yipyy-impersonation";
const TOKEN_TTL_MS = 30 * 60 * 1000; // 30 minutes

/** The signed-in super admin (matches the admin top-nav identity). */
export const IMPERSONATING_ADMIN = { name: "Puneet", role: "Super Admin" };

export interface ImpersonationSession {
  facilityId: number;
  facilityName: string;
  adminName: string;
  primaryAdminEmail: string;
  issuedAt: number;
  expiresAt: number;
  nonce: string;
}

// --- token -----------------------------------------------------------------

function b64encode(s: string): string {
  return typeof window === "undefined" ? "" : window.btoa(s);
}
function b64decode(s: string): string {
  return typeof window === "undefined" ? "" : window.atob(s);
}

export function createImpersonationToken(input: {
  facilityId: number;
  facilityName: string;
  primaryAdminEmail: string;
  adminName: string;
}): string {
  const now = Date.now();
  const session: ImpersonationSession = {
    ...input,
    issuedAt: now,
    expiresAt: now + TOKEN_TTL_MS,
    nonce: `${now.toString(36)}-${Math.floor(Math.random() * 1e9).toString(36)}`,
  };
  return b64encode(encodeURIComponent(JSON.stringify(session)));
}

export function decodeImpersonationToken(
  token: string,
): ImpersonationSession | null {
  try {
    const s = JSON.parse(
      decodeURIComponent(b64decode(token)),
    ) as ImpersonationSession;
    if (!s || typeof s.facilityId !== "number" || !s.facilityName) return null;
    if (Date.now() > s.expiresAt) return null; // expired token
    return s;
  } catch {
    return null;
  }
}

// --- per-tab session store (in-memory + sessionStorage) --------------------

let session: ImpersonationSession | null = null;
const listeners = new Set<() => void>();
let loaded = false;

function emit() {
  listeners.forEach((l) => l());
}

/** Hydrate the session from sessionStorage once (call from a mount effect). */
export function loadImpersonation() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try {
    const raw = window.sessionStorage.getItem(SESSION_KEY);
    if (!raw) return;
    const s = JSON.parse(raw) as ImpersonationSession;
    if (Date.now() <= s.expiresAt) {
      session = s;
      emit();
    } else {
      window.sessionStorage.removeItem(SESSION_KEY);
    }
  } catch {
    // ignore
  }
}

export function startImpersonation(s: ImpersonationSession) {
  session = s;
  try {
    window.sessionStorage.setItem(SESSION_KEY, JSON.stringify(s));
  } catch {
    // ignore
  }
  emit();
}

export function endImpersonation() {
  session = null;
  try {
    window.sessionStorage.removeItem(SESSION_KEY);
  } catch {
    // ignore
  }
  emit();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
function getSnapshot() {
  return session;
}
function getServerSnapshot() {
  return null;
}

export function useImpersonation(): ImpersonationSession | null {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

// --- cross-tab audit store (BroadcastChannel) ------------------------------

let auditEntries: TenantAuditLog[] = [];
const auditListeners = new Set<() => void>();
let seq = 0;

let channel: BroadcastChannel | null = null;
let channelReady = false;

function ensureChannel() {
  if (channelReady || typeof window === "undefined") return;
  channelReady = true;
  channel = new BroadcastChannel("yipyy-impersonation-audit");
  channel.onmessage = (e) => {
    const ev = e.data as { kind: "audit"; entry: TenantAuditLog };
    if (ev?.kind === "audit") applyAudit(ev.entry, false);
  };
}

function applyAudit(entry: TenantAuditLog, broadcast: boolean) {
  auditEntries = [entry, ...auditEntries];
  auditListeners.forEach((l) => l());
  if (broadcast) {
    ensureChannel();
    channel?.postMessage({ kind: "audit", entry });
  }
}

/** Record an action taken during an impersonation session in the audit trail. */
export function logImpersonationAction(
  s: ImpersonationSession,
  action: string,
  opts?: {
    description?: string;
    category?: TenantAuditLog["category"];
    severity?: TenantAuditLog["severity"];
  },
) {
  const entry: TenantAuditLog = {
    id: `imp-${Date.now()}-${seq++}`,
    facilityId: s.facilityId,
    timestamp: new Date().toISOString(),
    userId: "impersonation",
    userName: `${s.adminName} via impersonation of ${s.facilityName}`,
    userRole: "Super Admin",
    action,
    category: opts?.category ?? "Security",
    entityType: "Impersonation",
    entityId: s.nonce,
    entityName: s.facilityName,
    changes: [],
    ipAddress: "Admin Console",
    userAgent: "Impersonation Session",
    severity: opts?.severity ?? "Medium",
    status: "Success",
    description: opts?.description ?? action,
  };
  applyAudit(entry, true);
}

function auditSubscribe(listener: () => void) {
  ensureChannel();
  auditListeners.add(listener);
  return () => auditListeners.delete(listener);
}
function auditGetSnapshot() {
  return auditEntries;
}
const EMPTY_AUDIT: TenantAuditLog[] = [];
function auditGetServerSnapshot() {
  return EMPTY_AUDIT;
}

/** All impersonation audit entries (consumer filters by facility id). */
export function useImpersonationAudit(): TenantAuditLog[] {
  return useSyncExternalStore(
    auditSubscribe,
    auditGetSnapshot,
    auditGetServerSnapshot,
  );
}
