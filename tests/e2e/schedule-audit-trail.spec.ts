import { test, expect } from "@playwright/test";

import { ACCOUNTS, signIn } from "./_auth";

// ============================================================================
// The roster records what happened to it, and only the right people read it.
//
// ── WHAT THIS REPLACES ────────────────────────────────────────────────────
//
// `src/lib/schedule-audit.ts` — a module-level array that `ScheduleView`
// genuinely appended to, against a roster that is real Postgres. Shifts moved
// and the record of who moved them died with the process. Entries now come
// from `public.audit_log`, written by triggers (20260824200000).
//
// ── THE BOUNDARY IS A POLICY, NOT A ROUTE CHECK ───────────────────────────
//
// `/api/audit-log` no longer refuses a non-platform-admin. It asks and RLS
// answers, so a groomer gets **200 with an empty array** rather than 403. T2
// asserts exactly that, and T3 is its positive control: the same session can
// read something else, so "sees nothing" is a statement about this table and
// not about a broken sign-in.
//
// ── CLEANUP, AND THE ONE THING THAT CANNOT BE CLEANED ─────────────────────
//
// The shifts this file creates are recorded at creation and deleted by id in
// `afterAll`. The AUDIT ROWS they produce are NOT deleted and cannot be:
// `public.audit_log` refuses UPDATE, DELETE and TRUNCATE for every role
// including its owner, deliberately. So each run leaves a handful of "Shift
// created"/"Shift deleted" entries on the demo facility for ever.
//
// That is the correct behaviour of an append-only trail, not a leak, and it is
// written down here so the next person reading a growing table knows it was a
// decision. It is also why this spec creates a fixed, small number of shifts
// rather than looping.
// ============================================================================

const AUDIT = "/api/audit-log";
const SHIFTS = "/api/scheduling/shifts";
const STRUCTURE = "/api/scheduling/structure";
const SETTINGS = "/api/facility/settings";

const MARKER = "[e2e]";

type Page = import("@playwright/test").Page;

interface AuditEntry {
  id: string;
  timestamp: string;
  userName: string;
  action: string;
  category: string;
  entityType: string;
  entityId: string;
  entityName: string;
  facilityId: string;
  severity: string;
  description: string;
  changes: { field: string; oldValue: string; newValue: string }[];
}

/** Structure this spec owns, so it never depends on another file's leftovers. */
const OWN_DEPARTMENT = `${MARKER} audit dept`;
const OWN_POSITION = `${MARKER} audit position`;

let ownDepartmentId = "";
let ownPositionId = "";
const createdShiftIds: string[] = [];

async function ensureStructure(page: Page): Promise<void> {
  const existing = (await (await page.request.get(STRUCTURE)).json()) as {
    departments: { id: string; name: string }[];
    positions: { id: string; name: string }[];
  };

  ownDepartmentId =
    existing.departments.find((d) => d.name === OWN_DEPARTMENT)?.id ?? "";
  if (!ownDepartmentId) {
    const res = await page.request.post(STRUCTURE, {
      data: { kind: "department", name: OWN_DEPARTMENT, color: "#0ea5e9" },
    });
    expect(res.status(), await res.text()).toBe(201);
    ownDepartmentId = ((await res.json()) as { id: string }).id;
  }

  ownPositionId =
    existing.positions.find((p) => p.name === OWN_POSITION)?.id ?? "";
  if (!ownPositionId) {
    const res = await page.request.post(STRUCTURE, {
      data: {
        kind: "position",
        name: OWN_POSITION,
        departmentId: ownDepartmentId,
      },
    });
    expect(res.status(), await res.text()).toBe(201);
    ownPositionId = ((await res.json()) as { id: string }).id;
  }
}

/** A date far enough out that it cannot collide with a real roster. */
function futureDate(daysAhead: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysAhead);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

async function createShift(page: Page, date: string): Promise<string> {
  const res = await page.request.post(SHIFTS, {
    data: {
      departmentId: ownDepartmentId,
      positionId: ownPositionId,
      date,
      startTime: "09:00",
      endTime: "17:00",
      breakMinutes: 30,
      status: "draft",
    },
  });
  expect(res.ok(), await res.text()).toBe(true);
  const shift = (await res.json()) as { id: string };
  // Recorded at creation, before any assertion below can fail.
  createdShiftIds.push(shift.id);
  return shift.id;
}

/**
 * A shift a test deleted on purpose is no longer the teardown's business.
 *
 * Deleting it twice does NOT return 404. `deniedIfUntouched` sees an update
 * affecting zero rows and answers 403 — because an RLS refusal and a row that
 * is already gone are genuinely indistinguishable from the server's side. So
 * the teardown cannot simply tolerate 403: that would also swallow a real
 * refusal, which is the one thing it exists to catch. It stops tracking
 * instead.
 */
function forgetShift(id: string): void {
  const at = createdShiftIds.indexOf(id);
  if (at !== -1) createdShiftIds.splice(at, 1);
}

async function readTrail(page: Page, search = ""): Promise<AuditEntry[]> {
  const res = await page.request.get(`${AUDIT}${search}`);
  expect(res.ok(), await res.text()).toBe(true);
  return (await res.json()) as AuditEntry[];
}

test.describe("the schedule audit trail", () => {
  test.beforeAll(async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    await signIn(page, ACCOUNTS.owner);
    await ensureStructure(page);
    await context.close();
  });

  test.afterAll(async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    await signIn(page, ACCOUNTS.owner);

    // ── FAILURES ARE COLLECTED, NOT THROWN ────────────────────────────────
    //
    // An `expect` inside a cleanup loop turns one bad delete into a PARTIAL
    // cleanup: it throws, the remaining items are never touched, and what is
    // left behind is larger than the thing that failed. That is exactly how
    // this file leaked on its first run — the loop threw on a shift a test had
    // already deleted, so the other shifts survived, so the position could not
    // be removed, so the NEXT run reused that position by name and inherited an
    // orphan. One assertion, at the end, after everything has been attempted.
    const failures: string[] = [];

    async function remove(what: string, url: string): Promise<void> {
      const res = await page.request.delete(url);
      if (!res.ok() && res.status() !== 404) {
        failures.push(`${what}: ${res.status()} ${await res.text()}`);
      }
    }

    for (const shiftId of createdShiftIds) {
      await remove(`shift ${shiftId}`, `${SHIFTS}?id=${shiftId}`);
    }

    // Anything still standing on THIS SPEC'S position, inside the narrow window
    // it books into. Bounded by a position this file owns and a date range it
    // chose — not a sweep of the roster. It exists so a previous run that died
    // mid-teardown heals on the next one rather than blocking it for ever.
    if (ownPositionId) {
      const res = await page.request.get(
        `${SHIFTS}?from=${futureDate(190)}&to=${futureDate(215)}`,
      );
      if (res.ok()) {
        // The route answers { from, to, timeZone, shifts }, NOT a bare array.
        // Read the contract; do not assume it.
        const { shifts } = (await res.json()) as {
          shifts: { id: string; positionId?: string }[];
        };
        for (const shift of shifts ?? []) {
          if (shift.positionId !== ownPositionId) continue;
          await remove(`orphan shift ${shift.id}`, `${SHIFTS}?id=${shift.id}`);
        }
      }
    }

    // Position before department — both references are RESTRICT.
    if (ownPositionId) {
      await remove("position", `${STRUCTURE}?position=${ownPositionId}`);
    }
    if (ownDepartmentId) {
      await remove("department", `${STRUCTURE}?department=${ownDepartmentId}`);
    }

    await context.close();

    expect(
      failures,
      `cleanup left rows behind:\n${failures.join("\n")}`,
    ).toEqual([]);
  });

  test("the trail refuses anyone who is not signed in", async ({ page }) => {
    const res = await page.request.get(AUDIT);
    expect(res.status()).toBe(401);
  });

  test("a groomer gets an empty trail, not a refusal", async ({ page }) => {
    await signIn(page, ACCOUNTS.groomer);

    // 200 and empty. The route stopped deciding; `audit_log_facility_read`
    // admits facility ADMINS and a groomer is not one, so the database returns
    // nothing. A 403 here would mean the route had started second-guessing the
    // policy again.
    const res = await page.request.get(AUDIT);
    expect(res.status()).toBe(200);
    expect((await res.json()) as AuditEntry[]).toEqual([]);
  });

  test("the same groomer session can still read something else", async ({
    page,
  }) => {
    // THE POSITIVE CONTROL for the test above. Without it, "the groomer sees
    // nothing" passes just as well when the sign-in silently failed.
    await signIn(page, ACCOUNTS.groomer);
    const res = await page.request.get(SETTINGS);
    expect(res.ok(), await res.text()).toBe(true);
  });

  test("an owner reads their own facility, and only their own", async ({
    page,
  }) => {
    await signIn(page, ACCOUNTS.owner);
    const entries = await readTrail(page);

    expect(entries.length).toBeGreaterThan(0);

    // Every row carries a facility, and it is the same one. A row with no
    // facility is platform-level — who was made a Yipyy superadmin — and must
    // never appear in a facility's view.
    const facilities = new Set(entries.map((e) => e.facilityId));
    expect(
      [...facilities].filter((id) => id === "").length,
      "a platform-level row reached a facility admin",
    ).toBe(0);
    expect(facilities.size, `saw ${facilities.size} facilities`).toBe(1);
  });

  test("creating a shift is recorded, and the owner can read it back", async ({
    page,
  }) => {
    await signIn(page, ACCOUNTS.owner);
    const shiftId = await createShift(page, futureDate(200));

    const entries = await readTrail(page, "?entityTypes=shift");
    const mine = entries.find((e) => e.entityId === shiftId);

    expect(
      mine,
      "the shift that was just created is not in the trail",
    ).toBeTruthy();
    expect(mine?.action).toBe("Shift created");
    expect(mine?.category).toBe("Data");
    // Written by a trigger, so the actor is whoever held the session.
    expect(mine?.userName).toBeTruthy();
  });

  test("deleting a shift is recorded as its own act", async ({ page }) => {
    await signIn(page, ACCOUNTS.owner);
    const shiftId = await createShift(page, futureDate(201));

    const removed = await page.request.delete(`${SHIFTS}?id=${shiftId}`);
    expect(removed.ok(), await removed.text()).toBe(true);
    forgetShift(shiftId);

    const entries = await readTrail(page, "?entityTypes=shift");
    const forShift = entries.filter((e) => e.entityId === shiftId);

    // Both facts survive the row they describe. That is the point of a trail:
    // the shift is gone and the history of it is not.
    expect(forShift.map((e) => e.action).sort()).toEqual([
      "Shift created",
      "Shift deleted",
    ]);
  });

  test("a category that does not exist is refused, not ignored", async ({
    page,
  }) => {
    await signIn(page, ACCOUNTS.owner);
    // A filter silently dropped is worse than one refused — the caller reads a
    // full trail believing it is a narrowed one.
    const res = await page.request.get(`${AUDIT}?category=Nonsense`);
    expect(res.status()).toBe(400);
  });

  test("the screen shows the entries the database holds", async ({ page }) => {
    await signIn(page, ACCOUNTS.owner);
    const shiftId = await createShift(page, futureDate(202));

    await page.goto("/facility/dashboard/services/scheduling/audit");
    await expect(
      page.getByRole("heading", { name: "Schedule Audit Trail" }),
    ).toBeVisible();

    // The entry for the shift just created, rendered — not a fixture that
    // happens to look like one.
    await expect(page.getByText("Shift created").first()).toBeVisible({
      timeout: 15_000,
    });

    const entries = await readTrail(page, "?entityTypes=shift");
    expect(entries.some((e) => e.entityId === shiftId)).toBe(true);
  });

  test("a groomer who types the address is shown nothing", async ({ page }) => {
    await signIn(page, ACCOUNTS.groomer);
    await page.goto("/facility/dashboard/services/scheduling/audit");

    // Whatever the portal gate does with them, no audit content may render.
    await expect(page.getByText("Shift created")).toHaveCount(0);
  });
});
