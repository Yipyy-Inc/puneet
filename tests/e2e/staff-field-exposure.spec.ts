import { test, expect, type Page } from "@playwright/test";

// ============================================================================
// /api/staff does not hand out what the caller may not see.
//
// RLS lets every staff member read their colleagues' rows, deliberately —
// rotas and handovers need it. But it gates ROWS, not COLUMNS, so the same
// policy handed over everything in `details`: hourly rates, clock-in codes,
// HR notes, and each person's individual permission grants. Any signed-in
// groomer could curl the endpoint and read the owner's salary.
//
// These checks read the API directly rather than the screen. The profile sheet
// already hid the Payroll tab without `view_payroll` — that was never the
// problem. The data was in the response either way, and a hidden tab is not a
// control.
//
// TO CONFIRM THESE FAIL WITHOUT THE FIX: drop the `redactStaffProfile` call in
// src/app/api/staff/route.ts and re-run. Every "cannot see" expectation below
// should go red.
// ============================================================================

const PASSWORD = "YipyyDev!2026";

/** A seeded colleague with a full sensitive tail — pay, code, notes, overrides. */
const COLLEAGUE = "fs-board-01";

interface StaffRow {
  id: string;
  email: string;
  payroll?: { hourlyRate: number };
  permissionOverrides?: Record<string, unknown>;
  employment: { notes?: string };
  clockIn?: { requireAccessCode: boolean; accessCode?: string };
  statusNote?: string;
}

async function signIn(page: Page, email: string) {
  await page.goto("/login");
  await page.fill("#email", email);
  await page.fill("#password", PASSWORD);
  await page.getByRole("button", { name: /sign in/i }).click();
  await expect
    .poll(async () => (await page.request.get("/api/permissions")).status(), {
      timeout: 30_000,
    })
    .toBe(200);
}

async function staffAs(page: Page, email: string): Promise<StaffRow[]> {
  await signIn(page, email);
  const res = await page.request.get("/api/staff");
  expect(res.status()).toBe(200);
  return (await res.json()) as StaffRow[];
}

function byId(rows: StaffRow[], id: string): StaffRow {
  const row = rows.find((r) => r.id === id);
  expect(
    row,
    `${id} should be readable — RLS lets colleagues see each other`,
  ).toBeDefined();
  return row!;
}

test.describe.configure({ mode: "serial" });

test.describe("staff field exposure", () => {
  test("a groomer cannot read a colleague's pay, code, notes or grants", async ({
    page,
  }) => {
    const rows = await staffAs(page, "groomer@yipyy.dev");
    const colleague = byId(rows, COLLEAGUE);

    // The row itself is visible. That is correct and must stay true.
    expect(colleague.email).toBeTruthy();

    // Absent, not zeroed. `hourlyRate: 0` would render as "$0/hr" — a claim
    // about their pay rather than a refusal to answer.
    expect(colleague.payroll, "payroll must be absent").toBeUndefined();
    expect(colleague.permissionOverrides).toBeUndefined();
    expect(colleague.employment.notes).toBeUndefined();
    expect(colleague.statusNote).toBeUndefined();

    // Whether a code is required is roster information; the code is a secret.
    expect(colleague.clockIn?.accessCode).toBeUndefined();

    // Not one row anywhere in the response carries a rate or a code.
    expect(rows.filter((r) => r.id !== "fs-dev-groomer" && r.payroll)).toEqual(
      [],
    );
    expect(
      rows.filter((r) => r.id !== "fs-dev-groomer" && r.clockIn?.accessCode),
    ).toEqual([]);
  });

  test("a groomer still sees their own record in full", async ({ page }) => {
    const rows = await staffAs(page, "groomer@yipyy.dev");
    const self = byId(rows, "fs-dev-groomer");

    // Your pay is yours, and the clock-in code is one you type in yourself.
    // Seeded in supabase/seed/dev-accounts.sql precisely so this is checkable —
    // reading back nothing from an empty record would prove nothing.
    expect(self.payroll?.hourlyRate).toBe(21);
    expect(self.clockIn?.accessCode).toBe("9001");
    expect(self.employment.notes).toContain("Seeded HR note");
  });

  test("an owner sees everything", async ({ page }) => {
    const rows = await staffAs(page, "owner@yipyy.dev");
    const colleague = byId(rows, COLLEAGUE);

    // Owner holds view_payroll, view_staff_permissions and manage_staff, so
    // nothing is trimmed. This is the half that proves the redaction is keyed
    // on permissions rather than just deleting fields for everyone.
    expect(colleague.payroll?.hourlyRate).toBeGreaterThan(0);
    expect(colleague.permissionOverrides).toBeDefined();
    expect(colleague.employment.notes).toBeTruthy();
    expect(colleague.clockIn?.accessCode).toBe("7702");
  });

  test("a receptionist is trimmed the same way as the groomer", async ({
    page,
  }) => {
    // A second non-privileged role, because a single one leaves open the
    // possibility that the groomer is special rather than the permission is.
    const rows = await staffAs(page, "reception@yipyy.dev");
    const colleague = byId(rows, COLLEAGUE);

    expect(colleague.payroll).toBeUndefined();
    expect(colleague.clockIn?.accessCode).toBeUndefined();
    expect(colleague.employment.notes).toBeUndefined();
  });

  test("signed out gets nothing at all", async ({ page }) => {
    const res = await page.request.get("/api/staff");
    expect(res.status()).toBe(401);
  });
});
