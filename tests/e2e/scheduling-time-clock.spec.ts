import { test, expect } from "@playwright/test";

import { ACCOUNTS, signIn } from "./_auth";

// ============================================================================
// The time clock.
//
// ── WHAT IT WAS ───────────────────────────────────────────────────────────
//
// `src/lib/employee/clock-store.ts` — a `Map` in module scope. Not
// localStorage, not a cookie: memory. Somebody clocks in, refreshes the page,
// and was never there. Two tabs disagree with each other. Closing the laptop
// ends the shift and the record of it never existed.
//
// Its own comment said "TODO: back with real time-clock / attendance when a
// backend exists". Meanwhile `staff_hr_config.require_clock_in_confirm` was
// real and settable — a confirmation dialog guarding a write that went nowhere.
//
// ── THE TESTS THAT MATTER ─────────────────────────────────────────────────
//
// "clocking in twice" and "the session survives the request" are the pair. The
// first is what an app-side check cannot hold — two devices, or one impatient
// double-tap, both pass it, and only the exclusion constraint refuses. The
// second is the whole point: the row is still there on a fresh request.
//
// ── IT CLEANS UP ──────────────────────────────────────────────────────────
//
// One Postgres, and CI writes to it. Attendance is an employment record, so
// this suite deletes only entries it created, by id.
// ============================================================================

type Page = import("@playwright/test").Page;

interface Entry {
  id: string;
  employeeId: string;
  employeeName: string;
  shiftId?: string;
  clockedInAt: string;
  clockedOutAt?: string;
  minutesWorked?: number;
  source: "self" | "manager";
  notes?: string;
}

interface Payload {
  entries: Entry[];
  open: Entry | null;
  canSeeEveryone: boolean;
}

async function clock(page: Page): Promise<Payload> {
  const res = await page.request.get("/api/scheduling/clock");
  expect(res.ok(), await res.text()).toBe(true);
  return (await res.json()) as Payload;
}

test.describe("the time clock", () => {
  const created = new Set<string>();
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
      let removed = 0;

      // BY ID, not by a sweep. Attendance is what people are paid from, and a
      // cleanup that deletes "everything recent" in a shared database is one
      // bad filter away from erasing somebody's week.
      for (const id of created) {
        const gone = await page.request.delete(
          `/api/scheduling/clock?id=${id}`,
        );
        if (gone.ok()) removed++;
        else failures.push(`entry ${id}: ${gone.status()}`);
      }
      if (removed !== created.size) {
        failures.push(`entries: created ${created.size}, removed ${removed}`);
      }

      for (const problem of failures)
        console.log(`cleanup PROBLEM: ${problem}`);
      console.log(`cleanup: ${removed} entry(ies)`);
    } finally {
      await page.close();
    }
  });

  test("a session survives the request that started it", async ({ page }) => {
    await signIn(page, ACCOUNTS.groomer);

    const started = await page.request.post("/api/scheduling/clock", {
      data: {},
    });
    expect(started.status(), await started.text()).toBe(201);
    const entry = (await started.json()) as Entry;
    created.add(entry.id);

    // Sent with no employeeId: the server resolved WHO from the session. A
    // client that can name the staff id can clock somebody else in, and
    // attendance is what people are paid from.
    expect(entry.employeeId, "resolved from the session").toBe(groomerStaffId);
    expect(entry.source, "they clocked themselves in").toBe("self");
    expect(entry.clockedOutAt, "on the clock, so no end").toBeUndefined();
    expect(
      entry.minutesWorked,
      "and no duration yet — NOT zero",
    ).toBeUndefined();

    // The whole point. On a fresh request, from the database.
    const state = await clock(page);
    expect(state.open?.id, "still on the clock after a reload").toBe(entry.id);
  });

  test("clocking in twice is refused by the database", async ({ page }) => {
    await signIn(page, ACCOUNTS.groomer);

    const again = await page.request.post("/api/scheduling/clock", {
      data: {},
    });

    // An app-side "are they already clocked in?" check cannot hold this: two
    // devices, or one impatient double-tap, both pass it. Only the exclusion
    // constraint over [clocked_in_at, coalesce(clocked_out_at, 'infinity'))
    // refuses.
    expect(again.status(), await again.text()).toBe(409);
    expect(await again.text()).toContain("already clocked in");
  });

  test("clocking out closes the same row and derives the minutes", async ({
    page,
  }) => {
    await signIn(page, ACCOUNTS.groomer);

    const before = await clock(page);
    expect(before.open, "still on the clock from the first test").toBeTruthy();

    const stopped = await page.request.patch("/api/scheduling/clock", {
      data: {},
    });
    expect(stopped.status(), await stopped.text()).toBe(200);
    const entry = (await stopped.json()) as Entry;

    // THE SAME ROW. A second row would record a session boundary that did not
    // happen and make "how long did they work" a join.
    expect(entry.id, "the row that was already open").toBe(before.open!.id);
    expect(entry.clockedOutAt).toBeTruthy();
    // Generated column, so three screens cannot each round it differently.
    expect(
      entry.minutesWorked,
      "derived by the database",
    ).toBeGreaterThanOrEqual(0);

    const after = await clock(page);
    expect(after.open, "off the clock now").toBeNull();
  });

  test("clocking out when you are not clocked in says so", async ({ page }) => {
    await signIn(page, ACCOUNTS.groomer);

    const nothing = await page.request.patch("/api/scheduling/clock", {
      data: {},
    });

    // Not a 500, and not a silent success. "You are not clocked in" is an
    // answer about the state of the day.
    expect(nothing.status(), await nothing.text()).toBe(409);
    expect(await nothing.text()).toContain("not clocked in");
  });

  test("undo puts the same session back", async ({ page }) => {
    await signIn(page, ACCOUNTS.groomer);

    const started = await page.request.post("/api/scheduling/clock", {
      data: {},
    });
    expect(started.status(), await started.text()).toBe(201);
    const entry = (await started.json()) as Entry;
    created.add(entry.id);

    await page.request.patch("/api/scheduling/clock", { data: {} });

    // The clock-out toast offers Undo, and RLS allows reopening YOUR OWN entry
    // for two minutes — which is what a mis-tap is. Without that carve-out the
    // affordance would be a button that cannot do what it says, and correcting
    // a stray tap would need a manager.
    const undone = await page.request.patch("/api/scheduling/clock", {
      data: { id: entry.id, reopen: true },
    });
    expect(undone.status(), await undone.text()).toBe(200);
    expect(
      ((await undone.json()) as Entry).clockedOutAt,
      "back on the clock, same row",
    ).toBeUndefined();

    const state = await clock(page);
    expect(state.open?.id).toBe(entry.id);

    // Tidy up: leave nobody on the clock.
    await page.request.patch("/api/scheduling/clock", { data: {} });
  });

  test("a manager stamping for somebody else is recorded as such", async ({
    page,
  }) => {
    await signIn(page, ACCOUNTS.owner);

    const stamped = await page.request.post("/api/scheduling/clock", {
      data: {
        employeeId: groomerStaffId,
        at: "2027-06-01T14:00:00.000Z",
        notes: "e2e — manager correction",
      },
    });
    expect(stamped.status(), await stamped.text()).toBe(201);
    const entry = (await stamped.json()) as Entry;
    created.add(entry.id);

    // `source` separates "they clocked out" from "a manager closed it for
    // them". Conflating them makes a corrected timesheet indistinguishable
    // from a worked one, which is the thing a pay dispute turns on.
    expect(entry.source, "stamped by somebody else").toBe("manager");
    expect(entry.employeeId).toBe(groomerStaffId);

    // A clock-out cannot precede the clock-in, even by a manager's hand.
    const backwards = await page.request.patch("/api/scheduling/clock", {
      data: { id: entry.id, at: "2027-06-01T13:00:00.000Z" },
    });
    expect(backwards.status(), await backwards.text()).toBe(422);
    expect(await backwards.text()).toContain("cannot come before");

    const closed = await page.request.patch("/api/scheduling/clock", {
      data: { id: entry.id, at: "2027-06-01T20:30:00.000Z" },
    });
    expect(closed.status(), await closed.text()).toBe(200);
    expect(
      ((await closed.json()) as Entry).minutesWorked,
      "six and a half hours",
    ).toBe(390);
  });

  test("a groomer cannot clock somebody else in", async ({ page }) => {
    await signIn(page, ACCOUNTS.groomer);

    const staff = (await (await page.request.get("/api/staff")).json()) as {
      rowId?: string;
      email: string;
    }[];
    const ownerStaffId = staff.find((m) => m.email === ACCOUNTS.owner)?.rowId;
    expect(ownerStaffId).toBeTruthy();

    const tried = await page.request.post("/api/scheduling/clock", {
      data: { employeeId: ownerStaffId },
    });

    // `clock_in_out` is personal and covers YOUR OWN row. Stamping for somebody
    // else needs `scheduling_edit_shifts`, which a groomer does not hold — so
    // RLS refuses the insert outright.
    expect(tried.ok(), await tried.text()).toBe(false);
    expect(tried.status()).toBe(403);
  });

  test("a groomer sees their own entries and not everybody's", async ({
    page,
  }) => {
    await signIn(page, ACCOUNTS.groomer);

    const state = await clock(page);

    // `scheduling_view_all` is the same key that decides whether the roster
    // shows you everybody or only yourself.
    expect(state.canSeeEveryone, "and is told so").toBe(false);
    expect(
      state.entries.every((entry) => entry.employeeId === groomerStaffId),
      "every entry they can read is their own",
    ).toBe(true);
  });
});
