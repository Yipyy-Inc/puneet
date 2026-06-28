# PRD (reverse-engineered)

The product's source of intent, **reconstructed from the codebase** on 2026-06-20. Every claim is **observed** (cites a route/file) or **[inferred]** (reconstructed — to be confirmed). Business goals, non-goals, and success metrics are **not derivable from code** and are listed as Open Questions until the product owner answers them; they are never assumed.

> Status: **Draft, pending product-owner review.** See the decision log.

## Problem & opportunity

Pet-care businesses (daycare/boarding/grooming/training/retail) juggle bookings, intake paperwork, front-desk operations, payments, staff scheduling, customer communication, loyalty, and reviews across disconnected tools. **The opportunity this codebase pursues** is a single platform that runs the whole operation and gives pet owners a self-service portal, scaling from one location to a multi-location HQ. (Inferred from the breadth of modules under [src/app/facility/](../../src/app/facility/) and [src/app/customer/](../../src/app/customer/); the specific business problem statement is an Open Question.)

## Goals & non-goals

- **Goals:** Not stated in code. See Open Questions Q1–Q2. (The implemented surface suggests goals like "one system for all pet-service operations" and "reduce front-desk friction via express check-in" — [inferred], to confirm.)
- **Non-goals:** Not stated in code. See Open Question Q3.

## Users & jobs

| User                       | Primary job-to-be-done                                              | Evidence                                                 |
| -------------------------- | ------------------------------------------------------------------- | -------------------------------------------------------- |
| Pet owner                  | Book & pay for services, manage pets, stay informed about their pet | `customer/` (observed)                                   |
| Facility owner/admin       | Run and grow a location (ops, money, staff, clients, marketing)     | `facility/dashboard/`, `facility/hq/` (observed)         |
| Facility staff             | Execute the day's service tasks for their role                      | `employee/(shell)/` (observed); role taxonomy [inferred] |
| Independent/mobile groomer | Manage own appointments & routes                                    | `groomer/` (observed)                                    |
| Platform super-admin       | Operate the multi-tenant platform                                   | `dashboard/` (observed)                                  |

## Current scope — shipped capabilities, ranked by centrality

Ranking is **[inferred]** from route volume, cross-linking, and how many other features depend on each.

1. **Booking & service operations** — the spine: booking → estimate → check-in → daily care → report card, across 6 services. (Observed: `customer/bookings`, `facility/dashboard/services/*`.)
2. **Customer portal & self-service** — pets, household, billing/wallet, documents, messages, cameras. (Observed: `customer/*`.)
3. **Express check-in (YipyyGo)** — QR + pre-intake forms reducing front-desk time. (Observed: `qr-checkin.ts`, `check-in-qr`.)
4. **Loyalty, referrals & reputation** — retention and review-funnel engines. (Observed: `facility/dashboard/loyalty/*`, `marketing/reputation-booster`.)
5. **Calling** — availability, routing, logging, analytics, follow-up tasks. (Observed: `facility/dashboard/calling`.)
6. **Billing & money** — invoices, payments, deposits, store credit, gift cards, cash drawer. (Observed: `facility/dashboard/billing/*`, `gift-cards`.)
7. **Staff scheduling & management** — roster, swaps, time-off, performance. (Observed: `services/scheduling/*`, `staff/*`.)
8. **Forms & waivers** — dynamic builder with logic + audit. (Observed: `forms/{builder,submissions,audit}`.)
9. **Multi-location HQ** — cross-location reporting and transfers. (Observed: `facility/hq/*`.)
10. **Platform administration** — facilities, subscriptions/modules, users/roles, system config, compliance. (Observed: `dashboard/*`.)
11. **AI assistance & smart insights** — Claude text generation + prioritized recommendations. (Observed: `app/api/ai/*`, `lib/api/smart-insights.ts`.)

## Constraints

- **Mock-only data; no backend, no persistence, no real auth/payments/telephony/cameras.** (Observed: data in `src/data/`, no DB/server.)
- **Only live integration is Anthropic** (`@anthropic-ai/sdk`), confined to `app/api/ai/*`, with token tracking and fallback. (Observed.)
- **No automated tests**; quality rests on typecheck/lint/build + manual checks. (Observed: no test runner.)
- **Stack-locked:** Next.js 16 App Router + React 19 + React Compiler + TS strict + Tailwind 4 + shadcn + next-intl; bun-only. (Observed: configs.)
- **Bilingual:** English + French content. (Observed: `messages/{en,fr}.json`.)
- **Performance discipline** baked into CLAUDE.md (server-first, code-split, separate types/data) because of known build-time regressions. (Observed: CLAUDE.md.)

## Success metrics

Not derivable from code. See Open Question Q4. No analytics/KPI instrumentation that defines targets was found (dashboards display metrics but don't encode goals).

## Open questions

- **Q1 — Goals:** What are the top 3 business outcomes Yipyy must drive (e.g. adoption, front-desk time saved, retention, multi-location expansion)?
- **Q2 — Primary user & wedge:** Which user and which capability is the wedge the product leads with (booking? express check-in? loyalty?)?
- **Q3 — Non-goals:** What is explicitly out of scope (e.g. veterinary EMR depth, accounting/GL, e-commerce beyond retail POS)?
- **Q4 — Success metrics:** What are the target metrics and thresholds for the core journeys (e.g. % bookings self-served, check-in time, review conversion)?
- **Q5 — Launch reality:** Is there a target for replacing the mock layer with a real backend, and which integrations (payments, telephony, cameras, auth) are committed vs. exploratory?
- **Q6 — Branding:** RESOLVED — the platform is **"Yipyy"**. The former "Doggieville MTL" name (used for both the platform brand and the built-in demo facility) was retired and rebranded to "Yipyy" across the app.

## Decision log

- **2026-06-20** — PRD reverse-engineered from the codebase; **pending product-owner review.** All goals/non-goals/metrics are Open Questions, not assumptions. Update via the `write-prd` skill as answers arrive; append decisions here.
- **2026-06-28** — Branding (Q6) decided: platform name unified to **"Yipyy"**; "Doggieville MTL" / "Doggieville" rebranded to "Yipyy" everywhere in `src/` (Global Settings, page titles, emails/SMS, greetings, branding defaults, locations, domains).
