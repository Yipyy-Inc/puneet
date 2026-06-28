"use client";

// Centralized real-time connection. ONE connection per tab, multiplexed into
// named channels (support-chat, notifications, presence, alerts, queue, …), so
// every real-time feature shares a single transport instead of opening its own
// BroadcastChannel. Transport is env-gated and honest:
//   • NEXT_PUBLIC_REALTIME_URL set → a real WebSocket (reconnect + heartbeat).
//   • otherwise            → a BroadcastChannel (genuine cross-tab realtime on
//                            the same origin — what the mock app runs on).
// It also tracks connection state (connecting/connected/reconnecting/disconnected)
// and presence (online/away, with idle + tab-visibility detection).

export type ConnectionState =
  | "connecting"
  | "connected"
  | "reconnecting"
  | "disconnected";

export type PresenceStatus = "online" | "away" | "offline";

export type RealtimeRole = "agent" | "facility" | "system";

export interface PresenceMember {
  id: string;
  name: string;
  role: RealtimeRole;
  status: PresenceStatus;
  lastSeen: number;
}

/** Known channels (any string works — these are the ones features use today). */
export type RealtimeChannel =
  | "support-chat"
  | "notifications"
  | "presence"
  | "alerts"
  | "queue";

type Handler = (event: unknown) => void;

interface Envelope {
  ch: string;
  ev: unknown;
  from: string;
}

type PresenceMessage =
  | { type: "join" | "heartbeat"; member: PresenceMember }
  | { type: "leave"; id: string };

const BC_NAME = "yipyy-realtime";
const PING_CH = "__ping__";
const HEARTBEAT_MS = 15_000;
const PRESENCE_TTL_MS = 45_000;
const AWAY_IDLE_MS = 5 * 60_000;
const WS_URL = process.env.NEXT_PUBLIC_REALTIME_URL;

// ---------------------------------------------------------------------------
// Transport abstraction
// ---------------------------------------------------------------------------

interface Transport {
  kind: "websocket" | "broadcast";
  start(
    onMessage: (env: Envelope) => void,
    onState: (s: ConnectionState) => void,
  ): void;
  send(env: Envelope): void;
  stop(): void;
}

function createBroadcastTransport(): Transport {
  let bc: BroadcastChannel | null = null;
  let setState: ((s: ConnectionState) => void) | null = null;
  const online = () => setState?.("connected");
  const offline = () => setState?.("disconnected");
  return {
    kind: "broadcast",
    start(onMessage, onStateChange) {
      setState = onStateChange;
      bc = new BroadcastChannel(BC_NAME);
      bc.onmessage = (e) => onMessage(e.data as Envelope);
      window.addEventListener("online", online);
      window.addEventListener("offline", offline);
      // A BroadcastChannel is local — connected the moment the tab is online.
      onStateChange(navigator.onLine === false ? "disconnected" : "connected");
    },
    send(env) {
      bc?.postMessage(env);
    },
    stop() {
      bc?.close();
      bc = null;
      window.removeEventListener("online", online);
      window.removeEventListener("offline", offline);
    },
  };
}

function createWebSocketTransport(url: string): Transport {
  let ws: WebSocket | null = null;
  let onMsg: ((env: Envelope) => void) | null = null;
  let setState: ((s: ConnectionState) => void) | null = null;
  let attempt = 0;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  let heartbeat: ReturnType<typeof setInterval> | null = null;
  let stopped = false;

  function clearHeartbeat() {
    if (heartbeat) {
      clearInterval(heartbeat);
      heartbeat = null;
    }
  }

  function scheduleReconnect() {
    if (stopped) return;
    setState?.("reconnecting");
    attempt += 1;
    // Exponential backoff, capped at 30s.
    const delay = Math.min(30_000, 1000 * 2 ** Math.min(attempt, 5));
    reconnectTimer = setTimeout(connect, delay);
  }

  function connect() {
    setState?.(attempt === 0 ? "connecting" : "reconnecting");
    try {
      ws = new WebSocket(url);
    } catch {
      scheduleReconnect();
      return;
    }
    ws.onopen = () => {
      attempt = 0;
      setState?.("connected");
      clearHeartbeat();
      heartbeat = setInterval(() => {
        try {
          ws?.send(JSON.stringify({ ch: PING_CH, ev: null, from: "" }));
        } catch {
          // ignore — onclose will drive reconnect
        }
      }, 25_000);
    };
    ws.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data as string) as Envelope;
        if (data && typeof data.ch === "string") onMsg?.(data);
      } catch {
        // ignore malformed frames
      }
    };
    ws.onerror = () => ws?.close();
    ws.onclose = () => {
      clearHeartbeat();
      if (!stopped) scheduleReconnect();
    };
  }

  return {
    kind: "websocket",
    start(onMessage, onStateChange) {
      onMsg = onMessage;
      setState = onStateChange;
      stopped = false;
      connect();
    },
    send(env) {
      try {
        if (ws && ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify(env));
        }
      } catch {
        // ignore
      }
    },
    stop() {
      stopped = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      clearHeartbeat();
      ws?.close();
      ws = null;
    },
  };
}

// ---------------------------------------------------------------------------
// Connection manager (singleton)
// ---------------------------------------------------------------------------

let transport: Transport | null = null;
let started = false;
let connectionState: ConnectionState = "connecting";
const channelHandlers = new Map<string, Set<Handler>>();
const connectionListeners = new Set<() => void>();

const DEFAULT_SELF: PresenceMember = {
  id: "self",
  name: "You",
  role: "agent",
  status: "online",
  lastSeen: 0,
};
let selfId = "self";
let self: PresenceMember = { ...DEFAULT_SELF };
let manualOverride = false;
let lastActivity = 0;
const presenceMembers = new Map<string, PresenceMember>();
const presenceListeners = new Set<() => void>();
let presenceSnapshot: PresenceMember[] = [];
let selfSnapshot: PresenceMember = { ...DEFAULT_SELF };

function emitConnection() {
  connectionListeners.forEach((l) => l());
}

function setConnectionState(s: ConnectionState) {
  if (s === connectionState) return;
  connectionState = s;
  emitConnection();
}

function emitPresence() {
  selfSnapshot = { ...self };
  presenceSnapshot = [...presenceMembers.values()].sort((a, b) =>
    a.name.localeCompare(b.name),
  );
  presenceListeners.forEach((l) => l());
}

function announce(type: "join" | "heartbeat" | "leave") {
  if (!transport) return;
  const ev: PresenceMessage =
    type === "leave"
      ? { type: "leave", id: selfId }
      : { type, member: { ...self } };
  transport.send({ ch: "presence", ev, from: selfId });
}

function handlePresence(msg: PresenceMessage) {
  if (msg.type === "leave") {
    if (presenceMembers.delete(msg.id)) emitPresence();
    return;
  }
  presenceMembers.set(msg.member.id, { ...msg.member, lastSeen: Date.now() });
  emitPresence();
  // Reply to a newcomer so they immediately learn we're here.
  if (msg.type === "join") announce("heartbeat");
}

function prunePresence() {
  const now = Date.now();
  let changed = false;
  presenceMembers.forEach((m, id) => {
    if (id === selfId) return;
    if (now - m.lastSeen > PRESENCE_TTL_MS) {
      presenceMembers.delete(id);
      changed = true;
    }
  });
  if (changed) emitPresence();
}

function applyAutoStatus(status: PresenceStatus) {
  if (manualOverride || status === self.status) return;
  self = { ...self, status, lastSeen: Date.now() };
  presenceMembers.set(selfId, { ...self });
  emitPresence();
  announce("heartbeat");
}

function onVisibility() {
  if (document.visibilityState === "hidden") {
    applyAutoStatus("away");
  } else {
    lastActivity = Date.now();
    applyAutoStatus("online");
  }
}

function markActivity() {
  lastActivity = Date.now();
  if (self.status === "away") applyAutoStatus("online");
}

function onTransportMessage(env: Envelope) {
  // Our own broadcasts never echo on BroadcastChannel; a WS server might, so
  // guard against self-delivery.
  if (env.from === selfId || env.ch === PING_CH) return;
  if (env.ch === "presence") {
    handlePresence(env.ev as PresenceMessage);
    return;
  }
  channelHandlers.get(env.ch)?.forEach((h) => h(env.ev));
}

function ensureStarted() {
  if (started || typeof window === "undefined") return;
  started = true;

  selfId = crypto.randomUUID();
  self = { ...self, id: selfId, lastSeen: Date.now() };
  presenceMembers.set(selfId, { ...self });

  transport = WS_URL
    ? createWebSocketTransport(WS_URL)
    : createBroadcastTransport();
  transport.start(onTransportMessage, setConnectionState);

  announce("join");
  lastActivity = Date.now();

  setInterval(() => {
    self = { ...self, lastSeen: Date.now() };
    presenceMembers.set(selfId, { ...self });
    announce("heartbeat");
    prunePresence();
  }, HEARTBEAT_MS);
  setInterval(() => {
    if (
      !manualOverride &&
      self.status === "online" &&
      Date.now() - lastActivity > AWAY_IDLE_MS
    ) {
      applyAutoStatus("away");
    }
  }, 30_000);

  document.addEventListener("visibilitychange", onVisibility);
  (["mousemove", "keydown", "click", "scroll", "focus"] as const).forEach(
    (ev) => window.addEventListener(ev, markActivity, { passive: true }),
  );
  window.addEventListener("beforeunload", () => announce("leave"));

  emitPresence();
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/** Subscribe to a channel. Returns an unsubscribe fn. */
export function subscribeRealtime(
  channel: string,
  handler: Handler,
): () => void {
  ensureStarted();
  let set = channelHandlers.get(channel);
  if (!set) {
    set = new Set();
    channelHandlers.set(channel, set);
  }
  set.add(handler);
  return () => {
    set?.delete(handler);
  };
}

/** Publish an event to a channel (reaches every other subscriber/tab). */
export function publishRealtime(channel: string, event: unknown) {
  ensureStarted();
  transport?.send({ ch: channel, ev: event, from: selfId });
}

export function getConnectionState(): ConnectionState {
  return connectionState;
}

export function subscribeConnection(listener: () => void): () => void {
  ensureStarted();
  connectionListeners.add(listener);
  return () => connectionListeners.delete(listener);
}

export function getTransportKind(): "websocket" | "broadcast" {
  return WS_URL ? "websocket" : "broadcast";
}

export function getPresenceSnapshot(): PresenceMember[] {
  return presenceSnapshot;
}

export function getSelf(): PresenceMember {
  return selfSnapshot;
}

export function subscribePresence(listener: () => void): () => void {
  ensureStarted();
  presenceListeners.add(listener);
  return () => presenceListeners.delete(listener);
}

/** Identify this tab in presence (called by the portal that owns the session). */
export function setRealtimeIdentity(identity: {
  name: string;
  role: RealtimeRole;
}) {
  ensureStarted();
  if (self.name === identity.name && self.role === identity.role) return;
  self = { ...self, name: identity.name, role: identity.role };
  presenceMembers.set(selfId, { ...self, lastSeen: Date.now() });
  emitPresence();
  announce("heartbeat");
}

/** Explicitly set presence (Online/Away) from the UI — sticks until set back to Online. */
export function setPresenceStatus(status: PresenceStatus) {
  ensureStarted();
  manualOverride = status !== "online";
  self = { ...self, status, lastSeen: Date.now() };
  presenceMembers.set(selfId, { ...self });
  emitPresence();
  announce("heartbeat");
}
