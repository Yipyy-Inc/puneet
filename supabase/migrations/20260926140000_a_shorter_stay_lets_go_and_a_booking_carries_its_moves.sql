-- ============================================================================
-- A shorter stay lets go of the kennels it never reaches, and a stay can be
-- booked with its kennel changes already in it.
--
-- ── THE DATES ─────────────────────────────────────────────────────────────
--
-- 20260926100052 moved only the outer ends of a split booking and refused any
-- date change that would leave a kennel with no night — "which kennel loses
-- the night is not for a trigger to guess". That refused every EARLY CHECK-OUT
-- before a planned move: the booking page shortens the stay to the day the
-- guest left, and the kennel booked from Thursday was still in it.
--
-- There is nothing to guess there. Nights cut from the END are the last
-- nights, and a kennel whose nights are all cut is one the guest never
-- reaches, so it goes and the new last kennel ends at the departure. Nights
-- cut from the START are the first nights, and the same holds — except that
-- the arrival is stamped on the first kennel, so a guest who has already
-- arrived keeps it and the change is refused. And a stay moved as a whole — a
-- reschedule, both ends by the same amount — moves every kennel with it, so
-- the plan of which nights go where survives the move.
--
-- ── THE BOOKING ───────────────────────────────────────────────────────────
--
-- Staff could only split a stay after it was made. `create_bookings` now
-- reads `boarding.moves` — each a first night and a room — and makes them
-- with `split_boarding_stay` in the same transaction as the booking, so a
-- kennel taken on those nights refuses the whole request, exactly as a taken
-- first kennel always has. `create_booking` itself is not changed, and never
-- sees the moves.
-- ============================================================================

create or replace function private.sync_boarding_stay()
returns trigger
language plpgsql
security definer
set search_path to ''
as $$
declare
  v_last    integer;
  v_shift   interval;
  v_first   public.boarding_stays%rowtype;
  v_order   integer;
  r         record;
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

  if new.start_at is not distinct from old.start_at
     and new.end_at is not distinct from old.end_at
  then
    return new;
  end if;

  select max(segment_order) into v_last
    from public.boarding_stays where booking_id = new.id;

  if v_last is null then
    return new;
  end if;

  if v_last = 1 then
    update public.boarding_stays
       set occupies = tstzrange(new.start_at, new.end_at, '[)'), updated_at = now()
     where booking_id = new.id;
    return new;
  end if;

  -- The deferred checks run at commit, over the final shape — not between
  -- the statements below, where the sequence is briefly renumbered.
  set constraints public.boarding_stays_segment_order_unique deferred;

  -- ── Moved whole: every kennel moves by the same amount ──────────────────
  v_shift := new.start_at - old.start_at;
  if new.end_at - old.end_at = v_shift then
    -- Last first when moving later, first first when moving earlier, so no
    -- two of the booking's own stays overlap on the way.
    for r in
      select id from public.boarding_stays
       where booking_id = new.id
       order by case when v_shift > interval '0' then -segment_order else segment_order end
    loop
      update public.boarding_stays
         set occupies = tstzrange(lower(occupies) + v_shift, upper(occupies) + v_shift, '[)'),
             updated_at = now()
       where id = r.id;
    end loop;
    return new;
  end if;

  -- ── Shortened or lengthened at either end ───────────────────────────────
  select * into v_first from public.boarding_stays
   where booking_id = new.id and segment_order = 1;

  -- A kennel wholly outside the new dates is one the guest never sleeps in.
  -- The first one carries the arrival, so a guest who arrived keeps it.
  if v_first.checked_in_at is not null
     and (upper(v_first.occupies) <= new.start_at
          or lower(v_first.occupies) >= new.end_at)
  then
    raise exception
      'This guest has already arrived. Change the move first, then the dates.'
      using errcode = '22023', hint = 'split_stay_dates';
  end if;

  delete from public.boarding_stays
   where booking_id = new.id
     and (upper(occupies) <= new.start_at or lower(occupies) >= new.end_at);

  -- Renumber what is left from 1, in order: out of the way first (the order
  -- must stay positive), then 1, 2, 3…
  update public.boarding_stays
     set segment_order = segment_order + 1000
   where booking_id = new.id;
  v_order := 0;
  for r in
    select id from public.boarding_stays where booking_id = new.id
     order by lower(occupies)
  loop
    v_order := v_order + 1;
    update public.boarding_stays set segment_order = v_order where id = r.id;
  end loop;

  if v_order = 0 then
    -- A new range that meets none of the old kennels: the first one takes it,
    -- as a stay with one kennel always has.
    insert into public.boarding_stays
      (booking_id, facility_id, room_id, occupies, override_reason)
    values
      (new.id, v_first.facility_id, v_first.room_id,
       tstzrange(new.start_at, new.end_at, '[)'), v_first.override_reason);
    return new;
  end if;

  update public.boarding_stays
     set occupies = tstzrange(new.start_at, upper(occupies), '[)'), updated_at = now()
   where booking_id = new.id and segment_order = 1;
  update public.boarding_stays
     set occupies = tstzrange(lower(occupies), new.end_at, '[)'), updated_at = now()
   where booking_id = new.id and segment_order = v_order;

  return new;
end;
$$;

create or replace function public.create_bookings(p_items jsonb)
returns table (item_index integer, booking_id uuid, booking_ref bigint)
language plpgsql
set search_path to ''
as $$
declare
  v_item    jsonb;
  v_index   integer := 0;
  v_pets    uuid[];
  v_created record;
  v_move    jsonb;
begin
  if p_items is null or jsonb_typeof(p_items) <> 'array'
     or jsonb_array_length(p_items) = 0 then
    raise exception 'create_bookings needs at least one booking.'
      using errcode = '22023';
  end if;

  if jsonb_array_length(p_items) > 100 then
    raise exception 'create_bookings takes at most 100 bookings at once.'
      using errcode = '22023';
  end if;

  for v_item in select value from jsonb_array_elements(p_items) loop
    select coalesce(array_agg(x::uuid), '{}'::uuid[]) into v_pets
      from jsonb_array_elements_text(coalesce(v_item->'petIds', '[]'::jsonb)) x;

    select * into v_created from public.create_booking(
      v_item->'booking',
      v_pets,
      nullif(v_item->'grooming', 'null'::jsonb),
      nullif(nullif(v_item->'boarding', 'null'::jsonb) - 'moves', '{}'::jsonb)
    );

    -- The kennel changes planned with the booking, earliest first, in this
    -- same transaction: a taken kennel refuses the lot.
    for v_move in
      select value
        from jsonb_array_elements(coalesce(v_item->'boarding'->'moves', '[]'::jsonb))
       order by (value->>'from')::date
    loop
      perform public.split_boarding_stay(
        v_created.booking_ref,
        (v_move->>'from')::date,
        v_move->>'roomId',
        nullif(trim(coalesce(v_move->>'overrideReason', '')), ''));
    end loop;

    item_index  := v_index;
    booking_id  := v_created.booking_id;
    booking_ref := v_created.booking_ref;
    return next;
    v_index := v_index + 1;
  end loop;
end;
$$;

revoke all on function public.create_bookings(jsonb) from public;
revoke all on function public.create_bookings(jsonb) from anon;
grant execute on function public.create_bookings(jsonb) to authenticated, service_role;
