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

- **Loyalty:** editable `useLoyaltyProgram` provider vs. read-only `useLoyaltyConfig`; two loyalty models.
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

**Do instead:** every `create function` that is not meant for the public gets `revoke execute ... from anon` **by name**, and the ACL is read back with `select proacl from pg_proc` before the migration is called done. Sweeping for the shape is cheap: `where p.proacl::text like '%anon=X%'`. The only legitimate hits today are the four staff-onboarding token functions (anonymous execution IS the design there) and two trigger functions, which raise if called directly. Fixed in 20260806400000; asserted by P10 in `supabase/tests/prepaid-packages.sql`.

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

### 🟡 Card-present is built; nobody has pressed the button

`src/lib/clover/terminal.ts` charges a device and the Terminal tender in the
checkout dialog drives it. Proven with a real card through the library (1¢, VISA
contactless, Flex 4) and the route proven against real hardware. **The React
wiring between them has only ever been typechecked** — clicking it through ends
with a human tapping a card and cannot be automated.

**Refunding a terminal payment is untested.** The refund path calls the
ecommerce `/v1/refunds`, and whether that reverses a card-PRESENT payment is an
open question — Clover may require the same device. Do not describe terminal
refunds as working until somebody has done one.

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

**Why it is not done here:** it changes the live money path, on the one leg of
the Clover integration that has never been exercised in production — the
terminal tender has never been clicked (see the Clover notes). It needs the
sandbox device in hand to verify, and shipping an unverified change to how money
is taken is worse than a receipt that under-reports.

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

### 🟡 A facility cannot be deleted at all

Found while testing the cascade carve-out in
`private.protect_last_facility_admin`. `audit_log.facility_id` is
`ON DELETE SET NULL`, and that SET NULL is an UPDATE — which the append-only
trigger on `audit_log` refuses:

```
delete from public.facilities where id = ...
  => audit_log is append-only: UPDATE is not permitted on an audit entry
```

Pre-dates the access-level work and is unrelated to it, but it means
`facilities_delete` (superadmin-only, ADR-backed) cannot succeed, and the
"the whole facility is going away" branch of the last-admin guard is currently
unreachable.

**Do instead:** don't assume facility deletion works. Fixing it is a choice
between `ON DELETE CASCADE` on the audit rows (destroys the record of what
happened) and letting the trigger allow the facility_id null-out specifically —
the second is almost certainly right, but it is a change to an immutability
guarantee and deserves its own ADR.

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

## How to add to this map

Append under a new dated heading. For each item: a one-line description, a severity, **why it's risky**, and **what to do instead** of casually touching it. Don't delete items — strike them through with the date and PR when genuinely resolved.
