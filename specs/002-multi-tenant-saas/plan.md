# 002 — Implementation plan

Spec: [spec.md](spec.md). Read the decisions D1–D5 there before starting any phase.

Phases are ordered so that **each one leaves the platform working.** Phase 1
alone makes facility creation real; phase 4 alone makes it branded. Nothing here
requires a big-bang cutover, and each phase ends with an assertion that runs in
CI rather than a screenshot.

**Every phase follows the AGENTS.md loop** (Ground → Plan → Implement → Verify →
Encode) and the green sequence: `bun run typecheck && bun run lint && bun run format:check`,
plus `bun run check:facility-from-session` and `bun run check:rls-writes`.

---

## Phase 1 — Provisioning that actually writes

**The gap.** `src/app/dashboard/facilities/new/page.tsx:347` — `handleComplete`
logs to the console and redirects. Six steps of collected data are discarded.

### 1.1 Migration: what a facility needs to exist

`supabase/migrations/<ts>_a_facility_is_provisioned_atomically.sql`

- `facilities.slug` gains a **format + reserved-word** check constraint.
  Reserved: `www app api admin dashboard clerk status sign-in sign-up book review
forms onboard setup profile support help static assets cdn mail smtp`.
  Enforce in the database, not only in the wizard — the wizard is not the only
  thing that will ever insert a facility.
- `public.provision_facility(...)` — `SECURITY DEFINER`, **platform admin only**
  (`private.is_platform_admin()` guard as its first statement, raising `42501`
  otherwise). One function so the whole thing is one transaction: org, facility,
  primary location, owner `staff` row, and the membership grant. Returns the new
  `facility_id` and `staff_id`.
- Idempotency key on the request so a double-submit or a retried deploy cannot
  create two facilities. A `provisioning_requests` table keyed by a client-sent
  uuid is enough; the second call returns the first call's result.

> **Why a database function rather than a sequence of PostgREST calls.**
> A facility with no owner, or an owner grant pointing at a facility that failed
> to insert, is a support ticket that looks like corruption. Postgres already
> gives us all-or-nothing; using it is cheaper than writing compensation logic.

### 1.2 The route

`src/app/api/facilities/route.ts` — `POST`

- `getViewer()`; refuse unless `isPlatformAdmin` (403). RLS backs this up, but
  the route should say no first and clearly.
- Validate with Zod: name, slug, timezone, owner email, plan, business types.
- Slug: generate from name, then uniqueness-check; surface a _usable_ error
  ("pawradise is taken — try pawradise-vt"), not a 23505.
- Call `provision_facility`. Map failures through `writeFailure`.

### 1.3 Wire the wizard

`src/app/dashboard/facilities/new/page.tsx`

- `handleComplete` → `useMutation` against the route. Disable the button while
  in flight; the current instant redirect would otherwise fire before the write.
- On success, redirect to `/dashboard/facilities/<id>` — the facility that was
  just made, not the list, so the superadmin sees the result of their action.
- On failure, stay on the step and show the error. Today there is no failure
  path because there is no request.

### 1.4 Proof

`supabase/tests/facility-provisioning.sql`

- P1 a platform admin can provision; every row appears
- P2 a **facility owner** calling `provision_facility` is refused `42501`
  (the positive control matters more than the happy path)
- P3 a reserved slug is refused
- P4 the same idempotency key twice creates one facility
- P5 a provisioning that fails midway leaves **nothing** — assert counts before
  and after a deliberately failing call

---

## Phase 2 — The owner's account, end to end

**The gap.** `facility_membership_grants` and `record_membership_grant()` exist
and nothing calls them. No invitation is ever sent.

Note `facility_membership_grants.staff_id` is `NOT NULL` — a grant needs a staff
row, which is why phase 1.1 creates the owner's `staff` row as part of
provisioning rather than leaving it to this phase.

### 2.1 Send the invitation

`src/lib/clerk/invitations.ts` (new)

- Clerk Backend API `invitations.create({ emailAddress, redirectUrl })`, where
  `redirectUrl` is the facility's own subdomain once phase 4 lands, and
  `/sign-up` until then.
- **Server-only.** The Clerk secret key never reaches a client bundle — add
  `import "server-only"` at the top so a mistaken import fails the build rather
  than shipping the key.
- Called from `provision_facility`'s route handler _after_ the transaction
  commits. An email about a facility that does not exist is worse than a missing
  email; a missing email is re-sendable (2.3).

### 2.2 Verify the claim actually fires

The trigger on `profiles` already claims matching grants. This phase proves the
whole loop rather than assuming it:

`supabase/tests/owner-invitation.sql`

- O1 provisioning records an unclaimed grant for the owner's email
- O2 inserting the matching `profiles` row claims it and creates an **active
  `owner` membership**
- O3 a profile with a _different_ email does not claim it
- O4 an expired grant does not claim
- O5 claiming twice does not create two memberships

### 2.3 Re-send and revoke

`src/app/dashboard/facilities/[id]/` — owner-invitation status on the facility
detail page: pending / claimed / expired, with re-send and revoke. Without this,
a bounced invitation means a facility nobody can enter and no way to fix it
except SQL.

---

## Phase 3 — Facility identity and branding

**The gap.** `facilities` has `id, org_id, name, slug, timezone, legacy_id`.
Nothing to render on a branded login page.

### 3.1 Migration

`supabase/migrations/<ts>_a_facility_has_a_face.sql`

- `facility_branding` — `facility_id` PK, `logo_url`, `wordmark_url`,
  `primary_color`, `accent_color`, `support_email`, `support_phone`,
  `tagline`. A separate table rather than columns on `facilities` so the public
  read policy below covers branding **only**, and never leaks operational
  columns as the facility row grows.
- A `facility-logos` Storage bucket, **public read**. This is a deliberate
  departure from the private-bucket rule used for staff documents: a logo on a
  signed-out login page cannot be behind a signed URL. Validate content type and
  size server-side on upload — a client-declared MIME type is a suggestion.
- RLS: `facility_branding_read` is readable by **anon**, because the login page
  is signed out by definition. Write restricted to facility admins and platform
  admins.

> **The enumeration question, answered rather than waved at.** An anon-readable
> branding table means anyone can walk it and list every facility on Yipyy. That
> is acceptable _for these columns_: a facility's name, logo and colours are on
> their shopfront. It would not be acceptable for their client count, plan or
> revenue — which is exactly why this is a separate table with a narrow policy
> rather than a widened policy on `facilities`.

### 3.2 Reading it

- `src/lib/api/facility-branding.ts` — `getBrandingBySlug(slug)` using the
  **anon** client, since the caller is signed out.
- Extend `FacilityContext` with the branding a signed-in shell needs, so the
  in-app header stops being the demo facility's name too.

### 3.3 Editing it

`/facility/dashboard/settings` gains a Branding section: logo upload, colour
pickers, live preview of the login card. Uses `DataTable`-free simple form per
CLAUDE.md (TanStack Form + Zod — this is a static CRUD form).

---

## Phase 4 — Subdomains

The largest infrastructure step. **Do it behind a flag** and keep
`yipyy.com/sign-in` working the entire time; a DNS or certificate problem must
not be able to lock every facility out at once.

### 4.1 Infrastructure

- Wildcard DNS `*.yipyy.com` → Vercel; wildcard TLS certificate.
- Clerk: add `*.yipyy.com` to allowed origins; confirm the session cookie is set
  on `.yipyy.com` so it is shared across facility hosts (this is what D2 says is
  correct under D1 — one identity, RLS scopes the data).
- Keep `www.yipyy.com` as the marketing/superadmin host, and make it a reserved
  slug (already in 1.1).

### 4.2 Host → facility

`src/proxy.ts` — the one place that learns which facility a request is for.

- Parse `Host`. If it is a facility subdomain, resolve the slug and stamp
  `x-facility-slug`, exactly as `x-pathname` is stamped today.
- **`set`, never `append`** — the existing comment explains why: a client that
  sends its own header must not be able to smuggle a value past the gate. Same
  reasoning, higher stakes, since this header names a tenant.
- The header is a **routing hint, not an authorisation input.** RLS still scopes
  every row from the token, and `getFacilityContext()` still resolves from the
  membership. A forged `x-facility-slug` must buy a wrong-looking login page and
  nothing more. Assert that in 4.5.
- Unknown subdomain → the marketing 404, not a stack trace and not a redirect
  that reveals which slugs exist.

### 4.3 The branded sign-in

`src/app/sign-in/[[...sign-in]]/page.tsx` reads `x-facility-slug`, loads
branding, and renders the facility's name and logo in `AuthCard`. With no
facility resolved it renders exactly today's neutral Yipyy card — so the
apex host is unchanged and the fallback is the current behaviour.

The portal-neutral principle in that file's header comment still holds: the
page does not ask who you are, and `landingPathForClaims` still routes after
the token is read.

### 4.4 `facility_domains`

`supabase/migrations/<ts>_a_facility_may_be_reached_by_many_names.sql`

One row per hostname that resolves to a facility, with `is_primary` and a
`verified_at`. The subdomain is just the first row. This is what makes custom
domains a later feature rather than a later rewrite.

### 4.5 Proof

`tests/e2e/facility-subdomain.spec.ts`

- S1 `pawradise.<host>/sign-in` shows Pawradise's name and logo
- S2 `happy-paws.<host>/sign-in` shows Happy Paws'
- S3 an unknown subdomain 404s
- S4 a reserved subdomain is not treated as a facility
- S5 **a forged `x-facility-slug` header changes the branding and returns no
  data from the other facility** — the assertion that keeps 4.2's claim honest

---

## Phase 5 — Customers, scoped to the facility they signed up at

**The gap.** `link_client_record()` links a signed-in person to an _existing_
client record by email. Nothing creates a client record for someone signing up
at a facility for the first time, because until now there was one facility.

### 5.1 Facility signup policy

Answers open question 1. `facilities.allow_customer_signup boolean not null
default false`. **Closed by default**: a facility that has not asked for public
registration should not get it because we shipped a feature.

### 5.2 Registration attaches to a facility

- `POST /api/clients/register` — facility from `x-facility-slug`, identity from
  the session, refuses when `allow_customer_signup` is false.
- Creates a `clients` row at **that** facility with `profile_id` set. Under D1 a
  second facility means a second row, not a conflict.

  Checked rather than assumed: the constraint is already
  `clients_facility_email_key UNIQUE (facility_id, email)` — correct for D1, and
  a global unique on email would have silently blocked it. **One flaw:** it is
  case-sensitive, so `Person@x.com` and `person@x.com` can both exist at one
  facility and a returning customer gets a duplicate record. `profiles` already
  solved this with `profiles_email_lower_key`; mirror it here with
  `UNIQUE (facility_id, lower(email))` and de-duplicate any existing collisions
  in the same migration.

- Extend `/api/clients/me` to resolve _which_ client record, given the facility.
  It currently answers "the caller's record" as though there were one.

### 5.3 The customer's facility switcher

`useCustomerFacility` (`src/hooks/use-customer-facility.tsx`) currently reads
`src/data/facilities` and stores a numeric id in `localStorage`. Replace its
source with `client_facility_ids()` via a query factory. Keep the hook's shape
so the portal's call sites do not change.

Two notes for this file specifically:

- The switcher must list **only** facilities from `client_facility_ids()`. It
  currently maps every active facility out of `src/data/facilities`, which under
  subdomains would show a customer a directory of every business on Yipyy.
- `localStorage` holds a numeric facility id today. Under D1 the selected
  facility is a _claim about which record to show_, and it is read on a screen
  the customer controls — so the server must re-derive it, never trust it. Same
  rule as `check:facility-from-session`, one layer up.

### 5.5 The stranger gate

**The requirement D1 creates.** The Clerk session cookie is shared across
`.yipyy.com` (D2), so a Pawradise customer opening `happy-paws.yipyy.com` is
_already signed in there_. Nothing may follow from that.

- `/api/clients/me` returns `{ linked: false }` for that facility — which it
  already models correctly as a real answer with a 404, not an error.
- The portal renders an explicit **"continue as `you@email.com`, or use a
  different account"** state. Not an empty dashboard, and not a spinner: the
  customer must be able to tell they are a stranger here.
- **No implicit record creation.** Arriving signed in must never mint a
  `clients` row. Registration is the deliberate act in 5.2, and it is refused
  outright when `allow_customer_signup` is false.

### 5.5.1 `link_client_record()` must be made facility-aware

Read before writing this, and the reading changed the plan. The function today is
**not facility-scoped at all**:

```sql
update public.clients c
   set profile_id = v_user_id
 where lower(c.email) = lower(v_email)
   and c.profile_id is null
returning c.id into v_client;
```

The _intent_ is right and should be kept: it only ever claims a row **a facility
already created** for that email. A facility entering a customer is that facility
inviting them; the customer is not admitting themselves. Keep that.

But three defects are latent behind "there is only one facility", and all three
surface with the second:

1. **It claims across every facility in one statement.** With unclaimed rows at
   two facilities it updates both. `UPDATE … RETURNING … INTO` with multiple rows
   does **not** raise in plpgsql — it silently assigns one arbitrarily — so the
   caller gets one id and no indication the other was touched.
2. **The early return makes it inconsistent.**
   `select c.id … where c.profile_id = v_user_id limit 1` returns as soon as
   _any_ link exists. So once linked at Pawradise, a later Happy Paws record for
   the same person is **never claimed** — the customer's own record stays
   invisible to them. Whether it links both or neither depends only on which
   facility entered them first.
3. **`.maybeSingle()` at [clients/me/route.ts:67](../../src/app/api/clients/me/route.ts#L67)
   errors on two rows.** Not degrades — errors. The customer portal breaks for
   anyone who is a customer at two facilities.

Rewrite it as `link_client_record(p_facility_id uuid)`: claim the unclaimed row
**at that facility only**, called with the facility the request is for. Then (2)
disappears because each facility is claimed independently, and (1) becomes a
single-row update by construction.

> This is the piece that carries the product promise. The credential is shared
> because Clerk gives no alternative (D1); the _account_ is not, and this is
> where the application either honours that or quietly contradicts it.

### 5.6 Proof

`supabase/tests/customer-tenancy.sql`

- C1 one profile with client rows at two facilities sees both, separately
- C2 facility A's staff see A's client row and **not** B's, for the same person
- C3 a customer cannot read the other facility's bookings, pets or payments
- C4 registration at a facility with `allow_customer_signup = false` is refused
- C5 **a signed-in customer of A reading at B gets zero rows and no row is
  created** — the stranger gate asserted at the database, not just the UI
- C6 `link_client_record(B)` does **not** claim a row at a facility that never
  created one for that email
- C7 a person with unclaimed rows at **both** facilities ends up linked at both —
  the case today's early return silently skips (5.5.1 defect 2)
- C8 `/api/clients/me` returns the right record for a person with two, rather
  than erroring (5.5.1 defect 3)

`tests/e2e/customer-stranger.spec.ts` — sign in at facility A, navigate to
facility B's host, and assert the "continue as / different account" screen
rather than an empty dashboard. The SQL proves no data crosses; this proves the
customer is _told_.

---

## Phase 6 — The role hierarchy

**The gap.** `profiles.is_platform_admin` is one boolean. The spec describes
_superadmin_ and _users of superadmin_ — different people with different powers.

### 6.1 Platform roles

`supabase/migrations/<ts>_the_platform_team_has_roles.sql`

- `platform_role` enum: `superadmin`, `support`, `billing`, `readonly`.
- `platform_memberships (profile_id, role)`.
- `private.is_platform_admin()` keeps its current meaning (any platform member)
  so **no existing policy changes behaviour**; add
  `private.has_platform_role(role)` for the new, narrower checks.
- Destructive platform actions — delete a facility, refund, impersonate — require
  `superadmin`, not merely membership.

> Migrate the existing boolean by inserting a `superadmin` row for every profile
> with `is_platform_admin = true`, then keep the column as a generated mirror
> until nothing reads it. Dropping it in the same migration would break every
> policy at once.

### 6.2 Five roles, one assertion file

`supabase/tests/role-matrix.sql` — for each of superadmin, platform support,
facility owner, facility staff, customer: what they can read, what they can
write, and **what they must be refused**, across both facilities. This is the
single most valuable test in the plan; it is the spec's central promise
expressed as SQL.

---

## Phase 7 — Subscriptions and entitlements

**The gap.** Plans, invoices, dunning and suspension exist as mock data with no
Postgres behind them.

### 7.1 Migration

- `facility_subscriptions` — plan, status (`trialing|active|past_due|suspended|cancelled`),
  period, trial end, seat count.
- `facility_module_entitlements` — which modules this facility has bought;
  the platform flags UI already models this shape.
- A `suspended` facility: **staff blocked, owner routed to billing.** Enforce in
  RLS, not only in the portal gate — a suspended facility's data must not be
  reachable by an API call that skips the UI.

### 7.2 Wiring

Route the existing commercial screens (`/dashboard/commercial/*`) at the real
tables. Payment capture stays out of scope; this models plan _state_.

### 7.3 Proof

`supabase/tests/subscription-gating.sql` — an active facility works; a suspended
one refuses staff reads and writes; its owner can still reach billing.

---

## Phase 8 — Keep it true

Encode, per AGENTS.md step 5. Each of these fails the build rather than living
in a document nobody re-reads.

- **`check:facility-from-session`** — already shipped, already caught one real
  defect. No change needed.
- **`check:tenant-scoped-tables`** (new) — every table carrying `facility_id`
  must have RLS enabled and a policy that filters on
  `member_facility_ids()` or `client_facility_ids()`. This is the gate that
  catches the next table someone adds without a policy, which is how
  multi-tenant systems actually leak.
- **`facility-resolution.sql`** — extend past its current 7 assertions as phases
  land. **Keep the negative assertions** (M3, M6): a test that only proves the
  happy path would still pass if the facility came from something the caller
  controls.
- **e2e** — two facilities, two owners, two customers, in one run. The suite is
  36 specs and passes; this becomes the 37th.
- **ADR** — `docs/architecture/decisions/0004-facilities-are-subdomains.md`,
  recording D2 and, more importantly, the shared-cookie consequence, so the next
  person to read it does not "fix" it.

---

## Sequencing

```
Phase 1 ──► Phase 2 ──────────────► Phase 4 ──► Phase 5
provision   owner account           subdomains  customers
   │                                    ▲          │
   └──────► Phase 3 ───────────────────┘          │
            branding (needed by 4.3)               │
                                                   ▼
            Phase 6 ──► Phase 7 ──► Phase 8   role matrix,
            roles       billing     gates     subscriptions
```

**1 → 2 → 3 → 4 is the critical path** and delivers the headline promise: a
superadmin creates a facility, the owner is invited, and they sign in at their
own branded subdomain.

**5 completes it** — their customers can then register.

**6 and 7 are independent** of the subdomain work and can run in parallel with
3–5 by anyone not touching the same migrations.

**8 is not a phase at the end.** Each gate ships with the phase it guards; the
list is gathered here only so none is forgotten.

## The one thing to get right

Every phase adds a way for a request to name a facility — a slug, a subdomain, a
header, an invitation. **None of them may become an authorisation input.**

The facility a caller may _touch_ comes from their membership (staff) or their
client records (customers), enforced by RLS on the database, from the token.
Everything this plan adds decides what a request is _about_. That distinction is
already written into `src/lib/api/facility-context.ts` and guarded by
`check:facility-from-session`, and it is the difference between a multi-tenant
platform and a data breach with a nice login page.
