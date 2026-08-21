import { test, expect } from "@playwright/test";

import { ACCOUNTS, signIn } from "./_auth";

// ============================================================================
// The scheduling Reports screen, through a browser.
//
// ── WHAT IT WAS ───────────────────────────────────────────────────────────
//
// Every figure came from src/data: shifts, clock entries, departments,
// positions, leave and swaps. On the module's own Reports tab, while Payroll —
// one nav item away — read the real tables. Same facility, two answers about
// the same fortnight, and the fixture one looked the more complete of the two.
//
// The reads went through `report-data-sources.ts`, the SSOT for every facility
// report, which imported the fixtures directly. A call site could not tell
// which it was getting. The roster is now handed in by the caller instead, and
// it is a REQUIRED argument — a default is how a caller keeps the old
// behaviour by accident.
//
// ── WHY A BROWSER TEST ────────────────────────────────────────────────────
//
// Same reason the calendar has one. The endpoints were already right; the
// screen simply did not call them. An API test cannot see that, and the whole
// defect lived in the gap.
//
// ── THE ARITHMETIC IS CHECKABLE BY EYE ────────────────────────────────────
//
// One 8-hour assigned shift and one 4-hour unassigned one, both at $25/hr, in
// a department this spec created. The KPI row counts only the assigned one
// (8h, $200) because it is per-EMPLOYEE; the department table counts both
// (12h, $300) because a shift is priced by its position whether or not anybody
// is on it. Both are asserted, each where it actually appears. If the screen
// were still on the fixture, neither number would relate to this department.
//
// ── AND IT ASSERTS WHAT IS NO LONGER THERE ────────────────────────────────
//
// Two things were REMOVED rather than converted, and a test that only checks
// what is present would let either creep back:
//
//   Revenue / Labour % / Sales-per-hour   attributed from retail transactions,
//   which have no backend at all. Real cost over invented revenue is a
//   fabricated ratio that looks reconciled precisely because half of it is true.
//
//   Open-shift fill rate / Top claimers   reported on a post-and-claim board
//   that does not exist. `staff_shifts` knows one thing about an unclaimed
//   shift: nobody is on it.
// ============================================================================

const DEPARTMENT = "E2E Reports Screen Dept";
const POSITION = "E2E Reports Screen Position";
const RATE = 25;

const REPORTS = "/facility/dashboard/services/scheduling/reports";

type Page = import("@playwright/test").Page;

interface Structure {
  departments: { id: string; name: string }[];
  positions: { id: string; name: string }[];
}

/** The facility's own day, offset by `days`. Every seeded facility is Toronto. */
function facilityDay(days: number): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Toronto",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(Date.now() + days * 86_400_000));
}

async function structure(page: Page): Promise<Structure> {
  const res = await page.request.get("/api/scheduling/structure");
  expect(res.ok(), await res.text()).toBe(true);
  return (await res.json()) as Structure;
}

test.describe("the scheduling reports screen", () => {
  // Inside the default 30-day window the screen opens on, and recent enough
  // that a shift "yesterday" is unambiguously in range whichever way the
  // boundary rounds.
  const workedDay = facilityDay(-2);

  let departmentId = "";
  let positionId = "";
  let ownerStaffId = "";
  let shiftId = "";
  let openShiftId = "";
  let clockId = "";

  test.beforeAll(async ({ browser }) => {
    const page = await browser.newPage();
    try {
      await signIn(page, ACCOUNTS.owner);
      const existing = await structure(page);

      departmentId =
        existing.departments.find((d) => d.name === DEPARTMENT)?.id ?? "";
      if (!departmentId) {
        const res = await page.request.post("/api/scheduling/structure", {
          data: { kind: "department", name: DEPARTMENT, color: "#a855f7" },
        });
        expect(res.status(), await res.text()).toBe(201);
        departmentId = ((await res.json()) as { id: string }).id;
      }

      positionId =
        existing.positions.find((p) => p.name === POSITION)?.id ?? "";
      if (!positionId) {
        const res = await page.request.post("/api/scheduling/structure", {
          data: {
            kind: "position",
            name: POSITION,
            departmentId,
            payType: "hourly",
            hourlyRate: RATE,
          },
        });
        expect(res.status(), await res.text()).toBe(201);
        positionId = ((await res.json()) as { id: string }).id;
      }

      const staff = (await (await page.request.get("/api/staff")).json()) as {
        rowId?: string;
        email: string;
      }[];
      ownerStaffId = staff.find((m) => m.email === ACCOUNTS.owner)?.rowId ?? "";
      expect(ownerStaffId, "the owner has a staff row").not.toBe("");

      // Find-or-create: the exclusion constraint refuses a second shift over
      // the same hours for the same person, so a rerun must reuse.
      const onDay = (await (
        await page.request.get(
          `/api/scheduling/shifts?from=${workedDay}&to=${workedDay}`,
        )
      ).json()) as {
        shifts: { id: string; employeeId?: string; positionId: string }[];
      };
      shiftId =
        onDay.shifts.find(
          (s) => s.employeeId === ownerStaffId && s.positionId === positionId,
        )?.id ?? "";
      if (!shiftId) {
        const made = await page.request.post("/api/scheduling/shifts", {
          data: {
            employeeId: ownerStaffId,
            departmentId,
            positionId,
            date: workedDay,
            startTime: "09:00",
            endTime: "17:00",
            status: "published",
          },
        });
        expect(made.status(), await made.text()).toBe(201);
        shiftId = ((await made.json()) as { id: string }).id;
      }

      // A shift with NOBODY on it — the only thing the schema knows about an
      // "open" shift, and what the Open tab now reports.
      openShiftId =
        onDay.shifts.find((s) => !s.employeeId && s.positionId === positionId)
          ?.id ?? "";
      if (!openShiftId) {
        const made = await page.request.post("/api/scheduling/shifts", {
          data: {
            employeeId: null,
            departmentId,
            positionId,
            date: workedDay,
            startTime: "18:00",
            endTime: "22:00",
            status: "published",
          },
        });
        expect(made.status(), await made.text()).toBe(201);
        openShiftId = ((await made.json()) as { id: string }).id;
      }

      // Clocked exactly the shift, so actual and scheduled agree and the
      // arithmetic stays checkable.
      const clocked = await page.request.post("/api/scheduling/clock", {
        data: {
          employeeId: ownerStaffId,
          shiftId,
          at: `${workedDay}T13:00:00.000Z`,
        },
      });
      if (clocked.status() === 201) {
        clockId = ((await clocked.json()) as { id: string }).id;
        const closed = await page.request.patch("/api/scheduling/clock", {
          data: { id: clockId, at: `${workedDay}T21:00:00.000Z` },
        });
        expect(closed.status(), await closed.text()).toBe(200);
      }
    } finally {
      await page.close();
    }
  });

  test.afterAll(async ({ browser }) => {
    const page = await browser.newPage();
    try {
      await signIn(page, ACCOUNTS.owner);
      const failures: string[] = [];

      if (clockId) {
        const gone = await page.request.delete(
          `/api/scheduling/clock?id=${clockId}`,
        );
        if (!gone.ok()) failures.push(`clock: ${gone.status()}`);
      }

      // BY ID, never a sweep — attendance is payroll.
      for (const id of [shiftId, openShiftId].filter(Boolean)) {
        const gone = await page.request.delete(
          `/api/scheduling/shifts?id=${id}`,
        );
        if (!gone.ok()) failures.push(`shift ${id}: ${gone.status()}`);
      }

      if (positionId) {
        const gone = await page.request.delete(
          `/api/scheduling/structure?position=${positionId}`,
        );
        if (!gone.ok()) failures.push(`position: ${gone.status()}`);
      }
      const dept = departmentId
        ? await page.request.delete(
            `/api/scheduling/structure?department=${departmentId}`,
          )
        : null;
      if (dept && !dept.ok()) failures.push(`department: ${dept.status()}`);

      for (const problem of failures)
        console.log(`cleanup PROBLEM: ${problem}`);
      console.log(
        `cleanup: department ${dept?.ok() ? "removed" : `NOT REMOVED (${dept?.status() ?? "no id"})`}`,
      );
    } finally {
      await page.close();
    }
  });

  test("the department filter offers real departments", async ({ page }) => {
    await signIn(page, ACCOUNTS.owner);
    await page.goto(REPORTS);
    await page.waitForLoadState("networkidle");

    // The filter used to be populated from the fixture's `departments`, so
    // picking one matched no real shift and the screen read as an empty
    // quarter. This department exists only because this spec made it.
    await page
      .getByRole("combobox")
      .filter({ hasText: /Department/i })
      .click();
    await expect(
      page.getByRole("option", { name: DEPARTMENT, exact: true }),
    ).toBeVisible({ timeout: 15000 });
    await page.keyboard.press("Escape");
  });

  test("hours and labour cost are computed from the real shift", async ({
    page,
  }) => {
    await signIn(page, ACCOUNTS.owner);
    await page.goto(REPORTS);
    await page.waitForLoadState("networkidle");

    // Scope to this department so the assertion is about THESE shifts and not
    // whatever else the facility has in the window.
    await page
      .getByRole("combobox")
      .filter({ hasText: /Department/i })
      .click();
    await page.getByRole("option", { name: DEPARTMENT, exact: true }).click();
    await page.waitForTimeout(1000);

    // ── TWO DIFFERENT, BOTH-CORRECT TOTALS ──────────────────────────────
    //
    // The KPI row is built from `hoursByEmployee`, which requires somebody to
    // be ON the shift — 8h at $25 = $200. The department table is built from
    // `hoursByDepartment`, which prices every shift in the department whether
    // or not it is assigned — 8h + 4h = 12h, $300.
    //
    // That distinction is real and worth pinning: a shift with nobody on it
    // still costs the facility something to cover. The first version of this
    // test asserted 12h/$300 with a page-wide regex and passed by matching the
    // department table while its comment claimed it was checking the KPIs —
    // green, and proving less than it said.
    // The VALUE renders before the LABEL inside a KPI card, so anchor on the
    // label and step up to the pair rather than trying to match a div whose
    // text begins with the label — it never does.
    const kpi = (label: string) =>
      page
        .locator("p")
        .filter({ hasText: new RegExp(`^${label}$`) })
        .locator("..");

    await expect(kpi("Scheduled hours")).toContainText("8h", {
      timeout: 15000,
    });
    await expect(kpi("Labor cost")).toContainText("$200");

    // The department breakdown is a card, not a table row — it sits under the
    // "Hours by department" chart, one tile per department.
    const deptTile = page
      .locator("div.rounded-md.border")
      .filter({ hasText: DEPARTMENT })
      .first();
    await expect(deptTile).toContainText("12h");
    await expect(deptTile).toContainText("$300");
  });

  test("the staff tab shows labour, and no invented revenue", async ({
    page,
  }) => {
    await signIn(page, ACCOUNTS.owner);
    await page.goto(REPORTS);
    await page.waitForLoadState("networkidle");

    await page.getByRole("tab", { name: /staff/i }).click();
    await page.waitForTimeout(500);

    const table = page.locator("table").first();
    await expect(table).toBeVisible({ timeout: 15000 });
    const head = await table.locator("thead").innerText();

    expect(head, "hours and cost, which are real").toMatch(/Hours/i);
    expect(head).toMatch(/Labour Cost/i);

    // Scoped to the header row, not the page: the tab strip and the KPI cards
    // carry words that would match a body-wide negative assertion.
    expect(head, "revenue is retail, which has no backend").not.toMatch(
      /Sales|Revenue|Labor %/i,
    );
  });

  test("the open tab counts unassigned shifts and claims nothing else", async ({
    page,
  }) => {
    await signIn(page, ACCOUNTS.owner);
    await page.goto(REPORTS);
    await page.waitForLoadState("networkidle");

    await page.getByRole("tab", { name: /open/i }).click();
    await page.waitForTimeout(500);

    const body = await page.locator("body").innerText();

    expect(body, "the real unassigned shift is listed").toContain(POSITION);
    expect(body).toContain("18:00");

    // The post-and-claim board these described does not exist.
    expect(body, "no fill rate").not.toMatch(/fill rate/i);
    expect(body, "no claim league table").not.toMatch(/Top claimers/i);
    expect(body).not.toMatch(/Expired/i);
  });
});
