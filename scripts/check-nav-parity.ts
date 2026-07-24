/**
 * Guards employee-nav integrity now that BOTH sidebars render from ONE shared
 * definition — `src/lib/nav/facility-nav.ts` (NAV_SECTIONS). The employee portal
 * keeps users inside the /employee shell by mapping every facility nav url to an
 * employee-shell route (`src/lib/nav/employee-nav.ts`), each of which re-renders
 * the real facility page behind <RequirePermission>.
 *
 *   bun run check:nav-parity
 *
 * The failures this prevents:
 *   • a NAV_SECTIONS item has no employee-shell mapping → a staff member granted
 *     that feature would be sent to the /facility url and leave the shell, or
 *   • the mapping points at an /employee route that has no page.tsx → a 404.
 *
 * Because there is now a single nav definition, "parity" is no longer facility
 * vs. employee model drift; it is: every shared nav item has a working, gated
 * employee route. Exits 0 when that holds, 1 otherwise, so it can sit in CI
 * alongside check:pricing / check:settings-wiring.
 */

import { existsSync } from "fs";
import { join } from "path";
import { NAV_SECTIONS } from "@/lib/nav/facility-nav";
import { toEmployeeRoute, unmappedNavUrls } from "@/lib/nav/employee-nav";

const ANSI = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
};

const SHELL_DIR = join("src", "app", "employee", "(shell)");

/** Filesystem path of the page.tsx that serves an /employee route. */
function pagePathFor(route: string): string {
  const sub = route === "/employee" ? "" : route.slice("/employee".length);
  return join(SHELL_DIR, sub, "page.tsx");
}

const navItems = NAV_SECTIONS.flatMap((s) =>
  s.items.map((i) => ({ title: i.title, url: i.url })),
);

interface Problem {
  route: string;
  kind: "unmapped" | "missing-page";
  detail: string;
}
const problems: Problem[] = [];
const ok: string[] = [];

// 1) Every nav item must have an employee-shell mapping.
for (const url of unmappedNavUrls()) {
  problems.push({
    route: url,
    kind: "unmapped",
    detail:
      "no entry in EMPLOYEE_ROUTE_BY_FACILITY_URL — add one in " +
      "src/lib/nav/employee-nav.ts (and a wrapper under employee/(shell)/).",
  });
}

// 2) Every mapped employee route must resolve to a real page.tsx.
for (const item of navItems) {
  const employeeRoute = toEmployeeRoute(item.url);
  if (employeeRoute === item.url) continue; // unmapped — already reported above
  if (!existsSync(pagePathFor(employeeRoute))) {
    problems.push({
      route: item.url,
      kind: "missing-page",
      detail: `maps to ${employeeRoute}, but ${pagePathFor(
        employeeRoute,
      )} does not exist. Add a ~10-line wrapper (facility page + <RequirePermission>).`,
    });
    continue;
  }
  ok.push(`${item.url} → ${employeeRoute}`);
}

console.log(
  `${ANSI.bold}Nav parity · ${navItems.length} shared nav item${
    navItems.length === 1 ? "" : "s"
  }${ANSI.reset}`,
);
console.log(
  `  ${ANSI.green}${ok.length} routed to a working employee page${ANSI.reset} · ` +
    `${ANSI.red}${problems.length} problem${
      problems.length === 1 ? "" : "s"
    }${ANSI.reset}`,
);
console.log();

for (const p of problems) {
  const tag = p.kind === "unmapped" ? "UNMAPPED" : "MISSING PAGE";
  console.log(`  ${ANSI.red}${tag}${ANSI.reset}  ${p.route}`);
  console.log(`          ${ANSI.dim}${p.detail}${ANSI.reset}`);
}

console.log();
if (problems.length === 0) {
  console.log(
    `${ANSI.green}${ANSI.bold}✓ Every shared nav item has a working, gated employee route${ANSI.reset}`,
  );
  process.exit(0);
} else {
  console.log(
    `${ANSI.red}${ANSI.bold}✗ ${problems.length} nav problem${
      problems.length === 1 ? "" : "s"
    } — a shared nav item can't be reached inside the employee shell${ANSI.reset}`,
  );
  process.exit(1);
}
