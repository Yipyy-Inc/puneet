"use client";

import { useSyncExternalStore } from "react";

import {
  alertConfigurations,
  type AlertConfiguration,
} from "@/data/system-health";

// Mutable alert-rule (configuration) store. Seeds from the static
// `alertConfigurations` and lets the Alert Configuration tab create / edit /
// delete / enable-disable rules. Persisted to localStorage + synced across
// tabs (BroadcastChannel), mirroring the other module stores. Eager.

export type AlertRuleSeverity = AlertConfiguration["severity"];
export type AlertRuleType = AlertConfiguration["alertType"];
export type AlertRuleChannel = AlertConfiguration["channels"][number];

/** The editable subset of a rule, used by the create/edit form. */
export interface AlertRuleInput {
  alertName: string;
  alertType: AlertRuleType;
  metric: string;
  condition: string;
  threshold: number;
  duration: number;
  severity: AlertRuleSeverity;
  channels: AlertRuleChannel[];
  recipients: string[];
  routeToSupportAgents: boolean;
  enabled: boolean;
}

const STORAGE_KEY = "yipyy-alert-configs";
const CHANNEL = "yipyy-alert-configs";

const SEED: AlertConfiguration[] = alertConfigurations.map((c) => ({ ...c }));
let configs: AlertConfiguration[] = SEED;
let ready = false;
let counter = 0;
const listeners = new Set<() => void>();
let channel: BroadcastChannel | null = null;

function emit() {
  listeners.forEach((l) => l());
}

function persist() {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(configs));
  } catch {
    // ignore
  }
}

function load() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) configs = JSON.parse(raw) as AlertConfiguration[];
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

function commit(next: AlertConfiguration[]) {
  configs = next;
  persist();
  emit();
  ensureChannel();
  channel?.postMessage({ kind: "sync" });
}

function newId() {
  counter += 1;
  return `config-${Date.now().toString(36)}-${counter}`;
}

/** Create a new alert rule. */
export function createAlertConfig(input: AlertRuleInput, createdBy: string) {
  ensureReady();
  const rule: AlertConfiguration = {
    configId: newId(),
    ...input,
    escalationRules: input.routeToSupportAgents
      ? [{ level: 1, delay: 0, recipients: ["All available support agents"] }]
      : [],
    cooldown: 30,
    createdBy,
    lastTriggered: null,
    triggerCount: 0,
  };
  commit([rule, ...configs]);
}

/** Update an existing alert rule's editable fields. */
export function updateAlertConfig(configId: string, input: AlertRuleInput) {
  ensureReady();
  commit(
    configs.map((c) => (c.configId === configId ? { ...c, ...input } : c)),
  );
}

/** Delete an alert rule. */
export function deleteAlertConfig(configId: string) {
  ensureReady();
  commit(configs.filter((c) => c.configId !== configId));
}

/** Toggle a rule on/off. */
export function toggleAlertConfig(configId: string, enabled: boolean) {
  ensureReady();
  commit(configs.map((c) => (c.configId === configId ? { ...c, enabled } : c)));
}

function subscribe(listener: () => void) {
  ensureReady();
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot(): AlertConfiguration[] {
  return configs;
}

function getServerSnapshot(): AlertConfiguration[] {
  return SEED;
}

export function useAlertConfigs(): AlertConfiguration[] {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
