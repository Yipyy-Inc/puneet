---
name: update-docs
description: After a change, update any docs that are now stale (overview, conventions, CUJs, debt map, PRD decision log). Use when the user says "update the docs", or after merging a change that altered behavior, routes, conventions, or product scope.
argument-hint: [optional: what changed]
---

# update-docs

Keep the docs true after a change. One home per fact — update in place, don't duplicate.

## Steps

1. **Diff awareness.** Look at what changed (`git diff` / recent commits). Decide which docs the change affects.
2. **Update the right files:**
   - [docs/product/overview.md](../../../docs/product/overview.md) — a new/changed user-visible capability. Keep the observed/[inferred] tags honest (cite the new route/file).
   - [docs/product/critical-user-journeys.md](../../../docs/product/critical-user-journeys.md) — a new user-visible feature must extend a CUJ or add a row; update the "where it lives in code" paths if they moved.
   - [docs/conventions/code-style.md](../../../docs/conventions/code-style.md) — a new agreed convention (in §(b)) or a newly-observed pattern (in §(a)).
   - [docs/architecture/overview.md](../../../docs/architecture/overview.md) — structural change (routes, layouts, server/client boundary, a deviation resolved or introduced).
   - [docs/quality/debt-map.md](../../../docs/quality/debt-map.md) — **append** a dated entry for new debt; strike through (don't delete) an item genuinely resolved, with the date/PR.
   - [docs/product/prd.md](../../../docs/product/prd.md) — append to the **decision log** when scope/intent changed; move answered Open Questions into the body.
   - [docs/architecture/decisions/](../../../docs/architecture/decisions/) — add an ADR for any architectural decision.
3. **Check links & index.** Verify internal relative links still resolve and that [docs/index.md](../../../docs/index.md) lists every doc. If a doc references a file that moved or vanished, fix the reference (don't invent contents).
4. **Stale-doc rule.** If a doc contradicted the code, the doc was the bug — fix the doc in the same change and note it.

Output: the docs touched and a one-line summary of each edit.
