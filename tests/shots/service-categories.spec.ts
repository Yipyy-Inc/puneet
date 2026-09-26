import { mkdirSync } from "node:fs";

import { test, expect, type Page } from "@playwright/test";

import { ACCOUNTS, signIn } from "../e2e/_auth";

// ============================================================================
// PHOTOGRAPH DAYCARE'S AND GROOMING'S CATEGORIES (2026-09-26): the Categories
// button beside the one that adds, the services grouped under their category
// with a count, and the dialog — the same as boarding's rates
// (boarding-rate-categories.spec.ts), on the other two menus.
//
// It WRITES, because the state photographed is services filed under a
// category: one category per menu, every service but the last filed in it,
// and afterAll puts every service back and removes the category.
//
//   bunx playwright test --config=playwright.shots.config.ts service-categories --project light
// ============================================================================

const OUT = "C:/tmp/pwv/shots";

const MENUS = [
  {
    key: "daycare",
    page: "/facility/dashboard/services/daycare/rates",
    services: "/api/daycare/services",
    categories: "/api/daycare/service-categories",
    category: "Full days",
  },
  {
    key: "grooming",
    page: "/facility/dashboard/services/grooming/rates",
    services: "/api/grooming/services",
    categories: "/api/grooming/service-categories",
    category: "Baths",
  },
] as const;

interface Service {
  id: string;
  categoryId?: string | null;
}

/** Each takes the cleanup page: a test page is closed before afterAll runs. */
const undo: Array<(page: Page) => Promise<unknown>> = [];

async function french(page: Page) {
  const host = new URL(page.url()).hostname;
  await page.context().addCookies([
    { name: "APP_LANG_PRIMARY", value: "fr", domain: host, path: "/" },
    { name: "NEXT_LOCALE", value: "fr", domain: host, path: "/" },
  ]);
}

test.afterAll(async ({ browser }) => {
  const page = await browser.newPage();
  try {
    await signIn(page, ACCOUNTS.owner);
    // Services back first, then the categories they were filed in.
    for (const step of undo.reverse()) await step(page);
  } finally {
    await page.close();
  }
});

for (const menu of MENUS) {
  test(`${menu.key}: the button, the groups and the dialog`, async ({
    page,
  }) => {
    test.slow();
    mkdirSync(OUT, { recursive: true });
    await page.setViewportSize({ width: 1440, height: 1100 });
    await signIn(page, ACCOUNTS.owner);

    const made = await page.request.post(menu.categories, {
      data: { name: menu.category },
    });
    expect(made.status(), await made.text()).toBe(201);
    const categoryId = ((await made.json()) as { id: string }).id;
    undo.push((cleanup) =>
      cleanup.request.delete(`${menu.categories}/${categoryId}`),
    );

    const res = await page.request.get(menu.services);
    expect(res.ok(), await res.text()).toBe(true);
    const services = (await res.json()) as Service[];
    for (const service of services.slice(0, Math.max(1, services.length - 1))) {
      const put = await page.request.patch(`${menu.services}/${service.id}`, {
        data: { categoryId },
      });
      expect(put.ok(), await put.text()).toBe(true);
      const was = service.categoryId ?? null;
      undo.push((cleanup) =>
        cleanup.request.patch(`${menu.services}/${service.id}`, {
          data: { categoryId: was },
        }),
      );
    }

    for (const lang of ["en", "fr"] as const) {
      if (lang === "fr") await french(page);
      await page.setViewportSize({ width: 1440, height: 1100 });
      await page.goto(menu.page);
      const button = page.getByRole("button", {
        name: /^(categories|catégories)/i,
      });
      await expect(button).toBeVisible({ timeout: 45_000 });
      await page.waitForTimeout(800);
      await page.screenshot({
        path: `${OUT}/${menu.key}-categories-${lang}-1440.png`,
      });

      await button.click();
      const dialog = page.getByRole("dialog");
      await expect(dialog).toBeVisible({ timeout: 20_000 });
      await page.waitForTimeout(400);
      await dialog.screenshot({
        path: `${OUT}/${menu.key}-categories-dialog-${lang}.png`,
      });
      await page.keyboard.press("Escape");
      await expect(dialog).toBeHidden();

      await page.setViewportSize({ width: 599, height: 1000 });
      await page.waitForTimeout(800);
      await page.screenshot({
        path: `${OUT}/${menu.key}-categories-${lang}-599.png`,
        fullPage: true,
      });
      // And the buttons themselves, in the viewport: a phone-width full-page
      // shot draws the fixed bottom bar over whatever sits behind it, and
      // scrollIntoViewIfNeeded counts a button under that bar as in view.
      await button.evaluate((el) => el.scrollIntoView({ block: "center" }));
      await page.waitForTimeout(300);
      await page.screenshot({
        path: `${OUT}/${menu.key}-categories-${lang}-599-buttons.png`,
      });
    }
  });
}
