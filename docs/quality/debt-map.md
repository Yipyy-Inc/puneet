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

The write-integrity **triggers** legitimately open with `if (select auth.uid()) is null then return new; end if;` — a trigger only fires on a write that already cleared RLS, so a missing JWT subject really does mean service_role, and the early return is how a seed inserts a catalogue without tripping its own rules. That reasoning **does not transfer to a function**. An RPC is a front door: `anon` reaches `/rest/v1/rpc/<name>` directly with no subject at all, so the carve-out written to admit the seed script admits the internet.

What it cost, both proven against the live project before the fix:

- `link_staff_invite('<staff legacy id>', '<my own user id>', '<my email>')` — a signed-up customer holding zero memberships became **`role=owner, is_active=true`** at that facility, because the function grants the role recorded on the _target_ staff row. `legacy_id`s are readable slugs, so the argument is guessable.
- `offboard_staff('<staff legacy id>', 'Termination')` — anyone could terminate any employee at any facility and revoke their access.

### 🔴 `revoke ... from public` is NOT `revoke ... from anon`

Both migrations already carried `revoke all on function … from public`, which is why the hole survived review — the line _looks_ like it shuts the door. Supabase ships `alter default privileges in schema public grant execute on functions to anon, authenticated, service_role`, so **every function in `public` is born with an explicit `anon=X` entry in its ACL**. Revoking from the `public` _pseudo-role_ is a different grant and leaves `anon=X` standing.

**Why it matters:** this is invisible in the migration diff. The only way to see it is `has_function_privilege('anon', p.oid, 'execute')` or `proacl`, and neither is something a reviewer reads by default. It was found by `get_advisors`, not by reading the SQL.

**Do instead**, for every new SECURITY DEFINER function in `public`:

1. Treat a null `auth.uid()` as a **refusal**, not a bypass — and check it _before_ any lookup, so a "no such record" error can't be used as an existence oracle by an unauthenticated caller.
2. `revoke execute … from anon` **by name**. The `from public` line is not a substitute.
3. Add it to the `V7` sweep in `supabase/tests/rpc-session-required.sql`, which fails on any anon-callable function in `public` outside the four token RPCs.

The four onboarding token RPCs (`onboarding_by_token`, `save_onboarding_section`, `submit_onboarding`, `set_onboarding_account_complete`) **keep** their `anon` grant deliberately — a new hire has no account by definition, the token is the credential, and it is verified by hash _inside_ the function rather than as a policy predicate (`20260803180000`). Locking those down would break every invite; `V4` exists to catch a fix that overreaches in that direction.

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

### 🟡 `RoomCategory.facilityId` is a number the rows do not carry

`RoomCategory` and `FacilityRoom` both declare `facilityId: number` — the app's legacy ref — while the tables key on the facility uuid. The mapper fills it from `DEMO_FACILITY_LEGACY_ID` rather than reshaping the app's types.

That is fine while there is one facility and RLS scopes every read to it, and it is a lie the moment there are two.

**Do instead:** when multi-facility reads land, either carry the ref on the row or drop the field from the app type. Don't compute it from a constant twice.

### 🟢 The counting vocabularies are down from four to two

`boardingCapacity` (total 30, standard/premium/luxury) and `BoardingGuest.packageType` ("Premium Suite") are still in `src/data/boarding.ts`, no longer read by the boarding page — its occupancy card counts active `facility_rooms` and groups by category name. `getOccupancyStats()` remains exported and is now unused by that page.

**Do instead:** delete them with the rest of the boarding fixture when guests move to Postgres; they are harmless while nothing reads them, and misleading if something starts.

## How to add to this map

Append under a new dated heading. For each item: a one-line description, a severity, **why it's risky**, and **what to do instead** of casually touching it. Don't delete items — strike them through with the date and PR when genuinely resolved.
