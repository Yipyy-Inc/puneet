import { test, expect } from "@playwright/test";

import { ACCOUNTS, signIn } from "./_auth";

// ============================================================================
// Attendance, which grades named people `late` and `no-show`.
//
// ── WHAT IT WAS ───────────────────────────────────────────────────────────
//
// `reconcileShift` did `new Date(`${shift.date}T${shift.startTime}:00`)` — a
// date string with NO ZONE, which JavaScript parses in whatever zone the
// VIEWER is in. The times came out of the shift mapper in the facility's zone
// and were re-parsed locally, which undid it. A manager reading the rota from
// another city saw the whole team arriving hours late.
//
// And a shift that runs past midnight ENDS THE NEXT DAY. Comparing a 06:00
// clock-out against "06:00 on the shift's date" made a night worker look 1440
// minutes early — a whole day.
//
// Both were unreachable while the entries were a fixture nobody read. Making
// the time clock real (fb0f5699) is what put them in front of people.
//
// ── WHY THIS IS A BROWSER TEST ────────────────────────────────────────────
//
// The reconciliation is client-side, so there is no endpoint to ask. The
// symptom is a word on a screen — "On time" or "Arrived early" — next to a
// person's name, which is also exactly how a facility would meet the bug.
//
// ── AND WHY IT IS DETERMINISTIC ───────────────────────────────────────────
//
// The seeded facility is America/Toronto and the runner is not (Africa/Algiers
// locally, UTC in CI). Under the old code a clock-in at the exact scheduled
// instant read as hours early or late; under the fixed code it reads as zero
// wherever the test runs. The test would only be blind on a machine already
// set to Toronto.
// ============================================================================

const DEPARTMENT = "E2E Attendance Dept";
const POSITION = "E2E Attendance Position";
const ZONE = "America/Toronto";

const ATTENDANCE = "/facility/dashboard/services/scheduling/attendance";

type Page = import("@playwright/test").Page;

/** A day in the facility's own calendar, offset from today. */
function facilityDay(days: number): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(Date.now() + days * 86_400_000));
}

/**
 * The UTC instant at which a given wall-clock time occurs in `ZONE`.
 *
 * Written out here rather than imported: a test that verifies a timezone
 * conversion by calling the same conversion proves only that the function
 * equals itself.
 *
 * Reads the naive instant in the target zone, treats what it shows as if it
 * were UTC, and the difference between the two IS the offset.
 */
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

test.describe("attendance", () => {
  // Yesterday, so the shift is in the past and the screen's window includes it.
  // Two days back for the night shift, which starts the evening before.
  const day = facilityDay(-1);
  const nightDay = facilityDay(-2);

  let departmentId = "";
  let positionId = "";
  let groomerStaffId = "";
  const shifts: string[] = [];
  const entries: string[] = [];

  async function makeShift(
    page: Page,
    date: string,
    startTime: string,
    endTime: string,
  ): Promise<string> {
    const res = await page.request.post("/api/scheduling/shifts", {
      data: {
        employeeId: groomerStaffId,
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

  /** A session that matches its shift exactly — the "on time" case. */
  async function makeEntry(
    page: Page,
    shiftId: string,
    inAt: string,
    outAt: string,
  ): Promise<void> {
    const res = await page.request.post("/api/scheduling/clock", {
      data: { employeeId: groomerStaffId, shiftId, at: inAt },
    });
    expect(res.status(), await res.text()).toBe(201);
    const id = ((await res.json()) as { id: string }).id;
    entries.push(id);

    const closed = await page.request.patch("/api/scheduling/clock", {
      data: { id, at: outAt },
    });
    expect(closed.status(), await closed.text()).toBe(200);
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
          data: { kind: "department", name: DEPARTMENT, color: "#0ea5e9" },
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
      groomerStaffId =
        staff.find((m) => m.email === ACCOUNTS.groomer)?.rowId ?? "";
      expect(groomerStaffId).not.toBe("");

      // ── CHRONOLOGICAL ORDER, AND THE CONSTRAINT INSISTS ────────────────
      //
      // A clock-in with no clock-out claims `[t, ∞)`, so a BACKDATED open entry
      // overlaps every session that comes after it. Creating the day shift's
      // entry first and then the night shift's — which starts earlier — was
      // refused with "that overlaps a session this person already has", which
      // is the exclusion constraint being exactly right about a rota nobody
      // could have worked.
      //
      // Oldest first, each one closed before the next opens.

      // ── A NIGHT SHIFT, WORKED EXACTLY AS ROSTERED ──────────────────────
      //
      // 22:00 to 06:00 the FOLLOWING morning. Under the old arithmetic the
      // clock-out was compared against 06:00 on the shift's own date, which is
      // sixteen hours before the shift even started.
      const nightShift = await makeShift(page, nightDay, "22:00", "06:00");
      await makeEntry(
        page,
        nightShift,
        zonedInstant(nightDay, "22:00"),
        zonedInstant(day, "06:00"),
      );

      // ── AND A DAY SHIFT, ALSO WORKED EXACTLY AS ROSTERED ───────────────
      const dayShift = await makeShift(page, day, "09:00", "17:00");
      await makeEntry(
        page,
        dayShift,
        zonedInstant(day, "09:00"),
        zonedInstant(day, "17:00"),
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

      // Entries first — they reference the shifts. By id, never a sweep:
      // attendance is what people are paid from.
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

      let shiftsRemoved = 0;
      for (const id of shifts) {
        const gone = await page.request.delete(
          `/api/scheduling/shifts?id=${id}`,
        );
        if (gone.ok()) shiftsRemoved++;
        else failures.push(`shift ${id}: ${gone.status()}`);
      }

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
        `cleanup: ${removed} entry(ies), ${shiftsRemoved} shift(s), ` +
          `position ${pos?.ok() ? "removed" : `NOT REMOVED (${pos?.status() ?? "no id"})`}, ` +
          `department ${dept?.ok() ? "removed" : `NOT REMOVED (${dept?.status() ?? "no id"})`}`,
      );
    } finally {
      await page.close();
    }
  });

  test("somebody who worked their shift exactly is on time", async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));

    await signIn(page, ACCOUNTS.owner);
    await page.goto(ATTENDANCE);
    await page.waitForLoadState("networkidle");

    await expect(page.getByText("Attendance").first()).toBeVisible({
      timeout: 15_000,
    });

    // ── SCOPED TO THE TABLE, NOT THE PAGE ───────────────────────────────
    //
    // The status FILTER lists every label — "Late", "Arrived early", "Stayed
    // late" — so a `not.toContain` over the whole body fails no matter what
    // the rows say. The first version of this test did exactly that and failed
    // for a reason with nothing to do with attendance.
    const table = page.locator("table").first();
    await expect(table).toBeVisible({ timeout: 15_000 });
    const rows = await table.innerText();

    expect(
      await page.locator("body").innerText(),
      "past the loading state",
    ).not.toContain("No attendance records");

    // ── THE TIMEZONE ────────────────────────────────────────────────────
    //
    // The runner is not in Toronto. Under the old code a clock-in at the exact
    // scheduled instant read as hours early — the offset between the reader
    // and the facility — and the screen said "Arrived early" beside somebody
    // who arrived on the dot.
    expect(rows, "not graded against the reader's clock").not.toContain(
      "Arrived early",
    );
    expect(rows, "and not late either").not.toContain("Late");

    // ── THE OVERNIGHT SHIFT ─────────────────────────────────────────────
    //
    // A 22:00 – 06:00 shift ends the NEXT day. Comparing the clock-out against
    // 06:00 on the shift's own date made a night worker look a whole day out.
    expect(rows, "the night shift is not graded a day early").not.toContain(
      "Left early",
    );
    expect(rows, "nor a day late").not.toContain("Stayed late");

    // Both sessions read as worked-as-rostered.
    expect(rows).toContain("On time");

    expect(errors.filter((e) => !e.includes("favicon"))).toEqual([]);
  });

  test("the reliability figure counts both sessions", async ({ page }) => {
    await signIn(page, ACCOUNTS.owner);
    await page.goto(ATTENDANCE);
    await page.waitForLoadState("networkidle");
    await expect(page.getByText("Attendance").first()).toBeVisible({
      timeout: 15_000,
    });

    const body = await page.locator("body").innerText();

    // 100% only holds if BOTH shifts reconciled cleanly. With either bug
    // present one of them would be graded and the rate would drop — which is
    // the number a manager would actually look at.
    expect(body, "every session worked as rostered").toContain("100%");
  });
});
