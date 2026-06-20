# Code style & conventions

Two sections. **(a) Detected** describes how the code is written today — match it only when editing inside an existing legacy module. **(b) Target** is the discipline for all new files. Where they conflict, **follow (b) in new files; match (a) only to stay consistent inside a file you're already editing.** The authoritative build-performance and data-fetching rules are in [CLAUDE.md](../../CLAUDE.md); this file complements, not replaces, it.

## (a) Detected conventions (as they exist today)

**Language & types**

- TypeScript `strict: true`. Path alias `@/*` for cross-directory imports; relative imports within the same directory.
- Types live in [src/types/](../../src/types/) **and** inline in many [src/data/](../../src/data/) files (types + mock data co-exported — a known deviation, see (b)).

**Files & organization**

- Feature-first grouping: route-specific components colocated near `page.tsx` (often in `_components/`); cross-route domain components under `src/components/<domain>/` (`loyalty/`, `calling/`, `hq/`, `bookings/`, `yipyygo/`, …).
- shadcn/ui primitives under `src/components/ui/` (ignored by Knip and lint-tuned — treat as vendored).
- Hooks as `use-<feature>.ts` in [src/hooks/](../../src/hooks/), one state domain each.
- Mock data: one domain per file in `src/data/`; query factories mirror them in `src/lib/api/`.

**Components & state**

- Heavy use of Client Components (168/266 pages carry `"use client"`). State + handlers often inline in the page (a pattern the target moves away from).
- Server state via TanStack Query factories; static forms via TanStack Form + Zod; dynamic forms via `useState` + `evaluateLogicRules`.
- Tables go through the shared `DataTable` component — additions must not break existing callers.

**Styling**

- Tailwind CSS 4 utility classes; prefer `data-` attributes over conditional class strings. shadcn New York variants via `class-variance-authority`. Prettier orders/canonicalizes classes (`prettier-plugin-tailwindcss` + canonical-classes); ESLint `better-tailwindcss` warns on unknown/non-canonical classes.
- Action buttons use literal `emerald-600/700` (green) and `red-600/700` for solid actions, not `bg-success`/`bg-destructive` tokens.

**Lint/format reality**

- ESLint: `unused-imports/no-unused-imports` is an **error**; unused vars are a **warning** (prefix `_` to ignore). `react-hooks/purity` and `react-hooks/set-state-in-effect` are warnings (React Compiler is on).
- `@typescript-eslint/no-unused-vars` is turned **off** (handled by `unused-imports`). There is no blanket `no-explicit-any` rule — discipline, not enforcement, keeps `any` out (see (b)).
- Prettier: `endOfLine: lf`. Run `bun run format` before committing.

**Commits**

- Conventional Commits (`feat:`, `fix:`, `chore:`, `refactor:`, `docs:` …), as seen in git history. Husky runs `typecheck` on pre-commit and pre-push.

## (b) Target conventions (for new code)

**TypeScript**

- **No new `any`**; no new `@ts-ignore` — use `@ts-expect-error` with a one-line reason. Prefer precise types and discriminated unions over casts.
- Use `import type { … }` when importing only types (erased at compile time, zero bundle cost).

**Separate types from data** (CLAUDE.md rule)

- Never export a type and its mock data from the same file. New types go in `src/types/` or a dedicated `*.types.ts`; mock data imports them.

**Server-first components** (CLAUDE.md build-perf rule)

- `page.tsx` and `layout.tsx` are **Server Components by default** — do not add `"use client"` to them. Extract interactive parts (state, effects, handlers, browser APIs) into small focused client components and import them.
- Use `next/dynamic` / `React.lazy()` for conditionally-rendered or heavy components (modals, drawers, tabs, anything importing `recharts`).

**Validation at trust boundaries**

- Validate with Zod at every boundary where untyped data enters: form input, route handler params, `localStorage`/cookies, and (when real APIs arrive) network responses. Today the boundaries that matter are the `app/api/ai/*` handlers and any user input.

**Logic out of components**

- Keep components presentational; put state + side effects in `use-<feature>.ts` hooks and pure logic in `src/lib/`. Give each modal/dialog its own file. Consume data through `src/lib/api/` factories — **not** direct `src/data/` imports.
- No new module-level mutable singletons for app state; use providers/hooks or the query cache.

**Size & structure**

- No `.tsx` file over ~500 lines — split into composable pieces. Avoid barrel `index.ts` re-export files; import from source. Never `import *` from large packages. Import icons normally from `lucide-react` (tree-shaken via `optimizePackageImports`).

**Resilience & UX states**

- Add `error.tsx` at major layout boundaries, `loading.tsx` skeletons to heavy segments, and contextual `not-found.tsx` to dynamic (`[id]`/`[slug]`/`[token]`) routes. Design empty and error states as part of the work, and keep them accessible (labels, focus, keyboard).

**Gates**

- Never weaken a gate to pass (lint rule, `strict`, a CI job, a husky hook). Propose gate changes separately. New logic should be verifiable; until a test runner exists, that means a documented manual check against the touched [critical user journey](../product/critical-user-journeys.md).
