import { test, expect } from "@playwright/test";

import { ACCOUNTS, signIn } from "./_auth";

// ============================================================================
// The scheduling module's main calendar writes to the database.
//
// ── WHAT IT WAS ───────────────────────────────────────────────────────────
//
// `/facility/dashboard/services/scheduling` renders `ScheduleView`, which held
// the entire rota in `useState(scheduleShifts)` over a fixture. A manager could
// plan a week, drag shifts around, publish it, and reload to find none of it —
// while `/scheduling/roster`, one tab away, read the real table. Two calendars
// of the same shifts, disagreeing.
//
// `handleSaveDraft` was `toast.success("Draft saved")` and nothing else.
//
// ── WHAT THIS COVERS ──────────────────────────────────────────────────────
//
// The endpoints the calendar now drives: PATCH (which did not exist, although
// the DELETE handler's own docstring said it did) and the bulk publish. The
// interesting cases are the refusals — a drag that would double-book, and a
// supervisor who may move shifts but may not publish the week.
//
// ── IT CLEANS UP ──────────────────────────────────────────────────────────
//
// One Postgres, and CI writes to it. Shifts, then the position, then the
// department — positions RESTRICT their department, shifts RESTRICT theirs.
// ============================================================================

const DEPARTMENT = "E2E Calendar Dept";
const POSITION = "E2E Calendar Position";

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

type Page = import("@playwright/test").Page;

function facilityDay(days: number): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Toronto",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(Date.now() + days * 86_400_000));
}

async function shiftsOn(page: Page, day: string): Promise<Shift[]> {
  const res = await page.request.get(
    `/api/scheduling/shifts?from=${day}&to=${day}`,
  );
  expect(res.ok(), await res.text()).toBe(true);
  return ((await res.json()) as { shifts: Shift[] }).shifts;
}

test.describe("the scheduling calendar", () => {
  const dayOne = facilityDay(260);
  const dayTwo = facilityDay(261);

  let departmentId = "";
  let positionId = "";
  let ownerStaffId = "";
  let groomerStaffId = "";

  async function makeShift(
    page: Page,
    staffId: string | null,
    date: string,
    startTime: string,
    endTime: string,
    status = "draft",
  ): Promise<Shift> {
    const res = await page.request.post("/api/scheduling/shifts", {
      data: {
        employeeId: staffId,
        departmentId,
        positionId,
        date,
        startTime,
        endTime,
        status,
      },
    });
    expect(res.status(), await res.text()).toBe(201);
    return (await res.json()) as Shift;
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
          data: { kind: "department", name: DEPARTMENT, color: "#14b8a6" },
        });
        expect(res.status(), await res.text()).toBe(201);
        departmentId = ((await res.json()) as { id: string }).id;
      }

      positionId =
        existing.positions.find((p) => p.name === POSITION)?.id ?? "";
      if (!positionId) {
        const res = await page.request.post("/api/scheduling/structure", {
          data: { kind: "position", name: POSITION, departmentId },
        });
        expect(res.status(), await res.text()).toBe(201);
        positionId = ((await res.json()) as { id: string }).id;
      }

      const staff = (await (await page.request.get("/api/staff")).json()) as {
        rowId?: string;
        email: string;
      }[];
      ownerStaffId = staff.find((m) => m.email === ACCOUNTS.owner)?.rowId ?? "";
      groomerStaffId =
        staff.find((m) => m.email === ACCOUNTS.groomer)?.rowId ?? "";

      expect(ownerStaffId).not.toBe("");
      expect(groomerStaffId).not.toBe("");
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
      let seen = 0;

      for (const day of [dayOne, dayTwo]) {
        for (const shift of await shiftsOn(page, day)) {
          if (shift.positionId !== positionId) continue;
          seen++;
          const gone = await page.request.delete(
            `/api/scheduling/shifts?id=${shift.id}`,
          );
          if (gone.ok()) removed++;
          else failures.push(`shift ${shift.id}: ${gone.status()}`);
        }
      }
      if (seen !== removed)
        failures.push(`shifts: saw ${seen}, removed ${removed}`);

      const live = (await (
        await page.request.get("/api/scheduling/structure")
      ).json()) as {
        departments: { id: string; name: string }[];
        positions: { id: string; name: string }[];
      };
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

      for (const problem of failures)
        console.log(`cleanup PROBLEM: ${problem}`);
      console.log(
        `cleanup: ${removed} shift(s), ` +
          `position ${pos?.ok() ? "removed" : `NOT REMOVED (${pos?.status() ?? "no id"})`}, ` +
          `department ${dept?.ok() ? "removed" : `NOT REMOVED (${dept?.status() ?? "no id"})`}`,
      );
    } finally {
      await page.close();
    }
  });

  test("dragging a shift to another day moves the row", async ({ page }) => {
    await signIn(page, ACCOUNTS.owner);

    const shift = await makeShift(page, ownerStaffId, dayOne, "09:00", "17:00");

    // A drag sends the new day and nothing else. The route reads the row and
    // rebuilds both instants from it — a caller that had to resend six fields it
    // did not change would get one of them wrong eventually.
    const moved = await page.request.patch("/api/scheduling/shifts", {
      data: { id: shift.id, date: dayTwo },
    });
    expect(moved.status(), await moved.text()).toBe(200);

    const after = (await moved.json()) as Shift;
    expect(after.date, "the day it was dropped on").toBe(dayTwo);
    expect(after.startTime, "and the times came along unchanged").toBe("09:00");
    expect(after.endTime).toBe("17:00");

    // Read back, because the response could be right while the row is not.
    const onOldDay = await shiftsOn(page, dayOne);
    expect(onOldDay.some((s) => s.id === shift.id)).toBe(false);
    const onNewDay = await shiftsOn(page, dayTwo);
    expect(onNewDay.some((s) => s.id === shift.id)).toBe(true);
  });

  test("unassigning is a value, not an omission", async ({ page }) => {
    await signIn(page, ACCOUNTS.owner);

    const shift = await makeShift(page, ownerStaffId, dayOne, "07:00", "08:00");

    const opened = await page.request.patch("/api/scheduling/shifts", {
      data: { id: shift.id, employeeId: null },
    });
    expect(opened.status(), await opened.text()).toBe(200);

    // `null` makes it OPEN. A route that treated null as "not sent" would leave
    // the person on the shift and report success — the shape this project keeps
    // finding.
    expect(
      ((await opened.json()) as Shift).employeeId,
      "nobody is on it now",
    ).toBeUndefined();
  });

  test("a drag that would double-book somebody is refused", async ({
    page,
  }) => {
    await signIn(page, ACCOUNTS.owner);

    await makeShift(page, groomerStaffId, dayTwo, "12:00", "20:00");
    const other = await makeShift(page, ownerStaffId, dayOne, "13:00", "18:00");

    const clash = await page.request.patch("/api/scheduling/shifts", {
      data: { id: other.id, employeeId: groomerStaffId, date: dayTwo },
    });

    expect(clash.status(), await clash.text()).toBe(409);
    expect(await clash.text()).toContain("already on a shift");

    // Nothing moved. A card that snapped to the new day and then failed would
    // leave the screen disagreeing with the table.
    const stillThere = await shiftsOn(page, dayOne);
    expect(
      stillThere.find((s) => s.id === other.id)?.employeeId,
      "the owner still has it, on the day it started",
    ).toBe(ownerStaffId);
  });

  test("publishing takes the week's drafts and nothing else", async ({
    page,
  }) => {
    await signIn(page, ACCOUNTS.owner);

    const inWeek = await makeShift(page, null, dayOne, "06:00", "06:30");
    // Far outside the window being published — a facility plans weeks ahead and
    // publishing "the drafts" would push out next month's unfinished rota too.
    const outside = await makeShift(
      page,
      null,
      facilityDay(300),
      "06:00",
      "06:30",
    );

    const published = await page.request.post(
      "/api/scheduling/shifts/publish",
      {
        data: { departmentId, from: dayOne, to: dayOne },
      },
    );
    expect(published.status(), await published.text()).toBe(200);
    expect(
      ((await published.json()) as { published: number }).published,
      "at least the one draft in the window",
    ).toBeGreaterThanOrEqual(1);

    const onDay = await shiftsOn(page, dayOne);
    expect(onDay.find((s) => s.id === inWeek.id)?.status).toBe("published");

    const later = await shiftsOn(page, facilityDay(300));
    expect(
      later.find((s) => s.id === outside.id)?.status,
      "the one outside the window is untouched",
    ).toBe("draft");

    await page.request.delete(`/api/scheduling/shifts?id=${outside.id}`);
  });

  test("publishing an empty week is not an error", async ({ page }) => {
    await signIn(page, ACCOUNTS.owner);

    // Everything in this window is published by now. Zero is an ordinary
    // answer — `deniedIfUntouched` would turn "nothing to do" into "you may
    // not", which is why the route asks the permission instead of inferring it
    // from the row count.
    const again = await page.request.post("/api/scheduling/shifts/publish", {
      data: { departmentId, from: facilityDay(320), to: facilityDay(320) },
    });

    expect(again.status(), await again.text()).toBe(200);
    expect(((await again.json()) as { published: number }).published).toBe(0);
  });

  test("a groomer cannot publish a schedule", async ({ page }) => {
    await signIn(page, ACCOUNTS.groomer);

    const refused = await page.request.post("/api/scheduling/shifts/publish", {
      data: { departmentId, from: dayOne, to: dayTwo },
    });

    // `scheduling_publish` is NARROWER than editing, deliberately: owner, admin
    // and manager hold it. A 403 rather than "0 published", because those are
    // different facts and only one of them is about permission.
    expect(refused.status(), await refused.text()).toBe(403);
    expect(await refused.text()).toContain("permission to publish");
  });
});
