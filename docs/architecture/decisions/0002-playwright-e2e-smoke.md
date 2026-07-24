# 2. Playwright E2E smoke harness

Date: 2026-07-25

## Status

Accepted

## Context

The repo had no test runner — "green" meant `typecheck` + `lint` + `build` plus a
manual look at the touched journey (see [AGENTS.md](../../../AGENTS.md)). The
staff-portal nav-parity work (one shared nav definition, an employee sidebar that
mirrors the facility sidebar, a per-feature RBAC switchboard) has an acceptance
checklist (Z.1) whose scenarios are inherently browser-level: *sign in as a
staff member, look at the rendered sidebar, click into a page, confirm a
restricted URL is blocked.* Those cannot be proven by `typecheck`/`lint`/`build`,
and re-verifying them by hand on every change is exactly the kind of regression
risk a smoke test removes.

`@playwright/test` (and its browsers) were already present in the toolchain but
unconfigured — no config, no scripts, no specs.

## Decision

Add a **minimal Playwright E2E smoke harness**, scoped for now to the staff-portal
nav-parity acceptance scenarios:

- `playwright.config.ts` — one Chromium project, serialised (`workers: 1`)
  against a `webServer` that runs `bun run dev` and reuses an already-running
  dev server locally. Generous timeouts because dev-mode compiles routes on
  first hit.
- `tests/e2e/staff-portal-nav.spec.ts` — five specs covering Z.1 #1/#3/#4:
  the manager sidebar mirrors the facility sidebar (order + no bespoke items),
  a nav item opens the real facility module, a "built position" shows exactly
  its toggled features and blocks restricted URLs, and an individual override
  is visible to only that staff member.
- `bun run test:e2e` (and `test:e2e:ui`) scripts; Playwright artifacts gitignored.

Tests drive **real auth state** the way the app itself does — the
`employee_staff_id` cookie plus the `facility-rbac-state-v1` localStorage entry
(per-staff / preset overrides) — rather than stubbing the network. This is the
same state the `/employee/select` picker and the Roles & Permissions studio
write at runtime, so the specs exercise the real shell layout, the real RBAC
resolver, and the real sidebar.

The suite is **not wired into the pre-commit/pre-push hooks or the default green
sequence.** It is opt-in (`bun run test:e2e`) until it is fast/stable enough to
gate on, so it does not slow down every commit or make the dev server a hard
dependency of `lint`/`typecheck`.

## Consequences

- Browser-level regressions in the staff-portal nav are now catchable
  automatically; the Z.1 checklist has an executable form.
- The green sequence is unchanged (`typecheck && lint && build`); e2e is a
  separate, explicit command. A future change may add it to CI once it is
  proven stable there.
- New shared UI markers the specs rely on (`data-slot="sidebar-inner"`, the
  `AccessRestricted` copy) are now lightly load-bearing for tests; changing
  them means updating the spec.
- Seeding RBAC state via localStorage couples the specs to that storage key and
  shape. This mirrors an intentional app seam (the same one the studio uses) and
  is documented in the spec header.
