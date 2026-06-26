"use client";

import { useSyncExternalStore } from "react";

import { adminUsers } from "@/data/admin-users";
import { facilities } from "@/data/facilities";
import { supportConversations } from "@/data/support-conversations";
import type {
  AdminSupportMessage,
  ConversationStatus,
  SupportAttachment,
  SupportConversation,
} from "@/types/support-chat";

// Shared real-time support store. It backs BOTH the facility Support drawer
// (Task 14) and the admin Support Chat Inbox (Task 15). Within a tab the module
// store keeps every subscriber in sync; across tabs a BroadcastChannel relays
// each mutation, so a facility message lands in the agent's inbox instantly and
// an agent reply lands in the facility drawer instantly. The channel stands in
// for the real WebSocket/Pusher connection (Task 84) until a backend exists.

export const supportAgents = adminUsers
  .filter((u) => u.status === "active")
  .slice(0, 6);
export const CURRENT_AGENT =
  supportAgents.find((a) => a.id === 1) ?? supportAgents[0];

// The signed-in facility represented by the facility-side Support drawer.
const CF = facilities.find((f) => f.id === 11);
const CF_OWNER = (CF as { owner?: { name?: string; email?: string } })?.owner;
export const CURRENT_FACILITY = {
  id: 11,
  name: CF?.name ?? "Your facility",
  contactName: CF_OWNER?.name ?? "You",
  contactEmail: CF_OWNER?.email ?? "",
};

export function agentName(id: number | null): string | null {
  if (id == null) return null;
  return adminUsers.find((u) => u.id === id)?.name ?? `Agent #${id}`;
}

export function lastMessage(
  c: SupportConversation,
): AdminSupportMessage | null {
  return c.messages[c.messages.length - 1] ?? null;
}

// --- module store ---------------------------------------------------------

let state: SupportConversation[] = supportConversations.map((c) => ({
  ...c,
  messages: [...c.messages],
}));
const listeners = new Set<() => void>();
let seq = 0;

function nextId(prefix: string): string {
  return `${prefix}-${Date.now()}-${seq++}`;
}

function commit(next: SupportConversation[]) {
  state = next;
  listeners.forEach((l) => l());
}

function patch(
  id: string,
  fn: (c: SupportConversation) => SupportConversation,
) {
  commit(state.map((c) => (c.id === id ? fn(c) : c)));
}

// --- real-time transport (BroadcastChannel = shared WebSocket) ------------

type RealtimeEvent =
  | {
      kind: "message";
      conversationId: string;
      message: AdminSupportMessage;
      fromFacility: boolean;
    }
  | { kind: "create"; conversation: SupportConversation }
  | { kind: "status"; conversationId: string; status: ConversationStatus }
  | { kind: "assign"; conversationId: string; agentId: number | null }
  | { kind: "read"; conversationId: string };

let channel: BroadcastChannel | null = null;
let channelReady = false;

function ensureChannel() {
  if (channelReady || typeof window === "undefined") return;
  channelReady = true;
  channel = new BroadcastChannel("yipyy-support-chat");
  channel.onmessage = (e) => applyRemote(e.data as RealtimeEvent);
}

function publish(ev: RealtimeEvent) {
  ensureChannel();
  // BroadcastChannel never echoes to the sender, so this only reaches OTHER
  // tabs — no feedback loop.
  channel?.postMessage(ev);
}

function applyRemote(ev: RealtimeEvent) {
  switch (ev.kind) {
    case "message":
      addMessageInternal(ev.conversationId, ev.message, ev.fromFacility, false);
      break;
    case "create":
      addConversationInternal(ev.conversation, false);
      break;
    case "status":
      setStatusInternal(ev.conversationId, ev.status, false);
      break;
    case "assign":
      assignInternal(ev.conversationId, ev.agentId, false);
      break;
    case "read":
      markReadInternal(ev.conversationId, false);
      break;
  }
}

// --- internal mutations (broadcast flag) ----------------------------------

function addMessageInternal(
  convId: string,
  message: AdminSupportMessage,
  fromFacility: boolean,
  broadcast: boolean,
) {
  patch(convId, (c) => ({
    ...c,
    messages: [...c.messages, message],
    unreadCount: fromFacility ? c.unreadCount + 1 : c.unreadCount,
  }));
  if (broadcast)
    publish({ kind: "message", conversationId: convId, message, fromFacility });
}

function addConversationInternal(
  conversation: SupportConversation,
  broadcast: boolean,
) {
  if (state.some((c) => c.id === conversation.id)) return;
  commit([conversation, ...state]);
  if (broadcast) publish({ kind: "create", conversation });
}

function setStatusInternal(
  convId: string,
  status: ConversationStatus,
  broadcast: boolean,
) {
  patch(convId, (c) => ({ ...c, status }));
  if (broadcast) publish({ kind: "status", conversationId: convId, status });
}

function assignInternal(
  convId: string,
  agentId: number | null,
  broadcast: boolean,
) {
  patch(convId, (c) => ({ ...c, assignedAgentId: agentId }));
  if (broadcast) publish({ kind: "assign", conversationId: convId, agentId });
}

function markReadInternal(convId: string, broadcast: boolean) {
  let changed = false;
  patch(convId, (c) => {
    if (c.unreadCount === 0) return c;
    changed = true;
    return { ...c, unreadCount: 0 };
  });
  if (broadcast && changed) publish({ kind: "read", conversationId: convId });
}

// --- public actions -------------------------------------------------------

/** Agent reply from the inbox (internal notes are kept agent-only on render). */
export function sendSupportReply(
  convId: string,
  body: string,
  opts?: { isInternalNote?: boolean; attachments?: SupportAttachment[] },
) {
  const trimmed = body.trim();
  if (!trimmed && !opts?.attachments?.length) return;
  const message: AdminSupportMessage = {
    id: nextId("m"),
    sender: "agent",
    authorName: CURRENT_AGENT?.name ?? "Yipyy Support",
    body: trimmed,
    at: new Date().toISOString(),
    attachments: opts?.attachments,
    isInternalNote: opts?.isInternalNote,
  };
  addMessageInternal(convId, message, false, true);
}

/** Facility message from the Support drawer — creates the conversation lazily. */
export function sendAsFacility(body: string) {
  const trimmed = body.trim();
  if (!trimmed) return;
  const convId = ensureCurrentConversation();
  const message: AdminSupportMessage = {
    id: nextId("m"),
    sender: "facility",
    authorName: CURRENT_FACILITY.contactName,
    body: trimmed,
    at: new Date().toISOString(),
  };
  addMessageInternal(convId, message, true, true);
}

/** The current facility's conversation id, creating an (unassigned) one if new. */
export function ensureCurrentConversation(): string {
  const existing = state.find((c) => c.facilityId === CURRENT_FACILITY.id);
  if (existing) return existing.id;
  const conversation: SupportConversation = {
    id: nextId("conv"),
    facilityId: CURRENT_FACILITY.id,
    facilityName: CURRENT_FACILITY.name,
    contactName: CURRENT_FACILITY.contactName,
    contactEmail: CURRENT_FACILITY.contactEmail,
    channel: "chat",
    status: "open",
    priority: false,
    assignedAgentId: null,
    online: true,
    unreadCount: 0,
    messages: [],
  };
  addConversationInternal(conversation, true);
  return conversation.id;
}

export function markConversationRead(convId: string) {
  markReadInternal(convId, true);
}

export function setConversationStatus(
  convId: string,
  status: ConversationStatus,
) {
  setStatusInternal(convId, status, true);
}

export function assignConversation(convId: string, agentId: number | null) {
  assignInternal(convId, agentId, true);
}

export function createConversation(facility: {
  id: number;
  name: string;
  contactName: string;
  contactEmail: string;
}): string {
  const id = nextId("conv");
  addConversationInternal(
    {
      id,
      facilityId: facility.id,
      facilityName: facility.name,
      contactName: facility.contactName,
      contactEmail: facility.contactEmail,
      channel: "chat",
      status: "open",
      priority: false,
      assignedAgentId: CURRENT_AGENT?.id ?? null,
      online: true,
      unreadCount: 0,
      messages: [],
    },
    true,
  );
  return id;
}

// --- subscriptions --------------------------------------------------------

function subscribe(listener: () => void) {
  ensureChannel();
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot() {
  return state;
}

export function useSupportInbox(): SupportConversation[] {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

/** The current facility's conversation, for the Support drawer (or null). */
export function useCurrentFacilityConversation(): SupportConversation | null {
  const all = useSupportInbox();
  return all.find((c) => c.facilityId === CURRENT_FACILITY.id) ?? null;
}
