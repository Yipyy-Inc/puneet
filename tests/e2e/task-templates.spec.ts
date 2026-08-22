import { test, expect } from "@playwright/test";

import { ACCOUNTS, signIn } from "./_auth";

// ============================================================================
// A facility owns its own care routine.
//
// ── WHAT THIS EXISTS TO CATCH ─────────────────────────────────────────────
//
// Before 20260822700000 the routine was 34 hardcoded templates plus whatever
// a facility had edited, in **localStorage**. It looked like it worked: the
// screen saved, the toast fired, and the change survived a refresh. It did not
// survive a second person, or a cleared cache.
//
// So the assertions here are about the two things localStorage could never do
// — persist for everybody, and refuse somebody — plus the two specific
// defects the fixture had:
//
//   * an edit DUPLICATED the template instead of changing it, because
//     `updateTemplate` could not write to a hardcoded array and pushed a copy
//     under the same id;
//   * a delete could not remove any of the 34, so the screen hid the button.
//
// A test that only checked "the name changed" would have passed against the
// duplicate bug, since the edited copy was returned too. Counting is the
// assertion that catches it.
//
// ── WHAT IT LEAVES BEHIND ─────────────────────────────────────────────────
//
// Nothing. Every template it creates is deleted in `afterEach`. It never edits
// or deletes a SEEDED row: those are the demo facility's actual routine, and a
// spec that rewrote them would be changing what the facility does to prove
// that it can.
// ============================================================================

const API = "/api/task-templates";

type Page = import("@playwright/test").Page;

interface Template {
  id: string;
  moduleId: string;
  name: string;
  category: string;
  timing: { type: string; offsetMinutes?: number; customTime?: string };
  isRequired: boolean;
  autoCreate: boolean;
  recurring?: { frequency: string; times?: string[] };
}

/** Created by the running test, torn down in afterEach. */
const created: string[] = [];

async function createTemplate(
  page: Page,
  overrides: Record<string, unknown> = {},
): Promise<Template> {
  const res = await page.request.post(API, {
    data: {
      moduleId: "daycare",
      name: `E2E probe ${Date.now()}`,
      description: "Created by task-templates.spec.ts",
      category: "custom",
      timing: { type: "at_start" },
      durationMinutes: 10,
      assignTo: "any_available",
      isRequired: false,
      autoCreate: false,
      ...overrides,
    },
  });
  expect(res.status(), await res.text()).toBe(201);
  const t = (await res.json()) as Template;
  created.push(t.id);
  return t;
}

async function list(page: Page, moduleId?: string): Promise<Template[]> {
  const res = await page.request.get(
    moduleId ? `${API}?module=${moduleId}` : API,
  );
  expect(res.ok(), await res.text()).toBe(true);
  return (await res.json()) as Template[];
}

test.describe("a facility's care routine", () => {
  test.afterEach(async ({ browser }) => {
    if (created.length === 0) return;
    const ids = created.splice(0, created.length);
    const context = await browser.newContext();
    const page = await context.newPage();
    try {
      await signIn(page, ACCOUNTS.owner);
      for (const id of ids) await page.request.delete(`${API}/${id}`);
    } catch {
      // Teardown must not turn a green run red. A leaked probe template is a
      // task nobody scheduled, on the demo facility.
    } finally {
      await context.close();
    }
  });

  test("survives the request that created it", async ({ page }) => {
    await signIn(page, ACCOUNTS.owner);
    const made = await createTemplate(page);

    // Read back in a SEPARATE request. localStorage could pass a same-tab
    // assertion; it could never pass this one.
    const rows = await list(page, "daycare");
    const found = rows.find((r) => r.id === made.id);
    expect(found, "the template just created is not in the list").toBeTruthy();
    expect(found!.name).toBe(made.name);
  });

  test("ships the routine the product used to hardcode", async ({ page }) => {
    await signIn(page, ACCOUNTS.owner);

    // The 34 defaults are rows now, seeded per facility. If this is empty, the
    // migration's seed did not run for this facility and every task screen is
    // blank — which would look like a working screen with nothing on it.
    for (const moduleId of ["boarding", "daycare", "grooming", "training"]) {
      const rows = await list(page, moduleId);
      expect(rows.length, `${moduleId} has no task templates`).toBeGreaterThan(
        0,
      );
      for (const r of rows) expect(r.moduleId).toBe(moduleId);
    }
  });

  test("an edit changes the task and does NOT duplicate it", async ({
    page,
  }) => {
    await signIn(page, ACCOUNTS.owner);
    const made = await createTemplate(page, { name: "E2E before rename" });

    const res = await page.request.patch(`${API}/${made.id}`, {
      data: { name: "E2E after rename" },
    });
    expect(res.ok(), await res.text()).toBe(true);

    const rows = await list(page, "daycare");
    const mine = rows.filter((r) => r.id === made.id);

    // The assertion that matters. The fixture pushed a modified COPY under the
    // same id, so both came back and the list showed the task twice with
    // colliding React keys. One row, with the new name.
    expect(mine, "the edit duplicated the template").toHaveLength(1);
    expect(mine[0]!.name).toBe("E2E after rename");
    expect(
      rows.some((r) => r.name === "E2E before rename"),
      "the pre-edit version is still in the list",
    ).toBe(false);
  });

  test("a task can be removed, and is actually gone", async ({ page }) => {
    await signIn(page, ACCOUNTS.owner);
    const made = await createTemplate(page);

    const res = await page.request.delete(`${API}/${made.id}`);
    expect(res.ok(), await res.text()).toBe(true);
    created.splice(created.indexOf(made.id), 1);

    const rows = await list(page, "daycare");
    expect(rows.some((r) => r.id === made.id)).toBe(false);
  });

  test("narrows to one service, and does not leak another's", async ({
    page,
  }) => {
    await signIn(page, ACCOUNTS.owner);
    const daycare = await createTemplate(page, { moduleId: "daycare" });

    const boarding = await list(page, "boarding");
    expect(boarding.some((r) => r.id === daycare.id)).toBe(false);
    for (const r of boarding) expect(r.moduleId).toBe("boarding");
  });

  test("a caretaker can read the routine but not change it", async ({
    page,
  }) => {
    await signIn(page, ACCOUNTS.caretaker);

    // Reading is membership, not permission: somebody has to be able to see
    // what the routine IS in order to follow it.
    const rows = await list(page, "daycare");
    expect(rows.length).toBeGreaterThan(0);

    // Writing is `ops_manage_checklists`, which a caretaker does not hold.
    const res = await page.request.post(API, {
      data: {
        moduleId: "daycare",
        name: "E2E caretaker should not be able to add this",
        category: "custom",
        timing: { type: "at_start" },
        isRequired: false,
        autoCreate: false,
      },
    });
    expect(res.status(), await res.text()).toBe(403);

    // And an edit to an existing one is refused the same way — the important
    // half, because an UPDATE that RLS refuses affects zero rows and PostgREST
    // calls that success. A 200 here would mean the screen told a caretaker
    // their change had saved.
    const patch = await page.request.patch(`${API}/${rows[0]!.id}`, {
      data: { name: "E2E caretaker rename" },
    });
    expect(patch.status(), await patch.text()).toBe(403);
  });

  test("is refused to a caller with no session", async ({ browser }) => {
    const context = await browser.newContext();
    try {
      const res = await context.request.get(API);
      expect(res.status()).toBe(401);
    } finally {
      await context.close();
    }
  });
});
