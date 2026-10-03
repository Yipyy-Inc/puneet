import { mkdirSync } from "node:fs";

import { test, expect, type Locator, type Page } from "@playwright/test";

import { ACCOUNTS, signIn } from "../e2e/_auth";
import { shootWholeDialog } from "./_whole-dialog";

// ============================================================================
// PHOTOGRAPH THE MEDICATIONS STEP (2026-10-01).
//
// The client's page (docs/Medications_Step.html) in Yipyy's design: the step
// empty — boarding asks for an answer, so "takes no medication" is offered —
// the editor with a half tablet staff split, pill pockets the facility
// supplies, the pharmacy label confirmed and a photo of it, the saved cards
// with the vet and the stay's doses in the rail — and below 1024px, where
// there is no rail, under the step. The setting itself is photographed by
// feeding-medications-settings.spec.ts.
//
// WRITES the demo facility's `medication_instructions` (pill pockets sold at
// $0.75 a dose, a photo of the label asked for) and puts the stored value
// back in a `finally`. Creates no booking.
//
// WHAT TO LOOK FOR IN THE FILES (medications-*):
//   · placement as the client's page has it: header and step count, pet
//     tabs, cards, the editor's four sections, the footer hint and save;
//   · Yipyy's own controls and tokens — 2px rings, no tints, pills;
//   · nothing clipped at 599, nothing English in the French ones.
//
//   E2E_BASE_URL=http://localhost:3111 bun run local node \
//     node_modules/@playwright/test/cli.js test \
//     --config=playwright.shots.config.ts --project=light medications-step
// ============================================================================

test.use({ actionTimeout: 30_000 });

const OUT = "C:/tmp/pwv/shots";
const ALICE = 15;

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

async function toMedications(page: Page): Promise<Locator> {
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
    name: /^(medications|médicaments)$/i,
  });
  for (let i = 0; i < 5 && !(await heading.isVisible()); i += 1) {
    await next();
  }
  await expect(heading).toBeVisible();
  return dialog;
}

async function shoot(page: Page, name: string) {
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${OUT}/medications-${name}.png` });
}

test("the Medications step and its setting", async ({ page }) => {
  test.setTimeout(15 * 60 * 1000);
  mkdirSync(OUT, { recursive: true });

  await signIn(page, ACCOUNTS.owner);
  const read = await page.request.get("/api/facility/settings");
  expect(read.ok()).toBe(true);
  const stored = (
    (await read.json()) as Record<string, { value: Record<string, unknown> }>
  ).medication_instructions.value;
  const write = (value: unknown) =>
    page.request.patch("/api/facility/settings", {
      data: { domain: "medication_instructions", value },
    });
  expect(
    (
      await write({
        ...stored,
        methods: (stored.methods as Array<{ id: string }>).map((row) =>
          row.id === "pill_pocket"
            ? { ...row, sell: true, price: 0.75, per: "dose" }
            : row,
        ),
        rules: { ...(stored.rules as object), photo: true },
      })
    ).ok(),
  ).toBe(true);

  try {
    for (const lang of ["en", "fr"] as const) {
      await language(page, lang);
      for (const width of [1440, 599]) {
        await page.setViewportSize({ width, height: 2200 });
        const dialog = await toMedications(page);
        await shoot(page, `${lang}-${width}-empty`);

        await dialog
          .getByRole("button", {
            name: /^(add medication|ajouter un médicament)$/i,
          })
          .click();
        await dialog.locator("#meds-name").fill("Apoquel");
        await dialog.locator("#meds-strength").fill("16 mg");
        await pick(dialog, "0.5", "meds-preset");
        await pick(dialog, "staff", "meds-split");
        await pick(dialog, "evening");
        await pick(dialog, "pill_pocket", "meds-method");
        await dialog
          .locator('button[role="radio"][data-value="facility"]')
          .click();
        await dialog.locator("#meds-supply").fill("3");
        await shoot(page, `${lang}-${width}-editor`);
        if (width === 1440) {
          await shootWholeDialog(
            page,
            `${OUT}/medications-${lang}-${width}-editor-whole.png`,
          );
        }
        await dialog.locator("#meds-label-confirmed").click();
        await dialog.locator('input[type="file"]').setInputFiles({
          name: "apoquel-label.png",
          mimeType: "image/png",
          buffer: Buffer.from(
            "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=",
            "base64",
          ),
        });
        await shoot(page, `${lang}-${width}-label`);

        await dialog
          .getByRole("button", {
            name: /^(save medication|enregistrer le médicament)$/i,
          })
          .click();
        await shoot(page, `${lang}-${width}-saved`);

        // A capsule's note, then an eye drop and its side.
        await dialog
          .getByRole("button", { name: /buddy/i })
          .filter({ hasText: /another|autre/i })
          .click();
        await dialog.locator("#meds-name").fill("Optimmune");
        await pick(dialog, "capsule", "meds-form");
        await shoot(page, `${lang}-${width}-capsule`);
        await pick(dialog, "drops", "meds-form");
        await pick(dialog, "eye", "meds-method");
        await pick(dialog, "left", "meds-side");
        await shoot(page, `${lang}-${width}-drops`);
      }
    }
  } finally {
    await language(page, "en");
    await write(stored);
  }
});
