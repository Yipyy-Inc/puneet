import type { VaccinationRecord } from "@/types/pet";

// ============================================================================
// What a vaccination record means on a given day. Pure, so every screen that
// shows one — the client file, the pet profile, the list filters — agrees.
//
// Dates are compared as `YYYY-MM-DD` strings, never as `Date` objects: an
// expiry is a calendar day, and `new Date("2026-09-11")` is midnight UTC,
// which in Montréal is the evening BEFORE — the screen used to call a
// certificate expired on the last day it was still good.
// ============================================================================

/** How far ahead "expiring soon" looks. */
export const EXPIRING_WITHIN_DAYS = 30;

export type ExpiryState = "none" | "expired" | "expiring" | "current";

/** Today in the viewer's own calendar, as `YYYY-MM-DD`. */
export function localToday(now: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/** `YYYY-MM-DD` plus `days`, in the calendar (no time zone involved). */
export function addDaysIso(day: string, days: number): string {
  const [y, m, d] = day.split("-").map(Number);
  const next = new Date(Date.UTC(y, m - 1, d + days));
  return next.toISOString().slice(0, 10);
}

export function expiryState(
  expiryDate: string | undefined,
  today: string,
  withinDays: number = EXPIRING_WITHIN_DAYS,
): ExpiryState {
  if (!expiryDate) return "none";
  const day = expiryDate.slice(0, 10);
  if (day < today) return "expired";
  if (day <= addDaysIso(today, withinDays)) return "expiring";
  return "current";
}

/**
 * Does a record answer a requirement? The facility names a requirement
 * ("Rabies"); the certificate may say more ("Rabies (3 year)"). Either
 * containing the other counts, case-insensitively — the rule the screens
 * already used, kept so a record does not stop matching on conversion.
 */
export function recordMatchesRule(
  record: Pick<VaccinationRecord, "vaccineName">,
  ruleName: string,
): boolean {
  const a = record.vaccineName.trim().toLowerCase();
  const b = ruleName.trim().toLowerCase();
  if (!a || !b) return false;
  return a.includes(b) || b.includes(a);
}

/**
 * A record that protects the animal today: not rejected, and not past its
 * expiry. A pending record counts — the certificate exists, a person has not
 * looked at it yet — and an exception is the facility saying it counts.
 */
export function isCover(record: VaccinationRecord, today: string): boolean {
  if (record.status === "rejected") return false;
  return expiryState(record.expiryDate, today) !== "expired";
}

/** The required vaccines a pet has no cover for. */
export function missingRequired<
  R extends { vaccineName: string; required: boolean; species: string },
>(
  species: string,
  records: VaccinationRecord[],
  rules: R[],
  today: string,
): R[] {
  const own = rules.filter(
    (r) => r.required && r.species.toLowerCase() === species.toLowerCase(),
  );
  return own.filter(
    (rule) =>
      !records.some(
        (rec) =>
          isCover(rec, today) && recordMatchesRule(rec, rule.vaccineName),
      ),
  );
}
