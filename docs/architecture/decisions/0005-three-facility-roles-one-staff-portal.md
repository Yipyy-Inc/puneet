# 0005 — Three facility roles, and one staff portal

- **Status:** Accepted
- **Date:** 2026-08-18
- **Deciders:** Product owner, AI operating harness
- **Spec:** [specs/002-multi-tenant-saas/](../../../specs/002-multi-tenant-saas/) — this
  refines the tenancy decided there; it supersedes nothing in it.

## Context

The product owner stated the intended workflow for the first time on 2026-08-18: a Yipyy super
admin creates every facility, invites its admin, and that facility then runs itself with
**three roles — Facility admin, Staff, Customer** — while Yipyy adds a fourth, Super admin, so
the platform team can test and support.

What is built does not match that, in three ways.

**Thirteen roles, not three.** `public.facility_staff_role` is a Postgres enum of thirteen
values — `owner, admin, manager, supervisor, reception, groomer, trainer, caretaker,
daycare_attendant, boarding_attendant, retail, accountant, sanitation` — and the TypeScript
union in `src/types/facility-staff.ts` matches it exactly. Only five are in use in production
(owner 5 grants, manager 1, reception 1, groomer 1, caretaker 1).

**Six portals for those roles.** `customer/` (30 pages), `facility/` (189), `dashboard/` (63),
`employee/` (45), `groomer/` (1), `staff/` (1). `staff/` was already retired to a redirect, and
`groomer/` is a single page reading the `src/data/grooming` fixture. Routing is decided by
`landingPathForClaims`, which sends four roles to `/facility`, `groomer` to its own one-page
portal, and the remaining eight to `/employee`.

**The gates do not enforce the distinction.** `canAccessFacilityPortal` and
`canAccessStaffPortal` in `src/lib/auth/viewer.ts` have byte-identical bodies. Any member of
any facility can reach `/facility` today; only the landing path differs.

The obvious reading of "three roles" is to collapse the thirteen. That would destroy something
that works: those roles are the input to a real RBAC cascade — 168 permission keys, resolved
through `private.resolve_permission` across role presets, facility overrides, custom roles and
per-staff overrides, returning an `access_scope` rather than a boolean. The presets differ
substantially (reception 65 keys, accountant 44, groomer 36, sanitation 24). One Staff role with
one permission set would give a sanitation worker an accountant's access, or everyone the
smallest set.

## Decision

**1. Three roles is an ACCESS model, not a permission model.** A facility membership carries an
access level of exactly **admin** or **staff**. That level decides which portal you get and
nothing else.

**2. The thirteen roles survive as job titles.** They keep typing the permission tables and keep
feeding `private.resolve_permission` unchanged. A groomer and a receptionist are both Staff and
still do not see the same screens. The `facility_staff_role` enum is **not** dropped — it types
five columns and every one of the 930 seeded preset rows.

**3. One Facility admin, with full power.** `owner`, `admin`, `manager` and `supervisor` all map
to admin access, including billing and cancellation. Rejected: keeping `owner` as a separate
tier for billing. Each facility currently has one or two admins who are the owner, and a fourth
tier would reintroduce the distinction this ADR exists to remove. Revisit if a facility ever has
several admins who are not the account holder.

**4. One staff portal.** `/employee` is it — 45 pages, and already described in
`src/app/staff/page.tsx` as "the canonical shell". `/groomer` is retired: its single page read
the `src/data/grooming` fixture, and the live grooming features are under `facility/`.

Retired by **deleting the tree and adding a `redirects()` entry in `next.config.ts`**, not by
the in-app `redirect()` page `/staff` uses. The bookmark people hold is `/groomer/dashboard`,
and a page can only answer for the path it occupies — the `/staff` pattern would have left the
deeper path 404ing. Temporary (307) rather than permanent, so a wrong redirect is not cached in
somebody's browser until they clear it. `/staff` keeps its stub and its now-divergent pattern;
converting it is a one-line follow-up, not part of this change.

**5. The gates start enforcing it.** `canAccessFacilityPortal` requires admin access. Platform
admins still pass, because a super admin has to be able to see a facility to support it.

## Consequences

**The three-role model becomes true without losing anything.** The RolesStudio, custom roles and
per-staff overrides all keep working, on job titles rather than access tiers.

**A staff member loses access to `/facility`.** That is the point, and it is a behaviour change:
today any member reaches it. Nobody in production is affected — the eight non-admin grants are
already routed to `/employee` — but it is the change most likely to surprise.

**The super admin invite has to become real.** `www.yipyy.com/sign-up` was closed on 2026-08-18
so that accounts are created at a facility's address. That makes `/setup/<token>` the only door
for a new platform admin — and today it is a mock: `/api/admin/invite` has **no auth guard**,
mints an **unsigned base64 token whose role field anyone can edit**, and the setup page collects
a password and discards it, writing a localStorage flag instead of an identity. It is also an
unauthenticated relay that sends Yipyy-branded mail to any address a caller names, from the same
domain that carries password resets. Making it real is part of this work rather than a follow-up.

**Four dead role vocabularies become more obviously wrong.** `FacilityRole` (6 values, no
Postgres counterpart), the scheduling `UserRole` (5), the portal `UserRole` (2), and the platform
`AdminRole` (5, localStorage) all disagree with the real enum and with each other. They are left
alone here — removing them touches ~146 files — and recorded in the debt map instead.

## Follow-ups

- Make `www.yipyy.com/sign-in` an unadvertised link. Nothing here blocks it.
- `private.claim_grants_for` still gates on `p_profile_id !~ '^user_'`, a Clerk-shaped check that
  survives only because WorkOS ids happen to share the prefix.
- `canManageCustomers` in `src/lib/auth/viewer.ts` is a hardcoded role list its own comment calls
  a placeholder; route it through the permission cascade.
- Retire the four dead role vocabularies.
