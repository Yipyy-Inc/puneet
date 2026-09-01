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
 * ── WHY NAMES ARE NOT ENOUGH (added 2026-08-31) ───────────────────────────
 *
 * Every rule above matches an IDENTIFIER, and gating does not need one.
 * `report-card-rating.tsx` hid its "Share on Google" button behind
 * `stars >= reputationSettings.happyThreshold` and tripped none of them: no
 * banned name appears, only a comparison. It shipped that way from the day the
 * name-based rules were written, and this check reported clean throughout.
 *
 * So there is a second, STRUCTURAL rule: a rating compared against a threshold
 * must not be chained into the rendering of a public review link.
 *
 * It deliberately does not fire on a rating that chooses COPY. The survey's
 * `isLow ? S.escalatedTitle : S.sharedTitle` is correct and must stay legal —
 * what matters is that `<PublicButtons>` renders either way. The rule looks
 * for a comparison joined by `&&` to a public-link affordance, which is the
 * shape of a guard rather than a choice between two strings.
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

/** A rating being compared to something — the left half of a gate. */
const RATING_COMPARISON =
  /\b(?:stars|rating|ratingStars|ratingValue|score)\b\s*(?:>=|>|<=|<)\s*[^;\n]{1,80}/;

/**
 * A control that takes somebody to a public review page. If one of these is
 * reached only when the comparison above is true, that is gating.
 */
const PUBLIC_LINK_AFFORDANCE =
  /shareTarget|profile_url|profileUrl|reviewClickHref|PLATFORM_META|PLATFORM_LABELS|PublicButtons|publicReviewUrl|Share on /;

/**
 * Flags `rating >= threshold && <public link>`, across up to four lines so a
 * Prettier-wrapped JSX condition is still read as one expression. A comparison
 * with no `&&` is choosing copy, not guarding a render, and is left alone —
 * `isLow ? escalatedTitle : sharedTitle` decides wording, and the survey's
 * public buttons render either way.
 */
function structuralGating(code: string, file: string): Finding[] {
  if (!file.endsWith(".tsx")) return [];
  const lines = code.split("\n");
  const out: Finding[] = [];

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    if (!RATING_COMPARISON.test(line)) continue;
    if (!line.includes("&&")) continue;
    if (!PUBLIC_LINK_AFFORDANCE.test(lines.slice(i, i + 4).join("\n")))
      continue;

    out.push({
      file: file.replace(/\\/g, "/"),
      line: i + 1,
      match: line.trim().slice(0, 72),
      why: "a rating comparison gating the render of a public review link",
    });
  }
  return out;
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

  findings.push(...structuralGating(code, file));
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
