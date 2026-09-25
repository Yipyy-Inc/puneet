import { test, expect, type Page } from "@playwright/test";
import { mkdirSync } from "node:fs";

import { ACCOUNTS, signIn } from "../e2e/_auth";

// ============================================================================
// PHOTOGRAPH THE "NO SERVICE CAN BOOK THIS" NOTICE ON THE ROOMS TAB.
//
// Every priced class got a service at the cutover, each restricted to its own
// class — so a class made AFTER it is booked by nothing, and drops out of the
// booking form the moment a service is picked. The Rooms tab says so now.
//
// WRITES, BECAUSE THERE IS NOTHING TO PHOTOGRAPH OTHERWISE: every class in the
// demo facility is covered. It makes one priced class with one unit, marked,
// and removes both in a `finally` — the shape `rooms-admin` uses. One
// Postgres, shared with production.
//
// WHAT TO LOOK FOR IN THE FILES:
//   · the warning glyph and sentence in the warning ink, the link in primary
//   · the long French sentence wraps under the header; nothing is clipped
//
//   E2E_BASE_URL=http://localhost:3111 bunx playwright test \
//     --config=playwright.shots.config.ts --project=light rooms-no-service
// ============================================================================

const OUT = "C:/tmp/pwv/shots";
const API = "/api/rooms";
const CLASS_ID = "shot-no-service";
const CLASS_NAME = "Shot kennels";

async function cleanUp(page: Page) {
  const catalogue = (await (await page.request.get(API)).json()) as {
    rooms: { id: string; categoryId: string }[];
  };
  for (const room of catalogue.rooms.filter((r) => r.categoryId === CLASS_ID)) {
    await page.request.delete(`${API}/units/${encodeURIComponent(room.id)}`);
  }
  await page.request.delete(`${API}/categories/${CLASS_ID}`);
}

test("the rooms tab says when no service can book a class", async ({
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
      defaultBasePrice: 50,
      visibleToClients: false,
      rules: [],
      unitCount: 1,
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
        await page.setViewportSize({ width, height: 1000 });
        await page.goto("/facility/dashboard/services/boarding/rooms");
        const card = page
          .locator("div.rounded-xl", {
            has: page.getByRole("heading", { name: CLASS_NAME }),
          })
          .first();
        await expect(card).toBeVisible({ timeout: 45_000 });
        const notice = card.getByRole("link", {
          name: lang === "en" ? /menu tab/i : /onglet menu/i,
        });
        await expect(notice, "the notice links to the menu").toBeVisible({
          timeout: 20_000,
        });
        await card.screenshot({
          path: `${OUT}/rooms-no-service-${lang}-${width}.png`,
        });
      }
    }
  } finally {
    await cleanUp(page);
  }
});
