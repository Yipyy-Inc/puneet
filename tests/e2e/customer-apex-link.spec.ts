import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

import { ACCOUNTS, signIn } from "./_auth";

// ============================================================================
// A CUSTOMER SIGNED IN AT THE APEX FINDS THEIR OWN RECORD.
//
// ── THE BUG THIS MEASURES ─────────────────────────────────────────────────
//
// `/api/clients/me` healed a null `clients.profile_id` by calling
// `link_client_record(slug)` — and `proxy.ts` stamps an EMPTY slug on the
// apex. So the heal ran on `<facility>.yipyy.com` and never on `yipyy.com`.
//
// A customer whose record the facility had already created was told
// `{ linked: false }` forever, which surfaced as three unrelated-looking
// complaints from the client on 2026-09-21: the portal shows no pets, booking
// says "no pet added", and "Add a pet" posts `clientId: undefined` and is
// refused 422 "A pet needs an owner". One missing link, three symptoms.
//
// Measured that day: client ref 855 at doggieville-mtl carried
// `singhparminder360@gmail.com` and a dog, `profile_id` was null, and a
// profile with that exact address had zero linked client rows. The row was
// STILL unclaimed after the client had tried, which is what proves the heal
// never ran rather than having run and failed.
//
// ── WHY IT BUILDS ITS OWN ROW ─────────────────────────────────────────────
//
// The heal matches the caller's PROFILE email against `clients.email`, and no
// seeded customer satisfies that: `customer@yipyy.dev` signs in against a
// client row addressed `alice@example.com`. Unlinking a seeded customer would
// therefore prove nothing AND risk leaving them unlinked for every other spec.
//
// So this makes a record of its own, addressed to a staff identity that holds
// no client record anywhere (`caretaker@yipyy.dev` — staff can be customers
// too, and the route does not care which they are), and deletes it afterwards.
//
// ── THE AMBIGUITY RULE IS ASSERTED IN SQL ─────────────────────────────────
//
// `supabase/tests/apex-client-link.sql` covers "two unclaimed rows claim
// nothing", the grants, and that a claimed row is never taken from its owner.
// What needs a browser is only that the ROUTE reaches the function at all when
// no facility is named — which is the half that was missing.
// ============================================================================

const MARKER = "[e2e apex-link]";
const E2E_FACILITY_SLUG = "yipyy-demo-facility";

function admin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  // Not a skip: a spec that quietly does nothing is the failure mode the
  // whole suite exists to avoid.
  expect(url, "NEXT_PUBLIC_SUPABASE_URL must be set").toBeTruthy();
  expect(key, "SUPABASE_SERVICE_ROLE_KEY must be set").toBeTruthy();
  return createClient(url!, key!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

let clientId = "";
let clientRef = 0;

test.describe.configure({ mode: "serial" });

test.beforeAll(async () => {
  const db = admin();

  const { data: facility } = await db
    .from("facilities")
    .select("id")
    .eq("slug", E2E_FACILITY_SLUG)
    .maybeSingle();
  expect(facility, `no facility ${E2E_FACILITY_SLUG}`).toBeTruthy();

  // Unclaimed, and addressed to the identity that will sign in. This is the
  // state a facility leaves behind when it adds a customer who has not yet
  // created an account — the ordinary case, not a contrived one.
  const { data: created, error } = await db
    .from("clients")
    .insert({
      facility_id: (facility as { id: string }).id,
      name: `${MARKER} Apex Person`,
      email: ACCOUNTS.caretaker,
      profile_id: null,
    })
    .select("id, ref")
    .single();
  expect(error, error?.message).toBeNull();
  clientId = (created as { id: string }).id;
  clientRef = (created as { ref: number }).ref;
});

test.afterAll(async () => {
  if (!clientId) return;
  const db = admin();
  // Pets first if any got attached; then the row itself. A leftover client
  // addressed to a staff identity would make every later run ambiguous, and
  // an ambiguous match claims NOTHING — so this cleanup is what keeps the
  // spec repeatable.
  await db.from("pets").delete().eq("client_id", clientId);
  const { error } = await db.from("clients").delete().eq("id", clientId);
  console.log(
    `cleanup: client ${clientRef} ${error ? `NOT removed — ${error.message}` : "removed"}`,
  );
});

test("the apex claims the record a facility already made for them", async ({
  page,
}) => {
  // Before: the row exists and belongs to nobody.
  const db = admin();
  const { data: before } = await db
    .from("clients")
    .select("profile_id")
    .eq("id", clientId)
    .single();
  expect(
    (before as { profile_id: string | null }).profile_id,
    "the row was already claimed, so this proves nothing",
  ).toBeNull();

  await signIn(page, ACCOUNTS.caretaker);

  // No Host header, so `x-facility-slug` is empty — the apex. This is the
  // exact request that used to answer 404 { linked: false }.
  const res = await page.request.get("/api/clients/me");
  expect(res.status(), await res.text()).toBe(200);
  const me = (await res.json()) as { id: number };
  expect(me.id, "the apex did not resolve their own record").toBe(clientRef);

  // And the claim is real, not just a read that happened to work.
  const { data: after } = await db
    .from("clients")
    .select("profile_id")
    .eq("id", clientId)
    .single();
  expect(
    (after as { profile_id: string | null }).profile_id,
    "the record was returned but never claimed",
  ).toBeTruthy();
});

test("and asking twice does not claim a second record", async ({ page }) => {
  await signIn(page, ACCOUNTS.caretaker);
  const res = await page.request.get("/api/clients/me");
  expect(res.status()).toBe(200);
  expect(((await res.json()) as { id: number }).id).toBe(clientRef);

  // The function returns the existing link before it looks for a match, so a
  // second call must not go shopping for another row.
  const db = admin();
  const { data: mine } = await db
    .from("clients")
    .select("ref")
    .eq("email", ACCOUNTS.caretaker);
  expect(
    (mine ?? []).length,
    "a second record appeared for the same person",
  ).toBe(1);
});
