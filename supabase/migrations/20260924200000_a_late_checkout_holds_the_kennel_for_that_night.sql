-- ============================================================================
-- A LATE CHECK-OUT HOLDS THE KENNEL FOR THAT NIGHT.
--
-- Phase 3 of the MoéGo lodging work — the checkout cut-off time, from
-- Settings > Lodgings > Manage checkout cut-off time.
--
-- MoéGo:
--   "Boarding appointments that check out at or after the cut-off time →
--    Count toward that night's boarding capacity"
--   "...check out before the cut-off time → Do not count toward that night's
--    capacity."
--   "When the checkout cut-off time is enabled, rooms will be marked as
--    unavailable for same-day boarding if a pet checks out at or after the
--    cut-off time."
--   "The setting applies to both real check-out times and scheduled end times."
--
-- ── DECISION 4 LEFT THE DOOR OPEN FOR THIS ────────────────────────────────
--
-- 20260806600000 stored `occupies` rather than deriving it from the booking,
-- and said why: "Storing it also leaves room for the truth: a stay occupies
-- the room for the nights between check-in and check-out, which is not
-- identical to the booking's own timestamps. TODAY IT MIRRORS THEM EXACTLY."
--
-- The cut-off is the first rule where it must stop mirroring them. This walks
-- through the door that decision left open rather than reversing it.
--
-- ── ONE PLACE, BECAUSE THERE ARE FOUR WRITERS ─────────────────────────────
--
-- `occupies` is written by `create_booking`, by `assign_boarding_room`, and by
-- `sync_boarding_stay` when a booking's dates move — and re-declaring three
-- functions to add one rule is three chances to get it wrong and three places
-- for the next rule to be forgotten.
--
-- So it is a BEFORE trigger on the stay itself. Every writer inherits it,
-- including the ones written after today.
--
-- ── IT ONLY EVER EXTENDS ──────────────────────────────────────────────────
--
-- The upper bound moves out to the next local midnight, or it is left alone.
-- It never moves IN. An early check-out freeing the kennel mid-stay would be a
-- separate decision with its own money consequences (a night already charged),
-- and this phase is not that decision.
--
-- That also makes it idempotent, which matters because the trigger fires again
-- on every update: once extended to midnight, the checkout moment's local time
-- is 00:00, which is before any cut-off, so it extends no further.
--
-- ── THE FACILITY'S CLOCK, NOT THE SERVER'S ────────────────────────────────
--
-- "Next midnight" is meaningless without a timezone, and a facility in
-- Vancouver does not close when one in Toronto does. `facilities.timezone` is
-- the authority, defaulting to America/Toronto as the rest of the schema does.
--
-- SQL C0-C6 in lodging-checkout-cutoff.sql.
-- ============================================================================

-- ── What the facility set, if anything ─────────────────────────────────────
--
-- Null means "no cut-off in force", and it is returned for every way of not
-- having one: the row absent, the domain absent, disabled, or a time that is
-- not a time. A malformed value must not become midnight — that would hold
-- every kennel for an extra night on a typo.
create or replace function private.checkout_cut_off(p_facility_id uuid)
returns time
language sql
stable
security definer
set search_path = ''
as $fn$
  select case
           when coalesce((s.value -> 'checkoutCutOff' ->> 'enabled')::boolean, false)
                and (s.value -> 'checkoutCutOff' ->> 'time') ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'
             then (s.value -> 'checkoutCutOff' ->> 'time')::time
           else null
         end
    from public.facility_settings s
   where s.facility_id = p_facility_id
     and s.domain = 'lodging_config';
$fn$;

comment on function private.checkout_cut_off(uuid) is
  'The facility checkout cut-off as a local time, or null when there is none — '
  'row absent, disabled, or a malformed time. Never guesses a time, because a '
  'wrong guess holds every kennel an extra night.';

revoke all on function private.checkout_cut_off(uuid) from public;
revoke all on function private.checkout_cut_off(uuid) from anon;
grant execute on function private.checkout_cut_off(uuid) to authenticated, service_role;

-- ── The rule ───────────────────────────────────────────────────────────────

create or replace function private.boarding_stay_apply_cutoff()
returns trigger
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  v_cut      time;
  v_tz       text;
  v_upper    timestamptz;
  v_checkout timestamptz;
  v_local    timestamp;
  v_extended timestamptz;
begin
  v_cut := private.checkout_cut_off(new.facility_id);
  if v_cut is null then
    return new;
  end if;

  v_upper := upper(new.occupies);
  if v_upper is null then
    return new;
  end if;

  -- "applies to both real check-out times and scheduled end times" — the real
  -- one when it is known, the booked one until then.
  v_checkout := coalesce(new.checked_out_at, v_upper);

  select coalesce(f.timezone, 'America/Toronto') into v_tz
    from public.facilities f where f.id = new.facility_id;
  v_tz := coalesce(v_tz, 'America/Toronto');

  v_local := v_checkout at time zone v_tz;

  -- AT or AFTER. MoeGo's wording, and the boundary matters: a cut-off of 14:00
  -- with a 14:00 check-out holds the night.
  if v_local::time >= v_cut then
    v_extended := ((date_trunc('day', v_local) + interval '1 day') at time zone v_tz);
    -- Extend only.
    if v_extended > v_upper then
      new.occupies := tstzrange(lower(new.occupies), v_extended, '[)');
    end if;
  end if;

  return new;
end;
$fn$;

comment on function private.boarding_stay_apply_cutoff() is
  'Holds the kennel to the next local midnight when the check-out is at or '
  'after the facility cut-off. Extends only, never shrinks, so it is idempotent '
  'and cannot free a kennel somebody paid for.';

revoke all on function private.boarding_stay_apply_cutoff() from public;
revoke all on function private.boarding_stay_apply_cutoff() from anon;

-- AFTER `boarding_stays_set_space_type`, which is alphabetical among BEFORE
-- row triggers on the same table and sorts first by luck rather than by
-- design — but this one reads neither space_type nor anything that trigger
-- writes, so the order does not matter. It is stated so the next reader does
-- not have to work that out.
drop trigger if exists boarding_stays_apply_cutoff on public.boarding_stays;
create trigger boarding_stays_apply_cutoff
  before insert or update of occupies, checked_out_at on public.boarding_stays
  for each row execute function private.boarding_stay_apply_cutoff();
