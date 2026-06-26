"use client";

import { useSyncExternalStore } from "react";
import type {
  PlatformEvent,
  PlatformEventTone,
} from "@/types/platform-dashboard";

// Writable store of facility self-service billing actions. The super-admin
// Activity Feed is otherwise DERIVED/read-only (buildPlatformEvents), so it
// merges these live entries on top; each action also "sends" an email alert to
// the Yipyy super admin. Within a tab a module store keeps subscribers in sync;
// across tabs a BroadcastChannel relays each new action so a facility-side
// upgrade / cancel / card-update lands in the admin's open Activity Feed
// instantly. The channel stands in for the real WebSocket + transactional-email
// backend until one exists (same pattern as use-support-inbox).

/** Inbox where super-admin billing alerts are delivered. */
export const YIPYY_ADMIN_ALERT_EMAIL = "billing-alerts@yipyy.com";

export type SelfServiceActionType = "upgrade" | "cancel" | "card_update";

export interface AdminEmailAlert {
  id: string;
  to: string;
  subject: string;
  body: string;
  sentAt: string; // ISO
}

export interface SelfServiceEvent {
  id: string;
  actionType: SelfServiceActionType;
  facilityId: number;
  facilityName: string;
  /** Plain-English line shown in the activity feed. */
  description: string;
  /** Optional secondary detail (e.g. "Puppy → Pack Leader"). */
  detail?: string;
  tone: PlatformEventTone;
  timestamp: string; // ISO
  emailAlert: AdminEmailAlert;
}

const TONE: Record<SelfServiceActionType, PlatformEventTone> = {
  upgrade: "emerald",
  cancel: "rose",
  card_update: "indigo",
};

// --- module store ----------------------------------------------------------

let events: SelfServiceEvent[] = [];
const listeners = new Set<() => void>();
let seq = 0;

function nextId(prefix: string): string {
  return `${prefix}-${Date.now()}-${seq++}`;
}

function commit(next: SelfServiceEvent[]) {
  events = next;
  listeners.forEach((l) => l());
}

// --- real-time transport (BroadcastChannel = shared WebSocket) -------------

type RealtimeEvent = { kind: "record"; event: SelfServiceEvent };

let channel: BroadcastChannel | null = null;
let channelReady = false;

function ensureChannel() {
  if (channelReady || typeof window === "undefined") return;
  channelReady = true;
  channel = new BroadcastChannel("yipyy-self-service-billing");
  channel.onmessage = (e) => applyRemote(e.data as RealtimeEvent);
}

function publish(ev: RealtimeEvent) {
  ensureChannel();
  // BroadcastChannel never echoes to the sender — only OTHER tabs receive it.
  channel?.postMessage(ev);
}

function applyRemote(ev: RealtimeEvent) {
  if (ev.kind === "record") commit([ev.event, ...events]);
}

// --- email alert composition ----------------------------------------------

function composeEmail(input: {
  actionType: SelfServiceActionType;
  facilityName: string;
  description: string;
  detail?: string;
}): { subject: string; body: string } {
  const subjectByType: Record<SelfServiceActionType, string> = {
    upgrade: `Plan upgrade — ${input.facilityName}`,
    cancel: `Subscription cancellation — ${input.facilityName}`,
    card_update: `Payment method updated — ${input.facilityName}`,
  };
  const body = [
    `${input.facilityName} performed a self-service billing action.`,
    "",
    `Action: ${input.description}`,
    input.detail ? `Details: ${input.detail}` : "",
    "",
    "Review it in the Activity Feed of the Yipyy admin dashboard.",
  ]
    .filter(Boolean)
    .join("\n");
  return { subject: subjectByType[input.actionType], body };
}

// --- public API ------------------------------------------------------------

export function recordBillingSelfServiceAction(input: {
  actionType: SelfServiceActionType;
  facilityId: number;
  facilityName: string;
  description: string;
  detail?: string;
}): SelfServiceEvent {
  const now = new Date().toISOString();
  const { subject, body } = composeEmail(input);
  const event: SelfServiceEvent = {
    id: nextId("ssa"),
    actionType: input.actionType,
    facilityId: input.facilityId,
    facilityName: input.facilityName,
    description: input.description,
    detail: input.detail,
    tone: TONE[input.actionType],
    timestamp: now,
    emailAlert: {
      id: nextId("mail"),
      to: YIPYY_ADMIN_ALERT_EMAIL,
      subject,
      body,
      sentAt: now,
    },
  };
  commit([event, ...events]); // this tab
  publish({ kind: "record", event }); // other tabs (admin Activity Feed)
  return event;
}

/** Activity-feed row produced from a self-service event (carries the alert). */
export interface FeedSelfServiceEvent extends PlatformEvent {
  emailAlert: AdminEmailAlert;
}

export function selfServiceEventToFeedEvent(
  e: SelfServiceEvent,
): FeedSelfServiceEvent {
  return {
    id: e.id,
    category: "billing",
    tone: e.tone,
    description: e.description,
    facilityId: e.facilityId,
    facilityName: e.facilityName,
    timestamp: e.timestamp,
    emailAlert: e.emailAlert,
  };
}

// --- React subscription ----------------------------------------------------

function subscribe(listener: () => void) {
  ensureChannel();
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot() {
  return events;
}

const EMPTY: SelfServiceEvent[] = [];
function getServerSnapshot() {
  return EMPTY;
}

export function useSelfServiceEvents(): SelfServiceEvent[] {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
