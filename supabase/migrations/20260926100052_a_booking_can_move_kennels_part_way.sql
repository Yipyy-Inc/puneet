-- ============================================================================
-- A booking can move kennels mid-stay: its stays are a SEQUENCE.
--
-- Nights 1–3 in Suite 4, nights 4–6 in Condo 12. The first step gave each
-- stay a key of its own (`id`) and a place in its booking (`segment_order`);
-- this one lets a booking hold more than one, and teaches every writer that
-- rebuilt "the" stay from the booking's whole range to leave the others be.
--
-- ── THE DECISIONS, SO NOBODY HAS TO RE-DERIVE THEM ────────────────────────
--
-- 1. PRESENCE IS THE BOOKING'S, AND IT LIVES ON THE FIRST STAY. Arrival and
--    departure are one fact about the pet, not one per kennel, so they are
--    stamped on segment 1 only. The presence mirror, the live-booking guard,
--    `booking_presence` and every board keep reading one row. A later
--    segment's `status` is therefore `scheduled` (or `released`) forever;
--    nothing may read presence from it.
-- 2. THE LAST STAY IS THE ONE THAT ENDS WHERE THE BOOKING ENDS. The cut-off
--    extends only that one — a transfer is not a check-out — and it reads the
--    departure from segment 1. "Last" is decided by `bookings.end_at`, not by
--    counting rows, so the rule holds mid-split, while the rows are moving.
-- 3. A TRANSFER HAPPENS AT THE BOOKING'S OWN CHECK-IN TIME, on the date the
--    pet sleeps in the new kennel first. Half-open ranges meet there exactly:
--    [.., D 14:00) and [D 14:00, ..).
-- 4. ASSIGNING ONE ROOM MERGES. `assign_boarding_room` means "this whole
--    booking in this kennel": the later segments go, segment 1 takes the
--    booking's range. That is also how a split is undone.
-- 5. A DATE CHANGE MOVES THE OUTER BOUNDS ONLY, and one that would leave a
--    segment with no night at all is refused rather than guessed at.
-- 6. THE SEQUENCE IS THE DATABASE'S TO KEEP. A booking's stays never overlap
--    (an exclusion constraint), and at commit they tile the booking with no
--    gap, in `segment_order` (a deferred constraint trigger).
-- ============================================================================

-- ── 1. Many stays per booking, ordered, never overlapping ──────────────────

alter table public.boarding_stays drop constraint boarding_stays_one_per_booking;

-- DEFERRABLE so a split can renumber the segments after it inside one
-- transaction; its index still leads with `booking_id`, which is what RLS and
-- the cascade from `bookings` look a booking's stays up by.
alter table public.boarding_stays
  add constraint boarding_stays_segment_order_unique
  unique (booking_id, segment_order) deferrable initially immediate;

alter table public.boarding_stays
  add constraint boarding_stays_segments_do_not_overlap
  exclude using gist (booking_id with =, occupies with &&);

comment on column public.boarding_stays.segment_order is
  'This stay''s place in its booking, from 1. Arrival and departure are stamped on segment 1 only.';

-- ── 2. At commit, a booking's stays tile it ────────────────────────────────

create or replace function private.boarding_stays_tile_their_booking()
returns trigger
language plpgsql
security definer
set search_path to ''
as $$
declare
  v_booking uuid := case when tg_op = 'DELETE' then old.booking_id else new.booking_id end;
  v_prev    tstzrange;
  v_order   integer := 0;
  r         record;
begin
  for r in
    select s.segment_order, s.occupies
      from public.boarding_stays s
     where s.booking_id = v_booking
     order by s.segment_order
  loop
    v_order := v_order + 1;
    if r.segment_order <> v_order then
      raise exception 'A booking''s stays are numbered 1, 2, 3… with no gap.'
        using errcode = '23514', hint = 'segment_order';
    end if;
    if v_prev is not null and upper(v_prev) <> lower(r.occupies) then
      raise exception 'A booking''s stays must follow each other with no gap and no overlap.'
        using errcode = '23514', hint = 'segment_tiling';
    end if;
    v_prev := r.occupies;
  end loop;
  return null;
end;
$$;

create constraint trigger boarding_stays_tile_their_booking
  after insert or update of occupies, segment_order, booking_id or delete
  on public.boarding_stays
  deferrable initially deferred
  for each row execute function private.boarding_stays_tile_their_booking();

-- ── 3. Presence reads the first stay ───────────────────────────────────────

create or replace view public.booking_presence
with (security_invoker = true) as
 select b.id as booking_id,
    b.service as source,
    coalesce(g.check_in_at, d.checked_in_at, s.checked_in_at, t.checked_in_at) as arrived_at,
    coalesce(g.check_out_at, d.checked_out_at, s.checked_out_at, t.checked_out_at) as departed_at,
        case
            when b.service <> all (array['grooming'::text, 'daycare'::text, 'boarding'::text, 'training'::text]) then 'unknown'::text
            when coalesce(g.check_out_at, d.checked_out_at, s.checked_out_at, t.checked_out_at) is not null then 'departed'::text
            when coalesce(g.check_in_at, d.checked_in_at, s.checked_in_at, t.checked_in_at) is not null then 'on-site'::text
            else 'expected'::text
        end as presence
   from public.bookings b
     left join public.grooming_appointments g on g.booking_id = b.id
     left join public.daycare_attendance d on d.booking_id = b.id
     -- Segment 1 only: presence is stamped there, and a split booking would
     -- otherwise come back once per kennel.
     left join public.boarding_stays s on s.booking_id = b.id and s.segment_order = 1
     left join public.training_attendance t on t.booking_id = b.id;

-- ── 4. The cut-off holds the LAST stay only ────────────────────────────────

create or replace function private.boarding_stay_apply_cutoff()
returns trigger
language plpgsql
security definer
set search_path to ''
as $$
declare
  v_cut      time;
  v_tz       text;
  v_upper    timestamptz;
  v_end      timestamptz;
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

  -- The last stay is the one that ends where the booking ends. A stay that
  -- hands the pet to another kennel ends at the transfer, and a transfer is
  -- not a check-out: it keeps its exact upper bound.
  select b.end_at into v_end from public.bookings b where b.id = new.booking_id;
  if v_end is not null and v_upper < v_end then
    return new;
  end if;

  -- The real departure when it is known — stamped on the booking's FIRST
  -- stay, which is this row unless the booking was split — the booked one
  -- until then.
  select coalesce(
           case when new.segment_order = 1 then new.checked_out_at end,
           (select s.checked_out_at from public.boarding_stays s
             where s.booking_id = new.booking_id and s.segment_order = 1
               and s.id <> new.id),
           v_upper)
    into v_checkout;

  select coalesce(f.timezone, 'America/Toronto') into v_tz
    from public.facilities f where f.id = new.facility_id;
  v_tz := coalesce(v_tz, 'America/Toronto');

  v_local := v_checkout at time zone v_tz;

  -- AT or AFTER: a cut-off of 14:00 with a 14:00 check-out holds the night.
  if v_local::time >= v_cut then
    v_extended := ((date_trunc('day', v_local) + interval '1 day') at time zone v_tz);
    -- Extend only.
    if v_extended > v_upper then
      new.occupies := tstzrange(lower(new.occupies), v_extended, '[)');
    end if;
  end if;

  return new;
end;
$$;

-- ── 5. Arrival and departure go on the first stay ──────────────────────────

create or replace function public.record_boarding_arrival(p_booking_ref bigint, p_action text)
returns text
language plpgsql
security definer
set search_path to ''
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

  if not private.has_permission(v_booking.facility_id, 'check_in_out') then
    raise exception 'Not allowed to check guests in or out at this facility.'
      using errcode = '42501';
  end if;

  if v_booking.service <> 'boarding' then
    raise exception 'That booking is not a boarding booking.'
      using errcode = '22023';
  end if;

  select * into v_stay from public.boarding_stays
   where booking_id = v_booking.id and segment_order = 1;
  if not found then
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

  else
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
   where id = v_stay.id
  returning status into v_status;

  -- A split booking's LAST stay holds the night by the departure, so it is
  -- touched to let the cut-off read the one just recorded.
  update public.boarding_stays
     set updated_at = now()
   where booking_id = v_booking.id
     and segment_order > 1
     and segment_order = (select max(s.segment_order) from public.boarding_stays s
                           where s.booking_id = v_booking.id);

  return v_status;
end $$;

-- ── 6. The cut-off setting re-derives last stays only ──────────────────────

create or replace function public.save_checkout_cut_off(p_facility_id uuid, p_enabled boolean, p_time text)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $$
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

  set constraints public.boarding_stays_area_within_capacity immediate;

  -- The LAST stay of every booking still to leave: the only one the cut-off
  -- decides. Its lower bound is a transfer or the arrival, and stays put.
  for r in
    select s.id,
           lower(s.occupies) as lower_now,
           upper(s.occupies) as upper_before,
           b.end_at,
           b.ref
      from public.boarding_stays s
      join public.bookings b on b.id = s.booking_id
      left join public.boarding_stays first
        on first.booking_id = s.booking_id and first.segment_order = 1
     where s.facility_id = p_facility_id
       and s.released_at is null
       and first.checked_out_at is null
       and b.start_at is not null
       and b.end_at is not null
       and b.end_at > now()
       and s.segment_order = (select max(x.segment_order) from public.boarding_stays x
                               where x.booking_id = s.booking_id)
     order by b.start_at, b.ref
  loop
    begin
      update public.boarding_stays
         set occupies = tstzrange(r.lower_now, r.end_at, '[)'),
             updated_at = now()
       where id = r.id
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
$$;

-- ── 7. A booking's dates move its OUTER bounds ─────────────────────────────

create or replace function private.sync_boarding_stay()
returns trigger
language plpgsql
security definer
set search_path to ''
as $$
declare
  v_last integer;
begin
  if new.status in ('cancelled', 'no_show') then
    update public.boarding_stays
       set released_at = coalesce(released_at, now()), updated_at = now()
     where booking_id = new.id;
  elsif old.status in ('cancelled', 'no_show') then
    update public.boarding_stays
       set released_at = null, updated_at = now()
     where booking_id = new.id;
  end if;

  if new.start_at is distinct from old.start_at
     or new.end_at is distinct from old.end_at
  then
    select max(segment_order) into v_last
      from public.boarding_stays where booking_id = new.id;

    if v_last is null then
      return new;
    elsif v_last = 1 then
      update public.boarding_stays
         set occupies = tstzrange(new.start_at, new.end_at, '[)'), updated_at = now()
       where booking_id = new.id;
    else
      -- The first stay starts at the arrival and the last ends at the
      -- departure; the transfers between them are the staff's decisions and
      -- stay where they were put. A new range that would leave a stay with
      -- no night is refused: which kennel loses the night is not for a
      -- trigger to guess.
      if new.start_at >= (select upper(occupies) from public.boarding_stays
                           where booking_id = new.id and segment_order = 1)
         or new.end_at <= (select lower(occupies) from public.boarding_stays
                           where booking_id = new.id and segment_order = v_last)
      then
        raise exception
          'This stay moves kennels part-way. Change the move first, then the dates.'
          using errcode = '22023', hint = 'split_stay_dates';
      end if;
      update public.boarding_stays
         set occupies = tstzrange(new.start_at, upper(occupies), '[)'), updated_at = now()
       where booking_id = new.id and segment_order = 1;
      update public.boarding_stays
         set occupies = tstzrange(lower(occupies), new.end_at, '[)'), updated_at = now()
       where booking_id = new.id and segment_order = v_last;
    end if;
  end if;

  return new;
end;
$$;

-- ── 8. One room for the whole booking merges a split ───────────────────────

create or replace function public.assign_boarding_room(p_booking_ref bigint, p_room_id text default null, p_override_reason text default null)
returns text
language plpgsql
set search_path to ''
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
  select b.id, b.facility_id, b.start_at, b.end_at
    into v_booking_id, v_facility_id, v_start, v_end
    from public.bookings b
   where b.ref = p_booking_ref;

  if v_booking_id is null then
    raise exception 'That booking does not exist, or is not yours.'
      using errcode = '42501';
  end if;

  if p_room_id is null then
    select exists (
      select 1 from public.boarding_stays s where s.booking_id = v_booking_id
    ) into v_existing;

    if not v_existing then
      return null;
    end if;

    delete from public.boarding_stays where booking_id = v_booking_id;
    get diagnostics v_touched = row_count;

    if v_touched = 0 then
      raise exception 'Not allowed to change this booking''s room.'
        using errcode = '42501';
    end if;
    return null;
  end if;

  select r.id into v_room_id
    from public.facility_rooms r
   where r.facility_id = v_facility_id
     and r.legacy_id = p_room_id
     and r.active;

  if v_room_id is null then
    raise exception 'This facility has no room %.', p_room_id
      using errcode = '23503';
  end if;

  v_override := nullif(trim(coalesce(p_override_reason, '')), '');

  if v_override is not null
     and not private.has_permission(v_facility_id, 'override_booking_capacity')
  then
    raise exception 'Not allowed to override capacity limits.'
      using errcode = '42501';
  end if;

  select exists (
    select 1 from public.boarding_stays s where s.booking_id = v_booking_id
  ) into v_existing;

  if v_existing then
    -- The whole booking in one kennel: a split is undone, and segment 1 —
    -- which carries the arrival — takes the booking's range.
    delete from public.boarding_stays
     where booking_id = v_booking_id and segment_order > 1;

    update public.boarding_stays
       set room_id         = v_room_id,
           occupies        = tstzrange(v_start, v_end, '[)'),
           override_reason = v_override,
           released_at     = null,
           updated_at      = now()
     where booking_id = v_booking_id and segment_order = 1;

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

-- ── 9. The move itself ─────────────────────────────────────────────────────

create or replace function public.split_boarding_stay(
  p_booking_ref     bigint,
  p_from            date,
  p_room_id         text,
  p_override_reason text default null)
returns integer
language plpgsql
set search_path to ''
as $$
declare
  v_booking_id  uuid;
  v_facility_id uuid;
  v_start       timestamptz;
  v_end         timestamptz;
  v_tz          text;
  v_at          timestamptz;
  v_room_id     uuid;
  v_override    text;
  v_seg         public.boarding_stays%rowtype;
  v_touched     integer;
  v_status      public.booking_status;
begin
  select b.id, b.facility_id, b.start_at, b.end_at, b.status
    into v_booking_id, v_facility_id, v_start, v_end, v_status
    from public.bookings b
   where b.ref = p_booking_ref and b.service = 'boarding';

  if v_booking_id is null then
    raise exception 'That boarding booking does not exist, or is not yours.'
      using errcode = '42501';
  end if;

  -- A stay that is over, or will not happen, has no night left to move.
  if v_status in ('cancelled', 'declined', 'no_show', 'completed') then
    raise exception 'This booking is % and cannot move kennels.',
      replace(v_status::text, '_', ' ')
      using errcode = '22023', hint = 'split_closed_booking';
  end if;

  select r.id into v_room_id
    from public.facility_rooms r
   where r.facility_id = v_facility_id
     and r.legacy_id = p_room_id
     and r.active;
  if v_room_id is null then
    raise exception 'This facility has no room %.', p_room_id
      using errcode = '23503';
  end if;

  v_override := nullif(trim(coalesce(p_override_reason, '')), '');
  if v_override is not null
     and not private.has_permission(v_facility_id, 'override_booking_capacity')
  then
    raise exception 'Not allowed to override capacity limits.'
      using errcode = '42501';
  end if;

  select coalesce(f.timezone, 'America/Toronto') into v_tz
    from public.facilities f where f.id = v_facility_id;
  v_tz := coalesce(v_tz, 'America/Toronto');

  -- The booking's own check-in time, on the first night in the new kennel.
  v_at := (p_from + (v_start at time zone v_tz)::time) at time zone v_tz;

  -- From the first night is allowed — it moves the first stay whole, below —
  -- but a move must leave the guest at least one night in the new kennel.
  if v_at < v_start or v_at >= v_end then
    raise exception 'A move has to fall on a night of the stay.'
      using errcode = '22023', hint = 'split_outside_stay';
  end if;

  select * into v_seg from public.boarding_stays
   where booking_id = v_booking_id and occupies @> v_at
   order by segment_order limit 1;
  if not found then
    raise exception 'This guest has no kennel yet. Assign one first.'
      using errcode = '55000';
  end if;

  if v_seg.room_id = v_room_id then
    raise exception 'The guest is already in that kennel then.'
      using errcode = '22023', hint = 'split_same_room';
  end if;

  if lower(v_seg.occupies) = v_at then
    -- A stay already starts that night: it changes kennel, nothing splits.
    update public.boarding_stays
       set room_id = v_room_id, override_reason = v_override, updated_at = now()
     where id = v_seg.id;
    get diagnostics v_touched = row_count;
    if v_touched = 0 then
      raise exception 'Not allowed to change this booking''s room.' using errcode = '42501';
    end if;
    return v_seg.segment_order;
  end if;

  set constraints public.boarding_stays_segment_order_unique deferred;

  update public.boarding_stays
     set segment_order = segment_order + 1, updated_at = now()
   where booking_id = v_booking_id and segment_order > v_seg.segment_order;

  update public.boarding_stays
     set occupies = tstzrange(lower(occupies), v_at, '[)'), updated_at = now()
   where id = v_seg.id;
  get diagnostics v_touched = row_count;
  if v_touched = 0 then
    raise exception 'Not allowed to change this booking''s room.' using errcode = '42501';
  end if;

  insert into public.boarding_stays
    (booking_id, facility_id, room_id, occupies, override_reason, segment_order,
     released_at)
  values
    (v_booking_id, v_facility_id, v_room_id,
     tstzrange(v_at, upper(v_seg.occupies), '[)'), v_override,
     v_seg.segment_order + 1, v_seg.released_at);

  set constraints public.boarding_stays_segment_order_unique immediate;

  return v_seg.segment_order + 1;
end;
$$;

revoke all on function public.split_boarding_stay(bigint, date, text, text) from public;
revoke all on function public.split_boarding_stay(bigint, date, text, text) from anon;
grant execute on function public.split_boarding_stay(bigint, date, text, text) to authenticated;
