---
name: plan-feature
description: Produce a step-by-step implementation plan with file paths from a spec or a feature request. Use when the user says "plan this", "how would you build X", "make an implementation plan", or before starting a non-trivial feature.
argument-hint: <spec path or feature description>
---

# plan-feature

Produce an ordered, file-level plan. **No feature code in this skill** — planning only.

## Steps

1. **Ground.** Read [AGENTS.md](../../../AGENTS.md), [CLAUDE.md](../../../CLAUDE.md), and the spec (if one exists under `specs/`). Read the touched [docs/](../../../docs/) — architecture overview, conventions §(b), debt map, and the relevant CUJ.
2. **Inventory first — reuse, never recreate.** Before proposing any new file, search for what already exists: components in `src/components/<domain>/` and `src/components/ui/`, hooks in `src/hooks/`, query factories in `src/lib/api/`, data shapes in `src/data/` and `src/types/`. List what you'll reuse vs. what's genuinely new.
3. **Flag legacy-zone contact.** Cross-check [docs/quality/debt-map.md](../../../docs/quality/debt-map.md). If the plan touches `DataTable`, a parallel-model domain (loyalty/training/calling), the FormWizard/FormBuilder, or would add `"use client"` to a page, say so explicitly and describe the safe approach.
4. **Write the plan** as ordered steps. Each step has: the change in one line, the **exact file paths**, whether it's a Server or Client Component, which `src/lib/api/` factory it uses, and a **per-step verification** (what to typecheck/lint and what to click). Keep steps small enough to keep the build green between them.
5. **Conventions guardrails** to bake into the plan: Server Components for pages, types separated from data, files under ~500 lines, dynamic imports for heavy/conditional UI, no new `any`/`@ts-ignore`, data via `src/lib/api/`.

Output: the numbered plan with file paths and per-step verification, plus a final "green sequence" line. Hand off to `implement-feature`.
