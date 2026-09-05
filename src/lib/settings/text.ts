import en from "../../../messages/en.json";
import fr from "../../../messages/fr.json";

import type { AppLocale } from "@/lib/language-settings";
import type { SettingsLeaf } from "@/lib/settings/nav";

// ============================================================================
// SETTINGS LABELS, KEYED — NOT MATCHED ON THE ENGLISH STRING.
//
// ── WHY NOT `useUiText`, WHICH EVERYTHING ELSE USES ──────────────────────
//
// `translateUiText()` is an English→French map that RETURNS ITS INPUT on a
// miss. That is not a small flaw here: it makes a missing translation
// indistinguishable from a present one, so nothing — not a test, not a build,
// not a reader — can tell you which labels are actually translated. Measured
// before this landed: of the settings labels, exactly ONE was.
//
// It also keys on the English words, so renaming a section silently drops its
// French. `hours` is `hours` whatever we call it in English.
//
// ── WHY NOT next-intl EITHER ─────────────────────────────────────────────
//
// The only `NextIntlClientProvider` in the app is inside `AuthCard`, scoped to
// the `auth` namespace. `useTranslations("settings")` in this tree would throw
// for want of a provider — checked, not assumed.
//
// So this reads the same catalogues next-intl does, through the same locale
// the rest of the app uses.
//
// ── A NAME THE FACILITY TYPED IS NOT TRANSLATED ──────────────────────────
//
// The rail and the index synthesise a `custom-<slug>` entry per active custom
// module, labelled with the module's own name. §5q is explicit that a name the
// user typed never passes through the locale layer — so an id with no key
// returns the label untouched. That is the rule, not a fallback.
// ============================================================================

type Catalogue = {
  groups: Record<string, string>;
  leaves: Record<string, string>;
  index: Record<string, string>;
};

const CATALOGUE: Record<AppLocale, Catalogue> = {
  en: en.settings as Catalogue,
  fr: fr.settings as Catalogue,
};

function catalogue(locale: AppLocale): Catalogue {
  return CATALOGUE[locale] ?? CATALOGUE.en;
}

/** A registry leaf's label. A synthesised one keeps the name it was given. */
export function settingsLeafLabel(
  locale: AppLocale,
  leaf: Pick<SettingsLeaf, "id" | "label">,
): string {
  return catalogue(locale).leaves[leaf.id] ?? leaf.label;
}

/** A group heading. Keyed on the English label, which is the registry's id for it. */
export function settingsGroupLabel(locale: AppLocale, label: string): string {
  return catalogue(locale).groups[label] ?? label;
}

/** The index's own strings — title, search placeholder, empty state. */
export function settingsText(
  locale: AppLocale,
  key: keyof Catalogue["index"],
): string {
  return catalogue(locale).index[key] ?? catalogue("en").index[key] ?? key;
}
