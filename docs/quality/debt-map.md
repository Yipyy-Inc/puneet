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

> Written as `auth.uid()` until 2026-08-05. Clerk now owns identity (ADR 0003), so the subject is a text id and `auth.uid()`'s cast to `uuid` raises `22P02` rather than returning null — a guard written the old way errors instead of taking the bypass. The **principle** is unchanged; only the expression moved.

What it cost, both proven against the live project before the fix:

- `link_staff_invite('<staff legacy id>', '<my own user id>', '<my email>')` — a signed-up customer holding zero memberships became **`role=owner, is_active=true`** at that facility, because the function grants the role recorded on the _target_ staff row. `legacy_id`s are readable slugs, so the argument is guessable.
- `offboard_staff('<staff legacy id>', 'Termination')` — anyone could terminate any employee at any facility and revoke their access.

### 🔴 `revoke ... from public` is NOT `revoke ... from anon`

Both migrations already carried `revoke all on function … from public`, which is why the hole survived review — the line _looks_ like it shuts the door. Supabase ships `alter default privileges in schema public grant execute on functions to anon, authenticated, service_role`, so **every function in `public` is born with an explicit `anon=X` entry in its ACL**. Revoking from the `public` _pseudo-role_ is a different grant and leaves `anon=X` standing.

**Why it matters:** this is invisible in the migration diff. The only way to see it is `has_function_privilege('anon', p.oid, 'execute')` or `proacl`, and neither is something a reviewer reads by default. It was found by `get_advisors`, not by reading the SQL.

**Do instead**, for every new SECURITY DEFINER function in `public`:

1. Treat a null subject — `(select auth.jwt()->>'sub')` — as a **refusal**, not a bypass, and check it _before_ any lookup, so a "no such record" error can't be used as an existence oracle by an unauthenticated caller. **Not `auth.uid()`:** since Clerk owns identity (ADR 0003) that function casts the subject to `uuid` and a Clerk id like `user_3HVlmtt…` makes the cast _raise_ `22P02`, so a guard written with it fails instead of refusing.
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

**Do instead:** nothing manual — `profiles_email_lower_key` (migration `20260806160000`) now makes it impossible. Two things to know before touching that area:

- **The index alone would be a trap.** The webhook upserts on `id`, so a new Clerk id carrying a known address is an INSERT, which raises `23505`. Left unhandled that 500s, Svix retries on a fixed schedule forever, and the person owns a Clerk account with no profile — refused by every gate with nothing explaining why. `src/app/api/webhooks/clerk/route.ts` handles `23505` and the pre-flight case explicitly, returning **200** because a retry can never resolve a claimed address. Do not "fix" those 200s into 500s.
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

## How to add to this map

Append under a new dated heading. For each item: a one-line description, a severity, **why it's risky**, and **what to do instead** of casually touching it. Don't delete items — strike them through with the date and PR when genuinely resolved.
