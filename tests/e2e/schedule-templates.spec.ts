import { test, expect } from "@playwright/test";

import { ACCOUNTS, signIn } from "./_auth";

// ============================================================================
// Schedule templates: the week a facility keeps re-typing.
//
// ── WHAT IT REPLACES ──────────────────────────────────────────────────────
//
// `scheduleTemplates` in `src/data/scheduling.ts`, and an Apply button that
// said the template had been "applied as draft shifts, review and publish when
// ready" while creating nothing at all. The roster was real the whole time —
// six route groups deep — and the step from "here is our week" to "put it on
// the calendar" simply did not exist.
//
// ── WHAT IS PROVED HERE, AND WHAT IS PROVED IN SQL ────────────────────────
//
// `supabase/tests/schedule-templates.sql` holds the claims a route cannot
// make, and two of them are the reason this feature is risky at all:
//   S4   a template time is the FACILITY's time — 08:00 in America/Toronto is
//        12:00Z in August, asserted as an absolute instant so that "no
//        conversion" and "the wrong conversion" both fail.
//   S5   a night shift ends the NEXT morning. `end_time <= start_time` is
//        allowed, because a `check (end_time > start_time)` would have looked
//        obviously right and refused every night shift in the business.
//   S10  a supervisor may edit a shift and may not apply a template — the
//        function is SECURITY INVOKER, so `scheduling_create_shifts` still
//        decides.
//   S12  undoing a week removes that week and leaves the other.
//
// ── CLEANUP ───────────────────────────────────────────────────────────────
//
// Templates are DELETED here (they are configuration, and the route allows it)
// and the draft shifts they created are deleted too — a draft nobody published
// is not a record of anyone's hours. Weeks are picked far in the future so a
// run cannot collide with a real roster. Everything wears `[e2e]`.
// ============================================================================

const TEMPLATES = "/api/schedule-templates";
const SHIFTS = "/api/scheduling/shifts";
const STRUCTURE = "/api/scheduling/structure";

const MARKER = "[e2e]";

type Page = import("@playwright/test").Page;

interface TemplateShift {
  id: string;
  dayOfWeek: number;
  staffId: string | null;
  startTime: string;
  endTime: string;
  endsNextDay: boolean;
  slots: number;
}

interface Template {
  id: string;
  name: string;
  isActive: boolean;
  shifts: TemplateShift[];
  appliedWeeks: string[];
  weeklyHours: number;
}

interface ApplyResult {
  created: number;
  weekStart: string;
  shiftIds: string[];
}

function fresh(label: string): string {
  return `${MARKER} ${label} ${Date.now()}-${Math.floor(Math.random() * 1e4)}`;
}

/** A Sunday far enough out that no real roster and no other run is there. */
function futureSunday(weeksAhead: number): string {
  const d = new Date();
  d.setDate(d.getDate() - d.getDay() + weeksAhead * 7);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** The Saturday six days after a week's Sunday. */
function weekEnd(weekStart: string): string {
  const [y, m, d] = weekStart.split("-").map(Number);
  const end = new Date(Date.UTC(y, (m ?? 1) - 1, d));
  end.setUTCDate(end.getUTCDate() + 6);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${end.getUTCFullYear()}-${pad(end.getUTCMonth() + 1)}-${pad(end.getUTCDate())}`;
}

/**
 * A department and a position OF THIS SPEC'S OWN, created once and removed in
 * `afterAll`.
 *
 * This used to read the org chart and assert a position existed. It passed in
 * isolation and failed 8/8 in the full suite, every test on the same setup
 * line — because the demo facility has NO permanent positions. The only ones
 * that exist during a run are the ones `scheduling-attendance` and
 * `scheduling-org-chart` create and then delete, and both run before this file.
 *
 * So the precondition was satisfied by another spec's leftovers, which is a
 * pass for a reason nobody chose. Create what you need; do not assert that
 * somebody else left it lying around.
 */
const OWN_DEPARTMENT = `${MARKER} template dept`;
const OWN_POSITION = `${MARKER} template position`;

let ownDepartmentId = "";
let ownPositionId = "";

async function ensureStructure(page: Page): Promise<void> {
  const existing = (await (await page.request.get(STRUCTURE)).json()) as {
    departments: { id: string; name: string }[];
    positions: { id: string; name: string }[];
  };

  ownDepartmentId =
    existing.departments.find((d) => d.name === OWN_DEPARTMENT)?.id ?? "";
  if (!ownDepartmentId) {
    const res = await page.request.post(STRUCTURE, {
      data: { kind: "department", name: OWN_DEPARTMENT, color: "#7c3aed" },
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

function ownRoles(): { positionId: string; departmentId: string } {
  return { positionId: ownPositionId, departmentId: ownDepartmentId };
}

async function createTemplate(
  page: Page,
  body: Record<string, unknown>,
): Promise<Template> {
  const res = await page.request.post(TEMPLATES, { data: body });
  expect(res.ok(), await res.text()).toBe(true);
  return ((await res.json()) as { template: Template }).template;
}

/**
 * Every shift this file has created, so the teardown can remove them WITHOUT
 * having to find them again.
 *
 * This exists because of a real leak. The orphan cleanup used to sit at the
 * end of the test that creates one — so when an assertion above it failed, the
 * cleanup lines never ran, the template was already deleted, and two draft
 * shifts sat in the shared roster with nothing left pointing at them. A
 * teardown that only runs on the happy path is not a teardown.
 */
const createdShiftIds: string[] = [];

async function apply(
  page: Page,
  id: string,
  weekStart: string,
): Promise<ApplyResult> {
  const res = await page.request.post(`${TEMPLATES}/${id}/apply`, {
    data: { weekStart },
  });
  expect(res.ok(), await res.text()).toBe(true);
  const result = (await res.json()) as ApplyResult;
  // Recorded BEFORE any assertion in the calling test, so a failure below
  // still leaves the teardown able to clean up.
  createdShiftIds.push(...result.shiftIds);
  return result;
}

test.describe("schedule templates", () => {
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

    // The SHIFTS first, by the ids this file recorded as it made them. Not by
    // searching the roster: a template deleted mid-test takes its applied
    // weeks with it, and the shifts would be unfindable.
    for (const shiftId of createdShiftIds) {
      const removed = await page.request.delete(`${SHIFTS}?id=${shiftId}`);
      // 404 is fine — a test may have removed it already. Anything else means
      // the cleanup did not do what it thinks it did, and staying quiet about
      // that is how rows accumulate in a shared database.
      expect(
        removed.ok() || removed.status() === 404,
        `could not remove shift ${shiftId}: ${await removed.text()}`,
      ).toBe(true);
    }

    const res = await page.request.get(`${TEMPLATES}?includeRetired=1`);
    if (res.ok()) {
      const { templates } = (await res.json()) as { templates: Template[] };
      for (const template of templates) {
        if (!template.name.startsWith(MARKER)) continue;
        await page.request.delete(`${TEMPLATES}/${template.id}`);
      }
    }

    // The org-chart rows this file created. Position before department — both
    // references are RESTRICT, so the department cannot go while a position
    // still points at it, and the position cannot go while a shift does.
    //
    // ASSERTED, not fired and forgotten. A 409 here means a shift above was
    // missed, and the difference between "cleaned up" and "silently left two
    // rows in a shared database" is exactly this expectation.
    const orgRows: { what: string; id: string }[] = [
      { what: "position", id: ownPositionId },
      { what: "department", id: ownDepartmentId },
    ];
    for (const { what, id } of orgRows) {
      if (!id) continue;
      const removed = await page.request.delete(`${STRUCTURE}?${what}=${id}`);
      expect(
        removed.ok() || removed.status() === 404,
        `could not remove the ${what} this spec created: ${await removed.text()}`,
      ).toBe(true);
    }

    await context.close();
  });

  test("a template with no name cannot be created", async ({ page }) => {
    await signIn(page, ACCOUNTS.owner);
    const res = await page.request.post(TEMPLATES, { data: { name: "  " } });
    expect(res.status()).toBe(400);
  });

  test("a shift line is checked before anything is written", async ({
    page,
  }) => {
    await signIn(page, ACCOUNTS.owner);
    const { positionId, departmentId } = ownRoles();

    const badDay = await page.request.post(TEMPLATES, {
      data: {
        name: fresh("bad day"),
        shifts: [
          {
            dayOfWeek: 9,
            departmentId,
            positionId,
            startTime: "08:00",
            endTime: "16:00",
          },
        ],
      },
    });
    expect(badDay.status()).toBe(400);

    const badTime = await page.request.post(TEMPLATES, {
      data: {
        name: fresh("bad time"),
        shifts: [
          {
            dayOfWeek: 1,
            departmentId,
            positionId,
            startTime: "8am",
            endTime: "16:00",
          },
        ],
      },
    });
    expect(badTime.status()).toBe(400);
  });

  test("a night shift is ordinary, not a validation error", async ({
    page,
  }) => {
    await signIn(page, ACCOUNTS.owner);
    const { positionId, departmentId } = ownRoles();

    // 22:00 to 06:00. A naive `endTime > startTime` check would refuse this,
    // and it would look perfectly reasonable doing so.
    const template = await createTemplate(page, {
      name: fresh("night"),
      shifts: [
        {
          dayOfWeek: 2,
          departmentId,
          positionId,
          startTime: "22:00",
          endTime: "06:00",
        },
      ],
    });

    expect(template.shifts).toHaveLength(1);
    expect(template.shifts[0].endsNextDay).toBe(true);
    // Eight hours across midnight, not minus sixteen.
    expect(template.weeklyHours).toBe(8);
  });

  test("applying creates draft shifts on the week asked for", async ({
    page,
  }) => {
    await signIn(page, ACCOUNTS.owner);
    const { positionId, departmentId } = ownRoles();

    const template = await createTemplate(page, {
      name: fresh("apply"),
      shifts: [
        {
          dayOfWeek: 1,
          departmentId,
          positionId,
          startTime: "08:00",
          endTime: "16:00",
        },
        {
          dayOfWeek: 3,
          departmentId,
          positionId,
          startTime: "08:00",
          endTime: "16:00",
        },
      ],
    });

    const week = futureSunday(30);
    const result = await apply(page, template.id, week);
    expect(result.created).toBe(2);
    expect(result.weekStart).toBe(week);

    // Read the roster back rather than trusting the write. Every one arrives
    // as a DRAFT — applying proposes a week, publishing is a separate decision.
    // The whole week. These shifts are on Monday and Wednesday; a window of
    // `from=week&to=week` is the Sunday alone and finds nothing.
    const shifts = await page.request.get(
      `${SHIFTS}?from=${week}&to=${weekEnd(week)}`,
    );
    expect(shifts.ok(), await shifts.text()).toBe(true);
    const payload = (await shifts.json()) as {
      shifts?: { id: string; status: string }[];
    };
    const mine = (payload.shifts ?? []).filter((s) =>
      result.shiftIds.includes(s.id),
    );
    expect(mine).toHaveLength(2);
    for (const shift of mine) {
      expect(shift.status).toBe("draft");
    }
  });

  test("applying the same week again creates nothing, and is not an error", async ({
    page,
  }) => {
    await signIn(page, ACCOUNTS.owner);
    const { positionId, departmentId } = ownRoles();

    const template = await createTemplate(page, {
      name: fresh("twice"),
      shifts: [
        {
          dayOfWeek: 4,
          departmentId,
          positionId,
          startTime: "09:00",
          endTime: "17:00",
        },
      ],
    });

    const week = futureSunday(31);
    const first = await apply(page, template.id, week);
    expect(first.created).toBe(1);

    // THE POINT. A 200 with `created: 0`, not a 409 — the week exists, which
    // is what the caller wanted. Reporting it as a failure would send a
    // manager hunting for a problem that is not there.
    const second = await apply(page, template.id, week);
    expect(second.created).toBe(0);
    expect(second.shiftIds).toHaveLength(0);

    // And the NEXT week is a different week. Without this, "creates nothing"
    // would pass equally well against a function that had stopped working.
    const nextWeek = futureSunday(32);
    const other = await apply(page, template.id, nextWeek);
    expect(other.created).toBe(1);
  });

  test("the applied weeks come back on the template", async ({ page }) => {
    await signIn(page, ACCOUNTS.owner);
    const { positionId, departmentId } = ownRoles();

    const template = await createTemplate(page, {
      name: fresh("applied weeks"),
      shifts: [
        {
          dayOfWeek: 5,
          departmentId,
          positionId,
          startTime: "07:00",
          endTime: "15:00",
        },
      ],
    });

    const week = futureSunday(33);
    await apply(page, template.id, week);

    // The screen asks "have we already done this week?" first, and answering
    // it per row would be a request per template.
    const res = await page.request.get(`${TEMPLATES}/${template.id}`);
    expect(res.ok(), await res.text()).toBe(true);
    const reread = ((await res.json()) as { template: Template }).template;
    expect(reread.appliedWeeks).toContain(week);
  });

  test("a retired template cannot be applied", async ({ page }) => {
    await signIn(page, ACCOUNTS.owner);
    const { positionId, departmentId } = ownRoles();

    const template = await createTemplate(page, {
      name: fresh("retired"),
      shifts: [
        {
          dayOfWeek: 1,
          departmentId,
          positionId,
          startTime: "08:00",
          endTime: "12:00",
        },
      ],
    });
    await page.request.patch(`${TEMPLATES}/${template.id}`, {
      data: { isActive: false },
    });

    const res = await page.request.post(`${TEMPLATES}/${template.id}/apply`, {
      data: { weekStart: futureSunday(34) },
    });
    // 409 with the database's own sentence, which is written for a person.
    expect(res.status()).toBe(409);
    expect(await res.text()).toContain("retired");
  });

  test("deleting a template leaves the shifts it already made", async ({
    page,
  }) => {
    await signIn(page, ACCOUNTS.owner);
    const { positionId, departmentId } = ownRoles();

    const template = await createTemplate(page, {
      name: fresh("delete"),
      shifts: [
        {
          dayOfWeek: 2,
          departmentId,
          positionId,
          startTime: "10:00",
          endTime: "18:00",
        },
      ],
    });

    const week = futureSunday(35);
    const applied = await apply(page, template.id, week);
    expect(applied.created).toBe(1);

    const deleted = await page.request.delete(`${TEMPLATES}/${template.id}`);
    expect(deleted.ok(), await deleted.text()).toBe(true);

    // Somebody is rostered on that day. Deleting the template they came from is
    // not a statement about whether they are working.
    const shifts = await page.request.get(
      `${SHIFTS}?from=${week}&to=${weekEnd(week)}`,
    );
    const payload = (await shifts.json()) as { shifts?: { id: string }[] };
    const survivors = (payload.shifts ?? []).filter((s) =>
      applied.shiftIds.includes(s.id),
    );
    expect(survivors).toHaveLength(1);

    // The orphan this test deliberately creates is cleaned up by `afterAll`,
    // from the ids `apply()` recorded. Doing it here would put the cleanup
    // AFTER the assertions above — which is exactly how two draft shifts were
    // left in the shared roster when one of them failed.
  });

  test("a groomer cannot build or apply a template", async ({ page }) => {
    await signIn(page, ACCOUNTS.groomer);

    // A groomer holds neither `scheduling_create_shifts` nor
    // `scheduling_edit_shifts`, so this is the plain refusal. The sharper case
    // — a supervisor, who may edit shifts and may not create them — is S10 in
    // the SQL suite, where the role can be set up exactly.
    const res = await page.request.post(TEMPLATES, {
      data: { name: fresh("groomer") },
    });
    expect(res.status()).toBe(403);
  });

  test("the screen shows the templates the database holds", async ({
    page,
  }) => {
    await signIn(page, ACCOUNTS.owner);
    const { positionId, departmentId } = ownRoles();

    const name = fresh("on screen");
    await createTemplate(page, {
      name,
      shifts: [
        {
          dayOfWeek: 1,
          departmentId,
          positionId,
          startTime: "08:00",
          endTime: "16:00",
        },
      ],
    });

    await page.goto("/facility/dashboard/services/scheduling/templates");
    await expect(
      page.getByRole("heading", { name: "Schedule Templates" }),
    ).toBeVisible();

    // What this replaced read a module-level array, so this assertion could
    // not have passed against it.
    await expect(page.getByText(name).first()).toBeVisible({ timeout: 15_000 });
  });
});
