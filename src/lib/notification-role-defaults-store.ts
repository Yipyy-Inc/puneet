"use client";

import { useMemo } from "react";
import { useSyncExternalStore } from "react";

import {
  NOTIFICATION_CATEGORY_KEYS,
  NOTIFICATION_ROLE_DEFAULTS,
  getRoleNotificationDefault,
  type NotificationCategoryKey,
  type NotificationRoleKey,
} from "@/data/notification-role-defaults";
import {
  DEFAULT_CATEGORY_PREF,
  setStaffCategories,
  type CategoryPref,
} from "@/lib/staff-notification-prefs-store";

/**
 * Facility-level notification role defaults (spec Table 51). Starts from the
 * hardcoded per-role profiles; a facility admin can override which categories a
 * role starts with. Applying to a staff account seeds that member's personal
 * preferences (Part 5), which then override the defaults per-user.
 *
 * The override map only stores roles the admin has changed — everything else
 * falls back to NOTIFICATION_ROLE_DEFAULTS.
 */
type OverrideMap = Partial<
  Record<NotificationRoleKey, NotificationCategoryKey[]>
>;

const STORAGE_KEY = "yipyy-notification-role-defaults-v1";
const CHANNEL = "yipyy-notification-role-defaults-v1";

let state: OverrideMap = {};
let ready = false;
const listeners = new Set<() => void>();
let channel: BroadcastChannel | null = null;
const EMPTY: OverrideMap = {};

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
    if (raw) state = JSON.parse(raw) as OverrideMap;
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

function commit(next: OverrideMap) {
  state = next;
  persist();
  emit();
  ensureChannel();
  channel?.postMessage({ kind: "sync" });
}

/** The effective default categories for a role: admin override, else built-in. */
export function getEffectiveRoleCategories(
  map: OverrideMap,
  role: NotificationRoleKey,
): NotificationCategoryKey[] {
  return map[role] ?? getRoleNotificationDefault(role).enabledCategories;
}

/** Toggle whether a category is on by default for a role (Table 51). */
export function setRoleDefaultCategory(
  role: NotificationRoleKey,
  category: NotificationCategoryKey,
  on: boolean,
): void {
  ensureReady();
  const current =
    state[role] ?? NOTIFICATION_ROLE_DEFAULTS[role].enabledCategories;
  const set = new Set(current);
  if (on) set.add(category);
  else set.delete(category);
  const next = NOTIFICATION_CATEGORY_KEYS.filter((c) => set.has(c));
  commit({ ...state, [role]: next });
}

/** Reset a role back to its built-in defaults (drops the admin override). */
export function resetRoleDefault(role: NotificationRoleKey): void {
  ensureReady();
  if (!(role in state)) return;
  const next = { ...state };
  delete next[role];
  commit(next);
}

function subscribe(callback: () => void): () => void {
  ensureReady();
  listeners.add(callback);
  return () => {
    listeners.delete(callback);
  };
}

function getSnapshot(): OverrideMap {
  return state;
}

function getServerSnapshot(): OverrideMap {
  return EMPTY;
}

export function useRoleDefaultOverrides(): OverrideMap {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export function useEffectiveRoleCategories(
  role: NotificationRoleKey,
): NotificationCategoryKey[] {
  const map = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  return useMemo(() => getEffectiveRoleCategories(map, role), [map, role]);
}

/**
 * Seed a staff member's category preferences from their role's effective
 * defaults (spec Part 7). Called when an account is created or assigned a role.
 * Categories in the role's enabled set start on (In-App + Email); the rest off.
 */
export function applyRoleNotificationDefaults(
  staffId: string,
  role: string,
): void {
  ensureReady();
  const enabled = new Set(
    getEffectiveRoleCategories(state, role as NotificationRoleKey),
  );
  const categories: Record<string, CategoryPref> = {};
  for (const cat of NOTIFICATION_CATEGORY_KEYS) {
    const on = enabled.has(cat);
    categories[cat] = {
      inApp: on,
      email: on ? DEFAULT_CATEGORY_PREF.email : false,
      sms: false,
    };
  }
  setStaffCategories(staffId, categories);
}
