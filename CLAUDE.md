# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Pet services platform (Yipyy) built with Next.js 16, React 19, and TypeScript.

**This is no longer a mock-only codebase.** There is a real backend — Supabase Postgres with RLS, WorkOS AuthKit for identity (ADR 0004; Clerk was removed 2026-08-17), and live Clover card payments — reached through ~98 route handlers in `src/app/api/`. Hand-authored fixtures in `src/data/` still back the screens that have not been converted, so both exist side by side.

**Before editing any screen, establish which one it reads.** A page that looks finished may be reading a fixture; a page that looks unfinished may be writing to Postgres. Assuming either way is the most expensive mistake available here.

## Commands

- **Dev:** `bun run dev` (webpack) or `bun run dev:turbo` (turbo)
- **Build:** `bun run build`
- **Lint:** `bun run lint`
- **Type check:** `bun run typecheck` (runs `tsc --noEmit`)
- **Format:** `bun run format` (Prettier)
- **Dead code:** `bun run prune` (Knip)

Always use **bun** as the package manager (not npm, yarn, or pnpm).

## Architecture

- **App Router** with React Server Components (RSC mode enabled)
- **React Compiler** enabled via babel plugin — be aware of its constraints
- **shadcn/ui** (New York style) for UI components; prefer these over custom components
- **Tailwind CSS 4** for styling; prefer `data-` attributes over conditional classes
- **next-intl** for internationalization
- **Mock data layer:** `src/data/` contains ~53 TypeScript files with mock data — no real API calls yet

## Code Style

- Use `@/*` path alias for imports (unless the file is in the same directory)
- Use conventional commits: `feat:`, `fix:`, `chore:`, `refactor:`, `docs:`, etc.
- **Commit and push straight to `main`. Do not open a pull request** unless
  explicitly asked. `main` is protected but `enforce_admins` is false, so the
  push is accepted. Decided 2026-08-19: the review round trip was costing more
  than it caught on a single-maintainer project.
  - **Run the green sequence locally BEFORE pushing** — `bun run typecheck && bun run lint && bun run format:check`, plus `bun run build` for anything
    structural. It is faster to find a broken build here than to wait for CI,
    and CI is now what stands between a push and production.
  - **The pipeline gates the deploy, since 2026-08-25.** Vercel used to deploy
    from `main` on push, so CI reported after customers had the code. Now the
    container image is built only once typecheck, lint, format, checks, sql and
    build have passed, and the deploy job SSHes to the VPS and swaps colours
    with a graceful `caddy reload` — nobody mid-request is interrupted,
    including somebody 90 seconds into tapping a card.
    **Do not infer the deploy from the push.** That lesson outlived its cause:
    on 2026-08-24 fourteen commits produced no deployment at all for six hours
    with every gate green. Confirm with `gh run list --limit 1` and
    `curl -sS -o /dev/null -w '%{http_code}' https://yipyy.com/api/health`.
    Rollback is `ssh root@<box> /opt/yipyy/rollback.sh` — one reload, under a
    second, because the previous colour is still running.
  - Touching auth, a portal gate, a permission or an identity — or bookings,
    boarding, daycare, rooms, the care log, the calendar or the roster? Run
    `bun run test:e2e:ci` locally too — the whole suite, by hand, before you
    push. CI itself runs only the 17-spec gate on a push (the authorisation
    boundary and money) and the full suite nightly, because 66 specs is ~45
    minutes and GitHub holds one pending run per branch: with two people
    pushing, every queued run was cancelled by the next push and nothing
    finished. `bun run check:doc-counts` derives both numbers from package.json
    and fails if either drifts.
    CI still runs it, but only after the deploy is live — and the e2e job is
    not one of the four required checks, so it reports rather than gates.
- Use the `DataTable` component for all tables — additions to DataTable must not break existing implementations
- Plan before coding — outline approach before implementing

## Build Performance Rules

These rules prevent the build-time regressions already present in the codebase (currently being refactored). Follow them for all new code.

### Prefer Server Components

- **Pages (`page.tsx`) should be Server Components by default.** Do not add `"use client"` to page files.
- Extract interactive parts (state, event handlers, hooks) into small, focused client components and import them into the server component page.
- Only mark a component `"use client"` when it actually uses client-only APIs (useState, useEffect, event handlers, browser APIs).

### Separate types from data

- **Never export types and mock data from the same file.** Types go in the data file or a dedicated types file; mock data goes in a separate file that imports the types.
- Use `import type { X }` when you only need the type — this is erased at compile time and adds zero bundle cost.

### Keep components small

- No single `.tsx` file should exceed ~500 lines. If it does, split it into smaller composable components.
- Large components cannot be parallelized by the bundler and slow down compilation.

### Use dynamic imports for heavy components

- Use `next/dynamic` or `React.lazy()` for components that are conditionally rendered (modals, dialogs, drawers, tabs not visible on load).
- Use `next/dynamic` for pages that import heavy libraries like `recharts` — wrap chart components so the library loads on demand.

### Import discipline

- Import icons from `lucide-react` normally (optimizePackageImports handles tree-shaking).
- Avoid barrel files (`index.ts` that re-exports everything) — import directly from the source file.
- Never use `import *` from large packages.

### Layouts must be Server Components

- Layouts (`layout.tsx`) should not have `"use client"`. Extract `usePathname`/interactive logic into a small client component (e.g., `<NavTabs />`).
- The 7 service layouts (daycare, boarding, grooming, training, retail, store, vet) share identical patterns — use the shared `ServiceModuleLayout` component instead of duplicating.

### Separate state from UI

- Extract state + handlers into custom hooks (`use-<feature>.ts`), one hook per state domain.
- Give each modal/dialog its own file — don't inline multiple modals in one component.
- Colocate route-specific components next to `page.tsx`. Share cross-route components in `src/components/<domain>/`.

### Use special files for resilience

- **`error.tsx`** — Add at each major layout boundary (`facility/dashboard/`, `customer/`, `dashboard/`), not just root. Keeps sidebar/nav interactive when a page errors.
- **`loading.tsx`** — Add skeleton screens to heavy route segments (service pages, dashboards). Server component by default, zero client JS cost. Provides instant navigation feedback.
- **`not-found.tsx`** — Add contextual 404s to dynamic routes (`[id]`, `[slug]`) when data fetching arrives.

## Data Fetching & Forms

### TanStack Query (API client)

- Use `@tanstack/react-query` for all data fetching and mutations.
- Wrap mock data in query factory functions in `src/lib/api/<domain>.ts` so swapping to real API requires changing only the `queryFn`:
  ```
  export const bookingQueries = {
    all: () => ({ queryKey: ["bookings"], queryFn: async () => bookings }),
    detail: (id: string) => ({ queryKey: ["bookings", id], queryFn: async () => ... }),
  }
  ```
- Use `useQuery(bookingQueries.all())` in components — never import mock data directly.
- Server components prefetch with `queryClient.prefetchQuery()` + `HydrationBoundary`.
- Provider lives in the root layout via a client wrapper.

### TanStack Form (static forms only)

- Use `@tanstack/react-form` with Zod validation for **static CRUD forms** (rates, shifts, settings, modals) where fields are known at compile time.
- **Do NOT use for the FormWizard/FormBuilder system.** Those are dynamic forms with runtime-defined fields (`Record<string, unknown>` answers bag) — TanStack Form's type safety doesn't apply. The existing `useState` + `evaluateLogicRules` pattern is correct for dynamic forms.
- Create shadcn adapter components for TanStack Form fields (Input, Select, Checkbox, etc.).

## File Editing

- Only modify relevant parts of files, never rewrite entire files
- Don't generate assets (SVGs, images) unless explicitly asked
- Don't create md files unless explicitly asked
- Don't build the project unless specified

## AI Operating Harness

This file remains the authoritative source for architecture, build-performance, and code-style rules. Layered on top of it is an operating harness (the task loop, docs map, and `.claude/skills/`). Read it next:

@AGENTS.md
