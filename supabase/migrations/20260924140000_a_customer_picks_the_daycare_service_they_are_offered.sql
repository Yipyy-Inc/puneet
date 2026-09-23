-- ============================================================================
-- A CUSTOMER PICKS THE DAYCARE SERVICE THEY ARE OFFERED — AND ONLY THAT ONE.
--
-- Phase 6 of the MoéGo daycare work. Phases 1-5 gave the facility a menu, gave
-- the booking a choice, and made a late check-out move the bill. All of it was
-- the STAFF side. A customer booking online still reached the menu through
-- `/api/daycare/services`, the staff route, and that has three problems.
--
-- ── 1. THE STAFF ROUTE SCOPES BY MEMBERSHIP, AND A CUSTOMER HAS NONE ──────
--
-- `activeFacilityIdForStaff()` returns NULL for a customer by design, so
-- `inFacility(null)` is `{}` and the query is left to RLS alone. RLS admits
-- active services at every facility the caller is a CLIENT of, and
-- `private.client_facility_ids()` is `setof uuid` — plural, deliberately,
-- because one household can use two businesses. So a customer with two
-- facilities was shown both menus merged into one list, with nothing on the
-- screen saying which service belonged to whom.
--
-- ── 2. RLS HANDS OVER THE WHOLE ROW ───────────────────────────────────────
--
-- The same reasoning as `offered_custom_services` (20260912172123). A row in
-- `daycare_services` carries things that are the facility's own working notes:
--
--   * `color` — the calendar's colour code. Our own setup screen labels it
--     "internal only", because MoéGo's does.
--   * `blocked_pet_tags` and `eligible_pet_tags` — the facility's behavioural
--     classification of animals. "This service excludes pets tagged Bites" is
--     a sentence no customer should be able to read, about their own dog or
--     anybody else's.
--   * `allowed_section_ids`, `rollover_to_service_id`, `rollover_after_minutes`,
--     `requires_evaluation`, `legacy_id`, `size_pricing` — operational.
--
-- So this is an ALLOWLIST of keys, not a list of keys to remove: a column a
-- later phase adds to the table is private until somebody decides otherwise
-- here.
--
-- The pet-tag rules are not dropped with the arrays — they are APPLIED, here,
-- against the pets the customer named. A rule the client can no longer read is
-- a rule the server now has to enforce, and the trade is the right way round.
--
-- ── 3. `requires_evaluation_online` WAS READ BY NOTHING ───────────────────
--
-- MoéGo asks for the evaluation twice, as two separate questions, because they
-- are: one stops STAFF booking a service, the other stops a CUSTOMER booking it
-- online. We stored both from Phase 1, the setup screen has written both since
-- Phase 3 — and nothing anywhere read the second one. A facility could tick
-- "requires an evaluation before online booking" and the customer booked it
-- anyway.
--
-- That is the same defect as `size_pricing`, and a filter in the picker would
-- not have fixed it: a customer who can POST can POST anything. So the refusal
-- is here, inside `create_booking`, beside the form gate it is modelled on
-- (20260915104919) — 22023 with hint 'daycare_evaluation_required', which the
-- bookings route turns into a 422 naming the service.
--
-- STAFF ARE NOT GATED BY IT. `requires_evaluation_online` is about the online
-- channel, so the check asks `create_bookings` first: somebody standing at the
-- desk with the dog in front of them is not booking online, and MoéGo draws the
-- line in exactly the same place.
--
-- SQL P0-P9 in daycare-customer-services.sql.
-- ============================================================================

-- ── Has this pet passed an evaluation that still counts, for daycare? ───────
--
-- Evaluations live in `pets.details->'evaluations'`, written by the facility
-- and stripped from a customer's own write by the trigger in 20260803090000.
-- Three conditions, all measured against the stored shape rather than assumed:
--
--   * `status = 'passed'` — a pending or failed evaluation is not a pass;
--   * `isExpired` is not true — a pass that lapsed is not a pass. The flag is
--     the facility's own; this does not recompute it from `expiresAt`, because
--     the screen that writes it is the authority on when it lapsed;
--   * `approvedServices.daycare` is not false — a pet can pass an evaluation
--     and still be denied one service. Absent means no per-service opinion was
--     recorded, which is a pass.
create or replace function private.pet_passed_daycare_evaluation(p_pet_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $fn$
  select exists (
    select 1
      from public.pets p
      cross join lateral jsonb_array_elements(
        case when jsonb_typeof(p.details->'evaluations') = 'array'
             then p.details->'evaluations'
             else '[]'::jsonb end) e
     where p.id = p_pet_id
       and e->>'status' = 'passed'
       and coalesce((e->>'isExpired')::boolean, false) is not true
       and coalesce((e->'approvedServices'->>'daycare')::boolean, true) is not false
  );
$fn$;

comment on function private.pet_passed_daycare_evaluation(uuid) is
  'True when the pet holds a passed, unexpired evaluation that does not deny '
  'daycare. Reads pets.details->evaluations, which only the facility writes.';

revoke all on function private.pet_passed_daycare_evaluation(uuid) from public;
revoke all on function private.pet_passed_daycare_evaluation(uuid) from anon;
grant execute on function private.pet_passed_daycare_evaluation(uuid)
  to authenticated, service_role;

-- ── The menu a customer may see, at their branch, for their pets ────────────
--
-- `p_location_id` null means the facility-wide answer, which is what a
-- single-location business always gets. `p_pet_ids` empty means "do not apply
-- the pet-tag rules" — the menu before anybody has chosen an animal — and the
-- picker re-asks once pets are chosen.
create or replace function public.offered_daycare_services(
  p_facility_id uuid,
  p_location_id uuid default null,
  p_pet_ids uuid[] default '{}'::uuid[]
)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $fn$
  with allowed as (
    select private.is_platform_admin()
        or p_facility_id in (select private.client_facility_ids())
        or p_facility_id in (select private.member_facility_ids_all()) as ok
  ),
  -- Every pet tag carried by the pets the customer named, as text, so the
  -- service's own `text[]` columns compare against it directly.
  pet_tags as (
    select coalesce(array_agg(distinct ta.tag_id::text), '{}'::text[]) as tags
      from public.facility_tag_assignments ta
     where ta.entity_type = 'pet'
       and ta.entity_id = any (p_pet_ids)
       and ta.facility_id = p_facility_id
       and (ta.expires_at is null or ta.expires_at > now())
  ),
  offered as (
    select s.display_order,
           s.name,
           jsonb_build_object(
             'id',                  s.id,
             'categoryId',          s.category_id,
             'name',                s.name,
             'description',         s.description,
             'imageUrl',            s.image_url,
             -- What it costs HERE: the branch's own row where it set one, the
             -- facility-wide row next, the service's own column last. The same
             -- order `effectivePrice()` resolves in TypeScript, because a
             -- customer quoted a different number from the till is the whole
             -- class of bug this phase exists to close.
             'price',               coalesce(branch.price, facility_wide.price, s.price),
             'facilityPrice',       coalesce(facility_wide.price, s.price),
             'taxable',             s.taxable,
             'maxDurationHours',    s.max_duration_hours,
             -- These describe the SERVICE ("for dogs under 20 lb"), which is
             -- exactly what a customer needs to understand the menu. The pet
             -- TAG rules describe the PET, and are applied above instead.
             'eligibleSpecies',     to_jsonb(s.eligible_species),
             'eligibleBreeds',      to_jsonb(s.eligible_breeds),
             'eligibleWeightTiers', to_jsonb(s.eligible_weight_tiers),
             'includedAddOnIds',    to_jsonb(s.included_addon_ids),
             'locationIds',         to_jsonb(s.location_ids),
             -- Kept, because the flow has to be able to SAY why a service is
             -- not bookable yet rather than silently omitting it.
             'requiresEvaluationOnline', s.requires_evaluation_online,
             'displayOrder',        s.display_order
           ) as service
      from public.daycare_services s
      cross join allowed
      cross join pet_tags
      left join public.daycare_service_location_prices branch
        on branch.service_id = s.id and branch.location_id = p_location_id
      left join public.daycare_service_location_prices facility_wide
        on facility_wide.service_id = s.id and facility_wide.location_id is null
     where allowed.ok
       and s.facility_id = p_facility_id
       -- A draft is not on offer.
       and s.is_active
       -- Empty `location_ids` means every branch, which is why this is not a
       -- plain `@>`: an unrestricted service must survive a null branch too.
       and (cardinality(s.location_ids) = 0
            or p_location_id is null
            or p_location_id = any (s.location_ids))
       -- Blocked beats eligible, the rule the editor states and Phase 4's
       -- `isPetEligible` implements. Both are no-ops on an empty array.
       and not (cardinality(s.blocked_pet_tags) > 0
                and s.blocked_pet_tags && pet_tags.tags)
       and (cardinality(s.eligible_pet_tags) = 0
            or s.eligible_pet_tags && pet_tags.tags)
  )
  select coalesce(
           jsonb_agg(offered.service order by offered.display_order, offered.name),
           '[]'::jsonb)
    from offered;
$fn$;

comment on function public.offered_daycare_services(uuid, uuid, uuid[]) is
  'The daycare services a facility offers online, as a customer may see them: '
  'active, offered at that branch, pet-tag rules already applied, projected to '
  'an allowlist of keys. Colour, pet tags, sections and rollover are the '
  'facility own and are not returned.';

revoke all on function public.offered_daycare_services(uuid, uuid, uuid[]) from public;
revoke all on function public.offered_daycare_services(uuid, uuid, uuid[]) from anon;
grant execute on function public.offered_daycare_services(uuid, uuid, uuid[])
  to authenticated, service_role;

-- ── create_booking, with the evaluation gate ───────────────────────────────
--
-- Taken from its LIVE body (pg_get_functiondef, 2026-09-23) rather than from
-- the 2026-09-15 migration that last declared it: re-typing the older text
-- would silently revert anything that changed in between, and this is the
-- function every booking in the product goes through.
--
-- The ONLY edits are the `v_eval_service` declaration and the block marked
-- below. Everything else is byte-for-byte what is running now.

CREATE OR REPLACE FUNCTION public.create_booking(p_booking jsonb, p_pet_ids uuid[] DEFAULT '{}'::uuid[], p_grooming jsonb DEFAULT NULL::jsonb, p_boarding jsonb DEFAULT NULL::jsonb)
 RETURNS TABLE(booking_id uuid, booking_ref bigint)
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
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
