import { test, expect, type Page } from "@playwright/test";

import { ACCOUNTS, signIn } from "./_auth";

// ============================================================================
// THE BOARDING MENU'S CATEGORIES, OVER HTTP.
//
// ── WHY THIS FILE EXISTS ──────────────────────────────────────────────────
//
// `/api/boarding/service-categories` shipped GET and POST on 2026-09-24 with
// no screen calling either, and PATCH and DELETE followed the same day because
// a create button on its own makes every typo permanent.
//
// Its daycare twin is covered by `daycare-services.spec.ts`. Boarding's was
// not: the two route files are byte-identical but for the table name, and
// `service-category-crud.sql` asserts the FK and the RLS on BOTH tables — so
// the only thing with no test was boarding's HTTP path itself. A twin is
// exactly the kind of thing that drifts, and "it is a copy of one that works"
// is a claim, not a test.
//
// ── ONE POSTGRES, SHARED WITH CI ──────────────────────────────────────────
//
// Everything made here carries MARKER in its name, and the sweep DELETES it —
// before the tests as well as after, because a run stopped between the create
// and the delete would otherwise leave a row whose name the next run collides
// with, and the POST answers 409 on a duplicate. The sweep asks the database
// what carries the marker rather than replaying a list the tests filled: a
// test that fails between creating and recording would leave a heading on a
// real facility's menu.
// ============================================================================

const MARKER = "[e2e boarding-cat]";
const SERVICES = "/api/boarding/services";
const CATEGORIES = "/api/boarding/service-categories";

interface Category {
  id: string;
  name: string;
  displayOrder: number;
}

interface Service {
  id: string;
  rowId: string;
  name: string;
  categoryId: string | null;
}

async function categoryList(page: Page): Promise<Category[]> {
  const res = await page.request.get(CATEGORIES);
  expect(res.ok(), await res.text()).toBe(true);
  const body: unknown = await res.json();
  // A cast is a claim: a 500 answers `{error}`, and `.filter` on that throws
  // INSIDE the teardown, where it takes the whole cleanup with it and the run
  // still looks fine.
  return Array.isArray(body) ? (body as Category[]) : [];
}

async function menu(page: Page): Promise<Service[]> {
  const res = await page.request.get(SERVICES);
  expect(res.ok(), await res.text()).toBe(true);
  const body: unknown = await res.json();
  return Array.isArray(body) ? (body as Service[]) : [];
}

test.describe.configure({ mode: "serial" });

async function sweep(page: Page): Promise<number> {
  let removed = 0;
  for (const s of await menu(page)) {
    if (!s.name.includes(MARKER)) continue;
    const res = await page.request.delete(`${SERVICES}/${s.id}`);
    if (res.ok()) removed += 1;
  }
  // Categories after services, though the order does not matter: the FK is
  // `on delete set null`, so removing a heading never removes a menu item.
  for (const c of await categoryList(page)) {
    if (!c.name.includes(MARKER)) continue;
    const res = await page.request.delete(`${CATEGORIES}/${c.id}`);
    if (res.ok()) removed += 1;
  }
  return removed;
}

test.beforeAll(async ({ browser }) => {
  const page = await browser.newPage();
  try {
    await signIn(page, ACCOUNTS.owner);
    const healed = await sweep(page);
    if (healed > 0)
      console.log(`sweep(before): ${healed} left by an earlier run`);
  } finally {
    await page.close();
  }
});

test.afterAll(async ({ browser }) => {
  const page = await browser.newPage();
  try {
    await signIn(page, ACCOUNTS.owner);
    console.log(`cleanup: ${await sweep(page)} row(s) removed`);
  } finally {
    await page.close();
  }
});

test.describe("the boarding menu's categories", () => {
  test("a category is created, renamed and removed — and its services survive", async ({
    page,
  }) => {
    await signIn(page, ACCOUNTS.owner);

    const made = await page.request.post(CATEGORIES, {
      data: { name: `${MARKER} Suites` },
      failOnStatusCode: false,
    });
    expect(made.status(), await made.text()).toBe(201);
    const category = (await made.json()) as Category;
    expect(category.id, "the row comes back, not just an ok").toBeTruthy();
    expect(category.name).toBe(`${MARKER} Suites`);

    // The field selects the new category the moment it is written, so the id
    // it hands back has to be one a service can actually be filed under.
    const created = await page.request.post(SERVICES, {
      data: {
        name: `${MARKER} Filed away`,
        price: 90,
        unit: "night",
        categoryId: category.id,
      },
      failOnStatusCode: false,
    });
    expect(created.status(), await created.text()).toBe(201);
    const { service } = (await created.json()) as { service: Service };
    expect(service.categoryId).toBe(category.id);

    // RENAME — the typo fix that was impossible until the PATCH existed.
    const renamed = await page.request.patch(`${CATEGORIES}/${category.id}`, {
      data: { name: `${MARKER} Suite` },
      failOnStatusCode: false,
    });
    expect(renamed.status(), await renamed.text()).toBe(200);
    expect(((await renamed.json()) as Category).name).toBe(`${MARKER} Suite`);

    // A rename cannot collide with a name the facility already uses.
    const rival = await page.request.post(CATEGORIES, {
      data: { name: `${MARKER} Taken` },
      failOnStatusCode: false,
    });
    expect(rival.status(), await rival.text()).toBe(201);
    const clash = await page.request.patch(`${CATEGORIES}/${category.id}`, {
      data: { name: `${MARKER} Taken` },
      failOnStatusCode: false,
    });
    expect(clash.status(), "a duplicate name is a 409, not a 500").toBe(409);

    // REMOVE — and the sentence the confirmation dialog prints has to be true.
    const gone = await page.request.delete(`${CATEGORIES}/${category.id}`);
    expect(gone.status(), await gone.text()).toBe(200);
    expect(
      (await categoryList(page)).some((c) => c.id === category.id),
      "the category is gone",
    ).toBe(false);

    const survivor = (await menu(page)).find((s) => s.id === service.id);
    expect(survivor, "ITS SERVICE IS STILL ON THE MENU").toBeTruthy();
    expect(survivor?.categoryId, "and is now ungrouped").toBeNull();
  });

  test("a category needs a name, and an id nobody owns says so carefully", async ({
    page,
  }) => {
    await signIn(page, ACCOUNTS.owner);

    const blank = await page.request.post(CATEGORIES, {
      data: { name: "   " },
      failOnStatusCode: false,
    });
    expect(blank.status(), "whitespace is not a name").toBe(422);

    // A category carries no `legacy_id`, so the id is always a uuid — and
    // passing a non-uuid to an `eq` on a uuid column is a 400 from PostgREST
    // rather than an empty result. The route refuses it before the query.
    const notAUuid = await page.request.patch(`${CATEGORIES}/not-a-uuid`, {
      data: { name: `${MARKER} Nope` },
      failOnStatusCode: false,
    });
    expect(notAUuid.status(), "a malformed id is a 404, not a 400").toBe(404);

    // A uuid nobody owns is 200 with nothing removed, NOT a 404 — and that is
    // deliberate rather than an oversight. RLS cannot tell "no such row" from
    // "not yours", so a 404 here would answer a question about somebody else's
    // facility. The sibling services route answers the same way, and a delete
    // that is idempotent is the easier one to call twice.
    const missing = await page.request.delete(
      `${CATEGORIES}/00000000-0000-4000-8000-000000000000`,
    );
    expect(missing.status(), await missing.text()).toBe(200);
    expect((await missing.json()) as { removed: number }).toEqual({
      removed: 0,
    });

    // The PATCH says 403 for the same reason: it cannot see the row, and
    // "you may not" leaks less than "it is not there".
    const ghost = await page.request.patch(
      `${CATEGORIES}/00000000-0000-4000-8000-000000000000`,
      { data: { name: `${MARKER} Ghost` }, failOnStatusCode: false },
    );
    expect(ghost.status(), await ghost.text()).toBe(403);
  });

  test("a signed-out caller reads nothing and writes nothing", async ({
    browser,
  }) => {
    // A fresh context, so it carries no session at all.
    const context = await browser.newContext();
    try {
      const anon = await context.newPage();
      const read = await anon.request.get(CATEGORIES);
      expect(read.status(), "no session, no list").toBe(401);

      const write = await anon.request.post(CATEGORIES, {
        data: { name: `${MARKER} By nobody` },
        failOnStatusCode: false,
      });
      expect(write.status(), "and no session, no write").toBe(401);
    } finally {
      await context.close();
    }
  });
});
