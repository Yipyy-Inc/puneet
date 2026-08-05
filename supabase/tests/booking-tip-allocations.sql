-- ============================================================================
-- A tip is owed to somebody (20260806940000).
--
--   psql "$(supabase status -o json | jq -r .DB_URL)" \
--     -f supabase/tests/booking-tip-allocations.sql
--
-- One transaction, rolled back. Fixture emails are @example.invalid.
--
-- ── WHAT THIS FILE IS REALLY ABOUT ─────────────────────────────────────────
--
-- 1. YOU CANNOT PAY OUT MORE TIP THAN WAS COLLECTED (T2). The ceiling is
--    `sum(payments.tip)`, which lives in another table, so it is a trigger
--    rather than a CHECK. T3 is its positive control — remove the ceiling and
--    T2 goes green while T3 stays green, which is the whole point of having
--    both.
--
-- 2. SAVING A SPLIT REPLACES IT (T4). The modal edits a whole split, so a name
--    dropped from it must lose its allocation rather than keep a stale one.
--
-- 3. THE DIRECT WRITES ARE SHUT (T6, T7), and they fail DIFFERENTLY: the INSERT
--    raises 42501, the DELETE matches nothing and reports success. That
--    asymmetry is why `set_booking_tip_split` exists rather than a client-side
--    delete-then-insert.
--
-- 4. ONE FACILITY CANNOT TIP ANOTHER'S EMPLOYEE (T5). The staff id arrives from
--    the client and is re-resolved against the booking's own facility.
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
  ('00000000-0000-0000-0000-0000002f0001', 'tip-owner@example.invalid'),
  ('00000000-0000-0000-0000-0000002f0002', 'tip-recep@example.invalid'),
  ('00000000-0000-0000-0000-0000002f0003', 'tip-groomer@example.invalid')
on conflict (id) do nothing;

insert into public.profiles (id, email, full_name) values
  ('00000000-0000-0000-0000-0000002f0001', 'tip-owner@example.invalid',   'Owner'),
  ('00000000-0000-0000-0000-0000002f0002', 'tip-recep@example.invalid',   'Reception'),
  ('00000000-0000-0000-0000-0000002f0003', 'tip-groomer@example.invalid', 'Groomer')
on conflict (id) do update set full_name = excluded.full_name;

insert into public.orgs (id, name, slug) values
  ('00000000-0000-0000-0000-0000002f0010', 'Tip Org', 'tip-org')
on conflict do nothing;

insert into public.facilities (id, org_id, name, slug, legacy_id) values
  ('00000000-0000-0000-0000-0000002f0020', '00000000-0000-0000-0000-0000002f0010',
   'Tip Facility', 'tip-a', 'tip-a'),
  ('00000000-0000-0000-0000-0000002f0021', '00000000-0000-0000-0000-0000002f0010',
   'Other Facility', 'tip-b', 'tip-b')
on conflict do nothing;

insert into public.facility_memberships (id, facility_id, profile_id, role, is_active) values
  ('00000000-0000-0000-0000-0000002f0030', '00000000-0000-0000-0000-0000002f0020',
   '00000000-0000-0000-0000-0000002f0001', 'owner', true),
  ('00000000-0000-0000-0000-0000002f0031', '00000000-0000-0000-0000-0000002f0020',
   '00000000-0000-0000-0000-0000002f0002', 'reception', true),
  ('00000000-0000-0000-0000-0000002f0032', '00000000-0000-0000-0000-0000002f0020',
   '00000000-0000-0000-0000-0000002f0003', 'groomer', true)
on conflict (id) do nothing;

insert into public.clients (id, facility_id, name, email) values
  ('00000000-0000-0000-0000-0000002f0040', '00000000-0000-0000-0000-0000002f0020',
   'Owner', 'tip-c@example.invalid');

insert into public.staff
  (id, facility_id, legacy_id, first_name, last_name, email, primary_role, status) values
  ('00000000-0000-0000-0000-0000002f0050', '00000000-0000-0000-0000-0000002f0020',
   'tip-s1', 'Amy', 'C', 'amy@example.invalid', 'groomer', 'active'),
  ('00000000-0000-0000-0000-0000002f0051', '00000000-0000-0000-0000-0000002f0020',
   'tip-s2', 'Mike', 'R', 'mike@example.invalid', 'groomer', 'active'),
  -- Somebody else's employee.
  ('00000000-0000-0000-0000-0000002f0052', '00000000-0000-0000-0000-0000002f0021',
   'tip-s3', 'Stranger', 'X', 'stranger@example.invalid', 'groomer', 'active');

create or replace function pg_temp.as_user(p_uid uuid) returns void
language plpgsql as $$
begin
  perform set_config('request.jwt.claims',
    case when p_uid is null then ''
         else json_build_object('sub', p_uid::text,
                                'role', 'authenticated')::text end,
    true);
end $$;

/** A completed booking with a tip of `p_tip` collected on it. */
create or replace function pg_temp.bk(p_tip numeric)
returns bigint language plpgsql as $$
declare v_id uuid; v_ref bigint;
begin
  insert into public.bookings
    (facility_id, client_id, service, status, start_at, end_at,
     base_price, discount, total_cost)
  values
    ('00000000-0000-0000-0000-0000002f0020', '00000000-0000-0000-0000-0000002f0040',
     'grooming', 'completed', now(), now() + interval '2 hours', 100, 0, 100)
  returning id, ref into v_id, v_ref;

  insert into public.payments
    (facility_id, booking_id, client_id, method, subtotal, tax, tip,
     store_credit_applied, package_pass_applied, amount_charged, grand_total)
  values
    ('00000000-0000-0000-0000-0000002f0020', v_id, '00000000-0000-0000-0000-0000002f0040',
     -- `terminal`, not cash: `payments_cash_shape` requires `cash_received`
     -- to be present and to cover the charge, and counting change is not what
     -- this file is about.
     'terminal', 100, 0, p_tip, 0, 0, 100 + p_tip, 100 + p_tip);

  return v_ref;
end $$;

-- ── T1: reception splits a tip; the till closes the ticket ─────────────────
do $$
declare v_ref bigint; v_n integer; v_sum numeric; v_can_payroll boolean;
begin
  perform pg_temp.as_user('00000000-0000-0000-0000-0000002f0001');
  set local role authenticated;
  v_ref := pg_temp.bk(30);
  reset role;

  perform pg_temp.as_user('00000000-0000-0000-0000-0000002f0002');
  set local role authenticated;
  v_can_payroll := private.has_permission(
    '00000000-0000-0000-0000-0000002f0020', 'edit_payroll');
  v_n := public.set_booking_tip_split(v_ref, 'by_service', jsonb_build_array(
    jsonb_build_object('staffId', '00000000-0000-0000-0000-0000002f0050', 'amount', 20),
    jsonb_build_object('staffId', '00000000-0000-0000-0000-0000002f0051', 'amount', 10)));
  reset role;

  select sum(amount) into v_sum from public.booking_tip_allocations
   where booking_id = (select id from public.bookings where ref = v_ref);

  perform pg_temp.t(
    'T1  reception splits a tip WITHOUT edit_payroll (owner/admin only)',
    v_n = 2 and v_sum = 30 and v_can_payroll = false,
    format('rows=%s sum=%s edit_payroll=%s', v_n, v_sum, v_can_payroll));
exception when others then
  reset role; perform pg_temp.t('T1  reception splits a tip', false, sqlerrm);
end $$;

-- ── T2: you cannot pay out more than was collected ─────────────────────────
do $$
declare v_ref bigint; v_state text := 'none'; v_rows integer;
begin
  perform pg_temp.as_user('00000000-0000-0000-0000-0000002f0001');
  set local role authenticated;
  v_ref := pg_temp.bk(30);
  begin
    perform public.set_booking_tip_split(v_ref, 'equal', jsonb_build_array(
      jsonb_build_object('staffId', '00000000-0000-0000-0000-0000002f0050', 'amount', 999)));
  exception when others then v_state := sqlstate;
  end;
  reset role;

  select count(*) into v_rows from public.booking_tip_allocations
   where booking_id = (select id from public.bookings where ref = v_ref);

  perform pg_temp.t('T2  $999 cannot be split out of a $30 tip',
    v_state = '23514' and v_rows = 0,
    format('sqlstate=%s rows=%s', v_state, v_rows));
end $$;

-- ── T3: and the same call within the tip is allowed (positive control) ─────
do $$
declare v_ref bigint; v_n integer := -1; v_err text := 'none';
begin
  perform pg_temp.as_user('00000000-0000-0000-0000-0000002f0001');
  set local role authenticated;
  v_ref := pg_temp.bk(30);
  begin
    v_n := public.set_booking_tip_split(v_ref, 'equal', jsonb_build_array(
      jsonb_build_object('staffId', '00000000-0000-0000-0000-0000002f0050', 'amount', 30)));
  exception when others then v_err := sqlerrm;
  end;
  reset role;

  perform pg_temp.t('T3  the whole $30 of a $30 tip is fine (control for T2)',
    v_n = 1 and v_err = 'none', format('n=%s err=%s', v_n, left(v_err, 40)));
end $$;

-- ── T4: saving replaces, it does not accumulate ────────────────────────────
do $$
declare v_ref bigint; v_bid uuid; v_rows integer; v_sum numeric; v_who text;
begin
  perform pg_temp.as_user('00000000-0000-0000-0000-0000002f0001');
  set local role authenticated;
  v_ref := pg_temp.bk(40);
  perform public.set_booking_tip_split(v_ref, 'equal', jsonb_build_array(
    jsonb_build_object('staffId', '00000000-0000-0000-0000-0000002f0050', 'amount', 20),
    jsonb_build_object('staffId', '00000000-0000-0000-0000-0000002f0051', 'amount', 20)));

  -- Mike is taken off the split entirely.
  perform public.set_booking_tip_split(v_ref, 'custom_amount', jsonb_build_array(
    jsonb_build_object('staffId', '00000000-0000-0000-0000-0000002f0050', 'amount', 40)));
  reset role;

  select id into v_bid from public.bookings where ref = v_ref;
  select count(*), sum(amount) into v_rows, v_sum
    from public.booking_tip_allocations where booking_id = v_bid;
  select string_agg(staff_id::text, ',') into v_who
    from public.booking_tip_allocations where booking_id = v_bid;

  perform pg_temp.t('T4  re-saving replaces the split rather than adding to it',
    v_rows = 1 and v_sum = 40 and v_who = '00000000-0000-0000-0000-0000002f0050',
    format('rows=%s sum=%s', v_rows, v_sum));
exception when others then
  reset role; perform pg_temp.t('T4  replace', false, sqlerrm);
end $$;

-- ── T5: one facility cannot tip another's employee ─────────────────────────
do $$
declare v_ref bigint; v_state text := 'none';
begin
  perform pg_temp.as_user('00000000-0000-0000-0000-0000002f0001');
  set local role authenticated;
  v_ref := pg_temp.bk(30);
  begin
    perform public.set_booking_tip_split(v_ref, 'equal', jsonb_build_array(
      jsonb_build_object('staffId', '00000000-0000-0000-0000-0000002f0052', 'amount', 10)));
  exception when others then v_state := sqlstate;
  end;
  reset role;

  perform pg_temp.t('T5  a staff member at another facility is refused',
    v_state = '23503', format('sqlstate=%s', v_state));
end $$;

-- ── T6/T7: the direct writes are shut, and fail differently ────────────────
do $$
declare
  v_ref bigint; v_bid uuid; v_insert_state text := 'none';
  v_before integer; v_after integer;
begin
  perform pg_temp.as_user('00000000-0000-0000-0000-0000002f0001');
  set local role authenticated;
  v_ref := pg_temp.bk(30);
  perform public.set_booking_tip_split(v_ref, 'equal', jsonb_build_array(
    jsonb_build_object('staffId', '00000000-0000-0000-0000-0000002f0050', 'amount', 15)));
  reset role;

  select id into v_bid from public.bookings where ref = v_ref;
  select count(*) into v_before from public.booking_tip_allocations where booking_id = v_bid;

  perform pg_temp.as_user('00000000-0000-0000-0000-0000002f0001');
  set local role authenticated;
  begin
    insert into public.booking_tip_allocations
      (booking_id, facility_id, staff_id, amount, method)
    values (v_bid, '00000000-0000-0000-0000-0000002f0020',
            '00000000-0000-0000-0000-0000002f0051', 5, 'equal');
  exception when others then v_insert_state := sqlstate;
  end;

  -- The other half: a DELETE refused by RLS matches nothing and RAISES NOTHING.
  delete from public.booking_tip_allocations where booking_id = v_bid;
  reset role;

  select count(*) into v_after from public.booking_tip_allocations where booking_id = v_bid;

  perform pg_temp.t('T6  a direct INSERT raises 42501 — there is no write policy',
    v_insert_state = '42501', format('sqlstate=%s', v_insert_state));
  perform pg_temp.t('T7  a direct DELETE reports success and deletes nothing',
    v_before = 1 and v_after = 1, format('before=%s after=%s', v_before, v_after));
exception when others then
  reset role; perform pg_temp.t('T6/T7 direct writes', false, sqlerrm);
end $$;

-- ── T8: a groomer cannot split the tips ────────────────────────────────────
do $$
declare v_ref bigint; v_state text := 'none';
begin
  perform pg_temp.as_user('00000000-0000-0000-0000-0000002f0001');
  set local role authenticated;
  v_ref := pg_temp.bk(30);
  reset role;

  perform pg_temp.as_user('00000000-0000-0000-0000-0000002f0003');
  set local role authenticated;
  begin
    perform public.set_booking_tip_split(v_ref, 'equal', jsonb_build_array(
      jsonb_build_object('staffId', '00000000-0000-0000-0000-0000002f0050', 'amount', 30)));
  exception when others then v_state := sqlstate;
  end;
  reset role;

  -- A groomer earns tips; deciding how they are divided is the till's job.
  perform pg_temp.t('T8  a groomer cannot decide the split (no take_payment)',
    v_state = '42501', format('sqlstate=%s', v_state));
end $$;

-- ── Results ────────────────────────────────────────────────────────────────

do $$
declare v_failed integer;
begin
  select count(*) into v_failed from tap where not ok;
  if v_failed > 0 then
    raise warning '% assertion(s) FAILED', v_failed;
  else
    raise warning 'all % assertions passed', (select count(*) from tap);
  end if;
end $$;

select n, case when ok then 'PASS' else 'FAIL' end as result, name, detail
  from tap order by n;

rollback;
