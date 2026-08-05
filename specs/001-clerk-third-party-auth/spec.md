# 001 — Clerk as the identity provider, Supabase as the database

**Status:** draft
**Created:** 2026-08-05

## Problem

Sign-in is moving to Clerk so the platform can offer Google and Apple sign-in without
building and maintaining those flows. Clerk is already installed, mounted and
registered with Supabase as a third-party auth provider; a signed-in Clerk user
reaches Postgres as `authenticated` today.

What has **not** moved is authorisation. Every RLS policy in the project still
identifies the caller with `auth.uid()`, which casts the token's `sub` claim to
`uuid`. Clerk's `sub` is `user_3HVlmtt…`, not a UUID, so the cast raises
`22P02 invalid_text_representation`.

This was verified against the live project, not assumed — `/test-clerk-supabase`
runs the same token against two tables and shows the contrast:

| Table             | Policy identifies caller by | Result                     |
| ----------------- | --------------------------- | -------------------------- |
| `profiles`        | `auth.uid()`                | `22P02`, query rejected    |
| `clerk_tpa_check` | `auth.jwt()->>'sub'`        | insert + read back succeed |

So the token, the provider config and the client wiring are all proven. The
remaining work is the RLS layer and the identity columns underneath it.

Affects every authenticated journey in
[docs/product/critical-user-journeys.md](../../docs/product/critical-user-journeys.md) —
nobody can read their own data until it is done.

## Decisions taken

- **Clerk is identity-only.** `facility_memberships` remains the authority on who
  belongs to which facility and in what role. Clerk Organizations are not used.
  Rationale: the permission system (`my_permissions`, `facility_role_permissions`,
  `facility_custom_roles`, `membership_permissions`) is already built on it, and
  moving tenancy into Clerk would rewrite far more than authentication.
- **Native third-party auth, not the JWT template.** The Clerk↔Supabase JWT
  template integration was deprecated 2025-04-01; it requires sharing the project's
  JWT secret and rotating that secret causes downtime. Already implemented this way.
- **Failure is loud, so the migration can be staged.** `auth.uid()` against a Clerk
  `sub` raises rather than returning NULL. An unmigrated table errors visibly
  instead of silently returning zero rows, so tables can move over in batches
  without a silent-data-loss window.

## Acceptance criteria

- [ ] A user who signs in with Google or Apple lands in their correct portal and
      sees their own data — facility staff see their facility, customers see their pets.
- [ ] No occurrence of `auth.uid()` remains in `supabase/migrations/` outside
      explicitly documented service_role paths (see "The bypass idiom" below).
- [ ] All 27 suites in `supabase/tests/` pass, including `rpc-session-required.sql`.
- [ ] A Clerk user's first sign-in results in a `profiles` row without manual steps
      (webhook), and a staff member linked to a facility can reach the facility portal.
- [ ] The 9 existing `auth.users` accounts can still sign in, via Clerk, and resolve
      to their existing `profiles`/`facility_memberships` rows.
- [ ] Cross-tenant isolation still holds: a user of facility A cannot read facility
      B's clients, bookings or grooming notes. Proven by the existing RLS tests,
      not by inspection.
- [ ] `/test-clerk-supabase` and `public.clerk_tpa_check` are deleted.
- [ ] The four Supabase login pages and `src/lib/auth/actions.ts` are removed, and
      every redirect that pointed at `/login` points at Clerk's sign-in.

## Out of scope

- Clerk Organizations / moving tenancy out of `facility_memberships`.
- Clerk Billing, and any change to the platform's own subscription model.
- The mock-data layer in `src/data/` — this touches Postgres identity only.
- Retiring the `user_role` cookie or `scheduling-current-user-role` localStorage
  role systems (see debt map). They are a separate concern and predate this work.
- MFA, session management policy, and Clerk's prebuilt account portal.

## Affected files & legacy zones

### Postgres — the bulk of the work

**55 occurrences of `auth.uid()` across 25 migration files.** Highest density:
`20260726120000_tenancy_and_identity.sql` (8), `20260801120000_clients_pets_bookings.sql` (5),
`20260804200000_rpc_require_session.sql` (4), `20260803090000_client_pet_write_integrity.sql` (3),
`20260806700000_the_ledger_write_passes_through.sql` (3), `20260804180000_offboarding.sql` (3).

**9 app columns typed `uuid references auth.users (id)`.** Read from `pg_constraint`
on the live database, not from the migration files — the two disagree, and the
database is the authority (`information_schema` hides these: `auth.users` is owned
by `supabase_auth_admin`, so the usual join returns an empty set that looks like
"no FKs exist"):

| Table                        | Column         |
| ---------------------------- | -------------- |
| `profiles`                   | `id`           |
| `booking_tip_allocations`    | `created_by`   |
| `grooming_alert_notes`       | `created_by`   |
| `grooming_price_adjustments` | `created_by`   |
| `grooming_ticket_comments`   | `created_by`   |
| `training_attendance`        | `created_by`   |
| `offboarding_task_states`    | `completed_by` |
| `staff_documents`            | `uploaded_by`  |
| `staff_signatures`           | `signed_by`    |

A further 8 FKs to `auth.users` exist on Supabase's own `auth.*` tables
(`identities`, `sessions`, `mfa_factors`, …). Those are GoTrue's and are not
touched — they simply stop being used.

**`private.custom_access_token_hook`** (`20260726160000_custom_access_token_hook.sql`)
is called by GoTrue while minting a Supabase token. Clerk-minted sessions never
trigger it, so the `memberships` claim it injects will be absent. Its logic must
move into Clerk's custom session token claims, and every policy reading those
claims must read them from the new shape.

### 🔴 The bypass idiom — the highest-risk class

**8 sites** open a write-integrity trigger with:

```sql
if (select auth.uid()) is null then return new; end if;
```

Per [debt-map.md](../../docs/quality/debt-map.md), this is deliberate: a trigger only
fires on a write that already cleared RLS, so a null subject really does mean
`service_role`, and the early return is how seeds insert catalogues without
tripping their own rules.

Under Clerk `auth.uid()` **raises rather than returning null**, so these do not
degrade — they error, and every seed and service-role write fails. They must
become `(select auth.jwt()->>'sub') is null`, which preserves the semantics
(`service_role` presents no `sub`).

Sites: `20260802120000_booking_write_integrity.sql:107`,
`20260802140000_staff_write_integrity.sql:63`,
`20260803090000_client_pet_write_integrity.sql:68,139`,
`20260803140000_onboarding_templates.sql:409`,
`20260803180000_onboarding_instances.sql:264,304`,
`20260804180000_offboarding.sql:349`.

**Do not blanket-apply this to functions.** The same debt-map entry records two
shipped RPCs that were exploitable from the publishable key because a null-subject
carve-out written to admit the seed script also admitted the internet. In an RPC a
null subject is a **refusal**, not a bypass — `20260804200000_rpc_require_session.sql`
exists to enforce that and must keep passing.

### Application code

- `src/lib/supabase/clerk-server.ts`, `clerk-client.ts` — done, in use.
- `src/lib/supabase/server.ts`, `client.ts`, `proxy.ts`, `env.ts` — the cookie-bound
  path; retire once every table is migrated. `src/proxy.ts` currently runs
  `clerkMiddleware` around `updateSession`; the Supabase half comes out last.
- `src/lib/auth/` — `actions.ts`, `viewer.ts`, `portal-gate.ts`, `onboarding-gate.ts`,
  `permissions.ts`, `employee-identity.ts`, `legacy-identity.ts`, `sign-out-client.ts`.
  The gates keep their job; only how they resolve the viewer changes.
- Login pages: `src/app/login/`, `src/app/customer/auth/`, `src/app/staff/auth/`,
  `src/app/groomer/auth/` (plus signup, forgot/reset/change-password under customer).
- `src/app/auth/callback/` — Supabase's OAuth callback, no longer reached.
- New: `src/app/api/webhooks/clerk/route.ts` — user sync, verified with
  `verifyWebhook` from `@clerk/nextjs/webhooks`.

### Other zones touched

🟡 **Staff identity namespaces.** The debt map records three id namespaces for
people (`fs-*`, `emp-N`, numeric `users`). This migration adds Clerk's `user_…`
as the identity of record in Postgres. It must map to `profiles`/`facility_memberships`
only — do not attempt to reconcile the three mock-data namespaces here.

## Data & types

- `profiles.id` moves from `uuid` (FK to `auth.users`) to `text` holding the Clerk
  `sub`. The FK is dropped; `auth.users` stops being the source of truth for identity.
- The 8 other `auth.users` FK columns become `text` with their FKs dropped, or are
  re-pointed at `profiles(id)` where an FK is still wanted.
- `src/types/database.ts` is generated (`bun run` the Supabase type generation, or
  the MCP `generate_typescript_types`). **It currently holds uncommitted unrelated
  work** (`training_trainer_profiles`) — commit or stash that before regenerating,
  or it will be clobbered.
- No new hand-written types are needed; the webhook payload types come from
  `@clerk/nextjs/webhooks` (`UserJSON`).
- Reads continue through `src/lib/api/` factories; none of their signatures change.

### Backfill

9 rows in `auth.users`, all with a real `last_sign_in_at`, newest 2026-08-03; 9
`profiles`, 5 `facility_memberships`, 23 `staff`. Staff rows outnumber auth users,
so most staff have no login yet and need no backfill.

**There is almost no authored history to preserve.** Counting non-null values
across all 8 authorship columns on the live database:

| Column                               | Rows | Authored |
| ------------------------------------ | ---- | -------- |
| `booking_tip_allocations.created_by` | 1    | **1**    |
| all seven others                     | 0    | 0        |

One row in the entire database carries an author. So the choice between "map the
9 accounts by email" and "recreate them in Clerk" costs exactly one tip
allocation's attribution — it is not a data-preservation decision, and should be
made on whichever is simpler to execute. Recreating is simpler.

## Verification plan

Postgres first — the SQL suites are the real harness here:

1. `supabase/tests/rpc-session-required.sql` — must pass. It is the guard against
   the null-subject carve-out reopening the anon hole.
2. The RLS suites, especially the cross-tenant ones:
   `grooming-session-record-rls.sql` (catches the customer-reads-internal-notes
   regression), `grooming-appointments-rls.sql`, `offboarding-rls.sql`,
   `onboarding-instances-rls.sql`, `staff-write-integrity.sql`,
   `booking-write-integrity.sql`, `client-pet-write-integrity.sql`.
3. Re-run `/test-clerk-supabase` before deleting it: `profiles` must flip from
   `22P02` to a successful read.

Then the app:

```
bun run typecheck && bun run lint && bun run format:check
bun run build          # structural: proxy, layouts, route removals
bun run check:rls-writes
```

Manual walk-through — there is no app test runner, so this substitutes for it.
Sign in with **Google** and with **Apple**, then click:

- Facility staff → `/facility/dashboard` → bookings list → open one booking.
- Customer → `/customer` → pets → book a service.
- Groomer → `/groomer/dashboard` → today's appointments.
- Super-admin → `/dashboard` → facilities → open one facility.
- Cross-tenant negative check: signed in as facility A, confirm facility B's
  clients are not reachable.

## Resolved questions

All three were settled from the live database rather than by preference
(2026-08-05).

1. **Existing accounts: start clean.** Exactly one row in the entire database
   carries an author (`booking_tip_allocations.created_by`), so preserving
   authorship is worth one tip allocation. The 9 people are recreated in Clerk;
   no email-mapping backfill script is written.
2. **Big-bang, not staged.** 9 internal users, no paying customers, no production
   deployment — the conditions that make a staged cutover worth its cost are
   absent. Staged would mean two auth systems live at once and every portal gate
   tolerating either session, which is more work and more failure modes than one
   cutover on a system nobody depends on yet. This option expires as soon as real
   users exist.
3. **Production Clerk instance: deferred, and production is knowingly left
   broken until then.**

   > **CORRECTION (2026-08-06).** This item originally read "there is no
   > production deployment", inferred from a missing `.vercel` link and an unset
   > `NEXT_PUBLIC_APP_URL`. That inference was wrong: **www.yipyy.com is live on
   > Vercel and is this app.** A repo that is not _linked on one machine_ says
   > nothing about whether the project is deployed — the only reliable check is
   > to look at the domain, which was not done until after the migration.
   >
   > It carried weight: "no production deployment" was one of the reasons the
   > big-bang cutover was judged safe.

   Measured 2026-08-06: production serves a **pre-Clerk build** — `/login` and
   `/customer/auth/login` return 200 and render the old form, `/sign-in` 404s —
   against the same Supabase project this migration changed. So production
   sign-in is broken: Supabase Auth can still authenticate against the 9
   remaining `auth.users` rows, but their `profiles` were retired, RLS now reads
   `auth.jwt()->>'sub'`, and every portal gate refuses. `/facility/dashboard`
   returns a 34KB redirect shell with zero portal content.

   **Accepted deliberately** (product owner, 2026-08-06): the platform is
   unlaunched, the data is demo, and nobody depends on the site. The cost is a
   broken demo, not lost business. Rejected alternatives: deploying today's code
   immediately (gated on Clerk production setup), and pointing production at the
   Clerk _development_ keys as a stopgap.

   Deploy-checklist item, unchanged in substance:
   - create the production Clerk instance (own domain + DNS) and add it as a
     **second** TPA provider on the existing Supabase project — the development
     entry stays, and the two cannot collide because instances mint different
     user ids;
   - enable Google and Apple on production with **your own** OAuth credentials;
     development uses Clerk's shared test credentials and nothing carries over;
   - set `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` / `CLERK_SECRET_KEY` (live keys) and
     `CLERK_WEBHOOK_SIGNING_SECRET` in Vercel **before** the build —
     `NEXT_PUBLIC_*` is inlined at build time, not read at runtime;
   - point the Clerk webhook endpoint at `https://yipyy.com/api/webhooks/clerk`.

## Open questions

None blocking. Raise here if any surface during planning.
