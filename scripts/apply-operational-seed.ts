/**
 * Applies the facility-11 operational seed directly to Supabase.
 *
 * Run: bun run db:seed:apply
 *
 * Exists because this project has neither psql nor the Supabase CLI, so a .sql
 * file is something you can read but not run. This signs in with a real
 * account and writes through PostgREST — which means every insert passes
 * through RLS exactly as the application would, and a permission gap shows up
 * here rather than in production.
 *
 * The account must be able to manage clients, pets and bookings at the demo
 * facility; the `owner` preset grants all of it at `anytime` scope. Override
 * with SEED_EMAIL / SEED_PASSWORD.
 *
 * Idempotent: rows carry deterministic uuids and are upserted.
 */

import { createClient } from "@supabase/supabase-js";

import {
  buildSeedRows,
  reportAnomalies,
  DEMO_FACILITY_LEGACY_ID,
} from "./lib/operational-rows";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const email = process.env.SEED_EMAIL ?? "owner@yipyy.dev";
const password = process.env.SEED_PASSWORD ?? "YipyyDev!2026";

if (!url || !key) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.",
  );
  process.exit(1);
}

const supabase = createClient(url, key);

const { error: signInError } = await supabase.auth.signInWithPassword({
  email,
  password,
});
if (signInError) {
  console.error(`Could not sign in as ${email}: ${signInError.message}`);
  console.error("Run supabase/seed/dev-accounts.sql first, or set SEED_EMAIL.");
  process.exit(1);
}
console.log(`signed in as ${email}`);

// Resolve the tenant by legacy id rather than hardcoding a uuid — the same
// lookup the .sql file does.
const { data: facility, error: facilityError } = await supabase
  .from("facilities")
  .select("id, timezone")
  .eq("legacy_id", DEMO_FACILITY_LEGACY_ID)
  .single();

if (facilityError || !facility) {
  console.error(
    `Demo facility (legacy_id ${DEMO_FACILITY_LEGACY_ID}) not found. Run supabase/seed/dev-accounts.sql first.`,
  );
  process.exit(1);
}

const { data: location } = await supabase
  .from("locations")
  .select("id")
  .eq("facility_id", facility.id)
  .eq("is_primary", true)
  .maybeSingle();

const rows = buildSeedRows({
  facilityId: facility.id,
  locationId: location?.id ?? null,
  timeZone: facility.timezone,
});

/** Upsert in chunks — one 26-row request is fine, a 2,000-row one is not. */
async function upsert(
  table: string,
  values: object[],
  opts?: { onConflict?: string; ignoreDuplicates?: boolean },
) {
  const CHUNK = 50;
  for (let i = 0; i < values.length; i += CHUNK) {
    const slice = values.slice(i, i + CHUNK);
    const { error } = await supabase.from(table).upsert(slice, opts);
    if (error) {
      console.error(`\n${table} failed at row ${i}: ${error.message}`);
      if (error.details) console.error(`  ${error.details}`);
      if (error.hint) console.error(`  hint: ${error.hint}`);
      process.exit(1);
    }
  }
  console.log(`  ${table}: ${values.length}`);
}

console.log("\nwriting (through RLS, as a real signed-in user):");
// Order matters: pets reference clients, bookings reference clients, and
// booking_pets references both.
await upsert("clients", rows.clients);
await upsert("pets", rows.pets);
await upsert("bookings", rows.bookings);
// Insert-or-IGNORE, not upsert. booking_pets is a pure join table — both
// columns are the primary key, so there is nothing an update could change.
// Asking for an upsert makes PostgREST emit ON CONFLICT DO UPDATE, which needs
// an UPDATE policy this table deliberately does not have; the second run then
// fails with "violates row-level security policy (USING expression)" even
// though the rows are already correct.
await upsert("booking_pets", rows.bookingPets, {
  onConflict: "booking_id,pet_id",
  ignoreDuplicates: true,
});

reportAnomalies(rows);
if (rows.skippedBookings) {
  console.log(
    `\nskipped ${rows.skippedBookings} bookings with an unknown client`,
  );
}

console.log(
  "\nNOTE: the `ref` identity sequences still need advancing past the seeded" +
    "\nvalues, or the first row the app creates collides with a seeded one." +
    "\nRun the `sequences` section of supabase/seed/facility-11-data.sql, or:" +
    "\n  select setval(pg_get_serial_sequence('public.bookings','ref'), (select max(ref) from public.bookings));",
);

console.log("\ndone");
