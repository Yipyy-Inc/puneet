import { z } from "zod";

// ============================================================================
// When a facility may message a customer, and how many at once.
//
// ── WHY THIS IS NOT A REPUTATION SETTING ──────────────────────────────────
//
// It was written for the Reputation Booster, whose spec asks for quiet hours
// and a velocity cap. But nothing about either is specific to review requests:
// a 4 a.m. booking reminder is the same offence as a 4 a.m. review request, and
// the audit that prompted this found exactly that in the shipped screens — an
// SMS logged at 04:00, which the build explained away as a display bug because
// timestamps were rendered in UTC.
//
// So it lives here, at the messaging layer, and `deliver()` and
// `sendDueMessages()` apply it to EVERYTHING that is not transactional. A
// review-request-only version would have been the same code with a smaller
// blast radius of correctness.
//
// ── QUIET HOURS DEFER, THEY NEVER DROP ────────────────────────────────────
//
// This is the only guardrail in the ladder that reschedules. A visit closing at
// 20:40 with a one-hour delay must arrive at 09:00 the next morning, not
// vanish. A dropped message looks identical to a message nobody sent, and the
// facility would never learn the difference.
//
// ── THE DEFAULTS ARE THE LAW, NOT A PREFERENCE ────────────────────────────
//
// 09:00-20:00 local. The TCPA restricts marketing contact to 8 a.m.-9 p.m. in
// the RECIPIENT's local time; the default sits an hour inside that on both
// sides, because the recipient's timezone is inferred from the location's and
// somebody who drives an hour to a good groomer may not share it.
//
// ── AND THEY ARE NOT A CONSENT MECHANISM ──────────────────────────────────
//
// Consent lives in `message_suppressions`, keyed by address, because under
// CASL withdrawal attaches to the electronic address rather than to our row for
// a person (20260827111420). Nothing here weakens that: a suppressed address is
// refused at 11 a.m. exactly as it is at midnight.
// ============================================================================

/** "HH:MM", 24-hour, facility-local. */
const timeOfDay = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use HH:MM, 24-hour");

export const quietHoursSchema = z.object({
  /**
   * Off means "send whenever due". It is off by default because turning it on
   * for a facility that never asked would silently delay their transactional-
   * looking automations, and a facility that has not opened this screen has not
   * told us their customers' hours.
   *
   * Transactional messages bypass it either way — a booking confirmation at
   * 21:30 is the receipt for something the customer just did.
   */
  enabled: z.boolean(),
  start: timeOfDay,
  end: timeOfDay,
});
export type QuietHours = z.infer<typeof quietHoursSchema>;

export const messagingPolicySchema = z.object({
  quietHours: quietHoursSchema,

  /**
   * The most non-transactional messages one location may send in a day, or 0
   * for no limit.
   *
   * Sudden review velocity is what makes a platform's spam filter quietly
   * discard a whole batch — the reviews are collected, and then they are not
   * there. Overflow defers to the next window rather than being dropped, so the
   * cap costs a day and never a customer.
   */
  dailyCap: z.number().int().min(0).max(10_000),

  /**
   * How late a queued message may be before it is abandoned.
   *
   * The direct fix for a reminder that arrived 49 days after its request, and
   * it is general on purpose: a worker outage backs up every workflow step and
   * every automation, not only review nudges. When the queue drains, a message
   * whose moment has passed must be dropped and recorded, not sent. "Your
   * appointment is tomorrow" three days late is worse than silence.
   */
  maxLatenessHours: z.number().int().min(1).max(720),

  /**
   * Whether this facility's SMS campaign is registered.
   *
   * US A2P 10DLC requires campaign registration before a brand may send. This
   * is a fact somebody records after registering, not something the app can
   * detect — and it defaults to `true` because it would otherwise silently stop
   * every existing SMS in the product the moment this domain shipped. Set it
   * false to block SMS for a facility that has not registered.
   */
  smsRegistered: z.boolean(),
});
export type MessagingPolicy = z.infer<typeof messagingPolicySchema>;

/**
 * What a facility that has never opened this screen gets.
 *
 * Quiet hours OFF, because switching it on unasked would delay messages a
 * facility is already relying on. Everything else set to a limit generous
 * enough not to change today's behaviour, so adopting this domain is a no-op
 * until somebody configures it — except `maxLatenessHours`, which is a
 * correctness rule rather than a preference and applies immediately.
 */
export const NO_MESSAGING_POLICY: MessagingPolicy = {
  quietHours: { enabled: false, start: "09:00", end: "20:00" },
  dailyCap: 0,
  maxLatenessHours: 24,
  smsRegistered: true,
};

/** Minutes since local midnight, for comparing against a quiet-hours window. */
export function minutesOfDay(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

/**
 * Whether a facility-local wall-clock time falls inside the quiet window.
 *
 * Handles a window that crosses midnight (22:00-08:00), which is the shape most
 * facilities would actually configure if they thought in terms of "do not wake
 * my customers" rather than "office hours".
 */
export function isQuietAt(policy: QuietHours, minutes: number): boolean {
  if (!policy.enabled) return false;
  const start = minutesOfDay(policy.start);
  const end = minutesOfDay(policy.end);
  // The window is the ALLOWED period; quiet is everything outside it.
  if (start === end) return false;
  return start < end
    ? minutes < start || minutes >= end
    : minutes < start && minutes >= end;
}
