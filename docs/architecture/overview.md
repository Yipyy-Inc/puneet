# Architecture overview

The system as it actually is on the date this was written. For the rules you must follow when adding code, see [CLAUDE.md](../../CLAUDE.md) and [../conventions/code-style.md](../conventions/code-style.md). This file is descriptive, not aspirational.

## Stack

- **Next.js 16.1** App Router, React Server Components enabled (`rsc: true` in [components.json](../../components.json)).
- **React 19.2** with the **React Compiler** on via babel plugin (`reactCompiler: true` in [next.config.ts](../../next.config.ts)) — be aware of its rules-of-hooks/purity constraints; ESLint flags `react-hooks/purity` and `react-hooks/set-state-in-effect` as warnings.
- **TypeScript 5.9**, `strict: true`, `moduleResolution: bundler`, path alias `@/* → ./src/*` ([tsconfig.json](../../tsconfig.json)).
- **Tailwind CSS 4** (PostCSS plugin), **shadcn/ui** New York style, base color neutral, CSS variables ([components.json](../../components.json)).
- **next-intl** for i18n; locales **en** and **fr** ([messages/en.json](../../messages/en.json), [messages/fr.json](../../messages/fr.json)).
- Package manager: **bun** (lockfile `bun.lock`). Node engine `>=20`.

## Rendering & data-flow model

- The app is **no longer mock-driven, and has not been since 2026-08.** There is a real backend: **Supabase Postgres**, with row-level security as the authorisation boundary and **Clerk** as the identity provider (ADR [0003](decisions/0003-clerk-owns-identity-supabase-owns-data.md)). Domain data increasingly lives in tables reached through `src/app/api/*` route handlers and RLS-scoped queries.
- Hand-authored TypeScript in [src/data/](../../src/data/) (~135 files) still backs the screens that have not been converted, so BOTH are true at once — which is the single most important thing to establish before touching a surface. Check whether the screen you are editing reads a table or a fixture; do not assume either.
- A **TanStack Query factory layer** in [src/lib/api/](../../src/lib/api/) (25 files: `booking.ts`, `client.ts`, `loyalty.ts`, `reputation.ts`, `training.ts`, …) wraps mock data behind `queryFn`s so a future real API only changes the factory. This layer is **partially adopted** — many components still import directly from `src/data/` (see Deviations).
- There are now **~98 route handlers** under [src/app/api/](../../src/app/api/), the majority of them real reads and writes against Postgres. The AI routes are no longer special: they were simply the first.
- **Money is real.** [src/lib/clover/](../../src/lib/clover/) drives a live Clover merchant account per facility — OAuth connect, card charges, declines, refunds, webhook reconciliation and terminal discovery. See [Payments](#payments-clover) below.
- Pages are a **mix of Server and Client Components**, skewed heavily client: **168 of 266 `page.tsx` files (~63%) declare `"use client"`.** This contradicts the target ("pages are Server Components by default") and is the largest standing deviation.

## Directory layout (role of each top-level folder)

```
src/
  app/          Next.js App Router. Route groups by audience (see below). Real AI routes under app/api/ai/.
  components/   UI. shadcn primitives in components/ui/. Domain components grouped by feature (loyalty/, calling/, hq/, bookings/, yipyygo/, retail/, …).
  hooks/        Custom React hooks — one hook per state domain (use-<feature>.ts).
  lib/          Shared logic. lib/api/ = TanStack Query factories. Other lib/* = pure helpers (qr-checkin, post-checkin-automation, call-metrics, booking-task-generator, …).
  data/         Mock data (~135 files). The de-facto database. NOTE: many files also export types (deviation).
  types/        Shared TypeScript types (client.ts, pet.ts, payments.ts, …).
  i18n/         next-intl request/routing config.
messages/       Translation catalogs: en.json, fr.json.
public/         Static assets.
scripts/        Standalone bun scripts (e.g. pricing-consistency check).
```

### Route groups (audiences) under `src/app/`

| Segment                        | Audience                        | What lives here                                                                                                                                                                                                       |
| ------------------------------ | ------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `customer/` (33 pages)         | Pet owners                      | Booking, pets/household, training enrollment, billing/wallet, rewards/referrals, report cards, messages, cameras, gift cards                                                                                          |
| `facility/` (171 pages)        | Business admin & staff managers | `dashboard/` operations hub; `dashboard/services/{daycare,boarding,grooming,training,retail,vet}/`; `dashboard/{loyalty,calling,billing,staff,clients/[id],forms,calendar,gift-cards}/`; `hq/` multi-location rollups |
| `dashboard/` (37 pages)        | Platform super-admin            | Analytics/BI, facilities onboarding, subscriptions/modules, user-management, system-admin (feature toggles, AI settings, audit logs), system-health, security-compliance                                              |
| `employee/(shell)/` (12 pages) | Front-line staff                | Role-scoped ops views (daycare, boarding, grooming, training, kennel, retail, tasks, schedule, clients) under one shared layout                                                                                       |
| `groomer/`, `staff/`           | Groomers / staff                | Profile, dashboard                                                                                                                                                                                                    |
| `sign-in/`, `sign-up/`         | Anyone signing in               | Clerk-hosted flows (Google / Apple). One sign-in for every portal — see ADR 0003; the per-portal login pages were removed 2026-08-05                                                                                  |
| public token routes            | Anyone with a link              | `book/[slug]`, `review/[token]`, `forms/`, `customer/estimates/[token]` — server components doing `notFound()` on bad tokens                                                                                          |

The `services/{service}/` pages repeat a consistent sub-route shape (overview, check-in, rates, rooms, report-cards, tasks, settings). The 7 service layouts are candidates for the shared `ServiceModuleLayout` described in CLAUDE.md.

## State, forms, and key libraries

- **Server state:** TanStack Query (`@tanstack/react-query`) — provider in the root layout via a client wrapper; factories in `src/lib/api/`.
- **Static forms:** TanStack Form (`@tanstack/react-form`) + Zod for compile-time-known forms (rates, shifts, settings, modals).
- **Dynamic forms:** the FormWizard / FormBuilder system uses `useState` + `evaluateLogicRules` over a `Record<string, unknown>` answers bag — **deliberately not** TanStack Form (runtime-defined fields). Do not "fix" this.
- **Notable capability libraries:** `leaflet`/`react-leaflet` (service-area maps, route planning), `qrcode.react` (YipyyGo check-in QR), `@zxing/*` (barcode scanning, retail), `signature_pad` (waivers/consent), `recharts` (analytics — load via dynamic import per CLAUDE.md), `@dnd-kit/*` (drag-to-reorder builders), `sonner` (toasts).

## External services

- **Anthropic API** (`@anthropic-ai/sdk`) — confined to `src/app/api/ai/*`. Used for report-card summaries, evaluation summaries, and ~14 text-generation templates (chat replies, marketing copy, incident notes, etc.). Endpoints track token usage and fall back gracefully on failure. Key/config via `.env.local`.
- **Unsplash** — remote image host allow-listed in `next.config.ts` (`images.remotePatterns`).
- **Clerk** — identity. **Supabase** — Postgres, RLS, Vault, Storage.
- **Clover** — card payments, live against a real merchant account. Not simulated.
- SMS, cameras and telephony remain **simulated in mock data**, not integrated. (Twilio has config surfaces but the call paths are still fixtures.)

## Payments (Clover)

Card payments are real, and the design decisions behind them are load-bearing enough to state here rather than leave in commit messages.

| Piece          | Where                                                     | What it does                                                                                                                                                                                                         |
| -------------- | --------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Connect        | `src/app/api/payments/clover/connect`, `src/app/clover/`  | OAuth v2 per facility. The facility travels in an HMAC-signed `state`, never a query parameter — otherwise an attacker could attach their own merchant account to somebody else's business.                          |
| Credentials    | `private.payment_credentials` + Supabase Vault            | Rows hold Vault secret **ids**, never tokens. Access tokens live 30 minutes and are refreshed with a 5-minute margin.                                                                                                |
| Charge         | `src/lib/clover/charge.ts`, `/api/payments/clover/charge` | An **intent is opened before Clover is called**, carrying the idempotency key, so a crash mid-charge is reconcilable rather than invisible. The amount is always `amount_due - amount_paid`, never from the request. |
| Pay screen     | `src/app/pay/[ref]/`                                      | Deliberately outside both portals: a customer and a counter both legitimately pay, and `bookings_read` decides. Card fields are Clover-hosted iframes, so no PAN reaches this server.                                |
| Refund         | `/api/payments/clover/refund`                             | Permission checked **before** Clover, since the ledger check would fire after money moved.                                                                                                                           |
| Webhooks       | `/api/webhooks/clover`, `payment_webhook_events`          | A delivery is evidence Clover _mentioned_ an object, never a statement of fact — there is no signature, only a shared secret. The named object is re-read from the API before anything is written.                   |
| Reconciliation | `src/lib/clover/reconcile.ts`                             | Gap-based: "does our ledger account for everything Clover has reversed". Idempotent, so a webhook, a refund we issued, and a manual reversal all converge.                                                           |
| Terminals      | `src/lib/clover/devices.ts`                               | Discovery only. Card-present payment is **not built** — see the debt map.                                                                                                                                            |

**Both Clover estates run at once.** A connection is served by the estate stored on its row (`payment_connections.environment`), not by a global flag, so sandbox merchants keep working after production ones exist. Always pass the connection's environment to `cloverConfig()`.

## Gates (what "green" enforces)

- **CI** ([.github/workflows/ci.yml](../../.github/workflows/ci.yml)): four jobs — `typecheck`, `lint`, `format:check`, and `build` (build depends on typecheck). All run on push/PR to `main` with bun + frozen lockfile.
- **Git hooks** (husky): `pre-commit` and `pre-push` both run `bun run typecheck`.
- **No automated tests exist** (no test runner, no `*.test.*`/`*.spec.*` in `src/`). Verification is the CI gates + manual UI checks.

## Known deviations from the target architecture

Recorded factually, not as a to-do list. New code should follow the target; these are not to be mass-"fixed" in passing.

1. **Pages are client-heavy.** 168/266 `page.tsx` use `"use client"`, against the target of Server-Components-by-default. Many could push interactivity into small child client components.
2. **Types co-mingled with mock data.** Many [src/data/](../../src/data/) files `export type`/`export interface` alongside the data (e.g. `additional-features.ts`, `cash-drawer.ts`, `boarding-ops.ts`), violating CLAUDE.md's "never export types and mock data from the same file."
3. **Direct `src/data/` imports.** Components and libs still import mock data directly instead of going through `src/lib/api/` factories — the query layer exists but isn't universally used.
4. **Two parallel models in several domains.** Loyalty (editable `useLoyaltyProgram` vs read-only `useLoyaltyConfig`), training (two enrollment systems), and calling (new `CallRoutingRule` vs old communications `RoutingRule`) each carry duplicate concepts. Confirm which one a task targets before editing.
5. **Sparse resilience files.** `error.tsx` exists only at the app root; `loading.tsx` only at root + one review route; `not-found.tsx` only at root + two training routes. CLAUDE.md asks for these at major boundaries.
6. **Committed debug artifacts.** Root-level `cpdebug.log`, `grep.txt`, `.lint-results.json` (~2.4 MB), `typecheck.out`, `.typecheck-output.log`, `dev-server.{out,err}.log`, `.tmp/` are tracked in git. See [../quality/debt-map.md](../quality/debt-map.md).
7. **Stale reference.** CLAUDE.md points to `@SPECIFICATION.md`, which does not exist in the repo.

## Entry points

- App boot: `src/app/layout.tsx` (fonts, Toaster, Query provider wrapper).
- Per-audience shells: `src/app/{customer,facility,dashboard,employee/(shell)}/layout.tsx`.
- Real backend surface: `src/app/api/ai/*/route.ts`.
- Mock "database": `src/data/*` consumed via `src/lib/api/*`.
