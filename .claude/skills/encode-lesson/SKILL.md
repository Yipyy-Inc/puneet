---
name: encode-lesson
description: Turn a correction, bug, or recurring mistake into permanent machinery so it can't recur. Use when the user corrects you, when you hit the same problem twice, or when they say "make sure this doesn't happen again", "encode this", "remember this rule".
argument-hint: <the lesson or mistake to encode>
---

# encode-lesson

Convert a lesson into the most durable mechanism available. Prefer a blocking gate over prose.

## Steps

1. **State the lesson** in one sentence: the mistake, and the rule that prevents it.
2. **Pick the strongest feasible mechanism** (in order):
   - **Blocking gate** — an ESLint rule (in `eslint.config.mjs`), a type, or a check script (`scripts/`, wired like `check:pricing`). This makes the mistake impossible to merge. **Propose gate changes separately and never weaken an existing gate** — adding a stricter rule is its own change the user approves.
   - **A check in CI/husky** — only if it generalizes and the user approves; do not silently edit `.github/workflows/ci.yml` or `.husky/*`.
   - **A documented rule (minimum)** — a dated line in the most relevant doc: [docs/conventions/code-style.md](../../../docs/conventions/code-style.md) for a coding rule, [docs/quality/debt-map.md](../../../docs/quality/debt-map.md) for a landmine, [AGENTS.md](../../../AGENTS.md) for a workflow rule, or an ADR under [docs/architecture/decisions/](../../../docs/architecture/decisions/) for an architectural decision.
3. **Write it where the fact has one home.** Don't duplicate — link instead. The debt map is append-only (add a dated entry; don't rewrite history).
4. **If it's a bug**, and once a test runner exists, the durable form is a regression test. Until then, record the manual reproduction in the relevant CUJ row and the fix in the debt map.
5. **Confirm the mechanism actually triggers** (run the lint/script) before claiming the lesson is encoded.

Output: which mechanism you used, the exact file changed, and — if you propose a new gate — a separate, clearly-labeled suggestion for the user to approve.
