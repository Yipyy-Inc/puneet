import {
  ListOrdered,
  Radio,
  Shuffle,
  Users,
  type LucideIcon,
} from "lucide-react";

import type {
  DayKey,
  PermissionKey,
  SupportDispatchMode,
  SupportForwardingMode,
  SupportRingTone,
} from "@/lib/support-calling-settings-store";

export const DISPATCH_OPTIONS: {
  value: SupportDispatchMode;
  label: string;
  description: string;
  icon: LucideIcon;
  recommended?: boolean;
}[] = [
  {
    value: "ring_all",
    label: "Ring All Agents",
    description: "Every available agent rings at once.",
    icon: Radio,
  },
  {
    value: "round_robin",
    label: "Round-Robin",
    description: "Distribute calls evenly across the team.",
    icon: Shuffle,
    recommended: true,
  },
  {
    value: "specific_team",
    label: "Specific Team",
    description: "Route to a chosen support team.",
    icon: Users,
  },
  {
    value: "priority_based",
    label: "Priority-Based",
    description: "Senior agents first, then overflow.",
    icon: ListOrdered,
  },
];

export const RINGTONE_OPTIONS: { value: SupportRingTone; label: string }[] = [
  { value: "classic", label: "Classic Ring" },
  { value: "soft_chime", label: "Soft Chime" },
  { value: "loud_alert", label: "Loud Alert" },
  { value: "repeating", label: "Repeating Notification" },
  { value: "silent", label: "Silent (visual only)" },
];

export const FORWARDING_OPTIONS: {
  value: SupportForwardingMode;
  label: string;
}[] = [
  { value: "disabled", label: "Disabled — no forwarding" },
  { value: "always", label: "Always forward all calls" },
  { value: "on_no_answer", label: "Forward on no answer" },
  { value: "on_busy", label: "Forward when busy" },
  { value: "on_no_answer_or_busy", label: "Forward on no answer or busy" },
];

export const DAYS: DayKey[] = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
];

export const DAY_LABELS: Record<DayKey, string> = {
  monday: "Mon",
  tuesday: "Tue",
  wednesday: "Wed",
  thursday: "Thu",
  friday: "Fri",
  saturday: "Sat",
  sunday: "Sun",
};

export const PERMISSION_COLUMNS: { key: PermissionKey; label: string }[] = [
  { key: "makeCalls", label: "Make Calls" },
  { key: "viewRecordings", label: "View Recordings" },
  { key: "manageVoicemail", label: "Manage Voicemail" },
  { key: "editSettings", label: "Edit Settings" },
];

export const RETENTION_LABELS: Record<string, string> = {
  "30_days": "30 days — Basic",
  "90_days": "90 days — Pro",
  unlimited: "Unlimited — Enterprise",
};
