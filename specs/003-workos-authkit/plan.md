# 003 — WorkOS AuthKit: migration plan

Decision and rationale: [ADR 0004](../../docs/architecture/decisions/0004-workos-replaces-clerk-as-identity-provider.md).

**23 files import Clerk.** That is the whole surface. This plan orders them so
the build stays green at every step and the risky part happens once.

## Status — 2026-08-17

| Phase                      | State                                                        |
| -------------------------- | ------------------------------------------------------------ |
| 0 — WorkOS config          | **done**, both environments                                  |
| 1 — Supabase trusts WorkOS | **done**, verified end to end with a real token              |
| 2 — Identity seam          | **done**                                                     |
| 3 — Auth UI                | **done**                                                     |
| 4 — User sync webhook      | **done** for Staging, verified both directions; prod pending |
| 5 — Identities and tests   | **done**; 7 identities provisioned and verified              |
| 6 — Cleanup                | **done** — deregistered in Supabase, 8 identities migrated   |

Clerk is gone: packages, lockfile, `.env*`, docs, the 20 agent skills, and its
third-party-auth registration in Supabase. Nothing in the project references it
as a live dependency.

**What is left is production, not Clerk.**

### Production — verified 2026-08-17

`www.yipyy.com` is a REAL deployment (Vercel project `puneet`, team Yipyy), also
serving `yipyy.com`, `pawradise.yipyy.com` and `doggieville-mtl.yipyy.com`. An
earlier note in this plan said nothing was deployed; that was inferred from a
missing `.vercel/project.json` and was **wrong** — the repo simply was not linked.

| item                            | state                                                                 |
| ------------------------------- | --------------------------------------------------------------------- |
| Redirect URIs                   | ✅ `yipyy.com`, `www.yipyy.com`, **`*.yipyy.com`** → `/auth/callback` |
| JWT template                    | ✅ `{"role": "authenticated"}`                                        |
| Webhook endpoint                | ✅ `we_01M07TQ4QAPEKX0DBPX679DJNH`, Active, the 3 user events         |
| Vercel env (6 `WORKOS_*`)       | ✅ set on Production                                                  |
| Supabase trusts the prod issuer | ✅ **proved** — see below                                             |
| Google OAuth (Production)       | ✅ `state: Valid`, enabled, redirect URI verified, app published      |
| Google OAuth (Staging)          | ❌ empty — Google sign-in does not work locally                       |
| Apple OAuth                     | ❌ empty in both; needs an Apple Developer account                    |
| Deployed code                   | ❌ still Clerk (`pk_live_`, `clerk.yipyy.com`)                        |
| The 8 real identities           | ❌ exist in Staging only; Production has 0 users                      |

**The trust relationship was proved, not assumed.** A throwaway user was created
in the Production environment, authenticated, and its token presented to
PostgREST: `iss` was the production client, `role` was `authenticated`, and
Supabase answered **200**. A 401 `PGRST301` there would have meant the issuer was
unregistered — which fails silently and looks exactly like a broken account.

**Google's 100-user cap is the thing to watch after launch.** The consent screen
is published "In production", User type External, and the cap reads 0/100. Google
applies that cap only to **unapproved sensitive or restricted** scopes, and the
two requested here (`userinfo.email`, `userinfo.profile`) are neither — so it
should never bind, and no verification review is required. But the page says the
cap "cannot be reset or changed", so if the counter climbs with real sign-ins,
something is being treated as sensitive and there is a hard wall at 100 users.
Check it once in the first week; the product is sold at a scale where finding
this late would be very expensive.

**A WorkOS production API key is `sk_` + base64 — NOT `sk_live_`.** That was
assumed in three places and was wrong. It matters because a denylist on
`sk_live_` would pass every production key; `tests/e2e/_workos-keys.ts`
allowlists `sk_test_` instead, which is why its guard was correct anyway.

> **PRODUCTION AUTH IS CURRENTLY BROKEN, and deregistering Clerk is what broke
> it.** The deployed code signs in through Clerk, whose tokens Supabase no longer
> accepts, so sign-in appears to work and every read then fails. Two ways out:
> re-register Clerk in Supabase as a stopgap, or deploy the WorkOS code. Which is
> right depends on whether the site has real users — deploy is the real fix
> either way.

### 🟢 Eight Clerk-era profiles outlived the cutover — migrated 2026-08-17

**Resolved.** `scripts/migrate-clerk-era-identities.ts --apply` moved all eight
onto WorkOS **Staging** subjects, carrying every grant and every attribution
column. Verified after: 0 Clerk-era subjects, 0 orphaned memberships, 0 stuck
`@migration.invalid` placeholders, both platform admins still admins with
`is_platform_admin` consistent with `platform_memberships`, and the 3
`payment_intents` / 1 `payment_connections` / client link all still attributed.

The eight users were created **without a password and without sending mail** —
telling eight people to reset their password is a human's decision, not a
migration's side effect. Each uses the normal "forgot password" flow. That path
was _proved_ against a throwaway passwordless user rather than assumed: WorkOS
issues a reset token for a user who has never had a password, and the account
authenticates afterwards.

> **THIS MUST BE RUN AGAIN AT PRODUCTION CUTOVER.** One Supabase project serves
> both WorkOS environments, and these profiles now hold **Staging** subjects.
> When these people first sign in to Production WorkOS they get different ids and
> collide on `profiles_email_lower_key` exactly as they just did. Production has
> zero users today, so nothing was lost by choosing Staging first — but the
> re-run is a launch step, not an optional one.

The original finding, kept because it explains why the script exists:

### The problem it fixed

Phase 5 recreated the seven `@yipyy.dev` e2e identities. It did **not** touch the
real people, and `profiles` held eight `user_3H…` subjects:

| address                       | platform admin | facility grants | platform grants |
| ----------------------------- | -------------- | --------------- | --------------- |
| `admin@yipyy.com`             | **yes**        | 0               | 1               |
| `houssemsina123@gmail.com`    | **yes**        | 1               | 1               |
| `admin@doggievillemtl.com`    | no             | 1               | 0               |
| `clover-staff@yipyy.com`      | no             | 1               | 0               |
| `develop@yipyy.com`           | no             | 1               | 0               |
| `clover-test@yipyy.com`       | no             | 0               | 0               |
| `puneet@yipyy.com`            | no             | 0               | 0               |
| `singhparminder360@gmail.com` | no             | 0               | 0               |

This breaks two ways at once, and the ordering matters:

1. **A second front door to platform admin.** While Clerk remained registered,
   Supabase still accepted tokens from those Clerk instances. A token for
   `user_3HY8fk…` resolved to a row with `is_platform_admin = true`, and the
   Clerk app could still mint one. **Closed 2026-08-17** by deregistering Clerk
   in Supabase — verified afterwards that WorkOS is still trusted and all three
   roles still read Postgres, because removing the wrong entry there fails
   silently and looks like a broken account.
2. **Every one of these eight people is locked out of WorkOS sign-in.** None has
   a `user_01…` profile, so the first WorkOS sign-in hits
   `profiles_email_lower_key`: the webhook finds the address already claimed by
   another id, logs it, and returns **200 without writing a profile**. They end
   up authenticated with no profile — which RLS treats as a stranger, so every
   portal refuses them and no log says why. This is the exact failure the
   webhook's "one address, one identity" comment was written for; it is working
   as designed and the design assumes somebody resolves the duplicate.

**Deleting the rows is not sufficient and not safe on its own** — grants hang
off `profiles.id`, so dropping `houssemsina123@gmail.com` also drops a platform
membership and a facility membership. Whoever does this must decide, per person,
between re-granting after their first WorkOS sign-in and re-keying the existing
row to the new subject. That is an access decision, not a cleanup.

### Phase 5 verification — the end-to-end proof

Four provisioned accounts authenticated with their password, and each read
Postgres through RLS with its own token:

| account    | own profile | `is_platform_admin` | own roles     | can see             |
| ---------- | ----------- | ------------------- | ------------- | ------------------- |
| `admin`    | ✓           | **true**            | (none)        | 15 profiles, 9 mem. |
| `owner`    | ✓           | false               | `["owner"]`   | 6 profiles, 6 mem.  |
| `groomer`  | ✓           | false               | `["groomer"]` | 6 profiles, 6 mem.  |
| `customer` | ✓           | false               | `[]`          | 1 profile, 0 mem.   |

That is the whole chain working: password → `role: authenticated` → issuer
trusted → RLS scoping per caller. Staff seeing their facility's six staff is the
directory policy, not a leak; the customer sees only themselves.

**A first reading of this table looked like a security bug** — `owner` and
`groomer` appeared to be platform admins. They were not: the check was reading
row `[0]` of a multi-row result, which was the admin's row. Filter by
`id = auth.jwt()->>'sub'` before concluding anything about a caller's own flags.

**Still not exercised: the sign-in FORM.** These four authenticated through the
API, which is what the app's server action calls — but nobody has typed into the
browser and landed in a portal. Run the e2e suite for that.

## What does NOT change, and why that is the point

- **220 RLS policies.** They key on `auth.jwt()->>'sub'`; WorkOS supplies `sub`.
- **The schema.** Identity columns are already `text`, with no FK into
  `auth.users`. `profiles.id` changes its _values_, not its type.
- **~70 call sites.** `getViewer()`, `Viewer`, `landingPathForClaims()` and
  `createServerClient()` keep their signatures.
- **`facility_memberships`.** Tenancy never lived in the provider.

If a step in this plan starts requiring RLS edits, stop — something has been
misunderstood.

## Phase 0 — Prerequisites (blocked on the product owner)

1. WorkOS account; a **Staging** and a **Production** environment.
2. `WORKOS_API_KEY` and `WORKOS_CLIENT_ID` per environment.
3. In the WorkOS dashboard: enable **email + password** and **Google OAuth**.
   Apple needs Apple Developer credentials — same gap as Clerk, not a blocker for
   staging.
4. Configure the identity rules to match what was already agreed: **no username**,
   email as sole identifier, **first and last name required** at sign-up.
5. **JWT template** (Authentication → Sessions → JWT Template):

   ```json
   { "role": "authenticated" }
   ```

   Without this every token lands as `anon` and every query returns zero rows.

   **NOT the template in Supabase's WorkOS doc.** That one adds
   `"user_role": {{organization_membership.role}}`, which assumes you use WorkOS
   Organizations. Yipyy deliberately does not (ADR 0004 §5) — tenancy is
   `facility_memberships` — so that field would resolve to nothing on every
   token and buys a claim no policy reads. Validated against the live
   environment with `validateJwtTemplate`; applied to both.

### Facility subdomains — RESOLVED 2026-08-17

Facilities each get their own host (`pawradise.yipyy.com`, spec 002 D2), which
threatened both halves of the OAuth round trip. Both are answered, and neither
needs per-facility configuration:

- **Session cookie.** `WORKOS_COOKIE_DOMAIN=.yipyy.com` (leading dot) shares one
  session across every facility host. `WORKOS_COOKIE_PASSWORD` must match across
  hosts, which is free here — it is one deployment. **A wrong value fails
  silently**: sign-in appears to succeed and bounces back to the login page.
  Leave it UNSET for `localhost`; set `.yipyy.test` only when testing facility
  hosts locally, and then use `yipyy.test:3000`, not `localhost:3000`.
- **Redirect URIs.** WorkOS accepts a **wildcard**: `https://*.yipyy.com/auth/callback`
  validated and is registered on production, with `http://*.yipyy.test:3000/...`
  on staging. So a new facility needs no WorkOS change — matching how
  `src/lib/vercel/domains.ts` attaches its host without one.

Note that **email/password sign-in never redirects at all** — it is a server-side
API call — so only Google and Apple depend on any of this.

### Google OAuth credentials — OPEN

`connectionsByType(GoogleOAuth)` returns **empty in both environments**, and
`verifyRedirectUri` answers `OauthCredentialsNotFound` for both. Production
Google sign-in therefore cannot work until a real Google Cloud OAuth client is
configured (`updateOauthCredentials`) — the same gap ADR 0003 recorded for Clerk.
Whether the sandbox falls back to WorkOS-supplied credentials is **unverified**;
it needs a real sign-in to confirm.

## Phase 1 — Supabase trusts WorkOS

Register WorkOS as a third-party auth provider. Issuer:
`https://api.workos.com/user_management/<WORKOS_CLIENT_ID>`.

**Leave Clerk registered at the same time.** Supabase accepts several third-party
providers on one project (ADR 0003 already runs two Clerk instances side by
side), so this phase is additive and reversible. Nothing breaks yet.

_Verify:_ a hand-minted WorkOS token reaches Postgres and resolves to
`authenticated`, not `anon`.

## Phase 2 — The identity seam (the only risky phase)

| File                                                    | Change                                                                                                                                                 |
| ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `src/lib/supabase/clerk-server.ts` → `workos-server.ts` | Token source for the RLS-bound server client                                                                                                           |
| `src/lib/supabase/clerk-client.ts` → `workos-client.ts` | Same, client side; rename `useClerkSupabaseClient`                                                                                                     |
| `src/lib/auth/viewer.ts`                                | `auth()` → WorkOS session. **Signatures unchanged.**                                                                                                   |
| `src/lib/supabase/server.ts`                            | `auth()` → WorkOS session                                                                                                                              |
| `src/proxy.ts`                                          | `clerkMiddleware` → AuthKit middleware. **Keep `x-pathname` and `x-facility-slug` — they are unrelated to sessions and every portal gate reads them.** |
| `src/app/layout.tsx`                                    | `ClerkProvider` → `AuthKitProvider`                                                                                                                    |
| `src/components/facility/BrandingSettings.tsx`          | Import rename only                                                                                                                                     |

_Verify:_ sign in by hand, confirm `getViewer()` returns memberships and a portal
gate admits and refuses correctly.

## Phase 3 — Auth UI (custom, per ADR 0004 §4)

Rewrite on AuthKit's API, keeping `AuthCard`, `FacilityAuthBrand` and the
per-facility branded login intact:

- `EmailSignInForm.tsx` — email + password, forgot-password. **Drop the
  `needs_client_trust` branch**; device trust is Clerk-only.
- `EmailSignUpForm.tsx` — first/last name, email, password, email verification.
- `OAuthButton.tsx` + `GoogleSignInButton.tsx` + `AppleSignInButton.tsx` — retarget
  to WorkOS OAuth. The shared-button split survives.
- `src/app/sso-callback/page.tsx` — WorkOS callback in place of
  `AuthenticateWithRedirectCallback`.
- `src/lib/auth/sign-out-client.ts`, `src/components/customer/StrangerGate.tsx` —
  swap `useClerk()`.

**Delete outright** (ADR 0004 consequences): `PasskeysCard.tsx`,
`PasskeySignInButton.tsx`, `src/lib/auth/passkeys.ts`, the
`NEXT_PUBLIC_PASSKEYS_ENABLED` entries, and the two call sites in
`MyAccountSettings.tsx` and `customer/settings/page.tsx`.

_Verify:_ sign-up, sign-in, sign-out, Google, forgot-password, and a facility
host still showing its own brand.

## Phase 4 — User sync

Replace `src/app/api/webhooks/clerk/route.ts` with a WorkOS webhook. The logic is
mostly portable and its hard-won rules must survive verbatim:

- verify the signature **first**;
- service-role client, because a webhook carries no session;
- **never create `facility_memberships`** — membership is an admin grant;
- one address, one identity (`profiles_email_lower_key`), acknowledged with 200 so
  the sender stops retrying what can never land.

### Verified 2026-08-17 (Staging)

Endpoint `we_01M07XEDBMAN0RZGWP7F7PW2TX`, created with the CLI rather than the
dashboard — **the API returns the signing secret on creation**, so this is one
command and the secret never has to be copied by hand:

```
workos webhook create --api-key sk_test_… --url https://<host>/api/webhooks/workos \
  --events user.created,user.updated,user.deleted --json
```

Proven end to end against a real WorkOS user: `user.created` produced the
`profiles` row, `user.deleted` removed it, both logged 200. Two forged-signature
probes were refused 400 (`Timestamp outside the tolerance zone`) — worth keeping
as the diagnostic, because **400 and 500 mean different things here**: 400 is
reachable-and-configured, 500 is a missing secret or service-role key.

Local delivery needs a tunnel (`cloudflared tunnel --url http://localhost:3000`),
whose hostname changes each restart. **Update the endpoint's URL; do not create a
second endpoint** — the secret belongs to the endpoint.

Production is a separate endpoint with a separate secret, and is **not** done.

## Phase 5 — Identities and tests

- `scripts/provision-e2e-identities.ts` — rewrite on the WorkOS SDK.
- `tests/e2e/{_auth.ts,_clerk-keys.ts,global.setup.ts}` — `@clerk/testing` has no
  WorkOS equivalent; expect real sign-in in the setup project.
- **Recreate the 9 internal users rather than migrating them.** The data is demo
  and password hashes are not worth exporting at this size.

## Phase 6 — Cleanup

Remove `@clerk/nextjs`, `@clerk/backend`, `@clerk/testing`; drop `CLERK_*` from
`.env*`; deregister Clerk in Supabase; update `AGENTS.md`, `docs/architecture/overview.md`
and `docs/quality/debt-map.md`. Run `bun run prune`.

### Done 2026-08-17

`@clerk/nextjs` and `@clerk/testing` removed (`@clerk/backend` was never a direct
dependency); lockfile clean; `CLERK_*` and the `/.clerk/` keyless artifact gone.
Docs corrected in `AGENTS.md`, `CLAUDE.md`, `docs/index.md`,
`docs/architecture/overview.md`, `docs/quality/debt-map.md` — and in
`docs/legal/terms-of-service.md`, which named Clerk **as a subprocessor**. That
one is the reminder: a provider swap is a disclosure change, not only a code
change.

Dated snapshots in the debt map were **kept** and banner-marked rather than
rewritten. The vendor-specific mechanics are dead; the transferable lesson
("decode the JWT's `iss` first") is not, and rewriting history to match the
current provider would have thrown it away.

**The 20 Clerk agent skills were removed too** — 141 tracked files under
`.agents/skills/clerk*` plus their symlink mirrors. Not in the original scope,
and the reason they had to go is specific to this repo: `AGENTS.md` is the entry
point for every AI session, and a live `clerk-setup` skill advertising "add
authentication" is how a future agent reintroduces a provider that was
deliberately removed. Their `.gitignore` rule also turned out to be the reason
the WorkOS mirrors were left both untracked and unignored — absolute-path
symlinks that would break on any other machine. That rule is now one line per
vendor, with a note saying why a wildcard would be wrong.

## Gates

`bun run typecheck && bun run lint && bun run format:check`, plus `bun run build`
(Phase 2 changes the proxy and a layout). Manual walk of the
[sign-in journey](../../docs/product/critical-user-journeys.md) after Phases 2 and 3.

## Rollback

Phases 0–1 are additive. Through Phase 2, reverting is a git revert plus leaving
Clerk registered in Supabase. **After Phase 5 recreates identities, rollback means
recreating them again** — that is the point of no return, and it is cheap only
while the data is demo.
