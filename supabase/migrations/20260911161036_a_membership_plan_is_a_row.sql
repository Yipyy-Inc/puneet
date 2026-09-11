-- ============================================================================
-- A membership plan is a row, and a subscriber is on one.
--
-- ── WHAT IT REPLACES ──────────────────────────────────────────────────────
--
-- The Memberships screen's plans and subscribers were `membershipPlans` and
-- `memberships` from `@/data/services-pricing`, copied into `useState`:
-- creating, editing, duplicating, activating or deleting a plan, and
-- pausing, resuming or cancelling a subscriber, all changed the screen and
-- toasted. `customer_memberships` (20260828134018) existed for the audience
-- filter, with a free-text `plan_name` and the note that a plans catalogue
-- was deferred "because nothing edits plans". The screen that edits plans is
-- now real, so the catalogue is too.
--
-- ── THE SHAPE ─────────────────────────────────────────────────────────────
--
-- Columns for what the database must reason about — which facility, its
-- name, whether it is on sale, its cycle, its price and its discount. The
-- editor's long tail (perks, included items, discount rules, grace period,
-- badge colour…) rides in `plan`, the shape the screen already draws,
-- because nothing queries into it.
--
-- A subscription gains the plan it is on, the cycle and price it was sold
-- at, when it next bills, its own long tail (`detail`: the activity log,
-- the pause) and a `paused` status. `plan_name` stays: it is what the
-- audience filter reads and what the client was sold, even if the plan is
-- later renamed or deleted (`plan_id` is ON DELETE SET NULL).
--
-- ── WHO ───────────────────────────────────────────────────────────────────
--
--   plans         read: the facility's staff, and its clients (the portal
--                 shows what they could join); write: manage_services
--   subscriptions read: staff (as before) and now the client it belongs to;
--                 write: edit_clients (as before)
-- ============================================================================

create table if not exists public.membership_plans (
  id uuid primary key default gen_random_uuid(),
  facility_id uuid not null references public.facilities(id) on delete cascade,
  name text not null check (length(btrim(name)) between 1 and 120),
  is_active boolean not null default true,
  billing_cycle text not null default 'monthly'
    check (billing_cycle in ('daily', 'weekly', 'monthly', 'quarterly', 'annually', 'yearly')),
  monthly_price numeric(10, 2) not null default 0 check (monthly_price >= 0),
  discount_percent numeric(5, 2) not null default 0
    check (discount_percent >= 0 and discount_percent <= 100),
  plan jsonb not null default '{}'::jsonb check (jsonb_typeof(plan) = 'object'),
  sort_order integer not null default 0,
  created_by text default (auth.jwt()->>'sub'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.membership_plans is
  'A facility''s membership plans. plan holds the editor''s full shape; the columns are what the database reasons about.';

create index if not exists membership_plans_facility_idx
  on public.membership_plans (facility_id, sort_order);

create or replace function private.membership_plan_touch()
returns trigger
language plpgsql
set search_path = ''
as $fn$
begin
  new.updated_at := now();
  if tg_op = 'UPDATE' then
    -- A plan belongs to the facility that made it.
    new.facility_id := old.facility_id;
    new.created_by := old.created_by;
    new.created_at := old.created_at;
  end if;
  return new;
end;
$fn$;

drop trigger if exists membership_plans_touch on public.membership_plans;
create trigger membership_plans_touch
  before insert or update on public.membership_plans
  for each row execute function private.membership_plan_touch();

alter table public.membership_plans enable row level security;

drop policy if exists membership_plans_read on public.membership_plans;
create policy membership_plans_read on public.membership_plans
  for select using (
    private.is_platform_admin()
    or facility_id in (select private.member_facility_ids())
    or facility_id in (select private.client_facility_ids())
  );

drop policy if exists membership_plans_insert on public.membership_plans;
create policy membership_plans_insert on public.membership_plans
  for insert with check (private.has_permission(facility_id, 'manage_services'));

drop policy if exists membership_plans_update on public.membership_plans;
create policy membership_plans_update on public.membership_plans
  for update
  using (private.has_permission(facility_id, 'manage_services'))
  with check (private.has_permission(facility_id, 'manage_services'));

drop policy if exists membership_plans_delete on public.membership_plans;
create policy membership_plans_delete on public.membership_plans
  for delete using (private.has_permission(facility_id, 'manage_services'));

revoke all on public.membership_plans from public;
revoke all on public.membership_plans from anon;
grant select, insert, update, delete on public.membership_plans to authenticated;

-- ── Subscriptions ─────────────────────────────────────────────────────────

alter table public.customer_memberships
  add column if not exists plan_id uuid references public.membership_plans(id) on delete set null,
  add column if not exists billing_cycle text
    check (billing_cycle is null or billing_cycle in ('daily', 'weekly', 'monthly', 'quarterly', 'annually', 'yearly')),
  add column if not exists price numeric(10, 2) check (price is null or price >= 0),
  add column if not exists next_billing_on date,
  add column if not exists detail jsonb not null default '{}'::jsonb
    check (jsonb_typeof(detail) = 'object');

-- `paused` joins the statuses. Only `active` is unique per client, so a
-- paused plan does not stop a client being put on another.
alter table public.customer_memberships
  drop constraint if exists customer_memberships_status_check;
alter table public.customer_memberships
  add constraint customer_memberships_status_check
  check (status in ('active', 'paused', 'expired', 'cancelled'));

create index if not exists customer_memberships_plan_idx
  on public.customer_memberships (plan_id);

-- A client reads their own membership (the portal's billing page).
drop policy if exists customer_memberships_read_own on public.customer_memberships;
create policy customer_memberships_read_own on public.customer_memberships
  for select using (client_id in (select private.own_client_ids()));

do $verify$
begin
  if has_table_privilege('anon', 'public.membership_plans', 'select') then
    raise exception 'anon can read membership plans';
  end if;
  if has_table_privilege('anon', 'public.customer_memberships', 'select') then
    raise exception 'anon can read memberships';
  end if;
end $verify$;
