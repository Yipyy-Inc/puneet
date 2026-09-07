import { describe, expect, test } from "bun:test";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

// ============================================================================
// NO INVISIBLE CHARACTER IN SOURCE.
//
// A literal BACKSPACE (U+0008) got written into a regex in
// tests/e2e/settings-french.spec.ts where `\b` was meant — the escape was
// eaten passing through a shell into `node -e`. The result:
//
//   /\x08(?:paramètres|enregistrer|…)\x08/i
//
// which can never match anything. The spec then reported that a page rendering
// perfect French was "not rendering French", and the byte is invisible in the
// editor, in `git diff` and in the terminal. It took `cat -A` to find it.
//
// It also found a byte-order mark sitting at the top of src/data/grooming.ts.
//
// ── WHAT IS DELIBERATE HERE, AND SO EXCLUDED ──────────────────────────────
//
// ESC (U+001B) appears 57 times in scripts/check-*.ts: every gate writes its
// ANSI colours as literal escapes rather than "\\x1b[31m". That is the house
// style and it is not a mistake.
//
// NUL (U+0000) appears in scripts/generate-supabase-seed.ts, which writes a
// COPY stream where the byte is the delimiter.
//
// Everything else below 0x20 that is not tab, newline or carriage return is a
// mistake, and so are the zero-width and bidi characters that arrive by paste.
// ============================================================================

const ROOTS = ["src", "tests", "scripts", "messages"];
const TEXT = /\.(?:ts|tsx|js|jsx|mjs|cjs|css|json|md|sql|ya?ml)$/;

const FORBIDDEN = new RegExp(
  [
    "[\\u0001-\\u0008]", // SOH…BACKSPACE — the one that cost an hour
    "[\\u000B\\u000C]", // vertical tab, form feed
    "[\\u000E-\\u001A]", // SO…SUB (ESC at  is the house ANSI style)
    "[\\u001C-\\u001F\\u007F]", // the separators and DEL
    "[\\u200B-\\u200D\\u2060\\uFEFF]", // zero-width, word joiner, BOM
    "[\\u202A-\\u202E]", // bidi overrides
  ].join("|"),
);

function* walk(dir: string): Generator<string> {
  for (const entry of readdirSync(dir)) {
    if (entry === "node_modules" || entry === ".next") continue;
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) yield* walk(path);
    else if (TEXT.test(entry)) yield path;
  }
}

describe("source files", () => {
  test("carry no invisible character", () => {
    const offenders: string[] = [];
    for (const root of ROOTS) {
      for (const file of walk(root)) {
        readFileSync(file, "utf8")
          .split("\n")
          .forEach((line, i) => {
            const hit = FORBIDDEN.exec(line);
            if (hit)
              offenders.push(
                `${file}:${i + 1} U+${hit[0]
                  .charCodeAt(0)
                  .toString(16)
                  .toUpperCase()
                  .padStart(4, "0")}`,
              );
          });
      }
    }
    expect(offenders).toEqual([]);
  });
});
