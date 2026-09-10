/**
 * Guards against a render loop that typecheck and lint both miss.
 *
 *   bun run check:query-default-loops
 *
 * `const { data: rows = [] } = useQuery(...)` builds a NEW array on every
 * render while the query loads. If a `useEffect` lists `rows` in its
 * dependencies and sets state, the effect runs every render and the state it
 * sets causes the next one: a loop until the data lands, or until React's
 * update-depth limit throws. The occupancy board did exactly that on
 * 2026-09-11 and showed "We couldn't load your board"; only an e2e spec
 * noticed. A scan of `src/` then found six more.
 *
 * The fix is `data ?? NO_ITEMS` (src/lib/no-items.ts) — one frozen empty
 * list, the same every render.
 *
 * Narrow on purpose: a defaulted list that only feeds memos is wasteful (every
 * memo re-runs each render) but not a loop, and flagging those would bury the
 * loops under a few hundred hits. This fails only on the shape that loops.
 *
 * Exits 0 clean, 1 on a finding.
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

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.tsx?$/.test(entry)) out.push(full);
  }
  return out;
}

/** `data: name = []` destructured from a hook call. */
const DEFAULTED = /data:\s*(\w+)\s*=\s*\[\]\s*[,}][^;]*=\s*use\w*\(/g;
/** A `useEffect(() => { … }, [deps])`, body and deps captured. */
const EFFECT = /useEffect\(\s*\(\)\s*=>\s*\{([\s\S]*?)\},\s*\[([^\]]*)\]\s*\)/g;
const SETS_STATE = /\bset[A-Z]\w*\(/;

const findings: { file: string; name: string; line: number }[] = [];

for (const file of walk("src")) {
  const source = readFileSync(file, "utf8");
  const names = [...source.matchAll(DEFAULTED)].map((m) => m[1]);
  if (names.length === 0) continue;
  for (const effect of source.matchAll(EFFECT)) {
    const [, body, deps] = effect;
    if (!SETS_STATE.test(body)) continue;
    for (const name of names) {
      if (new RegExp(`\\b${name}\\b`).test(deps)) {
        const line = source.slice(0, effect.index).split("\n").length;
        findings.push({ file, name, line });
      }
    }
  }
}

console.log(`${ANSI.bold}Query-default loops${ANSI.reset}`);
if (findings.length === 0) {
  console.log(
    `${ANSI.green}${ANSI.bold}✓ no effect sets state from a query result defaulted with = []${ANSI.reset}`,
  );
  process.exit(0);
}
for (const f of findings) {
  console.log(
    `  ${ANSI.red}✗${ANSI.reset} ${f.file}:${f.line}  ${ANSI.dim}an effect depends on \`${f.name}\`, defaulted with = [] — use \`data ?? NO_ITEMS\` (src/lib/no-items.ts)${ANSI.reset}`,
  );
}
process.exit(1);
