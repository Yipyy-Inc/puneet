---
name: review
description: Review the current diff against the project's rules, conventions, and debt map. Use when the user says "review my changes", "review the diff", "code review", or before opening a PR.
argument-hint: [optional: base ref, defaults to the working diff]
---

# review

Review the current change for rule, convention, and boundary violations. Findings only — don't fix unless asked.

## Steps

1. **Get the diff.** `git status` and `git diff` (vs. the given base ref, or the working tree / last commit). Identify every changed file.
2. **Ground the review.** Read [AGENTS.md](../../../AGENTS.md), [docs/conventions/code-style.md](../../../docs/conventions/code-style.md) §(b), and [docs/quality/debt-map.md](../../../docs/quality/debt-map.md).
3. **Check against the rules** and rank each finding **P1** (must fix — breaks a rule/gate/journey), **P2** (should fix), **P3** (nice to have):
   - **Layer/boundary respect:** logic in hooks/`lib`, not crammed into components; data via `src/lib/api/` factories, not new direct `src/data/` imports; no new module-level mutable singletons.
   - **Server-first:** no new `"use client"` on `page.tsx`/`layout.tsx`; heavy/conditional components dynamic-imported.
   - **TypeScript:** no new `any`, no new `@ts-ignore` (only `@ts-expect-error` + reason); type-only imports use `import type`; types not co-mingled with mock data.
   - **Size/structure:** no `.tsx` over ~500 lines; one modal per file; no new barrel files; no `import *` from large packages.
   - **Legacy zones:** any `DataTable` prop change must be backward-compatible; no casual edits to parallel-model domains (loyalty/training/calling) or the FormWizard; no debt-map zone touched beyond scope.
   - **Gates:** no weakened lint rule / tsconfig flag / CI step / husky hook; Conventional Commit messages.
   - **Verification:** since there are no tests, confirm the change records a manual check of the touched [CUJ](../../../docs/product/critical-user-journeys.md). Flag UI changes that lack one.
   - **Resilience/UX:** new dynamic routes have `not-found.tsx`/`error.tsx` where appropriate; empty & error states handled and accessible.
4. **Encode repeat offenders.** If a finding is a recurring mistake, recommend running `encode-lesson` to make it a durable rule.

Output: findings grouped P1/P2/P3, each with file:line and a concrete fix. End with a one-line verdict (ship / fix-then-ship / rework).
