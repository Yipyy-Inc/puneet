import { test, expect } from "@playwright/test";

import { ACCOUNTS, signIn } from "./_auth";

// ============================================================================
// The chore library and the groups that turn it into work.
//
// ── WHAT IT REPLACES ──────────────────────────────────────────────────────
//
// `workTaskLibrary`, `shiftTaskGroups` and `positionTaskGroups` in
// `src/data/work-tasks.ts` — three arrays that generated nothing. The two group
// tabs listed sets of chores nobody was ever asked to do, the library's Delete
// button called `toast.error("Task removed from library")` and removed nothing,
// and `TaskWizard` (1,114 lines) ended in a `toast.success` and no write at all.
//
// ── WHAT IS PROVED HERE, AND WHAT IS PROVED IN SQL ────────────────────────
//
// `supabase/tests/facility-task-groups.sql` holds the claims a route cannot
// make:
//   C6   editing a chore does NOT rewrite work already generated from it — the
//        headline, and the reason definitions and instances are two tables.
//   C8   a chore a group names cannot be deleted, but CAN be retired.
//   C10  a member without `ops_manage_tasks` cannot write any of the three
//        tables, measured on an accountant — the only preset that holds none.
//   C11  generating is not a back door: SECURITY INVOKER, so the caller's own
//        permissions still apply.
//   C13  dissolving a department takes its groups and leaves the work already
//        asked for.
//
// ── CLEANUP ───────────────────────────────────────────────────────────────
//
// Groups and chores are RETIRED, and the tasks they generated are cancelled.
// Everything wears `[e2e]` and cleanup touches only those.
// ============================================================================

const DEFINITIONS = "/api/task-definitions";
const GROUPS = "/api/task-groups";
const TASKS = "/api/tasks";

const MARKER = "[e2e]";

type Page = import("@playwright/test").Page;

interface Definition {
  id: string;
  title: string;
  isActive: boolean;
  estimatedMinutes: number | null;
  usedByGroups?: number;
}

interface GroupItem {
  definitionId: string;
  sortOrder: number;
  definition?: Definition;
}

interface Group {
  id: string;
  name: string;
  scope: string;
  shiftKey: string | null;
  daysOfWeek: number[];
  isActive: boolean;
  items: GroupItem[];
}

interface Task {
  id: string;
  title: string;
  status: string;
  estimatedMinutes: number | null;
  sourceRef: string | null;
  source: string;
}

function fresh(label: string): string {
  return `${MARKER} ${label} ${Date.now()}-${Math.floor(Math.random() * 1e4)}`;
}

/** A date far enough ahead that no other run has generated against it. */
function futureDate(offsetDays: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

async function createChore(
  page: Page,
  body: Record<string, unknown>,
): Promise<Definition> {
  const res = await page.request.post(DEFINITIONS, { data: body });
  expect(res.ok(), await res.text()).toBe(true);
  return ((await res.json()) as { definition: Definition }).definition;
}

async function createGroup(
  page: Page,
  body: Record<string, unknown>,
): Promise<Group> {
  const res = await page.request.post(GROUPS, { data: body });
  expect(res.ok(), await res.text()).toBe(true);
  return ((await res.json()) as { group: Group }).group;
}

async function generate(
  page: Page,
  groupId: string,
  forDate: string,
): Promise<Task[]> {
  const res = await page.request.post(`${GROUPS}/${groupId}/generate`, {
    data: { forDate },
  });
  expect(res.ok(), await res.text()).toBe(true);
  return ((await res.json()) as { created: Task[] }).created;
}

test.describe("chore library and task groups", () => {
  test.afterAll(async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    await signIn(page, ACCOUNTS.owner);

    // Cancel the tasks these groups generated, then retire the groups and the
    // chores. Nothing is deleted: a chore a group names cannot be, and a task
    // never can.
    const taskRes = await page.request.get(`${TASKS}?source=template`);
    if (taskRes.ok()) {
      const { tasks } = (await taskRes.json()) as { tasks: Task[] };
      for (const task of tasks) {
        if (!task.title.startsWith(MARKER)) continue;
        if (task.status === "cancelled" || task.status === "completed")
          continue;
        await page.request.patch(`${TASKS}/${task.id}`, {
          data: { status: "cancelled" },
        });
      }
    }

    const groupRes = await page.request.get(GROUPS);
    if (groupRes.ok()) {
      const { groups } = (await groupRes.json()) as { groups: Group[] };
      for (const group of groups) {
        if (!group.name.startsWith(MARKER) || !group.isActive) continue;
        await page.request.patch(`${GROUPS}/${group.id}`, {
          data: { isActive: false },
        });
      }
    }

    const choreRes = await page.request.get(DEFINITIONS);
    if (choreRes.ok()) {
      const { definitions } = (await choreRes.json()) as {
        definitions: Definition[];
      };
      for (const chore of definitions) {
        if (!chore.title.startsWith(MARKER) || !chore.isActive) continue;
        await page.request.patch(`${DEFINITIONS}/${chore.id}`, {
          data: { isActive: false },
        });
      }
    }

    await context.close();
  });

  test("a chore with no name cannot be created", async ({ page }) => {
    await signIn(page, ACCOUNTS.owner);
    const res = await page.request.post(DEFINITIONS, { data: { title: "  " } });
    expect(res.status()).toBe(400);
  });

  test("a group must name a shift or a department, not both", async ({
    page,
  }) => {
    await signIn(page, ACCOUNTS.owner);

    const neither = await page.request.post(GROUPS, {
      data: { name: fresh("neither"), scope: "shift" },
    });
    expect(neither.status()).toBe(400);

    const nonsense = await page.request.post(GROUPS, {
      data: { name: fresh("nonsense"), scope: "elsewhere" },
    });
    expect(nonsense.status()).toBe(400);
  });

  test("a group generates one task per ACTIVE chore, carrying what it said", async ({
    page,
  }) => {
    await signIn(page, ACCOUNTS.owner);

    const kept = await createChore(page, {
      title: fresh("kept"),
      estimatedMinutes: 15,
      requiresPhoto: true,
    });
    const retired = await createChore(page, {
      title: fresh("retired"),
      estimatedMinutes: 10,
    });
    await page.request.patch(`${DEFINITIONS}/${retired.id}`, {
      data: { isActive: false },
    });

    const group = await createGroup(page, {
      name: fresh("generates"),
      scope: "shift",
      shiftKey: "morning",
      definitionIds: [kept.id, retired.id],
    });
    expect(group.items).toHaveLength(2);

    const created = await generate(page, group.id, futureDate(30));

    // One, not two: the retired chore is skipped. And the wording came across.
    expect(created).toHaveLength(1);
    expect(created[0].title).toBe(kept.title);
    expect(created[0].estimatedMinutes).toBe(15);
    expect(created[0].source).toBe("template");
  });

  test("generating twice adds nothing the second time", async ({ page }) => {
    await signIn(page, ACCOUNTS.owner);

    const chore = await createChore(page, { title: fresh("idempotent") });
    const group = await createGroup(page, {
      name: fresh("twice"),
      scope: "shift",
      shiftKey: "afternoon",
      definitionIds: [chore.id],
    });

    const day = futureDate(31);
    const first = await generate(page, group.id, day);
    expect(first).toHaveLength(1);

    // THE POINT. The board has a button, two people may press it, and a
    // scheduler will one day retry. `created` comes back EMPTY rather than
    // erroring, which is what lets the screen say "already generated".
    const second = await generate(page, group.id, day);
    expect(second).toHaveLength(0);
  });

  test("editing a chore leaves work already generated from it alone", async ({
    page,
  }) => {
    await signIn(page, ACCOUNTS.owner);

    const chore = await createChore(page, {
      title: fresh("original wording"),
      estimatedMinutes: 15,
    });
    const group = await createGroup(page, {
      name: fresh("copy not pointer"),
      scope: "shift",
      shiftKey: "night",
      definitionIds: [chore.id],
    });

    const created = await generate(page, group.id, futureDate(32));
    expect(created).toHaveLength(1);
    const originalTitle = created[0].title;

    await page.request.patch(`${DEFINITIONS}/${chore.id}`, {
      data: { title: fresh("REWRITTEN"), estimatedMinutes: 25 },
    });

    // THE HEADLINE. Read the task back: what somebody was asked to do has not
    // moved under them. A task that POINTED at its chore would now say 25
    // minutes for work already scoped at 15.
    const after = await page.request.get(`${TASKS}/${created[0].id}`);
    expect(after.ok(), await after.text()).toBe(true);
    const task = ((await after.json()) as { task: Task }).task;
    expect(task.title).toBe(originalTitle);
    expect(task.estimatedMinutes).toBe(15);
  });

  test("a group only runs on its own days", async ({ page }) => {
    await signIn(page, ACCOUNTS.owner);

    const chore = await createChore(page, { title: fresh("weekday") });
    const day = futureDate(33);
    const dow = new Date(`${day}T00:00:00`).getDay();
    // Every day EXCEPT the one we will ask for.
    const otherDays = [0, 1, 2, 3, 4, 5, 6].filter((d) => d !== dow);

    const group = await createGroup(page, {
      name: fresh("wrong day"),
      scope: "shift",
      shiftKey: "morning",
      daysOfWeek: otherDays,
      definitionIds: [chore.id],
    });

    const res = await page.request.post(`${GROUPS}/${group.id}/generate`, {
      data: { forDate: day },
    });
    // 409, and the message is the function's own sentence, written for a
    // person rather than a constraint name.
    expect(res.status()).toBe(409);
    expect(await res.text()).toContain("day of the week");
  });

  test("a chore in use reports it, and retiring stops it being generated", async ({
    page,
  }) => {
    await signIn(page, ACCOUNTS.owner);

    const chore = await createChore(page, { title: fresh("in use") });
    const group = await createGroup(page, {
      name: fresh("uses it"),
      scope: "shift",
      shiftKey: "morning",
      definitionIds: [chore.id],
    });

    // `usedByGroups` is how the screen offers "retire" instead of a Delete
    // button that would 409 on exactly the chores people care about.
    const listed = await page.request.get(DEFINITIONS);
    const { definitions } = (await listed.json()) as {
      definitions: Definition[];
    };
    const mine = definitions.find((d) => d.id === chore.id);
    expect(mine?.usedByGroups).toBeGreaterThanOrEqual(1);

    await page.request.patch(`${DEFINITIONS}/${chore.id}`, {
      data: { isActive: false },
    });

    // Retiring does not remove it from the group — it stops it generating.
    const after = await page.request.get(`${GROUPS}/${group.id}`);
    const reread = ((await after.json()) as { group: Group }).group;
    expect(reread.items).toHaveLength(1);

    const created = await generate(page, group.id, futureDate(34));
    expect(created).toHaveLength(0);
  });

  test("replacing a group's chores replaces them whole", async ({ page }) => {
    await signIn(page, ACCOUNTS.owner);

    const first = await createChore(page, { title: fresh("first") });
    const second = await createChore(page, { title: fresh("second") });

    const group = await createGroup(page, {
      name: fresh("replace"),
      scope: "shift",
      shiftKey: "morning",
      definitionIds: [first.id],
    });
    expect(group.items).toHaveLength(1);

    const res = await page.request.patch(`${GROUPS}/${group.id}`, {
      data: { definitionIds: [second.id] },
    });
    expect(res.ok(), await res.text()).toBe(true);
    const updated = ((await res.json()) as { group: Group }).group;

    // The whole list, not a merge. `first` is gone rather than kept alongside.
    expect(updated.items).toHaveLength(1);
    expect(updated.items[0].definitionId).toBe(second.id);
  });

  test("a member with no ops_manage_tasks reads the library and cannot write it", async ({
    page,
  }) => {
    // An ACCOUNTANT. The only role preset holding no `ops_manage_tasks` at all
    // — a groomer looks like the natural subject and holds it at
    // assigned_shifts, so every refusal below would have come back ALLOWED
    // about somebody the rule was never meant to stop.
    await signIn(page, ACCOUNTS.accountant);

    // The positive control. Reading is wide on purpose: somebody has to see
    // what the morning shift owes without being able to decide it.
    const readable = await page.request.get(DEFINITIONS);
    expect(readable.ok(), await readable.text()).toBe(true);

    const written = await page.request.post(DEFINITIONS, {
      data: { title: fresh("accountant chore") },
    });
    expect(written.status()).toBe(403);

    const grouped = await page.request.post(GROUPS, {
      data: {
        name: fresh("accountant group"),
        scope: "shift",
        shiftKey: "morning",
      },
    });
    expect(grouped.status()).toBe(403);
  });

  test("replacing chores is refused for somebody who cannot change the group", async ({
    page,
  }) => {
    const owner = await page.context().browser()!.newContext();
    const ownerPage = await owner.newPage();
    await signIn(ownerPage, ACCOUNTS.owner);
    const chore = await createChore(ownerPage, { title: fresh("guarded") });
    const group = await createGroup(ownerPage, {
      name: fresh("guarded group"),
      scope: "shift",
      shiftKey: "morning",
      definitionIds: [chore.id],
    });
    await owner.close();

    await signIn(page, ACCOUNTS.accountant);

    // THE HOLE `check:rls-writes` FOUND. A request carrying ONLY
    // `definitionIds` used to skip the group UPDATE, making the DELETE the
    // first write — and `authenticated` holds the DELETE privilege, so a
    // caller the policy refuses removed zero rows and got a success. The
    // screen would have said the chores were replaced while they sat there.
    const res = await page.request.patch(`${GROUPS}/${group.id}`, {
      data: { definitionIds: [] },
    });
    expect(res.status()).toBe(403);

    // Read it back as the owner: the chore is still in the group.
    const check = await page.context().browser()!.newContext();
    const checkPage = await check.newPage();
    await signIn(checkPage, ACCOUNTS.owner);
    const after = await checkPage.request.get(`${GROUPS}/${group.id}`);
    const reread = ((await after.json()) as { group: Group }).group;
    expect(reread.items).toHaveLength(1);
    await check.close();
  });

  test("the tabs show the groups and chores the database holds", async ({
    page,
  }) => {
    await signIn(page, ACCOUNTS.owner);

    const choreTitle = fresh("on screen");
    const chore = await createChore(page, { title: choreTitle });
    const groupName = fresh("on screen group");
    await createGroup(page, {
      name: groupName,
      scope: "shift",
      shiftKey: "morning",
      definitionIds: [chore.id],
    });

    await page.goto("/facility/dashboard/tasks?tab=library");
    await expect(
      page.getByRole("heading", { name: "Task Management" }),
    ).toBeVisible();

    // Search rather than trusting it onto page one — the library only grows,
    // and a screen test that depends on ordering has a shelf life measured in
    // test runs.
    await page
      .getByPlaceholder("Search the library…")
      .fill(choreTitle.slice(0, 24));
    await expect(page.getByText(choreTitle).first()).toBeVisible({
      timeout: 15_000,
    });

    await page.getByRole("tab", { name: /Shift Tasks/ }).click();
    await expect(page.getByText(groupName).first()).toBeVisible({
      timeout: 15_000,
    });
  });
});
