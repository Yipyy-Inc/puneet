# 0001 — Adopt the AI operating model (additively)

- **Status:** Accepted
- **Date:** 2026-06-20
- **Deciders:** Product owner (pending confirmation), AI operating harness

## Context

The Doggieville MTL / Yipyy codebase is a large (266 routes), fast-moving, **mock-driven prototype** on Next.js 16 / React 19. It predates a formalized AI operating model. It already carries a strong [CLAUDE.md](../../../CLAUDE.md) with architecture, build-performance, and code-style rules, but lacked: an explicit task loop, product documentation (the product's intent lived only in code, copy, and scattered notes), a conventions/debt map, and repeatable skills to enforce the workflow across AI sessions.

Unlike the typical target of this operating model, this is **not a legacy production system** — there is no backend and there are no automated tests. So the model is adapted: "green" is defined by the CI gates (`typecheck`, `lint`, `format:check`, `build`) plus manual UI verification, not by a test suite.

## Decision

Adopt the AI operating model **additively**, without migrating or rewriting existing code:

- Keep [CLAUDE.md](../../../CLAUDE.md) as the authoritative architecture/style manual. Add a thin [AGENTS.md](../../../AGENTS.md) that defers to it and adds the operating loop, commands, docs map, and rules-for-new-code.
- Add `docs/` (architecture, conventions, quality, product) describing the system **as it is**, recording deviations as facts rather than silently correcting them.
- Reverse-engineer the product layer (PRD, overview, critical user journeys) from routes, data models, and copy, tagging every claim **observed** (with source) or **[inferred]**.
- Install `.claude/skills/` commands (create-spec, plan-feature, implement-feature, review, verify, encode-lesson, update-docs, write-prd) adapted to this project's real commands and its no-test reality.

## Consequences

- **New code** follows the target conventions in [../../conventions/code-style.md](../../conventions/code-style.md) §(b); **legacy code is documented, not rewritten.** Boy-scout cleanup is opt-in.
- The defined green sequence is gate-based + manual until a test runner is introduced. Introducing one is itself a future ADR.
- Future architectural choices get an ADR in this folder.
- The product layer starts as `[inferred]` and awaits product-owner confirmation (see the PRD decision log and the CUJ doc).
- No source, config, dependency, or CI files were changed to adopt the model — only new docs/skills, plus a single `@AGENTS.md` import line appended to CLAUDE.md.
