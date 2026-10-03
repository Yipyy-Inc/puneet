import { mkdirSync } from "node:fs";

import { test, type Page } from "@playwright/test";

import en from "../../messages/en.json";
import fr from "../../messages/fr.json";
import { ACCOUNTS, signIn } from "../e2e/_auth";

// ============================================================================
// Our side of the booking-details comparison (2026-10-03): the facility's
// booking page for each service, and its Take payment dialog, under the same
// names as booking-details-mock.spec.ts photographs the client's mocks:
//
//   C:/tmp/pwv/shots/booking-details/mock/   the client's
//   C:/tmp/pwv/shots/booking-details/ours/   this
//
// LOCAL ONLY. It reads the local copy seeded by SEED-booking-details-shots.sql
// (the session scratchpad): one placeholder client and four bookings. The refs
// come in through BD_SHOTS, `<client>:<boarding>,<daycare>,<grooming>,<training>`:
//
//   BD_SHOTS=92050947:990039379,990039380,990039381,990039384 \
//   E2E_BASE_URL=http://localhost:3100 bun run local node \
//     node_modules/@playwright/test/cli.js test \
//     --config=playwright.shots.config.ts --project=light booking-details-ours
//
// Nothing here pays: the dialog is opened, filled and photographed, and closed.
//
// BD_LOCALE=fr photographs the French screen into `ours-fr/` (the words are
// read from messages/fr.json, so every selector follows the language), and the
// `dark` project into `ours-dark/`.
// ============================================================================

test.describe.configure({ mode: "serial" });
test.use({ actionTimeout: 30_000 });
// A cold dev server compiles the screen and each of its API routes on first
// use — over a minute and a half on this machine.
test.setTimeout(900_000);

const LOCALE = process.env.BD_LOCALE === "fr" ? "fr" : "en";
const WORDS = LOCALE === "fr" ? fr : en;
const BD = WORDS.staff.areas.bookingDetail;
const TP = WORDS.staff.areas.takePayment;
const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
/** A tab's name, with or without its count badge. */
const tabName = (label: string) => new RegExp(`^${escape(label)}`);

const outDir = () =>
  "C:/tmp/pwv/shots/booking-details/ours" +
  (test.info().project.name === "dark" ? "-dark" : "") +
  (LOCALE === "fr" ? "-fr" : "");
const WIDTHS = [1280, 834, 599, 390] as const;
const HEIGHT: Record<(typeof WIDTHS)[number], number> = {
  1280: 900,
  834: 1112,
  599: 900,
  390: 844,
};
const DIALOG_HEIGHT = 2000;

const [clientRef, refList] = (process.env.BD_SHOTS ?? ":").split(":");
const refs = (refList ?? "").split(",");
// Each tab under the mock's file name and the label it carries here.
const JOURNAL = { slug: "guest-journal", label: BD.tabGuestJournal };
const DAILY_LOG = { slug: "daily-log", label: BD.tabDailyLog };
const TASKS = { slug: "tasks", label: BD.tabTasks };
const NOTES = { slug: "notes-history", label: BD.tabNotesHistory };
const SERVICES = [
  { key: "boarding", ref: refs[0], tabs: [JOURNAL, TASKS, NOTES] },
  { key: "daycare", ref: refs[1], tabs: [DAILY_LOG, TASKS, NOTES] },
  { key: "grooming", ref: refs[2], tabs: [NOTES] },
  { key: "training", ref: refs[3], tabs: [NOTES] },
] as const;
const METHODS = [
  { slug: "cash", label: TP.methodCash },
  { slug: "gift-card", label: TP.methodGift },
  { slug: "e-transfer", label: TP.methodETransfer },
] as const;

function reportErrors(page: Page) {
  page.on("pageerror", (error) => console.log(`[pageerror] ${error.message}`));
  page.on("console", (message) => {
    if (message.type() === "error") {
      console.log(`[console] ${message.text().slice(0, 300)}`);
    }
  });
}

const shoot = (page: Page, name: string, width: number, full = true) => {
  const dir = outDir();
  mkdirSync(dir, { recursive: true });
  return page.screenshot({
    path: `${dir}/${name}-${width}.png`,
    fullPage: full,
  });
};

/**
 * What spills at this width: the page scrolling sideways, and any element
 * whose content is wider than its own box with nothing clipping or scrolling
 * it (a no-wrap chip, a long word). Logged, for the comparison to read.
 */
async function reportSpills(page: Page, name: string) {
  const found = await page.evaluate(() => {
    const out: string[] = [];
    const root = document.documentElement;
    if (root.scrollWidth > root.clientWidth + 1) {
      out.push(`page ${root.scrollWidth}>${root.clientWidth}`);
    }
    for (const el of document.querySelectorAll<HTMLElement>("main *")) {
      if (getComputedStyle(el).overflowX !== "visible") continue;
      if (el.clientWidth > 0 && el.scrollWidth > el.clientWidth + 1) {
        const text = (el.textContent ?? "").trim().slice(0, 48);
        out.push(
          `${el.tagName.toLowerCase()} "${text}" ${el.scrollWidth}>${el.clientWidth}`,
        );
      }
    }
    return out.slice(0, 12);
  });
  if (found.length > 0) console.log(`[spill] ${name}: ${found.join(" | ")}`);
}

async function open(page: Page, ref: string, width: number, height: number) {
  await page.setViewportSize({ width, height });
  if (LOCALE === "fr") {
    await page.context().addCookies([
      {
        name: "NEXT_LOCALE",
        value: "fr",
        url: String(test.info().project.use.baseURL),
      },
    ]);
  }
  await page.goto(`/facility/dashboard/clients/${clientRef}/bookings/${ref}`);
  // A cold dev server compiles the screen first.
  await page
    .getByRole("tab", { name: tabName(BD.tabOverview) })
    .waitFor({ timeout: 300_000 });
  // Every read the screen makes, answered — the bill's lines, the ledger,
  // the kennel — before anything is photographed.
  await page.waitForLoadState("networkidle", { timeout: 300_000 });
  await page.waitForTimeout(800);
}

test.beforeAll(() => {
  if (!clientRef || refs.length < 4) {
    throw new Error(
      "Set BD_SHOTS=<client>:<boarding>,<daycare>,<grooming>,<training>",
    );
  }
});

for (const service of SERVICES) {
  for (const width of WIDTHS) {
    test(`${service.key} page · ${width}`, async ({ page }) => {
      reportErrors(page);
      await signIn(page, ACCOUNTS.owner);
      await open(page, service.ref, width, HEIGHT[width]);
      await shoot(page, `${service.key}-overview`, width);
      await reportSpills(page, `${service.key}-overview-${width}`);
      for (const tab of service.tabs) {
        await page.getByRole("tab", { name: tabName(tab.label) }).click();
        await page.waitForLoadState("networkidle", { timeout: 120_000 });
        await page.waitForTimeout(500);
        await shoot(page, `${service.key}-${tab.slug}`, width);
        await reportSpills(page, `${service.key}-${tab.slug}-${width}`);
      }
      await page.getByRole("tab", { name: tabName(BD.tabOverview) }).click();
      await page
        .getByRole("button", { name: BD.menuMore, exact: true })
        .click();
      await page.waitForTimeout(400);
      await shoot(page, `${service.key}-more-menu`, width, false);
    });
  }

  test(`${service.key} take payment`, async ({ page }) => {
    reportErrors(page);
    await signIn(page, ACCOUNTS.owner);
    for (const width of WIDTHS) {
      await open(page, service.ref, width, DIALOG_HEIGHT);
      const takePayment = BD.takePaymentAmount.split("{amount}")[0].trim();
      await page
        .getByRole("button", { name: new RegExp(`^${escape(takePayment)}`) })
        .click();
      const dialog = page.locator("[data-slot=take-payment]");
      await dialog.waitFor();
      await page.waitForTimeout(800);
      await shoot(page, `${service.key}-pay-default`, width, false);

      await dialog.getByText(TP.customAmount).click();
      await dialog.getByLabel(TP.customPlaceholder).fill("50");
      await page.waitForTimeout(300);
      await shoot(page, `${service.key}-pay-custom`, width, false);
      await dialog.getByText(TP.fullBalance).click();

      const promo = dialog.getByRole("button", { name: TP.addPromo });
      if (await promo.isVisible()) {
        await promo.click();
        await page.waitForTimeout(200);
        await shoot(page, `${service.key}-pay-promo-open`, width, false);
      }

      for (const method of METHODS) {
        const card = dialog.locator("label", { hasText: method.label }).first();
        if (await card.isVisible()) {
          await card.click();
          await page.waitForTimeout(300);
          await shoot(page, `${service.key}-pay-${method.slug}`, width, false);
        }
      }

      const split = dialog.getByRole("button", { name: TP.splitStart });
      if (await split.isVisible()) {
        await split.click();
        await page.waitForTimeout(300);
        await shoot(page, `${service.key}-pay-split`, width, false);
      }
      await dialog.getByRole("button", { name: TP.cancel }).click();
      await page.waitForTimeout(300);
    }
  });
}
