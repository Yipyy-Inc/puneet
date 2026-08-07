/**
 * ============================================================================
 * A link we send somebody may not come from the caller's browser.
 *
 *   bun run check:link-origin
 *
 * ── THE INVARIANT ─────────────────────────────────────────────────────────
 *
 * An address that ends up in an EMAIL is a property of the recipient and of
 * what the message is about — a facility's own host for its owner and staff,
 * Yipyy's apex for the platform team. It is never a property of whichever host
 * the person who pressed the button happened to be looking at.
 *
 * `src/lib/public-origin.ts` is the one place that decides, via
 * `facilityOrigin(slug, request)` and `platformOrigin(request)`.
 *
 * ── WHY THIS GATE EXISTS ──────────────────────────────────────────────────
 *
 * Because it already happened, in production, and it did not fail loudly.
 *
 * A superadmin with a Pawradise tab open created Doggieville Mtl. Its owner
 * was emailed `https://pawradise.yipyy.com/sign-up` and asked to create an
 * account at a business she had never heard of. The invitation still WORKED —
 * access is tied to the email address, not the host — so there was no error,
 * no bounce and no alert. Only a person confused by the one message that hands
 * somebody their company.
 *
 * When the report came in, the same defect was live in three more emails: the
 * staff invitation, the platform-admin invitation and the MFA setup notice.
 * One bug in four places is not four mistakes, it is a missing decision — so
 * the decision now has a home, and this keeps it there.
 *
 * ── THE ESCAPE HATCH ──────────────────────────────────────────────────────
 *
 * A server calling its OWN api needs the host actually serving the request,
 * and that is not a link anyone reads. Mark the line
 * `// link-origin-ok: <reason>`, the same shape as `rls-write-ok:` and
 * `facility-from-request-ok:`. The point is not to forbid it but to make it
 * deliberate and readable in review.
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
const ALLOW = /link-origin-ok:/;

/** The one module allowed to ask, because deciding this is its whole job. */
const DECIDER = "src/lib/public-origin.ts";

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) walk(path, out);
    else if (entry === "route.ts") out.push(path.replace(/\\/g, "/"));
  }
  return out;
}

/** `request.headers.get("origin")` in any of its spellings. */
const FROM_REQUEST = /\.headers\.get\(\s*["']origin["']\s*\)/i;

type Offence = { file: string; line: number; text: string };

function inspect(file: string): Offence[] {
  const lines = readFileSync(file, "utf8").split("\n");
  const offences: Offence[] = [];

  lines.forEach((line, i) => {
    const trimmed = line.trim();
    // A comment explaining the rule is not a breach of it.
    if (trimmed.startsWith("//") || trimmed.startsWith("*")) return;
    if (!FROM_REQUEST.test(line)) return;

    // The marker may sit on the line or in the comment block above it — a
    // reason worth writing rarely fits on the same line.
    const marked =
      ALLOW.test(line) ||
      lines.slice(Math.max(0, i - 6), i).some((above) => ALLOW.test(above));
    if (marked) return;

    offences.push({ file, line: i + 1, text: trimmed });
  });

  return offences;
}

const routes = walk(ROOT).sort();
const offences = routes.flatMap(inspect);

console.log(
  `${ANSI.bold}Link-origin guard${ANSI.reset} ${ANSI.dim}(${routes.length} routes in ${ROOT})${ANSI.reset}\n`,
);

if (offences.length === 0) {
  console.log(
    `${ANSI.green}${ANSI.bold}✓ no route builds a link from the caller's own host${ANSI.reset}`,
  );
  process.exit(0);
}

for (const offence of offences) {
  console.log(`  ${ANSI.red}${offence.file}:${offence.line}${ANSI.reset}`);
  console.log(`      ${offence.text}`);
  console.log(
    `      ${ANSI.dim}This is the host the CALLER was on, not the recipient's.${ANSI.reset}`,
  );
  console.log(
    `      ${ANSI.dim}Use facilityOrigin(slug, request) or platformOrigin(request) from ${DECIDER}.${ANSI.reset}`,
  );
  console.log(
    `      ${ANSI.dim}Calling our own API rather than emailing a link? Mark it // link-origin-ok: <reason>.${ANSI.reset}\n`,
  );
}

process.exit(1);
