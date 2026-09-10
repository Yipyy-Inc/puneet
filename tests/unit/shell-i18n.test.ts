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
  "customer.notifications", // Notifications / Notifications
  "booking.service", // Service / Service
  "booking.standard", // Standard / Standard
  // Placeholders and a separator, with no words of its own — identical by
  // construction rather than by oversight.
  "booking.clientAndPets", // {client} · {pets}
  // Two of the six coat types are spelled the same in French. "Long" is the
  // French word too, and a double coat is "double" — changing either to make
  // this list shorter would make the French wrong, which is the same reason
  // the two tag colours below are here.
  "booking.coatLong", // Long / Long
  "booking.coatDouble", // Double / Double
  // The confirmation screen's own borrowings and bare units.
  "booking.client", // Client / Client
  "booking.total", // Total / Total
  "booking.date", // Date / Date
  "booking.minutesShort", // {count} min — "min" is the abbreviation in both
  "booking.methodTerminal", // Terminal / Terminal — the card machine, same word
  "shared.note", // Note / Note
  "shared.priorityInfo", // Info / Info — the abbreviation in both
  "shared.signature", // Signature / Signature
  // Two of the six tag-colour names are the same word in French. Both are
  // spelled identically and mean the same thing; changing either to make this
  // list shorter would make the French wrong.
  "primitives.tagColourInformation", // Information / Information
  "primitives.tagColourProgramme", // Programme / Programme
  // The Messages page: two borrowings, an abbreviation, and two words that
  // are French already.
  "messaging.client", // Client / Client
  "messaging.notes", // Notes / Notes
  "messaging.photo", // Photo / Photo
  "messaging.channelSms", // SMS / SMS — the channel's name in both
  "messaging.tagVip", // VIP / VIP
  // The training rating and level vocabulary: "Excellent" is the French word.
  "training.rating4", // Excellent / Excellent
  "training.level_excellent", // Excellent / Excellent
  // The pre-check-in form: field names French spells the same way.
  "yipyygo.type", // Type / Type
  "yipyygo.allergies", // Allergies / Allergies
  "yipyygo.formInjection", // Injection / Injection
  "yipyygo.service", // Service / Service
  "yipyygo.dates", // Dates / Dates
  "yipyygo.date", // Date / Date
  // The booking wizard's service details.
  "booking.salon", // Salon / Salon — a grooming salon, same word
  "booking.mobile", // Mobile / Mobile — the grooming van, same word
  "booking.pricePerUnit", // {price}/{unit} — placeholders and a slash
  // The points history's column heads: French spells these the same.
  "loyalty.date", // Date / Date
  "loyalty.type", // Type / Type
  "loyalty.description", // Description / Description
  "loyalty.points", // Points / Points
  "loyalty.kindBadge", // Badge / Badge
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

  test("a French string carries every value its English one does", () => {
    // Added 2026-09-10 with the same check on the area catalogues. A French
    // string that drops `{pet}` reads fine and silently loses the value; the
    // shell passed on the day it was added, and this keeps it that way.
    const shape = (s: string) => (s.match(/\{\w+\}/g) ?? []).sort().join();
    const mismatched: string[] = [];
    for (const group of GROUPS)
      for (const [key, value] of Object.entries(enShell[group]))
        if (shape(value) !== shape(frShell[group][key] ?? value))
          mismatched.push(`${group}.${key}`);
    expect(mismatched).toEqual([]);
  });

  test("the French carries its accents", () => {
    // Thirty-five strings in ui-translations.ts shipped as "Creer",
    // "Parametres" and "a ete". Unaccented French is not a near miss; it is
    // not the word. Anything here that LOOKS like stripped French is caught
    // before it can become another thirty-five.
    //
    // "entente" was on this list until 2026-09-10 and is not stripped: it is
    // the correct spelling of "agreement", with no accent to lose, and
    // messages/fr.json already used it nineteen times outside the shell. It
    // fired the first time the shell needed the word ("Entente de pension").
    const STRIPPED =
      /\b(?:creer|cree|ete|parametres?|reservations?|resultats?|deconnecter|systeme|etablissements?|donnees?|succes|renouvele|echeance|etoiles?|bientot|reserves?|preferences?|proprietaire|donnee)\b/i;
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
