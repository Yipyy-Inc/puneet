/**
 * ============================================================================
 * A component that seeds state from the facility's settings must wait for them.
 *
 *   bun run check:settings-seeding
 *
 * ── THE BUG THIS EXISTS FOR, THREE TIMES OVER ─────────────────────────────
 *
 * `useFacilitySettings()` returns the DOCUMENTED DEFAULTS while the request is
 * in flight, and `configured: false` alongside them. That is deliberate: a
 * booking modal cannot render half a form, so it gets a usable value
 * immediately.
 *
 * It is also a trap for any component that seeds `useState` from that value.
 * `useState` captures ONCE. If the capture happens before the row arrives, the
 * component is holding the defaults — and the moment somebody presses Save, the
 * defaults are written over whatever the facility actually had.
 *
 * A load delay becomes data loss. Silently, and only for whoever was unlucky
 * with the network.
 *
 * It happened three times in one day:
 *
 *   CallingSettingsPanel   recording, retention, missed-call SMS
 *   CallTagsSettings       the facility's whole tag vocabulary
 *   GiftCardSettingsPanel  gift card expiry, PIN threshold, wallet rules
 *
 * The third was on money the business owes, which is where this stopped being
 * worth fixing one file at a time.
 *
 * ── WHAT IT LOOKS FOR ─────────────────────────────────────────────────────
 *
 * A file that BOTH
 *
 *   1. destructures a value out of `useFacilitySettings()`, and
 *   2. passes that value (or something reached through it) to `useState(...)`
 *
 * must also mention `isPending`. It does not check HOW — a guard clause, a
 * disabled button, a skeleton — because there are several correct answers and
 * a gate that insists on one shape stops being about the bug.
 *
 * ── WHY NOT A LINT RULE ───────────────────────────────────────────────────
 *
 * ESLint sees one file at a time and this is one file at a time, so a rule
 * would work. It lives here instead because the whole `check:*` family is
 * project invariants, this is checked in CI beside them, and a custom ESLint
 * plugin is a build step nobody would remember to keep.
 * ============================================================================
 */

import { readdirSync, readFileSync, statSync } from "fs";
import { join } from "path";

const ANSI = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
};

const SRC = "src";

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      if (entry === "node_modules" || entry === ".next") continue;
      walk(full, out);
    } else if (/\.tsx$/.test(entry)) {
      out.push(full);
    }
  }
  return out;
}

/** Comments and imports blanked, newlines preserved so line numbers survive. */
function scannable(text: string): string {
  const blank = (m: string) => m.replace(/[^\n]/g, " ");
  return text
    .replace(/\/\*[\s\S]*?\*\//g, blank)
    .replace(/(^|[^:])\/\/[^\n]*/g, (m, p1) => p1 + blank(m.slice(p1.length)))
    .replace(/^import[\s\S]*?from\s+["'][^"']+["'];?/gm, blank);
}

/**
 * The identifier a file gave the settings object.
 *
 * Both shapes appear in the codebase:
 *   const { settings } = useFacilitySettings();
 *   const { settings: facility } = useFacilitySettings();
 */
function settingsIdentifiers(code: string): string[] {
  const names: string[] = [];
  const destructure = /const\s*\{([^}]*)\}\s*=\s*useFacilitySettings\s*\(/g;
  let match: RegExpExecArray | null;
  while ((match = destructure.exec(code)) !== null) {
    for (const part of match[1].split(",")) {
      const [key, alias] = part.split(":").map((s) => s.trim());
      if (key === "settings") names.push(alias || key);
    }
  }

  // ONE LEVEL OF INDIRECTION, and the gate is worthless without it.
  //
  // The first version stopped at the destructured name and reported "0 files
  // seed state from settings" — on a codebase where three had just been fixed
  // for doing exactly that. Nobody seeds from the whole object; they pull the
  // domain out first:
  //
  //   const { settings: facility, isPending } = useFacilitySettings();
  //   const settings = facility.gift_card_config.value;   <- the real source
  //   const [expiryEnabled] = useState(settings.expiryEnabled);
  //
  // So every `const x = <known name>.…` adds `x` too, repeatedly until nothing
  // new appears. A gate that passes because it looked in the wrong place is
  // worse than no gate: it is the appearance of one.
  for (let pass = 0; pass < 5; pass += 1) {
    const before = names.length;
    for (const name of [...names]) {
      const derived = new RegExp(
        `const\\s+([A-Za-z_$][\\w$]*)\\s*=\\s*${name}\\s*[.?[]`,
        "g",
      );
      let hit: RegExpExecArray | null;
      while ((hit = derived.exec(code)) !== null) {
        if (!names.includes(hit[1])) names.push(hit[1]);
      }
    }
    if (names.length === before) break;
  }

  return names;
}

interface Finding {
  file: string;
  line: number;
  snippet: string;
}

const findings: Finding[] = [];
let scanned = 0;
let seeding = 0;
let writing = 0;

for (const file of walk(SRC)) {
  const raw = readFileSync(file, "utf8");
  if (!raw.includes("useFacilitySettings")) continue;
  scanned += 1;

  const code = scannable(raw);
  const names = settingsIdentifiers(code);
  if (names.length === 0) continue;

  // `useState(` whose initializer mentions the settings identifier. Covers
  // `useState(settings.x)`, `useState(() => settings.x)` and
  // `useState(draftFrom(settings.tax_config.value))`.
  const seeds: { line: number; snippet: string }[] = [];
  const lines = code.split("\n");
  lines.forEach((text, i) => {
    if (!/useState\s*(<[^>]*>)?\s*\(/.test(text)) return;
    // The initializer can wrap onto the following lines.
    const window = lines.slice(i, i + 4).join(" ");
    if (names.some((n) => new RegExp(`\\b${n}\\b`).test(window))) {
      seeds.push({ line: i + 1, snippet: text.trim().slice(0, 90) });
    }
  });

  if (seeds.length === 0) continue;
  seeding += 1;

  // ── AND IT HAS TO WRITE BACK ────────────────────────────────────────────
  //
  // Seeding alone is survivable. The damage needs both halves: state captured
  // from the defaults, and a Save that sends that capture to the server.
  //
  // `VoicemailInbox` is the case that made this precise. It seeds the
  // scheduled greeting from `business_hours` and never saves anything — and
  // its effect lists `hours` as a dependency, so the moment the real hours
  // arrive it recomputes. Briefly showing a greeting derived from the
  // documented default is a cosmetic flicker that heals itself. Flagging it
  // would train people to add an `isPending` they do not use, which is how a
  // gate becomes a ritual.
  const writesSettings =
    /useSaveFacilitySetting|saveSetting\.mutateAsync|"\/api\/facility\/settings"/.test(
      code,
    );
  if (!writesSettings) continue;
  writing += 1;

  // The whole check: it seeds from settings AND writes them back, so it has to
  // know about loading. HOW is left open — a guard clause, a disabled button, a
  // skeleton are all correct, and a gate insisting on one shape stops being
  // about the bug.
  if (/\bisPending\b/.test(code)) continue;

  findings.push({ file, line: seeds[0].line, snippet: seeds[0].snippet });
}

console.log();
console.log(`${ANSI.bold}Settings-seeding guard${ANSI.reset}`);
console.log(
  `${ANSI.dim}  ${scanned} read facility settings · ${seeding} seed state from them · ${writing} also write them back${ANSI.reset}`,
);
console.log();

for (const finding of findings) {
  console.log(
    `  ${ANSI.red}UNGUARDED${ANSI.reset}  ${finding.file}:${finding.line}`,
  );
  console.log(`            ${ANSI.dim}${finding.snippet}${ANSI.reset}`);
}

if (findings.length === 0) {
  console.log(
    `${ANSI.green}${ANSI.bold}✓ every component seeding state from facility settings handles the load${ANSI.reset}`,
  );
  process.exit(0);
}

console.log();
console.log(
  `${ANSI.red}${ANSI.bold}✗ ${findings.length} component(s) seed state from settings without handling isPending${ANSI.reset}`,
);
console.log(
  `${ANSI.yellow}useState captures once. Seeded before the row arrives, it holds the DOCUMENTED
DEFAULTS — and the next Save writes those over the facility's real values.
Read isPending and render nothing (or disable saving) until the row lands.${ANSI.reset}`,
);
process.exit(1);
