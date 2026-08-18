# Docs index

Documentation for the Yipyy platform. Start with [AGENTS.md](../AGENTS.md) (the operating manual) and [CLAUDE.md](../CLAUDE.md) (the authoritative architecture/style rules). These docs add product context and the harness around them.

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
