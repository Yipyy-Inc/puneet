/**
 * Guards against review gating coming back.
 *
 *   bun run check:no-review-gating
 *
 * Selectively showing a public review link only to clients who rated well is
 * "review gating". Google's review policies prohibit it, and the US FTC's Rule
 * on the Use of Consumer Reviews and Testimonials (16 CFR Part 465, effective
 * October 2024) prohibits suppressing negative reviews. It is not a
 * configuration choice: a facility that turns it on exposes itself and Yipyy.
 *
 * Yipyy shipped it as a switch. `ReputationSettings.feedbackRouting` offered
 * "open" | "gated", defaulted to open, and carried an amber warning next to the
 * toggle — which is the shape of a control somebody eventually turns on. It was
 * removed on 2026-08-28 along with the survey's sentiment-split branches.
 *
 * The rule that replaced it: THE RATING DECIDES WHAT HAPPENS INTERNALLY, NEVER
 * WHETHER THE PUBLIC OPTION APPEARS. A low rating opens a recovery ticket and
 * alerts a manager, and that client is still shown the public link, beside a
 * private feedback box.
 *
 * This is a static check rather than an e2e assertion on purpose. The QA
 * matrix's R-01 row reads "search the entire settings surface", which is a
 * property of the source, not of a rendered page — and it has to survive the
 * rewrite of every screen it currently applies to.
 *
 * Exits 0 clean, 1 on a reintroduction.
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

/** This file names every banned token, so it must not check itself. */
const SELF = join("scripts", "check-review-gating.ts");

const BANNED: { pattern: RegExp; why: string }[] = [
  {
    pattern: /\bfeedbackRouting\b/g,
    why: 'the "open" | "gated" setting that was removed on 2026-08-28',
  },
  {
    pattern: /["'`]gated["'`]/g,
    why: 'a routing mode named "gated"',
  },
  {
    pattern: /\bgate[A-Za-z]*(?:Public|Review)[A-Za-z]*\b/g,
    why: "a flag that gates the public review link",
  },
  {
    pattern: /\bsuppress[A-Za-z]*Public[A-Za-z]*\b/g,
    why: "suppressing the public option for some ratings",
  },
];

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (entry.endsWith(".ts") || entry.endsWith(".tsx")) out.push(full);
  }
  return out;
}

/**
 * Comments are stripped before matching, so a file explaining WHY gating is
 * gone does not trip the gate that keeps it gone. Same reasoning as
 * check-settings-fixture.
 */
function stripComments(text: string): string {
  return text
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");
}

interface Finding {
  file: string;
  line: number;
  match: string;
  why: string;
}

const findings: Finding[] = [];

for (const file of walk(ROOT)) {
  if (file === SELF) continue;
  const code = stripComments(readFileSync(file, "utf8"));

  for (const { pattern, why } of BANNED) {
    pattern.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(code)) !== null) {
      findings.push({
        file: file.replace(/\\/g, "/"),
        line: code.slice(0, match.index).split("\n").length,
        match: match[0],
        why,
      });
    }
  }
}

console.log(
  `${ANSI.bold}Review gating${ANSI.reset} ${ANSI.dim}(${ROOT}, comments stripped)${ANSI.reset}`,
);

if (findings.length === 0) {
  console.log(
    `${ANSI.green}✓ no control hides a public review link based on rating${ANSI.reset}`,
  );
  process.exit(0);
}

console.log(
  `\n${ANSI.red}✗ ${findings.length} reintroduction(s) of review gating${ANSI.reset}\n`,
);
for (const finding of findings) {
  console.log(`  ${finding.file}:${finding.line}  ${finding.match}`);
  console.log(`    ${ANSI.dim}${finding.why}${ANSI.reset}`);
}
console.log(
  `\n  The rating decides what happens ${ANSI.bold}internally${ANSI.reset} — a recovery ticket, a manager alert —`,
);
console.log(
  `  never whether the public review link appears. It always appears.`,
);
process.exit(1);
