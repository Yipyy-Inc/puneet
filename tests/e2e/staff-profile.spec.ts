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

// ============================================================================
// The profile's availability tab writes the week the scheduler reads.
//
// It used to seed from and save into `src/data/staff-availability`. A save now
// files a proposal for that person and, for a manager who may decide, approves
// it — so the stored pattern is read back here through the route. The groomer's
// week is put back exactly as it was, and the requests this filed are removed.
// ============================================================================

interface AvailabilityDay {
  dayOfWeek: number;
  isAvailable: boolean;
  startTime?: string;
  endTime?: string;
}

interface AvailabilityPayload {
  patterns: Record<string, AvailabilityDay[]>;
  requests: { id: string; employeeId: string; requestedAt: string }[];
}

async function availability(page: Page): Promise<AvailabilityPayload> {
  const res = await page.request.get("/api/scheduling/availability?status=all");
  expect(res.ok(), await res.text()).toBe(true);
  return (await res.json()) as AvailabilityPayload;
}

test.describe("staff profile availability", () => {
  let rowId = "";
  let groomerId = "";
  let weekBefore: AvailabilityDay[] | undefined;
  let requestsBefore = new Set<string>();

  test.beforeAll(async ({ browser }) => {
    const page = await browser.newPage();
    try {
      await signIn(page, ACCOUNTS.owner);
      const res = await page.request.get("/api/staff");
      const staff = (await res.json()) as {
        id: string;
        rowId?: string;
        email: string;
      }[];
      const groomer = staff.find((m) => m.email === ACCOUNTS.groomer);
      rowId = groomer?.rowId ?? "";
      groomerId = groomer?.id ?? "";
      expect(rowId, "the groomer has a staff row").not.toBe("");
      const live = await availability(page);
      weekBefore = live.patterns[rowId];
      requestsBefore = new Set(live.requests.map((r) => r.id));
    } finally {
      await page.close();
    }
  });

  test.afterAll(async ({ browser }) => {
    const page = await browser.newPage();
    try {
      await signIn(page, ACCOUNTS.owner);
      const failures: string[] = [];

      // The week first: back to what was stated, or to unstated.
      if (weekBefore) {
        const filed = await page.request.post("/api/scheduling/availability", {
          data: {
            employeeId: rowId,
            proposed: weekBefore,
            effectiveFrom: new Date().toISOString().slice(0, 10),
          },
        });
        if (filed.ok()) {
          const { id } = (await filed.json()) as { id: string };
          const approved = await page.request.patch(
            "/api/scheduling/availability",
            { data: { id, status: "approved" } },
          );
          if (!approved.ok()) failures.push(`restore: ${approved.status()}`);
        } else {
          failures.push(`restore proposal: ${filed.status()}`);
        }
      } else {
        const cleared = await page.request.delete(
          `/api/scheduling/availability?staff=${rowId}`,
        );
        if (!cleared.ok()) failures.push(`clear: ${cleared.status()}`);
      }

      // Then every request this run filed, including the restore's.
      const live = await availability(page);
      for (const request of live.requests) {
        if (request.employeeId !== rowId || requestsBefore.has(request.id)) {
          continue;
        }
        const gone = await page.request.delete(
          `/api/scheduling/availability?id=${request.id}`,
        );
        if (!gone.ok())
          failures.push(`request ${request.id}: ${gone.status()}`);
      }

      expect(failures, "cleanup").toEqual([]);
    } finally {
      await page.close();
    }
  });

  test("a manager's edit on the tab is the stored week", async ({ page }) => {
    await signIn(page, ACCOUNTS.owner);
    await page.goto(
      `/facility/dashboard/staff/${encodeURIComponent(groomerId)}`,
    );
    await page.getByRole("tab", { name: /availability/i }).click();

    // Monday: available, 08:00 to 16:00.
    const monday = page
      .locator("div.flex.flex-wrap.items-center.gap-3")
      .filter({ hasText: /monday/i })
      .first();
    const toggle = monday.getByRole("switch");
    if ((await toggle.getAttribute("aria-checked")) !== "true") {
      await toggle.click();
    }
    const times = monday.locator('input[type="time"]');
    await times.nth(0).fill("08:00");
    await times.nth(1).fill("16:00");

    await page.getByRole("button", { name: /save availability/i }).click();
    await expect(
      page.getByText(/availability template updated/i),
    ).toBeVisible();

    const stored = (await availability(page)).patterns[rowId];
    expect(stored?.find((day) => day.dayOfWeek === 1)).toEqual({
      dayOfWeek: 1,
      isAvailable: true,
      startTime: "08:00",
      endTime: "16:00",
    });
  });
});
