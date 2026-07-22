# Debt map

The honest map of landmines, fragile areas, and missing coverage. **This file is append-only going forward:** future sessions add dated findings here instead of fixing-by-the-way. Fixing an item is a deliberate, scoped task — not a drive-by.

Severity: 🔴 high (easy to break things / actively misleading) · 🟡 medium · 🟢 low (cleanup).

## Snapshot (2026-06-20, from adoption audit)

### 🔴 No automated tests

There is no test runner and no `*.test.*` / `*.spec.*` in `src/`. Every change is verified only by typecheck/lint/build + manual UI inspection. Regressions in interactive flows are invisible to CI. **Do instead:** verify the touched [critical user journey](../product/critical-user-journeys.md) by hand and document it; when a test runner is introduced, do it as its own change + ADR and backfill the CUJs first.

### 🔴 `DataTable` is a shared blast radius

A large number of tables render through the one `DataTable` component. CLAUDE.md explicitly warns: additions must not break existing implementations. **Do instead:** extend via optional props with safe defaults; grep callers before changing its signature; never change existing prop semantics.

### 🔴 Parallel/duplicate domain models

Several domains carry two overlapping systems; editing the wrong one silently does nothing or corrupts the other:

- **Loyalty:** editable `useLoyaltyProgram` provider vs. read-only `useLoyaltyConfig`; two loyalty models.
- **Training:** two parallel enrollment systems.
- **Calling:** new `CallRoutingRule` (calling module) vs. old communications `RoutingRule`; and three distinct "tag" concepts (`inquiryTag` vs. `ActiveCall.tags` vs. `callLog.tags`).
- **Staff identity — three id namespaces for people.** `facilityStaff` (`fs-*`, the RBAC/employee-portal identity), `scheduleEmployees` (`emp-N`, the scheduling module — different people, and it spans the cafe and Laval too), and `users` (numeric, the legacy roster that `staffTasks`, `staffAvailability`, `staffPerformance`, `schedules`, `timeOffRequests` and `shiftSwapRequests` are keyed to). `users` ids 4–9 and `emp-1..6` are the same six people by name; **`fs-*` overlaps with neither**, so there is no mapping to discover — don't invent one.
  Mostly resolved. Facility staff are derived into `scheduleEmployees` under their own `fs-*` ids (see the header comment in `src/data/scheduling.ts`), so shifts belong to the signed-in employee by identity; and `staffTasks`, `staffAvailability`, `staffPerformance`, `shiftTasks`, `shiftSwapRequests`, `sickCallIns`, `timeOffRequests` and `schedules` are now keyed by `fs-*` too, with the personal screens resolving the viewer via `useFacilityViewer()`. **Still open:** `users` (numeric) remains the identity for client-facing records — `createdById` on report cards, payments, pets and tags — so anything authored by staff can't be attributed to a staff profile yet. **Do instead:** if you need that attribution, re-key those `createdById` fields; don't map `fs-*` onto a numeric id.
  **Do instead (generally):** confirm which model the task targets before editing; trace the provider/hook actually mounted on the route.

### 🟡 Client-component over-reach

168/266 `page.tsx` declare `"use client"`, against the Server-Components-by-default target. This inflates bundle/compile cost. **Do instead:** write new pages as Server Components and push interactivity into child client components; do **not** mass-convert existing pages in passing — that's a scoped refactor.

### 🟡 Types co-mingled with mock data

Many `src/data/*` files export types alongside data (e.g. `additional-features.ts`, `cash-drawer.ts`, `boarding-ops.ts`, `analytics.ts`), violating CLAUDE.md's separation rule. This couples type-only imports to data bundles. **Do instead:** new types go in `src/types/`; when you must touch one of these files, split opportunistically only if the task is about it.

### 🟡 Query layer adopted unevenly

`src/lib/api/` has 25 query factories, but components/libs still import directly from `src/data/` in places. Mixed access makes the "swap to real API" promise leaky. **Do instead:** new data access goes through `src/lib/api/` factories; don't add new direct `src/data/` imports in components.

### 🟡 Sparse resilience files

`error.tsx` exists only at the app root; `loading.tsx` only at root + `review/[token]`; `not-found.tsx` only at root + two training routes. A thrown error in a deep route takes down to the root boundary. **Do instead:** add `error.tsx` at `facility/dashboard/`, `customer/`, and `dashboard/` boundaries and `not-found.tsx` to dynamic routes as you touch them.

### 🟢 Committed debug artifacts at repo root

Tracked in git and stale: `cpdebug.log`, `grep.txt`, `.lint-results.json` (~2.4 MB), `typecheck.out`, `.typecheck-output.log`, `dev-server.out.log`, `dev-server.err.log`, `.tmp/pricing-scenario-check.ts`, and a mis-named `C:tmpverify_disc.mjs`. They bloat the repo and can mislead. **Do instead:** don't depend on them; removing them + gitignoring is a small dedicated chore (not in scope of unrelated work).

### 🟢 Stale doc reference

[CLAUDE.md](../../CLAUDE.md) references `@SPECIFICATION.md`, which does not exist anywhere in the repo. **Do instead:** treat product intent as living in [../product/](../product/); if SPECIFICATION.md is meant to exist, create it as its own task, otherwise update the CLAUDE.md reference.

### 🟢 Outdated/loose pins worth noting

`@anthropic-ai/sdk` is pinned `^0.82.0` and is the only real external dependency — watch for breaking changes in the `app/api/ai/*` handlers on upgrade. The lint setup turns `@typescript-eslint/no-unused-vars` off and has no `no-explicit-any` rule, so `any` and dead vars are caught by convention/`unused-imports` only, not a hard gate.

---

## How to add to this map

Append under a new dated heading. For each item: a one-line description, a severity, **why it's risky**, and **what to do instead** of casually touching it. Don't delete items — strike them through with the date and PR when genuinely resolved.
