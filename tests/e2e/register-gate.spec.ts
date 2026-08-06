import {
  test,
  expect,
  type Browser,
  type BrowserContext,
  type Page,
} from "@playwright/test";
import { ACCOUNTS, signIn } from "./_auth";
import path from "node:path";

// ============================================================================
// Visual + behavioural check for the mandatory cash-register open/close gate.
//
// WHO THESE RUN AS, AND WHY IT CHANGED.
//
// They used to seed the `employee_staff_id` cookie + the RBAC localStorage and
// land in the shell as a MOCK staff member (fs-rec-01, fs-groom-02). That
// stopped working when the staff portal began requiring a session: the shell
// takes identity from the session now, mock ids have no account, and — more to
// the point — a signed-in viewer's permissions come from the DATABASE, so the
// seeded localStorage overrides these relied on are ignored outright
// (`fromDb ?? legacy` in use-facility-rbac).
//
// They were skipped while `staff` was still being rolled out. Deleting the
// AUTH_ENFORCED flag would have made that skip permanent, which is a silent way
// to lose four acceptance tests, so they now sign in for real.
//
// The permission split falls out of the shipped presets rather than being
// arranged: reception holds `open_close_register` (operating_hours), a groomer
// does not hold it at all. So the gated and un-gated cases are two real accounts
// and no overrides — nothing to set up, and nothing to tear down.
//
// The HR config used to be seeded through localStorage, on the grounds that it
// "has no backend yet". It has one now (staff_hr_config + /api/staff-onboarding/
// hr-config), so the seeding silently stopped applying and these tests were
// running against the DEFAULTS. See setHrConfig below — it writes the real row
// and afterAll puts it back.
// ============================================================================

const SHOTS =
  process.env.PWV_SHOTS ??
  "C:/Users/merie/AppData/Local/Temp/claude/c--dev-puneet/972b865b-3d4c-498d-8480-5f5908c6c228/scratchpad";

type HrConfig = Record<string, unknown>;

/**
 * Change the facility's HR config, as the owner, in its own context.
 *
 * It used to be seeded into `yipyy-staff-onboarding-v2` in localStorage before
 * any app JS ran. That worked while the config was a mock store and stopped
 * working silently when it moved to Postgres: `useStaffHrConfig()` reads
 * /api/staff-onboarding/hr-config and falls back to DEFAULT_STAFF_HR_CONFIG,
 * so the seeded value was simply ignored.
 *
 * The handover test is what noticed. It needs `registerCloseReminder: manual`;
 * without it the default `closing_time` applies, and that DOES pop the close
 * flow once the facility's closing time has passed — so the test passed in the
 * morning and failed in the evening, which is the worst way for a test to be
 * wrong.
 *
 * FACILITY-WIDE, so callers restore it.
 */
async function setHrConfig(browser: Browser, patch: HrConfig): Promise<number> {
  const context = await browser.newContext();
  const page = await context.newPage();
  try {
    await signIn(page, ACCOUNTS.owner);
    const res = await page.request.put("/api/staff-onboarding/hr-config", {
      data: patch,
    });
    return res.status();
  } finally {
    await context.close();
  }
}

async function enterPortalAs(
  _context: BrowserContext,
  page: Page,
  email: string,
) {
  await signIn(page, email);
  await page.goto("/employee");
}

const sidebar = (page: Page) =>
  page.locator('[data-slot="sidebar-inner"]').first();

test.describe("Daily Register open/close gate", () => {
  // registerCloseReminder is a row in a shared project, so it comes out however
  // the run ends. Restored to the seeded default rather than left on manual —
  // the first test in this file asserts the gate DOES appear.
  test.afterAll(async ({ browser }) => {
    try {
      await setHrConfig(browser, { registerCloseReminder: "closing_time" });
    } catch {
      // Teardown must never turn a green run red.
    }
  });

  test("reception is forced to count the drawer open, then the portal unlocks", async ({
    page,
    context,
  }) => {
    // Reception holds open_close_register via its preset — no override needed.
    await enterPortalAs(context, page, ACCOUNTS.reception);

    // The gate blocks the whole portal with a single opening-count panel.
    await expect(
      page.getByRole("heading", { name: /Start your day/i }),
    ).toBeVisible();
    await expect(sidebar(page)).toHaveCount(0); // portal not rendered while gated
    await page.screenshot({ path: path.join(SHOTS, "register-01-gate.png") });

    // Count the drawer inline and open the register.
    await page.getByRole("spinbutton").first().fill("12");
    await page.getByRole("button", { name: /Open register/i }).click();

    // Gate clears → the real portal (sidebar) is now reachable.
    await expect(sidebar(page)).toBeVisible({ timeout: 30_000 });
    await expect(
      page.getByRole("heading", { name: /Start your day/i }),
    ).toHaveCount(0);
    await page.screenshot({
      path: path.join(SHOTS, "register-02-unlocked.png"),
    });
  });

  test("[opener-closes mode] the opener's clock-out pops the close-count reminder", async ({
    page,
    context,
    browser,
  }) => {
    // Single-cashier mode: the person who opened is reminded on clock-out.
    await setHrConfig(browser, { registerCloseReminder: "opener_clock_out" });
    await enterPortalAs(context, page, ACCOUNTS.reception);

    // Open the register through the gate (this staff is now the opener).
    await page.getByRole("spinbutton").first().fill("12");
    await page.getByRole("button", { name: /Open register/i }).click();
    await expect(sidebar(page)).toBeVisible({ timeout: 30_000 });

    // Clock in, then clock out (two-step confirm each).
    await page.getByRole("button", { name: /Clock in/i }).click();
    await page.getByRole("button", { name: /Confirm clock in/i }).click();
    await page.getByRole("button", { name: /Clock out/i }).click();
    await page.getByRole("button", { name: /Yes, clock out/i }).click();

    // The close-count reminder appears.
    await expect(
      page.getByText(/Close Out Today.s Register/i).first(),
    ).toBeVisible({ timeout: 15_000 });
    await page.screenshot({ path: path.join(SHOTS, "register-03-close.png") });
  });

  test("[handover] a mid-shift clock-out does NOT force the register closed", async ({
    page,
    context,
    browser,
  }) => {
    // Manual mode stands in for the shift-handover guarantee: clocking out with
    // the drawer open must NOT pop the close flow, so a morning cashier can
    // leave and an evening cashier closes later. (closing_time behaves the same
    // before the facility's closing time — which is why this must be set rather
    // than assumed: after closing time the default DOES prompt.)
    await setHrConfig(browser, { registerCloseReminder: "manual" });
    await enterPortalAs(context, page, ACCOUNTS.reception);

    await page.getByRole("spinbutton").first().fill("12");
    await page.getByRole("button", { name: /Open register/i }).click();
    await expect(sidebar(page)).toBeVisible({ timeout: 30_000 });

    await page.getByRole("button", { name: /Clock in/i }).click();
    await page.getByRole("button", { name: /Confirm clock in/i }).click();
    await page.getByRole("button", { name: /Clock out/i }).click();
    await page.getByRole("button", { name: /Yes, clock out/i }).click();

    // No forced close-count dialog.
    await expect(page.getByText(/Close Out Today.s Register/i)).toHaveCount(0);
  });

  test("staff without register access are never gated", async ({
    page,
    context,
  }) => {
    // A groomer is not granted open_close_register by ANY preset, so this is
    // the real un-gated case rather than one manufactured with an override.
    await enterPortalAs(context, page, ACCOUNTS.groomer);
    await expect(sidebar(page)).toBeVisible();
    await expect(
      page.getByRole("heading", { name: /Start your day/i }),
    ).toHaveCount(0);
    await page.screenshot({ path: path.join(SHOTS, "register-04-nogate.png") });
  });
});
