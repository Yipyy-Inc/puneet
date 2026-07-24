/**
 * Guards against nav drift between the facility (admin) sidebar and the employee
 * sidebar. Both are meant to answer to ONE shared definition —
 * `src/lib/nav/operations-nav.ts` (OPERATIONS_MODULES). The employee sidebar is
 * fully DERIVED from it; the facility sidebar is validated against it here.
 *
 *   bun run check:nav-parity
 *
 * The failure this prevents: a module is added to the admin sidebar but the
 * matching permKey'd row is forgotten in the employee nav, so a staff member who
 * is granted that module can never reach it.
 *
 * For every module route in `facility-admin-sidebar.tsx`, this asserts that the
 * shared registry has an entry (matched by `facilityRoute`). That entry either:
 *   • has an `employeeRoute` → the employee nav mirrors it (verified against the
 *     derived OPERATIONS_NAV_MODEL), or
 *   • has `employeeRoute: null` → a DOCUMENTED admin-only module (allowed).
 * An admin route missing from the registry entirely is drift → exit 1.
 *
 * Exits 0 when in lockstep, 1 on drift, so it can be plugged into CI alongside
 * check:pricing / check:settings-wiring.
 */

import { readFileSync } from "fs";
import { join } from "path";
import {
  OPERATIONS_MODULES,
  OPERATIONS_NAV_MODEL,
} from "@/lib/nav/operations-nav";

const ANSI = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
};

const FACILITY_SIDEBAR = join(
  "src",
  "components",
  "layout",
  "facility-admin-sidebar.tsx",
);

// The portal home is not a module — it maps to the employee's My Workspace
// "Dashboard", not to a permission-gated Operations row.
const HOME_ROUTES = new Set(["/facility/dashboard"]);

// Every /facility/... url declared in the admin sidebar (deduped).
const source = readFileSync(FACILITY_SIDEBAR, "utf8");
const facilityRoutes = [
  ...new Set(
    [...source.matchAll(/url:\s*"(\/facility[^"]+)"/g)].map((m) => m[1]),
  ),
].filter((url) => !HOME_ROUTES.has(url));

// Registry, indexed by the admin route it represents.
const byFacilityRoute = new Map(
  OPERATIONS_MODULES.filter((m) => m.facilityRoute != null).map((m) => [
    m.facilityRoute as string,
    m,
  ]),
);

// Every employee URL actually rendered by the derived employee model.
const employeeUrls = new Set(
  OPERATIONS_NAV_MODEL.flatMap((s) => s.items.map((i) => i.url)),
);

interface Problem {
  route: string;
  kind: "unregistered" | "missing-employee-row";
  detail: string;
}
const problems: Problem[] = [];
const adminOnly: string[] = [];
const mirrored: string[] = [];

for (const route of facilityRoutes) {
  const mod = byFacilityRoute.get(route);
  if (!mod) {
    problems.push({
      route,
      kind: "unregistered",
      detail:
        "not in OPERATIONS_MODULES — add an entry with its permKey and an " +
        "employeeRoute (or employeeRoute:null if it is intentionally admin-only).",
    });
    continue;
  }
  if (mod.employeeRoute == null) {
    adminOnly.push(route);
    continue;
  }
  // The derived model must actually render the employee row for this module.
  if (!employeeUrls.has(mod.employeeRoute)) {
    problems.push({
      route,
      kind: "missing-employee-row",
      detail: `registry maps it to ${mod.employeeRoute}, but that row is absent from the derived employee nav.`,
    });
    continue;
  }
  mirrored.push(route);
}

console.log(
  `${ANSI.bold}Nav parity · ${facilityRoutes.length} facility module route${
    facilityRoutes.length === 1 ? "" : "s"
  }${ANSI.reset}`,
);
console.log(
  `  ${ANSI.green}${mirrored.length} mirrored in employee nav${ANSI.reset} · ` +
    `${ANSI.yellow}${adminOnly.length} documented admin-only${ANSI.reset} · ` +
    `${ANSI.red}${problems.length} drift${ANSI.reset}`,
);
console.log();

for (const route of adminOnly) {
  const mod = byFacilityRoute.get(route)!;
  console.log(
    `  ${ANSI.yellow}ADMIN-ONLY${ANSI.reset}  ${route} ${ANSI.dim}(${mod.id} — no employee page by design)${ANSI.reset}`,
  );
}

for (const p of problems) {
  console.log(`  ${ANSI.red}DRIFT${ANSI.reset}  ${p.route}`);
  console.log(`          ${ANSI.dim}${p.detail}${ANSI.reset}`);
}

console.log();
if (problems.length === 0) {
  console.log(
    `${ANSI.green}${ANSI.bold}✓ Facility and employee navs are in lockstep${ANSI.reset}`,
  );
  process.exit(0);
} else {
  console.log(
    `${ANSI.red}${ANSI.bold}✗ ${problems.length} nav drift${
      problems.length === 1 ? "" : "s"
    } — an admin module has no matching employee entry${ANSI.reset}`,
  );
  console.log(
    `${ANSI.yellow}Register each route in src/lib/nav/operations-nav.ts so both sidebars stay derived from one definition.${ANSI.reset}`,
  );
  process.exit(1);
}
