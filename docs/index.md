# Docs index

Documentation for the Yipyy platform. Start with [AGENTS.md](../AGENTS.md) (the operating manual) and [CLAUDE.md](../CLAUDE.md) (the authoritative architecture/style rules). These docs add product context and the harness around them.

## Design system

**Every screen reworked from here on follows this, completely.** CLAUDE.md § "Design System" is the short form; this folder is the source.

- [design-system/README.md](design-system/README.md) — the index: what landed where, and the system in one page.
- [design-system/design-system.md](design-system/design-system.md) — **the spec**, ~40 numbered sections. `§1`, `§5b1`, `§5d2`, `§6` are the citation format; put the number in the commit message.
- `design-system/Yipyy Design System.dc.html` — the live visual reference, opens offline in a browser. Where it and the prose disagree, **the page is right**.
- [design-system/WORK_ORDER.md](design-system/WORK_ORDER.md) — the eleven adoption stages, in order, each with its files and a definition of done. Stage 0 done 2026-09-03; stage 1 (tokens) is next.
- [design-system/icon-map.json](design-system/icon-map.json) — §5b1 machine-readable: one glyph per meaning, plus the six collisions in the shipped nav and their fixes.
- [design-system/as-built-audit-2026-08-31.md](design-system/as-built-audit-2026-08-31.md) — the system being replaced, measured. Reference only; never build from it.

## Architecture

- [architecture/overview.md](architecture/overview.md) — the system as it actually is: rendering model, directory layout, external services, known deviations from the target architecture.
- [architecture/decisions/0001-adopt-ai-operating-model.md](architecture/decisions/0001-adopt-ai-operating-model.md) — ADR: adopting the AI operating model additively, without migrating existing code.
- [architecture/decisions/0002-playwright-e2e-smoke.md](architecture/decisions/0002-playwright-e2e-smoke.md) — ADR: Playwright as the e2e harness.
- [architecture/decisions/0003-clerk-owns-identity-supabase-owns-data.md](architecture/decisions/0003-clerk-owns-identity-supabase-owns-data.md) — ADR: an identity provider owns identity, Supabase owns data, RLS is the authorisation boundary. **The provider named here is superseded by 0004; the seam is not.**
- [architecture/decisions/0004-workos-replaces-clerk-as-identity-provider.md](architecture/decisions/0004-workos-replaces-clerk-as-identity-provider.md) — ADR: WorkOS AuthKit replaces Clerk (per-MAU cost at scale). Custom UI kept, tenancy stays in Postgres.
- [architecture/decisions/0005-three-facility-roles-one-staff-portal.md](architecture/decisions/0005-three-facility-roles-one-staff-portal.md) — ADR: a facility has three roles as an ACCESS model; the thirteen job roles survive as permission templates. One staff portal.

## Conventions

- [conventions/code-style.md](conventions/code-style.md) — (a) detected conventions as they exist today, and (b) target conventions for new code.

## Quality

- [quality/debt-map.md](quality/debt-map.md) — known landmines, fragile areas, missing coverage, risk zones. Append-only.

## Product

- [product/onboarding-and-roles.md](product/onboarding-and-roles.md) — **who creates whom**: the two addresses, the four roles, how each is invited, and how one login serves several businesses.
- [product/overview.md](product/overview.md) — plain-language description of what the product is and does today.
- [product/prd.md](product/prd.md) — reverse-engineered PRD: problem, users, scope, constraints, open questions, decision log.
- [product/critical-user-journeys.md](product/critical-user-journeys.md) — the journeys that must not break, with where they live in code and their (currently absent) test coverage.
