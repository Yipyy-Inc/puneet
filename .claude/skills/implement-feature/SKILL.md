---
name: implement-feature
description: Execute an implementation plan in small, verified, conventional-commit steps. Use when the user says "implement this", "build it", "start coding", or hands you an approved plan/spec to execute.
argument-hint: <plan or spec path>
---

# implement-feature

Execute a plan as small, green steps. Follow [docs/conventions/code-style.md](../../../docs/conventions/code-style.md) §(b) for all new code.

## Steps

1. **Ground.** Read [AGENTS.md](../../../AGENTS.md), the plan/spec, and the neighboring code you're about to touch. Confirm the `src/lib/api/` factory, `src/data`/`src/types` shapes, and existing components you'll reuse.
2. **Work in small steps.** Implement one plan step at a time. After each step run the relevant checks (at minimum `bun run typecheck`; add `bun run lint` for code you changed). Keep the build green — don't stack broken steps.
3. **Hold the conventions** (non-negotiable for new code):
   - Pages/layouts are **Server Components** — push interactivity into small child client components; don't add `"use client"` to a `page.tsx`/`layout.tsx`.
   - **No new `any`**, no new `@ts-ignore` (use `@ts-expect-error` + reason). Separate types from mock data. Consume data via `src/lib/api/` factories, not direct `src/data/` imports.
   - Files under ~500 lines; one modal per file; dynamic-import heavy/conditional components (anything with `recharts`).
   - Reuse `DataTable` without changing existing prop semantics. Don't touch a debt-map legacy zone beyond what the plan authorizes.
   - Only modify the relevant parts of files — never rewrite a whole file. Don't generate assets or create `.md` files unless asked.
4. **Commit** in Conventional Commits (`feat:`, `fix:`, `refactor:`, `docs:` …), one logical step per commit. Husky runs `typecheck` on commit — fix the cause if it fails, never bypass with `--no-verify`.
5. **Stop rule.** If the same fix fails **twice**, stop and ask one concrete question instead of hacking around it.
6. **Finish with verification.** Run the green sequence (see the `verify` skill) before reporting done. Then run `update-docs` if anything in the docs/CUJs is now stale, and `encode-lesson` if a mistake here could recur.

Output: what changed (files), the commits made, and the verification evidence.
