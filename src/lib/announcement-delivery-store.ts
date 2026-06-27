"use client";

import { useSyncExternalStore } from "react";

import { buildEnhancedAnnouncements } from "@/data/enhanced-announcements";
import { facilities } from "@/data/facilities";
import type { EnhancedAnnouncement } from "@/types/announcement";

// Cross-portal delivery channel for published announcements. The admin composer
// publishes here; the facility portal consumes it (Urgent → full-width banner,
// High → bell badge, Normal → dropdown only). Mirrors the BroadcastChannel +
// localStorage pattern of facility-onboarding-store / use-support-inbox so a
// publish in the admin tab reaches open facility tabs and survives reload.

const CHANNEL = "yipyy-facility-announcements";
const STORAGE_KEY = "yipyy-facility-announcements";

interface DeliveryState {
  delivered: EnhancedAnnouncement[];
  dismissed: Record<string, boolean>;
  read: Record<string, boolean>;
}

function seedDelivered(): EnhancedAnnouncement[] {
  // The published, in-platform announcements are what facilities see by default.
  return buildEnhancedAnnouncements(Date.now()).filter(
    (a) =>
      a.status === "Published" &&
      (a.deliveryMethod === "in_platform" || a.deliveryMethod === "both"),
  );
}

let state: DeliveryState | null = null;
const EMPTY: DeliveryState = { delivered: [], dismissed: {}, read: {} };
const listeners = new Set<() => void>();
let channel: BroadcastChannel | null = null;
let loaded = false;

type RealtimeEvent =
  | { kind: "deliver"; announcement: EnhancedAnnouncement }
  | { kind: "dismiss"; id: string }
  | { kind: "read"; id: string };

function ensureChannel() {
  if (channel || typeof window === "undefined") return;
  channel = new BroadcastChannel(CHANNEL);
  channel.onmessage = (e) => applyRemote(e.data as RealtimeEvent);
}

function ensureInit() {
  if (state === null && typeof window !== "undefined") {
    state = { delivered: seedDelivered(), dismissed: {}, read: {} };
  }
}

function persist() {
  if (typeof window === "undefined" || !state) return;
  try {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        delivered: state.delivered,
        dismissed: state.dismissed,
      }),
    );
  } catch {
    // storage unavailable — fine for the mock
  }
}

function commit(next: DeliveryState) {
  state = next;
  listeners.forEach((l) => l());
  persist();
}

function applyRemote(ev: RealtimeEvent) {
  ensureInit();
  if (!state) return;
  switch (ev.kind) {
    case "deliver":
      deliverInternal(ev.announcement, false);
      break;
    case "dismiss":
      dismissInternal(ev.id, false);
      break;
    case "read":
      readInternal(ev.id, false);
      break;
  }
}

function deliverInternal(a: EnhancedAnnouncement, broadcast: boolean) {
  ensureInit();
  if (!state) return;
  const delivered = [a, ...state.delivered.filter((d) => d.id !== a.id)];
  // A freshly (re)published announcement is unread again.
  const read = { ...state.read };
  delete read[a.id];
  const dismissed = { ...state.dismissed };
  delete dismissed[a.id];
  commit({ delivered, dismissed, read });
  if (broadcast) {
    ensureChannel();
    channel?.postMessage({ kind: "deliver", announcement: a });
  }
}

function dismissInternal(id: string, broadcast: boolean) {
  ensureInit();
  if (!state) return;
  commit({ ...state, dismissed: { ...state.dismissed, [id]: true } });
  if (broadcast) {
    ensureChannel();
    channel?.postMessage({ kind: "dismiss", id });
  }
}

function readInternal(id: string, broadcast: boolean) {
  ensureInit();
  if (!state) return;
  if (state.read[id]) return;
  commit({ ...state, read: { ...state.read, [id]: true } });
  if (broadcast) {
    ensureChannel();
    channel?.postMessage({ kind: "read", id });
  }
}

// --- public API -----------------------------------------------------------

/** Admin publish → push to facility delivery (in_platform / both only). */
export function deliverAnnouncement(a: EnhancedAnnouncement) {
  if (a.deliveryMethod === "email") return;
  deliverInternal(a, true);
}

/** Facility dismisses the urgent banner (persists). */
export function dismissAnnouncement(id: string) {
  dismissInternal(id, true);
}

/** Facility opens the bell — clears the unread badge for that announcement. */
export function markAnnouncementRead(id: string) {
  readInternal(id, true);
}

/** Hydrate dismissals/deliveries from localStorage + open the channel. Call in a
 *  mount effect (like FacilityOnboardingBanner does for its store). */
export function loadPersistedAnnouncements() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  ensureInit();
  ensureChannel();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw || !state) return;
    const parsed = JSON.parse(raw) as Partial<DeliveryState>;
    const byId = new Map(state.delivered.map((d) => [d.id, d]));
    for (const d of parsed.delivered ?? []) byId.set(d.id, d);
    commit({
      delivered: [...byId.values()].sort((a, b) =>
        a.createdAt < b.createdAt ? 1 : -1,
      ),
      dismissed: { ...state.dismissed, ...(parsed.dismissed ?? {}) },
      read: state.read,
    });
  } catch {
    // ignore corrupt storage
  }
}

// --- targeting ------------------------------------------------------------

function facilityServices(facilityId: number): string[] {
  const f = facilities.find((x) => x.id === facilityId) as
    | { locationsList?: { services?: string[] }[] }
    | undefined;
  return f?.locationsList?.flatMap((l) => l.services ?? []) ?? [];
}

/** Whether a delivered announcement targets the given facility. */
export function targetsFacility(
  a: EnhancedAnnouncement,
  facilityId: number,
): boolean {
  switch (a.target) {
    case "All Facilities":
      return true;
    case "Specific Facilities":
      return (a.facilityIds ?? []).includes(facilityId);
    case "By Plan Tier": {
      const f = facilities.find((x) => x.id === facilityId) as
        | { plan?: string }
        | undefined;
      return !!f?.plan && (a.planTiers ?? []).includes(f.plan);
    }
    case "By Business Type": {
      const svc = facilityServices(facilityId);
      return (a.businessTypes ?? []).some((b) => svc.includes(b));
    }
  }
}

// --- subscription ---------------------------------------------------------

function subscribe(listener: () => void) {
  ensureInit();
  ensureChannel();
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot(): DeliveryState {
  ensureInit();
  return state ?? EMPTY;
}

function getServerSnapshot(): DeliveryState {
  return EMPTY;
}

export function useAnnouncementDelivery(): DeliveryState {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
