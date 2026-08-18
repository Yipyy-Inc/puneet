# Onboarding and roles

Who creates whom, who may reach what, and how somebody gets an account. This is the
product owner's statement of the intended workflow, recorded 2026-08-18. Where the code
does not match it yet, that is called out rather than smoothed over.

The mechanics behind it are decided in
[ADR 0005](../architecture/decisions/0005-three-facility-roles-one-staff-portal.md), and the
tenancy it rests on in [spec 002](../../specs/002-multi-tenant-saas/spec.md).

---

## The two addresses

Yipyy answers on two kinds of hostname, and which one you are on decides what the page is
for. `src/proxy.ts` reads the `Host` header, [`facilitySlugFromHost`](../../src/lib/facility-host.ts)
turns it into a slug, and every auth screen reads it.

| Address            | Whose          | What it is for                                                                 |
| ------------------ | -------------- | ------------------------------------------------------------------------------ |
| `www.yipyy.com`    | Yipyy's        | **Yipyy's own console.** Where the platform team signs in to run the software. |
| `<slug>.yipyy.com` | the facility's | **That business's front door.** Its staff and its customers.                   |

`www.yipyy.com/sign-up` deliberately offers no form — it explains that accounts are created
at a facility's address. A credential created on the apex would open nothing, because every
portal gate requires a membership and RLS returns no rows without one.

> **Intended, not yet done:** the apex sign-in becomes an unadvertised link. Nothing depends
> on it being discoverable.

## Who creates what

```
Yipyy super admin ──creates──▶ Facility ──invites──▶ Facility admin
                                                          │
                                                          ├──invites──▶ Staff
                                                          └──opens the door for──▶ Customers
```

**A facility cannot create itself.** There is no self-serve business signup, by design. The
only path is a Yipyy super admin using the wizard at `dashboard/facilities`, which calls
`provision_facility` — a `SECURITY DEFINER` function that guards itself on platform-admin as
its first statement, so the check does not depend on the route.

This is how Doggieville Mtl and Pawradise were created, and it works today.

## The four roles

Three belong to a facility. The fourth is Yipyy's, and exists so the platform team can
support and test.

| Role               | Where it lives                       | Lands on              | May reach                                                                   |
| ------------------ | ------------------------------------ | --------------------- | --------------------------------------------------------------------------- |
| **Super admin**    | `platform_memberships`               | `/dashboard`          | everything, including any facility — needed to test and support             |
| **Facility admin** | `facility_memberships`, admin access | `/facility/dashboard` | that facility's whole business: bookings, clients, staff, services, billing |
| **Staff**          | `facility_memberships`, staff access | `/employee`           | the work surface, scoped by their permissions                               |
| **Customer**       | a `clients` row with `profile_id`    | `/customer/dashboard` | their own pets, bookings, invoices                                          |

Two things about that table are easy to get wrong:

**A customer is not a membership.** They are a `clients` row belonging to one facility. That
is what makes the same person a customer at two businesses with one login — see below.

**Facility admin and Staff are an ACCESS model, not a permission model.** Underneath, a staff
member still carries a **job title** — groomer, reception, caretaker, accountant and so on —
and that title selects a permission template from the 168-key catalog in
`src/types/facility-staff.ts`. A groomer and a receptionist are both Staff; they do not see the
same screens. Collapsing to three roles simplified _who gets which portal_, not _what each
person may do_.

## One login, many businesses

The question this model exists to answer: **you board your dog at Doggieville Mtl and have him
groomed at another facility. How does the system know which one you are signing up for?**

The hostname tells it. And the account is not duplicated:

|                                   | table      | unique on                     | meaning                       |
| --------------------------------- | ---------- | ----------------------------- | ----------------------------- |
| your login                        | `profiles` | `lower(email)`                | one Yipyy credential, forever |
| your relationship with a business | `clients`  | `(facility_id, lower(email))` | one record **per facility**   |

So you at Doggieville and you at the other facility are **one login and two client records**.
Separate pets, bookings, history and invoices at each; neither business sees the other's.

Because the credential is shared, the _second_ facility a person joins is a normal event, not
an error. Signing up there with an address that already has an account answers
"You already have an account — the same password works here" and offers sign-in, rather than
the provider's raw "user already exists".

## How somebody gets an account

Three invitations, and they do not work the same way.

### Facility admin and Staff — the address is the credential

`invite-owner` and `staff/[id]/invite` record a **grant** against an email address and send a
link to the **facility's own host** ([`facilityOrigin`](../../src/lib/public-origin.ts) — the
slug comes from the facility row, never from the request).

**There is no token in that email.** Access is tied to the address, so forwarding the message
grants nothing and a leaked send is not an incident. The chain:

```
grant recorded ──▶ email links to <slug>.yipyy.com/sign-up
              ──▶ they sign up however they like (password or Google)
              ──▶ the WorkOS webhook writes profiles
              ──▶ trigger profiles_claim_membership_grants claims the grant
              ──▶ the membership is live
```

The claim is a trigger rather than an exposed function on purpose: a trigger has no URL, so
there is no endpoint anybody can call to grant themselves a membership by naming somebody
else's address.

### Super admin — a real token, because there is no open door

The platform team is invited to `www.yipyy.com/setup/<token>`. It cannot use the
grant-then-claim pattern above, because the apex has no open sign-up page to send anybody to —
so this one needs a genuine token.

> **Not true yet.** This is the one part of the workflow that is a mock. See ADR 0005
> §Consequences and the debt map.

## Customers

A customer signs up at the facility's own address and then **joins** — two acts, deliberately
separate. Creating a login does not put somebody on a business's client list.

```
<slug>.yipyy.com/sign-up ──▶ verify the address ──▶ /join ──▶ a clients row
```

Whether `/join` accepts a stranger is the facility's decision: `allow_customer_signup`, asked
during provisioning and changeable any time from their settings. When it is off, `/join` still
lets somebody **claim a record the facility already created** for their address — being entered
by the front desk is itself an invitation.

## What is deliberately impossible

- A business cannot sign itself up.
- A facility admin cannot grant themselves, or anybody, access to another facility.
- A customer record at one facility never implies one at another.
- A staff invitation cannot name a role: the role is read from the staff row, so somebody with
  `manage_staff` cannot mint an owner grant for an address they control.
