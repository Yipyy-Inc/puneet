import { test, expect } from "@playwright/test";
import { mkdirSync } from "node:fs";

import { ACCOUNTS, signIn } from "../e2e/_auth";

// ============================================================================
// PHOTOGRAPH THE CHECKOUT CUT-OFF CARD — the setting that had no screen.
//
// READ-ONLY: the switch is turned and a time typed so the "on" state can be
// seen, but Save is never pressed — saving it on would re-derive every
// upcoming stay in the shared demo facility.
//
// WHAT TO LOOK FOR IN THE FILES:
//   · the long French description wraps; nothing is clipped at 599px
//   · the label and the switch stay on one row, the switch never squeezed
//   · Save is disabled until something changes
//
//   E2E_BASE_URL=http://localhost:3111 bunx playwright test \
//     --config=playwright.shots.config.ts --project=light checkout-cut-off
// ============================================================================

const OUT = "C:/tmp/pwv/shots";
const PATH = "/facility/dashboard/services/boarding/settings";

for (const lang of ["en", "fr"] as const) {
  test(`${lang}: the checkout cut-off card, off and being switched on`, async ({
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
      await page.setViewportSize({ width, height: 1100 });
      await page.goto(PATH);
      const card = page.locator("#checkout-cut-off");
      await expect(card).toBeVisible({ timeout: 45_000 });
      await card.scrollIntoViewIfNeeded();
      const save = card.getByRole("button").last();
      await expect(save, "nothing to save yet").toBeDisabled();
      await card.screenshot({
        path: `${OUT}/checkout-cut-off-${lang}-${width}-off.png`,
      });

      await card.getByRole("switch").click();
      await card.locator('input[type="time"]').fill("14:00");
      await expect(save, "a change can be saved").toBeEnabled();
      await card.screenshot({
        path: `${OUT}/checkout-cut-off-${lang}-${width}-on.png`,
      });
    }
  });
}
