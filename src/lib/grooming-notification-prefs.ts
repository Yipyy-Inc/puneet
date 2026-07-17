// Per-groomer notification preferences — defaults + option metadata (Table 83).
//
// The facility default: every event type on, delivered by SMS + email + in-app
// (push off until a groomer opts in), summary at the facility's 6 PM slot. A
// groomer's saved `notificationPrefs` overrides this whole object.

import type {
  GroomerNotificationChannel,
  GroomerNotificationPrefs,
  GroomerNotificationType,
} from "@/types/grooming";
import { DEFAULT_SUMMARY_SEND_TIME } from "@/lib/grooming-tomorrow-summary";

export const DEFAULT_GROOMER_NOTIFICATION_PREFS: GroomerNotificationPrefs = {
  types: {
    new_booking: true,
    changes: true,
    cancellations: true,
    tomorrow_summary: true,
    day_of: true,
    thirty_min: true,
  },
  channels: {
    sms: true,
    email: true,
    in_app: true,
    push: false,
  },
  summaryTime: DEFAULT_SUMMARY_SEND_TIME,
};

export const GROOMER_NOTIFICATION_TYPE_OPTIONS: {
  key: GroomerNotificationType;
  label: string;
  description: string;
}[] = [
  {
    key: "new_booking",
    label: "New bookings",
    description: "A new appointment is assigned to you",
  },
  {
    key: "changes",
    label: "Changes",
    description: "An appointment is reassigned or rescheduled",
  },
  {
    key: "cancellations",
    label: "Cancellations",
    description: "One of your appointments is cancelled",
  },
  {
    key: "tomorrow_summary",
    label: "Tomorrow's summary",
    description: "Evening recap of tomorrow's schedule",
  },
  {
    key: "day_of",
    label: "Day-of reminder",
    description: "Morning nudge with your first appointment",
  },
  {
    key: "thirty_min",
    label: "30-minute reminder",
    description: "Before each appointment starts",
  },
];

export const GROOMER_NOTIFICATION_CHANNEL_OPTIONS: {
  key: GroomerNotificationChannel;
  label: string;
}[] = [
  { key: "sms", label: "SMS" },
  { key: "email", label: "Email" },
  { key: "in_app", label: "In-app" },
  { key: "push", label: "Push" },
];

/** Clone the defaults so callers can freely mutate their own draft copy. */
export function defaultGroomerNotificationPrefs(): GroomerNotificationPrefs {
  return {
    types: { ...DEFAULT_GROOMER_NOTIFICATION_PREFS.types },
    channels: { ...DEFAULT_GROOMER_NOTIFICATION_PREFS.channels },
    summaryTime: DEFAULT_GROOMER_NOTIFICATION_PREFS.summaryTime,
  };
}
