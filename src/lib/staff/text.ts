import en from "../../../messages/en.json";
import fr from "../../../messages/fr.json";

import type { AppLocale } from "@/lib/language-settings";

// ============================================================================
// STAFF LABELS, KEYED — the same shape settings uses, for the same reasons.
//
// The staff area was measured at 725 strings across 33 files on 2026-09-08,
// every one of them read in English by a French user. `check:ui-french`
// ratchets that number per file so it can only come down.
//
// ── WHY NOT `useUiText` ──────────────────────────────────────────────────
//
// `translateUiText()` is an English→French map that RETURNS ITS INPUT on a
// miss, so a missing translation is indistinguishable from a present one and
// nothing can tell you which labels are actually translated. It also keys on
// the English words, so renaming a heading silently drops its French.
//
// ── WHY NOT next-intl ────────────────────────────────────────────────────
//
// The only `NextIntlClientProvider` in the app is inside `AuthCard`, scoped to
// the `auth` namespace, so `useTranslations("staff")` would throw here for want
// of a provider. This reads the same catalogues next-intl does, through the
// same locale cookie the rest of the app uses.
//
// ── AREAS, NOT ONE FLAT NAMESPACE ────────────────────────────────────────
//
// 725 strings in one object is a file nobody can review. They are grouped by
// AREA — the screen or feature that owns them — exactly as settings groups by
// section, so a diff touching warnings never collides with one touching
// documents, and a translator sees a screen's worth of copy at a time.
//
// ── A NAME A PERSON TYPED IS NEVER TRANSLATED (§5q) ──────────────────────
//
// Staff names, department names a facility invented, a custom role's title, a
// document's filename. A key that has no entry returns its fallback untouched,
// and that is the rule rather than a safety net.
// ============================================================================

type StaffCatalogue = {
  /** Per-area copy, keyed by area then by string id. */
  areas: Record<string, Record<string, string>>;
};

const CATALOGUE: Record<AppLocale, StaffCatalogue> = {
  en: (en.staff ?? {}) as StaffCatalogue,
  fr: (fr.staff ?? {}) as StaffCatalogue,
};

function catalogue(locale: AppLocale): StaffCatalogue {
  return CATALOGUE[locale] ?? CATALOGUE.en;
}

/**
 * One area's copy.
 *
 * Falls back to English rather than to the key: a missing French string should
 * read as English words, not as `offboardingChecklistTitle`. That is the
 * lesson from `my-notifications`, where six keys shipped as raw identifiers
 * because the source had no English left for a gate to catch.
 */
export function staffText(
  locale: AppLocale,
  area: string,
  key: string,
): string {
  const areas = catalogue(locale).areas ?? {};
  const english = (CATALOGUE.en.areas ?? {})[area] ?? {};
  return areas[area]?.[key] ?? english[key] ?? key;
}
