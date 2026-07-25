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
const SHOTS =
  process.env.PWV_SHOTS ??
  "C:/Users/merie/AppData/Local/Temp/claude/c--dev-puneet/972b865b-3d4c-498d-8480-5f5908c6c228/scratchpad";

type Overrides = Record<string, { granted: boolean; scope: string }>;

async function signInAs(
  context: BrowserContext,
  page: Page,
  staffId: string,
  overrides: Overrides = {},
) {
  await context.addCookies([
    { name: "employee_staff_id", value: staffId, url: "http://localhost:3000" },
  ]);
  await context.addInitScript(
    ({ key, id, ov }) => {
      window.localStorage.setItem(
        key,
        JSON.stringify({
          viewerId: id,
          presetOverrides: {},
          staffOverrides: { [id]: ov },
        }),
      );
    },
    { key: STORAGE_KEY, id: staffId, ov: overrides },
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

    // The gate blocks the whole portal with the opening-count flow.
    await expect(
      page.getByRole("heading", { name: /Start your day/i }),
    ).toBeVisible();
    await expect(sidebar(page)).toHaveCount(0); // portal not rendered while gated
    await page.screenshot({ path: path.join(SHOTS, "register-01-gate.png") });

    // Open the count dialog, count the drawer, and start the day.
    await page.getByRole("button", { name: /Count opening float/i }).click();
    await expect(
      page.getByRole("dialog").getByText(/Open Today.s Register/i),
    ).toBeVisible();
    await page.getByRole("spinbutton").first().fill("12");
    await page.getByRole("button", { name: /Start day/i }).click();

    // Gate clears → the real portal (sidebar) is now reachable.
    await expect(sidebar(page)).toBeVisible({ timeout: 30_000 });
    await expect(
      page.getByRole("heading", { name: /Start your day/i }),
    ).toHaveCount(0);
    await page.screenshot({
      path: path.join(SHOTS, "register-02-unlocked.png"),
    });
  });

  test("clocking out with the drawer open pops the close-count reminder", async ({
    page,
    context,
  }) => {
    await signInAs(context, page, "fs-rec-01");

    // Open the register through the gate.
    await page.getByRole("button", { name: /Count opening float/i }).click();
    await page.getByRole("spinbutton").first().fill("12");
    await page.getByRole("button", { name: /Start day/i }).click();
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
