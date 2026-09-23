import { test, expect, type Page } from "@playwright/test";

import { createClient } from "@supabase/supabase-js";

import { ACCOUNTS, signIn } from "./_auth";

// ============================================================================
// THE DAYCARE MENU IS A ROW, AND ONLY THE RIGHT PEOPLE MAY WRITE IT.
//
// `daycare_services` (20260924120000) replaced the `daycare_rates` setting so
// a booking can PICK a named service instead of having the cheapest one that
// covers the hours chosen for it. This pins the half the server owns:
//
//   1. the menu reads back, and a service created here comes back on it;
//   2. a PATCH sends only what changed and leaves the rest alone — the whole
//      reason `daycareServiceToRow` builds its write key by key;
//   3. the PERMISSION SPLIT: `manage_services` writes the menu,
//      `manage_rates` writes the price. A caller with neither is refused;
//   4. a service cannot roll over into itself;
//   5. a branch price replaces the facility one FOR THAT BRANCH.
//
// ── ONE POSTGRES, SHARED WITH CI ────────────────────────────────────────────
//
// Everything made here carries MARKER in its name, and `afterAll` DELETES it —
// `daycare_services` has a real delete policy, unlike `bookings`, so this
// leaves nothing behind at all. The sweep asks the database what carries the
// marker rather than replaying a list the tests filled, because a test that
// fails between creating and recording would otherwise leave a service on a
// real facility's menu.
// ============================================================================

const MARKER = "[e2e daycare-svc]";
const BASE = "/api/daycare/services";

interface Service {
  id: string;
  rowId: string;
  name: string;
  price: number;
  facilityPrice: number;
  taxable: boolean;
  maxDurationHours: number | null;
  rolloverAfterMinutes: number | null;
  rolloverToServiceId: string | null;
  eligibleSpecies: string[];
  eligibleWeightTiers: string[];
  blockedPetTags: string[];
  description: string;
  isActive: boolean;
  locationPricing: { locationId: string | null; price: number }[];
}

async function menu(page: Page, locationId?: string): Promise<Service[]> {
  const res = await page.request.get(
    locationId ? `${BASE}?locationId=${locationId}` : BASE,
  );
  expect(res.ok(), await res.text()).toBe(true);
  const body: unknown = await res.json();
  // A cast is a claim: a 500 answers `{error}`, and `.filter` on that throws.
  return Array.isArray(body) ? (body as Service[]) : [];
}

async function create(page: Page, body: Record<string, unknown>) {
  return page.request.post(BASE, { data: body, failOnStatusCode: false });
}

/** Bookings this file made. Cancelled, not deleted: `bookings` has no
 *  delete policy, deliberately — a booking is a record. */
const madeBookings: number[] = [];

test.describe.configure({ mode: "serial" });

async function sweep(page: Page): Promise<number> {
  let removed = 0;
  for (const s of await menu(page)) {
    if (!s.name.includes(MARKER)) continue;
    const res = await page.request.delete(`${BASE}/${s.id}`);
    if (res.ok()) removed += 1;
  }
  return removed;
}

test.beforeAll(async ({ browser }) => {
  const page = await browser.newPage();
  try {
    await signIn(page, ACCOUNTS.owner);
    // Heal whatever a crashed earlier run left on the menu, before adding.
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
    let cancelled = 0;
    for (const ref of new Set(madeBookings)) {
      const res = await page.request.patch(`/api/bookings/${ref}`, {
        data: { status: "cancelled" },
      });
      if (res.ok()) cancelled += 1;
    }
    console.log(
      `cleanup: ${await sweep(page)} service(s) removed, ` +
        `${cancelled}/${new Set(madeBookings).size} booking(s) cancelled`,
    );
  } finally {
    await page.close();
  }
});

test.describe("the daycare menu", () => {
  test("a service is created, reads back on the menu, and is priced", async ({
    page,
  }) => {
    await signIn(page, ACCOUNTS.owner);

    const res = await create(page, {
      name: `${MARKER} Full day`,
      description: "Drop off from seven",
      price: 42,
      taxable: true,
      maxDurationHours: 10,
      eligibleSpecies: ["Dog"],
    });
    expect(res.status(), await res.text()).toBe(201);

    const { service, pricesWritten } = (await res.json()) as {
      service: Service;
      pricesWritten: boolean;
    };
    expect(service.name).toContain(MARKER);
    expect(service.price).toBeCloseTo(42, 2);
    expect(service.maxDurationHours).toBeCloseTo(10, 2);
    expect(service.eligibleSpecies).toEqual(["Dog"]);
    // Nothing was asked for, so nothing was refused.
    expect(pricesWritten, "no branch prices were sent").toBe(true);

    const mine = (await menu(page)).find((s) => s.id === service.id);
    expect(mine, "it is on the menu").toBeTruthy();
    expect(mine?.isActive, "a new service is live unless said otherwise").toBe(
      true,
    );
  });

  test("a PATCH changes only what it names", async ({ page }) => {
    // The point of building the write key by key. A facility that spends an
    // afternoon on eligibility and then flips the service inactive must not
    // lose the afternoon.
    await signIn(page, ACCOUNTS.owner);

    const created = await create(page, {
      name: `${MARKER} Half day`,
      price: 24,
      eligibleSpecies: ["Dog", "Cat"],
      eligibleWeightTiers: ["small", "medium"],
      description: "Four hours",
    });
    expect(created.status(), await created.text()).toBe(201);
    const { service } = (await created.json()) as { service: Service };

    const patched = await page.request.patch(`${BASE}/${service.id}`, {
      data: { isActive: false },
      failOnStatusCode: false,
    });
    expect(patched.status(), await patched.text()).toBe(200);

    const after = (await patched.json()).service as Service;
    expect(after.isActive, "what the PATCH named").toBe(false);
    expect(after.eligibleSpecies, "and nothing else").toEqual(["Dog", "Cat"]);
    expect(after.eligibleWeightTiers).toEqual(["small", "medium"]);
    expect(after.description).toBe("Four hours");
    expect(after.price).toBeCloseTo(24, 2);
  });

  test("a service cannot roll over into itself", async ({ page }) => {
    // A self-rollover would never settle at check-out: the stay passes the
    // ceiling, becomes itself, and passes the ceiling again.
    await signIn(page, ACCOUNTS.owner);

    const created = await create(page, {
      name: `${MARKER} Loop`,
      price: 10,
      maxDurationHours: 4,
    });
    expect(created.status(), await created.text()).toBe(201);
    const { service } = (await created.json()) as { service: Service };

    const res = await page.request.patch(`${BASE}/${service.id}`, {
      data: { rolloverToServiceId: service.rowId, rolloverAfterMinutes: 30 },
      failOnStatusCode: false,
    });
    expect(res.status(), await res.text()).toBe(422);
  });

  test("a branch price replaces the facility one, for that branch only", async ({
    page,
  }) => {
    await signIn(page, ACCOUNTS.owner);

    const created = await create(page, {
      name: `${MARKER} Branch priced`,
      price: 30,
    });
    expect(created.status(), await created.text()).toBe(201);
    const { service } = (await created.json()) as { service: Service };

    // `facility` is the facility-wide row — location_id null, the one the
    // partial unique index allows exactly one of.
    const priced = await page.request.patch(`${BASE}/${service.id}`, {
      data: { branchPrices: { facility: 33 } },
      failOnStatusCode: false,
    });
    expect(priced.status(), await priced.text()).toBe(200);
    expect(
      (await priced.json()).pricesWritten,
      "the owner holds manage_rates",
    ).toBe(true);

    const after = (await menu(page)).find((s) => s.id === service.id);
    expect(
      after?.price,
      "the facility-wide row wins over the column",
    ).toBeCloseTo(33, 2);
    expect(after?.locationPricing.length).toBeGreaterThan(0);
  });

  test("a groomer may not write the menu", async ({ page }) => {
    // Who may author services is RLS on the table, not a check in the route.
    await signIn(page, ACCOUNTS.groomer);
    const res = await create(page, { name: `${MARKER} Not yours`, price: 5 });
    expect(res.status(), await res.text()).toBe(403);
  });

  test("a signed-out caller reads nothing and writes nothing", async ({
    page,
  }) => {
    await page.context().clearCookies();
    expect((await page.request.get(BASE)).status()).toBe(401);
    const res = await create(page, { name: `${MARKER} Signed out`, price: 5 });
    expect(res.status()).toBe(401);
  });

  test("a service needs a name", async ({ page }) => {
    await signIn(page, ACCOUNTS.owner);
    const res = await create(page, { price: 20 });
    expect(res.status(), await res.text()).toBe(422);
  });
});

// ============================================================================
// AUTO-ROLLOVER: the dog stayed late, so the BILL moved.
//
// MoéGo's own example — "this service will turn into a Full Day service if a
// pet stays 30 minutes past the max duration of 4 hours" — is the feature that
// stops a facility losing money on an overstay. What has to be proved is that
// the MONEY changed, not that a label did.
//
// ── WHY IT REACHES PAST THE API FOR ONE FIELD ─────────────────────────────
//
// The stay has to be seven hours long, and a test that waits seven hours is
// not a test. `daycare_attendance.checked_in_at` is stamped with `now()` by
// the check-in route and no route can move it, so the arrival is backdated
// with the service-role client — the same access `custom-services.spec.ts`
// uses, for the same reason. Everything else goes through the shipped routes,
// including the check-out that triggers the rollover.
// ============================================================================

function admin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  expect(url, "NEXT_PUBLIC_SUPABASE_URL must be set").toBeTruthy();
  expect(key, "SUPABASE_SERVICE_ROLE_KEY must be set").toBeTruthy();
  return createClient(url!, key!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

test.describe("a stay that runs past its service", () => {
  test("checking out late rolls the booking over and moves what is owed", async ({
    page,
  }) => {
    test.slow();
    await signIn(page, ACCOUNTS.owner);

    // A short service that becomes a dearer long one.
    const longRes = await create(page, {
      name: `${MARKER} Long day`,
      price: 60,
      maxDurationHours: 10,
    });
    expect(longRes.status(), await longRes.text()).toBe(201);
    const long = ((await longRes.json()) as { service: Service }).service;

    const shortRes = await create(page, {
      name: `${MARKER} Short day`,
      price: 20,
      maxDurationHours: 4,
    });
    expect(shortRes.status(), await shortRes.text()).toBe(201);
    const short = ((await shortRes.json()) as { service: Service }).service;

    const linked = await page.request.patch(`${BASE}/${short.id}`, {
      data: { rolloverAfterMinutes: 30, rolloverToServiceId: long.rowId },
      failOnStatusCode: false,
    });
    expect(linked.status(), await linked.text()).toBe(200);

    const today = new Date().toISOString().slice(0, 10);
    const made = await page.request.post("/api/bookings", {
      data: {
        clientId: 15,
        petId: 1,
        facilityId: 0,
        service: "daycare",
        serviceType: short.name,
        startDate: today,
        endDate: today,
        checkInTime: "07:00",
        checkOutTime: "23:00",
        status: "confirmed",
        basePrice: 20,
        discount: 0,
        totalCost: 20,
        daycareServiceId: short.rowId,
        specialRequests: MARKER,
      },
      failOnStatusCode: false,
    });
    expect(made.status(), await made.text()).toBe(201);
    const ref = ((await made.json()) as { id: number }).id;
    madeBookings.push(ref);

    const arrived = await page.request.post("/api/daycare/attendance", {
      data: { bookingRef: ref, formOverrideReason: "e2e rollover" },
      failOnStatusCode: false,
    });
    expect(arrived.status(), await arrived.text()).toBe(201);

    // SEVEN hours ago: past the 4-hour ceiling and its 30 minutes of grace.
    const db = admin();
    const { data: bookingRow } = await db
      .from("bookings")
      .select("id")
      .eq("ref", ref)
      .maybeSingle();
    const bookingId = (bookingRow as { id: string } | null)?.id;
    expect(bookingId, "the booking is readable as service role").toBeTruthy();

    const { error: backdated } = await db
      .from("daycare_attendance")
      .update({
        checked_in_at: new Date(Date.now() - 7 * 3_600_000).toISOString(),
      })
      .eq("booking_id", bookingId!);
    expect(backdated, "the arrival is backdated").toBeNull();

    const out = await page.request.patch(`/api/daycare/attendance/${ref}`, {
      data: { checkOut: true, careOverrideReason: "e2e rollover" },
      failOnStatusCode: false,
    });
    expect(out.status(), await out.text()).toBe(204);

    // THE ASSERTION. 20 → 60, so the booking owes 40 more than it did — and
    // `amount_due` follows, because it is generated from `total_cost`.
    await expect
      .poll(
        async () => {
          const res = await page.request.get(`/api/bookings?ref=${ref}`);
          if (!res.ok()) return null;
          const body: unknown = await res.json();
          const row = Array.isArray(body)
            ? (body[0] as { totalCost?: number } | undefined)
            : undefined;
          return row?.totalCost ?? null;
        },
        { timeout: 20_000 },
      )
      .toBeCloseTo(60, 2);

    const after = await page.request.get(`/api/bookings?ref=${ref}`);
    const rows: unknown = await after.json();
    const booking = Array.isArray(rows)
      ? (rows[0] as {
          amountDue?: number;
          serviceType?: string;
          basePrice?: number;
        })
      : undefined;
    expect(booking?.amountDue, "what is owed followed the price").toBeCloseTo(
      60,
      2,
    );
    expect(booking?.basePrice, "and so did the base").toBeCloseTo(60, 2);
    expect(booking?.serviceType, "the receipt names what it became").toContain(
      "Long day",
    );
  });
});

// ============================================================================
// THE CUSTOMER'S OWN MENU — one facility, and only the columns they may see.
//
// Phase 6. Until now the booking modal reached `/api/daycare/services` even
// when a pet owner was driving it, and that route scopes with
// `activeFacilityIdForStaff()` — null for somebody holding no membership. So
// the query fell through to RLS, which admits active services at EVERY
// facility the caller is a client of, and it handed back the whole row.
//
// What is proved here is the WIRING, because the projection itself is proved
// in SQL (daycare-customer-services.sql, P0-P9):
//
//   * the customer's route answers, and answers with services;
//   * the private columns are not in the answer — asserted as ABSENCE, so a
//     column added to the table later has to be allowed in deliberately;
//   * a draft the facility is working on is not offered;
//   * the evaluation gate refuses through the real HTTP route, with the code
//     the screen keys on and a message naming the service.
//
// It signs in as `customer@yipyy.dev`, a client of the demo facility, which is
// where this file's own services live.
// ============================================================================

const CUSTOMER_BASE = "/api/customer/daycare-services";

interface OfferedService {
  id: string;
  rowId: string;
  name: string;
  price: number;
  color: string | null;
  isActive: boolean;
  requiresEvaluationOnline: boolean;
}

test.describe("the menu a customer is offered", () => {
  test("is projected, not the row — and a draft is not on it", async ({
    page,
  }) => {
    test.slow();

    // Authored by the facility.
    await signIn(page, ACCOUNTS.owner);

    const liveRes = await create(page, {
      name: `${MARKER} Customer live`,
      price: 42,
      color: "#123456",
      description: "On the customer menu",
    });
    expect(liveRes.status(), await liveRes.text()).toBe(201);

    const draftRes = await create(page, {
      name: `${MARKER} Customer draft`,
      price: 99,
      isActive: false,
    });
    expect(draftRes.status(), await draftRes.text()).toBe(201);

    // Read by the customer.
    await signIn(page, ACCOUNTS.customer);

    const res = await page.request.get(CUSTOMER_BASE, {
      failOnStatusCode: false,
    });
    expect(res.status(), await res.text()).toBe(200);

    const body: unknown = await res.json();
    expect(Array.isArray(body), "the menu is a list").toBe(true);
    const offered = body as OfferedService[];

    const live = offered.find((s) => s.name.includes("Customer live"));
    expect(live, "the active service is offered").toBeTruthy();
    expect(
      offered.find((s) => s.name.includes("Customer draft")),
      "a draft the facility is still working on is NOT offered",
    ).toBeUndefined();

    // The colour is "internal only" on our own setup screen, because it is on
    // MoéGo's. It was authored above as #123456 and must not come back.
    expect(live?.color, "the calendar colour does not reach a customer").toBe(
      null,
    );

    // Asserted as absence of a VALUE, not of a key: the route rebuilds the
    // client shape, so the tag arrays exist and must be empty.
    const raw = live as unknown as Record<string, unknown>;
    expect(
      raw["blockedPetTags"],
      "the facility's pet codes stay private",
    ).toEqual([]);
    expect(raw["eligiblePetTags"], "and so do its eligibility codes").toEqual(
      [],
    );
    expect(raw["allowedSectionIds"], "so do its play areas").toEqual([]);
    expect(raw["rolloverToServiceId"], "and its rollover target").toBe(null);
  });

  test("refuses a service that needs an evaluation — and only for the pet that lacks one", async ({
    page,
  }) => {
    test.slow();

    // ── WHY THIS BOOKS TWICE ────────────────────────────────────────────
    //
    // The first version of this test took `pets[0]` from /api/clients/me and
    // asserted a refusal. It failed, and it was RIGHT to fail: the demo
    // customer's first pet is Buddy, who holds a passing evaluation, so the
    // gate correctly did not fire and the 422 that came back was a different
    // refusal entirely.
    //
    // A gate that refuses everything is not a gate. So this proves both
    // directions against the SAME service: the pet without a pass is turned
    // away, the pet with one books. Which pet is which is read from the
    // database rather than hardcoded, so a reseed cannot quietly turn this
    // into a test of nothing.
    await signIn(page, ACCOUNTS.owner);

    const gatedRes = await create(page, {
      name: `${MARKER} Assessed play`,
      price: 55,
      requiresEvaluationOnline: true,
    });
    expect(gatedRes.status(), await gatedRes.text()).toBe(201);
    const gated = ((await gatedRes.json()) as { service: Service }).service;

    await signIn(page, ACCOUNTS.customer);

    const meRes = await page.request.get("/api/clients/me");
    expect(meRes.status(), await meRes.text()).toBe(200);
    const me = (await meRes.json()) as {
      id: number;
      pets?: { id: number }[];
    };
    const myPets = me.pets ?? [];
    expect(myPets.length, "the customer has pets to book for").toBeGreaterThan(
      1,
    );

    // Which of their pets holds a passing evaluation. `pets.details` is the
    // facility's own field and no customer route exposes it, so this is read
    // as service role — the same access the rollover test above uses, and for
    // the same reason: the alternative is asserting against a guess.
    const db = admin();
    const passed = new Map<number, boolean>();
    for (const pet of myPets) {
      const { data } = await db
        .from("pets")
        .select("details")
        .eq("ref", pet.id)
        .maybeSingle();
      const stored = (data as { details?: { evaluations?: unknown } } | null)
        ?.details?.evaluations;
      const list = Array.isArray(stored) ? stored : [];
      // The same three conditions private.pet_passed_daycare_evaluation
      // applies, written out rather than called: the predicate lives in the
      // private schema, which PostgREST does not expose. Spelling it here
      // also makes this an INDEPENDENT check of the stored data rather than
      // the database agreeing with itself.
      passed.set(
        pet.id,
        list.some((raw) => {
          const e = raw as {
            status?: string;
            isExpired?: boolean;
            approvedServices?: { daycare?: boolean };
          };
          return (
            e.status === "passed" &&
            e.isExpired !== true &&
            e.approvedServices?.daycare !== false
          );
        }),
      );
    }

    const without = myPets.find((pet) => passed.get(pet.id) === false);
    const with_ = myPets.find((pet) => passed.get(pet.id) === true);
    expect(without, "a pet with no passing evaluation").toBeTruthy();
    expect(with_, "and one that has one").toBeTruthy();

    const today = new Date().toISOString().slice(0, 10);
    const bookingFor = (petId: number) => ({
      // The customer's own client ref. The real hook sends it and the route
      // refuses without it, BEFORE create_booking runs — so leaving it out
      // makes this test measure its own omission rather than the gate.
      clientId: me.id,
      petId,
      service: "daycare",
      serviceType: `${MARKER} Assessed play`,
      startDate: today,
      endDate: today,
      checkInTime: "09:00",
      checkOutTime: "15:00",
      status: "request_submitted",
      basePrice: 55,
      totalCost: 55,
      daycareServiceId: gated.rowId,
      specialRequests: MARKER,
    });

    // ── The pet without a pass is refused, by name ──────────────────────
    const refused = await page.request.post("/api/bookings", {
      data: bookingFor(without!.id),
      failOnStatusCode: false,
    });

    expect(
      refused.status(),
      `the database refuses it: ${await refused.text()}`,
    ).toBe(422);

    const body = (await refused.json()) as { code?: string; error?: string };
    expect(
      body.code,
      `the screen keys on this code: ${JSON.stringify(body)}`,
    ).toBe("daycare_evaluation_required");
    expect(
      body.error,
      "and the refusal names the service, or it is a dead end",
    ).toContain("Assessed play");

    // ── The pet WITH a pass books the very same service ─────────────────
    const allowed = await page.request.post("/api/bookings", {
      data: bookingFor(with_!.id),
      failOnStatusCode: false,
    });
    expect(
      allowed.status(),
      `the same service books for a pet that passed: ${await allowed.text()}`,
    ).toBe(201);
    const made = (await allowed.json()) as { id: number };
    madeBookings.push(made.id);
  });
});
