# Product overview

Plain-language description of what Yipyy is and does **today**, written for a new teammate and filled from the codebase audit. Claims are **observed** (cite a route/file) or **[inferred]** (reconstructed from copy/structure). This describes the prototype's surface; it is not a commitment about a roadmap.

## In one paragraph

Yipyy is a SaaS platform for pet-care businesses — daycare, boarding, grooming, training, retail, and vet — that ties together **online booking, front-desk operations, customer self-service, loyalty/marketing, and multi-location management** in one app. Pet owners book and manage services and watch their pets; facility staff run the day (check-ins, report cards, scheduling, POS); facility owners manage clients, money, staff, loyalty, and reputation across one or many locations; and a platform super-admin oversees all facilities. It is currently a **mock-driven prototype** — every flow is navigable, but data is in-memory and the only live integration is Anthropic-powered text generation. (Observed: route groups under [src/app/](../../src/app/); AI routes under [src/app/api/ai/](../../src/app/api/ai/).)

## Who it's for (user types)

1. **Pet owner / customer** — books services, manages pets & household, enrolls in training, pays, earns rewards, watches cameras, reads report cards. (Observed: [src/app/customer/](../../src/app/customer/).)
2. **Facility owner / admin** — runs a location's bookings, services, clients, billing, staff, loyalty, reputation, and (multi-site) HQ rollups. (Observed: [src/app/facility/](../../src/app/facility/).)
3. **Facility staff / employee** — role-scoped daily operations (groomer, trainer, daycare/boarding attendant, reception, sanitation). (Observed: [src/app/employee/(shell)/](../../src/app/employee/); role list [inferred] from route names.)
4. **Groomer (independent/mobile)** — own queue, schedule, and route planning. (Observed: [src/app/groomer/](../../src/app/groomer/).)
5. **Platform super-admin** — manages facilities, subscriptions/modules, users/roles, system config, AI settings, health, and compliance across the tenant base. (Observed: [src/app/dashboard/](../../src/app/dashboard/).)

## What it does — shipped capabilities (each in a paragraph)

- **Booking & estimates.** Customers book daycare, boarding, grooming, or training, pick date/time/add-ons, and get an itemized estimate with taxes/deposit before confirming. Public booking and token-based estimate acceptance exist for non-logged-in flows. (Observed: `customer/bookings/new`, `book/[slug]`, `customer/estimates/[token]`.)
- **Express check-in ("YipyyGo").** Pre-check-in forms plus a QR code let owners complete intake before drop-off; staff scan the QR to validate and complete check-in, triggering post-check-in automations. (Observed: `customer/bookings/[id]/check-in-qr`, [src/lib/qr-checkin.ts](../../src/lib/qr-checkin.ts), `src/lib/post-checkin-automation.ts`, `qrcode.react`.)
- **Daily operations per service.** Each service (daycare, boarding, grooming, training, retail, vet) has its own dashboard with check-in/out, rooms/kennels, rates, tasks, report cards, and settings; grooming adds live tracking and a map-based route planner. (Observed: `facility/dashboard/services/*`.)
- **Report cards.** Staff log a pet's day and generate a warm summary — optionally via Claude — which owners read in their portal. (Observed: `app/api/ai/report-card-summary`, `customer/report-cards`.)
- **Customer self-service.** Pets & household management, billing/wallet/store-credit, documents/waivers (e-signature), messages, notifications, and live pet cameras. (Observed: `customer/{pets,household,billing,wallet,documents,messages,cameras}`, `signature_pad`, `leaflet`.)
- **Loyalty & referrals.** Configurable tiers, badges, earn rules, rewards, redemptions, and referral tracking; customers see points/tier and redeem. (Observed: `facility/dashboard/loyalty/*`, `customer/{rewards,refer}`.)
- **Reputation booster.** Intercepts client feedback: routes happy clients to public-review platforms and negative feedback into an internal escalation/resolution flow before it goes public. (Observed: `facility/dashboard/marketing/reputation-booster`, `review/[token]`, [src/data/reputation](../../src/data/), [src/lib/api/reputation.ts](../../src/lib/api/reputation.ts).)
- **Calling.** Inbound/outbound call handling with availability tracking, smart routing rules, call logging, tags, analytics, and auto-generated follow-up tasks; can open a pre-filled booking from an active call. (Observed: `facility/dashboard/calling`, [src/lib/api/communications.ts](../../src/lib/api/communications.ts), `src/lib/calling/`.)
- **Gift cards.** Buy, manage, and redeem gift cards on both customer and facility sides. (Observed: `customer/gift-cards/*`, `facility/dashboard/gift-cards`.)
- **Staff scheduling & management.** Roster, shift swaps, time-off, templates, performance, warnings, documents. (Observed: `facility/dashboard/services/scheduling/*`, `facility/dashboard/staff/*`.)
- **Billing & money.** Invoices, payment settings/methods, deposits, store credit, cash drawer. (Observed: `facility/dashboard/billing/*`, [src/types/payments.ts](../../src/types/payments.ts).)
- **Forms & waivers.** Drag-and-drop form builder with logic rules, submissions, and an audit trail. (Observed: `facility/dashboard/forms/{builder,submissions,audit}`, `@dnd-kit/*`.)
- **Multi-location HQ.** Cross-location overview and reports (client activity, staff performance, transfer impact) and staff transfers between locations. (Observed: `facility/hq/*`.)
- **Platform administration.** Facility onboarding, subscription tiers & feature modules, user/role management, feature toggles, AI settings, audit logs, system health, security/compliance. (Observed: `dashboard/*`.)
- **AI assistance.** Claude generates report-card and evaluation summaries plus ~14 text templates (chat replies, marketing copy, incident notes, etc.), with token-usage tracking and graceful fallback. (Observed: `app/api/ai/{generate-text,report-card-summary,evaluation-summary}`.)
- **Smart insights.** Aggregates signals (including calling data) into prioritized recommended actions surfaced in the facility UI. (Observed: [src/lib/api/smart-insights.ts](../../src/lib/api/smart-insights.ts); `generateCallingInsights()`.)

## Integrations that power it

Anthropic API (text generation, the only live call), Unsplash (allow-listed images), and capability libraries simulated against mock data: `leaflet`/`react-leaflet` (maps/routing), `qrcode.react` (check-in QR), `@zxing/*` (barcode scanning), `signature_pad` (waivers), `recharts` (analytics), `@dnd-kit/*` (drag-and-drop builders), `next-intl` (English + French). (Observed: [package.json](../../package.json), [next.config.ts](../../next.config.ts), [messages/](../../messages/).)

## Important caveat

Everything a production deployment would need — real payments, telephony, SMS/email delivery, live cameras, persistence, auth — is **mocked**. The UI implies these capabilities; the backend does not yet provide them. Treat the app as a high-fidelity product prototype.
