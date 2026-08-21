-- ============================================================================
-- Payroll: what we owe people for a period that has ended.
--
-- ── WHY THIS IS A FUNCTION AND NOT A SCREEN'S QUERY ───────────────────────
--
-- The ACCOUNTANT is the caller this exists for, and they are staff-level: they
-- do not hold `scheduling_view_all`, so RLS will not show them another
-- person's clock entries or the shifts those were worked against. Both are
-- correct — an accountant has no business browsing the rota.
--
-- The alternative was widening two read policies to admit `view_payroll`, which
-- would hand them every shift and every session as raw rows to get at a total.
-- This returns the TOTAL and nothing else: one gate, minimum privilege, and no
-- new way to read the roster.
--
-- ── WHAT IT WILL NOT DO IS INVENT A RATE ──────────────────────────────────
--
-- An hour is priced by the POSITION of the shift it was worked against. Three
-- things follow, and all three are reported rather than smoothed over:
--
--   hourly_minutes    the shift's position pays by the hour → there is a gross
--   salaried_minutes  the position pays a salary → hours worked are real, but
--                     the pay does not come from them, and dividing an annual
--                     figure by a guess at a working year would be a number
--                     nobody agreed to
--   unpriced_minutes  no shift at all (somebody covered), or a position with no
--                     rate set — genuine work that cannot be priced yet
--
-- A payroll screen that quietly folded the last two into zero would understate
-- the wage bill and look tidy doing it.
--
-- ── A SESSION BELONGS TO THE DAY IT STARTED ───────────────────────────────
--
-- The same rule shifts use. A night session that begins on the 31st is in that
-- month's payroll, not the next one's, however far past midnight it runs.
--
-- ── AND OPEN SESSIONS ARE COUNTED SEPARATELY ──────────────────────────────
--
-- Somebody still on the clock has no duration yet. They are surfaced as a count
-- so the screen can say "two people are still clocked in" rather than closing a
-- pay period over hours that have not finished happening.
-- ============================================================================

create or replace function public.payroll_summary(
  p_facility_id uuid,
  p_from        date,
  p_to          date
)
returns table (
  staff_id         uuid,
  first_name       text,
  last_name        text,
  sessions         integer,
  hourly_minutes   integer,
  salaried_minutes integer,
  unpriced_minutes integer,
  gross            numeric,
  open_sessions    integer
)
language plpgsql
security definer
set search_path = ''
as $fn$
#variable_conflict use_column
declare
  v_timezone text;
  v_from     timestamptz;
  v_to       timestamptz;
begin
  -- ASKED FIRST, and against the facility the caller NAMED — so passing
  -- somebody else's id is refused rather than answered.
  if not private.has_permission(p_facility_id, 'view_payroll') then
    raise exception 'You do not have permission to see payroll.'
      using errcode = '42501';
  end if;

  if p_to < p_from then
    raise exception 'The period ends before it starts.' using errcode = '22023';
  end if;

  select coalesce(f.timezone, 'UTC') into v_timezone
    from public.facilities f
   where f.id = p_facility_id;

  -- The facility's own days, not UTC ones. A period boundary an hour out puts
  -- somebody's Friday night in the wrong fortnight.
  v_from := (p_from::timestamp at time zone v_timezone);
  v_to   := ((p_to + 1)::timestamp at time zone v_timezone);

  return query
  with worked as (
    select
      e.staff_id       as sid,
      e.minutes_worked as minutes,
      e.clocked_out_at is null as still_open,
      pay.pay_type,
      pay.hourly_rate
    from public.staff_time_clock_entries e
    left join public.staff_shifts s
      on s.id = e.shift_id
    left join public.facility_position_pay pay
      on pay.position_id = s.position_id
    where e.facility_id = p_facility_id
      -- A session belongs to the day it STARTED.
      and e.clocked_in_at >= v_from
      and e.clocked_in_at <  v_to
  )
  select
    st.id,
    st.first_name,
    st.last_name,
    count(*) filter (where not w.still_open)::integer,
    coalesce(sum(w.minutes) filter (
      where not w.still_open and w.pay_type = 'hourly' and w.hourly_rate is not null
    ), 0)::integer,
    coalesce(sum(w.minutes) filter (
      where not w.still_open and w.pay_type = 'salary'
    ), 0)::integer,
    coalesce(sum(w.minutes) filter (
      where not w.still_open
        and (w.pay_type is null or (w.pay_type = 'hourly' and w.hourly_rate is null))
    ), 0)::integer,
    coalesce(round(sum(
      case
        when not w.still_open and w.pay_type = 'hourly' and w.hourly_rate is not null
        then (w.minutes::numeric / 60) * w.hourly_rate
      end
    ), 2), 0),
    count(*) filter (where w.still_open)::integer
  from worked w
  join public.staff st on st.id = w.sid
  group by st.id, st.first_name, st.last_name
  order by st.last_name, st.first_name;
end;
$fn$;

comment on function public.payroll_summary(uuid, date, date) is
  'Per-person hours and gross for a pay period, gated on view_payroll. Returns the TOTAL and nothing else, so an accountant — who is staff-level and has no scheduling_view_all — never needs raw read on the roster. Hours that cannot be priced are reported as such, never folded into zero.';

revoke all on function public.payroll_summary(uuid, date, date) from public, anon;
grant execute on function public.payroll_summary(uuid, date, date) to authenticated;
