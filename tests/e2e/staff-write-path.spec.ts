import { test, expect } from "@playwright/test";
import { ACCOUNTS, signIn } from "./_auth";

// ============================================================================
// POST and PATCH /api/staff — does the app tell the truth about what happened?
//
// The RULES live in the database (20260802140000), and
// supabase/tests/staff-write-integrity.sql proves them as the actual caller,
// which is the honest place to ask: PostgREST is reachable directly with the
// anon key and a session cookie, so these routes are a convenience, not a gate.
//
// THIS FILE ASKS THE OTHER HALF. The trigger silently reverts fields a caller
// may not set, so a route that echoed back the REQUEST would show an edit the
// database threw away. And the write path has to redact exactly like the read
// path — same data, same person, different verb.
//
// TO CONFIRM THESE FAIL WITHOUT THE FIX: return `input` instead of the stored
// row from PATCH. "an edit reports what was stored" goes red.
// ============================================================================

const SUBJECT = "fs-board-01"; // Dominic — a seeded colleague with a full tail

interface StaffRow {
  id: string;
  firstName: string;
  phone?: string;
  jobTitle?: string;
  primaryRole: string;
  payroll?: { hourlyRate: number };
  employment: { notes?: string };
  clockIn?: { accessCode?: string };
}

test.describe.configure({ mode: "serial" });

test.describe("staff write path", () => {
  test("an owner's edit reports what was stored", async ({ page }) => {
    await signIn(page, ACCOUNTS.owner);

    const title = `Lead Bather ${Date.now() % 100000}`;
    const res = await page.request.patch(`/api/staff/${SUBJECT}`, {
      data: { jobTitle: title },
    });
    expect(res.status()).toBe(200);

    const body = (await res.json()) as StaffRow;
    expect(body.jobTitle).toBe(title);
    // The partial patch must not have blanked the tail it did not mention.
    expect(body.payroll?.hourlyRate).toBeGreaterThan(0);
    expect(body.employment.notes).toBeTruthy();

    // And it is genuinely stored, not just echoed.
    const after = (await (await page.request.get("/api/staff")).json()) as
      | StaffRow[]
      | null;
    expect(after?.find((s) => s.id === SUBJECT)?.jobTitle).toBe(title);
  });

  test("a groomer cannot promote themselves", async ({ page }) => {
    await signIn(page, ACCOUNTS.groomer);

    const res = await page.request.patch("/api/staff/fs-dev-groomer", {
      data: { primaryRole: "owner" },
    });

    // 403 with the database's own message, which is written for a person.
    expect(res.status()).toBe(403);
    expect((await res.json()).error).toMatch(/role/i);

    // And nothing moved: the permission map is the thing that would have
    // changed, so it is the thing worth checking.
    const perms = (await (
      await page.request.get("/api/permissions")
    ).json()) as Record<string, string>;
    expect(perms.manage_roles).toBe("none");
  });

  test("a groomer cannot give themselves a raise", async ({ page }) => {
    await signIn(page, ACCOUNTS.groomer);

    const res = await page.request.patch("/api/staff/fs-dev-groomer", {
      data: {
        payroll: {
          hourlyRate: 999,
          generalServiceCommission: 0,
          tipsRate: 0,
          overrides: [],
        },
      },
    });

    // Reverted rather than refused — the whole-object PATCH has to keep
    // working — so the check is on what came BACK, not on the status.
    expect(res.status()).toBe(200);
    const body = (await res.json()) as StaffRow;
    expect(body.payroll?.hourlyRate).not.toBe(999);
  });

  test("a groomer may still edit their own phone", async ({ page }) => {
    await signIn(page, ACCOUNTS.groomer);

    const phone = `555-${String(Date.now() % 10000).padStart(4, "0")}`;
    const res = await page.request.patch("/api/staff/fs-dev-groomer", {
      data: { phone },
    });

    expect(res.status()).toBe(200);
    expect(((await res.json()) as StaffRow).phone).toBe(phone);
  });

  test("the write path redacts exactly like the read path", async ({
    page,
  }) => {
    // THE CALLER HAS TO BE ABLE TO EDIT, or this proves nothing.
    //
    // The first version used the groomer, who gets a 403 on a colleague — so
    // the assertions never ran, and the test passed with the redaction
    // deliberately removed. Checked, which is the only reason I know.
    //
    // What is needed is someone who may WRITE the row but not SEE its pay:
    // the manager, with view_payroll revoked. That combination is the whole
    // point — a handler that echoed the stored row back unredacted would hand
    // them the salary the GET route is careful to withhold.
    await signIn(page, ACCOUNTS.owner);
    const revoke = await page.request.put("/api/roles/overrides", {
      data: {
        kind: "staff",
        staffId: "fs-dev-manager",
        key: "view_payroll",
        setting: { granted: false, scope: "none" },
      },
    });
    expect(revoke.status()).toBe(200);

    try {
      await page.context().clearCookies();
      await signIn(page, ACCOUNTS.manager);

      // Sanity: they really cannot see it on the READ path.
      const list = (await (await page.request.get("/api/staff")).json()) as
        | StaffRow[]
        | null;
      expect(
        list?.find((s) => s.id === SUBJECT)?.payroll,
        "precondition: payroll withheld on GET",
      ).toBeUndefined();

      const res = await page.request.patch(`/api/staff/${SUBJECT}`, {
        data: { phone: "555-0000" },
      });
      expect(res.status(), "the manager may edit this row").toBe(200);

      const body = (await res.json()) as StaffRow;
      expect(
        body.payroll,
        "payroll must not come back from a write",
      ).toBeUndefined();

      // The clock-in code IS returned, and should be: it is gated on
      // manage_staff, which this caller holds. Asserted rather than omitted,
      // because "everything is missing" would pass just as well if the
      // redaction were stripping indiscriminately.
      expect(body.clockIn?.accessCode).toBeTruthy();
    } finally {
      await page.context().clearCookies();
      await signIn(page, ACCOUNTS.owner);
      await page.request.put("/api/roles/overrides", {
        data: {
          kind: "staff",
          staffId: "fs-dev-manager",
          key: "view_payroll",
          setting: null,
        },
      });
    }
  });

  test("signed out cannot write at all", async ({ page }) => {
    expect(
      (
        await page.request.post("/api/staff", { data: { firstName: "X" } })
      ).status(),
    ).toBe(401);
    expect(
      (
        await page.request.patch(`/api/staff/${SUBJECT}`, { data: {} })
      ).status(),
    ).toBe(401);
  });
});
