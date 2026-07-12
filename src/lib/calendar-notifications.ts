"use client";

import { useSyncExternalStore } from "react";

// ============================================================================
// Owner notifications sent from the Operations Calendar event drawer
// (spec 8.7 / Task 47, Table 92). The quick-compose popover fires SMS/email
// through the (mock) messaging system and records each send so it surfaces in
// the drawer's History tab (A3). TODO: back with the real messaging service.
// ============================================================================

export type NotificationChannel = "sms" | "email";

export interface SentNotification {
  id: string;
  eventId: string;
  channel: NotificationChannel;
  subject?: string;
  body: string;
  recipient: string;
  sentBy: string;
  sentAt: string; // ISO
}

let notifications: SentNotification[] = [];
let seq = 0;
const listeners = new Set<() => void>();
const EMPTY: SentNotification[] = [];

// Each send replaces the array, so the getSnapshot reference changes and
// useSyncExternalStore re-renders — no version counter needed.
function emit() {
  listeners.forEach((listener) => listener());
}
function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Record a sent SMS/email (mock delivery). */
export function sendNotification(
  input: Omit<SentNotification, "id" | "sentAt">,
): SentNotification {
  seq += 1;
  const entry: SentNotification = {
    ...input,
    id: `notif-${seq}`,
    sentAt: new Date().toISOString(),
  };
  notifications = [...notifications, entry];
  emit();
  return entry;
}

/** Subscribe to the notifications sent for a single calendar event. */
export function useEventNotifications(eventId: string): SentNotification[] {
  const all = useSyncExternalStore(
    subscribe,
    () => notifications,
    () => EMPTY,
  );
  return all.filter((entry) => entry.eventId === eventId);
}
