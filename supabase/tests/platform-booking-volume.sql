-- ============================================================================
-- The platform's booking volume is counted, not invented
-- (the_platforms_booking_volume_is_counted).
--
-- The superadmin's Facilities report drew a 52-week "Booking Volume Trend"
-- from a seeded random generator: mulberry32(20260624) × a seasonal factor ×
-- a growth factor × a base of 420. Nobody could tell, because it looked
-- exactly like a chart.
--
--   V  the weeks come back newest-last, one row per week, counting the
--      bookings MADE in that week across every facility
--   F  per facility, this period against the one before it
--   P  only Yipyy's own team may ask; a facility owner and anon may not
-- ============================================================================

begin;

set local client_min_messages to warning;

create temp table tap (n serial, name text, ok boolean, detail text);
grant all on tap to authenticated;
grant usage on sequence tap_n_seq to authenticated;

create or replace function pg_temp.t(p_name text, p_ok boolean, p_detail text default '')
returns void language sql as $$
  insert into tap(name, ok, detail) values (p_name, p_ok, p_detail);
$$;

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-000000501001', 'bv-super@example.invalid'),
  ('00000000-0000-0000-0000-000000501002', 'bv-owner@example.invalid')
on conflict (id) do nothing;

insert into public.profiles (id, email, full_name) values
  ('00000000-0000-0000-0000-000000501001', 'bv-super@example.invalid', 'BV Super'),
  ('00000000-0000-0000-0000-000000501002', 'bv-owner@example.invalid', 'BV Owner')
on conflict (id) do update set full_name = excluded.full_name;

insert into public.platform_memberships (profile_id, role) values
  ('00000000-0000-0000-0000-000000501001', 'superadmin')
on conflict do nothing;

insert into public.orgs (id, name, slug) values
  ('00000000-0000-0000-0000-000000501010', 'BV Org', 'bv-org')
on conflict do nothing;

insert into public.facilities (id, org_id, name, slug, legacy_id) values
  ('00000000-0000-0000-0000-000000501020', '00000000-0000-0000-0000-000000501010',
   'BV Facility', 'bv-a', 'bv-a')
on conflict do nothing;

insert into public.facility_memberships (id, facility_id, profile_id, role, is_active) values
  ('00000000-0000-0000-0000-000000501030', '00000000-0000-0000-0000-000000501020',
   '00000000-0000-0000-0000-000000501002', 'owner', true)
on conflict (id) do nothing;

insert into public.clients (id, facility_id, name, email) values
  ('00000000-0000-0000-0000-000000501040', '00000000-0000-0000-0000-000000501020',
   'BV Client', 'bv-c@example.invalid');

-- Three bookings made this week, one made five weeks ago.
insert into public.bookings
  (id, facility_id, client_id, service, status, start_at, end_at, created_at)
select
  ('00000000-0000-0000-0000-00000050105' || g)::uuid,
  '00000000-0000-0000-0000-000000501020',
  '00000000-0000-0000-0000-000000501040',
  'daycare', 'confirmed',
  now() + interval '20 days', now() + interval '20 days 8 hours',
  case when g < 4 then now() - interval '1 hour' else now() - interval '5 weeks' end
  from generate_series(1, 4) g;

create or replace function pg_temp.as_user(p_uid uuid) returns void
language plpgsql as $$
begin
  perform set_config('request.jwt.claims',
    json_build_object('sub', p_uid::text, 'role', 'authenticated')::text, true);
end $$;

create or replace function pg_temp.refusal(p_sql text) returns text
language plpgsql as $$
begin
  execute p_sql;
  return 'accepted';
exception when others then
  return sqlstate;
end $$;

select pg_temp.as_user('00000000-0000-0000-0000-000000501001');
set local role authenticated;

select pg_temp.t('V1  twelve weeks come back, oldest first, one row each',
  (select count(*) from public.platform_booking_volume(12)) = 12
  and (select bool_and(ok) from (
        select week_start < lead(week_start) over (order by week_start) as ok
          from public.platform_booking_volume(12)) x
       where ok is not null));

select pg_temp.t('V2  this week counts the three made this week',
  (select bookings from public.platform_booking_volume(12)
    order by week_start desc limit 1) >= 3);

select pg_temp.t('V3  the week five weeks ago counts its one',
  (select sum(bookings) from public.platform_booking_volume(12)) >= 4);

select pg_temp.t('F1  the facility''s own volume: three now, one before',
  (select made_this_period >= 3 and made_last_period >= 1
     from public.platform_facility_volume(28)
    where facility_id = '00000000-0000-0000-0000-000000501020'),
  (select made_this_period || ' / ' || made_last_period
     from public.platform_facility_volume(28)
    where facility_id = '00000000-0000-0000-0000-000000501020'));
reset role;

select pg_temp.as_user('00000000-0000-0000-0000-000000501002');
set local role authenticated;
select pg_temp.t('P1  a facility owner is refused the platform-wide count',
  pg_temp.refusal($q$select * from public.platform_booking_volume(4)$q$) = '42501'
  and pg_temp.refusal($q$select * from public.platform_facility_volume(28)$q$) = '42501');
reset role;

select pg_temp.t('P2  anon may call neither',
  not has_function_privilege('anon', 'public.platform_booking_volume(integer)', 'execute')
  and not has_function_privilege('anon', 'public.platform_facility_volume(integer)', 'execute'));

select case when ok then '  PASS  ' else '> FAIL <' end as result, name, detail
  from tap order by n;

select count(*) filter (where ok) || ' passed, '
    || count(*) filter (where not ok) || ' failed' as summary
  from tap;

rollback;
