---
name: create-spec
description: Turn a feature request or idea into a written spec under specs/NNN-slug/spec.md. Use when the user says "write a spec", "spec this out", "create a spec for X", or describes a feature they want defined before building.
argument-hint: <feature name or short description>
---

# create-spec

Turn a feature request into a reviewable spec. **Do not write feature code in this skill** — only the spec file.

## Steps

1. **Ground.** Read [AGENTS.md](../../../AGENTS.md), the relevant [docs/product/](../../../docs/product/) (overview, PRD, CUJs), and [docs/quality/debt-map.md](../../../docs/quality/debt-map.md). Inventory existing code that already does part of this (search `src/components/`, `src/hooks/`, `src/lib/api/`, `src/data/`) — the spec must say what to reuse.
2. **Locate the spec folder.** Specs live in `specs/`. If it doesn't exist yet, create it. Find the next number: scan `specs/` for the highest `NNN-*` and add 1 (start at `001`). Slugify the feature name. The file is `specs/NNN-slug/spec.md`.
3. **Write the spec** with these sections:
   - **Problem** — what user/role need this serves; link the relevant CUJ if any.
   - **Acceptance criteria** — checkable bullets; what "done" looks like in the UI and data.
   - **Out of scope** — what this deliberately does not do.
   - **Affected files & legacy zones** — concrete paths; cross-check [docs/quality/debt-map.md](../../../docs/quality/debt-map.md) and call out any 🔴/🟡 zone the work touches (DataTable, parallel loyalty/training/calling models, client-component reach, FormWizard).
   - **Data & types** — which `src/data/`/`src/types/` shapes and which `src/lib/api/` factory; new types go in `src/types/` (never co-mingled with data).
   - **Verification plan** — the exact green sequence (`bun run typecheck && bun run lint && bun run format:check`, plus `bun run build` if structural) and the manual UI walk-through (there is no test runner — name the journey to click through).
4. **Confirm, don't assume.** If goals/scope are ambiguous and not answerable from code, ask the user up to 3 sharp questions before finalizing. Record unresolved items as "Open questions" in the spec.

Output: the path to the created spec and a one-paragraph summary. Stop there — planning is the `plan-feature` skill.
