import { describe, expect, test } from "bun:test";

import en from "../../messages/en.json";
import fr from "../../messages/fr.json";

// ============================================================================
// A DOT IN A MESSAGE KEY BREAKS THE WHOLE APP, SILENTLY.
//
// next-intl treats "." as its nesting separator and refuses a key containing
// one:
//
//   INVALID_KEY: Namespace keys can not contain the character "." as this is
//   used to express nesting. Please remove it or replace it with another
//   character.
//
// It throws from `getLocale()` in the ROOT LAYOUT — src/app/layout.tsx — so it
// is not a lint problem confined to one screen.
//
// ── HOW 277 OF THEM GOT IN ────────────────────────────────────────────────
//
// The French conversion needed compound keys: a task type and the fields it
// collects (`field.banking.iban`), a calendar status (`calStatus.Confirmed`),
// 168 permissions and 19 groups (`perm.view_client_address`). A dot read
// nicely and nothing said otherwise.
//
// Nothing said otherwise for four commits. `typecheck`, `lint`, `format`,
// `test:unit`, `check:ui-french`, the SQL tests and the 29-spec gate were all
// green; the parity checker compared the two catalogues to each other, which
// agreed perfectly because both were wrong the same way; and the French e2e
// spec passed because every assertion in it tests for an ABSENCE — an empty
// panel contains no English, no raw key and no unfilled placeholder.
//
// It was found by opening the page and seeing that the roles studio was gone.
//
// ── SO THE RULE IS MECHANICAL NOW ────────────────────────────────────────
//
// One dot anywhere in either catalogue fails the build in under a second,
// which is what should have happened the first time.
// ============================================================================

type Node = { [key: string]: unknown };

function dottedKeys(node: unknown, trail: string, out: string[]): void {
  if (!node || typeof node !== "object" || Array.isArray(node)) return;
  for (const [key, value] of Object.entries(node as Node)) {
    const here = trail ? `${trail}.${key}` : key;
    if (key.includes(".")) out.push(here);
    dottedKeys(value, here, out);
  }
}

describe("the message catalogues", () => {
  test("no key contains a dot — next-intl reads one as nesting", () => {
    for (const [locale, catalogue] of [
      ["en", en],
      ["fr", fr],
    ] as const) {
      const found: string[] = [];
      dottedKeys(catalogue, "", found);
      expect(found, `${locale}.json`).toEqual([]);
    }
  });
});
