/**
 * ============================================================================
 * A redirect must send the visitor back to the host they came from.
 *
 *   bun run check:redirect-origin
 *
 * ── THE INVARIANT ─────────────────────────────────────────────────────────
 *
 * `request.nextUrl` and `request.url` carry an origin that NEXT resolved, not
 * one the visitor ever typed. On Vercel those agreed, because Vercel's edge
 * rewrote the request so they would. Self-hosted they do not: Next resolves the
 * origin from the address the server is LISTENING on, which in a container is
 * `HOSTNAME:PORT`.
 *
 * `src/lib/request-origin.ts` is the one place that decides, via
 * `redirectUrl(request, pathname)` and `requestOrigin(request)`. Both build the
 * origin from the `host` header — the same header that decides which facility a
 * request is about — plus `x-forwarded-proto`.
 *
 * ── WHY THIS GATE EXISTS ──────────────────────────────────────────────────
 *
 * Because it already happened, on the first day the app ran anywhere but
 * Vercel, and every automated check passed while it was broken.
 *
 * `src/app/route.ts` — the front door — answered every signed-out visitor with
 *
 *     307  Location: https://0.0.0.0:3000/sign-in
 *
 * which is not a wrong host but not an address at all. It was found by a person
 * signing in, not by the suite: the checks asked the server questions and read
 * the bodies, and not one of them FOLLOWED A REDIRECT.
 *
 * The same fault sat in `src/app/auth/callback/route.ts` twice, on the social
 * sign-in path, where it had not been reached yet only because nobody had
 * pressed the Google button on that host.
 *
 * The comment above the original line explained precisely why it was safe —
 * "behind Vercel's proxy". The assumption was documented and correct, and then
 * the platform changed underneath it. That is the shape of thing a gate is for.
 *
 * ── THE ESCAPE HATCH ──────────────────────────────────────────────────────
 *
 * `new URL(request.url)` with ONE argument — reading `searchParams` — is not
 * matched here and never was: the origin is discarded, so it cannot be wrong.
 * Only a two-argument form, where `request.url` is the BASE a path is resolved
 * against, is an origin decision.
 *
 * If you genuinely need Next's own resolution, mark the line
 * `// redirect-origin-ok: <reason>`, the same shape as `link-origin-ok:`,
 * `rls-write-ok:` and `facility-from-request-ok:`. The point is not to forbid
 * it but to make it deliberate and readable in review.
 * ============================================================================
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const ANSI = {
  red: "[31m",
  green: "[32m",
  dim: "[2m",
  bold: "[1m",
  reset: "[0m",
};

const ROOT = "src/app";
const ALLOW = /redirect-origin-ok:/;

/** The one module allowed to answer this, because deciding it is its whole job. */
const DECIDER = "src/lib/request-origin.ts";

/** The module itself, which necessarily names what it replaces. */
const EXEMPT = new Set([DECIDER]);

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) walk(path, out);
    else if (entry.endsWith(".ts") || entry.endsWith(".tsx"))
      out.push(path.replace(/\\/g, "/"));
  }
  return out;
}

const PATTERNS: { re: RegExp; why: string }[] = [
  {
    // `.nextUrl.clone()` — the origin comes from Next, not from the visitor.
    re: /\.nextUrl\.clone\s*\(\s*\)/,
    why: "nextUrl carries the origin Next resolved — HOSTNAME:PORT in a container.",
  },
  {
    // TWO-argument `new URL(path, request.url)`. The one-argument form is fine.
    re: /new\s+URL\s*\([^;]*,\s*(?:request|req)\.(?:url|nextUrl)\s*[),]/,
    why: "request.url is the address this server listens on, not the one the browser used.",
  },
];

type Offence = { file: string; line: number; text: string; why: string };

function inspect(file: string): Offence[] {
  if (EXEMPT.has(file)) return [];
  const lines = readFileSync(file, "utf8").split("\n");
  const offences: Offence[] = [];

  lines.forEach((line, i) => {
    const trimmed = line.trim();
    // A comment explaining the rule is not a breach of it.
    if (trimmed.startsWith("//") || trimmed.startsWith("*")) return;

    const hit = PATTERNS.find((p) => p.re.test(line));
    if (!hit) return;

    // The marker may sit on the line or in the comment block above it — a
    // reason worth writing rarely fits on the same line.
    const marked =
      ALLOW.test(line) ||
      lines.slice(Math.max(0, i - 6), i).some((above) => ALLOW.test(above));
    if (marked) return;

    offences.push({ file, line: i + 1, text: trimmed, why: hit.why });
  });

  return offences;
}

const files = walk(ROOT).sort();
const offences = files.flatMap(inspect);

console.log(
  `${ANSI.bold}Redirect-origin guard${ANSI.reset} ${ANSI.dim}(${files.length} files in ${ROOT})${ANSI.reset}\n`,
);

if (offences.length === 0) {
  console.log(
    `${ANSI.green}${ANSI.bold}✓ no redirect is built from the server's own listen address${ANSI.reset}`,
  );
  process.exit(0);
}

for (const offence of offences) {
  console.log(`  ${ANSI.red}${offence.file}:${offence.line}${ANSI.reset}`);
  console.log(`      ${offence.text}`);
  console.log(`      ${ANSI.dim}${offence.why}${ANSI.reset}`);
  console.log(
    `      ${ANSI.dim}Use redirectUrl(request, path) from ${DECIDER}.${ANSI.reset}`,
  );
  console.log(
    `      ${ANSI.dim}Deliberate? Mark it // redirect-origin-ok: <reason>.${ANSI.reset}\n`,
  );
}

process.exit(1);
