-- ============================================================================
-- A membership plan is a row, and a subscriber is on one (20260911161036).
--
--   psql "$SUPABASE_DB_URL" -f supabase/tests/membership-plans.sql
--
-- One transaction, rolled back. Impersonated through request.jwt.claims and
-- `set local role`, never the connection's own role, which bypasses RLS.
--
--   M1  the owner creates a plan                          (positive control)
--   M2  a client of the facility reads its plans (the portal shows them)
--   M3  a client cannot create a plan
--   M4  someone with no tie to the facility sees no plan
--   M5  a plan cannot be moved to another facility by editing it
--   M6  the owner puts the client on the plan; the client reads their own
--   M7  a second ACTIVE plan for the same client is refused
--   M8  a PAUSED plan does not stop the client joining another
--   M9  deleting a plan keeps its subscribers, by name, with no plan id
--   M10 anon holds nothing on either table
-- ============================================================================

begin;

set local client_min_messages to warning;

create temp table tap (n serial, name text, ok boolean, detail text);
grant all on tap to authenticated, anon;

create or replace function pg_temp.t(p_name text, p_ok boolean, p_detail text default '')
returns void language sql as $$
  insert into tap(name, ok, detail) values (p_name, p_ok, p_detail);
$$;

create or replace function pg_temp.as_user(p_uid uuid) returns void
language plpgsql as $$
begin
  perform set_config('request.jwt.claims',
    json_build_object('sub', p_uid::text, 'role', 'authenticated')::text, true);
end $$;

create temp table state (key text primary key, value text);
grant all on state to authenticated, anon;

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000002a9001', 'mp-owner@example.invalid'),
  ('00000000-0000-0000-0000-0000002a9003', 'mp-customer@example.invalid'),
  ('00000000-0000-0000-0000-0000002a9004', 'mp-stranger@example.invalid')
on conflict (id) do nothing;

insert into public.profiles (id, email, full_name) values
  ('00000000-0000-0000-0000-0000002a9001', 'mp-owner@example.invalid', 'MP Owner'),
  ('00000000-0000-0000-0000-0000002a9003', 'mp-customer@example.invalid', 'MP Customer'),
  ('00000000-0000-0000-0000-0000002a9004', 'mp-stranger@example.invalid', 'MP Stranger')
on conflict (id) do update set full_name = excluded.full_name;

insert into public.orgs (id, name, slug) values
  ('00000000-0000-0000-0000-0000002a9010', 'MP Org', 'mp-org')
on conflict do nothing;

insert into public.facilities (id, org_id, name, slug, legacy_id) values
  ('00000000-0000-0000-0000-0000002a9020', '00000000-0000-0000-0000-0000002a9010',
   'MP Facility', 'mp-fac', 'mp-fac'),
  ('00000000-0000-0000-0000-0000002a9021', '00000000-0000-0000-0000-0000002a9010',
   'MP Other Facility', 'mp-fac-2', 'mp-fac-2')
on conflict do nothing;

insert into public.facility_memberships (id, facility_id, profile_id, role, is_active) values
  ('00000000-0000-0000-0000-0000002a9030', '00000000-0000-0000-0000-0000002a9020',
   '00000000-0000-0000-0000-0000002a9001', 'owner', true)
on conflict (id) do nothing;

insert into public.clients (id, facility_id, name, email, profile_id) values
  ('00000000-0000-0000-0000-0000002a9040', '00000000-0000-0000-0000-0000002a9020',
   'MP Household', 'mp-c1@example.invalid', '00000000-0000-0000-0000-0000002a9003');

-- ── M1: the owner creates a plan ────────────────────────────────────────────
do $$
declare v_plan uuid;
begin
  perform pg_temp.as_user('00000000-0000-0000-0000-0000002a9001');
  set local role authenticated;
  insert into public.membership_plans
    (facility_id, name, billing_cycle, monthly_price, discount_percent, plan)
  values
    ('00000000-0000-0000-0000-0000002a9020', 'MP Gold', 'monthly', 89, 10,
     '{"perks":["Priority booking"]}')
  returning id into v_plan;
  insert into public.membership_plans
    (facility_id, name, monthly_price)
  values ('00000000-0000-0000-0000-0000002a9020', 'MP Silver', 49);
  reset role;
  insert into state values ('plan', v_plan::text);
  perform pg_temp.t('M1  the owner creates a plan', v_plan is not null);
exception when others then
  reset role; perform pg_temp.t('M1  the owner creates a plan', false, sqlerrm);
end $$;

-- ── M2: the facility's client reads its plans ───────────────────────────────
do $$
declare v_seen integer;
begin
  perform pg_temp.as_user('00000000-0000-0000-0000-0000002a9003');
  set local role authenticated;
  select count(*) into v_seen from public.membership_plans
   where facility_id = '00000000-0000-0000-0000-0000002a9020';
  reset role;
  perform pg_temp.t('M2  a client of the facility reads its plans',
    v_seen = 2, format('seen=%s', v_seen));
exception when others then
  reset role; perform pg_temp.t('M2  client reads plans', false, sqlerrm);
end $$;

-- ── M3: a client cannot create a plan ───────────────────────────────────────
do $$
declare v_raised boolean;
begin
  perform pg_temp.as_user('00000000-0000-0000-0000-0000002a9003');
  set local role authenticated;
  begin
    insert into public.membership_plans (facility_id, name)
    values ('00000000-0000-0000-0000-0000002a9020', 'MP Free for me');
    v_raised := false;
  exception when insufficient_privilege then v_raised := true; end;
  reset role;
  perform pg_temp.t('M3  a client cannot create a plan', v_raised,
    format('raised=%s', v_raised));
exception when others then
  reset role; perform pg_temp.t('M3  client refused', false, sqlerrm);
end $$;

-- ── M4: a stranger sees nothing ─────────────────────────────────────────────
do $$
declare v_seen integer;
begin
  perform pg_temp.as_user('00000000-0000-0000-0000-0000002a9004');
  set local role authenticated;
  select count(*) into v_seen from public.membership_plans
   where facility_id = '00000000-0000-0000-0000-0000002a9020';
  reset role;
  perform pg_temp.t('M4  someone with no tie to the facility sees no plan',
    v_seen = 0, format('seen=%s', v_seen));
exception when others then
  reset role; perform pg_temp.t('M4  stranger sees none', false, sqlerrm);
end $$;

-- ── M5: editing a plan cannot move it ───────────────────────────────────────
do $$
declare v_plan uuid; v_facility uuid;
begin
  select value::uuid into v_plan from state where key = 'plan';
  perform pg_temp.as_user('00000000-0000-0000-0000-0000002a9001');
  set local role authenticated;
  update public.membership_plans
     set facility_id = '00000000-0000-0000-0000-0000002a9021', name = 'MP Gold+'
   where id = v_plan;
  reset role;
  select facility_id into v_facility from public.membership_plans where id = v_plan;
  perform pg_temp.t('M5  a plan cannot be moved to another facility',
    v_facility = '00000000-0000-0000-0000-0000002a9020',
    format('facility=%s', v_facility));
exception when others then
  reset role;
  -- A refusal is as good as the trigger putting it back.
  perform pg_temp.t('M5  a plan cannot be moved to another facility',
    sqlstate in ('42501', '23514'), sqlerrm);
end $$;

-- ── M6: the owner puts the client on the plan; the client reads it ─────────
do $$
declare v_plan uuid; v_sub uuid; v_seen integer;
begin
  select value::uuid into v_plan from state where key = 'plan';
  perform pg_temp.as_user('00000000-0000-0000-0000-0000002a9001');
  set local role authenticated;
  insert into public.customer_memberships
    (facility_id, client_id, plan_id, plan_name, status, starts_on,
     billing_cycle, price, discount_percent, next_billing_on, detail)
  values
    ('00000000-0000-0000-0000-0000002a9020', '00000000-0000-0000-0000-0000002a9040',
     v_plan, 'MP Gold', 'active', current_date, 'monthly', 89, 10,
     current_date + 30, '{"activityLog":[]}')
  returning id into v_sub;
  reset role;
  insert into state values ('sub', v_sub::text);

  perform pg_temp.as_user('00000000-0000-0000-0000-0000002a9003');
  set local role authenticated;
  select count(*) into v_seen from public.customer_memberships where id = v_sub;
  reset role;
  perform pg_temp.t('M6  the client reads their own membership',
    v_seen = 1, format('seen=%s', v_seen));
exception when others then
  reset role; perform pg_temp.t('M6  join and read own', false, sqlerrm);
end $$;

-- ── M7: one active plan per client ──────────────────────────────────────────
do $$
declare v_raised boolean;
begin
  perform pg_temp.as_user('00000000-0000-0000-0000-0000002a9001');
  set local role authenticated;
  begin
    insert into public.customer_memberships
      (facility_id, client_id, plan_name, status)
    values ('00000000-0000-0000-0000-0000002a9020',
            '00000000-0000-0000-0000-0000002a9040', 'MP Silver', 'active');
    v_raised := false;
  exception when unique_violation then v_raised := true; end;
  reset role;
  perform pg_temp.t('M7  a second active plan for one client is refused',
    v_raised, format('raised=%s', v_raised));
exception when others then
  reset role; perform pg_temp.t('M7  one active', false, sqlerrm);
end $$;

-- ── M8: a paused plan frees the client to join another ─────────────────────
do $$
declare v_sub uuid; v_other uuid;
begin
  select value::uuid into v_sub from state where key = 'sub';
  perform pg_temp.as_user('00000000-0000-0000-0000-0000002a9001');
  set local role authenticated;
  update public.customer_memberships set status = 'paused' where id = v_sub;
  insert into public.customer_memberships
    (facility_id, client_id, plan_name, status)
  values ('00000000-0000-0000-0000-0000002a9020',
          '00000000-0000-0000-0000-0000002a9040', 'MP Silver', 'active')
  returning id into v_other;
  reset role;
  perform pg_temp.t('M8  a paused plan does not block another',
    v_other is not null);
exception when others then
  reset role; perform pg_temp.t('M8  paused frees the slot', false, sqlerrm);
end $$;

-- ── M9: deleting the plan keeps its subscribers ────────────────────────────
do $$
declare v_plan uuid; v_sub uuid; v_plan_id uuid; v_name text;
begin
  select value::uuid into v_plan from state where key = 'plan';
  select value::uuid into v_sub from state where key = 'sub';
  perform pg_temp.as_user('00000000-0000-0000-0000-0000002a9001');
  set local role authenticated;
  delete from public.membership_plans where id = v_plan;
  reset role;
  select plan_id, plan_name into v_plan_id, v_name
    from public.customer_memberships where id = v_sub;
  perform pg_temp.t('M9  a deleted plan leaves its subscribers, by name',
    v_plan_id is null and v_name = 'MP Gold',
    format('plan_id=%s name=%s', v_plan_id, v_name));
exception when others then
  reset role; perform pg_temp.t('M9  delete keeps subscribers', false, sqlerrm);
end $$;

-- ── M10: anon holds nothing ─────────────────────────────────────────────────
do $$
begin
  perform pg_temp.t('M10 anon holds nothing on membership_plans',
    not has_table_privilege('anon', 'public.membership_plans', 'select')
      and not has_table_privilege('anon', 'public.membership_plans', 'insert')
      and not has_table_privilege('anon', 'public.membership_plans', 'update')
      and not has_table_privilege('anon', 'public.membership_plans', 'delete'));
  perform pg_temp.t('M10 anon reads no memberships',
    not has_table_privilege('anon', 'public.customer_memberships', 'select'));
end $$;

select case when ok then '  PASS  ' else '> FAIL <' end as result, name, detail
  from tap order by n;

select count(*) filter (where ok) || ' passed, '
    || count(*) filter (where not ok) || ' failed' as summary
  from tap;

rollback;
