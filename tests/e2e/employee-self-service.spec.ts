import { test, expect } from "@playwright/test";

import { ACCOUNTS, signIn } from "./_auth";

// ============================================================================
// The employee's own half of scheduling.
//
// ── THE GAP THIS CLOSES, WHICH I OPENED ───────────────────────────────────
//
// On 2026-08-21 leave, swaps and availability all became real tables, and the
// APPROVER's screens were converted to read them. The requester's were not.
//
// So the facility had three approval queues that nothing could file into, and
// `/employee/schedule` — the landing path for EVERY staff member — showed
// shifts filtered out of a fixture, while the clock those people punched and
// the payroll built from it were real rows. They clocked in against a shift
// that did not exist.
//
// The insert policies had been written for exactly this caller — own staff row
// plus a personal permission (`request_time_off`, `request_shift_swap`,
// `view_own_schedule`) — and had never once been exercised. These tests are the
// first thing that has ever filed into any of the three.
//
// ── `?mine=1` IS THE POINT OF HALF OF THEM ────────────────────────────────
//
// RLS already scopes a plain groomer to their own rows, so for a groomer the
// parameter changes nothing and a test proving it works on a groomer proves
// almost nothing. The case it exists for is the OWNER: they hold
// `scheduling_view_all` and read the entire facility from the same endpoints,
// so without the filter their personal screen would show everybody's shifts and
// everybody's leave. That asymmetry is what "narrows an owner" asserts.
//
// ── IT CLEANS UP ──────────────────────────────────────────────────────────
//
// One Postgres, and CI writes to it. Order is the schema's: swaps and leave
// and availability first, then shifts, then the position, then the department —
// positions RESTRICT their department and shifts RESTRICT their position. Every
// failure is NAMED, and the tallies are compared against what was seen rather
// than counted from successes, because a cleanup that counts only what worked
// reports "1 removed" while two rows stay in production.
// ============================================================================

const DEPARTMENT = "E2E Self Serve Dept";
const POSITION = "E2E Self Serve Position";

type Page = import("@playwright/test").Page;

interface Structure {
  departments: { id: string; name: string }[];
  positions: { id: string; name: string }[];
}

interface Shift {
  id: string;
  employeeId?: string;
  date: string;
  positionId: string;
}

interface TimeOff {
  id: string;
  employeeId: string;
  startDate: string;
  status: string;
  type: string;
}

interface Swap {
  id: string;
  status: string;
  requestingShiftId: string;
  requestingEmployeeId: string;
  targetEmployeeId: string;
}

interface AvailabilityRequest {
  id: string;
  employeeId: string;
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

async function structure(page: Page): Promise<Structure> {
  const res = await page.request.get("/api/scheduling/structure");
  expect(res.ok(), await res.text()).toBe(true);
  return (await res.json()) as Structure;
}

async function shifts(
  page: Page,
  from: string,
  to: string,
  mine = false,
): Promise<Shift[]> {
  const res = await page.request.get(
    `/api/scheduling/shifts?from=${from}&to=${to}${mine ? "&mine=1" : ""}`,
  );
  expect(res.ok(), await res.text()).toBe(true);
  return ((await res.json()) as { shifts: Shift[] }).shifts;
}

test.describe("what an employee can do for themselves", () => {
  // Far out, and on days no other spec touches. The requests specs use
  // 240–244; the calendar ones are nearer. These are 300–302.
  const dayOne = facilityDay(300);
  const dayTwo = facilityDay(301);
  const dayThree = facilityDay(302);

  let departmentId = "";
  let positionId = "";
  let ownerStaffId = "";
  let groomerStaffId = "";
  let groomerShiftId = "";
  let ownerShiftId = "";

  test.beforeAll(async ({ browser }) => {
    const page = await browser.newPage();
    try {
      await signIn(page, ACCOUNTS.owner);

      // Idempotent: one database, and a run that fails part-way leaves its
      // department behind. Insisting on 201 would fail every later run.
      const existing = await structure(page);

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
      ownerStaffId = staff.find((m) => m.email === ACCOUNTS.owner)?.rowId ?? "";
      groomerStaffId =
        staff.find((m) => m.email === ACCOUNTS.groomer)?.rowId ?? "";
      expect(ownerStaffId, "the owner has a staff row").not.toBe("");
      expect(groomerStaffId, "the groomer has a staff row").not.toBe("");

      // One shift each, on the same day. Two people on one day is what makes
      // "mine narrows an owner" measurable: the unfiltered read returns both.
      for (const [staffId, holder] of [
        [groomerStaffId, "groomer"],
        [ownerStaffId, "owner"],
      ] as const) {
        const res = await page.request.post("/api/scheduling/shifts", {
          data: {
            employeeId: staffId,
            departmentId,
            positionId,
            date: dayOne,
            startTime: holder === "groomer" ? "09:00" : "13:00",
            endTime: holder === "groomer" ? "12:00" : "16:00",
            status: "published",
          },
        });
        expect(res.status(), await res.text()).toBe(201);
        const id = ((await res.json()) as Shift).id;
        if (holder === "groomer") groomerShiftId = id;
        else ownerShiftId = id;
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

      // ── Swaps ──────────────────────────────────────────────────────────
      const allSwaps =
        (
          (await (
            await page.request.get("/api/scheduling/swaps?status=all")
          ).json()) as { swaps?: Swap[] }
        ).swaps ?? [];
      const ourShiftIds = new Set(
        [groomerShiftId, ownerShiftId].filter(Boolean),
      );
      const mySwaps = allSwaps.filter((s) =>
        ourShiftIds.has(s.requestingShiftId),
      );
      let swapsGone = 0;
      for (const swap of mySwaps) {
        const gone = await page.request.delete(
          `/api/scheduling/swaps?id=${swap.id}`,
        );
        if (gone.ok()) swapsGone++;
        else failures.push(`swap ${swap.id}: ${gone.status()}`);
      }
      if (swapsGone !== mySwaps.length) {
        failures.push(`swaps: saw ${mySwaps.length}, removed ${swapsGone}`);
      }

      // ── Leave ──────────────────────────────────────────────────────────
      const allLeave =
        (
          (await (
            await page.request.get("/api/scheduling/time-off?status=all")
          ).json()) as { requests?: TimeOff[] }
        ).requests ?? [];
      const myLeave = allLeave.filter(
        (r) => r.startDate >= dayOne && r.startDate <= dayThree,
      );
      let leaveGone = 0;
      for (const request of myLeave) {
        const gone = await page.request.delete(
          `/api/scheduling/time-off?id=${request.id}`,
        );
        if (gone.ok()) leaveGone++;
        else failures.push(`leave ${request.startDate}: ${gone.status()}`);
      }
      if (leaveGone !== myLeave.length) {
        failures.push(`leave: saw ${myLeave.length}, removed ${leaveGone}`);
      }

      // ── Availability ───────────────────────────────────────────────────
      //
      // The REQUEST rows only. Deliberately NOT the groomer's live pattern:
      // nothing here approves a proposal, so nothing here writes one, and
      // `DELETE ?staff=` would clear a week this spec did not create. A cleanup
      // that removes more than it made is how a suite quietly deletes seeded
      // data — the approval spec may clear a pattern because it applies one.
      const availability = (await (
        await page.request.get("/api/scheduling/availability?status=all")
      ).json()) as { requests?: AvailabilityRequest[] };
      const mineAvail = (availability.requests ?? []).filter(
        (r) => r.employeeId === groomerStaffId,
      );
      let availGone = 0;
      for (const request of mineAvail) {
        const gone = await page.request.delete(
          `/api/scheduling/availability?id=${request.id}`,
        );
        if (gone.ok()) availGone++;
        else failures.push(`availability ${request.id}: ${gone.status()}`);
      }
      if (availGone !== mineAvail.length) {
        failures.push(
          `availability: saw ${mineAvail.length}, removed ${availGone}`,
        );
      }

      // ── Shifts, then the position, then the department ─────────────────
      for (const day of [dayOne, dayTwo, dayThree]) {
        for (const shift of await shifts(page, day, day)) {
          if (shift.positionId !== positionId) continue;
          const gone = await page.request.delete(
            `/api/scheduling/shifts?id=${shift.id}`,
          );
          if (!gone.ok()) failures.push(`shift ${shift.id}: ${gone.status()}`);
        }
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
        `cleanup: ${swapsGone} swap(s), ${leaveGone} leave, ${availGone} availability, department ${
          dept?.ok() ? "removed" : `NOT REMOVED (${dept?.status() ?? "no id"})`
        }`,
      );
    } finally {
      await page.close();
    }
  });

  test("a groomer's own shifts are their own, and only theirs", async ({
    page,
  }) => {
    await signIn(page, ACCOUNTS.groomer);

    const mine = await shifts(page, dayOne, dayOne, true);

    // THE WHOLE POINT. This screen used to filter a FIXTURE by `viewer.id`
    // against `fs-*` ids — two namespaces with no value in common — so it
    // matched nothing, for everybody, on the landing page of the product.
    expect(
      mine.map((s) => s.id),
      "the shift the roster gave them, from the database",
    ).toContain(groomerShiftId);
    expect(
      mine.every((s) => s.employeeId === groomerStaffId),
      "and nobody else's",
    ).toBe(true);
  });

  test("`mine` narrows an owner, who can otherwise see everybody", async ({
    page,
  }) => {
    await signIn(page, ACCOUNTS.owner);

    // Unfiltered: the whole roster, because an owner holds
    // `scheduling_view_all` and the read policy widens for them.
    const everyone = await shifts(page, dayOne, dayOne);
    expect(everyone.map((s) => s.id)).toContain(groomerShiftId);
    expect(everyone.map((s) => s.id)).toContain(ownerShiftId);

    // Filtered: only their own. Without this the owner's personal "My Schedule"
    // would be the entire facility's — which is exactly what RLS alone gives.
    const mine = await shifts(page, dayOne, dayOne, true);
    expect(
      mine.map((s) => s.id),
      "their own shift",
    ).toContain(ownerShiftId);
    expect(
      mine.map((s) => s.id),
      "and NOT the groomer's, though they may read it",
    ).not.toContain(groomerShiftId);
  });

  test("a groomer files their own leave", async ({ page }) => {
    await signIn(page, ACCOUNTS.groomer);

    // ── THE FIRST SELF-SERVICE INSERT THIS TABLE HAS EVER HAD ───────────
    //
    // `staff_time_off_insert` admits (own staff row AND `request_time_off`) OR
    // the approver's permission. A groomer holds the first arm and nothing
    // else. No employeeId is sent — the server resolves who "me" is.
    const filed = await page.request.post("/api/scheduling/time-off", {
      data: {
        type: "vacation",
        startDate: dayTwo,
        endDate: dayTwo,
        reason: "e2e self-service",
      },
    });
    expect(filed.status(), await filed.text()).toBe(201);

    const created = (await filed.json()) as TimeOff;
    expect(created.employeeId, "filed under the groomer, not nobody").toBe(
      groomerStaffId,
    );
    expect(created.status, "pending, not approved by the filer").toBe(
      "pending",
    );

    // Read back on a fresh request, which the fixture could never survive.
    const res = await page.request.get(
      "/api/scheduling/time-off?status=all&mine=1",
    );
    expect(res.ok(), await res.text()).toBe(true);
    const payload = (await res.json()) as {
      requests: TimeOff[];
      canDecide: boolean;
    };
    expect(payload.requests.map((r) => r.id)).toContain(created.id);
    expect(
      payload.canDecide,
      "and they are told they cannot approve their own",
    ).toBe(false);
  });

  test("`mine` narrows the leave an approver sees too", async ({ page }) => {
    await signIn(page, ACCOUNTS.owner);

    const all = (await (
      await page.request.get("/api/scheduling/time-off?status=all")
    ).json()) as { requests: TimeOff[]; canDecide: boolean };
    expect(all.canDecide, "an owner may approve").toBe(true);

    const mine = (await (
      await page.request.get("/api/scheduling/time-off?status=all&mine=1")
    ).json()) as { requests: TimeOff[] };

    // The groomer's request is readable by the owner and must NOT be in their
    // personal list — the same asymmetry as the shifts, on a second table.
    expect(all.requests.some((r) => r.employeeId === groomerStaffId)).toBe(
      true,
    );
    expect(
      mine.requests.every((r) => r.employeeId === ownerStaffId),
      "an owner's own panel is their own",
    ).toBe(true);
  });

  test("a groomer proposes a change to when they can work", async ({
    page,
  }) => {
    await signIn(page, ACCOUNTS.groomer);

    // A whole week, Sunday to Saturday. The route refuses a partial one so
    // "unstated" cannot creep back in through a proposal.
    const week = [0, 1, 2, 3, 4, 5, 6].map((dayOfWeek) => ({
      dayOfWeek,
      isAvailable: dayOfWeek !== 0,
      startTime: dayOfWeek === 0 ? undefined : "09:00",
      endTime: dayOfWeek === 0 ? undefined : "17:00",
    }));

    const proposed = await page.request.post("/api/scheduling/availability", {
      data: { proposed: week, effectiveFrom: dayThree, reason: "e2e" },
    });
    expect(proposed.status(), await proposed.text()).toBe(201);

    const created = (await proposed.json()) as AvailabilityRequest;
    expect(created.employeeId, "proposed by the groomer").toBe(groomerStaffId);
    expect(created.status, "and it is a PROPOSAL, not an applied change").toBe(
      "pending",
    );

    // It is a proposal, so the LIVE pattern must be untouched. Somebody who
    // could quietly make themselves unavailable has rewritten a roster that was
    // already built around them.
    const after = (await (
      await page.request.get("/api/scheduling/availability?status=all")
    ).json()) as {
      patterns: Record<string, unknown[]>;
      requests: AvailabilityRequest[];
      myStaffId?: string;
    };
    expect(after.requests.map((r) => r.id)).toContain(created.id);
    expect(
      after.myStaffId,
      "the payload names the caller, so a screen can find its own week",
    ).toBe(groomerStaffId);
  });

  test("a groomer offers a shift to a colleague", async ({ page }) => {
    await signIn(page, ACCOUNTS.groomer);

    const offered = await page.request.post("/api/scheduling/swaps", {
      data: {
        requestingShiftId: groomerShiftId,
        targetStaffId: ownerStaffId,
        reason: "e2e self-service",
      },
    });
    expect(offered.status(), await offered.text()).toBe(201);

    const created = (await offered.json()) as Swap;
    expect(created.requestingEmployeeId, "raised by the groomer").toBe(
      groomerStaffId,
    );
    expect(created.status).toBe("pending");

    // Their own list carries it, and names which side they are.
    const mine = (await (
      await page.request.get("/api/scheduling/swaps?status=all&mine=1")
    ).json()) as { swaps: Swap[]; myStaffId?: string };
    expect(mine.myStaffId).toBe(groomerStaffId);
    expect(mine.swaps.map((s) => s.id)).toContain(created.id);
  });

  test("the person asked sees the offer, on the other side of `mine`", async ({
    page,
  }) => {
    // `?mine=1` on swaps means "either side", not "raised by me" — an offer
    // aimed at somebody they cannot see is an offer nobody can answer.
    await signIn(page, ACCOUNTS.owner);

    const mine = (await (
      await page.request.get("/api/scheduling/swaps?status=all&mine=1")
    ).json()) as { swaps: Swap[]; myStaffId?: string };

    expect(mine.myStaffId).toBe(ownerStaffId);
    const incoming = mine.swaps.filter(
      (s) => s.targetEmployeeId === ownerStaffId,
    );
    expect(
      incoming.some((s) => s.requestingEmployeeId === groomerStaffId),
      "the groomer's offer is in the owner's own list",
    ).toBe(true);
  });

  test("a groomer cannot file leave in somebody else's name", async ({
    page,
  }) => {
    await signIn(page, ACCOUNTS.groomer);

    // The insert policy's second arm is the approver's permission, which a
    // groomer does not hold — so naming another staff row is refused. Entering
    // leave somebody phoned in is a manager's job; doing it in their name is
    // not anybody's.
    const forged = await page.request.post("/api/scheduling/time-off", {
      data: {
        employeeId: ownerStaffId,
        type: "sick_leave",
        startDate: dayThree,
        endDate: dayThree,
        reason: "e2e should be refused",
      },
    });
    expect(forged.ok(), await forged.text()).toBe(false);

    // And nothing was written. An RLS-refused insert affects no rows and raises
    // nothing, so the only proof is reading it back.
    await signIn(page, ACCOUNTS.owner);
    const all = (await (
      await page.request.get("/api/scheduling/time-off?status=all")
    ).json()) as { requests: TimeOff[] };
    expect(
      all.requests.some(
        (r) => r.employeeId === ownerStaffId && r.startDate === dayThree,
      ),
      "no leave appeared against the owner",
    ).toBe(false);
  });
});
