"use client";

import { useSyncExternalStore } from "react";

import {
  adminUsers,
  rolePermissions,
  type AccessLevel,
  type AdminRole,
  type AdminUser,
} from "@/data/admin-users";

// Mutable admin-team roster: the static seed plus an overlay of runtime-invited
// members and setup-completion overrides. Persisted to localStorage and synced
// across tabs (BroadcastChannel) so completing setup on the public /setup page
// flips the team table row from "Invited" → "Active" live. Mirrors the
// announcement-delivery-store / facility-onboarding-store pattern.

const STORAGE_KEY = "yipyy-admin-team";
const CHANNEL = "yipyy-admin-team";

interface Overlay {
  /** Members invited at runtime (status "invited"). */
  added: AdminUser[];
  /** id → completedAt ISO; flips that member to "active". */
  completed: Record<number, string>;
}

let overlay: Overlay = { added: [], completed: {} };
let snapshot: AdminUser[] = adminUsers;
let ready = false;
const listeners = new Set<() => void>();
let channel: BroadcastChannel | null = null;

function recompute() {
  snapshot = [...overlay.added, ...adminUsers].map((u) => {
    const completedAt = overlay.completed[u.id];
    return completedAt
      ? { ...u, status: "active" as const, lastLogin: completedAt }
      : u;
  });
}

function emit() {
  listeners.forEach((l) => l());
}

function persist() {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(overlay));
  } catch {
    // ignore
  }
}

function load() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) overlay = JSON.parse(raw) as Overlay;
  } catch {
    // ignore
  }
}

function ensureChannel() {
  if (channel || typeof window === "undefined") return;
  channel = new BroadcastChannel(CHANNEL);
  // Sender persists before broadcasting, so reloading from localStorage on
  // receipt is the safe way to converge (no clobbering of local additions).
  channel.onmessage = () => {
    load();
    recompute();
    emit();
  };
}

function ensureReady() {
  if (ready || typeof window === "undefined") return;
  ready = true;
  load();
  ensureChannel();
  recompute();
}

function commit(broadcast: boolean) {
  recompute();
  persist();
  emit();
  if (broadcast) {
    ensureChannel();
    channel?.postMessage({ kind: "sync" });
  }
}

/** Invite a new admin team member; appears immediately with status "invited". */
export function inviteAdminMember(input: {
  name: string;
  email: string;
  phone: string;
  department: string;
  role: AdminRole;
  accessLevel: AccessLevel;
  responsibilityAreas: string[];
}): AdminUser {
  ensureReady();
  const member: AdminUser = {
    id: Date.now(),
    name: input.name,
    email: input.email,
    phone: input.phone,
    department: input.department,
    role: input.role,
    accessLevel: input.accessLevel,
    responsibilityAreas: input.responsibilityAreas,
    permissions: rolePermissions[input.role] ?? [],
    status: "invited",
    createdAt: new Date().toISOString().split("T")[0],
    lastLogin: "", // never logged in
    loginHistory: [],
    activityLog: [],
    avatar: undefined,
  };
  overlay = { ...overlay, added: [member, ...overlay.added] };
  commit(true);
  return member;
}

/** Mark an invited member's setup complete → flips them to "active". */
export function completeAdminInvite(id: number) {
  ensureReady();
  if (overlay.completed[id]) return;
  overlay = {
    ...overlay,
    completed: { ...overlay.completed, [id]: new Date().toISOString() },
  };
  commit(true);
}

function subscribe(listener: () => void) {
  ensureReady();
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot(): AdminUser[] {
  return snapshot;
}

function getServerSnapshot(): AdminUser[] {
  return adminUsers;
}

export function useAdminTeam(): AdminUser[] {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/** Non-hook snapshot accessor (e.g. for a useState initializer). */
export function getAdminTeam(): AdminUser[] {
  ensureReady();
  return snapshot;
}
