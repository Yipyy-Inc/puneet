import en from "../../../messages/en.json";
import fr from "../../../messages/fr.json";

import type { AppLocale } from "@/lib/language-settings";

// ============================================================================
// TWO CATALOGUES THAT WERE ALREADY TRANSLATED, AND READ BY NOTHING.
//
// `messages.serviceTypes` ("Garderie", "Pension", "Toilettage") and
// `messages.status` ("En attente", "Confirmé", "Annulé") have carried correct
// French since before the redesign. Nothing rendered them: the one
// `NextIntlClientProvider` in the app is scoped to the `auth` namespace, so
// `useTranslations("status")` would throw anywhere else. Meanwhile screens
// printed `{booking.service}` and `{booking.status}` raw — "grooming",
// "pending" — with CSS `capitalize` making the English look deliberate.
//
// These read the same JSON next-intl would, by the enum value the record
// already carries, so nothing had to be invented to key on.
//
// ── A MISS IS HUMANISED, NOT RETURNED RAW ────────────────────────────────
//
// A facility's CUSTOM service ("Yoda's Splash") and a status added tomorrow
// ("request_submitted") have no entry. The custom service is a name the
// facility typed and §5q keeps it out of the locale layer, so it comes back
// as typed. An unknown enum comes back with its underscores turned to spaces
// and a capital — English words, a visible gap, never `request_submitted`.
// ============================================================================

type Catalogue = Record<string, string>;

const SERVICE: Record<AppLocale, Catalogue> = {
  en: en.serviceTypes as Catalogue,
  fr: fr.serviceTypes as Catalogue,
};

const STATUS: Record<AppLocale, Catalogue> = {
  en: en.status as Catalogue,
  fr: fr.status as Catalogue,
};

function humanise(value: string): string {
  const spaced = value.replace(/[_-]+/g, " ").trim();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

/** A service by its id — `grooming` → "Grooming" · "Toilettage". */
export function serviceTypeLabel(locale: AppLocale, service: string): string {
  const id = service.trim().toLowerCase();
  // Not in the catalogue: a service the facility named itself. Returned as
  // typed — §5q — rather than humanised, because "Yoda's Splash" is already
  // the facility's own spelling.
  return SERVICE[locale]?.[id] ?? SERVICE.en[id] ?? service;
}

/**
 * A record's status by its enum — `pending` → "Pending" · "En attente".
 *
 * `fallback` is for a caller that already HAS an English word for this id and
 * only wants the translation — `StatusBadge`, whose chip table carries 56
 * labels deliberately sentence-cased against §3/§5r. Without it, an id the
 * catalogue does not know would come back `humanise`d, quietly replacing
 * "No-show" with "No show" and "Out of stock" with "Out of stock" on 15
 * screens. Passing the caller's own label keeps every current English string
 * exactly as it is and adds French only where the catalogue has it.
 */
export function statusLabel(
  locale: AppLocale,
  status: string,
  fallback?: string,
): string {
  const id = status.trim().toLowerCase();
  return STATUS[locale]?.[id] ?? fallback ?? STATUS.en[id] ?? humanise(id);
}
