import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

import { ACCOUNTS, signIn } from "./_auth";

// ============================================================================
// DELETING A CLIENT DESTROYS THEIR BOOKING HISTORY, AND NOW SAYS SO FIRST.
//
// ── WHAT WAS MEASURED ─────────────────────────────────────────────────────
//
// 2026-09-21, from `pg_constraint`: 34 foreign keys point at `public.clients`.
// Only `payments` and `store_credit_entries` are `on delete restrict`. Almost
// everything else CASCADES — `bookings`, `report_cards`, `waiver_signatures`,
// `form_submissions`, `customer_packages`, `saved_cards` and the whole
// training set.
//
// So the restrict on `payments` protects a client who has PAID, by accident
// and only then. A real client at doggieville-mtl had six bookings and no
// payments: deleting it would have succeeded and taken all six with it. The
// route's own comment said pets cascade "which is the right shape" and did not
// mention bookings.
//
// ── WHY A 422 AND NOT A REFUSAL ───────────────────────────────────────────
//
// `supabase/tests/forms.sql` and `waivers.sql` both assert that "an erasure
// request has to be able to complete" — a person's record must be destroyable
// on request, history and all. That is an obligation, so the rule cannot be
// "never". It is "not without having been told what goes", and
// `?confirm=history` is the caller saying they were told.
//
// ── IT BUILDS ITS OWN CLIENT, AND DELETES IT ──────────────────────────────
//
// The confirmed path really does destroy a record, so this must never point at
// a seeded one. It makes a client of its own at the e2e facility, gives it a
// booking through the API (so the booking is real, not inserted behind the
// app's back), and the successful delete IS the cleanup. afterAll removes the
// row if an assertion failed before that.
// ============================================================================

const MARKER = "[e2e delete-guard]";
const E2E_FACILITY_SLUG = "yipyy-demo-facility";

function admin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  expect(url, "NEXT_PUBLIC_SUPABASE_URL must be set").toBeTruthy();
  expect(key, "SUPABASE_SERVICE_ROLE_KEY must be set").toBeTruthy();
  return createClient(url!, key!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

let clientId = "";
let clientRef = 0;
let petRef = 0;

test.describe.configure({ mode: "serial" });

test.beforeAll(async ({ browser }) => {
  const db = admin();
  const { data: facility } = await db
    .from("facilities")
    .select("id")
    .eq("slug", E2E_FACILITY_SLUG)
    .maybeSingle();
  expect(facility, `no facility ${E2E_FACILITY_SLUG}`).toBeTruthy();
  const facilityId = (facility as { id: string }).id;

  const { data: created, error } = await db
    .from("clients")
    .insert({
      facility_id: facilityId,
      name: `${MARKER} Doomed Client`,
      email: `e2e-delete-guard-${Date.now()}@example.invalid`,
    })
    .select("id, ref")
    .single();
  expect(error, error?.message).toBeNull();
  clientId = (created as { id: string }).id;
  clientRef = (created as { ref: number }).ref;

  const { data: pet, error: petError } = await db
    .from("pets")
    .insert({
      client_id: clientId,
      facility_id: facilityId,
      name: `${MARKER} Doomed Dog`,
      species: "Dog",
    })
    .select("ref")
    .single();
  expect(petError, petError?.message).toBeNull();
  petRef = (pet as { ref: number }).ref;

  // A REAL booking, made through the API as staff, so the row is shaped the
  // way the product makes them rather than the way a test would.
  const page = await browser.newPage();
  try {
    await signIn(page, ACCOUNTS.owner);
    const day = new Date(Date.now() + 500 * 86_400_000)
      .toISOString()
      .slice(0, 10);
    const res = await page.request.post("/api/bookings", {
      data: {
        clientId: clientRef,
        petId: petRef,
        facilityId: 0,
        service: "daycare",
        startDate: day,
        endDate: day,
        checkInTime: "08:00",
        checkOutTime: "17:00",
        status: "confirmed",
        basePrice: 40,
        discount: 0,
        totalCost: 40,
        specialRequests: MARKER,
      },
    });
    expect(res.status(), await res.text()).toBe(201);
  } finally {
    await page.close();
  }
});

test.afterAll(async () => {
  if (!clientId) return;
  const db = admin();
  // Only if the confirmed delete did not already do it. Bookings first: the
  // cascade would take them anyway, but this script should not rely on the
  // behaviour it exists to police.
  const { data: still } = await db
    .from("clients")
    .select("id")
    .eq("id", clientId)
    .maybeSingle();
  if (!still) {
    console.log(`cleanup: client ${clientRef} already removed by the test`);
    return;
  }
  await db.from("bookings").delete().eq("client_id", clientId);
  await db.from("pets").delete().eq("client_id", clientId);
  const { error } = await db.from("clients").delete().eq("id", clientId);
  console.log(
    `cleanup: client ${clientRef} ${error ? `NOT removed — ${error.message}` : "removed"}`,
  );
});

test("an unconfirmed delete is refused, and says what would be destroyed", async ({
  page,
}) => {
  await signIn(page, ACCOUNTS.owner);

  const res = await page.request.delete(`/api/clients/${clientRef}`, {
    failOnStatusCode: false,
  });

  // 422: the request was understood and refused, which is the shape
  // write-failure.ts already uses for "not in this state".
  expect(res.status(), await res.text()).toBe(422);

  const body = (await res.json()) as {
    error: string;
    reason: string;
    destroys: Record<string, number>;
  };

  // The COUNT is the point. "Are you sure?" is not a warning; "this will
  // delete 1 booking" is.
  expect(body.destroys.bookings, "the booking was not counted").toBe(1);
  expect(body.error).toContain("booking");
  expect(body.reason).toContain("confirm=history");

  // And nothing happened.
  const db = admin();
  const { data: survivor } = await db
    .from("clients")
    .select("ref")
    .eq("id", clientId)
    .maybeSingle();
  expect(survivor, "the client was deleted despite the refusal").toBeTruthy();

  const { count } = await db
    .from("bookings")
    .select("id", { count: "exact", head: true })
    .eq("client_id", clientId);
  expect(count, "the booking went anyway").toBe(1);
});

test("a client with no history still deletes without ceremony", async ({
  page,
}) => {
  // The other half, and the one a guard gets wrong. `historyOf` counts an
  // UNREADABLE table as 1 rather than 0, deliberately — unknown must not read
  // as "nothing to lose" — so a mistake there would warn about every client
  // alive and make the route useless. This is the test that notices.
  const db = admin();
  const { data: facility } = await db
    .from("facilities")
    .select("id")
    .eq("slug", E2E_FACILITY_SLUG)
    .maybeSingle();

  const { data: empty, error } = await db
    .from("clients")
    .insert({
      facility_id: (facility as { id: string }).id,
      name: `${MARKER} Empty Client`,
      email: `e2e-delete-empty-${Date.now()}@example.invalid`,
    })
    .select("id, ref")
    .single();
  expect(error, error?.message).toBeNull();
  const emptyId = (empty as { id: string }).id;
  const emptyRef = (empty as { ref: number }).ref;

  try {
    await signIn(page, ACCOUNTS.owner);
    const res = await page.request.delete(`/api/clients/${emptyRef}`, {
      failOnStatusCode: false,
    });
    expect(
      res.status(),
      `${await res.text()} — a client with nothing to lose was still refused`,
    ).toBe(204);
  } finally {
    await db.from("clients").delete().eq("id", emptyId);
  }
});

test("a confirmed delete goes through, because erasure has to work", async ({
  page,
}) => {
  await signIn(page, ACCOUNTS.owner);

  const res = await page.request.delete(
    `/api/clients/${clientRef}?confirm=history`,
    { failOnStatusCode: false },
  );
  expect(res.status(), await res.text()).toBe(204);

  const db = admin();
  const { data: survivor } = await db
    .from("clients")
    .select("ref")
    .eq("id", clientId)
    .maybeSingle();
  expect(survivor, "the client is still there after a confirmed delete").toBe(
    null,
  );

  // The cascade really is a cascade — which is the whole reason the warning
  // above has to name it.
  const { count } = await db
    .from("bookings")
    .select("id", { count: "exact", head: true })
    .eq("client_id", clientId);
  expect(count, "the booking survived its client").toBe(0);
});
