#!/usr/bin/env bun
/**
 * A `useMemo` that CALLS a translator but does not DEPEND on it.
 *
 * ── THE DEFECT, MEASURED 2026-09-09 ──────────────────────────────────────
 *
 * Every text hook in this repo returns English until hydration:
 *
 *     const effective: AppLocale = hydrated ? locale : "en";
 *
 * That is deliberate — the locale lives in a cookie the client reads, so
 * rendering French on the server and English on the client is a hydration
 * mismatch on every label at once.
 *
 * It also means the translator is a DIFFERENT FUNCTION before and after
 * hydration. A memo that calls it without listing it runs once, inside that
 * English window, and never re-runs. The words freeze.
 *
 * `staff/documents/page.tsx` did exactly this:
 *
 *     roleLabel: staff ? roleLabel(staff.primaryRole) : t("roleFallback"),
 *     …
 *     }, [filtered]);
 *
 * Every role on that screen read "Boarding attendant" while the rest of the
 * page was French.
 *
 * ── WHY A GATE AND NOT A NOTE ────────────────────────────────────────────
 *
 * `check:ui-french` cannot see it. There is no English literal in the file —
 * the English arrives at RUNTIME, through a stale closure, and a scanner
 * reading JSX text is looking at the wrong thing entirely. It was found by
 * looking at a screenshot, which does not scale to 22 remaining files.
 *
 * The React Compiler is on, and does not save this: it memoises what it can
 * prove, and an explicit `useMemo` with an explicit dependency array is a
 * promise the compiler keeps rather than an assumption it revisits.
 *
 * ── WHAT IT LOOKS FOR ────────────────────────────────────────────────────
 *
 * A `useMemo(` or `useMemo<T>(` whose body calls one of the known translator
 * identifiers, and whose dependency array does not mention it. `useCallback`
 * is included for the same reason. Anything else — a plain function, an
 * effect — is out of scope, because only a memo can serve a stale value.
 */

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const ANSI = {
  reset: "[0m",
  bold: "[1m",
  dim: "[2m",
  red: "[31m",
  green: "[32m",
};

/**
 * The names a translated value arrives under.
 *
 * Deliberately the destructured names rather than the hooks: what freezes is
 * the FUNCTION, and the function is what a memo closes over. `t` and `fill`
 * come from `useStaffText`, `useSettingsText`, `useUiText`, `useNavText` and
 * `useShellText`; the rest are the label hooks built on top of them.
 */
const TRANSLATORS = [
  "t",
  "fill",
  "roleLabel",
  "typeLabel",
  "docTypeLabel",
  "serviceLabel",
  "permissionText",
  "label",
];

const BASELINE = 0;

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    if (entry === "node_modules" || entry === ".next" || entry === ".git")
      continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.tsx?$/.test(entry)) out.push(full);
  }
  return out;
}

type Finding = { file: string; line: number; deps: string; used: string[] };

const findings: Finding[] = [];

for (const file of walk("src")) {
  const source = readFileSync(file, "utf8");
  if (!/use(Memo|Callback)\s*[<(]/.test(source)) continue;

  const lines = source.split("\n");
  for (let i = 0; i < lines.length; i++) {
    if (!/\buse(Memo|Callback)\s*[<(]/.test(lines[i])) continue;

    // ── FIND THE MATCHING CLOSE BY COUNTING, NOT BY SHAPE ──────────────
    //
    // The first version looked for a line matching `}, [ … ])`, which only
    // exists on a BLOCK-bodied memo. An expression-bodied one —
    // `useMemo(() => rows.filter(…), [mix])` — never matches, so the window
    // ran on into the NEXT memo and reported its dependency array against
    // this memo's line number. Two of the gate's first three findings were
    // that, and a gate that misattributes is worse than no gate: it sends
    // somebody to read the wrong function.
    //
    // Counting parens from the hook's own opening one is the only thing that
    // is right for both shapes.
    const open = lines[i].indexOf("(", lines[i].search(/\buse(Memo|Callback)/));
    if (open === -1) continue;

    let depth = 0;
    let body = "";
    let depIndex = -1;
    let endCol = -1;
    outer: for (let j = i; j < Math.min(i + 300, lines.length); j++) {
      const from = j === i ? open : 0;
      const text = lines[j];
      for (let c = from; c < text.length; c++) {
        if (text[c] === "(") depth++;
        else if (text[c] === ")") {
          depth--;
          if (depth === 0) {
            depIndex = j;
            endCol = c;
            break outer;
          }
        }
      }
      body += text.slice(from) + "\n";
    }
    if (depIndex === -1) continue;
    body += lines[depIndex].slice(depIndex === i ? open : 0, endCol) + "\n";

    // The dependency array is the last bracketed group before that close.
    const tail = body.slice(body.lastIndexOf("["));
    const depMatch = /^\[([\s\S]*?)\]/.exec(tail);
    if (!depMatch) continue;
    const depLine = depMatch[1].replace(/\s+/g, " ").trim();

    const used = TRANSLATORS.filter((name) => {
      // A CALL of the identifier, not a mention of it — `t(` but not `t.foo`
      // and not `format(t)`. The leading class excludes `.t(`, `at(`, `let(`.
      const call = new RegExp(`(^|[^\\w.$])${name}\\s*\\(`, "m");
      if (!call.test(body)) return false;
      // Already DEFINED inside the memo? Then it is not closed over.
      //
      // Three shapes, and the third is why this list is not just `const`:
      // `use-staff-text.ts` returns `{ t, fill }` from its own memo, so `fill`
      // appears as an object PROPERTY — `fill: (key, values) => …` — which is
      // a definition, not a captured value. Reporting it would have been the
      // gate accusing the very hook it exists to protect.
      const defined = new RegExp(
        `(const|let|function)\\s+${name}\\b` + // const t = …
          `|\\b${name}\\s*[:=]\\s*(\\(|async|function)` + // t: (…) => …
          `|\\b${name}\\s*=>`, // t => …
      );
      return !defined.test(body);
    });
    if (used.length === 0) continue;

    const missing = used.filter(
      (name) => !new RegExp(`(^|[^\\w.$])${name}([^\\w]|$)`).test(depLine),
    );
    if (missing.length > 0) {
      findings.push({
        file,
        line: i + 1,
        deps: depLine,
        used: missing,
      });
    }
    i = depIndex;
  }
}

console.log(
  `${ANSI.bold}Frozen translators${ANSI.reset} ${ANSI.dim}(${findings.length} memo(s) closing over a translator they do not depend on, baseline ${BASELINE})${ANSI.reset}\n`,
);

for (const f of findings) {
  console.log(
    `  ${ANSI.red}✗${ANSI.reset} ${f.file}:${f.line}  ${ANSI.dim}calls ${f.used.join(", ")} · deps [${f.deps}]${ANSI.reset}`,
  );
}

if (findings.length > BASELINE) {
  console.log(
    `\n${ANSI.red}${ANSI.bold}✗ a memo will serve the pre-hydration English forever${ANSI.reset}`,
  );
  console.log(
    `${ANSI.dim}  Add the translator to the dependency array. It is a new function after hydration, so the memo must re-run.${ANSI.reset}`,
  );
  process.exit(1);
}

console.log(
  `${ANSI.green}${ANSI.bold}✓ no memo is holding a stale translator${ANSI.reset}`,
);
