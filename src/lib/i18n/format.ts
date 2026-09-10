import type { AppLocale } from "@/lib/language-settings";

// ============================================================================
// Canada, bilingual. docs/design-system/design-system.md §5q, §6 rule 8.
//
// ── THE WHOLE TABLE FALLS OUT OF `Intl`, IF YOU PASS IT THE REAL LOCALE ───
//
// §5q's formatting table is not a set of rules to implement — it is what
// `Intl` already produces for `fr-CA` and `en-CA`. Verified against this
// repo's own Node before a line of this file was written:
//
//   fr-CA time        "14 h 30"           <- spaces around the h, exactly
//   fr-CA currency    "42,50 $"      <- a REAL non-breaking space
//   fr-CA percent     "82 %"
//   fr-CA thousands   "1 240"
//   fr-CA long date   "mar. 1 sept. 2026"
//   en-CA long date   "Tue, Sep 1, 2026"
//
// Every one matches §5q's table character for character, including the
// U+00A0 the section insists on ("a plain space lets 42,50 $ wrap so the
// dollar sign lands alone on the next line").
//
// So the defect this file exists to fix is not that French formatting is
// hard. It is that 456 call sites pass the literal string "en-US", which
// gives a French user American formatting whatever they chose — and that a
// hand-rolled template gets it wrong "in ways nobody on an English team will
// notice".
//
// ── THE APP'S LOCALE IS "en" | "fr"; Intl NEEDS THE COUNTRY ──────────────
//
// `en` alone is American-leaning and `fr` alone is France, which shares the
// 24-hour clock but not the currency or the date order. Canada is the
// product, so the tags are pinned here once rather than at 456 call sites
// that would each get to guess.
//
// ── WHERE MONEY WAS WRONG BEFORE THIS ────────────────────────────────────
//
// `src/lib/format.ts` builds every figure with `currency: "USD"` on `en-US`.
// This is a Canadian product taking Canadian dollars through Clover. In
// English the two render identically — `$42.50` — which is exactly why it
// survived; in French the right answer is `42,50 $` and the wrong one is
// `42,50 $US`.
// ============================================================================

const TAG: Record<AppLocale, string> = { en: "en-CA", fr: "fr-CA" };

/** The one currency this product takes. */
const CURRENCY = "CAD";

/**
 * `Intl` formatters are expensive to construct and cheap to reuse, and these
 * run per cell on tables of 200 rows. Keyed by locale plus shape.
 */
const cache = new Map<string, Intl.DateTimeFormat | Intl.NumberFormat>();

function dateFmt(
  locale: AppLocale,
  key: string,
  options: Intl.DateTimeFormatOptions,
): Intl.DateTimeFormat {
  const id = `d:${locale}:${key}`;
  let f = cache.get(id) as Intl.DateTimeFormat | undefined;
  if (!f) {
    f = new Intl.DateTimeFormat(TAG[locale], options);
    cache.set(id, f);
  }
  return f;
}

function numFmt(
  locale: AppLocale,
  key: string,
  options: Intl.NumberFormatOptions,
): Intl.NumberFormat {
  const id = `n:${locale}:${key}`;
  let f = cache.get(id) as Intl.NumberFormat | undefined;
  if (!f) {
    f = new Intl.NumberFormat(TAG[locale], options);
    cache.set(id, f);
  }
  return f;
}

/**
 * A bare `YYYY-MM-DD` is a CALENDAR DAY, and is read at local midnight.
 *
 * `new Date("2026-09-10")` is UTC midnight — the evening of the 9th anywhere
 * in Canada — so every formatter here showed a booking, a purchase or an
 * expiry one day early for a date stored without a time. Found in three
 * separate files in one afternoon of the French conversion, each with its own
 * local fix; this is the one fix. A full timestamp is an instant and is left
 * to `new Date`.
 */
function asDate(value: Date | string | number): Date {
  if (value instanceof Date) return value;
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [y, m, d] = value.split("-").map(Number);
    return new Date(y, m - 1, d);
  }
  return new Date(value);
}

/**
 * What an unparseable date renders as.
 *
 * The em dash, which 167 files in this repo already use for a value that is
 * not there. Locale-neutral, so it needs no entry in either catalogue.
 */
const NO_DATE = "—";

/**
 * `true` when `Intl` will THROW on this value rather than format it.
 *
 * ── WHY THIS EXISTS, MEASURED 2026-09-08 ─────────────────────────────────
 *
 * `Intl.DateTimeFormat.format()` and `Intl.RelativeTimeFormat.format()` both
 * raise `RangeError` on a non-finite input — they do not return "Invalid
 * Date", they throw — and a throw inside render takes out the nearest error
 * boundary. So the whole staff directory rendered as "We couldn't load your
 * board" the moment one profile had no last-active timestamp.
 *
 * And one always does: `mappers/staff.ts` maps `row.last_active ?? ""`, so a
 * staff member who has never signed in arrives as an empty string while the
 * type still says `lastActive: string`. The type is not lying about the shape,
 * only about the meaning — an empty string IS the null here.
 *
 * The formatter this replaced degraded instead of throwing, which is the only
 * reason the blank rows were survivable before. Losing that on the way to
 * correct French would have traded a cosmetic defect for an outage, so the
 * guard is not defensive padding: it is the behaviour being kept.
 */
function unformattable(d: Date): boolean {
  return Number.isNaN(d.getTime());
}

// ── DATES ──────────────────────────────────────────────────────────────────

/**
 * `Tue, Sep 1, 2026` · `mar. 1 sept. 2026`.
 *
 * §6 rule 8 bans the numeric alternative outright: "Never a numeric MM/DD or
 * DD/MM date. Canada reads all three orders and this is a boarding product,
 * where the wrong month is a dog in the wrong week."
 */
export function formatDateLong(
  value: Date | string | number,
  locale: AppLocale,
): string {
  const d = asDate(value);
  if (unformattable(d)) return NO_DATE;
  return dateFmt(locale, "long", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(d);
}

/** `Sep 1` · `1 sept.` — for a column where the year is obvious. */
export function formatDateShort(
  value: Date | string | number,
  locale: AppLocale,
): string {
  const d = asDate(value);
  if (unformattable(d)) return NO_DATE;
  return dateFmt(locale, "short", { month: "short", day: "numeric" }).format(d);
}

/**
 * `2026-09-01`, in both locales.
 *
 * The ONE numeric form rule 8 allows, because ISO reads the same in every
 * order. Built by hand rather than through `Intl` because it is not a
 * localised string at all — it is a standard, and it must not drift with the
 * locale.
 */
export function formatDateISO(value: Date | string | number): string {
  const d = asDate(value);
  if (unformattable(d)) return NO_DATE;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/**
 * `Sun`…`Sat` · `dim.`…`sam.` — a weekday from its index, 0 = Sunday.
 *
 * EIGHT files in this repo carry their own `["Sun", "Mon", …]`, and every one
 * of them is English on a French screen. §5q's rule is flat — "Always `Intl`,
 * never a format string" — and a hardcoded array of day names is a format
 * string with extra steps. The other seven are outside the surfaces measured
 * so far and are recorded in the debt map; this exists so the fix is a call,
 * not a ninth array.
 *
 * The reference week is pinned in UTC and read back in UTC. `new Date(2024, 0,
 * 7 + i)` builds a LOCAL midnight, and formatting that in a negative-offset
 * zone lands on the previous day — the same off-by-one that made
 * `formatDateISO(0)` return 1969-12-31 in a unit test earlier this week.
 */
export function formatWeekday(
  index: number,
  locale: AppLocale,
  style: "short" | "long" | "narrow" = "short",
): string {
  if (!Number.isInteger(index) || index < 0 || index > 6) return NO_DATE;
  // 2024-01-07 was a Sunday.
  const d = new Date(Date.UTC(2024, 0, 7 + index));
  return dateFmt(locale, `wd-${style}`, {
    weekday: style,
    timeZone: "UTC",
  }).format(d);
}

// ── TIME ───────────────────────────────────────────────────────────────────

/**
 * `2:30 PM` · `14 h 30`.
 *
 * §5q: "French time is 14 h 30. Spaces around the h. Not 14:30, not 14h30.
 * This is the single most common French-Canadian formatting error in
 * software." `Intl` gets it right on its own — the French branch is
 * untouched.
 *
 * The ENGLISH branch is touched, once: `Intl` renders `en-CA` as `2:30 p.m.`
 * and §5q's table says `2:30 PM`. That is the only place this file edits
 * `Intl`'s output, it is casing rather than structure, and it lives here so
 * there is exactly one of it rather than one per call site.
 */
export function formatTime(
  value: Date | string | number,
  locale: AppLocale,
): string {
  const d = asDate(value);
  if (unformattable(d)) return NO_DATE;
  const out = dateFmt(locale, "time", {
    hour: "numeric",
    minute: "2-digit",
  }).format(d);
  if (locale === "fr") return out;
  return out.replace(/\ba\.m\./i, "AM").replace(/\bp\.m\./i, "PM");
}

/**
 * `9:00 AM` · `09 h 00` — from an "HH:MM" FIELD, with no date around it.
 *
 * Opening hours, a feeding time, a dose time and an arrival window are all
 * stored as two numbers and a colon. Every call site that wanted to show one
 * reached for `new Date(\`2000-01-01T${t}\`)` and then a format string, and
 * both halves were wrong: the constructed date is a LOCAL midnight, so the
 * hour it reports moves with the machine's zone, and a format string renders
 * `14:30` where §5q wants `14 h 30`.
 *
 * So: parse the two fields here, pin them to UTC, and read them back in UTC.
 * The date is scaffolding `Intl` needs and nothing else — it never reaches a
 * caller, and no zone can shift it.
 *
 * An unparseable value comes back UNCHANGED rather than as `—`. A time field
 * is often a half-typed `9:` on its way to `9:30`, and blanking what someone
 * is in the middle of typing is worse than showing it back to them.
 */
export function formatTimeOfDay(value: string, locale: AppLocale): string {
  const m = /^\s*(\d{1,2}):(\d{2})/.exec(value ?? "");
  if (!m) return value;
  const hour = Number(m[1]);
  const minute = Number(m[2]);
  if (hour > 23 || minute > 59) return value;
  const d = new Date(Date.UTC(2000, 0, 1, hour, minute));
  const out = dateFmt(locale, "tod", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: "UTC",
  }).format(d);
  if (locale === "fr") return out;
  return out.replace(/\ba\.m\./i, "AM").replace(/\bp\.m\./i, "PM");
}

/**
 * `Buddy, Whiskers and Max` · `Buddy, Whiskers et Max` — a list of names.
 *
 * The customer dashboard joined a household's pets with ` & `, which is an
 * English habit on a French screen. `Intl.ListFormat` knows the conjunction
 * and the comma rules for both locales. The NAMES pass through untouched —
 * §5q keeps a pet's name out of the locale layer; only the glue is localised.
 */
export function formatList(
  items: string[],
  locale: AppLocale,
  /** "disjunction" for "Buddy or Max" · "Buddy ou Max". */
  type: "conjunction" | "disjunction" = "conjunction",
): string {
  return new Intl.ListFormat(TAG[locale], { type }).format(items);
}

// ── MONEY, NUMBERS, PERCENT ────────────────────────────────────────────────

/** `$42.50` · `42,50 $` — Canadian dollars, with the French NBSP. */
export function formatMoney(
  value: number | null | undefined,
  locale: AppLocale,
  options?: { whole?: boolean },
): string {
  const digits = options?.whole ? 0 : 2;
  return numFmt(locale, `cur${digits}`, {
    style: "currency",
    currency: CURRENCY,
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(Number(value ?? 0));
}

/** `1,240` · `1 240`. */
export function formatNumber(
  value: number | null | undefined,
  locale: AppLocale,
  digits = 0,
): string {
  return numFmt(locale, `num${digits}`, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(Number(value ?? 0));
}

/**
 * `82%` · `82 %`.
 *
 * Takes the already-scaled figure (82, not 0.82) because that is what every
 * caller in this repo holds, and divides internally — `Intl`'s percent style
 * is what puts the NBSP in for French.
 */
export function formatPercent(
  value: number | null | undefined,
  locale: AppLocale,
  digits = 0,
): string {
  return numFmt(locale, `pct${digits}`, {
    style: "percent",
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(Number(value ?? 0) / 100);
}

// ── THE ONES Intl DOES NOT KNOW ────────────────────────────────────────────

/**
 * `12.4 kg (28 lb)` · `12,4 kg (28 lb)`.
 *
 * §5q: "Metric leads, imperial follows. Canadian vet records are metric,
 * Canadian owners speak imperial. One decimal below 20 kg, whole numbers
 * above." Both halves are always shown — a single unit is the version that
 * gets a dog the wrong dose.
 */
export function formatWeight(kg: number, locale: AppLocale): string {
  const decimals = kg < 20 ? 1 : 0;
  const lb = Math.round(kg * 2.20462);
  return `${formatNumber(kg, locale, decimals)} kg (${formatNumber(lb, locale, 0)} lb)`;
}

/**
 * `11.3 kg (25 lb)` — for a weight STORED IN POUNDS, which `pets.weight` is.
 *
 * ── WHY THIS EXISTS, AND THE MISTAKE IT CORRECTS ─────────────────────────
 *
 * `pets.weight` is pounds. The code that charges money says so —
 * `pricing-rules.ts` converts it with `/ 2.20462` before comparing against a
 * rule's kilograms — and so do the grooming tiers (`maxWeightLbs`), the size
 * bands in `pet-size.ts` (20 / 40 / 80) and the add-pet form that writes it.
 *
 * On 2026-09-09 and 2026-09-10 four screens were changed to pass it to
 * `formatWeight`, which takes KILOGRAMS, on the strength of one seed value
 * that "only made sense" in kilograms. A 50 lb dog read "50 kg (110 lb)" —
 * the wrong number, on the field a dose is worked out from. This is the
 * formatter those screens should have called.
 *
 * The pounds are shown exactly as entered, not round-tripped through
 * kilograms; the kilograms are derived. §5q still wants metric first.
 */
export function formatWeightFromLb(lb: number, locale: AppLocale): string {
  const kg = lb / 2.20462;
  const decimals = kg < 20 ? 1 : 0;
  const lbDigits = Number.isInteger(lb) ? 0 : 1;
  return `${formatNumber(kg, locale, decimals)} kg (${formatNumber(lb, locale, lbDigits)} lb)`;
}

/** `1h 30m` · `1 h 30`. */
export function formatDuration(minutes: number, locale: AppLocale): string {
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  if (locale === "fr") {
    // The same `14 h 30` shape §5q insists on for the clock.
    if (h === 0) return `${m} min`;
    return m === 0 ? `${h} h` : `${h} h ${String(m).padStart(2, "0")}`;
  }
  if (h === 0) return `${m}m`;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

/**
 * `in 20 min` · `il y a 2 h` — and the DATE past 24 hours.
 *
 * §5q: "Relative time expires at 24 hours. 'in 20 min' and 'il y a 2 h' are
 * useful; '3 days ago' for a booking is not — past a day, show the date."
 * That expiry is the point of the function, so it is not optional and not a
 * flag.
 */
export function formatRelative(
  value: Date | string | number,
  locale: AppLocale,
  now: Date = new Date(),
): string {
  const then = asDate(value);
  if (unformattable(then)) return NO_DATE;
  const diffMs = then.getTime() - now.getTime();
  const absMin = Math.abs(diffMs) / 60000;

  if (absMin >= 24 * 60) return formatDateShort(then, locale);

  const rtf = new Intl.RelativeTimeFormat(TAG[locale], { numeric: "auto" });
  // Under 30 seconds the minute rounds to 0, and `numeric: "auto"` renders
  // a 0-minute as "this minute" / "cette minute-ci". A 0-SECOND is "now" /
  // "maintenant", which is what a person says.
  if (Math.round(absMin) === 0) return rtf.format(0, "second");
  if (absMin < 60) return rtf.format(Math.round(diffMs / 60000), "minute");
  return rtf.format(Math.round(diffMs / 3600000), "hour");
}

/**
 * `today` · `tomorrow` · `Sep 12` — a calendar DAY, relative only while it is
 * one of three words.
 *
 * For a value that is a date and not a moment: a homework's next due day, the
 * day a session happened, the day a report card went out. `formatRelative`
 * measures hours; this measures calendar days, so a session at 23:00 last
 * night is "yesterday" and not "il y a 9 h".
 *
 * Found as THREE copies of the same hand-rolled function in the customer
 * training page, each with its own English — "Today", "in 3d", "2w ago",
 * "1mo ago" — and each past §5q's 24-hour line. Here the relative words stop
 * at yesterday and tomorrow and a date takes over, in both directions.
 *
 * `start` capitalises the first letter, for a value that opens a label on its
 * own; mid-sentence ("Due tomorrow") it stays lower case, as French and
 * English both want.
 */
export function formatDayRelative(
  value: string,
  locale: AppLocale,
  todayISO: string,
  position: "inline" | "start" = "inline",
): string {
  const day = (iso: string) => {
    const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
    return { utc: Date.UTC(y, m - 1, d), local: new Date(y, m - 1, d) };
  };
  const target = day(value);
  if (Number.isNaN(target.utc)) return NO_DATE;
  const days = Math.round((target.utc - day(todayISO).utc) / 86_400_000);

  const out =
    Math.abs(days) <= 1
      ? new Intl.RelativeTimeFormat(TAG[locale], { numeric: "auto" }).format(
          days,
          "day",
        )
      : formatDateShort(target.local, locale);
  return position === "start"
    ? out.charAt(0).toLocaleUpperCase(TAG[locale]) + out.slice(1)
    : out;
}

/**
 * `5 mins ago` · `il y a 5 min` — `formatRelative` for a column with no room.
 *
 * The same 24-hour expiry, the same `Intl`, only the short unit. It exists
 * because the inbox row's time sits in a 10px column beside the client's
 * name, and the hand-rolled clock it replaced (`5m`, `3h`, `2d`) was the
 * eighth one found in this conversion — English units, and a "2d" that §5q
 * says should have been a date.
 */
export function formatRelativeShort(
  value: Date | string | number,
  locale: AppLocale,
  now: Date = new Date(),
): string {
  const then = asDate(value);
  if (unformattable(then)) return NO_DATE;
  const diffMs = then.getTime() - now.getTime();
  const absMin = Math.abs(diffMs) / 60000;

  if (absMin >= 24 * 60) return formatDateShort(then, locale);

  // "short", not "narrow": narrow French is "-5 min", a minus sign where a
  // reader expects "il y a".
  const rtf = new Intl.RelativeTimeFormat(TAG[locale], {
    numeric: "auto",
    style: "short",
  });
  if (Math.round(absMin) === 0) return rtf.format(0, "second");
  if (absMin < 60) return rtf.format(Math.round(diffMs / 60000), "minute");
  return rtf.format(Math.round(diffMs / 3600000), "hour");
}

/**
 * `(416) 555-0142` · `416 555-0142`.
 *
 * Not an `Intl` job — there is no phone formatter — and the two locales
 * genuinely differ in §5q's table. Anything that is not ten digits comes back
 * untouched rather than mangled: an extension, a short code and an
 * international number are all real, and a formatter that "fixes" them
 * destroys information.
 */
export function formatPhone(raw: string, locale: AppLocale): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.length !== 10) return raw;
  const a = digits.slice(0, 3);
  const b = digits.slice(3, 6);
  const c = digits.slice(6);
  return locale === "fr" ? `${a} ${b}-${c}` : `(${a}) ${b}-${c}`;
}
