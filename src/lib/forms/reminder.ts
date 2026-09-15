import { formatDateLong } from "@/lib/i18n/format";
import type { FormNotifications } from "@/lib/settings/form-settings";
import { wallClockParts } from "@/lib/time/facility-time";

// ============================================================================
// The reminder a customer is owed before a booking, for a required form they
// have not submitted. Pure, so the window, the key and the words are
// unit-tested; lib/forms/reminder-tick.ts does the reading and the queueing.
//
// ── WHEN ──────────────────────────────────────────────────────────────────
//
// `form_notifications.reminder` is a value and a unit (hours or days) before
// the booking starts. Both anchors, the appointment and check-in, are the
// booking's start here: a booking has one start. The reminder is due from
// that far ahead until the booking begins, and never after.
//
// ── ONCE ──────────────────────────────────────────────────────────────────
//
// The idempotency key names the booking and the forms still missing, so a
// tick that runs every five minutes queues one reminder, and a form the
// facility adds later earns one more.
// ============================================================================

export function reminderWindowHours(
  reminder: FormNotifications["reminder"],
): number {
  return reminder.unit === "days" ? reminder.value * 24 : reminder.value;
}

export function reminderDue(
  startAt: string,
  now: Date,
  reminder: FormNotifications["reminder"],
): boolean {
  const start = new Date(startAt).getTime();
  if (Number.isNaN(start)) return false;
  const opens = start - reminderWindowHours(reminder) * 3_600_000;
  return now.getTime() >= opens && now.getTime() < start;
}

export function reminderKey(bookingId: string, formIds: string[]): string {
  return `form_reminder:${bookingId}:${[...new Set(formIds)].sort().join(",")}`;
}

const COPY = {
  en: {
    subject: (facility: string) => `Forms to complete for ${facility}`,
    greeting: (client: string) => `Hi ${client},`,
    lead: (facility: string, day: string) =>
      `${facility} needs these forms before your booking on ${day}.`,
    close:
      "Each link opens the form. Your answers go straight to the business.",
  },
  fr: {
    subject: (facility: string) => `Formulaires à remplir pour ${facility}`,
    greeting: (client: string) => `Bonjour ${client},`,
    lead: (facility: string, day: string) =>
      `${facility} a besoin de ces formulaires avant votre réservation du ${day}.`,
    close:
      "Chaque lien ouvre le formulaire. Vos réponses sont envoyées directement à l’établissement.",
  },
} as const;

export interface ReminderForm {
  name: string;
  url: string;
  petName: string | null;
}

/** The reminder's subject and plain-text body. */
export function reminderMessage(input: {
  locale: "en" | "fr";
  clientName: string;
  facilityName: string;
  startAt: string;
  timeZone: string;
  forms: ReminderForm[];
}): { subject: string; body: string } {
  const copy = COPY[input.locale];
  const day = formatDateLong(
    wallClockParts(input.startAt, input.timeZone).date,
    input.locale,
  );
  const lines = input.forms.map((form) => {
    const label = form.petName ? `${form.name} (${form.petName})` : form.name;
    return `- ${label}\n  ${form.url}`;
  });
  return {
    subject: copy.subject(input.facilityName),
    body: [
      copy.greeting(input.clientName),
      "",
      copy.lead(input.facilityName, day),
      "",
      ...lines,
      "",
      copy.close,
    ].join("\n"),
  };
}
