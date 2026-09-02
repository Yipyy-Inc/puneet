# AGENTS.md

The entry point for every AI session in this repo. Read this first, then the specific doc the task needs (see **Docs map**). It is intentionally thin: the detailed architecture, build-performance, and code-style rules live in [CLAUDE.md](CLAUDE.md) — this file does not restate them, it tells you how to work.

## What this repository is

**Yipyy** — a pet-services platform (booking, daycare, boarding, grooming, training, retail, loyalty, calling, reputation, gift cards, multi-location HQ) built on **Next.js 16.1**, **React 19.2**, **TypeScript 5.9** (strict), Tailwind CSS 4, shadcn/ui (New York), next-intl (en/fr).

It **was** a mock-driven prototype. It is now **half-converted, and that is the single most important fact about it.**

There is a real backend: **Supabase Postgres** with row-level security as the authorisation boundary, **WorkOS AuthKit** for identity ([ADR 0004](docs/architecture/decisions/0004-workos-replaces-clerk-as-identity-provider.md), which replaced Clerk on 2026-08-17 — [ADR 0003](docs/architecture/decisions/0003-clerk-owns-identity-supabase-owns-data.md) still describes the seam it kept), and **live Clover card payments** — real money, a real merchant account. Alongside it, ~135 files of typed fixtures in [src/data/](src/data/) still back every screen nobody has converted yet.

**So establish which half you are in before you edit anything.** A screen that looks finished may be reading a fixture and writing nowhere; a screen that looks rough may be moving real money. Grep for what it imports. The mistakes that have cost the most time in this repo are all the same mistake: assuming.

The codebase is new and large (266 routes). The operating model is **discipline while building fast**: new code follows the target conventions; existing code is left alone unless the task is about it.

## The loop

Every task follows: **Ground → Plan → Implement → Verify → Encode.**

1. **Ground** — Read the relevant doc below and the neighboring code before writing anything. Inventory what exists (components, hooks, `src/lib/api/` factories, `src/data/` shapes) and reuse it — never recreate. **Confirm the target component is actually wired in before editing it** — a file that typechecks can still be dead code (a superseded duplicate). When a task names a component (especially a settings section), grep its host page for the import first; if it's absent, find what the section really renders and edit that. For settings: `grep -n "<Component>" src/app/facility/dashboard/settings/page.tsx` — no match means it's likely dead (e.g. the old `RolesPermissionsSettings.tsx` vs the live `FacilityRolesStudio.tsx`, 2026-07). The gate `bun run check:settings-wiring` fails on any orphaned `*Settings.tsx`; `bun run prune` (Knip) also flags files imported nowhere.
2. **Plan** — For anything beyond a trivial fix, state a short plan first (CLAUDE.md: "Plan before coding").
3. **Implement** — Small steps, keep the build green. New code follows [docs/conventions/code-style.md](docs/conventions/code-style.md) §(b).
4. **Verify** — Run the green sequence below and prove the change works (for UI, run the app and look at the touched journey). Never claim done without evidence.
5. **Encode** — If a mistake could repeat, write the fix into a doc, a lint rule, or [docs/quality/debt-map.md](docs/quality/debt-map.md) in the same change. Use the `encode-lesson` skill.

## Commands

There **is** a test runner: Playwright, 112 spec files under [tests/e2e/](tests/e2e/), driving a real browser against a real server. It was described here as absent long after it existed. "Green" = the CI gates, the auth & access specs, and a look at the touched journey.

Since 2026-08-28 there is also a **small second tier**: `bun test` over [tests/unit/](tests/unit/), for pure logic worth being sure of and cheap to isolate. It exists because `DataTable`'s sort comparator ordered every numeric column on ~88 screens lexicographically — $125 ahead of $38 — for months, and neither tier that existed could have caught it: static analysis saw well-typed code, and an e2e spec would have had to seed rows of a particular digit-length shape into the shared production database to assert something three layers below the screen. Keep it to that shape. **RLS, permissions and payments stay in Playwright**, where they can actually be wrong.

| Command                                | Purpose                                                                                                             |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `bun run dev`                          | Dev server (webpack); `bun run dev:turbo` for turbo                                                                 |
| `bun run typecheck`                    | `tsc --noEmit` — the primary gate (also runs on pre-commit & pre-push)                                              |
| `bun run lint`                         | ESLint (cached); `bun run lint:fix` to autofix                                                                      |
| `bun run format:check`                 | Prettier check; `bun run format` to write                                                                           |
| `bun run build`                        | `next build` — full production build (CI runs this)                                                                 |
| `bun run prune`                        | Knip — dead-code / unused-export report                                                                             |
| `bun run test:unit`                    | `bun test` over [tests/unit/](tests/unit/) — pure logic, no browser, no database. Under a second. Runs in CI        |
| `bun run test:e2e`                     | The whole Playwright suite (112 files, ~45 min, one worker — see the debt map before trusting a run)                |
| `bun run test:e2e:gate`                | The 25 specs CI runs on every push — the authorisation boundary, and money                                          |
| `bun run test:e2e:ci`                  | The full suite CI runs NIGHTLY — auth & access, daily operations, scheduling, payroll, loyalty, report cards, tasks |
| `bun run test:sql`                     | The 78 SQL files — RLS, grants, database invariants. Runs in CI. ~90s; needs `SUPABASE_DB_URL`                      |
| `bun run check:pricing`                | Project-specific pricing-consistency script                                                                         |
| `bun run check:settings-wiring`        | Fails if a `*Settings.tsx` component is imported nowhere (dead-code guard)                                          |
| `bun run check:rls-writes`             | Fails if an API update/delete cannot tell an RLS refusal from a no-op                                               |
| `bun run check:grooming-menu`          | Fails if a screen reads the grooming menu from the fixture, not Postgres                                            |
| `bun run check:facility-from-session`  | Fails if an API route takes the facility from the request rather than the session or a parent row                   |
| `bun run check:success-claims`         | Fails if a screen claims an action succeeded with nothing that could perform it                                     |
| `bun run check:settings-fixture`       | Fails if a screen reads a facility-owned value (name, hours, rules, tips) from `src/data/settings`                  |
| `bun run check:passkey-email-verified` | Fails if the magic-auth bridge escapes its one file, or a passkey verify route drops its `emailVerified` check      |
| `bun run check:migration-versions`     | Fails if two migrations share a version number, so `db push` cannot pick its own order                              |
| `bun run check:no-review-gating`       | Fails if a control hides a public review link by rating — review gating, which the FTC and Google prohibit          |
| `bun run check:doc-counts`             | Fails if a spec or SQL-file count quoted in AGENTS.md or CLAUDE.md disagrees with what is on disk                   |

**The green sequence (run before claiming done):** `bun run typecheck && bun run lint && bun run format:check && bun run test:unit`, then for UI changes `bun run dev` and visually confirm the touched [critical user journey](docs/product/critical-user-journeys.md). Run `bun run build` for anything structural (routing, layouts, server/client boundaries). Use **bun** only — never npm/yarn/pnpm.

**Touching auth, a portal gate, a permission or an identity — or bookings, boarding, daycare, rooms, the care log, the calendar or the roster?** Run `bun run test:e2e:ci` too — the whole thing, by hand, before you push.

**The suite was split on 2026-08-25**, and it is worth knowing why before deciding which to run. 63 specs is roughly 45 minutes; GitHub holds only ONE pending run per branch; so with two people pushing to `main`, each new push cancelled the previously QUEUED run and nothing ever finished. Commits went unverified and production drifted from `main` — not because a test failed, but because no test got to run. The suite length was the cause and everything else was a symptom.

So the gate is **25** specs, and it runs on every push: the authorisation boundary (`admin-portal-enforced`, `facility-access-level`, `facility-identity`, `employee-identity`, `server-permissions`, `staff-field-exposure`, `role-editor-writes`, `staff-invite-gate`, `passkey-auth`, `automation-send-boundary`, `review-survey-token`, `twilio-webhook-signature`) and money (`yipyy-pay`, `gift-cards`, `retail-charge`, `clover-reversal`, `clover-tips`, `payment-channel`, `saved-cards`, `clover-capabilities`, `clover-device`), plus `booking-write-integrity`, which is where a production 500 was once found. And the full suite is **81** specs, running nightly at 03:00 UTC, on `workflow_dispatch`, and whenever you run it yourself. The coverage is not dropped — it is rescheduled.

Let `bun run check:doc-counts` keep both numbers honest rather than trusting this paragraph: they went stale FOUR times before it started deriving them from `package.json`. Each batch earned its place on its first run — the operations set found a production 500 on booking creation, a checkout that priced with no late fee while settings loaded, and an empty board caused by reading a PostgREST to-one relation as an array; the scheduling set found a UTC window that dropped every night shift out of its own day, a wage that could be read but never written, and a groomer told they could see labour cost. `passkey-auth` drives a CDP virtual authenticator, so it is Chromium-only by construction. `booking-payment-ledger` and `booking-payment-screens` joined on 2026-08-25 having sat in NO suite since they were written: the day they were finally run they caught a checkout offering to charge the PRICE on a part-paid booking — $64 asked for on a $64 booking with $16 already paid. **A spec in no suite is not coverage, it is a file.**

CI runs exactly that command, but **the e2e job is not in `image`'s `needs:`** — it reports, it does not gate, and pushes go straight to `main` regardless. Running it locally first is the only thing that actually stops a bad commit. Fastest locally against a built server rather than the dev one:

```
bun run build && bun run start --port 3000 &
E2E_BASE_URL=http://localhost:3000 bun run test:e2e:ci
```

`E2E_BASE_URL` pointed at localhost is still a LOCAL run — [tests/e2e/\_fixtures.ts](tests/e2e/_fixtures.ts) treats it that way on purpose, so the production-identity specs skip rather than fail against staging keys.

## Docs map

| Read this                                                                        | For tasks about                                                                                            |
| -------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| [CLAUDE.md](CLAUDE.md)                                                           | Architecture, build-performance rules, data-fetching/forms patterns, code style — the authoritative manual |
| [docs/PROJECT-STATE.md](docs/PROJECT-STATE.md)                                   | **Start here after a break** — machine setup, what is actually done, and the traps                         |
| [docs/architecture/overview.md](docs/architecture/overview.md)                   | How the system fits together; where routes/components/logic/state/data live; known deviations              |
| [docs/conventions/code-style.md](docs/conventions/code-style.md)                 | Detected conventions vs. target conventions for new code                                                   |
| [docs/quality/debt-map.md](docs/quality/debt-map.md)                             | Known landmines, fragile areas, risk zones — read before touching them                                     |
| [docs/product/onboarding-and-roles.md](docs/product/onboarding-and-roles.md)     | **Who creates whom** — the two addresses, the four roles, invitations, one login across facilities         |
| [docs/product/overview.md](docs/product/overview.md)                             | What the product does and for whom                                                                         |
| [docs/product/prd.md](docs/product/prd.md)                                       | Reverse-engineered product intent, scope, open questions                                                   |
| [docs/product/critical-user-journeys.md](docs/product/critical-user-journeys.md) | Flows that must not break; verify the touched one before claiming done                                     |
| [docs/architecture/decisions/](docs/architecture/decisions/)                     | Why architectural choices were made (ADRs)                                                                 |

## Architecture as it is

App Router with RSC enabled and the React Compiler on (babel plugin). Three+ portals under [src/app/](src/app/): `customer/` (pet owners), `facility/` (business admin + `hq/` multi-location), `dashboard/` (platform super-admin), plus `employee/`, `groomer/`, `staff/`, and public token routes (`book/`, `review/`, `forms/`). UI in [src/components/](src/components/) (shadcn primitives under `components/ui/`), hooks in [src/hooks/](src/hooks/), shared logic in [src/lib/](src/lib/), API/query factories in [src/lib/api/](src/lib/api/), mock data in [src/data/](src/data/), types in [src/types/](src/types/), i18n in [src/i18n/](src/i18n/) + [messages/](messages/). Real Anthropic calls live in [src/app/api/ai/](src/app/api/ai/) (the only non-mock surface). Full detail and deviations: [docs/architecture/overview.md](docs/architecture/overview.md).

## Rules for new code

(Full discipline in [docs/conventions/code-style.md](docs/conventions/code-style.md) §(b); the non-negotiables:)

- New code follows the conventions doc; **existing code is left alone unless the task is about it.** Extend existing patterns before inventing new ones; inventory first, reuse, never recreate.
- **TypeScript:** no new `any`, no new `@ts-ignore` (use `@ts-expect-error` with a reason) — even though older code has them.
- Follow the CLAUDE.md build-performance rules for all new code: Server Components by default for pages, types separated from mock data, components under ~500 lines, dynamic imports for heavy/conditional components, consume data via `src/lib/api/` factories (not direct `src/data/` imports).
- **Conventional Commits** for every commit (`feat:`, `fix:`, `chore:`, `refactor:`, `docs:` …).
- **Push straight to `main`; do not open a PR** unless asked. Decided
  2026-08-19 — the review round trip cost more than it caught here. `main` is
  protected with five required status checks but `enforce_admins` is false, so
  the push goes through. FIVE is what GitHub printed on the pushes of
  2026-08-31 and 2026-09-01 — `5 of 5 required status checks are expected`.
  It said FOUR here until 2026-09-01 and nothing derived it, which is the
  whole reason to write down where the number comes from. WHICH five needs
  `gh api repos/Yipyy-Inc/puneet/branches/main/protection/required_status_checks`
  and an admin token — a device-flow CLI token is refused with 403. Every push
  prints the count, so this one announces its own drift if you read the
  remote's output.
  **The gates are back in front of the fence, and that is new.** Until
  2026-08-25 Vercel deployed production from `main` on push, so CI reported
  _after_ customers already had the code and the required checks were a
  post-mortem. Self-hosted, the pipeline is the other way round: the image is
  built only once `typecheck`, `lint`, `format`, `unit`, `checks`, `sql` and
  `build` have passed, and only then does anything deploy. That list is
  `image`'s `needs:` in ci.yml, and `bun run check:doc-counts` now derives it
  from there — it omitted `unit` here until 2026-09-01.

  **How a change reaches production now:**
  1. Push to `main`. CI runs the 25-spec gate, the SQL tests and the checks.
  2. On green, the `image` job builds a container and pushes it to GHCR tagged
     with the commit sha.
  3. The `deploy` job SSHes to the VPS and runs `/opt/yipyy/deploy.sh <sha>`,
     which starts the idle colour, waits for its healthcheck, proves it with a
     real request, and points Caddy at it with a graceful `caddy reload`. The
     previous colour is left running.

  **Do not infer the deploy from the push** — that lesson survived the move
  even though its cause did not. On 2026-08-24 fourteen commits produced no
  deployment at all, silently, with every gate green. Confirm:

  ```
  gh run list --limit 1 --json headSha,conclusion --jq '.[0]'
  curl -sS -o /dev/null -w '%{http_code}
  ' https://yipyy.com/api/health
  ```

  **If a deploy went wrong:** `ssh root@<box> /opt/yipyy/rollback.sh` — one
  Caddy reload, under a second, no pull and no rebuild, because the previous
  colour never stopped running. It refuses if that colour is not healthy, in
  which case use `deploy.sh <previous-sha>`.

  **The deploy job can fail to connect and it is not always your fault.**
  Measured 2026-08-25: a runner in Azure `eastus2` could not reach the VPS at
  all — TCP timeouts on every port — while `westus` and `westcentralus` reached
  it fine and the box sat at load 0.03. Re-run the job before investigating
  anything on the server.

- **Never weaken a gate** (a lint rule, the tsconfig `strict` flag, a CI step, a husky hook) to make work pass. Propose gate changes explicitly and separately.
- **Manual verification against the touched journey is still mandatory** — the suite covers authorisation and identity, not every screen. What it does cover, CI now enforces: `bun run test:e2e:gate` runs on every push and the full suite nightly, so a loosened gate fails the build instead of shipping.
- A spec added to either suite **must clean up after itself**. There is one Postgres and CI writes to it; see the `afterAll` in [role-editor-writes.spec.ts](tests/e2e/role-editor-writes.spec.ts).
- **Touched a migration, a policy, a grant or a `SECURITY DEFINER` function? Run `bun run test:sql`.** It is 78 files and ~90 seconds, it runs in CI on every push, and it is the only thing that reads the database back rather than trusting that a migration applied. Until 2026-08-22 nothing ran it at all: `rpc-session-required.sql` had been failing unread, naming eleven anon-callable functions, while the rule it enforces was broken a fifth time. A test nobody runs is worse than no test — it is the appearance of a gate.
- **A revoke is not verified by having been written.** One naming a privilege the role does not hold succeeds silently and looks identical to one that worked. Assert it against `has_function_privilege(...)` afterwards. `revoke ... from public` and `revoke ... from anon` are _different grants_ and you almost always need **both** — see the two debt-map entries and 20260822610000, which exists only because the first attempt named one of them.
- Boy-scout cleanup is **opt-in** — only refactor adjacent legacy code when explicitly asked.

## Legacy / risk zones — handle with care

See [docs/quality/debt-map.md](docs/quality/debt-map.md) for the full map. The headline zones: the `DataTable` component (shared by many tables — additions must not break existing callers), the 168 `"use client"` pages and co-mingled type+data files (mid-refactor toward the CLAUDE.md rules — match the target in new files, don't mass-convert in passing), the FormWizard/FormBuilder dynamic-form system (uses `useState` + `evaluateLogicRules` deliberately — do **not** port it to TanStack Form), and the committed debug artifacts at the repo root (don't depend on them).

## When unsure

Stop after **two failed attempts** at the same fix and ask one concrete question instead of pushing a hack through. If a doc conflicts with the code, the doc may be stale — flag it and propose the doc fix in the same change. If a referenced file is missing (e.g. CLAUDE.md cites `@SPECIFICATION.md`, which does not exist), note it rather than inventing its contents.
