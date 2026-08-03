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

## How to add to this map

Append under a new dated heading. For each item: a one-line description, a severity, **why it's risky**, and **what to do instead** of casually touching it. Don't delete items — strike them through with the date and PR when genuinely resolved.
