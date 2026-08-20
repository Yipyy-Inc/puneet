import { test, expect } from "@playwright/test";

import { ACCOUNTS, signIn } from "./_auth";

// ============================================================================
// The roster is a table, and what a position pays is not everybody's business.
//
// ── WHAT IT WAS ───────────────────────────────────────────────────────────
//
// `RosterView` imported four fixtures straight from src/data/scheduling.ts:
// departments, positions, employees and shifts. A roster built in one browser
// did not exist in another, and a shift assigned to somebody was gone when the
// cache cleared. Thirteen scheduling screens are on localStorage; this is the
// first three off it.
//
// ── THE TEST THAT MATTERS MOST IS THE LAST ONE ────────────────────────────
//
// Pay lives in its own table because RLS is ROW-level and cannot hide a column.
// That design is only worth anything if a caller without
// `scheduling_view_labor_cost` actually gets nothing — so a groomer asks, and
// the answer has to be a position with no figures on it.
//
// ── IT CLEANS UP ──────────────────────────────────────────────────────────
//
// One Postgres, and CI writes to it. Shifts, positions and the department go in
// that order: positions RESTRICT their department and shifts RESTRICT their
// position, on purpose, so deleting out of order fails loudly rather than
// leaving a shift pointing at a role nobody can describe.
// ============================================================================

const DEPARTMENT = "E2E Roster Dept";
const POSITION = "E2E Roster Position";

interface Department {
  id: string;
  name: string;
  isActive: boolean;
}

interface Position {
  id: string;
  name: string;
  departmentId: string;
  payType: string;
  hourlyRate?: number;
  salary?: number;
}

interface Structure {
  departments: Department[];
  positions: Position[];
  canSeePay: boolean;
}

interface Shift {
  id: string;
  employeeId?: string;
  departmentId: string;
  positionId: string;
  date: string;
  startTime: string;
  endTime: string;
  status: string;
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

async function structure(
  page: import("@playwright/test").Page,
): Promise<Structure> {
  const res = await page.request.get("/api/scheduling/structure");
  expect(res.ok(), await res.text()).toBe(true);
  return (await res.json()) as Structure;
}

test.describe("the scheduling roster", () => {
  // Far out, so nothing else in the suite is looking at this day.
  const day = facilityDay(220);
  let departmentId = "";
  let positionId = "";
  let staffRowId = "";

  test.beforeAll(async ({ browser }) => {
    const page = await browser.newPage();
    try {
      await signIn(page, ACCOUNTS.owner);

      // ── IDEMPOTENT, BECAUSE THERE IS ONE DATABASE ─────────────────────
      //
      // A run that fails part-way leaves its department behind, and a `create`
      // that insists on 201 then fails every subsequent run with a duplicate —
      // so one bad run poisons the suite until somebody deletes rows by hand.
      // Reuse what is there; the tests below assert on behaviour, not on the
      // database having been empty when they started.
      const existing = await structure(page);

      departmentId =
        existing.departments.find((d) => d.name === DEPARTMENT)?.id ?? "";
      if (!departmentId) {
        const dept = await page.request.post("/api/scheduling/structure", {
          data: { kind: "department", name: DEPARTMENT, color: "#0ea5e9" },
        });
        expect(dept.status(), await dept.text()).toBe(201);
        departmentId = ((await dept.json()) as Department).id;
      }

      positionId =
        existing.positions.find((p) => p.name === POSITION)?.id ?? "";
      if (!positionId) {
        const pos = await page.request.post("/api/scheduling/structure", {
          data: {
            kind: "position",
            name: POSITION,
            departmentId,
            payType: "hourly",
            hourlyRate: 24.5,
          },
        });
        expect(pos.status(), await pos.text()).toBe(201);
        positionId = ((await pos.json()) as Position).id;
      }

      // A shift needs a real person, and `staff_shifts.staff_id` is the ROW's
      // uuid — `StaffProfile.id` is a legacy string and would match nothing.
      const staff = (await (await page.request.get("/api/staff")).json()) as {
        rowId?: string;
      }[];
      staffRowId = staff.find((member) => member.rowId)?.rowId ?? "";
      expect(staffRowId, "a staff member with a row id").not.toBe("");
    } finally {
      await page.close();
    }
  });

  test.afterAll(async ({ browser }) => {
    const page = await browser.newPage();
    try {
      await signIn(page, ACCOUNTS.owner);

      // In this order, and the order is the schema's: a position RESTRICTS its
      // department and a shift RESTRICTS its position. Going the other way
      // fails loudly, which is the point of RESTRICT.
      let shifts = 0;
      for (const on of [day, facilityDay(221)]) {
        const day_ = (await (
          await page.request.get(`/api/scheduling/shifts?from=${on}&to=${on}`)
        ).json()) as { shifts: Shift[] };
        for (const shift of day_.shifts) {
          if (shift.positionId !== positionId) continue;
          const gone = await page.request.delete(
            `/api/scheduling/shifts?id=${shift.id}`,
          );
          if (gone.ok()) shifts++;
        }
      }

      // Look the ids up rather than trusting the ones beforeAll captured: if
      // beforeAll itself failed — which it does when a previous run left the
      // department behind — those are empty strings, the DELETEs answer 400,
      // and the leftovers survive to break the NEXT run too. A cleanup that
      // only works after a clean run is not a cleanup.
      const live = await structure(page);
      const posId =
        positionId ||
        (live.positions.find((p) => p.name === POSITION)?.id ?? "");
      const deptId =
        departmentId ||
        (live.departments.find((d) => d.name === DEPARTMENT)?.id ?? "");

      const pos = posId
        ? await page.request.delete(
            `/api/scheduling/structure?position=${posId}`,
          )
        : null;
      const dept = deptId
        ? await page.request.delete(
            `/api/scheduling/structure?department=${deptId}`,
          )
        : null;

      console.log(
        `cleanup: ${shifts} shift(s), ` +
          `position ${pos?.ok() ? "removed" : `NOT REMOVED (${pos?.status() ?? "no id"})`}, ` +
          `department ${dept?.ok() ? "removed" : `NOT REMOVED (${dept?.status() ?? "no id"})`}`,
      );
    } finally {
      await page.close();
    }
  });

  test("a department and a position survive the request that made them", async ({
    page,
  }) => {
    await signIn(page, ACCOUNTS.owner);

    const { departments, positions } = await structure(page);
    const dept = departments.find((d) => d.id === departmentId);
    const pos = positions.find((p) => p.id === positionId);

    expect(dept?.name, "the department is there on a fresh request").toBe(
      DEPARTMENT,
    );
    expect(pos?.departmentId, "and the position belongs to it").toBe(
      departmentId,
    );
  });

  test("a shift is written and read back on the facility's clock", async ({
    page,
  }) => {
    await signIn(page, ACCOUNTS.owner);

    const created = await page.request.post("/api/scheduling/shifts", {
      data: {
        employeeId: staffRowId,
        departmentId,
        positionId,
        date: day,
        startTime: "09:00",
        endTime: "17:00",
        status: "published",
      },
    });
    // 409 means a previous run already put this exact shift there — the
    // exclusion constraint doing its job. Either way the assertions below read
    // it back from the database, which is what this test is about.
    expect([201, 409].includes(created.status()), await created.text()).toBe(
      true,
    );

    // Stored as an instant, drawn as a clock time. If the conversion were
    // wrong this is where a 09:00 shift becomes 04:00 or 14:00.
    const read = (await (
      await page.request.get(`/api/scheduling/shifts?from=${day}&to=${day}`)
    ).json()) as { shifts: Shift[] };
    const mine = read.shifts.find((s) => s.positionId === positionId);

    expect(mine?.date, "the day it was rostered for").toBe(day);
    expect(mine?.startTime, "and the time somebody typed").toBe("09:00");
    expect(mine?.endTime).toBe("17:00");
    expect(mine?.employeeId).toBe(staffRowId);
  });

  test("the same person cannot be in two places at once", async ({ page }) => {
    await signIn(page, ACCOUNTS.owner);

    // Overlaps the 09:00–17:00 shift above by an hour.
    const clash = await page.request.post("/api/scheduling/shifts", {
      data: {
        employeeId: staffRowId,
        departmentId,
        positionId,
        date: day,
        startTime: "16:00",
        endTime: "20:00",
        status: "published",
      },
    });

    expect(clash.status(), "refused by the exclusion constraint").toBe(409);
    // A sentence, not a constraint name: the person reading it is holding a
    // rota and needs to know what to do about it.
    expect(await clash.text()).toContain("already on a shift");
  });

  test("an overnight shift is not a negative one", async ({ page }) => {
    await signIn(page, ACCOUNTS.owner);

    const night = facilityDay(221);
    const created = await page.request.post("/api/scheduling/shifts", {
      data: {
        departmentId,
        positionId,
        date: night,
        startTime: "22:00",
        endTime: "06:00",
        status: "published",
      },
    });
    // An end at or before the start means the next day. Without that the row
    // would be an eight-hour shift ending sixteen hours before it began, which
    // `ends_at > starts_at` refuses. 409 is a leftover from a half-run.
    expect([201, 409].includes(created.status()), await created.text()).toBe(
      true,
    );

    const read = (await (
      await page.request.get(`/api/scheduling/shifts?from=${night}&to=${night}`)
    ).json()) as { shifts: Shift[] };
    const mine = read.shifts.find((s) => s.startTime === "22:00");

    expect(mine?.date, "it belongs to the day it STARTS on").toBe(night);
    expect(mine?.endTime).toBe("06:00");
  });

  test("a groomer sees the position and not what it pays", async ({ page }) => {
    // THE ONE THIS DESIGN EXISTS FOR. Pay is a separate table because RLS is
    // row-level and cannot hide a column; that is only worth something if a
    // caller without `scheduling_view_labor_cost` genuinely gets nothing.
    await signIn(page, ACCOUNTS.groomer);

    const { positions, canSeePay } = await structure(page);
    const pos = positions.find((p) => p.id === positionId);

    expect(pos?.name, "the groomer can see the position").toBe(POSITION);
    expect(canSeePay, "and is told they cannot see pay").toBe(false);
    expect(pos?.hourlyRate, "no rate").toBeUndefined();
    expect(pos?.salary, "no salary").toBeUndefined();
  });

  test("an owner sees what it pays", async ({ page }) => {
    await signIn(page, ACCOUNTS.owner);

    const { positions, canSeePay } = await structure(page);
    const pos = positions.find((p) => p.id === positionId);

    expect(canSeePay).toBe(true);
    expect(pos?.hourlyRate, "the rate the position was created with").toBe(
      24.5,
    );
  });
});
