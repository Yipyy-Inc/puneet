-- ============================================================================
-- A facility's per-client booking summary answers what the screens asked the
-- whole list for (a_client_booking_summary_is_one_query).
--
--   bun run test:sql booking-client-summary
--
-- One transaction, rolled back. Fixture emails are @example.invalid.
--
--   S1  counts, first and last day, services and the open booking per client
--   S2  a rebooking within 60 days is flagged, one after 60 days is not
--   S3  another facility's bookings are not in it
--   S4  a caller who cannot read the facility's bookings gets nothing
--   S5  anon cannot call it
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
  ('00000000-0000-0000-0000-0000009c0010', 'Sum Org', 'sum-org')
on conflict do nothing;

insert into public.facilities (id, org_id, name, slug, legacy_id, timezone) values
  ('00000000-0000-0000-0000-0000009c0020', '00000000-0000-0000-0000-0000009c0010',
   'Sum Facility', 'sum-a', 'sum-a', 'America/Toronto'),
  ('00000000-0000-0000-0000-0000009c0021', '00000000-0000-0000-0000-0000009c0010',
   'Sum Other', 'sum-b', 'sum-b', 'America/Toronto')
on conflict do nothing;

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000009c0100', 'sum-mgr@example.invalid'),
  ('00000000-0000-0000-0000-0000009c0101', 'sum-stranger@example.invalid')
on conflict do nothing;

insert into public.profiles (id, email, full_name) values
  ('00000000-0000-0000-0000-0000009c0100', 'sum-mgr@example.invalid', 'Sam Manager'),
  ('00000000-0000-0000-0000-0000009c0101', 'sum-stranger@example.invalid', 'Sid Stranger')
on conflict do nothing;

insert into public.facility_memberships (facility_id, profile_id, role) values
  ('00000000-0000-0000-0000-0000009c0020', '00000000-0000-0000-0000-0000009c0100', 'manager')
on conflict do nothing;

insert into public.clients (id, facility_id, name, email) values
  ('00000000-0000-0000-0000-0000009c0040', '00000000-0000-0000-0000-0000009c0020',
   'Quick Returner', 'sum-a@example.invalid'),
  ('00000000-0000-0000-0000-0000009c0041', '00000000-0000-0000-0000-0000009c0020',
   'Slow Returner', 'sum-b@example.invalid'),
  ('00000000-0000-0000-0000-0000009c0042', '00000000-0000-0000-0000-0000009c0021',
   'Elsewhere', 'sum-c@example.invalid');

create or replace function pg_temp.book(p_client text, p_facility text, p_service text,
  p_status text, p_start timestamptz) returns void language sql as $$
  insert into public.bookings
    (facility_id, client_id, service, status, start_at, end_at, base_price, discount, total_cost)
  values
    (p_facility::uuid, p_client::uuid, p_service, p_status::public.booking_status,
     p_start, p_start + interval '8 hours', 40, 0, 40);
$$;

-- Quick: daycare, then grooming 20 days later (confirmed), then a cancelled one.
select pg_temp.book('00000000-0000-0000-0000-0000009c0040', '00000000-0000-0000-0000-0000009c0020',
  'daycare', 'completed', '2026-06-01 13:00+00');
select pg_temp.book('00000000-0000-0000-0000-0000009c0040', '00000000-0000-0000-0000-0000009c0020',
  'grooming', 'confirmed', '2026-06-21 13:00+00');
select pg_temp.book('00000000-0000-0000-0000-0000009c0040', '00000000-0000-0000-0000-0000009c0020',
  'daycare', 'cancelled', '2026-07-30 13:00+00');
-- Slow: boarding, then again 90 days later, both done.
select pg_temp.book('00000000-0000-0000-0000-0000009c0041', '00000000-0000-0000-0000-0000009c0020',
  'boarding', 'completed', '2026-01-10 13:00+00');
select pg_temp.book('00000000-0000-0000-0000-0000009c0041', '00000000-0000-0000-0000-0000009c0020',
  'boarding', 'completed', '2026-04-10 13:00+00');
-- Elsewhere: another facility.
select pg_temp.book('00000000-0000-0000-0000-0000009c0042', '00000000-0000-0000-0000-0000009c0021',
  'daycare', 'confirmed', '2026-06-01 13:00+00');

create temp table summary as
  select * from public.booking_client_summary('00000000-0000-0000-0000-0000009c0020');
grant all on summary to authenticated;

-- ── S1 ────────────────────────────────────────────────────────────────────
do $$
declare r record; v_ref bigint;
begin
  select ref into v_ref from public.clients where id = '00000000-0000-0000-0000-0000009c0040';
  select * into r from summary where client_ref = v_ref;
  perform pg_temp.t('S1  one row per client with its count, days, services and open booking',
    r.booking_count = 3 and r.first_day = '2026-06-01' and r.last_day = '2026-07-30'
      and r.services @> array['daycare', 'grooming'] and array_length(r.services, 1) = 2
      and r.has_active,
    format('count=%s first=%s last=%s services=%s active=%s',
      r.booking_count, r.first_day, r.last_day, r.services, r.has_active));
end $$;

-- ── S2 ────────────────────────────────────────────────────────────────────
do $$
declare v_quick boolean; v_slow boolean; v_slow_active boolean;
begin
  select rebooked_within_60_days into v_quick from summary s
    join public.clients c on c.ref = s.client_ref
   where c.id = '00000000-0000-0000-0000-0000009c0040';
  select rebooked_within_60_days, has_active into v_slow, v_slow_active from summary s
    join public.clients c on c.ref = s.client_ref
   where c.id = '00000000-0000-0000-0000-0000009c0041';
  perform pg_temp.t('S2  back within 60 days is flagged, back after 90 is not',
    v_quick and not v_slow and not v_slow_active,
    format('quick=%s slow=%s slow_active=%s', v_quick, v_slow, v_slow_active));
end $$;

-- ── S3 ────────────────────────────────────────────────────────────────────
do $$
declare n int;
begin
  select count(*) into n from summary;
  perform pg_temp.t('S3  only this facility''s clients', n = 2, n || ' rows');
end $$;

-- ── S4 ────────────────────────────────────────────────────────────────────
do $$
declare v_mgr int; v_stranger int;
begin
  perform pg_temp.as_user('00000000-0000-0000-0000-0000009c0100');
  set local role authenticated;
  select count(*) into v_mgr
    from public.booking_client_summary('00000000-0000-0000-0000-0000009c0020');
  reset role;

  perform pg_temp.as_user('00000000-0000-0000-0000-0000009c0101');
  set local role authenticated;
  select count(*) into v_stranger
    from public.booking_client_summary('00000000-0000-0000-0000-0000009c0020');
  reset role;

  perform pg_temp.t('S4  RLS decides: the manager sees the clients, a stranger none',
    v_mgr = 2 and v_stranger = 0,
    format('manager=%s stranger=%s', v_mgr, v_stranger));
end $$;

-- ── S5 ────────────────────────────────────────────────────────────────────
do $$
begin
  perform pg_temp.t('S5  anon cannot call it',
    not has_function_privilege('anon', 'public.booking_client_summary(uuid)', 'execute'),
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
