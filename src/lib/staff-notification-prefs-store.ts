"use client";

import { useMemo } from "react";
import { useSyncExternalStore } from "react";

import { isMandatoryNotification } from "@/types/facility";
import type { FacilityNotification } from "@/types/facility";

/**
 * Per-user STAFF notification preferences (spec Part 6 / Tables 44–49).
 *
 * This is distinct from the facility business notification config and from the
 * system-health alert channels — it's each staff member's personal choice of
 * delivery channels, per-category toggles, and urgent overrides. Persisted (mock)
 * keyed by staff id, in the same localStorage + BroadcastChannel style as the
 * other stores. A facility admin can VIEW another staff member's prefs read-only
 * (Table 48) but not override them.
 */

// In-App is always on (locked); only these three are user-toggleable channels.
export interface ChannelPrefs {
  email: boolean;
  sms: boolean;
  push: boolean;
}

export interface CategoryPref {
  inApp: boolean;
  email: boolean;
  sms: boolean;
}

export interface StaffNotificationPrefs {
  channels: ChannelPrefs;
  /** Keyed by category id (customers, boarding, …, or a custom module slug). */
  categories: Record<string, CategoryPref>;
  /** Keyed by urgent-override id; true = "always notify me". */
  urgentOverrides: Record<string, boolean>;
}

export const DEFAULT_CHANNELS: ChannelPrefs = {
  email: true,
  sms: false,
  push: false,
};

export const DEFAULT_CATEGORY_PREF: CategoryPref = {
  inApp: true,
  email: true,
  sms: false,
};

/**
 * User-toggleable urgent overrides — "always notify me", ON by default (Table
 * 47). Note: form red-flag, safety incidents, and capacity alerts are NOT here
 * — those are mandatory (Table 49, see `isMandatoryNotification`) and can't be
 * toggled; only task-overdue remains user-controllable.
 */
export const URGENT_OVERRIDE_KEYS = ["task_overdue"] as const;
export type UrgentOverrideKey = (typeof URGENT_OVERRIDE_KEYS)[number];

function defaultPrefs(): StaffNotificationPrefs {
  return {
    channels: { ...DEFAULT_CHANNELS },
    categories: {},
    urgentOverrides: Object.fromEntries(
      URGENT_OVERRIDE_KEYS.map((k) => [k, true]),
    ),
  };
}

const STORAGE_KEY = "yipyy-staff-notification-prefs-v1";
const CHANNEL = "yipyy-staff-notification-prefs-v1";

type PrefsMap = Record<string, StaffNotificationPrefs>;

let state: PrefsMap = {};
let ready = false;
const listeners = new Set<() => void>();
let channel: BroadcastChannel | null = null;
const EMPTY: PrefsMap = {};

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
    if (raw) state = JSON.parse(raw) as PrefsMap;
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

function commit(next: PrefsMap) {
  state = next;
  persist();
  emit();
  ensureChannel();
  channel?.postMessage({ kind: "sync" });
}

export function resolveStaffPrefs(
  map: PrefsMap,
  staffId: string,
): StaffNotificationPrefs {
  const stored = map[staffId];
  if (!stored) return defaultPrefs();
  return {
    channels: { ...DEFAULT_CHANNELS, ...stored.channels },
    categories: stored.categories ?? {},
    urgentOverrides: {
      ...defaultPrefs().urgentOverrides,
      ...stored.urgentOverrides,
    },
  };
}

/**
 * Whether a staff member receives a notification in-app. Mandatory safety types
 * (spec Table 49) ALWAYS deliver and bypass per-user category filtering; every
 * other type honors the per-category "Receive In-App" toggle.
 */
export function staffReceivesInApp(
  prefs: StaffNotificationPrefs,
  n: Pick<FacilityNotification, "type" | "category">,
): boolean {
  if (isMandatoryNotification(n)) return true;
  const cat = n.category
    ? (prefs.categories[n.category] ?? DEFAULT_CATEGORY_PREF)
    : DEFAULT_CATEGORY_PREF;
  return cat.inApp;
}

function update(
  staffId: string,
  mutate: (prev: StaffNotificationPrefs) => StaffNotificationPrefs,
) {
  ensureReady();
  const prev = resolveStaffPrefs(state, staffId);
  commit({ ...state, [staffId]: mutate(prev) });
}

export function setStaffChannel(
  staffId: string,
  channelKey: keyof ChannelPrefs,
  value: boolean,
): void {
  update(staffId, (prev) => ({
    ...prev,
    channels: { ...prev.channels, [channelKey]: value },
  }));
}

export function setStaffCategoryPref(
  staffId: string,
  categoryKey: string,
  patch: Partial<CategoryPref>,
): void {
  update(staffId, (prev) => ({
    ...prev,
    categories: {
      ...prev.categories,
      [categoryKey]: {
        ...(prev.categories[categoryKey] ?? DEFAULT_CATEGORY_PREF),
        ...patch,
      },
    },
  }));
}

/**
 * Bulk-set a staff member's category preferences in one commit — used when
 * seeding a new account from its role defaults (spec Part 7).
 */
export function setStaffCategories(
  staffId: string,
  categories: Record<string, CategoryPref>,
): void {
  update(staffId, (prev) => ({
    ...prev,
    categories: { ...prev.categories, ...categories },
  }));
}

/** True once a staff member has any stored preferences (for seed-once logic). */
export function hasStoredStaffPrefs(staffId: string): boolean {
  ensureReady();
  return staffId in state;
}

export function setStaffUrgentOverride(
  staffId: string,
  key: string,
  value: boolean,
): void {
  update(staffId, (prev) => ({
    ...prev,
    urgentOverrides: { ...prev.urgentOverrides, [key]: value },
  }));
}

function subscribe(callback: () => void): () => void {
  ensureReady();
  listeners.add(callback);
  return () => {
    listeners.delete(callback);
  };
}

function getSnapshot(): PrefsMap {
  return state;
}

function getServerSnapshot(): PrefsMap {
  return EMPTY;
}

export function useStaffNotificationPrefs(
  staffId: string,
): StaffNotificationPrefs {
  const map = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  return useMemo(() => resolveStaffPrefs(map, staffId), [map, staffId]);
}
