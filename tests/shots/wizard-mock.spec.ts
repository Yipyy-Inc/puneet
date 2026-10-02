import { test } from "@playwright/test";
import { pathToFileURL } from "node:url";

import {
  MOCK_DEVICES,
  MOCK_SCREENS,
  presetName,
  writeMockVariant,
} from "./_mock-presets";

// ============================================================================
// The mock's side of the booking-flow comparison: every screen of the client's
// mock, both portals, at the mock's own three widths. Nothing here needs the
// app — the mock is a self-contained page — so it runs without a server:
//
//   node node_modules/@playwright/test/cli.js test \
//     --config=playwright.shots.config.ts --project=light wizard-mock
//
// Files land in C:/tmp/pwv/shots/wizard/mock/<name>-<width>.png, beside the
// app's own shots (wizard-ours.spec.ts) for a side-by-side read.
// ============================================================================

const OUT = "C:/tmp/pwv/shots/wizard";
const VARIANTS = "C:/tmp/pwv/mock-variants";

test.describe.configure({ mode: "serial" });

for (const preset of MOCK_SCREENS) {
  test(`mock ${presetName(preset)}`, async ({ page }) => {
    const file = writeMockVariant(preset, VARIANTS);
    for (const device of MOCK_DEVICES) {
      await page.setViewportSize({
        width: device.width,
        height: device.height,
      });
      await page.goto(pathToFileURL(file).href);
      // The bundle unpacks itself, swaps the document, then the mock's own
      // runtime renders; its footer is the last thing on every screen.
      await page.waitForSelector("#__bundler_loading", {
        state: "detached",
        timeout: 30_000,
      });
      await page.waitForSelector("footer", { timeout: 30_000 });
      await page.waitForTimeout(300);
      await page.screenshot({
        path: `${OUT}/mock/${presetName(preset)}-${device.width}.png`,
      });
    }
  });
}
