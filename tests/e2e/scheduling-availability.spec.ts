import { test, expect } from "@playwright/test";

import { ACCOUNTS, signIn } from "./_auth";

// ============================================================================
// When people can actually work.
//
// ── WHAT IT WAS ───────────────────────────────────────────────────────────
//
// `employeeAvailabilities` in src/data/scheduling.ts, keyed on `emp-1`,
// `emp-2` … — legacy ids that matched no staff row after the conversion to
// uuids. `checkAvailability` looked every employee up in that array, found
// nothing, and returned null. So the draft-review panel said "Schedule looks
// clean" about a rota whose availability had not been checked at all.
//
// That is the expensive kind of wrong: a missing warning is indistinguishable
// from a warning that was not needed.
//
// The 664-line approval screen was the same fixture with an Approve button on
// it, stamping `reviewedBy: "emp-1"` and promising the change "will apply from
// the effective date" — a future application nothing scheduled.
//
// ── THE TEST THAT MATTERS MOST IS THE THIRD ───────────────────────────────
//
// Approving must APPLY the week, in the same transaction that marks the
// request. A proposal marked approved whose pattern was never written is the
// shift-swap bug again: two people believe something the rota disagrees with.
//
// ── IT CLEANS UP ──────────────────────────────────────────────────────────
//
// One Postgres, and CI writes to it. Requests first, then the pattern rows —
// and the pattern is deleted through the same policy that wrote it.
// ============================================================================

type Page = import("@playwright/test").Page;

interface Day {
  dayOfWeek: number;
  isAvailable: boolean;
  startTime?: string;
  endTime?: string;
}

interface Request {
  id: string;
  employeeId: string;
  employeeName: string;
  currentAvailability: Day[];
  proposedAvailability: Day[];
  effectiveFrom: string;
  status: string;
  reviewedBy?: string;
  applied?: Day[];
}

interface Payload {
  patterns: Record<string, Day[]>;
  requests: Request[];
  canDecide: boolean;
}

/** Sunday off, Mon–Thu 07:00–18:00, Friday all day, Saturday off. */
function week(): Day[] {
  return [
    { dayOfWeek: 0, isAvailable: false },
    { dayOfWeek: 1, isAvailable: true, startTime: "07:00", endTime: "18:00" },
    { dayOfWeek: 2, isAvailable: true, startTime: "07:00", endTime: "18:00" },
    { dayOfWeek: 3, isAvailable: true, startTime: "07:00", endTime: "18:00" },
    // A night worker's window wraps past midnight — the same convention shifts
    // use, and not a data error.
    { dayOfWeek: 4, isAvailable: true, startTime: "22:00", endTime: "06:00" },
    { dayOfWeek: 5, isAvailable: true },
    { dayOfWeek: 6, isAvailable: false },
  ];
}

async function availability(page: Page): Promise<Payload> {
  const res = await page.request.get("/api/scheduling/availability?status=all");
  expect(res.ok(), await res.text()).toBe(true);
  return (await res.json()) as Payload;
}

test.describe("staff availability", () => {
  let groomerStaffId = "";

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
      expect(groomerStaffId, "the groomer has a staff row").not.toBe("");
    } finally {
      await page.close();
    }
  });

  test.afterAll(async ({ browser }) => {
    const page = await browser.newPage();
    try {
      await signIn(page, ACCOUNTS.owner);

      const failures: string[] = [];
      const live = await availability(page);

      const mine = live.requests.filter((r) => r.employeeId === groomerStaffId);
      let removed = 0;
      for (const request of mine) {
        const gone = await page.request.delete(
          `/api/scheduling/availability?id=${request.id}`,
        );
        if (gone.ok()) removed++;
        else failures.push(`request ${request.id}: ${gone.status()}`);
      }
      if (removed !== mine.length) {
        failures.push(`requests: saw ${mine.length}, removed ${removed}`);
      }

      // CLEARED, not reset to "available all week". Those are different facts:
      // unstated produces no conflict either way, while a stated all-week
      // pattern is a claim that this person is free at 3am on a Sunday. The
      // first version of this cleanup left the second behind and called it
      // clean, because the two are indistinguishable to every reader today —
      // which is exactly how residue survives.
      const cleared = await page.request.delete(
        `/api/scheduling/availability?staff=${groomerStaffId}`,
      );
      const clearedDays = cleared.ok()
        ? ((await cleared.json()) as { cleared: number }).cleared
        : -1;
      if (!cleared.ok()) {
        failures.push(`pattern: ${cleared.status()}`);
      }

      for (const problem of failures)
        console.log(`cleanup PROBLEM: ${problem}`);
      console.log(
        `cleanup: ${removed} request(s), ${clearedDays} pattern day(s)`,
      );
    } finally {
      await page.close();
    }
  });

  test("a proposal has to be a whole week", async ({ page }) => {
    await signIn(page, ACCOUNTS.groomer);

    const partial = await page.request.post("/api/scheduling/availability", {
      data: {
        proposed: [{ dayOfWeek: 1, isAvailable: true }],
        effectiveFrom: "2027-03-01",
      },
    });

    expect(partial.status(), await partial.text()).toBe(422);
    expect(await partial.text()).toContain("whole week");

    // Half a window is not a window. The table refuses it too; saying so here
    // means a form gets a sentence rather than a constraint name.
    const half = week();
    half[1] = { dayOfWeek: 1, isAvailable: true, startTime: "09:00" };
    const lopsided = await page.request.post("/api/scheduling/availability", {
      data: { proposed: half, effectiveFrom: "2027-03-01" },
    });

    expect(lopsided.status(), await lopsided.text()).toBe(422);
    expect(await lopsided.text()).toContain("both a start and an end");
  });

  test("anybody may propose their own week", async ({ page }) => {
    await signIn(page, ACCOUNTS.groomer);

    const filed = await page.request.post("/api/scheduling/availability", {
      data: {
        proposed: week(),
        effectiveFrom: "2027-03-01",
        reason: "e2e — evenings free",
      },
    });
    expect(filed.status(), await filed.text()).toBe(201);
    const request = (await filed.json()) as Request;

    // Filed with no employeeId: the server resolved WHO from the session. That
    // is the only way a client cannot file a proposal in somebody else's name.
    expect(request.employeeId, "resolved from the session").toBe(
      groomerStaffId,
    );
    expect(request.status).toBe("pending");

    // `view_own_schedule` is personal and held by all thirteen job titles, so
    // no new permission had to be invented for this.
    const mine = await availability(page);
    expect(
      mine.canDecide,
      "but a groomer is told they may not decide one",
    ).toBe(false);

    // One open proposal per person: two pending means whichever is approved
    // second silently overwrites the first.
    const second = await page.request.post("/api/scheduling/availability", {
      data: { proposed: week(), effectiveFrom: "2027-04-01" },
    });
    expect(second.ok(), await second.text()).toBe(false);
    expect(await second.text()).toMatch(/already an open request|duplicate/i);
  });

  test("approving applies the week", async ({ page }) => {
    await signIn(page, ACCOUNTS.owner);

    const pending = await availability(page);
    expect(pending.canDecide, "an owner may decide").toBe(true);

    const request = pending.requests.find(
      (r) => r.employeeId === groomerStaffId && r.status === "pending",
    );
    expect(request, "the groomer's proposal").toBeTruthy();

    const approved = await page.request.patch("/api/scheduling/availability", {
      data: { id: request!.id, status: "approved", notes: "e2e" },
    });
    expect(approved.status(), await approved.text()).toBe(200);
    const decided = (await approved.json()) as Request;

    expect(decided.status).toBe("approved");
    // Stamped by the trigger from the JWT, not by the app from a hardcoded
    // "emp-1" — which is what the screen this replaced wrote for everybody.
    expect(decided.reviewedBy, "the real reviewer").toBeTruthy();

    // THE ONE THIS FEATURE EXISTS FOR. A request marked approved whose pattern
    // was never written is the shift-swap bug again.
    expect(decided.applied, "the week came back applied").toHaveLength(7);

    const live = await availability(page);
    const pattern = live.patterns[groomerStaffId];
    expect(pattern, "and it is in the table, on a fresh request").toHaveLength(
      7,
    );
    expect(pattern!.find((d) => d.dayOfWeek === 0)?.isAvailable).toBe(false);
    expect(pattern!.find((d) => d.dayOfWeek === 1)?.startTime).toBe("07:00");

    // An overnight availability window survives — `available_to <=
    // available_from` wraps, and there is deliberately no `to > from` check.
    const thursday = pattern!.find((d) => d.dayOfWeek === 4);
    expect(thursday?.startTime, "22:00 – 06:00 is a night worker").toBe(
      "22:00",
    );
    expect(thursday?.endTime).toBe("06:00");

    // Friday is available with no window: ALL DAY, not "no hours".
    const friday = pattern!.find((d) => d.dayOfWeek === 5);
    expect(friday?.isAvailable).toBe(true);
    expect(friday?.startTime, "no window means all day").toBeUndefined();
  });

  test("a decision is final", async ({ page }) => {
    await signIn(page, ACCOUNTS.owner);

    const live = await availability(page);
    const decided = live.requests.find(
      (r) => r.employeeId === groomerStaffId && r.status === "approved",
    );
    expect(decided, "the approved proposal").toBeTruthy();

    const again = await page.request.patch("/api/scheduling/availability", {
      data: { id: decided!.id, status: "denied" },
    });

    // Re-opening an approved proposal would move somebody's week back with
    // nothing recording that it happened.
    expect(again.status(), await again.text()).toBe(409);
    expect(await again.text()).toContain("already been approved");
  });

  test("a groomer cannot approve their own proposal", async ({ page }) => {
    await signIn(page, ACCOUNTS.groomer);

    const filed = await page.request.post("/api/scheduling/availability", {
      data: {
        proposed: week(),
        effectiveFrom: "2027-05-01",
        reason: "e2e — second proposal",
      },
    });
    expect(filed.status(), await filed.text()).toBe(201);
    const request = (await filed.json()) as Request;

    const tried = await page.request.patch("/api/scheduling/availability", {
      data: { id: request.id, status: "approved" },
    });

    // The trigger refuses: without `scheduling_manage_availability` the only
    // move is withdrawing your own. Otherwise setting your own hours would be
    // one POST and one PATCH away for every member of staff.
    expect(tried.ok(), await tried.text()).toBe(false);

    // And withdrawing IS allowed, which is the other half of the same rule.
    const withdrawn = await page.request.patch("/api/scheduling/availability", {
      data: { id: request.id, status: "cancelled" },
    });
    expect(withdrawn.status(), await withdrawn.text()).toBe(200);
    expect(((await withdrawn.json()) as Request).status).toBe("cancelled");
  });
});
