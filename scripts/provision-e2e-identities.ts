/**
 * ============================================================================
 * The seven e2e identities, in Clerk and in Postgres.
 *
 *   bun scripts/provision-e2e-identities.ts
 *
 * Replaces the account half of supabase/seed/dev-accounts.sql, which created
 * rows in auth.users. Clerk owns identity now (20260805223000), so a GoTrue
 * user authenticates nothing and its uuid matches no session.
 *
 * THE ROLE MAPPING IS UNCHANGED — same seven addresses, same roles, same
 * facility, same fs-dev-<role> staff rows. The 36 specs assert against those,
 * and this is a change of identity provider, not of what the fixtures mean.
 *
 * ── WHY A SCRIPT AND NOT A SEED FILE ──────────────────────────────────────
 *
 * A Clerk user id cannot be written down in advance. dev-accounts.sql could
 * pick its own uuids because it created the accounts; here Clerk mints the
 * subject and the SQL has to be told what it was. So the script creates the
 * identity first and writes the rows second, in that order, for each account.
 *
 * ── IDEMPOTENT, AND SAFE TO RE-RUN ────────────────────────────────────────
 *
 * Every step is find-or-create. Re-running against a fully provisioned project
 * changes nothing. Re-running after somebody deleted a Clerk user re-creates it
 * and re-points the profile at the new subject.
 *
 * ── WHY THE SERVICE ROLE ──────────────────────────────────────────────────
 *
 * There is no session here — this runs before anybody can sign in, which is the
 * whole point. An RLS-bound client would be `anon` and every write refused.
 * This is a development seeding tool and refuses to run against a Clerk
 * production instance (see tests/e2e/_clerk-keys.ts).
 * ============================================================================
 */
import { createClerkClient } from "@clerk/backend";
import { createClient } from "@supabase/supabase-js";

import { applyClerkTestKeys } from "../tests/e2e/_clerk-keys";

const FACILITY_ID = "a0000000-0000-4000-8000-0000000000f1"; // legacy_id '11'
const LOCATION_ID = "a0000000-0000-4000-8000-0000000000c1";

/**
 * The client record the customer account owns.
 *
 * Alice Johnson, ref 15 — named as such in boarding-occupancy.spec.ts,
 * booking-write-integrity.spec.ts and client-pet-write-path.spec.ts, which
 * assert against her bookings and pets.
 *
 * Set EXPLICITLY, because public.link_client_record() matches on address and
 * would never make this link: her `clients.email` is alice@example.com, not
 * customer@yipyy.dev. The link existed before the cutover and 20260805233000
 * nulled it along with the identity it pointed at ("1 clients profile_id ->
 * NULL" in that migration's own measurements). Without it the customer portal
 * has no records to show and every customer-facing spec reads zero rows.
 */
const CUSTOMER_CLIENT_REF = 15;

/**
 * One per portal the app exposes, so every gate can be exercised:
 *   platform admin -> /dashboard
 *   owner/manager  -> /facility/dashboard
 *   groomer        -> /groomer/dashboard
 *   caretaker      -> /employee/schedule
 *   customer       -> /customer/dashboard  (no membership, by design)
 *
 * Copied from supabase/seed/dev-accounts.sql rather than reinvented — the
 * names appear in assertions.
 */
const ACCOUNTS = [
  {
    email: "admin@yipyy.dev",
    fullName: "Platform Admin",
    isAdmin: true,
    role: null,
  },
  { email: "owner@yipyy.dev", fullName: "Dana Okafor", role: "owner" },
  { email: "manager@yipyy.dev", fullName: "Priya Raman", role: "manager" },
  { email: "groomer@yipyy.dev", fullName: "Jessica Alvarez", role: "groomer" },
  { email: "caretaker@yipyy.dev", fullName: "Marcus Bell", role: "caretaker" },
  {
    email: "reception@yipyy.dev",
    fullName: "Iris Nakamura",
    role: "reception",
  },
  { email: "customer@yipyy.dev", fullName: "Sam Whitlock", role: null },
] as const satisfies readonly {
  email: string;
  fullName: string;
  isAdmin?: boolean;
  role: string | null;
}[];

const PASSWORD = process.env.E2E_PASSWORD?.trim();
if (!PASSWORD) {
  console.error(
    "E2E_PASSWORD is not set. It lives in .env.local and is what the suite signs in with;\n" +
      "provisioning accounts with a different password would leave every spec failing at sign-in.",
  );
  process.exit(1);
}

const keys = applyClerkTestKeys();
const clerk = createClerkClient({ secretKey: keys.secretKey });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
if (!supabaseUrl || !serviceRoleKey) {
  console.error(
    "NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must both be set (see .env.local).",
  );
  process.exit(1);
}
const db = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false },
});

console.log(
  `Clerk keys from ${keys.source} (${keys.publishableKey.slice(0, 16)}…)\n`,
);

/** Find the Clerk user for an address, or create one. */
async function ensureClerkUser(
  email: string,
  fullName: string,
): Promise<string> {
  const existing = await clerk.users.getUserList({ emailAddress: [email] });
  if (existing.data.length > 0) return existing.data[0]!.id;

  const [firstName, ...rest] = fullName.split(" ");
  const created = await clerk.users.createUser({
    emailAddress: [email],
    password: PASSWORD,
    firstName,
    lastName: rest.join(" ") || "Dev",
    // The shared dev password is by definition a known one, so Clerk's breach
    // check will reject it. These are development-instance fixtures on
    // @yipyy.dev, an address nobody receives mail at.
    skipPasswordChecks: true,
  });
  return created.id;
}

/**
 * Point the profile at this Clerk subject.
 *
 * The delete-first is for `profiles_email_lower_key` (20260806160000): if a
 * PREVIOUS Clerk instance minted an id for this address, upserting on `id`
 * would be an INSERT and raise 23505 on the address. Removing the stale row
 * cascades its memberships, which is correct — they belonged to a subject that
 * can no longer sign in.
 */
async function ensureProfile(
  clerkUserId: string,
  email: string,
  fullName: string,
  isAdmin: boolean,
): Promise<void> {
  const { data: stale } = await db
    .from("profiles")
    .select("id")
    .ilike("email", email);

  for (const row of stale ?? []) {
    if (row.id !== clerkUserId) {
      console.log(`  removing stale profile ${row.id} for ${email}`);
      await db.from("profiles").delete().eq("id", row.id);
    }
  }

  const { error } = await db.from("profiles").upsert(
    {
      id: clerkUserId,
      email,
      full_name: fullName,
      is_platform_admin: isAdmin,
    } as never,
    { onConflict: "id" },
  );
  if (error) throw new Error(`profile ${email}: ${error.message}`);
}

/** The membership, and the staff row that hangs off it. */
async function ensureMembershipAndStaff(
  clerkUserId: string,
  email: string,
  fullName: string,
  role: string,
): Promise<void> {
  const { data: membership, error: membershipError } = await db
    .from("facility_memberships")
    .upsert(
      {
        profile_id: clerkUserId,
        facility_id: FACILITY_ID,
        role,
        home_location_id: LOCATION_ID,
        is_active: true,
      } as never,
      { onConflict: "profile_id,facility_id" },
    )
    .select("id")
    .single();
  if (membershipError)
    throw new Error(`membership ${email}: ${membershipError.message}`);

  // Layer 3 of the permission cascade (staff_permissions) and custom-role
  // assignments both reach the caller through staff.membership_id, so a staff
  // row that is not linked makes those layers untestable.
  const [firstName, ...rest] = fullName.split(" ");
  const { error: staffError } = await db.from("staff").upsert(
    {
      facility_id: FACILITY_ID,
      membership_id: (membership as { id: string }).id,
      legacy_id: `fs-dev-${role}`,
      first_name: firstName,
      last_name: rest.join(" ") || "Dev",
      email,
      primary_role: role,
      status: "active",
      // Invented figures for invented people. The point is only that the
      // fields are non-empty, so "you always see your OWN record in full" is
      // something a spec can observe — a groomer reading back no payroll
      // proves nothing when there was no payroll to read.
      details: {
        payroll: {
          generalServiceCommission: 10,
          hourlyRate: 21,
          tipsRate: 100,
          overrides: [],
        },
        clockIn: { requireAccessCode: true, accessCode: "9001" },
        employment: {
          hireDate: "2025-03-01",
          employmentType: "full_time",
          notes: "Dev account. Seeded HR note — manage_staff only.",
        },
      },
    } as never,
    { onConflict: "legacy_id" },
  );
  if (staffError) throw new Error(`staff ${email}: ${staffError.message}`);
}

/** Point the seeded client record at the customer identity. */
async function ensureCustomerClientLink(clerkUserId: string): Promise<void> {
  const { error } = await db
    .from("clients")
    .update({ profile_id: clerkUserId } as never)
    .eq("ref", CUSTOMER_CLIENT_REF);
  if (error) throw new Error(`client link: ${error.message}`);
}

let failed = 0;
for (const account of ACCOUNTS) {
  try {
    const clerkUserId = await ensureClerkUser(account.email, account.fullName);
    await ensureProfile(
      clerkUserId,
      account.email,
      account.fullName,
      "isAdmin" in account && account.isAdmin === true,
    );
    if (account.role) {
      await ensureMembershipAndStaff(
        clerkUserId,
        account.email,
        account.fullName,
        account.role,
      );
    }
    if (account.email === "customer@yipyy.dev") {
      await ensureCustomerClientLink(clerkUserId);
    }
    console.log(
      `  ${account.email.padEnd(22)} ${clerkUserId}  ${account.role ?? ("isAdmin" in account && account.isAdmin ? "platform admin" : "customer — no membership")}`,
    );
  } catch (error) {
    failed += 1;
    console.error(`  ${account.email.padEnd(22)} FAILED: ${String(error)}`);
  }
}

console.log(
  failed === 0
    ? `\n${ACCOUNTS.length} identities provisioned.`
    : `\n${failed} of ${ACCOUNTS.length} failed.`,
);
process.exit(failed === 0 ? 0 : 1);
