import en from "../../../messages/en.json";
import fr from "../../../messages/fr.json";

import type { AppLocale } from "@/lib/language-settings";

// ============================================================================
// THE CUSTOMER PORTAL'S PAGES, KEYED — the same shape as `lib/staff/text.ts`.
//
// ── WHY THIS EXISTS, 2026-09-10 ──────────────────────────────────────────
//
// The customer portal's CHROME reached zero on `check:ui-french` on
// 2026-09-09 — the sidebar, the header, the booking wizard. The pages it wraps
// were on no surface at all, because a surface derived from a layout never
// reaches the pages the layout wraps. Measured the day they became one: 2,877
// strings in 141 files. The customer dashboard greeted a French customer with
// "Welcome back, Alice!" beside a fully French sidebar.
//
// This is the catalogue those pages convert into. It is not `shell.customer`,
// which is the chrome, and it is not `staff`, which a customer never sees.
//
// ── WHY NOT `useUiText`, WHY NOT next-intl ───────────────────────────────
//
// The reasons in `lib/staff/text.ts` hold here word for word: a map that
// returns its input on a miss cannot tell you what is translated, and the
// only `NextIntlClientProvider` in the app is scoped to `auth`.
//
// ── AREAS, ONE PER SCREEN ────────────────────────────────────────────────
//
// `dashboard`, `bookings`, `pets`… — so a diff touching one screen's copy never
// collides with another's, and a translator reads a screen at a time.
//
// ── A NAME A PERSON TYPED IS NEVER TRANSLATED (§5q) ──────────────────────
//
// A pet's name, a facility's name, a service a facility invented, a breed as
// the owner typed it. Those arrive as VALUES, into `{placeholders}`.
// ============================================================================

type AreaCatalogue = {
  /** Per-area copy, keyed by area then by string id. */
  areas: Record<string, Record<string, string>>;
};

const CATALOGUE: Record<AppLocale, AreaCatalogue> = {
  en: (en.customerPages ?? { areas: {} }) as AreaCatalogue,
  fr: (fr.customerPages ?? { areas: {} }) as AreaCatalogue,
};

/**
 * One area's copy.
 *
 * Falls back to English, then to the key — so a French string that has not
 * been written yet reads as English words, not as `unfinishedBookingsTitle`.
 */
export function customerText(
  locale: AppLocale,
  area: string,
  key: string,
): string {
  const areas = (CATALOGUE[locale] ?? CATALOGUE.en).areas ?? {};
  const english = CATALOGUE.en.areas?.[area] ?? {};
  return areas[area]?.[key] ?? english[key] ?? key;
}
