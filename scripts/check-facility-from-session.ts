/**
 * ============================================================================
 * An API route may not take the facility from the request.
 *
 *   bun run check:facility-from-session
 *
 * ── THE INVARIANT ─────────────────────────────────────────────────────────
 *
 * Which facility a request is about comes from the SESSION — getFacilityContext()
 * resolves it from the caller's membership — or from a PARENT ROW already
 * scoped by RLS (the booking's facility, the staff row's facility). Never from
 * something the caller typed.
 *
 * Today that holds everywhere: 19 routes use getFacilityContext(), 19 derive it
 * from a parent row, and none read a facility id out of a query string or a
 * request body. This gate exists to keep it that way, because the thing that
 * would break it is invisible from any single file.
 *
 * ── WHY THIS GATE AND NOT THE OTHER ONE ───────────────────────────────────
 *
 * The obvious gate was "no `facilityId: 11` in client code" — there are 97 such
 * occurrences across 67 files. Measured, they cannot reach Postgres by any
 * path: no client sends a facility id over the wire, no route reads one, and
 * there is no browser-side Supabase client. They index mock arrays in
 * src/data/, and they die with those fixtures, domain by domain.
 *
 * So a ratchet over them would freeze a cosmetic constant while implying it was
 * load-bearing. What makes those 97 harmless is precisely the invariant above —
 * so guard the invariant. The day a route starts trusting a facility id from
 * the request, every one of those hardcoded 11s becomes live and wrong at once.
 *
 * ── THE ESCAPE HATCH ──────────────────────────────────────────────────────
 *
 * A multi-location user genuinely has no single answer, and getFacilityContext
 * takes an optional `preferFacilityId` for exactly that — honoured only when
 * the viewer is a member of it, so naming someone else's facility buys a
 * refusal rather than access.
 *
 * A route doing that marks the line `// facility-from-request-ok: <reason>`,
 * the same shape as `rls-write-ok:` in check-rls-writes. The point is not to
 * forbid it but to make it deliberate and readable in review.
 * ============================================================================
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const ANSI = {
  red: "[31m",
  green: "[32m",
  dim: "[2m",
  bold: "[1m",
  reset: "[0m",
};

const ROOT = "src/app/api";
const ALLOW = /facility-from-request-ok:/;

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) walk(path, out);
    else if (entry === "route.ts") out.push(path.replace(/\\/g, "/"));
  }
  return out;
}

type Offence = { file: string; line: number; text: string; why: string };

/** A facility id named in a query string. */
const FROM_QUERY = /\.get\(\s*["'](facilityId|facility_id)["']\s*\)/;

/** `const … = await request.json()` — the binding a body flows into. */
const BODY_BINDING =
  /(?:const|let)\s+(?:\{([^}]*)\}|(\w+))\s*(?::[^=]+)?=\s*\(?\s*await\s+\w+\.json\(\)/;

const FACILITY_KEY = /\b(facilityId|facility_id)\b/;

function inspect(file: string): Offence[] {
  const lines = readFileSync(file, "utf8").split("\n");
  const offences: Offence[] = [];

  // Identifiers holding a parsed request body. A body can be bound once and
  // read fifty lines later, so this is collected first and matched after.
  const bodyVars = new Set<string>();

  lines.forEach((line, i) => {
    const match = BODY_BINDING.exec(line);
    if (!match) return;
    const [, destructured, identifier] = match;
    if (identifier) bodyVars.add(identifier);
    if (destructured && FACILITY_KEY.test(destructured)) {
      offences.push({
        file,
        line: i + 1,
        text: line.trim(),
        why: "a facility id destructured straight off the request body",
      });
    }
  });

  lines.forEach((line, i) => {
    // A comment explaining the rule is not a breach of it — the same reason
    // check-customer-identity ignores comment lines.
    const trimmed = line.trim();
    if (trimmed.startsWith("//") || trimmed.startsWith("*")) return;
    if (ALLOW.test(line) || (i > 0 && ALLOW.test(lines[i - 1] ?? ""))) return;

    if (FROM_QUERY.test(line)) {
      offences.push({
        file,
        line: i + 1,
        text: trimmed,
        why: "a facility id read from the query string",
      });
      return;
    }

    for (const bound of bodyVars) {
      const reads = new RegExp(
        `\\b${bound}\\s*(?:\\?\\.)?(?:\\.(facilityId|facility_id)\\b|\\[\\s*["'](facilityId|facility_id)["']\\s*\\])`,
      );
      if (reads.test(line)) {
        offences.push({
          file,
          line: i + 1,
          text: trimmed,
          why: `a facility id read off the request body (\`${bound}\`)`,
        });
        return;
      }
    }
  });

  return offences;
}

const routes = walk(ROOT).sort();
const offences = routes.flatMap(inspect);

console.log(
  `${ANSI.bold}Facility-from-session guard${ANSI.reset} ${ANSI.dim}(${routes.length} routes in ${ROOT})${ANSI.reset}\n`,
);

if (offences.length === 0) {
  console.log(
    `${ANSI.green}${ANSI.bold}✓ no route takes its facility from the caller${ANSI.reset}`,
  );
  process.exit(0);
}

for (const offence of offences) {
  console.log(`  ${ANSI.red}${offence.file}:${offence.line}${ANSI.reset}`);
  console.log(`      ${offence.text}`);
  console.log(`      ${ANSI.dim}${offence.why}.${ANSI.reset}`);
  console.log(
    `      ${ANSI.dim}Use getFacilityContext(), or the parent row's facility_id.${ANSI.reset}`,
  );
  console.log(
    `      ${ANSI.dim}Deliberate? getFacilityContext(id) checks membership — mark the line // facility-from-request-ok: <reason>.${ANSI.reset}\n`,
  );
}

process.exit(1);
