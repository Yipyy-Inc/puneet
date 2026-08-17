/**
 * ============================================================================
 * The eight real people Clerk left behind.
 *
 *   bun scripts/migrate-clerk-era-identities.ts            # dry run (default)
 *   bun scripts/migrate-clerk-era-identities.ts --apply    # actually migrate
 *
 * Phase 5 of the WorkOS migration recreated the seven @yipyy.dev FIXTURES. It
 * did not touch the real accounts, so `profiles` still holds Clerk-era subjects
 * (`user_3H…`) for eight addresses — two of them platform admins.
 *
 * ── WHY THEY CANNOT SIMPLY SIGN IN ────────────────────────────────────────
 *
 * `profiles_email_lower_key` allows one row per address. When one of these eight
 * signs in through WorkOS they get a NEW subject (`user_01…`), and the sync
 * webhook finds the address already claimed by the old id. It logs that and
 * returns 200 WITHOUT writing a profile — deliberately, because a retry can
 * never resolve it (see src/app/api/webhooks/workos/route.ts).
 *
 * The result is the worst-looking failure this codebase has: authentication
 * succeeds, and then RLS treats them as a stranger. `member_facility_ids()` is
 * empty, every portal gate refuses, and nothing on screen or in any log says
 * why. This script is what stops that.
 *
 * ── WHY DELETE-AND-RECREATE RATHER THAN RE-KEY ────────────────────────────
 *
 * Re-keying `profiles.id` in place is impossible, not merely awkward: every
 * foreign key into it is `ON UPDATE NO ACTION`, so Postgres refuses the UPDATE
 * while any child row references it, and the children cannot be moved first
 * because the new id does not exist yet.
 *
 * So the row is replaced. The order below never has two rows sharing an address,
 * which the unique index would refuse:
 *
 *   1. INSERT the new profile under a placeholder address
 *   2. REPOINT every child row at the new id
 *   3. DELETE the old profile (this frees the real address)
 *   4. UPDATE the new profile to the real address
 *
 * ── WHAT WOULD BE LOST BY JUST DELETING ───────────────────────────────────
 *
 * Deleting a profile is not inert. `facility_memberships` and
 * `platform_memberships` CASCADE — the grants vanish. Six other columns are
 * `ON DELETE SET NULL`, so they lose their value SILENTLY rather than erroring:
 * `clients.profile_id` (a customer's history stops pointing at their login),
 * `payment_intents.created_by`, `payment_connections.connected_by`,
 * `facility_settings.updated_by`, `facility_modules.granted_by`,
 * `communication_connections.connected_by`.
 *
 * That is real: `clover-test@yipyy.com` carries three payment_intents against a
 * LIVE Clover merchant account, and `develop@yipyy.com` owns the
 * `connected_by` of a merchant connection. This script captures all of it before
 * the delete and repoints it afterwards, so attribution survives.
 *
 * ── NO EMAIL IS SENT ──────────────────────────────────────────────────────
 *
 * The WorkOS user is created with the address already marked verified and with
 * NO password. Nobody is mailed by this script — telling eight people to reset
 * their password is a decision for a human, not a side effect of a migration.
 * Each of them sets one through the normal "forgot password" flow afterwards.
 *
 * ── WHY THE SERVICE ROLE ──────────────────────────────────────────────────
 *
 * There is no session: this runs on behalf of people who cannot sign in, which
 * is the entire problem. An RLS-bound client would be `anon` and every write
 * refused. Refuses a WorkOS production key for the same reason the e2e
 * provisioner does (tests/e2e/_workos-keys.ts).
 * ============================================================================
 */
import { createClient } from "@supabase/supabase-js";
import { WorkOS } from "@workos-inc/node";

import { applyWorkosTestKeys } from "../tests/e2e/_workos-keys";

const APPLY = process.argv.includes("--apply");
const PRODUCTION = process.argv.includes("--production");

/**
 * ── WHY THIS DOES NOT CALL applyWorkosTestKeys() WHEN --production ─────────
 *
 * That helper refuses anything but `sk_test_`, which is exactly right for the
 * e2e suite: it provisions seven accounts and must never touch production.
 * Pointing profiles at the production environment is a DIFFERENT job that
 * legitimately needs a production key, so it takes an explicit flag rather than
 * loosening the guard the suite depends on. Weakening `_workos-keys.ts` would
 * silently expose all 179 specs to production.
 *
 * The assertion is inverted here on purpose: with --production a `sk_test_` key
 * is the error, because it would mean quietly rewriting every subject to the
 * environment you were trying to migrate away from.
 */
function resolveKeys(): { apiKey: string; clientId: string } {
  if (!PRODUCTION) return applyWorkosTestKeys();

  const apiKey = process.env.WORKOS_API_KEY?.trim();
  const clientId = process.env.WORKOS_CLIENT_ID?.trim();
  if (!apiKey || !clientId) {
    throw new Error(
      "--production needs WORKOS_API_KEY and WORKOS_CLIENT_ID for the PRODUCTION environment.",
    );
  }
  if (apiKey.startsWith("sk_test_")) {
    throw new Error(
      "--production was passed but WORKOS_API_KEY is a staging key (sk_test_).",
    );
  }
  return { apiKey, clientId };
}

const keys = resolveKeys();
const workos = new WorkOS(keys.apiKey, { clientId: keys.clientId });

const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
);

/**
 * The seven e2e fixtures live at @yipyy.dev and belong to STAGING.
 *
 * One Supabase project serves both WorkOS environments, and `profiles.id` holds
 * exactly one subject — so every person exists in one environment at a time.
 * The split is: **fixtures in Staging, real people in Production.** Migrating
 * the fixtures to production would take all 179 specs and local sign-in down
 * with them, so --production skips them.
 */
const isFixture = (email: string) => email.toLowerCase().endsWith("@yipyy.dev");

/**
 * Does this subject exist in the environment we are pointing at?
 *
 * Started as a `user_3H…` prefix test for Clerk, which stopped working the
 * moment the first migration landed: a staging WorkOS subject and a production
 * one are both `user_01…` and no string test can separate them. Asking the
 * environment is the only honest check, and it makes this script work for any
 * future provider or environment move.
 */
async function existsInTarget(id: string): Promise<boolean> {
  try {
    await workos.userManagement.getUser(id);
    return true;
  } catch {
    return false;
  }
}

interface Stale {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
}

/** `full_name` is one column; WorkOS wants two. Last word is the surname. */
function splitName(full: string | null): {
  firstName?: string;
  lastName?: string;
} {
  const parts = (full ?? "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return {};
  if (parts.length === 1) return { firstName: parts[0] };
  return { firstName: parts.slice(0, -1).join(" "), lastName: parts.at(-1) };
}

async function main() {
  const { data: profiles, error } = await db
    .from("profiles")
    .select("id, email, full_name, avatar_url");
  if (error) throw error;

  // Symmetric on purpose. Without the second half, running this with no flag
  // after a production migration would drag all eight real people BACK to
  // Staging -- silently, reporting success, and taking production sign-in and
  // both platform-admin grants down with them. The invariant is the guard:
  // fixtures belong to Staging, real people belong to Production, and neither
  // invocation can touch the other's half.
  const candidates = (profiles as Stale[]).filter((p) =>
    PRODUCTION ? !isFixture(p.email) : isFixture(p.email),
  );

  const stale: Stale[] = [];
  for (const p of candidates) {
    if (!(await existsInTarget(p.id))) stale.push(p);
  }

  const target = PRODUCTION ? "PRODUCTION" : "Staging";

  if (stale.length === 0) {
    console.log(`Nothing to migrate — every profile resolves in ${target}.`);
    return;
  }

  console.log(
    `${stale.length} ${stale.length === 1 ? "identity" : "identities"} to point at ${target}` +
      `${APPLY ? "" : "  (DRY RUN — nothing will be changed)"}\n`,
  );

  for (const p of stale) {
    // Find-or-create, so a re-run after a partial failure is safe.
    const existing = (await workos.userManagement.listUsers({ email: p.email }))
      .data[0];

    const counts = await dependents(p.id);
    const summary = Object.entries(counts)
      .filter(([, n]) => n > 0)
      .map(([k, n]) => `${k}=${n}`)
      .join(" ");

    if (!APPLY) {
      console.log(
        `  ${p.email.padEnd(30)} ${p.id}\n` +
          `    workos user : ${existing ? `${existing.id} (exists, reused)` : "would be CREATED"}\n` +
          `    carries     : ${summary || "nothing"}`,
      );
      continue;
    }

    const user =
      existing ??
      (await workos.userManagement.createUser({
        email: p.email,
        emailVerified: true,
        ...splitName(p.full_name),
      }));

    const { error: rpcError } = await db.rpc("migrate_profile_subject", {
      p_old_id: p.id,
      p_new_id: user.id,
    });
    if (rpcError) throw rpcError;

    console.log(
      `  ${p.email.padEnd(30)} ${p.id} -> ${user.id}   [${summary || "no dependents"}]`,
    );
  }

  if (!APPLY) {
    console.log(
      `\nRe-run with --apply${PRODUCTION ? " --production" : ""} to perform it. ` +
        "Nothing was created or changed.\n" +
        "Note: --apply needs the migrate_profile_subject() function to exist.",
    );
  }
}

/** What a delete would take with it, per the FK rules on profiles.id. */
async function dependents(id: string) {
  const count = async (table: string, column: string) => {
    const { count: n } = await db
      .from(table)
      .select("*", { count: "exact", head: true })
      .eq(column, id);
    return n ?? 0;
  };
  return {
    facility_grants: await count("facility_memberships", "profile_id"),
    platform_grants: await count("platform_memberships", "profile_id"),
    clients: await count("clients", "profile_id"),
    payment_intents: await count("payment_intents", "created_by"),
    payment_connections: await count("payment_connections", "connected_by"),
    facility_settings: await count("facility_settings", "updated_by"),
    facility_modules: await count("facility_modules", "granted_by"),
    comm_connections: await count("communication_connections", "connected_by"),
  };
}

await main();
