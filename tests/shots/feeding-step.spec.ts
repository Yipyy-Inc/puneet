import { mkdirSync } from "node:fs";

import { test, expect, type Locator, type Page } from "@playwright/test";

import { ACCOUNTS, signIn } from "../e2e/_auth";
import { shootWholeDialog } from "./_whole-dialog";

// ============================================================================
// PHOTOGRAPH THE FEEDING STEP (2026-10-01).
//
// The client's page (docs/Feeding_Step.html) in Yipyy's design: the step
// empty, a plan with the owner's kibble in labelled bags and the facility's
// house kibble at dinner, the stay's meals and packing list in the rail — and
// below 1024px, where there is no rail, after the plan. Then the setting
// under Care tasks that decides what the step shows and what house food the
// facility provides.
//
// WRITES the demo facility's `feeding_instructions` (house kibble at $3.50 a
// meal) and puts the stored value back in a `finally`. Creates no booking.
//
// WHAT TO LOOK FOR IN THE FILES (feeding-*):
//   · placement as the client's page has it: header and step count, pet tabs,
//     the plan's four sections, each food's card, the summary boxes;
//   · Yipyy's own controls and tokens — 2px rings, no tints, pills;
//   · nothing clipped at 599, nothing English in the French ones.
//
//   E2E_BASE_URL=http://localhost:3111 bun run local node \
//     node_modules/@playwright/test/cli.js test \
//     --config=playwright.shots.config.ts --project=light feeding-step
// ============================================================================

test.use({ actionTimeout: 30_000 });

const OUT = "C:/tmp/pwv/shots";
const ALICE = 15;
const BUDDY = 1;

async function language(page: Page, lang: "en" | "fr") {
  const host = new URL(page.url()).hostname;
  await page.context().addCookies([
    { name: "APP_LANG_PRIMARY", value: lang, domain: host, path: "/" },
    { name: "NEXT_LOCALE", value: lang, domain: host, path: "/" },
  ]);
}

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

/** A pill or a segment, by its input's value — the same in any language. */
async function pick(scope: Locator, value: string, name?: string) {
  const input = name
    ? `input[name="${name}"][value="${value}"]`
    : `input[value="${value}"]`;
  await scope.locator(`label:has(${input})`).first().click();
}

async function toFeeding(page: Page): Promise<Locator> {
  await page.goto(`/facility/dashboard/clients/${ALICE}`);
  await page
    .getByRole("button", { name: /^(book|réserver)$/i })
    .first()
    .click({ timeout: 90_000 });
  const dialog = page.getByRole("dialog");
  const next = () =>
    dialog.getByRole("button", { name: /^(next|suivant)$/i }).click();
  await dialog.getByText("Buddy", { exact: true }).first().click();
  await next();
  await dialog
    .getByText(/boarding|pension|hébergement/i)
    .first()
    .click();
  await next();
  for (let i = 0; i < 4; i += 1) {
    await dialog
      .getByRole("button", { name: /^(next month|mois suivant)$/i })
      .first()
      .click();
  }
  // At 599px the date picker's month and year bar sits over its days, so
  // the days are clicked as events rather than by pointer.
  const monday = firstMonday(4) + 7;
  await dialog
    .getByRole("button", { name: String(monday), exact: true })
    .dispatchEvent("click");
  await dialog
    .getByRole("button", { name: String(monday + 4), exact: true })
    .dispatchEvent("click");
  await next();
  await dialog.getByText("Condominium", { exact: true }).first().click();
  const heading = dialog.getByRole("heading", {
    name: /^(feeding|alimentation)$/i,
  });
  for (let i = 0; i < 5 && !(await heading.isVisible()); i += 1) {
    await next();
  }
  await expect(heading).toBeVisible();
  return dialog;
}

async function shoot(page: Page, name: string) {
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${OUT}/feeding-${name}.png` });
}

test("the Feeding step and its setting", async ({ page }) => {
  test.setTimeout(15 * 60 * 1000);
  mkdirSync(OUT, { recursive: true });

  await signIn(page, ACCOUNTS.owner);
  const read = await page.request.get("/api/facility/settings");
  expect(read.ok()).toBe(true);
  const stored = (
    (await read.json()) as Record<string, { value: Record<string, unknown> }>
  ).feeding_instructions.value;
  const write = (value: unknown) =>
    page.request.patch("/api/facility/settings", {
      data: { domain: "feeding_instructions", value },
    });
  expect(
    (
      await write({
        ...stored,
        // House food as the settings page has saved it since 2026-10-01: on,
        // priced per meal, with the foods it offers.
        house: {
          on: true,
          pricing: "meal",
          foods: [
            {
              id: "hf-shots-kibble",
              name: "House kibble",
              description: "Adult, chicken & rice",
              type: "kibble",
              unit: "cup",
              pricePerMeal: 3.5,
              pricePerDay: 8,
              on: true,
            },
            {
              id: "hf-shots-wet",
              name: "Canned wet food",
              description: "Chicken pâté, 13 oz can",
              type: "wet",
              unit: "can",
              pricePerMeal: 2.5,
              pricePerDay: 6,
              on: true,
            },
          ],
        },
      })
    ).ok(),
  ).toBe(true);
  // Buddy's profile would start the step with a plan; the shots start empty.
  const profile = await page.request.get(`/api/pets?clientRef=${ALICE}`);
  const pets = (await profile.json()) as Array<{
    id: number;
    feedingPlan?: unknown;
  }>;
  const savedPlan = Array.isArray(pets)
    ? (pets.find((pet) => pet.id === BUDDY)?.feedingPlan ?? null)
    : null;
  await page.request.patch(`/api/pets/${BUDDY}`, {
    data: { feedingPlan: null },
  });

  try {
    for (const lang of ["en", "fr"] as const) {
      await language(page, lang);
      for (const width of [1440, 599]) {
        await page.setViewportSize({ width, height: 2600 });
        const dialog = await toFeeding(page);
        await shoot(page, `${lang}-${width}-empty`);

        await dialog
          .getByRole("button", {
            name: /^(add feeding plan|ajouter un plan d’alimentation)$/i,
          })
          .click();
        await dialog.locator("#feed-brand-0").fill("Orijen Original");
        await pick(dialog, "serve_dry");
        await shoot(page, `${lang}-${width}-plan`);

        // A second food: the house kibble, at dinner, which staff may waive.
        await dialog
          .getByRole("button", { name: /topper|garniture/i })
          .last()
          .click();
        await pick(dialog, "house", "feed-source-1");
        // The second food's "Served at" — the meal times and the first food
        // have a Dinner of their own.
        await dialog
          .locator(
            '[aria-labelledby="feed-served-1"] label:has(input[value="dinner"])',
          )
          .click();
        await pick(dialog, "feed_alone");
        await pick(dialog, "eats_fast");
        await pick(dialog, "Beef");
        await shoot(page, `${lang}-${width}-house`);
        if (width === 1440) {
          await shootWholeDialog(
            page,
            `${OUT}/feeding-${lang}-${width}-house-whole.png`,
          );
        }
      }
    }

    // The setting has its own page and its own shots since 2026-10-01:
    // feeding-medications-settings.spec.ts.
  } finally {
    await language(page, "en");
    await write(stored);
    await page.request.patch(`/api/pets/${BUDDY}`, {
      data: { feedingPlan: savedPlan },
    });
  }
});
