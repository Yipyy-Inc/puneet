/**
 * Guards against the role editor offering a switch that decides nothing.
 *
 *   bun run check:inert-permissions
 *
 * A facility owner opening Roles & Permissions sees a list of named switches.
 * Granting one, or revoking it, is an act of administration: they believe they
 * have changed who can do what. For that belief to be true, something in the
 * system has to ASK — a `permKey` on a nav item, a `usePermission`, a `holds`
 * in a route handler, a `private.has_permission` in an RLS policy.
 *
 * 59 of the 211 distinct keys across this repo's two permission catalogues ask
 * nowhere. Toggling one saves, renders, persists to
 * `facility_role_permissions`, and changes nothing at all.
 *
 * ── WHY THIS IS A GATE AND NOT A CLEANUP ──────────────────────────────────
 *
 * Because the 59 are not one mistake, they are a slope. A key is added to the
 * catalogue when a feature is designed, and wired when the feature is built —
 * and the gap between those is where they accumulate. Nothing has ever
 * measured the gap, so it only grew.
 *
 * Deleting them is the WRONG fix for most of them. `hq_view` names a module
 * that exists; `retail_manage_inventory` names a screen that exists. Those
 * want wiring, not removal. Which of the two each one wants is a judgement per
 * key, and the point of this script is to stop the list growing while that
 * judgement is made — not to make it.
 *
 * So: today's set is frozen below. A NEW inert key fails. A key that leaves
 * the set — because somebody wired it — also fails, with an instruction to
 * delete its line, so the baseline can only ever shrink. That is the shape
 * `check:doc-counts` uses for the same reason: a number nobody derives goes
 * stale, and this one went stale silently for the whole life of the project.
 *
 * ── THE TWO CATALOGUES ────────────────────────────────────────────────────
 *
 * There are two, they overlap, and neither is the other's superset:
 *
 *   PERMISSION_GROUPS  src/types/facility-staff.ts — 168 keys, and what the
 *                      facility role editor actually renders
 *   permissionEnum     src/types/staff.ts — 62 keys, a separate zod enum with
 *                      its own labels and role defaults in role-utils.ts
 *
 * `view_billing` lives only in the second and `calling_view` only in the
 * first. Both are checked here because a switch that decides nothing is a
 * switch that decides nothing whichever list it came from.
 *
 * ── COMMENTS ARE NOT USES, AND THIS IS NOT A THEORETICAL POINT ────────────
 *
 * The first version of this audit reported `financial_manage_invoices` as
 * enforced in RLS. The hit was a `--` line in a migration explaining why it is
 * NOT enforced there. Two more keys — `calling_make_calls` and
 * `financial_view_labor_cost` — looked wired for the same reason, one from a
 * route-handler comment and one from a JSDoc block.
 *
 * So every file is comment-blanked before matching (offsets preserved, so
 * nothing shifts). A key named only in prose is a key nobody asks about.
 *
 * ── AND DECLARATIONS ARE NOT USES EITHER ──────────────────────────────────
 *
 * The catalogues, the zod enum, the fixture users' permission arrays, the
 * per-role default bundles and `supabase/seed.sql` all NAME every key by
 * construction. Counting those would make every key look wired and the script
 * would pass forever while measuring nothing.
 *
 * `role-utils.ts` is the delicate one: it is declarative above
 * `NAV_PERMISSIONS` (labels, categories, `DEFAULT_ROLE_PERMISSIONS`) and a
 * real gate from there down (the route → permission map). It is split at that
 * boundary rather than excluded, which is a correction — excluding the whole
 * file made four keys look inert that route-gate a page.
 */

import { readFileSync, readdirSync, statSync } from "fs";
import { join, sep } from "path";

const ANSI = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
};

/**
 * Files that DECLARE permissions or hand them out by role. Every key appears
 * in these by construction, so a hit here is not evidence of a gate.
 */
const DECLARATIVE = new Set([
  "src/types/facility-staff.ts",
  "src/types/staff.ts",
  "src/data/admin-users.ts",
  "src/data/facility-staff.ts",
  "src/data/staff.ts",
  "supabase/seed.sql",
]);

/**
 * Keys offered in a catalogue that nothing consults — measured 2026-09-02.
 *
 * DO NOT ADD TO THIS LIST. Adding a key to a catalogue and not wiring it is
 * the thing this file exists to stop. If you are adding a permission, wire it
 * in the same change: a `permKey` on a nav item, a `usePermission` in the
 * component, a `holds()` in the route, or a `has_permission` in the policy.
 *
 * Removing a line IS the goal, and required once a key is wired.
 *
 * Two of these went inert on 2026-09-02 when /facility/dashboard/billing was
 * removed (`view_billing`, `financial_manage_invoices`); the other 57 have
 * been inert for as long as anyone has looked, which is to say never.
 */
const BASELINE = new Set([
  // ── Personal / "own" permissions. Plausibly the least harmful group: an
  // employee's own profile and documents are reached through routes that scope
  // to the caller anyway. But the switch still says it decides.
  "view_own_documents",
  "view_training_materials",
  "view_own_profile",
  "edit_own_profile",
  "submit_availability",
  "view_own_performance",
  "view_own_writeups",
  "message_manager",

  // ── Client and booking actions.
  "export_clients",
  "reschedule_bookings",
  "manage_waitlist",

  // ── Service-module actions. The modules exist; the switches do not reach
  // them.
  "boarding_assign_kennels",
  "boarding_log_medication",
  "boarding_manage_belongings",
  "daycare_log_activity",
  "daycare_incident_report",
  "add_training_notes",
  "training_issue_certificates",
  "retail_manage_inventory",
  "retail_manage_products",
  "retail_manage_suppliers",
  "retail_view_reports",

  // ── Communication.
  "calling_make_calls",
  "calling_view_voicemail",
  "messages_manage_templates",

  // ── Money. The largest group of the ones that would matter most if granted
  // in the belief that they restrict something.
  "financial_reports",
  "view_financial_reports",
  "export_financials",
  "financial_manage_invoices",
  "financial_manage_payouts",
  "financial_view_labor_cost",
  "view_billing",

  // ── Marketing.
  "marketing_create_campaigns",
  "marketing_manage_referrals",
  "send_marketing",

  // ── Staff & facility administration.
  "manage_writeups",
  "manage_supplies",
  "manage_locations",
  "settings_data_export",

  // ── HQ. The whole multi-location group, none of it consulted.
  "hq_view",
  "hq_manage_locations",
  "hq_view_consolidated_reports",
  "hq_transfer_resources",

  // ── The SECOND catalogue (permissionEnum, src/types/staff.ts).
  //
  // Almost a parallel vocabulary for things the first catalogue also names, in
  // the singular where the other is plural: `edit_booking` beside
  // `edit_bookings`, `cancel_booking` beside `cancel_bookings`. The plural
  // ones gate real screens; these do not gate anything.
  //
  // `view_wages` is the one worth knowing about: `scheduling_view_labor_cost`
  // in the other catalogue is genuinely enforced and has a spec behind it, so
  // wages ARE protected — by a key that is not this one. Do not read this line
  // as "wages are exposed".
  "edit_booking",
  "cancel_booking",
  "override_refund_method",
  "manage_pricing",
  "view_financials",
  "view_wages",
  "view_client_lifetime_value",
  "export_reports",
  "delete_records",
  "manage_tags",
  "assign_tags",
  "manage_notes",
  "view_internal_notes",
  "delete_notes",
  "create_custom_modules",
  "edit_custom_modules",
]);

function walk(dir: string, out: string[] = []): string[] {
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return out;
  }
  for (const entry of entries) {
    if (entry === "node_modules" || entry === ".next" || entry === ".git") {
      continue;
    }
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) walk(path, out);
    else if (/\.(ts|tsx|sql)$/.test(path)) out.push(path);
  }
  return out;
}

/**
 * Blank out comments, preserving offsets so line numbers and positions do not
 * shift. Block comments cover JSX `{/* ... *\/}` too.
 */
function stripComments(source: string, isSql: boolean): string {
  const blanked = source.replace(/\/\*[\s\S]*?\*\//g, (block) =>
    block.replace(/[^\n]/g, " "),
  );
  const linePattern = isSql ? /--[^\n]*/g : /\/\/[^\n]*/g;
  return blanked.replace(linePattern, (block) => block.replace(/[^\n]/g, " "));
}

const rel = (path: string) => path.split(sep).join("/");

/** The keys the facility role editor renders. */
function catalogueKeys(): string[] {
  const source = readFileSync("src/types/facility-staff.ts", "utf8");
  const start = source.indexOf("export const PERMISSION_GROUPS");
  const end = source.indexOf("const ALL_GRANTABLE_KEYS");
  if (start < 0 || end < 0) {
    throw new Error(
      "PERMISSION_GROUPS not found in src/types/facility-staff.ts — this script reads it by name",
    );
  }
  return [...source.slice(start, end).matchAll(/\{\s*key:\s*"([a-z_]+)"/g)].map(
    (m) => m[1],
  );
}

/** The other catalogue: the zod enum in src/types/staff.ts. */
function legacyKeys(): string[] {
  const source = readFileSync("src/types/staff.ts", "utf8");
  const start = source.indexOf("permissionEnum");
  if (start < 0) {
    throw new Error(
      "permissionEnum not found in src/types/staff.ts — this script reads it by name",
    );
  }
  const body = source.slice(start, source.indexOf("]", start));
  return [...body.matchAll(/"([a-z_]+)"/g)].map((m) => m[1]);
}

const files = [
  ...walk(join("src")),
  ...walk(join("supabase")),
  ...walk(join("tests")),
];

// role-utils: declarative above NAV_PERMISSIONS, a real gate from there down.
const roleUtils = readFileSync("src/lib/role-utils.ts", "utf8");
const navStart = roleUtils.indexOf("const NAV_PERMISSIONS");
if (navStart < 0) {
  throw new Error(
    "NAV_PERMISSIONS not found in src/lib/role-utils.ts — the declarative/consumer split this script relies on is gone",
  );
}
const roleUtilsGate = stripComments(roleUtils.slice(navStart), false);

const bodies = new Map<string, string>();
for (const file of files) {
  bodies.set(
    file,
    stripComments(readFileSync(file, "utf8"), file.endsWith(".sql")),
  );
}

/** Does anything actually ask about this key? */
function isConsulted(key: string): boolean {
  const quoted = new RegExp(`["'\`]${key}["'\`]`);
  if (quoted.test(roleUtilsGate)) return true;
  for (const file of files) {
    const path = rel(file);
    if (DECLARATIVE.has(path) || path === "src/lib/role-utils.ts") continue;
    if (quoted.test(bodies.get(file)!)) return true;
  }
  return false;
}

const allKeys = [...new Set([...catalogueKeys(), ...legacyKeys()])];
const inert = allKeys.filter((key) => !isConsulted(key));

const added = inert.filter((key) => !BASELINE.has(key));
const wired = [...BASELINE].filter((key) => !inert.includes(key));

console.log(
  `${ANSI.bold}Inert permissions · ${allKeys.length} keys across two catalogues${ANSI.reset}`,
);
console.log(
  `  ${ANSI.dim}${allKeys.length - inert.length} consulted somewhere · ${inert.length} decide nothing${ANSI.reset}\n`,
);

if (added.length === 0 && wired.length === 0) {
  console.log(
    `${ANSI.green}${ANSI.bold}✓ every permission switch either decides something or is a known one that doesn't${ANSI.reset}`,
  );
  process.exit(0);
}

for (const key of added) {
  console.log(
    `  ${ANSI.red}DECIDES NOTHING${ANSI.reset}  ${key}\n` +
      `          ${ANSI.dim}offered in the role editor, consulted by no permKey, usePermission, holds() or RLS policy.${ANSI.reset}\n` +
      `          ${ANSI.dim}Wire it in this change, or leave it out of the catalogue until the feature lands.${ANSI.reset}`,
  );
}

for (const key of wired) {
  console.log(
    `  ${ANSI.yellow}NOW WIRED${ANSI.reset}        ${key}\n` +
      `          ${ANSI.dim}good — delete its line from BASELINE in scripts/check-inert-permissions.ts.${ANSI.reset}`,
  );
}

console.log("");
if (added.length) {
  console.log(
    `${ANSI.red}${ANSI.bold}✗ ${added.length} permission switch(es) that decide nothing${ANSI.reset}`,
  );
}
if (wired.length) {
  console.log(
    `${ANSI.yellow}${ANSI.bold}✗ ${wired.length} baselined key(s) are wired now — shrink the baseline${ANSI.reset}`,
  );
}
process.exit(1);
