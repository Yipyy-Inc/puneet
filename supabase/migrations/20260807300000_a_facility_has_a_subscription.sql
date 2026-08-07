-- ============================================================================
-- A facility has a subscription, and a lapsed one closes the doors.
--
-- Spec 002, phase 7. Plans, invoices and dunning existed only as mock objects,
-- so "suspended" was a badge on a screen and nothing more: a facility that had
-- not paid in a year worked exactly as well as one that had.
--
-- It is also why the facilities list could not show a real facility. That
-- screen joins plan, MRR and status out of src/data by NUMERIC id — a
-- provisioned facility has none of those, so it simply was not there. The
-- superadmin who reported "I created a facility and cannot see it" was seeing
-- the absence of this table.
--
-- ── SUSPENSION IS ENFORCED HERE, NOT IN THE PORTAL ────────────────────────
--
-- A portal gate is a redirect; RLS is the answer to a request. If suspension
-- lived only in a layout, the API routes would keep serving a suspended
-- facility's data to anything that skipped the UI — which is every script, and
-- every screen we have not gated yet.
--
-- So it goes in `private.member_facility_ids()`, the function 60+ policies
-- already use to scope staff to their facilities. A suspended facility drops
-- out of that set and the whole application goes quiet at once, without
-- rewriting a single policy.
--
-- ── WHAT SUSPENSION DOES NOT TOUCH ────────────────────────────────────────
--
-- Their DATA. Nothing is deleted and nothing is anonymised; the rows sit
-- exactly where they were and come back the moment the subscription is active
-- again. Suspension is a locked door, not a bonfire.
--
-- And not the OWNER's route to fix it: `client_facility_ids()` is untouched, and
-- the billing surfaces read the subscription directly rather than through
-- member_facility_ids, so somebody can still pay. A suspension a customer
-- cannot undo is an outage we caused.
-- ============================================================================

do $do$
begin
  if not exists (select 1 from pg_type where typname = 'subscription_status') then
    create type public.subscription_status as enum (
      'trialing',
      'active',
      'past_due',   -- payment failed; still working, dunning has started
      'suspended',  -- doors closed, data intact
      'cancelled'
    );
  end if;
end $do$;

create table if not exists public.facility_subscriptions (
  facility_id      uuid primary key references public.facilities(id) on delete cascade,
  tier_id          text not null default 'tier-beginner',
  tier_name        text not null default 'Puppy',
  status           public.subscription_status not null default 'trialing',
  billing_cycle    text not null default 'monthly'
                     check (billing_cycle in ('monthly','quarterly','yearly')),
  amount_cents     integer not null default 0 check (amount_cents >= 0),
  currency         text not null default 'USD',
  seats            integer check (seats is null or seats > 0),
  trial_ends_at    timestamptz,
  period_start     timestamptz not null default now(),
  period_end       timestamptz,
  cancelled_at     timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- Money in CENTS, integer. A subscription total is money, and money in a
-- float is money that eventually disagrees with itself.

drop trigger if exists facility_subscriptions_set_updated_at on public.facility_subscriptions;
create trigger facility_subscriptions_set_updated_at
  before update on public.facility_subscriptions
  for each row execute function private.set_updated_at();

alter table public.facility_subscriptions enable row level security;

-- A facility's own people may READ their plan — they have to, to see what they
-- are paying for and that it lapsed. Scoped through the MEMBERSHIP table
-- directly rather than member_facility_ids(), because that function is about to
-- start excluding suspended facilities and this is the one screen a suspended
-- facility's owner still needs.
drop policy if exists facility_subscriptions_read on public.facility_subscriptions;
create policy facility_subscriptions_read on public.facility_subscriptions
  for select to authenticated
  using (
    private.is_platform_admin()
    or exists (
      select 1 from public.facility_memberships m
       where m.facility_id = facility_subscriptions.facility_id
         and m.profile_id = (select auth.jwt()->>'sub')
         and m.is_active
    )
  );

-- Only the platform sells. A facility cannot write its own plan, and upgrades
-- go through a commercial flow rather than a PATCH.
drop policy if exists facility_subscriptions_write on public.facility_subscriptions;
create policy facility_subscriptions_write on public.facility_subscriptions
  for insert to authenticated
  with check (private.is_platform_admin());

drop policy if exists facility_subscriptions_update on public.facility_subscriptions;
create policy facility_subscriptions_update on public.facility_subscriptions
  for update to authenticated
  using (private.is_platform_admin())
  with check (private.is_platform_admin());

-- ── What a facility sells ──────────────────────────────────────────────────
--
-- The wizard has collected business types since before any of this existed and
-- then discarded them. The facilities list shows them as badges, which is the
-- other half of why a provisioned facility looked empty there.

alter table public.facilities
  add column if not exists business_types text[] not null default '{}';

-- ── Every existing facility gets a subscription ────────────────────────────
--
-- Trialing, not active: nobody has paid, and recording that they had would be
-- the kind of convenient fiction this whole spec exists to remove.

insert into public.facility_subscriptions (facility_id, trial_ends_at, period_end)
select f.id, now() + interval '30 days', now() + interval '30 days'
  from public.facilities f
on conflict (facility_id) do nothing;

-- ── The gate ───────────────────────────────────────────────────────────────
--
-- One function, 60+ policies. A facility whose subscription is `suspended` or
-- `cancelled` leaves the set, and every staff-facing read and write stops.
--
-- A facility with NO subscription row still counts as active. Absence must not
-- be a lockout: a provisioning that failed between the facility insert and the
-- subscription insert would otherwise create a business nobody can enter, and
-- that failure mode is worse than a day of unpaid access.

create or replace function private.member_facility_ids()
returns setof uuid
language sql
stable
security definer
set search_path to ''
as $fn$
  select m.facility_id
    from public.facility_memberships m
    left join public.facility_subscriptions s on s.facility_id = m.facility_id
   where m.profile_id = (select auth.jwt()->>'sub')
     and m.is_active
     and coalesce(s.status, 'active') not in ('suspended', 'cancelled');
$fn$;

-- ── Changing status ────────────────────────────────────────────────────────

create or replace function public.set_subscription_status(
  p_facility_id uuid,
  p_status      public.subscription_status
)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $fn$
declare v_previous public.subscription_status;
begin
  -- Suspending a business is destructive in every way that matters to the
  -- person it happens to, so it sits with the other superadmin-only actions
  -- rather than with "any platform member".
  if not private.has_platform_role('superadmin') then
    raise exception 'Only a superadmin may change a subscription''s status.'
      using errcode = '42501';
  end if;

  select status into v_previous from public.facility_subscriptions
   where facility_id = p_facility_id;
  if v_previous is null then
    raise exception 'That facility has no subscription.' using errcode = 'no_data_found';
  end if;

  update public.facility_subscriptions
     set status       = p_status,
         cancelled_at = case when p_status = 'cancelled' then now() else null end
   where facility_id = p_facility_id;

  return jsonb_build_object(
    'facilityId', p_facility_id,
    'from',       v_previous,
    'to',         p_status);
end;
$fn$;

revoke execute on function public.set_subscription_status(uuid, public.subscription_status)
  from public, anon;
grant execute on function public.set_subscription_status(uuid, public.subscription_status)
  to authenticated;

-- ── Corrections found by running the gate, not by reading it ───────────────
--
-- Three, and each is the same mistake in a different place: assuming one
-- chokepoint covered everything.

-- 1. member_facility_ids() was only HALF the chokepoint. Most staff-facing
--    tables — clients, bookings, payments — scope through has_permission(),
--    which reads facility_memberships directly and knew nothing about
--    subscriptions. A suspended facility's staff could still read every client.
--    Caught by asserting the client COUNT rather than trusting the function.
create or replace function private.has_permission(p_facility_id uuid, p_permission text)
returns boolean
language sql
stable
security definer
set search_path to ''
as $fn$
  select private.is_platform_admin() or exists (
    select 1
      from public.facility_memberships m
      left join public.facility_subscriptions s on s.facility_id = m.facility_id
     where m.profile_id  = (select auth.jwt()->>'sub')
       and m.facility_id = p_facility_id
       and m.is_active
       and coalesce(s.status, 'active') not in ('suspended', 'cancelled')
       and coalesce(private.resolve_permission(m.id, p_permission),
                    'none'::public.access_scope) <> 'none'::public.access_scope
  );
$fn$;

-- 2. Putting suspension in member_facility_ids() closed one door too many:
--    facilities_read scopes through it, so a suspended facility's own OWNER
--    could no longer see the facility ROW — not its name, not its slug. The
--    billing screen could not name the business it was asking them to pay for.
--
--    The two questions were conflated and are now separate:
--      member_facility_ids()      which facilities may I OPERATE  (subscription-aware)
--      member_facility_ids_all()  which am I PART OF              (membership only)
create or replace function private.member_facility_ids_all()
returns setof uuid
language sql
stable
security definer
set search_path to ''
as $fn$
  select m.facility_id
    from public.facility_memberships m
   where m.profile_id = (select auth.jwt()->>'sub')
     and m.is_active;
$fn$;

grant execute on function private.member_facility_ids_all() to authenticated;

drop policy if exists facilities_read on public.facilities;
create policy facilities_read on public.facilities
  for select to authenticated
  using (
    private.is_platform_admin()
    -- Membership only, deliberately. You can always see THAT your business
    -- exists and that it is suspended; you cannot operate it.
    or id in (select private.member_facility_ids_all())
    or id in (select private.client_facility_ids())
  );

-- 3. provision_facility predates this table, so it created businesses with no
--    plan at all — nothing to bill, nothing to suspend, and nothing for the
--    facilities list to show. It now creates the subscription, and carries
--    `business_types` through, which the wizard has collected and discarded
--    since before any of this existed. (Applied as its own migration; see
--    20260807300000's sibling in the migration history.)
