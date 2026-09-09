import en from "../../../messages/en.json";
import fr from "../../../messages/fr.json";

import type { AppLocale } from "@/lib/language-settings";

// ============================================================================
// THE NAVIGATION, IN THE READER'S LANGUAGE — ALL THREE OF THEM.
//
// ── WHY THIS EXISTS ───────────────────────────────────────────────────────
//
// Every label in the facility sidebar rendered in English for a French user —
// Calendars, Calling, Inbox, Smart Insights, Daily Care, Payroll, Gift Cards,
// Marketing, Reports — on every screen in the product. Forty-four labels in
// one file, which is a fraction of the work of translating the screens they
// lead to and is the first thing a French-speaking user sees.
//
// Found by rendering a settings section twice, once per locale, and diffing
// the visible text: the settings body came back translated and forty-one
// strings of chrome came back identical.
//
// ── KEYED BY id AND url, WHICH ALREADY EXIST ─────────────────────────────
//
// A section has an `id`, an item has a `url`, and both are already unique and
// already stable — so nothing had to be invented to key on, and renaming an
// English label cannot silently drop its French the way `translateUiText()`
// does by matching on the words.
//
// The catalogue is GENERATED from facility-nav.ts rather than typed by hand.
// The first attempt typed the URLs from the titles and got a third of them
// wrong — "Inbox" is at /messaging, "Smart Insights" at /insights — and every
// one of those keys would have matched nothing, leaving the item in English
// with nothing anywhere to report it.
//
// ── A MISS FALLS BACK TO THE ENGLISH LABEL ───────────────────────────────
//
// Not to the url, and not to empty. A nav item added tomorrow reads as its
// English title until somebody writes the French, which is a visible gap
// rather than a broken one.
//
// ── AND IT COVERS THE CUSTOMER AND SUPER-ADMIN NAVS TOO, 2026-09-10 ──────
//
// It was `facilityNav` until the widened `check:ui-french` put a number on
// the other two: 21 labels in `CustomerSidebar` and 48 in
// `super-admin-sidebar`, all of them English on a French screen, and all of
// them invisible for the same reason — `GenericSidebar` renders
// `{t(item.title)}` where `t` is `useUiText`, an English→French map that
// RETURNS ITS INPUT ON A MISS. So the call site looked identical whether the
// translation existed or not, which is precisely the shape
// `tests/unit/shell-i18n.test.ts` was written to end.
//
// ONE catalogue rather than three, because the key space is already disjoint
// by construction: a customer url starts `/customer`, an admin url
// `/dashboard`, a facility url `/facility`. Section ids are slugged with the
// same prefix for the same reason. Three catalogues would have been three
// places to forget.
// ============================================================================

type NavCatalogue = {
  sections: Record<string, string>;
  items: Record<string, string>;
  /** The phone bar's own short labels — see navBottomBarLabel. */
  bottomBar: Record<string, string>;
};

const CATALOGUE: Record<AppLocale, NavCatalogue> = {
  en: en.nav as NavCatalogue,
  fr: fr.nav as NavCatalogue,
};

function catalogue(locale: AppLocale): NavCatalogue {
  return CATALOGUE[locale] ?? CATALOGUE.en;
}

/** A nav section's heading, by its `id`. */
export function navSectionLabel(
  locale: AppLocale,
  id: string,
  fallback: string,
): string {
  return catalogue(locale).sections[id] ?? fallback;
}

/** A nav item's title, by its `url`. */
export function navItemTitle(
  locale: AppLocale,
  url: string,
  fallback: string,
): string {
  return catalogue(locale).items[url] ?? fallback;
}

/**
 * The phone bar's label for a route.
 *
 * Deliberately NOT the sidebar's label for the same url: the bar is four tabs
 * wide on a 599px screen, and "Calendrier d'occupation" does not fit where
 * "Occupation" does. §5g decides that, and it is the French that decides it.
 */
export function navBottomBarLabel(
  locale: AppLocale,
  url: string,
  fallback: string,
): string {
  return catalogue(locale).bottomBar?.[url] ?? fallback;
}
