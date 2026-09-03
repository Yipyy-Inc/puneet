/**
 * Every outbound sender consults the staging suppression guard.
 *
 *   bun run check:staging-sends
 *
 * ── WHY THIS EXISTS ───────────────────────────────────────────────────────
 *
 * ADR 0007 put staging.yipyy.com in front of the PRODUCTION Postgres. That was
 * a deliberate trade — one image, and what the client approves is what ships —
 * and it has one consequence that cannot be undone by rolling anything back:
 * an email or an SMS sent from staging reaches a real customer, because the
 * address on the record is a real address.
 *
 * `outboundSendsSuppressed()` in `src/lib/deployment.ts` is what stops that,
 * and nothing in the type system requires a sender to call it. A new route that
 * does `fetch("https://api.resend.com/emails")` compiles, lints, typechecks and
 * sends — and no test would say otherwise, because the suite runs against
 * production where suppression is correctly off.
 *
 * So the guard is enforced here instead: reach a provider, consult the guard in
 * the same file.
 *
 * ── WHAT IT LOOKS FOR ─────────────────────────────────────────────────────
 *
 * A file that contains a PROVIDER REACH — Resend's endpoint, or Twilio's
 * Messages/Calls resource — must also contain `outboundSendsSuppressed`. That
 * is deliberately a whole-file rule rather than a per-call-site one: proving
 * that a particular guard dominates a particular fetch needs a control-flow
 * graph, and the coarse version has caught the thing that actually goes wrong,
 * which is a new file with no guard in it at all.
 *
 * The cost of the coarse rule is a false PASS — a file that guards one sender
 * and not a second one added later. That is a real gap and it is written down
 * rather than papered over; the debt map carries it.
 *
 * ── WHY NOT A LINT RULE ───────────────────────────────────────────────────
 *
 * ESLint would want a plugin, and this is one property expressible in twenty
 * lines of file matching. `bun run lint` also passes with 253 warnings today,
 * so a warning here would be invisible. A check script exits 1.
 *
 * Exits 0 clean, 1 when a sender does not consult the guard.
 */

import { readdirSync, readFileSync, statSync } from "fs";
import { join } from "path";

const ANSI = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  green: "\x1b[32m",
  red: "\x1b[31m",
};

const ROOT = "src";

/** This file names every pattern it bans, so it must not check itself. */
const SELF = join("scripts", "check-staging-sends.ts");

/** The guard a sender has to consult. */
const GUARD = "outboundSendsSuppressed";

/**
 * Reaching one of these IS sending, whatever the surrounding function is
 * called.
 *
 * Twilio's `Messages.json` and `Calls.json` are matched rather than the word
 * "twilio": the credentials, the account SID and the base URL all move around,
 * and the resource path is the thing that cannot change without changing what
 * is being asked of the carrier.
 */
const PROVIDER_REACH: { pattern: RegExp; what: string }[] = [
  {
    pattern: /https:\/\/api\.resend\.com\/emails/g,
    what: "sends an email through Resend",
  },
  {
    pattern: /\/Messages\.json/g,
    what: "sends an SMS through Twilio",
  },
  {
    pattern: /\/Calls\.json/g,
    what: "places a voice call through Twilio",
  },
];

/**
 * `src/lib/deployment.ts` defines the guard and mentions no provider; the
 * check script itself is excluded above. Nothing else is exempt, and an
 * exemption list is deliberately not offered — "this one is fine" is how the
 * gap gets in.
 */
function walk(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      out.push(...walk(full));
    } else if (/\.(ts|tsx)$/.test(entry)) {
      out.push(full);
    }
  }
  return out;
}

interface Finding {
  file: string;
  line: number;
  what: string;
}

const findings: Finding[] = [];
let senders = 0;

for (const file of walk(ROOT)) {
  if (file === SELF) continue;
  const source = readFileSync(file, "utf8");

  const reaches: { line: number; what: string }[] = [];
  for (const { pattern, what } of PROVIDER_REACH) {
    pattern.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(source)) !== null) {
      reaches.push({
        line: source.slice(0, match.index).split("\n").length,
        what,
      });
    }
  }

  if (reaches.length === 0) continue;
  senders += 1;

  // The guard being NAMED in the file is the whole test. Comments are not
  // stripped first, and that is on purpose here: a file that only mentions the
  // guard in a comment saying why it does not need one is a file somebody has
  // thought about, and the comment is where they said so.
  if (source.includes(GUARD)) continue;

  const first = reaches[0]!;
  findings.push({
    file: file.replace(/\\/g, "/"),
    line: first.line,
    what: first.what,
  });
}

console.log(
  `${ANSI.bold}Staging send guard${ANSI.reset} ${ANSI.dim}(${senders} sender file(s) in ${ROOT})${ANSI.reset}`,
);

if (findings.length === 0) {
  console.log(
    `${ANSI.green}✓ every file that reaches a provider consults ${GUARD}${ANSI.reset}`,
  );
  process.exit(0);
}

console.log(
  `\n${ANSI.red}✗ ${findings.length} sender(s) that would send from staging${ANSI.reset}\n`,
);
for (const finding of findings) {
  console.log(`  ${finding.file}:${finding.line}`);
  console.log(
    `    ${ANSI.dim}${finding.what}, without consulting ${GUARD}${ANSI.reset}`,
  );
}
console.log(
  `\n  staging.yipyy.com reads the ${ANSI.bold}production${ANSI.reset} database (ADR 0007), so the address`,
);
console.log(
  `  on the record is a real person's. Add, before the provider call:\n`,
);
console.log(
  `    ${ANSI.dim}import { outboundSendsSuppressed, SUPPRESSED_DETAIL } from "@/lib/deployment";`,
);
console.log(
  `    if (outboundSendsSuppressed()) return { sent: false, detail: SUPPRESSED_DETAIL };${ANSI.reset}`,
);
process.exit(1);
