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

// ── DELETED 2026-08-29: the per-client fixtures ───────────────────────────
//
// `clientRebookOptOuts` and `clientServicePreferences` lived here — two
// hand-written arrays keyed by fixture client ids, edited into a `useState` on
// the client file and gone on reload. Both are Postgres now
// (`client_rebook_preferences`, 20260829105200), read by the client file
// through /api/clients/[ref]/rebook-preferences and honoured by
// `rebook_pipeline` itself, so the Queue and the Lapsed tab use a client's own
// interval without a second rule anywhere.
//
// `computeActualFrequency` and `getEffectiveFrequency` went with them: the
// first is a lateral pass over the client's real bookings in the route now, and
// the second was resolving an override against a fixture default.

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
  // `REBOOK_SERVICE_TYPES` used to supply five hand-written labels here. The
  // services a facility runs come from `bookings.service` now, so a fixed list
  // could only ever be right for the four Yipyy ships and wrong for every
  // custom one — capitalising the slug is right for all of them.
  return service.charAt(0).toUpperCase() + service.slice(1);
}
