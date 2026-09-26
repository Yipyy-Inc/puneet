import { test, expect, type Page } from "@playwright/test";

import { ACCOUNTS, signIn } from "./_auth";

// ============================================================================
// THE GROOMING MENU'S CATEGORIES, OVER HTTP (2026-09-26, 20260926190000).
//
// Grooming's services had no category at all until the client asked for the
// Categories button boarding's and daycare's Rates pages have. The table and
// its RLS are asserted in `service-category-crud.sql` (C3, C5); this is the
// HTTP path — the twin of `boarding-service-categories.spec.ts`, and a twin
// is exactly the kind of thing that drifts.
//
// ── EVERYTHING MADE HERE IS SWEPT ─────────────────────────────────────────
//
// Services and categories carry MARKER in their names and the sweep DELETES
// them, before the tests as well as after, asking the API what carries the
// marker rather than replaying a list the tests filled.
// ============================================================================

const MARKER = "[e2e grooming-cat]";
const SERVICES = "/api/grooming/services";
const CATEGORIES = "/api/grooming/service-categories";

interface Category {
  id: string;
  name: string;
  displayOrder: number;
}

interface Service {
  id: string;
  name: string;
  categoryId?: string | null;
}

async function categoryList(page: Page): Promise<Category[]> {
  const res = await page.request.get(CATEGORIES);
  expect(res.ok(), await res.text()).toBe(true);
  const body: unknown = await res.json();
  // A cast is a claim: a 500 answers `{error}`, and walking that inside the
  // teardown would take the whole cleanup with it.
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

test.describe("the grooming menu's categories", () => {
  test("a category is created, filed, renamed and removed — and its service survives", async ({
    page,
  }) => {
    await signIn(page, ACCOUNTS.owner);

    const made = await page.request.post(CATEGORIES, {
      data: { name: `${MARKER} Cuts` },
      failOnStatusCode: false,
    });
    expect(made.status(), await made.text()).toBe(201);
    const category = (await made.json()) as Category;
    expect(category.id, "the row comes back, not just an ok").toBeTruthy();

    // A service is filed under it as it is created, as the editor does.
    const created = await page.request.post(SERVICES, {
      data: {
        name: `${MARKER} Filed away`,
        duration: 60,
        sizePricing: { small: 50 },
        categoryId: category.id,
      },
      failOnStatusCode: false,
    });
    expect(created.status(), await created.text()).toBe(201);
    const { service } = (await created.json()) as { service: Service };
    expect(service.categoryId, "the category travels").toBe(category.id);
    expect(
      (await menu(page)).find((s) => s.id === service.id)?.categoryId,
      "and reads back",
    ).toBe(category.id);

    const renamed = await page.request.patch(`${CATEGORIES}/${category.id}`, {
      data: { name: `${MARKER} Haircuts` },
      failOnStatusCode: false,
    });
    expect(renamed.status(), await renamed.text()).toBe(200);
    expect(((await renamed.json()) as Category).name).toBe(
      `${MARKER} Haircuts`,
    );

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

    // REMOVE — and the sentence the confirmation prints has to be true.
    const gone = await page.request.delete(`${CATEGORIES}/${category.id}`);
    expect(gone.status(), await gone.text()).toBe(200);
    const survivor = (await menu(page)).find((s) => s.id === service.id);
    expect(survivor, "ITS SERVICE IS STILL ON THE MENU").toBeTruthy();
    expect(survivor?.categoryId ?? null, "and is now uncategorised").toBeNull();
  });

  test("a customer cannot add one, and a signed-out caller reads nothing", async ({
    page,
    browser,
  }) => {
    await signIn(page, ACCOUNTS.customer);
    const asCustomer = await page.request.post(CATEGORIES, {
      data: { name: `${MARKER} By a customer` },
      failOnStatusCode: false,
    });
    expect(asCustomer.status(), await asCustomer.text()).toBe(403);

    const context = await browser.newContext();
    try {
      const anon = await context.newPage();
      expect((await anon.request.get(CATEGORIES)).status()).toBe(401);
    } finally {
      await context.close();
    }
  });
});
