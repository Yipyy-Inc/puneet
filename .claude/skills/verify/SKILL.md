---
name: verify
description: Run the project's real "green" sequence and confirm a change actually works. Use when the user says "verify", "is it green", "check it builds", "make sure it works", or before claiming a task is done.
argument-hint: [optional: the change/journey to verify]
---

# verify

Produce an **evidence summary**, not a claim. This project has **no test runner** — green = the gate commands plus a manual UI walk-through.

## Steps

1. **Run the gate sequence** (bun only) and capture real output:
   - `bun run typecheck` — must pass clean (also the pre-commit/pre-push hook).
   - `bun run lint` — no errors (note: `unused-imports/no-unused-imports` is an error; warnings are tolerated but report new ones).
   - `bun run format:check` — must be clean; run `bun run format` to fix.
   - `bun run build` — run this for any structural change (routing, layouts, server/client boundaries, new pages). Optional for tiny isolated edits, but say which you ran.
2. **Manual UI verification** (required for any user-visible change):
   - `bun run dev`, open the affected route, and walk the touched [critical user journey](../../../docs/product/critical-user-journeys.md) step by step.
   - Confirm the happy path **and** at least one empty/error state. Note the exact route(s) you exercised.
   - If you can capture a screenshot or describe the on-screen result, do so.
3. **Report evidence.** Summarize: each command run + pass/fail + the salient output line; the route(s) walked and what you observed. If anything failed, show the error and stop — don't claim done.
4. **Honesty rule.** If a step was skipped (e.g. build not run), say so explicitly. Never report green from typecheck alone for a UI change.

Output: a short evidence table (command → result) + the manual-check notes + a clear done / not-done verdict.
