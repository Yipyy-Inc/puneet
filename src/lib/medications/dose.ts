import { formatDecimal, isPluralOne } from "@/lib/i18n/format";
import type { AppLocale } from "@/lib/language-settings";
import {
  DOSE,
  type MedPageForm,
  type MedUnit,
} from "@/lib/medications/vocabulary";

// ============================================================================
// One dose, in words: "1½ tablets", "½ chew", "2.5 ml", "2 sprays".
// ============================================================================

/** A string from the booking form's catalogue, by key. */
export type Translate = (key: string) => string;

/** `{name}` placeholders filled, the way the catalogue's strings are written. */
export function fill(
  template: string,
  values: Record<string, string | number>,
): string {
  return template.replace(/\{(\w+)\}/g, (whole, key: string) =>
    key in values ? String(values[key]) : whole,
  );
}

const GLYPHS: Record<string, string> = { "0.25": "¼", "0.5": "½", "0.75": "¾" };
const GLYPH_VALUES: Record<string, number> = { "¼": 0.25, "½": 0.5, "¾": 0.75 };

export const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * `1½`, `½`, `2`, `0.25`/`0,25`. A form counted in whole things shows its
 * quarters and halves as the glyphs a label uses; a measured one is a decimal
 * in the reader's own notation.
 */
export function formatAmount(
  amount: number,
  fraction: boolean,
  locale: AppLocale,
): string {
  if (fraction) {
    const whole = Math.floor(amount);
    const part = round2(amount - whole);
    const glyph = GLYPHS[String(part)];
    if (glyph) return `${whole > 0 ? whole : ""}${glyph}`;
  }
  return formatDecimal(amount, locale, 2);
}

/**
 * Whether `amount` takes the singular. In English the design says "½ tablet"
 * and "1½ tablets", so anything up to one is singular. French has its own
 * rule — singular below two, "1,5 comprimé" — and `Intl` knows it.
 */
export function takesSingular(amount: number, locale: AppLocale): boolean {
  return locale === "fr" ? isPluralOne(amount, "fr") : amount <= 1;
}

const UNIT_KEY: Record<Exclude<MedUnit, "custom">, string> = {
  tablet: "Tablet",
  capsule: "Capsule",
  chew: "Chew",
  ml: "Ml",
  scoop: "Scoop",
  packet: "Packet",
  tsp: "Tsp",
  pump: "Pump",
  application: "Application",
  patch: "Patch",
  drop: "Drop",
  units: "Units",
};

/** The word for a unit, singular or plural as `amount` needs. */
export function unitWord(
  t: Translate,
  unit: MedUnit,
  amount: number,
  locale: AppLocale,
  customUnit?: string,
): string {
  const one = takesSingular(amount, locale);
  if (unit === "custom") {
    const typed = customUnit?.trim();
    if (!typed) return t(one ? "medsUnitDoseOne" : "medsUnitDoseOther");
    // The facility's or the owner's own word, made plural the regular way.
    return one || /[sxz]$/i.test(typed) ? typed : `${typed}s`;
  }
  return t(`medsUnit${UNIT_KEY[unit]}${one ? "One" : "Other"}`);
}

/** The unit as an option in the unit choice: "scoop", "packet", "tsp". */
export function unitOption(t: Translate, unit: MedUnit): string {
  return unit === "custom" ? "" : t(`medsUnit${UNIT_KEY[unit]}One`);
}

/** "1½ tablets". */
export function doseWords(
  t: Translate,
  dose: {
    form: MedPageForm;
    amount: number;
    unit: MedUnit;
    customUnit?: string;
  },
  locale: AppLocale,
): string {
  const { fraction } = DOSE[dose.form];
  return `${formatAmount(dose.amount, fraction, locale)} ${unitWord(
    t,
    dose.unit,
    dose.amount,
    locale,
    dose.customUnit,
  )}`;
}

/** − : one step down, never below one step. */
export function stepDown(amount: number, step: number): number {
  return Math.max(step, round2(amount - step));
}

/** + : one step up. */
export function stepUp(amount: number, step: number): number {
  return round2(amount + step);
}

/** A half or a quarter: the amount is not whole. */
export function isFractional(amount: number): boolean {
  return round2(amount % 1) !== 0;
}

/**
 * A dose amount read from words a person typed: "1", "1.5", "1,5", "½",
 * "1½", "1/2", "1 1/2". Nothing readable is `undefined`, not a guess.
 */
export function parseAmount(text: string | undefined): number | undefined {
  if (!text) return undefined;
  const s = text.trim();
  let m = /^(\d+)?\s*([¼½¾])/.exec(s);
  if (m) return (m[1] ? Number(m[1]) : 0) + GLYPH_VALUES[m[2]];
  m = /^(\d+)\s+(\d+)\/(\d+)/.exec(s);
  if (m && Number(m[3]) > 0) {
    return round2(Number(m[1]) + Number(m[2]) / Number(m[3]));
  }
  m = /^(\d+)\/(\d+)/.exec(s);
  if (m && Number(m[2]) > 0) return round2(Number(m[1]) / Number(m[2]));
  m = /^(\d+(?:[.,]\d+)?)/.exec(s);
  if (m) {
    const n = Number(m[1].replace(",", "."));
    return n > 0 ? n : undefined;
  }
  return undefined;
}
