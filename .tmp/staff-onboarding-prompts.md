# Staff onboarding — copy-paste prompts

## Read this first

**The flow your client described is already built.** All of it. A manager opens the
staff dialog, fills in name/email/phone, picks a role — and `createAndSend()` in
`src/app/facility/dashboard/staff/_components/staff-form-dialog.tsx` already does
exactly what he asked for:

```ts
const instance = createOnboardingInstance(draft.id, effectiveTemplateId);
// where effectiveTemplateId = resolveTemplateForRole(draft.primaryRole)?.id
```

The template configured in Settings resolves by role, materialises a tokenised
instance, and the new hire completes it at `/onboard/[token]` — signing
agreements, uploading documents, setting a password, submitting for review. The
manager reviews it in `onboarding-submission-view.tsx` and activates in
`review-activate-dialog.tsx`. Offboarding has the same shape.

**None of it survives a page refresh.** Every template, every instance, every
token, every uploaded document lives in `hrStore` — a module-level object in
`src/data/staff-onboarding.ts` (60 KB, ~1700 lines). It exists in one browser
tab. A manager who creates a hire on their laptop produces a token that only
their laptop knows about, and the "welcome email" is
`notifyStaffLifecycle("staff_invited", …)` recording a mock email into the same
object, plus a toast showing the link.

So there is nothing to design here and no UI to build. The work is making the
prototype real, in the order below. That is also the honest thing to tell the
client: _"that already works — what it needs is a backend."_

**One decision is yours before P3.** Flagged where it lands.

---

## What already exists (don't rebuild any of it)

| Piece                                            | Where                                                                                                                                  | State                               |
| ------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------- |
| Onboarding template CRUD                         | `src/components/facility/staff-hr/OnboardingTemplatesSettings.tsx`, `OnboardingTemplateEditor.tsx`                                     | mock store                          |
| Offboarding templates                            | `OffboardingTemplatesSettings.tsx`, `OffboardingTemplateEditor.tsx`                                                                    | mock store                          |
| HR config, termination reasons, employment types | `StaffHrConfigSettings.tsx`, `TerminationReasonsSettings.tsx`, `EmploymentTypesSettings.tsx`                                           | mock store                          |
| Role → template resolution                       | `resolveTemplateForRole()` in `src/data/staff-onboarding.ts`                                                                           | mock store                          |
| Manager creates hire + sends invite              | `staff-form-dialog.tsx::createAndSend()`                                                                                               | staff row → Postgres; invite → mock |
| Self-serve employee flow                         | `src/app/onboard/[token]/page.tsx`, `section-forms.tsx`                                                                                | mock store                          |
| Manager review / change requests / activate      | `_components/onboarding-submission-view.tsx`, `review-activate-dialog.tsx`, `onboarding-progress-list.tsx`, `resend-invite-dialog.tsx` | mock store                          |
| Real transactional email                         | `src/app/api/admin/invite/route.ts` + Resend + `src/lib/invitation-token.ts`                                                           | **real** — but platform admins only |
| Staff rows, RLS, write integrity                 | `supabase/migrations/20260801150000_staff.sql`, `20260802140000_staff_write_integrity.sql`                                             | **real**                            |

Two helpers already in the database that these prompts lean on:
`private.own_staff_ids()` (from `20260801150000`) and
`private.has_permission(facility_id, key)`.

---

## P0 — Ground and report back (no code)

```
Read AGENTS.md and CLAUDE.md first, then ground yourself in the staff onboarding
feature as it exists today. Do NOT write any code in this task — I want a report.

Read:
- src/data/staff-onboarding.ts (the whole mock store: types, hrStore, commit)
- src/app/facility/dashboard/staff/_components/staff-form-dialog.tsx
- src/app/onboard/[token]/page.tsx and section-forms.tsx
- src/app/facility/dashboard/staff/_components/{onboarding-submission-view,review-activate-dialog,onboarding-progress-list,resend-invite-dialog,offboarding-tab}.tsx
- src/components/facility/staff-hr/*.tsx
- src/app/api/admin/invite/route.ts and src/lib/invitation-token.ts
- supabase/migrations/20260801150000_staff.sql and 20260802140000_staff_write_integrity.sql

Report, in prose, with file:line references:

1. The exact path a new hire takes today, from the manager opening the staff
   dialog to the hire being activated. Name every function that mutates state.
2. Every piece of that path that is in-memory only, and what is lost on refresh.
3. What "the welcome email" actually does today.
4. Which settings screens are wired into the settings page and which are
   orphaned — run `bun run check:settings-wiring` and `bun run prune`.
5. Which of the onboarding types in src/data/staff-onboarding.ts are already
   used by the UI vs. defined but dead.
6. Anything in my summary above that is now wrong — this repo moves fast and I
   may be reading a stale snapshot.

Finish with a one-paragraph statement of what has to become real, in dependency
order. No code.
```

---

## P1 — Templates and HR config in Postgres

```
Follow the AGENTS.md loop: Ground → Plan → Implement → Verify → Encode. State a
plan before writing code.

Move the onboarding/offboarding TEMPLATES and HR config out of the in-memory
hrStore in src/data/staff-onboarding.ts and into Postgres. Templates only in
this task — per-hire instances are the next one, do not touch them.

Read first: supabase/migrations/20260801150000_staff.sql,
20260802140000_staff_write_integrity.sql and 20260802120000_booking_write_integrity.sql.
Those three establish the pattern this migration must follow — RLS for who,
a SECURITY DEFINER BEFORE trigger for what, `private.` helpers, and an explicit
service_role bypass keyed on `auth.uid() is null` so the seed scripts still work.

Model these types (all in src/data/staff-onboarding.ts):
  OnboardingTemplate, OnboardingTask, EmployeeOnboardingTask,
  EmployeeFieldSpec, EmployeeCustomQuestion, OffboardingTemplate,
  OffboardingTask, StaffHrConfig

Schema decisions I want you to make and JUSTIFY IN THE MIGRATION COMMENTS:
- Whether manager tasks and employee tasks are one table with an `audience`
  discriminator or two tables. The shapes differ (EMPLOYEE_TASK_FIELDS,
  custom questions, formats) — argue it either way but commit.
- What is a column and what goes in a `config` jsonb. Follow the split the
  bookings table already uses: queryable/filterable fields are columns, the
  long tail is jsonb.
- Template task ordering must be explicit and stable, not insertion order.

Hard requirements:
- Every table facility-scoped, RLS on, no `for all` policies — split
  select/insert/update/delete so a read grant cannot carry write rights.
- Reads gated on an existing permission key, writes on `manage_staff`. Check
  supabase/seed.sql for the exact keys that exist; do not invent new ones
  without saying so.
- A template that is `active` and applies to a role must be unique per
  (facility, role) or resolveTemplateForRole becomes non-deterministic — decide
  how to enforce that and say why.
- Add src/lib/api/staff-onboarding.ts as a TanStack Query factory + route
  handlers under src/app/api/. Do NOT change the settings components in this
  task — they keep reading the mock store until P5.

Verify: apply the migration to a local Supabase, then prove the RLS with a psql
script in supabase/tests/ in the same style as supabase/tests/booking-write-integrity.sql
— act as a real caller with `set local role authenticated` plus the JWT subject,
one transaction, rollback at the end. Show me the pass/fail table. Then run
`bun run typecheck && bun run lint && bun run format:check`.
```

---

## P2 — Per-hire instances, sections, and the token

```
Follow the AGENTS.md loop. Plan before coding.

Move the per-hire onboarding INSTANCE out of hrStore and into Postgres:
OnboardingInstance, OnboardingSection, OnboardingChangeRequest — and the
functions around them in src/data/staff-onboarding.ts: createOnboardingInstance,
saveOnboardingSection, saveOnboardingSectionByTask, submitOnboarding,
setOnboardingAccountComplete, regenerateOnboardingToken, reviewActivate,
requestOnboardingChange, resolveOnboardingChange, onboardingProgress.

THE TOKEN IS THE SECURITY-CRITICAL PART. Read the header of
20260802120000_booking_write_integrity.sql before you design it — PostgREST is
reachable directly with the anon key, so RLS is the boundary and a route handler
is not. Specifically:

- Store a HASH of the token, never the token itself. A leaked database dump must
  not hand over live onboarding links.
- The anon role must not be able to select from the instances table at all. The
  public /onboard/[token] page resolves its instance through a SECURITY DEFINER
  RPC that takes the token, returns exactly one instance or nothing, and is
  rate-limitable. A policy of the shape "anon can read where token = ?" is a
  table scan oracle — do not write one.
- The RPC must refuse expired tokens, already-submitted instances, and
  instances whose staff row is no longer `invited`.
- An employee writing their own section must not be able to set submittedAt,
  reviewedAt, or resolve their own change requests. Enforce that in a BEFORE
  trigger the way 20260802120000 clamps a customer's booking, not in the route.
- A manager reviewing must hold `manage_staff` on that facility.
- Signed-in staff read their own instance via the existing
  private.own_staff_ids() helper — do not write a second way to say the same
  thing.

Also: instances must be per-facility and cascade correctly when a staff row is
deleted, and the sections table needs the (instance, task_id) uniqueness that
saveOnboardingSectionByTask assumes.

Do not change the UI in this task beyond what is needed to keep it compiling.

Verify with a psql script in supabase/tests/ in the same style as
booking-write-integrity.sql. It must include, at minimum: an anon caller cannot
list instances; an anon caller with a VALID token gets exactly one; an anon
caller with a valid token cannot read a DIFFERENT instance; an expired token
returns nothing; an employee cannot self-submit-and-review; a manager without
manage_staff cannot activate. Show me the pass/fail table, then run the green
sequence.
```

---

## P3 — The real welcome email and a real account

> **Your decision, before pasting this.** Two designs:
>
> **(a) Anonymous token** — what the prototype does. The hire clicks a link, does
> everything anonymously, sets a password at the end. Lower friction; a whole
> anonymous write surface to defend; signed documents attach to a token rather
> than an identity.
>
> **(b) Supabase `inviteUserByEmail`** — the invite _is_ the welcome email.
> Supabase creates the auth user, the hire sets a password on arrival, and
> everything after that is a signed-in session with RLS doing the work. No
> anonymous surface at all, and `private.own_staff_ids()` already exists to scope
> it. Signatures and documents attach to a real `auth.users` row, which is what
> makes them worth anything if a signed agreement is ever disputed.
>
> The prompt below is written for **(b)**, which is what I'd pick — mainly for
> the last point. If you want (a), delete the third paragraph and tell it to keep
> the token flow from P2 as the only entry point.

```
Follow the AGENTS.md loop. Plan before coding.

Make the staff invite real. Today src/app/facility/dashboard/staff/_components/staff-form-dialog.tsx
calls notifyStaffLifecycle("staff_invited", …), which records a mock email into
the in-memory store and shows a toast with the link. Nothing is sent and no
account exists, so a new hire cannot sign in.

Read src/app/api/admin/invite/route.ts, src/lib/admin-invite-email.ts and
src/lib/invitation-token.ts first. That path is already real for PLATFORM admins
— Resend, env-gated on RESEND_API_KEY, and when the key is absent it returns
sent:false plus the setup link rather than pretending. Match that behaviour
exactly; do not invent a second email convention.

Build the facility-staff equivalent:
- A route that invites a staff member by id. It must create the Supabase auth
  user via inviteUserByEmail using the service-role key (server-side only —
  never expose that key to the client), create/link the public.profiles row and
  the facility_memberships row for their primary role, and mark the staff row
  invited. All of it must be idempotent: inviting twice must not create two
  memberships or two profiles.
- Use the existing onboarding-invite-email.tsx as the email BODY rather than
  writing new copy — the wording is already approved. Take the welcomeMessage,
  inviteExpiryDays and completionDeadlineDays from the resolved template (P1),
  not from constants.
- Wire the resend path in _components/resend-invite-dialog.tsx onto the same
  route, and make regenerating a token invalidate the previous one.
- After the hire sets their password they land on their onboarding checklist,
  signed in. Add that route under src/app/employee/ — it is a Server Component
  page with the interactive parts in small client children, per CLAUDE.md.

Failure modes I want handled explicitly, not swallowed:
- The email provider rejects the send → the staff row must not be left in a
  state that says "invited" when nothing was sent.
- The auth user is created but the membership insert fails → no orphaned
  auth.users row that can sign in with no facility.
Say in the code comments which of these you made atomic and which you made
recoverable, and why.

Verify: run it against a local Supabase with RESEND_API_KEY unset and confirm
the honest not-configured response, then with a key against a real inbox. Add a
Playwright spec under tests/e2e/ in the style of tests/e2e/staff-field-exposure.spec.ts
proving an invited-but-not-onboarded account cannot reach the facility dashboard.
Then run the green sequence.
```

---

## P4 — Documents and signatures

```
Follow the AGENTS.md loop. Plan before coding.

The onboarding flow asks the hire to upload documents and sign agreements
(src/app/onboard/[token]/section-forms.tsx, EMPLOYEE_TASK_FIELDS and the
"document" / "agreement" task types in src/data/staff-onboarding.ts). Today the
uploads have nowhere to go and a signature is a boolean in a mock object.

Make both real:
- A Supabase Storage bucket for staff documents, PRIVATE, with storage RLS so a
  staff member can write only into their own prefix and read only their own
  files, and a manager with the right permission can read their facility's. Say
  in comments which permission key you chose and why. Signed URLs with a short
  expiry for reads — no public bucket, no long-lived URLs.
- A table recording each uploaded document: who, which onboarding task, original
  filename, content type, size, storage path, uploaded_at. Validate content type
  and size server-side; a client-declared MIME type is a suggestion.
- A signatures table that records what was signed, by whom, when, the agreement
  text or a hash of it AS IT WAS AT SIGNING TIME, and the auth user id. If the
  facility later edits that agreement, an existing signature must still prove
  what the person actually agreed to. This is the whole point of the table —
  storing a foreign key to a mutable agreement row defeats it.
- Signatures and documents are append-only for the employee: they can add, they
  cannot delete or overwrite. Follow the pattern in
  supabase/migrations/20260625000000_audit_log_append_only.sql.

Check src/data/documents.ts and src/data/employee-files.ts first — there may
already be a document shape the rest of the app expects, and the employee
portal already has a documents view at
src/app/employee/(shell)/documents/my-documents-view.tsx that this should feed.

Verify with a psql script in supabase/tests/ proving: a staff member cannot read
another's documents; cannot delete their own signature; a manager without the
permission cannot read the facility's; the signature survives an edit to the
agreement text. Then the green sequence.
```

---

## P5 — Move the screens onto the API and delete the store

```
Follow the AGENTS.md loop. Plan before coding.

Everything is real in Postgres now. Move the UI off the in-memory store and
delete it.

Replace these hooks and functions from src/data/staff-onboarding.ts with the
src/lib/api/ query factories built in P1–P4, one screen at a time, keeping the
build green between each:
  useOnboardingTemplates, useOffboardingTemplates, useStaffHrConfig,
  useOnboardingInstance, useOffboardingInstance, useOnboardingInstances,
  and every save*/create*/delete* alongside them.

Order — settings screens first, then the hire dialog, then /onboard, then the
manager review screens. Commit each separately with a conventional-commit
message.

Per CLAUDE.md: components consume data via src/lib/api/ factories, never by
importing src/data/ directly. Server components prefetch with
queryClient.prefetchQuery + HydrationBoundary. Pages stay Server Components —
push interactivity into small client children.

Two things that WILL break and that I want handled rather than papered over:
- The mock store is synchronous. resolveTemplateForRole() is called during
  render in staff-form-dialog.tsx. Real data is async — restructure so the
  template is resolved before the dialog needs it, not with a loading flicker
  inside it.
- Optimistic updates: the write-integrity triggers silently revert fields the
  caller may not set, so a mutation that keeps its own input will display an
  edit the database threw away. Every mutation must render what came BACK.
  src/lib/api/staff.ts already documents this rule — follow it.

When nothing imports it any more, delete the hrStore/commit machinery from
src/data/staff-onboarding.ts, keeping only the types the app still needs.
Confirm with `bun run prune` (Knip) and `bun run check:settings-wiring`.

Verify: walk the whole journey manually in two different browsers, signed in as
two different people — manager creates a hire in one, hire completes onboarding
in the other, manager reviews and activates. That cross-browser walk is the
entire point of this work and it is the acceptance test. Then the green sequence
plus `bun run build`.
```

---

## P6 — Offboarding

```
Follow the AGENTS.md loop. Plan before coding.

Do for offboarding exactly what P1–P5 did for onboarding: OffboardingTemplate,
OffboardingTask, OffboardingInstance, OffboardingTaskState, OffboardingDocument
and the functions around them in src/data/staff-onboarding.ts —
createOffboardingInstance, resolveOffboardingTemplateForReason,
getOffboardingTemplatesForReason and the rest.

Reuse the tables and patterns from P1–P4 rather than parallel ones wherever the
shapes genuinely match; where they don't, say so instead of forcing it.
The UI already exists at
src/app/facility/dashboard/staff/_components/offboarding-tab.tsx and
status-change-dialog.tsx.

Offboarding-specific rules that onboarding does not have, and that I want
enforced in the database rather than the UI:
- Deactivating a staff member must revoke their access — the facility_memberships
  row goes inactive in the same transaction as the status change, not in a
  follow-up call that can fail on its own.
- Their history does not disappear. Bookings they were assigned to, write-ups,
  signed agreements and documents all survive. Check what
  20260801150000_staff.sql does on delete before you decide between soft-delete
  and deactivation, and follow whatever it already established.
- A departing employee loses write access immediately but their final documents
  (last payslip, exit letter) may still need to reach them. Say how you handled
  that.

Verify with a psql script in supabase/tests/ proving a deactivated member cannot
read their old facility's data, and that their historical rows are still
readable by the facility. Then the green sequence.
```

---

## Notes

**Run P0 before anything else.** Two migrations appeared in this repo between my
first look this morning and this write-up (`20260802140000_staff_write_integrity.sql`,
`20260803090000_client_pet_write_integrity.sql`), so parts of my reading may
already be stale.

**P1 and P2 are the load-bearing ones.** P3–P6 are mechanical once the schema is
right. If you only get two of these done, do those two.

**The token design in P2 is where a security bug would actually land.** Anonymous
read paths are the one thing in this feature that a mistake makes exploitable
rather than merely broken. It's worth reading that prompt's output carefully
rather than skimming it.

**What to tell the client:** the flow he described works today — role-based
templates, welcome email, self-serve signing and uploads, manager review. What it
can't do yet is survive a page refresh or reach a second person's browser,
because there's no backend under it. That's the work, and it's roughly the
same size as the bookings and staff backends already shipped.
