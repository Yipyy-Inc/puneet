import { test, expect, type Page } from "@playwright/test";
import { mkdirSync } from "node:fs";

import { ACCOUNTS, signIn } from "../e2e/_auth";

// ============================================================================
// PHOTOGRAPH THE ROOM TYPE'S "WHICH PETS" PICKER.
//
// The size tiers and species chips replaced a "pick a rule type, press Add"
// builder. The class it opens is made here with a limit that is NOT a tier
// edge — up to 20 lb, Doggieville's own Condos — because that is the case the
// picker must show honestly: Small on, Medium off, and the exact 20 lb in the
// field and the sentence.
//
// WRITES: one class, no units, marked, removed in a `finally`. One Postgres,
// shared with production.
//
// WHAT TO LOOK FOR IN THE FILES:
//   · Small is the only tier on; the sentence says 9.1 kg (20 lb)
//   · the Dog chip is on and Cat off; the two message fields are shown
//   · at 599 the tier chips wrap one to a line and nothing is clipped;
//     the French labels are the longest and still fit
//   · after "medium": Small and Medium on, the field reads 35
//
//   E2E_BASE_URL=http://localhost:3111 bunx playwright test \
//     --config=playwright.shots.config.ts --project=light lodging-eligibility
// ============================================================================

const OUT = "C:/tmp/pwv/shots";
const API = "/api/rooms";
const CLASS_ID = "shot-eligibility";
const CLASS_NAME = "Shot eligibility";

async function cleanUp(page: Page) {
  await page.request.delete(`${API}/categories/${CLASS_ID}`);
}

test("a room type says which pets it takes, by size and by kind", async ({
  page,
}) => {
  test.slow();
  mkdirSync(OUT, { recursive: true });
  await signIn(page, ACCOUNTS.owner);
  await cleanUp(page); // a previous run that died

  const made = await page.request.post(`${API}/categories`, {
    data: {
      id: CLASS_ID,
      name: CLASS_NAME,
      service: "boarding",
      defaultCapacity: 1,
      visibleToClients: false,
      rules: [
        {
          id: "shot-max",
          type: "max_weight",
          value: 20,
          clientMessage: "Condos are for dogs up to 20 lb.",
          enabled: true,
        },
        {
          id: "shot-type",
          type: "pet_type",
          value: ["Dog"],
          clientMessage: "Dogs only in the condos.",
          enabled: true,
        },
      ],
      unitCount: 0,
    },
  });
  expect(made.status(), await made.text()).toBe(201);

  try {
    for (const lang of ["en", "fr"] as const) {
      if (lang === "fr") {
        const host = new URL(page.url()).hostname;
        await page.context().addCookies([
          { name: "APP_LANG_PRIMARY", value: "fr", domain: host, path: "/" },
          { name: "NEXT_LOCALE", value: "fr", domain: host, path: "/" },
        ]);
      }
      for (const width of [1440, 599]) {
        await page.setViewportSize({ width, height: 1600 });
        await page.goto("/facility/dashboard/services/boarding/rooms");
        const card = page
          .locator("div.rounded-xl", {
            has: page.getByRole("heading", { name: CLASS_NAME }),
          })
          .first();
        await expect(card).toBeVisible({ timeout: 45_000 });
        await card.locator("button:has(svg.lucide-pencil)").click();

        const dialog = page.getByRole("dialog");
        const weight = dialog.locator("#lodging-max-weight");
        await expect(weight).toHaveValue("20", { timeout: 20_000 });
        await dialog
          .locator("#lodging-species-message")
          .scrollIntoViewIfNeeded();
        await dialog.screenshot({
          path: `${OUT}/lodging-eligibility-${lang}-${width}.png`,
        });

        // Press Medium: the run stretches to it, and the field follows.
        await dialog
          .getByRole("button", { name: lang === "en" ? /^Medium/ : /^Moyen/ })
          .click();
        await expect(weight).toHaveValue("35");
        await dialog.screenshot({
          path: `${OUT}/lodging-eligibility-${lang}-${width}-medium.png`,
        });
        await page.keyboard.press("Escape");
      }
    }
  } finally {
    await cleanUp(page);
  }
});
