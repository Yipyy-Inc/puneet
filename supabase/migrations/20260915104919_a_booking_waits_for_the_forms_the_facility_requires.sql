-- ============================================================================
-- A booking waits for the forms the facility requires before booking.
--
-- `create_booking` asks private.missing_required_forms for the booking's
-- client, pets and service at the 'before_booking' stage. For a missing form
-- set to BLOCK:
--   * a customer (no create_bookings permission) is refused:
--     22023, hint 'form_required';
--   * staff are refused unless the booking carries `form_override_reason`:
--     22023, hint 'form_override_reason_required'. With a reason the booking
--     is made and each missing form is recorded in form_requirement_overrides
--     with the reason and who gave it.
-- A form set to WARN never refuses. `form_override_reason` is not a bookings
-- column and is never stored on the booking.
--
-- public.client_missing_forms answers the same question for a client before a
-- booking exists, under the caller's own RLS on clients, so the booking route
-- can say WHICH forms are missing when it refuses.
--
-- Known consequence: enroll_in_training_series calls create_booking, so a
-- training requirement set to block also applies to enrolment, where there is
-- no place yet to give a reason.
--
-- SQL G1-G6 in booking-form-gate.sql.
-- ============================================================================

create or replace function private.record_form_overrides(
  p_booking_id uuid,
  p_stage text,
  p_reason text
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_booking public.bookings;
  v_reason  text := nullif(btrim(coalesce(p_reason, '')), '');
  v_count   integer;
begin
  select * into v_booking from public.bookings where id = p_booking_id;
  if not found then
    raise exception 'No such booking.' using errcode = '23503';
  end if;
  if v_reason is null then
    raise exception 'A reason is required to go ahead without a required form.'
      using errcode = '22023';
  end if;

  insert into public.form_requirement_overrides
    (facility_id, booking_id, stage, form_id, pet_id, reason, created_by)
  select v_booking.facility_id, v_booking.id, p_stage, m.form_id, m.pet_id,
         left(v_reason, 500), auth.jwt()->>'sub'
    from private.missing_required_forms(
           v_booking.facility_id,
           v_booking.client_id,
           array(select bp.pet_id from public.booking_pets bp
                  where bp.booking_id = v_booking.id),
           v_booking.service,
           p_stage) m
   where m.enforcement = 'block';

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke all on function private.record_form_overrides(uuid, text, text) from public;
revoke all on function private.record_form_overrides(uuid, text, text) from anon;
grant execute on function private.record_form_overrides(uuid, text, text)
  to authenticated, service_role;

create or replace function public.client_missing_forms(
  p_client_id uuid,
  p_pet_ids uuid[],
  p_service text,
  p_stage text
)
returns table (form_id uuid, form_name text, form_slug text, pet_id uuid, pet_name text, enforcement text)
language sql
stable
security invoker
set search_path = ''
as $$
  select m.form_id, m.form_name, m.form_slug, m.pet_id, p.name, m.enforcement
    from public.clients c
    cross join lateral private.missing_required_forms(
      c.facility_id, c.id, p_pet_ids, p_service, p_stage) m
    left join public.pets p on p.id = m.pet_id
   where c.id = p_client_id
     and p_stage in ('before_booking', 'before_approval', 'before_checkin');
$$;

revoke all on function public.client_missing_forms(uuid, uuid[], text, text) from public;
revoke all on function public.client_missing_forms(uuid, uuid[], text, text) from anon;
grant execute on function public.client_missing_forms(uuid, uuid[], text, text)
  to authenticated, service_role;

-- create_booking, from its live body (pg_get_functiondef, 2026-09-15), with the
-- form check added before the insert and the overrides recorded after the pets.
create or replace function public.create_booking(
  p_booking jsonb,
  p_pet_ids uuid[] default '{}'::uuid[],
  p_grooming jsonb default null::jsonb,
  p_boarding jsonb default null::jsonb
)
returns table(booking_id uuid, booking_ref bigint)
language plpgsql
set search_path to ''
as $function$
declare
  v_known        text[] := array[
    'facility_id', 'location_id', 'client_id', 'service', 'service_type',
    'status', 'start_at', 'end_at',
    'assigned_staff_id', 'assigned_staff_name',
    'base_price', 'discount', 'total_cost', 'tip_amount',
    'special_requests', 'details', 'training_series_session_id',
    'form_override_reason'
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
  v_missing      text;
  v_form_reason  text;
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

  -- ── THE FORMS THE FACILITY REQUIRES BEFORE BOOKING ──────────────────────
  select string_agg(distinct m.form_name, ', ') into v_missing
    from private.missing_required_forms(
           (p_booking->>'facility_id')::uuid,
           (p_booking->>'client_id')::uuid,
           p_pet_ids,
           p_booking->>'service',
           'before_booking') m
   where m.enforcement = 'block';

  v_form_reason := nullif(btrim(coalesce(p_booking->>'form_override_reason', '')), '');

  if v_missing is not null then
    if not private.has_permission((p_booking->>'facility_id')::uuid, 'create_bookings') then
      raise exception 'Complete % before booking.', v_missing
        using errcode = '22023', hint = 'form_required';
    elsif v_form_reason is null then
      raise exception 'Say why this booking goes ahead without %.', v_missing
        using errcode = '22023', hint = 'form_override_reason_required';
    end if;
  end if;

  insert into public.bookings (
    facility_id, location_id, client_id, service, service_type,
    status, start_at, end_at,
    assigned_staff_id, assigned_staff_name,
    base_price, discount, total_cost, tip_amount,
    special_requests, details, training_series_session_id
  )
  select
    b.facility_id, b.location_id, b.client_id, b.service, b.service_type,
    coalesce(b.status, 'pending'::public.booking_status),
    b.start_at, b.end_at,
    b.assigned_staff_id, b.assigned_staff_name,
    coalesce(b.base_price, 0), coalesce(b.discount, 0),
    coalesce(b.total_cost, 0), b.tip_amount,
    b.special_requests, coalesce(b.details, '{}'::jsonb), b.training_series_session_id
    from jsonb_populate_record(null::public.bookings, p_booking) b
  returning id, ref, facility_id, start_at, end_at
       into v_booking_id, v_ref, v_facility_id, v_start, v_end;

  if array_length(p_pet_ids, 1) > 0 then
    insert into public.booking_pets (booking_id, pet_id)
    select v_booking_id, unnest(p_pet_ids);
  end if;

  if v_missing is not null then
    perform private.record_form_overrides(v_booking_id, 'before_booking', v_form_reason);
  end if;

  if p_boarding is not null and p_boarding->>'roomId' is not null then
    select r.id into v_room_id
      from public.facility_rooms r
     where r.facility_id = v_facility_id
       and (r.legacy_id = p_boarding->>'roomId' or r.id::text = p_boarding->>'roomId')
       and r.active;

    if v_room_id is null then
      raise exception 'This facility has no room %.',
        p_boarding->>'roomId' using errcode = '23503';
    end if;

    v_override := nullif(trim(coalesce(p_boarding->>'overrideReason', '')), '');

    if v_override is not null
       and not private.has_permission(v_facility_id, 'override_booking_capacity')
    then
      raise exception 'Not allowed to override capacity limits.'
        using errcode = '42501';
    end if;

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
     and (s.legacy_id = p_grooming->>'serviceId' or s.id::text = p_grooming->>'serviceId');

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
       and (st.legacy_id = p_grooming->>'stationId' or st.id::text = p_grooming->>'stationId');
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
        on a.facility_id = v_facility_id
       and (a.legacy_id = requested or a.id::text = requested);

    get diagnostics v_written = row_count;
    v_requested := jsonb_array_length(p_grooming->'addOnIds');

    if v_written <> v_requested then
      raise exception 'This facility has % of the % grooming add-ons requested.',
        v_written, v_requested using errcode = '23503';
    end if;
  end if;

  booking_id := v_booking_id; booking_ref := v_ref; return next;
end;
$function$;

do $check$
begin
  if has_function_privilege('anon', 'public.client_missing_forms(uuid,uuid[],text,text)', 'execute') then
    raise exception 'anon can execute client_missing_forms';
  end if;
  if has_function_privilege('anon', 'private.record_form_overrides(uuid,text,text)', 'execute') then
    raise exception 'anon can execute record_form_overrides';
  end if;
end
$check$;
