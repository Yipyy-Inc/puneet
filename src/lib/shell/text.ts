import en from "../../../messages/en.json";
import fr from "../../../messages/fr.json";

import type { AppLocale } from "@/lib/language-settings";

// ============================================================================
// THE FACILITY SHELL, IN THE READER'S LANGUAGE.
//
// The header, the account menu, the support drawer and the three banners —
// the chrome that is on screen no matter which of the 266 routes you are on.
//
// ── WHY THIS EXISTS, AND IT IS NOT "NOBODY TRANSLATED IT" ────────────────
//
// The account menu was ALREADY internationalised, or looked it: every one of
// its twenty-four strings sits inside `t("…")`. Sixteen of them rendered
// English anyway.
//
// `t` there is `useUiText`, which is `translateUiText`, which is an
// English→French map that RETURNS ITS INPUT on a miss. So "Payment Method"
// with no French entry renders "Payment Method", identically to a string that
// was translated on purpose. The call site looks correct, the build is green,
// and two thirds of the menu is in the wrong language — with nothing anywhere
// able to tell you which two thirds.
//
// That is not a translation gap. It is a measurement gap, and it is why this
// file is keyed.
//
// ── KEYED, SO A MISS IS VISIBLE ──────────────────────────────────────────
//
// `shellText("account", "paymentMethod")` cannot silently succeed: the key
// either exists in both catalogues or it does not, and
// tests/unit/shell-i18n.test.ts asserts every key in `en` has a `fr` that is
// actually different. Renaming the English copy — which this change does, to
// get sentence case and en-CA spelling (§5q) — cannot drop the French either,
// the way matching on the English words does.
//
// ── FALLS BACK TO ENGLISH, NOT TO THE KEY ────────────────────────────────
//
// A missing French string should read as English words a person can act on,
// not as `dismissOnboarding`. Same rule as settingsSectionText.
// ============================================================================

type ShellCatalogue = {
  header: Record<string, string>;
  account: Record<string, string>;
  notifications: Record<string, string>;
  support: Record<string, string>;
  banners: Record<string, string>;
  search: Record<string, string>;
  primitives: Record<string, string>;
  customer: Record<string, string>;
  employee: Record<string, string>;
  admin: Record<string, string>;
};

/** The groups, one per surface of the app chrome. */
export type ShellGroup = keyof ShellCatalogue;

const CATALOGUE: Record<AppLocale, ShellCatalogue> = {
  en: en.shell as ShellCatalogue,
  fr: fr.shell as ShellCatalogue,
};

function catalogue(locale: AppLocale): ShellCatalogue {
  return CATALOGUE[locale] ?? CATALOGUE.en;
}

/** One string from one surface of the shell. */
export function shellText(
  locale: AppLocale,
  group: ShellGroup,
  key: string,
): string {
  return catalogue(locale)[group]?.[key] ?? CATALOGUE.en[group]?.[key] ?? key;
}
