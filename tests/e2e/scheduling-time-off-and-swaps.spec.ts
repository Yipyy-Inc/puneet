import { test, expect } from "@playwright/test";

import { ACCOUNTS, signIn } from "./_auth";

// ============================================================================
// Leave that is actually booked, and a swap that actually swaps.
//
// ── WHAT IT WAS ───────────────────────────────────────────────────────────
//
// time-off       useState over `enhancedTimeOffRequests`. Approving stamped
//                `reviewedBy: "emp-1"` — one hardcoded person — and the whole
//                decision was gone on reload.
// shift-swaps    localStorage. Approving marked the REQUEST approved, never
//                touched either shift, and then said "Both employees have been
//                notified."
//
// ── THE TWO TESTS THAT MATTER ─────────────────────────────────────────────
//
// "the shifts actually move" is the one this phase exists for. A swap that
// leaves the rota untouched is worse than no swap feature: two people believe
// they traded a Saturday and the roster disagrees with both of them.
//
// "a trade that would double-book somebody changes nothing" is its other half.
// The approval and the reassignment are ONE transaction, so a refusal cannot
// leave a request marked approved over shifts that never moved. That state is
// unreachable, and this is what says so.
//
// ── IT CLEANS UP ──────────────────────────────────────────────────────────
//
// One Postgres, and CI writes to it. Order is the schema's: swaps and leave
// first (they CASCADE from shifts, but deleting them explicitly is what proves
// the DELETE routes work), then shifts, then the position, then the department
// — positions RESTRICT their department and shifts RESTRICT their position.
// ============================================================================

const DEPARTMENT = "E2E Requests Dept";
const POSITION = "E2E Requests Position";

interface Structure {
  departments: { id: string; name: string }[];
  positions: { id: string; name: string }[];
}

interface Shift {
  id: string;
  employeeId?: string;
  date: string;
  startTime: string;
  positionId: string;
}

interface TimeOff {
  id: string;
  employeeId: string;
  employeeName: string;
  startDate: string;
  endDate: string;
  status: string;
  reviewedBy?: string;
  conflicts?: { shiftId: string }[];
}

interface Swap {
  id: string;
  status: string;
  requestingShiftId: string;
  targetShiftId?: string;
  moved?: { shiftId: string; nowAssignedTo: string | null }[];
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

type Page = import("@playwright/test").Page;

async function structure(page: Page): Promise<Structure> {
  const res = await page.request.get("/api/scheduling/structure");
  expect(res.ok(), await res.text()).toBe(true);
  return (await res.json()) as Structure;
}

async function shiftsOn(page: Page, day: string): Promise<Shift[]> {
  const res = await page.request.get(
    `/api/scheduling/shifts?from=${day}&to=${day}`,
  );
  expect(res.ok(), await res.text()).toBe(true);
  return ((await res.json()) as { shifts: Shift[] }).shifts;
}

test.describe("time off and shift swaps", () => {
  // Far out, and on days no other spec touches.
  const dayOne = facilityDay(240);
  const dayTwo = facilityDay(241);
  const dayThree = facilityDay(242);
  const dayFour = facilityDay(243);
  const dayFive = facilityDay(244);

  let departmentId = "";
  let positionId = "";
  let ownerStaffId = "";
  let groomerStaffId = "";

  async function makeShift(
    page: Page,
    staffId: string,
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
    return ((await res.json()) as Shift).id;
  }

  test.beforeAll(async ({ browser }) => {
    const page = await browser.newPage();
    try {
      await signIn(page, ACCOUNTS.owner);

      // Idempotent, because there is one database and a run that fails part-way
      // leaves its department behind. A `create` that insists on 201 then fails
      // every later run with a duplicate.
      const existing = await structure(page);

      departmentId =
        existing.departments.find((d) => d.name === DEPARTMENT)?.id ?? "";
      if (!departmentId) {
        const res = await page.request.post("/api/scheduling/structure", {
          data: { kind: "department", name: DEPARTMENT, color: "#8b5cf6" },
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

      // Two real people. `staff_shifts.staff_id` and this table's `staff_id` are
      // the ROW's uuid — `StaffProfile.id` is a legacy string and matches
      // nothing a foreign key points at.
      const staff = (await (await page.request.get("/api/staff")).json()) as {
        rowId?: string;
        email: string;
      }[];
      ownerStaffId = staff.find((m) => m.email === ACCOUNTS.owner)?.rowId ?? "";
      groomerStaffId =
        staff.find((m) => m.email === ACCOUNTS.groomer)?.rowId ?? "";

      expect(ownerStaffId, "the owner has a staff row").not.toBe("");
      expect(groomerStaffId, "the groomer has a staff row").not.toBe("");
    } finally {
      await page.close();
    }
  });

  test.afterAll(async ({ browser }) => {
    const page = await browser.newPage();
    try {
      await signIn(page, ACCOUNTS.owner);

      let swaps = 0;
      let leave = 0;
      const failures: string[] = [];

      const allSwaps = (await (
        await page.request.get("/api/scheduling/swaps?status=all")
      ).json()) as { swaps: (Swap & { requestingShiftId: string })[] };

      const allShiftIds = new Set<string>();
      for (const day of [dayOne, dayTwo, dayThree, dayFour, dayFive]) {
        for (const shift of await shiftsOn(page, day)) {
          if (shift.positionId === positionId) allShiftIds.add(shift.id);
        }
      }

      for (const swap of allSwaps.swaps) {
        if (!allShiftIds.has(swap.requestingShiftId)) continue;
        const gone = await page.request.delete(
          `/api/scheduling/swaps?id=${swap.id}`,
        );
        if (gone.ok()) {
          swaps++;
        } else {
          failures.push(`swap ${swap.id}: ${gone.status()}`);
        }
      }

      const allLeave = (await (
        await page.request.get("/api/scheduling/time-off?status=all")
      ).json()) as { requests?: TimeOff[] };

      // dayFIVE, not dayThree. When the double-grant test moved onto its own
      // pair of days this window did not follow, and two rows stayed in
      // production every run while the tally said "1 leave request(s)" and
      // looked fine. Counting only successes is how a cleanup lies.
      const mine = (allLeave.requests ?? []).filter(
        (r) => r.startDate >= dayOne && r.startDate <= dayFive,
      );

      for (const request of mine) {
        const gone = await page.request.delete(
          `/api/scheduling/time-off?id=${request.id}`,
        );
        if (gone.ok()) {
          leave++;
        } else {
          failures.push(
            `leave ${request.startDate}: ${gone.status()} ${await gone.text()}`,
          );
        }
      }

      if (leave !== mine.length) {
        failures.push(`leave: saw ${mine.length}, removed ${leave}`);
      }

      for (const id of allShiftIds) {
        await page.request.delete(`/api/scheduling/shifts?id=${id}`);
      }

      // Resolved by NAME rather than trusting beforeAll's captures: if
      // beforeAll itself failed those are empty strings, the deletes answer 400,
      // and the leftovers survive to break the next run too.
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

      // Loud, and on its own lines. A cleanup that reports only what it managed
      // to remove reads as a success while rows pile up in production.
      for (const problem of failures) {
        console.log(`cleanup PROBLEM: ${problem}`);
      }

      console.log(
        `cleanup: ${swaps} swap(s), ${leave} leave request(s), ` +
          `${allShiftIds.size} shift(s), ` +
          `position ${pos?.ok() ? "removed" : `NOT REMOVED (${pos?.status() ?? "no id"})`}, ` +
          `department ${dept?.ok() ? "removed" : `NOT REMOVED (${dept?.status() ?? "no id"})`}`,
      );
    } finally {
      await page.close();
    }
  });

  // ── Time off ────────────────────────────────────────────────────────────

  test("leave survives the request that filed it", async ({ page }) => {
    await signIn(page, ACCOUNTS.groomer);

    const filed = await page.request.post("/api/scheduling/time-off", {
      data: {
        type: "vacation",
        startDate: dayTwo,
        endDate: dayThree,
        reason: "e2e — two days",
      },
    });
    expect(filed.status(), await filed.text()).toBe(201);
    const request = (await filed.json()) as TimeOff;

    // Filed with no employeeId: the server resolved WHO from the session, which
    // is the only way a client cannot file leave in somebody else's name.
    expect(request.employeeId, "resolved from the session").toBe(
      groomerStaffId,
    );
    expect(request.status).toBe("pending");

    const read = (await (
      await page.request.get("/api/scheduling/time-off?status=pending")
    ).json()) as { requests: TimeOff[] };

    expect(
      read.requests.some((r) => r.id === request.id),
      "on a fresh request, from the database",
    ).toBe(true);
  });

  test("a groomer cannot decide their own request", async ({ page }) => {
    await signIn(page, ACCOUNTS.groomer);

    const mine = (await (
      await page.request.get("/api/scheduling/time-off?status=pending")
    ).json()) as { requests: TimeOff[]; canDecide: boolean };

    expect(
      mine.canDecide,
      "and is told so, so the screen can hide the buttons",
    ).toBe(false);

    const own = mine.requests.find((r) => r.employeeId === groomerStaffId);
    expect(own, "the groomer's own request").toBeTruthy();

    const tried = await page.request.patch("/api/scheduling/time-off", {
      data: { id: own!.id, status: "approved" },
    });

    // The trigger refuses: without the approve permission the only move is
    // withdrawing your own. Approving your own leave would otherwise be one
    // POST and one PATCH away for every member of staff.
    expect(tried.ok(), await tried.text()).toBe(false);
  });

  test("approving leave over a rostered shift says so", async ({ page }) => {
    await signIn(page, ACCOUNTS.owner);

    // The groomer is rostered on the second day of the leave they asked for.
    const clashing = await makeShift(
      page,
      groomerStaffId,
      dayTwo,
      "09:00",
      "17:00",
    );

    const pending = (await (
      await page.request.get("/api/scheduling/time-off?status=pending")
    ).json()) as { requests: TimeOff[]; canDecide: boolean };

    expect(pending.canDecide, "an owner may decide").toBe(true);
    const request = pending.requests.find(
      (r) => r.employeeId === groomerStaffId && r.startDate === dayTwo,
    );
    expect(request, "the groomer's request").toBeTruthy();

    const approved = await page.request.patch("/api/scheduling/time-off", {
      data: { id: request!.id, status: "approved", notes: "e2e" },
    });
    expect(approved.status(), await approved.text()).toBe(200);
    const decided = (await approved.json()) as TimeOff;

    expect(decided.status).toBe("approved");
    // Stamped by the trigger from the JWT, not by the app from a hardcoded
    // "emp-1" — which is what the screen this replaced wrote for everybody.
    expect(decided.reviewedBy, "the real reviewer").toBeTruthy();

    // THE ONE THIS FEATURE EXISTS FOR. Granting leave to somebody still on the
    // rota is the mistake, and it used to be completely silent.
    expect(
      decided.conflicts?.map((c) => c.shiftId),
      "the shift they are still rostered for, named",
    ).toContain(clashing);
  });

  test("the same days cannot be granted twice", async ({ page }) => {
    await signIn(page, ACCOUNTS.owner);

    // Its OWN pair of days, and its own approval. Reading the overlap off leave
    // another test happened to grant makes this pass or fail for reasons that
    // have nothing to do with what it is checking.
    const file = (startDate: string, endDate: string, reason: string) =>
      page.request.post("/api/scheduling/time-off", {
        data: {
          employeeId: groomerStaffId,
          type: "personal",
          startDate,
          endDate,
          reason,
        },
      });

    const first = await file(dayFour, dayFive, "e2e — granted first");
    expect(first.status(), await first.text()).toBe(201);
    const granted = await page.request.patch("/api/scheduling/time-off", {
      data: { id: ((await first.json()) as TimeOff).id, status: "approved" },
    });
    expect(granted.status(), await granted.text()).toBe(200);

    const second = await file(dayFive, dayFive, "e2e — overlaps granted leave");
    // Filing is fine — somebody changing their mind must be able to ask, and a
    // constraint that refused the REQUEST would make that impossible rather
    // than making the double-grant impossible.
    expect(second.status(), await second.text()).toBe(201);

    const twice = await page.request.patch("/api/scheduling/time-off", {
      data: { id: ((await second.json()) as TimeOff).id, status: "approved" },
    });

    // 409, not 500. "There is already leave granted over those days" is an
    // answer about the rota, and it arrived as a server fault until this
    // assertion pinned it — the raw constraint name, in front of a manager.
    expect(twice.status(), await twice.text()).toBe(409);
    expect(await twice.text()).toContain("already has leave granted");
  });

  // ── Swaps ───────────────────────────────────────────────────────────────

  test("the shifts actually move", async ({ page }) => {
    await signIn(page, ACCOUNTS.owner);

    // One each on the first day, four hours apart so they do not overlap.
    const ownerShift = await makeShift(
      page,
      ownerStaffId,
      dayOne,
      "08:00",
      "12:00",
    );
    const groomerShift = await makeShift(
      page,
      groomerStaffId,
      dayOne,
      "13:00",
      "17:00",
    );

    const filed = await page.request.post("/api/scheduling/swaps", {
      data: {
        requestingShiftId: ownerShift,
        requestingStaffId: ownerStaffId,
        targetStaffId: groomerStaffId,
        targetShiftId: groomerShift,
        reason: "e2e — a real trade",
      },
    });
    expect(filed.status(), await filed.text()).toBe(201);
    const swap = (await filed.json()) as Swap;

    const approved = await page.request.patch("/api/scheduling/swaps", {
      data: { id: swap.id, status: "approved" },
    });
    expect(approved.status(), await approved.text()).toBe(200);
    expect(((await approved.json()) as Swap).moved).toHaveLength(2);

    // And the ROSTER is what is checked, not the request. The store this
    // replaced marked the request approved and left both shifts exactly where
    // they were, which is a lie no assertion about the request would catch.
    const roster = await shiftsOn(page, dayOne);
    expect(
      roster.find((s) => s.id === ownerShift)?.employeeId,
      "the owner's morning is the groomer's now",
    ).toBe(groomerStaffId);
    expect(
      roster.find((s) => s.id === groomerShift)?.employeeId,
      "and the groomer's afternoon is the owner's",
    ).toBe(ownerStaffId);
  });

  test("a trade that would double-book somebody changes nothing", async ({
    page,
  }) => {
    await signIn(page, ACCOUNTS.owner);

    // The owner works the morning; the groomer already works a shift that
    // covers it, so taking the owner's morning would put them in two places.
    const ownerMorning = await makeShift(
      page,
      ownerStaffId,
      dayThree,
      "08:00",
      "12:00",
    );
    await makeShift(page, groomerStaffId, dayThree, "07:00", "15:00");

    const filed = await page.request.post("/api/scheduling/swaps", {
      data: {
        requestingShiftId: ownerMorning,
        requestingStaffId: ownerStaffId,
        targetStaffId: groomerStaffId,
        reason: "e2e — hand-off into a clash",
      },
    });
    expect(filed.status(), await filed.text()).toBe(201);
    const swap = (await filed.json()) as Swap;

    const refused = await page.request.patch("/api/scheduling/swaps", {
      data: { id: swap.id, status: "approved" },
    });

    expect(refused.status(), await refused.text()).toBe(409);
    expect(await refused.text()).toContain("two shifts at once");

    // Approving and reassigning are ONE transaction, so a refusal cannot leave
    // a request marked approved over shifts that never moved.
    const after = (await (
      await page.request.get("/api/scheduling/swaps?status=all")
    ).json()) as { swaps: Swap[] };
    expect(
      after.swaps.find((s) => s.id === swap.id)?.status,
      "still pending — nothing was half-applied",
    ).toBe("pending");

    const roster = await shiftsOn(page, dayThree);
    expect(
      roster.find((s) => s.id === ownerMorning)?.employeeId,
      "and the owner still has their morning",
    ).toBe(ownerStaffId);
  });

  test("you cannot offer a shift you are not on", async ({ browser }) => {
    // ── TWO SESSIONS, AND THE REASON IS ITSELF A RESULT ──────────────────
    //
    // The first version of this test signed in as the groomer and looked for
    // one of the owner's shifts on the roster. There are none to find: without
    // `scheduling_view_all` the read policy returns only your own shifts and
    // the open ones, so the groomer cannot even SEE the shift they are being
    // stopped from offering.
    //
    // That is the policy working, not the test failing — but it means the id
    // has to arrive from somewhere else, which is exactly the case worth
    // covering. Somebody who learns an id they were never shown still cannot
    // use it.
    const ownerPage = await browser.newPage();
    const groomerPage = await browser.newPage();

    try {
      await signIn(ownerPage, ACCOUNTS.owner);
      const notTheirs = await makeShift(
        ownerPage,
        ownerStaffId,
        dayFour,
        "09:00",
        "17:00",
      );

      await signIn(groomerPage, ACCOUNTS.groomer);

      // The groomer genuinely cannot see it — worth asserting, because if they
      // could, the refusal below would be the second line of defence rather
      // than the only one.
      const visible = await shiftsOn(groomerPage, dayFour);
      expect(
        visible.some((s) => s.id === notTheirs),
        "the groomer cannot see a shift that is not theirs",
      ).toBe(false);

      const tried = await groomerPage.request.post("/api/scheduling/swaps", {
        data: {
          requestingShiftId: notTheirs,
          targetStaffId: ownerStaffId,
          reason: "e2e — giving away somebody else's shift",
        },
      });

      // The requester is resolved from the SESSION, never sent, so this arrives
      // at the shape guard as "the groomer offering a shift assigned to the
      // owner". Without that guard an approver working through a queue would
      // apply a trade neither party asked for.
      expect(tried.status(), await tried.text()).toBe(422);
      expect(await tried.text()).toContain("shift you are assigned to");
    } finally {
      await ownerPage.close();
      await groomerPage.close();
    }
  });
});
