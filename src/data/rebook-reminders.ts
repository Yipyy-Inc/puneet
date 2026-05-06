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

export type RebookReminderStatus =
  | "scheduled"
  | "sent"
  | "skipped"
  | "rebooked"
  | "dismissed";

export type RebookReminderChannel = ReminderChannel;

export const DISMISS_REASONS = [
  "Moved away",
  "Not ready to book",
  "Already spoke to them",
  "Pet passed away",
  "Other",
] as const;
export type DismissReason = (typeof DISMISS_REASONS)[number];

export interface RebookReminder {
  id: string;
  clientId: number;
  clientName: string;
  petName: string;
  service: ServiceTypeKey;
  lastVisitDate: string;
  /** When the client is *expected* to return based on their frequency. */
  expectedReturnDate: string;
  /** Computed send date = expectedReturnDate − leadDays. */
  scheduledSendDate: string;
  channel: RebookReminderChannel;
  /** 1 = first reminder, 2 = follow-up. We never send more than 2. */
  reminderNumber: 1 | 2;
  /** If reminderNumber=2, points back to the original first reminder. */
  parentReminderId?: string;
  status: RebookReminderStatus;
  sentAt?: string;
  rebookedAt?: string;
  /** Revenue (in dollars) attributed when the rebook landed within 14 days of send. */
  recoveredRevenue?: number;
  rebookedBookingId?: number;
  dismissedAt?: string;
  dismissedBy?: string;
  dismissReason?: DismissReason;
  dismissNote?: string;
  /**
   * Surfaced for both `scheduled` (preview — will auto-skip when sender runs)
   * and `skipped` (already auto-skipped) statuses. Lets the queue card warn
   * staff and the history audit show the reason.
   */
  blockedReasons?: ReminderBlockReason[];
  /** Set when status === "skipped" so we can sort the audit list. */
  skippedAt?: string;
}

export const rebookReminders: RebookReminder[] = [
  {
    id: "rr-001",
    clientId: 15,
    clientName: "Alice Johnson",
    petName: "Buddy",
    service: "grooming",
    lastVisitDate: "2026-04-10",
    expectedReturnDate: "2026-05-08",
    scheduledSendDate: "2026-05-05",
    channel: "both",
    reminderNumber: 1,
    status: "scheduled",
  },
  {
    id: "rr-006",
    clientId: 22,
    clientName: "George Martinez",
    petName: "Coco",
    service: "grooming",
    lastVisitDate: "2026-04-12",
    expectedReturnDate: "2026-05-10",
    scheduledSendDate: "2026-05-07",
    channel: "both",
    reminderNumber: 1,
    status: "scheduled",
  },
  {
    id: "rr-007",
    clientId: 23,
    clientName: "Hannah Lee",
    petName: "Pepper",
    service: "boarding",
    lastVisitDate: "2026-03-15",
    expectedReturnDate: "2026-05-15",
    scheduledSendDate: "2026-05-01",
    channel: "email",
    reminderNumber: 1,
    status: "scheduled",
  },
  {
    id: "rr-008",
    clientId: 24,
    clientName: "Ian Wright",
    petName: "Scout",
    service: "training",
    lastVisitDate: "2026-04-30",
    expectedReturnDate: "2026-05-07",
    scheduledSendDate: "2026-05-04",
    channel: "sms",
    reminderNumber: 1,
    status: "scheduled",
  },
  {
    id: "rr-009",
    clientId: 25,
    clientName: "Jenna Park",
    petName: "Ollie",
    service: "grooming",
    lastVisitDate: "2026-04-22",
    expectedReturnDate: "2026-05-20",
    scheduledSendDate: "2026-05-13",
    channel: "both",
    reminderNumber: 1,
    status: "scheduled",
  },
  {
    id: "rr-002",
    clientId: 16,
    clientName: "Bob Smith",
    petName: "Max",
    service: "training",
    lastVisitDate: "2026-04-25",
    expectedReturnDate: "2026-04-30",
    scheduledSendDate: "2026-04-27",
    channel: "sms",
    reminderNumber: 1,
    status: "sent",
    sentAt: "2026-04-27T09:00:00Z",
  },
  {
    id: "rr-002-fu",
    clientId: 16,
    clientName: "Bob Smith",
    petName: "Max",
    service: "training",
    lastVisitDate: "2026-04-25",
    expectedReturnDate: "2026-04-30",
    scheduledSendDate: "2026-05-04",
    channel: "sms",
    reminderNumber: 2,
    parentReminderId: "rr-002",
    status: "scheduled",
  },
  {
    id: "rr-003",
    clientId: 21,
    clientName: "Frank Ocean",
    petName: "Luna",
    service: "grooming",
    lastVisitDate: "2026-03-28",
    expectedReturnDate: "2026-04-25",
    scheduledSendDate: "2026-04-22",
    channel: "email",
    reminderNumber: 1,
    status: "rebooked",
    sentAt: "2026-04-22T10:30:00Z",
    rebookedAt: "2026-04-23T14:12:00Z",
    rebookedBookingId: 1101,
    recoveredRevenue: 95,
  },
  {
    id: "rr-004",
    clientId: 17,
    clientName: "Charlie Brown",
    petName: "Rocky",
    service: "boarding",
    lastVisitDate: "2026-02-14",
    expectedReturnDate: "2026-04-14",
    scheduledSendDate: "2026-04-07",
    channel: "email",
    reminderNumber: 1,
    status: "sent",
    sentAt: "2026-04-07T08:00:00Z",
  },
  {
    id: "rr-004-fu",
    clientId: 17,
    clientName: "Charlie Brown",
    petName: "Rocky",
    service: "boarding",
    lastVisitDate: "2026-02-14",
    expectedReturnDate: "2026-04-14",
    scheduledSendDate: "2026-04-14",
    channel: "email",
    reminderNumber: 2,
    parentReminderId: "rr-004",
    status: "sent",
    sentAt: "2026-04-14T08:00:00Z",
  },
  {
    id: "rr-005",
    clientId: 15,
    clientName: "Alice Johnson",
    petName: "Whiskers",
    service: "grooming",
    lastVisitDate: "2026-03-30",
    expectedReturnDate: "2026-04-20",
    scheduledSendDate: "2026-04-13",
    channel: "both",
    reminderNumber: 1,
    status: "dismissed",
    dismissedAt: "2026-04-12T16:30:00Z",
    dismissedBy: "Amy C.",
    dismissReason: "Already spoke to them",
    dismissNote: "Spoke to Alice — taking a break this month, will rebook in May",
  },
  // Recent sends in the current month — power the "Sent this month" KPI.
  {
    id: "rr-100",
    clientId: 32,
    clientName: "Sasha Petrov",
    petName: "Tofu",
    service: "grooming",
    lastVisitDate: "2026-04-04",
    expectedReturnDate: "2026-05-02",
    scheduledSendDate: "2026-05-01",
    channel: "both",
    reminderNumber: 1,
    status: "sent",
    sentAt: "2026-05-01T09:00:00Z",
  },
  {
    id: "rr-101",
    clientId: 33,
    clientName: "Noah Becker",
    petName: "Murphy",
    service: "boarding",
    lastVisitDate: "2026-03-02",
    expectedReturnDate: "2026-05-02",
    scheduledSendDate: "2026-04-25",
    channel: "email",
    reminderNumber: 1,
    status: "rebooked",
    sentAt: "2026-04-25T08:00:00Z",
    rebookedAt: "2026-05-02T11:20:00Z",
    rebookedBookingId: 1188,
    recoveredRevenue: 320,
  },
  {
    id: "rr-102",
    clientId: 34,
    clientName: "Lina Garcia",
    petName: "Biscuit",
    service: "grooming",
    lastVisitDate: "2026-04-05",
    expectedReturnDate: "2026-05-03",
    scheduledSendDate: "2026-05-02",
    channel: "sms",
    reminderNumber: 1,
    status: "rebooked",
    sentAt: "2026-05-02T09:00:00Z",
    rebookedAt: "2026-05-03T15:42:00Z",
    rebookedBookingId: 1191,
    recoveredRevenue: 110,
  },
  {
    id: "rr-103",
    clientId: 35,
    clientName: "Owen Carter",
    petName: "Nori",
    service: "training",
    lastVisitDate: "2026-04-26",
    expectedReturnDate: "2026-05-03",
    scheduledSendDate: "2026-05-01",
    channel: "sms",
    reminderNumber: 1,
    status: "sent",
    sentAt: "2026-05-01T10:30:00Z",
  },
  // Preview-blocked: queued, but the sender will auto-skip. Staff can see why.
  {
    id: "rr-010",
    clientId: 28,
    clientName: "Maya Singh",
    petName: "Riley",
    service: "grooming",
    lastVisitDate: "2026-04-08",
    expectedReturnDate: "2026-05-06",
    scheduledSendDate: "2026-05-03",
    channel: "both",
    reminderNumber: 1,
    status: "scheduled",
    blockedReasons: ["future_booking_exists"],
  },
  {
    id: "rr-011",
    clientId: 18,
    clientName: "Daniel Reyes",
    petName: "Storm",
    service: "boarding",
    lastVisitDate: "2026-03-12",
    expectedReturnDate: "2026-05-12",
    scheduledSendDate: "2026-04-28",
    channel: "email",
    reminderNumber: 1,
    status: "scheduled",
    blockedReasons: ["client_opted_out"],
  },
  // Auto-skipped — populates the new History → Skipped section.
  {
    id: "rr-012",
    clientId: 29,
    clientName: "Priya Patel",
    petName: "Nala",
    service: "grooming",
    lastVisitDate: "2026-03-22",
    expectedReturnDate: "2026-04-19",
    scheduledSendDate: "2026-04-12",
    channel: "both",
    reminderNumber: 1,
    status: "skipped",
    skippedAt: "2026-04-12T07:00:00Z",
    blockedReasons: ["future_booking_exists"],
  },
  {
    id: "rr-013",
    clientId: 30,
    clientName: "Tomás Álvarez",
    petName: "Bandit",
    service: "boarding",
    lastVisitDate: "2026-02-25",
    expectedReturnDate: "2026-04-25",
    scheduledSendDate: "2026-04-11",
    channel: "email",
    reminderNumber: 1,
    status: "skipped",
    skippedAt: "2026-04-11T07:00:00Z",
    blockedReasons: ["marketing_opt_out"],
  },
  {
    id: "rr-014",
    clientId: 31,
    clientName: "Rachel Kim",
    petName: "Pixel",
    service: "training",
    lastVisitDate: "2026-04-02",
    expectedReturnDate: "2026-04-09",
    scheduledSendDate: "2026-04-06",
    channel: "sms",
    reminderNumber: 1,
    status: "skipped",
    skippedAt: "2026-04-06T07:00:00Z",
    blockedReasons: ["open_incident", "refund_in_progress"],
  },
];

export interface LapsedClientEntry {
  clientId: number;
  clientName: string;
  petName: string;
  service: ServiceTypeKey;
  lastVisitDate: string;
  expectedFrequency: ServiceFrequency;
  daysOverdue: number;
  /** Whether the override or the facility default is in effect. */
  source: "override" | "default";
  /** How many reminders we already sent before lapsing. */
  remindersSent: number;
  lastReminderAt?: string;
}

export const lapsedClients: LapsedClientEntry[] = [
  {
    clientId: 17,
    clientName: "Charlie Brown",
    petName: "Rocky",
    service: "boarding",
    lastVisitDate: "2026-02-14",
    expectedFrequency: { value: 2, unit: "months" },
    daysOverdue: 20,
    source: "default",
    remindersSent: 2,
    lastReminderAt: "2026-04-14T08:00:00Z",
  },
  {
    clientId: 19,
    clientName: "Ethan Hunt",
    petName: "Cooper",
    service: "grooming",
    lastVisitDate: "2026-02-22",
    expectedFrequency: { value: 4, unit: "weeks" },
    daysOverdue: 43,
    source: "default",
    remindersSent: 2,
    lastReminderAt: "2026-04-01T10:00:00Z",
  },
  {
    clientId: 20,
    clientName: "Fiona Gallagher",
    petName: "Bella",
    service: "grooming",
    lastVisitDate: "2026-03-05",
    expectedFrequency: { value: 4, unit: "weeks" },
    daysOverdue: 32,
    source: "default",
    remindersSent: 2,
    lastReminderAt: "2026-04-15T09:30:00Z",
  },
  {
    clientId: 26,
    clientName: "Karen Liu",
    petName: "Mochi",
    service: "boarding",
    lastVisitDate: "2026-01-10",
    expectedFrequency: { value: 2, unit: "months" },
    daysOverdue: 54,
    source: "default",
    remindersSent: 2,
    lastReminderAt: "2026-03-20T11:00:00Z",
  },
  {
    clientId: 27,
    clientName: "Liam O'Connor",
    petName: "Biscuit",
    service: "training",
    lastVisitDate: "2026-04-01",
    expectedFrequency: { value: 1, unit: "weeks" },
    daysOverdue: 26,
    source: "default",
    remindersSent: 2,
    lastReminderAt: "2026-04-15T14:00:00Z",
  },
];

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

export function isClientOptedOutOfRebook(clientId: number): boolean {
  return Boolean(
    clientRebookOptOuts.find((o) => o.clientId === clientId)?.optedOut,
  );
}

export type ReminderBlockReason =
  | "client_blocked"
  | "client_opted_out"
  | "client_inactive"
  | "marketing_opt_out"
  | "open_incident"
  | "refund_in_progress"
  | "future_booking_exists";

export interface ReminderBlockCheck {
  blocked: boolean;
  reasons: ReminderBlockReason[];
}

export const BLOCK_REASON_LABELS: Record<ReminderBlockReason, string> = {
  client_blocked: "Client is blocked by the facility",
  client_opted_out: "Client opted out of rebook reminders",
  client_inactive: "Client is marked inactive",
  marketing_opt_out: "Client opted out of marketing messages",
  open_incident: "Open incident on profile",
  refund_in_progress: "Refund in progress",
  future_booking_exists: "Already has a future booking for this service",
};

/**
 * Pure check used by the queue/lapsed components and (in production) by the
 * sender right before delivery. Callers pass in the relevant flags so this
 * stays decoupled from the data layers.
 */
export function getReminderBlockCheck(input: {
  clientId: number;
  clientBlocked?: boolean;
  clientStatus?: string;
  marketingOptOut?: boolean;
  hasOpenIncident?: boolean;
  refundInProgress?: boolean;
  hasFutureBookingForService?: boolean;
}): ReminderBlockCheck {
  const reasons: ReminderBlockReason[] = [];
  if (input.clientBlocked) reasons.push("client_blocked");
  if (isClientOptedOutOfRebook(input.clientId))
    reasons.push("client_opted_out");
  if (input.clientStatus === "inactive") reasons.push("client_inactive");
  if (input.marketingOptOut) reasons.push("marketing_opt_out");
  if (input.hasOpenIncident) reasons.push("open_incident");
  if (input.refundInProgress) reasons.push("refund_in_progress");
  if (input.hasFutureBookingForService)
    reasons.push("future_booking_exists");
  return { blocked: reasons.length > 0, reasons };
}

/**
 * Format a USD revenue total compactly (e.g. $1,250 or $12.4k).
 */
export function formatRevenue(amount: number): string {
  if (amount >= 10_000) {
    const k = amount / 1_000;
    const fixed = k >= 100 ? Math.round(k).toString() : k.toFixed(1);
    return `$${fixed}k`;
  }
  return `$${amount.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}

/**
 * Compute the date a reminder should be sent given completion date, frequency,
 * and the lead time the facility configured.
 */
export function computeReminderSchedule(
  completionDate: string,
  frequency: ServiceFrequency,
  leadDays: number,
): { expectedReturnDate: string; scheduledSendDate: string } {
  const completion = new Date(completionDate + "T00:00:00").getTime();
  const expected = new Date(
    completion + frequencyInDays(frequency) * 86400000,
  );
  const send = new Date(expected.getTime() - leadDays * 86400000);
  return {
    expectedReturnDate: expected.toISOString().slice(0, 10),
    scheduledSendDate: send.toISOString().slice(0, 10),
  };
}
