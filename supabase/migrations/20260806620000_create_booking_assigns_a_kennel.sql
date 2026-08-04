-- ============================================================================
-- Creating a boarding booking assigns its kennel, in the same transaction.
--
-- Extends `create_booking` (20260806560000) with a fourth argument. The
-- grooming branch is unchanged.
--
-- ── THE OVERLOAD TRAP ─────────────────────────────────────────────────────
--
-- `create or replace function` with a DIFFERENT argument count does not
-- replace anything -- it creates an overload, and both live side by side.
-- PostgREST would then resolve `create_booking` by the arguments in the
-- request body, so a call that omitted the new one would silently keep hitting
-- the old three-argument version and never write a stay. The old signature is
-- dropped explicitly below rather than left to be discovered.
--
-- ── A CORRECTION TO 20260806600000 ────────────────────────────────────────
--
-- That migration said "THE ROUTE MUST GATE `override_reason` ON THE
-- PERMISSION. The database cannot." The second half is wrong. A POLICY cannot
-- express it, but this function can: it is SECURITY INVOKER, so
-- `private.has_permission` here answers for the real caller. Gating it in the
-- route as well would be fine; gating it ONLY there would mean PostgREST --
-- which is reachable directly with a session cookie -- remained an unguarded
-- way to overbook a kennel with a typed excuse.
--
-- ── WHY THE STAY IS OPTIONAL ──────────────────────────────────────────────
--
-- A groom must name its service; a boarding booking need not name a room. The
-- stay is routinely booked first and assigned on the ops board later, so
-- `p_boarding` may be null and no row is written. This is the one place the
-- two modules deliberately disagree.
-- ============================================================================

drop function if exists public.create_booking(jsonb, uuid[], jsonb);

create or replace function public.create_booking(
  p_booking  jsonb,
  p_pet_ids  uuid[] default '{}',
  p_grooming jsonb  default null,
  p_boarding jsonb  default null
)
returns table (booking_id uuid, booking_ref bigint)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_known        text[] := array[
    'facility_id', 'location_id', 'client_id', 'service', 'service_type',
    'status', 'payment_status', 'start_at', 'end_at',
    'assigned_staff_id', 'assigned_staff_name',
    'base_price', 'discount', 'total_cost', 'tip_amount',
    'special_requests', 'details'
  ];
  v_unknown      text[];
  v_booking_id   uuid;
  v_ref          bigint;
  v_facility_id  uuid;
  v_start        timestamptz;
  v_end          timestamptz;
  v_is_staff     boolean;
  v_service_id   uuid;
  v_service_name text;
  v_price        numeric;
  v_duration     integer;
  v_size         text;
  v_size_price   numeric;
  v_size_dur     integer;
  v_weight       numeric;
  v_station_id   uuid;
  v_written      integer;
  v_requested    integer;
  v_room_id      uuid;
  v_override     text;
begin
  select array_agg(k) into v_unknown
    from jsonb_object_keys(p_booking) k where k <> all (v_known);

  if v_unknown is not null then
    raise exception 'create_booking does not handle booking column(s): %',
      array_to_string(v_unknown, ', ') using errcode = '22023';
  end if;

  if p_booking->>'service' = 'grooming' and p_grooming is null then
    raise exception 'A grooming booking needs its appointment details.'
      using errcode = '22023';
  end if;

  insert into public.bookings (
    facility_id, location_id, client_id, service, service_type,
    status, payment_status, start_at, end_at,
    assigned_staff_id, assigned_staff_name,
    base_price, discount, total_cost, tip_amount,
    special_requests, details
  )
  select
    b.facility_id, b.location_id, b.client_id, b.service, b.service_type,
    coalesce(b.status, 'pending'::public.booking_status),
    coalesce(b.payment_status, 'pending'),
    b.start_at, b.end_at,
    b.assigned_staff_id, b.assigned_staff_name,
    coalesce(b.base_price, 0), coalesce(b.discount, 0),
    coalesce(b.total_cost, 0), b.tip_amount,
    b.special_requests, coalesce(b.details, '{}'::jsonb)
    from jsonb_populate_record(null::public.bookings, p_booking) b
  returning id, ref, facility_id, start_at, end_at
       into v_booking_id, v_ref, v_facility_id, v_start, v_end;

  if array_length(p_pet_ids, 1) > 0 then
    insert into public.booking_pets (booking_id, pet_id)
    select v_booking_id, unnest(p_pet_ids);
  end if;

  -- ── The kennel ───────────────────────────────────────────────────────────
  if p_boarding is not null and p_boarding->>'roomId' is not null then
    select r.id into v_room_id
      from public.boarding_rooms r
     where r.facility_id = v_facility_id
       and r.legacy_id = p_boarding->>'roomId'
       and r.is_active;

    if v_room_id is null then
      raise exception 'This facility has no boarding room %.',
        p_boarding->>'roomId' using errcode = '23503';
    end if;

    v_override := nullif(trim(coalesce(p_boarding->>'overrideReason', '')), '');

    -- Overbooking is a permission, not a request body field. Checked here
    -- rather than only in the route, because PostgREST is reachable directly.
    if v_override is not null
       and not private.has_permission(v_facility_id, 'override_booking_capacity')
    then
      raise exception 'Not allowed to override capacity limits.'
        using errcode = '42501';
    end if;

    -- The exclusion constraint on boarding_stays is what refuses a kennel that
    -- is already taken for these dates. Deliberately NOT a "is it free?" query
    -- followed by an insert: two callers would both read free and both write.
    insert into public.boarding_stays
      (booking_id, facility_id, room_id, occupies, override_reason)
    values
      (v_booking_id, v_facility_id, v_room_id,
       tstzrange(v_start, v_end, '[)'), v_override);
  end if;

  if p_grooming is null then
    booking_id := v_booking_id; booking_ref := v_ref; return next; return;
  end if;

  v_is_staff := private.has_permission(v_facility_id, 'create_bookings');

  select s.id, s.name, s.base_price, s.duration_min
    into v_service_id, v_service_name, v_price, v_duration
    from public.grooming_services s
   where s.facility_id = v_facility_id
     and s.legacy_id = p_grooming->>'serviceId';

  if v_service_id is null then
    raise exception 'This facility has no grooming service %.',
      coalesce(p_grooming->>'serviceId', '(none given)') using errcode = '23503';
  end if;

  select p.weight into v_weight from public.pets p where p.id = p_pet_ids[1];

  if v_weight is not null then
    select t->>'id' into v_size
      from public.grooming_config c,
           lateral jsonb_array_elements(c.pet_size_tiers) t
     where c.facility_id = v_facility_id
       and (t->>'maxWeightLbs' is null
            or v_weight <= (t->>'maxWeightLbs')::numeric)
     order by coalesce((t->>'maxWeightLbs')::numeric, 999999)
     limit 1;
  end if;

  if v_size is not null then
    select sp.price, sp.duration_min into v_size_price, v_size_dur
      from public.grooming_service_size_prices sp
     where sp.service_id = v_service_id and sp.size_label = v_size;
    if v_size_price is not null then v_price := v_size_price; end if;
    if v_size_dur   is not null then v_duration := v_size_dur; end if;
  end if;

  if (p_grooming->>'durationOverrideMin') is not null then
    v_duration := (p_grooming->>'durationOverrideMin')::integer;
  end if;

  if p_grooming->>'stationId' is not null then
    select st.id into v_station_id
      from public.grooming_stations st
     where st.facility_id = v_facility_id
       and st.legacy_id = p_grooming->>'stationId';
  end if;

  insert into public.grooming_appointments (
    booking_id, facility_id, service_id, service_name,
    size_label, service_price, service_duration_min, station_id
  )
  values (
    v_booking_id, v_facility_id, v_service_id, v_service_name, v_size,
    case when v_is_staff then v_price else 0 end,
    greatest(coalesce(v_duration, 60), 1), v_station_id
  );

  if jsonb_typeof(p_grooming->'addOnIds') = 'array' then
    insert into public.grooming_appointment_add_ons (
      booking_id, facility_id, add_on_id, name, price, duration_min
    )
    select v_booking_id, v_facility_id, a.id, a.name,
           case when v_is_staff then a.price else 0 end, a.duration_min
      from jsonb_array_elements_text(p_grooming->'addOnIds') requested
      join public.grooming_add_ons a
        on a.facility_id = v_facility_id and a.legacy_id = requested;

    get diagnostics v_written = row_count;
    v_requested := jsonb_array_length(p_grooming->'addOnIds');

    if v_written <> v_requested then
      raise exception 'This facility has % of the % grooming add-ons requested.',
        v_written, v_requested using errcode = '23503';
    end if;
  end if;

  booking_id := v_booking_id; booking_ref := v_ref; return next;
end;
$$;

comment on function public.create_booking(jsonb, uuid[], jsonb, jsonb) is
  'Creates a booking, its pets and -- per module -- its grooming appointment '
  'or its boarding stay, in one transaction. SECURITY INVOKER: every insert is '
  'judged by RLS as the caller, and any refusal rolls back the whole booking.';

revoke all on function public.create_booking(jsonb, uuid[], jsonb, jsonb) from public;
revoke all on function public.create_booking(jsonb, uuid[], jsonb, jsonb) from anon;
grant execute on function public.create_booking(jsonb, uuid[], jsonb, jsonb)
  to authenticated;
