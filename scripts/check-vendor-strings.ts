/**
 * Guards against a carrier or provider name reaching a facility's screen.
 *
 *   bun run check:vendor-strings
 *
 * Yipyy resells telephony and email. A facility owns a phone number, a ring
 * order and a voicemail greeting; it does not own a carrier account. Naming the
 * vendor to them costs three things: support load for a relationship they
 * cannot act on, self-inflicted outages from controls that look severable, and
 * a competitive tell that the product is a thin wrapper around a commodity.
 *
 * Until 2026-09-01 Settings → Integrations showed facilities cards headed
 * "Twilio SMS", "SendGrid Email" and "Twilio VOIP" — the last with a
 * placeholder number and a toggle that had no handler at all — and the Calling
 * tab toasted "Outbound call placed via Twilio." from a function that has never
 * made a network request. The comparable product in this category runs the same
 * carrier and names it exactly twice in its whole help centre, neither time in
 * the product.
 *
 * ── SCANNED BY DESTINATION, NOT BY ALLOW-LIST ─────────────────────────────
 *
 * Only facility-reachable UI is scanned. `src/lib`, `src/app/api` and
 * `src/app/dashboard` are not: server code that TALKS to the carrier must name
 * it, `provider: "twilio"` is a stored value rather than a rendered one, and
 * the platform console Yipyy staff operate shows account SIDs on purpose.
 *
 * Scanning by destination is the point. A new file under `src/app/facility` is
 * covered the day it is written, without anybody remembering to add it — the
 * failure mode an allow-list has.
 *
 * ── WHAT IS MATCHED ───────────────────────────────────────────────────────
 *
 * String literals and JSX text. Comments and imports are blanked first —
 * preserving their newlines so reported line numbers stay true to the file —
 * because a comment explaining why a name was removed must not trip the gate
 * that removed it. check-review-gating and check-settings-fixture strip
 * comments for the same reason.
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

/** Everything a facility can read renders from one of these. */
const SCANNED_ROOTS = [
  join("src", "app", "facility"),
  join("src", "app", "employee"),
  join("src", "app", "customer"),
  join("src", "components"),
  join("src", "data"),
];

/** Inside those roots, the surfaces that are not a facility's. */
const EXCLUDED = [
  // The platform console's own cards. platform-communication.spec.ts asserts
  // the auth token never leaves it.
  join("src", "components", "integrations"),
  join("src", "components", "system-admin"),
  // Fixtures behind /dashboard (platform support), not behind /facility.
  join("src", "data", "system-administration.ts"),
  join("src", "data", "system-health.ts"),
  join("src", "data", "support-voicemails.ts"),
  join("src", "data", "support-ivr.ts"),
];

const BANNED: { pattern: RegExp; why: string }[] = [
  { pattern: /\bTwilio\b/gi, why: "the voice and SMS carrier" },
  { pattern: /\bSendGrid\b/gi, why: "the email provider" },
  { pattern: /\baccountSid\b/gi, why: "a carrier credential field" },
  { pattern: /\bauthToken\b/gi, why: "a carrier credential field" },
  { pattern: /\bVOIP\b/gi, why: "plumbing vocabulary — say Phone or Calling" },
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
 * Comments and imports are replaced with spaces rather than removed, so every
 * newline survives and a reported line number points at the real line.
 */
function scannable(text: string): string {
  const blank = (match: string) => match.replace(/[^\n]/g, " ");
  return text
    .replace(/\/\*[\s\S]*?\*\//g, blank)
    .replace(/(^|[^:])\/\/[^\n]*/g, (_full, lead: string) => lead)
    .replace(/^[ \t]*import[\s\S]*?from[ \t]*["'][^"']+["'];?/gm, blank);
}

/**
 * An identifier is not copy.
 *
 * `id: "module-voip"` and `slug: "voip"` are keys the database also holds
 * (module_catalogue, seeded by 20260807540000) and that facility_modules rows
 * point at. Renaming them is a data migration, and neither is ever rendered —
 * what a facility reads is `name` and `description`. Flagging them would push
 * somebody toward either a pointless migration or a blanket exclusion for the
 * whole file, which would take the display name with it.
 */
const IDENTIFIER_KEY = /^[ \t]*(?:id|slug|key|value|href|path|icon):/;

interface Finding {
  file: string;
  line: number;
  match: string;
  why: string;
}

const files = SCANNED_ROOTS.flatMap((root) => walk(root));
const findings: Finding[] = [];

for (const file of files) {
  if (EXCLUDED.some((prefix) => file.startsWith(prefix))) continue;

  const code = scannable(readFileSync(file, "utf8"));

  for (const { pattern, why } of BANNED) {
    pattern.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(code)) !== null) {
      const before = code.slice(0, match.index);
      const line = before.split("\n").length;
      const lineText = code.split("\n")[line - 1] ?? "";
      if (IDENTIFIER_KEY.test(lineText)) continue;

      findings.push({
        file: file.replace(/\\/g, "/"),
        line,
        match: match[0],
        why,
      });
    }
  }
}

console.log(
  `${ANSI.bold}Vendor strings${ANSI.reset} ${ANSI.dim}(${files.length} facility-reachable files, comments and imports blanked)${ANSI.reset}`,
);

if (findings.length === 0) {
  console.log(
    `${ANSI.green}✓ no carrier or provider name reaches a facility screen${ANSI.reset}`,
  );
  process.exit(0);
}

console.log(
  `\n${ANSI.red}✗ ${findings.length} vendor name(s) on a facility-reachable surface${ANSI.reset}\n`,
);
for (const finding of findings) {
  console.log(`  ${finding.file}:${finding.line}  ${finding.match}`);
  console.log(`    ${ANSI.dim}${finding.why}${ANSI.reset}`);
}
console.log(
  `\n  A facility owns a number, a ring order and a greeting — not a carrier`,
);
console.log(
  `  account. Say ${ANSI.bold}Yipyy Calling${ANSI.reset}, ${ANSI.bold}Yipyy Messaging${ANSI.reset} or ${ANSI.bold}Yipyy Email${ANSI.reset}. If the`,
);
console.log(
  `  name genuinely belongs to a surface Yipyy staff operate, add the path to`,
);
console.log(`  EXCLUDED with a reason.`);
process.exit(1);
