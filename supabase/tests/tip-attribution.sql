-- ============================================================================
-- A tip finds its owner by itself (20260827140000).
--
--   psql "$SUPABASE_DB_URL" -f supabase/tests/tip-attribution.sql
--
-- One transaction, rolled back. Fixture emails are @example.invalid.
--
-- ── WHY EVERY ONE OF THESE IS WORTH A TEST ────────────────────────────────
--
-- The trigger sits on `public.payments`. An exception raised inside it does not
-- fail quietly — it aborts the INSERT, which means it fails a customer's
-- payment at the counter. So the interesting cases are not "does it attribute"
-- but "what does it do when it cannot", and every one of those must end with a
-- payment that still succeeded.
--
-- A2 is the one that protects a person: a manager who has split a tip four ways
-- has answered the question, and a later payment must not re-answer it.
--
-- A5 is the one that protects money in the other direction: a refund lowers
-- `sum(payments.tip)` while the allocations sit still, and the existing ceiling
-- trigger fires on the ALLOCATION table, so nothing else in the schema would
-- ever notice that a groomer is recorded as owed a tip the customer got back.
-- ============================================================================

begin;

set local client_min_messages to warning;

create temp table tap (n serial, name text, ok boolean, detail text);
grant all on tap to authenticated;

create or replace function pg_temp.t(p_name text, p_ok boolean, p_detail text default '')
returns void language sql as $$
  insert into tap(name, ok, detail) values (p_name, p_ok, p_detail);
$$;

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000003a0001', 'att-owner@example.invalid'),
  ('00000000-0000-0000-0000-0000003a0003', 'att-groomer@example.invalid')
on conflict (id) do nothing;

insert into public.profiles (id, email, full_name) values
  ('00000000-0000-0000-0000-0000003a0001', 'att-owner@example.invalid',   'Owner'),
  ('00000000-0000-0000-0000-0000003a0003', 'att-groomer@example.invalid', 'Groomer')
on conflict (id) do update set full_name = excluded.full_name;

insert into public.orgs (id, name, slug) values
  ('00000000-0000-0000-0000-0000003a0010', 'Attribution Org', 'att-org')
on conflict do nothing;

insert into public.facilities (id, org_id, name, slug, legacy_id) values
  ('00000000-0000-0000-0000-0000003a0020', '00000000-0000-0000-0000-0000003a0010',
   'Attribution Facility', 'att-a', 'att-a')
on conflict do nothing;

insert into public.facility_memberships (id, facility_id, profile_id, role, is_active) values
  ('00000000-0000-0000-0000-0000003a0030', '00000000-0000-0000-0000-0000003a0020',
   '00000000-0000-0000-0000-0000003a0001', 'owner', true),
  ('00000000-0000-0000-0000-0000003a0032', '00000000-0000-0000-0000-0000003a0020',
   '00000000-0000-0000-0000-0000003a0003', 'groomer', true)
on conflict (id) do nothing;

insert into public.clients (id, facility_id, name, email) values
  ('00000000-0000-0000-0000-0000003a0040', '00000000-0000-0000-0000-0000003a0020',
   'Owner', 'att-c@example.invalid');

-- `bookings.assigned_staff_id` references `staff(id)` DIRECTLY. It was declared
-- against `facility_memberships` in 20260801120000 and repointed later, and the
-- first version of this file believed the original — every booking here failed
-- its foreign key, which is the cheap version of the same mistake the trigger
-- was making silently.
insert into public.staff
  (id, facility_id, membership_id, legacy_id, first_name, last_name, email,
   primary_role, status) values
  ('00000000-0000-0000-0000-0000003a0050', '00000000-0000-0000-0000-0000003a0020',
   '00000000-0000-0000-0000-0000003a0032',
   'att-s1', 'Amy', 'C', 'amy-att@example.invalid', 'groomer', 'active'),
  ('00000000-0000-0000-0000-0000003a0051', '00000000-0000-0000-0000-0000003a0020',
   null,
   'att-s2', 'Mike', 'R', 'mike-att@example.invalid', 'groomer', 'active');

create or replace function pg_temp.as_user(p_uid uuid) returns void
language plpgsql as $$
begin
  perform set_config('request.jwt.claims',
    case when p_uid is null then ''
         else json_build_object('sub', p_uid::text,
                                'role', 'authenticated')::text end,
    true);
end $$;

/** A completed booking, optionally assigned to a member of staff. */
create or replace function pg_temp.bk(p_staff uuid)
returns uuid language plpgsql as $$
declare v_id uuid;
begin
  insert into public.bookings
    (facility_id, client_id, service, status, start_at, end_at,
     base_price, discount, total_cost, assigned_staff_id)
  values
    ('00000000-0000-0000-0000-0000003a0020', '00000000-0000-0000-0000-0000003a0040',
     'grooming', 'completed', now(), now() + interval '2 hours', 100, 0, 100,
     p_staff)
  returning id into v_id;
  return v_id;
end $$;

/** Put a payment on it — `p_tip` may be negative, which is a refund. */
create or replace function pg_temp.pay(p_booking uuid, p_tip numeric)
returns void language plpgsql as $$
begin
  insert into public.payments
    (facility_id, booking_id, client_id, method, subtotal, tax, tip,
     store_credit_applied, package_pass_applied, amount_charged, grand_total)
  values
    ('00000000-0000-0000-0000-0000003a0020', p_booking,
     '00000000-0000-0000-0000-0000003a0040',
     -- `terminal`, not cash: `payments_cash_shape` wants `cash_received` to
     -- cover the charge, and counting change is not what this file is about.
     'terminal', 0, 0, p_tip, 0, 0, p_tip, p_tip);
end $$;

/** What this facility has chosen, for a service or as its default. */
create or replace function pg_temp.rule(p_json jsonb)
returns void language sql as $$
  insert into public.facility_settings (facility_id, domain, value)
  values ('00000000-0000-0000-0000-0000003a0020', 'tip_attribution', p_json)
  on conflict (facility_id, domain) do update set value = excluded.value;
$$;

-- ── A1: the assigned groomer is attributed, without anybody asking ─────────
do $$
declare v_bk uuid; v_n integer; v_amount numeric; v_method text; v_source text;
begin
  perform pg_temp.as_user('00000000-0000-0000-0000-0000003a0001');
  v_bk := pg_temp.bk('00000000-0000-0000-0000-0000003a0050');
  perform pg_temp.pay(v_bk, 30);

  select count(*), max(amount), max(method), max(source)
    into v_n, v_amount, v_method, v_source
    from public.booking_tip_allocations where booking_id = v_bk;

  perform pg_temp.t(
    'A1  a tip attributes itself to the booking''s groomer',
    v_n = 1 and v_amount = 30 and v_method = 'auto_assigned' and v_source = 'auto',
    format('rows=%s amount=%s method=%s source=%s', v_n, v_amount, v_method, v_source));
exception when others then
  perform pg_temp.t('A1  a tip attributes itself', false, sqlerrm);
end $$;

-- ── A2: a person's split is never overwritten by a later payment ───────────
--
-- The case this rule exists for: a manager splits a $30 tip two ways, then the
-- customer adds $10 at the door. Without the guard the second payment wipes the
-- split and hands the whole $40 to the assigned groomer.
do $$
declare v_bk uuid; v_ref bigint; v_n integer; v_sum numeric; v_auto integer;
begin
  perform pg_temp.as_user('00000000-0000-0000-0000-0000003a0001');
  set local role authenticated;
  v_bk := pg_temp.bk('00000000-0000-0000-0000-0000003a0050');
  perform pg_temp.pay(v_bk, 30);
  select ref into v_ref from public.bookings where id = v_bk;

  perform public.set_booking_tip_split(v_ref, 'custom_amount', jsonb_build_array(
    jsonb_build_object('staffId', '00000000-0000-0000-0000-0000003a0050', 'amount', 20),
    jsonb_build_object('staffId', '00000000-0000-0000-0000-0000003a0051', 'amount', 10)));

  -- A second payment lands on the same booking.
  perform pg_temp.pay(v_bk, 10);
  reset role;

  select count(*), sum(amount), count(*) filter (where source = 'auto')
    into v_n, v_sum, v_auto
    from public.booking_tip_allocations where booking_id = v_bk;

  perform pg_temp.t(
    'A2  a manual split survives a later payment untouched',
    v_n = 2 and v_sum = 30 and v_auto = 0,
    format('rows=%s sum=%s auto=%s (expected 2 / 30 / 0)', v_n, v_sum, v_auto));
exception when others then
  reset role;
  perform pg_temp.t('A2  a manual split survives a later payment', false, sqlerrm);
end $$;

-- ── A3: nobody to pay writes no row, and does not fail the payment ─────────
do $$
declare v_bk uuid; v_n integer; v_paid numeric;
begin
  perform pg_temp.as_user('00000000-0000-0000-0000-0000003a0001');
  -- Assigned to nobody at all: an anonymous daycare drop-off.
  v_bk := pg_temp.bk(null);
  perform pg_temp.pay(v_bk, 25);

  select count(*) into v_n
    from public.booking_tip_allocations where booking_id = v_bk;
  select sum(tip) into v_paid from public.payments where booking_id = v_bk;

  -- The payment MUST still be there. A trigger that raised here would refuse a
  -- customer's card because a booking had no groomer on it.
  perform pg_temp.t(
    'A3  an unassigned booking attributes nothing AND still takes the payment',
    v_n = 0 and v_paid = 25,
    format('rows=%s tip_recorded=%s', v_n, v_paid));
exception when others then
  perform pg_temp.t('A3  an unassigned booking', false, sqlerrm);
end $$;

-- ── A4: pool and none name nobody, so they write nobody ───────────────────
do $$
declare v_bk_pool uuid; v_bk_none uuid; v_pool integer; v_none integer;
begin
  perform pg_temp.as_user('00000000-0000-0000-0000-0000003a0001');

  perform pg_temp.rule('{"defaultMode":"pool","byService":{}}'::jsonb);
  v_bk_pool := pg_temp.bk('00000000-0000-0000-0000-0000003a0050');
  perform pg_temp.pay(v_bk_pool, 15);

  -- Per SERVICE beats the default: grooming is set to `none` while everything
  -- else pools, and this booking is a grooming.
  perform pg_temp.rule('{"defaultMode":"assigned","byService":{"grooming":{"mode":"none"}}}'::jsonb);
  v_bk_none := pg_temp.bk('00000000-0000-0000-0000-0000003a0050');
  perform pg_temp.pay(v_bk_none, 15);

  select count(*) into v_pool
    from public.booking_tip_allocations where booking_id = v_bk_pool;
  select count(*) into v_none
    from public.booking_tip_allocations where booking_id = v_bk_none;

  perform pg_temp.t(
    'A4  pool and none write no allocation (and per-service beats the default)',
    v_pool = 0 and v_none = 0,
    format('pool_rows=%s none_rows=%s', v_pool, v_none));

  perform pg_temp.rule('{"defaultMode":"assigned","byService":{}}'::jsonb);
exception when others then
  perform pg_temp.rule('{"defaultMode":"assigned","byService":{}}'::jsonb);
  perform pg_temp.t('A4  pool and none write no allocation', false, sqlerrm);
end $$;

-- ── A5: a refund takes the attribution back with it ───────────────────────
do $$
declare v_bk uuid; v_part numeric; v_full integer;
begin
  perform pg_temp.as_user('00000000-0000-0000-0000-0000003a0001');
  v_bk := pg_temp.bk('00000000-0000-0000-0000-0000003a0050');
  perform pg_temp.pay(v_bk, 40);

  -- Half the tip goes back.
  perform pg_temp.pay(v_bk, -20);
  select max(amount) into v_part
    from public.booking_tip_allocations where booking_id = v_bk;

  -- And then the rest of it.
  perform pg_temp.pay(v_bk, -20);
  select count(*) into v_full
    from public.booking_tip_allocations where booking_id = v_bk;

  perform pg_temp.t(
    'A5  a partial refund scales the allocation, a full refund removes it',
    v_part = 20 and v_full = 0,
    format('after_partial=%s rows_after_full=%s (expected 20 / 0)', v_part, v_full));
exception when others then
  perform pg_temp.t('A5  a refund takes the attribution back', false, sqlerrm);
end $$;

-- ── A6: marking a payout needs edit_payroll, and is not repeatable ─────────
do $$
declare v_bk uuid; v_first integer; v_second integer; v_refused boolean := false;
begin
  perform pg_temp.as_user('00000000-0000-0000-0000-0000003a0001');
  v_bk := pg_temp.bk('00000000-0000-0000-0000-0000003a0050');
  perform pg_temp.pay(v_bk, 12);

  -- The groomer whose tip it is may not declare it paid.
  perform pg_temp.as_user('00000000-0000-0000-0000-0000003a0003');
  set local role authenticated;
  begin
    perform public.mark_tips_paid(
      '00000000-0000-0000-0000-0000003a0020',
      '00000000-0000-0000-0000-0000003a0050',
      current_date - 1, current_date + 1, null);
  exception when others then
    v_refused := true;
  end;
  reset role;

  perform pg_temp.as_user('00000000-0000-0000-0000-0000003a0001');
  set local role authenticated;
  v_first := public.mark_tips_paid(
    '00000000-0000-0000-0000-0000003a0020',
    '00000000-0000-0000-0000-0000003a0050',
    current_date - 1, current_date + 1, 'e-transfer');
  -- Running it again must change NOTHING, or a second payout run restamps
  -- settled tips with today and the owner pays them twice.
  v_second := public.mark_tips_paid(
    '00000000-0000-0000-0000-0000003a0020',
    '00000000-0000-0000-0000-0000003a0050',
    current_date - 1, current_date + 1, 'e-transfer');
  reset role;

  perform pg_temp.t(
    'A6  a groomer cannot mark their own tips paid; a second run pays nothing again',
    v_refused and v_first >= 1 and v_second = 0,
    format('refused=%s first=%s second=%s', v_refused, v_first, v_second));
exception when others then
  reset role;
  perform pg_temp.t('A6  marking a payout', false, sqlerrm);
end $$;

-- ── A7: the payout RPC is not reachable without a session ─────────────────
--
-- A revoke is not verified by having been written: one naming a privilege the
-- role does not hold succeeds silently and looks identical to one that worked.
-- `public` and `anon` are DIFFERENT grants and both have to go.
do $$
declare v_pub boolean; v_anon boolean; v_auth boolean;
begin
  v_pub  := has_function_privilege('public', 'public.mark_tips_paid(uuid, uuid, date, date, text)', 'execute');
  v_anon := has_function_privilege('anon',   'public.mark_tips_paid(uuid, uuid, date, date, text)', 'execute');
  v_auth := has_function_privilege('authenticated', 'public.mark_tips_paid(uuid, uuid, date, date, text)', 'execute');

  perform pg_temp.t(
    'A7  mark_tips_paid is revoked from public AND anon, granted to authenticated',
    v_pub = false and v_anon = false and v_auth = true,
    format('public=%s anon=%s authenticated=%s', v_pub, v_anon, v_auth));
exception when others then
  perform pg_temp.t('A7  mark_tips_paid grants', false, sqlerrm);
end $$;

-- ── Report ────────────────────────────────────────────────────────────────

select n, case when ok then 'ok  ' else 'FAIL' end as result, name, detail
  from tap order by n;

do $$
declare v_failed integer;
begin
  select count(*) into v_failed from tap where not ok;
  if v_failed > 0 then
    raise exception '% assertion(s) failed', v_failed;
  end if;
end $$;

rollback;
