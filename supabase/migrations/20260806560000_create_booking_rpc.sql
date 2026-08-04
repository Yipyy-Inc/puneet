-- ============================================================================
-- Creating a booking is one transaction, and grooming bookings finally create
-- their appointment.
--
-- ── THE BUG THIS CLOSES ───────────────────────────────────────────────────
--
-- /api/grooming/appointments has GET and PATCH and no POST. Every grooming
-- appointment in this database arrived through a backfill migration
-- (20260805220000, 20260805230000). Nothing in the running app could create
-- one.
--
-- Meanwhile /api/bookings POST wrote a `bookings` row and its `booking_pets`
-- and stopped. `grooming_appointments` is PRIMARY KEY (booking_id) -- an
-- extension, not a sibling -- so a grooming booking made through the app landed
-- as a booking with no extension row.
--
-- It did NOT vanish from the board, which is what I assumed before measuring
-- it. The board's GET reads `bookings` and left-joins the extension, and
-- rowToGroomingAppointment falls back with
-- `packageName: ext?.service_name ?? row.status`. So the appointment appeared
-- as a card named "confirmed", with no service, no price and no duration --
-- reproduced by reverting this function to the old two-insert path and running
-- tests/e2e/booking-write-integrity.spec.ts, which reports:
--
--   Expected: "Full Groom"   Received: "confirmed"
--
-- Worth stating precisely, because a phantom card nobody can act on is harder
-- to notice than a missing one, and that `?? row.status` fallback is still
-- there serving the pre-extension backfill rows.
--
-- ── DECISION 1: one write path, not a grooming one ────────────────────────
--
-- The obvious fix is POST /api/grooming/appointments. Refused: the extension is
-- keyed on booking_id, so that endpoint would be a second door onto rows the
-- bookings route already owns, and the BookingModal -- which books every
-- service through /api/bookings -- would still produce grooming bookings with
-- no appointment. The route that creates bookings is the route that must create
-- this.
--
-- ── DECISION 2: an RPC, because half a booking cannot be withdrawn ────────
--
-- `bookings` has no DELETE policy, by design: a booking is cancelled, not
-- erased. So when the route inserted the booking first and the pets second, a
-- refusal on the second insert left a booking with no animals on it and no way
-- to take it back. The route worked around that by validating pets BEFORE the
-- insert -- correct, and it only covered the one case somebody had thought of.
-- Adding the extension would have added a third such case.
--
-- A transaction removes the class. Every insert here is SECURITY INVOKER, so
-- RLS judges each one as the caller, and any refusal rolls back all of them.
-- The route's pre-validation stays, but it is now an error-message improvement
-- rather than the thing standing between us and an orphan row.
--
-- SECURITY INVOKER and not DEFINER: the point is atomicity, never a way to
-- write rows the caller could not write themselves.
--
-- ── DECISION 3: the caller sends the choice, the server prices it ─────────
--
-- p_grooming carries legacy ids -- which service, which add-ons, which station.
-- Price and duration are read here from grooming_services,
-- grooming_service_size_prices and grooming_add_ons. A client-supplied price is
-- a suggestion, and the snapshot on the appointment is what the counter later
-- bills.
--
-- The size label is derived from the pet's weight against the facility's own
-- tiers rather than accepted from the request: how big the animal is, is a fact
-- about the animal, not a field on a form. Same derivation the GET already does
-- for rows that predate the extension table.
--
-- ── DECISION 4: a customer's request carries no agreed price ──────────────
--
-- private.enforce_booking_integrity() already decided this. A caller without
-- `create_bookings` has status forced to request_submitted, base_price,
-- discount and total_cost zeroed, and the numbers they asked for preserved
-- under details.requestedQuote. If the extension snapshotted the catalogue
-- price anyway, a customer request would arrive at the counter carrying a price
-- the trigger had just refused to record -- and the extension's snapshot is
-- exactly what the board and the invoice read. So the same test is applied
-- here: staff price it, a request does not.
--
-- Add-on prices go to zero on the same test and for the same reason.
-- ============================================================================

-- The columns this function knows how to place. Anything else in p_booking is
-- an error rather than a shrug: `bookingToRow` in src/lib/api/mappers/booking.ts
-- is where columns get added, and a new one silently dropped here would be a
-- write that reports success and loses a field. Better to break loudly the
-- first time somebody adds one.
create or replace function public.create_booking(
  p_booking  jsonb,
  p_pet_ids  uuid[] default '{}',
  p_grooming jsonb  default null
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
begin
  select array_agg(k)
    into v_unknown
    from jsonb_object_keys(p_booking) k
   where k <> all (v_known);

  if v_unknown is not null then
    raise exception 'create_booking does not handle booking column(s): %',
      array_to_string(v_unknown, ', ')
      using errcode = '22023';
  end if;

  -- A grooming booking with no grooming payload is the bug this migration
  -- exists to close, so it is refused rather than written as a board-invisible
  -- booking.
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
  returning id, ref, facility_id
       into v_booking_id, v_ref, v_facility_id;

  -- facility_id is read back rather than trusted from the input:
  -- enforce_booking_integrity() overwrites it with the client's own facility,
  -- and the extension rows must agree with the booking, not with the caller.

  if array_length(p_pet_ids, 1) > 0 then
    insert into public.booking_pets (booking_id, pet_id)
    select v_booking_id, unnest(p_pet_ids);
  end if;

  if p_grooming is null then
    booking_id := v_booking_id;
    booking_ref := v_ref;
    return next;
    return;
  end if;

  v_is_staff := private.has_permission(v_facility_id, 'create_bookings');

  select s.id, s.name, s.base_price, s.duration_min
    into v_service_id, v_service_name, v_price, v_duration
    from public.grooming_services s
   where s.facility_id = v_facility_id
     and s.legacy_id = p_grooming->>'serviceId';

  if v_service_id is null then
    raise exception 'This facility has no grooming service %.',
      coalesce(p_grooming->>'serviceId', '(none given)')
      using errcode = '23503';
  end if;

  -- The pet's tier, by weight, against the facility's own bands. `order by`
  -- takes the smallest band the animal fits; the open-ended top band sorts last.
  select p.weight into v_weight
    from public.pets p
   where p.id = p_pet_ids[1];

  if v_weight is not null then
    select t->>'id'
      into v_size
      from public.grooming_config c,
           lateral jsonb_array_elements(c.pet_size_tiers) t
     where c.facility_id = v_facility_id
       and (
         t->>'maxWeightLbs' is null
         or v_weight <= (t->>'maxWeightLbs')::numeric
       )
     order by coalesce((t->>'maxWeightLbs')::numeric, 999999)
     limit 1;
  end if;

  -- Assigned through their own variables and only if a row came back. A
  -- `select ... into v_price` that matches nothing sets v_price to NULL, so
  -- reading straight into the running values would let a service with no size
  -- price for this tier erase the base price it was supposed to fall back to.
  if v_size is not null then
    select sp.price, sp.duration_min
      into v_size_price, v_size_dur
      from public.grooming_service_size_prices sp
     where sp.service_id = v_service_id
       and sp.size_label = v_size;

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
    v_booking_id, v_facility_id, v_service_id, v_service_name,
    v_size,
    case when v_is_staff then v_price else 0 end,
    greatest(coalesce(v_duration, 60), 1),
    v_station_id
  );

  -- Add-ons snapshot name, price and duration for the same reason the service
  -- line does: the catalogue is edited, and a ticket must still say what was
  -- agreed on the day.
  --
  -- The row count is checked because this is a JOIN: an add-on id the facility
  -- does not have matches nothing, inserts nothing, and raises nothing -- the
  -- groom would simply arrive without the nail trim somebody was charged for
  -- on the booking screen. There are two grooming add-on lists in the mock data
  -- (src/data/grooming-add-ons.ts, which seeded this table, and the `ao_teeth`
  -- list in src/data/grooming-pricing-rules.ts) and only one of them keys the
  -- way this table does, so a drifting id here is a question of when.
  if jsonb_typeof(p_grooming->'addOnIds') = 'array' then
    insert into public.grooming_appointment_add_ons (
      booking_id, facility_id, add_on_id, name, price, duration_min
    )
    select
      v_booking_id, v_facility_id, a.id, a.name,
      case when v_is_staff then a.price else 0 end,
      a.duration_min
      from jsonb_array_elements_text(p_grooming->'addOnIds') requested
      join public.grooming_add_ons a
        on a.facility_id = v_facility_id
       and a.legacy_id = requested;

    get diagnostics v_written = row_count;
    v_requested := jsonb_array_length(p_grooming->'addOnIds');

    if v_written <> v_requested then
      raise exception
        'This facility has % of the % grooming add-ons requested.',
        v_written, v_requested
        using errcode = '23503';
    end if;
  end if;

  booking_id := v_booking_id;
  booking_ref := v_ref;
  return next;
end;
$$;

comment on function public.create_booking(jsonb, uuid[], jsonb) is
  'Creates a booking, its pets and -- for grooming -- its appointment and '
  'add-ons in one transaction. SECURITY INVOKER: every insert is judged by RLS '
  'as the caller, and any refusal rolls back the whole booking.';

-- `revoke from public` is not `revoke from anon`: Supabase grants execute to
-- its roles by name, so the default PUBLIC grant is only half the story.
-- Checked with pg_proc.proacl after applying.
revoke all on function public.create_booking(jsonb, uuid[], jsonb) from public;
revoke all on function public.create_booking(jsonb, uuid[], jsonb) from anon;
grant execute on function public.create_booking(jsonb, uuid[], jsonb)
  to authenticated;
