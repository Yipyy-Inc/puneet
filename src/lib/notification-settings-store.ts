"use client";

import { useSyncExternalStore } from "react";

import { notificationChannels } from "@/data/system-health";

// Mutable notification-settings store for the Alerts page → Notification
// Channels tab: email recipients per severity, the Slack webhook, and the
// business-hours / on-call routing config. A single settings object, persisted
// to localStorage + synced across tabs (BroadcastChannel). Eager.

export type AlertSeverity = "Low" | "Medium" | "High" | "Critical";

export type NotifDayKey =
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday"
  | "saturday"
  | "sunday";

export interface NotifBusinessHoursDay {
  open: string; // "HH:mm"
  close: string; // "HH:mm"
  enabled: boolean;
}

export interface NotificationSettings {
  recipientsBySeverity: Record<AlertSeverity, string[]>;
  slackWebhookUrl: string;
  slackChannel: string;
  businessHours: Record<NotifDayKey, NotifBusinessHoursDay>;
  onCallAgentIds: string[];
  routeAfterHoursToOnCall: boolean;
}

const STORAGE_KEY = "yipyy-notification-settings";
const CHANNEL = "yipyy-notification-settings";

// Seed from the real notification channels where possible.
const emailChannel = notificationChannels.find(
  (c) => c.channelType === "Email",
);
const baseEmails = emailChannel?.recipients ?? ["ops-team@company.com"];
const slackChannelSeed = notificationChannels.find(
  (c) => c.channelType === "Slack",
);

function day(enabled: boolean): NotifBusinessHoursDay {
  return { open: "09:00", close: "17:00", enabled };
}

function buildSeed(): NotificationSettings {
  return {
    recipientsBySeverity: {
      Critical: Array.from(
        new Set([...baseEmails, "incident-team@company.com"]),
      ),
      High: [...baseEmails],
      Medium: [baseEmails[0] ?? "ops-team@company.com"],
      Low: [baseEmails[0] ?? "ops-team@company.com"],
    },
    slackWebhookUrl: String(slackChannelSeed?.configuration.webhookUrl ?? ""),
    slackChannel: String(slackChannelSeed?.configuration.channel ?? "#alerts"),
    businessHours: {
      monday: day(true),
      tuesday: day(true),
      wednesday: day(true),
      thursday: day(true),
      friday: day(true),
      saturday: day(false),
      sunday: day(false),
    },
    // Default on-call: the Team Lead + the Manager.
    onCallAgentIds: ["agent-001", "agent-005"],
    routeAfterHoursToOnCall: true,
  };
}

const SEED: NotificationSettings = buildSeed();
let settings: NotificationSettings = SEED;
let ready = false;
const listeners = new Set<() => void>();
let channel: BroadcastChannel | null = null;

function emit() {
  listeners.forEach((l) => l());
}

function persist() {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // ignore
  }
}

function load() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) settings = JSON.parse(raw) as NotificationSettings;
  } catch {
    // ignore
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

function commit(next: NotificationSettings) {
  settings = next;
  persist();
  emit();
  ensureChannel();
  channel?.postMessage({ kind: "sync" });
}

/** Add an email recipient to a severity (no-op if already present). */
export function addSeverityRecipient(severity: AlertSeverity, email: string) {
  ensureReady();
  const current = settings.recipientsBySeverity[severity];
  if (current.includes(email)) return;
  commit({
    ...settings,
    recipientsBySeverity: {
      ...settings.recipientsBySeverity,
      [severity]: [...current, email],
    },
  });
}

/** Remove an email recipient from a severity. */
export function removeSeverityRecipient(
  severity: AlertSeverity,
  email: string,
) {
  ensureReady();
  commit({
    ...settings,
    recipientsBySeverity: {
      ...settings.recipientsBySeverity,
      [severity]: settings.recipientsBySeverity[severity].filter(
        (e) => e !== email,
      ),
    },
  });
}

/** Set the Slack webhook URL + channel. */
export function setSlack(webhookUrl: string, slackChannel: string) {
  ensureReady();
  commit({ ...settings, slackWebhookUrl: webhookUrl, slackChannel });
}

/** Patch a single business-hours day. */
export function updateNotifBusinessHours(
  dayKey: NotifDayKey,
  patch: Partial<NotifBusinessHoursDay>,
) {
  ensureReady();
  commit({
    ...settings,
    businessHours: {
      ...settings.businessHours,
      [dayKey]: { ...settings.businessHours[dayKey], ...patch },
    },
  });
}

/** Toggle an agent in/out of the on-call group. */
export function toggleOnCallAgent(agentId: string) {
  ensureReady();
  const on = settings.onCallAgentIds.includes(agentId);
  commit({
    ...settings,
    onCallAgentIds: on
      ? settings.onCallAgentIds.filter((id) => id !== agentId)
      : [...settings.onCallAgentIds, agentId],
  });
}

/** Toggle whether after-hours alerts route to the on-call group. */
export function setRouteAfterHoursToOnCall(value: boolean) {
  ensureReady();
  commit({ ...settings, routeAfterHoursToOnCall: value });
}

function subscribe(listener: () => void) {
  ensureReady();
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot(): NotificationSettings {
  return settings;
}

function getServerSnapshot(): NotificationSettings {
  return SEED;
}

export function useNotificationSettings(): NotificationSettings {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
