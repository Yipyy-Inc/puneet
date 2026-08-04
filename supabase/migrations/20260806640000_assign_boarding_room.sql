-- ============================================================================
-- Moving a guest between kennels, after the booking exists.
--
-- `create_booking` assigns a room at creation (20260806620000). The ops board's
-- actual job is the rest of it: a stay is routinely booked with no room and
-- placed later, moved when a kennel needs maintenance, or pulled back to
-- unassigned. None of that had a write path.
--
-- ── DECISION 1: AN RPC, NOT A ROUTE WRITING boarding_stays DIRECTLY ───────
--
-- `override_reason` has to be gated on `override_booking_capacity`, and RLS
-- cannot express "you may write this row but not that column". A route could
-- check the permission — but PostgREST is reachable directly with the same
-- session cookie, so a check that lives only in the route is a check with a
-- door beside it. 20260806620000 put that gate in the database for creation;
-- putting reassignment anywhere else would reopen exactly the hole that one
-- closed.
--
-- ── DECISION 2: THE ZERO-ROW CHECK IS IN HERE ─────────────────────────────
--
-- An UPDATE or DELETE refused by RLS does not raise. It matches nothing and
-- reports success (see src/lib/api/rls-write.ts, and the two times that
-- shipped). Inside a function the row count is available, so each write is
-- followed by `get diagnostics` and a 42501 rather than leaving the caller to
-- infer a refusal from an empty result.
--
-- The route therefore does NOT need `deniedIfUntouched`: this raises, and
-- `writeFailure` turns 42501 into a 403.
--
-- ── DECISION 3: NULL MEANS UNASSIGN, AND THAT FREES THE KENNEL ────────────
--
-- Deleting the stay rather than releasing it. `released_at` exists for a
-- CANCELLED booking, where the record of who had the room matters — the stay
-- happened and then stopped. An unassignment is different: the guest was never
-- placed there, so there is nothing to keep. A row that says "this booking held
-- kennel 3, released, reason none" would be a fiction.
-- ============================================================================

create or replace function public.assign_boarding_room(
  p_booking_ref    bigint,
  p_room_id        text default null,
  p_override_reason text default null
)
returns text
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_booking_id  uuid;
  v_facility_id uuid;
  v_start       timestamptz;
  v_end         timestamptz;
  v_room_id     uuid;
  v_override    text;
  v_touched     integer;
  v_existing    boolean;
begin
  -- RLS-scoped: a caller who cannot see the booking gets nothing back, and the
  -- lookup failing IS the refusal. No separate permission check needed to
  -- decide whether this booking is theirs to touch.
  select b.id, b.facility_id, b.start_at, b.end_at
    into v_booking_id, v_facility_id, v_start, v_end
    from public.bookings b
   where b.ref = p_booking_ref;

  if v_booking_id is null then
    raise exception 'That booking does not exist, or is not yours.'
      using errcode = '42501';
  end if;

  -- ── Unassign ────────────────────────────────────────────────────────────
  if p_room_id is null then
    select exists (
      select 1 from public.boarding_stays s where s.booking_id = v_booking_id
    ) into v_existing;

    if not v_existing then
      return null;  -- already unassigned; nothing to do and nothing refused
    end if;

    delete from public.boarding_stays where booking_id = v_booking_id;
    get diagnostics v_touched = row_count;

    -- A row was there and none was removed: the policy refused it. Without
    -- this the caller would be told the kennel was freed while the guest was
    -- still in it.
    if v_touched = 0 then
      raise exception 'Not allowed to change this booking''s room.'
        using errcode = '42501';
    end if;
    return null;
  end if;

  -- ── Assign or move ──────────────────────────────────────────────────────
  select r.id into v_room_id
    from public.boarding_rooms r
   where r.facility_id = v_facility_id
     and r.legacy_id = p_room_id
     and r.is_active;

  if v_room_id is null then
    raise exception 'This facility has no boarding room %.', p_room_id
      using errcode = '23503';
  end if;

  v_override := nullif(trim(coalesce(p_override_reason, '')), '');

  if v_override is not null
     and not private.has_permission(v_facility_id, 'override_booking_capacity')
  then
    raise exception 'Not allowed to override capacity limits.'
      using errcode = '42501';
  end if;

  -- UPDATE and INSERT written out separately rather than ON CONFLICT DO
  -- UPDATE, because the two fail in DIFFERENT ways under RLS and only one of
  -- them is loud:
  --
  --   INSERT refused by `with check`  -> raises 42501
  --   UPDATE refused by `using`       -> matches nothing, reports success
  --
  -- `ON CONFLICT DO UPDATE` blurs them, and its row_count is 1 whether it
  -- inserted or updated — so a zero-row check on it would look like a guard
  -- while catching nothing.
  --
  -- The exclusion constraint decides whether the room is free. Asking first
  -- and then writing would be the race this whole design exists to avoid.
  select exists (
    select 1 from public.boarding_stays s where s.booking_id = v_booking_id
  ) into v_existing;

  if v_existing then
    update public.boarding_stays
       set room_id         = v_room_id,
           occupies        = tstzrange(v_start, v_end, '[)'),
           override_reason = v_override,
           -- Moving a guest into a room un-releases the stay: the booking is
           -- live again as far as this kennel is concerned.
           released_at     = null,
           updated_at      = now()
     where booking_id = v_booking_id;

    get diagnostics v_touched = row_count;
    if v_touched = 0 then
      raise exception 'Not allowed to change this booking''s room.'
        using errcode = '42501';
    end if;
  else
    insert into public.boarding_stays
      (booking_id, facility_id, room_id, occupies, override_reason)
    values
      (v_booking_id, v_facility_id, v_room_id,
       tstzrange(v_start, v_end, '[)'), v_override);
  end if;

  return p_room_id;
end;
$$;

comment on function public.assign_boarding_room(bigint, text, text) is
  'Assigns, moves or clears a booking''s kennel. SECURITY INVOKER, so RLS '
  'judges every write as the caller; the exclusion constraint on '
  'boarding_stays refuses a room already taken for those dates.';

revoke all on function public.assign_boarding_room(bigint, text, text) from public;
revoke all on function public.assign_boarding_room(bigint, text, text) from anon;
grant execute on function public.assign_boarding_room(bigint, text, text)
  to authenticated;
