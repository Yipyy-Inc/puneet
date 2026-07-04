# AGENTS.md

The entry point for every AI session in this repo. Read this first, then the specific doc the task needs (see **Docs map**). It is intentionally thin: the detailed architecture, build-performance, and code-style rules live in [CLAUDE.md](CLAUDE.md) — this file does not restate them, it tells you how to work.

## What this repository is

**Yipyy** — a pet-services platform (booking, daycare, boarding, grooming, training, retail, loyalty, calling, reputation, gift cards, multi-location HQ) built on **Next.js 16.1**, **React 19.2**, **TypeScript 5.9** (strict), Tailwind CSS 4, shadcn/ui (New York), next-intl (en/fr).

It is a **mock-driven prototype, not a legacy or production system.** There is no backend: all data lives as typed mock objects in [src/data/](src/data/) (~135 files), increasingly wrapped by a TanStack Query factory layer in [src/lib/api/](src/lib/api/). The codebase is new and large (266 routes). The operating model here is **discipline while building fast**, not "evolve a legacy system" — but the principle is the same: new code follows the target conventions; existing code is left alone unless the task is about it.

## The loop

Every task follows: **Ground → Plan → Implement → Verify → Encode.**

1. **Ground** — Read the relevant doc below and the neighboring code before writing anything. Inventory what exists (components, hooks, `src/lib/api/` factories, `src/data/` shapes) and reuse it — never recreate. **Confirm the target component is actually wired in before editing it** — a file that typechecks can still be dead code (a superseded duplicate). When a task names a component (especially a settings section), grep its host page for the import first; if it's absent, find what the section really renders and edit that. For settings: `grep -n "<Component>" src/app/facility/dashboard/settings/page.tsx` — no match means it's likely dead (e.g. the old `RolesPermissionsSettings.tsx` vs the live `FacilityRolesStudio.tsx`, 2026-07). The gate `bun run check:settings-wiring` fails on any orphaned `*Settings.tsx`; `bun run prune` (Knip) also flags files imported nowhere.
2. **Plan** — For anything beyond a trivial fix, state a short plan first (CLAUDE.md: "Plan before coding").
3. **Implement** — Small steps, keep the build green. New code follows [docs/conventions/code-style.md](docs/conventions/code-style.md) §(b).
4. **Verify** — Run the green sequence below and prove the change works (for UI, run the app and look at the touched journey). Never claim done without evidence.
5. **Encode** — If a mistake could repeat, write the fix into a doc, a lint rule, or [docs/quality/debt-map.md](docs/quality/debt-map.md) in the same change. Use the `encode-lesson` skill.

## Commands

There is **no test runner** in this project. "Green" = the CI gates plus a manual look at the UI.

| Command                         | Purpose                                                                    |
| ------------------------------- | -------------------------------------------------------------------------- |
| `bun run dev`                   | Dev server (webpack); `bun run dev:turbo` for turbo                        |
| `bun run typecheck`             | `tsc --noEmit` — the primary gate (also runs on pre-commit & pre-push)     |
| `bun run lint`                  | ESLint (cached); `bun run lint:fix` to autofix                             |
| `bun run format:check`          | Prettier check; `bun run format` to write                                  |
| `bun run build`                 | `next build` — full production build (CI runs this)                        |
| `bun run prune`                 | Knip — dead-code / unused-export report                                    |
| `bun run check:pricing`         | Project-specific pricing-consistency script                                |
| `bun run check:settings-wiring` | Fails if a `*Settings.tsx` component is imported nowhere (dead-code guard) |

**The green sequence (run before claiming done):** `bun run typecheck && bun run lint && bun run format:check`, then for UI changes `bun run dev` and visually confirm the touched [critical user journey](docs/product/critical-user-journeys.md). Run `bun run build` for anything structural (routing, layouts, server/client boundaries). Use **bun** only — never npm/yarn/pnpm.

## Docs map

| Read this                                                                        | For tasks about                                                                                            |
| -------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| [CLAUDE.md](CLAUDE.md)                                                           | Architecture, build-performance rules, data-fetching/forms patterns, code style — the authoritative manual |
| [docs/architecture/overview.md](docs/architecture/overview.md)                   | How the system fits together; where routes/components/logic/state/data live; known deviations              |
| [docs/conventions/code-style.md](docs/conventions/code-style.md)                 | Detected conventions vs. target conventions for new code                                                   |
| [docs/quality/debt-map.md](docs/quality/debt-map.md)                             | Known landmines, fragile areas, risk zones — read before touching them                                     |
| [docs/product/overview.md](docs/product/overview.md)                             | What the product does and for whom                                                                         |
| [docs/product/prd.md](docs/product/prd.md)                                       | Reverse-engineered product intent, scope, open questions                                                   |
| [docs/product/critical-user-journeys.md](docs/product/critical-user-journeys.md) | Flows that must not break; verify the touched one before claiming done                                     |
| [docs/architecture/decisions/](docs/architecture/decisions/)                     | Why architectural choices were made (ADRs)                                                                 |

## Architecture as it is

App Router with RSC enabled and the React Compiler on (babel plugin). Three+ portals under [src/app/](src/app/): `customer/` (pet owners), `facility/` (business admin + `hq/` multi-location), `dashboard/` (platform super-admin), plus `employee/`, `groomer/`, `staff/`, and public token routes (`book/`, `review/`, `forms/`). UI in [src/components/](src/components/) (shadcn primitives under `components/ui/`), hooks in [src/hooks/](src/hooks/), shared logic in [src/lib/](src/lib/), API/query factories in [src/lib/api/](src/lib/api/), mock data in [src/data/](src/data/), types in [src/types/](src/types/), i18n in [src/i18n/](src/i18n/) + [messages/](messages/). Real Anthropic calls live in [src/app/api/ai/](src/app/api/ai/) (the only non-mock surface). Full detail and deviations: [docs/architecture/overview.md](docs/architecture/overview.md).

## Rules for new code

(Full discipline in [docs/conventions/code-style.md](docs/conventions/code-style.md) §(b); the non-negotiables:)

- New code follows the conventions doc; **existing code is left alone unless the task is about it.** Extend existing patterns before inventing new ones; inventory first, reuse, never recreate.
- **TypeScript:** no new `any`, no new `@ts-ignore` (use `@ts-expect-error` with a reason) — even though older code has them.
- Follow the CLAUDE.md build-performance rules for all new code: Server Components by default for pages, types separated from mock data, components under ~500 lines, dynamic imports for heavy/conditional components, consume data via `src/lib/api/` factories (not direct `src/data/` imports).
- **Conventional Commits** for every commit (`feat:`, `fix:`, `chore:`, `refactor:`, `docs:` …).
- **Never weaken a gate** (a lint rule, the tsconfig `strict` flag, a CI step, a husky hook) to make work pass. Propose gate changes explicitly and separately.
- There is no test harness; until one exists, **manual verification against the touched journey is mandatory** and substitutes for "tests pass." If you add a test runner, that is its own change with its own ADR.
- Boy-scout cleanup is **opt-in** — only refactor adjacent legacy code when explicitly asked.

## Legacy / risk zones — handle with care

See [docs/quality/debt-map.md](docs/quality/debt-map.md) for the full map. The headline zones: the `DataTable` component (shared by many tables — additions must not break existing callers), the 168 `"use client"` pages and co-mingled type+data files (mid-refactor toward the CLAUDE.md rules — match the target in new files, don't mass-convert in passing), the FormWizard/FormBuilder dynamic-form system (uses `useState` + `evaluateLogicRules` deliberately — do **not** port it to TanStack Form), and the committed debug artifacts at the repo root (don't depend on them).

## When unsure

Stop after **two failed attempts** at the same fix and ask one concrete question instead of pushing a hack through. If a doc conflicts with the code, the doc may be stale — flag it and propose the doc fix in the same change. If a referenced file is missing (e.g. CLAUDE.md cites `@SPECIFICATION.md`, which does not exist), note it rather than inventing its contents.
