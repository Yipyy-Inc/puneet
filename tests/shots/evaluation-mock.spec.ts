import { test, type Page } from "@playwright/test";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";

// ============================================================================
// The mocks' side of the evaluations comparison (2026-10-02): every screen of
// the client's two evaluation mocks at the mocks' three widths.
//
//   docs/Yipyy_Evaluation_Booking.html   the wizard (facility · customer) and
//                                        Settings › Services › Evaluations
//   docs/Yipyy%2BEvaluations.html        Operations › Evaluations: Today,
//                                        review, all, setup, the evaluator
//
// Unlike the booking-flow mock these have no PRESET token: each is one
// stateful page, so the harness clicks its way to every screen. Nothing here
// needs the app, so it runs without a server:
//
//   node node_modules/@playwright/test/cli.js test \
//     --config=playwright.shots.config.ts --project=light evaluation-mock
//
// Files land in C:/tmp/pwv/shots/evaluation/mock/<name>-<width>.png, beside
// the app's own (evaluation-ours.spec.ts), same names, for a side-by-side
// read. NEVER open these mocks any other way than in a browser: they are
// 3.3 MB of bundled script each.
// ============================================================================

const OUT = "C:/tmp/pwv/shots/evaluation/mock";
const BOOKING = pathToFileURL(
  resolve("docs/Yipyy_Evaluation_Booking.html"),
).href;
const MODULE = pathToFileURL(resolve("docs/Yipyy%2BEvaluations.html")).href;

export const EVALUATION_WIDTHS = [
  { width: 1280, height: 900 },
  { width: 834, height: 1112 },
  { width: 390, height: 844 },
] as const;

test.describe.configure({ mode: "serial" });

async function open(page: Page, url: string, width: number, height: number) {
  await page.setViewportSize({ width, height });
  await page.goto(url);
  // The bundle unpacks itself, then the mock's runtime renders.
  await page.waitForSelector("#__bundler_loading", {
    state: "detached",
    timeout: 30_000,
  });
  await page.waitForTimeout(600);
}

const click = async (page: Page, text: string | RegExp) => {
  const target =
    typeof text === "string"
      ? page.getByText(text, { exact: true }).first()
      : page.locator("button", { hasText: text }).first();
  await target.click();
  await page.waitForTimeout(250);
};

const shoot = async (page: Page, name: string, width: number, full = false) =>
  page.screenshot({ path: `${OUT}/${name}-${width}.png`, fullPage: full });

const pickTime = async (page: Page) => {
  await page
    .locator("button", { hasText: /of \d+ left/ })
    .first()
    .click();
  await page.waitForTimeout(250);
};

for (const { width, height } of EVALUATION_WIDTHS) {
  test(`booking mock, customer · ${width}`, async ({ page }) => {
    await open(page, BOOKING, width, height);
    await click(page, "Customer · book online");
    await shoot(page, "customer-pets", width);
    await click(page, "Continue");
    await shoot(page, "customer-service", width);
    await click(page, "Continue");
    await shoot(page, "customer-time", width);
    await pickTime(page);
    await shoot(page, "customer-time-picked", width);
    await click(page, "Continue");
    await shoot(page, "customer-about", width);
    await click(page, "Continue");
    await page.getByText("I’ve read and agree").last().click();
    await shoot(page, "customer-review", width);
    await click(page, /^Send request|^Confirm booking/);
    await shoot(page, "customer-done", width);
  });

  test(`booking mock, facility · ${width}`, async ({ page }) => {
    await open(page, BOOKING, width, height);
    await click(page, "Facility · book for client");
    await shoot(page, "facility-client", width);
    await click(page, "Amélie Roy");
    await shoot(page, "facility-pets", width);
    await click(page, "Continue");
    await shoot(page, "facility-service", width);
    await click(page, "Continue");
    await pickTime(page);
    await shoot(page, "facility-time-picked", width);
    await click(page, "Continue");
    await shoot(page, "facility-review", width);
    await click(page, /^Book evaluation/);
    await shoot(page, "facility-done", width);
  });

  test(`booking mock, settings · ${width}`, async ({ page }) => {
    await open(page, BOOKING, width, height);
    await click(page, "Settings · evaluation setup");
    await shoot(page, "settings", width, true);
  });

  test(`module mock · ${width}`, async ({ page }) => {
    await open(page, MODULE, width, height);
    await shoot(page, "module-today", width, true);

    await click(page, /^Start evaluation$/);
    await shoot(page, "module-eval-temperament", width);
    await click(page, /Play profile/);
    await shoot(page, "module-eval-play", width);
    await click(page, /Behavior & notes/);
    await shoot(page, "module-eval-behavior", width);
    await click(page, /Result$/);
    await shoot(page, "module-eval-result", width);
    await page.keyboard.press("Escape");
    await page.locator("button:has(span:text-is('close'))").first().click();
    await page.waitForTimeout(250);

    await click(page, /Report cards to review/);
    await shoot(page, "module-review", width, true);
    await click(page, /^Review & send$/);
    await shoot(page, "module-review-card", width);
    await page.locator("button:has(span:text-is('close'))").first().click();
    await page.waitForTimeout(250);

    await click(page, /All evaluations/);
    await shoot(page, "module-all", width, true);
    await page
      .locator("button", { hasText: /^tuneSetup$/ })
      .last()
      .click();
    await page.waitForTimeout(250);
    await shoot(page, "module-setup", width, true);
    await click(page, /Edit questions/);
    await shoot(page, "module-questions", width);
  });
}
