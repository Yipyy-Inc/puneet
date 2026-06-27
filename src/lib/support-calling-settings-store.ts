"use client";

import { useSyncExternalStore } from "react";

import { supportAgents } from "@/hooks/use-support-inbox";
import type { CallAvailability } from "@/types/staff";

// Settings for the admin Support Calls "Settings" tab. A self-contained store
// (does not mutate the facility's defaultCallingSettings). The seed is static —
// no clock dependency — so it initializes eagerly and the same snapshot is safe
// on both server and client.

export type SupportDispatchMode =
  | "ring_all"
  | "round_robin"
  | "specific_team"
  | "priority_based";

export type SupportRingTone =
  | "classic"
  | "soft_chime"
  | "loud_alert"
  | "repeating"
  | "silent";

export type SupportForwardingMode =
  | "disabled"
  | "always"
  | "on_no_answer"
  | "on_busy"
  | "on_no_answer_or_busy";

export type DayKey =
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday"
  | "saturday"
  | "sunday";

export interface BusinessHoursDay {
  open: string;
  close: string;
  enabled: boolean;
}

export interface CallingPermissions {
  makeCalls: boolean;
  viewRecordings: boolean;
  manageVoicemail: boolean;
  editSettings: boolean;
}

export type PermissionKey = keyof CallingPermissions;

export interface SupportCallingSettings {
  dispatchMode: SupportDispatchMode;
  ringTone: SupportRingTone;
  visualFlash: boolean;
  desktopSync: boolean;
  mobileSync: boolean;
  callForwardingMode: SupportForwardingMode;
  callForwardingNumber: string;
  ringDurationSeconds: number;
  autoRecord: boolean;
  autoTranscription: boolean;
  complianceNotice: boolean;
  recordingStorage: "30_days" | "90_days" | "unlimited";
  missedCallAutoSMS: boolean;
  missedCallSMSTemplate: string;
  businessHours: Record<DayKey, BusinessHoursDay>;
  availabilityTimeoutMinutes: number;
  agentStatus: Record<number, CallAvailability>;
  permissions: Record<number, CallingPermissions>;
}

const WEEKDAY: BusinessHoursDay = {
  open: "09:00",
  close: "18:00",
  enabled: true,
};
const WEEKEND: BusinessHoursDay = {
  open: "09:00",
  close: "13:00",
  enabled: false,
};

function seedStatus(): Record<number, CallAvailability> {
  const cycle: CallAvailability[] = [
    "available",
    "available",
    "busy",
    "available",
    "away",
    "available",
  ];
  const out: Record<number, CallAvailability> = {};
  supportAgents.forEach((a, i) => {
    out[a.id] = cycle[i % cycle.length];
  });
  return out;
}

function seedPermissions(): Record<number, CallingPermissions> {
  const out: Record<number, CallingPermissions> = {};
  for (const a of supportAgents) {
    const admin = a.role === "system_administrator";
    const tech = a.role === "technical_support";
    out[a.id] = {
      makeCalls: a.role !== "financial_auditor",
      viewRecordings: true,
      manageVoicemail: admin || tech,
      editSettings: admin,
    };
  }
  return out;
}

let state: SupportCallingSettings = {
  dispatchMode: "round_robin",
  ringTone: "classic",
  visualFlash: true,
  desktopSync: true,
  mobileSync: true,
  callForwardingMode: "on_no_answer",
  callForwardingNumber: "",
  ringDurationSeconds: 25,
  autoRecord: true,
  autoTranscription: true,
  complianceNotice: true,
  recordingStorage: "90_days",
  missedCallAutoSMS: true,
  missedCallSMSTemplate:
    "Hi {{name}}, thanks for calling Yipyy Support — sorry we missed you! We'll call you back shortly. For urgent issues, reply here or email support@yipyy.com.",
  businessHours: {
    monday: { ...WEEKDAY },
    tuesday: { ...WEEKDAY },
    wednesday: { ...WEEKDAY },
    thursday: { ...WEEKDAY },
    friday: { ...WEEKDAY },
    saturday: { ...WEEKEND },
    sunday: { ...WEEKEND },
  },
  availabilityTimeoutMinutes: 30,
  agentStatus: seedStatus(),
  permissions: seedPermissions(),
};

const listeners = new Set<() => void>();

function commit(next: SupportCallingSettings) {
  state = next;
  listeners.forEach((l) => l());
}

export function updateSupportSettings(patch: Partial<SupportCallingSettings>) {
  commit({ ...state, ...patch });
}

export function updateBusinessHours(
  day: DayKey,
  patch: Partial<BusinessHoursDay>,
) {
  commit({
    ...state,
    businessHours: {
      ...state.businessHours,
      [day]: { ...state.businessHours[day], ...patch },
    },
  });
}

export function setAgentStatus(agentId: number, status: CallAvailability) {
  commit({
    ...state,
    agentStatus: { ...state.agentStatus, [agentId]: status },
  });
}

export function setAvailabilityTimeout(minutes: number) {
  commit({ ...state, availabilityTimeoutMinutes: minutes });
}

export function toggleAgentPermission(agentId: number, key: PermissionKey) {
  const current = state.permissions[agentId];
  commit({
    ...state,
    permissions: {
      ...state.permissions,
      [agentId]: { ...current, [key]: !current[key] },
    },
  });
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot(): SupportCallingSettings {
  return state;
}

export function useSupportCallingSettings(): SupportCallingSettings {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
