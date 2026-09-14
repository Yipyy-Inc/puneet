-- ============================================================================
-- The bookings page's tiles, counted in Postgres.
--
-- "All bookings", "Today", "Upcoming", "Pending" and the Revenue tile were
-- worked out in the browser over every booking the facility ever had. The page
-- now reads its table a page at a time, so the tiles come from here: the same
-- scope the table uses (the facility, optionally one location, optionally the
-- bookings assigned to one member of staff), on the facility's own clock.
--
-- SECURITY INVOKER: RLS decides what the caller may count.
--
-- Tested by supabase/tests/booking-facility-totals.sql.
-- ============================================================================

create or replace function public.booking_facility_totals(
  p_facility_id uuid,
  p_location_id uuid default null,
  p_staff_id uuid default null
)
returns table (
  total integer,
  today integer,
  upcoming integer,
  pending integer,
  paid_revenue numeric,
  pending_revenue numeric
)
language sql
stable
security invoker
set search_path = ''
as $fn$
  with zone as (
    select coalesce(timezone, 'America/Toronto') as tz
      from public.facilities where id = p_facility_id
  ),
  scoped as (
    select b.status::text as status,
           b.payment_status::text as payment_status,
           b.total_cost,
           (b.start_at at time zone (select tz from zone))::date as day
      from public.bookings b
     where b.facility_id = p_facility_id
       and (p_location_id is null or b.location_id = p_location_id)
       and (p_staff_id is null or b.assigned_staff_id = p_staff_id)
  ),
  local_today as (
    select (now() at time zone (select tz from zone))::date as d
  )
  select count(*)::integer,
         (count(*) filter (where day = (select d from local_today)))::integer,
         (count(*) filter (where day > (select d from local_today) and status <> 'cancelled'))::integer,
         (count(*) filter (where status = 'pending'))::integer,
         coalesce(sum(total_cost) filter (where payment_status = 'paid'), 0),
         coalesce(sum(total_cost) filter (where payment_status = 'pending'), 0)
    from scoped;
$fn$;

revoke all on function public.booking_facility_totals(uuid, uuid, uuid) from public;
revoke all on function public.booking_facility_totals(uuid, uuid, uuid) from anon;
grant execute on function public.booking_facility_totals(uuid, uuid, uuid) to authenticated;

do $check$
begin
  if has_function_privilege('anon', 'public.booking_facility_totals(uuid, uuid, uuid)', 'execute') then
    raise exception 'anon can execute booking_facility_totals';
  end if;
  if not has_function_privilege('authenticated', 'public.booking_facility_totals(uuid, uuid, uuid)', 'execute') then
    raise exception 'authenticated cannot execute booking_facility_totals';
  end if;
end $check$;
