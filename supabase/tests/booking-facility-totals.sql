-- ============================================================================
-- The bookings page's tiles are counted in Postgres, in the table's own scope
-- (the_bookings_page_totals_are_one_query).
--
--   bun run test:sql booking-facility-totals
--
-- One transaction, rolled back. Fixture emails are @example.invalid.
--
--   T1  total, today, upcoming (not cancelled) and pending, on the facility clock
--   T2  paid and pending revenue add the matching bookings' price
--   T3  a location scope counts that location only
--   T4  a staff scope counts that member's assigned bookings only
--   T5  a caller who cannot read the facility's bookings counts nothing
--   T6  anon cannot call it
-- ============================================================================

begin;

set local client_min_messages to warning;

create temp table tap (n serial, name text, ok boolean, detail text);
grant all on tap to authenticated;

create or replace function pg_temp.t(p_name text, p_ok boolean, p_detail text default '')
returns void language sql as $$
  insert into tap(name, ok, detail) values (p_name, p_ok, p_detail);
$$;

create or replace function pg_temp.as_user(p_uid text) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims',
    json_build_object('sub', p_uid, 'role', 'authenticated')::text, true);
end $$;

-- ── Fixture ───────────────────────────────────────────────────────────────

insert into public.orgs (id, name, slug) values
  ('00000000-0000-0000-0000-0000009d0010', 'Tot Org', 'tot-org')
on conflict do nothing;

insert into public.facilities (id, org_id, name, slug, legacy_id, timezone) values
  ('00000000-0000-0000-0000-0000009d0020', '00000000-0000-0000-0000-0000009d0010',
   'Tot Facility', 'tot-a', 'tot-a', 'America/Toronto')
on conflict do nothing;

insert into public.locations (id, facility_id, name) values
  ('00000000-0000-0000-0000-0000009d0030', '00000000-0000-0000-0000-0000009d0020', 'North'),
  ('00000000-0000-0000-0000-0000009d0031', '00000000-0000-0000-0000-0000009d0020', 'South')
on conflict do nothing;

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000009d0100', 'tot-mgr@example.invalid'),
  ('00000000-0000-0000-0000-0000009d0101', 'tot-stranger@example.invalid')
on conflict do nothing;

insert into public.profiles (id, email, full_name) values
  ('00000000-0000-0000-0000-0000009d0100', 'tot-mgr@example.invalid', 'Tia Manager'),
  ('00000000-0000-0000-0000-0000009d0101', 'tot-stranger@example.invalid', 'Tom Stranger')
on conflict do nothing;

insert into public.facility_memberships (facility_id, profile_id, role) values
  ('00000000-0000-0000-0000-0000009d0020', '00000000-0000-0000-0000-0000009d0100', 'manager')
on conflict do nothing;

insert into public.clients (id, facility_id, name, email) values
  ('00000000-0000-0000-0000-0000009d0040', '00000000-0000-0000-0000-0000009d0020',
   'Tot Client', 'tot-c@example.invalid');

create or replace function pg_temp.book(p_status text, p_start timestamptz, p_cost numeric,
  p_location text default null) returns uuid language plpgsql as $$
declare v_id uuid;
begin
  insert into public.bookings
    (facility_id, client_id, location_id, service, status, start_at, end_at,
     base_price, discount, total_cost)
  values
    ('00000000-0000-0000-0000-0000009d0020', '00000000-0000-0000-0000-0000009d0040',
     p_location::uuid, 'daycare', p_status::public.booking_status,
     p_start, p_start + interval '8 hours', p_cost, 0, p_cost)
  returning id into v_id;
  return v_id;
end $$;

-- Today (noon, facility clock), tomorrow, next week (cancelled), last month.
select pg_temp.book('confirmed',
  ((now() at time zone 'America/Toronto')::date + time '12:00') at time zone 'America/Toronto',
  40, '00000000-0000-0000-0000-0000009d0030');
select pg_temp.book('pending',
  ((now() at time zone 'America/Toronto')::date + 1 + time '12:00') at time zone 'America/Toronto',
  60, '00000000-0000-0000-0000-0000009d0031');
select pg_temp.book('cancelled',
  ((now() at time zone 'America/Toronto')::date + 7 + time '12:00') at time zone 'America/Toronto',
  25, '00000000-0000-0000-0000-0000009d0030');
select pg_temp.book('completed', now() - interval '30 days', 80, '00000000-0000-0000-0000-0000009d0031');

-- Paid in full on the completed one: payment_status is derived from the ledger.
insert into public.payments
  (facility_id, booking_id, client_id, method, subtotal, tax, tip, amount_charged,
   grand_total, cash_received)
select facility_id, id, client_id, 'cash', 80, 0, 0, 80, 80, 80
  from public.bookings
 where facility_id = '00000000-0000-0000-0000-0000009d0020' and status = 'completed';

-- ── T1 ────────────────────────────────────────────────────────────────────
do $$
declare r record;
begin
  select * into r from public.booking_facility_totals('00000000-0000-0000-0000-0000009d0020');
  perform pg_temp.t('T1  total, today, upcoming (not cancelled) and pending',
    r.total = 4 and r.today = 1 and r.upcoming = 1 and r.pending = 1,
    format('total=%s today=%s upcoming=%s pending=%s', r.total, r.today, r.upcoming, r.pending));
end $$;

-- ── T2 ────────────────────────────────────────────────────────────────────
do $$
declare r record; v_pending numeric;
begin
  select * into r from public.booking_facility_totals('00000000-0000-0000-0000-0000009d0020');
  select coalesce(sum(total_cost), 0) into v_pending from public.bookings
   where facility_id = '00000000-0000-0000-0000-0000009d0020' and payment_status = 'pending';
  perform pg_temp.t('T2  paid and pending revenue add the matching bookings',
    r.paid_revenue = 80 and r.pending_revenue = v_pending,
    format('paid=%s pending=%s expected_pending=%s', r.paid_revenue, r.pending_revenue, v_pending));
end $$;

-- ── T3 ────────────────────────────────────────────────────────────────────
do $$
declare r record;
begin
  select * into r from public.booking_facility_totals(
    '00000000-0000-0000-0000-0000009d0020', '00000000-0000-0000-0000-0000009d0030');
  perform pg_temp.t('T3  one location counts its own bookings',
    r.total = 2 and r.today = 1 and r.upcoming = 0,
    format('total=%s today=%s upcoming=%s', r.total, r.today, r.upcoming));
end $$;

-- ── T4 ────────────────────────────────────────────────────────────────────
do $$
declare r record; v_staff uuid := gen_random_uuid();
begin
  -- A staff id nobody is assigned: nothing counts. A NULL would be "everyone".
  select * into r from public.booking_facility_totals(
    '00000000-0000-0000-0000-0000009d0020', null, v_staff);
  perform pg_temp.t('T4  a staff scope with no assigned bookings counts none',
    r.total = 0 and r.paid_revenue = 0,
    format('total=%s paid=%s', r.total, r.paid_revenue));
end $$;

-- ── T5 ────────────────────────────────────────────────────────────────────
do $$
declare v_mgr int; v_stranger int;
begin
  perform pg_temp.as_user('00000000-0000-0000-0000-0000009d0100');
  set local role authenticated;
  select total into v_mgr
    from public.booking_facility_totals('00000000-0000-0000-0000-0000009d0020');
  reset role;

  perform pg_temp.as_user('00000000-0000-0000-0000-0000009d0101');
  set local role authenticated;
  select total into v_stranger
    from public.booking_facility_totals('00000000-0000-0000-0000-0000009d0020');
  reset role;

  perform pg_temp.t('T5  RLS decides: the manager counts four, a stranger none',
    v_mgr = 4 and v_stranger = 0,
    format('manager=%s stranger=%s', v_mgr, v_stranger));
end $$;

-- ── T6 ────────────────────────────────────────────────────────────────────
do $$
begin
  perform pg_temp.t('T6  anon cannot call it',
    not has_function_privilege('anon', 'public.booking_facility_totals(uuid, uuid, uuid)', 'execute'),
    'anon can execute');
end $$;

-- ── Report ────────────────────────────────────────────────────────────────

select n, case when ok then 'PASS' else 'FAIL' end as result, name, detail
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
