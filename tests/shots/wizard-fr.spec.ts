import { mkdirSync } from "node:fs";

import { test, expect, type Locator, type Page } from "@playwright/test";

import fr from "../../messages/fr.json";
import { ACCOUNTS, signIn } from "../e2e/_auth";

// ============================================================================
// THE BOOKING WIZARD IN FRENCH, photographed for the French pass of the
// comparison with the client's mock (2026-10-02). The mock is English only;
// this is where a label that grows by half breaks a card, a chip or a footer
// — §5q's "read the label at its longest real string".
//
// The labels it clicks are read from messages/fr.json, so a renamed key fails
// here rather than silently clicking something else. WRITES NOTHING: the
// booking POST is answered with a made-up booking, as wizard-ours does.
//
//   E2E_BASE_URL=http://localhost:3111 bun run local node \
//     node_modules/@playwright/test/cli.js test \
//     --config=playwright.shots.config.ts --project=light wizard-fr
// ============================================================================

test.use({ actionTimeout: 30_000 });

const OUT = "C:/tmp/pwv/shots/wizard/fr";
// 599 as well: §6 rule 7 tests a layout there, and a French label is longest
// where the room is least.
const WIDTHS = [
  { width: 1280, height: 900 },
  { width: 599, height: 900 },
  { width: 390, height: 844 },
] as const;
const B = fr.shell.booking;
const exact = (text: string) =>
  new RegExp(`^${text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i");

async function shoot(page: Page, name: string) {
  await page
    .locator("[data-wizard-body]")
    .evaluate((el) => el.scrollTo(0, 0))
    .catch(() => undefined);
  for (const size of WIDTHS) {
    await page.setViewportSize(size);
    await page.waitForTimeout(450);
    await page.screenshot({ path: `${OUT}/${name}-${size.width}.png` });
  }
  await page.setViewportSize(WIDTHS[0]);
  await page.waitForTimeout(250);
}

async function french(page: Page) {
  // Both: the language the app is set to, and the one the user picked
  // (tests/e2e/settings-french.spec.ts learned it the hard way).
  const host = new URL(page.url()).hostname;
  await page.context().addCookies([
    { name: "APP_LANG_PRIMARY", value: "fr", domain: host, path: "/" },
    { name: "NEXT_LOCALE", value: "fr", domain: host, path: "/" },
  ]);
}

async function noSave(page: Page) {
  await page.route("**/api/bookings", async (route) => {
    if (route.request().method() !== "POST") return route.continue();
    await route.fulfill({
      status: 201,
      contentType: "application/json",
      body: JSON.stringify({ id: 94612, status: "pending" }),
    });
  });
}

/** The French "Buddy ne prend aucun médicament", ticked for every pet. */
async function answerMedications(dialog: Locator) {
  const heading = dialog.getByRole("heading", {
    name: exact(B.medications),
  });
  if (!(await heading.isVisible().catch(() => false))) return;
  const none = new RegExp(
    B.medsTakesNone.replace("{pet}", ".+").replace(/[()]/g, "\\$&") + "$",
  );
  const tabs = dialog
    .getByRole("radiogroup", { name: exact(B.wizPetsLabel) })
    .locator("label");
  const count = Math.max(1, await tabs.count());
  for (let i = 0; i < count; i += 1) {
    if (count > 1) await tabs.nth(i).click();
    const pill = dialog.locator("label").filter({ hasText: none }).first();
    if ((await pill.count()) === 0) continue;
    if (!(await pill.locator("input[type=checkbox]").isChecked())) {
      await pill.click();
    }
  }
}

async function next(dialog: Locator) {
  await answerMedications(dialog);
  await dialog.getByRole("button", { name: exact(B.next) }).click();
}

/** Four months on, a Monday to the Friday. */
async function pickStay(dialog: Locator) {
  const forward = dialog.getByRole("button", { name: exact(B.wizNextMonth) });
  for (let i = 0; i < 4; i += 1) await forward.click();
  const now = new Date();
  let monday = 1;
  for (let d = 1; d <= 7; d += 1) {
    const day = new Date(now.getFullYear(), now.getMonth() + 4, d);
    if (day.getDay() === 1) monday = d + 7;
  }
  await dialog
    .getByRole("button", { name: String(monday), exact: true })
    .dispatchEvent("click");
  await dialog
    .getByRole("button", { name: String(monday + 4), exact: true })
    .dispatchEvent("click");
}

/** Next to Confirm, a shot of each Details screen, a room where asked. */
async function toConfirm(page: Page, dialog: Locator, prefix: string) {
  const confirm = dialog.getByRole("heading", { name: exact(B.stepConfirm) });
  for (let i = 0; i < 8 && !(await confirm.isVisible()); i += 1) {
    const sub = (await dialog.locator("h2 + p").first().textContent()) ?? "";
    const slug = sub
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
    const rooms = dialog.locator(
      '[data-wizard-body] button[aria-pressed]:not([aria-disabled="true"])',
    );
    // The cards arrive after the heading — an availability read, slow on a
    // cold compile — so wait for them, or the step is shot as skeletons and
    // left with no room.
    if (
      await dialog
        .getByRole("heading", { name: exact(B.wizChooseRoom) })
        .isVisible()
        .catch(() => false)
    ) {
      await rooms
        .first()
        .waitFor({ timeout: 30_000 })
        .catch(() => undefined);
    }
    if (
      (await dialog
        .getByRole("heading", { name: exact(B.wizChooseRoom) })
        .isVisible()
        .catch(() => false)) &&
      (await rooms.count()) > 0
    ) {
      await rooms.filter({ hasText: /Suite/ }).first().click();
      await page.waitForTimeout(300);
      const waiting = rooms.filter({ hasText: /Condo/ }).first();
      if (await waiting.isVisible().catch(() => false)) await waiting.click();
    }
    if (slug) await shoot(page, `${prefix}-${slug}`);
    await next(dialog);
    await page.waitForTimeout(300);
  }
  await expect(confirm).toBeVisible();
}

test("en français : le personnel, une pension jusqu’à Confirmer", async ({
  page,
}) => {
  test.setTimeout(15 * 60 * 1000);
  mkdirSync(OUT, { recursive: true });
  await signIn(page, ACCOUNTS.owner);
  await french(page);
  await noSave(page);
  await page.goto("/facility/dashboard/clients/15");
  await page
    .getByRole("button", { name: /^(réserver|book)$/i })
    .first()
    .click({ timeout: 90_000 });
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await page.waitForTimeout(800);
  await dialog.getByText("Buddy", { exact: true }).first().click();
  await dialog.getByText("Daisy", { exact: true }).first().click();
  await shoot(page, "facility-boarding-client");
  await next(dialog);
  await shoot(page, "facility-boarding-service");
  await dialog.getByText(exact(B.wizKindBoarding)).first().click();
  await next(dialog);
  await pickStay(dialog);
  await toConfirm(page, dialog, "facility-boarding");
  await page.waitForTimeout(600);
  await shoot(page, "facility-boarding-confirm");
});

test("en français : le client, une pension jusqu’à Confirmer", async ({
  page,
}) => {
  test.setTimeout(15 * 60 * 1000);
  mkdirSync(OUT, { recursive: true });
  await signIn(page, ACCOUNTS.customer);
  await french(page);
  await noSave(page);
  await page.goto("/customer/bookings/new");
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible({ timeout: 90_000 });
  await page.waitForTimeout(1500);
  await shoot(page, "customer-boarding-search");
  await dialog.getByText("Buddy", { exact: true }).first().click();
  await dialog.getByText("Daisy", { exact: true }).first().click();
  await next(dialog);
  await shoot(page, "customer-boarding-service");
  await dialog.getByText(exact(B.wizKindBoarding)).first().click();
  await next(dialog);
  await pickStay(dialog);
  await toConfirm(page, dialog, "customer-boarding");
  await page.waitForTimeout(600);
  await shoot(page, "customer-boarding-confirm");
});
