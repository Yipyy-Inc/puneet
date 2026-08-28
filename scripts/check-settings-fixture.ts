/**
 * ============================================================================
 * A screen may not read a facility's own value out of a fixture.
 *
 *   bun run check:settings-fixture
 *
 * ── WHAT THIS EXISTS TO STOP ──────────────────────────────────────────────
 *
 * `src/data/settings.ts` held one set of values for every facility on the
 * platform, and screens imported them directly:
 *
 *   businessProfile  ->  "PawCare Facility", contact@pawcare.com,
 *                        +1 (555) 123-4567, 123 Pet Street, San Francisco
 *   businessHours    ->  open 07:00-19:00, for everyone
 *   bookingRules     ->  24h notice, 48h cancellation, 25% deposit
 *   tipConfig        ->  15/18/20%
 *   evaluationConfig ->  one evaluation price, for everybody
 *
 * Not as placeholders. There was no code path that would have shown anything
 * else, so a real business saw another business's details on its own settings
 * screen — and its customers were quoted another business's deposit.
 *
 * These now live in `facilities` and `facility_settings`. The failure this
 * guards against is the one that actually happened TWICE while converting them:
 * the provider was converted, and a module that never went through the provider
 * carried on importing the fixture. `register-hours.ts` kept a facility's cash
 * drawer demanding to be counted at 19:00; `OperationsCalendarViews.tsx` kept a
 * capacity ceiling of 50 in a module-scope const, read once at import.
 *
 * Both typechecked. Both were invisible to every test. Only a grep found them,
 * so the grep becomes a gate.
 *
 * ── HOW TO SATISFY IT ─────────────────────────────────────────────────────
 *
 * Read the facility's value instead:
 *
 *   businessProfile  ->  useFacilityProfile()  or  useSettings().profile
 *   businessHours    ->  useSettings().hours
 *   bookingRules     ->  useSettings().rules
 *   tipConfig        ->  useSettings().tipConfig
 *   daycareConfig    ->  useSettings().daycare  (and boarding/grooming/training)
 *   evaluationConfig ->  useSettings().evaluation
 *
 * Server-side, `getFacilityContext()` gives the facility and
 * `/api/facility/profile` and `/api/facility/settings` give the values.
 *
 * ── COMMENTS ARE STRIPPED FIRST, AND THAT IS NOT COSMETIC ─────────────────
 *
 * The first version of this check matched `register-hours.ts`, whose only
 * mention of `businessHours` is a comment explaining that it USED to import it.
 * A guard that flags a file for describing the bug it fixed is a guard people
 * route around. So comments come out before anything is matched, and only real
 * `import { … } from "@/data/settings"` statements are considered.
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

/** Fixture exports that a facility now owns. */
const CONVERTED = [
  "businessProfile",
  "businessHours",
  "bookingRules",
  "tipConfig",
  // What a customer may book, and what it costs. `evaluationConfig.price` was
  // setting `basePrice` on real bookings from a fixture.
  "facilityBookingFlowConfig",
  "daycareConfig",
  "boardingConfig",
  "groomingConfig",
  "trainingConfig",
  "evaluationConfig",
  "evaluationReportCardConfig",
  // Workflow and display: what staff see and how a day is shaped.
  "evaluationFormTemplate",
  "reportCardConfig",
  "serviceDateBlocks",
  "scheduleTimeOverrides",
  "dropOffPickUpOverrides",
  "notificationToggles",
  "serviceNotificationDefaults",
  "moduleAddons",
  "weatherWarningRules",
];

/**
 * The one module allowed to import them.
 *
 * `domains.ts` uses them as the DOCUMENTED DEFAULT for a facility that has not
 * configured a domain yet — the legitimate remaining role of the fixture. It
 * pairs every default with `configured: false`, so a screen can still tell
 * "what we assume" from "what they chose".
 */
const ALLOWED = new Set(["src/lib/settings/domains.ts"]);

/**
 * Files reading a converted fixture when this gate was written.
 *
 * Every one belongs to a feature with NO TABLE — estimates, report cards,
 * evaluations, reviews. Converting the facility name on a screen that cannot
 * reach real data is polish on something unreachable, so they wait for their
 * own feature rather than being churned now.
 *
 * SHRINKING LIST. Delete an entry when its file stops importing. DO NOT ADD —
 * a stale entry fails too, so this cannot quietly re-permit a fixed file.
 */
const BASELINE = new Set<string>([
  "src/app/customer/dashboard/page.tsx",
  "src/app/customer/estimates/[token]/page.tsx",
  "src/app/customer/estimates/[token]/setup/page.tsx",
  "src/app/customer/estimates/page.tsx",
  "src/components/customer/report-cards/report-card-detail.tsx",
  "src/components/customer/report-cards/report-card-share.tsx",
  "src/components/estimates/EstimatePdfDownload.tsx",
  "src/components/evaluations/EvaluationResultCard.tsx",
  "src/components/evaluations/StaffEvaluationFormModal.tsx",
  "src/components/facility/staff-hr/onboarding-invite-email.tsx",
  "src/components/marketing/ReputationMessageBuilder.tsx",
]);

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) {
      if (entry === "node_modules" || entry === ".next") continue;
      walk(path, out);
    } else if (/\.tsx?$/.test(entry)) {
      out.push(path.replace(/\\/g, "/"));
    }
  }
  return out;
}

/** Source with comments removed, so prose about the bug is not the bug. */
function stripComments(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");
}

type Offence = { file: string; symbols: string[] };

const offences: Offence[] = [];

for (const file of walk("src")) {
  if (ALLOWED.has(file)) continue;

  const source = stripComments(readFileSync(file, "utf8"));
  const symbols = new Set<string>();

  // Only genuine import statements from the fixture module. A `type` import is
  // deliberately still an offence when it names a converted VALUE, because
  // there is no type on that list — every name here is data.
  const imports = source.matchAll(
    // No `s` flag: `[^}]` already spans newlines, and the flag needs an
    // es2018 target this tsconfig does not set.
    /import\s*(?:type\s*)?\{([^}]*)\}\s*from\s*["']@\/data\/settings["']/g,
  );

  for (const match of imports) {
    for (const raw of match[1].split(",")) {
      // `tipConfig as defaultTipConfig` — the ORIGINAL name is what matters.
      const name = raw
        .trim()
        .split(/\s+as\s+/)[0]
        ?.trim();
      if (name && CONVERTED.includes(name)) symbols.add(name);
    }
  }

  if (symbols.size > 0) {
    offences.push({ file, symbols: [...symbols].sort() });
  }
}

const offending = new Set(offences.map((o) => o.file));
const introduced = offences.filter((o) => !BASELINE.has(o.file));
const fixed = [...BASELINE].filter((f) => !offending.has(f)).sort();

console.log(
  `${ANSI.bold}Settings-fixture guard${ANSI.reset} ${ANSI.dim}(${offending.size} file(s) importing, ${BASELINE.size} baselined)${ANSI.reset}\n`,
);

for (const offence of introduced) {
  console.log(`  ${ANSI.red}NEW${ANSI.reset}  ${offence.file}`);
  console.log(`        imports ${offence.symbols.join(", ")}`);
  console.log(
    `        ${ANSI.dim}that is one facility's value read from a fixture shared by every facility.${ANSI.reset}`,
  );
  console.log(
    `        ${ANSI.dim}Use useSettings() / useFacilityProfile(), or getFacilityContext() server-side.${ANSI.reset}\n`,
  );
}

if (fixed.length > 0) {
  console.log(
    `${ANSI.yellow}${fixed.length} baselined file(s) no longer import — remove them from BASELINE in this script:${ANSI.reset}`,
  );
  for (const file of fixed) console.log(`  ${ANSI.dim}${file}${ANSI.reset}`);
  console.log();
}

if (introduced.length === 0 && fixed.length === 0) {
  console.log(
    `${ANSI.green}${ANSI.bold}✓ no NEW screen reads a facility's own value from the settings fixture${ANSI.reset}`,
  );
  process.exit(0);
}

process.exit(1);
