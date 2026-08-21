import { test, expect } from "@playwright/test";

import { ACCOUNTS, signIn } from "./_auth";

// ============================================================================
// The org chart, edited.
//
// ── THE GAP THIS CLOSES, WHICH I OPENED ───────────────────────────────────
//
// Departments, positions and shifts became real on 2026-08-20, and the
// calendar, roster, payroll and availability screens were converted to read
// them. The two screens where a facility DEFINES that org chart were not: they
// held everything in `useState` over a fixture.
//
// So a facility could add a department, watch it appear, reload, and find it
// gone — with the calendar next door reading a table that screen could not
// write to. Converting the readers first and leaving the editors is worse than
// leaving both alone: before, everything was at least equally unreal.
//
// ── AND `staff_departments` HAD NO WRITER AT ALL ──────────────────────────
//
// The table shipped with the roster, the structure route read it into
// `Department.employeeIds`, and NOTHING populated it — every department had
// zero declared members. The calendar only drew anybody because it falls back
// to "plus whoever is rostered this week". The membership test below is the
// first thing that has ever written that table.
//
// ── IT CLEANS UP ──────────────────────────────────────────────────────────
//
// One Postgres, and CI writes to it. Positions RESTRICT their department, so
// the order is members, positions, then the department — and that RESTRICT is
// itself asserted, because deleting the shape of an organisation out from
// under its shifts must fail loudly.
// ============================================================================

const DEPARTMENT = "E2E Org Dept";
const RENAMED = "E2E Org Dept Renamed";
const POSITION = "E2E Org Position";

type Page = import("@playwright/test").Page;

interface Structure {
  departments: {
    id: string;
    name: string;
    color: string;
    description?: string;
    employeeIds: string[];
  }[];
  positions: {
    id: string;
    name: string;
    departmentId: string;
    payType: string;
    hourlyRate?: number;
    salary?: number;
  }[];
  canSeePay: boolean;
}

async function structure(page: Page): Promise<Structure> {
  const res = await page.request.get("/api/scheduling/structure");
  expect(res.ok(), await res.text()).toBe(true);
  return (await res.json()) as Structure;
}

test.describe("the org chart", () => {
  let departmentId = "";
  let positionId = "";
  let groomerStaffId = "";
  let ownerStaffId = "";

  test.beforeAll(async ({ browser }) => {
    const page = await browser.newPage();
    try {
      await signIn(page, ACCOUNTS.owner);
      const staff = (await (await page.request.get("/api/staff")).json()) as {
        rowId?: string;
        email: string;
      }[];
      groomerStaffId =
        staff.find((m) => m.email === ACCOUNTS.groomer)?.rowId ?? "";
      ownerStaffId = staff.find((m) => m.email === ACCOUNTS.owner)?.rowId ?? "";
      expect(groomerStaffId).not.toBe("");
      expect(ownerStaffId).not.toBe("");
    } finally {
      await page.close();
    }
  });

  test.afterAll(async ({ browser }) => {
    const page = await browser.newPage();
    try {
      await signIn(page, ACCOUNTS.owner);

      const failures: string[] = [];
      const live = await structure(page);

      // Resolved by NAME as well as by the captured ids: a run that failed
      // part-way leaves them empty, the deletes answer 400, and the leftovers
      // break the next run too.
      const deptId =
        departmentId ||
        live.departments.find(
          (d) => d.name === RENAMED || d.name === DEPARTMENT,
        )?.id ||
        "";
      const posId =
        positionId || live.positions.find((p) => p.name === POSITION)?.id || "";

      if (deptId) {
        const members = await page.request.put("/api/scheduling/structure", {
          data: { departmentId: deptId, employeeIds: [] },
        });
        if (!members.ok()) failures.push(`members: ${members.status()}`);
      }

      if (posId) {
        const gone = await page.request.delete(
          `/api/scheduling/structure?position=${posId}`,
        );
        if (!gone.ok()) failures.push(`position: ${gone.status()}`);
      }

      const dept = deptId
        ? await page.request.delete(
            `/api/scheduling/structure?department=${deptId}`,
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

  test("a department survives the request that made it", async ({ page }) => {
    await signIn(page, ACCOUNTS.owner);

    const existing = await structure(page);
    departmentId =
      existing.departments.find((d) => d.name === DEPARTMENT)?.id ?? "";

    if (!departmentId) {
      const made = await page.request.post("/api/scheduling/structure", {
        data: {
          kind: "department",
          name: DEPARTMENT,
          color: "#6366f1",
          description: "e2e",
        },
      });
      expect(made.status(), await made.text()).toBe(201);
      departmentId = ((await made.json()) as { id: string }).id;
    }

    // THE WHOLE POINT. This screen used to hold departments in component state,
    // so the row below did not exist a moment after it was "created".
    const read = await structure(page);
    expect(
      read.departments.find((d) => d.id === departmentId)?.name,
      "on a fresh request, from the database",
    ).toBe(DEPARTMENT);
  });

  test("renaming a department is saved", async ({ page }) => {
    await signIn(page, ACCOUNTS.owner);

    const renamed = await page.request.patch("/api/scheduling/structure", {
      data: { kind: "department", id: departmentId, name: RENAMED },
    });
    expect(renamed.status(), await renamed.text()).toBe(200);
    expect(((await renamed.json()) as { name: string }).name).toBe(RENAMED);

    const read = await structure(page);
    expect(
      read.departments.find((d) => d.id === departmentId)?.name,
      "read back, not echoed",
    ).toBe(RENAMED);
  });

  test("two departments cannot share a name", async ({ page }) => {
    await signIn(page, ACCOUNTS.owner);

    const clash = await page.request.post("/api/scheduling/structure", {
      data: { kind: "department", name: RENAMED.toUpperCase() },
    });

    // Case-insensitive, because "Grooming" and "grooming" are one department
    // and a roster showing both is a roster nobody trusts.
    expect(clash.ok(), await clash.text()).toBe(false);
    expect(await clash.text()).toMatch(/already has a department/i);
  });

  test("a position carries what it pays", async ({ page }) => {
    await signIn(page, ACCOUNTS.owner);

    const made = await page.request.post("/api/scheduling/structure", {
      data: {
        kind: "position",
        name: POSITION,
        departmentId,
        payType: "hourly",
        hourlyRate: 21.5,
      },
    });
    expect(made.status(), await made.text()).toBe(201);
    positionId = ((await made.json()) as { id: string }).id;

    // Editing the RATE is what the screen could not do before — a facility set
    // a wage, saw it on screen, and payroll went on reading the table the form
    // never wrote to.
    const raised = await page.request.patch("/api/scheduling/structure", {
      data: {
        kind: "position",
        id: positionId,
        payType: "hourly",
        hourlyRate: 23,
      },
    });
    expect(raised.status(), await raised.text()).toBe(200);

    const read = await structure(page);
    const position = read.positions.find((p) => p.id === positionId);
    expect(position?.hourlyRate, "the new rate, from the pay table").toBe(23);
  });

  test("a department with a position in it cannot be deleted", async ({
    page,
  }) => {
    await signIn(page, ACCOUNTS.owner);

    const refused = await page.request.delete(
      `/api/scheduling/structure?department=${departmentId}`,
    );

    // RESTRICT, on purpose: a position in a deleted department is a role with
    // no place in the organisation, and the shifts pointing at it become
    // undescribable. 409 rather than 500 — "there is still something here" is
    // an answer, not a fault.
    expect(refused.status(), await refused.text()).toBe(409);
    expect(await refused.text()).toContain("still has positions");
  });

  test("who is in a department is finally written down", async ({ page }) => {
    await signIn(page, ACCOUNTS.owner);

    // ── THE FIRST WRITE `staff_departments` HAS EVER HAD ────────────────
    //
    // The table shipped with the roster and nothing populated it, so every
    // department had zero declared members and the calendar only drew people
    // via its "plus whoever is rostered" fallback.
    const saved = await page.request.put("/api/scheduling/structure", {
      data: {
        departmentId,
        employeeIds: [groomerStaffId, ownerStaffId],
      },
    });
    expect(saved.status(), await saved.text()).toBe(200);
    expect(
      ((await saved.json()) as { employeeIds: string[] }).employeeIds,
    ).toHaveLength(2);

    const read = await structure(page);
    const members =
      read.departments.find((d) => d.id === departmentId)?.employeeIds ?? [];
    expect(members, "both, on a fresh request").toHaveLength(2);
    expect(members).toContain(groomerStaffId);

    // A COMPLETE SET, not a diff: sending one name removes the other. Two
    // managers saving at once therefore leave the department with whatever the
    // last one saw, rather than an order-dependent merge.
    const trimmed = await page.request.put("/api/scheduling/structure", {
      data: { departmentId, employeeIds: [ownerStaffId] },
    });
    expect(trimmed.status(), await trimmed.text()).toBe(200);

    const after = await structure(page);
    const left =
      after.departments.find((d) => d.id === departmentId)?.employeeIds ?? [];
    expect(left, "only the one that was named").toEqual([ownerStaffId]);
  });

  test("a groomer cannot reshape the organisation", async ({ page }) => {
    await signIn(page, ACCOUNTS.groomer);

    // `manage_staff` AND facility-admin access, per the phase-1 policy. A
    // groomer holds neither.
    const created = await page.request.post("/api/scheduling/structure", {
      data: { kind: "department", name: "E2E Groomer Should Not Exist" },
    });
    expect(created.ok(), await created.text()).toBe(false);

    const renamed = await page.request.patch("/api/scheduling/structure", {
      data: { kind: "department", id: departmentId, name: "Hijacked" },
    });
    expect(renamed.ok(), await renamed.text()).toBe(false);

    const members = await page.request.put("/api/scheduling/structure", {
      data: { departmentId, employeeIds: [groomerStaffId] },
    });
    expect(members.ok(), await members.text()).toBe(false);

    // And nothing moved. An RLS-refused write affects no rows and raises
    // nothing, so the only proof is reading it back.
    await signIn(page, ACCOUNTS.owner);
    const read = await structure(page);
    expect(read.departments.find((d) => d.id === departmentId)?.name).toBe(
      RENAMED,
    );
  });

  test("a groomer sees the position and still not what it pays", async ({
    page,
  }) => {
    await signIn(page, ACCOUNTS.groomer);

    const read = await structure(page);
    const position = read.positions.find((p) => p.id === positionId);

    // The phase-1 guarantee, re-asserted now that a second screen writes pay:
    // `facility_position_pay` is a separate table because RLS is row-level and
    // cannot hide a column.
    expect(position?.name, "the position is visible").toBe(POSITION);
    expect(read.canSeePay, "and they are told they cannot see pay").toBe(false);
    expect(position?.hourlyRate, "no rate").toBeUndefined();
  });
});
