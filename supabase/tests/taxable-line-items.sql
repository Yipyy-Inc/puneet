-- ============================================================================
-- public.booking_line_items.taxable and bookings.taxable_extras_total
-- — see 20260923200000_a_line_can_say_whether_it_is_taxed.sql
--
--   bun run test:sql taxable-line-items
--
-- One transaction, rolled back. It builds its own booking on the demo
-- facility, so it never depends on what any suite has left behind.
--
-- ── WHAT THIS FILE IS ABOUT ────────────────────────────────────────────────
--
-- T0  NEGATIVE CONTROL, first. A line inserted WITHOUT saying anything is
--     taxable, and the booking's taxable share equals its whole extras total.
--     That is the behaviour every bill written before this migration had, and
--     if it ever stops being true, every historical booking silently changes
--     what tax it owes.
-- T1  An exempt line lowers the taxable share WITHOUT lowering extras_total.
--     The two numbers are different questions and a bill needs both: the
--     customer still owes the fee, the government still does not get tax on
--     it.
-- T2  A mixture. The share is the sum of the taxable lines, not a guess.
-- T3  IT IS DERIVED, NOT WRITTEN. Writing a wrong value must be overwritten
--     by the trigger, exactly as `extras_total` is — a hand-set taxable total
--     would disagree with the `amount_due` it is a share of.
-- T4  Deleting a line moves it back. The trigger fires on the way out too,
--     or a refunded fee leaves tax owed on money nobody has.
-- T5  The helper is service-role only. `revoke from public` and
--     `revoke from anon` are different grants, so both are asserted against
--     has_function_privilege() rather than trusted for having been written.
-- ============================================================================

begin;

set local client_min_messages to warning;

create temp table tap (n serial, name text, ok boolean, detail text);

create or replace function pg_temp.t(p_name text, p_ok boolean, p_detail text default '')
returns void language sql as $$
  insert into tap(name, ok, detail) values (p_name, p_ok, p_detail);
$$;

do $$
declare
  v_facility uuid := 'a0000000-0000-4000-8000-0000000000f1';
  v_client   uuid;
  v_booking  uuid;
  v_exempt   uuid;
  v_extras   numeric;
  v_taxable  numeric;
  v_due      numeric;
  v_stamp    text := to_char(clock_timestamp(), 'YYYYMMDDHH24MISSUS');
begin
  select id into v_client from public.clients
   where facility_id = v_facility order by ref limit 1;

  insert into public.bookings
    (facility_id, client_id, service, status, start_at, end_at,
     base_price, discount, total_cost)
  values
    (v_facility, v_client, 'boarding', 'confirmed',
     now() + interval '200 days', now() + interval '201 days',
     200, 0, 200)
  returning id into v_booking;

  -- ── T0 the world before this migration ──────────────────────────────────
  insert into public.booking_line_items
    (booking_id, facility_id, kind, name, unit_price, quantity)
  values
    (v_booking, v_facility, 'fee', 'Says nothing ' || v_stamp, 20, 1);

  select extras_total, taxable_extras_total
    into v_extras, v_taxable
    from public.bookings where id = v_booking;

  perform pg_temp.t(
    'T0 a line that says nothing is taxed, and is the whole share',
    v_extras = 20 and v_taxable = 20,
    format('extras=%s taxable=%s', v_extras, v_taxable));

  -- ── T1 an exempt line ───────────────────────────────────────────────────
  insert into public.booking_line_items
    (booking_id, facility_id, kind, name, unit_price, quantity, taxable)
  values
    (v_booking, v_facility, 'fee', 'No-show ' || v_stamp, 30, 1, false)
  returning id into v_exempt;

  select extras_total, taxable_extras_total, amount_due
    into v_extras, v_taxable, v_due
    from public.bookings where id = v_booking;

  perform pg_temp.t(
    'T1 an exempt fee is still owed, and still not taxed',
    v_extras = 50 and v_taxable = 20 and v_due = 250,
    format('extras=%s taxable=%s amount_due=%s', v_extras, v_taxable, v_due));

  -- ── T2 a mixture ────────────────────────────────────────────────────────
  insert into public.booking_line_items
    (booking_id, facility_id, kind, name, unit_price, quantity, taxable)
  values
    (v_booking, v_facility, 'item', 'Bag of food ' || v_stamp, 12.50, 2, true);

  select extras_total, taxable_extras_total
    into v_extras, v_taxable
    from public.bookings where id = v_booking;

  perform pg_temp.t(
    'T2 the share is the sum of the taxable lines',
    v_extras = 75 and v_taxable = 45,
    format('extras=%s taxable=%s', v_extras, v_taxable));

  -- ── T3 it is DERIVED ────────────────────────────────────────────────────
  update public.bookings
     set taxable_extras_total = 9999, extras_total = 8888
   where id = v_booking;

  select extras_total, taxable_extras_total
    into v_extras, v_taxable
    from public.bookings where id = v_booking;

  perform pg_temp.t(
    'T3 writing either total by hand is overwritten by the trigger',
    v_extras = 75 and v_taxable = 45,
    format('extras=%s taxable=%s (both should be ignored writes)',
      v_extras, v_taxable));

  -- ── T4 removing the exempt line ─────────────────────────────────────────
  delete from public.booking_line_items where id = v_exempt;

  select extras_total, taxable_extras_total
    into v_extras, v_taxable
    from public.bookings where id = v_booking;

  perform pg_temp.t(
    'T4 deleting a line moves both totals back',
    v_extras = 45 and v_taxable = 45,
    format('extras=%s taxable=%s', v_extras, v_taxable));
exception when others then
  perform pg_temp.t('T0-T4 derived totals', false, sqlerrm);
end $$;

-- ── T5 the helper's grants ─────────────────────────────────────────────────
do $$
begin
  perform pg_temp.t(
    'T5 only the service role may run the helper',
    not has_function_privilege('anon',
      'private.booking_taxable_extras_total(uuid)', 'execute')
      and not has_function_privilege('authenticated',
        'private.booking_taxable_extras_total(uuid)', 'execute')
      and 0 = (select count(*) from information_schema.routine_privileges
                 where routine_schema = 'private'
                   and routine_name   = 'booking_taxable_extras_total'
                   and grantee        = 'PUBLIC'),
    format('anon=%s authenticated=%s',
      has_function_privilege('anon',
        'private.booking_taxable_extras_total(uuid)', 'execute'),
      has_function_privilege('authenticated',
        'private.booking_taxable_extras_total(uuid)', 'execute')));
exception when others then
  perform pg_temp.t('T5 grants', false, sqlerrm);
end $$;

-- ── Report ──────────────────────────────────────────────────────────────────
select case when ok then '  PASS  ' else '> FAIL <' end as result, name, detail
  from tap order by n;

select count(*) filter (where ok) || ' passed, '
    || count(*) filter (where not ok) || ' failed' as summary
  from tap;

rollback;
