"use client";

import { useSyncExternalStore } from "react";
import { isSameDay } from "@/lib/operations-calendar";

// ============================================================================
// Waitlist for at-capacity slots (spec 8.4 / Task 44, Table 89). When a slot is
// full, a booking attempt becomes a waitlist entry (F0.2 isWaitlist/
// waitlistPosition) shown below the day column. When a cancellation frees the
// slot, the #1 entry is surfaced for notification. Mock store — TODO: back with
// the real waitlist service when it exists.
// ============================================================================

export interface CalendarWaitlistEntry {
  id: string;
  clientName: string;
  petName: string;
  service: string;
  /** The full slot the client is waiting on (ISO). */
  requestedStart: string;
  staff?: string;
  /** Set once the "Send Notification" action has fired. */
  notified?: boolean;
}

export interface WaitlistDisplayEntry extends CalendarWaitlistEntry {
  /** 1-based position within its slot (same start time + service). */
  position: number;
}

// Seed a couple of full-slot waiters on today so the section + freed-slot flow
// are demonstrable. Times align with commonly-full demo slots.
function isoToday(hour: number, minute: number): string {
  const date = new Date();
  date.setHours(hour, minute, 0, 0);
  return date.toISOString();
}

let entries: CalendarWaitlistEntry[] = [
  {
    id: "wait-seed-1",
    clientName: "Amanda Reyes",
    petName: "Bella",
    service: "Full Grooming",
    requestedStart: isoToday(14, 0),
    staff: "Sofia Martinez",
  },
  {
    id: "wait-seed-2",
    clientName: "Marcus Lee",
    petName: "Cooper",
    service: "Full Grooming",
    requestedStart: isoToday(14, 0),
  },
  {
    id: "wait-seed-3",
    clientName: "Priya Nair",
    petName: "Milo",
    service: "Daycare Full Day",
    requestedStart: isoToday(9, 0),
  },
];

let seq = entries.length;
const listeners = new Set<() => void>();
const EMPTY: CalendarWaitlistEntry[] = [];

// Each mutation replaces `entries` with a new array, so the getSnapshot
// reference changes and useSyncExternalStore re-renders — no version counter.
function emit() {
  listeners.forEach((listener) => listener());
}
function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function slotKey(entry: CalendarWaitlistEntry): string {
  const date = new Date(entry.requestedStart);
  return `${date.getHours()}:${date.getMinutes()}-${entry.service.toLowerCase()}`;
}

function serviceMatches(entryService: string, freedService?: string): boolean {
  if (!freedService) return true;
  const a = entryService.toLowerCase();
  const b = freedService.toLowerCase();
  return a.includes(b) || b.includes(a);
}

/** Append a booking attempt for a full slot to the waitlist. */
export function addToWaitlist(
  input: Omit<CalendarWaitlistEntry, "id" | "notified">,
): CalendarWaitlistEntry {
  seq += 1;
  const entry: CalendarWaitlistEntry = { ...input, id: `wait-${seq}` };
  entries = [...entries, entry];
  emit();
  return entry;
}

export function removeFromWaitlist(id: string): void {
  const next = entries.filter((entry) => entry.id !== id);
  if (next.length !== entries.length) {
    entries = next;
    emit();
  }
}

/** Mark an entry as notified (they've been offered the freed slot). */
export function notifyWaitlistEntry(id: string): void {
  let changed = false;
  entries = entries.map((entry) => {
    if (entry.id === id && !entry.notified) {
      changed = true;
      return { ...entry, notified: true };
    }
    return entry;
  });
  if (changed) emit();
}

/**
 * The #1 candidate to promote into a freed slot: the earliest un-notified
 * waiter, preferring the same time + service, then the same service, then any
 * waiter on that day (mock fallback so the flow always demonstrates).
 */
export function findWaitlistCandidate(
  freedStart: Date,
  freedService?: string,
): CalendarWaitlistEntry | null {
  const dayEntries = entries.filter(
    (entry) =>
      !entry.notified && isSameDay(new Date(entry.requestedStart), freedStart),
  );
  if (dayEntries.length === 0) return null;

  const sameHourService = dayEntries.filter((entry) => {
    const start = new Date(entry.requestedStart);
    return (
      start.getHours() === freedStart.getHours() &&
      serviceMatches(entry.service, freedService)
    );
  });
  const sameService = dayEntries.filter((entry) =>
    serviceMatches(entry.service, freedService),
  );
  const pool =
    sameHourService.length > 0
      ? sameHourService
      : sameService.length > 0
        ? sameService
        : dayEntries;

  return [...pool].sort((a, b) =>
    a.requestedStart.localeCompare(b.requestedStart),
  )[0];
}

/** Waitlist entries for a day, sorted by slot then arrival, with positions. */
export function waitlistForDay(
  all: CalendarWaitlistEntry[],
  day: Date,
): WaitlistDisplayEntry[] {
  const dayEntries = all
    .filter((entry) => isSameDay(new Date(entry.requestedStart), day))
    .sort((a, b) => a.requestedStart.localeCompare(b.requestedStart));

  const counts = new Map<string, number>();
  return dayEntries.map((entry) => {
    const key = slotKey(entry);
    const position = (counts.get(key) ?? 0) + 1;
    counts.set(key, position);
    return { ...entry, position };
  });
}

/** Subscribe a component to the current waitlist entries. */
export function useWaitlistEntries(): CalendarWaitlistEntry[] {
  return useSyncExternalStore(
    subscribe,
    () => entries,
    () => EMPTY,
  );
}
