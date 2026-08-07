# 002 — Yipyy as a multi-tenant SaaS

**Status:** draft
**Created:** 2026-08-07
**Supersedes nothing.** Builds on [001 — Clerk as the identity provider](../001-clerk-third-party-auth/spec.md).

## Problem

Yipyy sells a subscription to **facilities** — pet-care businesses that run their
operation on it. Each facility has its own staff, its own customers, its own
branded sign-in, and its own subscription. One facility must never see another's
data, and onboarding a new facility must be a self-contained action a superadmin
takes, not an engineering task.

Today the platform is **one facility wearing a SaaS costume.**

The database is genuinely multi-tenant and correct — that part is done and is
not what this spec changes. What is missing is everything that turns a row in
`facilities` into a business that can actually be sold to and used:

| What the product promises                     | What exists today                                             |
| --------------------------------------------- | ------------------------------------------------------------- |
| A superadmin creates a facility               | A 2,011-line wizard whose `handleComplete` is a `console.log` |
| …and its login and everything else is created | Nothing is written. No facility, no owner, no account         |
| Each facility's login shows its name and logo | One global `/sign-in`; `facilities` has no branding columns   |
| The owner gets an account                     | No invitation is sent; `facility_membership_grants` is unused |
| Facility staff, then end customers            | Staff work; customer self-signup has no facility to attach to |
| Superadmin, and users of superadmin           | `profiles.is_platform_admin` is a single boolean — no roles   |
| A subscription per facility                   | Mock data only; no `facility_subscriptions` table in Postgres |

Grounded 2026-08-07 against the live project: 71 tables, none of them
subscription or branding; `src/app/dashboard/facilities/new/page.tsx:347`.

## What already works — do not rebuild this

Verified against the live database, not assumed. Each of these is load-bearing
and the plan builds on it rather than replacing it.

**The tenancy model is correct.**
`orgs` → `facilities` → `locations`. Staff belong via `facility_memberships`;
customers belong via `clients.facility_id`. `clients` carries **both**
`facility_id` and `profile_id`, so one person is one Clerk identity with a
_separate client record at each facility they use_ — the exact shape decision 1
below asks for, already built.

**RLS scopes every table from the token.**
`private.member_facility_ids()` (staff) and `private.client_facility_ids()`
(customers) both read `auth.jwt()->>'sub'`. A second facility's staff reading
the demo facility get zero rows, and a write stamped with the wrong facility is
refused `42501` — both proven in `supabase/tests/facility-resolution.sql`.

**The server resolves the facility from the session.**
`getFacilityContext()` takes it from the viewer's membership, and
`check:facility-from-session` fails the build if any route takes it from the
request instead.

**The grant-then-claim invitation mechanism exists and is unused.**
`facility_membership_grants` records "this email is to become an owner at this
facility"; a trigger on `profiles` claims the grant the moment that person's
Clerk account appears. `record_membership_grant()` deliberately reads the email
off the staff row rather than accepting one, so nobody can aim a grant at an
address they control. Phase 2 is mostly _calling_ this.

**The Clerk webhook creates profiles.** `user.created` upserts into `profiles`,
which is what fires the claim trigger.

## Decisions taken

**D1 — The facility owns the account; Clerk owns the credential.**

The product requirement is that **each facility has its own customers, not
shared ones.** That requirement is met at the level that matters: a customer's
_account_ at a facility is their `clients` row — their pets, bookings, balance,
history, and their presence in that facility's client list. That is already
per-facility. Registering at Pawradise creates nothing at Happy Paws, and
neither facility can see the other's customers.

What is shared is the **credential**: one email address, one password, one Clerk
identity. That is not a preference — it is a constraint, and it was checked
before being accepted. From Clerk's satellite-domains documentation:

> a single Clerk instance cannot serve multiple domains with isolated sessions
> per domain. […] If you need isolated sessions per domain, you would need
> separate Clerk instances.

Clerk Organizations do not close the gap either: one user account belonging to
many organizations with per-org roles, not per-org credentials.

_Considered and rejected: one Clerk instance per facility._ It is the only way
to give the same email two different passwords, and it costs the two things this
spec exists to deliver. **Clerk has no public API for creating applications**, so
every new facility would need a manual console setup — keys, domain, webhook —
plus its own Supabase third-party-auth registration. Facility provisioning would
stop being automated, which is the headline requirement, and Clerk bills per
application against a stated plan of _many_ facilities.

**Because the credential is shared, the application must never behave as though
the account is.** Concretely (phase 5.5):

- Arriving at a facility where you hold no client record makes you a **stranger**,
  not a customer — no data, no implicit record creation
- That state is shown explicitly — _continue as `you@email.com`, or use a
  different account_ — rather than silently treating the session as belonging
  there
- The switcher offers only facilities returned by `client_facility_ids()`

The residual, stated plainly so nobody discovers it later: a person who uses two
facilities will notice one password works at both.

**D2 — Facilities live on subdomains: `pawradise.yipyy.com`.**
Chosen over the cheaper path form for the white-label feel. This is the largest
piece of new infrastructure in the plan and its cost is real: wildcard DNS,
wildcard TLS, host→facility resolution in `proxy.ts`, Clerk cookie and origin
configuration, and a reserved-subdomain list.

_Consequence worth stating plainly:_ the Clerk session cookie will be set on
`.yipyy.com`, so it is shared across every facility subdomain. Signing in at one
facility leaves you signed in at the host of another — and per Clerk's own
documentation quoted in D1, no configuration of a single instance changes that.

**A shared session is not a shared account.** RLS scopes every row from the
token, so the session carries no data across; and D1's stranger gate means the
UI does not pretend otherwise. The two decisions have to be read together: D2 is
what makes the stranger gate load-bearing rather than cosmetic.

_Custom domains_ (`booking.pawradise.com`) are the natural paid-tier follow-on
and are out of scope here; the `facility_domains` mapping this plan introduces
is shaped so they can be added without rework.

**D3 — The owner is invited; they set their own password.**
The wizard creates the facility and records a membership grant, then Clerk
emails an invitation. The owner sets a password or uses Google, the webhook
creates their profile, and the trigger claims the grant. **Nobody at Yipyy ever
holds a credential for a customer's business.**

_Rejected:_ a superadmin-chosen temporary password. It puts a working credential
for someone else's business in Yipyy's hands and, in practice, into an email
thread.

**D4 — Tenancy stays in Postgres, not in Clerk.** Reaffirms ADR 0003. Clerk is
identity only; `facility_memberships` remains the authority on who belongs where
and in what role, because the whole permission cascade
(`my_permissions`, `facility_role_permissions`, `facility_custom_roles`,
`membership_permissions`) is built on it.

**D5 — Provisioning is one transactional server action, not a client sequence.**
A half-created facility — rows but no owner, or an invitation to a facility that
does not exist — is worse than a failed one. The wizard collects; one
platform-admin-only endpoint writes; failure leaves nothing behind.

## Acceptance criteria

A facility that did not exist this morning is open for business by lunchtime,
with no engineer involved.

- [ ] A superadmin completes the add-facility wizard and a real `facilities` row,
      `orgs` row, primary `locations` row and owner `staff` row exist
- [ ] The owner receives an invitation email, sets their own password, signs in,
      and lands in **their** facility dashboard with an active `owner` membership
- [ ] `pawradise.yipyy.com/sign-in` shows Pawradise's name and logo;
      `happy-paws.yipyy.com/sign-in` shows Happy Paws'
- [ ] A customer who signs up at `pawradise.yipyy.com` gets a client record **at
      Pawradise**, and appears in Pawradise's client list and nobody else's
- [ ] The same email signing up at `happy-paws.yipyy.com` gets a _second_ client
      record there, and the two facilities each see only their own
- [ ] A Pawradise customer who opens `happy-paws.yipyy.com` while signed in is
      treated as a **stranger**: no data, no record created, and an explicit
      "continue as `you@…` or use a different account" rather than a silent
      shared-account experience
- [ ] The customer facility switcher offers only facilities the caller actually
      holds a client record at (`client_facility_ids()`), never a full list
- [ ] Facility A's owner, staff and customers can read and write nothing of
      facility B's — asserted per-role in SQL, not inferred from the UI
- [ ] A facility whose subscription is `suspended` cannot be used by its staff,
      and its owner sees a billing screen rather than an empty app
- [ ] Superadmin team members hold distinct platform roles; a support-tier
      platform user cannot delete a facility
- [ ] Reserved subdomains (`www`, `app`, `api`, `admin`, `clerk`, `status`…)
      cannot be claimed as a facility slug
- [ ] Deleting or suspending a facility does not orphan money rows
      (`payments`, `store_credit_entries`, `package_pass_entries`)

## Out of scope

- Custom domains per facility (`booking.pawradise.com`) — D2 above
- Migrating the ~97 client-side `facilityId: 11` fixtures; they are unreachable
  from Postgres and die with the mock layer (see `check:facility-from-session`)
- Real payment capture for subscriptions; this spec models plan **state**, not
  the Stripe integration that drives it
- The 168 `"use client"` pages and the FormWizard system — unrelated debt

## Open questions

1. **Does a facility choose whether customers may self-register?** Some
   businesses want an open signup at their subdomain; others only want clients
   their staff have entered. Assumed configurable, defaulting to **closed**,
   because the reverse default silently exposes a customer list surface.
2. **What happens to a facility's data when its subscription lapses?** Suspension
   is assumed reversible and non-destructive (read-only for the owner, closed for
   staff). Deletion and retention are a separate decision with GDPR weight.
3. **Do orgs matter to the product, or are they a schema artefact?** Every
   facility currently gets its own org. If a chain with several facilities is a
   real customer, `orgs` is where that belongs — and HQ features already assume
   something like it.
