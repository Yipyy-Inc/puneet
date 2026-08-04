/**
 * Guards against a mutation that reports success when RLS refused it.
 *
 *   bun run check:rls-writes
 *
 * An INSERT that fails a `with check` policy raises 42501 and the route turns
 * it into a 403. An UPDATE or DELETE that fails a `using` policy does NOT
 * raise — the row is invisible to the statement, so it affects zero rows and
 * PostgREST returns success. The route then tells the caller their change
 * landed when nothing was written.
 *
 * That shipped once (a groomer got 204 for a skill-tier change RLS had
 * refused) and its cousin shipped once before that (`SELECT ... FOR UPDATE`
 * silently matching nothing). Hence a gate.
 *
 * A mutation passes if it either:
 *   - ends its chain in `.select(`, so the route can count what it touched
 *     (see `deniedIfUntouched` in src/lib/api/rls-write.ts), or
 *   - carries `// rls-write-ok: <reason>` on a line above it, for the cases
 *     where a later statement in the same request already fails loudly.
 *
 * Exits 0 clean, 1 on an unguarded, unexplained mutation.
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

const API_ROOT = join("src", "app", "api");
const MARKER = "rls-write-ok:";

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (entry.endsWith(".ts")) out.push(full);
  }
  return out;
}

interface Finding {
  file: string;
  line: number;
  kind: string;
}

/**
 * The whole chained statement a mutation belongs to.
 *
 * From the previous statement boundary (`;`, `{` or `}`) to the terminating
 * `;` — NOT from the start of the line. `.from("x")` usually sits on a line
 * ABOVE `.update(...)`, so a line-anchored slice misses it, and an earlier
 * version of this gate consequently decided only two mutations in the whole
 * API were Supabase calls and passed vacuously.
 */
function statementAround(text: string, index: number): string {
  let start = 0;
  for (const boundary of [";", "{", "}"]) {
    const at = text.lastIndexOf(boundary, index);
    if (at > start) start = at;
  }
  const end = text.indexOf(";", index);
  return text.slice(start, end === -1 ? text.length : end);
}

/**
 * The lines just above the mutation, where an exemption would be written.
 *
 * Six, not three: the marker usually sits above `const { error } = await
 * supabase`, and the `.update()` or `.delete()` can be several chained lines
 * below that. Three was too tight and silently ignored real exemptions — which
 * this gate did on its own first run.
 */
function preamble(text: string, index: number): string {
  const lineStart = text.lastIndexOf("\n", index);
  let cursor = lineStart;
  for (let i = 0; i < 6 && cursor > 0; i++) {
    cursor = text.lastIndexOf("\n", cursor - 1);
  }
  return text.slice(Math.max(cursor, 0), lineStart);
}

const findings: Finding[] = [];
let exempted = 0;
let guarded = 0;

for (const file of walk(API_ROOT)) {
  const text = readFileSync(file, "utf8");
  const pattern = /\.(update|delete)\s*\(/g;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(text)) !== null) {
    const statement = statementAround(text, match.index);
    // `.update()` is not only a Supabase verb: `createHash(...).update(text)`
    // is a hash absorbing bytes, and `staff-signatures` does exactly that.
    // A mutation worth checking always names a table.
    if (!statement.includes(".from(")) continue;
    if (statement.includes(".select(")) {
      guarded++;
      continue;
    }
    if (preamble(text, match.index).includes(MARKER)) {
      exempted++;
      continue;
    }
    findings.push({
      file: file.replace(/\\/g, "/"),
      line: text.slice(0, match.index).split("\n").length,
      kind: match[1]!,
    });
  }
}

const total = guarded + exempted + findings.length;
console.log(
  `${ANSI.bold}RLS write guard${ANSI.reset} ${ANSI.dim}(${total} mutations in ${API_ROOT})${ANSI.reset}`,
);
console.log(
  `  ${ANSI.dim}${guarded} counted rows · ${exempted} explained${ANSI.reset}`,
);

if (findings.length === 0) {
  console.log(
    `${ANSI.green}✓ every update and delete can tell a refusal from a no-op${ANSI.reset}`,
  );
  process.exit(0);
}

console.log(
  `\n${ANSI.red}✗ ${findings.length} mutation(s) cannot tell a refusal from a no-op${ANSI.reset}\n`,
);
for (const finding of findings) {
  console.log(`  ${finding.file}:${finding.line}  ${finding.kind}`);
}
console.log(
  `\n  Add ${ANSI.bold}.select("id")${ANSI.reset} and check the rows with ` +
    `${ANSI.bold}deniedIfUntouched${ANSI.reset} (src/lib/api/rls-write.ts),`,
);
console.log(
  `  or write ${ANSI.bold}// ${MARKER} <reason>${ANSI.reset} above it if a later ` +
    `statement in the same request already fails loudly.`,
);
process.exit(1);
