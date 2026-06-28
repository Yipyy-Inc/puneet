"use client";

import { useSyncExternalStore } from "react";

import { rolePermissions, type AdminRole } from "@/data/admin-users";

// Mutable role → permissions map: the static seed plus an overlay of edited
// roles, persisted to localStorage and synced across tabs (BroadcastChannel).
// The Roles & Permissions editor writes here; role cards and member detail read
// from here, so editing a role's permissions affects everyone in that role.
// Mirrors the admin-team-store pattern.

const STORAGE_KEY = "yipyy-role-permissions";
const CHANNEL = "yipyy-role-permissions";

type RolePerms = Record<AdminRole, string[]>;

let overrides: Partial<Record<AdminRole, string[]>> = {};
let snapshot: RolePerms = rolePermissions;
let ready = false;
const listeners = new Set<() => void>();
let channel: BroadcastChannel | null = null;

function recompute() {
  snapshot =
    Object.keys(overrides).length === 0
      ? rolePermissions
      : ({ ...rolePermissions, ...overrides } as RolePerms);
}

function emit() {
  listeners.forEach((l) => l());
}

function persist() {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(overrides));
  } catch {
    // ignore
  }
}

function load() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw)
      overrides = JSON.parse(raw) as Partial<Record<AdminRole, string[]>>;
  } catch {
    // ignore
  }
}

function ensureChannel() {
  if (channel || typeof window === "undefined") return;
  channel = new BroadcastChannel(CHANNEL);
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

/** Replace the permission set for a role (affects all members of that role). */
export function updateRolePermissions(role: AdminRole, permissions: string[]) {
  ensureReady();
  overrides = { ...overrides, [role]: [...permissions] };
  commit(true);
}

function subscribe(listener: () => void) {
  ensureReady();
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot(): RolePerms {
  return snapshot;
}

function getServerSnapshot(): RolePerms {
  return rolePermissions;
}

export function useRolePermissions(): RolePerms {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
