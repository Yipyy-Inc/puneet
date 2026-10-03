import { mkdirSync } from "node:fs";

import { test, expect, type Locator, type Page } from "@playwright/test";

import { ACCOUNTS, signIn } from "../e2e/_auth";
import { answerCareSteps } from "../e2e/_wizard";

// ============================================================================
// PHOTOGRAPH OUR BOOKING WIZARD, screen by screen, for the comparison with the
// client's mock (wizard-mock.spec.ts photographs that side, 2026-10-01).
//
// Each screen is taken at the mock's three widths — 1280, 834, 390 — and at
// 599, the width CLAUDE.md asks every interface to be tested at. The files are
// named as the mock's are (facility-boarding-schedule-1280.png …), so a pair
// is the same name in two folders:
//
//   C:/tmp/pwv/shots/wizard/mock/   the client's page
//   C:/tmp/pwv/shots/wizard/ours/   this
//
// BOOKS NOTHING: the booking POST is answered here with a made-up booking
// #94612 (the number the mock shows), so "Create booking" reaches the done
// screen without a row in any database. The customer walks DO sign the
// facility's agreements inline, as a customer must before requesting — so
// point it at the local copy (`bun run local`), never at production.
//
//   E2E_BASE_URL=http://localhost:3100 bun run local node \
//     node_modules/@playwright/test/cli.js test \
//     --config=playwright.shots.config.ts --project=light wizard-ours
// ============================================================================

test.use({ actionTimeout: 30_000 });

const OUT = "C:/tmp/pwv/shots/wizard/ours";
const WIDTHS = [
  { width: 1280, height: 900 },
  { width: 834, height: 1112 },
  { width: 599, height: 900 },
  { width: 390, height: 844 },
] as const;

/** The screen at every width, then back to the desktop the walk drives at. */
async function shootAll(page: Page, name: string) {
  // From the top, as the mock is photographed: a click may have scrolled.
  await page
    .locator("[data-wizard-body]")
    .evaluate((el) => el.scrollTo(0, 0))
    .catch(() => undefined);
  for (const size of WIDTHS) {
    await page.setViewportSize(size);
    await page.waitForTimeout(450);
    // A lazy photo still on its way paints as an empty white band, which
    // reads as a missing placeholder in the comparison.
    await page
      .waitForFunction(
        () =>
          [...document.images].every((img) => {
            if (img.complete) return true;
            const box = img.getBoundingClientRect();
            return box.bottom < 0 || box.top > innerHeight || box.width === 0;
          }),
        undefined,
        { timeout: 5_000 },
      )
      .catch(() => undefined);
    await page.screenshot({ path: `${OUT}/${name}-${size.width}.png` });
  }
  await page.setViewportSize(WIDTHS[0]);
  await page.waitForTimeout(250);
}

/** The end of a long screen, at the desktop width: Confirm's staff rows. */
async function shootEnd(page: Page, name: string) {
  await page
    .locator("[data-wizard-body]")
    .evaluate((el) => el.scrollTo(0, el.scrollHeight))
    .catch(() => undefined);
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${OUT}/${name}-end-1280.png` });
}

/** Prints what the page logged as an error, the dev overlay's "Issues". */
function reportErrors(page: Page) {
  const seen = new Set<string>();
  page.on("console", async (message) => {
    if (message.type() !== "error") return;
    // React logs a template ("…the same key, `%s`…") with its values as
    // arguments; the values are what say which list and which component.
    const args = await Promise.all(
      message.args().map((arg) => arg.jsonValue().catch(() => "?")),
    );
    const line = args
      .map((arg) => (typeof arg === "string" ? arg : JSON.stringify(arg)))
      .join(" | ")
      .replace(/\s+/g, " ")
      .slice(0, 900);
    if (seen.has(line)) return;
    seen.add(line);
    console.log(`[console] ${line}`);
  });
  page.on("pageerror", (error) => console.log(`[pageerror] ${error.message}`));
}

/** Answers the booking POST with booking #94612; nothing is written. */
async function interceptSave(page: Page) {
  reportErrors(page);
  // Training is an enrolment: a lesson's own series, then a place in it.
  await page.route("**/api/training/series", async (route) => {
    if (route.request().method() !== "POST") return route.continue();
    if (process.env.SHOT_PAYLOAD) {
      console.log(`[series] ${route.request().postData()?.slice(0, 2000)}`);
    }
    await route.fulfill({
      status: 201,
      contentType: "application/json",
      body: JSON.stringify({ id: "5a000000-0000-4000-8000-0000000000ff" }),
    });
  });
  await page.route("**/api/training/series/*/enrollments", async (route) => {
    if (route.request().method() !== "POST") return route.continue();
    if (process.env.SHOT_PAYLOAD) {
      console.log(`[enrol] ${route.request().postData()?.slice(0, 2000)}`);
    }
    await route.fulfill({
      status: 201,
      contentType: "application/json",
      body: JSON.stringify({
        enrollment: { id: "e", status: "enrolled" },
        bookings: [
          {
            bookingId: "b",
            bookingRef: 94612,
            sessionId: "s",
            sessionNumber: 1,
          },
        ],
        bookingRefs: [94612],
      }),
    });
  });
  await page.route("**/api/bookings", async (route) => {
    if (route.request().method() !== "POST") return route.continue();
    // What the wizard sends, for reading back: the parts, packages, money.
    if (process.env.SHOT_PAYLOAD) {
      console.log(`[payload] ${route.request().postData()?.slice(0, 4000)}`);
    }
    await route.fulfill({
      status: 201,
      contentType: "application/json",
      body: JSON.stringify({ id: 94612 }),
    });
  });
}

const next = (dialog: Locator) =>
  dialog.getByRole("button", { name: /^(next|suivant)$/i }).click();

/** The first Monday of the month `ahead` months from now, as a day number. */
function firstMonday(ahead: number): number {
  const now = new Date();
  for (let d = 1; d <= 7; d += 1) {
    if (new Date(now.getFullYear(), now.getMonth() + ahead, d).getDay() === 1) {
      return d;
    }
  }
  return 1;
}

/** Ticks a pet card unless it is already chosen. */
async function choosePet(dialog: Locator, name: RegExp) {
  const card = dialog.getByRole("checkbox", { name }).first();
  if ((await card.getAttribute("aria-checked")) !== "true") await card.click();
}

/** Boarding's Schedule: four months on, a Monday to the Friday. */
async function pickStay(dialog: Locator) {
  for (let i = 0; i < 4; i += 1) {
    await dialog.getByRole("button", { name: "Next month" }).first().click();
  }
  const monday = firstMonday(4) + 7;
  await dialog
    .getByRole("button", { name: String(monday), exact: true })
    .dispatchEvent("click");
  await dialog
    .getByRole("button", { name: String(monday + 4), exact: true })
    .dispatchEvent("click");
}

/** "Share a room" on where it is offered, then a room each pet may have. */
async function chooseRooms(page: Page, dialog: Locator) {
  // The cards arrive with the menu; a customer's is fetched on this step.
  await dialog
    .locator("[data-wizard-body] button[aria-pressed]")
    .first()
    .waitFor({ timeout: 60_000 })
    .catch(() => undefined);
  const share = dialog.getByRole("switch").first();
  if (
    (await share.isVisible().catch(() => false)) &&
    (await share.getAttribute("aria-checked")) !== "true"
  ) {
    await share.click();
    await page.waitForTimeout(250);
  }
  const free = dialog.locator(
    '[data-wizard-body] button[aria-pressed]:not([aria-disabled="true"])',
  );
  for (let i = 0; i < 3; i += 1) {
    const pick = free.filter({ hasText: /Deluxe/ }).first();
    const room = (await pick.isVisible().catch(() => false))
      ? pick
      : free.filter({ hasText: /Condo|Suite/ }).first();
    if (!(await room.isVisible().catch(() => false))) break;
    if ((await room.getAttribute("aria-pressed")) !== "true")
      await room.click();
    await page.waitForTimeout(250);
    // A pet still without a room has its tab chosen for it; pick again.
    const waiting = await dialog
      .getByText(/no room yet|pas encore de chambre/i)
      .count();
    if (waiting === 0) break;
  }
}

/** Grooming's Package: the first package each pet may have, pet by pet. */
async function choosePackages(page: Page, dialog: Locator) {
  const cards = dialog.locator(
    '[data-wizard-body] button[aria-pressed]:not([aria-disabled="true"])',
  );
  await cards
    .first()
    .waitFor({ timeout: 60_000 })
    .catch(() => undefined);
  for (let i = 0; i < 4; i += 1) {
    const count = await cards.count();
    if (count === 0) break;
    // The mock's pair: the second package for the first dog, the last for the next.
    const card = i === 0 ? cards.nth(Math.min(1, count - 1)) : cards.last();
    if ((await card.getAttribute("aria-pressed")) !== "true")
      await card.click();
    await page.waitForTimeout(250);
    const waiting = await dialog
      .getByText(/not chosen|pas encore choisi/i)
      .count();
    if (waiting === 0) break;
  }
}

/** Groomer & time: the earliest opening, else the first time shown. */
async function takeEarliestSlot(page: Page, dialog: Locator) {
  const take = dialog.getByRole("button", { name: /take this slot|prendre/i });
  await take.waitFor({ timeout: 60_000 }).catch(() => undefined);
  if (await take.isVisible().catch(() => false)) {
    await take.click();
  } else {
    const slot = dialog
      .getByRole("radiogroup", { name: /^(time|heure)$/i })
      .getByRole("radio")
      .first();
    if (await slot.isVisible().catch(() => false)) await slot.click();
  }
  await page.waitForTimeout(300);
}

/** A customer signs every agreement Confirm lists, inline. Writes locally. */
async function signAgreements(page: Page, dialog: Locator) {
  for (let i = 0; i < 4; i += 1) {
    const open = dialog
      .getByRole("button", { name: /^(read & sign|lire et signer)$/i })
      .first();
    if (!(await open.isVisible().catch(() => false))) break;
    await open.click();
    await dialog
      .getByRole("checkbox", { name: /agree to|accepte/i })
      .first()
      .check();
    const canvas = dialog.locator("canvas").first();
    if (await canvas.isVisible().catch(() => false)) {
      const box = await canvas.boundingBox();
      if (box) {
        await page.mouse.move(box.x + 24, box.y + box.height / 2);
        await page.mouse.down();
        await page.mouse.move(box.x + box.width / 2, box.y + 12, { steps: 8 });
        await page.mouse.move(box.x + box.width - 24, box.y + box.height - 12, {
          steps: 8,
        });
        await page.mouse.up();
      }
      await dialog
        .getByRole("button", {
          name: /confirm the signature|confirmer la signature/i,
        })
        .click();
    }
    const name = dialog
      .getByLabel(/type your full name|votre nom complet/i)
      .first();
    if (!(await name.inputValue()).trim()) await name.fill("Alice Johnson");
    await dialog.getByRole("button", { name: /^(sign|signer)$/i }).click();
    await page.waitForTimeout(1200);
  }
}

/** The customer's submit, whichever the facility's settings make it. */
function customerSubmit(dialog: Locator) {
  return dialog.getByRole("button", {
    name: /^(request booking|book & pay deposit|book appointment)$/i,
  });
}

/** Next until the Details step hands over to Confirm, answering care steps. */
async function toConfirm(page: Page, dialog: Locator, prefix: string) {
  const confirm = dialog.getByRole("heading", {
    name: /^(confirm|confirmer)$/i,
  });
  for (let i = 0; i < 8 && !(await confirm.isVisible()); i += 1) {
    const sub = (await dialog.locator("h2 + p").first().textContent()) ?? "";
    const slug = sub
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
    // Room type is photographed chosen, as the mock shows it: the pets
    // sharing where they can, in the first room that takes them.
    if (slug === "room-type") await chooseRooms(page, dialog);
    // Add-ons as the mock fills them: two of the first for the first pet,
    // one of the last for the last pet.
    if (slug === "add-ons") {
      const more = dialog.getByRole("button", { name: /^add one /i });
      if ((await more.count()) > 0) {
        await more.first().click();
        // Grooming takes one of each: the second only where + still works.
        if (await more.first().isEnabled()) await more.first().click();
        if (await more.last().isEnabled()) await more.last().click();
        await page.waitForTimeout(250);
      }
    }
    // Grooming: a package for every pet, then the earliest slot.
    if (slug === "package") await choosePackages(page, dialog);
    if (slug === "groomer-time") await takeEarliestSlot(page, dialog);
    if (slug) await shootAll(page, `${prefix}-${slug}`);
    await answerCareSteps(dialog);
    await next(dialog);
    await page.waitForTimeout(300);
  }
  await expect(confirm).toBeVisible();
}

/** Training's Details as the mock walks them, photographing each screen. */
async function trainingDetails(
  page: Page,
  dialog: Locator,
  prefix: string,
  plan: { program: RegExp; pack?: RegExp; spots?: RegExp },
) {
  const body = dialog.locator("[data-wizard-body]");
  const card = body
    .locator("button[aria-pressed]")
    .filter({ hasText: plan.program })
    .first();
  await card.waitFor({ timeout: 60_000 });
  await card.click();
  if (plan.pack) await body.getByRole("radio", { name: plan.pack }).click();
  await page.waitForTimeout(300);
  await shootAll(page, `${prefix}-program`);
  await next(dialog);
  await page.waitForTimeout(800);
  if (plan.spots) {
    // A group program: the class with the places the mock's has.
    const pick = body
      .getByRole("radio")
      .filter({ hasText: plan.spots })
      .first();
    await pick.waitFor({ timeout: 60_000 });
    await pick.click();
  } else {
    await takeEarliestSlot(page, dialog);
  }
  await page.waitForTimeout(300);
  await shootAll(page, `${prefix}-trainer-time`);
  await next(dialog);
  await page.waitForTimeout(400);
  // Goals, as the mock fills them.
  await body
    .getByText(/^(loose-leash walking|marche en laisse détendue)$/i)
    .click();
  await body.getByText(/^(recall|rappel)$/i).click();
  await body.getByText(/^(some basics|quelques bases)$/i).click();
  await page.waitForTimeout(250);
  await shootAll(page, `${prefix}-goals`);
  await answerCareSteps(dialog);
  await next(dialog);
  await page.waitForTimeout(400);
  // Feeding and Medication, where the facility has them on for training.
  await toConfirm(page, dialog, prefix);
}

/** Staff: Alice and Buddy, then training. */
async function staffTraining(page: Page) {
  await page.goto("/facility/dashboard");
  await page
    .locator("#facility-create-new-trigger")
    .filter({ visible: true })
    .first()
    .click({ timeout: 90_000 });
  await page.getByRole("menuitem", { name: /new booking/i }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("searchbox").fill("Alice");
  await dialog
    .getByRole("button", { name: /^Alice/ })
    .first()
    .click();
  await choosePet(dialog, /Buddy/);
  await next(dialog);
  await dialog
    .getByText(/^(training|dressage)$/i)
    .first()
    .click();
  await next(dialog);
  await page.waitForTimeout(600);
  return dialog;
}

test("the staff portal: a private lesson pack to done", async ({ page }) => {
  test.setTimeout(20 * 60 * 1000);
  mkdirSync(OUT, { recursive: true });
  await page.setViewportSize(WIDTHS[0]);
  await signIn(page, ACCOUNTS.owner);
  await interceptSave(page);
  const dialog = await staffTraining(page);
  await trainingDetails(page, dialog, "facility-training", {
    program: /private lesson/i,
    pack: /3-session pack/i,
  });
  await page.waitForTimeout(600);
  await shootAll(page, "facility-training-confirm");
  await shootEnd(page, "facility-training-confirm");
  await dialog
    .getByRole("button", { name: /^create (booking|as pending)$/i })
    .click();
  await expect(
    dialog.getByRole("button", { name: /^start another booking$/i }),
  ).toBeVisible({ timeout: 60_000 });
  await shootAll(page, "facility-training-done");
});

test("the staff portal: a group class to done", async ({ page }) => {
  test.setTimeout(20 * 60 * 1000);
  mkdirSync(OUT, { recursive: true });
  await page.setViewportSize(WIDTHS[0]);
  await signIn(page, ACCOUNTS.owner);
  await interceptSave(page);
  const dialog = await staffTraining(page);
  await trainingDetails(page, dialog, "facility-training-group", {
    program: /group class/i,
    spots: /6 of 6/i,
  });
  await page.waitForTimeout(600);
  await shootAll(page, "facility-training-group-confirm");
  await shootEnd(page, "facility-training-group-confirm");
  await dialog
    .getByRole("button", { name: /^create (booking|as pending)$/i })
    .click();
  await expect(
    dialog.getByRole("button", { name: /^start another booking$/i }),
  ).toBeVisible({ timeout: 60_000 });
  await shootAll(page, "facility-training-group-done");
});

for (const [name, plan, prefix] of [
  [
    "a private lesson pack",
    { program: /private lesson/i, pack: /3-session pack/i },
    "customer-training",
  ],
  [
    "a group class",
    { program: /group class/i, spots: /6 of 6/i },
    "customer-training-group",
  ],
] as const) {
  test(`the customer portal: ${name} to request sent`, async ({ page }) => {
    test.setTimeout(20 * 60 * 1000);
    mkdirSync(OUT, { recursive: true });
    await page.setViewportSize(WIDTHS[0]);
    await signIn(page, ACCOUNTS.customer);
    await interceptSave(page);
    await page.goto("/customer/bookings/new");
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible({ timeout: 90_000 });
    await page.waitForTimeout(1500);
    await choosePet(dialog, /Buddy/);
    await next(dialog);
    await dialog
      .getByText(/^(training|dressage)$/i)
      .first()
      .click();
    await next(dialog);
    await page.waitForTimeout(600);
    await trainingDetails(page, dialog, prefix, plan);
    await page.waitForTimeout(600);
    await shootAll(page, `${prefix}-confirm`);
  });
}

test("the staff portal: search to done", async ({ page }) => {
  test.setTimeout(20 * 60 * 1000);
  mkdirSync(OUT, { recursive: true });
  await page.setViewportSize(WIDTHS[0]);
  await signIn(page, ACCOUNTS.owner);
  await interceptSave(page);

  await page.goto("/facility/dashboard");
  await page
    .locator("#facility-create-new-trigger")
    .filter({ visible: true })
    .first()
    .click({ timeout: 90_000 });
  await page.getByRole("menuitem", { name: /new booking/i }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await page.waitForTimeout(800);
  await shootAll(page, "facility-boarding-search");

  await dialog.getByRole("searchbox").fill("Alice");
  await page.waitForTimeout(800);
  await shootAll(page, "facility-boarding-search-results");
  await dialog
    .getByRole("button", { name: /^Alice/ })
    .first()
    .click();
  await page.waitForTimeout(600);
  await choosePet(dialog, /Buddy/);
  // Two dogs, as the mock's Bubu and Mango: pet tabs and "share a room".
  await choosePet(dialog, /Daisy/);
  await shootAll(page, "facility-boarding-client");

  await next(dialog);
  await shootAll(page, "facility-boarding-service");
  await dialog
    .getByText(/^(boarding|pension|hébergement)$/i)
    .first()
    .click();
  await next(dialog);
  await page.waitForTimeout(600);
  await shootAll(page, "facility-boarding-schedule-empty");
  await pickStay(dialog);
  await page.waitForTimeout(400);
  await toConfirm(page, dialog, "facility-boarding");
  await page.waitForTimeout(600);
  await shootAll(page, "facility-boarding-confirm");
  await shootEnd(page, "facility-boarding-confirm");
  // The deposit row, mid-checklist: amount, rule, card, link, later.
  await dialog
    .getByText(/^deposit ·/i)
    .first()
    .scrollIntoViewIfNeeded()
    .catch(() => undefined);
  await page.waitForTimeout(300);
  await page.screenshot({
    path: `${OUT}/facility-boarding-confirm-deposit-1280.png`,
  });

  await dialog
    .getByRole("button", { name: /^create (booking|as pending)$/i })
    .click();
  await expect(
    dialog.getByRole("button", { name: /^start another booking$/i }),
  ).toBeVisible({ timeout: 60_000 });
  await shootAll(page, "facility-boarding-done");
});

test("the staff portal: grooming to done", async ({ page }) => {
  test.setTimeout(20 * 60 * 1000);
  mkdirSync(OUT, { recursive: true });
  await page.setViewportSize(WIDTHS[0]);
  await signIn(page, ACCOUNTS.owner);
  await interceptSave(page);

  await page.goto("/facility/dashboard");
  await page
    .locator("#facility-create-new-trigger")
    .filter({ visible: true })
    .first()
    .click({ timeout: 90_000 });
  await page.getByRole("menuitem", { name: /new booking/i }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("searchbox").fill("Alice");
  await dialog
    .getByRole("button", { name: /^Alice/ })
    .first()
    .click();
  await choosePet(dialog, /Buddy/);
  await choosePet(dialog, /Daisy/);
  await next(dialog);
  await dialog
    .getByText(/^(grooming|toilettage)$/i)
    .first()
    .click();
  await next(dialog);
  await page.waitForTimeout(600);
  await toConfirm(page, dialog, "facility-grooming");
  await page.waitForTimeout(600);
  await shootAll(page, "facility-grooming-confirm");
  await shootEnd(page, "facility-grooming-confirm");

  await dialog
    .getByRole("button", { name: /^create (booking|as pending)$/i })
    .click();
  await expect(
    dialog.getByRole("button", { name: /^start another booking$/i }),
  ).toBeVisible({ timeout: 60_000 });
  await shootAll(page, "facility-grooming-done");
});

/** A Tuesday and the Wednesday after it, next month (daycare is open then). */
function nextMonthTuesdayAndWednesday(): [number, number] {
  const now = new Date();
  for (let d = 1; d <= 7; d += 1) {
    const day = new Date(now.getFullYear(), now.getMonth() + 1, d);
    if (day.getDay() === 2) return [d, d + 1];
  }
  return [2, 3];
}

test("the staff portal: daycare to Confirm and done", async ({ page }) => {
  test.setTimeout(20 * 60 * 1000);
  mkdirSync(OUT, { recursive: true });
  await page.setViewportSize(WIDTHS[0]);
  await signIn(page, ACCOUNTS.owner);
  await interceptSave(page);

  await page.goto("/facility/dashboard");
  await page
    .locator("#facility-create-new-trigger")
    .filter({ visible: true })
    .first()
    .click({ timeout: 90_000 });
  await page.getByRole("menuitem", { name: /new booking/i }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("searchbox").fill("Alice");
  await dialog
    .getByRole("button", { name: /^Alice/ })
    .first()
    .click();
  await choosePet(dialog, /Buddy/);
  await next(dialog);
  await dialog
    .getByText(/daycare/i)
    .first()
    .click();
  await next(dialog);
  await dialog.getByRole("button", { name: "Next month" }).first().click();
  const [first, second] = nextMonthTuesdayAndWednesday();
  await dialog
    .getByRole("button", { name: String(first), exact: true })
    .click();
  await dialog
    .getByRole("button", { name: String(second), exact: true })
    .click();
  await dialog
    .getByRole("button", { name: /full day/i })
    .first()
    .click();
  await shootAll(page, "facility-daycare-schedule");
  await next(dialog);
  await toConfirm(page, dialog, "facility-daycare");
  await page.waitForTimeout(600);
  await shootAll(page, "facility-daycare-confirm");
  await shootEnd(page, "facility-daycare-confirm");

  await dialog
    .getByRole("button", { name: /^create (booking|as pending)$/i })
    .click();
  await expect(
    dialog.getByRole("button", { name: /^start another booking$/i }),
  ).toBeVisible({ timeout: 60_000 });
  await shootAll(page, "facility-daycare-done");
});

test("the customer portal: pets to request sent", async ({ page }) => {
  test.setTimeout(20 * 60 * 1000);
  mkdirSync(OUT, { recursive: true });
  await page.setViewportSize(WIDTHS[0]);
  await signIn(page, ACCOUNTS.customer);
  await interceptSave(page);

  await page.goto("/customer/bookings/new");
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible({ timeout: 90_000 });
  await page.waitForTimeout(1500);
  await shootAll(page, "customer-boarding-search");
  await choosePet(dialog, /Buddy/);
  await choosePet(dialog, /Daisy/);
  await shootAll(page, "customer-boarding-client");
  await next(dialog);
  await shootAll(page, "customer-boarding-service");
  await dialog
    .getByText(/^(boarding|pension|hébergement)$/i)
    .first()
    .click();
  await next(dialog);
  await page.waitForTimeout(600);
  await pickStay(dialog);
  await toConfirm(page, dialog, "customer-boarding");
  await page.waitForTimeout(600);
  await shootAll(page, "customer-boarding-confirm");
  await shootEnd(page, "customer-boarding-confirm");

  await signAgreements(page, dialog);
  await customerSubmit(dialog).click();
  await expect(
    dialog.getByRole("button", { name: /^start another booking$/i }),
  ).toBeVisible({ timeout: 60_000 });
  await shootAll(page, "customer-boarding-done");
});

test("the customer portal: daycare to request sent", async ({ page }) => {
  test.setTimeout(20 * 60 * 1000);
  mkdirSync(OUT, { recursive: true });
  await page.setViewportSize(WIDTHS[0]);
  await signIn(page, ACCOUNTS.customer);
  await interceptSave(page);

  await page.goto("/customer/bookings/new");
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible({ timeout: 90_000 });
  await page.waitForTimeout(1500);
  // Buddy is evaluated, so daycare is open to him.
  await choosePet(dialog, /Buddy/);
  await next(dialog);
  await dialog
    .getByText(/^(daycare|garderie)$/i)
    .first()
    .click();
  await next(dialog);
  await page.waitForTimeout(600);
  await dialog.getByRole("button", { name: "Next month" }).first().click();
  const [first, second] = nextMonthTuesdayAndWednesday();
  await dialog
    .getByRole("button", { name: String(first), exact: true })
    .click();
  await dialog
    .getByRole("button", { name: String(second), exact: true })
    .click();
  await dialog
    .getByRole("button", { name: /full day|journée complète/i })
    .first()
    .click();
  await shootAll(page, "customer-daycare-schedule");
  await next(dialog);
  await toConfirm(page, dialog, "customer-daycare");
  await page.waitForTimeout(600);
  await shootAll(page, "customer-daycare-confirm");

  await signAgreements(page, dialog);
  await customerSubmit(dialog).click();
  await expect(
    dialog.getByRole("button", { name: /^start another booking$/i }),
  ).toBeVisible({ timeout: 60_000 });
  await shootAll(page, "customer-daycare-done");
});

test("the customer portal: grooming to request sent", async ({ page }) => {
  test.setTimeout(20 * 60 * 1000);
  mkdirSync(OUT, { recursive: true });
  await page.setViewportSize(WIDTHS[0]);
  await signIn(page, ACCOUNTS.customer);
  await interceptSave(page);

  await page.goto("/customer/bookings/new");
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible({ timeout: 90_000 });
  await page.waitForTimeout(1500);
  await choosePet(dialog, /Buddy/);
  await choosePet(dialog, /Daisy/);
  await next(dialog);
  await dialog
    .getByText(/^(grooming|toilettage)$/i)
    .first()
    .click();
  await next(dialog);
  await page.waitForTimeout(600);
  await toConfirm(page, dialog, "customer-grooming");
  await page.waitForTimeout(600);
  await shootAll(page, "customer-grooming-confirm");
});
