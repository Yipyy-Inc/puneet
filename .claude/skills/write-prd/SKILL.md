---
name: write-prd
description: Re-derive or update the reverse-engineered PRD when requirements change or new product context arrives. Use when the user says "update the PRD", "write a PRD", "the requirements changed", or answers the PRD's open questions.
argument-hint: [optional: what changed or which questions are being answered]
---

# write-prd

Maintain [docs/product/prd.md](../../../docs/product/prd.md) with the same discipline as the original reverse-engineering: every claim **observed** (cite a route/file) or **[inferred]**; never assume goals/non-goals/metrics — those come from the user.

## Steps

1. **Read the current PRD** and the product layer ([overview.md](../../../docs/product/overview.md), [critical-user-journeys.md](../../../docs/product/critical-user-journeys.md)). Note the standing Open Questions and decision log.
2. **Re-derive from evidence** for anything code can tell you: new routes/data/copy → updated users, scope, constraints. Tag each claim observed (with path) or [inferred]. Update the centrality ranking if the surface changed.
3. **Interview only for gaps.** For goals, non-goals, and success metrics — which code cannot reveal — ask the user up to 5 focused questions (use the AskUserQuestion style). Anything unanswered stays an **Open Question**; never convert it to an assumption.
4. **Resolve questions in place.** When the user answers, move the item from Open Questions into the body (Goals / Non-goals / Success metrics) and **append a dated entry to the decision log**.
5. **Keep one home.** The PRD holds intent; the overview holds the plain-language "what it does"; the CUJs hold the must-not-break flows. Cross-link, don't duplicate. If product scope changed, run `update-docs` so overview/CUJs stay in sync.

Output: the updated PRD sections, the new decision-log entry, and any remaining Open Questions surfaced to the user.
