/**
 * ============================================================================
 * A screen may not claim something happened unless something happened.
 *
 *   bun run check:success-claims
 *
 * ── WHAT THIS EXISTS TO STOP ──────────────────────────────────────────────
 *
 * facility-onboarding-wizard.tsx shipped this, and it reached production:
 *
 *   const handleCreate = () => {
 *     setCreated(true);
 *     toast.success("Facility created — welcome email sent to the primary admin.");
 *   };
 *
 * No request. No facility, no email, and a superadmin sent to a list with
 * nothing new in it, waiting for an invitation that could never arrive. The
 * success screen behind it repeated the claim in prose.
 *
 * A mock that renders plausibly is worse than one that renders "TODO", because
 * only the second kind gets fixed. This is the cheapest possible check for the
 * shape: a file that tells the user an action SUCCEEDED, while containing
 * nothing that could perform it.
 *
 * ── IT IS A HEURISTIC, AND IT HAS AN ESCAPE HATCH ─────────────────────────
 *
 * Plenty of components legitimately report an outcome they were HANDED — a
 * success screen taking `invite` as a prop makes no request and should not.
 * Those mark the line `// success-claim-ok: <reason>`, the same shape as
 * `rls-write-ok:` and `facility-from-request-ok:` elsewhere.
 *
 * The point is not to forbid the sentence. It is to make someone say why it is
 * true.
 * ============================================================================
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const ANSI = {
  red: "[31m",
  green: "[32m",
  yellow: "[33m",
  dim: "[2m",
  bold: "[1m",
  reset: "[0m",
};

const ALLOW = /success-claim-ok:/;

/**
 * Screens that already made an empty claim when this gate was written. This is
 * a mock-driven prototype, so most are features with no backend yet — the SMS
 * that is never sent, the campaign that is never created.
 *
 * Baselined by FILE, not by line: a line number is invalidated by any edit
 * above it, and a baseline that churns is one nobody trusts.
 *
 * SHRINKING LIST. Delete an entry when the file is wired to something real, or
 * when its copy stops claiming. DO NOT ADD — a stale entry fails too, so the
 * set cannot quietly re-permit a file that was fixed.
 */
const BASELINE = new Set<string>([
  "src/app/customer/bookings/[id]/yipyygo-form/page.tsx",
  "src/app/customer/estimates/[token]/setup/page.tsx",
  "src/app/dashboard/facilities/requests/_components/facility-requests-client.tsx",
  "src/app/dashboard/support/email-templates/_components/template-panel.tsx",
  "src/app/dashboard/user-management/page.tsx",
  "src/app/facility/dashboard/clients/[id]/page.tsx",
  "src/app/facility/dashboard/gift-cards/_components/SellGiftCardModal.tsx",
  "src/app/facility/dashboard/services/training/students/_components/training-profile-quick-actions.tsx",
  "src/app/facility/dashboard/staff/_components/staff-audit-trail.tsx",
  "src/app/facility/dashboard/staff/_components/staff-form-dialog.tsx",
  "src/app/groomer/dashboard/page.tsx",
  "src/components/bookings/UnfinishedBookingsTable.tsx",
  "src/components/dashboard/facilities/AddStaffAccountModal.tsx",
  "src/components/dashboard/facilities/StaffTab.tsx",
  "src/components/estimates/EstimateWizard.tsx",
  "src/components/facility/CustomEmailDomainSettings.tsx",
  "src/components/facility/FacilityRolesStudio.tsx",
  "src/components/facility/GroomingSection.tsx",
  "src/components/facility/ImpersonationBanner.tsx",
  "src/components/facility/grooming/appointment-detail-page.tsx",
  "src/components/facility/operations/OperationsCalendarEventDrawer.tsx",
  "src/components/hq/clients/ClientsHqClient.tsx",
]);

/**
 * Past-tense claims that an action COMPLETED. Deliberately narrow: "Save" and
 * "Send invitation" are labels for something about to happen and are not
 * claims. "has been sent" is.
 */
const CLAIM =
  /(?:toast\.success\s*\(|>\s*|["'`])[^"'`\n]*\b(?:has been sent|have been sent|was sent|email sent|invitation sent|successfully (?:created|sent|saved|updated|deleted)|created\s+—|created\s+-\s)/i;

/** Anything that could actually perform the action being claimed. */
const PERFORMS =
  /\bfetch\s*\(|useMutation|\.mutate\b|\.mutateAsync\b|\.rpc\s*\(|supabase\.|"use server"|createServerClient/;

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) {
      if (entry === "node_modules" || entry === ".next") continue;
      walk(path, out);
    } else if (/\.tsx$/.test(entry)) {
      out.push(path.replace(/\\/g, "/"));
    }
  }
  return out;
}

type Offence = { file: string; line: number; text: string };

const offences: Offence[] = [];

for (const file of walk("src")) {
  const source = readFileSync(file, "utf8");

  // A file that can perform the action is not making an empty claim. This is
  // per-FILE rather than per-line on purpose: proving the claim belongs to the
  // request would need real dataflow analysis, and the cheap version already
  // catches the shape that shipped.
  if (PERFORMS.test(source)) continue;

  source.split("\n").forEach((line, index) => {
    const trimmed = line.trim();
    if (trimmed.startsWith("//") || trimmed.startsWith("*")) return;
    if (ALLOW.test(line)) return;
    if (index > 0 && ALLOW.test(source.split("\n")[index - 1] ?? "")) return;
    if (CLAIM.test(line)) {
      offences.push({ file, line: index + 1, text: trimmed.slice(0, 110) });
    }
  });
}

const offending = new Set(offences.map((o) => o.file));
const introduced = offences.filter((o) => !BASELINE.has(o.file));
const fixed = [...BASELINE].filter((f) => !offending.has(f)).sort();

console.log(
  `${ANSI.bold}Success-claim guard${ANSI.reset} ${ANSI.dim}(${offending.size} file(s) claiming, ${BASELINE.size} baselined)${ANSI.reset}\n`,
);

for (const offence of introduced) {
  console.log(`  ${ANSI.red}NEW${ANSI.reset}  ${offence.file}:${offence.line}`);
  console.log(`        ${offence.text}`);
  console.log(
    `        ${ANSI.dim}claims an action succeeded, but this file contains nothing that performs one.${ANSI.reset}`,
  );
  console.log(
    `        ${ANSI.dim}Wire it up, or — if the outcome is passed in — mark the line // success-claim-ok: <reason>.${ANSI.reset}\n`,
  );
}

if (fixed.length > 0) {
  console.log(
    `${ANSI.yellow}${fixed.length} baselined file(s) no longer claim — remove them from BASELINE in this script:${ANSI.reset}`,
  );
  for (const file of fixed) console.log(`  ${ANSI.dim}${file}${ANSI.reset}`);
  console.log();
}

if (introduced.length === 0 && fixed.length === 0) {
  console.log(
    `${ANSI.green}${ANSI.bold}✓ no NEW screen claims an action succeeded without something that could perform it${ANSI.reset}`,
  );
  process.exit(0);
}

// A stale baseline is a failure too: left alone it silently re-permits a file
// that was already fixed.
process.exit(1);
