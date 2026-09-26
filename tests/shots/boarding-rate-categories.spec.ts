import { mkdirSync } from "node:fs";

import { test, expect, type Page } from "@playwright/test";

import { ACCOUNTS, signIn } from "../e2e/_auth";

// ============================================================================
// PHOTOGRAPH THE RATES' CATEGORIES (2026-09-26): the Categories button beside
// Add rate, the rates grouped under their category with a count, and the
// dialog that adds, renames and removes them.
//
// It WRITES, because the state being photographed is rates filed under a
// category: one category is made, three rates are filed in it, and afterAll
// puts every rate back where it was and removes the category. Nothing else is
// clicked but the Categories button.
//
//   bunx playwright test --config=playwright.shots.config.ts boarding-rate-categories --project light
// ============================================================================

const OUT = "C:/tmp/pwv/shots";
const RATES = "/facility/dashboard/services/boarding/rates";
const CATEGORY = "Suites";

interface Rate {
  id: string;
  name: string;
  categoryId: string | null;
}

let categoryId = "";
const filed: Rate[] = [];

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
    for (const rate of filed) {
      await page.request.patch(`/api/boarding/services/${rate.id}`, {
        data: { categoryId: rate.categoryId },
      });
    }
    if (categoryId) {
      await page.request.delete(
        `/api/boarding/service-categories/${categoryId}`,
      );
    }
  } finally {
    await page.close();
  }
});

test("rate categories: the button, the groups and the dialog", async ({
  page,
}) => {
  test.slow();
  mkdirSync(OUT, { recursive: true });
  await page.setViewportSize({ width: 1440, height: 1100 });
  await signIn(page, ACCOUNTS.owner);

  const made = await page.request.post("/api/boarding/service-categories", {
    data: { name: CATEGORY },
  });
  expect(made.status(), await made.text()).toBe(201);
  categoryId = ((await made.json()) as { id: string }).id;

  const res = await page.request.get("/api/boarding/services");
  expect(res.ok(), await res.text()).toBe(true);
  const rates = (await res.json()) as Rate[];
  // Every rate but the last, so the page shows a category AND the rest.
  for (const rate of rates.slice(0, Math.max(1, rates.length - 1))) {
    const put = await page.request.patch(`/api/boarding/services/${rate.id}`, {
      data: { categoryId },
    });
    expect(put.ok(), await put.text()).toBe(true);
    filed.push(rate);
  }

  for (const lang of ["en", "fr"] as const) {
    if (lang === "fr") await french(page);
    await page.setViewportSize({ width: 1440, height: 1100 });
    await page.goto(RATES);
    await expect(
      page.getByText(/per night|per day|par nuit|par jour/i).first(),
    ).toBeVisible({ timeout: 45_000 });
    await page.waitForTimeout(600);
    await page.screenshot({
      path: `${OUT}/rate-categories-${lang}-1440.png`,
    });

    await page
      .getByRole("button", { name: /^(categories|catégories)/i })
      .click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible({ timeout: 20_000 });
    await page.waitForTimeout(400);
    await dialog.screenshot({
      path: `${OUT}/rate-categories-dialog-${lang}.png`,
    });
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();

    await page.setViewportSize({ width: 599, height: 1000 });
    await page.waitForTimeout(800);
    await page.screenshot({
      path: `${OUT}/rate-categories-${lang}-599.png`,
      fullPage: true,
    });
  }
});
