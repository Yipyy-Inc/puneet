-- ============================================================================
-- The platform's booking volume is counted, not invented.
--
-- The superadmin's Facilities report drew a 52-week "Booking Volume Trend"
-- from a seeded random generator — mulberry32(20260624) × a seasonal factor ×
-- a growth factor × a base of 420 — and the dashboard's "Facilities at risk"
-- said "Bookings at 43% of last month" from a hash of the facility's id.
-- Both looked exactly like measurements.
--
-- platform_booking_volume(weeks): one row per week, oldest first, counting
-- the bookings MADE in that week across every facility. Weeks with none come
-- back as zero rather than missing, so a chart's gaps are real.
--
-- platform_facility_volume(days): per facility, how many were made in the
-- last `days` and in the `days` before that — the two numbers "down on last
-- month" is a claim about.
--
-- Both are Yipyy's own team's (is_platform_admin), and both are read-only.
-- They count by created_at: the question is how much business the platform is
-- TAKING, not how many stays start in a week. SQL in
-- platform-booking-volume.sql.
-- ============================================================================

create or replace function public.platform_booking_volume(p_weeks integer default 52)
returns table (week_start date, bookings bigint)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_weeks integer := least(greatest(coalesce(p_weeks, 52), 1), 104);
begin
  if not private.is_platform_admin() then
    raise exception 'Only Yipyy''s team may read the platform''s booking volume.'
      using errcode = '42501';
  end if;

  return query
    select w.week::date as week_start,
           count(b.id) as bookings
      from generate_series(
             date_trunc('week', now()) - make_interval(weeks => v_weeks - 1),
             date_trunc('week', now()),
             interval '1 week') as w(week)
      left join public.bookings b
        on b.created_at >= w.week
       and b.created_at < w.week + interval '1 week'
     group by w.week
     order by w.week;
end;
$$;

create or replace function public.platform_facility_volume(p_days integer default 28)
returns table (
  facility_id uuid,
  made_this_period bigint,
  made_last_period bigint
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_days integer := least(greatest(coalesce(p_days, 28), 1), 365);
begin
  if not private.is_platform_admin() then
    raise exception 'Only Yipyy''s team may read a facility''s booking volume.'
      using errcode = '42501';
  end if;

  return query
    select f.id,
           count(b.id) filter (
             where b.created_at >= now() - make_interval(days => v_days)) as made_this_period,
           count(b.id) filter (
             where b.created_at >= now() - make_interval(days => v_days * 2)
               and b.created_at <  now() - make_interval(days => v_days)) as made_last_period
      from public.facilities f
      left join public.bookings b
        on b.facility_id = f.id
       and b.created_at >= now() - make_interval(days => v_days * 2)
     group by f.id;
end;
$$;

revoke all on function public.platform_booking_volume(integer) from public;
revoke all on function public.platform_booking_volume(integer) from anon;
grant execute on function public.platform_booking_volume(integer) to authenticated, service_role;

revoke all on function public.platform_facility_volume(integer) from public;
revoke all on function public.platform_facility_volume(integer) from anon;
grant execute on function public.platform_facility_volume(integer) to authenticated, service_role;

do $check$
begin
  if has_function_privilege('anon', 'public.platform_booking_volume(integer)', 'execute')
     or has_function_privilege('anon', 'public.platform_facility_volume(integer)', 'execute') then
    raise exception 'anon can read the platform booking volume';
  end if;
end
$check$;
