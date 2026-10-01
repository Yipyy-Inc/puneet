import { test, expect, type Page } from "@playwright/test";

import { ACCOUNTS, signIn } from "./_auth";
import { withoutTestItems } from "./_settings-snapshot";

// ============================================================================
// SETTINGS › SERVICES › FEEDING & MEDICATIONS, END TO END (2026-10-01).
//
// The client's page: where the booking form's Feeding and Medications steps
// appear and whether they must be answered, the times they offer, the kinds
// of food and medication taken, house food, packing, the quick picks, the
// fees, the ways of giving a medication and what the facility sells, and the
// safety rules — in two tabs, one save bar, each card saying when it differs
// from its defaults and resetting to them.
//
// ── WHAT THIS PINS ────────────────────────────────────────────────────────
//
// F1  The Feeding tab saves: a step made required, a meal time renamed, one
//     added — removed and put back with Undo — and a section reset to its
//     defaults keeps what the facility added.
// M1  The Medications tab saves: a fee per dose, a way of giving the
//     facility adds and sells, a safety rule; a customer's form reads it.
// B1  One Save writes both tabs.
// C1  Care tasks, where the options used to be, sends the reader here.
//
// ── IT CLEANS UP ──────────────────────────────────────────────────────────
//
// Both settings go back as they were, whatever happened — the copy cleaned
// of anything a crashed run of a spec left in it (_settings-snapshot.ts).
// What it adds is named "[e2e] …" — short, as a name field holds 40 — so
// a crashed run's leftovers are cleaned the same way.
// ============================================================================

const SETTINGS = "/api/facility/settings";
const PAGE = "/facility/dashboard/settings/feeding-medications";
const DOMAINS = ["feeding_instructions", "medication_instructions"] as const;
const SECOND_LUNCH = "[e2e] Second lunch";
const PILL_GUN = "[e2e] Pill gun";

test.use({ actionTimeout: 20_000 });

type Setting = { value: unknown; configured: boolean };

const prior: Partial<Record<(typeof DOMAINS)[number], unknown>> = {};

async function settings(page: Page): Promise<Record<string, Setting>> {
  const res = await page.request.get(SETTINGS);
  expect(res.ok(), await res.text()).toBe(true);
  return (await res.json()) as Record<string, Setting>;
}

async function stored<T>(page: Page, domain: string): Promise<T> {
  return (await settings(page))[domain]?.value as T;
}

async function open(page: Page) {
  await page.goto(PAGE);
  await expect(
    page.getByRole("heading", { name: "Feeding & medications" }),
  ).toBeVisible({ timeout: 60_000 });
}

function card(page: Page, title: string) {
  return page
    .locator("[data-slot='card']")
    .filter({ has: page.getByRole("heading", { name: title, exact: true }) });
}

async function save(page: Page, said: string) {
  await page.getByRole("button", { name: /save changes/i }).click();
  await expect(
    page.locator("[data-sonner-toast]").filter({ hasText: said }),
  ).toBeVisible();
}

test.beforeAll(async ({ browser }) => {
  const page = await browser.newPage();
  try {
    await signIn(page, ACCOUNTS.owner);
    const now = await settings(page);
    for (const domain of DOMAINS) {
      prior[domain] = withoutTestItems(now[domain]?.value);
    }
  } finally {
    await page.close();
  }
});

test.afterAll(async ({ browser }) => {
  const page = await browser.newPage();
  try {
    await signIn(page, ACCOUNTS.owner);
    for (const domain of DOMAINS) {
      if (prior[domain] === undefined) continue;
      const res = await page.request.patch(SETTINGS, {
        data: { domain, value: prior[domain] },
      });
      if (!res.ok()) {
        console.log(`restore ${domain}: ${res.status()} ${await res.text()}`);
      }
    }
  } finally {
    await page.close();
  }
});

test("F1 the Feeding tab saves, and a reset keeps what the facility added", async ({
  page,
}) => {
  test.setTimeout(4 * 60 * 1000);
  await signIn(page, ACCOUNTS.owner);
  await open(page);

  await expect(page.getByRole("tab", { name: "Feeding" })).toHaveAttribute(
    "aria-selected",
    "true",
  );
  const jump = page.getByRole("navigation", { name: "Jump to a section" });
  await expect(jump.getByRole("link", { name: "House food" })).toBeVisible();

  // Boarding's feeding step, required.
  const where = card(page, "Where feeding instructions appear");
  await where
    .getByRole("radiogroup", { name: "Optional or required for Boarding" })
    .locator("label", { hasText: "Required" })
    .click();
  await expect(
    where.getByRole("button", { name: "Reset to default" }),
  ).toBeVisible();

  // Lunch, renamed; a meal time of the facility's own, added.
  const meals = card(page, "Meal times");
  await meals.getByLabel("Name of time 2").fill("Midday meal");
  await meals.getByRole("button", { name: "Add meal time" }).click();
  await meals.getByLabel("Name of time 5").fill(SECOND_LUNCH);

  // Removed — and put back, with Undo.
  await meals.getByRole("button", { name: `Remove ${SECOND_LUNCH}` }).click();
  await expect(meals.getByLabel("Name of time 5")).toHaveCount(0);
  await page
    .locator("[data-sonner-toast]")
    .filter({ hasText: SECOND_LUNCH })
    .getByRole("button", { name: "Undo" })
    .click();
  await expect(meals.getByLabel("Name of time 5")).toHaveValue(SECOND_LUNCH);

  await save(page, "Feeding settings saved");

  type Feeding = {
    services: Record<string, string>;
    meals: Array<{ id: string; label?: string }>;
  };
  const saved = await stored<Feeding>(page, "feeding_instructions");
  expect(saved.services.boarding).toBe("required");
  expect(saved.meals).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ id: "lunch", label: "Midday meal" }),
      expect.objectContaining({ label: SECOND_LUNCH }),
    ]),
  );

  // Read back by the page.
  await page.reload();
  await expect(
    card(page, "Meal times").getByLabel("Name of time 2"),
  ).toHaveValue("Midday meal", { timeout: 60_000 });
  await expect(
    card(page, "Where feeding instructions appear")
      .getByRole("radiogroup", { name: "Optional or required for Boarding" })
      .getByRole("radio", { name: "Required" }),
  ).toBeChecked();

  // Reset to default: Lunch is Lunch again, and the facility's own stays.
  await card(page, "Meal times")
    .getByRole("button", { name: "Reset to default" })
    .click();
  await expect(
    card(page, "Meal times").getByLabel("Name of time 2"),
  ).toHaveValue("Lunch");
  await save(page, "Feeding settings saved");
  const reset = await stored<Feeding>(page, "feeding_instructions");
  expect(reset.meals.find((row) => row.id === "lunch")?.label).toBeUndefined();
  expect(reset.meals.some((row) => row.label === SECOND_LUNCH)).toBe(true);
});

test("M1 the Medications tab saves, and a customer's form reads it", async ({
  page,
}) => {
  test.setTimeout(4 * 60 * 1000);
  await signIn(page, ACCOUNTS.owner);
  await open(page);
  await page.getByRole("tab", { name: "Medications" }).click();

  // A fee per dose.
  const fees = card(page, "Medication fees");
  await fees.getByRole("radio", { name: /^Per dose/ }).click();
  const amount = fees.getByLabel("Administration fee amount");
  await amount.fill("2.50");
  await amount.blur();

  // A way of giving the facility adds, and sells.
  const methods = card(page, "How medication is given");
  await methods.getByLabel("New way of giving medication").fill(PILL_GUN);
  await methods.getByRole("button", { name: "Add method" }).click();
  await methods.getByRole("switch", { name: `We sell ${PILL_GUN}` }).click();
  const price = methods.getByLabel(`Price of ${PILL_GUN}`);
  await price.fill("0.60");
  await price.blur();

  // A photo of the label, asked for.
  await card(page, "Supply & safety rules")
    .getByRole("switch", { name: "Ask for a photo of the label" })
    .click();

  await save(page, "Medication settings saved");

  type Meds = {
    fee: { mode: string; amount: number };
    methods: Array<{
      id: string;
      label?: string;
      sell: boolean;
      price: number;
    }>;
    rules: { photo: boolean };
  };
  const saved = await stored<Meds>(page, "medication_instructions");
  expect(saved.fee).toMatchObject({ mode: "dose", amount: 2.5 });
  expect(saved.rules.photo).toBe(true);
  const gun = saved.methods.find((row) => row.label === PILL_GUN);
  expect(gun).toMatchObject({ sell: true, price: 0.6 });
  expect(gun?.id).toMatch(/^method-[0-9a-f]{8}$/);

  // A customer's booking form reads the same setting.
  await signIn(page, ACCOUNTS.customer);
  const res = await page.request.get("/api/customer/settings");
  expect(res.ok(), await res.text()).toBe(true);
  const theirs = (await res.json()) as Record<string, Setting>;
  expect(
    (theirs.medication_instructions?.value as Meds | undefined)?.fee,
  ).toMatchObject({ mode: "dose", amount: 2.5 });
});

test("B1 one Save writes both tabs", async ({ page }) => {
  test.setTimeout(3 * 60 * 1000);
  await signIn(page, ACCOUNTS.owner);
  await open(page);

  const packing = card(page, "Packing & supply");
  const before = await stored<{ extraMeals: number }>(
    page,
    "feeding_instructions",
  );
  await packing.getByRole("button", { name: "More extra meals" }).click();

  await page.getByRole("tab", { name: "Medications" }).click();
  await card(page, "Supply & safety rules")
    .getByRole("radio", { name: /^Require enough supply/ })
    .click();

  await save(page, "Feeding and medication settings saved");
  expect(
    (await stored<{ extraMeals: number }>(page, "feeding_instructions"))
      .extraMeals,
  ).toBe(Math.min(14, before.extraMeals + 1));
  expect(
    (await stored<{ supply: string }>(page, "medication_instructions")).supply,
  ).toBe("block");
});

test("C1 Care tasks sends the reader to the new page", async ({ page }) => {
  await signIn(page, ACCOUNTS.owner);
  await page.goto("/facility/dashboard/settings/care-tasks");
  await page
    .getByRole("link", { name: "Open Feeding & medications" })
    .click({ timeout: 60_000 });
  await expect(page).toHaveURL(/\/settings\/feeding-medications$/);
  await expect(
    page.getByRole("heading", { name: "Feeding & medications" }),
  ).toBeVisible({ timeout: 60_000 });
});
