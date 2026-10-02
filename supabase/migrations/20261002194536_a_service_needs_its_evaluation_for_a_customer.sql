-- ============================================================================
-- A service that needs an evaluation first needs it for a customer's booking
-- too — whichever service it is (the client's evaluation mocks, 2026-10-02).
--
-- Until now the database held one such rule: a daycare service marked
-- "requires an evaluation online". Every other service the facility said
-- needed an evaluation was enforced by the customer's own browser only, so a
-- request written by hand booked boarding for a dog nobody had met. The
-- setup page made "Services that need an evaluation first" one list
-- (booking_flow.servicesRequiringEvaluation — and, until a facility saves
-- that page, the two older switches it replaces); this is that list, read
-- where the booking is written.
--
--   private.service_needs_evaluation(facility, service)   the rule, as the
--       wizard reads it (lib/bookings/wizard/service-eligibility.ts)
--   private.pet_passed_evaluation_for(pet, service)       the pet's LATEST
--       evaluation passed, is current, and approves this service — the same
--       test the wizard's lock applies (petUnlockedForService)
--   public.create_booking                                 refuses a customer
--       (hint 'evaluation_required'); staff are not refused
--
-- create_booking is copied exactly from production (supabase/baseline,
-- 20261002123123) and changed only by the block marked 2026-10-02.
-- ============================================================================

create or replace function private.service_needs_evaluation(
  p_facility_id uuid,
  p_service text
) returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((
    select coalesce((f.value->>'evaluationRequired')::boolean, false)
        or coalesce(f.value->'servicesRequiringEvaluation', '[]'::jsonb) ? p_service
      from public.facility_settings f
     where f.facility_id = p_facility_id
       and f.domain = 'booking_flow'
  ), false)
  or coalesce((
    -- A module's own "Enable Evaluation" (enabled and not optional), until
    -- the facility saves the setup page, which makes it agree with the list.
    select coalesce((m.value->'settings'->'evaluation'->>'enabled')::boolean, false)
       and not coalesce((m.value->'settings'->'evaluation'->>'optional')::boolean, false)
      from public.facility_settings m
     where m.facility_id = p_facility_id
       and m.domain = p_service || '_config'
       and p_service in ('daycare', 'boarding', 'grooming', 'training')
  ), false);
$$;

revoke all on function private.service_needs_evaluation(uuid, text) from public;
revoke all on function private.service_needs_evaluation(uuid, text) from anon;
-- create_booking is SECURITY INVOKER: it calls this as the booker.
grant execute on function private.service_needs_evaluation(uuid, text) to authenticated;
grant execute on function private.service_needs_evaluation(uuid, text) to service_role;

create or replace function private.pet_passed_evaluation_for(
  p_pet_id uuid,
  p_service text
) returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  with latest as (
    select e
      from public.pets p,
           jsonb_array_elements(
             case jsonb_typeof(p.details->'evaluations')
               when 'array' then p.details->'evaluations'
               else '[]'::jsonb
             end) e
     where p.id = p_pet_id
     order by e->>'evaluatedAt' desc nulls last
     limit 1
  )
  select coalesce((
    select (e->>'status') = 'passed'
       and coalesce(e->>'isExpired', 'false') <> 'true'
       and case
             -- daycare and boarding carry their own yes or no
             when p_service in ('daycare', 'boarding')
                  and jsonb_typeof(e->'approvedServices'->p_service) = 'boolean'
               then (e->'approvedServices'->>p_service)::boolean
             -- every other service is listed when approved
             when jsonb_typeof(e->'approvedServices'->'customApproved') = 'array'
               then (e->'approvedServices'->'customApproved') ? p_service
             -- a pass that names no services lets the pet into all of them
             else true
           end
      from latest
  ), false);
$$;

revoke all on function private.pet_passed_evaluation_for(uuid, text) from public;
revoke all on function private.pet_passed_evaluation_for(uuid, text) from anon;
grant execute on function private.pet_passed_evaluation_for(uuid, text) to authenticated;
grant execute on function private.pet_passed_evaluation_for(uuid, text) to service_role;

CREATE OR REPLACE FUNCTION public.create_booking(p_booking jsonb, p_pet_ids uuid[] DEFAULT '{}'::uuid[], p_grooming jsonb DEFAULT NULL::jsonb, p_boarding jsonb DEFAULT NULL::jsonb) RETURNS TABLE(booking_id uuid, booking_ref bigint)
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
declare
  v_known        text[] := array[
    'facility_id', 'location_id', 'client_id', 'service', 'service_type',
    'status', 'start_at', 'end_at',
    'assigned_staff_id', 'assigned_staff_name',
    'base_price', 'discount', 'total_cost', 'tip_amount',
    'special_requests', 'details', 'training_series_session_id',
    'form_override_reason', 'service_charges_included'
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
  v_room_id      uuid;
  v_override     text;
  v_missing      text;
  v_form_reason  text;
  v_eval_service text;
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

  -- ── THE EVALUATION A DAYCARE SERVICE REQUIRES BEFORE ONLINE BOOKING ─────
  --
  -- Only for a caller who cannot create bookings, i.e. the customer. The
  -- field is 'requires_evaluation_online' and the online channel is what it
  -- governs; staff at the desk are the other question, and this is not it.
  --
  -- The service is named in the message because a refusal a customer cannot
  -- act on is not a refusal, it is a dead end.
  if p_booking->>'service' = 'daycare'
     and p_booking->'details'->>'daycareServiceId' is not null
     and not private.has_permission((p_booking->>'facility_id')::uuid, 'create_bookings')
  then
    select s.name into v_eval_service
      from public.daycare_services s
     where s.facility_id = (p_booking->>'facility_id')::uuid
       and (s.id::text = p_booking->'details'->>'daycareServiceId'
            or s.legacy_id = p_booking->'details'->>'daycareServiceId')
       and s.requires_evaluation_online
       -- Refuse when ANY pet on the booking lacks a pass. A booking is one
       -- record for every animal on it, so it cannot go ahead half-approved.
       and exists (
         select 1 from unnest(p_pet_ids) pid
          where not private.pet_passed_daycare_evaluation(pid))
     limit 1;

    if v_eval_service is not null then
      raise exception 'Book an evaluation before booking %.', v_eval_service
        using errcode = '22023', hint = 'daycare_evaluation_required';
    end if;
  end if;

  -- ── THE EVALUATION A SERVICE NEEDS FIRST (2026-10-02) ──────────────────
  --
  -- "Services that need an evaluation first" — the facility's one rule since
  -- the evaluation setup page (Settings › Services › Evaluations). A customer
  -- books such a service only for pets whose latest evaluation passed, is
  -- current, and does not leave this service out. Staff decide at the desk
  -- (the wizard's Confirm asks, and keeps the reason), as for daycare above.
  if p_booking->>'service' is not null
     and p_booking->>'service' <> 'evaluation'
     and not private.has_permission((p_booking->>'facility_id')::uuid, 'create_bookings')
     and private.service_needs_evaluation(
           (p_booking->>'facility_id')::uuid, p_booking->>'service')
     and exists (
       select 1 from unnest(p_pet_ids) pid
        where not private.pet_passed_evaluation_for(pid, p_booking->>'service'))
  then
    raise exception 'Book an evaluation before booking %.', p_booking->>'service'
      using errcode = '22023', hint = 'evaluation_required';
  end if;

  insert into public.bookings (
    facility_id, location_id, client_id, service, service_type,
    status, start_at, end_at,
    assigned_staff_id, assigned_staff_name,
    base_price, discount, total_cost, tip_amount,
    special_requests, details, training_series_session_id,
    service_charges_included
  )
  select
    b.facility_id, b.location_id, b.client_id, b.service, b.service_type,
    coalesce(b.status, 'pending'::public.booking_status),
    b.start_at, b.end_at,
    b.assigned_staff_id, b.assigned_staff_name,
    coalesce(b.base_price, 0), coalesce(b.discount, 0),
    coalesce(b.total_cost, 0), b.tip_amount,
    b.special_requests, coalesce(b.details, '{}'::jsonb), b.training_series_session_id,
    coalesce(b.service_charges_included, false)
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

  -- A groom's add-ons are `add_on` lines on the bill, placed by
  -- `create_bookings` from the request's `addOns` (20260930153912). Ids sent
  -- here were once written to a table of their own; they are refused rather
  -- than dropped, so nobody books an add-on no bill carries.
  if jsonb_typeof(p_grooming->'addOnIds') = 'array'
     and jsonb_array_length(p_grooming->'addOnIds') > 0 then
    raise exception 'A groom''s add-ons are sent as the request''s addOns, not as addOnIds.'
      using errcode = '22023';
  end if;

  booking_id := v_booking_id; booking_ref := v_ref; return next;
end;
$$;
