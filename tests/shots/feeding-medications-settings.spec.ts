import { mkdirSync } from "node:fs";

import { test, expect, type Page } from "@playwright/test";

import { ACCOUNTS, signIn } from "../e2e/_auth";

// ============================================================================
// PHOTOGRAPH SETTINGS › SERVICES › FEEDING & MEDICATIONS (2026-10-01).
//
// The client's page (docs/Medication_and_Feeding_Instructions_setup_page_
// .html) in Yipyy's design: both tabs whole, at 1440 and 599, in both
// languages; then a changed card with its strip and the page's save bar, and
// the jump nav held under the header after a scroll.
//
// WRITES nothing: the changes it makes to photograph are discarded.
//
// WHAT TO LOOK FOR IN THE FILES (care-settings-*):
//   · placement as the client's page has it: intro and "Reset all", tabs,
//     jump links, the cards in the design's order;
//   · Yipyy's controls and tokens — switches, pills, 2px rings, no tints, no
//     orange, money with its sign where the language puts it;
//   · nothing clipped at 599, nothing English in the French ones.
//
//   E2E_BASE_URL=http://localhost:3111 bun run local node \
//     node_modules/@playwright/test/cli.js test \
//     --config=playwright.shots.config.ts --project=light feeding-medications-settings
// ============================================================================

test.use({ actionTimeout: 30_000 });

const OUT = "C:/tmp/pwv/shots";
const PAGE = "/facility/dashboard/settings/feeding-medications";

async function language(page: Page, lang: "en" | "fr") {
  const host = new URL(page.url()).hostname;
  await page.context().addCookies([
    { name: "APP_LANG_PRIMARY", value: lang, domain: host, path: "/" },
    { name: "NEXT_LOCALE", value: lang, domain: host, path: "/" },
  ]);
}

async function open(page: Page) {
  await page.goto(PAGE);
  await page.getByRole("tab").first().waitFor({ timeout: 60_000 });
  await page.waitForTimeout(600);
}

test("the Feeding & medications page", async ({ page }) => {
  test.setTimeout(10 * 60 * 1000);
  mkdirSync(OUT, { recursive: true });
  await signIn(page, ACCOUNTS.owner);

  try {
    for (const lang of ["en", "fr"] as const) {
      await language(page, lang);
      for (const width of [1440, 599]) {
        await page.setViewportSize({ width, height: 1000 });
        await open(page);
        await page.screenshot({
          path: `${OUT}/care-settings-${lang}-${width}-feeding.png`,
          fullPage: true,
        });
        await page.getByRole("tab").nth(1).click();
        await page.waitForTimeout(500);
        await page.screenshot({
          path: `${OUT}/care-settings-${lang}-${width}-medications.png`,
          fullPage: true,
        });
      }
    }

    // A changed card, the save bar, and the jump nav held under the header.
    await language(page, "en");
    await page.setViewportSize({ width: 1440, height: 900 });
    await open(page);
    await page
      .getByRole("radiogroup", { name: "Optional or required for Boarding" })
      .first()
      .locator("label", { hasText: "Required" })
      .click();
    await page.getByRole("switch", { name: "Offer house food" }).click();
    await page.waitForTimeout(400);
    await page.screenshot({ path: `${OUT}/care-settings-changed.png` });
    await page.getByRole("link", { name: "House food" }).click();
    await page.waitForTimeout(600);
    await page.screenshot({ path: `${OUT}/care-settings-house.png` });

    await page.getByRole("tab", { name: "Medications" }).click();
    await page.getByRole("radio", { name: /^Per dose/ }).click();
    await page.getByRole("link", { name: "How it’s given" }).click();
    await page.waitForTimeout(600);
    await page.screenshot({ path: `${OUT}/care-settings-methods.png` });

    await page.setViewportSize({ width: 599, height: 900 });
    await page.waitForTimeout(400);
    await page.screenshot({ path: `${OUT}/care-settings-599-scrolled.png` });

    // The two tables below 640px: house food switched on, a pocket sold.
    await page.setViewportSize({ width: 599, height: 1600 });
    await page.getByRole("tab", { name: "Feeding" }).click();
    await page.waitForTimeout(400);
    await page
      .locator("#f-house")
      .screenshot({ path: `${OUT}/care-settings-599-house.png` });
    await page.getByRole("tab", { name: "Medications" }).click();
    await page.getByRole("switch", { name: "We sell Pill pocket" }).click();
    await page.waitForTimeout(400);
    await page
      .locator("#m-methods")
      .screenshot({ path: `${OUT}/care-settings-599-methods.png` });

    await page.getByRole("button", { name: /discard/i }).click();
    // Nothing unsaved: the bar is gone, as the design has it.
    await expect(
      page.getByRole("button", { name: /save changes/i }),
    ).toHaveCount(0);
  } finally {
    await language(page, "en");
  }
});
