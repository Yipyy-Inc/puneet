"use client";

import { useSyncExternalStore } from "react";

// Twilio integration config that powers the support calling module (Section 5).
// Credentials live in this store and are masked in the UI; in production they'd
// be stored server-side and never shipped to the client. The calling features
// (Live queue, IVR routing, Dialer) gate on `connected`.

export interface TwilioConfig {
  connected: boolean;
  accountSid: string;
  authToken: string;
  phoneNumbers: string[];
  webhookBaseUrl: string;
  lastVerifiedAt: string | null;
}

export interface TwilioWebhooks {
  /** Inbound calls → Live tab queue + IVR routing. */
  inboundVoice: string;
  /** Outbound calls placed from the Dialer. */
  outboundDial: string;
  /** Call status / progress callbacks. */
  statusCallback: string;
  /** Recording-ready callback. */
  recording: string;
}

let state: TwilioConfig = {
  connected: true,
  accountSid: "ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  authToken: "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  phoneNumbers: ["+1 (415) 555-0100"],
  webhookBaseUrl: "https://app.yipyy.com",
  lastVerifiedAt: "2026-06-22T15:30:00Z",
};

const listeners = new Set<() => void>();

function commit(next: TwilioConfig) {
  state = next;
  listeners.forEach((l) => l());
}

export function updateTwilioConfig(patch: Partial<TwilioConfig>) {
  commit({ ...state, ...patch });
}

export function addTwilioNumber(number: string) {
  const n = number.trim();
  if (!n || state.phoneNumbers.includes(n)) return;
  commit({ ...state, phoneNumbers: [...state.phoneNumbers, n] });
}

export function removeTwilioNumber(number: string) {
  commit({
    ...state,
    phoneNumbers: state.phoneNumbers.filter((n) => n !== number),
  });
}

/** Mock "Test Connection": valid when SID + token are present. */
export function testTwilioConnection(now: Date): boolean {
  const ok =
    state.accountSid.trim().length > 0 && state.authToken.trim().length > 0;
  commit({
    ...state,
    connected: ok,
    lastVerifiedAt: ok ? now.toISOString() : state.lastVerifiedAt,
  });
  return ok;
}

export function disconnectTwilio() {
  commit({ ...state, connected: false });
}

export function twilioWebhooks(base: string): TwilioWebhooks {
  const root = base.replace(/\/+$/, "");
  return {
    inboundVoice: `${root}/api/twilio/voice`,
    outboundDial: `${root}/api/twilio/dial`,
    statusCallback: `${root}/api/twilio/status`,
    recording: `${root}/api/twilio/recording`,
  };
}

/** Mask a credential, revealing only the last 4 characters. */
export function maskSecret(value: string): string {
  if (!value) return "";
  if (value.length <= 4) return "•".repeat(value.length);
  return `${"•".repeat(Math.min(24, value.length - 4))}${value.slice(-4)}`;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot() {
  return state;
}

export function useTwilioConfig(): TwilioConfig {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
