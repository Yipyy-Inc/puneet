import { test, expect } from "@playwright/test";

import { ACCOUNTS, signIn } from "./_auth";

// ============================================================================
// Payroll — the screen the accountant was missing.
//
// ── THE GAP THIS CLOSES ───────────────────────────────────────────────────
//
// `view_payroll` is granted to owner, admin, manager AND accountant. But admin
// access is forced by the job titles owner/admin/manager/supervisor, so an
// accountant is staff-level, and every surface showing money lived in the
// admin-only /facility portal (ADR 0005). The permission was real, RLS honoured
// it, and there was nowhere to spend it.
//
// The fix was NOT to widen the portal — that would have handed an accountant
// bookings, clients, settings and billing to solve a payroll problem. It was to
// build the screen their job actually needs, in the staff shell, on the
// permission they already hold.
//
// ── WHAT THE NUMBERS HAVE TO SURVIVE ──────────────────────────────────────
//
// An hour is priced by the POSITION of the shift it was worked against, so
// three kinds of hour exist and only one has a gross. The test that matters
// most is the one asserting the other two are REPORTED — a payroll screen that
// folded unpriced work into zero would understate the wage bill and look tidy
// doing it.
//
// ── IT CLEANS UP ──────────────────────────────────────────────────────────
//
// One Postgres, and CI writes to it. Clock entries first (they reference the
// shifts), then shifts, then pay, positions, department.
// ============================================================================

const DEPARTMENT = "E2E Payroll Dept";
const HOURLY = "E2E Payroll Hourly";
const SALARIED = "E2E Payroll Salaried";
const NO_RATE = "E2E Payroll Unrated";

const ZONE = "America/Toronto";

type Page = import("@playwright/test").Page;

interface Line {
  employeeId: string;
  employeeName: string;
  sessions: number;
  hourlyMinutes: number;
  salariedMinutes: number;
  unpricedMinutes: number;
  gross: number;
  openSessions: number;
}

interface Payload {
  from: string;
  to: string;
  timeZone: string;
  lines: Line[];
  totals: {
    gross: number;
    hourlyMinutes: number;
    salariedMinutes: number;
    unpricedMinutes: number;
    openSessions: number;
  };
}

function facilityDay(days: number): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(Date.now() + days * 86_400_000));
}

/** The UTC instant at which a wall-clock time occurs in the facility's zone. */
function zonedInstant(date: string, time: string): string {
  const naive = Date.parse(`${date}T${time}:00Z`);
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: ZONE,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(naive);
  const at = (type: string) => parts.find((p) => p.type === type)!.value;
  const shown = Date.parse(
    `${at("year")}-${at("month")}-${at("day")}T${at("hour")}:${at("minute")}:${at("second")}Z`,
  );
  return new Date(naive - (shown - naive)).toISOString();
}

async function payroll(page: Page, from?: string, to?: string) {
  const query = from && to ? `?from=${from}&to=${to}` : "";
  const res = await page.request.get(`/api/payroll${query}`);
  expect(res.ok(), await res.text()).toBe(true);
  return (await res.json()) as Payload;
}

test.describe("payroll", () => {
  // Three consecutive days in the recent past, so the default fortnight
  // includes them.
  const dayOne = facilityDay(-3);
  const dayTwo = facilityDay(-2);
  const dayThree = facilityDay(-1);

  let departmentId = "";
  const positions: Record<string, string> = {};
  let groomerStaffId = "";
  let ownerStaffId = "";
  const shifts: string[] = [];
  const entries: string[] = [];

  async function makePosition(
    page: Page,
    name: string,
    pay?: {
      payType: "hourly" | "salary";
      hourlyRate?: number;
      salary?: number;
    },
  ): Promise<string> {
    const res = await page.request.post("/api/scheduling/structure", {
      data: { kind: "position", name, departmentId, ...pay },
    });
    expect(res.status(), await res.text()).toBe(201);
    return ((await res.json()) as { id: string }).id;
  }

  async function makeShift(
    page: Page,
    staffId: string,
    positionId: string,
    date: string,
    startTime: string,
    endTime: string,
  ): Promise<string> {
    const res = await page.request.post("/api/scheduling/shifts", {
      data: {
        employeeId: staffId,
        departmentId,
        positionId,
        date,
        startTime,
        endTime,
        status: "published",
      },
    });
    expect(res.status(), await res.text()).toBe(201);
    const id = ((await res.json()) as { id: string }).id;
    shifts.push(id);
    return id;
  }

  /** Oldest first, each closed before the next opens — an open entry claims
   *  `[t, ∞)` and would overlap everything after it. */
  async function makeSession(
    page: Page,
    staffId: string,
    shiftId: string | null,
    inAt: string,
    outAt: string | null,
  ): Promise<void> {
    const res = await page.request.post("/api/scheduling/clock", {
      data: { employeeId: staffId, shiftId: shiftId ?? undefined, at: inAt },
    });
    expect(res.status(), await res.text()).toBe(201);
    const id = ((await res.json()) as { id: string }).id;
    entries.push(id);

    if (outAt) {
      const closed = await page.request.patch("/api/scheduling/clock", {
        data: { id, at: outAt },
      });
      expect(closed.status(), await closed.text()).toBe(200);
    }
  }

  test.beforeAll(async ({ browser }) => {
    const page = await browser.newPage();
    try {
      await signIn(page, ACCOUNTS.owner);

      const existing = (await (
        await page.request.get("/api/scheduling/structure")
      ).json()) as {
        departments: { id: string; name: string }[];
        positions: { id: string; name: string }[];
      };

      departmentId =
        existing.departments.find((d) => d.name === DEPARTMENT)?.id ?? "";
      if (!departmentId) {
        const res = await page.request.post("/api/scheduling/structure", {
          data: { kind: "department", name: DEPARTMENT, color: "#10b981" },
        });
        expect(res.status(), await res.text()).toBe(201);
        departmentId = ((await res.json()) as { id: string }).id;
      }

      for (const [name, pay] of [
        [HOURLY, { payType: "hourly" as const, hourlyRate: 20 }],
        [SALARIED, { payType: "salary" as const, salary: 52000 }],
        [NO_RATE, undefined],
      ] as const) {
        positions[name] =
          existing.positions.find((p) => p.name === name)?.id ??
          (await makePosition(page, name, pay));
      }

      const staff = (await (await page.request.get("/api/staff")).json()) as {
        rowId?: string;
        email: string;
      }[];
      groomerStaffId =
        staff.find((m) => m.email === ACCOUNTS.groomer)?.rowId ?? "";
      ownerStaffId = staff.find((m) => m.email === ACCOUNTS.owner)?.rowId ?? "";
      expect(groomerStaffId).not.toBe("");
      expect(ownerStaffId).not.toBe("");

      // ── Eight hours at $20, worked exactly ─────────────────────────────
      const paid = await makeShift(
        page,
        groomerStaffId,
        positions[HOURLY]!,
        dayOne,
        "09:00",
        "17:00",
      );
      await makeSession(
        page,
        groomerStaffId,
        paid,
        zonedInstant(dayOne, "09:00"),
        zonedInstant(dayOne, "17:00"),
      );

      // ── Four hours against a position with NO RATE ─────────────────────
      const unrated = await makeShift(
        page,
        groomerStaffId,
        positions[NO_RATE]!,
        dayTwo,
        "09:00",
        "13:00",
      );
      await makeSession(
        page,
        groomerStaffId,
        unrated,
        zonedInstant(dayTwo, "09:00"),
        zonedInstant(dayTwo, "13:00"),
      );

      // ── Three hours COVERING, with no shift at all ─────────────────────
      await makeSession(
        page,
        groomerStaffId,
        null,
        zonedInstant(dayThree, "09:00"),
        zonedInstant(dayThree, "12:00"),
      );

      // ── Eight salaried hours ───────────────────────────────────────────
      const salaried = await makeShift(
        page,
        ownerStaffId,
        positions[SALARIED]!,
        dayOne,
        "09:00",
        "17:00",
      );
      await makeSession(
        page,
        ownerStaffId,
        salaried,
        zonedInstant(dayOne, "09:00"),
        zonedInstant(dayOne, "17:00"),
      );
    } finally {
      await page.close();
    }
  });

  test.afterAll(async ({ browser }) => {
    const page = await browser.newPage();
    try {
      await signIn(page, ACCOUNTS.owner);

      const failures: string[] = [];
      let removed = 0;

      for (const id of entries) {
        const gone = await page.request.delete(
          `/api/scheduling/clock?id=${id}`,
        );
        if (gone.ok()) removed++;
        else failures.push(`entry ${id}: ${gone.status()}`);
      }
      if (removed !== entries.length) {
        failures.push(`entries: made ${entries.length}, removed ${removed}`);
      }

      for (const id of shifts) {
        const gone = await page.request.delete(
          `/api/scheduling/shifts?id=${id}`,
        );
        if (!gone.ok()) failures.push(`shift ${id}: ${gone.status()}`);
      }

      const live = (await (
        await page.request.get("/api/scheduling/structure")
      ).json()) as {
        departments: { id: string; name: string }[];
        positions: { id: string; name: string }[];
      };

      for (const name of [HOURLY, SALARIED, NO_RATE]) {
        const id =
          positions[name] ?? live.positions.find((p) => p.name === name)?.id;
        if (!id) continue;
        const gone = await page.request.delete(
          `/api/scheduling/structure?position=${id}`,
        );
        if (!gone.ok()) failures.push(`position ${name}: ${gone.status()}`);
      }

      const deptId =
        departmentId ||
        (live.departments.find((d) => d.name === DEPARTMENT)?.id ?? "");
      const dept = deptId
        ? await page.request.delete(
            `/api/scheduling/structure?department=${deptId}`,
          )
        : null;

      for (const problem of failures)
        console.log(`cleanup PROBLEM: ${problem}`);
      console.log(
        `cleanup: ${removed} entry(ies), ${shifts.length} shift(s), ` +
          `3 position(s), department ${dept?.ok() ? "removed" : `NOT REMOVED (${dept?.status() ?? "no id"})`}`,
      );
    } finally {
      await page.close();
    }
  });

  test("hours are priced from the position of the shift they were worked on", async ({
    page,
  }) => {
    await signIn(page, ACCOUNTS.owner);

    const data = await payroll(page);
    const groomer = data.lines.find((l) => l.employeeId === groomerStaffId);
    expect(groomer, "the groomer worked in this period").toBeTruthy();

    // 8h at $20 — and ONLY that, because the other five hours have no rate.
    expect(groomer!.hourlyMinutes, "eight paid hours").toBe(480);
    expect(groomer!.gross, "$20 x 8h").toBe(160);

    // ── THE ONE THAT MATTERS ────────────────────────────────────────────
    //
    // Four hours on an unrated position plus three hours covering with no
    // shift. Both are real work. A payroll screen that folded them into zero
    // would understate the wage bill and look tidy doing it.
    expect(
      groomer!.unpricedMinutes,
      "four unrated hours plus three covering",
    ).toBe(420);
  });

  test("a salaried person's hours are counted and not priced", async ({
    page,
  }) => {
    await signIn(page, ACCOUNTS.owner);

    const data = await payroll(page);
    const owner = data.lines.find((l) => l.employeeId === ownerStaffId);
    expect(owner, "the owner worked in this period").toBeTruthy();

    expect(owner!.salariedMinutes, "eight hours, worked").toBe(480);
    // A salary does not come from hours, and dividing an annual figure by a
    // guess at a working year would be a number nobody agreed to.
    expect(owner!.gross, "and no gross invented for them").toBe(0);
    expect(owner!.hourlyMinutes).toBe(0);
  });

  test("the period is bounded by the facility's own days", async ({ page }) => {
    await signIn(page, ACCOUNTS.owner);

    // Just the covering day. Its session is 09:00–12:00 Toronto, which is a
    // different UTC date — a window computed in UTC would miss it or catch a
    // neighbour.
    const oneDay = await payroll(page, dayThree, dayThree);

    expect(oneDay.from).toBe(dayThree);
    expect(oneDay.totals.unpricedMinutes, "the three covering hours").toBe(180);
    expect(oneDay.totals.hourlyMinutes, "and nothing from the other days").toBe(
      0,
    );
  });

  test("a period that ends before it starts is refused", async ({ page }) => {
    await signIn(page, ACCOUNTS.owner);

    const backwards = await page.request.get(
      `/api/payroll?from=${dayThree}&to=${dayOne}`,
    );

    expect(backwards.status(), await backwards.text()).toBe(422);
    expect(await backwards.text()).toContain("ends before it starts");
  });

  test("a groomer cannot see payroll", async ({ page }) => {
    await signIn(page, ACCOUNTS.groomer);

    const refused = await page.request.get("/api/payroll");

    // `view_payroll` is owner, admin, manager and ACCOUNTANT. A groomer holds
    // neither it nor `scheduling_view_all`, so the function refuses before any
    // row is read — rather than returning an empty list, which would read as
    // "nobody worked".
    expect(refused.status(), await refused.text()).toBe(403);
    expect(await refused.text()).toContain("permission to see payroll");
  });

  test("the accountant reaches it, and the admin portal stays shut", async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));

    // ── THE PERSON THIS WAS BUILT FOR ───────────────────────────────────
    //
    // Seeded on 2026-08-21 alongside this screen. The only identity that holds
    // `view_payroll` WITHOUT admin access, which is the whole shape of the
    // problem: accountant is not an admin-tier job title, so they are
    // staff-level and every money surface was behind a door they cannot open.
    //
    // The first version of this test used the MANAGER as a stand-in and failed
    // on something else entirely — managers hold `open_close_register`, and the
    // employee shell makes them count the drawer before it unlocks. An
    // accountant holds neither that nor `scheduling_view_all`, so they walk
    // straight in, which is also why they could never have been substituted for.
    await signIn(page, ACCOUNTS.accountant);

    await page.goto("/employee/payroll");
    await page.waitForLoadState("networkidle");

    const body = await page.locator("body").innerText();

    expect(body, "not the access-denied screen").not.toContain(
      "You don't have access to this section",
    );
    expect(body).toContain("Payroll");
    expect(body, "and the figures are on it").toContain("Gross");

    // The gap was closed WITHOUT widening the portal. If this ever passes,
    // somebody has "fixed" the accountant by making them an administrator.
    await page.goto("/facility/dashboard/payroll");
    await page.waitForLoadState("networkidle");
    expect(
      page.url(),
      "the admin portal is still refused to them",
    ).not.toContain("/facility/dashboard/payroll");

    expect(errors.filter((e) => !e.includes("favicon"))).toEqual([]);
  });

  test("the accountant reads the numbers without reading the roster", async ({
    page,
  }) => {
    await signIn(page, ACCOUNTS.accountant);

    // They hold `view_payroll` and the function answers.
    const data = await payroll(page);
    expect(data.totals.gross, "the wage bill").toBeGreaterThan(0);

    // ── AND NOTHING ELSE ────────────────────────────────────────────────
    //
    // No `scheduling_view_all`, so RLS shows them only their OWN clock entries
    // and shifts — none, here. That is why payroll is a SECURITY DEFINER
    // function returning totals rather than a query over raw rows: widening
    // those two read policies would have handed an accountant the whole roster
    // to arrive at a figure.
    const clock = (await (
      await page.request.get("/api/scheduling/clock")
    ).json()) as { entries: { employeeId: string }[]; canSeeEveryone: boolean };

    expect(clock.canSeeEveryone, "not everybody's attendance").toBe(false);
    expect(
      clock.entries.some((e) => e.employeeId === groomerStaffId),
      "and not the groomer's sessions",
    ).toBe(false);
  });

  test("a groomer gets the access-restricted screen, not the numbers", async ({
    page,
  }) => {
    await signIn(page, ACCOUNTS.groomer);
    await page.goto("/employee/payroll");
    await page.waitForLoadState("networkidle");

    const body = await page.locator("body").innerText();

    // `RequirePermission` renders EITHER the children OR the denial — never
    // both — so no restricted content is mounted behind it.
    expect(body).toContain("You don't have access to this section");
    expect(body, "no wage bill behind the screen").not.toContain("Gross");
  });
});
