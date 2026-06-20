# Docs index

Documentation for the Doggieville MTL / Yipyy platform. Start with [AGENTS.md](../AGENTS.md) (the operating manual) and [CLAUDE.md](../CLAUDE.md) (the authoritative architecture/style rules). These docs add product context and the harness around them.

## Architecture

- [architecture/overview.md](architecture/overview.md) — the system as it actually is: rendering model, directory layout, external services, known deviations from the target architecture.
- [architecture/decisions/0001-adopt-ai-operating-model.md](architecture/decisions/0001-adopt-ai-operating-model.md) — ADR: adopting the AI operating model additively, without migrating existing code.

## Conventions

- [conventions/code-style.md](conventions/code-style.md) — (a) detected conventions as they exist today, and (b) target conventions for new code.

## Quality

- [quality/debt-map.md](quality/debt-map.md) — known landmines, fragile areas, missing coverage, risk zones. Append-only.

## Product

- [product/overview.md](product/overview.md) — plain-language description of what the product is and does today.
- [product/prd.md](product/prd.md) — reverse-engineered PRD: problem, users, scope, constraints, open questions, decision log.
- [product/critical-user-journeys.md](product/critical-user-journeys.md) — the journeys that must not break, with where they live in code and their (currently absent) test coverage.
