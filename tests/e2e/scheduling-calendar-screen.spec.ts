import { test, expect } from "@playwright/test";

import { ACCOUNTS, signIn } from "./_auth";

// ============================================================================
// The scheduling calendar, through a browser.
//
// ── WHY A UI TEST AND NOT ONLY THE API ONE ────────────────────────────────
//
// `scheduling-calendar-writes.spec.ts` proves the endpoints. It cannot prove
// the screen reaches them, and that was the entire bug: `ScheduleView` held the
// rota in `useState` over a fixture, so every endpoint could have been perfect
// and a manager's week would still have vanished on reload.
//
// It also caught something no API test could. The grid is people down the side
// and days across the top, and the first conversion drew only the department's
// declared members — which nothing populates, because `staff_departments` has
// no writer yet. The calendar rendered, without errors, completely empty, with
// a real shift in the table underneath it.
//
// ── WHAT IT ASSERTS ───────────────────────────────────────────────────────
//
// A shift written to Postgres appears on the grid; the hours and the wage bill
// are computed from it; the draft bar counts it; and clicking Publish changes
// the ROW, not just the toast. The last one is the point — the bar used to say
// "Publish & Notify Staff" next to a "Save Draft" button whose whole
// implementation was `toast.success("Draft saved")`.
//
// ── WHAT IT CANNOT ASSERT, AND WHY ────────────────────────────────────────
//
// That the labour-cost tile is ABSENT rather than $0 for somebody who may not
// see pay. There is no identity that can reach this screen and lack the
// permission: `/facility/**` is admin-only (ADR 0005), admin access is forced by
// the job titles owner/admin/manager/supervisor, and all four hold
// `scheduling_view_labor_cost`. Every account without it is staff-level and is
// refused the portal before any of this renders.
//
// The withholding itself IS covered — `scheduling-roster.spec.ts` asserts a
// groomer reads a position with no rate on it. What is uncovered is this
// component's rendering of that absence, and forcing it would mean editing a
// real person's permissions in production mid-run. Recorded in the debt map
// instead, together with the sharper version of the same problem: the
// ACCOUNTANT holds the labour-cost permission and cannot reach one screen that
// uses it.
// ============================================================================

const DEPARTMENT = "E2E Calendar Screen Dept";
const POSITION = "E2E Calendar Screen Position";

const SCHEDULING = "/facility/dashboard/services/scheduling";

/** The facility's own today. Every seeded facility is Toronto. */
function facilityToday(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Toronto",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

test("the calendar draws Postgres and publishes back to it", async ({
  page,
}) => {
  // A screen that renders an empty grid without complaining is the failure this
  // test exists for, so a console error is a failure too.
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });

  await signIn(page, ACCOUNTS.owner);

  const today = facilityToday();
  let departmentId = "";
  let positionId = "";

  try {
    // ── Something to draw ──────────────────────────────────────────────
    //
    // Idempotent, because there is one database and a run that fails part-way
    // leaves its department behind — after which a create that insists on 201
    // fails every later run with a duplicate name.
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
        data: { kind: "department", name: DEPARTMENT, color: "#f97316" },
      });
      expect(res.status(), await res.text()).toBe(201);
      departmentId = ((await res.json()) as { id: string }).id;
    }

    positionId = existing.positions.find((p) => p.name === POSITION)?.id ?? "";
    if (!positionId) {
      const res = await page.request.post("/api/scheduling/structure", {
        data: {
          kind: "position",
          name: POSITION,
          departmentId,
          // A round rate, so the arithmetic below is checkable by eye:
          // 8h day + 8h night = 16h x $20 = $320.
          payType: "hourly",
          hourlyRate: 20,
        },
      });
      expect(res.status(), await res.text()).toBe(201);
      positionId = ((await res.json()) as { id: string }).id;
    }

    const staff = (await (await page.request.get("/api/staff")).json()) as {
      rowId?: string;
      email: string;
    }[];
    const me = staff.find((m) => m.email === ACCOUNTS.owner)?.rowId;
    expect(me, "the owner has a staff row").toBeTruthy();

    const made = await page.request.post("/api/scheduling/shifts", {
      data: {
        employeeId: me,
        departmentId,
        positionId,
        date: today,
        startTime: "09:00",
        endTime: "17:00",
        status: "draft",
      },
    });
    expect(made.status(), await made.text()).toBe(201);

    // ── AN OVERNIGHT SHIFT, ON PURPOSE ─────────────────────────────────
    //
    // `computeShiftHours` did `end - start` in minutes and clamped at zero, so
    // 22:00 – 06:00 was `360 - 1320 = -960` → **0 hours**. Nine call sites read
    // that helper: the week's total, overtime, attendance, conflict detection
    // and the reports. Every night shift counted as no work and cost nothing.
    //
    // Nobody is on it, so it cannot collide with the day shift above.
    const night = await page.request.post("/api/scheduling/shifts", {
      data: {
        employeeId: null,
        departmentId,
        positionId,
        date: today,
        startTime: "22:00",
        endTime: "06:00",
        status: "draft",
      },
    });
    expect(night.status(), await night.text()).toBe(201);

    // ── The screen ─────────────────────────────────────────────────────
    await page.goto(SCHEDULING);
    await page.waitForLoadState("networkidle");

    // The department picker lands on the first department, which may not be
    // this one — pick it explicitly rather than hoping.
    await expect(page.getByText(DEPARTMENT).first()).toBeVisible({
      timeout: 15_000,
    });

    const body = await page.locator("body").innerText();
    expect(body, "past the loading state").not.toContain(
      "Loading the schedule",
    );
    expect(body, "the shift from Postgres is on the grid").toContain("DRAFT");
    expect(body, "and the draft bar counted them").toContain(
      "waiting to be published",
    );

    // 8h day + 8h overnight. Before the fix the night shift contributed 0 and
    // this read "8h" — a plausible number, which is what made it survive.
    expect(
      body,
      "the overnight shift is counted, not clamped to zero",
    ).toContain("16h");

    // $20/h x 16h, from `facility_position_pay` via the structure route. The
    // tile read $0 while `calculateLaborCost` was a fixture over fixture rates.
    expect(body, "priced from the real pay table").toContain("$320");

    // ── Publish, the way a manager does ────────────────────────────────
    await page
      .getByRole("button", { name: "Publish", exact: true })
      .last()
      .click();

    // EXACT. `/shift.* published/` also matches "1 draft shift waiting to be
    // published", which is already on screen — so the assertion resolved
    // instantly, waited for nothing, and the row was read before the mutation
    // had finished. It then failed for the right reason with the wrong cause.
    await expect(page.getByText(/^\d+ shifts? published$/)).toBeVisible({
      timeout: 15_000,
    });

    // THE ROW, not the toast. A screen reporting success for a write that did
    // not happen is exactly what this whole conversion was about.
    const after = (await (
      await page.request.get(`/api/scheduling/shifts?from=${today}&to=${today}`)
    ).json()) as { shifts: { positionId: string; status: string }[] };

    expect(
      after.shifts.find((s) => s.positionId === positionId)?.status,
      "published in the database, not only on screen",
    ).toBe("published");

    expect(errors.filter((e) => !e.includes("favicon"))).toEqual([]);
  } finally {
    // One Postgres, and CI writes to it. Shifts, then the position, then the
    // department — positions RESTRICT their department, shifts RESTRICT theirs.
    if (positionId) {
      const shifts = (await (
        await page.request.get(
          `/api/scheduling/shifts?from=${today}&to=${today}`,
        )
      ).json()) as { shifts: { id: string; positionId: string }[] };
      for (const shift of shifts.shifts) {
        if (shift.positionId === positionId) {
          await page.request.delete(`/api/scheduling/shifts?id=${shift.id}`);
        }
      }
      await page.request.delete(
        `/api/scheduling/structure?position=${positionId}`,
      );
    }
    if (departmentId) {
      await page.request.delete(
        `/api/scheduling/structure?department=${departmentId}`,
      );
    }
  }
});
