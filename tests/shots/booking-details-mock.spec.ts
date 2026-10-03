import { mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

import { test, type Page } from "@playwright/test";

// ============================================================================
// The mocks' side of the booking-details comparison (2026-10-03): the
// client's four Booking_Details mocks — one app whose only difference is the
// service it opens on — and the Take payment dialog they embed, at the
// mocks' widths and at 599.
//
// Nothing here needs the app, so it runs without a server:
//
//   node node_modules/@playwright/test/cli.js test \
//     --config=playwright.shots.config.ts --project=light booking-details-mock
//
// Files land in C:/tmp/pwv/shots/booking-details/mock/<name>-<width>.png,
// beside the app's own (booking-details-ours.spec.ts), same names. The mocks
// hold a REAL client's contact details: these shots stay on this machine, and
// the mocks themselves stay out of git.
// ============================================================================

const OUT = "C:/tmp/pwv/shots/booking-details/mock";
const SERVICES = ["Boarding", "Daycare", "Grooming", "Training"] as const;
const WIDTHS = [
  { width: 1280, height: 900 },
  { width: 834, height: 1112 },
  { width: 599, height: 900 },
  { width: 390, height: 844 },
] as const;
/** Tall enough that the whole dialog is on screen at once. */
const DIALOG_HEIGHT = 2000;

test.describe.configure({ mode: "serial" });
test.use({ actionTimeout: 15_000 });

async function open(page: Page, service: string, width: number, h: number) {
  await page.setViewportSize({ width, height: h });
  // From this file, not the working directory: the runs start from C:\ (a
  // run from the lower-case c:\ path hangs on this machine).
  await page.goto(
    pathToFileURL(
      resolve(__dirname, "../../docs", `Booking_Details_-_${service}.html`),
    ).href,
  );
  // The bundle unpacks itself, then the mock's runtime renders.
  await page.waitForSelector("#__bundler_loading", {
    state: "detached",
    timeout: 30_000,
  });
  await page.waitForTimeout(700);
}

const button = (page: Page, text: string | RegExp) =>
  page.locator("button", { hasText: text }).first();

async function click(page: Page, text: string | RegExp) {
  await button(page, text).click();
  await page.waitForTimeout(250);
}

const shoot = (page: Page, name: string, width: number, full = true) =>
  page.screenshot({ path: `${OUT}/${name}-${width}.png`, fullPage: full });

const TABS: Record<(typeof SERVICES)[number], string[]> = {
  Boarding: ["Guest journal", "Tasks", "Notes & history"],
  Daycare: ["Daily log", "Tasks", "Notes & history"],
  Grooming: ["Notes & history"],
  Training: ["Notes & history"],
};

const slug = (text: string) =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

for (const service of SERVICES) {
  const key = service.toLowerCase();
  for (const { width, height } of WIDTHS) {
    test(`${key} page · ${width}`, async ({ page }) => {
      mkdirSync(OUT, { recursive: true });
      await open(page, service, width, height);
      await shoot(page, `${key}-overview`, width);
      for (const tab of TABS[service]) {
        await click(page, tab);
        await shoot(page, `${key}-${slug(tab)}`, width);
      }
      if (service === "Boarding") {
        // A past day in the journal, and the checkout day.
        await click(page, "Guest journal");
        await click(page, /Day 3/);
        await shoot(page, `${key}-guest-journal-day-3`, width);
        await click(page, /Day 10/);
        await shoot(page, `${key}-guest-journal-day-10`, width);
      }
      await click(page, "Overview");
      await click(page, /More/);
      await shoot(page, `${key}-more-menu`, width, false);
    });

    test(`${key} take payment · ${width}`, async ({ page }) => {
      mkdirSync(OUT, { recursive: true });
      await open(page, service, width, DIALOG_HEIGHT);
      await click(page, /Take payment/);
      await page.waitForTimeout(400);
      await shoot(page, `${key}-pay-default`, width, false);

      await click(page, "Custom amount");
      await shoot(page, `${key}-pay-custom`, width, false);
      await click(page, "Full balance");

      await click(page, "+ Promo code");
      await shoot(page, `${key}-pay-promo-open`, width, false);
      await page.getByPlaceholder(/WELCOME10/).fill("WELCOME10");
      await click(page, "Apply");
      await shoot(page, `${key}-pay-promo-applied`, width, false);

      if (service === "Grooming" || service === "Training") {
        await click(page, "15%");
        await shoot(page, `${key}-pay-tip`, width, false);
      }

      // Credit off, so a method is needed whatever the balance (the $50 of
      // credit covers Daycare's whole bill, and the methods hide). The switch
      // is the dialog's only 44px-wide button.
      await page.evaluate(() => {
        const toggle = [...document.querySelectorAll("button")].find(
          (b) => b.style.width === "44px",
        );
        toggle?.click();
      });
      await page.waitForTimeout(250);
      await shoot(page, `${key}-pay-credit-off`, width, false);

      await click(page, "Use a new card");
      await shoot(page, `${key}-pay-new-card`, width, false);
      await click(page, /Visa/);

      for (const method of ["Terminal", "Cash", "Gift card", "E-transfer"]) {
        await click(page, method);
        await shoot(page, `${key}-pay-${slug(method)}`, width, false);
      }

      await click(page, "Gift card");
      await page.getByPlaceholder("Gift card code").fill("GIFT-1234");
      await click(page, "Check balance");
      await shoot(page, `${key}-pay-gift-partial`, width, false);

      await click(page, "Cash");
      await click(page, "Split between two methods");
      await shoot(page, `${key}-pay-split`, width, false);
      await click(page, "Remove split");

      await click(page, /^Record \$/);
      await shoot(page, `${key}-pay-processing`, width, false);
      await page.waitForTimeout(1500);
      await shoot(page, `${key}-pay-done`, width, false);
    });
  }
}
