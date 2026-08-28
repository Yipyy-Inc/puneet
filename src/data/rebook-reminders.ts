// ========================================
// REBOOK REMINDERS & SERVICE FREQUENCY
// ========================================
//
// Powers the "Rebook Reminders" card under Automations and the per-client
// Service Preferences section. Frequencies are tracked per service type
// (grooming, boarding, daycare, training, plus any custom services), with
// a facility-wide default that each client can override.

export type FrequencyUnit = "days" | "weeks" | "months";

export interface ServiceFrequency {
  value: number;
  unit: FrequencyUnit;
}

/**
 * Canonical service keys used across the app. Custom services are referenced
 * by their string id from facility config and treated identically here.
 */
export type ServiceTypeKey =
  | "grooming"
  | "boarding"
  | "daycare"
  | "training"
  | string;

export interface ServiceTypeMeta {
  key: ServiceTypeKey;
  label: string;
  /** Whether this is a built-in or facility-defined custom service. */
  custom?: boolean;
}

export const REBOOK_SERVICE_TYPES: ServiceTypeMeta[] = [
  { key: "grooming", label: "Grooming" },
  { key: "boarding", label: "Boarding" },
  { key: "daycare", label: "Daycare" },
  { key: "training", label: "Training" },
  { key: "swim", label: "Swim Sessions", custom: true },
];

/**
 * Lead-time presets for sending the reminder *before* the expected return
 * date. 0 = on the expected date itself. Custom values supported via the
 * editor.
 */
export const REMINDER_LEAD_PRESETS = [0, 3, 7, 14] as const;
export type ReminderChannel = "email" | "sms" | "both";

export interface RebookMessageTemplate {
  subject: string;
  body: string;
}

export interface SecondReminderConfig {
  enabled: boolean;
  /** Days after the first reminder to send the follow-up. */
  delayDays: number;
}

/**
 * Facility-wide default frequency per service. Set once in
 * Automations → Rebook Reminders. Inherited by new clients automatically.
 */
export interface DefaultServiceFrequency {
  service: ServiceTypeKey;
  frequency: ServiceFrequency;
  /** When true, send a rebook reminder when the client approaches their expected return date. */
  remindersEnabled: boolean;
  /**
   * Days *before* the expected return date to send the first reminder.
   * 0 = on the expected date itself.
   */
  leadDays: number;
  channel: ReminderChannel;
  secondReminder: SecondReminderConfig;
  template: RebookMessageTemplate;
}

const defaultGroomingTemplate: RebookMessageTemplate = {
  subject: "Time for {{pet_name}}'s next groom?",
  body: "Hi {{client_name}},\n\nIt's been a while since {{pet_name}}'s last grooming on {{last_visit}}. Keeping a regular schedule helps keep their coat healthy and tangle-free.\n\nBook in 30 seconds: {{booking_link}}\n\nSee you soon,\n{{facility_name}}",
};

const defaultBoardingTemplate: RebookMessageTemplate = {
  subject: "Planning {{pet_name}}'s next stay?",
  body: "Hi {{client_name}},\n\nIt's been a while since {{pet_name}} last boarded with us. Travel coming up? Lock in your dates early — our calendar fills fast.\n\nReserve now: {{booking_link}}\n\n{{facility_name}}",
};

const defaultDaycareTemplate: RebookMessageTemplate = {
  subject: "{{pet_name}} misses their friends!",
  body: "Hi {{client_name}},\n\n{{pet_name}} hasn't been to daycare in a bit. Want to book some playtime this week?\n\nBook here: {{booking_link}}\n\n{{facility_name}}",
};

const defaultTrainingTemplate: RebookMessageTemplate = {
  subject: "Keep {{pet_name}}'s training momentum going",
  body: "Hi {{client_name}},\n\nConsistency is the key to training results. Let's get {{pet_name}}'s next session on the calendar.\n\nBook now: {{booking_link}}\n\n{{facility_name}}",
};

const defaultSwimTemplate: RebookMessageTemplate = {
  subject: "Time for another swim with {{pet_name}}?",
  body: "Hi {{client_name}},\n\n{{pet_name}}'s last swim session was {{last_visit}}. Ready for another splash?\n\n{{booking_link}}\n\n{{facility_name}}",
};

export const defaultServiceFrequencies: DefaultServiceFrequency[] = [
  {
    service: "grooming",
    frequency: { value: 4, unit: "weeks" },
    remindersEnabled: true,
    leadDays: 7,
    channel: "both",
    secondReminder: { enabled: true, delayDays: 7 },
    template: defaultGroomingTemplate,
  },
  {
    service: "boarding",
    frequency: { value: 2, unit: "months" },
    remindersEnabled: true,
    leadDays: 14,
    channel: "email",
    secondReminder: { enabled: true, delayDays: 7 },
    template: defaultBoardingTemplate,
  },
  {
    service: "daycare",
    frequency: { value: 1, unit: "weeks" },
    remindersEnabled: false,
    leadDays: 0,
    channel: "sms",
    secondReminder: { enabled: false, delayDays: 5 },
    template: defaultDaycareTemplate,
  },
  {
    service: "training",
    frequency: { value: 1, unit: "weeks" },
    remindersEnabled: true,
    leadDays: 3,
    channel: "sms",
    secondReminder: { enabled: false, delayDays: 5 },
    template: defaultTrainingTemplate,
  },
  {
    service: "swim",
    frequency: { value: 6, unit: "weeks" },
    remindersEnabled: false,
    leadDays: 7,
    channel: "email",
    secondReminder: { enabled: true, delayDays: 7 },
    template: defaultSwimTemplate,
  },
];

export const REBOOK_TEMPLATE_VARIABLES = [
  { token: "{{client_name}}", label: "Client name" },
  { token: "{{pet_name}}", label: "Pet name" },
  { token: "{{service}}", label: "Service" },
  { token: "{{last_visit}}", label: "Last visit date" },
  { token: "{{expected_date}}", label: "Expected return date" },
  { token: "{{booking_link}}", label: "Booking link" },
  { token: "{{facility_name}}", label: "Facility name" },
];

/**
 * Per-client master toggle — when true, no rebook reminders go out for this
 * client across any service. Independent of marketing opt-outs.
 */
export interface ClientRebookOptOut {
  clientId: number;
  optedOut: boolean;
  reason?: string;
  updatedAt: string;
  updatedBy?: string;
}

export const clientRebookOptOuts: ClientRebookOptOut[] = [
  {
    clientId: 18,
    optedOut: true,
    reason: "Client requested by phone — too many messages",
    updatedAt: "2026-04-15T10:30:00Z",
    updatedBy: "Jessica M.",
  },
];

/**
 * Per-client override. If a client has no entry for a given service, the
 * facility default is used.
 */
export interface ClientServicePreference {
  clientId: number;
  service: ServiceTypeKey;
  frequency: ServiceFrequency;
  /** Free-form note staff added when overriding (e.g. "thick coat"). */
  reason?: string;
  updatedAt: string;
}

export const clientServicePreferences: ClientServicePreference[] = [
  {
    clientId: 15,
    service: "grooming",
    frequency: { value: 3, unit: "weeks" },
    reason: "Thick double coat — mats fast",
    updatedAt: "2026-03-12T15:42:00Z",
  },
  {
    clientId: 15,
    service: "boarding",
    frequency: { value: 1, unit: "months" },
    reason: "Frequent traveler",
    updatedAt: "2026-03-12T15:42:00Z",
  },
  {
    clientId: 16,
    service: "training",
    frequency: { value: 5, unit: "days" },
    reason: "Active behavioral plan",
    updatedAt: "2026-04-02T10:15:00Z",
  },
  {
    clientId: 17,
    service: "grooming",
    frequency: { value: 6, unit: "weeks" },
    updatedAt: "2026-02-08T09:00:00Z",
  },
];

// ── DELETED 2026-08-28: the Queue and History fixtures ────────────────────
//
// `rebookReminders` (26 invented reminders), `lapsedClients` (5 invented
// people), `RebookReminder`, `LapsedClientEntry`, `DISMISS_REASONS` and the
// reminder-block helpers lived here. All four tabs that read them are now on
// Postgres: `lapsed_clients()` / `rebook_pipeline()` for the Queue and Lapsed
// lists, `rebook_history()` for History and the analytics row.
//
// They are deleted rather than left in place because dead fixtures do not stay
// dead — they get re-imported by the next person who needs "some rebook data",
// and nothing in the build would object.
//
// What REMAINS below is genuinely still used: the service-frequency shapes the
// Defaults tab renders, and the per-client Service Preferences section, which
// has not been converted.

// ----------------------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------------------

export function frequencyInDays(f: ServiceFrequency): number {
  switch (f.unit) {
    case "days":
      return f.value;
    case "weeks":
      return f.value * 7;
    case "months":
      return f.value * 30;
  }
}

export function formatFrequency(f: ServiceFrequency): string {
  const noun =
    f.value === 1
      ? f.unit === "days"
        ? "day"
        : f.unit === "weeks"
          ? "week"
          : "month"
      : f.unit;
  return `Every ${f.value} ${noun}`;
}

export function getServiceLabel(service: ServiceTypeKey): string {
  return (
    REBOOK_SERVICE_TYPES.find((s) => s.key === service)?.label ??
    service.charAt(0).toUpperCase() + service.slice(1)
  );
}

/**
 * Compute the average gap (in days) between consecutive bookings for a given
 * client + service. Returns null when there's not enough history.
 */
export function computeActualFrequency(
  bookingDates: string[],
): ServiceFrequency | null {
  if (bookingDates.length < 2) return null;
  const sorted = [...bookingDates]
    .map((d) => new Date(d).getTime())
    .sort((a, b) => a - b);
  let totalGap = 0;
  for (let i = 1; i < sorted.length; i++) {
    totalGap += sorted[i] - sorted[i - 1];
  }
  const avgDays = Math.round(totalGap / (sorted.length - 1) / 86400000);
  if (avgDays >= 60) {
    return { value: Math.round(avgDays / 30), unit: "months" };
  }
  if (avgDays >= 14) {
    return { value: Math.round(avgDays / 7), unit: "weeks" };
  }
  return { value: avgDays, unit: "days" };
}

export function getEffectiveFrequency(
  clientId: number,
  service: ServiceTypeKey,
): { frequency: ServiceFrequency; source: "override" | "default" } {
  const override = clientServicePreferences.find(
    (p) => p.clientId === clientId && p.service === service,
  );
  if (override) return { frequency: override.frequency, source: "override" };
  const fallback = defaultServiceFrequencies.find((d) => d.service === service);
  return {
    frequency: fallback?.frequency ?? { value: 4, unit: "weeks" },
    source: "default",
  };
}
