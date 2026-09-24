-- ============================================================================
-- A late check-out holds the kennel for that night. See
-- 20260924200000_a_late_checkout_holds_the_kennel_for_that_night.sql
--
--   bun run test:sql lodging-checkout-cutoff
--
-- One transaction, rolled back. It provisions its own facility.
--
-- ── WHAT THIS FILE IS ABOUT ────────────────────────────────────────────────
--
-- C0  WITH NO CUT-OFF SET, NOTHING CHANGES. The regression guard: every
--     facility in the product today has no `lodging_config` row, and their
--     kennels must behave exactly as they did yesterday.
-- C1  A check-out BEFORE the cut-off leaves the kennel free that day — the
--     next guest may arrive.
-- C2  A check-out AT OR AFTER the cut-off holds the kennel, and the next
--     guest is refused. This is the phase.
-- C3  The boundary is AT, not after: a 14:00 cut-off and a 14:00 check-out
--     holds the night. MoéGo's own wording.
-- C4  It is idempotent. The trigger fires on every update, and a range already
--     extended to midnight must not creep another day each time.
-- C5  A REAL check-out time counts, not only the booked one — "applies to both
--     real check-out times and scheduled end times".
-- C6  A malformed or disabled setting is no cut-off at all, and anon cannot
--     read the setting.
--
-- ── WHICH OF THESE ACTUALLY PROVE THE TRIGGER ─────────────────────────────
--
-- Measured by running the file with the trigger disabled: C2, C3 and C5 FAIL
-- and the rest pass. Those three are the hold. C0, C1, C4 and C6 assert the
-- OPPOSITE — that a kennel stays free, that the range does not creep, that a
-- non-setting is not a setting — and would catch a trigger that held a kennel
-- it should not. Both halves earn their place; only the first is evidence
-- that the cut-off works.
-- ============================================================================

begin;

set local client_min_messages to warning;

create temp table tap (n int, name text, ok boolean, detail text);

create or replace function pg_temp.t(i int, p text, ok boolean, d text default '')
returns void language sql as $$
  insert into tap(n, name, ok, detail) values (i, p, ok, d);
$$;

insert into public.profiles (id, email, full_name) values
  ('user_lccAdmin000000000000000000000', 'lccadmin@yipyy.invalid', 'LCC Admin')
on conflict (id) do nothing;

insert into public.platform_memberships (profile_id, role) values
  ('user_lccAdmin000000000000000000000', 'superadmin')
on conflict (profile_id) do nothing;

select set_config('request.jwt.claims',
  json_build_object('sub','user_lccAdmin000000000000000000000','role','authenticated')::text, true);
set local role authenticated;

do $$
begin
  perform public.provision_facility('0000000f-0000-4000-8000-00000000000c'::uuid,
    'Nu Pets', 'nu-pets-lcc', 'America/Toronto', 'N Owner', 'nowner@nu.invalid');
end $$;

reset role;

do $$
declare v_fac uuid; v_cat uuid; v_client uuid;
begin
  select id into v_fac from public.facilities where slug = 'nu-pets-lcc';

  insert into public.room_categories
    (facility_id, legacy_id, service, name, default_capacity)
  values (v_fac, 'lcc-kennel', 'boarding', 'LCC Kennels', 2)
  returning id into v_cat;

  insert into public.facility_rooms (facility_id, category_id, legacy_id, name)
  values (v_fac, v_cat, 'lcc-1', 'LCC Kennel 1');

  insert into public.clients (facility_id, name, email, status, details)
  values (v_fac, 'Nadia Cruz', 'nadia@cruz.invalid', 'active', '{}'::jsonb)
  returning id into v_client;

  insert into public.pets (facility_id, client_id, name, species)
  values (v_fac, v_client, 'Pepper', 'Dog');
end $$;

-- A stay whose check-out is at a given LOCAL time on a given day.
create or replace function pg_temp.stay(
  p_from date,
  p_to date,
  p_out_time text default '11:00'
) returns uuid
language plpgsql
as $$
declare
  v_fac uuid; v_client uuid; v_room uuid; v_booking uuid;
  v_start timestamptz; v_end timestamptz;
begin
  select id into v_fac from public.facilities where slug = 'nu-pets-lcc';
  select id into v_client from public.clients
   where facility_id = v_fac and email = 'nadia@cruz.invalid';
  select id into v_room from public.facility_rooms
   where facility_id = v_fac and legacy_id = 'lcc-1';

  v_start := (p_from::text || ' 15:00')::timestamp at time zone 'America/Toronto';
  v_end   := (p_to::text || ' ' || p_out_time)::timestamp at time zone 'America/Toronto';

  insert into public.bookings
    (facility_id, client_id, service, service_type, status, start_at, end_at,
     base_price, total_cost)
  values (v_fac, v_client, 'boarding', 'LCC stay', 'confirmed', v_start, v_end, 100, 100)
  returning id into v_booking;

  insert into public.boarding_stays (booking_id, facility_id, room_id, occupies)
  values (v_booking, v_fac, v_room, tstzrange(v_start, v_end, '[)'));

  return v_booking;
end;
$$;

-- Does a stay arriving at 15:00 on `p_day` fit?
create or replace function pg_temp.next_guest_fits(p_day date) returns boolean
language plpgsql
as $$
begin
  perform pg_temp.stay(p_day, p_day + 3, '11:00');
  return true;
exception when exclusion_violation then
  return false;
end;
$$;

create or replace function pg_temp.set_cutoff(p_enabled boolean, p_time text)
returns void language plpgsql as $$
declare v_fac uuid;
begin
  select id into v_fac from public.facilities where slug = 'nu-pets-lcc';
  insert into public.facility_settings (facility_id, domain, value)
  values (v_fac, 'lodging_config',
          jsonb_build_object('checkoutCutOff',
            jsonb_build_object('enabled', p_enabled, 'time', p_time)))
  on conflict (facility_id, domain) do update set value = excluded.value;
end $$;

-- ── C0 with no cut-off, nothing changes ───────────────────────────────────

do $$
declare v_fits boolean;
begin
  -- Out at 15:00 on the 5th — LATE, but there is no cut-off, so the kennel is
  -- free and the next guest arrives the same afternoon. This is every facility
  -- in the product today.
  perform pg_temp.stay('2028-01-01', '2028-01-05', '15:00');
  v_fits := pg_temp.next_guest_fits('2028-01-05');
  perform pg_temp.t(0,
    'with no cut-off set, a late check-out still frees the kennel that day',
    v_fits,
    'the regression guard: no facility has this row today');
end $$;

-- ── C1-C3 the rule ────────────────────────────────────────────────────────

do $$
declare v_early boolean; v_late boolean; v_exact boolean;
begin
  perform pg_temp.set_cutoff(true, '14:00');

  perform pg_temp.stay('2028-02-01', '2028-02-05', '11:00');
  v_early := pg_temp.next_guest_fits('2028-02-05');

  perform pg_temp.stay('2028-03-01', '2028-03-05', '15:00');
  v_late := pg_temp.next_guest_fits('2028-03-05');

  perform pg_temp.stay('2028-04-01', '2028-04-05', '14:00');
  v_exact := pg_temp.next_guest_fits('2028-04-05');

  perform pg_temp.t(1,
    'a check-out BEFORE the cut-off leaves the kennel free that day',
    v_early, '11:00 out, 14:00 cut-off');

  perform pg_temp.t(2,
    'a check-out AFTER the cut-off holds the kennel, and the next guest is refused',
    not v_late, '15:00 out, 14:00 cut-off');

  perform pg_temp.t(3,
    'the boundary is AT the cut-off, not after it',
    not v_exact, '14:00 out, 14:00 cut-off — MoeGo says at or after');
end $$;

-- ── C4 idempotent ─────────────────────────────────────────────────────────

do $$
declare
  v_booking uuid; v_first timestamptz; v_after timestamptz; i int;
begin
  perform pg_temp.set_cutoff(true, '14:00');
  v_booking := pg_temp.stay('2028-05-01', '2028-05-05', '16:00');

  select upper(occupies) into v_first
    from public.boarding_stays where booking_id = v_booking;

  -- The trigger fires on every update of occupies. Three more passes must not
  -- walk the range three more days.
  for i in 1..3 loop
    update public.boarding_stays
       set occupies = occupies
     where booking_id = v_booking;
  end loop;

  select upper(occupies) into v_after
    from public.boarding_stays where booking_id = v_booking;

  perform pg_temp.t(4,
    'extending is idempotent — the range does not creep a day per update',
    v_first = v_after,
    format('first=%s after three more updates=%s', v_first, v_after));
end $$;

-- ── C5 a real check-out counts, not only the booked one ───────────────────

do $$
declare v_booking uuid; v_before timestamptz; v_after timestamptz; v_fits boolean;
begin
  perform pg_temp.set_cutoff(true, '14:00');

  -- Booked out at 11:00, which is early — so no hold at first.
  v_booking := pg_temp.stay('2028-06-01', '2028-06-05', '11:00');
  select upper(occupies) into v_before
    from public.boarding_stays where booking_id = v_booking;

  -- They actually left at 16:30. MoeGo: "applies to both real check-out times
  -- and scheduled end times."
  update public.boarding_stays
     set checked_in_at = ('2028-06-01 15:00'::timestamp at time zone 'America/Toronto'),
         checked_out_at = ('2028-06-05 16:30'::timestamp at time zone 'America/Toronto')
   where booking_id = v_booking;

  select upper(occupies) into v_after
    from public.boarding_stays where booking_id = v_booking;

  v_fits := pg_temp.next_guest_fits('2028-06-05');

  perform pg_temp.t(5,
    'a real check-out after the cut-off holds the night, though the booking said 11:00',
    v_after > v_before and not v_fits,
    format('booked upper=%s actual upper=%s next guest fits=%s',
           v_before, v_after, v_fits));
end $$;

-- ── C6 a setting that is not a setting ────────────────────────────────────

do $$
declare v_fac uuid; v_off boolean; v_junk boolean; v_none time;
begin
  select id into v_fac from public.facilities where slug = 'nu-pets-lcc';

  perform pg_temp.set_cutoff(false, '14:00');
  v_off := private.checkout_cut_off(v_fac) is null;

  perform pg_temp.set_cutoff(true, 'half past two');
  v_junk := private.checkout_cut_off(v_fac) is null;

  perform pg_temp.t(6,
    'disabled is no cut-off, and neither is a time that is not a time',
    v_off and v_junk
      and not has_function_privilege('anon', 'private.checkout_cut_off(uuid)', 'execute'),
    format('disabled=null:%s malformed=null:%s', v_off, v_junk));
end $$;

-- ── Report ──────────────────────────────────────────────────────────────────
select case when ok then '  PASS  ' else '> FAIL <' end as result, name, detail
  from tap order by n;

select count(*) filter (where ok) || ' passed, '
    || count(*) filter (where not ok) || ' failed' as summary
  from tap;

rollback;
