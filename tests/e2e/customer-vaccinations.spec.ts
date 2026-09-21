import { test, expect } from "@playwright/test";

import { ACCOUNTS, signIn } from "./_auth";

// ============================================================================
// A PET OWNER READS THEIR OWN PET'S VACCINATION RECORD, AND ONLY THEIRS.
//
// ── WHAT THIS REPLACES ────────────────────────────────────────────────────
//
// Nothing, which is the point. `pet_vaccinations_read` admits platform admins
// and members of the facility, so a customer could not read their own animal's
// rabies certificate by any route — and `/api/vaccinations` resolves its
// facility from the caller's MEMBERSHIP, which answers a customer with the
// demo facility.
//
// So four customer screens invented the answer from `@/data/pet-data`, keyed
// by fixture pet ids 1, 2, 3, 5, 13 and 14. A real pet matches none of them,
// so the dashboard raised "Vaccination missing" for every required vaccine,
// for every pet, every time — photographed on a real customer on 2026-09-20,
// three times over for one dog that actually held all three certificates.
//
// 20260921113000 added `public.my_pet_vaccinations()`: SECURITY DEFINER,
// scoped to `private.own_pet_ids()`, returning only the columns a customer may
// see. The TABLE policy is unchanged and still staff-only — which
// supabase/tests/customer-vaccinations.sql asserts, along with the grants.
//
// ── WHAT IS ASSERTED HERE THAT SQL CANNOT ────────────────────────────────
//
// That the ROUTE is wired to that function and scoped by the session: two
// different customers get disjoint sets, each matching their own pets, and a
// signed-out caller gets 401 rather than a list. The function takes no
// arguments, so there is no id to forge — the test that matters is that one
// customer never sees the other's, which needs two real sessions.
//
// Read-only. It creates nothing and so cleans nothing up.
// ============================================================================

interface CustomerVaccination {
  id: string;
  petId: number;
  vaccineName: string;
  expiryDate: string;
  status: string;
}

interface Me {
  id: number;
  pets?: { id: number; name: string }[];
}

test("signed out gets 401, not an empty list", async ({ request }) => {
  const res = await request.get("/api/customer/vaccinations", {
    failOnStatusCode: false,
  });
  // An empty list would read as "this pet has no certificates", which is the
  // sentence the whole feature exists to stop being wrong about.
  expect(res.status()).toBe(401);
});

test("a customer's records are their own pets', and nobody else's", async ({
  browser,
}) => {
  // Pet refs are numeric; a vaccination record's id is a uuid.
  const seen = new Map<string, { pets: number[]; records: string[] }>();

  for (const who of ["customer", "customerPawsCo"] as const) {
    const context = await browser.newContext();
    const page = await context.newPage();
    try {
      await signIn(page, ACCOUNTS[who]);

      const meRes = await page.request.get("/api/clients/me");
      expect(meRes.ok(), await meRes.text()).toBe(true);
      const me = (await meRes.json()) as Me;
      const myPets = (me.pets ?? []).map((p) => p.id);
      expect(myPets.length, `${who} has no pets to measure`).toBeGreaterThan(0);

      const res = await page.request.get("/api/customer/vaccinations");
      expect(res.status(), await res.text()).toBe(200);
      const records = (await res.json()) as CustomerVaccination[];

      // Every record belongs to one of THIS caller's pets. The function is
      // scoped by `own_pet_ids()`, so a leak here is a leak in RLS's own
      // definition of who owns what.
      for (const record of records) {
        expect(
          myPets,
          `${who} was handed a record for pet ${record.petId}, which is not theirs`,
        ).toContain(record.petId);
      }

      // The staff-internal columns must not travel, whatever the screen does
      // with them. `notes` and `review_reason` are written about the owner's
      // paperwork, for colleagues.
      for (const record of records) {
        expect(Object.keys(record)).not.toContain("notes");
        expect(Object.keys(record)).not.toContain("rejectionReason");
        expect(Object.keys(record)).not.toContain("reviewedBy");
      }

      seen.set(who, { pets: myPets, records: records.map((r) => r.id) });
    } finally {
      await context.close();
    }
  }

  const a = seen.get("customer")!;
  const b = seen.get("customerPawsCo")!;

  // Two real customers at two facilities. Their pets must not overlap, or the
  // assertion above proves nothing.
  expect(
    a.pets.filter((p) => b.pets.includes(p)),
    "the two accounts share a pet, so this test cannot tell them apart",
  ).toEqual([]);

  // And neither was handed the other's certificates.
  expect(
    a.records.filter((id) => b.records.includes(id)),
    "the same vaccination record reached two different customers",
  ).toEqual([]);
});

test("the facility's own rules are readable by its customer", async ({
  page,
}) => {
  // The other half of the fix: the REQUIRED list came from a shipped fixture
  // because `vaccination_rules` was not in customer_visible_setting_domains().
  // A customer who cannot read what their facility requires cannot be told
  // truthfully what is missing.
  await signIn(page, ACCOUNTS.customer);
  const res = await page.request.get("/api/customer/settings");
  expect(res.ok(), await res.text()).toBe(true);
  const settings = (await res.json()) as Record<
    string,
    { value: unknown; configured: boolean }
  >;

  const rules = settings.vaccination_rules;
  expect(rules, "vaccination_rules is not customer-visible").toBeTruthy();
  expect(Array.isArray(rules.value)).toBe(true);

  // Shape, not content: a rule names a vaccine, a species and whether it is
  // required, and the customer screens filter on all three. The demo facility
  // requires three of Dog and two of Cat; asserting the exact list here would
  // make a facility's own settings edit fail this spec.
  for (const rule of rules.value as Record<string, unknown>[]) {
    expect(typeof rule.vaccineName).toBe("string");
    expect(typeof rule.species).toBe("string");
    expect(typeof rule.required).toBe("boolean");
  }
});
