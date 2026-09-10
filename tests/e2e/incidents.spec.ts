import { test, expect, type Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

import { ACCOUNTS, signIn } from "./_auth";

// ============================================================================
// An incident reported is an incident on record.
//
// ── WHY THIS FILE EXISTS ──────────────────────────────────────────────────
//
// The incidents page read a fixture of fourteen invented incidents, the same
// at every facility, and the report form pushed onto that array: an incident
// filed at 6pm was gone when anybody reloaded. `public.incidents` had existed
// for twelve days with nothing writing it. supabase/tests/incidents.sql holds
// the POLICY (a caretaker may report, only a manager may change, nobody may
// delete); this holds the ROUTE and the SCREEN:
//
//   - a report comes back after a reload, on the list and through the route
//   - a status change and "the owner has been told" are written, not local
//   - a customer is never sent `internal_notes`, which RLS cannot hide
//
// ── IT CLEANS UP, THROUGH THE ONE DOOR THERE IS ───────────────────────────
//
// Incidents cannot be deleted by anybody signed in — that is the point of the
// table. So afterAll removes this run's rows as service_role, matched by
// MARKER, with the follow-up tasks they put on the board.
// ============================================================================

const MARKER = "[e2e incidents]";
const PET_REF = 1;

function admin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  expect(url, "NEXT_PUBLIC_SUPABASE_URL must be set").toBeTruthy();
  expect(key, "SUPABASE_SERVICE_ROLE_KEY must be set").toBeTruthy();
  return createClient(url!, key!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

interface IncidentPayload {
  id: string;
  title: string;
  status: string;
  internalNotes: string;
  clientFacingNotes: string;
  petIds: number[];
  clientNotified: boolean;
}

async function incidentsAs(page: Page) {
  const response = await page.request.get("/api/incidents");
  expect(response.status(), "read of /api/incidents").toBe(200);
  return (await response.json()) as IncidentPayload[];
}

test.describe.configure({ mode: "serial" });

test.afterAll(async () => {
  const db = admin();
  const { data } = await db
    .from("incidents")
    .select("id, ref")
    .like("title", `${MARKER}%`);
  for (const row of data ?? []) {
    await db
      .from("facility_tasks")
      .delete()
      .like("source_ref", `incident:${row.ref}:%`);
  }
  const { count } = await db
    .from("incidents")
    .delete({ count: "exact" })
    .like("title", `${MARKER}%`);
  console.log(`cleanup: ${count ?? 0} incident(s) deleted`);
});

let reportedId = "";

test.describe("incidents", () => {
  test("signed out gets 401", async ({ request }) => {
    const read = await request.get("/api/incidents", {
      failOnStatusCode: false,
    });
    expect(read.status()).toBe(401);
  });

  test("a reported incident is on the list after a reload", async ({
    page,
  }) => {
    test.slow();
    await signIn(page, ACCOUNTS.owner);

    const title = `${MARKER} scratch on the left ear ${Date.now()}`;
    const created = await page.request.post("/api/incidents", {
      failOnStatusCode: false,
      data: {
        type: "injury",
        severity: "low",
        title,
        description: "Found during the afternoon round.",
        internalNotes: "Staff only: check the fence by run 4.",
        clientFacingNotes: "A small scratch, cleaned and watched.",
        petRefs: [PET_REF],
        incidentDate: new Date().toISOString(),
      },
    });
    expect(created.status(), await created.text()).toBe(201);
    const incident = (await created.json()) as IncidentPayload;
    reportedId = incident.id;
    expect(incident.petIds, "the pet must come back as its ref").toEqual([
      PET_REF,
    ]);

    await page.goto("/facility/dashboard/incidents");
    await expect(page.getByText(title).first()).toBeVisible({
      timeout: 30_000,
    });
    await page.reload();
    await expect(
      page.getByText(title).first(),
      "the incident was gone after a reload — it never reached the database",
    ).toBeVisible({ timeout: 30_000 });
  });

  test("a status change and 'the owner was told' are written", async ({
    page,
  }) => {
    test.skip(!reportedId, "the report above did not land");
    await signIn(page, ACCOUNTS.owner);

    const changed = await page.request.patch(`/api/incidents/${reportedId}`, {
      data: { status: "resolved", ownerNotified: true },
    });
    expect(changed.status(), await changed.text()).toBe(200);

    const back = (await incidentsAs(page)).find((i) => i.id === reportedId);
    expect(back?.status).toBe("resolved");
    expect(back?.clientNotified).toBe(true);
  });

  test("a caretaker cannot change an incident", async ({ page }) => {
    test.skip(!reportedId, "the report above did not land");
    await signIn(page, ACCOUNTS.caretaker);
    const changed = await page.request.patch(`/api/incidents/${reportedId}`, {
      failOnStatusCode: false,
      data: { status: "open" },
    });
    expect(changed.status(), "a caretaker reopened an incident").not.toBe(200);
  });

  test("a customer is never sent the staff notes", async ({ page }) => {
    await signIn(page, ACCOUNTS.customer);
    for (const incident of await incidentsAs(page)) {
      expect(
        incident.internalNotes,
        `internal notes on incident ${incident.id} reached a customer`,
      ).toBe("");
    }
  });
});
