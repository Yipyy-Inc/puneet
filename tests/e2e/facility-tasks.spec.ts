import { test, expect } from "@playwright/test";

import { ACCOUNTS, signIn } from "./_auth";

// ============================================================================
// The task board: work somebody was asked to do.
//
// ── WHAT IT REPLACES ──────────────────────────────────────────────────────
//
// `src/data/work-tasks.ts` — a module-level array with an `addStandaloneTask()`
// that pushed onto it. Two LIVE features wrote through it: a call marked
// "pending follow-up" and a negative review that escalated. Both said a task
// had been created and both lost it on the next refresh.
//
// ── WHAT IS PROVED HERE, AND WHAT IS PROVED IN SQL ────────────────────────
//
// `supabase/tests/facility-tasks.sql` holds the claims a route cannot make:
//   K3   one follow-up per call, enforced by a unique index rather than by an
//        array scan that only ever saw one browser tab.
//   K9   the person holding a task cannot hand it to somebody else, and K10
//        that they cannot rewrite what it asks for — measured on an accountant,
//        the only role with `manage_own_tasks` and no `ops_manage_tasks`.
//   K12  nobody deletes a task, and K13 that the DELETE privilege itself is
//        gone rather than merely unused.
//   K15  a staff member leaving unassigns their tasks instead of deleting
//        them — the `on delete set null` case that a guard trigger will refuse
//        unless it is written to let a cascade through.
//
// ── CLEANUP ───────────────────────────────────────────────────────────────
//
// Tasks are CANCELLED, not deleted: there is no delete policy and no DELETE
// privilege, by design. Everything wears `[e2e]` and cleanup touches only
// those.
// ============================================================================

const TASKS = "/api/tasks";
const MARKER = "[e2e]";

type Page = import("@playwright/test").Page;

interface Task {
  id: string;
  title: string;
  status: string;
  priority: string;
  assignedToId: string | null;
  assignedToName: string | null;
  dueAt: string | null;
  completedAt: string | null;
  overdue: boolean;
  source: string;
  sourceRef: string | null;
}

function freshTitle(label: string): string {
  return `${MARKER} ${label} ${Date.now()}-${Math.floor(Math.random() * 1e4)}`;
}

async function createTask(
  page: Page,
  body: Record<string, unknown>,
): Promise<Task> {
  const res = await page.request.post(TASKS, { data: body });
  expect(res.ok(), await res.text()).toBe(true);
  return ((await res.json()) as { task: Task }).task;
}

async function readTask(page: Page, id: string): Promise<Task> {
  const res = await page.request.get(`${TASKS}/${id}`);
  expect(res.ok(), await res.text()).toBe(true);
  return ((await res.json()) as { task: Task }).task;
}

test.describe("facility tasks", () => {
  test.afterAll(async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    await signIn(page, ACCOUNTS.owner);

    const res = await page.request.get(TASKS);
    if (res.ok()) {
      const { tasks } = (await res.json()) as { tasks: Task[] };
      for (const task of tasks) {
        if (!task.title.startsWith(MARKER)) continue;
        if (task.status === "cancelled" || task.status === "completed")
          continue;
        // Cancelled, not deleted. There is no delete policy and no DELETE
        // privilege, and that is the design working rather than a gap.
        await page.request.patch(`${TASKS}/${task.id}`, {
          data: { status: "cancelled" },
        });
      }
    }
    await context.close();
  });

  test("a task with no title cannot be created", async ({ page }) => {
    await signIn(page, ACCOUNTS.owner);
    const res = await page.request.post(TASKS, { data: { title: "   " } });
    expect(res.status()).toBe(400);
  });

  test("a task starts pending, unfinished and unstamped", async ({ page }) => {
    await signIn(page, ACCOUNTS.owner);
    const task = await createTask(page, { title: freshTitle("new") });

    expect(task.status).toBe("pending");
    expect(task.completedAt).toBeNull();
    // No due date means nothing is late. `overdue` is derived, never stored.
    expect(task.overdue).toBe(false);
  });

  test("completing stamps the time, and the server sets it", async ({
    page,
  }) => {
    await signIn(page, ACCOUNTS.owner);
    const task = await createTask(page, { title: freshTitle("complete") });

    const res = await page.request.patch(`${TASKS}/${task.id}`, {
      data: {
        status: "completed",
        // Offered and ignored: a caller that could name its own completion
        // time could report work as finished yesterday. The route stamps it.
        completedAt: "2020-01-01T00:00:00.000Z",
      },
    });
    expect(res.ok(), await res.text()).toBe(true);

    const after = await readTask(page, task.id);
    expect(after.status).toBe("completed");
    expect(after.completedAt).not.toBeNull();
    expect(new Date(after.completedAt as string).getFullYear()).toBeGreaterThan(
      2020,
    );
  });

  test("re-opening a finished task clears the stamp", async ({ page }) => {
    await signIn(page, ACCOUNTS.owner);
    const task = await createTask(page, { title: freshTitle("reopen") });

    await page.request.patch(`${TASKS}/${task.id}`, {
      data: { status: "completed" },
    });
    await page.request.patch(`${TASKS}/${task.id}`, {
      data: { status: "in_progress" },
    });

    // The table's check constraint refuses `completed_at` set on anything but a
    // completed row, so leaving the stamp behind would be a 400 rather than a
    // row that quietly breaks every turnaround report.
    const after = await readTask(page, task.id);
    expect(after.status).toBe("in_progress");
    expect(after.completedAt).toBeNull();
  });

  test("a task past its due time reads overdue, from one clock", async ({
    page,
  }) => {
    await signIn(page, ACCOUNTS.owner);
    const task = await createTask(page, {
      title: freshTitle("overdue"),
      dueAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
    });
    expect(task.overdue).toBe(true);

    // ...and stops being overdue once it is done, rather than staying red
    // forever.
    await page.request.patch(`${TASKS}/${task.id}`, {
      data: { status: "completed" },
    });
    const after = await readTask(page, task.id);
    expect(after.overdue).toBe(false);
  });

  test("one follow-up per call, however many times it is asked for", async ({
    page,
  }) => {
    await signIn(page, ACCOUNTS.owner);
    const ref = `e2e-call-${Date.now()}`;

    const first = await createTask(page, {
      title: freshTitle("follow-up"),
      source: "call_follow_up",
      sourceRef: ref,
    });
    expect(first.sourceRef).toBe(ref);

    // THE POINT. `hasTaskForCallLog()` scanned one browser's array; two people
    // working the same queue each made one and neither saw the other's.
    const second = await page.request.post(TASKS, {
      data: {
        title: freshTitle("follow-up duplicate"),
        source: "call_follow_up",
        sourceRef: ref,
      },
    });
    expect(second.status()).toBe(409);
  });

  test("an unrecognised source is refused", async ({ page }) => {
    await signIn(page, ACCOUNTS.owner);
    const res = await page.request.post(TASKS, {
      data: { title: freshTitle("bad source"), source: "wherever" },
    });
    expect(res.status()).toBe(400);
  });

  test("a task cannot be deleted, only cancelled", async ({ page }) => {
    await signIn(page, ACCOUNTS.owner);
    const task = await createTask(page, { title: freshTitle("cancel") });

    // There is no DELETE verb on the route at all, so this asserts the
    // behaviour a caller actually meets rather than probing PostgREST.
    const res = await page.request.delete(`${TASKS}/${task.id}`);
    expect(res.status()).toBe(405);

    await page.request.patch(`${TASKS}/${task.id}`, {
      data: { status: "cancelled" },
    });
    const after = await readTask(page, task.id);
    // Still there. A task somebody created and abandoned is a fact about how
    // that week ran.
    expect(after.status).toBe("cancelled");
  });

  test("the board shows the tasks the database holds", async ({ page }) => {
    await signIn(page, ACCOUNTS.owner);

    const title = freshTitle("board");
    await createTask(page, { title, priority: "urgent" });

    await page.goto("/facility/dashboard/tasks?tab=standalone");
    await expect(
      page.getByRole("heading", { name: "Task Management" }),
    ).toBeVisible();

    // SEARCH FOR IT rather than trusting it onto the first page. This test
    // passed locally against a near-empty table and failed in CI once the
    // table had a day of rows in it: the board pages at 10, and a task with no
    // due date sorted behind every other undated task. The route now breaks
    // that tie by newest-first and the board defaults to open work, but a
    // screen test that depends on either is a test that goes red the week
    // somebody writes eleven tasks.
    await page.getByPlaceholder("Search tasks…").fill(title.slice(0, 24));

    // The row the API created. What this replaced read a module-level array,
    // so this assertion could not have passed against it.
    await expect(page.getByText(title).first()).toBeVisible({
      timeout: 15_000,
    });
  });

  test("a new task is not buried behind finished ones", async ({ page }) => {
    await signIn(page, ACCOUNTS.owner);

    const title = freshTitle("not buried");
    await createTask(page, { title });

    // No due date, which is the case that broke: undated tasks sort last, and
    // every cancelled task in the facility's history was on the page ahead of
    // it. The board shows OPEN work by default now — a cancelled task is a
    // record worth keeping and not worth reading every morning.
    const res = await page.request.get(`${TASKS}?status=pending`);
    expect(res.ok(), await res.text()).toBe(true);
    const { tasks } = (await res.json()) as {
      tasks: Task[];
      truncated: boolean;
    };

    const mine = tasks.findIndex((t) => t.title === title);
    expect(mine, "the new task is in the pending list").toBeGreaterThanOrEqual(
      0,
    );

    // Among the undated, newest first. Anything ahead of it must be dated.
    for (const earlier of tasks.slice(0, mine)) {
      expect(
        earlier.dueAt,
        `"${earlier.title}" sorts ahead of a newer undated task`,
      ).not.toBeNull();
    }
  });

  test("a task written for the shift shows as unassigned, not as a gap", async ({
    page,
  }) => {
    await signIn(page, ACCOUNTS.owner);
    const task = await createTask(page, { title: freshTitle("unassigned") });
    // Nobody yet is a real state — work the shift picks up — and it is also
    // where a task lands when the person holding it leaves.
    expect(task.assignedToId).toBeNull();
    expect(task.assignedToName).toBeNull();
  });
});
