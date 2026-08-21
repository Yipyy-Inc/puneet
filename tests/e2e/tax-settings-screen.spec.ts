import { test, expect } from "@playwright/test";

import { ACCOUNTS, signIn } from "./_auth";

// ============================================================================
// The tax screen, opened cold.
//
// ── THE BUG THIS EXISTS FOR ───────────────────────────────────────────────
//
// `TaxSettings` seeded its form with `useState(settings.tax_config.value...)`.
// Nothing on the settings page reads `useFacilitySettings`, so the request does
// not start until that component mounts — and a `useState` initialiser runs on
// the first render, which is necessarily before it can have answered. So the
// form always latched onto the fallback, and the fallback is `NO_TAX`: an empty
// list.
//
// A facility that had entered its GST and QST registration numbers therefore
// opened this screen and read "No tax rates configured — your invoices won't
// include tax." Pressing Save wrote that empty list over the real one.
//
// It was not a race a fast connection wins. The initialiser cannot observe a
// request that has not been made.
//
// A second, quieter one underneath: reading a saved row hardcoded
// `description: ""` and `isCompound: false`. `isCompound` decides whether a tax
// is charged on the subtotal or on the subtotal plus the taxes above it — so a
// correctly entered compound tax silently became a simple one the next time
// anything at all was saved.
//
// ── WHY THIS SPEC IS A BROWSER WALK ───────────────────────────────────────
//
// Neither bug is reachable from the API. `PATCH /api/facility/settings` stores
// what it is given and `GET` returns it; both were always correct. The defect
// lived entirely in what the screen carried between the two — and every test
// that had exercised it typed values in first, which is exactly the state in
// which neither bug appears.
//
// ── THE SHARPEST ASSERTION IS "PRESS SAVE AND CHANGE NOTHING" ─────────────
//
// Open the screen on a saved config, touch none of it, press Save, and read the
// row back. It must be byte-identical. That one action catches both defects:
// the latch would write an empty list, and the dropped fields would flatten a
// compound tax. It is also what a real user does constantly — open a settings
// screen, change one thing elsewhere on it, save.
//
// ── IT CLEANS UP ──────────────────────────────────────────────────────────
//
// Everything here is written to the DEMO facility (the `@yipyy.dev` accounts
// are all on "Yipyy Demo Facility"), never to a real one. Pawradise's GST and
// QST numbers are the live data this bug threatened and no test may touch them.
//
// The settings route has no DELETE, so `afterAll` restores `NO_TAX` — an empty
// tax list, which is what an unconfigured facility computes anyway and what
// every receipt assertion in the rest of the suite expects. One row is left
// where there were none. Recorded rather than pretended away.
// ============================================================================

const SETTINGS = "/api/facility/settings";
const TAXES = "/facility/dashboard/settings?section=taxes";

type Page = import("@playwright/test").Page;

/**
 * A config with the two fields the editor used to discard, and registration
 * numbers — the values a facility would be most upset to lose.
 */
const SEEDED = {
  country: "CA",
  province: "QC",
  taxes: [
    {
      id: "e2e-gst",
      name: "E2E-GST",
      rate: 0.05,
      appliesTo: "all",
      registrationNumber: "RT-E2E-000000001",
      description: "E2E federal",
      isCompound: false,
      enabled: true,
    },
    {
      id: "e2e-qst",
      name: "E2E-QST",
      rate: 0.09975,
      appliesTo: "all",
      registrationNumber: "RT-E2E-000000002",
      description: "E2E provincial",
      // The field the editor dropped. Compound means it is charged on the
      // subtotal PLUS the tax above it — a different amount of money.
      isCompound: true,
      enabled: true,
    },
  ],
  pricesIncludeTax: false,
  showTaxesSeparately: true,
  showRegistrationOnInvoice: true,
  exemptions: { tips: true, giftCards: true, storeCredit: true },
};

const NO_TAX = {
  country: "CA",
  province: "",
  taxes: [],
  pricesIncludeTax: false,
  showTaxesSeparately: true,
  showRegistrationOnInvoice: true,
  exemptions: { tips: true, giftCards: true, storeCredit: true },
};

async function writeConfig(page: Page, value: unknown): Promise<void> {
  const res = await page.request.patch(SETTINGS, {
    data: { domain: "tax_config", value },
  });
  expect(res.ok(), await res.text()).toBe(true);
}

async function readConfig(page: Page): Promise<unknown> {
  const res = await page.request.get(SETTINGS);
  expect(res.ok(), await res.text()).toBe(true);
  const body = (await res.json()) as {
    tax_config: { value: unknown; configured: boolean };
  };
  return body.tax_config.value;
}

test.describe("the tax screen reads before it writes", () => {
  test.afterAll(async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    await signIn(page, ACCOUNTS.owner);
    await writeConfig(page, NO_TAX);
    await context.close();
  });

  test("a saved config is on the screen when it is opened cold", async ({
    page,
  }) => {
    await signIn(page, ACCOUNTS.owner);
    await writeConfig(page, SEEDED);

    // A full navigation, so the settings query starts from nothing — the exact
    // condition the latch needed. Visiting another settings section first would
    // warm the cache and hide the bug, which is how it survived.
    await page.goto(TAXES);

    const names = page.getByPlaceholder("e.g. GST, HST, VAT");
    await expect(names.first()).toHaveValue("E2E-GST", { timeout: 20_000 });
    await expect(names.nth(1)).toHaveValue("E2E-QST");

    // The registration numbers, which is what actually prints on an invoice.
    const registrations = page.getByPlaceholder("e.g. RT 123456789");
    await expect(registrations.first()).toHaveValue("RT-E2E-000000001");
    await expect(registrations.nth(1)).toHaveValue("RT-E2E-000000002");

    // Rates render as percentages: 0.05 -> "5", 0.09975 -> "9.975".
    const rates = page.getByPlaceholder("5.000");
    await expect(rates.first()).toHaveValue("5");
    await expect(rates.nth(1)).toHaveValue("9.975");

    // The sentence a facility used to be shown about its own tax setup.
    await expect(
      page.getByText("No tax rates configured", { exact: false }),
    ).toHaveCount(0);
  });

  test("opening the screen and pressing Save changes nothing", async ({
    page,
  }) => {
    await signIn(page, ACCOUNTS.owner);
    await writeConfig(page, SEEDED);

    await page.goto(TAXES);
    await expect(
      page.getByPlaceholder("e.g. GST, HST, VAT").first(),
    ).toHaveValue("E2E-GST", { timeout: 20_000 });

    await page.getByRole("button", { name: "Save Tax Settings" }).click();
    await expect(page.getByText("Tax settings saved")).toBeVisible({
      timeout: 15_000,
    });

    // Read the row back through the API rather than trusting the screen it was
    // just saved from.
    expect(await readConfig(page)).toEqual(SEEDED);
  });

  test("an unconfigured facility is not told it has taxes", async ({
    page,
  }) => {
    await signIn(page, ACCOUNTS.owner);
    await writeConfig(page, NO_TAX);

    await page.goto(TAXES);

    // The empty state is a legitimate thing to say — about a facility that has
    // none. The fix must not have replaced one wrong answer with the other.
    await expect(
      page.getByText("No tax rates configured", { exact: false }),
    ).toBeVisible({ timeout: 20_000 });
  });
});
