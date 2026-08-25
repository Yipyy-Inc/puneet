import { test, expect } from "@playwright/test";

import { ACCOUNTS, signIn } from "./_auth";

// ============================================================================
// How the business is incorporated belongs to the business.
//
// ── WHAT THIS REPLACES ────────────────────────────────────────────────────
//
// `/facility/hq/integrations` decided "one QuickBooks company or one per
// branch" and wrote the answer to `localStorage["yipyy-quickbooks-settings"]`.
// So the owner and the bookkeeper could hold different answers on two laptops,
// and a new device started over. It is the `accounting_structure` facility
// settings domain now.
//
// ── WHAT THIS DELIBERATELY DOES NOT TEST ──────────────────────────────────
//
// Anything else about QuickBooks. `src/lib/quickbooks/` is 27 modules, 8
// localStorage stores, ZERO API routes and ZERO tables, including
// `oauth-mock.ts` — no company can be connected. Writing a test that drove a
// connect flow would be testing the mock, which is worse than no test: it would
// go green forever and prove nothing about the integration.
//
// T4 asserts the screen SAYS so, because that is the only claim about
// QuickBooks this screen is currently entitled to make.
//
// ── CLEANUP ───────────────────────────────────────────────────────────────
//
// `facility_settings` is keyed (facility_id, domain) — one row, upserted. There
// is nothing to delete; `afterAll` restores whatever the facility had before,
// recorded in `beforeAll`.
// ============================================================================

const SETTINGS = "/api/facility/settings";
const DOMAIN = "accounting_structure";

type Page = import("@playwright/test").Page;

interface AccountingStructure {
  multiLocationMode: "single_company" | "company_per_location";
}

let original: AccountingStructure | null = null;

async function read(page: Page): Promise<AccountingStructure> {
  const res = await page.request.get(SETTINGS);
  expect(res.ok(), await res.text()).toBe(true);
  // The route returns the domain map itself, not `{ settings: ... }`.
  const body = (await res.json()) as Record<
    string,
    { value: AccountingStructure; configured: boolean }
  >;
  return body[DOMAIN].value;
}

async function save(page: Page, value: AccountingStructure): Promise<void> {
  const res = await page.request.patch(SETTINGS, {
    data: { domain: DOMAIN, value },
  });
  expect(res.ok(), await res.text()).toBe(true);
}

test.describe("HQ accounting structure", () => {
  test.beforeAll(async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    await signIn(page, ACCOUNTS.owner);
    original = await read(page);
    await context.close();
  });

  test.afterAll(async ({ browser }) => {
    if (!original) return;
    const context = await browser.newContext();
    const page = await context.newPage();
    await signIn(page, ACCOUNTS.owner);
    await save(page, original);
    await context.close();
  });

  test("the domain answers even for a facility that never opened it", async ({
    page,
  }) => {
    await signIn(page, ACCOUNTS.owner);
    const value = await read(page);
    // The fallback is one company — never per-location, which would route a
    // sale to a branch company nobody has set up.
    expect(["single_company", "company_per_location"]).toContain(
      value.multiLocationMode,
    );
  });

  test("an answer given in one browser is there in another", async ({
    browser,
  }) => {
    const first = await browser.newContext();
    const firstPage = await first.newPage();
    await signIn(firstPage, ACCOUNTS.owner);

    const before = await read(firstPage);
    const next: AccountingStructure = {
      multiLocationMode:
        before.multiLocationMode === "single_company"
          ? "company_per_location"
          : "single_company",
    };
    await save(firstPage, next);
    await first.close();

    // A separate context — its own storage. The assertion localStorage could
    // never have passed.
    const second = await browser.newContext();
    const secondPage = await second.newPage();
    await signIn(secondPage, ACCOUNTS.owner);
    const seen = await read(secondPage);
    await second.close();

    expect(seen.multiLocationMode).toBe(next.multiLocationMode);
  });

  test("a mode outside the two real ones is refused", async ({ page }) => {
    await signIn(page, ACCOUNTS.owner);
    const before = await read(page);

    const res = await page.request.patch(SETTINGS, {
      data: { domain: DOMAIN, value: { multiLocationMode: "one_per_dog" } },
    });
    expect(res.ok()).toBe(false);

    // A refused write must not half-apply.
    const after = await read(page);
    expect(after.multiLocationMode).toBe(before.multiLocationMode);
  });

  test("the screen shows the real branches and does not offer to connect", async ({
    page,
  }) => {
    await signIn(page, ACCOUNTS.owner);

    // The real branch names, from Postgres, so the assertion below is about
    // this business rather than about three fixture branches in Montreal.
    const list = await page.request.get("/api/locations");
    expect(list.ok(), await list.text()).toBe(true);
    const branches = (await list.json()) as { name: string }[];
    expect(branches.length).toBeGreaterThan(0);

    await page.goto("/facility/hq/integrations");
    await expect(
      page.getByRole("heading", { name: "Accounting integrations" }),
    ).toBeVisible();
    await expect(page.getByText(branches[0].name).first()).toBeVisible({
      timeout: 15_000,
    });

    // The one claim this screen is entitled to make about QuickBooks.
    await expect(
      page.getByText(/QuickBooks cannot be connected yet/i),
    ).toBeVisible();
  });

  test("a groomer cannot decide how the business keeps its books", async ({
    page,
  }) => {
    await signIn(page, ACCOUNTS.groomer);

    // Positive control: a groomer CAN read settings, so the refusal below is
    // about the write and not about seeing nothing at all.
    const list = await page.request.get(SETTINGS);
    expect(list.ok(), await list.text()).toBe(true);

    const res = await page.request.patch(SETTINGS, {
      data: {
        domain: DOMAIN,
        value: { multiLocationMode: "company_per_location" },
      },
    });
    expect(res.ok(), "a groomer wrote the accounting structure").toBe(false);
  });
});
