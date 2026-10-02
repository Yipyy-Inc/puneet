import { mkdirSync } from "node:fs";

import { test, expect, type Page } from "@playwright/test";

// ============================================================================
// PHOTOGRAPH THE AGREEMENTS PAGE a client signs from a link (2026-10-02),
// signed out, as the client is: the page, one agreement signed, and a link
// that does not exist.
//
// Needs the LOCAL seed scratchpad/SEED-agreements-shots.sql (two agreements
// and a link for the demo client, token shot-agreements-token-000000000001);
// REVERT-agreements-shots.sql undoes it and what the signing wrote.
//
//   E2E_BASE_URL=http://localhost:3100 bun run local node \
//     node_modules/@playwright/test/cli.js test \
//     --config=playwright.shots.config.ts --project=light agreements-page
// ============================================================================

test.use({ actionTimeout: 30_000 });

const OUT = "C:/tmp/pwv/shots/wizard/ours";
const TOKEN = "shot-agreements-token-000000000001";
const WIDTHS = [
  { width: 1280, height: 900 },
  { width: 599, height: 900 },
  { width: 390, height: 844 },
] as const;

async function shootAll(page: Page, name: string) {
  for (const size of WIDTHS) {
    await page.setViewportSize(size);
    await page.waitForTimeout(400);
    await page.screenshot({ path: `${OUT}/${name}-${size.width}.png` });
  }
  await page.setViewportSize(WIDTHS[0]);
}

test("the agreements page, signed out", async ({ page }) => {
  test.setTimeout(5 * 60 * 1000);
  mkdirSync(OUT, { recursive: true });
  await page.setViewportSize(WIDTHS[0]);

  await page.goto(`/agreements/${TOKEN}`, { timeout: 120_000 });
  await expect(
    page.getByRole("heading", { name: /sign your agreements|signez/i }),
  ).toBeVisible({ timeout: 60_000 });
  await shootAll(page, "agreements-page");

  const release = page.getByRole("region", { name: "General release" });
  await release.getByRole("checkbox").click();
  await release
    .getByRole("textbox", { name: /full name|nom complet/i })
    .fill("Alice Johnson");
  await release.getByRole("button", { name: /^sign/i }).click();
  await expect(release.getByText(/^signed$|^signée$/i)).toBeVisible({
    timeout: 30_000,
  });
  await page.waitForTimeout(800);
  await shootAll(page, "agreements-page-one-signed");

  await page.goto(`/agreements/not-a-real-token-000000000000`);
  await expect(
    page.getByRole("heading", { name: /expired|expiré/i }),
  ).toBeVisible({ timeout: 60_000 });
  await shootAll(page, "agreements-page-invalid");
});
