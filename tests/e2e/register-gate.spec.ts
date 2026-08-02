import { test, expect, type BrowserContext, type Page } from "@playwright/test";
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
// The HR config below is still seeded through localStorage. That is not a
// permission; it is facility configuration, and it has no backend yet.
// ============================================================================

const HR_KEY = "yipyy-staff-onboarding-v2"; // StaffHrConfig persistence
const SHOTS =
  process.env.PWV_SHOTS ??
  "C:/Users/merie/AppData/Local/Temp/claude/c--dev-puneet/972b865b-3d4c-498d-8480-5f5908c6c228/scratchpad";

type HrConfig = Record<string, unknown>;

async function enterPortalAs(
  context: BrowserContext,
  page: Page,
  email: string,
  hrConfig: HrConfig = {},
) {
  if (Object.keys(hrConfig).length > 0) {
    // Before any app JS runs. Deep-merged into the default config on load.
    await context.addInitScript(
      ({ hrKey, hr }) => {
        window.localStorage.setItem(hrKey, JSON.stringify({ config: hr }));
      },
      { hrKey: HR_KEY, hr: hrConfig },
    );
  }
  await signIn(page, email);
  await page.goto("/employee");
}

const sidebar = (page: Page) =>
  page.locator('[data-slot="sidebar-inner"]').first();

test.describe("Daily Register open/close gate", () => {
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
  }) => {
    // Single-cashier mode: the person who opened is reminded on clock-out.
    await enterPortalAs(context, page, ACCOUNTS.reception, {
      registerCloseReminder: "opener_clock_out",
    });

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
  }) => {
    // Manual mode stands in for the shift-handover guarantee: clocking out with
    // the drawer open must NOT pop the close flow, so a morning cashier can
    // leave and an evening cashier closes later. (closing_time behaves the same
    // before the facility's closing time.)
    await enterPortalAs(context, page, ACCOUNTS.reception, {
      registerCloseReminder: "manual",
    });

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
