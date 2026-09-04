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

function asDate(value: Date | string | number): Date {
  return value instanceof Date ? value : new Date(value);
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
  return dateFmt(locale, "long", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(asDate(value));
}

/** `Sep 1` · `1 sept.` — for a column where the year is obvious. */
export function formatDateShort(
  value: Date | string | number,
  locale: AppLocale,
): string {
  return dateFmt(locale, "short", { month: "short", day: "numeric" }).format(
    asDate(value),
  );
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
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
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
  const out = dateFmt(locale, "time", {
    hour: "numeric",
    minute: "2-digit",
  }).format(asDate(value));
  if (locale === "fr") return out;
  return out.replace(/\ba\.m\./i, "AM").replace(/\bp\.m\./i, "PM");
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
  const diffMs = then.getTime() - now.getTime();
  const absMin = Math.abs(diffMs) / 60000;

  if (absMin >= 24 * 60) return formatDateShort(then, locale);

  const rtf = new Intl.RelativeTimeFormat(TAG[locale], { numeric: "auto" });
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
