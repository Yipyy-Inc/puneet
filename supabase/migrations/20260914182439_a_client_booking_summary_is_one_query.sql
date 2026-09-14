-- ============================================================================
-- What a facility's booking history says about each client, in one query.
--
-- Five screens loaded every booking the facility ever had to learn a handful
-- of per-client facts: how many bookings (the client picker's sort, the
-- booking form's "new customer"), the first day (the calendar's anniversary
-- badge), the last day and the services used (client filters), whether one is
-- still open (client filters), and whether they came back within 60 days
-- (loyalty retention). This answers all of them without shipping the rows.
--
-- SECURITY INVOKER: RLS on bookings and clients decides what the caller sees,
-- exactly as the list did. Days are on the facility's own clock.
--
-- Tested by supabase/tests/booking-client-summary.sql.
-- ============================================================================

create or replace function public.booking_client_summary(p_facility_id uuid)
returns table (
  client_ref bigint,
  booking_count integer,
  first_day date,
  last_day date,
  services text[],
  has_active boolean,
  rebooked_within_60_days boolean
)
language sql
stable
security invoker
set search_path = ''
as $fn$
  with history as (
    select c.ref as client_ref,
           lower(b.service::text) as service,
           b.status::text as status,
           b.start_at,
           (b.start_at at time zone coalesce(f.timezone, 'America/Toronto'))::date as day,
           lag(b.start_at) over (partition by b.client_id order by b.start_at) as previous_start
      from public.bookings b
      join public.clients c on c.id = b.client_id
      join public.facilities f on f.id = b.facility_id
     where b.facility_id = p_facility_id
  )
  select client_ref,
         count(*)::integer,
         min(day),
         max(day),
         coalesce(array_agg(distinct service) filter (where service is not null), '{}'),
         bool_or(status in ('confirmed', 'pending')),
         bool_or(previous_start is not null and start_at - previous_start <= interval '60 days')
    from history
   group by client_ref;
$fn$;

revoke all on function public.booking_client_summary(uuid) from public;
revoke all on function public.booking_client_summary(uuid) from anon;
grant execute on function public.booking_client_summary(uuid) to authenticated;

do $check$
begin
  if has_function_privilege('anon', 'public.booking_client_summary(uuid)', 'execute') then
    raise exception 'anon can execute booking_client_summary';
  end if;
  if not has_function_privilege('authenticated', 'public.booking_client_summary(uuid)', 'execute') then
    raise exception 'authenticated cannot execute booking_client_summary';
  end if;
end $check$;
