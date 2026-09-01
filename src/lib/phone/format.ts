/**
 * One normaliser and one display formatter for phone numbers.
 *
 * Before this file the repo had three, and they disagreed:
 *
 *   `normalisePhone`  (lib/messaging/send.ts)      strict, E.164, null on junk
 *   `dialDigits`      (lib/twilio-dialer.ts)       digits only, no validation
 *   `toCallerId`      (api/twilio/dial/route.ts)   digits with a "+" bolted on
 *
 * The third was wrong, not merely different. It did `"+" + digits` for anything
 * with seven or more of them, so a 10-digit North American number came out as
 * `+5145550100` — country code 514, a number in nobody's plan — and the caller
 * ID on an outbound call would have been silently unroutable. `toE164` reads the
 * same input as `+15145550100`.
 *
 * The spec put this in Phase 2. It belongs here: the de-branding sweep edits the
 * same lines, and doing it later would mean touching them twice.
 */

/**
 * A number in E.164, or null if it is not one.
 *
 * Accepts what a human or a card terminal actually types: a bare 10-digit North
 * American number, an 11-digit one starting with 1, or anything already in
 * E.164. Refuses everything else rather than handing a carrier something it will
 * answer with a 400 that reads like an outage.
 *
 * Moved here from lib/messaging/send.ts unchanged — that module still re-exports
 * it under its old name, so no existing caller had to change.
 */
export function toE164(raw: string): string | null {
  const digits = raw.replace(/[^\d+]/g, "");
  const e164 = digits.startsWith("+")
    ? digits
    : digits.length === 10
      ? `+1${digits}`
      : digits.length === 11 && digits.startsWith("1")
        ? `+${digits}`
        : null;
  if (!e164 || !/^\+[1-9]\d{7,14}$/.test(e164)) return null;
  return e164;
}

/** Whether a string can be dialled at all. */
export function isDialable(raw: string): boolean {
  return toE164(raw) !== null;
}

/**
 * A number as a person reads it: `+15145550100` → `+1 (514) 555-0100`.
 *
 * North American numbers get the grouping they are always written with;
 * anything else is returned in E.164, which is what an international number is
 * conventionally shown as anyway. Input that is not a phone number is returned
 * untouched rather than mangled — a screen showing a bad number verbatim is
 * easier to debug than one showing a plausible wrong one.
 */
export function formatNational(raw: string): string {
  const e164 = toE164(raw);
  if (!e164) return raw;

  const nanp = e164.match(/^\+1(\d{3})(\d{3})(\d{4})$/);
  if (!nanp) return e164;

  return `+1 (${nanp[1]}) ${nanp[2]}-${nanp[3]}`;
}
