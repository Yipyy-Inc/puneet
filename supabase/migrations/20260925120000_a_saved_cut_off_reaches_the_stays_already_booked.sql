-- ============================================================================
-- A SAVED CUT-OFF REACHES THE STAYS ALREADY BOOKED.
--
-- 20260924200000 made a late check-out hold the kennel for that night, as a
-- BEFORE trigger on `boarding_stays` — so it applies when a stay is WRITTEN.
-- Nothing re-wrote the stays already booked. A facility that switched the
-- cut-off on would have held every late check-out booked from then on and
-- none of the ones already in the book: exactly the stays whose kennel it
-- meant to stop selling for the night.
--
-- And the setting had no screen. It could be switched on only by writing
-- `facility_settings` by hand, so the rule was reachable by nobody.
--
-- `save_checkout_cut_off` is what the screen calls. One transaction:
--
--   1. who may: a facility admin holding `settings_general` — the same test
--      `facility_settings_update` applies, so this is no wider than saving the
--      row directly;
--   2. the time is checked here as well as by the screen, because a malformed
--      one is silently "no cut-off" to `private.checkout_cut_off`;
--   3. the row is saved, keeping any other field `lodging_config` grows;
--   4. every UPCOMING stay is re-derived from its booking — `occupies` set
--      back to [start_at, end_at), which is what every writer sets, so the
--      apply-cut-off trigger decides afresh under the new setting.
--
-- ── RE-DERIVED, NOT MERELY TOUCHED ────────────────────────────────────────
--
-- The trigger only ever EXTENDS. Touching a stay (`set occupies = occupies`)
-- would hold late check-outs when the cut-off goes on, but never give a night
-- back when it goes off or moves later. Starting again from the booking's own
-- dates handles on, off and a changed time the same way.
--
-- ── A COLLISION IS REPORTED, NOT FORCED ───────────────────────────────────
--
-- Holding a late check-out's kennel can collide with a guest already booked
-- into it that evening — the very thing the cut-off prevents from now on, but
-- here the second booking already exists. That stay is left exactly as it
-- was, in its own savepoint, and its booking number is returned so somebody
-- can decide. The double-booking guard (23P01) and an area at capacity
-- (23514, hint area_full) are the two ways it refuses — and the second is a
-- DEFERRED trigger, so it is made immediate here or it would fail the whole
-- save at commit instead of the one stay.
--
-- Past stays and checked-out stays are history and are not touched.
--
-- SQL C7-C10 in lodging-checkout-cutoff.sql.
-- ============================================================================

create or replace function public.save_checkout_cut_off(
  p_facility_id uuid,
  p_enabled boolean,
  p_time text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  v_cut      jsonb;
  r          record;
  v_after    timestamptz;
  v_held     integer := 0;
  v_released integer := 0;
  v_conflicts jsonb := '[]'::jsonb;
begin
  if not (private.is_facility_admin(p_facility_id)
          and private.has_permission(p_facility_id, 'settings_general')) then
    raise exception 'You do not have permission to change lodging settings.'
      using errcode = '42501';
  end if;

  if p_time is not null
     and p_time !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' then
    raise exception 'The cut-off time must be HH:MM on a 24-hour clock.'
      using errcode = '22023';
  end if;
  if coalesce(p_enabled, false) and p_time is null then
    raise exception 'A cut-off that is on needs a time.'
      using errcode = '22023';
  end if;

  v_cut := jsonb_build_object('enabled', coalesce(p_enabled, false))
        || case when p_time is null then '{}'::jsonb
                else jsonb_build_object('time', p_time) end;

  insert into public.facility_settings (facility_id, domain, value)
  values (p_facility_id, 'lodging_config', jsonb_build_object('checkoutCutOff', v_cut))
  on conflict (facility_id, domain) do update
     set value = jsonb_set(
           coalesce(public.facility_settings.value, '{}'::jsonb),
           '{checkoutCutOff}',
           v_cut);

  -- The area check is a DEFERRED constraint trigger: it fires at commit, where
  -- one area pushed over capacity would fail the whole save — setting and all
  -- — instead of the one stay. Immediate for the rest of this transaction, so
  -- it fires inside each stay's own block below and is caught there.
  set constraints public.boarding_stays_area_within_capacity immediate;

  for r in
    select s.booking_id,
           upper(s.occupies) as upper_before,
           b.start_at,
           b.end_at,
           b.ref
      from public.boarding_stays s
      join public.bookings b on b.id = s.booking_id
     where s.facility_id = p_facility_id
       and s.released_at is null
       and s.checked_out_at is null
       and b.start_at is not null
       and b.end_at is not null
       and b.end_at > now()
     order by b.start_at, b.ref
  loop
    begin
      update public.boarding_stays
         set occupies = tstzrange(r.start_at, r.end_at, '[)'),
             updated_at = now()
       where booking_id = r.booking_id
      returning upper(occupies) into v_after;

      if v_after > r.upper_before then
        v_held := v_held + 1;
      elsif v_after < r.upper_before then
        v_released := v_released + 1;
      end if;
    exception
      when exclusion_violation or check_violation then
        v_conflicts := v_conflicts || to_jsonb(r.ref);
    end;
  end loop;

  return jsonb_build_object(
    'held', v_held,
    'released', v_released,
    'conflicts', v_conflicts);
end;
$fn$;

comment on function public.save_checkout_cut_off(uuid, boolean, text) is
  'Saves lodging_config.checkoutCutOff and re-derives every upcoming stay from its booking so the cut-off applies to stays already booked. Returns {held, released, conflicts[booking refs]}; a stay that would collide is left as it was. Facility admins with settings_general only. See 20260925120000.';

revoke all on function public.save_checkout_cut_off(uuid, boolean, text) from public;
revoke all on function public.save_checkout_cut_off(uuid, boolean, text) from anon;
grant execute on function public.save_checkout_cut_off(uuid, boolean, text) to authenticated, service_role;
