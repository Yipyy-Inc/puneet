-- ============================================================================
-- The person at the door can open it.
--
-- ── THE DEFECT, MEASURED ──────────────────────────────────────────────────
--
-- `boarding_stays` is written under `private.can_write_booking`, which asks for
-- `edit_bookings` or `create_bookings`. `boarding_attendant` holds NEITHER. It
-- holds `check_in_out` and `boarding_assign_kennels`.
--
-- So with 20260806900000 alone, the role whose entire job is meeting guests at
-- the door could not record one arriving. Probed on the live database before
-- writing this:
--
--     set local role authenticated;   -- as a boarding_attendant
--     update public.boarding_stays set checked_in_at = now() where ...;
--     -- => UPDATE 0, no error
--     select checked_in_at, status ...;
--     -- => null, 'scheduled'
--
-- AND IT REPORTED SUCCESS. An UPDATE refused by a policy's `using` clause
-- matches no rows and raises nothing, so the board would have said "checked in"
-- and the database would have kept saying "scheduled" — the failure mode
-- 20260806640000 rewrote `assign_boarding_room` to avoid.
--
-- The same shape of mistake as gating the daycare board on
-- `daycare_view_dashboard` (a manager's permission) instead of
-- `daycare_check_in_out`, or the kennel read on a manager's (20260806660000).
-- It keeps recurring because the permission that names the SCREEN and the
-- permission held by the people STANDING at it are rarely the same one.
--
-- ── WHY A FUNCTION AND NOT A SECOND POLICY ────────────────────────────────
--
-- Policies are OR'ed, so a second UPDATE policy keyed on `check_in_out` would
-- have worked — and would also have handed every check_in_out holder the right
-- to rewrite `room_id`, `occupies` and `override_reason`, because RLS decides
-- WHICH ROWS you may write and never which columns. Assigning kennels is a
-- different permission (`boarding_assign_kennels`) reached through a different
-- door (`assign_boarding_room`), and collapsing the two would be a real
-- widening dressed up as a bug fix.
--
-- So arrivals get their own narrow entrance. It touches two columns and no
-- others, and it is the reason `boarding_stays` keeps its strict policies.
--
-- ── IT RAISES, WHICH IS THE OTHER HALF ────────────────────────────────────
--
-- Inside the function the row count is available, so a refusal is a 42501 the
-- caller can show. That is the whole argument of 20260806640000 and it applies
-- here for the same reason: silence is the dangerous answer.
--
-- `check_in_out` and not a new `boarding_check_in_out`: the permission already
-- exists, boarding_attendant already holds it, and inventing a second key for
-- the same act would leave every existing facility's roles silently missing it.
-- ============================================================================

-- `bigint`, matching `bookings.ref` and `assign_boarding_room`. An `integer`
-- parameter does not match a bigint argument, so the first draft of this
-- resolved to "function does not exist" the moment it was called with a real
-- ref.
create or replace function public.record_boarding_arrival(
  p_booking_ref bigint,
  p_action      text
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_booking      public.bookings%rowtype;
  v_stay         public.boarding_stays%rowtype;
  v_checked_in   timestamptz;
  v_checked_out  timestamptz;
  v_status       text;
begin
  if p_action not in ('check_in', 'check_out', 'reopen', 'revert') then
    raise exception 'Unknown action "%".', p_action using errcode = '22023';
  end if;

  select * into v_booking from public.bookings where ref = p_booking_ref;
  if not found then
    raise exception 'That booking does not exist.' using errcode = 'P0002';
  end if;

  -- The gate, and the only thing scoping this function to the caller's own
  -- facility: has_permission is false for every facility they are not in, so a
  -- ref belonging to somebody else's business is a 42501 and not a leak.
  if not private.has_permission(v_booking.facility_id, 'check_in_out') then
    raise exception 'Not allowed to check guests in or out at this facility.'
      using errcode = '42501';
  end if;

  if v_booking.service <> 'boarding' then
    raise exception 'That booking is not a boarding booking.'
      using errcode = '22023';
  end if;

  select * into v_stay from public.boarding_stays where booking_id = v_booking.id;
  if not found then
    -- 55000 (object_not_in_prerequisite_state), distinct from the P0002 above
    -- so the route can tell "no such booking" (404) from "this booking is not
    -- ready to be checked in" (409). Not a permissions problem and not a
    -- malformed request: a real state with a fix one screen away.
    raise exception
      'This guest has no kennel yet. Assign one on Boarding Ops, then check in.'
      using errcode = '55000';
  end if;

  v_checked_in  := v_stay.checked_in_at;
  v_checked_out := v_stay.checked_out_at;

  if p_action = 'check_in' then
    if v_booking.status in ('cancelled', 'declined') then
      raise exception
        'That booking is cancelled. Reinstate it before checking in.'
        using errcode = '22023';
    end if;
    -- Pressing it twice is somebody making sure, not the guest arriving again,
    -- so the arrival time does not move.
    if v_checked_in is null or v_checked_out is not null then
      v_checked_in  := now();
      v_checked_out := null;
    end if;

  elsif p_action = 'check_out' then
    if v_checked_in is null then
      raise exception 'This guest has not been checked in yet.'
        using errcode = '22023';
    end if;
    v_checked_out := now();

  elsif p_action = 'reopen' then
    v_checked_out := null;

  else -- revert
    -- Undo runs backwards. Jumping straight from "collected" to "never here"
    -- erases a departure and an arrival in one press, and the kennel was
    -- certainly occupied on those nights.
    if v_checked_out is not null then
      raise exception
        'This stay has been checked out. Reopen it first, then revert the arrival.'
        using errcode = '22023';
    end if;
    if v_checked_in is null then
      raise exception 'This guest was never checked in.' using errcode = '22023';
    end if;
    v_checked_in := null;
  end if;

  update public.boarding_stays
     set checked_in_at  = v_checked_in,
         checked_out_at = v_checked_out,
         updated_at     = now()
   where booking_id = v_booking.id
  returning status into v_status;

  return v_status;
end $$;

revoke all on function public.record_boarding_arrival(bigint, text) from public;
grant execute on function public.record_boarding_arrival(bigint, text) to authenticated;

comment on function public.record_boarding_arrival(bigint, text) is
  'The only write path for boarding arrivals and departures. SECURITY DEFINER '
  'so that check_in_out — the permission the people at the door actually hold — '
  'is enough, without widening the boarding_stays policies that protect the '
  'kennel assignment itself.';
