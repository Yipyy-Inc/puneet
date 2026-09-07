import { describe, expect, test } from "bun:test";

import en from "../../messages/en.json";
import fr from "../../messages/fr.json";
import { shellText, type ShellGroup } from "../../src/lib/shell/text";

// ============================================================================
// THE SHELL'S OWN COPY, IN BOTH LANGUAGES.
//
// ── WHAT THIS REPLACES ────────────────────────────────────────────────────
//
// Nothing. That is the point.
//
// The account menu was already wrapped in `t(…)` at all twenty-four call
// sites and SIXTEEN of them rendered English, because `t` was
// `translateUiText`, an English→French map that returns its input on a miss.
// A missing translation and a present one are the same observable event, so
// no test could have been written against it that would have failed.
//
// Keying the strings is what makes this file possible at all.
// ============================================================================

type Group = Record<string, string>;

const enShell = en.shell as unknown as Record<string, Group>;
const frShell = fr.shell as unknown as Record<string, Group>;

const GROUPS = Object.keys(enShell) as ShellGroup[];

/**
 * Strings that are legitimately identical in French. §5q: "A pet's name, a
 * breed as the owner typed it, an invoice number and a run number never pass
 * through the locale layer." A product name is the same kind of thing, and so
 * is a word French borrowed whole.
 */
const SAME_IN_BOTH = new Set([
  "header.messages", // Messages / Messages
  "notifications.title", // Notifications / Notifications
  "search.actions", // Actions / Actions
  "primitives.pagination", // Pagination / Pagination
  "primitives.minute", // "Min" is the abbreviation in both
  "primitives.actions", // Actions / Actions
  "support.descriptionLabel", // Description / Description
  // Two of the six tag-colour names are the same word in French. Both are
  // spelled identically and mean the same thing; changing either to make this
  // list shorter would make the French wrong.
  "primitives.tagColourInformation", // Information / Information
  "primitives.tagColourProgramme", // Programme / Programme
]);

describe("the shell namespace", () => {
  test("every group exists in both catalogues", () => {
    expect(Object.keys(frShell).sort()).toEqual(Object.keys(enShell).sort());
  });

  test("every key exists in both catalogues", () => {
    for (const group of GROUPS) {
      expect(Object.keys(frShell[group]).sort(), `group ${group}`).toEqual(
        Object.keys(enShell[group]).sort(),
      );
    }
  });

  test("nothing is left in English on the French side", () => {
    const untranslated: string[] = [];
    for (const group of GROUPS) {
      for (const key of Object.keys(enShell[group])) {
        const id = `${group}.${key}`;
        if (SAME_IN_BOTH.has(id)) continue;
        if (frShell[group][key] === enShell[group][key]) untranslated.push(id);
      }
    }
    expect(untranslated).toEqual([]);
  });

  test("the French carries its accents", () => {
    // Thirty-five strings in ui-translations.ts shipped as "Creer",
    // "Parametres" and "a ete". Unaccented French is not a near miss; it is
    // not the word. Anything here that LOOKS like stripped French is caught
    // before it can become another thirty-five.
    const STRIPPED =
      /\b(?:creer|cree|ete|parametres?|reservations?|resultats?|deconnecter|systeme|etablissements?|donnees?|succes|renouvele|echeance|etoiles?|bientot|reserves?|preferences?|proprietaire|entente|donnee)\b/i;
    const suspect: string[] = [];
    for (const group of GROUPS)
      for (const [key, value] of Object.entries(frShell[group]))
        if (STRIPPED.test(value)) suspect.push(`${group}.${key} = ${value}`);
    expect(suspect).toEqual([]);
  });

  test("a lookup resolves in both languages", () => {
    for (const group of GROUPS) {
      for (const key of Object.keys(enShell[group])) {
        expect(shellText("en", group, key)).toBe(enShell[group][key]);
        expect(shellText("fr", group, key)).toBe(frShell[group][key]);
      }
    }
  });

  test("an unknown key falls back to English, then to itself", () => {
    // English words a person can act on, never `dismissOnboarding`.
    expect(shellText("fr", "banners", "dismiss")).toBe(
      frShell.banners.dismiss as string,
    );
    expect(shellText("fr", "banners", "nope")).toBe("nope");
  });
});
