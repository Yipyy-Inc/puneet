import { test, expect, type Browser, type Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

import { ACCOUNTS, signIn } from "./_auth";

// ============================================================================
// What a scoped viewer may see is decided by the bookings that say so.
//
// `view_clients` and `view_bookings` both resolve to `assigned_shifts` for
// groomer@yipyy.dev. Which records that admits used to be computed from
// fixtures:
//
//   resolveBookingStaffId  →  pool[booking.id % pool.length] over the staff
//                             fixture, read by view_bookings and add_pet_notes
//   assignedClientIds      →  a walk of the bookings fixture, read by
//                             view_clients, view_client_list and messages_send
//
// Both are gone (a6207b51, d88c01b9); `bookings.assigned_staff_id` answers now,
// through /api/clients/assigned and /api/bookings/assigned.
//
// ── WHY THIS SEEDS, AND WHY IT HAS TO ─────────────────────────────────────
//
// The defect was invisible without a seed. A scoped groomer saw ZERO clients
// and ZERO bookings, which looked correct because nothing was assigned to them
// — and stayed zero after one real booking WAS assigned, because the fixture's
// staff ids ("fs-dev-groomer") never matched a uuid. An empty list proved
// nothing in either direction.
//
// So this assigns a real booking and asserts the viewer's world changes shape
// around it. Every check below fails against the fixture version.
//
// ── AND THERE IS NO PRODUCT PATH THAT WRITES THIS COLUMN ──────────────────
//
// Worth stating, because it explains the service_role client. Nothing in `src/`
// sets `assigned_staff_id`: the grooming PATCH is a status transition plus a
// station, and `assignedStaff` on the booking mapper writes
// `assigned_staff_name`, a display string nothing scopes on. The seven rows
// carrying it came from seed migrations. Until an assignment feature exists
// this column can only be written the way this file writes it — which is also
// why the scope is correct and yet admits almost nothing in real use.
//
// ── CLEANUP RUNS WHATEVER HAPPENS ─────────────────────────────────────────
//
// Two pieces of facility-wide state move here:
//
//   the booking's assignment    — restored to whatever it was, and re-read
//   requireRegisterOpenOnLogin  — the /employee shell blocks the whole portal
//                                 until the drawer is counted, so these checks
//                                 cannot reach a page without turning it off
//                                 (staff-portal-nav does the same, for the same
//                                 reason)
//
// The register gate is the dangerous one. A run that died before its teardown
// left the gate OFF on the facility and nothing failed — the specs asserting it
// BLOCKS would have gone quietly green. That is the direction-of-failure trap
// role-editor-writes documents, so the teardown is unconditional and asserts
// the restored value rather than assuming the write landed.
// ============================================================================

const FACILITY = "yipyy-demo-facility";
const GROOMER_EMAIL = ACCOUNTS.groomer;

interface Seed {
  bookingId: string;
  previousStaffId: string | null;
  bookingRef: number;
  clientRef: number;
  clientName: string;
  /** A real client of this facility that is NOT the seeded one. */
  otherName: string;
}

function admin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  // Not a skip: CI fails on a missing secret before the suite starts, and a
  // spec that quietly does nothing is the failure mode this file guards.
  expect(url, "NEXT_PUBLIC_SUPABASE_URL must be set").toBeTruthy();
  expect(key, "SUPABASE_SERVICE_ROLE_KEY must be set").toBeTruthy();
  return createClient(url!, key!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** Turn the facility-wide opening-count gate on or off, as the owner. */
async function setRegisterGate(browser: Browser, required: boolean) {
  const context = await browser.newContext();
  const page = await context.newPage();
  try {
    await signIn(page, ACCOUNTS.owner);
    const res = await page.request.put("/api/staff-onboarding/hr-config", {
      data: { requireRegisterOpenOnLogin: required },
    });
    expect(res.ok(), await res.text()).toBe(true);
  } finally {
    await context.close();
  }
}

async function assignedBookings(page: Page) {
  const res = await page.request.get("/api/bookings/assigned");
  expect(res.status()).toBe(200);
  return (await res.json()) as { refs: number[]; petIds: number[] };
}

async function assignedClients(page: Page) {
  const res = await page.request.get("/api/clients/assigned");
  expect(res.status()).toBe(200);
  return (await res.json()) as { refs: number[] };
}

let seed: Seed;

test.describe.configure({ mode: "serial" });

test.describe("assigned scope", () => {
  test.beforeAll(async ({ browser }) => {
    const db = admin();

    const { data: facility } = await db
      .from("facilities")
      .select("id")
      .eq("slug", FACILITY)
      .single();
    expect(facility, "the demo facility must exist").toBeTruthy();
    const facilityId = (facility as { id: string }).id;

    const { data: groomer } = await db
      .from("staff")
      .select("id")
      .eq("email", GROOMER_EMAIL)
      .eq("facility_id", facilityId)
      .single();
    expect(groomer, "the groomer must be rostered here").toBeTruthy();

    // A booking nobody is assigned to, so the teardown restores null rather
    // than guessing — and one with a client, since the client half of the
    // scope is asserted through it.
    const { data: candidate } = await db
      .from("bookings")
      .select("id, ref, assigned_staff_id, clients:client_id ( ref, name )")
      .eq("facility_id", facilityId)
      .is("assigned_staff_id", null)
      .not("client_id", "is", null)
      .limit(1)
      .single();
    expect(candidate, "a bookable row to assign").toBeTruthy();

    const row = candidate as {
      id: string;
      ref: number;
      assigned_staff_id: string | null;
      clients:
        | { ref: number; name: string }
        | { ref: number; name: string }[]
        | null;
    };
    // PostgREST returns a to-one embed as an object, and has answered with a
    // one-element array before now.
    const embedded = Array.isArray(row.clients) ? row.clients[0] : row.clients;
    expect(embedded?.ref, "the booking's client must have a ref").toBeTruthy();

    // Somebody else on this facility's roster, to prove the list is NARROWED
    // rather than merely short. Taken from the database so it cannot name a
    // client this facility does not have.
    const { data: others } = await db
      .from("clients")
      .select("name")
      .eq("facility_id", facilityId)
      .neq("ref", embedded!.ref)
      .limit(1);
    const other = (others ?? [])[0] as { name: string } | undefined;
    expect(other?.name, "a second client to contrast with").toBeTruthy();

    seed = {
      bookingId: row.id,
      previousStaffId: row.assigned_staff_id,
      bookingRef: row.ref,
      clientRef: embedded!.ref,
      clientName: embedded!.name,
      otherName: other!.name,
    };

    const { error } = await db
      .from("bookings")
      .update({ assigned_staff_id: (groomer as { id: string }).id })
      .eq("id", seed.bookingId);
    expect(
      error,
      "the seed must land or nothing below means anything",
    ).toBeNull();

    await setRegisterGate(browser, false);
  });

  test.afterAll(async ({ browser }) => {
    const db = admin();
    if (seed) {
      await db
        .from("bookings")
        .update({ assigned_staff_id: seed.previousStaffId })
        .eq("id", seed.bookingId);

      const { data } = await db
        .from("bookings")
        .select("assigned_staff_id")
        .eq("id", seed.bookingId)
        .single();
      expect(
        (data as { assigned_staff_id: string | null } | null)
          ?.assigned_staff_id,
        "the assignment must not outlive this file",
      ).toBe(seed.previousStaffId);
    }

    // Last, and asserted: a facility left with its register gate off is a
    // silent hole, and the specs guarding it would pass straight through.
    await setRegisterGate(browser, true);
  });

  test("the endpoints answer for the caller, not for an id they were handed", async ({
    page,
  }) => {
    await signIn(page, GROOMER_EMAIL);
    const bookings = await assignedBookings(page);
    const clients = await assignedClients(page);

    expect(bookings.refs, "the seeded booking is the groomer's").toContain(
      seed.bookingRef,
    );
    expect(clients.refs, "and so is its client").toContain(seed.clientRef);

    // The manager holds full access and has nothing assigned. Same request,
    // different answer — which is what proves the route reads the session
    // rather than a parameter. A route taking `?staffId=` could not tell these
    // two apart.
    await signIn(page, ACCOUNTS.manager);
    const asManager = await assignedBookings(page);
    expect(
      asManager.refs,
      "a manager is assigned nothing, and asks about themselves",
    ).not.toContain(seed.bookingRef);
  });

  test("a scoped viewer's client list is the clients assigned to them", async ({
    page,
  }) => {
    await signIn(page, GROOMER_EMAIL);
    await page.goto("/employee/clients");

    // The one assigned, and not a colleague's. Asserted by NAME rather than by
    // a count: "1 client" was the first attempt and matched nothing, because
    // the screen reads "Showing 1 of 1 clients" — and a count can be right
    // about the wrong client, which is the thing that would actually matter.
    await expect(
      page.getByText(seed.clientName).first(),
      "the assigned client is on the list",
    ).toBeVisible({ timeout: 30_000 });
    await expect(
      page.getByText(seed.otherName),
      "and a client they are not assigned is not",
    ).toHaveCount(0);
  });

  test("a scoped viewer's booking list is the bookings assigned to them", async ({
    page,
  }) => {
    await signIn(page, GROOMER_EMAIL);
    await page.goto("/employee/bookings");

    // A POSITIVE anchor first. The original assertion here was
    // `getByText("No bookings found")` having count 0, which passed against a
    // build serving an empty set — because it also passes against a page that
    // has not rendered yet. An absence is true of a blank screen.
    await expect(
      page.getByText(seed.clientName).first(),
      "the assigned booking, named by its client, is on the list",
    ).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText("No bookings found")).toHaveCount(0);
  });

  test("the client they are assigned opens, and another does not", async ({
    page,
  }) => {
    await signIn(page, GROOMER_EMAIL);

    await page.goto(`/employee/clients/${seed.clientRef}`);
    // Again the positive first: "the refusal is absent" is also true of a page
    // still deciding, and this component returns null while it decides.
    await expect(
      page.getByText(seed.clientName).first(),
      "the assigned client's record actually renders",
    ).toBeVisible({ timeout: 30_000 });
    await expect(
      page.getByText("You don't have access to this section."),
      "the assigned client is theirs to open",
    ).toHaveCount(0);

    // Some other real client of this facility — 15, unless the seed picked it.
    // Both exist and neither is assigned to the groomer.
    const other = seed.clientRef === 15 ? 16 : 15;
    await page.goto(`/employee/clients/${other}`);
    await expect(
      page.getByText("You don't have access to this section."),
      "a client they are not assigned is refused",
    ).toBeVisible({ timeout: 30_000 });
  });
});
