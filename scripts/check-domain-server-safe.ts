/**
 * ============================================================================
 * A settings domain is SERVER code, and may not reach a client-only module.
 *
 *   bun run check:domain-server-safe
 *
 * ── WHAT THIS EXISTS TO STOP ──────────────────────────────────────────────
 *
 * `src/lib/settings/domains.ts` is imported by `src/app/api/facility/settings/
 * route.ts`, which validates every settings write against the registered Zod
 * schema. So everything that registry reaches runs on the server.
 *
 * On 2026-09-06 the `tag_note_settings` domain took its fallback from the
 * fixture that already held it:
 *
 *   import { defaultTagNoteSettings } from "@/data/tags-notes";
 *
 * That typechecked, linted, and broke the build:
 *
 *   Error [DataCloneError]: Attempted to call ALL_FACILITY_ROLES() from the
 *   server but ALL_FACILITY_ROLES is on the client
 *   Failed to collect page data for /api/facility/settings
 *
 * `@/data/tags-notes` imports `@/lib/role-utils` for its role lists, and
 * role-utils is `"use client"`. TWO hops — which is why a rule of thumb about
 * not importing fixtures would not have caught it, and why this walks the graph
 * instead of checking direct imports.
 *
 * ── WHAT IT DOES NOT CLAIM ────────────────────────────────────────────────
 *
 * A `"use client"` file is the only marker it can see. A module that is
 * client-only for some other reason — touching `window` at module scope, say —
 * passes this and still breaks. The build remains the real gate; this one turns
 * the most common instance of it into a two-second failure with a path in it.
 * ============================================================================
 */
import { existsSync, readFileSync } from "node:fs";

const ANSI = {
  red: "[31m",
  green: "[32m",
  dim: "[2m",
  bold: "[1m",
  reset: "[0m",
};

const ENTRY = "src/lib/settings/domains.ts";
const IMPORTS = /(?:from\s+|import\s*\()["']([^"']+)["']/g;

/** Resolve an `@/` or relative specifier to a file on disk, or null. */
function resolveSpec(spec: string, from: string): string | null {
  let base: string;
  if (spec.startsWith("@/")) base = "src/" + spec.slice(2);
  else if (spec.startsWith(".")) {
    const dir = from.slice(0, from.lastIndexOf("/"));
    const parts = (dir + "/" + spec).split("/");
    const out: string[] = [];
    for (const part of parts) {
      if (part === "." || part === "") continue;
      if (part === "..") out.pop();
      else out.push(part);
    }
    base = out.join("/");
  } else return null;

  for (const ext of [".ts", ".tsx", "/index.ts", "/index.tsx"]) {
    if (existsSync(base + ext)) return base + ext;
  }
  return existsSync(base) ? base : null;
}

const isClientOnly = (file: string) =>
  /^\s*["']use client["']/.test(readFileSync(file, "utf8"));

/** Depth-first, remembering the path so a failure says how it got there. */
const seen = new Set<string>();
const offences: string[][] = [];

function walk(file: string, path: string[]): void {
  if (seen.has(file)) return;
  seen.add(file);

  if (path.length > 0 && isClientOnly(file)) {
    offences.push([...path, file]);
    return; // its own imports are the client's problem, not this graph's
  }

  const source = readFileSync(file, "utf8");
  for (const match of source.matchAll(IMPORTS)) {
    // `import type` is erased before it reaches a runtime, so a type-only edge
    // cannot drag a client module into the server bundle.
    const line = source.slice(
      source.lastIndexOf("\n", match.index) + 1,
      match.index,
    );
    if (/^\s*import\s+type\b/.test(line)) continue;

    const target = resolveSpec(match[1], file);
    if (target) walk(target, [...path, file]);
  }
}

walk(ENTRY, []);

console.log(
  `${ANSI.bold}Settings domains are server-safe${ANSI.reset} ${ANSI.dim}(${seen.size} modules reachable from ${ENTRY})${ANSI.reset}\n`,
);

if (offences.length > 0) {
  for (const path of offences) {
    console.log(`  ${ANSI.red}CLIENT-ONLY${ANSI.reset}  ${path.at(-1)}`);
    console.log(`      ${ANSI.dim}${path.join("\n        → ")}${ANSI.reset}`);
  }
  console.log(
    `\n${ANSI.red}${ANSI.bold}✗ a settings domain reaches a "use client" module${ANSI.reset}`,
  );
  console.log(
    `${ANSI.dim}The settings API route imports this registry to validate writes, so\n` +
      `everything it reaches runs on the server. Give the domain its own value\n` +
      `rather than importing one from a module that is client-only.${ANSI.reset}`,
  );
  process.exit(1);
}

console.log(
  `${ANSI.green}${ANSI.bold}✓ no settings domain reaches a client-only module${ANSI.reset}`,
);
