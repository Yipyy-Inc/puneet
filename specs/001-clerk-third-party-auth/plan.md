# 001 — Implementation plan

Spec: [spec.md](spec.md). Decisions: start clean, big-bang, defer production.

## What grounding changed about the shape of this

**The 55 `auth.uid()` sites are not 55 independent rewrites.** Three
`SECURITY DEFINER` helpers in `20260726120000_tenancy_and_identity.sql` are the
chokepoint that most policies call:

```sql
private.is_platform_admin()   -- select p.is_platform_admin from profiles p where p.id = auth.uid()
private.member_facility_ids() -- select m.facility_id from facility_memberships m where m.profile_id = auth.uid()
private.has_permission(f, p)  -- ... where m.profile_id = auth.uid() ...
```

Rewrite these three and every policy that delegates to them follows for free.
Only the sites that compare an id directly, plus the 8 trigger bypasses and the
RPC guards, need individual attention.

**`private.custom_access_token_hook` is deleted, not replaced.** Re-reading it
against the helpers shows two separate consumers: the helpers query the
membership tables directly (they never read claims), while the hook injects
`app_metadata.memberships` into the token purely for **application** code —
`src/lib/auth/viewer.ts`. So RLS does not depend on it at all. Under Clerk,
`viewer.ts` resolves memberships with one indexed query instead, which also fixes
a staleness bug: a revoked membership currently survives in the token until it
refreshes, whereas a query reflects it immediately. This removes a migration
step, a manual dashboard toggle, and a class of bug.

**Reuse, do not recreate:** `Viewer`, `ViewerMembership`, `getViewer()`,
`landingPathForClaims()` and the portal gates keep their signatures. 73 files
import the Supabase client factories; none of their call sites change shape
because the seam is `viewer.ts` and the factory names.

## Legacy-zone contact (per debt-map.md)

- 🔴 **The service-role carve-out.** 8 trigger sites become
  `(select auth.jwt()->>'sub') is null`. The identical idiom in an **RPC** is the
  known publishable-key hole — in a function a null subject is a **refusal**.
  Step 6 handles these separately and `rpc-session-required.sql` gates it.
- 🟡 **Staff id namespaces** (`fs-*`, `emp-N`, numeric `users`). Clerk's `user_…`
  maps to `profiles`/`facility_memberships` only. Do not reconcile the mock-data
  namespaces here.
- No contact with `DataTable`, FormWizard, or the loyalty/training/calling
  parallel models. No page gains `"use client"`.

## Steps

Each step ends green. Postgres first, entirely behind the running app; the app
cuts over in one move at step 9.

### 0. Clear the decks

Commit or stash the unrelated in-flight work in `src/types/database.ts`
(`training_trainer_profiles`) and `series-edit-dialog.tsx`; decide `.agents/`
(commit or gitignore). Step 8 regenerates `database.ts` and will clobber it.
**Verify:** `git status` clean of unrelated modifications.

### 1. Widen the identity columns

`supabase/migrations/<ts>_clerk_identity_columns.sql` — drop the 9 FKs to
`auth.users`, retype `profiles.id` and `facility_memberships.profile_id` to
`text`, plus the 8 authorship columns
(`booking_tip_allocations.created_by`, `grooming_alert_notes.created_by`,
`grooming_price_adjustments.created_by`, `grooming_ticket_comments.created_by`,
`training_attendance.created_by`, `offboarding_task_states.completed_by`,
`staff_documents.uploaded_by`, `staff_signatures.signed_by`).
Re-point `facility_memberships.profile_id` at `profiles(id)`. Existing rows are
disposable (start-clean), so `using id::text` is sufficient.
**Verify:** `select` on each table; `facility_memberships_profile_id_idx` still exists.

### 2. Rewrite the three helpers

Same migration or `<ts>_clerk_rls_helpers.sql` — swap `auth.uid()` for
`(select auth.jwt()->>'sub')` in `private.is_platform_admin()`,
`private.member_facility_ids()`, `private.has_permission()`. Keep
`SECURITY DEFINER`, `stable`, `set search_path = ''`, and the existing grants
(`authenticated` only, never `anon`).
**Verify:** `select private.member_facility_ids();` as a Clerk-token session returns rows.

### 3. Convert the remaining direct policy sites

The `auth.uid()` occurrences that compare an id inline rather than delegating.
Wrap each as `(select auth.jwt()->>'sub')` so Postgres evaluates it once per
statement (InitPlan) rather than per row.
**Verify:** `grep -rn "auth.uid()" supabase/migrations/` returns only step 4/6 sites.

### 4. Convert the 8 trigger bypasses — carefully

`(select auth.uid()) is null` → `(select auth.jwt()->>'sub') is null`, preserving
"no subject means service_role" at:
`20260802120000_booking_write_integrity.sql:107`,
`20260802140000_staff_write_integrity.sql:63`,
`20260803090000_client_pet_write_integrity.sql:68,139`,
`20260803140000_onboarding_templates.sql:409`,
`20260803180000_onboarding_instances.sql:264,304`,
`20260804180000_offboarding.sql:349`.
**Verify:** `booking-write-integrity.sql`, `staff-write-integrity.sql`,
`client-pet-write-integrity.sql`, `onboarding-templates-rls.sql`,
`onboarding-instances-rls.sql`, `offboarding-rls.sql` all pass. Confirm a
service-role seed insert still succeeds.

### 5. Delete the access-token hook

Drop `private.custom_access_token_hook` and its grants
(`20260726160000_custom_access_token_hook.sql`). Nothing in RLS reads it; step 9
replaces its only consumer.
**Verify:** no reference remains; Supabase Dashboard → Auth → Hooks shows none selected.

### 6. RPC guards — refusal, not bypass 🔴

In `link_staff_invite` and the other guarded RPCs, `(select auth.jwt()->>'sub') is null`
must **raise**, checked before any lookup so errors cannot act as an existence
oracle. Do not copy step 4's pattern here.
**Verify:** `supabase/tests/rpc-session-required.sql` passes — this is the gate.

### 7. Run the full SQL suite

All 27 files in `supabase/tests/`, especially the cross-tenant ones
(`grooming-session-record-rls.sql`, `grooming-appointments-rls.sql`,
`grooming-catalogue-rls.sql`, `payments-store-credit.sql`).
**Verify:** every suite green. Also `bun run check:rls-writes`.

### 8. Regenerate database types

`src/types/database.ts` via Supabase type generation.
**Verify:** `bun run typecheck`.

### 9. Cut the app over

- `src/lib/auth/viewer.ts` — keep `Viewer`, `ViewerMembership`, `getViewer()`,
  `landingPathForClaims()`. Replace `supabase.auth.getUser()/getClaims()` with
  Clerk `auth()` for the subject, plus one indexed `facility_memberships` +
  `profiles` query for memberships and `is_platform_admin`.
- Swap `createServerClient`/`createClient` for `createClerkServerClient`/
  `useClerkSupabaseClient` across the 73 importing files.
- `src/proxy.ts` — drop `updateSession`; keep `clerkMiddleware`. Remove
  `src/lib/supabase/proxy.ts`, `server.ts`, `client.ts`.
- `src/lib/auth/` — rewire `portal-gate.ts`, `onboarding-gate.ts`,
  `permissions.ts`, `employee-identity.ts`, `sign-out-client.ts` (Clerk signOut).
  Delete `actions.ts` and `form-state.ts`.

**Verify:** `bun run typecheck && bun run lint && bun run format:check && bun run build`.

### 10. Remove the Supabase sign-in surface

Delete `src/app/login/`, `src/app/customer/auth/`, `src/app/staff/auth/`,
`src/app/groomer/auth/`, `src/app/auth/callback/`, and
`src/components/auth/SignInForm.tsx` + `AuthCard.tsx` if unused. Re-point every
`/login` redirect at `/sign-in`. Set `NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in`.
**Verify:** `bun run build`; `bun run prune` reports no new orphans;
`grep -rn "\"/login\"" src/` returns nothing.

### 11. User-sync webhook

`src/app/api/webhooks/clerk/route.ts` — `verifyWebhook(req)` from
`@clerk/nextjs/webhooks`, handling `user.created`, `user.updated`, `user.deleted`
into `profiles`. Idempotent on `svix-id`. Uses the service-role client
(`src/lib/supabase/admin.ts`) since it runs with no session. Add
`CLERK_WEBHOOK_SIGNING_SECRET` to `.env.example`.
No middleware change needed — `clerkMiddleware` protects nothing in this app, so
the route is already reachable.
**Verify:** `clerk webhooks listen --forward-to http://localhost:3000/api/webhooks/clerk`;
sign up a throwaway user and confirm a `profiles` row appears.

### 12. Recreate the 9 accounts

Create them in Clerk (matching emails), then insert their
`facility_memberships`/`is_platform_admin` rows against the new Clerk ids.
**Verify:** each signs in and lands in the right portal.

### 13. Delete the scaffolding

`drop table public.clerk_tpa_check;` and remove `src/app/test-clerk-supabase/`.
**Verify:** `bun run build`; route 404s.

### 14. Record the decision

ADR in `docs/architecture/decisions/` — Clerk as identity provider, Supabase as
database, native TPA (not the deprecated JWT template), `facility_memberships`
retained as the tenancy authority. Update `docs/architecture/overview.md` and
the debt map (the carve-out entry now says `auth.jwt()->>'sub'`).
**Verify:** `bun run format:check`.

## Green sequence

```
# per Postgres step
psql "$DB_URL" -f supabase/tests/<suite>.sql

# after step 7
bun run check:rls-writes

# after every app step
bun run typecheck && bun run lint && bun run format:check

# after steps 9, 10, 13 (structural)
bun run build
```

Then the manual walk-through in the spec: sign in with Google and Apple, click
the four portal journeys, and confirm the cross-tenant negative case.

## Rollback

Steps 1–8 are Postgres-only and the app still runs on Supabase Auth throughout,
so the cutover point is step 9. Before it, rollback is `git revert` plus a down
migration. After it, rollback means restoring the Supabase login pages — cheap
now (9 internal users, 1 authored row), which is exactly why big-bang was chosen.
