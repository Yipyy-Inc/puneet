-- ============================================================================
-- Payroll knows what a week costs, not just what an hour does.
--
-- ── WHAT THIS REPLACES ────────────────────────────────────────────────────
--
-- `payroll_summary()` computed gross as minutes/60 * hourly_rate and nothing
-- else. Somebody who works 48 hours in a week was paid 48 x rate, and somebody
-- who worked a statutory holiday was paid an ordinary day.
--
-- The holiday half already existed on the OTHER side of the module: the
-- calendar drew "x1.5 pay rate" on a holiday from `holidayRates`, and payroll
-- had never heard of the list. So the roster told a manager a day cost time and
-- a half while the wage bill for that day was flat.
--
-- ── THE RULES ARE THE FACILITY'S, AND MAY BE ABSENT ───────────────────────
--
-- Read from `facility_settings` under the `payroll_config` domain. Absent means
-- ABSENT: no overtime is computed and `overtime_configured` comes back false,
-- so a screen can say "nobody has set this" rather than presenting a flat run
-- as a finished one. Defaulting to 40h/1.5x would have every facility on the
-- platform paying against a threshold this file invented — the same reason
-- `tax_config` falls back to no tax rather than Quebec's GST.
--
-- ── OVERTIME IS WEEKLY, AND A PAY PERIOD IS NOT ───────────────────────────
--
-- A fortnight holds two weeks. Summing 80 hours across 14 days against a
-- 40-hour threshold finds 40 hours of overtime nobody worked, and misses the
-- person who did 50 then 30 — who is owed 10.
--
-- So entries are bucketed into weeks that start on `weekStartsOn` (0 = Sunday),
-- IN THE FACILITY'S TIMEZONE. `date_trunc('week')` is not used: it is
-- ISO-Monday only, and a facility whose week starts Sunday would have every
-- Sunday counted against the wrong week's threshold.
--
-- ── WHICH HOURS ARE THE OVERTIME ONES ─────────────────────────────────────
--
-- The LAST ones worked in the week. Entries are ordered by clock-in and given a
-- running total; the part of an entry lying beyond the threshold is its
-- overtime portion. That matters because rates differ per entry — somebody can
-- work two positions in a week — so "the overtime hours" has to name specific
-- minutes rather than a blended average nobody agreed to.
--
-- ── AND NO MINUTE IS PAID TWICE ───────────────────────────────────────────
--
-- Holiday minutes pay at the holiday multiplier and are NOT also given the
-- overtime premium, though they still COUNT toward the weekly threshold — an
-- hour worked is an hour worked. Jurisdictions differ on whether the two
-- compound; paying one minute two premiums is wrong everywhere, so that is the
-- line drawn here.
--
-- ── STILL SECURITY DEFINER FOR THE SAME REASON ────────────────────────────
--
-- Atomicity and one permission check, not privilege: `view_payroll` is asserted
-- first and the function reads nothing the caller could not.
-- ============================================================================

-- ── A DROP, NOT A REPLACE, AND THE GRANT COMES BACK WITH IT ───────────────
--
-- `create or replace` cannot change a function's return type, and this adds six
-- columns to the RETURNS TABLE — it would fail with "cannot change return type
-- of existing function". Dropping first is the only route.
--
-- Dropping also takes the EXECUTE grants with it. `authenticated` had one and
-- must get it back, or every caller gets a permission error from PostgREST that
-- looks nothing like the real cause. Both statements are in one migration, so
-- there is no window where the function exists ungranted.
--
-- `revoke ... from anon` is separate from `revoke ... from public`, and neither
-- is implied by the other — see the debt map, which records that mistake three
-- times. Default privileges here grant EXECUTE to PUBLIC, so it is revoked
-- explicitly before the narrow grant.
drop function if exists public.payroll_summary(uuid, date, date);

create function public.payroll_summary(
  p_facility_id uuid,
  p_from        date,
  p_to          date
)
returns table (
  staff_id            uuid,
  first_name          text,
  last_name           text,
  sessions            integer,
  hourly_minutes      integer,
  salaried_minutes    integer,
  unpriced_minutes    integer,
  regular_minutes     integer,
  overtime_minutes    integer,
  holiday_minutes     integer,
  gross               numeric,
  overtime_pay        numeric,
  holiday_premium     numeric,
  open_sessions       integer,
  overtime_configured boolean
)
language plpgsql
security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  v_timezone     text;
  v_from         timestamptz;
  v_to           timestamptz;
  v_config       jsonb;
  v_ot_enabled   boolean;
  v_ot_threshold numeric;
  v_ot_multiple  numeric;
  v_week_starts  integer;
begin
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

  v_from := (p_from::timestamp at time zone v_timezone);
  v_to   := ((p_to + 1)::timestamp at time zone v_timezone);

  -- Absent row, absent domain and absent keys all mean the same thing: nobody
  -- has said. Never a default threshold.
  select s.value into v_config
    from public.facility_settings s
   where s.facility_id = p_facility_id
     and s.domain = 'payroll_config';

  v_ot_enabled   := coalesce((v_config -> 'overtime' ->> 'enabled')::boolean, false);
  v_ot_threshold := coalesce((v_config -> 'overtime' ->> 'weeklyThresholdHours')::numeric, 0);
  v_ot_multiple  := coalesce((v_config -> 'overtime' ->> 'multiplier')::numeric, 1);
  v_week_starts  := coalesce((v_config ->> 'weekStartsOn')::integer, 0);

  -- A threshold of zero with overtime "on" would make every minute overtime.
  -- Treat it as unconfigured rather than as a rule somebody meant.
  if v_ot_threshold <= 0 then
    v_ot_enabled := false;
  end if;

  return query
  with entries as (
    select
      e.id,
      e.staff_id                                    as sid,
      e.minutes_worked                              as minutes,
      e.clocked_in_at,
      e.clocked_out_at is null                      as still_open,
      pay.pay_type,
      pay.hourly_rate,
      -- The facility's own calendar date, which is what a holiday is declared
      -- against and what a week is bucketed by.
      (e.clocked_in_at at time zone v_timezone)::date as local_date
    from public.staff_time_clock_entries e
    left join public.staff_shifts s        on s.id = e.shift_id
    left join public.facility_position_pay pay on pay.position_id = s.position_id
    where e.facility_id = p_facility_id
      and e.clocked_in_at >= v_from
      and e.clocked_in_at <  v_to
  ),
  priced as (
    select
      en.*,
      -- Paid work is an hourly position with a rate on it. Everything else is
      -- salaried (worked, but not billed by the hour) or unpriced (no shift, or
      -- a position nobody has rated) and is reported separately rather than
      -- folded into zero.
      (not en.still_open
        and en.pay_type = 'hourly'
        and en.hourly_rate is not null)              as billable,
      -- The holiday multiplier for the day this entry was worked, if the
      -- facility declared one. `1` means an ordinary day.
      coalesce((
        select (h ->> 'multiplier')::numeric
          from jsonb_array_elements(coalesce(v_config -> 'holidays', '[]'::jsonb)) h
         where (h ->> 'date') = en.local_date::text
         limit 1
      ), 1)                                          as holiday_multiple,
      -- The start of this entry's week, in the facility's calendar, on the
      -- facility's chosen first day. NOT date_trunc('week') — that is
      -- ISO-Monday only.
      en.local_date
        - (((extract(dow from en.local_date)::integer - v_week_starts) + 7) % 7)
                                                     as week_start
    from entries en
  ),
  -- Running total of BILLABLE minutes within a staff member's week, ordered by
  -- when they were worked. The overtime hours are the last ones.
  running as (
    select
      p.*,
      coalesce(sum(case when p.billable then p.minutes else 0 end)
               over (partition by p.sid, p.week_start
                     order by p.clocked_in_at, p.id
                     rows between unbounded preceding and 1 preceding), 0)
                                                     as minutes_before
    from priced p
  ),
  split as (
    select
      r.*,
      case when r.billable then r.minutes else 0 end  as billable_minutes,
      -- The portion of THIS entry lying beyond the weekly threshold. Zero when
      -- overtime is unconfigured, and zero for a holiday entry, which is
      -- already carrying a premium.
      case
        when not r.billable or not v_ot_enabled or r.holiday_multiple > 1 then 0
        else greatest(
               0,
               least(
                 r.minutes,
                 (r.minutes_before + r.minutes) - (v_ot_threshold * 60)
               )
             )
      end                                            as ot_minutes
    from running r
  ),
  lines as (
    select
      s.sid,
      s.still_open,
      s.pay_type,
      s.hourly_rate,
      s.minutes,
      s.billable,
      s.billable_minutes,
      s.holiday_multiple,
      s.ot_minutes,
      case when s.holiday_multiple > 1 then s.billable_minutes else 0 end
                                                     as holiday_minutes,
      case
        when s.holiday_multiple > 1 then 0
        else s.billable_minutes - s.ot_minutes
      end                                            as regular_minutes
    from split s
  )
  select
    st.id,
    st.first_name,
    st.last_name,
    count(*) filter (where not l.still_open)::integer,
    coalesce(sum(l.minutes) filter (where l.billable), 0)::integer,
    coalesce(sum(l.minutes) filter (
      where not l.still_open and l.pay_type = 'salary'
    ), 0)::integer,
    coalesce(sum(l.minutes) filter (
      where not l.still_open
        and (l.pay_type is null or (l.pay_type = 'hourly' and l.hourly_rate is null))
    ), 0)::integer,
    coalesce(sum(l.regular_minutes), 0)::integer,
    coalesce(sum(l.ot_minutes), 0)::integer,
    coalesce(sum(l.holiday_minutes), 0)::integer,
    -- Gross: ordinary minutes at rate, overtime minutes at rate x multiplier,
    -- holiday minutes at rate x that day's multiplier. Every billable minute
    -- appears in exactly one of the three.
    coalesce(round(sum(
      (l.regular_minutes::numeric / 60) * coalesce(l.hourly_rate, 0)
      + (l.ot_minutes::numeric / 60) * coalesce(l.hourly_rate, 0) * v_ot_multiple
      + (l.holiday_minutes::numeric / 60) * coalesce(l.hourly_rate, 0) * l.holiday_multiple
    ), 2), 0),
    -- The PREMIUM alone, not the whole overtime line: what those hours cost
    -- ABOVE what they would have at the ordinary rate. That is the number a
    -- facility is deciding about when it looks at a rota.
    coalesce(round(sum(
      (l.ot_minutes::numeric / 60) * coalesce(l.hourly_rate, 0) * (v_ot_multiple - 1)
    ), 2), 0),
    coalesce(round(sum(
      (l.holiday_minutes::numeric / 60) * coalesce(l.hourly_rate, 0)
        * (l.holiday_multiple - 1)
    ), 2), 0),
    count(*) filter (where l.still_open)::integer,
    v_ot_enabled
  from lines l
  join public.staff st on st.id = l.sid
  group by st.id, st.first_name, st.last_name
  order by st.last_name, st.first_name;
end;
$$;

comment on function public.payroll_summary(uuid, date, date) is
  'What we owe people for a period. Overtime is weekly, bucketed in the facility timezone on its own first-day-of-week; holiday hours pay their declared multiplier and are not also given the overtime premium. Rules come from facility_settings.payroll_config and may be absent — see overtime_configured.';

revoke all on function public.payroll_summary(uuid, date, date) from public, anon;
grant execute on function public.payroll_summary(uuid, date, date) to authenticated, service_role;
