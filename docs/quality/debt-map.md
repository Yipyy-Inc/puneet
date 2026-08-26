# Debt map

The honest map of landmines, fragile areas, and missing coverage. **This file is append-only going forward:** future sessions add dated findings here instead of fixing-by-the-way. Fixing an item is a deliberate, scoped task — not a drive-by.

Severity: 🔴 high (easy to break things / actively misleading) · 🟡 medium · 🟢 low (cleanup).

## Snapshot (2026-06-20, from adoption audit)

### 🔴 No automated tests

There is no test runner and no `*.test.*` / `*.spec.*` in `src/`. Every change is verified only by typecheck/lint/build + manual UI inspection. Regressions in interactive flows are invisible to CI. **Do instead:** verify the touched [critical user journey](../product/critical-user-journeys.md) by hand and document it; when a test runner is introduced, do it as its own change + ADR and backfill the CUJs first.

### 🔴 `DataTable` is a shared blast radius

A large number of tables render through the one `DataTable` component. CLAUDE.md explicitly warns: additions must not break existing implementations. **Do instead:** extend via optional props with safe defaults; grep callers before changing its signature; never change existing prop semantics.

### 🔴 Parallel/duplicate domain models

Several domains carry two overlapping systems; editing the wrong one silently does nothing or corrupts the other:

- **Loyalty:** editable `useLoyaltyProgram` provider vs. read-only `useLoyaltyConfig`; two loyalty models. The editable one is REAL as of 2026-08-21 — see “The loyalty programme moved out of the browser” below.
- **Training:** two parallel enrollment systems.
- **Calling:** new `CallRoutingRule` (calling module) vs. old communications `RoutingRule`; and three distinct "tag" concepts (`inquiryTag` vs. `ActiveCall.tags` vs. `callLog.tags`).
- **Staff identity — three id namespaces for people.** `facilityStaff` (`fs-*`, the RBAC/employee-portal identity), `scheduleEmployees` (`emp-N`, the scheduling module — different people, and it spans the cafe and Laval too), and `users` (numeric, the legacy roster that `staffTasks`, `staffAvailability`, `staffPerformance`, `schedules`, `timeOffRequests` and `shiftSwapRequests` are keyed to). `users` ids 4–9 and `emp-1..6` are the same six people by name; **`fs-*` overlaps with neither**, so there is no mapping to discover — don't invent one.
  Mostly resolved. Facility staff are derived into `scheduleEmployees` under their own `fs-*` ids (see the header comment in `src/data/scheduling.ts`), so shifts belong to the signed-in employee by identity; and `staffTasks`, `staffAvailability`, `staffPerformance`, `shiftTasks`, `shiftSwapRequests`, `sickCallIns`, `timeOffRequests` and `schedules` are now keyed by `fs-*` too, with the personal screens resolving the viewer via `useFacilityViewer()`. **Still open:** `users` (numeric) remains the identity for client-facing records — `createdById` on report cards, payments, pets and tags — so anything authored by staff can't be attributed to a staff profile yet. **Do instead:** if you need that attribution, re-key those `createdById` fields; don't map `fs-*` onto a numeric id.
  **Do instead (generally):** confirm which model the task targets before editing; trace the provider/hook actually mounted on the route.

### 🟡 Client-component over-reach

168/266 `page.tsx` declare `"use client"`, against the Server-Components-by-default target. This inflates bundle/compile cost. **Do instead:** write new pages as Server Components and push interactivity into child client components; do **not** mass-convert existing pages in passing — that's a scoped refactor.

### 🟡 Types co-mingled with mock data

Many `src/data/*` files export types alongside data (e.g. `additional-features.ts`, `cash-drawer.ts`, `boarding-ops.ts`, `analytics.ts`), violating CLAUDE.md's separation rule. This couples type-only imports to data bundles. **Do instead:** new types go in `src/types/`; when you must touch one of these files, split opportunistically only if the task is about it.

### 🟡 Query layer adopted unevenly

`src/lib/api/` has 25 query factories, but components/libs still import directly from `src/data/` in places. Mixed access makes the "swap to real API" promise leaky. **Do instead:** new data access goes through `src/lib/api/` factories; don't add new direct `src/data/` imports in components.

### 🟡 Sparse resilience files

`error.tsx` exists only at the app root; `loading.tsx` only at root + `review/[token]`; `not-found.tsx` only at root + two training routes. A thrown error in a deep route takes down to the root boundary. **Do instead:** add `error.tsx` at `facility/dashboard/`, `customer/`, and `dashboard/` boundaries and `not-found.tsx` to dynamic routes as you touch them.

### 🟢 Committed debug artifacts at repo root

Tracked in git and stale: `cpdebug.log`, `grep.txt`, `.lint-results.json` (~2.4 MB), `typecheck.out`, `.typecheck-output.log`, `dev-server.out.log`, `dev-server.err.log`, `.tmp/pricing-scenario-check.ts`, and a mis-named `C:tmpverify_disc.mjs`. They bloat the repo and can mislead. **Do instead:** don't depend on them; removing them + gitignoring is a small dedicated chore (not in scope of unrelated work).

### 🟢 Stale doc reference

[CLAUDE.md](../../CLAUDE.md) references `@SPECIFICATION.md`, which does not exist anywhere in the repo. **Do instead:** treat product intent as living in [../product/](../product/); if SPECIFICATION.md is meant to exist, create it as its own task, otherwise update the CLAUDE.md reference.

### 🟢 Outdated/loose pins worth noting

`@anthropic-ai/sdk` is pinned `^0.82.0` and is the only real external dependency — watch for breaking changes in the `app/api/ai/*` handlers on upgrade. The lint setup turns `@typescript-eslint/no-unused-vars` off and has no `no-explicit-any` rule, so `any` and dead vars are caught by convention/`unused-imports` only, not a hard gate.

## Snapshot (2026-07-23, QuickBooks integration build)

### 🟡 Service catalog create/delete is React-state only

The HQ Service Catalog (`ServiceCatalogClient.tsx`) creates a service with `setServices((prev) => [service, ...prev])` over `useState(masterServices)`, and has no delete path at all (only per-location override removal). So a service "created" in the running app vanishes on reload and never reaches the `masterServices` module array. **Why it matters:** anything that reads the catalog as a source of truth — the QuickBooks new-service detection and deleted-service retention (`catalog-watch.ts`, `yipyy-catalog.ts`), verified correct against real edits to `src/data/service-catalog.ts` — is correct but currently has no live user action that can trigger it. **Do instead:** don't "fix" the QuickBooks side; the gap is the catalog module's missing persistence, and it closes when a real create/delete mutation (or backend) arrives.

### 🟡 QuickBooks Class tag is Sales-Receipt-only

`buildServiceSalesReceipt` applies the location `ClassRef` (Phase 8, `location-classes.ts`), but the invoice, refund-receipt and credit-memo builders do not, even though the real QuickBooks API takes `ClassRef` on all of them. **Why it matters:** a facility tracking by location gets a correct per-branch P&L on sales but silently unclassified refunds and invoices. **Do instead:** thread the same `resolveLocationClass` result through the other document builders before this ships; the resolver and the setting already exist.

### 🟡 QuickBooks document builders reach live events unevenly

The document builders (`src/lib/quickbooks/documents/`) and their enqueue points (`document-sync.ts`) are complete and unit-verified (`bun run check:quickbooks`, plus scratch probes). But several have no Yipyy trigger yet: gift-card _sales_, membership billing/cancellation, deposit collection/refund, and invoice payments/write-offs have entry points that nothing in the product calls. Wired today: retail checkout (sales receipt / invoice routing), retail returns (refund receipt / credit memo), package-pass redemption, gift-card _tender_ at checkout. **Why it matters:** the unwired paths are real code that looks done but is exercised only by tests. **Do instead:** wire each from its Yipyy event as that event gains a persistence seam; don't assume "builder exists" means "syncs in the app".

---

## Snapshot (2026-08-02, staff field exposure)

### 🟡 The staff screens still read the mock array, so the redaction is API-only

`/api/staff` now trims payroll, HR notes, the clock-in access code, `statusNote` and `permissionOverrides` for callers without `view_payroll` / `manage_staff` / `view_staff_permissions` (`redactStaffProfile`, proven by `tests/e2e/staff-field-exposure.spec.ts`). But `src/app/facility/dashboard/staff/page.tsx` still does `useState(facilityStaff)` — the mock array, imported directly — so **no staff screen consumes the redacted response today.** The one real consumer is `use-facility-rbac.tsx`.

**Why it matters:** the leak that mattered is closed (anyone signed in could `curl /api/staff` and read a colleague's salary), but the "Hidden — requires …" notices in `staff-form-sections.tsx`, `access-tab.tsx` and `staff-profile-sheet.tsx` are **unreachable in the running app** — verified by driving the editor as a manager with `view_payroll` revoked: the API withheld the figures, the screen rendered mock ones. Treat those notices as staged for the migration, not as something currently observed working.

**Do instead:** when moving the staff page onto `staffQueries.profiles()`, do **not** paper over the now-optional fields with `?? 0` / `?? {}` / `?? ""`. Absent means withheld. A zeroed default renders "$0/hr" as a fact, and — because the editor's draft is what Save writes back — an editable blank silently overwrites the real value with nothing. The guards that refuse to render in that state are the point of them.

---

## Snapshot (2026-08-04, SECURITY DEFINER RPCs reachable by `anon`)

### 🔴 The service-role carve-out belongs in a TRIGGER, never in an RPC

Two shipped RPCs were exploitable from the **publishable key** — the one in every browser bundle — with no session, no cookie and no account. Both had the same root cause and both are fixed (`20260804200000_rpc_require_session.sql`, plus the guard at source in `20260804180000_offboarding.sql`), with the exploits kept as tests in `supabase/tests/rpc-session-required.sql`.

The write-integrity **triggers** legitimately open with `if (select auth.jwt()->>'sub') is null then return new; end if;` — a trigger only fires on a write that already cleared RLS, so a missing JWT subject really does mean service_role, and the early return is how a seed inserts a catalogue without tripping its own rules. That reasoning **does not transfer to a function**. An RPC is a front door: `anon` reaches `/rest/v1/rpc/<name>` directly with no subject at all, so the carve-out written to admit the seed script admits the internet.

> Written as `auth.uid()` until 2026-08-05. An external provider owns identity (ADR 0003, now WorkOS per ADR 0004), so the subject is a text id and `auth.uid()`'s cast to `uuid` raises `22P02` rather than returning null — a guard written the old way errors instead of taking the bypass. The **principle** is unchanged; only the expression moved. Swapping Clerk for WorkOS did not move it again: both mint `user_…` text subjects, which is why 220 policies survived the migration untouched.

What it cost, both proven against the live project before the fix:

- `link_staff_invite('<staff legacy id>', '<my own user id>', '<my email>')` — a signed-up customer holding zero memberships became **`role=owner, is_active=true`** at that facility, because the function grants the role recorded on the _target_ staff row. `legacy_id`s are readable slugs, so the argument is guessable.
- `offboard_staff('<staff legacy id>', 'Termination')` — anyone could terminate any employee at any facility and revoke their access.

### 🔴 `revoke ... from public` is NOT `revoke ... from anon`

Both migrations already carried `revoke all on function … from public`, which is why the hole survived review — the line _looks_ like it shuts the door. Supabase ships `alter default privileges in schema public grant execute on functions to anon, authenticated, service_role`, so **every function in `public` is born with an explicit `anon=X` entry in its ACL**. Revoking from the `public` _pseudo-role_ is a different grant and leaves `anon=X` standing.

**Why it matters:** this is invisible in the migration diff. The only way to see it is `has_function_privilege('anon', p.oid, 'execute')` or `proacl`, and neither is something a reviewer reads by default. It was found by `get_advisors`, not by reading the SQL.

**Do instead**, for every new SECURITY DEFINER function in `public`:

1. Treat a null subject — `(select auth.jwt()->>'sub')` — as a **refusal**, not a bypass, and check it _before_ any lookup, so a "no such record" error can't be used as an existence oracle by an unauthenticated caller. **Not `auth.uid()`:** since an external provider owns identity (ADR 0003/0004) that function casts the subject to `uuid` and an id like `user_01M07…` makes the cast _raise_ `22P02`, so a guard written with it fails instead of refusing.
2. `revoke execute … from anon` **by name**, _and_ `from public`. Neither is a substitute for the other — see the entry below.
3. Add it to the `V7` sweep in `supabase/tests/rpc-session-required.sql`, which fails on any anon-callable function in `public` outside the four token RPCs.

The four onboarding token RPCs (`onboarding_by_token`, `save_onboarding_section`, `submit_onboarding`, `set_onboarding_account_complete`) **keep** their `anon` grant deliberately — a new hire has no account by definition, the token is the credential, and it is verified by hash _inside_ the function rather than as a policy predicate (`20260803180000`). Locking those down would break every invite; `V4` exists to catch a fix that overreaches in that direction.

### 🔴 …and `revoke … from anon` is not `revoke … from public` either (2026-08-05, third occurrence)

The mirror of the entry above, and it cost a second migration to notice. `V7` was found **red** on the live project: four functions in `public` were `anon`-callable — `record_boarding_arrival`, `set_booking_tip_split` (both SECURITY DEFINER), `prevent_grooming_history_mutation` and `prevent_money_mutation`.

`revoke execute … from anon` closed the first two and left the other two open. Their ACLs began `=X/postgres` — **an empty grantee means `PUBLIC`** — so `anon` held EXECUTE by inheritance rather than through its own entry, and revoking its own entry removed a grant that was not the one doing the work.

So the two entries together are the whole rule: **revoke from `anon` AND from `public`, then assert with `has_function_privilege()`** rather than by reading the grant statements. Whichever one you check, the other is the one that bites.

Neither SECURITY DEFINER function was privilege escalation — `private.has_permission()` returns false without a subject. But both looked the booking up **before** the permission check and raised a distinguishable `P0002` ("That booking does not exist.") versus `42501`, and under SECURITY DEFINER that lookup bypasses RLS. An unauthenticated caller could enumerate valid booking refs by comparing error messages: the existence oracle that rule 1 above already warns about, shipped anyway. Fixed in `20260805210403` + `20260805210435`.

### 🟡 The RLS test harness sets `request.jwt.claims`, not `request.jwt.claim.sub`

Do not "simplify" it back. The two are not interchangeable:

```
auth.uid()  → request.jwt.claim.sub (scalar), FALLING BACK to the claims JSON
auth.jwt()  → request.jwt.claim / request.jwt.claims (JSON) only
```

A harness that sets the **scalar** is invisible to `auth.jwt()`. Every policy written against `auth.jwt()->>'sub'` would then see a null subject and the suite would fail — or worse, pass vacuously — for a reason that has nothing to do with the policy under test. The JSON form satisfies **both** functions, which is why all 27 suites use it.

Note also that "no session" is `set_config('request.jwt.claims', '', true)`, **not** `{"sub":""}`. The latter leaves `auth.jwt()->>'sub'` as an empty string rather than NULL, which silently weakens every unauthenticated assertion.

---

## Snapshot (2026-08-05, grooming migration)

### 🟡 FOUR representations of "a grooming add-on", and now a fifth that is canonical

Found while wiring the grooming catalogue to Postgres. All four exist today:

| Source                                                                                                | Shape                                                                                              | Consumed by                                                   |
| ----------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| `GROOMING_ADD_ONS` — [src/data/grooming-add-ons.ts](../../src/data/grooming-add-ons.ts)               | flat `id / name / price / duration`                                                                | the booking form (`GroomingDetails.tsx`)                      |
| `groomingAddOnsList` — [src/data/grooming-pricing-rules.ts](../../src/data/grooming-pricing-rules.ts) | its own list, matched **by name**                                                                  | `check-in-confirmation-dialog.tsx`                            |
| `groomingAddOnSchema` — [src/types/grooming.ts](../../src/types/grooming.ts)                          | `id / name / description / price / duration / isActive`                                            | the canonical _type_, backing `GroomingPackage.defaultAddOns` |
| `ServiceAddOn` — [src/data/service-addons.ts](../../src/data/service-addons.ts)                       | rich, cross-service (`applicableServices: ["daycare","boarding"]`, scheduling, tasks, pet filters) | the grooming **rates** screen's Add-ons tab                   |

**The resolution:** `public.grooming_add_ons` (20260805100000) matches `groomingAddOnSchema` and is the canonical grooming add-on. `ServiceAddOn` is **not** the same concept and is deliberately left alone — it is a platform-wide upsell registry that also covers daycare and boarding, and collapsing it into the grooming table would lose the other services. The two loose arrays are duplicates that should converge on the table as their consumers migrate.

**Why it matters:** `check-in-confirmation-dialog.tsx:305` resolves an add-on **by name** (`groomingAddOnsList.find((a) => a.name === name)`). Once appointments carry real add-on rows with snapshotted names, a facility renaming an add-on breaks that lookup silently — the line keeps its price on the appointment (correct) but the dialog stops finding its metadata.

**Do instead:** when migrating a grooming screen, check which of the four it reads before assuming. New code uses `grooming_add_ons` via the API. Do **not** fold `ServiceAddOn` into it. Do not add a fifth.

### 🟡 The grooming rates screen writes to the query cache, not to anything

[grooming-rates.tsx:441](../../src/components/facility/grooming/grooming-rates.tsx#L441) deletes a service with `queryClient.setQueryData(...)` and reports success. Service charges live in `useState(INITIAL_SERVICE_CHARGES)`. Both vanish on reload — the same failure just fixed in the onboarding/offboarding template editors, where the toast was the only thing that happened.

**Do instead:** the services half is migrated (real CRUD through `/api/grooming/services`). The **service charges** tab and the **add-ons** tab are still cache/`useState` only — treat their success toasts as unproven until they move.

---

## Snapshot (2026-08-06, grooming waitlist)

### 🟡 "Afternoon" means two different things, and only one of them survives

The waitlist type carries a legacy 3-way `preferredTimeWindow` beside the structured `expectedTime`, and the matcher reads them with **different rules** ([grooming-waitlist-matcher.ts](../../src/lib/grooming-waitlist-matcher.ts)):

| Field                              | "afternoon" means                |
| ---------------------------------- | -------------------------------- |
| `preferredTimeWindow` (legacy)     | 12:00 onward, no ceiling         |
| `expectedTime.period` (structured) | 12:00–17:00; 17:00+ is `evening` |

`public.grooming_waitlist_entries` stores **only** the structured half (20260806100000, Decision 1), so every entry from Postgres uses the narrower reading. A client who says "any afternoon" is no longer auto-offered a 17:30 slot; they need `evening` as well.

**Why it matters:** the legacy branches in `timeMatchesPreference` and `stylistMatchesPreference` are now unreachable for any real entry, but they still compile and still look live. Someone reading the matcher will reasonably assume both paths are exercised.

**Do instead:** build new waitlist entries with `expectedDate`/`expectedTime`/`preferredStylistIds`/`comment` only. Treat the four legacy fields as read-only compatibility for non-Postgres callers; do not add a code path that writes them. The legacy branches come out when the last such caller does.

### 🟡 "Convert to Booking" leaves the client on the waitlist

[check-in-board.tsx](../../src/components/facility/grooming/check-in-board.tsx) — Zone 3's convert action prefills the booking dialog and toasts, but never moves the entry to `confirmed`. The same is true of the panel's **Book Now**: it calls `onBookFromWaitlist` without a status write (**Mark Confirmed** on an _offered_ entry does write, so the offered path is fine).

Pre-existing, and unchanged by the migration — but it used to be invisible because the queue lived in one browser. Now the row is real and shared, so a converted client stays on every colleague's board until somebody removes them by hand.

**Do instead:** wire the status write to the booking dialog's success callback, not to the button — the button only opens a form the user can cancel, and marking somebody confirmed for a booking that was never made is the worse error.

---

## Snapshot (2026-08-06, grooming session record)

### 🟡 The note persists; the record of who wrote it does not

`recordHistory` on [appointment-detail-page.tsx](../../src/components/facility/grooming/appointment-detail-page.tsx) is called from the very functions that now write to Postgres. Adding an alert stores the alert **and** appends an "Alert added" line to React state — so after 20260806140000 the note survives a reload and the audit line does not.

Strictly better than before (nothing survived), and not finished. `history` is deliberately absent from that migration because an append-only audit trail needs the immutability enforcement the audit log already has (trigger + `REVOKE`, not merely an absent policy) — an audit trail somebody can edit is worse than none, and that deserved its own pass rather than a rider.

**Do instead:** when migrating `history`, enforce immutability at the table, not in the route. Note that `AppointmentHistoryEntry` is a union in practice — a freeform `description` OR a structured `fieldChange {field, before, after}` — so it wants the discriminant-plus-CHECK treatment from 20260806100000, not a nullable-everything row.

### 🟢 Mirror the parent, or name the permission — not both by habit

Caught by T6 of [grooming-session-record-rls.sql](../../supabase/tests/grooming-session-record-rls.sql) before it shipped. The first cut of the read policy on the two note tables reused `using (exists (select 1 from public.bookings b where b.id = booking_id))` from `grooming_price_adjustments`. Because `bookings_read` deliberately lets a client read their **own** bookings, that handed the customer every internal note on their dog — the safety alerts and the bather-to-groomer thread.

**The rule:** mirror the parent for child rows the customer is _entitled_ to see (a price adjustment is a line on their bill). Name the permission for child rows they are not (an internal note). Copying the policy shape without asking which kind you have is how the leak got written.

## Snapshot (2026-08-06, appointment history trail)

### 🟢 An immutable table can hold no foreign keys — and cannot be probed live

Two things fell out of building `grooming_appointment_history` (20260806160000) that will bite anyone adding another append-only table.

**1. Every FK is a mutation.** The obvious schema gives the table three, matching its sibling child tables. All three are wrong, because the immutability trigger refuses the write the FK would perform:

| FK                                | On parent delete | Refused by |
| --------------------------------- | ---------------- | ---------- |
| `booking_id … on delete cascade`  | DELETE history   | trigger    |
| `facility_id … on delete cascade` | DELETE history   | trigger    |
| `created_by … on delete set null` | UPDATE history   | trigger    |

They do not corrupt the trail — they make the **parent rows undeletable**, failing with an error about an audit trigger that says nothing about the booking somebody is trying to remove. So the table holds identifiers and validates them once at insert (`private.grooming_appointment_facility()` raises `23503` when the appointment does not exist). The trail then outlives the appointment, which is the point rather than a side effect.

**2. Never probe one outside a transaction.** The immutability probe was first run through a plain `execute_sql`, which auto-commits. It left two fabricated entries against a real booking that **no role could delete** — the table had to be `DROP`ped and recreated to clear them. DDL is deliberately not blocked; the guard is DML-scoped.

**Do instead:** for any append-only table, put every assertion inside `begin; … rollback;` (see [grooming-history-immutability.sql](../../supabase/tests/grooming-history-immutability.sql), which says so at the top), hold identifiers rather than references, and assert immutability **as the owner** — RLS is bypassed by `service_role`, so a test that only runs as `authenticated` proves nothing about the guarantee.

## Snapshot (2026-08-06, storage policies)

### 🔴 `facilities.name` shadows `storage.objects.name` inside a policy subquery — FIXED, but read this before writing another

The natural way to write a storage policy that gates on a facility path prefix:

```sql
and exists (select 1 from public.facilities f
             where f.id::text = (storage.foldername(name))[1]
               and private.has_permission(f.id, 'manage_staff'))
```

is **silently, completely broken**. `public.facilities` has a column called `name`, so the unqualified `name` inside the subquery binds to the **facility's** name, not the storage object's. The predicate compares a facility id against a segment of that facility's own name, matches nothing, and raises nothing.

**It was live in `staff_documents_object_*` (20260804090000)** from the day it shipped until 20260806200000:

| Policy | Effect of the bug                                                                 |
| ------ | --------------------------------------------------------------------------------- |
| read   | the employee's own-prefix arm worked; **`manage_staff` could read nothing**       |
| insert | same — a manager could not upload on a hire's behalf                              |
| delete | the manager arm was the **only** arm, so **nobody could delete a staff document** |

It fails **closed**, so no file was ever exposed — a functionality bug, not a leak. But the migration's own header promises documents are "deletable by `manage_staff`" so a passport scan can be destroyed on request, and that had never worked.

**How it was found, which is the transferable part:** the same mistake was made in the new `grooming-photos` policies, and the test caught it _only_ because the suite asserts the positive case. `S1 — a facility CAN upload under its own prefix` failed, which revealed that `S2 — cannot upload under another facility's prefix` had been passing **vacuously** all along. A suite with only the negative half reports a healthy security boundary on a policy that denies everyone.

**Do instead:** compute the path segment in the **outer** scope and compare it against a set — `(storage.foldername(name))[1] in (select f.id::text from public.facilities f where …)` — which removes the shadowing rather than papering over it with a qualified reference. And for every deny-assertion, write the matching allow-assertion next to it; a negative control with no positive control is not a control.

Note also: `storage.objects` refuses direct `DELETE` from SQL ("Use the Storage API instead"), so delete policies cannot be exercised in a psql test at all — cover them by asserting the identical predicate on insert.

## Snapshot (2026-08-06, photos and intake wiring)

### 🟡 The check-in dialog's own before-photos are still blob URLs

The session panel uploads photos for real (20260806180000). The **check-in confirmation dialog** captures its own `result.beforePhotos` and those still come through as `URL.createObjectURL` blobs — `applyCheckInResult` used to fold them onto `intake.beforePhotos`, and its `intakePatch` now deliberately omits the field, because photos are rows with their own upload path rather than a list carried on the intake.

**Effect today:** a photo taken in the check-in dialog is not stored anywhere. It is no longer silently written into the intake record as a URL that dies on reload — which was worse, because a dead blob URL renders as a broken thumbnail on a fee justification — but it is not saved either.

**Do instead:** wire the dialog's capture to `useUploadAppointmentPhoto` with `kind: "before"`, the same way `handleBeforeFiles` in the session panel does. The route, the bucket policies and the hook all already exist; this is the one call site left.

### 🟢 `intake.issues` and `intake.careLog` remain local

Deliberately out of 20260806180000. An issue auto-creates an incident record and notifies a manager; the care log seeds from the pet's feeding and medication schedule. Both belong to systems that have not been migrated, and giving them columns now would mean guessing at the incident table's shape before it is written.

**Do instead:** migrate them with the incident system, not with intake.

## Snapshot (2026-08-06, packages and the QuickBooks pass sync)

### 🟡 `syncRedeemedPassToQuickBooks` no longer has a caller

Removed deliberately, not overlooked. `applyPaymentResult` used to redeem the pass by mutating `mockCustomerPackages` and then hand the resulting redemption object to `syncRedeemedPassToQuickBooks`. The redemption now happens server-side inside `record_payment` (20260806300000), so there is no mock redemption object to pass, and the QuickBooks call went with it.

**Why it was not kept:** feeding QuickBooks from a mock array while the real ledger lives in Postgres would mean the accounting system is told about redemptions that did not happen and not told about the ones that did. A sync with no caller is visibly incomplete; a sync fed from the wrong source is invisibly wrong.

**Do instead:** hang the sync off the server's answer. `record_payment` returns `{payment_id, passes_remaining}` and the entry is in `package_pass_entries` with its booking, pet and service label — everything the document builder needs, from the row that is actually true. Do **not** restore the `mockCustomerPackages` path.

### 🟢 `applyPaymentResult` returns `packagePassesLeft: undefined`

The field stays on `PaymentActionSummary` because three call sites read it for a toast, but it can no longer be known at that point — the pass is spent by the database, and the count comes back through `useRecordPayment` as `passesRemaining`.

**Do instead:** read the count from the mutation's response, not from the summary. The field comes off the summary when the last caller stops reading it.

## Snapshot (2026-08-06, three package models)

### 🔴 THREE types called "package", and the one in `src/types/` is not the one the screen edits

A fourth entry for the parallel-model list at the top of this file, and the one that cost a rebuild:

| Type                     | Where                                   | Shape                                                                                                                  | Who uses it                                      |
| ------------------------ | --------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| `PrepaidPackage`         | `src/types/packages.ts`                 | one `serviceId`, `totalPasses`, `price`                                                                                | the customer portal and `payment-dialog`'s props |
| `GroomingPrepaidPackage` | `src/data/grooming-prepaid-packages.ts` | `services[]`, `regularPrice`/`packagePrice`/`savings`/`savingsPercentage`, 7-field `policy`, `status`, `purchaseCount` | **the facility screen that edits packages**      |
| `CustomerPackage`        | `src/types/packages.ts`                 | ownership + `passesUsed` + `redemptions[]`                                                                             | redemption at the till                           |

20260806280000 was built against the first one because it lives in `src/types/` and looks canonical. It is not: `GroomingPrepaidPackages` — the screen a facility actually uses — edits the second, and `gpp-003` in that fixture **bundles two services**. A single pool of passes cannot express "5 Full Grooms and 2 Nail Trims", so the schema was rebuilt in 20260806320000 with one pool per service.

**Why it matters beyond packages:** `src/types/` being the canonical home for types is a convention this repo follows _unevenly_ — several richer domain models live in `src/data/` beside their fixtures. Picking the one in `src/types/` because it is in `src/types/` is not grounding.

**Do instead:** before modelling a domain, find the SCREEN that edits it and read the type that screen imports. Grep the component, not the types directory. If two types share a name-stem, assume they are different concepts until proven otherwise — that is what the rest of this section has been recording since June.

## Snapshot (2026-08-22, the other half of the anon rule)

### 🔴 `revoke ... from anon` does NOT remove `PUBLIC` — the same fact, from the side nobody wrote down

This repo has recorded twice that **`revoke ... from public` does not remove `anon`** (both entries above). Acting on that rule on 2026-08-22 produced the mirror-image bug: a migration revoking EXECUTE `from anon` on eleven functions, applied to production, that **changed nothing at all**. V7 failed straight afterwards naming the same eleven.

```
approve_shift_swap  {=X/postgres, postgres=X/postgres, authenticated=X/postgres, service_role=X/postgres}
                     ^^ an EMPTY grantee is PUBLIC — and there is no `anon=X` to remove
```

Both halves are one fact: **`public` and `anon` are separate ACL entries, and a revoke removes only the entry it names.** Written down only forwards, it reads as a rule about `anon` being sneaky. It is not. It is a rule about revokes being literal.

Why the half-rule survived so long: the working migrations all say `from public, anon`, which looks like belt-and-braces rather than two necessary halves — so it is invisible as a lesson right up until somebody writes only one of them. `award_loyalty_badge` (20260822400000) came out correct **by luck**: its original migration had already said `from public`, so the fix completed a pair rather than starting one. Reading that fix as the pattern reproduces half of it, which is exactly what happened.

**The real lesson is not about grantees.** A revoke that names a privilege the role does not hold **succeeds silently** and is indistinguishable from one that worked. So:

**Do instead:** never treat a `revoke` as done because the statement ran. Assert it afterwards against `has_function_privilege('anon', p.oid, 'execute')` — the question you actually mean — not against the text of `proacl` and not against the migration having applied. Fixed in 20260822610000; asserted by V7 in `supabase/tests/rpc-session-required.sql`, which caught it within a minute of the first attempt.

### 🟡 An allowlist needs an assertion pointing the other way

V7 sweeps for functions that **gained** an anon grant. It is silent about one that **loses** it — so a revoke written slightly too wide could take every facility's branded sign-in page down while turning the test file green. `facility_branding_by_slug` must stay anon-callable: `src/lib/api/facility-branding.ts` calls it with the publishable key and no session, because the visitor is by definition not signed in yet.

**Do instead:** every allowlist entry gets a matching positive assertion. V8 now asserts `facility_branding_by_slug` is **still** anon-callable. A one-sided sweep only tests the direction you were worried about when you wrote it.

## Snapshot (2026-08-06, selling and spending packages)

### 🔴 `revoke ... from public` does NOT revoke from `anon` — for the second time

20260806380000 shipped `purchase_package` with `revoke all on function ... from public` and nothing else. Checked the ACL immediately afterwards rather than assuming:

```
purchase_package     postgres=X | anon=X | authenticated=X | service_role=X
redeem_package_pass  postgres=X |          authenticated=X | service_role=X
```

Supabase grants EXECUTE to `anon`, `authenticated` and `service_role` **by name**. `public` is a different grantee; revoking from it removes the default grant and leaves all three named ones intact. The neighbouring function, written with an explicit `revoke ... from anon`, was clean.

It was not exploitable — `purchase_package` is SECURITY INVOKER and every policy on `customer_packages` is `to authenticated`, so an anonymous caller would have raised on the first write. That is not a defence: the reason it was safe lived in a different file, and it stops being true the day somebody adds an anon read policy for a customer portal.

**This is the same finding as the storage-policy entry above.** Twice in one schema means it is not a slip, it is a missing habit.

**Do instead:** every `create function` that is not meant for the public gets `revoke execute ... from public, anon` — **both grantees**, see the correction below — and the ACL is read back with `select proacl from pg_proc` before the migration is called done. Fixed in 20260806400000; asserted by P10 in `supabase/tests/prepaid-packages.sql`.

> **⚠️ CORRECTED 2026-08-22.** This entry used to end: _"Sweeping for the shape is cheap: `where p.proacl::text like '%anon=X%'`."_ **That sweep is wrong and finds only half the exposed functions.** It missed all eleven found on 2026-08-22, because their ACLs read `{=X/postgres, ...}` — an EMPTY grantee, which is `PUBLIC` — with no `anon=X` entry at all. `anon` is a member of `PUBLIC`, so `has_function_privilege('anon', …)` was true the whole time. The correct sweep asks the question directly rather than pattern-matching the ACL text: `where has_function_privilege('anon', p.oid, 'execute')`. That is what V7 in `rpc-session-required.sql` does, and it is why V7 caught what this recommendation could not.

### 🔴 A test file that cannot compile against its own schema reads as coverage

`supabase/tests/prepaid-packages.sql` was written against the FIRST package schema and left in place when 20260806320000 replaced it. Every assertion referenced columns that no longer existed (`prepaid_packages.price`, `.service_id`, `.total_passes`), so the file errored on its first statement — seven tests that had silently stopped testing anything, in a directory whose contents are read as proof.

**Do instead:** when a migration replaces a table, the suite that covers it is part of the same change, not a follow-up. Rewritten and extended to 10 assertions.

### 🟡 `passes[0]` was the redemption target everywhere

Both redemption call sites — `BookingModal` and `new-appointment-dialog` — spent `pkg.passes[0]`. Harmless while every fixture package held exactly one service, and wrong the moment a real bundle holds two: a customer booking a bath would have had a **Full Groom** pass taken instead, worth nearly twice as much. `passes[0]` could also point at an already-exhausted pool.

The API now requires an explicit `serviceId` and refuses rather than guessing. The grooming dialog aims precisely (it knows the catalogue service being booked, and its eligibility filter now checks the matching pool has passes left). `BookingModal` knows only the module, so it takes the first pool for that module **with passes remaining** — better than `passes[0]`, still not precise. Noted rather than hidden.

**Do instead:** when wiring a third redemption surface, give it the service id. If a screen cannot say which pool it is spending, that is a bug in the screen, not something the database should paper over.

### 🟡 `syncRedeemedPassToQuickBooks` was nearly dropped silently, and its pass numbering was wrong

Removing the mock redemption path left this with zero callers (see the previous snapshot). Restoring it revealed a live bug: it derived `passNumber` as `pkg.passesTotal - passesLeft`, but `redeem_package_pass` returns what is left **in the pool it drew from**. Against the Puppy First-Year Plan (six grooms, two baths), spending the first bath would have posted "pass 7 of 8" to the books.

It now takes the pool it spent from and both numbers describe that pool.

**Do instead:** when a function starts returning a narrower quantity than it used to, grep for arithmetic on its result. A number that changed meaning typechecks perfectly.

### 🟢 `moduleId: "grooming"` is a constant in the customer-package mapper

`passes[].moduleId` is what `BookingModal` and the check-in board filter on. It is not a column — `customer_packages` hangs off `prepaid_packages`, which is the grooming catalogue, so the constant is currently true rather than a guess.

**Do instead:** when a second module sells packages, this becomes a real column. Do not add a second constant.

### 🟢 The customer portal still has a second, unrelated package model

`src/lib/customer-package-purchases-store.ts` + `services-pricing.ts`'s `CustomerPackagePurchase` power "Buy Passes & Bundles" and `PackagesTab` in the customer portal. Untouched by this work, and still fixtures. That is a fifth entry for the parallel-model list — the facility side now reads Postgres while the portal's own purchase flow does not.

**Do instead:** migrate it onto `purchase_package` rather than repointing it, and delete the store. The RPC already does what that store fakes.

## Snapshot (2026-08-06, the portal's packages join the same tables)

### 🔴 TWO service catalogues name the same service differently, and only one is in Postgres

The blocker found while migrating the portal, and the one thing this work did **not** fix:

| Catalogue                   | Where                                  | "a bath"                           |
| --------------------------- | -------------------------------------- | ---------------------------------- |
| `grooming_services` (table) | Postgres, seeded                       | `groom-pkg-001` Basic Bath, **35** |
| `services` (fixture)        | `src/data/services-pricing.ts`, srv-\* | `srv-005` Bath & Brush, **40**     |

The portal's packages are priced in `srv-*`; the facility's grooming packages in `groom-pkg-*`. Both now live in `prepaid_packages`, and each loop is internally consistent — a portal pass is bought and spent in `srv-*`, a counter pass in `groom-pkg-*`.

**The consequence, which predates this work and survives it:** a grooming pass bought in the customer portal is not spendable at the grooming counter. The counter filters pools by `groom-pkg-*` and will never match `srv-005`.

**Why it was not fixed here:** deciding that "Bath & Brush at 40" and "Basic Bath at 35" are the same service is a product decision, and merging them silently reprices one of them. Migrating `services` into Postgres and reconciling the two is its own change, with someone who can answer that question.

> **Resolved 2026-08-06** (`20260806580000`). Two claims above were wrong, and reading the two definitions was enough to settle both. They are not "two catalogues of the same thing": `services-pricing.ts` is the platform-wide list spanning boarding, daycare and training, and only its two grooming rows overlap with anything. And it needed no product decision — `srv-005` is described as "Basic bath, blow dry, brush out, ear cleaning, and nail trim" and `groom-pkg-001` includes exactly those five things in the same 60 minutes. The grooming lines now name `grooming_services`, a trigger keeps them there, and the price follows the catalogue. See the 2026-08-06 snapshot below for what that repricing exposed.

### 🟡 A bundle spanning two counters renders as one card with one icon

`CustomerPackagePurchase` — the portal's owned-pack shape — has a single `category` and `serviceLabel`, so it cannot fully describe the Weekend Getaway (2 nights boarding + 1 bath). `recordToPurchase` keeps **one card per purchase**: the price and the total pass count are right, `serviceLabel` names every service, and each pass row says what it was spent on. What is lost is per-pool remaining counts on the card face, and the theme icon reflects only the first pool.

The alternative — one card per pool — was rejected because `pricePaid` is per purchase, so a two-pool pack would show the full price twice and read as a double charge.

**What the mock did, for contrast:** collapsed the bundle to `services[0]` for the label while summing all quantities, so a Weekend Getaway displayed as "3 × Standard Boarding". One of those three was a bath.

**Do instead:** if per-pool detail is wanted on the card, give the card the pools, not more cards.

### 🟡 `is_popular` and `popularity_rank` are two fields for one idea

The grooming screen edits `is_popular` as a switch. The portal shop needs rank — it badges 1 as "Most Popular" and 2 as "Best Value", which a boolean cannot express. Both columns now exist; the seed keeps them consistent (`is_popular` = rank 1).

**Do instead:** collapse them only alongside the product decision about whether the grooming screen's switch becomes a rank picker.

### 🟢 `PassUsage.status = "refunded"` has no source, and `adjustments` is always empty

`recordToPurchase` never produces a refunded pass and always returns `adjustments: []`. That is not a gap introduced here: **nothing in the app has ever created a package adjustment.** The fixture carried decorative extension/refund history that no code path wrote, and the policy columns (`allow_refund_unused`, `allow_extension`, `allow_transfer`…) describe acts the ledger cannot yet record.

**Do instead:** a refund or an extension is a `package_pass_entries` row with `reason = 'adjustment'` plus a record of the money — not a status flipped on a pass.

### 🔴 `SELECT … FOR UPDATE` silently returns nothing when the UPDATE policy denies you

The sharpest finding of this work, and it generalises well beyond packages.

`redeem_package_pass` opened with `select … from customer_packages where id = $1 **for update**`. Under RLS, Postgres applies the table's **UPDATE** policy when locking rows, not just the SELECT policy. The only UPDATE policy there requires `financial_take_payment`, which a customer does not hold — so the portal's "Book with Pass" broke the moment it was pointed at the real function.

Measured, as the same customer, in one transaction:

```
select count(*) … where id = X             -> 1
select count(*) … where id = X for update  -> 0, and NO ERROR
```

**The silence is the danger.** The locking read does not raise `insufficient_privilege`. It returns zero rows, the function's own "does not exist, or is not yours" fires, and the message sends the reader to investigate ownership — the one thing that was fine.

Fixed in 20260806480000 with `pg_advisory_xact_lock(hashtext(id::text))`, which serialises redemptions of the same package without needing any privilege on the row. The two alternatives were both worse: granting customers UPDATE on `customer_packages` is the right to rewrite a purchase's price and expiry, and SECURITY DEFINER would suspend every caller's RLS to fix a lock.

**Do instead:** before adding `for update` to a row a non-owner role must read, check whether that role passes the table's UPDATE policy. If it does not, reach for an advisory lock. And treat "the row vanished" in a locking read as a privilege symptom, not a missing-data one.

### 🟡 Typecheck, lint and build were all green while the portal was broken

The RLS gap above, and the four missing customer read policies before it, produced a shop with nothing in it and a "my packs" section showing a customer none of their own packages. Every static gate passed.

It took signing in as a customer in a browser and loading the page. That is now `tests/e2e/package-purchase-redeem.spec.ts`.

**Do instead:** when a change moves a screen onto a table with RLS, the verification is a session in the role that screen serves — not the role you happen to be testing as. Staff-role tests would have stayed green through all of it.

### 🟢 `passRedemption.onRedeem` is declared twice

The contract exists in both `use-booking-modal.tsx` and `BookingModal.tsx`. Making it async needed both edited, and a change to only one would have typechecked at the call site while failing at the other.

## Snapshot (2026-08-06, groomers come from the staff roster)

### 🔴 A permission chosen for the ADMINISTRATOR, not the user — twice in two days

`grooming_stylist_profiles` shipped with reads gated on `view_services`, reasoning that the people who need to know who can take a matted giant-breed are schedulers. That skipped the obvious reader: **the groomer standing at the board.** A groomer holds no `view_services`, so:

```
groomer sees 0 profiles     ← the entire point of the assigned_only queue
customer sees 1             ← the deny half worked fine
```

Every "your queue" surface runs `useStylistIdForStaff`, which needs this table. The grooming board showed the groomer no columns and no cards.

This is the **same shape** as the customer-package policies a day earlier: gate written from the perspective of who _administers_ a thing rather than who _uses_ it. Both times the failing assertion was the POSITIVE one; every deny passed throughout.

**Do instead:** `staff_read` already had the answer — any facility member may read the roster. A grooming profile is _less_ sensitive than the staff record it hangs off, so making it harder to read is incoherent. Fixed in 20260806540000 to mirror `staff_read`; writes still need `manage_staff`. When adding a policy, list the roles that will _call_ the screen before choosing the permission, and write a positive assertion for each.

### 🔴 An RLS-denied UPDATE or DELETE does not raise — it matches nothing and reports success

The most transferable finding in this schema, and the second time its shape has bitten (the first was `SELECT … FOR UPDATE` returning zero rows, above).

An **INSERT** that fails `with check` raises `42501`, and `writeFailure` turns that into a 403. An **UPDATE** that fails `using` does not: the row is simply not visible to the statement, so it affects zero rows and PostgREST returns success. **DELETE** behaves the same way.

Measured on the first version of the stylist write route — a groomer, who holds no `manage_staff`, sent a skill-tier change:

```
PUT /api/grooming/stylists/fs-groom-08   →   204 No Content
```

Nothing was written; RLS held. But the API said it had been, and the screen would have shown "Grooming profile updated" over a profile that never changed — the exact failure the write path was built to remove.

**A test that only asserts the data is unchanged passes on this.** The assertion that caught it was on the _status code_.

**Do instead:** every UPDATE and DELETE behind RLS asks for the rows it touched (`.select("id")`) and treats an empty result as a refusal — `deniedIfUntouched` in `src/lib/api/rls-write.ts`. For a DELETE where "nothing to delete" is legitimate, count first and compare; that is the only way to tell a refusal from an empty set.

**Audited and closed (2026-08-06).** All 43 mutations under `src/app/api/` now either count their rows (27) or carry `// rls-write-ok: <reason>` explaining why a later statement fails loudly (16). `bun run check:rls-writes` fails the build on a new one. Three things the audit turned up that are worth keeping:

- **Seven sites were already correct** in a different shape — a survivor read-back after the delete (`clients`, `pets`, both `roles` routes). Two of them carried a comment describing this exact hazard. The prose was there; the check was not, in the routes that needed it.
- **`.update()` is not only a Supabase verb.** `createHash(…).update(text)` in `staff-signatures` is a hash absorbing bytes. The gate now requires `.from(` in the same statement.
- **The gate passed vacuously on its first run.** Adding the `.from(` filter against a slice that began at the mutation's own line — below the `.from("x")` line — made it "find" 2 mutations in the whole API instead of 43, and report green. A gate you have never watched fail is not evidence. It is now anchored to the statement, and was verified by breaking a route and watching it catch it.

### 🟡 `stylistIdForStaff` was synchronous because it searched an array

It now reads an index primed by a fetch, which changes what "no answer" means. A component calling the bare function gets `undefined` on first paint and never re-renders, because nothing it subscribes to changed — the groomer's board would render empty and stay empty.

Two mechanisms, deliberately different:

- `fetchGroomingAppointments` and `fetchWaitlist` **await** `ensureStylistIndex()`. Both are already async; there was no reason to race.
- Components use `useStylistIdForStaff` (`src/lib/api/stylists.ts`), which subscribes to the query.

**Do instead:** don't call the bare `stylistIdForStaff` from a component. If a third async fetch needs the remap, await the index like the other two.

### 🟡 `resolveEffectivePricing` took a stylist id and looked up the tier itself

It resolved `stylistId` against the mock array to read `capacity.skillLevel` for `pkg.tierAdjustments`. With the roster fetched, a cached lookup would have been **worse than the fixture**: a miss silently skips the tier surcharge and returns a price that is quietly too low.

It now takes `stylistTier` explicitly, alongside `stylistId` — which is still needed, because `pkg.stylistPricing[id]` is a _different_ feature (an explicit amount for one named groomer, versus a surcharge for a whole tier). Nearly collapsed those two into one parameter before noticing.

**Do instead:** when a pure function needs data it cannot fetch, pass it. A lookup that can silently miss inside a pricing path is a wrong invoice, not a blank field.

### 🟡 The React Compiler rejects a memo that reaches into fetched state

Adding `stylistsData.find(...)` inside two `useMemo` bodies in `new-appointment-dialog.tsx` produced `Compilation Skipped: Existing memoization could not be preserved` — an ESLint **error**, so it fails the gate. Adding the whole array as a dependency defeats the memo anyway.

**Do instead:** hoist the derivation to a scalar outside the memo (`selectedStylistTier`) and depend on that. The compiler is happy and the memo only recomputes when the chosen groomer changes.

### 🟢 `rating` has no source and is now always 0

The fixture's 4.9 / 4.95 / 4.7 were typed, not measured — there is no reviews table, no report-card score, nothing a rating could come from. Rather than a column nothing can update, it is absent and the mapper returns 0. The stylists page already draws "—" for an unrated groomer and averages only rated ones, so the KPI reads "no ratings yet".

`totalAppointments` went the other way: it IS derivable, so it is a view. The counts dropped from 1250/890/720/2100/450 to 3/2/1/1/0 — small and true.

**Do instead:** when a review system lands, `rating` becomes a view over it, not a column on the profile.

### 🟢 `hireDate` is no longer served by the stylist route

It is employment data and lives on the staff record. The stylists page already fell back to `staff.employment.hireDate` when a profile had none; that fallback is now the only path.

## Snapshot (2026-08-06, a grooming booking creates its appointment)

### 🔴 A missing write looked like a working screen, because the mapper had a fallback

`/api/grooming/appointments` has GET and PATCH and **no POST**. Every row in that table arrived through a backfill migration (`20260805220000`, `20260805230000`). `/api/bookings` POST wrote a `bookings` row and its `booking_pets` and stopped — so nothing in the running app ever created a `grooming_appointments` row.

What made it survive: the board's GET reads `bookings` and **left**-joins the extension, and `rowToGroomingAppointment` falls back with `packageName: ext?.service_name ?? row.status`. A grooming booking therefore did **not** disappear from the board. It appeared as a card named **"confirmed"**, with no service, no price and no duration. Measured, not assumed — reverting `create_booking` to the two-insert path and running `tests/e2e/booking-write-integrity.spec.ts` reports `Expected: "Full Groom"  Received: "confirmed"`.

Three separate things hid it: the board was seeded, so it never looked empty; `booking-write-integrity.spec.ts` asserted only against `/api/bookings`, the surface that worked; and its fixture posted `service: "grooming"` with **no `serviceType` at all** and got a 201, because nothing downstream needed one.

**Do instead:** when a table is an extension (`PRIMARY KEY (booking_id)`), test it from the surface that reads the extension, not from the parent. And treat a `?? row.status`-shaped fallback as a bug report waiting to happen: it converts a missing join into a plausible string, which is strictly worse than a blank.

### 🔴 Three sequential writes, and `bookings` has no DELETE policy

The old POST inserted the booking, then the pets, then (for grooming) would have needed the appointment and its add-ons. A refusal on write two left a booking nobody could withdraw. The route worked around exactly that by validating pets **before** the insert — correct, and it covered only the case somebody had thought of. Every new child row would have needed its own pre-check.

`create_booking` (`20260806560000`) is SECURITY INVOKER, so RLS still judges every insert as the caller, and any refusal rolls back all of them. The pre-check stays, demoted to what it is now: a better error message.

**Do instead:** when a create spans more than one table and the parent cannot be deleted, the transaction is the fix. A pre-check per child does not scale and silently stops being complete the moment a child is added.

### 🟡 An `INSERT … SELECT … JOIN` is a silent-drop machine

The add-on insert joins requested legacy ids against `grooming_add_ons`. A join that matches nothing inserts nothing and **raises nothing** — the pet arrives without the nail trim the booking screen charged for. Same family as the RLS-denied UPDATE above: absence of an error is not evidence of a write.

It now compares `get diagnostics row_count` against `jsonb_array_length` and raises on a mismatch (B9).

**Do instead:** any `insert … select … join` on caller-supplied keys needs a row count compared against what was asked for.

### 🟡 `SELECT … INTO` sets its target to NULL when nothing matches

Caught in my own draft before it shipped. `select sp.price into v_price from grooming_service_size_prices where …` was meant to _override_ the base price for that size band — but a service with no row for the pet's tier nulls `v_price` instead of leaving it. It reads like a conditional assignment and is an unconditional one.

**Do instead:** select into a separate variable and assign only if it came back non-null.

### 🟢 Two mock add-on catalogues, and only one matches Postgres

`src/data/grooming-add-ons.ts` (`ao-01` … `ao-08`, Teeth Brushing at 15) seeded `grooming_add_ons` and is what the booking modal sends. `src/data/grooming-pricing-rules.ts` has the same eight add-ons as `ao_teeth`-style ids at different prices (Teeth Brushing at 12); the check-in dialog uses it, matching **by name**.

Nothing is broken today — the booking path keys on the list that matches the table. The hazard is that they look interchangeable and are not, and the seed migration's header claims "the booking form … keys on them" about ids that only half the app uses.

**Do instead:** when the check-in dialog is migrated, it takes add-ons from the API, and the `ao_teeth` list goes.

## Snapshot (2026-08-06, a grooming pass names a grooming service)

### 🔴 "Grooming Maintenance" is not a deal, and never was

Repricing the portal's grooming lines to the counter's catalogue exposed this rather than caused it:

| package              | price | list before | list after | saving before | saving after |
| -------------------- | ----- | ----------- | ---------- | ------------- | ------------ |
| Weekend Getaway      | 115   | 130         | 125        | 15            | 10           |
| Vacation Package     | 499   | 590         | 590        | 91            | 91           |
| Grooming Maintenance | 140   | 160         | **140**    | 20            | **0**        |

4 × Basic Bath at 35 is 140, and the package sells for 140. You pay list price for the privilege of pre-paying. It only ever looked like a deal because it was priced against a stale `srv-005` at 40.

`package_price` was **not** touched: inventing a discount is a commercial decision, not one a migration gets to make. The shop guards both the "Save $X" badge and the struck-through price on `savings > 0`, so it renders as a plain 140 claiming nothing — honest, and visibly unattractive.

**Do instead:** someone with pricing authority reprices it. Until then it is correct and unappealing, which is the right way round.

### 🟡 The mapper drops `module`, so the portal payload cannot say which line is grooming

`prepaid_package_lines.module` is selected in `SERVICE_PACKAGE_SELECT` and then discarded by `recordToServicePackage` — `services` is mapped to `{serviceId, quantity}` only. So `/api/packages` cannot tell a consumer which of a bundle's lines is a grooming line, and the e2e for the namespace rule had to ask `/api/grooming/prepaid-packages` instead.

It also means the existing "spans modules" test infers grooming from `serviceId.startsWith("groom-")` — a string prefix standing in for a column that is right there.

**Do instead:** carry `module` through the mapper when something needs it; don't add a second prefix check.

### 🟢 `service_id` is text in three tables, and only one of them is now guarded

`prepaid_package_lines`, `customer_package_lines` and `package_pass_entries` all hold `service_id text` with no foreign key, because boarding, daycare and training have no catalogue in Postgres to point at. Only the first is now constrained, and only for `module = 'grooming'`.

That asymmetry is deliberate — `customer_package_lines` is the snapshot of what somebody bought, and a sold pass must survive its service leaving the menu (N6) — but it is worth knowing that the guard is one table wide.

**Do instead:** when boarding/daycare/training catalogues land in Postgres, extend the same trigger per module rather than adding a second mechanism.

## Snapshot (2026-08-06, the booking flow reads the facility's menu)

### 🔴 Six surfaces still read the grooming menu from the fixture

The booking path now reads `grooming_services` through `useGroomingServices`. These do not, and each one resolves a package **name** from a module array:

| File                                                            | What it does with it           |
| --------------------------------------------------------------- | ------------------------------ |
| `components/facility/grooming/check-in-confirmation-dialog.tsx` | names the service at check-in  |
| `components/facility/grooming/grooming-calendar.tsx`            | names the service on a card    |
| `app/facility/dashboard/services/grooming/inventory/page.tsx`   | product deduction per package  |
| `app/facility/dashboard/services/grooming/stylists/page.tsx`    | the active-package filter list |
| `lib/grooming-inventory-deduction.ts`                           | product usage per package      |
| `lib/operations-calendar.ts`                                    | rate entries                   |

None of them quotes a price at booking time, which is why they were left: the sharp edge was the quote disagreeing with what `create_booking` records, and that is closed. What they will do is **name a service wrongly** — a groom booked for a service the facility added last week shows a blank or stale name at check-in.

The last two are plain `.ts` libraries, not components, so they cannot call a hook. Converting them means threading the menu in from a caller, which is a real refactor rather than the import swap the other four need.

**Do instead:** convert the four components with `groomingCatalogueQueries.services()` as done in the booking path; for the two libs, pass the menu as an argument rather than reaching for a module import.

> **Resolved 2026-08-06.** All six converted, plus `GroomingSection` and `GroomingCheckInOutSection`, which the compiler surfaced once the menu became a required parameter. `bun run check:grooming-menu` now fails on any import of the fixture outside `src/data/`. One correction to the note above: the calendar's use was **not** just a name — `getRateColor` feeds the chip colour, and the drag-to-reassign handler reads `requiredSkillLevel` to decide whether a groomer may take the appointment at all. See the 2026-08-06 snapshot below.

### 🟡 A test that compares the fixture to the table proves nothing

The table was seeded FROM `src/data/grooming.ts`, so the names and prices agree today and would agree just as well if every screen were still reading the array. Any assertion of the form "the screen shows what the API returns" passes in both worlds.

`grooming-menu-live.spec.ts` gets around it by creating a service the fixture cannot contain and then looking for it in the wizard. Confirmed by reverting `GroomingPackagePicker` to the fixture: the API-level test still passes and only the wizard test fails.

**Do instead:** when a fixture seeded the table it is meant to be replaced by, don't compare the two — introduce something only one of them can have.

### 🟢 The Rates editor's `setQueryData` comment outlived the write it described

`GroomingPackagePicker` carried a comment saying edits in the Grooming Rates editor reflect on the booking cards "via setQueryData" on `["grooming","packages"]`. That write was removed when the editor started saving for real (see the note in `service-dialog.tsx`), so the cards had been serving a frozen copy ever since — with a comment explaining why they were fresh.

**Do instead:** when you delete a write, grep for the comments that promised it.

## Snapshot (2026-08-06, the last fixture readers of the grooming menu)

### 🔴 An optional parameter let a regression compile clean

Threading the menu into `buildUnifiedEvents` I typed it `groomingMenu?: GroomingPackage[]` and defaulted it to `[]` at the call into `getRateColor`. Typecheck passed, lint passed, the build passed — and the single caller in `OperationsCalendar.tsx` was passing nothing, so **every grooming chip on the operations calendar would have lost its colour**. Caught by re-reading the call site, not by any gate.

The same shape in `deductProductsForAppointment` went the other way and proved the point: making `menu` **required**, and putting it before the defaulted `groomerName`, made the compiler name both call sites — including two that were silently passing `groomerName` into the menu slot. A default of `[]` there would have produced a confident `"Package X not found"` with `success: false`: a wrong answer that reads like a real one.

**Do instead:** when replacing a module import with a parameter, make it required. An optional one converts a compile error into a silent behaviour change, and the thing you are replacing was never optional.

### 🟡 A module-level memo cache outlives fetched data

`getRateColor` built `_rateColorLookup` once and kept it forever, which was correct while all four rate lists were module constants. Feeding it a fetched menu without touching the cache would have frozen the colours at whatever the first render saw — including the empty array before the query resolves. It now stores the menu it was built from and rebuilds on reference change.

**Do instead:** any module-level cache keyed on data that becomes fetched needs an invalidation key, or it silently pins the first value.

### 🟢 Two dead exports in the deduction lib

`checkProductAvailability` and `getPackageProductUsage` in `lib/grooming-inventory-deduction.ts` have no callers anywhere in `src/`. They were given the new `menu` parameter for consistency rather than deleted, because boy-scout removal is opt-in here. Knip does not single them out — its unused-export list is ~996 entries, so it is not a useful signal for this.

**Do instead:** delete them as part of a scoped dead-code pass, not in passing.

## Snapshot (2026-08-06, a kennel holds one booking)

### 🔴 The invariant was written in a comment and never built

`src/app/api/bookings/route.ts` has said since it was written that this is where "the domain invariants RLS cannot express (**capacity**, ledger balance, handover) have somewhere to live." The word `capacity` appeared in that comment and nowhere else under `src/app/api`.

Meanwhile all 7 boarding bookings had `details->>'unitAssignment'` = **null** — the room the modal assigns was React state that never reached the database — and `RoomAssignmentBoard.canDrop` checked `assignedPetIds.length >= room.capacity` against _the current booking's own_ assignment map, so it could not see any other booking. A within-this-form check wearing the clothes of a capacity rule.

Closed by `boarding_rooms` + `boarding_stays` with an `EXCLUDE USING gist` constraint (`20260806600000`). **Ledger balance and handover from that same comment are still unbuilt** — treat the sentence as a to-do list, not a description.

**Do instead:** when a comment names an invariant, grep for its enforcement before trusting it. Two of the three named here did not exist.

### 🔴 `create or replace function` with a new argument makes an OVERLOAD

Adding `p_boarding` to `create_booking` would have left the three-argument version in place beside the four-argument one. PostgREST resolves by the arguments in the request body, so any caller that omitted the new one would have kept hitting the old function and silently never written a stay — green typecheck, green build, no stay.

`20260806620000` drops the old signature explicitly. Verified afterwards with `pg_proc` that exactly one `create_booking` exists.

**Do instead:** changing an RPC's arity is a drop-and-create, and the check is `select oid::regprocedure from pg_proc where proname = ...` — not "the migration succeeded".

### 🟡 A constraint predicate cannot reach another table

The natural rule is "no two stays overlap in a room _unless the booking is cancelled_", and it cannot be written: a constraint predicate may only reference its own table, and `status` lives on `bookings`. Hence `released_at` on the stay plus a trigger that mirrors cancellation onto it, with the constraint applying `WHERE released_at IS NULL`.

The half that is easy to miss is the way back: re-opening a cancelled booking must take the room _back_, and fail if somebody else was given it meanwhile (K5).

**Do instead:** when a constraint needs a fact from another table, denormalise the fact and put a trigger on it — don't weaken the constraint to what one table can see.

### 🟡 An absolute constraint would have deleted an existing capability

`override_booking_capacity` ("Override capacity limits") is a real permission, and `RoomAssignmentBoard.canDrop` opens with `if (allowOverride) return true`. A constraint with no escape hatch would have made that permission unimplementable — and the predictable consequence is that whoever next needs an override drops the constraint.

So a stay may carry `override_reason`; overridden stays are excluded from the check, and `create_booking` refuses to set it without the permission. Gating it **only** in the route would have left PostgREST — reachable directly with a session cookie — as an unguarded way to overbook with a typed excuse.

**Do instead:** before making a rule absolute, grep the permission list for whoever is already allowed to break it.

### 🟢 The e2e's first test proved nothing, and now says so

`boarding-occupancy.spec.ts`'s "a stay can be created" passed **with the fix disabled** — a 201 says nothing about whether the room was recorded. There is no boarding read endpoint yet, so the only HTTP-observable evidence is the conflict the _next_ test provokes. Confirmed by removing `p_boarding` from the route: the double-booking test dropped from 409 to 201 while that one stayed green.

**Do instead:** a test whose assertion survives the bug is a precondition. Label it as one, or give it something only the fix can satisfy.

## Snapshot (2026-08-06, the kennel list is the facility's)

### 🔴 Three vocabularies for one idea, none of which joined

Boarding occupancy was three fixtures that could not be checked against each other:

| Source             | Where                      | Says                                              |
| ------------------ | -------------------------- | ------------------------------------------------- |
| `BOARDING_ROOMS`   | `src/data/boarding-ops.ts` | **6 rooms** — standard / deluxe / vip / cat-suite |
| `boardingCapacity` | `src/data/boarding.ts`     | **total 30** — standard / premium / luxury        |
| `BoardingGuest`    | `packageType` strings      | "Standard Kennel" / "Premium Suite" / …           |

`premium` and `luxury` are not room types and never were. The boarding page rendered **"X of 30 kennels occupied"** with hardcoded Standard/Premium/Luxury tiles, beside an assignment board offering six rooms, while `getOccupancyStats()` counted fixture guests by matching a `packageType` **string**.

Occupancy now counts the rooms table — the only version that cannot drift from what you can actually assign — and the per-type tiles are generated from the types the facility has. **The headline number changed from "of 30" to "of 6"**, which is the true one.

**Do instead:** when two sources claim the same total, find which one an operator acts on. You assign an animal to a room, not to a capacity constant.

### 🟡 A capacity check that could not see the other guests

`RoomAssignmentBoard.canDrop` refused a drop on `assignedPetIds.length >= room.capacity`, where `assignedPetIds` came from _the current booking's own_ assignment map. It could not observe any other stay, so it was a within-this-form check wearing the clothes of a capacity rule — and the board would happily offer a kennel that the exclusion constraint then refused on save.

It now takes `occupiedRoomIds` from `/api/boarding/rooms` for the request's own dates, so the board and the write judge the same facts. The constraint is still what guarantees it; this is the courtesy, not the rule.

**Do instead:** a client-side availability check must be fed by the same query the server constraint uses, or it is decoration.

### 🟢 Two more dead query factories served fixtures

`boardingQueries.rooms()` and `.capacity()` had **no callers** — the screens imported `BOARDING_ROOMS` and `boardingCapacity` straight from `src/data/`. That is how the two totals disagreed unnoticed: the query layer looked like it owned the data while nothing went through it.

Deleted rather than repointed, the same call made for `groomingQueries.packages` and `prepaidPackages`.

**Do instead:** before repointing a factory at an API, grep its callers. A factory with none is not a migration target, it is dead code with a plausible name.

## Snapshot (2026-08-06, moving a guest between kennels)

### 🔴 There is no screen that shows a booked guest's kennel

`PUT /api/boarding/stays` and `assign_boarding_room` exist and are covered end to end — **and nothing in the app calls them.** The only room-assignment surface is `BoardingRequestDialog`, which operates on a `BoardingBookingRequest`: a **pre-booking** object with no booking ref, so its assignments are genuinely local until the request becomes a booking.

So a kennel can be set at booking time and changed over HTTP, but an operator has no way to do the second thing. The ops board that shows current guests against their rooms is the missing piece, and it is a feature rather than a wiring job.

**Do instead:** build the board against `/api/boarding/rooms` (which already returns rooms + occupancy per window) and `PUT /api/boarding/stays`; don't extend `BoardingRequestDialog` to do it, because a request is not a booking.

### 🟡 `ON CONFLICT DO UPDATE` hides which half was refused

The natural way to write "assign or move" is one upsert. Under RLS it is a trap, because the two halves fail differently:

- an INSERT refused by `with check` **raises** 42501
- an UPDATE refused by `using` **matches nothing and reports success**

`ON CONFLICT DO UPDATE` blurs them, and its `row_count` is 1 whether it inserted or updated — so the zero-row check that normally catches a silent refusal would sit there looking like a guard while catching nothing. `assign_boarding_room` writes the two branches out separately for that reason.

**Do instead:** when a statement can take either an insert or an update path under RLS, write both and check the update's row count. An upsert is only safe where the policies for both are identical and you don't need to tell them apart.

### 🟢 Unassign deletes the stay; cancel releases it

Two ways to stop occupying a kennel, deliberately different. A cancelled booking keeps its `boarding_stays` row with `released_at` set — the stay happened and then stopped, and who had the room matters. An unassignment deletes the row: the guest was never placed there, and a record saying "held kennel 3, released, reason none" would be a fiction.

**Do instead:** don't unify them. The asymmetry is the meaning.

## Snapshot (2026-08-06, a fourth room model, found before building on it)

### 🔴 The facility's Rooms admin edits a different room model than bookings use

Found while starting the boarding ops board, and the reason it was not built. There are **two disjoint room models**, and the facility's own admin screen manages the one bookings cannot reach:

| Model                              | Ids            | Count              | Stored in        | Edited from                                   | Used by                                                      |
| ---------------------------------- | -------------- | ------------------ | ---------------- | --------------------------------------------- | ------------------------------------------------------------ |
| `boarding_rooms`                   | `R-STD-01` …   | 6                  | **Postgres**     | nothing — seeded only                         | assignment board, `create_booking`, the exclusion constraint |
| `facilityRooms` + `roomCategories` | `room-ds-01` … | 10 in 4 categories | **localStorage** | `/facility/dashboard/services/boarding/rooms` | nothing that books                                           |

So a manager who adds a kennel on the Rooms page adds it **to one browser**, and no booking can ever be placed in it. The rooms that bookings actually use cannot be edited anywhere.

`NewBooking.unitAssignment` documented itself as "the specific **FacilityRoom.id**" while carrying a `boarding_rooms` legacy id — corrected in this change, since the comment named the model the value has never belonged to.

This is on top of the three counting vocabularies recorded above, making **four** representations of "a room" in the boarding module.

**Why it was not resolved here:** deciding which model wins is a product decision with real weight. `roomCategories` carries per-category booking rules and pricing that `boarding_rooms` has no equivalent for; adopting it means a `room_categories` table, re-seeding, and changing the id space the assignment board and the existing tests key on. Picking silently would entrench whichever I chose.

**Do instead:** settle the model before building the ops board. If `facilityRooms` wins, migrate it into `boarding_rooms` (plus a categories table) and re-key `unitAssignment`; if `boarding_rooms` wins, point the Rooms admin page at it and retire the localStorage store. Do not add a third consumer to either until then.

> **Settled 2026-08-06** (`20260806660000`). `facilityRooms` + `roomCategories` won. `room_categories` and `facility_rooms` are in Postgres with the fixture's 4 categories and 29 units; `boarding_rooms` is dropped; `boarding_stays.room_id`, `create_booking` and `assign_boarding_room` all resolve the new tables; `unitAssignment` now carries `room-*`. **Still open:** `useRooms` writes to localStorage, so the Rooms admin page still edits a copy — see below.

## Snapshot (2026-08-06, one room model — the reads)

### 🔴 `useRooms` still writes to localStorage

The room MODEL is settled and the booking path reads it from Postgres. The Rooms admin page does not: `useRooms` loads from and saves to `facility-room-categories` / `facility-rooms` in localStorage, seeded from the same fixture.

So the split is narrower than it was — one model, one id space, one seed — but a manager editing a room there still edits a browser-local copy that the booking path will not see. **This is the half that makes the page real, and it is the next change.** Categories and units both need create/update/delete against the new tables (`manage_services` gates them already).

**Do instead:** move `useRooms` onto `/api/rooms` wholesale — reads and writes together. A read-only migration would leave Save buttons that appear to work, which is worse than the current state where at least the page is consistently local.

> **Resolved 2026-08-06.** `useRooms` is TanStack Query over `/api/rooms` with mutations against `/api/rooms/categories` and `/api/rooms/units`. `resetRooms` is gone — restoring a fixture over a shared database is not a button. The room model is now one model, in one place, edited and booked from the same rows.

### 🟡 `RoomCategory.facilityId` is a number the rows do not carry

`RoomCategory` and `FacilityRoom` both declare `facilityId: number` — the app's legacy ref — while the tables key on the facility uuid. The mapper fills it from `DEMO_FACILITY_LEGACY_ID` rather than reshaping the app's types.

That is fine while there is one facility and RLS scopes every read to it, and it is a lie the moment there are two.

**Do instead:** when multi-facility reads land, either carry the ref on the row or drop the field from the app type. Don't compute it from a constant twice.

### 🟢 The counting vocabularies are down from four to two

`boardingCapacity` (total 30, standard/premium/luxury) and `BoardingGuest.packageType` ("Premium Suite") are still in `src/data/boarding.ts`, no longer read by the boarding page — its occupancy card counts active `facility_rooms` and groups by category name. `getOccupancyStats()` remains exported and is now unused by that page.

**Do instead:** delete them with the rest of the boarding fixture when guests move to Postgres; they are harmless while nothing reads them, and misleading if something starts.

## Snapshot (2026-08-06, the Rooms page writes to the database)

### 🔴 Deleting a category no longer takes its rooms with it

The localStorage version removed the category **and every unit in it**, silently. `facility_rooms.category_id` is `ON DELETE RESTRICT`, so the API now refuses and says how many rooms are in the way. Likewise a room with any stay recorded against it cannot be deleted — deactivating is the operation the facility actually wants, and the message says so.

This is a **behaviour change on an existing screen**: a manager who could previously delete a populated category now cannot. That is the point — one of those rooms can have an animal in it tonight — but it will surprise someone.

**Do instead:** if bulk removal is wanted, build "empty this category" as its own action that deletes the rooms first and reports what it could not. Don't relax the FK.

### 🟡 A test whose cleanup cancels is not self-cleaning

`rooms-admin.spec.ts` books into a room it created, and the first version cancelled the booking in cleanup. **Cancelling only RELEASES the stay** — the row survives, the room stays undeletable, and the second run collided on the category id. Caught by running the suite twice, which is the only way to catch it.

The fix uses the real mechanism: `PUT /api/boarding/stays` with `roomId: null` deletes the stay, then the room and category go.

**Do instead:** run a writing suite twice before trusting its cleanup. Once proves it runs; twice proves it can run again.

### 🟢 Creating a category and its units is two writes, not one

`POST /api/rooms/categories` takes `unitCount` and writes the category, then the units. If the units fail the category survives — recoverable by adding them, and both halves gate on `manage_services`, so a refusal on the second is close to impossible.

Stated rather than assumed. The alternative is an RPC, which buys atomicity for a case that cannot realistically arise.

**Do instead:** if a third write joins them, make it an RPC rather than adding another partial-failure message.

## Snapshot (2026-08-06, a booking is paid when the ledger says so)

### 🔴 Thirteen bookings claimed $790.75 that no payment row backed

`bookings.payment_status` was a text column, and the derivation was nobody's job. The database said:

```
payment_status   count    billed
pending            45    $4,624.00
paid               13      $790.75
```

with `public.payments` holding **zero rows**. Every "Paid" badge in the demo was a string somebody typed.

`enforce_booking_integrity` (20260802120000) had already closed half of this — a customer's insert is forced to `pending` and their update puts the old value back. The half nobody noticed is that **staff and the seed were waved straight through**: `v_is_staff → return new`, and `auth.uid() is null → return new`. The seed is what wrote the thirteen.

Fixed in 20260806680000: `bookings.amount_paid` is denormalised onto the booking and recomputed by trigger from `sum(grand_total - tip)`, and `payment_status` is derived from it. No writer sets either — not staff, not the seed, not `postgres` with BYPASSRLS, which is the probe that proves it.

**Do instead:** when a status describes something that happened elsewhere, derive it from the record of that thing. A status column with no writer designated ends up with every writer.

### 🔴 Three screens have a "Process Payment" button that has never taken a payment

`ProcessPaymentModal` is mounted on `bookings/page.tsx`, `bookings/[id]/page.tsx` and `clients/[id]/bookings/[bookingId]/page.tsx`. Its `onConfirm` is `handleProcessPayment`, which is a local `setBookings(...)` and an `alert()`. Nothing reaches the server; nothing ever has.

It was not wired up in this change, and the reason is worth recording: `src/app/facility/dashboard/bookings/page.tsx` imports `bookings as initialBookings` from `@/data/bookings` into `useState`. **The whole facility bookings list is still fixture-backed.** Wiring the payment button means migrating that page onto `bookingQueries` first, which is its own slice.

Until then the button is now _visibly_ wrong rather than invisibly wrong: it flips a row to Paid, and a refresh reads the real answer from the ledger.

**Do instead:** migrate the list to the API, then point `handleProcessPayment` at `POST /api/payments` with `bookingRef`. Do not add a second write path that sets `payment_status` — it is derived, and an update naming it is discarded.

### 🟡 A refund is not the same as never paying, and the sum cannot tell them apart

The first version derived `'refunded'` from `amount_paid < 0`. A booking paid $65 and then refunded $65 sums to **exactly zero** — identical to a booking nobody ever paid, and one of those needs chasing for money. Only an _over_-refund reached `'refunded'`, which is the rarest of the three cases and the one nobody would have checked.

No amount distinguishes the two histories, because they have the same total. What distinguishes them is whether a negative row EXISTS, which is a second question (`private.booking_was_refunded`, 20260806740000).

Found by writing `supabase/tests/booking-payment-derivation.sql`, not by reading the code.

**Do instead:** when a derived status collapses several histories into one number, check whether two different histories can produce the same number. If they can, the number is not the whole input.

**And the screen had the same bug for four more months.** The database learned to tell the two apart in August; `BookingPaymentBreakdown` went on rendering one netted line, `<Line label="Paid" value={-paid} />`, straight off `amount_paid`. So a booking paid $800 and refunded $200 read **"Paid $600"** — which is exactly what a booking that only ever paid $600 reads. `payment_status` is no help on a PARTIAL refund either: it only reaches `'refunded'` when `amount_paid <= 0`, so that booking says `pending` with no trace of the $200.

Fixed 2026-08-25 by showing gross, refunded and net whenever a negative row exists — the same triple, for the same reason, that `facility_takings` reports rather than net alone. The rows come from `GET /api/payments?bookingRef=<ref>` (`paymentQueries.byBooking`); `booking.amountPaid` is still the figure the balance is built from, so the panel and the "Pay by card" button cannot disagree.

Two other screens had the mirror of it: the client billing tab hardcoded the label `"Payment"` and ignored `isRefund`, so a refund appeared as a row headed "Payment" with a negative figure. The client OVERVIEW tab had always done it correctly. **When a fix lands in the database, go and look at what reads it** — three readers here were still wrong long after the write side was right.

### 🟢 A refund can say why it happened (fixed 2026-08-25)

`RefundModal` has asked for a reason since it was built. It printed it on the receipt and sent it to `/api/payments/clover/refund`, whose Zod schema parsed `reason` and then never read it again. The cash path was no better: `reason` became `p_credit_note`, which lands on `store_credit_entries` — a table that only gets a row when the refund goes back AS credit. So on a card refund, and on a cash refund, the reason was gone the moment the dialog closed.

The ledger could say a facility gave $200 back and could not say why, which is the first question anyone asks about a refund and the only one the amounts cannot answer. `audit_log` could not help: it is written by triggers from the ROW, and the reason was not a column.

`payments.note` now exists (20260825190000), written at insert and never updated — the table's contract is unaffected. `record_payment` gained a 23rd argument, which meant DROPPING the 22-argument version first: `create or replace` with a different arity creates an overload, not a replacement, and dropping a function drops its ACL, so every grant had to be restated. Verified afterwards with `has_function_privilege`, not by having written the revokes.

**Do instead:** if a dialog asks for something, follow it all the way to a column before shipping the dialog. A field that is collected and discarded is worse than one that was never asked for — somebody typed it believing it mattered.

### 🟡 The cashier is not a booking editor, and three separate pieces make that work

`retail` holds `financial_take_payment` and **not** `edit_bookings` — a shipped preset, not a hypothetical. `accountant` is the same with `process_refund` on top. So the trigger that moves a booking when a payment lands runs as someone who cannot edit bookings, on a booking that is checked-in.

Three pieces are load-bearing, and each was verified by breaking it:

| Piece                                           | Removed → what happens                                                 |
| ----------------------------------------------- | ---------------------------------------------------------------------- |
| `bookings_set_derived_payment`                  | a plain `UPDATE ... set payment_status = 'paid'` **sticks**            |
| `payment_moves_the_booking` is SECURITY DEFINER | the payment lands, the booking never moves, and **no error is raised** |
| the pass-through in `enforce_booking_integrity` | the whole payment is refused: "This booking can no longer be changed." |

The middle row is the dangerous one. Under `SECURITY INVOKER` the UPDATE matches zero rows under RLS and reports success — the fourth time this project has hit that exact shape.

**Do instead:** when a trigger writes to a second table, ask which permission the _writer_ holds rather than which one the operation feels like it needs. Then check the row count, or make it DEFINER and say why in the header.

### 🟢 `NewBooking` no longer carries `paymentStatus`, and `Booking` still does

Moved from `newBookingSchema` to `bookingSchema.extend({...})`: it is not something a booking is _created_ with, but it is very much something you _read_. Five call sites broke, all of them writing `"pending"` at creation, and each deleted a line.

`COLUMN_FIELDS` in the booking mapper still lists both `paymentStatus` and `amountPaid` even though neither is written — a name missing from that list is copied into the `details` jsonb, and a stale copy of a derived number is the exact thing the derivation exists to prevent.

**Do instead:** don't drop a derived field from `COLUMN_FIELDS` on the grounds that it is never written. That list controls what lands in `details`, not what lands in columns.

## Snapshot (2026-08-06, the payment button takes a payment)

### 🔴 Two of the three "Process Payment" screens could not open the dialog at all

Recorded in the previous snapshot as "three screens have a button that has never taken a payment". That was generous. Once the handlers were wired it turned out only **one** of the three could open the dialog:

| Screen                                       | Could it open? | Why not                                                        |
| -------------------------------------------- | -------------- | -------------------------------------------------------------- |
| `bookings/page.tsx` (list)                   | **no**         | nothing ever called `setProcessingPayment` — no actions column |
| `bookings/[id]/page.tsx`                     | **no**         | `router.replace`s to the client-nested route on mount          |
| `clients/[id]/bookings/[bookingId]/page.tsx` | yes            | "Accept Payment" on the invoice card                           |

The list's three money dialogs and their handlers are gone rather than wired — a handler for a dialog nobody can open is dead code with a plausible name, and adding a row-actions column to create the trigger is a feature, not this change.

**Do instead:** before wiring a handler, grep for the call that opens the thing. `setX(true)` appearing only in `onOpenChange={(o) => !o && setX(null)}` means the dialog closes and never opens.

### 🔴 `/facility/dashboard/bookings/[id]` is 1197 lines behind a mount-time redirect

`useEffect(() => { if (booking?.clientId) router.replace(...) })`, and every booking has a `clientId`. Everything below that effect — the invoice card, three dialogs, the buttons that open them — renders once and is navigated away from. The list page doesn't even link to it.

Two dialogs were removed from it mid-change and then **put back**: taking away the dialogs while leaving the three `setPaymentOpen(true)` buttons made it internally inconsistent, which is worse than either doing all of it or none. It is dead for a reason unrelated to payments, and it should be deleted or unwound as its own change.

**Do instead:** decide whether the route is a permalink worth keeping. If it is, it should redirect from the server and render nothing; if it isn't, delete it. Don't edit fragments of it.

### 🟡 A refund to store credit recorded the refund and granted nothing

`CancelBookingModal` and `RefundModal` have always offered card **or** store credit. `record_payment`'s store-credit branch fires on `store_credit_applied > 0` — credit being _spent_, writing a NEGATIVE ledger entry. There was no path that granted credit, so choosing "store credit" would have taken money off the books and put it nowhere.

Fixed in 20260806760000 with no new parameter: `grand_total < 0` plus `method = 'store-credit'` already says it, and the sign is what distinguishes "refunded AS credit" from "paid WITH credit". A 23rd argument would also have made `create or replace` an overload rather than a replacement.

**Do instead:** before adding a flag, check whether the payload already carries the fact. Two fields that cannot disagree beat three that can.

### 🟡 Two refund modals, and the reachable one was the hollow one

`RefundBookingModal` (built, card/store-credit, full modal) was mounted only on the list page, where nothing could open it. `RefundModal` (full/partial/by-item, richer) is on the detail page and its `onConfirm` was a bare `toast.success`.

The reachable one is now wired; the unreachable one is deleted. Its `amountPaid` prop was `invoice?.depositCollected ?? booking.totalCost` — falling back to the **price**, which caps a refund at what the customer was billed rather than what they handed over. It reads `booking.amountPaid` now.

**Do instead:** when two components do the same job, check which one is mounted before improving either.

### 🔴 The uptime monitor could not raise an alarm, and looked fine doing it (fixed 2026-08-25)

The `uptime` workflow checks three hostnames every 15 minutes and opens a GitHub issue when two consecutive runs fail — two draws, so one bad runner path is not an outage. The corroboration step:

```yaml
permissions:
  contents: read
  issues: write # and nothing else
```

```bash
PREV=$(gh run list --workflow=uptime.yml … || echo "")
if [ "$PREV" = "failure" ]; then raise; else don't; fi
```

`gh run list` reads the **Actions** API, which needs `actions: read`. It did not have it, so the call 403'd on every run, `|| echo ""` swallowed the error, `PREV` was empty, and the `else` branch concluded "the previous run passed — not raising yet."

**Every failure looked like a first failure.** Observed on 2026-08-25: two consecutive failing runs, 20:28 and 20:57, all three hostnames timing out, and the second one printed `previous conclusion: none` and stayed quiet. A real outage of any length would have raised nothing, and the workflow's green history would have been the reason nobody looked.

Fixed by granting `actions: read` **and** by splitting the third outcome out of the `else`: "the previous run passed" and "I could not find out" are different facts. Not being able to corroborate now RAISES, with a message saying that is why. A guard that fails into silence is worse than no guard, because it also supplies the confidence.

**And that fix immediately exposed a third layer.** With the corroboration now raising, the next failing run got as far as `gh issue create` — and died on `fatal: not a git repository`. The job runs no `actions/checkout`, deliberately, so `gh` could not infer the repository from a git remote and **none of its three calls could ever have worked**: not the corroboration query, not the issue creation, and not `gh issue list` in the close step, which was swallowed by a `|| echo ""` and would have left a recovered outage's issue open for ever.

`GH_REPO` is now set at the JOB level, so a gh call added later cannot be written without it. The close step no longer swallows its own failure — an error there looked exactly like "there is no open issue".

**The sequence is the lesson.** The monitor needed `actions: read` AND repo context, and having only one of them still produced silence. Each fix revealed the next, and none of them would have been found by reading the file — only by making it fail and watching what it did.

**The failure that exposed it was not an outage.** All three hosts answered 200 in under a second from a laptop at the same time, which is the Azure-region routing problem this workflow's own header already documents. That is the joke of it: the monitor was only ever tested by the failure mode it was designed to ignore, so the branch that matters had never once been reached.

**Do instead:** when a check decides _not_ to alert, make it say which fact it decided on. And test an alerting path by making it fire, not by watching it stay quiet — quiet is what both a healthy system and a broken monitor look like.

### 🟢 A kept cancellation fee is revenue, and a refund is not spend (fixed 2026-08-25)

Two faults in `facility_report_dataset`, found while tracing where refunds land.

**1. Three reports could not see money on a cancelled booking.** `revenue-by-service`, `revenue-by-location` and `service-mix-by-location` joined `and b.status <> 'cancelled'`. Payments hang off the booking, so that one line dropped both signs — the fee a facility KEEPS when somebody cancels, and any refund against it. Measured on the demo facility before the fix:

```
300 cancelled bookings carrying payments
$35,760.00 gross · -$6,344.00 refunded · $29,416.00 NET kept — invisible
```

Meanwhile `facility_takings`, which filters payments by facility and date and nothing else, counted every cent. Two tiles on the same screen disagreeing by exactly the money that was kept. On a 90-day window, boarding read **$325.00**; it is **$28,235.00**.

Fixed with `or p.id is not null` rather than deleting the filter — a cancellation nobody paid for should still contribute nothing, or the report grows zero-value rows. **The booking COUNTS still exclude cancellations**, via `filter (where b.status <> 'cancelled')`: a cancellation is not a booking served, while the fee charged for it is revenue earned, and one row now answers both honestly.

**2. `customer-value` ranked customers by what they paid before refunds.**

```sql
'totalSpent', coalesce(sum(p.grand_total) filter (where p.grand_total > 0), 0)
```

Positive rows only. A customer who paid $800 and was given $200 back read as having spent $800, and one who returned everything still ranked as a top customer — on the figure the list is SORTED by. Every other figure in that function nets. Now `sum(p.grand_total)`.

Guarded by `supabase/tests/report-cancelled-and-refunds.sql`: its own facility, four bookings (kept fee, part-refunded then cancelled, cancelled and never paid, ordinary), and **exact** expected totals rather than inequalities — all three faults hide comfortably inside a "greater than".

**Still open, and deliberately not guessed at:** these reports bucket by `b.start_at`, the day the service happened; `facility_takings` buckets by `p.created_at`, the day the money moved. A September refund on an August booking lands in different months on two tiles read side by side. Both bases are defensible; having both unlabelled is not. That is a product decision about what each report says it measures.

### 🔴 The checkout offered to charge the PRICE on a part-paid booking (fixed 2026-08-25)

`PaymentCheckoutFlow` on the booking detail page took its figures from the fixture invoice blob:

```tsx
amountDue={(invoice?.remainingDue ?? booking.totalCost) + …}
depositPaid={invoice?.depositCollected ?? 0}
```

That blob exists only on the 26 migrated fixture bookings. **Every booking created since fell through to `booking.totalCost` — the price — and `amount_paid` was never consulted at all.** A $16 deposit against a $64 booking opened a dialog headed "Amount Due $64.00" with a button reading "Checkout & Charge $64.00". Pressing it collects $80 for a $64 booking.

It is the same mistake the entry above records for `RefundModal`, whose `amountPaid` fell back to the price and capped a refund at what the customer was BILLED rather than what they handed over. Same file family, same fallback, live again.

**Two things make it worse than a slip.** The other button on the same screen — "Pay by card — $48.00" — already used `balanceOf(booking)`, so the page told the operator two different numbers depending on which control they used. And the OTHER caller of the same dialog, `booking-card.tsx`, was already correct. One of three call sites was wrong, and it was the main one.

Fixed by reading the ledger everywhere: `balanceOf(booking)` (what `BookingPaymentBreakdown` shows and `useTakeBookingPayment` charges) plus incident care and a pending late fee, which are genuinely not rows yet. `depositPaid` is now `booking.amountPaid`, and the label says **"Already paid"** rather than "Deposit paid", because a part payment is not a deposit.

**Do instead:** `amount_paid` and `amount_due` are derived by the database from the payments ledger for EVERY booking, fixtures included. `booking.invoice` is decorative. Never `?? booking.totalCost` on a money screen — the price is not the balance, and the fallback only fires on real bookings, so it survives every test done with fixture data.

### 🟡 A spec nobody runs rots, and then it lies about what it found

`booking-payment-screens.spec.ts` was failing on `main`, and it is the spec that would have caught the bug above on the day it landed. It runs in **neither** `test:e2e:gate` nor `test:e2e:ci`, so nothing had executed it in months. Two separate rots:

- It clicked `/confirm payment/i`, a label from the dialog `PaymentCheckoutFlow` **replaced**. Taking money is two presses now — "Checkout & Charge $X" arms it, "Confirm & Charge $X" does it, deliberately, so the button that moves money is not the one a cursor was already heading for.
- It asserted `/already paid/i` against a dialog that said "Deposit paid".

Both fixed, and both specs added to `test:e2e:ci` so they run nightly instead of never. The second press is now asserted **by its full label** — `Confirm & Charge $48.00` — so the test fails if the figure on the button that charges is ever the price again.

**Three traps that cost real time here, in the order they bit:**

- **A dev server on port 3000 outlives your edits.** Playwright's `webServer` block reuses an already-running one. A stale server served old chunks — which surface as the app's own "Oops!" error boundary, not as anything mentioning staleness — AND old route handlers, so a newly added `?bookingRef=` filter looked like it was being ignored and returning every payment in the facility.
- **That same stale server invented a bug that did not exist.** It produced twelve "Maximum update depth exceeded" errors per page load, which is a real React error and reads exactly like an infinite render loop on a money screen. It was written into this map as one. Against a clean `bun run build && bun run start` there are **zero**. `bun run dev` on this codebase also dies mid-compile under Playwright often enough to matter.
- **"Is this mine?" is answerable in five minutes**, and answering it wrongly is expensive in both directions: copy the file aside, `git checkout` it, re-run, compare. Do that before reading a line of your own diff — and then do it again against a BUILT server before writing anything down.

**Do instead:** run e2e against a built server, as AGENTS.md already says: `bun run build && bun run start --port 3100`, then `E2E_BASE_URL=http://localhost:3100`. Treat any failure seen only under `bun run dev` as unproven.

### 🟡 "Receipt sent" is said in nine places and meant in two

The checkout dialog's Email and SMS buttons were `toast.success("Receipt sent via email")` and `"…via SMS"` with no call behind either — removed 2026-08-25, leaving Print, which really opens a print window. But the phrase is a family, and the rest of it is still there:

```
app/customer/bookings/_components/PastBookingCard.tsx:45   toast.success("Receipt sent to your email.")
app/facility/dashboard/services/retail/page.tsx:5642       alert("Receipt sent via email")
app/facility/dashboard/services/retail/page.tsx:5654       alert("Receipt sent via SMS")
components/facility/grooming/appointment-detail-page.tsx   "Receipt sent · $X charged"
components/facility/grooming/appointment-panel.tsx         "Receipt sent · $X charged"
lib/grooming/check-in-actions.ts:601                       "Receipt sent to <owner> (<channel>)"
```

**Sending one is built.** `emailItemisedReceipt` and `smsItemisedReceipt` (`lib/clover/receipt-delivery.ts`) work, are used for real by `/api/payments/clover/terminal`, and compose the itemised copy rather than Clover's unitemised one. What does not exist is an **API route** that lets any non-terminal tender reach them — so today a receipt is emailed only when a customer picks a channel on the physical device.

**Do instead:** the gap worth closing is one route — resolve the booking under the caller's RLS, compose `ReceiptInput` the way `receiptInputFor` does for the terminal but from the `payments` row rather than a live charge outcome, and call the existing library. Then wire the surfaces above to it and delete the toasts that are left. Until that exists, do not add another button that says a receipt was sent.

### 🟢 There was a THIRD refund dialog, and it was the fake one (fixed 2026-08-25)

`ProcessRefundModal`, mounted on `/facility/dashboard/billing`, reachable, and gated by no permission at all. Its submit handler was:

```ts
console.log("Refund processed:", refund);
if (onSuccess) onSuccess(refund);
```

and the page then toasted _"Refund of $X processed successfully!"_. The dialog also reassured the operator the money "may take 5–10 business days to appear", which is the sentence that makes it worse than a stub: it explains away the absence of any evidence for up to a fortnight. Its payments came from `src/data/payments` behind a hardcoded `facilityId = 11`.

Deleted rather than repaired — the real refund is on the booking, one click from "View Booking" in the same drawer.

**The rest of that page is the same shape and is deliberately still there:** `TakePaymentModal`, `IssueGiftCardModal` and `AddCustomerCreditModal` all `alert(...successfully!)` over fixtures. Converting the page is a separate job; it is named here so the next person does not have to rediscover it.

**Why `check:success-claims` did not catch it:** it did — the file is in its baseline. A baseline entry is a record that something is known, not that it is acceptable.

### 🟢 Retail took money through a simulator, and now takes it through Clover (fixed 2026-08-25)

Two fakes, four call sites, on the screen a shop assistant uses to charge a customer.

```ts
// lib/fiserv-payment-service.ts        lib/clover-terminal-service.ts
await new Promise((r) => setTimeout(r, 500));
const success = Math.random() > 0.1; //  ...and a `clover_txn_<ts>` id
```

`processFiservPayment` and `processCloverPayment` contacted nothing. A facility could ring up a $200 bag of food, be told "approved", and have taken nothing — and **one sale in ten was declined on behalf of a processor that does not exist**. There is no Fiserv account. The second one sat beside a real Clover integration wearing its name, which is the worst place for a pretender to stand.

**Card-present is real now.** `/api/payments/retail/charge` runs the same `lib/clover/charge.ts` and `lib/clover/terminal.ts` that charge a booking. A counter sale is an ordinary `payments` row with a client and a null `booking_id` — nothing needed inventing; `open_payment_intent` already took a null booking. The cart travels to Clover as line items, so the merchant's dashboard shows what was sold, and `transactionId` is now the ledger row's uuid instead of `txn_<timestamp>_<random>`, which could be traced to nothing.

**The terminal picker was fixture too**, and that mattered more than it looks: `mockCloverTerminals` had invented ids, and `X-Clover-Device-Id` wants the **serial**. Retail now reads the merchant's own device list through `/api/payments/clover/terminals`, so the id it hands the charge names real hardware.

### 🟢 A typed card IS charged in retail now, through Clover's own iframes (fixed 2026-08-26)

The retail checkout used to collect `newCardDetails` — a raw PAN, expiry and CVV — into React state through four ordinary `<Input>`s, and then refuse to charge it. The refusal was right: forwarding those digits to our own server would put the number in the logs and this deployment inside PCI scope, which is the single thing a hosted iframe exists to prevent. But the form still asked a customer for their card and did nothing with it.

**The fields are Clover's now.** `components/payments/clover-card-fields.tsx` mounts four iframes served by Clover; the digits are typed in a different origin and this app only ever receives a `clv_` token, which goes to `/api/payments/retail/charge` as `source` — the route that already existed. **There is deliberately no state anywhere holding anything card-shaped, and there must not be.** A single "let me just read the value out of the field" undoes the whole arrangement.

**It was extracted, not written twice.** The mounting, the SDK load and `createToken()` were the body of `clover-checkout.tsx`, which pays a booking. One implementation, so there is one place where this can be got right or wrong. Two traps are recorded in it: `mount()` takes a **CSS selector, not a node** (passing the element fails the whole mount and the only evidence is a generic message), and the per-instance ids come from `useId()` with the punctuation **stripped** — a bare `#:r1:` is a selector syntax error.

**`GET /api/payments/clover/checkout-config`** supplies the three values the browser needs. `/pay/[ref]` reads them server-side, but the retail checkout is a 5,900-line client component and converting it is a refactor of the till, not of card entry. The key it returns is Clover's public browser key: it tokenises and cannot charge, and the merchant's OAuth token never leaves the server. It is still gated on `financial_take_payment` — not for the key's secrecy, but because an open route would tell anybody which businesses have a live merchant account.

**One token per instalment.** A Clover token is single-use, so a split across two cards calls `createToken()` inside the loop rather than once outside it.

**Still refused, honestly: a card ON FILE.** The saved cards this screen offers come from `mockTokenizedCards` and carry a `fiservToken` — a fixture for a processor we have no account with. Charging a stored card at Clover is a different thing and needs the card vaulted **at Clover** when first taken; neither half exists. `savedCardUnavailable()` says so. The save-card checkbox was deleted rather than left: it only ever wrote to a fixture, so the operator believed a card had been kept when nothing had been.

**Never proven end to end.** Every assertion in `tests/e2e/retail-charge.spec.ts` is a refusal, and the e2e facility has no connected merchant, so the config route answers 503 there. A completed typed-card sale needs a connected account and a real card.

### 🟡 The retail charge takes its amount from the browser, and that is the price of this

Every other money route derives what to charge server-side, and `/api/payments/clover/charge` says why in as many words: _"a body that could name its own amount is a body that can pay a $200 boarding stay with one cent."_

Retail cannot do that. Products, prices and the cart are fixtures in `src/data/retail.ts` — there is no row that knows what the sale is worth. The choice was between continuing to simulate money, building the retail data layer first, or taking the money for real from a figure a member of staff typed at a till. The third was judged best, and the limit is bounded rather than hidden: `financial_take_payment` is required **before** Clover is called, the facility comes from the session, the amount is capped at $5,000, and `tests/e2e/retail-charge.spec.ts` asserts every one of those refusals on each push.

**Do instead:** when retail sales become rows, derive the total from them and delete the cap. Until then, do not copy this pattern to a route that has a server-side total available.

### 🔴 Retail refunds ran through a simulator with a 5% failure rate (fixed 2026-08-25)

`processFiservRefund` in `lib/fiserv-payment-service.ts`, called by the retail returns screen:

```ts
await new Promise((resolve) => setTimeout(resolve, 500));
const success = Math.random() > 0.05;
```

A fake latency, an invented `fiserv_refund_<timestamp>` id, and a **random 5% failure** so it would look real. There is no Fiserv account. The screen printed "Return processed successfully".

Worse, there was nothing to refund: retail transactions are `const transactions: Transaction[]` in `src/data/retail.ts` and returns are pushed onto `const returns: Return[] = []`. Both die on page refresh. A retail sale is not a row in Postgres and carries no processor payment id, so no refund of one could ever have reached a processor.

The simulator is deleted and the function is gone. **The business-rule ladder is kept** — enabled refund methods, `managerApprovalThreshold`, per-item reasons, required notes, split-payment allocation — because that is real facility policy and is what a real return will need. A card return is now recorded as `pending` and says plainly that the card has not been refunded; cash, store credit and a gift card are settled honestly, because those really do happen in the room.

**This is finished — and the diagnosis above was wrong, which is the part worth keeping.** It said a refund could not reverse a retail sale "because the return screen has no processor payment id to name". That had stopped being true the same day: `/api/payments/retail/charge` writes a real `payments` row with a real `processor_payment_id`, so the id existed and the sale was reversible. What was actually missing was that the screen could not SEE it — `getAllTransactions()` reads a module array that is empty on every page load, so a sale rung up a minute earlier was already invisible. The fix was a list, not a column. See the entry below.

**The lesson, not the fix:** "there is no id" and "nothing here can reach the id" produce identical symptoms and take opposite work to solve. Check which one before planning against it.

### 🟢 A facility is `<slug>.app.yipyy.com` (moved 2026-08-26)

Facilities hung off the apex (`pawradise.yipyy.com`) until the marketing split; they hang off the app host now.

**`NEXT_PUBLIC_APP_DOMAIN` still holds the APEX, and must.** One variable answers two questions and only the second one moved: `isMarketingHost()` and the apex's own certificate are still measured against `yipyy.com`, while `facilityParentHost()` in `lib/app-host.ts` derives `app.yipyy.com` for everything facility-shaped. Setting the variable to `app.yipyy.com` — the obvious "fix" — makes the marketing domain foreign to its own deployment and costs it its certificate. There is one accessor; route new code through it.

**`facilitySlugFromHost` did not change.** It still demands EXACTLY ONE label before whatever parent it is given, so `a.b.app.yipyy.com` resolves to nothing. Passing the parent instead of the apex was the entire change.

**Old addresses are redirected, not dropped.** `<slug>.yipyy.com/*` answers 308 to `<slug>.app.yipyy.com/*` in `src/proxy.ts` — booking confirmations, review invitations and staff invites already sent carry the old shape. 308 rather than 302 so a POST survives as a POST. Nobody is signed out: the session cookie is `.yipyy.com`, which spans both. `/api/internal/tls-ask` therefore still issues certificates for the OLD shape too — a redirect cannot be served over a TLS connection that was never established.

**Two ordering traps, both paid for here:**

1. **Caddy first, code second.** Caddy's `@foreign` matcher used `*.yipyy.com`, and a Caddy `*` matches ONE label — so `pawradise.app.yipyy.com` was aborted as foreign. Deploying the code first would have started redirecting every facility to a host Caddy refused. The matcher now reads `*.yipyy.com *.app.yipyy.com yipyy.com`.
2. **`url.hostname`, never `url.host`.** Assigning `host` a value with no port RETAINS the existing port, so the first redirect pointed at `https://…:3100/`. And the URL is built from the Host header, not `request.url`, for the reason `lib/request-origin.ts` documents at length.

**Still open:** DNS resolves `*.app.yipyy.com` today only because the `*.yipyy.com` wildcard synthesises for it — there is no closer node. If anybody ever adds an explicit `app.yipyy.com` A record, every facility host under it becomes NXDOMAIN in one edit. Add `*.app.yipyy.com` explicitly before touching that zone.

### 🟢 yipyy.com is the marketing site; app.yipyy.com is the software (done 2026-08-26)

`yipyy.com` and `www.yipyy.com` serve the coming-soon page at `/`. `app.yipyy.com` serves the application. `<slug>.yipyy.com` is unchanged.

**It turned out to need far less than the plan assumed, and the reasons are worth keeping:**

- **`WORKOS_COOKIE_DOMAIN` was ALREADY `.yipyy.com`** in production. The documented trap — a host-only cookie silently signing everyone out across hosts — did not apply, because the widened cookie was already there.
- **WorkOS needed no change at all.** A wildcard redirect URI `https://*.yipyy.com/auth/callback` was already registered, and the app builds its redirect from `requestOrigin()` rather than from a pinned env var, so `app.yipyy.com` was covered before it existed.
- **DNS needed no change.** A wildcard `*.yipyy.com` record already points every name at the VPS.
- **Caddy needed no change.** `app.yipyy.com` matches the catch-all `https://` block and is not `@foreign`.
- **`NEXT_PUBLIC_APP_DOMAIN` stays `yipyy.com`.** It is the apex that subdomains are MEASURED AGAINST, not where the app lives. Changing it to `app.yipyy.com` would make every facility resolve as `<slug>.app.yipyy.com` and none of them exist.

**The one thing that did block it: the TLS certificate.** `app` is one of the 37 RESERVED labels, so `facilitySlugFromHost` answered null and `/api/internal/tls-ask` refused issuance — the handshake failed before anything reached the app. It is now allowed by name, which is safe precisely BECAUSE the label is reserved: no facility can ever be called `app`, so the carve-out authorises exactly one hostname. `tests/e2e/tls-ask.spec.ts` (gate + nightly) asserts the allow list, every other reserved label still refused, unknown subdomains refused, and foreign domains refused.

**The rewrite lives in `src/proxy.ts`, and it has to.** `src/app/route.ts` is a Route Handler and cannot render a page — its header documents the React #310 crash that made it one, and a page cannot share the segment. The proxy is the only place that sees the Host header before routing. It is a REWRITE, not a redirect, so the address bar still reads `yipyy.com`.

**Only `/` moved.** Every other path on the apex still serves the app, so no existing link or bookmark broke on the day of the split — `yipyy.com/sign-in` and `yipyy.com/dashboard` still work. Localhost and `*.test` never match, so `/` in development still opens the portal.

**Still open:** the apex does not know whether you are signed in — deliberately, so the most cacheable URL on the site carries no session branch. Somebody with an account who opens `yipyy.com` gets the marketing page and a "Sign in" link to `app.yipyy.com`, which is what every marketing site does. If that is ever judged wrong, the cookie is already wide enough to decide it per-identity.

### 🟡 The waitlist list is "people who typed an address", not a consented mailing list

`POST /api/waitlist` is **the only public write in the application** — every other route starts with `getViewer()` and refuses an anonymous caller. It cannot, because the visitor has no account.

What stands in for a session is written out in the route: `anon` holds no grant on `waitlist_signups` and there is no insert policy for anybody, so the service role behind that one route is the only writer. The tempting shortcut — a `SECURITY DEFINER` function granted to `anon` — is exactly the shape `supabase/tests/rpc-session-required.sql` exists to forbid. `supabase/tests/waitlist-signups.sql` asserts all nine properties including a positive control, so a table nobody can read cannot pass by being broken.

**What is missing is double opt-in.** Nothing verifies the address belongs to the person who typed it, and it cannot without a confirmation link, a sending domain and a template. Until then the rows are leads, not subscribers — which matters the day somebody sends the launch email. The in-process throttle is honest about being per-instance and resetting on deploy; the durable bound is the unique index on `lower(email)` and the length caps.

### 🟢 Retail can give money back (fixed 2026-08-26)

The counter could take money for a day and not return a penny of it. Closing that needed three pieces, and only one of them was about Clover.

**1. The refund engine was extracted, not copied.** `lib/clover/refund.ts` now holds what `/api/payments/clover/refund` used to hold inline: draining newest-first, the deterministic idempotency key, the card-present-vs-ecommerce branch, retrying a throw but never a refusal, and writing the ledger row from what Clover says happened rather than from what was asked for. The booking route shrank from 381 lines to 173 and kept its behaviour exactly. **Every comment in that file marks a trap paid for once** — the `slice === remaining` bug that asked Clover to reverse $62.50 when $32.50 was left, the tip that makes `/v1/refunds` refuse a partial, the `/v1/orders/{id}/returns` endpoint that refunds the whole order while echoing your amount back. A second copy of that loop would be a second place to pay for the next one.

**2. `GET /api/payments/retail/sales` is the piece that was actually missing.** A counter sale is a `payments` row with `booking_id is null` — that is the whole definition, and it needs no `source` column to distinguish it. Each row carries what is still refundable after anything already given back. A fully-refunded sale stays in the list showing zero rather than disappearing, so somebody looking for yesterday's return finds it done instead of finding nothing.

**3. `POST /api/payments/retail/refund` reverses one.** `process_refund` is checked **before** Clover, not only by `payments_insert` when the negative row is written — that policy fires after the money has moved. The facility comes from the session. The one refusal worth reading twice: **a payment attached to a booking is not refundable here.** `booking_id is null` is part of the row MATCH rather than a check afterwards, so naming a booking's payment returns the same "no counter sale" as naming a stranger's. Refunding one through this door would move the money correctly and leave `bookings.amount_paid` and `payment_status` derived from a ledger the booking screen never learns changed.

**The order in the handler is load-bearing.** The refund is asked for first and the return is recorded only if it lands. A return row written before the money moves is a promise the books cannot keep — and it is precisely the shape the deleted simulator used to produce.

**Unlike the charge, the amount is NOT taken from the request.** A refund has a row to measure against, so the ceiling is computed and an over-refund is refused with the figure that was really available. Do not read the charge route's compromise as a pattern.

**What is still open — one item, and it is a UI limit, not a money one.** A sale's cart went to Clover as order line items and was never written to a table here; `payments` records what was taken, not what was sold. So a real sale offers ONE return line covering what is refundable, and returning it refunds the sale. **Returning a single item off a multi-item sale needs the Clover order read back through `processor_order_id`** — real work, deliberately not faked with invented products. The route already accepts a partial `amountCents`; only the screen cannot ask for one.

`tests/e2e/retail-refund.spec.ts` (gate + nightly) asserts every refusal without moving money: signed out, a groomer, an empty till for anyone without `financial_view_amounts`, a malformed id, a zero and a negative amount, a body naming another facility, and a booking's payment refused. A completed reversal still needs a real sale on real hardware.

### 🟢 The dialog charged the price; the mutation charges the balance

`useTakeBookingPayment` takes `totalCost - amountPaid`. `ProcessPaymentModal` was showing `totalCost`, so a part-paid booking would have displayed one number and charged another. Both call `balanceOf` now, and the dialog shows an "Already paid" line and says "Balance Due".

`useRecordPayment` (grooming checkout) also gained a `["bookings"]` invalidation — a payment moves the booking now, and without it every booking list stayed stale after a groom was paid for.

**Do instead:** when a mutation computes an amount, have the dialog display it through the same function. Two computations of one number is one too many.

## Snapshot (2026-08-06, what a client owes)

### 🔴 The stored client balance said $75; the ledger said $2,695 across six people

`clients.outstanding_balance` was the same defect as `bookings.payment_status`, one level up — and provably so once `amount_paid` existed to check it against:

| client        | stored | unsettled per the ledger |
| ------------- | ------ | ------------------------ |
| Alice Johnson | $0.00  | $1,440.00                |
| John Doe      | $0.00  | $1,005.00                |
| Bob Smith     | $75.00 | $65.00                   |

The one non-zero figure belonged to the only person whose real number it also got wrong. **Bob Smith's $75 was fiction — after reconciliation he owes nothing.**

Not a cosmetic field: `ActiveCallPanel`/`IncomingCallPanel` show it to whoever answers the phone mid-conversation, `lib/calling/routing-rules.ts` ROUTES calls on it, and `lib/facility-export.ts` puts it in the GDPR Article 20 export.

**Do instead:** when a number about money is stored on a parent row, ask what maintains it. If the answer is "whoever remembers", it is already wrong.

### 🔴 "Outstanding" and "booked" were one number, and it was neither

The client overview summed **every** pending non-cancelled booking at **full price** and captioned it "unpaid invoices from finished appointments". A confirmed booking six months out counted as debt; a part-paid booking counted for its whole amount.

Split in 20260806780000: `outstanding_balance` covers `ready` and `completed` only. `checked_in`/`in_progress` are excluded (payment is due at pickup, and a multi-night stay has not earned its total); `no_show` is excluded (a no-show _fee_ is not the booking price). On this database that is **$150**, against **$2,695** for the loosest reading — the gap is entirely money not yet earned.

`upcomingUnpaid()` shows the other figure on its own line, in grey rather than red, because chasing a customer in good standing is the failure this prevents.

**Do instead:** don't add the two together. Write the definition into the migration header — the definition _is_ the number.

### 🟡 The SECURITY DEFINER was right for a reason I had written down wrong

The migration header first said the DEFINER was needed because a cashier lacks `edit_clients` and the UPDATE would be silently RLS-denied. Two probes showed that's not why:

- **Paying** a booking works either way — that path already runs inside `payment_moves_the_booking`, which is DEFINER, so the nested trigger inherits `postgres`.
- The case that needs it is a booking marked **completed by hand**. `supervisor` holds `edit_bookings` without `edit_clients` — a shipped preset — and as INVOKER it fails **twice, in an order that matters**:
  1. `permission denied for function client_outstanding_balance` — **loud**, and it aborts the whole booking update.
  2. Grant the helper to silence that, and the `clients` UPDATE is RLS-denied instead — **zero rows, no error**, stale balance.

So the obvious fix for the loud failure converts it into the silent one.

**Do instead:** when a nested trigger "works", check whether it works on its own merits or because something up the chain is already DEFINER. And prove a stated reason before writing it into a header — a confident wrong comment is worse than none.

### 🟢 A settle-poll that agrees at zero proves nothing

`client-balance.spec.ts` read both figures after the page heading appeared and got two zeroes: the heading comes from the client query, the figures need the bookings query, and **a line whose figure is zero is not rendered at all** — so "not loaded" and "genuinely nothing" look identical.

Polling until two consecutive reads agreed did not help; they agreed at 0 immediately. The signal that works is the _absence_ of "No upcoming appointments", which only goes away once the list is real.

The assertions are deltas, not absolutes. The first version asserted the upcoming line equals $210 and read $1,595 — client 15 is a seeded account with a history of its own.

**Do instead:** for a conditionally-rendered figure, wait on something that proves the DATA arrived, not on the figure itself. And assert deltas against a seeded record.

## Snapshot (2026-08-06, Collect Payment settles what it lists)

### 🔴 The receipt printed before the write, and the write was `() => {}`

`BulkPaymentModal.handleConfirm` called `onConfirm`, closed the dialog, opened a print window reading **"PAYMENT COMPLETE · All N invoices marked as paid"**, and toasted success — in that order, unconditionally, with `onConfirm` returning nothing anybody could await.

On the client overview `onConfirm` was `() => {}`. So the receipt was the _only_ thing that happened: a customer could leave holding paper for money nobody recorded.

This was found by looking at the button the previous change had just put a red banner behind — the dead handler was the thing I went looking for, and the receipt was worse.

**Do instead:** a receipt is an assertion about the ledger. It waits for the ledger. If a confirm handler can't be awaited, that is the bug, not a style question.

### 🔴 A `useState` initialiser is a snapshot of the first render

`const [selected] = useState(() => new Set(invoices.map(...)))`. The dialog is mounted permanently by its parents rather than rendered when open, so that initialiser ran on a first render where the overview had not fetched its bookings yet. The set stayed empty forever and **Continue was permanently disabled**.

It was invisible until the previous change moved that page's bookings from a synchronous fixture to a query. Nothing about the modal changed; its input became asynchronous.

Fixed by inverting the state — it now tracks what the user _unticked_, so an invoice arriving later is selected because nothing says otherwise, and there is nothing to keep in step. Syncing it in an effect also works and is what the React Compiler rejects (`set-state-in-effect`); `setTimeout(fn, 0)` has been used elsewhere in this repo to dodge that rule and is worse than not needing the effect.

**Do instead:** when migrating a fixture read to a query, grep the consumers for `useState(() =>` and `useMemo` seeds. A prop that used to be populated on the first render is the whole failure mode.

### 🟡 The bulk RPC takes booking ids and no amounts

`settle_bookings` (20260806800000) reads each balance itself and returns what it took. A dialog left open while somebody else settles a booking would otherwise send a stale figure — proved by B3: the screen asks for $100 on a booking with $70 already paid, and $30 is taken.

The receipt then prints from the **response**, not from what the dialog was showing, which is the only arrangement where the paper and the ledger cannot disagree. Already-settled bookings come back _absent_ rather than as a zero, and the toast names how many were skipped.

**Do instead:** for any "settle these" action, send the identifiers and let the database price it. A client-supplied amount is a client-supplied price.

### 🟢 `terminal` and `e-transfer` are now real tenders

The dialog has always offered Card, Cash, Terminal and E-Transfer; `payments.method` knew about card-on-file, new-card, cash, package-pass and store-credit. Mapping a terminal tap or an Interac transfer onto `new-card` would record how the money arrived incorrectly, and reconciliation is the job that cares. The CHECK was widened — additive, so no existing row is invalidated.

Note the two payment surfaces still disagree about tenders: grooming checkout offers card-on-file and package-pass, which the bulk dialog does not, and neither offers the other's full set.

**Do instead:** don't map an unknown tender onto a known one to satisfy a CHECK. Widen the CHECK or drop the option.

## Snapshot (2026-08-06, a booking can have things added to it)

### 🔴 A stored generated column is invisible to a BEFORE trigger

`bookings.amount_due` is `generated always as (total_cost + extras_total) stored`, and Postgres computes stored generated columns **after** before-row triggers. So inside `private.derive_booking_payment` — a BEFORE trigger — `NEW.amount_due` is not the value about to be written.

Verified by writing it the naive way: a $100 booking with $100 paid came back **`pending`**, while the stored `amount_due` was correctly 100. That is the dangerous shape — 'pending' is the right answer often enough that the bug reads as normal behaviour, and only fully-settled bookings would have been wrong.

The trigger adds `new.total_cost + new.extras_total` itself. The other two derivations are ordinary reads of committed rows and use the column.

**Do instead:** never read a generated column from a BEFORE trigger. Recompute its expression, and say in the header that you are doing so on purpose — the duplication looks like a mistake otherwise.

### 🔴 A bill that can grow means every balance has to move at once

`total_cost` is the BOOKING's price. It says nothing about a bag of food added at pickup. Three things compared against it:

| function                             | was                         | now                            |
| ------------------------------------ | --------------------------- | ------------------------------ |
| `private.derive_booking_payment`     | `amount_paid >= total_cost` | `>= total_cost + extras_total` |
| `private.client_outstanding_balance` | `total_cost - amount_paid`  | `amount_due - amount_paid`     |
| `public.settle_bookings`             | `total_cost - amount_paid`  | `amount_due - amount_paid`     |

Landing `booking_line_items` without repointing all three would mean a $100 booking with $30 of extras reading **paid at $100**, with the $30 never chased and nothing anywhere disagreeing. That is why 20260806820000 and 20260806840000 are one change in two files.

Same on the app side: `balanceOf` measures against `amountDue`, and `ProcessPaymentModal` stopped computing `alreadyPaid` as `totalCost - balance` — arithmetic that was right only while the bill could not grow.

**Do instead:** when a new column changes what a number _means_, grep every comparison against the old one before writing the table. `total_cost` had three readers; a fourth added later will need finding the same way.

### 🟡 Only the additions are stored; the rest of an invoice still derives

`booking.invoice` carries `subtotal`, `total`, `depositCollected`, `remainingDue`, `tipTotal` and a `payments[]` array. All of those are derivable from the booking plus `public.payments` — and `payments[]` in particular would be a **second payment ledger**, with the on-screen one going stale.

So `booking_line_items` holds only what has no other record: products, add-ons, fees. Nothing else got a table.

**Do instead:** when porting a fixture object, list which of its fields are facts and which are arithmetic. Only the facts need storage.

### 🟢 `retail_process_sale`, not `edit_bookings`

Putting something on a customer's bill is a till job. `retail_process_sale` covers owner, admin, manager, supervisor, reception **and** retail — the people at the counter. `edit_bookings` would exclude `retail`; `financial_manage_invoices` would include the accountant, who reconciles rather than sells.

That choice makes the pass-through in `enforce_booking_integrity` load-bearing again: `retail` has no `edit_bookings`, so without `extras_total` and `amount_due` in its exclusion list, adding food to a completed booking is refused with "This booking can no longer be changed." Verified by removing them.

**Do instead:** when adding a derived column to `bookings`, add it to that exclusion list in the same change, or the trigger that maintains it will be refused for whoever lacks `edit_bookings`.

## Snapshot (2026-08-06, the counter writes to the bill)

### 🔴 Paying with store credit would not have deducted the credit

`record_payment`'s store-credit branch fires on `store_credit_applied > 0`, **not** on `method = 'store-credit'` (20260806760000). The checkout flow offers "Store Credit" as a tender, so wiring it naively — method set, `storeCreditApplied: 0` — records the payment, settles the booking, and never writes the ledger entry that spends the credit. The customer clears their bill and keeps the balance.

`paymentRow` now sets `storeCreditApplied` from the method and drops `amountCharged` to what the tender was actually asked for.

**Do instead:** when a tender IS a balance the business holds, the payment row has to say how much of it was consumed. The method string alone spends nothing.

### 🔴 Five tender vocabularies, and "card" means two different things

| surface                    | tenders                                                            |
| -------------------------- | ------------------------------------------------------------------ |
| grooming checkout          | card-on-file, new-card, cash, package-pass, store-credit           |
| bulk payment               | card, cash, terminal, e_transfer                                   |
| prepayment                 | card _(on file)_, cash, terminal, **ach**                          |
| deposit charge             | card _(on file)_, cash, terminal                                   |
| `lib/invoice-lifecycle.ts` | card_on_file, cash, terminal, e_transfer, store_credit, **custom** |

None is a subset of another, and `"card"` means a NEW card in the bulk dialog and a SAVED card in two others — so the string cannot be mapped centrally without losing which was meant. `payments.method` is now the union (`ach` added in 20260806860000) and each call site maps at the point the label is visible.

`custom` has no honest ledger value at all: `checkoutTender()` throws rather than picking one.

**Do instead:** the real fix is one tender list the dialogs share, which is a product decision about what this business accepts. Until then, map where the label is — and never widen a CHECK to include a value that means "something else".

### 🟡 A late fee has to go on the bill before the money is taken

Checkout adds a late fee and charges in one gesture. Charging first would settle the booking and then reopen it a moment later when the fee lands, so the sequence is: write the line, then take the payment.

The charge also has to be told what the bill now is — `useChargeBooking` refuses more than the balance, and the booking in React state predates the line just written. The refetch has not landed at that point.

**Do instead:** when two writes change a total in the same action, order them so the total only moves once, and pass the new figure forward rather than reading it back.

### 🟢 The tip split still saves nowhere, and now says zero

`TipSplitModal` divides a tip across staff, and there is no per-staff tip table — that belongs to payroll, and building one as a rider on this change would be designing a table to store one dialog's output. `onSave` is still empty.

What did change: `totalTip={invoice?.tipTotal ?? 5}` was a tip amount invented at render time. It reads 0 now, which is true until `payments.tip` is surfaced on the booking.

**Do instead:** when leaving a handler unwired, make sure the numbers around it are at least honest. A fabricated default makes a dead dialog look alive.

## Snapshot (2026-08-06, the kennel board finally has a caller)

> **Resolves** "🔴 There is no screen that shows a booked guest's kennel" (2026-08-06, moving a guest between kennels). It stood open for four changes.

### 🔴 An endpoint tested end to end is not a shipped feature

`PUT /api/boarding/stays` and `assign_boarding_room` had a passing e2e suite and **no caller in `src/`** — the only reference was the comment in `boarding-rooms.ts` explaining why. A guest who needed moving had to be moved in the database.

The deferral itself was right: the note said a hook with no component is dead code with a plausible name, and it refused to write `useAssignBoardingRoom` until the board existed. What the note could not do is make the board happen, and four slices went past.

**Do instead:** when deferring the caller, put the missing SCREEN on the list, not the missing hook. "No `useAssignBoardingRoom` yet" reads as a small gap; "no screen shows a booked guest's kennel" reads as the feature it is.

### 🟡 The occupancy read knew which booking, not whose dog

`RoomOccupancy` was `{roomId, bookingRef, from, to, isOverride}` — enough to grey out a square, not enough to draw a board. "Kennel 3 is taken by #1042" is not a sentence anyone doing the rounds can act on.

It now carries `petNames`, `clientName` and `petType`, joined through `bookings → booking_pets → pets`. `petType` is the FIRST pet's species: a booking with a dog and a cat is not something a category's `pet_type` rule can express, and pretending otherwise would let the board offer a move the constraint then refuses.

**Do instead:** when a read exists to gate an action, check whether it also has to _describe_ the thing. Occupancy for validation and occupancy for a board are different payloads from the same rows.

### 🟡 `AssignablePet.petId` was about to receive a booking ref

`RoomAssignmentBoard` was written for the request dialog, which places a request **pet by pet**. The Kennels board assigns a **booking** — `boarding_stays` keys on `booking_id`, and a booking may cover several pets.

The cheap move was to pass a booking ref in the field called `petId`. That is exactly how this codebase got four room models, three "tag" concepts and five tender lists. It is `AssignableOccupant.id` now, with a doc comment naming what each of the two callers puts in it.

**Do instead:** when a second caller needs a field to mean something else, rename the field. A comment saying "sometimes this is a booking" is the bug, written down.

### 🟢 A near-miss query key invalidates nothing

`useAssignBoardingRoom` first invalidated `["boarding", "rooms"]`. The actual key is `["boarding-rooms", from, to]`. The mutation would have succeeded, the board would have kept showing the old kennel, and nothing anywhere would have errored.

**Do instead:** invalidate with the key factory (`boardingRoomKeys.all`), never a hand-written array. A key that is one hyphen wrong looks exactly like a key that works.

## Snapshot (2026-08-06, the daycare floor)

### 🔴 The check-in board showed dogs who arrived in March 2024

`daycareCheckIns` was a module array read into `useState`, so every arrival and departure was lost on reload. Its own check-in times are dated **2024-03-09 and 2024-03-10** — against a system date of August 2026, the board showed dogs who had been on the floor for five hundred days.

It was not one screen's data either. That array is read by `use-unified-bookings`, `operations-calendar`, `report-data-sources` and `scheduling-workload` — the calendar, the facility reports and the staff workload planner all took daycare attendance from it.

`daycare_attendance` keys on `booking_id` as both PK and FK, exactly as `grooming_appointments` does: a visit is not a second kind of appointment, it is what a daycare booking looks like on the day. The fixture modelled it as free-standing (`petId`, `ownerId`, no booking), which cannot survive contact with the rest of the system — payments, the balance and anything added at the counter all hang off a booking.

**Do instead:** when a fixture array is read by cross-cutting libs, migrating "the module" is not optional scope. Grep for its importers before estimating.

### 🟡 "Booked and not here yet" was not a state the fixture could hold

A visit did not exist until somebody checked in, so there was no way to show a dog due at two o'clock. The day query is now a left join — a booking with no attendance row is `scheduled`.

The status itself is a **generated column** over the two timestamps, which makes it unwritable by anyone: `column "status" can only be updated to DEFAULT`. The fixture stored `status` beside `checkInTime` and `checkOutTime`, the same one-fact-in-two-places defect `payment_status` had.

**Do instead:** when a status is a pure function of the row's own columns, generate it. No trigger, and no writer to police.

### 🟡 One weight→size policy, and it lives in a grooming table

`pets` has `weight`, not a size. The band comes from `grooming_config.pet_size_tiers`, which `create_booking` already uses to price a groom — so daycare reads the same rows rather than inventing a second list. A dog that is "large" at the till and "medium" on the floor is two answers to one question, and the per-size capacity ceilings would count it against the wrong band.

The table is misnamed: those tiers are the FACILITY's size policy, not grooming's. Moving them is a rename with callers, not a rider on this change.

Related: an unknown weight resolves to the LARGEST band. Guessing small would quietly make room under a ceiling that exists to cap big dogs.

**Do instead:** don't add a second size list. If the location bothers you, move the column — don't copy the policy.

### 🟢 The upsert this project usually refuses

`POST /api/daycare/attendance` uses `ON CONFLICT DO UPDATE`, which 20260806640000 rewrote out of `assign_boarding_room` because the two halves fail differently under RLS. The note gave the condition under which it is safe — identical policies for both — and here both are `daycare_check_in_out`, so whoever can insert can update and the update path cannot be the refused one. Written down at the call site, with what has to change if those policies ever diverge.

Also fixed while passing: the dashboard's per-size row had `Giant / 5` typed into the JSX, against a fixture with no giant band at all.

**Do instead:** an upsert is allowed when the earlier note's condition holds. Cite the condition rather than the conclusion.

## Snapshot (2026-08-06, the check-in board writes)

### 🔴 An Undo that restores a local object is not an undo

`DaycareCheckInOutSection` flipped a status in `useState` and offered "Undo" on the toast, which put the previous object back. That is the easy half — undoing a check-in that never reached a server always works.

The Undo is now the **inverse request**: a check-out undoes by `reopen`, and if that request fails the toast says so instead of reporting success. Check-in has no Undo at all, deliberately — reverting a check-in is a different operation with a different meaning, and it is already a button on the card.

**Do instead:** when wiring a local action to an API, the Undo needs wiring too. A restored copy beside a real write is an Undo that lies.

### 🟡 Points were awarded for a stay the database had no record of

The check-out branch fired `recordEvent` (loyalty points, tier progress, badges) and `recordCheckout` (the review-request scheduler) immediately after the local `setState` — so a customer earned points and got queued for a review request whether or not anything was recorded anywhere.

Both now run inside `onSuccess`, after the write lands.

**Do instead:** side effects of a completed action belong after the action completes. Next to an optimistic `setState` they are not optimistic, they are unconditional.

### 🟢 Reverting a check-in deletes the record; checking out keeps it

The same asymmetry boarding draws between clearing a stay and releasing one (20260806640000). Checking out says the visit happened and then ended, so the row and its times survive. Reverting says the check-in was a mistake — the wrong dog, the wrong booking — and a row reading "arrived at 08:02, no longer considered to have arrived" would be a fiction. `DELETE /api/daycare/attendance/[ref]` removes it; the booking stays on the floor as `scheduled`.

**Do instead:** don't unify them into one status field. The asymmetry is the meaning.

## Snapshot (2026-08-06, the boarding check-in board)

### 🔴 The boarding check-in screen was the daycare board

`/facility/dashboard/services/boarding/check-in` rendered `<DaycareCheckInOutSection />`. It had been the daycare fixture on the boarding page for as long as both existed, and nobody noticed because both boards moved objects around in `useState` and a dog is a dog.

The moment the daycare board became real it started posting to `/api/daycare/attendance`, which refuses a non-daycare booking with a 422 — so the boarding check-in screen could not check anybody in at all. **Making one screen real broke a second screen that was quietly borrowing it.**

**Do instead:** before wiring a shared component, grep every page that renders it. A component named for one module can be mounted by another, and a fixture makes that invisible.

### 🔴 The person at the door could not open it

`boarding_stays` is written under `private.can_write_booking`, which asks for `edit_bookings` or `create_bookings`. `boarding_attendant` holds NEITHER — it holds `check_in_out` and `boarding_assign_kennels`.

So the first cut of the arrival columns was unusable by the only role whose job is meeting guests, and the failure was **silent**: an UPDATE refused by a policy's `using` clause matches zero rows and raises nothing. Probed on the live database — `UPDATE 0`, no error, status still `scheduled`.

`record_boarding_arrival` (20260806920000) is the fix: SECURITY DEFINER, gated on `check_in_out`, raising 42501 when refused. Not a second RLS policy, because policies decide which ROWS you may write and never which COLUMNS — one keyed on `check_in_out` would also have handed every holder the right to rewrite `room_id` and `override_reason`.

This is the third time in this run of work: the daycare board nearly gated on `daycare_view_dashboard` (a manager's permission), the kennel read on another manager's. **The permission that names the screen and the permission held by the people standing at it are rarely the same one.**

**Do instead:** before gating a write, list the roles that will perform it and check `role_preset_permissions` for what they actually hold. Then probe the refusal — if it does not raise, it is not a gate, it is a trapdoor.

### 🟡 Three unrendered check-in boards, 3,242 lines

`CheckInOutSection.tsx` (2,008) and `GroomingCheckInOutSection.tsx` (1,234) were imported nowhere; knip listed both under unused files. I had reported the first to the user as "shared by boarding, grooming and training" — read off two comments in other files saying "layout matching CheckInOutSection", not off an import.

**Do instead:** AGENTS.md already says confirm the component is wired before editing it. The same check belongs before _describing_ one — a claim about what a file is used by is as checkable as a claim about what it does.

### 🟢 The paperwork loses to the headcount

`boarding_stays.status` is generated, and `released_at` is deliberately NOT the top of the CASE. A guest who is physically checked in and whose booking is then cancelled reads `checked-in`, not `released` — because the dog is in the building, and a board that drops it off the list is how an animal gets left behind at closing.

The day query makes the same choice twice more: it pulls in anyone checked in and not checked out regardless of dates (an overstay overlaps neither today's arrivals nor today's departures), and it does not exclude cancelled bookings on that second pass.

**Do instead:** when a derived status has to order two facts, ask which one a person could get hurt by not seeing.

### 🟢 Reverting a boarding arrival keeps the kennel; the daycare revert deletes its row

Opposite implementations of the same button, and both are right. `daycare_attendance` means "this dog arrived", so a mistaken check-in leaves nothing to say. `boarding_stays` is the KENNEL ASSIGNMENT, so deleting it would give the kennel away as a side effect of correcting a mistyped arrival — two acts, one press.

Undo also runs backwards: "never arrived" cannot be reached in one step from "collected".

**Do instead:** don't harmonise the two reverts. Check what the row means before deciding what removing it says.

## Snapshot (2026-08-06, the facility home board)

### 🔴 Making one screen real made two screens disagree

`use-unified-bookings` held five module arrays in `useState`, which was uniformly wrong and therefore harmless. Once boarding and daycare arrivals became real, `/facility/dashboard` counted arrivals from fixtures dated March 2024 while `/services/*/check-in` counted them from Postgres. Same facility, same day, two answers, one click apart.

A stale screen is a nuisance. Two live screens that disagree is the thing people stop trusting.

**Do instead:** when a slice makes a source real, grep for every OTHER reader of the fixture it replaced. The divergence arrives with the fix, not before it.

### 🔴 `deriveLocationId` is `ref % 3`, and it was about to hide real bookings

The pseudo-location filter hashes the trailing number of a fixture id into one of three locations. Harmless over mock data designed to spread evenly; applied to real rows it would have hidden roughly two thirds of a facility's actual bookings, chosen by booking reference, the moment anyone picked a location from the selector. Dormant by default only because facility 11 defaults to the HQ view.

The filter now applies to the fixture-backed sources only. Rows from Postgres are already scoped by `facility_id` and have no location to derive.

**Do instead:** a fixture-era derivation is not a neutral default. Check what it does to real data before letting real data reach it.

### 🟡 A no-show is not a departure

The dashboard's check-in dialog sent `checked-out` with a `noShow` flag. Against the real write paths that asks the database to record a guest LEAVING who never arrived — boarding refuses it outright, daycare's CHECK constraint refuses it too. It "worked" for as long as the destination was a local array.

`useMarkBookingNoShow` writes `bookings.status = 'no_show'`, which is already load-bearing: `sync_boarding_stay` releases the kennel on it exactly as on a cancellation, so a guest who is not coming stops holding a room.

Found while wiring it: the boarding day query excluded `cancelled,declined` but not `no_show`, so a no-show kept its place on today's board reading `released`, and the dashboard mapped that to "Checked Out" — counting a departure for somebody who never arrived.

**Do instead:** when a flag rides on a status that is about to become real, check whether the flag names a DIFFERENT transition. `noShow` was never a kind of checkout.

### 🟡 Grooming's read is not day-scoped, and three of five sources still are not real

`groomingQueries.appointments()` serves the calendar and the detail page as well, so it returns every appointment there has ever been. Unfiltered on the dashboard, a groom completed in June landed in "Checked Out" on a tile labelled _today_. Filtered in the hook rather than by adding a day variant, because that query is already cached for six other screens.

Training and custom services have no table and no endpoint. They stay `useState` over a fixture, and their toasts now say `not recorded yet` rather than claiming a record that does not exist.

**Do instead:** don't invent tables to make one file tidy. Mark the seam at every point it is used and leave the schema decision to its own change.

### 🟢 Waiting for a heading is not waiting for hydration

Three of the four dashboard tests failed on a tile click that Playwright reported as successful. Actionability checks pass as soon as an element is visible and stable — they cannot know whether React has attached the handler. The board stayed on the arrivals tab and the assertion failed somewhere else entirely, which is what made it take four rounds to find.

`expect(async () => { click; assert active }).toPass()` re-clicks until the tile reports itself active, which is the only observable proof the handler ran.

**Do instead:** for a click on a freshly navigated client page, assert the CONSEQUENCE inside a retry, not the click.

## Snapshot (2026-08-06, checkout takes the money)

### 🔴 A checkout that took a payment and recorded nothing

`handlePaymentConfirm` on the dashboard booking card toasted `Charged $X via card`, awarded loyalty points, consumed a discount voucher, "sent" a report card and marked the booking checked out — and **called no payment endpoint at all**. The money was never recorded, so the booking stayed unpaid, the client's balance never moved, and the only trace of the transaction was a toast that had already faded.

It now goes through `useTakeBookingPayment`, which takes the BOOKING and works the balance out itself against `amount_due`. Every side effect moved inside the success path.

**Do instead:** a handler named `onConfirm` for money is the first place to check for this shape. The tell is a `toast.success` with an amount in it and no `await` above it.

### 🔴 A React portal bubbles up the React tree, not the DOM tree

The check-in and check-out dialogs are portalled to `document.body` but are JSX children of the card, so every click inside them also fired the card's own `onClick` — which routes to the booking overview.

Confirming a check-**in** navigated the operator away from the board (the write had already fired, so it looked merely rude). Confirming a check-**out** was worse: the route change tore the card down before `setPaymentOpen(true)` could render anything, **so the payment step never appeared at all**. The guest was marked departed and nobody was ever asked for the money.

The payment flow was already wrapped in a `stopPropagation` div — somebody hit this once and fixed only the symptom in front of them. All three are wrapped now.

**Do instead:** if a card is clickable and renders a dialog, the dialog needs the wrapper. Fixing one and leaving its siblings is how this survived.

### 🟡 The modal was showing the wrong bill

`depositPaid` was hardcoded to `0` and the total was `price + lateFee`, so a booking with a deposit against it was presented for the full amount again. Worse for boarding and daycare, whose `price` was `undefined`: the modal offered to charge the late fee on its own.

`amountDue`, `amountPaid` and `totalCost` now travel from the booking through all three real sources onto `UnifiedBooking`.

**Do instead:** when a screen has to show money, carry the derived columns to it. A screen that recomputes a bill is a second answer to a question the database already answers.

### 🟢 The late fee goes on the bill, not on the payment row

`computeLatePickupFee` produced an amount that was toasted and then forgotten. It is written as a LINE ITEM first (20260806820000), which raises `amount_due`, and the payment that follows covers it. Stapling it to the payment instead would leave the booking owing a fee its own bill had no record of.

Caught while writing this: the first draft added the fee when deciding whether anything was owed and left it out of the amount charged — taking the money for everything except the fee that triggered the charge.

**Do instead:** one figure, computed once, used for both the check and the charge.

## Snapshot (2026-08-06, a tip is owed to somebody)

### 🔴 `onSave={() => {}}`

`TipSplitModal` computed the split four ways, refused to submit unless the allocations balanced to the cent, said "Tip split saved" — and threw the result away. The tip was real money (`payments.tip` has been real since 20260806680000); who earned it was recorded nowhere, so payroll had nothing to pay out.

The staff it offered to split between were five hardcoded strings: "Jessica M.", "Amy C.", "Sarah K.", "Mike R.", "Emily T." Not the facility's people, and not anything a wage could be attached to.

**Do instead:** a `() => {}` handler on a modal that validates to the cent is the highest-value thing on any sweep. The care taken over the arithmetic is what makes it look finished.

### 🟡 The ceiling lives in another table, so it is a trigger

Allocations may not exceed `sum(payments.tip)` for the booking. A CHECK cannot see another table, and the trigger is SECURITY DEFINER because `payments` is FORCE ROW LEVEL SECURITY — a till operator who may split a tip cannot necessarily read every payment row it came from, and a guard that sees only some of them is not a guard.

It compares the whole booking's allocations against the whole booking's tips rather than row by row: the modal saves a set, and any single row of a valid set can exceed the total on its own.

**Do instead:** when a limit spans tables, write the trigger and give it a positive control. T2/T3 in the suite are that pair — remove the ceiling and T2 goes green while T3 stays green.

### 🟡 `take_payment`, not `edit_payroll`

`edit_payroll` is owner and admin only. Splitting a tip already in the drawer is a till operation — recording who earned it, not changing what anyone is paid — and the person doing it is whoever closed the ticket. Gating on `edit_payroll` would have locked reception out of a modal they are standing in front of.

Fourth time this shape has come up in this run of work (daycare board, kennel read, boarding attendant, now tips).

**Do instead:** name the roles who will perform the action before choosing the permission, and check `role_preset_permissions` rather than guessing from the permission's name.

### 🟢 An allocation names a person by id, and two services by one groomer merge

`staff_id` with ON DELETE RESTRICT: a name is not something payroll can pay, and a row saying $12 is owed to a deleted staff member is a debt with no creditor. `calculateTipSplit` maps 1:1 over invoice lines, so two lines handled by the same person produced two entries — and `unique (booking_id, staff_id)` would have rejected the second. They are merged before saving.

**Do instead:** check whether a per-line calculation can produce two rows for one key before putting a unique constraint behind it.

## Snapshot (2026-08-06, the booking-detail link)

### 🔴 A redirect that resolved its destination from the mock array

`/facility/dashboard/bookings/[id]` was 1,197 lines of booking-detail UI behind a mount-time `router.replace` — and the replace looked the booking up in `initialBookings`:

```
const booking = initialBookings.find((b) => b.id === bookingId);
useEffect(() => { if (booking?.clientId) router.replace(...) }, [booking, router]);
```

A booking created since the migration is not in that array, so the effect never fired and the page fell through to its own "Booking not found." **Every link to this route was broken for real data**, and there are eight of them: Billing (×5), the check-in screen, the client page, the kennel view.

It is a server component that resolves the destination from Postgres and answers with a redirect, or a 404 for a booking that genuinely is not there — which under RLS is the same answer as "not yours", correctly.

**Do instead:** a redirect is a route's contract, not a detail. When one is computed from data, check which data — a fixture lookup fails open into whatever the page renders next, and here that was a dead end nobody could get past.

### 🟡 The hollow-money-handler count was never trustworthy

I have been quoting "27 candidates" for several changes. The detector could not see a destructured mutation:

```
const { mutate: recordPayment } = useRecordPayment();
```

`recordPayment(...)` contains none of the words it looked for, so three grooming payment handlers that DO record payments were on the list. It also matched inside comments, so every note written about a bug just fixed came back as a fresh instance of it.

Two of the remaining entries were in the page deleted above. The list is now 26, and it is still a list of CANDIDATES — the only entries I have read and confirmed are the four already fixed and the three grooming ones confirmed fine.

**Do instead:** a sweep that cannot resolve an alias produces a number, not a finding. Quote it as "candidates, N audited" or do not quote it.

## Snapshot (2026-08-06, prepaid credit is store credit)

### 🔴 Two balances for one customer, and only one was honoured

`store_credit_entries` is the real ledger — `record_payment` spends from it, a refund to credit writes into it, `client_store_credit` sums it. Meanwhile `/facility/services/memberships` kept `prepaidCredits`: a fixture list in `useState` whose "Add credits" dialog took a **typed-in customer name** and invented an id to hang it on (`cust-${Date.now()}`).

So a facility could issue $200 of credit to a customer who did not exist, see the balance on screen, and the customer's real balance would never move. The two row actions were worse: "Refund balance" toasted _"Refund initiated"_ and did nothing at all, and "Remove" deleted the row from local state.

**Do instead:** when a screen names a person by a typed string, ask what the write keys on. A free-text customer field over a table with a `client_id` foreign key is the tell.

### 🟡 The expiry date is gone, on purpose

The fixture had `expiresAt` per credit. The ledger has no such column, and that is the better model: `expired` is one of its _reasons_, so expiry is recorded as a negative entry on the day it happens. A date typed into the dialog would have been a promise with nothing to keep it — no job reads it, so the credit would have stayed spendable past the date the screen displayed.

**Do instead:** don't carry a fixture field across just because the form had it. Ask what enforces it.

### 🟢 Three numbers for one fact, again

`balance`, `totalPurchased`, `totalUsed` and `lastUsedAt` were stored side by side with nothing keeping them in step — the same shape as `payment_status`/`amountPaid` and `boardingCapacity`. All four are sums over the entries now.

And the ledger being append-only shaped the e2e: cleanup is a **balancing entry**, not a delete, because there is no delete policy. That is the same act the "Return balance" button performs, which is a decent sign the model is right.

**Do instead:** if the cleanup for a test cannot be a delete, that is the schema telling you something about the domain — write the test the way the domain works.

## Snapshot (2026-08-06, where the pet actually is)

### 🟡 I had the "two vocabularies" problem framed wrong

I wrote in three commit messages that grooming and daycare/boarding record arrival differently and that this needed reconciling — implying daycare and boarding should move `bookings.status` too. That would have been wrong twice.

**It does not work.** `enforce_booking_integrity` lets a caller through only if they hold `edit_bookings`; everyone else gets "You may only cancel this booking." `boarding_attendant` and `daycare_attendant` hold neither `edit_bookings` nor `create_bookings`. So an attendance write that also moved the status would have been refused for the only people who perform it — and the way out would have been a bypass flag on the one guard that stops a customer editing a booking's price.

**And it is the wrong model.** `bookings.status` is a lifecycle: requested → confirmed → completed → cancelled. Whether a dog is standing in the building is a different axis. Grooming's `checked_in`/`in_progress`/`ready` are a workflow parked in the lifecycle column; copying that into two more services would have spread the mistake, not reconciled it.

`booking_presence` derives the answer instead. Nothing is copied, so nothing can drift.

**Do instead:** before "making X consistent with Y", check which of the two is right. A repeated note in commit messages is not evidence — it is the same guess, restated.

### 🟡 `unknown` meant two things, and the first cut of the view shipped that

The view began as a UNION over the three attendance tables. A daycare booking has **no** `daycare_attendance` row until check-in — 20260806880000 decided that deliberately so "booked and not here yet" is a real state — so it came back `unknown`, indistinguishable from training, which has no table at all.

Driving off `bookings` and left-joining fixes it: the SERVICE decides whether attendance is tracked, the join decides what has happened. `unknown` now means exactly one thing.

**Do instead:** when adding a sentinel like `unknown`, enumerate every path that reaches it. Two causes with one name is the ambiguity the view existed to remove.

### 🟢 The view immediately found nine dogs that had been on site for days

All nine were e2e leftovers: `daycare-attendance.spec.ts` cancelled its bookings but never reverted the check-ins, so the attendance rows stood with `checked_in_at` set for ever. Invisible until something asked the question across services.

The suite's `afterAll` now reverts the check-in before cancelling, and so does the new one.

**Do instead:** a cleanup should undo what the test did, in reverse order. Cancelling the parent is not the same as undoing the child, and the child is what the derived reads see.

## Snapshot (2026-08-06, training joins the building)

### 🔴 The training check-in board was two module arrays

`ServiceCheckInBoard` reads `useUnifiedBookings`, which built its training rows from `trainingSessions` and `enrollments` — fanned out into one row per attendee with a composite id (`sess-3:enr-12`) that referred to nothing in the database. Checking a dog into a class flipped a status in `useState` and was gone when the tab closed. `booking_presence` reported every training booking as `unknown` for the same reason: there was no table to ask.

`training_attendance` is keyed on `booking_id`, exactly as daycare and boarding are, so the three read identically and the presence view joins all of them the same way.

**Do instead:** a composite id built from two fixture arrays is a reliable sign the screen has no backing. Grep the id format before estimating.

### 🟡 The permission was checked first this time

`run_training_sessions` is the obvious gate and it is wrong: owner, admin and trainer hold it, and **reception does not**. The person meeting a dog at the door for a six-o'clock class is whoever is on the desk. The policies use `check_in_out`.

Fourth occurrence of this shape in one run of work — daycare's board, the kennel read, the boarding attendant, now training. The difference is that this one was checked against `role_preset_permissions` before the migration was written rather than after it failed.

`run_training_sessions` remains right for what a trainer does _inside_ a session — progress, skills, certificates. Different table, different change.

### 🟢 One row per booking, not per session

The tempting model is a `training_sessions` table with an attendee list. But a booking is already per-pet, and attendance is a fact about a dog turning up rather than about a class happening. The class itself — name, curriculum, size — still has no table, so `groupNote: "Class size: 6"` is gone rather than faked, and `resourceLabel` is the booking's service variant.

**Do instead:** when a fixture models a group and the database models the individual, follow the database. Adding the group later is additive; splitting the individual out of a group row is not.

### 🟢 A test made obsolete by the change it was guarding

`booking-presence.spec.ts` used training as its example of "a service with no attendance table". Training now has one, so the test failed by reading `expected` — the change working, and the test right about the wrong example. It uses a custom-service module now, which genuinely has none.

**Do instead:** when a test picks an example to stand for a category, expect the example to graduate out of it. Name the category in the comment so the next person knows what to substitute.

## Snapshot (2026-08-07, a trainer is a member of staff)

### 🔴 The instructor picker offered four people who do not work here

`trainers` in src/data/training.ts: four invented people with their own ids ("trainer-001") and their own @yipyy.com addresses. This facility employs two trainers — Marcus Bélanger and Noémie Fortin — and **neither was on that list**. Somebody assigned to a class from the old picker could not be paid for it, rostered against it, or messaged about it.

The list is `staff` now, filtered by role.

**Do instead:** when a fixture array holds PEOPLE, check `staff` before anything else. A parallel roster is the one kind of fixture that produces a name nobody can act on.

### 🟡 The profile is optional here and mandatory for stylists, on purpose

`grooming_stylist_profiles` takes the opposite line: a groomer with no grooming profile is deliberately absent from the picker, because `Stylist` promises a skill level and a daily capacity that a scheduler reasons about, and inventing those would put a fabricated groomer into an assignment decision.

Nothing on a trainer profile is load-bearing like that — specialisations, a bio and a certification list are things a customer reads. So the list comes from the role and the profile only decorates it. A trainer nobody has written a bio for is still a trainer, and the migration seeds nothing.

`additional_roles` counts too: a caretaker who also runs the puppy class has `trainer` there and `caretaker` as their primary, and filtering on `primary_role` alone would have hidden them.

**Do instead:** copy a precedent only after asking what made it right. The stylist rule protects a scheduling input; there is no scheduling input here to protect.

### 🟢 Nothing invents a rating

The fixture carried `rating: 4.9` and `totalClasses: 342` for people who do not exist. Both are derivable once sessions and reviews are real; neither is guessed at, and the payload simply omits them.

### 🟢 Two test lessons, both costly in wall-clock

An eight-minute timeout on a button label I guessed at (`/new series|add series/`) — the real one is "Create Series", and reading `series-list.tsx` would have taken ten seconds. And the test then passed alone and failed in sequence, which is the pre-hydration click again: Playwright's actionability checks pass before React attaches the handler. Wrapped in `toPass`, the suite runs in 18 seconds.

**Do instead:** read the label out of the component. Retry any click that opens something on a freshly navigated client page.

## Snapshot (2026-08-06, one address, two identities)

### 🔴 Two Clerk instances share one Supabase project, so one person can hold two profiles

`houssemsina123@gmail.com` held two rows in `profiles` — `user_3HVlmtt…` (Development instance, 22:08 on 08-05) and `user_3HXXALre…` (Production, 11:21 on 08-06). Both were written by the sync webhook; neither was inserted by hand.

The proximate cause was a window during the migration: the production webhook secret reached Vercel _after_ the Development instance had been pointed at the live site, so dev-instance events verified successfully against the production database for a few hours. That window is closed.

**Why it's risky:** the shape that allowed it is permanent while one project serves both environments. ADR 0003 explicitly reasoned that "subjects cannot collide — Clerk mints different user ids per instance," which is true and is exactly backwards as reassurance — different ids per instance is how one human ends up with two rows. Grants hang off `profiles.id` (`facility_memberships.profile_id`, `clients.profile_id`, `is_platform_admin`), so a duplicate silently makes authorization depend on which instance issued the token. It fails on a different day than it breaks, and nothing on screen connects the two.

> **Still live under WorkOS (2026-08-17).** Changing provider changed nothing here: Staging and Production are separate WorkOS environments with separate user namespaces, still sharing one Supabase project. Read "instance" as "environment" throughout this entry.

**Do instead:** nothing manual — `profiles_email_lower_key` (migration `20260806160000`) now makes it impossible. Two things to know before touching that area:

- **The index alone would be a trap.** The webhook upserts on `id`, so a new provider id carrying a known address is an INSERT, which raises `23505`. Left unhandled that 500s, the sender retries on a fixed schedule forever, and the person owns a login with no profile — refused by every gate with nothing explaining why. [`src/app/api/webhooks/workos/route.ts`](../../src/app/api/webhooks/workos/route.ts) handles `23505` and the pre-flight case explicitly, returning **200** because a retry can never resolve a claimed address. Do not "fix" those 200s into 500s.
- **Both layers earn their place.** The pre-flight lookup can name both ids in the log; the index catches what a lookup cannot — two deliveries racing, and addresses differing only in case.

### 🟢 A dry-run guard beats `duplicate key value violates unique constraint`

The migration refuses with the offending rows named (`houssemsina123@gmail.com — 2 profiles: user_3HVlmtt…, user_3HXXALre…`) rather than Postgres's generic unique-violation text, which tells you a duplicate exists but not which one or how many.

**Do instead:** when adding a uniqueness constraint to a table that already has rows, front it with a `do $$` block that aggregates and raises the conflicts. It costs six lines and turns "the migration failed" into a work item.

## Snapshot (2026-08-06, the grant path the cutover left behind)

### 🔴 A type change that Postgres did not complain about, so nothing failed

`20260805223000` turned `profiles.id` and `facility_memberships.profile_id` into `text` holding a Clerk sub, and rewrote the 13 identity helpers. It did **not** change `link_staff_invite`, which still declared `p_user_id uuid` — and `specs/001-clerk-third-party-auth/plan.md:44` had named that exact step:

> "`link_staff_invite`'s `p_user_id uuid` parameter must become `text` — a signature change, so the old overload must be dropped, not just replaced."

Postgres casts uuid to text without a murmur, so the function kept working and kept being wrong. Measured on the live project: inviting a hire wrote profile id `11111111-2222-3333-4444-555555555555` and granted it a real `facility_memberships` row. No Clerk session can present that subject, and `20260805233000`'s `id !~ '^user_'` rule classifies it as a pre-Clerk identity to be deleted.

**Why it's risky:** this was the ONLY code path that creates a membership, and `has_permission()` resolves entirely through that table. So `facility_memberships` was empty and could not refill — the two people who had signed in through Clerk held no membership, `viewer.ts` routed both to `/customer/dashboard`, and RLS showed them nothing anywhere else. **Every screen looked fine and was empty, with no error in any log.** Nothing in typecheck, lint or the build could see it: the defect was a live-database fact.

**Do instead:** when a migration changes a column's type, check the FUNCTIONS that take that column as an argument, not only the ones that read it. `information_schema.columns` and `pg_get_function_identity_arguments` disagreeing is the signal, and only a catalog query finds it. `supabase/tests/rpc-session-required.sql` V3b now asserts no uuid overload survives.

### 🟡 The invite could not create an account any more, and did not say so

The route called `admin.auth.admin.generateLink({type:"invite"})` to make a GoTrue user. Clerk owns sign-up now, so that account authenticates nothing — but the route still returned `sent: true`. A manager invited a hire, saw a green toast, and the hire could never sign in.

**Why it's risky:** the chicken-and-egg is permanent, not transitional. Clerk will not mint a subject for somebody who has not signed up, so **there is no id to grant to at invite time.** Any future "just create the user" instinct hits the same wall.

**Do instead:** `20260807120000` records the grant against the ADDRESS on the staff row (`facility_membership_grants`) and a trigger on `profiles` claims it when a profile appears carrying that address. Three properties are load-bearing:

- **No email argument.** `record_membership_grant` reads the address off the staff row, exactly as it reads the facility and the role. An email parameter would let anyone with `manage_staff` grant their own facility's owner role to an address they control.
- **The claim is a trigger, not an RPC.** It needs to write a membership for somebody who is not the caller. As a `public` function that is a tenancy-granting front door on PostgREST — and `revoke ... from public` does not revoke from `anon`, which is why we shipped that bug twice already. A trigger has no URL.
- **Grants expire.** The route passes the template's invite window. An invitation nobody took up must not stay a live route into the facility.

### 🟢 The safety rests on Clerk verifying the address, and that is the part to keep

An address is a claim anyone can type into a sign-up form. What makes a grant-by-email safe is that Clerk verifies the address (Google, or a confirmed email/password sign-up) **before** the webhook writes the profile — so the trigger only ever fires for somebody who proved it. `supabase/tests/membership-grants.sql` fixes the parts that are ours: no self-service grant (D4/D5), no claim by another address (D2), no claim after expiry (D3), and no tenancy for an ungranted sign-up (D1).

**Do instead:** if the profile write ever moves off the verified-webhook path, this trigger becomes an escalation. Re-read D1 before changing who may insert into `profiles`.

### 🟢 Two wrong assertions, both mine, both caught by running it

`G4` first asserted `grooming_check_in_out` (a key that does not exist — a groomer holds `check_in_out` and `perform_grooming`) and counted memberships unfiltered, which returns 2 because `memberships_read` deliberately admits colleagues at the same facility. The code was right both times.

**Do instead:** read `role_preset_permissions` for the role before naming a permission in a test, and read the policy before asserting on a row count. This is the fourth occurrence of the screen-name-versus-permission-name trap in this map.

## Snapshot (2026-08-06, the e2e suite under Clerk)

> **Provider-specific mechanics below are superseded (ADR 0004, 2026-08-17).** Clerk is gone: `_clerk-keys.ts` is now [`_workos-keys.ts`](../../tests/e2e/_workos-keys.ts), and `signIn()` drives our own form instead of a vendor SDK. WorkOS has **no keyless mode** — absent keys fail loudly — so the specific trap in the first entry cannot recur.
>
> The entries stay because the **transferable** lesson outlived the vendor and is still the fastest route out of a mystery 401: an identity provider will happily issue a session that Supabase then refuses, so "signed in" and "can read the database" are different bars — **decode the JWT's `iss` first.** `_auth.ts` still distinguishes the two 401s for exactly this reason.

### 🔴 Clerk's keyless instance signs you in and then Supabase refuses everything

`bun run dev` without `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` / `CLERK_SECRET_KEY` drops into Clerk's **keyless mode**, which provisions a throwaway instance into `.clerk/.tmp/keyless.json` and boots cleanly. Sign-in works. `auth()` resolves a subject. And then every database read fails.

Supabase's third-party auth accepts tokens from the instances **registered on the project** — per ADR 0003, the development and production Clerk instances side by side. A keyless instance is created on the fly and is registered nowhere, so its tokens come back:

```
PGRST301  No suitable key or wrong key type   (HTTP 401)
```

**Why it's risky:** nothing surfaces the real cause. `getCurrentUser()` throws, `/api/permissions` catches it and answers `401 "Not signed in."` — to a caller who is demonstrably signed in — and every portal bounces to `/sign-in?next=…` as if the session were absent. Three plausible explanations (instance mismatch, stale keys, Playwright's cookie jar) all had to be measured and eliminated before the fourth was even visible. A temporary route reporting `auth()`, the token's `iss` and the raw Supabase error found it in one request.

**Do instead:** treat "the app boots" and "the app can read its database" as different bars. `tests/e2e/_clerk-keys.ts` now warns loudly when it falls back to keyless rather than presenting it as a working configuration, and `signIn()` in `tests/e2e/_auth.ts` distinguishes the two 401s and prints the token issuer plus the fix. If you are debugging an inexplicable "not signed in", **decode the JWT's `iss` first** — it is one line and it is the answer.

### 🔴 `clerk.signIn({ signInParams })` resolves without throwing when the strategy is disabled

The client-side form (`strategy: "password"`) only works if that first factor is enabled on the instance. When it is not, it does **not** raise — it returns normally and leaves `window.Clerk.user` null.

**Why it's risky:** the failure surfaces 60 seconds later at whatever the next assertion is, pointing at the server. Two separate debugging sessions blamed `auth()`, the proxy and the Supabase client before anyone checked whether sign-in had happened at all.

**Do instead:** `clerk.signIn({ page, emailAddress })`. It goes through the Backend API with `CLERK_SECRET_KEY`, bypasses first-factor configuration, and cannot be silently disabled from the Clerk dashboard. The password journey is a thing to **test in one spec**, not a thing 36 specs depend on.

### 🟡 Next 16 refuses a second dev server for the same directory, whatever the port

`--port 3001` does not help: the guard is per-directory (`Another next dev server is already running… Dir: C:\dev\puneet`). So a second developer — or an agent — cannot stand up an isolated server to test against while one is running, and silently ends up testing against **someone else's**, with their keys and their half-finished edits.

**Do instead:** check `Get-NetTCPConnection -LocalPort 3000` before concluding anything about a dev-server behaviour you cannot explain. Confirm which process owns it and when it started; `.next/dev/logs/next-development.log` is readable and says what that server has been doing.

### 🟢 The account seed is a script now, because a Clerk id cannot be written down in advance

`supabase/seed/dev-accounts.sql` could choose its own uuids because it created the accounts. Clerk mints the subject, so `scripts/provision-e2e-identities.ts` creates the identity first and writes the profile, membership and `fs-dev-<role>` staff row second. The role mapping is copied from the SQL seed rather than reinvented — this is a change of identity provider, not of what the fixtures mean.

It also deletes a stale profile for the same address before upserting, which is what makes re-pointing the suite at a different Clerk instance a one-command operation rather than a `23505` on `profiles_email_lower_key`.

## Snapshot (2026-08-07, what Yipyy sells)

### 🔴 "Module" means four different things in four files, and three of them are the same thing

`src/data/facilities.ts` (8 entries, short ids like `booking`), `src/data/feature-toggles.ts` (12, long ids like `module-booking`), and `src/data/modules.ts` (17, long ids, with prices, dependencies and a minimum tier) all describe the same product: what Yipyy sells to a facility. `src/data/service-modules.ts` describes something else entirely — what a facility sells to a pet owner.

**Why it's risky:** the first three disagree on the count AND the price. `facilities.ts` prices Booking at $29.99/mo; `modules.ts` prices it at $0. Both readings are defensible ("what it's worth" vs "what it adds to the bill") and nothing says which one a given screen means. Three separate files carry a `SHORT_TO_LONG` bridge to paper over the id mismatch.

**Do instead:** read entitlements from the database. `public.modules` is the catalogue (17, priced as _what this adds to the bill_, so a plan-included module is 0), `public.tier_modules` is what each plan includes, and `public.facility_modules` holds only the departures from that. `public.facility_module_entitlements(facility_id)` puts them together; `public.facility_has_module(facility_id, module_id)` is the boolean, shaped so a future RLS policy can call it. The mock files still exist and still feed the flags console — don't add a fifth vocabulary, and don't "fix" a mock price to match the database.

### 🟡 Entitlements are recorded; nothing is gated on them

Turning a module off in the Modules tab records a withdrawal. It does not lock anyone out of a screen, and the tab says so in as many words.

**Why it's risky:** the obvious next step — make the sidebar or a route honour `facility_has_module` — would immediately shut working businesses out of what they already use. Every live facility is on Puppy, which includes Booking, Customer Management and Communication. The demo facility runs grooming (14 appointments), boarding, daycare and training on that plan, and _no_ plan includes Daycare/Boarding at all, which is the tier data as written rather than an import error.

**Do instead:** treat enforcement as its own change, and start by fixing the tier lists, not the enforcement point. A gate switched on over today's data is a production outage for every facility on the platform.

### 🟢 The resolver stores exceptions, so a plan change moves everyone who never negotiated

`facility_modules` holds departures, not state: no row means the plan decides. Changing what Pack Leader includes moves every facility on Pack Leader except the ones with a bespoke arrangement, and "reset to plan" is a DELETE — which is exactly what it means. The alternative, copying the plan into rows at provisioning time, makes both of those into migrations.

### 🟢 An audit entry that names the wrong act is worse than no entry

The first cut of the `facility_modules` audit trigger derived its action from `new.enabled`, so agreeing a $0 price logged "Module enabled … enabled -> enabled". Caught by the migration's own verification (E8b) rather than in review. Corrected in `20260807580000` to name which of enabled/price/expiry moved.

**Why it matters beyond wording:** on an append-only table the entry can never be edited or removed, and a plausible-but-wrong entry ends the question that a missing entry would have prompted.

### 🔴 The owner-only section is gated by a cookie the browser can write

`requireFacilityOwner` ([src/lib/facility-owner-guard.ts](../../src/lib/facility-owner-guard.ts)) reads the `facility_role` cookie and calls `forbidden()` if it does not say owner. That cookie is one of the three [viewer.ts](../../src/lib/auth/viewer.ts) names as client-writable from devtools — the scheme the Clerk cutover replaced for access, and kept only for steering UI.

It guards four pages: Yipyy Agreements, Subscription, Payment Method and Export Data.

**Why it's risky:** not because data leaks — RLS decides that from the Clerk subject, and the architecture note in viewer.ts is explicit that these gates are routing rather than access. The risk is that it _reads_ like an access check, so the next person to add an owner-only route may put a real capability behind it and believe it is protected.

**Do instead:** in a route, resolve the role from `getViewer().memberships` — as `GET /api/facility/export` does — and never from the cookie. If you add an owner-only page, assume its guard is decorative and put the real check in whatever the page calls.

### 🟢 A hardcoded id in a client page reached a real user

`/facility/account/export` passed `defaultFacilityId={11}` into a component reading `src/data/*`, so every owner exporting their data received facility 11's fictional records — not an empty file, somebody else's, on the screen that answers a portability request.

The standing note that the ~97 client-side `facilityId: 11` occurrences are mock-only and should not be converted still holds for the rest of them. This one was different because a real signed-in owner could reach it and be handed a wrong answer. The distinction to apply: is the screen reachable by a real user, and does it make a claim about _their_ data?

## 2026-08-08 — Clover card payments

### 🔴 Fifteen defects, and all but one were found by running the code

Worth recording as a pattern rather than fifteen items, because the pattern is
the lesson. Across two days of Clover work: the card fields never mounted
(`mount()` takes a selector, not a node); a declined card returned 500 (Clover
sends no `error.type` on a decline, only HTTP 402); three separate **429s** from
Clover that were swallowed as nulls; a refund that omitted its amount asked for
the whole original charge; a network throw with no `catch` left the outcome
unknown; a token refresh relabelled a connection's environment; two concurrent
refreshes took a facility offline because Clover **rotates refresh tokens**; an
RLS policy asked for a permission key that does not exist, so `has_permission()`
failed closed and locked out the owner it was written to admit; a `deviceState`
timeout guessed at 25s reported an awake terminal as unreachable (measured: a
healthy device answers in 8s); and `externalPaymentId` silently caps at 32 chars
while a uuid is 36.

**Six were in code already committed and described as working.** One — a
connected facility having no way to change its merchant — was found by the user,
not by a test.

**The RLS one is the sharpest.** A policy that fails closed is indistinguishable
from a policy correctly refusing. It was caught only by asserting that the RIGHT
person is ALLOWED. A deny-assertion alone would have passed forever.

**Why it matters:** reading this integration does not tell you whether it works.
Clover's documented behaviour and its actual behaviour differ in ways that are
individually small and collectively expensive, and the failures are quiet —
a null, a wrong status code, a missing row.

**Do instead:** exercise the path against the live sandbox before claiming it
works. Every money path here has been. If you change one and cannot test it, say
so in the commit rather than letting green typecheck stand in for evidence.

### 🟢 Card-present has been used in production (was 🟡 “nobody has pressed the button”)

`src/lib/clover/terminal.ts` charges a device and the Terminal tender in the
checkout dialog drives it. Proven with a real card through the library (1¢, VISA
contactless, Flex 4) and the route proven against real hardware.

This entry then said, for weeks, that the React wiring between them **“has only
ever been typechecked”**. Counting the ledger on 2026-08-24 says otherwise:

```
method    entry_method   n    total      earliest     latest
terminal  swipe          8    $912.00    2026-08-19   2026-08-19
terminal  contactless    3    $128.22    2026-08-08   2026-08-19
```

**Eleven card-present Clover payments totalling $1,040.22**, every one carrying a
Clover payment id. The button has been pressed, repeatedly, with real cards.

**Why the claim survived:** nobody ran the one query that would have settled it.
It is the same failure as the SQL-suite entry below — a statement about
production that could be checked in four seconds, repeated instead of checked,
and then quoted onward as a reason not to do other work (it was, verbatim, in
the “no order is ever created” entry). **Before citing this map as evidence that
something has never happened, go and count.**

**Refunding a terminal payment went to the wrong API, and that is now answered**
(was: "untested… an open question"). Measured against the sandbox 2026-08-25.
The route sent every refund to the ecommerce `/v1/refunds`, card-present
included. On a terminal payment a PARTIAL refund there is refused outright:

```
POST /v1/refunds {"charge":"QHQPNNR0EV7Q8","amount":1}   (of 8278 + 2160 tip)
-> 400 processing_error
   "Partial refund for order with multiple line items/tip/convenience fee is
    not supported by this api, Please use /v1/orders/{id}/returns api."
```

A **tip alone** triggers it, and the terminal asks for a tip. So partial refunds
of card-present sales never worked. Card-NOT-present is fine — a `/v1/charges`
payment gets a one-line-item order with no tip, and `{charge, amount: 40}` of
113 refunded exactly 40, verified by reading the payment back.

The fix is `POST /connect/v1/payments/{id}/refunds` with
`X-Clover-Device-Id: <SERIAL>` — the REST Pay Display family `terminal.ts` and
`print.ts` already speak. It behaves like taking a payment does, including
answering **503** when Cloud Pay Display is closed. `refundOnTerminal()` in
`lib/clover/terminal.ts`; the route branches on `processor_device_serial`.

**Still not done on hardware.** The sandbox proves the endpoint, the headers and
the failure modes; it has not proved a card-present refund completing, because
that needs a device with Cloud Pay Display running. Do not describe terminal
refunds as _finished_ until somebody has done one on the Flex.

### 🔴 `/v1/orders/{id}/returns` refunds everything and reports what you asked for

The endpoint Clover's own error message above recommends. Do not use it. Both
forms were measured on 2026-08-25 and both refunded the WHOLE order:

```
POST /v1/orders/AAGSVRXQJNA2M/returns {"amount":1}
  -> 200  {"amount":88,"amount_returned":88,"status":"returned"}

POST /v1/orders/0FNBTW3B4MPKE/returns {"items":[{"parent":"…","amount":100,…}]}
  -> 200  {"amount":4714,"amount_returned":4714,
           "items":[{"amount":100,…}],"status":"returned"}
```

Read the second one carefully. It answers 200, it **echoes `"amount": 100` back
inside `items`**, and it refunded **4714**. Every field a caller would naturally
check agrees that a $1.00 partial refund succeeded. Only `amount_returned` —
which no reasonable person reads on a 200 — says $47.14 left the merchant.

**Why it matters:** wire this to the refund dialog and "refund $200 of this
$800 booking" returns the customer **$800**, with a success response that reads
like a partial refund. `reconcilePayment` would then correctly write a −$800
ledger row, so the books would be right and the facility would be $600 down with
nothing to point at.

**Do instead:** partial card-present refunds go through the device
(`/connect/v1/payments/{id}/refunds`); partial card-not-present refunds go
through `/v1/refunds`, which honours its `amount`. If `/v1/orders/{id}/returns`
is ever reconsidered, assert `amount_returned` against what was asked for and
fail loudly on a mismatch — a 200 from it is not evidence of anything.

**The contract is unobvious and every part of it was learned from an error:**
`X-Clover-Device-Id` takes the SERIAL, not the device id; `Idempotency-Key` is a
HEADER; `externalPaymentId` caps at 32 chars so a uuid needs its dashes
stripped; and `final` defaults to `false`, which is a pre-authorisation that
**Canada refuses** — surfacing sideways as a complaint about `tipAmount`.

**Also:** Cloud Pay Display only supports Flex, Mini and Compact. A Station or
Duo needs a LAN connection a hosted app cannot make. The classifier in
`devices.ts` reports an unrecognised model as `unknown`, never `unsupported` —
telling a facility their hardware will not work is a claim worth being sure of.
It searches `productName`, `model` AND `deviceTypeName`, because reading `model`
alone reported a supported Flex 4 (`Clover_C406`) as unknown on a live screen.

### 🟢 RESOLVED 2026-08-25 — Two deploy blockers stacked, and the first hid the second

> **This entry is closed because the platform it describes is gone.** Yipyy moved
> off Vercel to a self-hosted VPS on 2026-08-25 (see
> [ADR 0006](../architecture/decisions/0006-self-hosted-vps-replaces-vercel.md)).
> There is no `vercel.json`, no Hobby plan and no deploy-time contract that can
> fail before a build exists. The cron that could not run more than once a day
> now runs every fifteen minutes on a systemd timer, which is the difference
> between a refund issued in Clover's dashboard reaching the booking in minutes
> rather than in up to a day.
>
> **What did NOT go away, and is the reason to keep reading:** the shape of the
> failure. A deployment that was never created still looks exactly like one you
> have not checked on. The instruction survives the platform — confirm the
> deploy, never infer it from the push — and it is now in AGENTS.md against
> `gh run list` and a live health check rather than against Vercel's API.
>
> The second lesson survives too, and is worth more: the entry below was
> rewritten twice before it was right, because a generic documentation search
> found nothing and the answer was in a link Vercel had already put in the
> failure status that nobody clicked.

---

#### Original entry (historical)

Found 2026-08-24, after four hours of believing a push had shipped when nothing
had. `bun run typecheck && lint && format:check` were green, CI was green
including `build`, `git push` was accepted, GitHub ran every check — and
production kept serving an eleven-o'clock build.

**The timeline, because the shape of it is the lesson:**

```
11:51  5756fc8b deployed.  The last deployment of the day.
12:51  b2ba179c pushed. It added the first `crons` key vercel.json has
       ever had:  "schedule": "17 */4 * * *"   — six runs a day.
12:54  the Vercel project's state changes.
        … six more pushes, all accepted by GitHub, all green in CI …
16:37  production is still serving 5756fc8b.
```

`GET repos/…/deployments` stops at `5756fc8b`, and 14 commits were pushed after
it with no deployment created for any of them.

**The GitHub statuses are not uniform, and that is the tell.** Some commits
carry a Vercel status; others carry none at all:

```
c64c81f3  failure   "Vercel – puneet   Deployment failed."
7bcc7e0f  failure   "Vercel – puneet   Deployment failed."
40c71d29  failure   "Vercel – puneet   Deployment failed."
b2ba179c  (no statuses at all)
e477049e  (no statuses at all)
```

**A "Deployment failed" status with no deployment behind it is a different
animal from a failed build.** A build that fails leaves a deployment in `ERROR`
that you can open and read a log from. There are none — the deployments list is
empty for every one of these. That is the signature of the config being
rejected _before any build starts_, which is exactly what an over-limit `crons`
key does.

So the place this shows up is **the deployments list being empty, not a log**.
There was no red cross to open, no notification, and nothing to retry.
**The absence of a deployment looks exactly like a deployment you have not
checked on.**

**Two faults, in series, and the first hid the second.** Both are proven now;
this entry was rewritten twice before it was, and how that happened is the most
useful part of it.

**Blocker 1 — the cron frequency.** The commit added `17 */4 * * *`, six runs a
day. Vercel's own failure status linked to `vercel.link/3Fpeeb1`, which
redirects to
[cron-jobs/usage-and-pricing](https://vercel.com/docs/cron-jobs/usage-and-pricing):

> Hobby accounts are limited to cron jobs that run **once per day**. Cron
> expressions that would run more frequently **will fail during deployment**.

|           | Minimum interval | Scheduling precision |
| --------- | ---------------- | -------------------- |
| **Hobby** | Once per day     | Per-hour (±59 min)   |
| **Pro**   | Once per minute  | Per-minute           |

It fails _during deployment_, before any build, which is why there was no
deployment record to open and no log to read.

**Blocker 2 — the secret.** With the schedule reduced to `17 4 * * *`, a
deployment was created for the first time in six hours, and failed at once:

```
Error: The `CRON_SECRET` environment variable contains leading or trailing
whitespace, which is not allowed in HTTP header values.
```

A trailing newline on a pasted value, in a `textarea` that accepts one. It was
set around 13:00, after blocker 1 had already stopped deployments — so it sat
undetectable until the schedule fix let a build get far enough to read it.

**±59 minutes.** On Hobby, `17 4 * * *` fires somewhere between 04:00 and 04:59
UTC. Nothing here needs the precision, but do not write a comment promising
04:17.

### How this entry was wrong twice, which is the actual lesson

1. **Diagnosed the cron limit from the timeline.** Correct, but asserted as fact
   without a citation.
2. **Retracted it.** A generic documentation search for Hobby cron limits
   returned pages showing `* * * * *` as an unremarkable example and no plan
   caveat. Two sessions searched independently and neither found the pricing
   page. So the claim was written up as unproven — confidently, at length, with
   a passage about the danger of confident debt-map entries.
3. **Followed the error link.** `vercel.link/3Fpeeb1` had been in the failure
   status the entire time, on three separate commits, and goes straight to the
   page that says it in bold.

**Nobody clicked the link.** Both sessions went looking for the answer in
general documentation while the specific answer sat in the error itself. The
retraction was not caution — it was searching in the wrong place and then
trusting the silence.

**So: follow the link the error gives you before you go looking for the answer.
A short-link in a failure status is not decoration; it is the error's own name
for itself.** And note the second trap: **a fix that changes the symptom looks
exactly like a fix that found the cause.** Deployments started appearing again,
which was encouraging and true and not the same as being finished.

**The shape worth keeping is the stacking.** Each step was individually correct:

```
1. cron added to vercel.json        -> deployments stop being created
2. CRON_SECRET set so the sweep can authenticate -> pasted with whitespace
3. cron schedule reduced            -> deployments resume, and IMMEDIATELY
                                       hit the whitespace from step 2
```

Step 2 was necessary and right, and it planted a failure that **could not
surface until step 3 removed the thing hiding it**. Fourteen commits of
"nothing deployed" had two independent causes in series.

**So: when a blocker lifts, do not assume the queue drains.** The next thing in
it has been untested for exactly as long as the blocker stood, and the relief of
seeing movement is the worst moment to stop checking. Confirm READY, not
created.

The daily schedule is not provisional — it is the only thing Hobby permits, and
`*/4` cannot be restored without a Pro plan. The cost is real and should be
stated plainly: **up to 24 hours before a missed Clover webhook is swept**,
against 4 under the original schedule. The webhook remains the primary path and
"Reconcile now" covers the impatient case, but that gap is a plan decision, not
a code one.

**Two things follow, and the second is bigger than the cron:**

1. **Anything in `vercel.json` is a deploy-time contract with the plan, not
   just configuration.** Crons, regions, function sizes and durations all have
   Hobby ceilings. Adding one is not like adding a route — no local gate,
   including `bun run build`, reads `vercel.json` against the plan. Change it
   and then go and confirm a deployment was _created_.

2. **A commercial product is running on a Hobby plan.** This codebase takes real
   card payments through a live Clover merchant. Hobby forbids commercial use,
   caps deployments at 100/day and has no SLA. That is a business decision
   somebody has to make deliberately — recorded here because it was found by
   accident while chasing blocker 1, which turned out to be the same plan. The
   cron ceiling is the cheap symptom; commercial use on a plan that forbids it,
   with no SLA in front of live card payments, is the expensive one.

**The correction that matters most is to a sentence in this repo's own docs.**
AGENTS.md and CLAUDE.md both say _"Vercel deploys production from `main` on
push, so a bad commit reaches customers before CI reports it."_ For four hours
on 2026-08-24 the opposite was true: **CI reported and nothing reached
customers at all.** The doc describes a promise the platform makes when it is
able to keep it. **Confirm a deployment exists; do not infer it from a push.**

```
gh api repos/Yipyy-Inc/puneet/deployments --jq '.[0] | "\(.created_at) \(.sha[0:8])"'
```

If that sha is not the one you just pushed, you have not shipped.

### 🔴 “No UPDATE policy” means no row is updatable — not “no restriction”

`unattached_payments` shipped with RLS on and exactly one policy, for SELECT.
The two functions that resolve a queue row are `security invoker` by deliberate
design, so that `payments_insert` and the caller's own permissions decide. The
dismiss function carried this comment:

```
-- INVOKER cannot help here: there is no UPDATE policy on this table, so
-- the permission is asked for directly.
```

**That sentence is the bug, written down and reasoned about.** No UPDATE policy
does not mean UPDATE is unguarded so check it yourself; it means **RLS excludes
every row from the UPDATE**, before the `where` clause is evaluated. The
`has_permission(...)` predicate was never what was being tested. Nothing could
ever be dismissed or attached.

**One failed honestly and one did not, and the difference is the whole entry.**

`dismiss_unattached_payment` returns `row_count > 0`, so it returned false and
the screen said "that payment was not set aside". Wrong, but visible — and it
is the only reason this was caught, by a person clicking "Not a Yipyy payment"
on an 11¢ test charge.

`attach_unattached_payment` did this instead:

```
1. insert into public.payments     -> SUCCEEDS (payments has an insert policy)
2. update unattached_payments      -> 0 rows, no error raised
3. return v_payment                -> the caller reports success
```

The ledger row is written and **permanent** — `payments` is append-only, revoked
from every role including `service_role`. The queue row stays `unattached`, so
the payment reappears in "payments to attach", and **the next press writes a
second ledger row for the same Clover payment.** A facility tidying their queue
would double their own takings, repeatedly, with the screen agreeing every time.
Verified after the fact that this never fired: no `payments` row carries
`author_name = 'Attached from Clover'`.

**The fix is the missing policy plus a refusal to trust it** (20260824190000).
`attach` now claims the queue row FIRST and raises if that update touches zero
rows, so the irreversible insert cannot happen unless the reversible thing
provably succeeded — and raising rolls both back. **Order irreversible writes
last, and check the row count of everything before them.**

**`bun run check:rls-writes` exists for exactly this shape and did not catch
it.** It reads API routes for updates that cannot tell an RLS refusal from a
no-op; this was a plpgsql function, which it does not read. The gate is not
wrong, its reach is — a `get diagnostics row_count` check belongs in every
invoker function that writes, and nothing enforces that.

**And a policy is not a privilege.** `grant update ... to authenticated` was
needed as well; the policy alone would have kept refusing.

**The SQL suite had a block literally titled "The positive control" and it was
not one.** `clover-sync.sql` C5a/C5b both asserted REFUSALS, and C5a's refusal
was `22023` — argument validation, reached before the UPDATE, so it never
touched RLS. C4 did the same: it passed `null` for both the booking and the
client, got refused by the same validation, and asserted `state <> 'ALLOWED'`.
Five assertions across C4, C5a, C5b, C8a and C8b were all satisfied by functions
that refused **everybody**, which is exactly what they were doing.

The header above C5 said: _"Without this, C4 is satisfied by a function that
refuses everybody."_ It named the failure and then committed it.

**A refusal test must reach the thing it claims to test.** Assert the exact
errcode, never "anything but success", and give the call arguments valid enough
to get past validation. C5c now attaches as a permitted user and asserts the
row moved, one ledger row exists, and a second attempt writes no second row.

**Two more facts fell out of writing it, both measured:**

1. **Claiming the queue row before the ledger insert is impossible.**
   `unattached_attached_has_payment` requires `attached_payment_id` whenever
   status is `attached`, so there is no valid moment to claim first. The
   ordering fix was wrong and C5c caught it on its first run. Raising _after_
   the insert is equivalent — the exception rolls the insert back with it.
2. **No preset role separates seeing takings from taking them.** All seven roles
   holding `financial_view_amounts` also hold `financial_take_payment`, so C4's
   accountant was never a control. The refusals belong to the groomer, who holds
   neither. Consequence for the UI: the "Needs someone who can take payments"
   branch in `UnattachedPayments.tsx` is unreachable without a custom permission
   override — rare, not dead.

### 🟢 An estimate nobody can check is an invented number with a disclaimer

The facility Customer Value report had a column headed **"CLV (Est.)"**. It was
computed from a fixture by a formula nobody had written down, and the `(Est.)`
made it feel honest. It is not: an estimate with no stated model cannot be
checked, cannot be argued with, and cannot be wrong in a way anybody can
demonstrate. That is the same property as a number somebody made up.

**Deleted on 2026-08-25 rather than reconnected.** `totalSpent` sits where it
was — what that client has actually paid — and average order value divides out
of it and the booking count. Both are checkable against `payments`.

Three siblings went the same way in the same change, all with no source at all:

```
advanceNotice     the literal string "2 days" on every row, // Mock beside it
cancellationTime  the booking's own start date
staffCount        a head count invented next to hours ESTIMATED from duration
```

**The rule is stronger than the existing "nothing invents a rating" one**,
because that one is satisfiable by relabelling. Calling a figure "est." feels
like a disclosure and functions as a licence. **If you cannot say what a number
is computed from, delete the column — do not soften its title.**

### 🟢 A column reporting an absence that was never true (the same bug, sign flipped)

Found in the same conversion, and it is the more dangerous half. The
cancellation report's `refundAmount` read a field that **does not exist on a
booking**:

```ts
const bookingAny = booking as typeof booking & { refundAmount?: number };
// ...
refundAmount: bookingAny.refundAmount || 0,
```

So it was always `0`, rendered as `$0.00`, and looked like a fact. **Nobody
files a bug against a zero.** The facility's own refunds were real the whole
time — 150 of them carry a `booking_id`.

Everything else found on 2026-08-24/25 was a screen claiming something it could
not do. This is a screen **reporting an absence that was never true**, which is
quieter: a false claim invites a contradiction, and a false zero invites
nothing. **A cast to `any`-shaped access on a typed row is where this lives** —
`as typeof x & { maybe?: T }` silences the one check that would have said the
field is not there.

### 🔴 In a shared live database, a number you wrote down is not a constant

Hit twice on 2026-08-25, from opposite ends, within an hour.

Reconciling the Total Revenue report against the Reports KPI tile:
`33,323.25 gross − 5,386.00 refunded = 27,937.25`, against a tile screenshotted
an hour earlier reading **27,277.25**. A **$660 discrepancy** between two
functions that should agree by construction — and it was chased as a bug in one
of them. It was $660 of real payments landing in the intervening hour.

The other session hit the same shape from a `bookings` count: **423** in a probe
at 10:15, **392** an hour later, and spent queries deciding whether its own
aborted transaction had eaten 31 rows. It had not.

**Why this project in particular:** there is ONE Postgres. CI writes to it, two
sessions write to it, `bun run shoot` signs in against it, and the e2e suite
creates and removes rows continuously — `bookings.ref` has reached 13,814
against ~400 live rows, so roughly 34 rows have existed for every one that
still does. Nothing here is quiet enough for a remembered figure to survive.

**Do instead: reconcile in ONE statement, at one instant.** Never against a
value captured earlier, and never against a screenshot. The query that settled
the $660 computed both functions AND a direct `sum(grand_total)` in a single
select:

```sql
select k.kpi_net, (t.j->>'gross')::numeric - (t.j->>'refunded')::numeric as derived,
       raw.direct_net, k.kpi_net = raw.direct_net as agrees
  from k, t, raw;   -- all three from the same snapshot
```

All three returned `27937.25`. There was never a bug.

### 🟢 The facility Reports page counts what happened (was 🟡 invented figures)

`/facility/dashboard/reports` opened with `const facilityId = 11` — a fixture id
with no row behind it — and read `revenueByService()`, `bookingsByPeriod()`,
`occupancy()` and `clientMetrics()` from
[report-data-sources.ts](src/lib/report-data-sources.ts), which walks
`@/data/bookings` and friends. Every figure was invented, and the page's own
comment called them "derived from the real stores".

It became urgent on 2026-08-24, when the Yipyy Pay Transactions tab began
reporting the same kind of number from `public.payments`. Two screens, one
right, and the wrong one looked older and more established.

**Converted 2026-08-25, in two steps.** `facility_report_kpis` for the six
tiles; `facility_report_dataset` for five of the six report sheets. There is no
`@/data/*` import left in `report-sheet.tsx`, and the facility comes from the
SESSION on both.

**Three things worth carrying forward:**

- **`report-data-sources.ts` is still fixture-backed and still has ~20 other
  importers** — the platform dashboard, the analytics components, the financial
  components. Only the facility Reports page was converted. Anything else
  reading those selectors is still showing invented numbers.
- **No-Shows was marked unimplemented rather than converted.** No `no_show`
  status, no dated event, `clients.no_show_count` a lifetime counter with no
  dates. Recording a no-show is a feature, not a conversion.
- **Total Revenue no longer delegates to `RevenueReportBody`**
  (`components/financial/RevenueReport`), which reads `@/data/*` and is shared
  with two other screens. That is the next conversion in this area and it has a
  wider blast radius than this one did.

### 🟡 Two `DataTable` components whose names differ only by case

`src/components/ui/DataTable.tsx` (88 importers) and
`src/components/ui/data-table.tsx` (7) are **both tracked**, and they are
different components:

```
DataTable.tsx   ColumnDef = { key, label, icon?, render?, sortable?, align? }
data-table.tsx  ColumnDef = { accessorKey, header, cell? }
```

`DataTable.tsx` is the one CLAUDE.md means and the one with `emptyState`,
`filters`, `selectable` and the rest.

**On Windows and macOS the filesystem is case-insensitive, so only ONE of them
can exist in the working tree at a time.** Reading `data-table.tsx` locally can
therefore return the OTHER file's contents, and a `ColumnDef` written from that
read uses `header` against a component that wants `label` — which typechecks
locally and fails in CI, where Linux tells the two apart. That has already
happened once here.

**Do instead:** import `@/components/ui/DataTable`. If the working tree and your
expectations ever disagree about which file you are looking at, settle it with
`git show HEAD:src/components/ui/DataTable.tsx`, not the editor. Consolidating
the two is worth doing and is not a passing job — it touches 95 files.

### 🔴 A Clover payment is not money until `result` says so

`reconcile.ts` reads a payment from Clover and decides what to do with it. Until
2026-08-24 it never looked at `payment.result`, and the first sweep of the live
merchant showed what that costs. Of seven payments it held out for a human to
attach, **two were `FAIL`** — $62.50 each, both declined attempts against booking
896, no `cardTransaction`, no `device`, no money anywhere:

```json
{
  "id": "VXZCT18MHAKZE",
  "amount": 6250,
  "result": "FAIL",
  "tender": { "label": "Credit Card" }
}
```

The screen would have offered those as _“Payments to attach”_, and attaching one
marks a booking paid for takings that do not exist. **The inverse of the feature’s
entire purpose**, on the append-only table, where the row cannot be taken back.

**The worse half is the path nobody would have looked at.** A failed payment
carrying a matching `externalPaymentId` did not merely get held — it went to
`record_clover_payment` and became a ledger row directly. Recovery of a lost
terminal sale and recovery of a declined card were the same code path.

**The rule:** `SUCCESS` and nothing else. Not `FAIL`; not `INITIALIZED`; not
`AUTH`, which is a hold and not a taking; and not `VOIDED`, which nets to zero
when it never reached the ledger in the first place. The check sits at the TOP of
`claimOrHold`, before the intent lookup, because the intent branch is the
dangerous one.

**The lesson underneath it:** every amount in that payload was correct. The
money was right, the tip was right, the order id was right, and the record was
still false, because the one field that says whether any of it happened was not
read. **An integration that copies numbers faithfully has not thereby copied the
truth.** It was found by running the thing once and reading the rows back — not
by typechecking it, not by review, and not by the SQL suite, which tests the
tables this writes and cannot see what TypeScript chose to write into them.

### 🟡 A webhook delivery is evidence, not a fact

Clover does not sign deliveries. `X-Clover-Auth` is a static shared secret
repeated on every message: no per-message integrity, no replay protection.

**Why it matters:** anyone who learns it can forge deliveries until it is
rotated. The handler therefore never acts on what a message SAYS — it records
the delivery, then re-reads the named object from Clover's API with the
merchant's own token. **Do not add a shortcut that trusts the payload**, however
obvious the amount in it looks.

### 🟡 The webhook route answers 200 even when processing fails

Deliberate: Clover retries anything else, and an event that can never be
processed would be redelivered forever. The cost is that a `failed` event is
**not retried by anybody** — it sits in `payment_webhook_events` for a human.
`payment_webhook_events_unsettled` is the index that finds them. There is no job
that drains it yet.

### 🟢 The Clover App Secret is out of the browser (was 🟡)

`clover-config-store.ts` used to keep it client-side in plaintext on every
admin's machine, while the UI toasted "saved (encrypted)". Removed 2026-08-09.
The store now holds two unwired billing toggles and nothing else; hydration
drops the discarded fields and rewrites the key immediately, because the secret
stays **on disk** in an upgraded browser until something overwrites it.

Whether the real credentials resolve is answered by
`/api/payments/clover/platform` — booleans, platform-admin only, no PATCH.

**Do instead:** never put a credential in a client store to be masked on
display. Masking happens after the value has already been sent.

### 🔴 An admin screen that simulates success is worse than no screen

The same system-config tab carried a "Send Test Charge of $0.01" button that
slept, invented `txn_test_<timestamp>` and `refund_test_<timestamp>`, and
reported a charge succeeded and was refunded. Nothing contacted Clover. It
passed against a deployment with no credentials at all. Beside it, "Test
Connection" returned success whenever three form fields were non-empty.

**Why it matters:** that is exactly the check somebody runs to satisfy
themselves payments work **before going live**. A check that cannot fail
converts an unknown into a confident wrong answer.

**`bun run check:success-claims` does not catch this shape.** The gate asks
whether a file contains something that performs an action; these files did — the
fabrication was one level down, in `fiserv-payment-service.ts`. Treat the gate
as a floor, not a proof.

**Do instead:** delete a simulated verifier rather than repairing it. The real
paths exist and are exercised against live Clover; a pretender beside them is
only a way to be misled.

### 🔴 The webhook URL on screen pointed at a route that does not exist

The same tab displayed `https://app.yipyy.com/api/clover/webhook`. The route is
`/api/webhooks/clover`. An admin who pasted it into Clover would see **no error
anywhere**: Clover reports failing deliveries on its own dashboard, and this app
simply never hears that a refund was taken on a merchant's own terminal — the
ledger drifts in the direction of claiming money it does not have.

Now derived by `cloverWebhookUrl()` from the same public-address variables
everything else uses, so it cannot disagree with the route that answers.

**Do instead:** never hardcode a URL this app also serves. Derive it, and assert
in a spec that the derived path is not a 404.

### 🟢 Both Clover estates run at once, on purpose

`payment_connections.environment` decides which Clover a connection talks to —
not a global flag. Sandbox merchants keep working after production ones exist,
which is what keeps a place to test without real cards.

**Do instead:** always pass the connection's environment to `cloverConfig()`.
Calling it bare means "where a NEW connection would go" and is correct for
exactly two things: the authorise redirect and the code exchange.

## 2026-08-09 — half-converted screens, and a test suite that cannot sign in

### 🟢 The e2e accounts did not exist, and the admin grant was a no-op (fixed)

`ACCOUNTS` names seven `@yipyy.dev` logins, and signing in as one failed with
**"No user found with email: owner@yipyy.dev"** — they survived the
Supabase→Clerk cutover as strings while the identities behind them did not.

**Repair:** `bun --env-file=.env.local scripts/provision-e2e-identities.ts`.
Idempotent, and it refuses anything that is not a `sk_test_` staging key — a
WorkOS production key is `sk_` + base64 with **no** environment marker, so an
allowlist is the only check that works. Run it after any change
of identity environment; nothing else recreates them. It survived the second
cutover — Clerk → WorkOS, 2026-08-17 — as the same script on a different SDK,
and the same failure would look the same way.

**And running it exposed a second defect.** The script printed "platform admin"
beside `admin@yipyy.dev` and the account was not one, so every `/dashboard/*`
route answered 403 with nothing pointing back at the cause.

`profiles.is_platform_admin` is **DERIVED**:
`private.enforce_platform_admin_flag()` runs BEFORE every insert and update on
`profiles` and overwrites the column from `platform_memberships`. Writing it
raises no error and does nothing. The grant is a row in
`public.platform_memberships`; `platform_memberships_mirror` syncs the flag
back.

**Do instead — the general rule:** when a column is maintained by a trigger,
a write to it is not a grant. The script now inserts the membership and **reads
the derived column back**, throwing if it did not take. Same shape as the
simulated-verifier entry below: a write that cannot fail is not evidence that it
happened.

**This lifted a real constraint.** Platform-admin screens and APIs used to be
unverifiable locally (the only platform admins were production Clerk subjects).
They are testable now via `ACCOUNTS.admin` — `tests/e2e/clover-platform.spec.ts`
asserts the 200 path that had been documented as uncoverable.

### 🟡 A page can read its record from Postgres and its neighbour from a fixture

The facility booking detail page read the BOOKING from the database and the
CLIENT from `src/data/clients.ts`, then required both. The fixtures hold 20
clients, the database holds 16, and they are not the same 16 — so every client
created since the migration opened a real booking and was told **"Booking not
found."**

Typecheck cannot see this: both halves are valid TypeScript. Neither can a
fixture-based test, because the fixture always satisfies the lookup.

**Do instead:** when a screen reads two things, check they come from the same
place. Aim any regression test at a record the FIXTURES DO NOT HAVE — pointed at
a fixture id it passes against the bug it exists to catch
(`tests/e2e/booking-detail.spec.ts`).

**Still outstanding:** the twelve sibling pages under
`/facility/dashboard/clients/[id]/` and the client-file sidebar all still read
the fixture, as does the clients LIST. They must move together: converting the
sidebar alone would leave every demo client in that list clicking through to
"Client not found."

### 🟡 "Not found" rendered before the data arrived

Same page: both queries start empty, so it stated the booking did not exist for
as long as the request took, then replaced it with the booking. A conclusion
needs its answers back first — gate the empty state on `isPending`, not on
emptiness.

### 🟢 Facility settings are the facility's own (was the largest mock surface)

`src/data/settings.ts` served ONE set of values to every facility: "PawCare
Facility", 07:00-19:00, a 25% deposit, 15/18/20% tips, one evaluation price.
Twenty domains moved to Postgres on 2026-08-09 — profile columns on `facilities`,
everything else in `facility_settings (facility_id, domain, value jsonb)`.

**Adding a domain is an entry in `src/lib/settings/domains.ts`, not a
migration.** Zod validates on write and on read; `configured: false` travels with
every default so a screen can tell "what we assume" from "what they chose".

**Do NOT convert `integrations`** — it holds Twilio `accountSid`/`authToken`,
and `facility_settings` is readable by every facility member. Vault or env, like
Clover.

### 🔴 Converting a provider is not converting a feature

Hit in ALL FOUR conversion batches. `useSettings` was converted; modules that
never went through it kept importing the fixture:

- `register-hours.ts` — a facility open to 21:45 had its cash drawer demanding
  to be counted at 19:00, nightly, with no setting that could change it.
- `OperationsCalendarViews.tsx` — `const HEATMAP_DAILY_CAPACITY = bookingRules...`
  at MODULE SCOPE, evaluated once at import.
- `BookingModal.tsx` — `basePrice = evaluationConfig.price`. A real booking
  priced from a fixture.
- `booking-card.tsx` — a facility with auto-send OFF still told staff a report
  card was scheduled.

Every one typechecked. Every one was invisible to the tests.

**Do instead:** after converting a domain, grep for direct fixture imports of
it. `bun run check:settings-fixture` enforces this now — baselined by file, and
a baselined file that stops importing also fails so the list cannot go stale.

### 🔴 A settings screen that mutated its imports

`EvaluationSettings.handleSave` did `Object.assign(evaluationConfig, {...})` on
the module object imported from `src/data/settings.ts`. Not a store, not
localStorage — it edited the shared singleton in place, so a facility's
evaluation price changed for everything else in that browser session and
vanished on reload. The toast said "saved".

**Do instead:** if a save handler does not call something that can fail, ask
what it is actually writing to.

## Snapshot (2026-08-17, the front door crashed in production)

### 🔴 A soft `redirect()` can take Next's own router down with React #310

For a day, `www.yipyy.com` showed Next's built-in `global-error` screen —
"Reload to try again, or go back." — and then loaded correctly three or four
seconds later. Nothing failed in the network tab, every response was a 200, and
Vercel's deployment screenshot bot reproduced it, so it was never local.

The cause was `src/app/page.tsx` calling `redirect()`. A page renders inside the
root layout, the root layout streams, so headers are already sent and Next
cannot answer 307. It answers **200 with a NEXT_REDIRECT in the RSC payload**
and hands the navigation to the CLIENT ROUTER instead. That router does this:

```js
if (pushRef.mpaNavigation) {
  location.replace(canonicalUrl)
  throw unresolvedThenable      // abandons the render HERE
}
useEffect(...)                  // four more hooks live below this line
```

The throw abandons the render before the remaining hooks, so that render runs
FEWER hooks than the previous one and React tears the tree down with
**#310, "Rendered more hooks than during the previous render"**. The
`location.replace()` already in flight then completes, which is why the correct
page appears a moment later. The recovery is what made it look like a network
problem and cost most of a day chasing DNS, HTTP/2, cookies and extensions.

Two hours of that was spent on the wrong error page: grepping `src/` for the
error text found nothing, so it was assumed to be Chrome's. It is
`node_modules/next/dist/client/components/builtin/global-error.js`, and its two
branches are diagnostic — with a digest it says "A server error occurred", and
**without one it says "Reload to try again"**, meaning a pure client exception.
Read which branch rendered before looking at the server at all.

**Fixed** by making `/` a Route Handler (`src/app/route.ts`, PR #124). A route
handler has no layout, renders no React and streams nothing, so
`NextResponse.redirect` is a genuine 307 the browser follows itself. The
crashing path is not repaired, it is unreachable.

**Still live elsewhere.** The portal gates in `src/lib/auth/viewer.ts` redirect
from layouts and are therefore still soft, so a denied visitor to `/dashboard`
or `/facility/dashboard` can still hit this. They are not converted because a
layout gate cannot become a route handler — it guards a subtree.

**Do instead:** when a URL exists only to send someone somewhere else, make it a
Route Handler, not a page with `redirect()`. Verify with
`curl -i` that it is a 307 — a 200 with a `text/x-component` body means the
client router is doing the work and this bug is in range.

## Snapshot (2026-08-17, i18n turned out to be scaffolding)

### 🟡 next-intl was installed, configured, and never connected

`next-intl@4.5.8` was a dependency, `src/i18n/request.ts` existed and returned a
locale, `messages/en.json` and `messages/fr.json` held ~1,100 strings between
them, and `src/lib/language-settings.ts` resolved a preference from three
cookies. There were **zero** calls to `useTranslations` or `getTranslations`, no
`NextIntlClientProvider`, and no plugin in `next.config.ts` — so `request.ts` was
dead code and the first `getTranslations()` anyone wrote would have thrown.
`<html lang>` was the literal string `"en"`.

Both AGENTS.md and the architecture overview listed "next-intl (en/fr)" as a
fact about the system. It was a fact about `package.json`.

**Fixed for the auth screens only** (PR #125): the plugin is wired, so
`getTranslations()` now works anywhere, and sign-in, sign-up and reset-password
render from an `auth` namespace with a language switcher for people who have no
session and therefore no settings screen to change it on.

**Everything else is still hardcoded English**, including `/join` — which is why
`AuthCard` takes `signedOut` rather than always drawing the switcher. Putting a
language control over untranslated copy makes a control that pretends to work.

**Two things that stay English on a French screen**, both deliberate:

- Whatever `readableError` lifts out of a WorkOS exception
  (`src/lib/auth/workos-actions.ts`). It is the vendor's wording; preferring our
  translated fallback would trade "that password was found in a data breach" for
  "could not sign in", which is worse in any language.
- A facility's own `tagline`. It is one stored string in the words the business
  chose, and machine-translating someone's brand copy is not ours to do.

**Do instead:** when translating a new screen, add its namespace to BOTH
catalogues in the same change and check key parity — nothing enforces it, and
next-intl renders a missing key as the key itself, so a gap ships as
`auth.fields.email` printed on the page rather than as an error.

## Snapshot (2026-08-18, a job title was doing an access tier's job)

### 🔴 `manage_staff` was enough to mint an owner

`facility_memberships` had one `role` column doing two unrelated jobs: choosing a
permission template (13 answers) and deciding which portal you get (2 answers).
The insert/update policies on it are gated on the **permission** `manage_staff` —
and a facility can grant a permission to any job title through its own role
editor (`facility_role_permissions`), or to one person
(`staff_permissions`, `membership_permissions`).

So a receptionist given `manage_staff` — a plausible thing for a front desk that
books and hires — could set their own `primary_role` to `owner` and resolve all
168 permission keys. Proved against production inside an aborted transaction
before the fix, and refused after it:

```
reception raising itself to admin   => REFUSED: Only a facility admin may grant
                                       admin access. manage_staff is not enough.
reception making itself an owner    => REFUSED: (same)
reception hiring a manager          => REFUSED: Only a facility admin may hire an
                                       admin. manage_staff is not enough.
reception hiring a groomer          => ALLOWED, level=staff
```

**Why it mattered:** the escalation is available to anyone the facility trusts
with hiring, and it is invisible — the promoted row looks like an ordinary
membership.

**Do instead:** `private.is_facility_admin(facility_id)` is deliberately **not**
routed through `private.has_permission`. If admin-ness were a permission key, a
facility could grant itself admin from its own settings screen. Gate admin-only
things on that function, never on a permission.

### 🟡 A trigger that refuses for the wrong reason still looks like it works

`private.enforce_hire_access_level` fires on two tables whose job-title column is
named differently (`staff.primary_role`, `facility_membership_grants.role`). The
first cut chose between them with a CASE **in the DECLARE initialiser**. plpgsql
compiles that into one SQL expression, so both field references resolve
regardless of the branch — and every insert and update of either table raised
`record "new" has no field "role"`.

The escalation probe's "reception cannot hire a manager" assertion **passed**
anyway, because the write did fail. It just failed with a schema error rather
than the guard. Fixed in `20260818120000_the_hire_guard_reads_the_right_column`.

**Do instead:** assert on the refusal MESSAGE, not merely that something raised.
And branch on `tg_table_name` with `IF`, one statement per arm, never with a
CASE over fields that do not exist on both records.

### 🔴 `/api/admin/invite` was an unauthenticated relay (fixed)

No guard of any kind. Any caller who knew the path could POST a name and an
address, and Yipyy would send that person a branded "you have been invited to
the admin console" email — from the same domain that carries password resets.
Phishing with the real sender, at no cost to the attacker.

The link it produced was worse than useless: the invitation was plain base64url
JSON, so the recipient could decode it, change `role` to
`system_administrator`, re-encode, and open `/setup/<their own token>`. The
page believed the payload because the payload was the only thing there was to
believe.

Closed by `20260818160000_a_platform_invitation_is_a_real_token`. The route now
refuses a non-platform-admin (403), and the real check is
`public.invite_platform_admin`, which requires **superadmin** and runs on the
database from the caller's own JWT — so the route calls it with the CALLER's
client, not the service-role one. Using the service key there would bypass the
check that makes the invitation safe and quietly promote the route guard to
being the only thing standing.

**Do instead:** when a route exists to send mail on the platform's behalf,
assume it is a phishing primitive until it has a guard. And when a token needs
to carry authority, make it opaque and store its hash — do not sign a payload.
Signing the old blob would have fixed the tampering and nothing else; opacity
also gives expiry, revocation and single-use as rows, and turns a database dump
into hashes rather than live links.

### 🟢 The `user_role` cookie no longer decides anything (was 🔴)

A client-writable cookie that used to be the platform-level role. The auth
cutover moved that decision to the session and every gate stopped reading it,
but the machinery survived — including **a page at `/facility/set-role` whose
two buttons were "Set as Facility Admin" and "Set as Super Admin"**, writing the
cookie with `document.cookie` and navigating.

It granted nothing by then; the gates ignored it. But three screens still
branched on it, and two of them mattered:

- `UserProfileSheet` showed the "Owner Account" group — Subscription, Payment
  Method, Export Data, Yipyy Agreements — when the cookie said `facility_admin`,
  while the pages behind it were guarded by `canManageFacilityAccount` reading
  the session. **Two answers to one question, and a browser could change the
  first.** The menu now IS that function's answer, passed from the server.
- `SchedulingSettings` unlocked its "Roles & Departments (Admin Only)" card the
  same way. It asks `usePermission("manage_roles")` now — the same cascade RLS
  resolves.

`getUserRole` / `setUserRole` / `ROLE_COOKIE_NAME` are deleted, and
`/facility/set-role` with them.

**Still reading it, and known:** `OperationsCalendarHelpers.parseUserRoleFromCookie`
and the calendar's own `calendar_permission_level` cookie. With no writer left
they take their fallbacks — which is exactly what every real session already got,
since nobody in production ever visited the setter page. The calendar also takes
its actor NAME from a cookie and stamps it on events it creates, so converting it
is an identity change, not a permission one, and belongs in its own pass.

**Do instead:** when a screen needs to know what somebody may do, ask
`usePermission(key)`. When it needs to know who they are, take it from the
session. A cookie is neither, and a screen that disagrees with the gate behind it
is worse than one that simply refuses.

### 🟢 `/dashboard/user-management` is real (was 🟡, then 🟢-with-three-siblings)

~~The four screens under `/dashboard/user-management` read
`src/data/admin-users.ts` plus a localStorage overlay, so a real invitation
appeared to do nothing and a fixture row appeared to be a colleague.~~ The
roster reads `platform_memberships` + `platform_invitations` through
`src/lib/api/platform-team.ts` now, and a pending invitation can be revoked from
the row (`public.revoke_platform_invitation`, superadmin-only).

**Four columns went with it, and their absence is the point.** Department,
Access Level, Last Login and Phone had fixture values and have no source in the
database. Keeping them would have meant inventing figures or shipping four
permanently empty columns. The "Suspended" tile went for the same reason —
`platform_memberships` has no such state, so the number could only ever have
been zero dressed as a measurement.

**The three siblings are done too** (2026-08-19). Each needed a different answer,
and which one depended entirely on what the database actually held:

| Screen      | What it was                                                                                                                    | What it is                                                                                                               |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------ |
| `/roles`    | Five roles that do not exist, each with an editable permission matrix, Create Role and Duplicate — all writing to localStorage | A read-only reference for the four values of `public.platform_role`, with live holder counts from `platform_memberships` |
| `/activity` | Three tabs; two built from five invented people, including a login history with invented IP addresses, devices and cities      | One surface: the audit trail, which was already real                                                                     |
| `/create`   | A form that waited 1500 ms and said "User Created Successfully"                                                                | Deleted — nothing linked to it, and the real door is the invite dialog on the roster                                     |

**The measurement that decided `/roles`.** Every `has_platform_role()` call site
in the schema asks for `superadmin`:

```
7 x has_platform_role('superadmin')      0 x support / billing / readonly
85 policies gated on is_platform_admin() -- any membership at all
```

So there is no platform permission model to edit — `support`, `billing` and
`readonly` are indistinguishable in effect today, and what a role may do lives in
RLS policies changed by migration. A permission editor over that could only ever
have been theatre. The screen now says so in as many words, and lists the seven
superadmin-only surfaces by name so the claim can be checked.

**The one that was a security-shaped lie, not just a fixture.** The invite form
offered five job-flavoured roles which `toPlatformRole` collapsed onto four:
"Sales Team" produced `readonly`, "Account Manager" produced `support`. A
superadmin could choose a role, be shown its permissions, and grant a different
one — and the invitation email named the label they picked rather than the role
that was recorded. The form offers the four real roles now, and the email is
built from `platformRole` so it cannot drift from the row again.

**Do instead:** before keeping a column, a tab or a form field on a screen you
are converting, check what the database records. A column with no source is worse
than a missing one, because it is indistinguishable from a measured zero — and a
fabricated login history is worse still, because it is the screen somebody opens
to ask whether an attacker signed in.

**Still open, deliberately:** `src/data/admin-users.ts` survives with six
consumers outside user-management — the support inbox, global search, data
management's two-admin restore, scheduled support messages and
`report-data-sources`. Converting those is its own change; nothing under
`/dashboard/user-management` reads it any more. `enforce-mfa-modal` now names the
four real roles, but `mfaRequiredByRole` is still a localStorage preference that
enforces nothing — enrolment is WorkOS's to require.

### 🟢 The booking page's care panels read what the wizard writes (was 🔴)

Reported from the running app on 2026-08-19: "there were things missing in the
facility side booking history — we designed the page to have a lot of details as
it was with demo data." Three separate causes, and only one of them was a bug.

**1. They opened a test row.** Special Requests read `[e2e boarding-occupancy]`
and its `details` was `{}`. See the entry below.

**2. Mock cleanup, exactly as suspected.** `src/data/bookings.ts` has 26
bookings and **two** carry hand-written `feedingInstructions` /
`medicationInstructions` arrays. Those two were what made the page look full.
Measured against Postgres: 0 of 250 bookings had `feedingSchedule`,
`medications`, `extraServices` or `groomingAddOns`; 174 had empty `details`.
Nothing is dropped on write — `bookingToRow` routes anything outside
`COLUMN_FIELDS` into `details` — so it is "nobody has entered one", not a lost
write.

**3. A real wiring gap, and this one is fixed.** The panels rendered
`booking.feedingInstructions` and `booking.medicationInstructions`; the wizard
collects and stores `booking.feedingSchedule` and `booking.medications`.
Different names **and different types** — so the panels could never fill from a
booking made in this app, whatever anybody typed.

The two shapes are different on purpose and both are worth keeping:
`FeedingScheduleItem` is what the OWNER asked for (occasions, prep, allergies,
what to do if the dog refuses); `FeedingEntry` is what STAFF DID (a meal, a
status, who completed it). So `src/lib/bookings/care-instructions.ts` projects
the first into the second for display, with `status: "pending"` — asked for, not
yet done — rather than renaming either.

**And the panels stopped offering actions that persist nothing.** `handleLog`,
`handleAdd`, `handleAdminister` and `handleAddNote` set component state and
toast; a reload lost all of it. That was invisible while the panels were empty
and became reachable the moment they started rendering real instructions, so
`canLog={false}` hid Add Meal, Add Medication, Log meal and Give.

### 🟢 The booking's Payment Summary is a breakdown (was 🟡)

Reported from the running app: _"in here we are supposed to have all the
breakdown"_, over a panel reading Base Price $100 / Total $100.

**The panel was less bare than it looked** — it already had Base Price,
Discount, Added Items and Total. It showed two rows because that booking had
none of the rest. What it genuinely lacked: the individual **lines** (every
`booking_line_items` row collapsed into one "Added Items" figure), the **tip**,
and **paid / balance** — so a screen whose header said "Pay by card — $100.00"
never said what was owed.

The rich `InvoicePanel` renders only when `booking.invoice` exists, and that
blob is on exactly the **26 migrated fixture bookings**. Every booking made
since the migration got the stub.

`BookingPaymentBreakdown` builds it from rows instead. Every line names a
source, and `GET /api/bookings/<ref>/line-items` was added for the lines — a
separate read rather than a join on `BOOKING_SELECT`, which feeds the bookings
LIST too and would pay for lines on a screen that shows none.

**THE TRAP, and it nearly shipped: `bookings.amount_due` is what a booking
COSTS, not what is owed.** Booking 569 carries `amount_paid 200` AND
`amount_due 200`. Reading it as the balance would have printed "Balance due
$200.00" on a booking settled in full, on the screen somebody uses to decide
whether to ask a customer for money. The balance comes from `balanceOf()` — the
same helper the "Pay by card" button uses, so the two figures on the screen
cannot disagree. Verified against both shapes:

```
569  Boarding $180 · Late pickup (73 min) $20 · Total $200 · Paid −$200 · Settled $0
426  Daycare  $60  · Bag of food 2 × $12  $24 · Total $84  · Balance due $84
```

**No tax line, deliberately.** The fixture invoice showed GST 5% and QST 9.975%.
`facility_settings` has six domains and none is tax, so a rate would be one
chosen on the facility's behalf and printed on something they hand a customer.

### 🟡 The terminal receipt itemises — printed as text, awaiting one tap to confirm

**The order route is closed, and that is a property of the API, not a gap here.**
Clover documents the REST Pay Display API — `/connect/v1/payments`, which is
what drives a semi-integrated terminal — as _payment-only_, and says it "does
not support passing an order ID or item ID directly". Orders belong to the v3
REST API and the Developer Pay endpoint (`/v2/merchant/{mId}/pay`, which
_requires_ an orderId), neither of which drives this hardware.

**What the same API does offer is the printer.** `POST /connect/v1/device/print`
takes `{ printDeviceId, text: [...] }` and prints those lines on the device's
own roll; `POST /connect/v1/device/printers` answers with the printer ids. So
the breakdown is composed as text (`lib/clover/receipt.ts`, 32 columns — the
width of an 80mm roll) and printed as a second act.

**THE PAYMENT CALL IS BYTE-IDENTICAL.** Printing happens after an approved sale,
in its own request, and its failure is reported but never changes the payment's
outcome. That was the whole design constraint: a sale that succeeded with no
paper is a nuisance; a sale reported as failed because a printer jammed is a
double charge. `lib/clover/print.ts` cannot throw, has short timeouts and no
retries, and the toast says which happened either way.

The no-charge readiness check (`checkOnly`) now also reports `canPrint`, so a
terminal with no printer is discoverable before somebody takes money on it.

**Not yet confirmed on hardware.** The Clover connection belongs to `pawradise`,
whose only members are PRODUCTION identities (`clover-staff@yipyy.com`,
`develop@yipyy.com`), and a local run holds staging keys — the same reason
`clover-terminal.spec.ts` skips locally. It needs one tap on the deployed app.
Until that happens this stays 🟡: written against the documented API, verified as
far as a keyboard allows, and unproven on paper.

### 🔴 (superseded) The terminal receipt cannot itemise, because no Clover order is created

The same report asked for the printed receipt to carry the breakdown. It cannot
today, and not for a UI reason: **nothing in this codebase creates a Clover
order.** Both money paths send a bare amount —

```
lib/clover/terminal.ts   { amount, externalPaymentId, final, tipAmount? }
lib/clover/charge.ts     { amount, currency, source, ecomind, capture }
```

Clover prints what is on the ORDER. With no order and no line items, the device
has one number to print, so the receipt is a total by construction.

**What it takes:** create an order on the merchant, add a line item per charged
line (the same lines the panel above now renders), then take the payment against
that order id rather than a naked amount.

**Why it is not done here:** it changes the live money path. It needs the
sandbox device in hand to verify, and shipping an unverified change to how money
is taken is worse than a receipt that under-reports.

This paragraph used to give a second reason — “the terminal tender has never
been clicked” — and that was already false when it was written. Eleven
card-present payments had been taken. A wrong fact in this map does not sit
still; it gets cited.

### 🟢 Logging a feeding and giving a dose are real (was 🔴 — the follow-on)

`public.care_log_entries` (20260819140000). A row is one execution of one
scheduled task: booking, pet, `task_key`, `task_type`, day, clock time, outcome,
notes, and who recorded it — the name snapshotted, because a journal that
renames itself when somebody leaves the business is not a journal.

**The permission was the interesting part.** The first draft gated writes on
`edit_pet_records`, which reads sensibly and is wrong: measured against the
presets, that key belongs to owner, admin, manager and supervisor — so the
caretaker and the boarding attendant, the people who actually put the bowl down,
could not record it. The right keys already existed and did not need inventing:

```
log_feedings / log_medications / log_potty_breaks
  admin, boarding_attendant, caretaker, daycare_attendant, manager, owner, supervisor
```

`private.care_log_permission_for(task_type)` maps a row to the key its own type
names, and the insert policy asks for that. Proved on production: a caretaker
writes a feeding and a medication; a groomer and a receptionist are refused,
while both can still READ. `supabase/tests/care-log.sql` keeps it that way.

**One row per (booking, task, day)**, which is what `careLogStore.log()` merely
intended — correcting a mis-tapped "refused" edits the record instead of
appending a second meal. Enforced by `care_log_one_per_task_per_day`, and the
route upserts on it. **No DELETE policy**: a wrong entry is corrected, and the
correction is the record.

**Still the in-memory store:** the Guest Journal and Daily Care read
`src/data/care-log-store.ts` — `let executions` at module scope, seeded from
fixtures. They carry photos, health observations and generated task schedules
that `care_log_entries` does not model yet, so both exist. That is the next
thing to converge, and when it does the store goes.

**Not built, and deliberately:** adding an unplanned meal or a note on a dose
that has not been given. `care_log_entries` records the EXECUTION of a scheduled
task, so neither has a home; the note travels with the dose when it is given,
which is the path that persists.

**The sharper measurement**, taken afterwards: exactly **2** of 257 bookings
carry `feedingInstructions` and **2** carry `medicationInstructions` — the two
migrated fixture rows, refs 1 and 2. Every other booking, seeded or created, is
sparse because nobody has entered anything. So the "rich" page anybody remembers
is those two.

### 🟢 The Guest Journal showed somebody else's stay (was 🔴 — the worst of these)

Same page, found while fixing the care panels. `ReservationJournalPanel`
resolved its guest two ways, and both were wrong for a real booking:

```ts
let matches = boardingGuests.filter((g) => g.bookingId === refId);
if (matches.length === 0 && petIds?.length) {
  matches = boardingGuests.filter((g) => petIds.includes(g.petId)); // any stay
}
```

**The pet fallback** matched any stay in the fixture involving that animal. A
December booking for Alice Johnson rendered `bg-001` — 22–29 April, owner "John
Smith", Kennel 12 — with eight days of care entries: meals marked "Ate all",
"Medications Given 08:05 AM". None of it happened for that animal, on the page
staff read to find out what did. A pet has many stays; a journal belongs to one,
so matching by pet can only ever be a guess.

**The id spaces also overlap.** A numeric ref was turned into `bk-001`, and the
fixture's ids run `bk-001`..`bk-024` while the seeded bookings start at ref 1 —
so refs 1–24 collided. And the rows they name disagree:

```
booking ref 1   2–6 July 2026      Alice Johnson
guest  bg-001   22–29 April 2026   "John Smith", Kennel 12, 7 nights
```

The fixture guest was never kept in step with the booking it claims, so even the
"intended" match was wrong. A numeric ref now resolves to no journal; a STRING
id still resolves, because that is what `DailyCareView` passes — a guest's own
`bookingId`, read from the same fixture, where the match is correct by
construction.

The panel already had the right answer for a miss; the fallback was what stopped
anyone seeing it. Its copy promised the journal "will populate automatically"
once booking details are present, which is not built either, so it now says what
is true.

Verified on the running app: booking 1 shows no "John Smith", no "Kennel 12", no
"Apr 22", no borrowed phone number, and Daily Care still renders its guests.

Also still fixture-shaped, and harmless: `boardingGuestForPrint` synthesises a
guest from the REAL booking and pet when no fixture row matches, so the printed
kennel card carries the right animal.

### 🟢 Four e2e bookings were sitting in the live bookings list (was invisible)

The suite is better behaved than it looked: **211 of 215** `[e2e …]` bookings
were already cancelled. `bookings` has no DELETE policy by design — a booking is
cancelled, not erased — so cancelled rows accumulate, and that is intended.

**Four were still `confirmed`**, from runs that died before `afterAll` could
execute. Those four showed on the facility's bookings screen as real work and
held their kennels, and one of them is the booking that prompted the report
above.

**Do instead: sweep at BOTH ends.** `tests/e2e/_sweep.ts` cancels every booking
carrying a spec's marker, and `boarding-occupancy.spec.ts` now calls it from
`beforeAll` as well as `afterAll`. `role-editor-writes.spec.ts` concluded that
cleaning up at the start is not _enough_ — it is not, but it is the only thing
that heals a run which never reached its end. Together they are
self-correcting; alone, neither is. Adopt the same pair in the other seventeen
specs that create marked bookings.

Cleared by hand at the same time: live bookings 38 -> 34, all real.

### 🟢 The customer journey reaches Postgres (was 🔴, then 🟠)

**Walked end to end for the first time on 2026-08-19** (CUJ-20), against a built
server on the facility's own hostname, writing to the live database. It gets
further than anyone had confirmed, and then hits a wall.

| Step                                           | Result                                                                                          |
| ---------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Branded sign-up at `<slug>.yipyy.test/sign-up` | ✅ correct name, correct copy ("Create your account, **then join** Doggieville Mtl")            |
| WorkOS account created                         | ✅ real user, name taken from the form                                                          |
| Email verification code                        | ⚠️ WorkOS's, delivered by email — no inbox here, so `emailVerified` was flipped through the API |
| `user.created` webhook → `profiles`            | ✅ delivered signed to the real route, 200, row written                                         |
| Sign in, routed with no client record          | ✅ honest "You are not registered here yet" with a register form                                |
| **Join → a `clients` row**                     | ✅ **`clients at doggieville-mtl` 0 → 1**, with name, phone and `profile_id`                    |
| **Add a pet**                                  | ❌ **writes nothing**                                                                           |
| **Book**                                       | ❌ **writes nothing**                                                                           |

**The wall, exactly.** `src/app/customer/pets/add/page.tsx` defines its own
`createPet` a hundred lines below the form:

```ts
// Placeholder function - replace with actual API call.
const createPet = async (_petData) => {
  await new Promise((resolve) => setTimeout(resolve, 1000));
  return { id: Date.now() % 100000 }; // an invented id
};
```

It sleeps, invents an id, toasts "Pet added!", and pushes the owner into a
required-forms wizard **for a pet that does not exist**. The parameter is named
`_petData` — the underscore is the file admitting the data is unused.
`CustomerBookingModal.handleSubmit` is the same shape: `// TODO: Replace with
actual API call`, `setTimeout(1000)`, then `toast.success("Booking created
successfully!")`.

**What makes this worth fixing rather than rebuilding:** `POST /api/pets` and
`POST /api/bookings` both exist, are RLS-scoped, and are already used by the
facility side. `/api/pets` even carries the comment "an owner may register and
describe their pet". Nobody wired the customer screens to them.

**Do instead:** when a screen defines its own `createX` next to the form, check
whether `src/app/api/` already has the route. Here the backend was finished and
the last hundred metres were never walked, which is exactly the failure the
half-converted state of this repo produces.

**FIXED 2026-08-19 — the pet.** `/customer/pets/add` calls `POST /api/pets` with
the caller's own client ref. Verified against the live database: `pets.ref 9045`,
Biscuit the Beagle, owner Walk Customer, facility `doggieville-mtl` — and the
facility was derived by `pets_set_facility` from the owner, because nothing is
sent and nothing would be honoured if it were.

**NOT FIXED — the booking, and it is not one fetch away.** Two things were wrong
about the sentence above when it came to bookings, and both were found by trying:

1. **`CustomerBookingModal.tsx` is dead code** — 4,137 lines, imported nowhere,
   and Knip has been reporting it. `/customer/bookings/new` renders the SHARED
   `components/bookings/modals/BookingModal`, the same one the facility uses.
   Editing the customer-named file changes nothing, which is precisely the trap
   AGENTS.md §Ground warns about: confirm the component is wired in before
   editing it. Grep the host page for the import.
2. **The customer path does not create a booking at all.** It builds a
   `BookingRequest` and hands it to `useBookingRequestsStore` — localStorage —
   with an instabook-eligibility check deciding `scheduled` vs `pending`. There
   is **no `booking_requests` table**. So this is not a screen that forgot to
   call an API; it is a request-and-approval model that exists only in the
   browser.

**SETTLED 2026-08-19 — into `bookings`, no second table.** The product owner
chose it, and the database turned out to have been built for it all along:
**every INSERT into `bookings` is forced to `request_submitted`**, with
`base_price`, `discount` and `total_cost` zeroed and preserved as
`details.requestedQuote` (20260806840000). A booking is a REQUEST by
construction, whoever makes it. A `booking_requests` table would have been a
second model of the same thing.

`/customer/bookings/new` now calls `bookingMutations.create`. Proven with a real
customer session against production:

```
bookings.ref 1000 · request_submitted · boarding · Walk Customer
facility  doggieville-mtl   ← not the demo facility
location  present            ← the migration below
kennels held  0              ← no boarding_stays row
```

**No room is sent, on purpose.** `boarding_stays`' exclusion constraint keys on
`released_at is null`, not on the booking's status — so an unconfirmed request
naming a kennel would hold it against every other booking until somebody
noticed. Rooms are assigned on the ops board after a stay exists, which is how
the facility side already works.

**The four "Booking Requests" surfaces are now visibly disconnected.**
`useBookingRequestsStore` is localStorage seeded from a fixture, read by the
facility bookings page, the online-booking page, `BookingRequestsPanel` and the
topbar dropdown. It never carried a real request — a customer's browser and the
facility's browser share no storage — and the customer path no longer writes to
it at all. A customer's request lands on the **bookings** screen as
`request_submitted`. Those four surfaces are the next thing to convert or
delete.

**Instabook is not implemented against the database.** `resolveInstabookEligibility`
decided a booking should skip approval, and the screen said "<pet> is confirmed!
Skipped staff approval" — which the insert trigger contradicts. Honouring it
needs a second, permitted act that confirms the booking, and a customer cannot
update their own booking's status. The claim is gone; the capability is not
built.

**What had to change before a customer could book at all:**

- `POST /api/bookings` resolved the facility from `getFacilityContext()`, which
  falls back to the DEMO facility for any caller with no membership — so a pet
  owner's booking would have been written against a business they had never
  heard of. A silent wrong-row write, not a refusal. It now resolves the client
  FIRST and takes the facility from that client row when the caller has no
  membership: `facilityContextForClient()`, a parent-row source, which is the
  second of the two `check:facility-from-session` allows. The staff path is
  byte-identical.
- `locations_read` refused a customer, so their booking would have been the only
  row in the table without a location. Migration `20260819100000` admits a
  facility's own clients, mirroring what `facilities_read` has done since 20260801130000. Measured on production: the walk customer's readable
  locations 0 -> 1, a groomer's and an owner's unchanged at 1.

### 🟢 The customer portal names the facility you joined (was 🟠)

`/sign-in`, `/sign-up` and `/join` are correctly branded from the hostname
(`getBrandingBySlug`). The moment you are **inside** the portal, the sidebar, the
header, the facility switcher and the welcome line all read **"Paws & Play
Daycare"** — a name from `src/data/facilities.ts` — for a customer who joined
Doggieville Mtl.

`src/hooks/use-customer-facility.tsx` is the whole story: it maps the fixture,
filters `status === "active"`, and defaults to `availableFacilities[0]`. Nothing
about the hostname, the `clients` row, or Postgres. Its own `TODO: Replace with
actual API call` has been there since it was written.

This is the customer-side twin of the facility-shell bug, which is fixed and
guarded by `tests/e2e/facility-shell.spec.ts` ("names the facility the database
holds, not the fixture"). The customer side has no such guard.

Two smaller things visible in the same first paint, from the same cause: the
Getting Started checklist says **"Add your first pet: Done ✓"** directly above
"My Pets 0 / No pets registered yet", and a brand-new account shows a
notification badge of 3 and a chat badge of 2. Both still stand.

**FIXED 2026-08-19.** The customer layout is already a Server Component and
already reads `x-facility-slug`, so it now calls the same `getBrandingBySlug()`
the auth screens use and passes the result down to the provider. Verified on the
running app: the welcome line reads "Manage your pets and book services at
Doggieville Mtl", and "Paws & Play" appears nowhere in the portal.

**What deliberately did NOT change: `selectedFacility.id`.** Twenty-eight call
sites filter fixture arrays by it — bookings, packages, report cards, the
billing tabs — and a facility uuid matches none of them. Swapping it would turn
every one of those screens silently empty, which is a worse failure than a wrong
name because nothing on screen says anything is missing. So the NAME and MARK
are real and the ID is still the fixture's, and the provider says so in as many
words. That split goes when the screens behind it read Postgres.

### 🟡 `check:success-claims` misses "created successfully" — the commoner word order

The gate looks for `successfully (?:created|sent|saved|updated|deleted)`. Real
copy far more often reads the other way round: `"Booking created successfully!"`,
`"Pet added!"`, `"User Created Successfully"`. All three are claims made by code
that writes nothing, and the gate passed all three — the deleted
`/dashboard/user-management/create` page sat there for months because of it.

**Not widened yet, deliberately:** `(created|added|saved|updated|sent|deleted|
submitted) successfully` matches **19 files** today. Broadening the pattern means
triaging all nineteen, and the baseline is a shrinking list whose own rule is DO
NOT ADD — so it is its own change, not a line slipped into another one.

### 🟡 `server-only` is invisible to `tsc --noEmit`

Consolidating the platform-role label maps into `src/lib/auth/platform-invitation.ts`
— which begins `import "server-only"` — and re-exporting them through a module
that client components import type-checked **clean** and failed the build. Type
imports are erased, so `import type { PlatformRole }` from a server-only module
had always been fine; the first VALUE import is what breaks, and by then the
mistake looks like a refactor that "passed".

**Do instead:** when a module moves across the server/client line, run
`bun run build`, not just `typecheck`. The vocabulary that both sides need now
lives in `src/lib/auth/platform-role.ts` with no `server-only` guard; the token
minting and hashing stay behind it.

### 🔴 Every member could read their employer's plan and Clover merchant (fixed)

`facility_subscriptions_read` and `payment_connections_read` were both "any
active member". Measured as a groomer, against production, before the fix:

```
groomer reads employer's facility_subscriptions rows = 1
```

That row is the facility's commercial relationship with Yipyy — plan, price,
status, dunning state — reachable through PostgREST from a browser with a
session and the publishable key. `payment_connections` names the facility's
Clover merchant.

Closed by `20260818140000_the_facilitys_own_account_is_the_admins`: both now go
through `private.is_facility_admin`. No facility-facing screen read either; the
only consumers are platform-admin surfaces, and a platform admin passes.

**Do instead:** when adding a facility-scoped table, decide which of two things
it is. What the business RUNS ON (settings, modules, hours) is readable by
staff. What the business IS COMMERCIALLY (subscription, merchant, invoices) is
`is_facility_admin` only. The default of "any active member" is the wrong answer
for the second kind and it is easy to reach for.

**And a trap in proving it:** an RLS-refused UPDATE affects zero rows and does
NOT raise. Asserting "the row still exists afterwards" proves nothing — the
first draft of `supabase/tests/facility-account-rls.sql` did exactly that and
passed while measuring nothing. Use `GET DIAGNOSTICS ... row_count`.

### ✅ A facility could not be deleted at all — fixed 2026-08-22

`audit_log.facility_id` was `ON DELETE SET NULL`, and a SET NULL is an UPDATE,
which the append-only trigger refuses without exception:

```
delete from public.facilities where id = ...
  => audit_log is append-only: UPDATE is not permitted on an audit entry
```

So `facilities_delete` (superadmin-only, ADR-backed) could not succeed and the
"the whole facility is going away" branch of `private.protect_last_facility_admin`
was unreachable.

**This entry previously proposed letting the trigger allow the facility_id
null-out specifically, and called that "almost certainly right". It was wrong,
and the reasoning is worth keeping.** That fix succeeds and then ERASES which
facility each entry concerned — silent data loss inside the one table whose
entire purpose is not losing things. The append-only rule was never the problem.

The foreign key was. `audit_log` already carries `facility_name` beside
`facility_id`, denormalised so an entry stays readable when the facility is
gone, and `audit_log_read` gates on `private.is_platform_admin()` rather than on
the facility — so the column is DESCRIPTIVE, not referential. Migration
20260822500000 drops the constraint and leaves the value populated forever.

The same mistake was on `grooming_appointment_history`, which had gained TWO
`ON DELETE RESTRICT` keys — to `bookings` and to `facilities` — against a table
whose own test comment reads "No FK, so deleting the booking cannot cascade the
history away, which is what makes it an audit trail rather than a detail-page
field." A groomed booking was undeletable and the salon was hostage to it. Both
dropped; `grooming_history_read` gates on a facility_id VALUE and needs no
referenced row.

**The rule, stated once: an audit trail must not hold a foreign key to the thing
it audits.** It has to outlive it.

**What deliberately did NOT change.** A facility with payments, store credit or
daycare attendance is still undeletable, and a booking with payments, store
credit or a package pass still is too. Those RESTRICTs are correct — a booking
with money against it must not be deletable, and bookings are cancelled rather
than deleted. This was not "make things deletable"; it removed two constraints
that contradicted the tables they sat on.

Both failing tests now pass: `platform-roles.sql` went from running ZERO
assertions to 13, and `grooming-history-immutability.sql` to 7/7. Immutability
re-verified afterwards: UPDATE and DELETE on `audit_log` are both still refused.

## Snapshot (2026-08-18, walking the journey found the harness first)

### 🔴 An invited hire was never routed to their checklist (fixed)

`redirectIfStillOnboarding` lived ONLY in the facility layout, and it runs AFTER
`guardPortal`. That worked by accident while any member could reach `/facility`:
an invited hire who went looking for the dashboard was intercepted.

They never took that path. Signing in has always landed staff on
`/employee/schedule`, and the employee layout had no onboarding gate at all — so
the checklist existed and nothing routed anybody to it. ADR 0005 then denied
staff `/facility` outright, which removed the accidental interception as well.

Caught by `tests/e2e/staff-invite-gate.spec.ts`, whose assertion was written
against the accidental path. Fixed by running the gate in the employee layout
too, with a `x-pathname` guard — the checklist is itself under `/employee`, so
without one it redirects to itself forever.

**Do instead:** when a gate's destination lives inside the portal it guards, the
loop check is not optional. And an assertion that reads a redirect out of one
hop's RSC payload breaks the moment the routing gains a hop — assert where the
browser STOPS.

### 🟡 No single e2e run can execute the whole suite

The 50 spec files need identities from two different WorkOS environments:

| run                                           | identities that work                    | identities that do not                               |
| --------------------------------------------- | --------------------------------------- | ---------------------------------------------------- |
| local (`bun run test:e2e`)                    | the seven `@yipyy.dev` staging accounts | `CLOVER_E2E_*`, `E2E_NON_FIXTURE_OWNER` — production |
| remote (`E2E_BASE_URL=https://www.yipyy.com`) | the production accounts                 | the seven `@yipyy.dev` — staging only                |

`playwright.config.ts` calls `applyWorkosTestKeys()` unconditionally and it
**refuses anything but `sk_test_`**, on purpose. `scripts/provision-e2e-identities.ts`
provisions the seven `@yipyy.dev` accounts and nothing else.

Eight spec files were failing locally because their guards check that the
fixture variables are SET, not that the account is reachable — so with values in
`.env.local` they ran and every test failed at sign-in with `Invalid
credentials`, which reads like a broken app. `client-file` alone is 15 tests,
each burning a 30s timeout twice with retries.

`tests/e2e/_fixtures.ts` now resolves those values only on a deployed run, so
they skip honestly instead. **Do instead:** guard a fixture on whether it can be
USED, not on whether somebody filled the variable in.

### 🟢 The auth & access specs run in CI (was 🟡) — the rest still do not

~~Nothing runs Playwright, so the suite's red/green state is unmonitored.~~ A
fifth job, `e2e (auth & access)`, runs `bun run test:e2e:ci` on every PR: the ten
spec files covering authorisation and identity, 59 tests, measured at **4m00s**
against a built server (`next start`, not `bun run dev` — on-demand compilation
was most of the old runtime).

**Why a subset.** The other 41 files cover bookings, boarding, Clover and
grooming: things that fail loudly the moment somebody opens the screen. The ten
chosen cover the guards that fail SILENTLY — a groomer refused `/facility`,
`manage_staff` unable to mint an owner, an invited hire routed to their
checklist, the header naming the person signed in. Those are the ones where
typecheck, lint, format and build all go green while the app is wrong.

**CI writes to the real database.** There is one Postgres, and a localhost
server still talks to it. The subset was checked for write-cleanliness before
being put on every PR — facilities, memberships, clients, pets, bookings,
profiles, platform team and role-override counts were identical before and
after a full run. **Anything added to `test:e2e:ci` must clean up after itself**
the way `role-editor-writes.spec.ts` does, or every PR will leave residue in
production data.

**Still open:** the remaining 41 files, and the two-environment problem above
that stops any single run covering everything.

### 🟡 A long local run is still not a clean signal

A full local run on 2026-08-18 did not complete cleanly. Every failure inspected
was infrastructure: `ERR_CONNECTION_REFUSED`, or `/api/permissions -> 404` right
after a restart — 30 of one and 4 of the other in a single subset run. The
dev-server log also carried `Uncaught Error: Rendered more hooks than during the
previous render` (React #310, the same error as the front-door crash above)
followed by `script "dev" exited with code 255`; the two are adjacent in the log
and the causal link is NOT established.

`rm -rf .next` fixed it. Three consecutive subset runs afterwards were stable
(13, 22 and 11 tests), which points at a corrupted `.next` cache —
`turbopackFileSystemCacheForDev` is on — rather than at the app.

**Do instead:** clear `.next` before trusting a red local run, and verify a
change with the subset that covers it rather than the whole suite. The config's
own note already says a rotating cast of failures means the environment is
loaded, not that there are that many defects.

## 2026-08-21 — Scheduling, half converted

### ✅ ~~Three scheduling screens still count leave and swaps from the fixture~~

**Two of the three were not what this entry said.** Corrected the same day:

- `ScheduleNotificationsDropdown.tsx` was **imported nowhere** — dead code, and
  Knip had been reporting it. Deleted rather than converted.
- `ScheduleView.tsx` was not a stale mirror, it was the module's **landing
  page** with the whole rota in `useState` over a fixture. Converted — see below.
- `ReportsView.tsx` is the one that remains, and it is blocked, not merely
  pending. See the next item.

### ✅ ~~Attendance grades people late using the BROWSER's timezone~~

**Fixed 2026-08-21.** `reconcileShift` now takes the facility timezone (required
— a default is how a caller keeps the bug) and derives both scheduled instants
through `shiftInstants`, the same helper that WRITES a shift. `/api/scheduling/shifts`
returns `timeZone` because the client had no other source for it.

A second bug came out with it: a shift running past midnight ENDS THE NEXT DAY,
and the old code compared a 06:00 clock-out against 06:00 on the shift's own
date — grading a night worker 1440 minutes out.

`scheduling-attendance.spec.ts` covers both, and was **verified to fail on the
old code** before being kept: the runner is not in Toronto (Africa/Algiers
locally, UTC in CI), so a clock-in at the exact scheduled instant read as hours
early. It would only be blind on a machine already set to the facility's zone.

**Still fixture:** `ReportsView` and `report-data-sources` pass
`FIXTURE_TIMEZONE` from [scheduling-reports.ts](../../src/lib/scheduling-reports.ts),
named so the fixture-ness is visible at each call site rather than a bare
string. It goes when those two convert — see the entry above for why they
cannot be half-converted.

### 🟡 The scheduling nav gates on a fourth permission vocabulary

`src/app/facility/dashboard/services/scheduling/layout.tsx` gates its tabs on
strings like `availability.approve` from `src/lib/rbac.ts` — a capability list
with no Postgres counterpart. The DATA behind those tabs is gated on the real
cascade (`scheduling_manage_availability`, `scheduling_approve_time_off` and so
on), so the tab a person can see and the rows they can act on are decided by two
systems that were never reconciled.

**Why it's risky:** they agree today by coincidence of how the presets were
written. When they diverge the symptom is a visible tab whose every action is
refused, or — worse — a hidden tab for somebody who holds the permission. The
labour-cost tile was exactly this bug, and it took a conversion to notice.

**Do instead:** when a scheduling tab is next touched, move its `requires` onto
the permission key its API already uses. Do not add entries to `rbac.ts`.

### ✅ ~~The accountant can reach no screen that shows what they may see~~

**Closed 2026-08-21.** The question turned out to be malformed, which is what
made it hard: the accountant does not need the calendar's labour-cost TILE. That
answers "what will next week's rota cost" — a forecast over planned shifts, for
whoever builds the rota, and it belongs where it is. An accountant needs "what
do we owe people for the period that just ended", from ACTUAL clock entries.

So nobody was let into the admin portal. `/employee/payroll` renders in the
staff shell behind `RequirePermission permKey="view_payroll"` — a permission
they already held, in a portal they can already reach, using the per-feature
gating the staff shell already does. No new access level, no carve-out in the
admin gate, nothing added to `rbac.ts`.

`payroll_summary` is SECURITY DEFINER and returns TOTALS: an accountant has no
`scheduling_view_all`, and widening two read policies to admit `view_payroll`
would have handed them every shift and every session as raw rows to arrive at a
figure. `payroll.spec.ts` asserts they get the numbers AND still cannot read the
roster.

**Do not** "improve" this by adding `accountant` to the admin-tier job titles in
`20260818100000_a_membership_is_admin_or_staff`. That hands them bookings,
clients, settings and billing to solve a payroll problem, and the spec's
"the admin portal stays shut" assertion exists to catch it.

### 🟡 The absent labour-cost tile is now provable, and still unproven

`accountant@yipyy.dev` was seeded on 2026-08-21 with the payroll screen — the
only identity that holds `view_payroll` and `scheduling_view_labor_cost` WITHOUT
admin access. That unblocks the case nothing could reach before: the calendar's
labour-cost tile rendering as ABSENT rather than `$0` for a caller without the
permission.

It is still not asserted, because the calendar is an admin-portal screen and an
accountant cannot reach it — so the branch needs an identity that is admin-tier
with the permission overridden to `none`, which the role editor can now do.

**Do instead:** add that override in the spec's `beforeAll` and restore it in
`afterAll`, the way `role-editor-writes.spec.ts` does. Do not edit a real
person's permissions without restoring them.

### 🟡 The scheduling nav gates on a fourth permission vocabulary

`src/app/facility/dashboard/services/scheduling/layout.tsx` gates its tabs on
strings like `availability.approve` from `src/lib/rbac.ts` — a capability list
with no Postgres counterpart. The DATA behind those tabs is gated on the real
cascade (`scheduling_manage_availability`, `scheduling_approve_time_off` and so
on), so the tab a person can see and the rows they can act on are decided by two
systems that were never reconciled.

**Why it's risky:** they agree today by coincidence of how the presets were
written. When they diverge the symptom is a visible tab whose every action is
refused, or — worse — a hidden tab for somebody who holds the permission. The
labour-cost tile was exactly this bug, and it took a conversion to notice.

**Do instead:** when a scheduling tab is next touched, move its `requires` onto
the permission key its API already uses. Do not add entries to `rbac.ts`.

### ✅ ~~The accountant can reach no screen that shows what they may see~~

**Closed 2026-08-21.** The question turned out to be malformed, which is what
made it hard: the accountant does not need the calendar's labour-cost TILE. That
answers "what will next week's rota cost" — a forecast over planned shifts, for
whoever builds the rota, and it belongs where it is. An accountant needs "what
do we owe people for the period that just ended", from ACTUAL clock entries.

So nobody was let into the admin portal. `/employee/payroll` renders in the
staff shell behind `RequirePermission permKey="view_payroll"` — a permission
they already held, in a portal they can already reach, using the per-feature
gating the staff shell already does. No new access level, no carve-out in the
admin gate, nothing added to `rbac.ts`.

`payroll_summary` is SECURITY DEFINER and returns TOTALS: an accountant has no
`scheduling_view_all`, and widening two read policies to admit `view_payroll`
would have handed them every shift and every session as raw rows to arrive at a
figure. `payroll.spec.ts` asserts they get the numbers AND still cannot read the
roster.

**Do not** "improve" this by adding `accountant` to the admin-tier job titles in
`20260818100000_a_membership_is_admin_or_staff`. That hands them bookings,
clients, settings and billing to solve a payroll problem, and the spec's
"the admin portal stays shut" assertion exists to catch it.

### 🟡 The absent labour-cost tile is unproven at the UI level

Following from the above: no e2e identity can both reach the scheduling calendar
and lack `scheduling_view_labor_cost`, so the branch where the tile renders as
ABSENT rather than `$0` has no browser coverage. The _withholding_ is covered —
`scheduling-roster.spec.ts` asserts a groomer reads a position with no rate — but
this component's handling of that absence is not.

**Do instead:** if you need it covered, add a seeded identity that is admin-tier
with the labour-cost permission overridden to `none`, rather than editing a real
person's permissions inside a spec.

### 🟡 The scheduling calendar is real, but four things around it are not

`ScheduleView` now reads and writes `staff_shifts`. Still local to the component
or to a fixture, and clearly marked in the file:

| What                      | Where it should live                                                                  |
| ------------------------- | ------------------------------------------------------------------------------------- |
| Holiday rates             | a settings domain — hardcoded array at the top of the file, dated April 2026          |
| ~~Employee availability~~ | ~~fixture~~ — **done 2026-08-21**: `staff_availability` plus a proposal/approval flow |
| Shift opportunities       | fixture + local state; the SHIFT it posts is now real, the opportunity is not         |
| ~~Time clock~~            | ~~local state, no table~~ — **done 2026-08-21**: `staff_time_clock_entries`           |
| Labour cost               | `calculateLaborCost` fixture — the real figures are in `facility_position_pay`        |

**Why it's risky:** these render beside real data and look equally real. The
labour-cost tile reads **$0** against a rota that has actual wages behind it.

**Do instead:** convert labour cost next — the table and the permission
(`scheduling_view_labor_cost`) already exist, so it is a read, not a migration.

### 🟠 `ReportsView` cannot be half-converted, and it is not the fixture that blocks it

`src/components/scheduling/ReportsView.tsx` still reads `enhancedTimeOffRequests`
and `enhancedShiftSwaps`, and also `scheduleShifts`, `departments`, `positions`,
`scheduleEmployees` and `shiftOpportunities`.

**Why it's risky:** its `departmentFilter` holds a FIXTURE department id, and the
real ids are uuids. Converting only the leave and swap slices would leave a
filter that renders, accepts a selection, and silently matches nothing — the
counts would read 0 for every department and look like an empty quarter. **That
is a worse defect than the stale number it would be fixing**, and it is invisible
in review because the code reads correctly.

**Do instead:** convert its spine first — departments, positions, employees and
shifts, exactly as `ScheduleView` now does — and the leave and swap slices come
free. If that is too much for one change, leave it alone; a stale report that is
consistently stale is safer than a live one with a dead filter.

### ✅ ~~Nothing writes `staff_departments`~~ — and the editors were fixtures

**Closed 2026-08-21.** Two problems, and the second was worse than recorded.

`scheduling/departments` and `scheduling/positions` — where a facility DEFINES
its org chart — were still `useState` over a fixture, while the calendar,
roster, payroll and availability screens had all been converted to read the
real tables. So a facility could add a department, watch it appear, reload, and
find it gone, with the calendar next door reading a table that screen could not
write to. **Converting the readers first and leaving the editors is worse than
leaving both alone**: before, everything was at least equally unreal.

That was also the cause of the membership gap. `staff_departments` shipped with
the roster, the structure route read it, and nothing populated it — because the
only screen that would have was a fixture.

`PATCH` (rename, move, re-rate) and `PUT` (set a department's members, as a
COMPLETE set) were added to `/api/scheduling/structure`; both screens now drive
them. `scheduling-org-chart.spec.ts` covers it, including that a groomer cannot
reshape the organisation and still cannot see what a position pays.

The calendar's "declared members PLUS anyone rostered this week" union stays —
it was never a workaround for the missing writer. A person covering from another
department must appear on the grid or their shift is invisible.

### 🟡 `scheduling/company` should be deleted, not converted

It is a second place to set opening hours, address and tax id — all of which are
already real in `facility_settings` and on the `facilities` row. Only
`weekStartsOn` and `payPeriod` are genuinely new; both belong in a settings
domain, which needs no migration. Converting the screen as it stands would give
a facility two places to change its address and no rule about which wins.

## Snapshot (2026-08-21, live-deploy verification)

### 🟡 `supabase/migrations/` is a RECORD of production, not a script that can rebuild it

Ten commits went to `main` on 2026-08-21 and the deployed build was checked for
the first time. The deploy itself was clean — all seven new API routes answer
`401` anonymously (and unknown paths answer `404`, so that `401` means the route
shipped rather than a blanket middleware refusal), `PATCH`/`PUT` on
`/api/scheduling/structure` answer `401` rather than `405`, which pins
production to the last commit, and `/employee/payroll` returns a
`NEXT_REDIRECT;replace;/sign-in` shell with zero wage content in it.

What the check _did_ turn up is older than any of that work: **137 of the 141
files in `supabase/migrations/` carry version stamps that appear nowhere in
`supabase_migrations.schema_migrations`, and 162 of the 165 ledger rows have no
matching file.** It goes back to the first migration in the project.

The cause is mechanical, not careless. Every migration here has been applied
through the Supabase MCP `apply_migration` tool, which stamps the ledger with
the **wall-clock time at apply time**, while the files are hand-named with round
timestamps (`…220000`). The two naming schemes have never agreed and never will.

**Why it is risky.** `supabase db push` against this project would consider all
141 files unapplied. It would not fail cleanly on the first one either: much of
the DDL is `create table if not exists` / `create policy if not exists` and
would sail straight past, reaching seed migrations that have **no `on conflict`
guard at all** — `20260806340000_prepaid_package_seed.sql` (6 inserts),
`20260805230000_grooming_demo_day.sql` (4 inserts). The failure mode is
duplicated production seed data, not an error message.

**What saves us today** is that nothing invokes it: no `package.json` script, no
CI step, no documented command. The only mention of the CLI in the whole repo is
a comment in `supabase/tests/booking-write-integrity.sql`.

**What to do instead.** Keep applying migrations through MCP `apply_migration`,
which is what every one of them has used. Do **not** run `supabase db push` or
`supabase migration up` against the live project to "catch it up" — that is the
command this entry exists to warn about. If the ledger ever genuinely needs to
agree with the files (a second Supabase project, a disaster-recovery rebuild),
the tool for it is `supabase migration repair --status applied <version>` per
file, decided deliberately and verified row by row — not a push.

**A related trap, already survived once.** The ledger holds
`20260820162248 pay_can_be_written_not_only_read`, which has no file, because it
was an intermediate fix applied via MCP and then folded back into
`20260820220000_a_shift_is_a_row.sql`. That is the _correct_ handling and the
file was verified against the live policy (both arms
`is_facility_admin AND has_permission`, byte-identical). But it means **a ledger
row with no file is not automatically drift** — check whether the DDL was folded
into a neighbouring file before treating one as missing.

## Snapshot (2026-08-21, the employee's own half of scheduling)

### 🔴 Three approval queues had no requester — FIXED, but read why it happened

Leave, swaps and availability became real tables on 2026-08-21, and the
APPROVER's screens were converted to read them the same day. The REQUESTER's
were not. So the facility had three approval queues that nothing could file
into, and the insert policies — written for exactly that caller, own staff row
plus a personal permission (`request_time_off`, `request_shift_swap`,
`view_own_schedule`) — had never once been exercised.

Worse, `/employee/schedule` is the landing path for **every staff member** in
the product (`landingPathForClaims`), and it filtered `scheduleShifts` — a
fixture — by `viewer.id`. The comparison was between two namespaces: the
fixture holds `fs-*` ids and `viewer.id` is an identity id, so it matched
nothing for anybody. Meanwhile the clock those same people punched and the
payroll built from it were real rows. **They clocked in against shifts that did
not exist.**

**The rule this earns, which is the same one the org-chart gap earned a day
earlier and did not generalise far enough:** when you make a table real, convert
everything that READS or WRITES it in the same change — not just the screen the
task named. "Find its writer" was too narrow. The question is _who are all the
parties to this row_, and for anything in scheduling the answer is always two:
the person it is about, and the person who decides.

Fixed by `employee-self-service.spec.ts` (8 tests) plus `?mine=1` on shifts,
time-off and swaps. `ownStaffId()` in `src/lib/api/own-staff.ts` replaces six
copy-pasted `membership_id -> staff.id` lookups across four routes.

### 🟡 RLS scoping is not the same as personal scoping

`staff_shifts_read` already narrows a plain staff member to their own shifts, so
it is tempting to treat "what RLS returns" as "mine". It is not. Anyone holding
`scheduling_view_all` or an approval permission reads the WHOLE facility from
the same endpoint, so their personal screen would silently become everybody's —
a manager's "My Schedule" showing the entire roster, their "My requests" panel
listing every colleague's leave.

That is why `?mine=1` exists and why its tests assert against the OWNER rather
than the groomer: on a groomer the parameter changes nothing, so a test that
only exercises a groomer proves almost nothing.

**Do not re-derive "who am I" in the browser.** That is what produced the
original bug. The server resolves the staff row from the membership; where a
screen genuinely needs the id (to tell "I offered this" from "this was offered
to me"), the payload carries `myStaffId` rather than the client guessing.

### 🟡 Three fakes removed from the staff schedule screen, not repaired

All three claimed success with nothing behind them, and all three sat next to
real data once the shifts were converted — which is what made them dangerous
rather than merely unfinished:

- **"Message sent to manager"** — no backend. Already unreachable
  (`setIsMessageModalOpen(true)` had no caller), so a staff member reporting a
  real problem would have been silently discarded.
- **"Swap request accepted"** — the target accepting an offer. `shift_swap_update`
  admits an approver, or the REQUESTER cancelling; there is no transition by
  which the person asked accepts. The offer is now SHOWN (real rows, via
  `?mine=1`) without the button. Giving the target a real say is a schema change
  and its own work.
- **"Schedule update acknowledged"** — `mockScheduleUpdates`, a hardcoded array
  with 2025 dates, announcing a publication to every staff member forever.

`check:success-claims` caught none of them: its CLAIM regex wants
`successfully (created|sent|saved…)`, and "Time off request submitted
successfully" puts the adverb after the verb. **Worth widening**, but widening it
will surface a backlog — do it as its own change with the baseline updated in
the same commit.

### 🟡 `ReportsView` and `report-data-sources.ts` are the remaining fixture readers

`src/lib/report-data-sources.ts` still imports `scheduleShifts` and
`timeClockEntries` from `src/data/scheduling` and feeds them to `hoursByEmployee`
and `laborCost`. It is the SSOT for facility reports, so the facility's Reports
screen shows fixture labour cost while Payroll next door shows real gross.

Deliberately NOT converted with the employee screens. It is a different job: the
same two functions feed several facility reports, so the blast radius is theirs
rather than scheduling's. Note also that `punctuality(..., FIXTURE_TIMEZONE)` in
`ReportsView` is **currently correct** — the fixtures really are Toronto — so
there is no partial fix available. Convert the data and the timezone together or
neither.

## Snapshot (2026-08-21, the scheduling reports screen)

### 🔴 `memoCache` in `report-data-sources.ts` is only safe for functions whose inputs never change

The module keeps `const memoCache = new Map<string, unknown>()` at module scope
with **no eviction**, and `cacheKey()` builds its key from the selector name,
the date range and `opts` — nothing else. That is exactly right for the
selectors it was written for, whose other inputs are module-scope fixtures.

`staffPerformance` and `laborCost` stopped being that on 2026-08-21: the roster
became an argument, so their inputs now change twice on an ordinary page load —
empty while the queries are in flight, then again whenever somebody picks a
department. Neither is in the key.

The result was a screen that loaded, rendered nothing, and **never recovered**:
the first call cached `[]` under `laborCost|from|to`, and every later call for
that range got it back for the lifetime of the page. The department filter had
the same defect — a new scope, the same key, the previous answer.

Both are now un-memoized, with the reasoning written at the top of
`staffPerformance`. The caller is a React component that already wraps them in
`useMemo` with the right dependencies, which is the correct tool for an input
that varies; adding the roster to the key would also have worked and would have
grown an unbounded cache with every filter change.

**Before adding an argument to anything in this file, check whether it reaches
`cacheKey`.** If it does not, either put it there or drop the `memo()` wrapper.
A stale entry here does not look like a cache bug — it looks like an empty
quarter.

Caught by `scheduling-reports-screen.spec.ts`, and only because that spec opens
a second tab. The KPI row above it was correct throughout, because those figures
are computed in the component rather than through this module.

### 🟡 Two things were REMOVED from the reports screen rather than converted

Both would look like regressions to anyone reading the diff alone:

- **Revenue / Labour % / Sales-per-hour**, on the staff tab. `staffPerformance`
  attributes revenue from retail transactions and grooming appointments. Retail
  has **no backend at all**; grooming's real table is not wired to this screen.
  With the cost side real, showing them together produced labour-as-percent-of-
  revenue from a real numerator over an invented denominator — a fabricated
  financial ratio that looks reconciled _because_ half of it is true, which is
  worse than the all-fixture version it replaced.
- **Open-shift fill rate, Posted/Claimed/Expired/Cancelled, and Top claimers.**
  These reported on a post-and-claim board that does not exist. `staff_shifts`
  knows exactly one thing about an unclaimed shift: `staff_id IS NULL`. "0%
  filled" reads as a failing process rather than an absent feature. The tab now
  lists the shifts that genuinely have nobody on them.

Four buttons went with them, in `RosterView`: "Post for pickup" and "Replace /
find cover" (both claimed "Posted to Shift Opportunities board — eligible staff
will be notified"), and "Send reminder" / "Message employee" (both claimed a
message was sent). Nothing was sent, and a manager who believes they have
reminded somebody about a 6am shift has been told something false about their
own roster.

`PostShiftOpportunityDialog` was KEPT — its `onPost` really does create an
unassigned shift — but its toast no longer promises notifications. Its
`claimMode`, invite list and expiry fields still write to local state only, and
it still stamps `postedBy: "emp-1" / "Sarah Johnson"`, a hardcoded person.

### 🟡 What is still a fixture on the scheduling reports screen

Nothing — but `groomingAnalytics` was removed rather than converted, so
"Appointments per groomer" is gone from the staff tab. There IS a real
`grooming_appointments` table and a route for it; wiring it is the grooming
module's job.

The remaining `@/data/scheduling` importers are all screens already recorded as
their own work: `templates`, `onboarding`, `company`, `notifications`, the audit
trail, and `ScheduleView`'s holiday rates and shift-opportunity state.

## Snapshot (2026-08-21, overtime and holidays in payroll)

### 🔴 A setting seeded into `useState` latches to its fallback forever

`PayrollRulesSettings` did this, and it is the shape to watch for anywhere in
this codebase:

    const settings = useFacilitySettings();
    const [enabled, setEnabled] = useState(saved?.overtime?.enabled ?? false);

`useState`'s initialiser runs on the FIRST render, when the settings query has
not resolved and `useFacilitySettings` is returning `fallbackSettings()`. The
toggle therefore latched to `false` for the life of the page — so a facility
that HAD configured overtime opened the screen and saw it switched off, and the
threshold and multiplier fields, which only render when it is on, never appeared
at all.

`facility-settings.ts` already warns about exactly this confusion for pricing
rules: _"A screen showing no late fee because the facility chose none, and one
showing no late fee because the settings have not loaded, must not look the
same."_ The hook returns `isPending` for that reason and this component ignored
it.

Fixed the way the employee availability screen was fixed the same day: the
server's value is the truth, state holds only what has been EDITED
(`draft ?? draftFrom(saved)`), plus a skeleton while `isPending`.

**Only a browser walk found it.** The API tests passed — the route and the
function were correct throughout.

#### ✅ `TaxSettings` HAD THE SAME SHAPE, WHERE IT COULD LOSE DATA — FIXED 2026-08-21

Same latch, one screen along, and it destroyed data rather than merely hiding
it. `TaxSettings.tsx` seeded `country`, `province` and `taxes` from
`settings.tax_config.value` in `useState` initialisers with no `isPending`
guard, and Save wrote `taxes` straight back out of that state.

**It was not a race a fast connection wins.** Nothing on the settings page reads
`useFacilitySettings` — grep it — so the request does not start until
`TaxSettings` itself mounts, and a `useState` initialiser runs on that same
first render. The initialiser cannot observe a request that has not been made.
So the form latched onto `fallbackSettings()`, whose `tax_config` is `NO_TAX`
with `taxes: []`, **every time**. A facility that had entered its GST and QST
registration numbers opened the screen cold, read "No tax rates configured", and
pressing Save wrote the empty list over the real one.

A second defect underneath: reading a saved row hardcoded `description: ""` and
`isCompound: false`, discarding both. `isCompound` decides whether a tax is
charged on the subtotal or on the subtotal plus the taxes above it — a different
amount of money — so a correctly entered compound tax silently flattened on the
next save of any unrelated field. It was possible because the file kept a
hand-copied local `TaxEntry` interface; it now imports the schema's own, so
there is no second shape to drift.

Fixed with `draft ?? draftFrom(saved)` plus an `isPending` skeleton, as the
payroll and availability screens already were.

**Covered by [tax-settings-screen.spec.ts](../../tests/e2e/tax-settings-screen.spec.ts)**, in
`test:e2e:ci`. Its sharpest assertion is _open the screen, touch nothing, press
Save, and read the row back_ — one action that catches both defects, and what a
real user does constantly. The spec was run against the pre-fix build as a
negative control: two of its three tests failed with the tax rows absent from
the screen, and the third — an unconfigured facility correctly shown the empty
state — passed, which is what proves the fix did not swap one wrong answer for
the other.

**Neither defect was reachable from the API.** `PATCH`/`GET` were correct
throughout; the bug lived entirely in what the screen carried between them, and
every test that had exercised it typed values in first — exactly the state in
which neither appears. Third consecutive day a browser walk found what the API
layer structurally could not.

#### 🟡 `CheckinRequirementsSettings` still reads the fixture

Named alongside the above and NOT the same bug, which the first note got wrong:
`CheckinRequirementsSettings.tsx:60` reads `defaultConfig` from
`facilities`/`defaultFacility` at MODULE SCOPE — the shared fixture, not a
query. So there is no latch to fix; it is an unconverted screen, and belongs
with the rest of the fixture-backed surface in the facility audit.

### ✅ The loyalty programme moved out of the browser — 2026-08-21

`LoyaltyProgramProvider` stored a facility's entire loyalty programme — tiers,
earn rules, badges, reward types, referrals, the redemption rate — like this:

```
const storageKey = (facilityId: number) => `loyalty-program-${facilityId}`;
window.localStorage.setItem(storageKey(facilityId), JSON.stringify(next));
```

Per browser, and under a `facilityId` that was the constant `1` at every call
site. So an owner set their tiers, watched them stick, and every other member of
staff, every other device and every customer went on seeing the seed file —
while a second facility signing in on the same browser read the first one's
programme. Third instance of this exact bug: opening hours and booking rules
were per browser until 2026-08-19, surcharges and discounts until 2026-08-20.

It is now the `loyalty_config` domain in `facility_settings` — **no migration**,
which is what the domain registry is for. One seam, twenty-four consumers: the
provider's own header had said the swap was `loadConfig`/`persist`, and it was.

**The fallback is off and empty**, not the fixture's four-tier scheme with
badges and a referral bonus. Points are a liability a facility owes its
customers; one nobody agreed to is not a default. Same rule as `tax_config` and
`pricing_rules`.

**The writes are awaitable and their refusals are reported.** They returned
`void` when the destination was localStorage, which cannot refuse; Postgres can,
and ten call sites toasted success unconditionally straight after.

**Every editor was the latch shape** — `useState(() => config.badges ?? [])`
and eight more like it. Against a query that is fatal: the initialiser runs
before the answer arrives, so the editor latches onto the empty fallback and
Save writes it over the facility's real programme. Fixed two ways: the small
editors derive (`draft ?? saved`), and the two wizard-shaped screens (`setup`,
`advanced`) had their MOUNT gated so seeding is safe again.

Covered by [loyalty-program.spec.ts](../../tests/e2e/loyalty-program.spec.ts),
in `test:e2e:ci`. The assertion that matters is the one localStorage could never
have passed: a different person, in a different browser, reading what the owner
just saved.

#### 🟡 What the conversion deliberately did NOT do

**The four legacy/new pairs are kept, not blessed.** `FacilityLoyaltyConfig`
carries `pointsEarning` and `earnRules`, `tiers` and `tierDefinitions`,
`pointsExpiration` and `pointsExpiryEnabled`/`pointsExpiryDays`,
`referralProgram` and `referralProgramSetup`. In each pair the engine reads the
older and the admin UI edits the newer, and both tab screens carry a
"Drives current tier resolution" disclosure saying so. Dropping a legacy side
would silently stop the engine. Which model wins is its own change.

**The deep trees are validated as objects, not field by field.** `z.custom<T>`
gives the exact inferred type with a shallow runtime check. Restating eight
nested interfaces in Zod would be a second copy whose failure mode is refusing a
save a facility legitimately made. Reasoning in the banner of
`src/lib/settings/loyalty.ts`.

#### ✅ The ledger is REAL — 2026-08-21

`loyalty_accounts`, `loyalty_transactions` and `loyalty_vouchers`, with RLS,
replacing three hand-authored files keyed by `facilityId: 1`.

**A balance is not a number somebody sets.** The fixture kept `pointsBalance` on
the account AND a separate transaction list — two sources of truth for one fact,
free to drift, so a customer could not be shown a balance and the history
explaining it. Now the ledger is the truth: `points_balance` and the two
lifetime columns are trigger-maintained from it, and
`private.loyalty_balances_come_from_the_ledger` refuses a hand-written change so
`PATCH {"points_balance": 999999}` through PostgREST is not a door.

**A voucher can be spent once, and the database is what says so.**
`consume_loyalty_voucher` updates WHERE the row is still active and not past
expiry, and raises when that matches nothing. Two tills racing for one reward:
exactly one wins. No read-then-write in a route could promise that.

**Overdrafts are refused with a sentence**, not a constraint name. The balance
trigger does `select ... for update` first, which also serialises two staff
redeeming the last of an account at the same moment.

Proved against production by a self-cleaning probe: 13/13 scenarios, including
the second consume, the ledger edit and the hand-set balance all refused, and
zero residue. Covered by
[loyalty-ledger.spec.ts](../../tests/e2e/loyalty-ledger.spec.ts) in
`test:e2e:ci` (6 tests).

**A flaw caught before it shipped:** an append-only DELETE trigger was written
here and removed. `account_id` is ON DELETE CASCADE, and a BEFORE DELETE trigger
that always raises fires on the cascade — so deleting a client would have hit it
and aborted, making the client undeletable. That is exactly the `audit_log` bug
below, and writing it a second time knowingly would have been worse than having
written it once. Append-only against applications is enforced by RLS instead:
there is no DELETE policy at all.

#### ✅ The checkout path is REAL — 2026-08-21

`useActiveLoyaltyDiscount` reads the ledger now: the customer's account by
`clients.ref`, their spendable vouchers (active and unexpired **as the database
sees the clock**, not the till's), and `selectBestDiscount` over the facility's
own strategy.

**Two different bugs were sitting in the two booking checkouts, and neither was
the one the fixture was blamed for.**

- `booking-card.tsx` displayed the discount and **charged the full amount**. It
  rebuilt the charge from `booking.amountDue`, so the number in the dialog never
  reached the money.
- The booking detail page **charged the discounted amount and never lowered what
  was owed**, so the booking would have sat permanently part-paid with no line
  saying why.

Both are fixed the same way, and it is the way the late-pickup fee already
worked: **the discount is a negative LINE ITEM.** `extras_total` moves,
`amount_due` is generated from it, the bill and the charge agree, and the
receipt says what happened. It also _has_ to be a row rather than a number,
because the TERMINAL tender charges server-side from `amount_due` — a figure
living in the browser was never going to reach it.

**The reward is spent BEFORE the money moves.** It used to be spent afterwards
(booking-card) or unconditionally (detail page), against a `consume()` that
could not fail. Now a reward another till has taken refuses the checkout instead
of silently discounting it. The cost of that order is a window — reward spent,
charge then fails — and `release_loyalty_voucher` closes it: the two booking
paths call it on every failure branch.

`used_on_booking_id` is recorded, so a spent reward names the bill it came off.

**Walked against production, twice**, on top of the API tests:

| booking | bill   | reward   | line   | `amount_due` | `amount_paid` | voucher          |
| ------- | ------ | -------- | ------ | ------------ | ------------- | ---------------- |
| 113     | $25.00 | $5 fixed | −$5.00 | 20.00        | 20.00         | used             |
| 112     | $45.00 | 10%      | −$4.50 | 40.50        | 40.50         | used, on booking |

A first walk reported no discount and looked like an app bug. It was the WALK:
`locator.isVisible()` resolves immediately and ignores the `timeout` option
passed to it. Worth remembering — it fails in the direction that looks like a
real defect.

#### ✅ The members screen and the client loyalty tab are REAL — 2026-08-21

For a few hours these were the most misleading surface on the platform. The
ledger became real that morning and the screens still read
`src/data/loyalty-accounts`, so **"Points Outstanding" — a liability a facility
owes its customers — was summed from a seed file** that had nothing to do with
any balance the database held, and the members list showed people with no
account at all. That was a gap I opened, and closing it was the next change.

- `LoyaltyMembersTable`, the members KPIs and the client loyalty tab read
  `loyaltyLedgerQueries`.
- `AdjustPointsModal` posts to the LEDGER instead of pushing onto an array and
  toasting success. The author is stamped **server-side from the session** —
  the browser no longer says who made an adjustment.
- `SendRewardModal` posts points, or grants credit through
  `redeem_loyalty_points` at `points: 0` — a gift costs the customer nothing,
  and the fixture's single `grantReward` had blurred two different operations.
- The client tab's empty state promised an account would appear "automatically
  when this customer next books". **Nothing did that**, so the screen said no
  and meant never. It now has a button that opens one.

**`total_spend` and `total_visits` are derived, not stored.** The account table
deliberately does not carry them (bookings do), but the screen shows and sorts
by them — so `loyalty_account_overview` computes them at read time, with
`security_invoker = true` so the caller's own RLS still decides what comes back.
Without that flag a view runs as its owner and becomes a hole around every
policy underneath.

Covered by
[loyalty-members-screen.spec.ts](../../tests/e2e/loyalty-members-screen.spec.ts)
in `test:e2e:ci`. Its assertion is not "the page renders" — it is that what the
SCREEN shows and what the LEDGER holds are the same number, compared in the same
run.

**`LoyaltyTransactionHistory` took a transitional shape** — `kind` from a real
row, `transactionType` from the fixture — because the customer wallet still
passes the old one. The fixture half goes when the wallet does; it is optional
and documented rather than blessed.

#### ✅ A booking earns its points — 2026-08-21

`POST /api/loyalty/earn`. The rules had been real since that morning and the
ledger since the same day, and **nothing read one to write the other**: a
facility could configure "1 point per dollar", a customer could spend $200, and
their balance did not move. Points arrived only when somebody typed them in.

**A route, not a database trigger.** The rules are a jsonb document interpreted
by `computeEarnings` — schedule windows, per-service scope, tier multipliers,
visit milestones, several hundred lines of TypeScript. Restating that in plpgsql
would be a second implementation of the same rules, and the failure mode of a
second implementation is that it disagrees with the first about what a customer
is owed. So the engine stays in one language and runs on the SERVER, where the
booking and the rules are read under the caller's own RLS. A browser sends a
booking reference and nothing else.

**A booking earns once, and the database is what says so.** A checkout is
retried — a missed toast, a refresh, a blip between the charge and the award.
The route does NOT read "has this earned yet?" and then write; between those two
lines is exactly where the second caller arrives.
`loyalty_transactions_one_earn_per_booking` (partial unique on
`(account_id, source_id) where source = 'booking'`) refuses the duplicate, and a
`23505` is reported as `alreadyEarned` rather than as an error — the caller
wanted this booking to have earned, and it has.

**Points follow money that ARRIVED.** The rule is measured against
`amount_paid`, not `total_cost`: a booking discounted to nothing, or never
settled, has spent nothing, and awarding against a quote would pay a customer
for a bill they did not pay.

**An account is opened on first earn.** A running programme should not skip a
paying customer because nobody pressed a button on their file.

Walked against production: an $85 checkout took a balance from **0 to 85** for a
customer with no account, wrote
`"Earned 85 points — WALK 1 point per dollar"` against the booking, and a
second award came back `alreadyEarned` with the balance unmoved. Covered by
[loyalty-earning.spec.ts](../../tests/e2e/loyalty-earning.spec.ts) in
`test:e2e:ci`.

#### ✅ Tiers resolve themselves — 2026-08-21

`current_tier_id` was a column somebody set by hand. A facility could define
Bronze/Silver/Gold with thresholds, a customer could sail past every one, and
nothing moved them — and because nothing did, the earn route passed a tier
multiplier of **1**, so every customer earned the base rate whatever the screen
said their tier was.

`src/lib/api/loyalty-tier.ts` resolves and persists it, called from the earn
route and from the manual-adjustment route. Promotion does not depend on how the
points arrived: a staff award that crosses a threshold promotes exactly as a
booking does.

**The decision is `recalculateTier`, not a second copy of it.** The rule has real
edges — the highest QUALIFYING tier across three threshold dimensions, and a
downgrade suppressed unless the facility opted in. What is dropped is that
function's OUTPUT side: it also builds a fixture `RedemptionRecord` and a
notification for the fixture bell. The tier-up reward is issued through
`redeem_loyalty_points` at `points: 0` instead — given, not bought.

**The multiplier is read BEFORE the award**, deliberately. A customer earns at
the tier they held when they paid, not the one that payment pushes them into;
paying the new tier's bonus on the transaction that unlocked it hands it over a
purchase early.

Walked against production: a staff adjustment crossing the threshold promoted
`null → Silver` and issued a $5 voucher at zero points, and the next $40 booking
awarded **80 points** at Silver's 2× — the number that had been hardcoded.
Covered by [loyalty-tiers.spec.ts](../../tests/e2e/loyalty-tiers.spec.ts) in
`test:e2e:ci`.

**One divergence from the pure function, on purpose.** `recalculateTier` returns
UNCHANGED when there are no tiers to resolve against, so a facility switching
tiers off left every customer pointing at an id nothing defined — the row said
"Silver" while every screen rendered "—", because they look the id up in the
facility's definitions and miss. `settleTier` clears it. Nothing is lost: the
threshold dimensions only increase, so turning tiers back on restores the same
tier on the next settle. It lives in `settleTier` rather than in
`recalculateTier` because that function is shared with the fixture engine.

**Found by the cleanup, not by the test.** The spec's `afterAll` was written on
the belief that a nudge with tiers off would settle the tier away; the test
asserting the same belief PASSED, and the cleanup silently did nothing, leaving
two accounts naming tiers no facility defined. The test agreed with the code and
both were wrong. Worth remembering: a cleanup that quietly no-ops is a second
assertion nobody reads.

#### ✅ The customer wallet is REAL — 2026-08-22

`/api/customer/loyalty` — balance, tier, history, the rewards they hold, and the
programme itself, in one request.

**Its own route, and that is the whole point.** `/api/loyalty/accounts` resolves
the facility from the caller's MEMBERSHIP and falls back to the DEMO facility for
a caller with none — which every customer is. Pointing the wallet at it would
have shown a pet owner a balance from a business they have never been to. This
resolves through their CLIENT ROW, exactly as `/api/customer/facility` does. That
is the same reasoning written down twice now, which makes it the rule rather than
a special case.

**The tier is COMPUTED, not read.** `current_tier_id` only moves when something
moves the points, so a facility that adds a tier promotes nobody until each
customer next transacts — and the wallet would have told somebody holding fifteen
thousand lifetime points that they were in no tier at all. The route returns the
tier they QUALIFY for; the stored column is what the earn multiplier reads and
catches up on their next transaction. Found by walking it, not by reasoning about
it.

**Progress is measured on the right dimension.** The old arithmetic assumed
points for every tier because the fixture ladder only had points; a real tier can
be measured on spend or visits, and "200 points away" from a tier that wants
twenty visits is worse than saying nothing.

**`loyalty_config` joined `private.customer_visible_setting_domains()`**
(20260822100000) on the reasoning `tax_config` used: a loyalty programme is
advertised, and a customer who cannot see the tiers cannot judge whether it is
worth anything. No balances live in that domain — those are in
`loyalty_accounts`, which admits a client to their own row alone.

Covered by
[loyalty-customer-wallet.spec.ts](../../tests/e2e/loyalty-customer-wallet.spec.ts)
in `test:e2e:ci`, signed in AS the customer — testing the payload through a staff
session would have missed the only thing that could go wrong.

### 🔴 The 41 SQL tests were never run, and 15 of them do not pass

`bun run test:sql` (scripts/run-sql-tests.ts, 2026-08-22). Before it, NOTHING
ran `supabase/tests/` — not CI, not a package script, not a hook. 41 files,
hand-run, and evidently not for weeks.

**That is how the anon trap shipped a fourth time.** `rpc-session-required.sql`
holds V7, a sweep written so a function that forgets `revoke ... from anon`
fails a TEST rather than production. `award_loyalty_badge` shipped with exactly
that hole on 2026-08-22 and V7 would have caught it — had anything run V7.

**First full run: 368 passed, 23 failed, 7 files could not run at all.**

Do NOT read that as 30 regressions. It is at least four different problems, and
each file needs reading before it is believed:

1. **A real hole.** V7 — twelve anon-callable functions in `public`. One of them
   (`facility_branding_by_slug`) is anon-callable BY DESIGN and needs an
   allowlist entry, not a revoke. See the entry above for the full severity
   breakdown; no unauthenticated WRITE is reachable.

2. **Tests that assume an empty database.** `grooming-catalogue-rls` asserts
   "3 services across 2 facilities" and production now holds 7. Written when
   this database was nearly empty; they count rows across a whole table rather
   than their own fixture.

3. **Tests whose platform admin stopped working** — `facility-provisioning` (4),
   `customer-tenancy` and `owner-invitation` all fail with the same 42501,
   "Only a platform administrator may create a facility". One root cause across
   three files: `profiles.is_platform_admin` is now DERIVED by trigger from
   `platform_memberships`, so a test that sets the column directly no longer
   becomes an admin.

4. **Tests broken by constraints added after them** — `platform-roles` (audit_log
   is append-only), `grooming-history-immutability` T7 and `payments-store-credit`
   (foreign keys that now refuse a delete/truncate), `platform-invitation` (RLS),
   `prepaid-packages` (a grooming pass must name a real service),
   `customer-record-claim` (calls `public.link_client_record()`, which no longer
   exists). `care-log` fails in its own harness: "permission denied for table
   tap", because it switches role and the temp table is not granted to it.

**It is NOT in CI yet, deliberately.** Wiring a suite that is 15 files red into
a gate teaches everyone to ignore it. Triage first, per domain; gate once green,
reporting-only first — the path e2e took.

**Running it needs `SUPABASE_DB_URL`** — the SESSION pooler or direct connection
(port 5432). NOT the transaction pooler (6543): it hands out a different backend
per statement, which breaks both prepared statements and the session-level
transaction the whole design rests on. The runner refuses 6543 by name.

**The runner owns the transaction, not the file.** Every test seeds real rows
into real tables — orgs, facilities, memberships, staff — and against production
that is only safe because of the trailing `rollback;`. So the runner strips the
file's own `begin`/`rollback`, wraps the body in its own transaction and aborts
it unconditionally; a file that forgot its rollback, or grew a `commit;`, still
cannot commit, and a file whose shape it does not recognise is refused rather
than run. Verified after a full run: zero test rows survived.

**Each file runs in its own PROCESS.** Bun 1.3.11's Postgres client segfaults
nondeterministically on Windows, inside its own connection handling, with a
stack no JavaScript can catch — twice during this suite, at different points. A
crash in-process takes the exit code with it, and a gate whose exit code is
sometimes 3 for reasons unrelated to the assertions is not a gate.

### 🔴 Cancelling an e2e run LEAKS rows into the production database

Pushing to `main` while a CI e2e run is in flight cancels it — GitHub's
concurrency group kills the older run — and a cancelled Playwright run does not
execute `afterAll`. Every spec that was mid-flight leaves its rows behind, in
the ONE Postgres every run shares.

Observed on 2026-08-22, and it is not theoretical. Run 32567689850 was cancelled
at 10:44:20; its last line is `scheduling-calendar-writes.spec.ts:202` passing at
10:44:14, and that file's cleanup line — `cleanup: N shift(s), position removed,
department removed` — never printed. The next run failed with

    That person is already on a shift that overlaps this one.

on the very shift test 202 creates, and `scheduling-calendar-screen` failed
alongside it looking for a department that was already there. Both looked like
application bugs. Neither was: 233 passed, 1 failed, 1 flaky, and the single
failure was a row nobody deleted.

**The rule: do not push while an e2e run you care about is in flight.** A
one-line chore commit is enough to do this. If a run IS cancelled, assume it
left state and check before trusting the next one — the specs' own cleanup logs
are the evidence, because a cancelled run's tail shows exactly which `afterAll`
never printed.

Worse with two sessions on the repo: they share this database even when their
code is isolated in a worktree.

#### ✅ A badge is awarded, once — 2026-08-22

`loyalty_badge_awards` (20260822200000), one row per (account, badge), created
the first time an account meets the condition. The definitions were already
real; nothing had ever AWARDED one. The earned records were eleven hand-authored
rows for `facilityId: 1`, and the only code that created another pushed onto an
in-memory array inside a fixture engine no server has ever run — so a customer
completed their fiftieth booking against a "Complete 10 bookings" badge, earned
nothing, and was shown somebody else's eleven.

**`award_loyalty_badge` moves the record and the reward together.** A badge
reward is money — points, credit, a discount off a real bill — so a badge
awarded twice pays twice. The unique index is the guarantee, and because the
award row is inserted LAST inside the function, a second caller's 23505 rolls
its reward back with it. Proved on production: two concurrent awards, one row,
one voucher.

**It shipped anon-callable, and that was a regression.** `revoke all ... from
public` does NOT remove `anon`: Supabase's default privileges give every
function born in `public` an explicit `anon=X` ACL entry, and only a revoke
NAMING anon removes it. All of that was already written down in 20260805210403. The three loyalty functions written the day before all say
`from public, anon`; this one dropped the `, anon`, in the same module, by the
same hand. Fixed in 20260822400000 and verified on production. Nothing could be
AWARDED — `has_permission` is false without a subject — but the account lookup
happens before the permission check and the two errors are distinguishable, so
the publishable key bought an existence oracle on `loyalty_accounts.id`. Found
by a second session sweeping its own migrations, not by this one.

**Append-only with no trigger, deliberately.** No UPDATE policy and no DELETE
policy, so PostgREST refuses both. NOT an update-refusing trigger: `voucher_id`
is `on delete set null`, an UPDATE run by the system, and a trigger would refuse
it and make a voucher undeletable. That is the ledger's removed DELETE-trigger
trap arriving from the other direction.

**Four of the seven conditions can fire.** `bookings_count`, `total_spent`,
`first_booking` and `reached_tier` are measurable here. `referrals` and
`reviews` are not — no referral is recorded against an account anywhere and
there is no reviews table — and `consecutive_months` never was. All three report
ZERO rather than an estimate, so the badge shows honest progress and does not
unlock. A guess would award real money for something nobody can show happened.

**A gift-card reward records the badge and issues nothing.** The badges wizard
offers `gift_card` and there is no gift-card table in this database at all — the
whole feature is still fixtures. `plannedBadgeReward` maps it to nothing, and
the customer's card shows no reward chip rather than "$50 gift card" for
something they will never receive. The FACILITY's report still prints what they
configured, which is right — but nothing warns them at configuration time that
it cannot be issued. That warning belongs in the wizard and is not written.

**A staff adjustment settles badges too**, for the reason the tier already did:
a badge that depended on how the points arrived would be one two customers in
the same position could not both have.

**Settling happens on a TRANSACTION, not on a schedule.** A facility that adds a
badge promotes nobody until each customer next transacts. The wallet says so
rather than hiding it — a met-but-unawarded badge sits in "In progress" at full
progress reading "Unlocked — yours at your next visit", because calling it
earned before the reward exists would be a promise the account cannot honour.

Covered by [loyalty-badges.spec.ts](../../tests/e2e/loyalty-badges.spec.ts) in
`test:e2e:ci`. It leaves its award rows behind and cannot do otherwise — there
is no DELETE policy — which is why every probe badge there is worth nothing
except one, and that one pays POINTS rather than a voucher: a stray active
discount voucher on a demo account would come off somebody's real bill later.

**The facility's Badge Achievement report reads real awards and real spend**
(`/api/loyalty/badges`). Its spend input was `src/data/loyalty-spend-events`, a
GENERATED monthly series with a revenue uplift written into it — so the report
told every facility their badges worked, because the file was authored to.

#### ✅ The redemption log is the facility's own rewards — 2026-08-22

`/facility/dashboard/loyalty/redemptions` reads `loyalty_vouchers` through
`/api/loyalty/vouchers?withCustomer=1`. It read `src/data/loyalty-redemptions`,
keyed by `facilityId: 1` — every facility on the platform saw the same log, none
of it had happened, and a voucher a facility really issued appeared nowhere.

**`effectiveStatus`, and why it had to exist.** Nothing flips a voucher to
`expired` — there is no scheduler here — so a reward past its `expires_at` sits
at `active` while `consume_loyalty_voucher` refuses to spend it. Two answers to
one question, and the screen showed the wrong one: its Expired tile could only
ever read zero, and dead rewards counted as outstanding liability. Derived at
read time against the DATABASE's clock, the same reasoning `?spendable=1`
already used.

**Two columns were removed rather than defaulted.** The fixture's `redeemMethod`
(portal / staff / auto / checkout) is recorded nowhere — no column, no argument,
no caller — so any value shown would have been invented. And the header's dollar
total summed `rewardValue` across every row, adding a 10 (ten PER CENT) to a 25
(twenty-five DOLLARS) and calling the answer money; it counts POINTS SPENT now,
which is exact and on the row.

**The customer lookup is opt-in** (`withCustomer=1`). The checkout calls this
route on every render of a booking it might discount and has the customer in
front of it; two extra queries per call for a name nobody reads is the cost that
guards. Two follow-up queries rather than a PostgREST embed, because reading a
to-one relation as an array has already emptied a board in this codebase.

Covered by
[loyalty-redemptions.spec.ts](../../tests/e2e/loyalty-redemptions.spec.ts) in
`test:e2e:ci`. It leaves one voucher behind and cannot do otherwise — there is
no way to delete one through the API and there should not be. Safe only because
it is issued already-expired at zero points: a test must never leave a LIVE
discount on a demo account.

#### 🟠 The three loyalty-REPORT widgets are still fixtures

`LoyaltyPerformanceBanner`, `MemberLifecycleFunnel` and `RewardTypeBreakdown` on
`/facility/dashboard/marketing/loyalty-reports` still read
`loyaltyQueries.redemptions` AND `loyaltyQueries.accounts` — and the banner also
reads the fixture `bookings`. That is why `lib/api/loyalty.ts` and
`DEFAULT_LOYALTY_FACILITY_ID` survive.

Left with the log rather than folded into it, deliberately: they need a decision
the log did not. `program-metrics.ts` prices a percentage discount at
`AVG_ORDER_VALUE = 75` — an assumption baked into a "Revenue Retained" figure a
facility reads as dollars. With real vouchers that assumption is replaceable:
a spent voucher names `used_on_booking_id`, and the checkout writes what it
actually took off as a negative `booking_line_items` row. Doing that is the
next change, not a footnote to this one.

#### 🟠 What badges still do not do

**A badge icon is a KEY, and only the customer's wallet maps it.** The wizard
writes `"star"`; `badgeGlyph` turns that into ⭐ for the wallet and the earned
email, and the facility report maps the same key to a Lucide icon. Anything else
rendering `badge.icon` directly prints the word.

**Nobody is TOLD they earned one, except the counter.** The checkout toasts
name each new badge, and `BadgeCelebration` fires on the customer's first load
after an award (a localStorage set of ids). The badge-earned EMAIL
(`buildBadgeEarnedEmail`) and the portal notification (`badgeEarnedTitle` /
`badgeEarnedPortalBody`) are written and reached only from the FIXTURE engine —
`src/data/loyalty-engine.ts` and `src/lib/loyalty/engine.ts` — which no server
runs. `settleBadges` sends nothing.

**Referral codes** still come from `src/data/referral-tracking`, and
`loyalty_accounts.referral_code` — a real column with a unique index — is never
populated. Which is also why a referral badge cannot unlock.

#### 🟠 What earning still does not do

**Only `booking_completed` fires it.** A retail sale, a package purchase, a
review, a birthday and a referral are all trigger types the rules editor offers
and nothing invokes. A facility can configure a birthday bonus today and no
birthday will ever award it.

**Tier changes were added on 2026-08-22, and badges the same day** — both
settle after an earn and after a staff adjustment; see the entries above.
`useLoyaltyEngine` still exists, still writes to fixtures, and is called from
nowhere in the two booking checkouts — the remaining callers are the grooming
path and the daycare board, and what it does for them is still fixture-only.

#### 🟠 What the checkout change did NOT cover

**Grooming keeps its own arithmetic.** `grooming/payment-dialog.tsx` gets the
real voucher and a consume that can refuse, but its money path does not run
through `bookings` — it charges `amountCharged`, which it computes itself with
the discount already subtracted, and records through `useRecordPayment`. So
there is no negative line item there and **no release if that recording then
fails**. Changing a second money path blind would have been worse than leaving
it; it needs its own pass.

**Every loyalty SCREEN is real now.** Members, its three modals and the client
loyalty tab on 2026-08-21; the customer wallet, badges and the REDEMPTION LOG on
2026-08-22 — each has its own entry below. `lib/api/loyalty.ts` keeps its name
and still hands out `DEFAULT_LOYALTY_FACILITY_ID` as a fixture key, because the
three loyalty-REPORT widgets still read it — see below.

**Points EARNING is real as of 2026-08-21** — see below.

### 🟡 `payroll_summary` reads a domain that may be absent, and says so

Overtime and holidays now come from `facility_settings.payroll_config`. The
fallback is OFF and EMPTY — the rule `tax_config` follows, because a threshold
this codebase invented is not one anybody agreed to.

**But silence is not safe here the way it is for tax.** An unset tax rate
under-collects against the facility's OWN liability; an unset overtime rule
underpays a PERSON. So the function returns `overtime_configured` and the
screen states it, rather than presenting a flat run as a finished one. Do not
"simplify" that flag away because the numbers look complete without it.

Other decisions worth not re-litigating:

- **Overtime buckets by WEEK**, in the facility timezone, starting on the
  facility's own `weekStartsOn`. A fortnight holds two weeks; summing 80 hours
  against a 40-hour threshold invents 40 hours of overtime. `date_trunc('week')`
  is deliberately NOT used — it is ISO-Monday only.
- **The overtime hours are the LAST ones worked** in the week, allocated by a
  running total over entries ordered by clock-in. Rates differ per entry
  (somebody can work two positions), so it has to name specific minutes rather
  than blend a rate nobody agreed to.
- **No minute is paid twice.** Holiday minutes pay their multiplier and still
  count toward the weekly threshold, but are not also given the overtime
  premium; the premium comes off the ordinary tail.
- **A threshold of 0 with the rule ON is treated as UNSET**, not as
  all-overtime. Taking it literally inflates the wage bill by half, and it is
  far likelier a half-finished form.
- **`dailyThresholdHours` was drafted and removed before shipping.** Only the
  weekly rule is implemented, so the field would have been a setting a facility
  could fill in and be paid nothing by. BC has a daily rule; adding it needs a
  second bucket dimension AND a precedence rule (they do not simply add).

### 🔴 A facility-wide flag read off a ROW is wrong whenever there are no rows

`/api/payroll` reported `overtimeConfigured` as
`data[0]?.overtime_configured ?? false`. Every row genuinely carries the flag
and they all agree — it is a property of the facility, not a person — so the
shortcut looked safe, and there was even a comment reasoning it through.

It is wrong in the one case that matters. A payroll period with nobody on the
clock returns NO rows, so the flag fell to `false` and the screen announced "no
overtime rule is set" to a facility that had set one. On the payroll screen's
default period — the last fortnight — that is most facilities most of the time.

Now read from `facility_settings.payroll_config` directly, which is answerable
whether or not anyone worked. **The normalisation in the route must match
`payroll_summary`** (a zero threshold with the rule on counts as unset); the
duplication is deliberate and flagged at both sites.

Found by a browser walk, again — the four API tests all passed, because every
one of them seeded hours first. Covered now by "a quiet period does not look
like a missing rule", which asks for a week in 2019.

### 🟡 The holiday list had two homes and the calendar's was hardcoded

`ScheduleView` held three 2026 dates inline — Easter Monday, Victoria Day,
Canada Day — drawn on every facility's roster as "x1.5 pay rate" while
`payroll_summary` had never heard of them. The roster said a day cost time and a
half; the wage bill for that day was flat.

`payroll_config.holidays` is now the one list, read by the calendar and billed
by payroll. `HolidayRate.departmentId` was dropped: no caller of `isHoliday` has
ever passed one.

**`facilityHolidays` in `src/data/settings` is a DIFFERENT question** — recurring
`{month, day, name}` with no multiplier, about whether the business is OPEN. It
stays parked read-only. Merging "we are closed" with "this pays double" would
answer both wrongly.

### 🟡 The settings deep-link guard defaults to ALLOW

`canAccessSettingsSection` is `!key || permissions[key] !== false` — a section
missing from `SETTINGS_SECTION_KEYS` is permitted. So adding a sidebar entry
with a `permKey` and forgetting the map entry hides the link from someone who
may still deep-link straight to it. `payroll-rules` was added to both.

### 🔴 A Playwright filter matches the WORKTREE's name, and fails open — 2026-08-22

`bunx playwright test report-cards` ran **394 tests in 75 files** instead of the
six in `report-cards.spec.ts`. Not bun, not argument forwarding, not `--`, and
not `playwright.config.ts`: the session was working in
`.claude/worktrees/report-cards-backend/`, and Playwright matches a bare
positional argument as a **regex against the full file path**. Every spec in the
repo lives under `…/report-cards-backend/…`, so the filter matched all of them.

Isolated with `--list`, which is the cheap way to check any filter:

```
bunx playwright test zzz-nonexistent      --list  ->   0 tests in  0 files
bunx playwright test scheduling-availability --list ->   5 tests in  1 file
bunx playwright test report-cards         --list  -> 394 tests in 75 files
bunx playwright test report-cards-backend --list  -> 394 tests in 75 files
```

**Why it's risky:** it fails **open**. You get more than you asked for, and
nothing in the output names the cause — the only symptoms are a run that takes
45 minutes and artifacts from specs you never chose. It cost a full-suite run
against the shared Postgres, and then killing that run skipped an `afterAll` and
leaked rows (see the note on cancelled runs). `bun run test:e2e:ci` is exposed
the same way from such a worktree, because its spec list is bare names too — in
CI the checkout path contains none of them, so it is correct there and wrong
locally.

**Do instead:** pass an explicit path — `bunx playwright test
tests/e2e/<file>.spec.ts` — and **read the `Total: N tests in M files` header
before trusting the run**; `M` is the check. And do not name a worktree after
the feature whose specs you are about to filter by. `bun run test:sql <filter>`
is immune for a reason worth preserving: it filters over `readdir()` basenames,
which never see a path, so it cannot match the directory it lives in. If that is
ever changed to walk paths, the immunity goes with it.

### 🔴 A PostgREST filter on an EMBEDDED column narrows nothing without `!inner` — 2026-08-22

`reportCardQueries.byPet(3)` was written to fetch one pet's report cards:

```ts
supabase
  .from("report_cards")
  .select("… pets ( ref, name ) …")
  .eq("pets.ref", 3);
```

It returns **every report card the caller can see**. PostgREST applies a filter
on an embedded column to the EMBED, not to the parent rows: non-matching parents
still come back, carrying an empty `pets`. Measured against this database:

```
bookings?select=id,pets(ref,name)&pets.ref=eq.1        -> 341 rows (32 with no pet)
bookings?select=id,pets!inner(ref,name)&pets.ref=eq.1  -> 309 rows (0  with no pet)
```

341 is the whole table.

**Why it's worse than an error:** the mapper reads the pet's name off that
embed, so the rows that should have been excluded arrive with `petName`
undefined — and a per-pet screen renders them under the heading of the pet you
asked for. The screen shows a full list, confidently, and every row on it is a
claim about the wrong animal. Nothing throws, nothing logs, and a green
typecheck says the query is fine.

**Do instead:** make the join `!inner` for the relation you are filtering, and
only that one — see `reportCardSelect` in
[src/lib/api/mappers/report-card.ts](../../src/lib/api/mappers/report-card.ts).
Left plain, an embed the caller cannot read through RLS yields a row with a
missing name; made inner, that row disappears. That is right for "cards about
this pet" and wrong for an unfiltered list, so it is applied per query rather
than baked into the select.

**How to catch it:** a test that creates rows under **two** parents and asserts
the other one is ABSENT. A test with a single parent passes either way, which is
why this shipped — the spec covered `petRef` in the POST body and never as a
query filter. See "narrows to one pet, and does not relabel the rest" in
[tests/e2e/report-cards.spec.ts](../../tests/e2e/report-cards.spec.ts).

### 🔴 `next/image` refuses a SIGNED storage URL, and the refusal is a broken image — 2026-08-22

`next.config.ts` admits the Supabase host to the image optimiser for
`/storage/v1/object/public/**` **only**, deliberately: a signed URL's authority
expires, and the optimiser would keep a cached optimised copy reachable from our
own origin after it had. Anything in a **private** bucket — report-card photos,
grooming photos, staff documents — arrives as `/storage/v1/object/sign/…` and is
therefore rejected.

Measured against production, same host, same real file, differing only in the
path segment:

```
signed URL fetched directly from Supabase   -> 200
same URL through /_next/image               -> 400
```

For reference, `/_next/image` answers **400** for a src it will not accept and
**404** for one it accepts but cannot fetch — so a 400 here means "not
allowlisted", not "missing file". Do not read a 400 on a nonexistent object as
proof the pattern is broken: a missing object in an ALLOWED public bucket also
returns 400, which briefly looked like the 2026-08-19 logo fix having never
deployed. It had; a real public logo returns 200.

**Do instead:** render private-bucket photos with a plain `<img>` and the
house-style `{/* eslint-disable-next-line @next/next/no-img-element -- signed
private URL */}`. Do not "fix" it by adding `/object/sign/**` to
`remotePatterns` — that hands the private bucket to a public cache, which is the
thing the config is preventing. The long note on `GalleryImage` in
[src/components/customer/ReportCardPhotoGallery.tsx](../../src/components/customer/ReportCardPhotoGallery.tsx)
is the canonical explanation.

**Why it survived review:** the e2e spec exercises the API, not the render, and
no fixture photo was ever in a private bucket — so every photo path in the
converted report-card screens was written against a URL shape that had never
been rendered.

### 🟠 While somebody is between setup and assertions on the one Postgres, do not write to it — 2026-08-22

There is one database. Every rule below started life named after whichever verb
had just caused the damage — "never cancel an e2e run", then "never push during
an e2e run", then "never purge during one". Each was correct and each was too
narrow, because the hazard is the **state**, not the verb: another session is
mid-run, and anything that writes reaches it.

The verbs found so far, none of which is the last one:

- **Cancelling a run.** Skips `afterAll`, leaks rows, and the next run's failure
  looks like an application bug.
- **`bun run e2e:purge`.** A shared script with a per-owner name.
  `purge_e2e_report_cards()` takes no argument and matches only its own
  `generated->>'todaysVibe' like 'E2E: %'` prefix, so it can reach nothing but
  cards this suite wrote. `purge_e2e_bookings` beside it matches a prefix
  belonging to nobody in particular — one session purging 3 of its own report
  cards also removed **32 bookings** it had never created.
- **Pushing.** Not because of the deploy: the CI run it starts writes to the
  same Postgres. A CI run is a purge-adjacent writer with a different name.

**Why it's risky:** the action is correct in isolation and destructive only
because of someone else's timing, so it is invisible from the doing end — and
from the receiving end it looks like a flaky test or a bug in the code under
test. Nothing in the output distinguishes "cleaned up after myself" from
"cleaned up after you".

**Do instead:** before anything that writes to the shared database, establish
that no other session is mid-run — ask. Two sessions did exactly this on
2026-08-22, in both directions, and it cost a few minutes of waiting each way.
Prefer cleanup that cannot reach another session's rows: take no argument, match
a prefix the application cannot produce, and refuse anything a real user has
touched. That is why `purge_e2e_report_cards` is shaped the way it is, and the
shape is the point rather than the caution.

**When you add the next verb to this list, rename nothing.** The entry is
already named after the state, which is what lets it survive the noun you have
not thought of yet.

### 🟡 A test run proves nothing until you know which server answered — 2026-08-22

`next start` **exits** when it cannot bind rather than refusing to serve, and
the only trace is an `errno: -4091` at the tail of its log. A session started a
server on an already-bound port, missed the failure, pointed Playwright at that
port, and got two red tests — from somebody else's build. The same trap has a
second door: finding a port already answering and pointing `E2E_BASE_URL` at it
without asking whose build it is.

Both directions produce a confident result about code that was never executed.
Red is the lucky outcome; green is the one that ships.

**Do instead:** after starting a server, check it actually bound — and prefer a
port nothing else uses (`netstat -ano | grep LISTENING`). When a run
contradicts what you just changed, suspect the target before the change: the
cheapest discriminator is whether the behaviour differs from the build you
believe is running. A verification that rests on a **database read taken
afterwards** rather than on a green tick survives this trap, and is worth
preferring for that reason alone.

### 🔴 Seven spec files run NOWHERE automatically — four of them are the live payment path — 2026-08-22

75 spec files. 43 in `test:e2e:ci`. Eight gate on `deployedFixture`, and seven
of those eight are outside the CI list, so they execute only when a person
manually points `E2E_BASE_URL` at a remote host, sets the fixture env vars, and
names the files:

```
booking-detail   client-billing   client-file
clover-pay       clover-platform  clover-refund   clover-terminal
```

**Four are the Clover path** — 15 test blocks against live card payments and a
real merchant account. They are the highest-stakes tests in the repo and nothing
runs them.

**The obvious remedy is inert, and that is the trap.** Adding the seven to
`test:e2e:ci` would change nothing. `.github/workflows/ci.yml` sets
`E2E_BASE_URL: http://localhost:3000`; `REMOTE_RUN` in
[tests/e2e/\_fixtures.ts](../../tests/e2e/_fixtures.ts) is false for `localhost`
and `127.0.0.1`; `deployedFixture()` returns `""` when it is false; every
caller's `test.skip(!VALUE, …)` then fires. **CI is a local run by this
codebase's own definition** — deliberately, so production-identity specs skip
honestly instead of failing against staging keys.

Do not re-derive that from the code. There is already a worked example sitting
in the CI list: `facility-shell` **is** in `test:e2e:ci` and uses
`deployedFixture`, and its test `names a facility that is not in the fixtures at
all` **skips** on a localhost base URL — observed on 2026-08-22. One spec in the
list already does not execute. Adding seven more produces seven more of those,
and a green tick that means less than it did before.

**Why it's risky:** a spec that skips silently everywhere is worse than no spec,
because it occupies the slot. It reads as coverage in the file listing, in the
directory, and to the person who wrote it. Same disease as the 41 SQL files
nobody ran — and there the fix took a preflight that FAILS loudly rather than
skipping, which is the shape to copy.

**Do instead:** treat this as a design question about test identities, not a
list edit. The real question is whether the Clover path can be exercised against
the **sandbox** merchant from a local run at all — and if it can, `REMOTE_RUN`
is the wrong gate for those four, because it conflates "has real credentials"
with "is not localhost". Until somebody answers that, do not describe the
payment integration as covered by the suite. It is covered by a file.

## Snapshot (2026-08-22, wiring a gate to CI)

### 🔴 Supabase's DIRECT connection string is IPv6-only, and GitHub runners have no IPv6

Setting up the `sql` CI job needs a `SUPABASE_DB_URL` secret. The Supabase dashboard offers three connection strings and the most obvious one is wrong for CI:

| Tab in the dashboard  | Host                                      | Works from GitHub Actions? |
| --------------------- | ----------------------------------------- | -------------------------- |
| **Direct connection** | `db.<ref>.supabase.co:5432`               | **NO** — IPv6-only         |
| **Session pooler**    | `aws-0-<region>.pooler.supabase.com:5432` | **YES** — IPv4             |
| Transaction pooler    | `…pooler.supabase.com:6543`               | No — see below             |

**Why it's risky:** the failure is a **connection timeout**, which reads exactly like a wrong password or a firewall rule. Nothing in the message says "your runner has no route to this address", so the obvious next move is to re-copy the credential — which is the one thing that cannot help. Supabase moved direct connections to IPv6 and GitHub-hosted runners still have no IPv6 route; the pooler is dual-stack.

The transaction pooler (6543) is wrong for a different and equally silent reason: it hands out a different backend **per statement**, so prepared statements vanish between calls and a session-level transaction cannot be held. Since `scripts/run-sql-tests.ts` depends entirely on `begin`/`rollback` spanning statements, that is fatal — and it reports as `prepared statement "…" does not exist`, which names nothing relevant. The runner and the CI preflight both refuse port 6543 **by name** for this reason.

**Do instead:** use the **Session pooler** string, port 5432. Its username carries the project ref (`postgres.<project-ref>`), which is the quickest way to tell the two apart without revealing the password. Verified 2026-08-22: the secret set from the pooler string produced a green `sql` job on run 32584736000 in ~90 seconds.

### 🟡 A re-run started to check something can be cancelled by the push it was checking for

`ci.yml` sets `concurrency: cancel-in-progress: true`, grouped per ref. So re-running a single failed job on `main` to verify a fix, while somebody else is about to push to `main`, means **their push cancels your re-run**. You block them, and you get no answer — the check destroys itself.

**Why it's risky:** this is not the ordinary two-writers-collide hazard listed in the shared-database entry above, and it does not look like a hazard at all. It looks like diligence. The whole point of the re-run is to avoid asserting something unverified, and the mechanism silently converts it into a cancelled run whose absence is easy to read as "nothing happened".

**Do instead:** when a colleague's push is imminent and will run the same job, **let their run be your verification** rather than starting your own — provided their change genuinely cannot affect the result, which is a claim to check rather than assume. On 2026-08-22 the peer's six commits contained no DDL and touched no grants, so the SQL suite could not be affected by them; their run was therefore a clean read on the secret, and re-running would have been a duplicate that cancelled itself. This is a fourth verb for the entry above — add a fifth without renaming it.

### 🔴 The magic-auth bridge marks an email VERIFIED that nobody verified — 2026-08-22

Passkeys sign a user in without WorkOS's hosted UI (which cannot render per-facility branding — [ADR 0004](../architecture/decisions/0004-workos-replaces-clerk-as-identity-provider.md) §4) by verifying WebAuthn ourselves and then minting a real WorkOS session through Magic Auth:

```
createMagicAuth({ email })        -> { code }   // returned, NOT emailed
authenticateWithMagicAuth({ code, email, clientId })
```

**The measurement.** Spiked against staging once `isMagicAuthEnabled` was turned on:

```
[2] Bridge against a NEW UNVERIFIED account: passkey-spike-1787415937475@yipyy.dev
   created user_01M0N4NHQ5XNFXMX40KMTB1S5Q emailVerified=false
   createMagicAuth -> code=PRESENT (6 chars)
   UNVERIFIED ACCEPTED -> user=user_01M0N4NHQ5XNFXMX40KMTB1S5Q verified=true
```

It was not refused. It was accepted **and promoted to `emailVerified: true`**. Both environments carry `isEmailVerificationRequired: true`, so this walks through the environment's own policy.

Also measured, same run: the minted token carries `"role": "authenticated"` from the registered issuer, so Supabase RLS cannot tell this session from a password sign-in — which is what makes the bridge viable at all, and what makes this hazard reach every table.

**Why it's risky:** the behaviour is _correct_ for real Magic Auth — holding a code that arrived by email proves control of the mailbox. It is wrong only because we read the code out of the API response and never send the mail, so holding it proves nothing. Nothing in the WorkOS response marks the distinction, nothing fails, and the account looks legitimately verified afterwards. The guard that prevents it also looks redundant from inside either route: at enrolment the user already has a session, at sign-in they already presented a passkey. Both readings are wrong, and both are exactly what a tidy-up concludes before deleting the check.

**Do instead:** refuse unless the WorkOS user has `emailVerified === true`, on **both** `register/verify` and `authenticate/verify` — a credential enrolled under a weaker rule must not become the way around a stronger one. Do not infer it from having a session. This is enforced by `bun run check:passkey-email-verified`, which was written _before_ the routes it guards so they are born inside it; it also confines `createMagicAuth` to the single bridge file, because anything that can call it can become any user by email. The gate strips comments before matching, so writing the word in prose does not satisfy it.

## Snapshot (2026-08-23, gift cards)

### ~~🔴 Making one end of a value transfer real, while the other stays a fixture, DESTROYS money~~ — RESOLVED 2026-08-23

`/facility/dashboard/gift-cards` has a "Redeem to Wallet" button. It moves value
off a gift card and onto a customer wallet.

As of 2026-08-23 the **card** is a real row (`gift_cards`, with a trigger-maintained
balance over an append-only ledger). The **wallet** is not: there is no wallet
table at all, and `customerWallets` in `src/data/gift-cards.ts` is hand-authored.

Wiring that button up in the conversion would have taken a real balance off a
real card and credited React state — money gone, with a success toast over it.
That is strictly WORSE than the all-fixture version it replaced, where nothing
was real and nothing could be lost. The button is disabled and its callback
writes nothing; both, because either alone is one edit away from paying out into
a void.

**Why it's risky:** the pull to "finish the screen" is strongest exactly here,
and the change looks like the ones either side of it — the same modal, the same
mutation shape, one more `useMutation`. Nothing fails. The card's ledger even
looks correct afterwards: it records a redemption that genuinely happened. Only
the destination is missing, and no test that reads the card can see that.

**Do instead:** when converting a screen that MOVES value, list both ends first
and convert them together or neither. If one end cannot be built in the same
change, turn the transfer off in the UI **and** in the handler, and say why in
both places.

**RESOLVED the same day, and the guess above was WRONG.** The wallet is not
`loyalty_accounts.credit_balance`. It is `store_credit_entries` (20260806220000),
which had existed for weeks: append-only, signed, balance derived by the
`client_store_credit` view, and — the part that settles it — **already spent down
by `record_payment` at checkout**. `credit_balance` would have been the worse
choice for exactly the reason flagged: nothing spends it.

The lesson is the one this repo keeps paying for. Before building a store for
something, grep for one. `/facility/dashboard/gift-cards` reached for a
`customerWallets` fixture that duplicated a real ledger, which is the identical
mistake `/facility/services/memberships` made with `prepaidCredits` — issuing
credit against typed-in names that matched no client.

`redeem_gift_card_to_credit` now moves both ledgers in one transaction and the
button is back on.

### 🟡 The three CUSTOMER gift-card screens are still wholly fixture, and that is the safe half

`/customer/gift-cards`, `/customer/gift-cards/my-cards` and
`/customer/gift-cards/redeem` all read `src/data/gift-cards`. Both ends of what
they do are fake, so nothing there can lose money — that is the reason they were
left alone rather than an oversight.

**Why it's risky:** they are now inconsistent with the facility screen in a way
that looks like a bug and is not. A card a facility genuinely issues does NOT
appear in the recipient's list, because that list is a hand-written array. The
tempting fix — point the customer list at `/api/gift-cards` — would be half
right: RLS shows a customer the cards they BOUGHT (`purchased_by_client_id`),
never ones bought FOR them, because the recipient is an email on a row rather
than an identity and matching on it would let anyone who guessed an address read
a balance.

**Do instead:** convert the customer side as its own change, and decide first how
a recipient is IDENTIFIED — a claim step that binds the card to a signed-in
account is the shape that does not leak. Do not widen `gift_cards_read` to match
on `recipient_email`.

### 🟡 A legacy numeric `facilityId` on a converted row must be a sentinel, never 11

`src/app/facility/dashboard/gift-cards/_lib/to-legacy-card.ts` maps a Postgres
card into the `GiftCard` shape the 2,099-line screen and its ~3,900 lines of
components already speak. That type carries `facilityId: number`; Postgres
carries a uuid.

It is set to `0`. Setting it to `11` — the demo facility's legacy id, and the
value 97 other client-side occurrences use — would make a Pawradise card claim to
be a Doggieville one and silently pass every `=== FACILITY_ID` filter it met.

**Why it's risky:** `0` is the safe choice but not a free one. Any surviving
filter on that field now matches nothing, so a feature can turn itself off
QUIETLY rather than loudly — which is exactly what happened to the detail
sheet's "Extend Expiry", gated on
`giftCardSettings.find(s => s.facilityId === card.facilityId)?.expiryEnabled`.
It resolved to `undefined`, defaulted to `false`, and the button vanished with
no error anywhere.

**Do instead:** when a shim cannot carry a field honestly, use a sentinel that
matches nothing AND grep every reader of that field in the same change. Anything
that needs the facility takes it as a prop from the page, which knows — see
`expiryEnabled` on `GiftCardDetailSheet`. Better still, retype the components off
the legacy shape and delete the shim; it exists so the data move and the UI
rewrite are two diffs rather than one unattributable one.

### 🔴 An append-only ledger + a newest-N cap = a test that breaks on a day nobody touched it — 2026-08-23

`loyalty-badges.spec.ts` "a badge that pays points actually pays them" went red
on main with **nothing in the application changed**. Two commits in a row failed
CI on it and it looked like a regression from whichever landed last.

It was neither. Measured against production:

- The award row existed (`points_awarded: 5`) and so did its ledger entry.
- The account had **685** `loyalty_transactions`.
- `/api/loyalty/transactions` ordered newest-first and took **500**.
- The entry was row **536**. It fell off the page by 36 rows.

`loyalty_transactions` is append-only on purpose, and the loyalty specs post to
the SAME demo account every run. So that account can only grow, and the day it
crossed 500 this assertion began failing forever — with no commit to blame and a
message ("expected 1, received 0") that reads exactly like the feature broke.

**Why it's risky:** every signal points at the wrong place. The failing test names
a feature that works. `git bisect` lands on an innocent commit or on none. And the
same shape is waiting in every other spec that reads a capped list of rows it also
appends to — `loyalty-earning`, `loyalty-ledger`, the care log.

**Do instead:** when a spec asserts on one row in a list that a cap could truncate,
ask for a WINDOW containing it rather than scanning the page. The route now takes
`?since=` and `?until=`, both filtering before the cap.

**Both ends.** The first fix set only `since`, anchored a second before the entry —
and it still failed, because the cut is on the NEWEST rows and 535 of them had
piled up after that point. A lower bound cannot help when the volume is on the
recent side of it. That one costs a full build-and-run to discover, so it is
written down here rather than rediscovered.

**And the screen has the same hole.** The cap is not only a test problem: a customer
with 600 entries silently loses 100, and a truncated MONEY history invites somebody
to conclude the earlier entries never happened. The response now carries
`truncated: true` when the cap bites — **no screen reads it yet**. That is the
remaining half.

The structural fix, not done: these specs should mint a fresh account per run
instead of piling onto one shared row. The entries stay append-only, they just
stop accumulating in the same place. Its own change.

### 🔴 A `SECURITY DEFINER` function BYPASSES RLS entirely here — `force row level security` does not stop it — 2026-08-23

`store_credit_entries` is `force row level security`, and its insert policy is
the permission split that matters most in the product: a POSITIVE entry needs
`process_refund` (giving money away), a negative one needs
`financial_take_payment` (taking money in).

Measured on production, signed in as `reception`, who holds **no**
`process_refund`:

```
a SECURITY DEFINER function inserting a positive `added` row  ->  ALLOWED
```

FORCE removes the table OWNER's exemption from RLS. It does not help when the
owner is a **superuser**, and superusers bypass RLS outright. So inside any
`SECURITY DEFINER` function in this database, every policy on every table simply
is not there.

**Why it's risky:** it is invisible at the call site and it inverts the usual
intuition, which is that a definer is "the safe way" to do a privileged thing.
It also means the reason every writer of `store_credit_entries` is
`SECURITY INVOKER` is load-bearing rather than stylistic — 20260806760000 says so
in as many words ("SECURITY INVOKER, so both inserts face their own policies")
and that sentence is the only thing standing between the money split and a
refactor that "simplifies" one of them to a definer.

**Do instead:** if a function must be `SECURITY DEFINER` — `redeem_gift_card_to_
credit` must be, because `gift_card_transactions` has no write policy at all by
design — then re-implement every permission check **explicitly inside it** and say
in the header that the policy is not reachable from there. Never reason "the
policy will catch it". And when a function only needs tables that DO have
policies, keep it `SECURITY INVOKER` so the policy stays the enforcer.

### 🟡 A transfer between two liabilities is not a grant, and the permission has to say so — 2026-08-23

Moving a gift card's value onto a customer's account looks like creating store
credit, and the ledger's policy asks for `process_refund` on any positive entry.
Applying that rule here would have been defensible and wrong: measured,
`reception` and `retail` hold `financial_manage_gift_cards` and **not**
`process_refund`, and they are precisely who stands at the counter when somebody
hands a card over.

The distinction is that nothing is created. The business owed the money on the
card; afterwards it owes the same money on the account. `redeem_gift_card_to_
credit` is gated on `financial_manage_gift_cards`, and what makes that safe is
structural rather than a matter of trust: the debit is in the **same transaction**
and the gift-card trigger refuses an overdraft, so credit can only appear where a
card really held it. G21 asserts the sum is unchanged; G23 asserts an overdrawing
transfer moves **neither** ledger.

**Do instead:** when adding a movement between two money tables, ask whether the
total liability changes. If it does not, it is a transfer, and reusing the
"granting" permission will lock out the people whose job it is. Give it its own
reason on the ledger too — `gift_card` rather than `added` — or an auditor reads
it as the business having given the customer money.

## Snapshot (2026-08-23, Yipyy Pay)

### 🔴 Clover is an acquirer, not a platform — four capabilities do NOT exist and were looked for — 2026-08-23

The Yipyy Pay specification models Clover as Stripe Connect: an ID scan, an EIN
and a social security number collected in-app, an IRS letter uploaded to unstick
a new tax number, a payout schedule and a statement descriptor set from the
integration. **None of that is reachable from an OAuth application.** Established
by reading Clover's own API reference; recorded here so the next person does not
spend an afternoon finding the same four absences.

- **No partner-driven KYC.** Clover collects identity, tax number and bank
  details directly from the merchant when the account is opened. There is no
  endpoint to submit or amend them on the merchant's behalf.
- **No payout or settlement endpoint.** Deposits are visible in the merchant's
  own Clover dashboard and nowhere else.
- **No statement descriptor or payout schedule control.** Both belong to the
  merchant account.
- **No revoke** — already recorded above, and the same shape of absence.

**Do instead:** build the screen and point the control at something real. The
wizard's step 2 _reads the merchant back_ for the facility to confirm; the
payout figures are derived from `public.payments` and say **estimated** on the
screen; the payout schedule is stored as a facility declaration used only for
arrival-date arithmetic. A verification screen that verifies nothing is worse
than no verification screen — it tells a facility their business has been
checked when nobody checked anything.

### 🔴 `payments` has no column for a surcharge, so "client pays the card fee" is not a settings toggle — 2026-08-23

Yipyy Pay ships the fee-payer choice with **"add it to the invoice" disabled and
the reason stated**, which looks like an unfinished feature and is not. Measured
against the schema: `public.payments` carries
`constraint payments_total_is_its_parts check (grand_total = subtotal + tax + tip)`
(20260806220000) on an append-only ledger with UPDATE, DELETE and TRUNCATE
blocked for every role including `service_role`. There is nowhere to record a
processing fee. Both charge paths also derive the amount server-side —
`/api/payments/clover/charge` from `amount_due - amount_paid`, the terminal route
from `booking_line_items` plus tax config — deliberately, so a browser cannot
name a price.

So passing the fee on means: a migration altering a CHECK on a money table, both
charge routes, the refund path (is the fee returned with the sale?), and a tax
question whose answer differs by jurisdiction. That is its own change with its
own review.

**Do instead:** do not store `feePayer: "client"` until the ledger can hold the
result. A setting that is saved and not honoured is the exact failure this
feature was built to remove — and it would be invisible, because the invoice
would simply not have the line. The schema field and the published rates
(2.9% + 50¢ card-present, 3.4% + 30¢ card-not-present) are already in
`src/lib/settings/yipyy-pay.ts` for whoever picks it up.

### 🟡 Device status cannot be a page load, and the spec asks for one — 2026-08-23

The specification calls for a live online/offline dot on every device card,
"pulled from the Clover API on page load. Not cached." `deviceState()` is a round
trip to physical hardware: a healthy device answers in about 8 seconds, one with
Cloud Pay Display closed costs Clover's own 15-second device timeout before the
504, and the measured allowance in `src/lib/clover/terminal.ts` is 40 seconds
(set down from an earlier 25 that reported an awake terminal as unreachable).

Three readers on one page is therefore up to two minutes of loading for an answer
that is stale by the time somebody walks to the counter.

**Do instead:** the Devices tab lists what the merchant owns immediately and each
card has a **Check** button hitting
`POST /api/payments/clover/terminals/status` (`maxDuration = 60`, one device per
request). A card that has not been checked says "Status not checked" rather than
showing a hopeful green dot. If this is ever revisited, the fix is a background
job writing last-seen to a column — not a fan-out on render.

### 🟡 `/facility/dashboard/billing/payment-settings` is a fixture screen called "Yipyy Pay" — 2026-08-23

2,035 lines, last touched 2026-03-26, reading `getYipyyPayConfig` and
`getFiservConfig` from `src/data/`. It contains a card titled **"Yipyy Pay / Tap
to Pay Configuration"** whose switches save to nothing, and a Fiserv block for a
processor this product does not use.

It now collides by name with the real payment product at
`?section=yipyy-pay`. A facility searching for "Yipyy Pay" can find the fixture
first and conclude the settings do not stick.

**Do instead:** left alone by the Yipyy Pay change on purpose — deleting a
2,000-line page is its own scoped task, not a drive-by. When somebody takes it:
redirect the route to `?section=yipyy-pay`, and check what else imports
`src/lib/yipyy-pay-service.ts` and `src/lib/fiserv-payment-service.ts` before
removing either. Related and still true: `TakePaymentModal` offers a
`clover_terminal` method and shows "Waiting for terminal…" while contacting
nothing.

### 🔴 A killed e2e run leaves an elevated groomer that four specs report and nobody can find — 2026-08-23

`role-editor-writes.spec.ts` carries a long banner about its teardown being
mandatory. The teardown was real and it was **incomplete**: it cleared
`facility_role_permissions` and nothing else, while the test
_a custom role grants through the cascade_ created `Senior Groomer (e2e)` with
`manage_staff = operating_hours`, assigned it to `fs-dev-groomer`, and then
unassigned and deleted it **inline, at the end of its own body** — the part that
does not run when a run is killed or an earlier assertion throws.

**What it cost, measured.** CI run 32647919681 failed exactly five specs and
nothing else, all of them the same fact from different angles:
`role-editor-writes › owner's edit…` (at `expect(before.manage_staff).toBe("none")`,
read at the START of the test, so the elevation was already live),
`scheduling-org-chart` ×2, `staff-field-exposure › a groomer cannot read a
colleague's pay, code, notes or grants` — which failed with a groomer reading
`"Overnight boarding — anytime access for medication and midnight checks."` —
and `staff-invite-gate`. Forms, waivers and gift cards were green in the same
run.

**Why it was so hard to find, and this is the transferable part.** Two sessions
independently checked `facility_role_permissions`, `membership_permissions`,
`staff_permissions` and the memberships row. All four were empty or correct.
`GET /api/roles/overrides` returned `{}` for both override layers. Every one of
those readings was TRUE — they were answers to a narrower question than the one
being asked. The grant was in the fourth branch of the cascade,
`staff_custom_roles` → `facility_custom_role_permissions`, which that endpoint
does not report.

Worse, the partial cleanup makes it look **self-healing**: `afterAll` repairs its
own layer on the way out, so a later re-run can pass while the custom-role grant
is still sitting there.

**Fixed** by moving the unassign-and-delete into the `afterAll` alongside the
override reset. **Do instead:** if you add a test here that grants through a NEW
branch of the cascade, clean it up in the teardown, never at the end of the body.
And when a permission reading looks clean, check which branches your query
actually covers before concluding the data is fine.

### 🟡 `staff-invite-gate` leaves one onboarding instance per staff member, for ever — 2026-08-23

Its `afterAll` restores `staff.status = 'active'` and stops there. The
`onboarding_instances` row the invite created stays, because there is no DELETE
verb on `/api/staff-onboarding/instances/[staffId]` for a teardown to call —
only GET and PATCH, though the table does carry a delete policy gated on
`manage_staff`.

**It is bounded, not unbounded**, and that is why no endpoint was added for it:
`/api/staff/[id]/invite` upserts with `onConflict: "staff_id"`, so re-running the
spec replaces the same row rather than adding one. The cost is a single extra
row per staff member a test has ever invited.

The real damage was second-order. `supabase/tests/onboarding-instances-rls.sql`
T0 counted `public.onboarding_instances` with **no filter at all, as superuser** —
an assertion that the database contains nothing else, which nothing on a shared
Postgres is entitled to assume. One leaked row turned a required check red for a
reason unrelated to the code under test. T0 is now scoped to the fixture's own
facility.

**Do instead:** never let a SQL assertion rest on a global count of a table other
people write to. Scope it to the fixture's own rows. The failure otherwise lands
on a day nobody touched the code, and the cost is not the red run — it is that
people learn to skip a red suite. Same shape as the loyalty-ledger newest-N cap
above.

### 🔴 A true answer to a narrower question than the one being asked — 2026-08-23

Two sessions each lost most of an afternoon to this on the same day, in
unrelated subsystems, and neither spotted it from the inside. It is one mistake
wearing two sets of clothes, so it gets one entry.

**Case one — the permission that was not there.** Chasing an elevated groomer,
we read `facility_role_permissions`, `membership_permissions`,
`staff_permissions` and the memberships row, and called `GET
/api/roles/overrides`, which answered `{}`. Every reading was **true**. The
grant was in `staff_custom_roles` → `facility_custom_role_permissions`, a branch
that endpoint does not report. `{}` was a correct answer to "what is in the two
override layers", read as an answer to "is the groomer elevated".

**Case two — the fixture that was the wrong shape.** `forms.spec.ts` built a
schema nesting `fields` under `sections`; the application writes flat
`questions` with a `sectionId`, and the column is plain jsonb so it accepted the
invention. Twelve API-level assertions passed, because every one of them was
`JSON.stringify(schema).toContain(...)` — **true of the bytes it searched**, and
silent about whether the structure was the one the code reads. Only the screen
test caught it, because the page rendered a form with no questions.

**The defence is not more assertions.** Both suites had plenty and both were
green. It is **at least one assertion at the layer the user sits at** — a render,
a resolved permission map, a total on a screen — because that is the only layer
where "answered the wrong question" and "answered the right one" look different.

**Do instead:** before believing a clean reading, ask what the query or endpoint
does NOT cover, and say so in the assertion's name. Prefer an assertion that
would fail if the structure changed over one that searches a serialised blob.
And when a bug is invisible from four true readings, that is evidence you are
asking a narrower question — not evidence the data is fine.

### 🟡 One tree, one `.git`, one branch — a push vouches for everyone's commits — 2026-08-23

Two sessions worked `c:\dev\puneet` simultaneously. Both reasoned as though
"my commit" and "your commit" were separable units of risk. They are not: there
is one `main`, `git log --oneline` interleaves both authors, and whoever types
`git push` ships **every** commit ahead of `origin`.

So "I will push mine before you start" does not isolate anyone — it ships the
other session's unverified work on your say-so, and Vercel deploys production
from `main` on push.

**Do instead:** nobody pushes unless everything unpushed is verified by whoever
wrote it. "My part is green" was never sufficient. Check `git log
origin/main..HEAD` before pushing and confirm you recognise every commit in it.
Stage by explicit path, never `git add -A`, so at least the _contents_ of a
commit stay yours. And treat a running Playwright suite as an exclusive lock —
announce before, not after.

**Added 2026-08-24 — a whole-repo gate reads the TREE, not your commit, so on a
shared tree it tells you about work that is not yours and may not be finished.**
`bun run format:check` was reported as failing on `src/types/database.ts` and
the author was told so. It was true when measured and false a minute later: the
other session was mid edit-then-format, and the check had been run in the
window between. Re-measured after: exit 0, file clean, committed.

The trap is that the failure is indistinguishable from a real one. **You cannot
tell "not formatted yet" from "will fail CI"** — the gate reports both
identically, and it fails in the other direction too: a green `format:check`
says nothing about a file a peer has not saved yet.

**Do instead:** before reporting a whole-repo gate failure on a shared tree,
check `git status --short` for the named file. If it is someone else's
uncommitted work, that is a snapshot of a moment, not a defect — ask before
announcing it, and never format a file you do not own to "fix" it. Gates that
take explicit paths (`bunx prettier --check <path>`) are worth preferring when
you only want to know about your own change.

**Amended 2026-08-25 — the TREE is split; the BRANCH is not.** On the product
owner's instruction, concurrent sessions now take a `git worktree` each rather
than sharing `c:\dev\puneet`:

```
C:/dev/puneet                                     [main]
C:/dev/puneet/.claude/worktrees/<name>            [worktree-<name>]
```

That fixes the two failures above and only those. Each tree has its own working
files, index and `HEAD`, so `git status`, `format:check` and every other
whole-repo gate now read **only your own work**, and `git push origin main` from
the primary tree ships only what that tree committed.

**What has NOT changed, and is the part that still bites:**

- **There is still one `origin/main` and one CI.** `.github/workflows/ci.yml`
  sets `cancel-in-progress: true`, so a push from either tree still cancels the
  other's running e2e job — skipping its `afterAll` and leaking rows into shared
  production Postgres. The announce-before-you-push rule survives the split
  intact.
- **One `.git`, so branches and refs are still shared.** A worktree cannot check
  out a branch another worktree holds; `main` belongs to the primary tree. A
  worktree session pushes with `git push origin HEAD:main` after
  `git fetch && git rebase origin/main`. That is still straight to `main` with no
  PR, per CLAUDE.md — the branch is a checkout mechanism, not a review step.
- **Gitignored files do not come with the worktree.** A new tree has no
  `.env.local` and no `node_modules`: copy the first, `bun install` the second
  (~107s, 709 packages). Without `.env.local` the SQL suite and
  `measure:migration-drift` fail in a way that looks like a credentials problem.
- **Port 3000 is not shared.** Two dev servers or two Playwright runs collide;
  `E2E_BASE_URL` and `--port` exist for this.

### 🔴 A domain word that is already taken is not available, and typecheck cannot tell you — 2026-08-23

`boarding` means **dogs** in this repo. `src/lib/api/boarding.ts` is the kennels
and occupancy module; `src/app/api/boarding/` holds `rooms`, `stays` and
`attendance`.

Merchant onboarding is also called "boarding" — it is the acquirer's own word
for it. So the merchant-application work was written as `boarding`, which
**overwrote `src/lib/api/boarding.ts` outright** and dropped five merchant
routes in among the kennel ones.

**The measurement is the important part: `bun run typecheck` stayed green
through all of it.** Nothing currently imports the exports that were clobbered
— `boardingQueries.guests`, `.careSheets`, `.roomTypes` and the rest are read
by screens that import the fixtures directly — so the compiler had no opinion,
`bun run lint` had no opinion, and `bun run build` succeeded. The only artefact
that noticed was stale `.next/types` holding route paths that no longer
existed, which is a nuisance ninety-nine times and a smoke alarm the hundredth.

**Do instead:** before naming a module, a route folder or an exported symbol
after a domain word, grep for the word first — `grep -rn "boarding" src/lib/api
src/app/api --include=*.ts -l`. If it comes back with anything, the word is
taken; qualify yours (`merchant-application`, `MerchantBoardingSubmitter`) and
leave the bare word to whoever had it. Restore with `git checkout HEAD --
<path>` and confirm with an empty `git diff`, not by reading the file back.

And do not treat a green typecheck as evidence that a file is unused or that a
rename is safe. In a half-converted codebase, "nothing imports it" is the
normal state of code that is very much alive.

### 🔴 Two modules can export the SAME symbol from the same directory, and nothing objects — 2026-08-23

Distinct from the entry above, which is about _choosing_ a name. This one is
about the toolchain being structurally unable to tell you the name is occupied.

After the `boarding` overwrite was reverted, a second copy survived the fix:
`boardingQueries` was exported from **two** files in `src/lib/api` for several
hours — `boarding.ts` (dogs, `.guests` / `.careSheets` / `.roomTypes`) and
`merchant-application.ts` (merchants, `.application`). Measured: `bun run
typecheck`, `bun run lint`, `bun run build` and `bun run prune` were **all
green** the whole time. There is no barrel file to collide in and no rule that
two sibling modules may not export the same name, so nothing had an opinion.

The bug this shape produces is not a crash. It is an import that resolves to
the wrong module and returns **plausible-looking data** — a query factory whose
`.detail(id)` answers with something, just not the something the caller meant.
That is the same failure class as the PostgREST embedded-filter entry above:
the wrong answer arrives looking exactly like the right one.

**Do instead:** when adding an exported symbol to `src/lib/api`, grep the
directory for the bare name first — `grep -rn "export const <name>" src/lib/api`
— and expect a hit to mean "pick another name", not "check whether it matters".
`bun run prune` will not find this: both copies are imported by somebody, so
neither is dead. Nothing in CI finds it. A grep before you type is currently
the entire defence.

### 🟡 `check:settings-fixture` guards a DIRECTORY, not a class of facts — 2026-08-23

The gate fails a screen that reads a facility-owned value from
`@/data/settings`. It matches on the **import path**.

Measured 2026-08-23 while grounding the scheduling cluster:
`services/scheduling/company` (454 lines) renders company details and business
hours, and `services/scheduling/notifications` (693 lines) renders quiet hours
and event triggers. Both are facility-owned values that already exist as
`SETTING_DOMAINS` entries in `facility_settings` (`business_hours`,
`notification_toggles`) plus real profile columns. Both read
`@/data/scheduling`. **Both pass the gate.**

So the gate's name promises more than it enforces: a screen reaches the same
facts through a differently-named fixture and is invisible to it.

**Do instead:** do not read the gate as "no screen reads a facility value from
a fixture". It says "no screen reads one from `src/data/settings`". If it is
ever widened, widen it by **value name** (`businessHours`, `quietHours`,
`taxRates`, …) rather than by import path — a path list has to be extended
every time somebody invents a fixture name, and nobody will remember to. Not
attempted here; the two screens above are a product decision (retire or
convert), not a passing cleanup.

### 🔴 The review queue can DECIDE an application but cannot complete the boarding — 2026-08-23

`read_boarding_secret(uuid, text, uuid)` is `security definer` with **no
permission check inside it**. That is the correct shape — the file says so
itself, "the grants, which are the actual boundary for the definer functions" —
and the grants are:

```
revoke all ... from public;  revoke all ... from anon;  revoke all ... from authenticated;
grant execute on function public.read_boarding_secret(uuid, text, uuid) to service_role;
```

`service_role` alone. Measured: **nothing in `src/` calls it.** So a Yipyy
platform administrator working the review queue can read the business, the
owners, the documents and the last four digits of every number — and cannot
obtain the national identity numbers or the bank account number to type into an
acquirer's form. The workflow stops one step short of done.

This is a gap, not a policy. It is stated on the review screen
(`SecretsNotice`) rather than hidden, because a reviewer who discovers it at the
moment they need the numbers concludes the screen is broken.

**Do instead:** if you build the way through, build it as its own change, not a
line added to the detail route. It needs, at minimum: `POST` (never `GET`, so it
cannot be prefetched or linked), a platform-admin check BEFORE the admin client
is constructed, one value per call, and **a record of who read what and when**.
That last one is the hard part and the reason it was not built here — this
repo's `audit_log` is written **only** by triggers via `private.record_audit`,
and an app-side append is explicitly forbidden. So the read has to leave a mark
on a row a trigger watches, which means a migration, which means it is a change
with a design rather than a convenience.

Do not reach for `service_role` in the review routes for anything else in the
meantime. Everything the queue does today goes through the caller's own session
and RLS decides — `merchant_applications_read` already admits
`private.is_platform_admin()`. That is what makes the queue's authorisation
reviewable in one place instead of two.

### 🟡 `ColumnDef` here is NOT TanStack Table's, and the name is the trap — 2026-08-23

`src/components/ui/DataTable.tsx` exports its own `ColumnDef<T>`. The column
title field is **`label`**, not `header`.

Written as `header` on 2026-08-23; `tsc` caught it (`TS2353: 'header' does not
exist in type 'ColumnDef<ReviewListItem>'`), so this one is cheap — but it is
the same shape as the two entries above and worth naming as a family:

- `boarding` — a domain word already meaning dogs
- `boardingQueries` — a symbol already exported from the same directory
- `ColumnDef` — a type name already meaning something in a well-known library

In all three the name looked available because it was familiar. Only the third
was caught by a compiler, and only because the two shapes happen to differ.

**Do instead:** read the interface in `src/components/ui/DataTable.tsx` before
writing columns — it also offers `align`, `sortable`, `sortValue`, `icon` and
`defaultVisible`, which are easy to miss if you assume the library's API. And
treat a familiar type name imported from `@/components` as a local type that
merely shares a name, until you have read it.

## Snapshot (2026-08-24, what a full suite run found)

Five entries. They began with one CI run reporting 9 failures and grew as each
answer exposed the next thing, which is itself the point of the day.

**They are all the same failure.** In every case the thing that made it work
locally was **invisible from where you were standing**:

| what broke                                       | what was holding it up, out of sight                      |
| ------------------------------------------------ | --------------------------------------------------------- |
| a spec that passed alone and failed in the suite | org-chart rows another spec created and deleted           |
| a teardown that timed out                        | a waiver list that only ever grows, across every run ever |
| a browser script that hung for 180s              | which runtime was holding the pipe                        |
| a `format:check` failure that was not one        | a peer's file, mid edit-then-format                       |
| rows leaked with nothing running locally         | a CI job cancelled on a machine that is not yours         |

That is not an argument that local checking is weak. It is that **the state
deciding the outcome sits somewhere nobody is looking** — a hoisted dependency
is not in `package.json`, another spec's rows are not in your file, a cancelled
job is not on your machine.

**And be clear which half of the fix is load-bearing.** Four of these entries
harden a teardown — record ids at creation, delete by id, assert the result,
walk only this run's rows. All good changes, and **none of them is the cause.**
Every leak actually chased on 2026-08-24 came from a run that **did not finish**:
one timed out, one threw inside a cleanup loop, two were cancelled remotely. A
teardown that is never reached cannot be improved into running.

The proof is the run that worked. `32728764039` succeeded, reached its
`afterAll`, and left `facility_positions` and `facility_departments` at **zero
rows** — the position that had looked orphaned for an hour was simply a suite
still in progress. The teardowns were never the problem; not reaching them was.

So the fixes that bear on the failure are the ones about REACHING the teardown:
do not cancel a run, do not let an unbounded loop meet its timeout, do not put
cleanup after an assertion that can throw. Harden the teardown as well — but do
not mistake the hardening for the cure.

**The corollary is the useful half: every one of these was cheap to CHECK and
none was cheap to NOTICE.** `grep package.json`, `gh run list`,
`git status --short <file>`, count the rows before you assert on them — seconds
each, and worth nothing unless something prompts you. Nothing did, five times.
So when a result surprises you, the first question is not "what is wrong with my
code" but **"what is holding this up that I cannot see from here?"**

### 🔴 `facility_positions` is EMPTY at rest, so a spec cannot assume one exists — 2026-08-24

`schedule-templates.spec.ts` opened with a helper that read the org chart and
asserted a position was there, then rostered every template against it. It
passed 10/10 alone and failed **8/8 in the full suite — every test on that one
setup line**, received 0.

The measurement, run against production while nothing else was:

```sql
select count(*) from facility_positions;   -- 0
select count(*) from facility_departments; -- 0
```

**Zero, facility-wide, at rest.** Not "the earlier specs happen to delete
theirs" — there are no permanent positions at all. The only ones alive during a
run are created and then deleted by `scheduling-attendance` (CI #31) and
`scheduling-org-chart` (#32), and `schedule-templates` is #56.

That distinction decides the fix. "Another spec deletes theirs" would have been
cured by reordering the files. "The table is empty at rest" says reordering
could never have worked, because the rows exist only inside two other specs'
lifetimes. **A green run of this spec was always a pass for a reason nobody
chose.**

**Do instead:** create the structure you need in `beforeAll` and remove it in
`afterAll` — position before department, both references are `RESTRICT`. Never
write `expect(things.length).toBeGreaterThan(0)` as _setup_; that is not a
precondition, it is a wish about another file. If a spec genuinely needs shared
seed data, it belongs in a seed migration where its lifetime is visible, not in
whatever happened to run first.

### 🔴 A teardown whose work grows without bound eventually times out — and a timed-out `afterAll` looks exactly like one that ran — 2026-08-24

`waivers.spec.ts` cleaned up by listing **every** `[e2e]`-prefixed waiver in the
facility and, for each, revoking its signatures and retiring it. Waivers are
retired, never deleted, deliberately — deleting one destroys the only readable
record of what the business used to ask people to agree to — so that list only
ever grows.

Measured on the day it broke:

```
waivers on the demo facility:      68
of those, [e2e]-prefixed:          68   (i.e. all of them)
still active when it timed out:     2
live signatures on those two:       0
```

It died at **120000 ms**, the hook timeout. The two survivors tell you _where_:
one had a signature that was **already revoked**, the other had none — so the
sweep had completed the expensive revoke work and expired on the retire step at
the end. Cost was per-waiver-ever-created, and 66 of the 68 were pure re-work on
rows their own teardown had already dealt with.

**The dangerous half is not the slowness.** Playwright reports a hook timeout
separately from test results, so the tests still read as passed and the run
still looks green while rows are left behind. **A timed-out teardown is
indistinguishable from one that ran** — which is why the leak survived several
runs before anyone noticed.

**Do instead:** record ids **at creation**, in a module-level array, inside the
helper that creates them — before any assertion in the calling test can fail —
and have `afterAll` delete only those:

```ts
const publishedWaiverIds: string[] = [];

async function publish(page: Page, body: Record<string, unknown>) {
  const res = await page.request.post(WAIVERS, { data: body });
  expect(res.ok(), await res.text()).toBe(true);
  const waiver = ((await res.json()) as { waiver: Waiver }).waiver;
  publishedWaiverIds.push(waiver.id); // recorded before anything can throw
  return waiver;
}
```

Three properties, all load-bearing:

1. **Bounded by this run**, so cost never grows with the suite's history.
2. **Recorded at creation**, so a failing assertion mid-test cannot hide the row
   from cleanup — the trailing-cleanup version does not run at all when the test
   throws, and `afterAll` does.
3. **Asserted.** `expect(res.ok() || res.status() === 404)`. A cleanup that
   cannot fail is a cleanup nobody can trust; 404 is fine because a test may have
   removed it already, anything else means the teardown did not do what it
   thinks it did.

Verified by reading Postgres back after the fixed run rather than trusting the
summary line: 17/17 passed, and afterwards 0 active `[e2e]` waivers, 0 live
signatures, 0 leftover templates, 0 draft shifts, and `facility_positions` /
`facility_departments` both back to **0**.

### 🔴 An `expect` inside a cleanup loop makes the cleanup PARTIAL — 2026-08-24

The third teardown defect in one day, and the one that completes the family.
`schedule-audit-trail.spec.ts` cleaned up like this:

```ts
for (const shiftId of createdShiftIds) {
  const removed = await page.request.delete(`${SHIFTS}?id=${shiftId}`);
  expect(removed.ok() || removed.status() === 404, ...).toBe(true);  // throws
}
```

One shift had already been deleted by a test that deletes on purpose. The
second delete affects zero rows, so `deniedIfUntouched` answers **403, not
404** — an RLS refusal and a row that is already gone are indistinguishable
from the server's side, which is a documented property of this codebase and not
a bug. The `expect` threw, **the loop stopped**, and the remaining shifts were
never deleted.

Then the damage compounded, which is the part worth remembering:

1. shifts survived, so the position they sat on could not be removed
   (`RESTRICT`), so the department could not either;
2. the next run's `ensureStructure` found that position **by name** and reused
   it — inheriting an orphan shift it had no record of;
3. that run's teardown then failed for a different reason than the first one,
   which is how a small teardown bug becomes an unreadable one.

Measured: 1 orphan shift on `[e2e] audit position`, blocking two rows, after a
single failed run.

**Do instead:** a teardown attempts everything and asserts once, at the end.

```ts
const failures: string[] = [];
async function remove(what: string, url: string) {
  const res = await page.request.delete(url);
  if (!res.ok() && res.status() !== 404) failures.push(`${what}: ${res.status()}`);
}
// ... every removal ...
expect(failures, `cleanup left rows behind:
${failures.join("
")}`).toEqual([]);
```

Two supporting rules the same file now follows:

- **Stop tracking what a test deleted on purpose** (`forgetShift(id)`), rather
  than widening the teardown to tolerate 403. Tolerating 403 would also swallow
  a genuine refusal, which is the one thing the assertion exists to catch.
- **A reuse-by-name setup needs a bounded self-heal.** Before removing a
  position it owns, the teardown clears any shift still standing on _that
  position_ inside _its own date window_. That is bounded by an object this file
  created — not the global sweep that timed out the waivers hook.

### 🔴 A push CANCELS the running CI e2e job — "do not push during a run" includes "do not push twice in an hour" — 2026-08-24

`.github/workflows/ci.yml` lines 13-15:

```yaml
concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true
```

Every push to `main` **cancels the run still in flight for the previous push**,
including its Playwright job. A cancelled Playwright run skips `afterAll`, so it
leaks every row it had created.

Measured on 2026-08-24, four pushes in forty minutes:

```
32725203491  c64c81f3  e2e (auth, access & operations)  cancelled
32726286417  419b957b  e2e (auth, access & operations)  cancelled
```

`"E2E Requests Position"` was found orphaned on the demo facility at 12:45:14
with no local suite running on either machine. It came from one of those.

**Why this was invisible.** The existing rule was written as "cancelling an e2e
run leaks rows", which reads as a warning about pressing Ctrl-C. It is not: with
`cancel-in-progress`, the cancellation is **automatic, remote, and caused by an
action that feels unrelated** — pushing a commit. Nothing on the machine doing
the pushing reports that a run somewhere else just died half-way through its
setup. Two sessions each pushing "only twice" is enough.

**It now costs more than it used to.** Since 20260824200000, a cancelled run
that created shifts also leaves rows in `public.audit_log`, and those cannot be
deleted by anyone — see the entry above. The growth rate of that table is set by
**push cadence**, not by the test suite.

**Do instead:** before `git push`, check for a run in flight and wait for it.

```
gh run list --limit 5 --json databaseId,status,headSha,displayTitle
```

If anything is `in_progress`, the push will kill it. On a shared tree this needs
saying out loud to the other session, because "I am pushing" and "I am about to
destroy your test run's cleanup" are the same action. Batching commits and
pushing once is strictly better than pushing each one as it lands.

Do **not** fix this by removing `cancel-in-progress` without thinking: it exists
so a stale run does not report on superseded code. The cost is real either way;
the point is to know which one you are paying.

### 🟡 `audit_log` now grows with every e2e run, and cannot be cleaned — 2026-08-24

20260824200000 put triggers on `staff_shifts`, `staff_time_off_requests` and
`shift_swap_requests`, so **every shift a spec creates or deletes writes an
audit row**. Measured on the first suite run afterwards: 45 `Shift created` and
45 `Shift deleted` in a four-minute window, plus published/assigned/changed.

Those rows cannot be removed. `public.audit_log` refuses UPDATE, DELETE and
TRUNCATE for every role including its owner and `service_role` (20260807460000)
— deliberately, because a trail you can tidy is not a trail. So unlike every
other e2e artefact in this project, **there is no teardown available and none
should be written.**

This is a deliberate trade, recorded so nobody reads a growing table as a leak
and tries to "fix" it:

- the screens read the newest 500, so the table growing does not degrade them;
- the alternative is a delete path on the audit trail, which is worse than the
  problem;
- SQL tests are unaffected — they run in a rolled-back transaction, verified by
  running the whole suite twice and watching the count stay at 32.

**Do instead:** if the volume ever genuinely matters, archive by date into a
separate table — do not grant DELETE on this one.

### 🔴 `chromium.launch()` hangs under bun for its full 180-second timeout; node returns in 337 ms — 2026-08-24

**Not measured by the author of this entry** — reported by the session that
wrote `scripts/shoot.ts`, measured twice each way (once via `bun run`, once via a
bare `.mjs` at the repo root). Recorded because the failure mode is expensive to
rediscover, and flagged as second-hand per this file's own rule.

A Playwright `chromium.launch()` called from a **bun** process starts the
browser but never completes the `--remote-debugging-pipe` handshake, and fails
at the 180 s launch timeout. The identical call under **node** returns in 337 ms.
It is a pipe-transport problem, not a Playwright or browser problem.

**Why it hides:** `bun run test:e2e` is completely unaffected, because it shells
out to the Playwright CLI, which spawns its own **node** workers. So the suite
works. The natural conclusion when your own script hangs is therefore that your
script is wrong — and the project standard is `bun` for everything, which points
you further away from the actual cause.

**Do instead:** let bun parse argv and let **node** drive the browser — go
through the Playwright CLI rather than calling `chromium.launch()` from bun.
`scripts/shoot.ts` is the worked example. If a browser script hangs for
suspiciously close to 180 seconds, check which runtime is holding the pipe
before debugging anything else.

## Snapshot (2026-08-24, Clover two-way sync)

### 🔴 The Developer Pay API is a dead end — do not reach for it to get order linkage — 2026-08-24

It is the obvious answer to "the terminal API will not accept an order id", it
_requires_ an orderId, and it is wrong on four counts. Read before anybody
proposes it again:

- **Deprecated.** "The Developer Pay API is superseded by the Ecommerce API.
  Developer Pay apps will no longer be available on the App Market starting
  October 27, 2021."
- **No tips, no refunds, no voids.** All three are documented as unsupported.
  Yipyy needs all three.
- **It takes raw card data** — `first6`, `last4`, expiry, CVV in the request
  body. That drags PCI scope onto Yipyy's own servers, which the PAKMS-tokenised
  `clv_` flow exists specifically to avoid.
- US and Canada only.

**Do instead:** online, Clover supports a genuine link —
`POST /v3/merchants/{mId}/atomic_order/orders` then
`POST /v1/orders/{orderId}/pay`, the same Ecommerce host and the same `clv_`
token. On the terminal there is no link to be had: the REST Pay Display API is
documented as payment-only and "does not support passing an order ID or item ID
directly". That is Clover's limit and no amount of work changes it.

### 🟠 The sandbox merchant cannot be exercised from a local run, and the reason is not obvious — 2026-08-24

Measured 2026-08-24 while trying to prove `atomic_order` works: every call
returned **401**, including a plain `GET /v3/merchants/{mId}`. The token was not
wrong, it was **expired** — `access_token_expires_at` was 2026-08-22 and the
access token lives thirty minutes.

`public.payment_access_token` returns what is STORED. The refresh lives in
`validAccessToken` (src/lib/clover/connection.ts), in app code. So any script
that reads the token straight out of the database gets a stale one roughly
always, and the 401 it produces looks exactly like a revoked grant.

**And you cannot simply refresh it yourself.** Clover rotates refresh tokens: a
successful refresh invalidates the one that bought it. A throwaway script that
refreshes without writing the new pair back would break the facility's stored
credentials and take their card payments down. Two sessions refreshing at once
already caused an outage here once — see the Clover notes.

The app path is closed too: the connection belongs to `pawradise`, whose only
members are PRODUCTION identities, and a local run holds staging keys. So
nothing local can hold a live Clover token for that merchant.

**Do instead:** to exercise anything against the sandbox, do it through the
deployed app as somebody who can sign in there, or accept that the change is
unverified and say so. Do not hand-refresh. Do not read the conclusion "401,
therefore revoked" off a script — check `access_token_expires_at` first.

### 🟡 `payment_intents.device_id` existed for weeks and nothing ever passed it — 2026-08-24

`open_payment_intent` has taken `p_device_id` since intents were added.
`chargeOnTerminal` never sent it, so the column was NULL on every row and every
Clover ledger row recorded the money and not the till. Fixed 2026-08-24, along
with `payments.processor_device_serial`.

Worth noting as a shape rather than a bug: a nullable column with a parameter
and no caller is indistinguishable, in the schema, from one that is legitimately
empty. Nothing fails. `bun run prune` does not look at SQL. The only way it
surfaces is somebody asking "which terminal took this" and finding they cannot
answer.

### 🔴 A local typecheck cannot prove an import resolves in CI — only the lockfile can — 2026-08-24

`playwright.shots.config.ts` imported `dotenv`. `bun run typecheck` passed
locally. CI failed:

```
playwright.shots.config.ts(2,35): error TS2307:
  Cannot find module 'dotenv' or its corresponding type declarations.
```

`dotenv` is **not a dependency of this project**. It resolves on a developer
machine because something else hoists it into `node_modules`; CI runs
`bun install --frozen-lockfile`, which installs exactly the lockfile and
nothing else. So the two environments disagree, and the one that is right is the
one that fails.

**The trap was a comment that read as permission.** `playwright.config.ts` had
already met this and solved it with four hand-rolled lines, ending:

> Deliberately minimal: KEY=value, no quoting or interpolation. If this ever
> needs to grow, use a real dotenv rather than extending it.

Read as an instruction, that says "reach for dotenv". What it means is "add
dotenv as a dependency first" — and the gap between those two readings is one
required check failing on `main`, with `build` skipped behind it because it
`needs: typecheck`, so no deployment either.

**Do instead:** before importing a package a file does not already import, grep
`package.json` for it. `grep -n '"the-package"' package.json` is the whole
check. A green local typecheck is not evidence: it is a statement about your
`node_modules`, which nobody chose and no lockfile guarantees.

Same family as two other entries added the same day — **something that resolves
locally because of state nobody chose.** A hoisted transitive dependency, one
spec relying on another spec's org-chart rows, a teardown sweeping a list that
only ever grows. In every case the local run passes for a reason that is not in
any file.

## Snapshot (2026-08-25, the migrations directory)

### 🔴 `supabase/migrations/` cannot reproduce this database — it has never been the thing that built it — 2026-08-25

Found while resolving a version collision between two sessions. The collision
was real and got fixed; underneath it was something much larger that nobody had
looked at, because nothing has ever needed to.

Measured against production, joining the directory to
`supabase_migrations.schema_migrations` **on migration name**:

```
files                    176
recorded rows            203
exact match (name+version) 8
name matches, version does not 156
file never recorded under its name 12
recorded row with no file at all   39
```

Eight files out of 176 are stamped in the database under the version their
filename claims. **Everything else was applied under a different number.**

Examples, all three from different weeks and different authors:

```
file 20260818100000_a_membership_is_admin_or_staff       db 20260818122625
file 20260824200000_a_roster_change_outlives_the_process db 20260824122318
file 20260824190000_a_queue_row_can_actually_be_resolved db (no row at all)
```

**The mechanism.** Almost every migration in this project was applied through
the Supabase MCP `apply_migration` tool, which stamps `schema_migrations` with
**the moment it ran** unless a version is passed explicitly, and essentially
nobody has passed one. The filename is chosen separately, by hand, usually as a
round number. So the two have drifted apart from the beginning. The eight that
agree are the ones somebody hand-numbered and applied under that exact version
— three gift-card migrations and two Clover ones, all from the last three days.

**Why it matters, and it is not the repeat-apply problem it looks like.**
`supabase db push` applies files in **filename** order. This schema was built in
**timestamp** order. Those are different orders over the same set:

```
files recorded under some version   164
same rank in both orderings         104
DIFFERENT rank                       60
```

Sixty files would be applied at a different point in the sequence than they
originally ran. A migration that alters a table created three files later fails;
one that recreates a function some later file already replaced silently reverts
it. So the directory is **not currently a mechanism that can rebuild this
database** — not for disaster recovery, not for a fresh staging environment, and
not for the VPS move under discussion. It appears healthy only because nothing
ever runs it end to end.

**Do instead:**

- **Do not "fix" this by renaming files to match the database.** Renaming one
  makes it agree with 8 and disagree with 156; renaming all 176 rewrites the
  history of a directory whose ordering is already wrong, and does not make the
  order correct. Both were considered and rejected on 2026-08-25.
- **After applying through MCP, rename your file to the version the database
  recorded.** Corrected 2026-08-25, same day: the first version of this entry
  said "pass the version explicitly", and **`apply_migration` has no version
  parameter** — it stamps the moment it ran and there is no argument that
  changes that. So the sequence is apply, then
  `select version from supabase_migrations.schema_migrations order by version
desc limit 1`, then `mv` the file to match. Round hand-chosen numbers are the
  thing to give up; `supabase migration new` stamps clock timestamps for exactly
  this reason. Done for 20260825095825, which took the exact-match count from 8
  to 9. That is the only cheap half of this, and it stops the gap widening.
- **Before anyone depends on `db push`** — a new environment, a restore drill,
  the VPS — the directory needs a **squash to a baseline**: dump the current
  schema, make it migration 0001, and keep the 176 as history. That is its own
  piece of work with its own risk, and it should be scheduled deliberately, not
  discovered during an outage.
- **Never claim a migration "is in the repo" as evidence it can be replayed.**
  In this project those are separate facts, and have been for four months.

`bun run check:migration-versions` (added the same day) catches the narrower
failure — two files claiming one version, which breaks `db push` outright. It is
baselined against the two pre-existing pairs (`20260806160000`,
`20260822700000`) and warns rather than fails on them. It deliberately does
**not** check this, because a gate that fails on 168 of 176 files on the day it
is written gets deleted rather than fixed.

Every number above is re-runnable: `bun run measure:migration-drift` (add
`--list` for the files whose version moved). It needs `SUPABASE_DB_URL`, it is
not a gate, and it never fails. Re-derive rather than trusting these counts —
they move with every migration written until the baseline squash happens.

## Snapshot (2026-08-25, HQ locations)

### 🔴 Two individually correct invariants can admit NO legal order — 2026-08-25

`20260825095825` gave `public.locations` two guarantees, both obviously right:

- a **partial unique index** — `on locations (facility_id) where is_primary` —
  so two primaries cannot coexist, even under concurrent writes;
- a **trigger** refusing to clear the last primary, because
  `getFacilityContext` resolves a facility's primary on every request and
  cannot resolve nothing.

The trigger also demotes the incumbent when a new primary is named, so the two
were meant to cooperate. They did not. Promoting a second branch was
**impossible**:

```
ERROR: 23001: A facility must have a primary location.
CONTEXT: SQL statement "update public.locations set is_primary = false ..."
         PL/pgSQL function private.locations_single_primary() line 4
```

The demote UPDATE re-enters the same trigger. At that instant the promoted row
has not been written — it is still inside its own BEFORE trigger — so "is there
another primary?" is _correctly_ false, and the guard refuses the demotion the
promotion depends on.

**Neither piece is wrong. The SET is unsatisfiable.** And there was no
rearrangement that fixed it: an AFTER trigger cannot demote first, because a
partial unique index is checked as the row is written, and Postgres has no
deferrable partial unique **constraint** to defer it with. Fixed in
`20260825101500` with a transaction-local
`set_config('yipyy.locations_demoting', '1', true)` that tells the recursive
fire "this demotion is my own bookkeeping, not a person clearing the last one".

**A sibling shipped the same morning, from the other session:** an
`unattached_payments` queue with RLS on, one SELECT policy and two
`security invoker` functions — every piece defensible, and together no order in
which a queue row could ever be resolved. Two in one day makes it a family:
**invariants compose into deadlocks that no single definition contains.** A
trigger that re-enters itself; an index checked mid-write; a policy that
excludes the row its own predicate was meant to judge.

**And the worst member of the family is the one that does NOT deadlock.**
Amended 2026-08-25 after the `accounting_structure` conversion later the same
day. Moving `multiLocationMode` out of `localStorage` into `facility_settings`
while leaving `location-scopes.multiLocationMode()` still reading the old store
would have left **two sources of truth for one answer** — and both paths would
have kept working, returning different values. The stale copy was the one on the
sync path, deciding **which company a sale posts to**.

Rank the family by how loudly it fails:

| Shape                               | How it presents             | When you find out                                                  |
| ----------------------------------- | --------------------------- | ------------------------------------------------------------------ |
| Unsatisfiable invariants            | Nothing works               | First use                                                          |
| Refused write that returns success  | Screen lies, data safe      | When somebody re-reads                                             |
| **Half-migration: two live copies** | **Both work, and disagree** | **The day they diverge — as an accounting discrepancy, not a bug** |

**Knip caught the orphaned component. Nothing in this repo catches the
duplicate.** `bun run prune` finds a copy NOBODY reads; there is no gate
anywhere that finds a copy somebody DOES read, from the wrong place. That gap is
why this has to be a habit rather than a check: **when you move a value, grep
for every reader of the old home in the same change** and either repoint it or
make it take the value as an argument. `syncScopeForTransaction` takes it as an
argument now, and the field was deleted from the old type so a second copy
cannot be read back into existence by accident.

_A half-migration is how you get two answers to one question._

**Do instead:** a new invariant is not verified by the migration applying. It
raises on USE, not on DDL, and `apply_migration` returned `{"success": true}`
for this one. Before calling it done, drive the FIRST THING THE SCREEN WILL DO
against it — here, "add a branch and make it the main one" — in a transaction
you abort:

```sql
do $$ declare r text := ''; begin
  -- ... exercise it, appending outcomes to r ...
  raise exception 'PROBE(rolled back): %', r;
end $$;
```

Raising with the results in the message is what makes this work through MCP:
one call is one transaction, so the exception both reports and rolls back.
`supabase/tests/locations-branch-invariants.sql` T3 is now the regression test,
and it caught a second instance of the same thinking in its own first draft —
the test demoted the incumbent before promoting the challenger, which is the one
order the guard forbids.

### 🔴 `ON DELETE SET NULL` is a SILENT success, and it eats history — 2026-08-25

`bookings_location_id_fkey`, `facility_memberships_home_location_id_fkey` and
`facility_terminals_location_id_fkey` are all `ON DELETE SET NULL`. So deleting
a branch used to succeed. Measured on production before the guard existed:

```
Main Location   is_primary=true   423 bookings
```

Removing that row from the HQ screen would have returned 204, shown a tidy
toast, and permanently erased the answer to "which branch did this happen at"
for 423 real bookings. Nothing errors. Nothing logs. The damage is visible only
to somebody who asks the question months later and gets null.

This is the third member of a family already in this file: the facility-delete
entry (`audit_log.facility_id` SET NULL vs the append-only trigger) and the
`SELECT ... FOR UPDATE` returning zero rows under a failing UPDATE policy. **The
common shape is a destructive outcome that presents as success.**

**Do instead:** when a table is referenced by `ON DELETE SET NULL`, "can this be
deleted" is a PRODUCT question, not a schema one. A branch that has traded
closes; it does not cease to have existed. `private.guard_location_delete()`
refuses it and its message names the thing to do instead — `status = 'inactive'`
— and the route forwards that message rather than flattening it to "delete
failed". The screen also disables the button when `bookingCount > 0`, but that
is the explanation, not the guard: the database refuses either way.

Check the delete rule before you build a delete button:

```sql
select tc.constraint_name, tc.table_name, rc.delete_rule
  from information_schema.table_constraints tc
  join information_schema.referential_constraints rc using (constraint_name)
  join information_schema.constraint_column_usage ccu using (constraint_name)
 where ccu.table_name = '<the table>' and tc.constraint_type = 'FOREIGN KEY';
```

### 🟡 `/facility/hq` is gated by a role held in `localStorage` — 2026-08-25

`LocationAccessGuard requireHq` reads `useLocationScope().canViewHq`, which
reads `useCurrentUser().user.role === "owner"`. That role comes from:

```ts
const STORAGE_KEY = "scheduling-current-user-role";
const DEFAULT_USER = { id: "emp-1", name: "Sarah Johnson", role: "owner", ... };
// and, outside the provider:
return { user: DEFAULT_USER, setRole: () => {}, can: () => true };
```

A hardcoded default of `owner`, overridable from the browser console, and a
fallback that grants every permission when the provider is absent. So the HQ
guard is **decorative**.

**It is amber rather than red because the real boundary is upstream and does
hold.** `src/app/facility/layout.tsx` calls
`guardPortal({ allow: canAccessFacilityPortal })`, which requires
`access_level = 'admin'` from the signed JWT (ADR 0005, migration
`20260818122625`). Everybody who reaches `/facility/hq` at all is already a
facility admin, and `/api/locations` is scoped by RLS regardless of what any
hook believes. What the localStorage role decides is only the _owner vs general
manager_ distinction inside the admin portal — a distinction the database does
not currently make at all.

**Do instead:** do not add a NEW capability behind `canViewHq` or
`canManageHq`, and do not read `useCurrentUser().role` for anything that must be
true. It is the client HQ half of the two-role-systems problem already recorded
in this file. When the owner/manager split needs to be real, it belongs on
`facility_memberships` beside `access_level`, with RLS reading it — not in a
hook.

### 🔴 QuickBooks is 27 modules with ZERO backend — do not "convert" a screen on top of it — 2026-08-25

Scoped as a small screen conversion. It is not, and the measurement is the
whole entry:

```
src/lib/quickbooks/                27 modules
localStorage stores in them         8   (connection, settings, mappings,
                                         setup, sync-queue, synced-documents,
                                         data-cache, catalog-watch)
API routes mentioning quickbooks    0
Postgres tables                     0
```

One of the modules is literally `oauth-mock.ts`. **No QuickBooks company can be
connected by anybody, today.** The design is real and careful — money rules,
document rules, Class tracking gated on the QuickBooks plan tier, a tested
`bun run check:quickbooks` — but nothing behind it exists. Converting one screen
onto a real backend would mean building the entire accounting integration:
Intuit OAuth, server-side token storage in Vault, connection/mapping/sync-log
tables, and the Accounting API. That needs Intuit app credentials.

**What was actually wrong, and got fixed instead:**

- `/facility/hq/integrations/page.tsx` opened with `const FACILITY_ID = "11"`
  and rendered `getLocationsByFacility(11)` — the fixture's three Montreal
  branches. Since `public.locations` became real the same day, this screen was
  telling every business its branches were Plateau / Laval / Mile End while the
  Locations screen one click away showed their actual ones.
- The one-company-or-one-per-branch choice lived in
  `localStorage["yipyy-quickbooks-settings"]`. It is a fact about how the
  company is **incorporated** — the bookkeeper and the owner could hold
  different answers, on two laptops. It is the `accounting_structure` facility
  settings domain now (no migration; `facility_settings` is keyed
  `(facility_id, domain)` with no CHECK on `domain`).
- `QuickBooksLocationCards` — 304 lines offering a per-branch "Connect
  QuickBooks" button that wrote a mock token to localStorage and reported
  success — is **deleted**, with the five `location-scopes` helpers that fed it.
  A connect flow that cannot connect is worse on an accounting screen than
  anywhere else: the person clicking it will believe their books are being kept.
  The screen states plainly that QuickBooks cannot be connected yet.

**The trap that nearly got introduced:** moving the mode into
`facility_settings` while leaving `multiLocationMode()` in `location-scopes.ts`
reading localStorage would have made **two sources of truth for one answer**,
and the copy on the sync path — the one that decides which company a sale posts
to — would have been the wrong one. `syncScopeForTransaction` takes the mode as
an argument now, and the field is gone from the QuickBooks settings type, so a
second copy cannot be read back into existence by accident.

**Do instead:** before scoping a screen conversion, measure the substrate, not
the screen. Two commands settle it:

```
grep -rl "<feature>" src/app/api/ | wc -l
select table_name from information_schema.tables where table_name ilike '%<feature>%';
```

Zero and zero means the feature is designed, not half-built, and "convert the
screen" is the wrong unit of work. What is still worth doing in that case is
narrow and real: stop the screen lying about the facility it is showing, move
any genuine BUSINESS fact it holds into `facility_settings`, delete the controls
that cannot work, and say so on the page.

### 🔴 Five HQ screens have no substrate to convert onto — measured before assuming — 2026-08-25

Same trap as the QuickBooks entry above, found by running its own advice
("measure the substrate, not the screen") against everything else still on
`src/data/hq-analytics.ts` after `useLocationContext` went real. The
measurement is the migration's own words:

```
supabase/migrations/20260825095825_a_location_is_a_branch_and_a_branch_has_an_address.sql:8-12
  "Three rows exist — one primary location per facility, and no facility
   has ever had a second."
supabase/seed/dev-accounts.sql:33,48-50   -- exactly ONE `locations` row inserted
```

Every facility in this app, seeded or real, has exactly one location row. Every
`*byLocation` field, every cross-location comparison, on every HQ screen, has
had nothing to differ against since the day the table was created. That is a
**data** gap, not primarily a schema one — `bookings.location_id` and
`facility_memberships.home_location_id` are both real, FK'd, and populated —
but three other gaps ARE schema-shaped and block real per-location analytics
even once a facility has a second branch:

```
public.clients    -- no location column at all (20260801120000)
public.staff      -- no location column at all (20260801150000)
public.payments   -- no location column of its own
```

(`payments.booking_id` was believed uncertain here — its own migration comment
calls it "an identifier, NOT a reference" — but `20260807160000` made it a
real, enforced FK (`on delete restrict`) after that comment was written. The
comment is stale; the join to `bookings.location_id` is sound. Confirmed
below, where it is what makes the sixth report real.)

Five screens sit on top of this, each needing something that plainly does not
exist yet, not a rewire:

- **`/facility/hq/overview` + Command Center** — `src/data/hq-analytics.ts`
  (912 lines, hand-typed) backs `HQOverviewClient`, `CommandCenterKpis`,
  `NetworkStatusBar`, `HQAnalyticsPanel`. NPS, `avgClientRating`, `revPAK`,
  `staffUtilization` have no table anywhere — not "not joined yet," invented.
- **`/facility/hq/reports`** (client-activity, staff-performance,
  transfer-impact) and **`/facility/hq/clients`** — same fixture, plus
  `loyaltyTier` bronze/silver/gold/platinum on `crossLocationClients`, which a
  real loyalty-points ledger exists for (`20260821260000`) but no "tier"
  concept does.
- **`/facility/hq/services`** — `src/data/service-catalog.ts`'s per-location
  price overrides have no destination: `grooming_services`/`room_categories`
  are `facility_id`-scoped only, no `location_id` column, anywhere.
- **`/facility/hq/staff`** — reads `sharedStaffPool` (fixture), not
  `public.staff`, which has no location column to read from if it did.
- **`/facility/hq/transfers`** + `TransferCenterClient` (1022 lines) — still
  reads `getAllTransfers()` from `src/data/location-transfers.ts`, a
  **module-level array** that resets on every reload/deploy, built around a
  request/approval workflow (pricing policy, customer approval, availability
  check) nothing in Postgres backs. Left untouched. **But the ACTION this
  screen's `BookingTransferModal` used to imitate is now real** — see below.

**What was done instead (2026-08-25, two passes):**

First pass — the two pieces that WERE real columns with no writer —
`facility_memberships.home_location_id` (which branch a staff member works
from) and `facility_terminals.location_id` (which branch a card reader sits
in) — now have one each: `PATCH /api/staff/[id]/home-location` and the
extended `PATCH /api/payments/clover/terminals`. Both were `Bucket B` (column
exists, nothing writes it) rather than `Bucket C` (no concept exists) — that
distinction is what made them worth doing without a schema change.

Second pass, same test applied twice more and both times it paid off:
`bookings.location_id` was writable only at creation (never on an existing
booking) and unaudited — also `Bucket B`. `bookingToRow`'s input-driven branch
now accepts it on a PATCH (facility-checked, same as the two above), and a new
trigger mirroring `audit_subscription_status` records "Booking transferred" —
no new table, the existing audit trail was enough. `MoveBookingLocationDialog`
replaced `BookingTransferModal` for the one real thing it needs to do; the
request/approval workflow stays a separate, unbuilt feature, not faked here.
And `payments.booking_id` turning out to be a real FK (the stale-comment
correction above) meant "Revenue by Location" — a sixth report, mirroring
`revenue-by-service`'s existing join — needed no new schema either.

**Do instead:** before scoping anything ELSE here as "convert the screen," get
a second real location into a facility (`POST /api/locations` already exists)
and check the actual bucket: does a real column already exist with nothing
writing it (`Bucket B` — cheap, do it), or does the fact you want to show have
no column to read `location_id` off at all (`Bucket C` — `clients`/`staff` for
their OWN fields still qualify, service pricing overrides still qualify) — that
one is a product decision (does pricing vary by branch? what does a review/NPS
system look like?) that needs an owner, not an engineering pass.

## How to add to this map

Append under a new dated heading. For each item: a one-line description, a severity, **why it's risky**, and **what to do instead** of casually touching it. Don't delete items — strike them through with the date and PR when genuinely resolved.

And where the entry rests on a claim about how the system behaves, **include the measurement that established it** — the row counts, the status codes, the query you ran. Two entries in this file were acted on for the first time on 2026-08-22 and both turned out to be wrong: the facility-delete advice would have erased which facility each audit entry concerned, and the anon-exposure sweep (`proacl::text like '%anon=X%'`) finds none of the eleven functions that were actually exposed, because their ACLs name an empty grantee — PUBLIC — and `anon` is a member of PUBLIC. Neither was careless; both were sound-looking inferences that had never been executed.

That is the failure mode to design against. A recommendation can only be believed, and ages into folklore; a measurement can be re-run and disagreed with, and ages into a test. If you cannot produce one, say so in the entry — "not verified" is a fact about the advice, and the next person is entitled to it.
