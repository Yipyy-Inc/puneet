"use client";

import { useSyncExternalStore } from "react";

// ============================================================================
// External-calendar connections (spec 6.4 / Tasks 8, 31–36, Tables 75 & 77).
// A mock store: connect via the 4-step wizard, run a mocked sync (pulls the
// last-7 / next-90 days), and expose a read-only Yipyy .ics export URL.
// All network calls are mocked. TODO: back with real OAuth/ICS sync + an API.
// ============================================================================

export type ExternalCalendarPlatform =
  | "google"
  | "ical"
  | "outlook"
  | "calendly"
  | "acuity"
  | "facebook";

export type ExternalAuthKind = "oauth" | "ics-url" | "api-key";

export type SyncFrequency = "15m" | "1h" | "6h" | "daily";

export interface ExternalCalendarPlatformMeta {
  label: string;
  authKind: ExternalAuthKind;
  /** Two-way platforms (Google/Outlook) can push Yipyy bookings back out. */
  twoWay: boolean;
  glyph: string;
  color: string;
}

export const EXTERNAL_PLATFORM_META: Record<
  ExternalCalendarPlatform,
  ExternalCalendarPlatformMeta
> = {
  google: {
    label: "Google Calendar",
    authKind: "oauth",
    twoWay: true,
    glyph: "G",
    color: "#4285F4",
  },
  outlook: {
    label: "Outlook",
    authKind: "oauth",
    twoWay: true,
    glyph: "O",
    color: "#0078D4",
  },
  ical: {
    label: "iCal / ICS",
    authKind: "ics-url",
    twoWay: false,
    glyph: "iC",
    color: "#64748b",
  },
  calendly: {
    label: "Calendly",
    authKind: "api-key",
    twoWay: false,
    glyph: "C",
    color: "#006BFF",
  },
  acuity: {
    label: "Acuity",
    authKind: "api-key",
    twoWay: false,
    glyph: "A",
    color: "#1a1a1a",
  },
  facebook: {
    label: "Facebook Events",
    authKind: "api-key",
    twoWay: false,
    glyph: "f",
    color: "#1877F2",
  },
};

export const SYNC_FREQUENCY_OPTIONS: Array<{
  value: SyncFrequency;
  label: string;
}> = [
  { value: "15m", label: "Every 15 minutes" },
  { value: "1h", label: "Hourly" },
  { value: "6h", label: "Every 6 hours" },
  { value: "daily", label: "Daily" },
];

export interface ExternalCalendarConnection {
  id: string;
  platform: ExternalCalendarPlatform;
  name: string;
  authKind: ExternalAuthKind;
  /** Masked ics url / api key, or "connected" for OAuth. */
  authValue?: string;
  syncFrequency: SyncFrequency;
  /** Staff member who receives lead follow-up tasks. */
  leadTaskStaff?: string;
  autoCreateCustomers: boolean;
  pushYipyyBookings: boolean;
  twoWay: boolean;
  connectedAt: string;
  lastSyncedAt: string;
}

export interface NewExternalCalendarInput {
  platform: ExternalCalendarPlatform;
  name: string;
  authValue?: string;
  syncFrequency: SyncFrequency;
  leadTaskStaff?: string;
  autoCreateCustomers: boolean;
  pushYipyyBookings: boolean;
}

// ── Store ────────────────────────────────────────────────────────────────────

const EMPTY: ExternalCalendarConnection[] = [];

let connections: ExternalCalendarConnection[] = [
  {
    // Seeded so the calendar's synced Google event has a home in the filters.
    id: "ecal-google-ops",
    platform: "google",
    name: "Google Calendar · Ops",
    authKind: "oauth",
    authValue: "connected",
    syncFrequency: "1h",
    leadTaskStaff: undefined,
    autoCreateCustomers: true,
    pushYipyyBookings: false,
    twoWay: true,
    connectedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    lastSyncedAt: new Date(Date.now() - 12 * 60 * 1000).toISOString(),
  },
];

const listeners = new Set<() => void>();
function emit() {
  listeners.forEach((listener) => listener());
}
function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useExternalCalendars(): ExternalCalendarConnection[] {
  return useSyncExternalStore(
    subscribe,
    () => connections,
    () => EMPTY,
  );
}

export function connectExternalCalendar(
  input: NewExternalCalendarInput,
): ExternalCalendarConnection {
  const meta = EXTERNAL_PLATFORM_META[input.platform];
  const now = new Date().toISOString();
  const connection: ExternalCalendarConnection = {
    id: `ecal-${input.platform}-${connections.length + 1}-${connections.length}`,
    platform: input.platform,
    name: input.name.trim() || meta.label,
    authKind: meta.authKind,
    authValue:
      meta.authKind === "oauth"
        ? "connected"
        : maskSecret(input.authValue ?? ""),
    syncFrequency: input.syncFrequency,
    leadTaskStaff: input.leadTaskStaff,
    autoCreateCustomers: input.autoCreateCustomers,
    // Push-out only applies to two-way platforms.
    pushYipyyBookings: meta.twoWay ? input.pushYipyyBookings : false,
    twoWay: meta.twoWay,
    connectedAt: now,
    lastSyncedAt: now,
  };
  connections = [...connections, connection];
  emit();
  return connection;
}

/** Mocked sync: pulls the last-7 / next-90 days and stamps lastSyncedAt. */
export function syncExternalCalendar(id: string): void {
  const now = new Date().toISOString();
  connections = connections.map((connection) =>
    connection.id === id ? { ...connection, lastSyncedAt: now } : connection,
  );
  emit();
}

export function syncAllExternalCalendars(): void {
  const now = new Date().toISOString();
  connections = connections.map((connection) => ({
    ...connection,
    lastSyncedAt: now,
  }));
  emit();
}

export function removeExternalCalendar(id: string): void {
  connections = connections.filter((connection) => connection.id !== id);
  emit();
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function maskSecret(value: string): string {
  const trimmed = value.trim();
  if (trimmed.length <= 8) return trimmed;
  return `${trimmed.slice(0, 4)}…${trimmed.slice(-4)}`;
}

/** "just now" / "N min ago" / "N hr ago" / "N days ago" for a last-sync stamp. */
export function formatLastSynced(iso: string, now: Date = new Date()): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "never";
  const mins = Math.max(0, Math.round((now.getTime() - then) / 60000));
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} hr ago`;
  const days = Math.round(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

/** Read-only Yipyy .ics export URL of confirmed bookings (Task 36 / Table 77). */
export function getYipyyIcsExportUrl(): string {
  return "https://app.yipyy.com/ics/fac-11/confirmed-bookings.ics?token=ro-9f3a2b7c";
}
