import { test, expect } from "@playwright/test";
import { ACCOUNTS, signIn } from "./_auth";

// ============================================================================
// The client screens read and write Postgres.
//
// The facility client list held `useState(clients)` — a local copy of the mock
// array — and "created" a client by appending to it with `Math.max(...ids) + 1`.
// Convincing on screen, gone on reload. The customer's pet screen picked client
// 15 out of the same array by hardcoded id, with a TODO about auth.
//
// So the checks below are about PERSISTENCE and IDENTITY, not rendering: a
// created client survives a reload, and a customer sees their own animals
// because RLS says so rather than because a constant matched.
//
// TO CONFIRM THESE FAIL WITHOUT THE FIX: put `useState(clients)` back in
// src/app/facility/dashboard/clients/page.tsx. "survives a reload" goes red.
// ============================================================================

const LIST = "/facility/dashboard/clients";

test.describe.configure({ mode: "serial" });

test.describe("client screens are live", () => {
  // Created clients are real rows. Remove them however the run ends, or the
  // seeded facility slowly fills with test people — the same lesson the pet
  // probes taught in client-pet-write-path.spec.ts, where four accumulated.
  const created: number[] = [];

  test.afterAll(async ({ browser }) => {
    if (created.length === 0) return;
    const context = await browser.newContext();
    const page = await context.newPage();
    try {
      await signIn(page, ACCOUNTS.owner);
      for (const ref of created) {
        // Deleted, not deactivated. The first version of this marked them
        // inactive because there was no DELETE route — which left one dead
        // client in the seeded facility per run, five of them before anyone
        // looked. Deleting needs `delete_clients`, which the owner holds.
        await page.request.delete(`/api/clients/${ref}`);
      }
    } catch {
      // Teardown must never turn a green run red.
    } finally {
      await context.close();
    }
  });

  test("the list renders clients from the database", async ({ page }) => {
    await signIn(page, ACCOUNTS.owner);

    // Named from the API first, so the assertion is "the screen shows what the
    // database holds" rather than "the screen shows a string I hardcoded" —
    // which would pass just as well against the mock array.
    const rows = (await (await page.request.get("/api/clients")).json()) as {
      id: number;
      name: string;
    }[];
    expect(rows.length, "the API has clients to show").toBeGreaterThan(0);

    await page.goto(LIST, { waitUntil: "commit" });
    await expect(page.getByText(rows[0]!.name).first()).toBeVisible({
      timeout: 90_000,
    });
  });

  test("a created client survives a reload", async ({ page }) => {
    await signIn(page, ACCOUNTS.owner);

    const stamp = Date.now() % 1000000;
    const name = `E2E Client ${stamp}`;

    // Through the API rather than the modal: this test is about whether the
    // screen READS from the database, and driving a twelve-field modal would
    // make it about the modal instead. The modal's own path is exercised by
    // client-pet-write-path.spec.ts.
    const res = await page.request.post("/api/clients", {
      data: { name, email: `e2e-${stamp}@example.invalid`, status: "active" },
    });
    expect(res.status()).toBe(201);
    const client = (await res.json()) as { id: number };
    created.push(client.id);

    // The id came from Postgres, not from Math.max over a local array.
    expect(client.id).toBeGreaterThan(0);

    // SEARCHED FOR, not scrolled to. The table pages at 10 rows and sorts a new
    // client last, so "is it on screen" answers a question about pagination
    // rather than about persistence. Typing the name is also what a person
    // would do, and it exercises the same list the row came from.
    const find = async () => {
      const search = page.getByPlaceholder(/search by client or pet name/i);
      await expect(search).toBeVisible({ timeout: 90_000 });
      await search.fill(name);
      await expect(page.getByText(name).first()).toBeVisible({
        timeout: 30_000,
      });
    };

    await page.goto(LIST, { waitUntil: "commit" });
    await find();

    // The part the old screen could not do: still there after a full reload,
    // in a different tab, on a different day.
    await page.reload();
    await find();
  });

  test("a customer sees their own pets because RLS says so", async ({
    page,
  }) => {
    await signIn(page, ACCOUNTS.customer);

    // One record comes back, and it is theirs. That is the claim the hardcoded
    // MOCK_CUSTOMER_ID was standing in for.
    const rows = (await (await page.request.get("/api/clients")).json()) as {
      id: number;
      name: string;
      pets: { name: string }[];
    }[];
    expect(rows, "a customer reads exactly their own record").toHaveLength(1);
    expect(rows[0]!.pets.length, "and it has pets to show").toBeGreaterThan(0);

    await page.goto("/customer/pets", { waitUntil: "commit" });
    await expect(page.getByText(rows[0]!.pets[0]!.name).first()).toBeVisible({
      timeout: 90_000,
    });
  });
});
