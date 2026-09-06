import en from "../../../messages/en.json";
import fr from "../../../messages/fr.json";

import type { AppLocale } from "@/lib/language-settings";

// ============================================================================
// THE BUILT-IN SERVICE TYPES, IN THE READER'S LANGUAGE.
//
// ── THE INCONSISTENCY THIS RESOLVES ───────────────────────────────────────
//
// The settings rail said "Toilettage" and "Dressage". The service chips two
// clicks later, inside the very screens that rail leads to, said "Grooming"
// and "Training" — the same five concepts, translated in one place and not the
// other. A screen that disagrees with its own navigation is worse than one
// that is honestly English throughout.
//
// ── WHY THESE ARE TRANSLATED AND A CUSTOM MODULE IS NOT ──────────────────
//
// §5q: a name the user typed never passes through the locale layer. These five
// are not that. `daycare`, `boarding`, `grooming`, `training` and `evaluation`
// are the platform's own categories with stable ids, the same ids the settings
// registry keys its leaves by — they are interface, not data.
//
// A custom service module IS data: the facility named it, and it keeps that
// name. That is handled by falling back to the label the caller already has,
// rather than by trying to enumerate ids that do not exist yet.
// ============================================================================

const CATALOGUE: Record<AppLocale, Record<string, string>> = {
  en: en.serviceTypes as Record<string, string>,
  fr: fr.serviceTypes as Record<string, string>,
};

/**
 * A built-in service type's name.
 *
 * Anything unknown — a custom module's slug — returns the label it was given.
 */
export function serviceTypeLabel(
  locale: AppLocale,
  id: string,
  fallback: string,
): string {
  const table = CATALOGUE[locale] ?? CATALOGUE.en;
  return table[id.toLowerCase()] ?? fallback;
}
