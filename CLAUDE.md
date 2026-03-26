# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Pet services platform (Doggieville MTL / Yipyy) built with Next.js 16, React 19, and TypeScript. Currently entirely mock-driven with no backend API — all data lives in `src/data/`. See `@SPECIFICATION.md` for full product context.

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
