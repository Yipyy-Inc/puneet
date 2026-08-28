import { z } from "zod";

// ============================================================================
// How often a facility expects each service to come round again.
//
// This is the number that decides who is "lapsed". Until now it lived in
// `src/data/rebook-reminders.ts` as `defaultServiceFrequencies`, held in a
// `useState` on the card — so every facility shared one set of frequencies, an
// edit survived until the tab was closed, and the Lapsed list was a fixture
// array of five invented people. All three are the same bug: a facility-owned
// value that the facility did not own.
//
// ── THE FALLBACK IS OFF, AND THAT IS DELIBERATE ───────────────────────────
//
// `remindersEnabled: false` everywhere, until somebody says otherwise. A
// facility that has never opened this screen must not begin messaging its
// lapsed clients because the app assumed a four-week grooming cycle on their
// behalf. Same reasoning as `NO_TAX` and the quiet-hours default: when the
// consequence of a wrong guess is a customer-visible action, the guess is
// "do nothing".
//
// The frequencies themselves are NOT zero, though — they are the industry
// numbers the fixture used. An unconfigured facility still gets a sensible
// Lapsed list to look at; it just does not send anything off the back of it.
//
// ── FREQUENCY IS STORED IN DAYS ───────────────────────────────────────────
//
// The fixture stored `{value: 4, unit: 'weeks'}`. Two representations of the
// same interval means two places to convert it, and the SQL that computes
// "overdue" needs days regardless. The UI can still offer weeks and months —
// it converts on the way in, which is the only place the unit matters.
// ============================================================================

export const rebookChannelEnum = z.enum(["email", "sms", "both"]);
export type RebookChannel = z.infer<typeof rebookChannelEnum>;

export const serviceRebookRuleSchema = z.object({
  /** How long between visits, in days. */
  frequencyDays: z.number().int().min(1).max(3650),
  /** Whether a lapsed client for this service may be messaged at all. */
  remindersEnabled: z.boolean(),
  /** Days BEFORE the expected return date to write. 0 = on the day. */
  leadDays: z.number().int().min(0).max(120),
  channel: rebookChannelEnum,
  /**
   * How far past the expected return date somebody has to be before they
   * count as lapsed rather than merely due. Without it the Lapsed tab and the
   * Queue tab name the same people.
   */
  lapsedAfterDays: z.number().int().min(1).max(3650),
});
export type ServiceRebookRule = z.infer<typeof serviceRebookRuleSchema>;

export const rebookConfigSchema = z.object({
  /** Keyed by `bookings.service` — 'grooming', 'boarding', or a custom slug. */
  services: z.record(z.string(), serviceRebookRuleSchema),
});
export type RebookConfig = z.infer<typeof rebookConfigSchema>;

/** A service nobody has configured: visible, countable, and silent. */
export function defaultRebookRule(frequencyDays: number): ServiceRebookRule {
  return {
    frequencyDays,
    remindersEnabled: false,
    leadDays: 7,
    channel: "email",
    lapsedAfterDays: 14,
  };
}

export const NO_REBOOK_CONFIG: RebookConfig = {
  services: {
    grooming: defaultRebookRule(28),
    boarding: defaultRebookRule(60),
    daycare: defaultRebookRule(7),
    training: defaultRebookRule(7),
  },
};

/**
 * The interval in days, from whatever the UI was showing.
 *
 * Months are 30 days, not calendar months. A facility saying "every 2 months"
 * means "roughly every two months", and a calendar-accurate version would make
 * somebody lapsed a day earlier in February than in March for no reason a
 * groomer could explain.
 */
export function toDays(value: number, unit: "days" | "weeks" | "months") {
  if (unit === "weeks") return value * 7;
  if (unit === "months") return value * 30;
  return value;
}

/** The inverse, for showing a stored day count back in the largest clean unit. */
export function fromDays(days: number): {
  value: number;
  unit: "days" | "weeks" | "months";
} {
  if (days % 30 === 0) return { value: days / 30, unit: "months" };
  if (days % 7 === 0) return { value: days / 7, unit: "weeks" };
  return { value: days, unit: "days" };
}
