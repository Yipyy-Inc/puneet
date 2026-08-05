# 0003 — Clerk owns identity, Supabase owns the data

- **Status:** Accepted
- **Date:** 2026-08-05
- **Deciders:** Product owner, AI operating harness
- **Spec:** [specs/001-clerk-third-party-auth/](../../../specs/001-clerk-third-party-auth/)

## Context

The platform needed Google and Apple sign-in. It already had a complete,
working Supabase Auth system: four portal login pages, `signInWithPassword` /
`signUp` server actions, a custom access-token hook injecting facility
memberships into the JWT, and an RLS layer identifying every caller with
`auth.uid()`.

So this was never an additive install. Adding Clerk meant replacing the identity
provider under a live authorisation model — and the two answer the same question
in incompatible units:

|               | resolves the caller as                                    |
| ------------- | --------------------------------------------------------- |
| Supabase Auth | `auth.uid()` — a **uuid** from `auth.users`               |
| Clerk         | `auth.jwt()->>'sub'` — a **text** id like `user_3HVlmtt…` |

The alternative considered and rejected was keeping Supabase Auth and enabling
Google/Apple through `signInWithOAuth`, which needs no new dependency and no
migration. It was rejected by the product owner in favour of Clerk's hosted
flows, prebuilt components and webhook tooling.

Two further options were rejected as leaving **two sources of truth for
identity**: syncing Clerk into a separate table, and minting a Supabase auth
user per Clerk user. Both drift, and drift in an identity store is how "which
record is the real one?" becomes unanswerable.

## Decision

**Clerk is the identity provider. Supabase is the database. They are joined by
Supabase's native third-party auth, not by the deprecated JWT template.**

1. **Native TPA, using Clerk session tokens.** The Clerk↔Supabase JWT-template
   integration was deprecated 2025-04-01: it requires sharing the project's JWT
   secret with a third party and rotating that secret causes downtime. The
   native path shares no secret and adds no token round-trip.
2. **Clerk is identity-only.** `facility_memberships` remains the authority on
   who belongs to which facility and in what role. Clerk Organizations are not
   used — the permission cascade (`my_permissions`, `facility_role_permissions`,
   `facility_custom_roles`, `membership_permissions`) is already built on that
   table, and moving tenancy into Clerk would rewrite far more than
   authentication.
3. **Postgres identifies callers by `auth.jwt()->>'sub'` (text).** Every
   identity column is text; the FKs into `auth.users` are gone.
4. **The sync webhook copies users, never grants tenancy.** TPA decides what a
   caller may read and copies nothing, so a Clerk user needs a `profiles` row to
   exist to RLS. Membership stays an admin grant — a webhook that handed out
   tenancy would let anyone with a sign-up form join a facility.
5. **Big-bang cutover, start clean.** Chosen because the conditions that make a
   staged migration worth its cost were absent: 9 internal users, one authored
   row in the entire database, no paying customers, no production deployment.
   This option expires the moment real users exist.

## Consequences

**The seams held, so the blast radius was small.** `createServerClient()`,
`getViewer()`, `Viewer` and `landingPathForClaims()` kept their names and
signatures, so ~70 call sites and every portal gate changed identity provider
without being edited. Editing 70 files to carry one decision is how a cutover
acquires its own bugs.

**Far less RLS moved than the count suggested.** 220 policies exist, but 192
delegate to three `SECURITY DEFINER` helpers and never name a column. Rewriting
13 identity functions carried them; only 10 policies needed individual work.

**A claim became a query, and that fixed a bug.** `viewer.ts` read memberships
from `app_metadata`, a snapshot taken when the token was minted — so a revoked
membership stayed live until refresh. It now costs two indexed queries per
request and reflects revocation immediately.

**`private.custom_access_token_hook` is obsolete.** GoTrue only calls it when
Supabase Auth mints a token, which no longer happens. It is not replaced: the
RLS helpers always queried the membership tables directly and never read claims.

**Authorship columns intentionally have no foreign key.** Re-pointing them at
`profiles(id)` looks tidier and is a bug — the profile arrives by asynchronous
webhook, so a user writing before it lands would have the write _refused_. An
unmatched author id is recoverable; a rejected write is not.

**Sign-in is OAuth-only.** The instance has no email/password identifier
enabled, so `/sign-in` and `/sign-up` offer Google and Apple. Adding a provider
is a dashboard toggle, not a code change.

**Unmigrated tables fail loudly.** `auth.uid()` against a Clerk subject _raises_
`22P02` rather than returning NULL, so a half-migrated table errors visibly
instead of silently returning zero rows. This is why the migration could be
verified table by table.

**The RLS test harness now sets `request.jwt.claims` (JSON).** `auth.jwt()`
cannot see the scalar `request.jwt.claim.sub`. See
[debt-map.md](../../quality/debt-map.md) — reverting it would break every policy
written against `auth.jwt()->>'sub'`.

## Follow-ups

- Drop `private.custom_access_token_hook` once it is cleared in
  Supabase Dashboard → Authentication → Hooks.
- Four policies are `to public` rather than `to authenticated`
  (`daycare_attendance_read`, `daycare_config_read`, `facility_rooms_read`,
  `room_categories_read`), contradicting the tenancy migration's own comment.
  Recreated as found; tightening them is a behaviour change and its own decision.
- **One Supabase project serves both environments** (decided 2026-08-06). Safe
  while nothing is launched: the data is demo, and there are no customers a bad
  migration could reach. Supabase accepts several third-party auth providers on
  one project, so the development and production Clerk instances are registered
  side by side and their subjects cannot collide — Clerk mints different user
  ids per instance.

  **Revisit before the first real customer.** From that point the two costs
  become real: a local migration lands directly on production data, and demo
  records sit in the same tables as customer records with nothing distinguishing
  them. Splitting later means standing up a second project and replaying
  `supabase/migrations/` into it, which is cheap now and expensive once there is
  data worth keeping.

- Production needs its own Clerk instance — a separate domain, its own live
  keys, its own webhook endpoint, and its own Google/Apple OAuth credentials
  (development uses Clerk's shared test credentials; production requires a real
  Google Cloud OAuth client and an Apple Services ID). Nothing carries over
  from development except the code.

- Live keys must be set **before** the build — `NEXT_PUBLIC_*` is inlined at
  build time, so changing them afterwards requires a redeploy and a green build
  proves nothing about their values.
- The `user_role` cookie and `scheduling-current-user-role` localStorage role
  systems still steer UI. Nothing about access depends on them; removing them is
  UI work.
