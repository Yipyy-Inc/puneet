import { test, expect, type Page } from "@playwright/test";
import { mkdirSync } from "node:fs";

import { ACCOUNTS, signIn } from "../e2e/_auth";

// ============================================================================
// PHOTOGRAPH THE ROOM-TYPE RULE EDITOR — IT OFFERS THE FACILITY'S CLASSES.
//
// It offered four hard-coded types, `standard`, `deluxe`, `vip` and
// `cat-suite`, none of which is a class any real facility has: a rule written
// with them never matched, or — for `cat-suite`, which is also the id of the
// demo facility's plain "Suite" — matched the wrong class. It lists the
// facility's own boarding classes now.
//
// READ-ONLY: the editor is opened and closed with Escape; nothing is saved.
//
// WHAT TO LOOK FOR IN THE FILES:
//   · the demo facility's four classes, by name, and none of the old four
//   · long French labels wrap inside their half of the grid at 599px
//
//   E2E_BASE_URL=http://localhost:3111 bunx playwright test \
//     --config=playwright.shots.config.ts --project=light room-type-rule
// ============================================================================

const OUT = "C:/tmp/pwv/shots";
const PATH = "/facility/dashboard/settings/pricing-rules";

const COPY = {
  en: { card: /room-type pricing/i, add: /^add rule$/i },
  fr: { card: /tarifs par type de chambre/i, add: /^ajouter une règle$/i },
} as const;

async function openEditor(page: Page, lang: keyof typeof COPY) {
  await page.goto(PATH);
  const card = page.getByRole("button", { name: COPY[lang].card }).first();
  await expect(card).toBeVisible({ timeout: 45_000 });
  await card.click();
  await page.getByRole("button", { name: COPY[lang].add }).first().click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible({ timeout: 20_000 });
  return dialog;
}

for (const lang of ["en", "fr"] as const) {
  test(`${lang}: the room-type editor lists the facility's classes`, async ({
    page,
  }) => {
    test.slow();
    mkdirSync(OUT, { recursive: true });
    await signIn(page, ACCOUNTS.owner);
    if (lang === "fr") {
      const host = new URL(page.url()).hostname;
      await page.context().addCookies([
        { name: "APP_LANG_PRIMARY", value: "fr", domain: host, path: "/" },
        { name: "NEXT_LOCALE", value: "fr", domain: host, path: "/" },
      ]);
    }

    for (const width of [1440, 599]) {
      await page.setViewportSize({ width, height: 1000 });
      const dialog = await openEditor(page, lang);

      // The demo facility's own boarding classes, and none of the old four.
      for (const name of ["Suite", "Condominium", "Deluxe Suite"]) {
        await expect(
          dialog.getByText(name, { exact: true }),
          `${name} is offered`,
        ).toBeVisible();
      }
      for (const stale of ["Standard", "VIP", "Cat suite", "Suite pour chat"]) {
        await expect(dialog.getByText(stale, { exact: true })).toHaveCount(0);
      }

      await dialog.screenshot({
        path: `${OUT}/room-type-rule-${lang}-${width}.png`,
      });
      await page.keyboard.press("Escape");
      await expect(dialog).toBeHidden();
    }
  });
}
