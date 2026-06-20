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

- The app is **mock-driven**: there is no database or backend service. Domain data is hand-authored TypeScript in [src/data/](../../src/data/) (~135 files).
- A **TanStack Query factory layer** in [src/lib/api/](../../src/lib/api/) (25 files: `booking.ts`, `client.ts`, `loyalty.ts`, `reputation.ts`, `training.ts`, …) wraps mock data behind `queryFn`s so a future real API only changes the factory. This layer is **partially adopted** — many components still import directly from `src/data/` (see Deviations).
- The **only real network surface** is [src/app/api/ai/](../../src/app/api/ai/) — three Anthropic-backed route handlers (`generate-text`, `report-card-summary`, `evaluation-summary`) using `@anthropic-ai/sdk`. Everything else is in-memory.
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
| `customer/` (33 pages)         | Pet owners                      | Booking, pets/household, training enrollment, billing/wallet, rewards/referrals, report cards, messages, cameras, gift cards, auth                                                                                    |
| `facility/` (171 pages)        | Business admin & staff managers | `dashboard/` operations hub; `dashboard/services/{daycare,boarding,grooming,training,retail,vet}/`; `dashboard/{loyalty,calling,billing,staff,clients/[id],forms,calendar,gift-cards}/`; `hq/` multi-location rollups |
| `dashboard/` (37 pages)        | Platform super-admin            | Analytics/BI, facilities onboarding, subscriptions/modules, user-management, system-admin (feature toggles, AI settings, audit logs), system-health, security-compliance                                              |
| `employee/(shell)/` (12 pages) | Front-line staff                | Role-scoped ops views (daycare, boarding, grooming, training, kennel, retail, tasks, schedule, clients) under one shared layout                                                                                       |
| `groomer/`, `staff/`           | Groomers / staff auth           | Profile, dashboard, login flows                                                                                                                                                                                       |
| public token routes            | Anyone with a link              | `book/[slug]`, `review/[token]`, `forms/`, `customer/estimates/[token]` — server components doing `notFound()` on bad tokens                                                                                          |

The `services/{service}/` pages repeat a consistent sub-route shape (overview, check-in, rates, rooms, report-cards, tasks, settings). The 7 service layouts are candidates for the shared `ServiceModuleLayout` described in CLAUDE.md.

## State, forms, and key libraries

- **Server state:** TanStack Query (`@tanstack/react-query`) — provider in the root layout via a client wrapper; factories in `src/lib/api/`.
- **Static forms:** TanStack Form (`@tanstack/react-form`) + Zod for compile-time-known forms (rates, shifts, settings, modals).
- **Dynamic forms:** the FormWizard / FormBuilder system uses `useState` + `evaluateLogicRules` over a `Record<string, unknown>` answers bag — **deliberately not** TanStack Form (runtime-defined fields). Do not "fix" this.
- **Notable capability libraries:** `leaflet`/`react-leaflet` (service-area maps, route planning), `qrcode.react` (YipyyGo check-in QR), `@zxing/*` (barcode scanning, retail), `signature_pad` (waivers/consent), `recharts` (analytics — load via dynamic import per CLAUDE.md), `@dnd-kit/*` (drag-to-reorder builders), `sonner` (toasts).

## External services

- **Anthropic API** (`@anthropic-ai/sdk`) — the only external integration that makes real calls, confined to `src/app/api/ai/*`. Used for report-card summaries, evaluation summaries, and ~14 text-generation templates (chat replies, marketing copy, incident notes, etc.). Endpoints track token usage and fall back gracefully on failure. Key/config via `.env.local`.
- **Unsplash** — remote image host allow-listed in `next.config.ts` (`images.remotePatterns`).
- Everything else a real deployment would need (payments, SMS, cameras, telephony) is **simulated in mock data**, not integrated.

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
