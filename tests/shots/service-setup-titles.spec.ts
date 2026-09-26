import { mkdirSync } from "node:fs";

import { test, expect, type Page } from "@playwright/test";

import { ACCOUNTS, signIn } from "../e2e/_auth";

// ============================================================================
// PHOTOGRAPH EVERY SERVICE MODULE'S TITLE (2026-09-26): "Daycare setup", not
// "Daycare Module", and no Enabled badge beside it — the client's feedback,
// on all seven modules, in both languages, at desktop and at 599px.
//
// Read-only: it opens each module's first page and writes nothing.
//
//   bunx playwright test --config=playwright.shots.config.ts service-setup-titles --project light
// ============================================================================

const OUT = "C:/tmp/pwv/shots";

const MODULES = [
  "boarding",
  "daycare",
  "grooming",
  "training",
  "retail",
  "store",
  "vet",
] as const;

async function french(page: Page) {
  const host = new URL(page.url()).hostname;
  await page.context().addCookies([
    { name: "APP_LANG_PRIMARY", value: "fr", domain: host, path: "/" },
    { name: "NEXT_LOCALE", value: "fr", domain: host, path: "/" },
  ]);
}

test("every module's title, in both languages", async ({ page }) => {
  test.slow();
  mkdirSync(OUT, { recursive: true });
  await signIn(page, ACCOUNTS.owner);

  for (const lang of ["en", "fr"] as const) {
    if (lang === "fr") await french(page);
    for (const key of MODULES) {
      await page.setViewportSize({ width: 1440, height: 640 });
      await page.goto(`/facility/dashboard/services/${key}`);
      // The French title arrives after hydration, so wait for the words of the
      // language being photographed, not merely for a heading.
      const title = page
        .getByRole("heading", { level: 1 })
        .filter({ hasText: lang === "fr" ? /^Configuration/ : / setup$/ });
      await expect(title, `${key} (${lang})`).toBeVisible({ timeout: 45_000 });
      await expect(title).not.toContainText(/Module|Enabled|Activé/);
      await page.waitForTimeout(400);
      await page.screenshot({
        path: `${OUT}/setup-title-${key}-${lang}-1440.png`,
      });

      await page.setViewportSize({ width: 599, height: 720 });
      await page.waitForTimeout(400);
      await page.screenshot({
        path: `${OUT}/setup-title-${key}-${lang}-599.png`,
      });
    }
  }
});
