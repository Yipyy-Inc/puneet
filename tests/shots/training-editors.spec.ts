import { mkdirSync } from "node:fs";

import { test, expect, type Page } from "@playwright/test";

import { ACCOUNTS, signIn } from "../e2e/_auth";

// ============================================================================
// PHOTOGRAPH THE TRAINING EDITORS the booking wizard reads (2026-10-01): a
// private program's format, length and packs (Training › Rates), the program a
// class runs (Training › Series), and the facility's own goals (Settings ›
// Training). Nothing is saved: each dialog is photographed open, then closed.
//
//   E2E_BASE_URL=http://localhost:3100 bun run local node \
//     node_modules/@playwright/test/cli.js test \
//     --config=playwright.shots.config.ts --project=light training-editors
// ============================================================================

test.use({ actionTimeout: 30_000 });

const OUT = "C:/tmp/pwv/shots/wizard/ours";
const WIDTHS = [
  { width: 1280, height: 900 },
  { width: 599, height: 900 },
] as const;

async function shootAll(page: Page, name: string) {
  for (const size of WIDTHS) {
    await page.setViewportSize(size);
    await page.waitForTimeout(450);
    await page.screenshot({ path: `${OUT}/${name}-${size.width}.png` });
  }
  await page.setViewportSize(WIDTHS[0]);
}

test("training editors", async ({ page }) => {
  test.setTimeout(10 * 60 * 1000);
  mkdirSync(OUT, { recursive: true });
  await page.setViewportSize(WIDTHS[0]);
  await signIn(page, ACCOUNTS.owner);

  // Rates: the private lesson, its packs.
  await page.goto("/facility/dashboard/services/training/rates");
  const edit = page.getByTitle("Edit program").first();
  await edit.waitFor({ timeout: 90_000 });
  await edit.click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await dialog
    .getByText(/^(booked as|réservé comme)$/i)
    .scrollIntoViewIfNeeded();
  await shootAll(page, "editor-training-program");
  await page.keyboard.press("Escape");

  // Series: the program a class runs.
  await page.goto("/facility/dashboard/services/training/series");
  const series = page.getByTitle("Edit series").first();
  await series.waitFor({ timeout: 90_000 });
  // The row's actions sit past a sideways scroll at some widths.
  await series.dispatchEvent("click");
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.waitForTimeout(600);
  await shootAll(page, "editor-training-series");
  await page.keyboard.press("Escape");

  // Settings: the goals a booking offers.
  await page.goto("/facility/dashboard/settings/training");
  const goals = page.getByLabel(/^(goals|objectifs)$/i);
  await goals.waitFor({ timeout: 90_000 });
  await goals.scrollIntoViewIfNeeded();
  await shootAll(page, "editor-training-goals");
});
