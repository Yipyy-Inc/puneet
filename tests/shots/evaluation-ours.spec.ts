import { mkdirSync } from "node:fs";

import { test, type Page } from "@playwright/test";

import { ACCOUNTS, signIn } from "../e2e/_auth";

// ============================================================================
// PHOTOGRAPH OUR OPERATIONS › EVALUATIONS, screen by screen, for the
// comparison with the client's mock (evaluation-mock.spec.ts photographs that
// side, 2026-10-02). Same names in two folders, at the mock's widths and at
// 599:
//
//   C:/tmp/pwv/shots/evaluation/mock/   the client's page
//   C:/tmp/pwv/shots/evaluation/ours/   this
//
// LOCAL ONLY: it reads the local copy seeded with the mock's pets
// (SEED-evaluations-shots.sql in the session scratchpad), and "Start
// evaluation" writes an evaluation row there.
//
//   E2E_BASE_URL=http://localhost:3100 bun run local node \
//     node_modules/@playwright/test/cli.js test \
//     --config=playwright.shots.config.ts --project=light evaluation-ours
// ============================================================================

test.use({ actionTimeout: 30_000 });

const OUT = "C:/tmp/pwv/shots/evaluation/ours";
const WIDTHS = [
  { width: 1280, height: 900 },
  { width: 834, height: 1112 },
  { width: 599, height: 900 },
  { width: 390, height: 844 },
] as const;

function reportErrors(page: Page) {
  page.on("pageerror", (error) => console.log(`[pageerror] ${error.message}`));
  page.on("console", (message) => {
    if (message.type() === "error") {
      console.log(`[console] ${message.text().slice(0, 400)}`);
    }
  });
}

async function shoot(page: Page, name: string) {
  for (const size of WIDTHS) {
    await page.setViewportSize(size);
    await page.waitForTimeout(500);
    await page.screenshot({ path: `${OUT}/${name}-${size.width}.png` });
  }
  await page.setViewportSize(WIDTHS[0]);
  await page.waitForTimeout(250);
}

test("operations › evaluations, as the mock shows it", async ({ page }) => {
  mkdirSync(OUT, { recursive: true });
  reportErrors(page);
  await signIn(page, ACCOUNTS.owner);

  await page.goto("/facility/dashboard/evaluations");
  await page.getByText("Buddy").first().waitFor();
  await shoot(page, "module-today");

  await page.getByRole("button", { name: /Report cards to review/ }).click();
  await page.getByText("Waiting for review").waitFor();
  await shoot(page, "module-review");

  await page.getByRole("button", { name: /All evaluations/ }).click();
  await page.waitForTimeout(800);
  await shoot(page, "module-all");

  await page
    .getByRole("button", { name: /^Setup/ })
    .first()
    .click();
  await page.getByText("Report card delivery").waitFor();
  await shoot(page, "module-setup");

  await page.getByRole("button", { name: /Edit questions/ }).click();
  await page.getByText("Evaluation questions").waitFor();
  await shoot(page, "module-questions");
  await page.getByRole("button", { name: "Cancel" }).click();

  // The evaluator's form, on Buddy.
  await page.getByRole("button", { name: /^Today/ }).click();
  await page.getByRole("button", { name: /Buddy's evaluation/ }).click();
  await page
    .getByRole("dialog")
    .getByText("Friendly with other dogs?")
    .waitFor();
  await shoot(page, "module-eval-temperament");
  for (const [step, name] of [
    ["Play profile", "module-eval-play"],
    ["Behavior & notes", "module-eval-behavior"],
    ["Result", "module-eval-result"],
  ] as const) {
    await page.getByRole("dialog").getByRole("button", { name: step }).click();
    await page.waitForTimeout(400);
    await shoot(page, name);
  }
  // Discard asks first (§5j) — and Cancel leaves the evaluation as it was.
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Discard" })
    .click();
  await page.getByRole("alertdialog").waitFor();
  await shoot(page, "module-eval-discard");
  await page
    .getByRole("alertdialog")
    .getByRole("button", { name: "Cancel" })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Close" })
    .first()
    .click();

  // The reviewer's dialog, on Rex.
  await page.getByRole("button", { name: /Report cards to review/ }).click();
  await page.getByRole("button", { name: /Review Rex's report card/ }).click();
  await page.getByRole("dialog").getByText("Before you send").waitFor();
  await shoot(page, "module-review-card");
});

// ── The booking side: the wizard on an evaluation, and Settings ────────────

/** Answers the booking POST with booking #94612; nothing is written. */
async function interceptBooking(page: Page) {
  await page.route("**/api/bookings", async (route) => {
    if (route.request().method() !== "POST") return route.continue();
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

async function shootWizard(page: Page, name: string) {
  await page
    .locator("[data-wizard-body]")
    .evaluate((el) => el.scrollTo(0, 0))
    .catch(() => undefined);
  await shoot(page, name);
}

/** The first start the shown day offers, from its Morning or Afternoon times. */
async function pickFirstStart(page: Page) {
  const time = page
    .getByRole("dialog")
    .getByRole("radiogroup", {
      name: /morning|afternoon|evening|matin|après-midi|soir/i,
    })
    .locator('button[role="radio"]:not([disabled])')
    .first();
  await time.waitFor({ timeout: 60_000 });
  await time.click();
  await page.waitForTimeout(300);
}

const nextStep = (page: Page) =>
  page
    .getByRole("dialog")
    .getByRole("button", { name: /^(next|continue|suivant|continuer)$/i })
    .click();

test("the staff wizard on an evaluation, and its settings", async ({
  page,
}) => {
  test.setTimeout(10 * 60 * 1000);
  mkdirSync(OUT, { recursive: true });
  reportErrors(page);
  await signIn(page, ACCOUNTS.owner);
  await interceptBooking(page);

  await page.goto("/facility/dashboard/settings/evaluations");
  await page.getByText(/How do you offer evaluations/i).waitFor();
  await page.waitForTimeout(800);
  await shoot(page, "settings");

  await page.goto("/facility/dashboard");
  await page
    .locator("#facility-create-new-trigger")
    .filter({ visible: true })
    .first()
    .click({ timeout: 90_000 });
  await page.getByRole("menuitem", { name: /new booking/i }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("searchbox").fill("Alice Johnson");
  await dialog
    .getByRole("button", { name: /^Alice Johnson/ })
    .first()
    .click();
  const buddy = dialog.getByRole("checkbox", { name: /Buddy/ }).first();
  if ((await buddy.getAttribute("aria-checked")) !== "true")
    await buddy.click();
  await shootWizard(page, "facility-pets");
  await nextStep(page);
  // The card whose kind reads "Evaluation" — not the "Evaluation required"
  // chip on a service it unlocks.
  await dialog
    .getByText(/^evaluation$/i)
    .first()
    .click();
  await shootWizard(page, "facility-service");
  await nextStep(page);
  await page.waitForTimeout(1200);
  await shootWizard(page, "facility-time");
  await pickFirstStart(page);
  await shootWizard(page, "facility-time-picked");
  await nextStep(page);
  await page.waitForTimeout(1200);
  await shootWizard(page, "facility-review");
  await dialog
    .getByRole("button", { name: /^(book evaluation|create as pending)/i })
    .click();
  await page.waitForTimeout(1500);
  await shootWizard(page, "facility-done");
});

test("the customer wizard on an evaluation", async ({ page }) => {
  test.setTimeout(10 * 60 * 1000);
  mkdirSync(OUT, { recursive: true });
  reportErrors(page);
  await signIn(page, ACCOUNTS.customer);
  await interceptBooking(page);

  await page.goto("/customer/bookings/new");
  const dialog = page.getByRole("dialog");
  const pet = dialog.getByRole("checkbox").first();
  await pet.waitFor({ timeout: 90_000 });
  if ((await pet.getAttribute("aria-checked")) !== "true") await pet.click();
  await shootWizard(page, "customer-pets");
  await nextStep(page);
  // The card whose kind reads "Evaluation" — not the "Evaluation required"
  // chip on a service it unlocks.
  await dialog
    .getByText(/^evaluation$/i)
    .first()
    .click();
  await shootWizard(page, "customer-service");
  await nextStep(page);
  await page.waitForTimeout(1200);
  await shootWizard(page, "customer-time");
  await pickFirstStart(page);
  await shootWizard(page, "customer-time-picked");
  await nextStep(page);
  await page.waitForTimeout(800);
  await shootWizard(page, "customer-about");
  await nextStep(page);
  await page.waitForTimeout(1200);
  const agree = dialog.getByRole("checkbox", { name: /read and agree/i });
  if (await agree.isVisible().catch(() => false)) await agree.click();
  await shootWizard(page, "customer-review");
  await dialog
    .getByRole("button", { name: /^(send request|confirm booking)/i })
    .click();
  await page.waitForTimeout(1500);
  await shootWizard(page, "customer-done");
});

// ── In French: the longest strings, at every width ──────────────────────────

test("operations › evaluations in French", async ({ page }) => {
  test.setTimeout(10 * 60 * 1000);
  const out = "C:/tmp/pwv/shots/evaluation/fr";
  mkdirSync(out, { recursive: true });
  reportErrors(page);
  await signIn(page, ACCOUNTS.owner);
  const host = new URL(page.url()).hostname;
  await page.context().addCookies([
    { name: "APP_LANG_PRIMARY", value: "fr", domain: host, path: "/" },
    { name: "NEXT_LOCALE", value: "fr", domain: host, path: "/" },
  ]);
  const shootFr = async (name: string) => {
    for (const size of WIDTHS) {
      await page.setViewportSize(size);
      await page.waitForTimeout(500);
      await page.screenshot({ path: `${out}/${name}-${size.width}.png` });
    }
    await page.setViewportSize(WIDTHS[0]);
  };

  await page.goto("/facility/dashboard/evaluations");
  await page.getByText("Buddy").first().waitFor();
  await page.waitForTimeout(800);
  await shootFr("module-today");
  await page.getByRole("button", { name: /Bulletins à relire/ }).click();
  await page.waitForTimeout(600);
  await shootFr("module-review");
  await page
    .getByRole("button", { name: /^Configuration/ })
    .first()
    .click();
  await page.waitForTimeout(800);
  await shootFr("module-setup");
  await page.getByRole("button", { name: /Relire le bulletin de Rex/ }).count();
  await page.getByRole("button", { name: /Bulletins à relire/ }).click();
  await page.getByRole("button", { name: /Relire le bulletin de Rex/ }).click();
  await page.getByRole("dialog").getByText("Avant d’envoyer").waitFor();
  await shootFr("module-review-card");
});
