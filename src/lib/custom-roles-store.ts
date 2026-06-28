"use client";

import { useSyncExternalStore } from "react";

// Admin-defined custom roles (created or duplicated from the Roles & Permissions
// page). Kept separate from the five built-in AdminRole roles. Persisted to
// localStorage and synced across tabs. Mirrors the admin-team / role-permissions
// store pattern.

export interface CustomRole {
  id: string;
  name: string;
  description: string;
  permissions: string[];
  createdAt: string;
}

const STORAGE_KEY = "yipyy-custom-roles";
const CHANNEL = "yipyy-custom-roles";

let roles: CustomRole[] = [];
let ready = false;
const listeners = new Set<() => void>();
let channel: BroadcastChannel | null = null;
const EMPTY: CustomRole[] = [];

function emit() {
  listeners.forEach((l) => l());
}

function persist() {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(roles));
  } catch {
    // ignore
  }
}

function load() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) roles = JSON.parse(raw) as CustomRole[];
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

function commit(broadcast: boolean) {
  persist();
  emit();
  if (broadcast) {
    ensureChannel();
    channel?.postMessage({ kind: "sync" });
  }
}

function slugify(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "") || "role"
  );
}

export function createCustomRole(input: {
  name: string;
  description: string;
  permissions: string[];
}): CustomRole {
  ensureReady();
  const role: CustomRole = {
    id: `custom_${slugify(input.name)}_${Date.now()}`,
    name: input.name.trim() || "Untitled Role",
    description: input.description.trim(),
    permissions: [...input.permissions],
    createdAt: new Date().toISOString().split("T")[0],
  };
  roles = [role, ...roles];
  commit(true);
  return role;
}

export function updateCustomRole(
  id: string,
  patch: Partial<Pick<CustomRole, "name" | "description" | "permissions">>,
) {
  ensureReady();
  roles = roles.map((r) => (r.id === id ? { ...r, ...patch } : r));
  commit(true);
}

export function deleteCustomRole(id: string) {
  ensureReady();
  roles = roles.filter((r) => r.id !== id);
  commit(true);
}

function subscribe(listener: () => void) {
  ensureReady();
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot(): CustomRole[] {
  return roles;
}

function getServerSnapshot(): CustomRole[] {
  return EMPTY;
}

export function useCustomRoles(): CustomRole[] {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
