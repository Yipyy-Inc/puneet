import { test, expect } from "@playwright/test";

import { ACCOUNTS, signIn } from "./_auth";

// ============================================================================
// A staff member's profile is the database's.
//
// ── WHAT IT WAS ───────────────────────────────────────────────────────────
//
// `/facility/dashboard/staff/[id]` looked the person up in
// `src/data/facility-staff`, so anyone hired through the real roster opened as
// "not found", and Save wrote into that array and was gone on reload.
//
// ── WHAT THIS PROVES ──────────────────────────────────────────────────────
//
// A staff member who exists only in Postgres opens; a changed phone number is
// stored (read back through the API, not the screen) and survives a reload;
// and the save sends only what changed, so payroll — which the list read may
// redact — is not overwritten.
//
// ── IT CLEANS UP ──────────────────────────────────────────────────────────
//
// One Postgres, and CI writes to it. The groomer's phone is put back.
// ============================================================================

type Page = import("@playwright/test").Page;

interface StaffPayload {
  id: string;
  email: string;
  firstName: string;
  phone: string;
  payroll?: unknown;
}

/** A 555-01xx number: reserved, never a real person. */
const PROBE_PHONE = "+1 514 555 0142";

async function staffByEmail(page: Page, email: string): Promise<StaffPayload> {
  const res = await page.request.get("/api/staff");
  expect(res.ok(), await res.text()).toBe(true);
  const staff = (await res.json()) as StaffPayload[];
  const found = staff.find((member) => member.email === email);
  expect(found, `${email} has a staff row`).toBeTruthy();
  return found!;
}

test.describe("staff profile", () => {
  let before: StaffPayload;

  test.beforeAll(async ({ browser }) => {
    const page = await browser.newPage();
    try {
      await signIn(page, ACCOUNTS.owner);
      before = await staffByEmail(page, ACCOUNTS.groomer);
    } finally {
      await page.close();
    }
  });

  test.afterAll(async ({ browser }) => {
    const page = await browser.newPage();
    try {
      await signIn(page, ACCOUNTS.owner);
      const restored = await page.request.patch(
        `/api/staff/${encodeURIComponent(before.id)}`,
        { data: { phone: before.phone } },
      );
      expect(restored.ok(), await restored.text()).toBe(true);
      const now = await staffByEmail(page, ACCOUNTS.groomer);
      expect(now.phone, "cleanup: the groomer's phone is restored").toBe(
        before.phone,
      );
    } finally {
      await page.close();
    }
  });

  test("a staff member from the database opens, and an edit is stored", async ({
    page,
  }) => {
    await signIn(page, ACCOUNTS.owner);
    await page.goto(
      `/facility/dashboard/staff/${encodeURIComponent(before.id)}`,
    );

    await expect(
      page.getByRole("heading", {
        level: 1,
        name: new RegExp(before.firstName),
      }),
    ).toBeVisible();

    // FieldRow's label is not tied to its input, so find the row by its words.
    const phone = page
      .locator("div.space-y-1\\.5")
      .filter({ has: page.getByText(/^phone/i) })
      .locator("input")
      .first();
    await expect(phone).toHaveValue(before.phone ?? "");
    await phone.fill(PROBE_PHONE);

    await page.getByRole("button", { name: /save changes/i }).click();
    await expect(page.getByText(/profile is saved/i)).toBeVisible();

    // The database, not the screen.
    const after = await staffByEmail(page, ACCOUNTS.groomer);
    expect(after.phone).toBe(PROBE_PHONE);
    // Only what changed was sent: payroll is exactly as it was.
    expect(after.payroll).toEqual(before.payroll);

    await page.reload();
    await expect(phone).toHaveValue(PROBE_PHONE);
  });
});
