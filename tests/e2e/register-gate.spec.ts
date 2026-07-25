import { test, expect, type BrowserContext, type Page } from "@playwright/test";
import path from "node:path";

// ============================================================================
// Visual + behavioural check for the mandatory cash-register open/close gate.
//
// Same sign-in trick as staff-portal-nav.spec.ts: seed the `employee_staff_id`
// cookie + the RBAC localStorage before app JS runs, then land in the employee
// shell as that staff. Reception (fs-rec-01) holds `open_close_register` via its
// preset, so the login open-gate must block the portal until the drawer is
// counted open; a peer with the permission revoked must NOT be gated.
// ============================================================================

const STORAGE_KEY = "facility-rbac-state-v1";
const HR_KEY = "yipyy-staff-onboarding-v2"; // StaffHrConfig persistence
const SHOTS =
  process.env.PWV_SHOTS ??
  "C:/Users/merie/AppData/Local/Temp/claude/c--dev-puneet/972b865b-3d4c-498d-8480-5f5908c6c228/scratchpad";

type Overrides = Record<string, { granted: boolean; scope: string }>;
type HrConfig = Record<string, unknown>;

async function signInAs(
  context: BrowserContext,
  page: Page,
  staffId: string,
  overrides: Overrides = {},
  hrConfig: HrConfig = {},
) {
  await context.addCookies([
    { name: "employee_staff_id", value: staffId, url: "http://localhost:3000" },
  ]);
  await context.addInitScript(
    ({ key, id, ov, hrKey, hr }) => {
      window.localStorage.setItem(
        key,
        JSON.stringify({
          viewerId: id,
          presetOverrides: {},
          staffOverrides: { [id]: ov },
        }),
      );
      if (Object.keys(hr).length > 0) {
        // Deep-merged into the default config on load (config.* keys).
        window.localStorage.setItem(hrKey, JSON.stringify({ config: hr }));
      }
    },
    {
      key: STORAGE_KEY,
      id: staffId,
      ov: overrides,
      hrKey: HR_KEY,
      hr: hrConfig,
    },
  );
  await page.goto("/employee");
}

const sidebar = (page: Page) =>
  page.locator('[data-slot="sidebar-inner"]').first();

test.describe("Daily Register open/close gate", () => {
  test("reception is forced to count the drawer open, then the portal unlocks", async ({
    page,
    context,
  }) => {
    await signInAs(context, page, "fs-rec-01"); // reception — has open_close_register

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
    await signInAs(
      context,
      page,
      "fs-rec-01",
      {},
      {
        registerCloseReminder: "opener_clock_out",
      },
    );

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
    await signInAs(
      context,
      page,
      "fs-rec-01",
      {},
      {
        registerCloseReminder: "manual",
      },
    );

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
    await signInAs(context, page, "fs-groom-02", {
      open_close_register: { granted: false, scope: "none" },
    });
    await expect(sidebar(page)).toBeVisible();
    await expect(
      page.getByRole("heading", { name: /Start your day/i }),
    ).toHaveCount(0);
    await page.screenshot({ path: path.join(SHOTS, "register-04-nogate.png") });
  });
});
