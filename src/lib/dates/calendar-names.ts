import type { AppLocale } from "@/lib/language-settings";

// ============================================================================
// WEEKDAY AND MONTH NAMES, IN THE READER'S LANGUAGE.
//
// `date-selection-calendar.tsx` carried three hardcoded English arrays —
// ["Su","Mo","Tu",…], ["Sunday",…] and ["January",…] — and rendered them
// directly. A French user booking a stay read "Su Mo Tu We Th Fr Sa" above the
// grid and "January" in the month picker.
//
// §5q: "Always Intl, never a format string." The same rule, and the same fix,
// as lib/settings/weekday.ts already applies to the business-hours editor;
// this one is Sunday-first and index-addressed, because the calendar grid and
// `Date#getDay()` both are.
//
// ── INDEX 0 IS SUNDAY, AND THAT IS LOad-BEARING ──────────────────────────
//
// The caller maps these arrays by index onto `getDay()` and onto the facility
// hours object's own `sunday`…`saturday` keys. Reordering to Monday-first
// would keep rendering plausible names against the wrong days — the failure
// mode weekday.ts's tests exist for. The reference week below starts on a
// Sunday for that reason.
// ============================================================================

/**
 * 2024-01-07 was a Sunday. Only the weekday is read off these dates; the year
 * and month are arbitrary.
 *
 * UTC throughout, paired with `timeZone: "UTC"` in every formatter here. A
 * local-midnight date formatted in another zone can land on the previous day,
 * which is how this returns the wrong name without ever erroring.
 */
const SUNDAY_FIRST_WEEK = Array.from(
  { length: 7 },
  (_, index) => new Date(Date.UTC(2024, 0, 7 + index)),
);

/** One date in each month of a non-leap year, for month names. */
const MONTHS = Array.from(
  { length: 12 },
  (_, index) => new Date(Date.UTC(2023, index, 15)),
);

/**
 * Weekday names, Sunday first, index-addressable by `Date#getDay()`.
 *
 * `"short"` gives "Sun"/"dim." — the two-letter "Su" form the calendar used
 * has no Intl equivalent and no French equivalent worth inventing, so the
 * narrow form is offered instead and reads correctly in both languages.
 */
export function weekdayNames(
  locale: AppLocale,
  format: "narrow" | "short" | "long",
): string[] {
  const formatter = new Intl.DateTimeFormat(locale, {
    weekday: format,
    timeZone: "UTC",
  });
  return SUNDAY_FIRST_WEEK.map((date) => formatter.format(date));
}

/** Month names, January first, index-addressable by `Date#getMonth()`. */
export function monthNames(
  locale: AppLocale,
  format: "short" | "long" = "long",
): string[] {
  const formatter = new Intl.DateTimeFormat(locale, {
    month: format,
    timeZone: "UTC",
  });
  return MONTHS.map((date) => formatter.format(date));
}
