import type { AppLocale } from "@/lib/language-settings";

// ============================================================================
// A DAY OF THE WEEK, IN THE READER'S LANGUAGE.
//
// The business-hours editor stores its schedule under English keys — `monday`,
// `tuesday` — and for a long time it RENDERED them, through
// `<div className="capitalize">{day}</div>`. In English that produces "Monday"
// and looks finished. In French it produces "Monday".
//
// §5q: always Intl, never a string. The keys stay as they are, because they are
// the settings' shape and not copy; only the rendering is translated.
//
// ── WHY THIS IS ITS OWN FILE, AND TESTED ─────────────────────────────────
//
// The mapping is a lookup from a name to a date, and an off-by-one in the
// reference week does not fail — it renames every day in the product by one,
// silently and plausibly. That is the exact shape the unit tier exists for
// (see the DataTable comparator in AGENTS.md): pure, cheap to isolate, and
// invisible to both static analysis and a browser test.
// ============================================================================

/**
 * A Monday-first reference week. 2024-01-01 was a Monday, and only the weekday
 * is ever read off these dates — the year and month are arbitrary.
 *
 * UTC throughout, paired with `timeZone: "UTC"` below. A local-midnight date
 * formatted in another zone can land on the previous day, which is the other
 * way this returns the wrong name without erroring.
 */
const REFERENCE_WEEK: Record<string, Date> = {
  monday: new Date(Date.UTC(2024, 0, 1)),
  tuesday: new Date(Date.UTC(2024, 0, 2)),
  wednesday: new Date(Date.UTC(2024, 0, 3)),
  thursday: new Date(Date.UTC(2024, 0, 4)),
  friday: new Date(Date.UTC(2024, 0, 5)),
  saturday: new Date(Date.UTC(2024, 0, 6)),
  sunday: new Date(Date.UTC(2024, 0, 7)),
};

/** A formatter for long weekday names in the reader's locale. */
export function weekdayFormatter(locale: AppLocale): Intl.DateTimeFormat {
  return new Intl.DateTimeFormat(locale, { weekday: "long", timeZone: "UTC" });
}

/**
 * The display name for a stored day key.
 *
 * Returns the key unchanged when it names no day — a settings blob holding
 * something unexpected should render what it holds rather than nothing, and a
 * missing name is far easier to see than a blank cell.
 *
 * The casing is whatever the locale's own convention is: "Monday", but
 * "lundi". Forcing a capital on the French is the same hand-formatting this
 * file exists to remove; it only looks harmless in the language that was
 * tested.
 */
export function weekdayName(
  formatter: Intl.DateTimeFormat,
  day: string,
): string {
  const reference = REFERENCE_WEEK[day.toLowerCase()];
  return reference ? formatter.format(reference) : day;
}

/** The stored keys, in the order the week is edited. */
export const WEEKDAY_KEYS = Object.keys(REFERENCE_WEEK);
