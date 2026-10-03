import { mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

import { test } from "@playwright/test";

// ============================================================================
// The mocks' side of the care comparison: the client's Feeding step,
// Medication step and their setup page, at desktop and phone. Like
// wizard-mock, nothing here needs the app — each mock is a self-contained
// page — so it runs without a server:
//
//   node node_modules/@playwright/test/cli.js test \
//     --config=playwright.shots.config.ts --project=light care-mock
//
// Files land in C:/tmp/pwv/shots/care-mocks/<name>-<width>.png. The app's
// side is feeding-step, medications-step and feeding-medications-settings.
// ============================================================================

const OUT = "C:/tmp/pwv/shots/care-mocks";
const MOCKS = [
  ["feeding", "docs/Feeding_Step.html"],
  ["medications", "docs/Medications_Step.html"],
  ["care-setup", "docs/Medication_and_Feeding_Instructions_setup_page_.html"],
] as const;

for (const [name, file] of MOCKS) {
  test(`mock ${name}`, async ({ page }) => {
    mkdirSync(OUT, { recursive: true });
    for (const width of [1280, 390]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(pathToFileURL(resolve(file)).href);
      // The bundle unpacks itself; its loading screen leaves when it is done.
      await page.waitForSelector("#__bundler_loading", {
        state: "detached",
        timeout: 30_000,
      });
      await page.waitForTimeout(1200);
      await page.screenshot({
        path: `${OUT}/${name}-${width}.png`,
        fullPage: true,
      });
    }
  });
}
