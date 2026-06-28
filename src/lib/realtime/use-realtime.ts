"use client";

import { useEffect, useSyncExternalStore } from "react";

import {
  getConnectionState,
  getPresenceSnapshot,
  getSelf,
  subscribeConnection,
  subscribePresence,
  subscribeRealtime,
  type ConnectionState,
  type PresenceMember,
} from "./realtime-client";

const EMPTY_MEMBERS: PresenceMember[] = [];
const DEFAULT_SELF: PresenceMember = {
  id: "self",
  name: "You",
  role: "agent",
  status: "online",
  lastSeen: 0,
};

/** Live connection state of the shared real-time connection. */
export function useRealtimeConnection(): ConnectionState {
  return useSyncExternalStore(
    subscribeConnection,
    getConnectionState,
    () => "connecting",
  );
}

/**
 * Subscribe to a real-time channel for the lifetime of the component.
 * `onEvent` should be stable (wrap in useCallback) to avoid re-subscribing.
 */
export function useRealtimeChannel(
  channel: string,
  onEvent: (event: unknown) => void,
) {
  useEffect(() => subscribeRealtime(channel, onEvent), [channel, onEvent]);
}

/** Everyone currently present on the shared connection (across tabs/portals). */
export function useRealtimePresence(): PresenceMember[] {
  return useSyncExternalStore(
    subscribePresence,
    getPresenceSnapshot,
    () => EMPTY_MEMBERS,
  );
}

/** This tab's own presence member. */
export function useRealtimeSelf(): PresenceMember {
  return useSyncExternalStore(subscribePresence, getSelf, () => DEFAULT_SELF);
}

export {
  setPresenceStatus,
  setRealtimeIdentity,
  getTransportKind,
} from "./realtime-client";
export type {
  ConnectionState,
  PresenceMember,
  PresenceStatus,
  RealtimeRole,
} from "./realtime-client";
