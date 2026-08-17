# 0004 — WorkOS replaces Clerk as the identity provider

- **Status:** Accepted
- **Date:** 2026-08-17
- **Deciders:** Product owner, AI operating harness
- **Spec:** [specs/003-workos-authkit/](../../../specs/003-workos-authkit/)
- **Supersedes:** the provider choice in
  [0003](0003-clerk-owns-identity-supabase-owns-data.md). Everything else in 0003
  stands — and is the reason this change is affordable.

## Context

ADR 0003 chose Clerk twelve days ago. Nothing about that decision was wrong on
its own terms; the terms changed. The client now projects **millions of users**,
and Clerk's pricing does not have a shape that survives it.

Clerk bills 50,000 monthly retained users free, then **$0.02/MRU**. That
allowance is identical on Hobby, Pro and Business — the paid tiers buy dashboard
seats, SOC 2 and log retention, not volume. Only a negotiated Enterprise contract
("price smoothing") addresses scale at all.

Measured against the projection, on top of the Supabase meter paid either way:

| Monthly active users | Clerk        | WorkOS      | Supabase Auth |
| -------------------- | ------------ | ----------- | ------------- |
| 1M                   | ~$21,900/mo  | ~$2,900/mo  | ~$2,900/mo    |
| 3M                   | ~$68,400/mo  | ~$14,400/mo | ~$9,400/mo    |
| 5M                   | ~$115,000/mo | ~$25,900/mo | ~$15,900/mo   |

Two further facts decided it against Supabase Auth, the other candidate:

- **Supabase Auth's passkey support is experimental** ("the API may change
  without notice"), and moving there would also mean rebuilding the device-trust
  flow `EmailSignInForm` relies on.
- **WorkOS's pricing shape matches this product.** AuthKit is free to 1M MAU,
  then $2,500 per additional million. Enterprise connections (SAML, SCIM) are
  billed **per company**, not per user — which is the right way round for a
  platform with millions of consumer pet owners and a smaller number of
  multi-location business customers who may eventually want SSO.

**Timing is the whole argument.** ADR 0003 chose a big-bang cutover and said the
option "expires the moment real users exist." The platform is still unlaunched.
Migrating now costs a week and disrupts nobody; migrating after launch means
exporting password hashes, re-enrolling every passkey, and cutting over live
sessions for paying customers.

## Decision

**WorkOS AuthKit is the identity provider. Supabase remains the database, joined
by Supabase's native third-party auth — the same seam ADR 0003 built.**

1. **The seam does not move.** `getViewer()`, `Viewer`, `landingPathForClaims()`
   and `createServerClient()` keep their names and signatures. ~70 call sites and
   every portal gate change provider without being edited, exactly as in 0003.
2. **No schema migration.** Identity columns are already `text` and RLS keys on
   `auth.jwt()->>'sub'`, which WorkOS also supplies. **The 220 RLS policies are
   provider-agnostic and are not touched.** Only the values in `profiles.id`
   change.
3. **A JWT template supplies the `role` claim.** WorkOS tokens already carry a
   `role` claim meaning the user's organization-membership role, which collides
   with the `role: "authenticated"` Supabase requires. The template overrides it
   and preserves the original as `user_role`.
4. **Custom UI is kept; passkeys are deferred.** AuthKit passkeys are available
   only through WorkOS's hosted UI, and the hosted page cannot render the
   per-facility branding that `pawradise.yipyy.com` shows today (spec 002 phase
   3). Branding won. Sign-in is rebuilt on AuthKit's API behind the existing
   `AuthCard`, and passkeys wait for a non-hosted API.
5. **Tenancy stays in Postgres.** `facility_memberships` remains the authority.
   WorkOS Organizations are not used, for the same reason 0003 refused Clerk
   Organizations — and that refusal is precisely what made this migration cheap.
   **Hold that line; it is the hedge against the next repricing.**

## Consequences

**Passkeys ship later than promised.** The Clerk passkey work built on 2026-08-17
is deleted, not ported: `PasskeysCard`, `PasskeySignInButton` and
`src/lib/auth/passkeys.ts`. The instance-level intent survives — no username,
email as the sole identifier, names required at sign-up — and is re-applied in
AuthKit.

**Apple is still blocked on Apple, not on the provider.** Production Apple
sign-in needs an Apple Developer account (Services ID, Team ID, Key ID, `.p8`).
That gap moves to WorkOS unchanged.

**Device trust is lost.** `EmailSignInForm`'s `needs_client_trust` step is a
Clerk feature. It is not reimplemented; if it is wanted, it is its own decision.

**One meter instead of a negotiation.** Supabase's third-party MAU charge
($0.00325 beyond quota) applies to WorkOS exactly as it did to Clerk, so that
cost is unchanged. What goes away is the $0.02/MRU on top.

**This is the second provider swap in two weeks.** That is not a pattern to be
proud of, but it is evidence for the architecture: both were affordable because
identity is a `sub` claim and nothing else. The lesson to encode is that
**per-MAU pricing is a scaling trap for a consumer-scale product**, and it should
be checked before adoption, not after.

## Follow-ups

- Ask WorkOS whether hosted AuthKit can do per-tenant branding, and whether a
  non-hosted passkey API is on the roadmap. Both would reopen decision 4.
- White-label facility domains, if ever built, are satellite domains on any
  provider and are billed per domain. Price it before promising it.
- Revisit at ~5M MAU: Supabase Auth native becomes cheaper than WorkOS at that
  point, and self-hosting becomes credible.
