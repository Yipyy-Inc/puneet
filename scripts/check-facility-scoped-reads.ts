/**
 * ============================================================================
 * A facility-portal LIST may not rely on RLS alone to pick its facility.
 *
 *   bun run check:facility-scoped-reads
 *
 * ── WHAT WENT WRONG ────────────────────────────────────────────────────────
 *
 * RLS answers "which rows may this person read". For someone in ONE facility
 * that is also "which facility is this screen about", so a GET handler that
 * filtered on nothing else looked correct — and 41 of them did exactly that.
 *
 * It stops being the same question the moment a person belongs to two
 * facilities, and it was never the same question for a platform admin: every
 * read policy opens with `private.is_platform_admin() or …`. Measured
 * 2026-09-10 on the client's own account — owner of a real facility and of a
 * demo one, and a platform superadmin — `GET /api/clients` returned every
 * facility's clients, merged, under whichever facility's name the header
 * showed. So did bookings, pets, payments, rooms, staff and 35 more.
 *
 * ── THE RULE ───────────────────────────────────────────────────────────────
 *
 * A GET handler under src/app/api that reads a table must say which facility
 * it means, in the handler: `.match(inFacility(scope))` with
 * `scope = await activeFacilityIdForStaff()`, an explicit `facility_id`
 * filter, or a `p_facility_id` argument. `activeFacilityIdForStaff()` is null
 * for a customer, so a route both portals share keeps reading a customer's
 * own rows through RLS exactly as before.
 *
 * Exempt, because the question has another answer there:
 *  - a route with a dynamic segment (`[id]`, `[ref]`, `[token]`): it reads the
 *    row it names, and RLS decides whether the caller may;
 *  - the handful below, each with its reason.
 * ============================================================================
 */
import { readFileSync } from "node:fs";
import { execSync } from "node:child_process";

const EXEMPT: Record<string, string> = {
  "admin/merchant-applications":
    "platform admin console — every facility's applications, by design",
  "admin/team": "the platform team, not a facility",
  "auth/passkey": "the caller's own passkeys",
  "clients/me": "a customer's own client rows",
  "merchant-application/documents":
    "scoped by the application, itself resolved from the facility",
  "payments/clover/platform": "the platform's own Clover connection",
  "platform/communication": "platform-level connections",
  "staff-onboarding/my-agreements": "the signed-in employee's own records",
};

const SCOPED =
  /inFacility\(|\.eq\("facility_id"|facility_id:|p_facility_id|facility\.facilityId|context\.facilityId|facilityId\)/;

const files = execSync('git ls-files "src/app/api/**/route.ts"')
  .toString()
  .trim()
  .split("\n");

const failures: string[] = [];
const staleExemptions = new Set(Object.keys(EXEMPT));

for (const file of files) {
  const route = file.replace("src/app/api/", "").replace("/route.ts", "");
  if (/\[[^\]]+\]/.test(route)) continue;

  const source = readFileSync(file, "utf8");
  const start = source.indexOf("export async function GET");
  if (start < 0) continue;
  const next = source.indexOf("\nexport async function", start + 10);
  const body = source.slice(start, next < 0 ? undefined : next);

  const tables = [...body.matchAll(/\.from\("([a-z_]+)"\)/g)].map((m) => m[1]);
  if (tables.length === 0) continue;

  if (route in EXEMPT) {
    staleExemptions.delete(route);
    continue;
  }
  if (!SCOPED.test(body)) {
    failures.push(
      `  ${file}\n    reads ${[...new Set(tables)].join(", ")} with no facility filter`,
    );
  }
}

if (staleExemptions.size > 0) {
  console.error(
    `✗ exempt routes that no longer exist or no longer read a table:\n${[...staleExemptions].map((r) => `  ${r}`).join("\n")}\n  Remove them from EXEMPT in scripts/check-facility-scoped-reads.ts.`,
  );
  process.exit(1);
}

if (failures.length > 0) {
  console.error(
    `✗ ${failures.length} GET handler(s) rely on RLS alone to choose the facility:\n${failures.join("\n")}\n\n` +
      `Scope the query: const scope = await activeFacilityIdForStaff(); … .match(inFacility(scope))\n` +
      `(both from @/lib/api/facility-context). A customer gets null and reads through RLS as before.`,
  );
  process.exit(1);
}

console.log("✓ every facility-portal list names its facility");
