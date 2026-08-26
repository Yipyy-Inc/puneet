-- ============================================================================
-- A training class is a real series now, and enrolling in one is a real booking.
--
-- HQ Training's report dropped "active classes" and "students enrolled" for a
-- reason: no class/series/enrollment table existed anywhere. This is that
-- schema. Three new tables plus one column on `bookings` -- no new extension
-- table, no change to `training_attendance`. Enrolling a pet books it through
-- the exact same `create_booking()` path every other real booking already
-- uses, so payment, check-in, reporting and the bookings-level "a customer's
-- write is a request, priced at zero, until the facility confirms it" trigger
-- (20260802120000) all apply for free -- nothing about pricing-by-caller is
-- reimplemented here.
--
-- Deliberately NOT in this migration: curriculum, exercises, homework,
-- session completion, the disciplines/course-type catalog, auto-drafted
-- report cards, makeup sessions, drop-ins, waitlist promotion beyond a basic
-- capacity check, packages/passes, and the full training calendar / Session
-- View. Those read a SEPARATE, still-mock fixture universe
-- (`TrainingClass`/`TrainingSession`/`Enrollment` in src/data/training.ts) and
-- are not bridged to this one. A real series's sessions check in and out on
-- the existing real check-in board like any other training booking; they
-- cannot yet be "run" with curriculum or homework.
--
-- Also deliberately NOT in this migration: editing a series' schedule
-- (day/time/date/duration/number of sessions) after creation. Sessions are
-- generated once, at create time. Changing the schedule means cancelling the
-- series and creating a new one -- regenerating sessions safely (without
-- discarding a completed/cancelled session's real history) is real complexity
-- nothing has asked for yet.
-- ============================================================================

create table public.training_series (
  id                  uuid primary key default gen_random_uuid(),
  facility_id         uuid not null references public.facilities(id) on delete cascade,
  location_id         uuid references public.locations(id) on delete set null,
  staff_id            uuid references public.staff(id) on delete set null,
  name                text not null,
  -- Free text, deliberately. The rich TrainingCourseType catalog (images,
  -- discipline colour, curriculum) stays mock -- this just labels the series.
  course_type_name    text not null default '',
  day_of_week         smallint not null check (day_of_week between 0 and 6),
  start_time          time not null,
  duration_minutes    integer not null check (duration_minutes > 0),
  start_date          date not null,
  number_of_sessions  integer not null check (number_of_sessions > 0),
  capacity            integer not null default 0 check (capacity >= 0),
  total_price         numeric(10,2) not null default 0 check (total_price >= 0),
  status              text not null default 'active'
                        check (status in ('draft','active','completed','cancelled')),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index training_series_facility_idx on public.training_series (facility_id, status);

comment on table public.training_series is
  'A real training class offering -- schedule, instructor, branch, capacity, price. Sessions are generated once at create time (see create_training_series). The rich course-type/discipline catalog stays on the mock side; course_type_name here is a label only.';

create or replace function private.touch_training_series()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

create trigger training_series_set_updated_at
  before update on public.training_series
  for each row execute function private.touch_training_series();

create table public.training_series_sessions (
  id             uuid primary key default gen_random_uuid(),
  series_id      uuid not null references public.training_series(id) on delete cascade,
  facility_id    uuid not null references public.facilities(id) on delete cascade,
  session_number integer not null check (session_number > 0),
  start_at       timestamptz not null,
  end_at         timestamptz not null check (end_at > start_at),
  status         text not null default 'scheduled'
                   check (status in ('scheduled','completed','cancelled')),
  created_at     timestamptz not null default now(),
  unique (series_id, session_number)
);

create index training_series_sessions_series_idx on public.training_series_sessions (series_id, session_number);

comment on table public.training_series_sessions is
  'One row per class occurrence, materialized when the series is created. No curriculum/exercise data lives here -- that stays on the mock side until a later stage bridges the two.';

create table public.training_series_enrollments (
  id           uuid primary key default gen_random_uuid(),
  series_id    uuid not null references public.training_series(id) on delete cascade,
  facility_id  uuid not null references public.facilities(id) on delete cascade,
  pet_id       uuid not null references public.pets(id) on delete cascade,
  client_id    uuid not null references public.clients(id) on delete cascade,
  status       text not null default 'enrolled'
                 check (status in ('enrolled','waitlisted','cancelled','completed')),
  enrolled_at  timestamptz not null default now(),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index training_series_enrollments_series_idx on public.training_series_enrollments (series_id, status);
create index training_series_enrollments_client_idx on public.training_series_enrollments (client_id);

-- A cancelled enrollment must not block re-enrolling the same pet later --
-- same idiom as locations_one_primary_per_facility and the grooming
-- branch-price partial indexes: every NULL (or, here, every 'cancelled' row)
-- is otherwise its own thing to a plain UNIQUE constraint.
create unique index training_series_enrollments_active_unique
  on public.training_series_enrollments (series_id, pet_id) where status <> 'cancelled';

create or replace function private.touch_training_series_enrollments()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

create trigger training_series_enrollments_set_updated_at
  before update on public.training_series_enrollments
  for each row execute function private.touch_training_series_enrollments();

comment on table public.training_series_enrollments is
  'A pet''s enrollment in a real series. Written only through enroll_in_training_series() / withdraw_from_training_series() -- see the RLS policies below for why direct inserts are still safe to allow (the same facts they check).';

-- ── The booking says which class session it is for ──────────────────────────
--
-- No new extension table (unlike grooming_appointments/training_attendance).
-- One nullable FK is the whole relationship: a class-session booking checks
-- in and out through the check-in flow that already works today, unmodified.

alter table public.bookings
  add column training_series_session_id uuid
    references public.training_series_sessions(id) on delete set null;

create index bookings_training_series_session_idx
  on public.bookings (training_series_session_id) where training_series_session_id is not null;

-- ── RLS ──────────────────────────────────────────────────────────────────────

alter table public.training_series enable row level security;

create policy training_series_read on public.training_series for select
  using (
    private.is_platform_admin()
    or private.has_permission(facility_id, 'view_training_queue')
    or private.has_permission(facility_id, 'training_manage_programs')
    or (status = 'active' and facility_id in (select private.client_facility_ids()))
  );

create policy training_series_write on public.training_series for all
  using (private.has_permission(facility_id, 'training_manage_programs'))
  with check (private.has_permission(facility_id, 'training_manage_programs'));

revoke all on public.training_series from public;
grant select, insert, update, delete on public.training_series to authenticated;

alter table public.training_series_sessions enable row level security;

create policy training_series_sessions_read on public.training_series_sessions for select
  using (exists (select 1 from public.training_series ts where ts.id = series_id));

-- RLS denies by default with no permissive policy -- a GRANT alone does not
-- admit a row. Only create_training_series() ever inserts here in practice
-- (no UI writes a session directly), but the policy is what actually allows
-- it: same permission as the parent series, since a session only ever exists
-- because its series does.
create policy training_series_sessions_insert on public.training_series_sessions for insert
  with check (
    exists (
      select 1 from public.training_series ts
       where ts.id = series_id
         and private.has_permission(ts.facility_id, 'training_manage_programs')
    )
  );

revoke all on public.training_series_sessions from public;
grant select, insert on public.training_series_sessions to authenticated;

alter table public.training_series_enrollments enable row level security;

create policy training_series_enrollments_read on public.training_series_enrollments for select
  using (
    private.is_platform_admin()
    or private.has_permission(facility_id, 'view_training_queue')
    or private.has_permission(facility_id, 'training_manage_programs')
    or client_id in (select private.own_client_ids())
  );

-- A staff member who can create bookings, or the client themself enrolling
-- their own pet -- same shape as the bookings table's own customer-write
-- policy (20260802120000): the RPC does not gate this, the table does.
create policy training_series_enrollments_insert on public.training_series_enrollments for insert
  with check (
    private.has_permission(facility_id, 'create_bookings')
    or client_id in (select private.own_client_ids())
  );

create policy training_series_enrollments_update on public.training_series_enrollments for update
  using (
    private.has_permission(facility_id, 'create_bookings')
    or private.has_permission(facility_id, 'training_manage_programs')
    or client_id in (select private.own_client_ids())
  )
  with check (
    private.has_permission(facility_id, 'create_bookings')
    or private.has_permission(facility_id, 'training_manage_programs')
    or client_id in (select private.own_client_ids())
  );

revoke all on public.training_series_enrollments from public;
grant select, insert, update on public.training_series_enrollments to authenticated;

-- ============================================================================
-- create_booking() gains one more allow-listed column. `create or replace
-- function` has no way to patch one statement, so the full body is restated
-- -- from 20260806720000, the ACTUAL latest version (not 20260806660000,
-- which still named `payment_status`; that column was pulled from v_known
-- there specifically because it is derived, not settable -- restating from
-- the wrong ancestor would have resurrected a bug already fixed once). Only
-- `training_series_session_id` is new, in v_known and in the insert/select
-- lists. Everything else below is byte-identical to the current function.
-- ============================================================================

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
    'status', 'start_at', 'end_at',
    'assigned_staff_id', 'assigned_staff_name',
    'base_price', 'discount', 'total_cost', 'tip_amount',
    'special_requests', 'details', 'training_series_session_id'
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

  if p_boarding is not null and p_boarding->>'roomId' is not null then
    select r.id into v_room_id
      from public.facility_rooms r
     where r.facility_id = v_facility_id
       and r.legacy_id = p_boarding->>'roomId'
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

revoke all on function public.create_booking(jsonb, uuid[], jsonb, jsonb) from public;
revoke all on function public.create_booking(jsonb, uuid[], jsonb, jsonb) from anon;
grant execute on function public.create_booking(jsonb, uuid[], jsonb, jsonb) to authenticated;

-- ============================================================================
-- create_training_series -- validates, inserts the series, materializes its
-- sessions in the facility's own timezone (a template says "Tuesday 18:00"
-- and means 18:00 where the dogs are -- the schedule_templates migration
-- names the exact bug class of reading this as UTC instead).
-- ============================================================================

create or replace function public.create_training_series(
  p_facility_id       uuid,
  p_name              text,
  p_day_of_week       smallint,
  p_start_time        time,
  p_duration_minutes  integer,
  p_start_date        date,
  p_number_of_sessions integer,
  p_capacity          integer default 0,
  p_total_price       numeric default 0,
  p_location_id       uuid default null,
  p_staff_id          uuid default null,
  p_course_type_name  text default ''
)
returns public.training_series
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_series       public.training_series;
  v_tz           text;
  v_session_date date;
  v_start_at     timestamptz;
  v_end_at       timestamptz;
  v_i            integer;
begin
  if p_location_id is not null and not exists (
       select 1 from public.locations l
        where l.id = p_location_id and l.facility_id = p_facility_id)
  then
    raise exception 'That location does not belong to this facility.'
      using errcode = '23514';
  end if;

  if p_staff_id is not null and not exists (
       select 1 from public.staff s
        where s.id = p_staff_id and s.facility_id = p_facility_id)
  then
    raise exception 'That staff member does not belong to this facility.'
      using errcode = '23514';
  end if;

  if p_location_id is not null then
    select l.timezone into v_tz from public.locations l where l.id = p_location_id;
  end if;
  if v_tz is null then
    select l.timezone into v_tz
      from public.locations l
     where l.facility_id = p_facility_id
     order by l.is_primary desc
     limit 1;
  end if;
  v_tz := coalesce(v_tz, 'UTC');

  insert into public.training_series (
    facility_id, location_id, staff_id, name, course_type_name,
    day_of_week, start_time, duration_minutes, start_date,
    number_of_sessions, capacity, total_price
  ) values (
    p_facility_id, p_location_id, p_staff_id, p_name, coalesce(p_course_type_name, ''),
    p_day_of_week, p_start_time, p_duration_minutes, p_start_date,
    p_number_of_sessions, coalesce(p_capacity, 0), coalesce(p_total_price, 0)
  )
  returning * into v_series;

  for v_i in 0 .. v_series.number_of_sessions - 1 loop
    v_session_date := v_series.start_date + (v_i * 7);
    v_start_at := (v_session_date + v_series.start_time) at time zone v_tz;
    v_end_at := v_start_at + make_interval(mins => v_series.duration_minutes);

    insert into public.training_series_sessions (
      series_id, facility_id, session_number, start_at, end_at
    ) values (
      v_series.id, v_series.facility_id, v_i + 1, v_start_at, v_end_at
    );
  end loop;

  return v_series;
end;
$$;

comment on function public.create_training_series(uuid, text, smallint, time, integer, date, integer, integer, numeric, uuid, uuid, text) is
  'Creates a training series and materializes all of its sessions, once, in the facility''s (or the series'' own branch''s) timezone. SECURITY INVOKER -- judged by training_series_write.';

revoke all on function public.create_training_series(uuid, text, smallint, time, integer, date, integer, integer, numeric, uuid, uuid, text) from public, anon;
grant execute on function public.create_training_series(uuid, text, smallint, time, integer, date, integer, integer, numeric, uuid, uuid, text) to authenticated;

-- ============================================================================
-- enroll_in_training_series -- one enrollment row, then one real booking per
-- remaining session, through create_booking() itself. Pricing and status are
-- NOT branched on caller identity here: the bookings-level trigger
-- (20260802120000) already forces a customer's write to request_submitted at
-- $0 and preserves the honest quote in details.requestedQuote, exactly as it
-- does for every other service. Passing the real price unconditionally and
-- letting that trigger do its job is what every other real booking path does.
-- ============================================================================

create or replace function public.enroll_in_training_series(
  p_series_id     uuid,
  p_pet_id        uuid,
  p_client_id     uuid,
  p_join_waitlist boolean default false
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_series     public.training_series;
  v_enrolled   integer;
  v_status     text;
  v_enrollment public.training_series_enrollments;
  v_session    public.training_series_sessions;
  v_created    record;
  v_price      numeric;
  v_bookings   jsonb := '[]'::jsonb;
begin
  -- An advisory lock, not `for update` -- `select ... for update` also
  -- requires the caller to satisfy the table's UPDATE policy (Postgres locks
  -- a row as a preliminary update), and training_series' UPDATE policy is
  -- training_manage_programs-only. A customer enrolling their own pet would
  -- have failed this SELECT entirely, silently, for a reason that has
  -- nothing to do with enrolling. The advisory lock still serializes two
  -- concurrent enrollments into the same series without touching RLS at all.
  perform pg_advisory_xact_lock(hashtext(p_series_id::text));

  select * into v_series from public.training_series where id = p_series_id;
  if not found then
    raise exception 'No such training series.' using errcode = '23503';
  end if;

  if v_series.status <> 'active' then
    raise exception 'This series is not open for enrollment.' using errcode = '22023';
  end if;

  select count(*) into v_enrolled
    from public.training_series_enrollments
   where series_id = p_series_id and status = 'enrolled';

  if v_enrolled >= v_series.capacity then
    if not p_join_waitlist then
      raise exception 'This series is full.' using errcode = '22023';
    end if;
    v_status := 'waitlisted';
  else
    v_status := 'enrolled';
  end if;

  insert into public.training_series_enrollments (
    series_id, facility_id, pet_id, client_id, status
  ) values (
    p_series_id, v_series.facility_id, p_pet_id, p_client_id, v_status
  )
  returning * into v_enrollment;

  -- Waitlisted: no bookings. Nothing to check in for a spot that isn't held.
  if v_status = 'waitlisted' then
    return jsonb_build_object('enrollment', to_jsonb(v_enrollment), 'bookings', v_bookings);
  end if;

  v_price := case when v_series.number_of_sessions > 0
                  then round(v_series.total_price / v_series.number_of_sessions, 2)
                  else 0 end;

  -- Only sessions still ahead of us -- enrolling partway through a series
  -- must not retroactively book a session that already happened.
  for v_session in
    select * from public.training_series_sessions
     where series_id = p_series_id
       and status = 'scheduled'
       and start_at >= now()
     order by session_number
  loop
    select * into v_created from public.create_booking(
      jsonb_build_object(
        'facility_id', v_series.facility_id,
        'location_id', v_series.location_id,
        'client_id', p_client_id,
        'service', 'training',
        'service_type', v_series.course_type_name,
        'status', 'confirmed',
        'start_at', v_session.start_at,
        'end_at', v_session.end_at,
        'assigned_staff_id', v_series.staff_id,
        'base_price', v_price,
        'total_cost', v_price,
        'training_series_session_id', v_session.id
      ),
      array[p_pet_id]
    );

    v_bookings := v_bookings || jsonb_build_object(
      'bookingId', v_created.booking_id,
      'bookingRef', v_created.booking_ref,
      'sessionId', v_session.id,
      'sessionNumber', v_session.session_number
    );
  end loop;

  return jsonb_build_object('enrollment', to_jsonb(v_enrollment), 'bookings', v_bookings);
end;
$$;

comment on function public.enroll_in_training_series(uuid, uuid, uuid, boolean) is
  'Enrolls a pet in a series and books every remaining session through create_booking() itself -- pricing/status-by-caller is not reimplemented here, the bookings-level trigger already does it. Full + not joining the waitlist raises; full + joining creates the enrollment as waitlisted with no bookings. SECURITY INVOKER -- judged by training_series_enrollments_insert and create_booking''s own policies.';

revoke all on function public.enroll_in_training_series(uuid, uuid, uuid, boolean) from public, anon;
grant execute on function public.enroll_in_training_series(uuid, uuid, uuid, boolean) to authenticated;

-- ============================================================================
-- withdraw_from_training_series -- cancels the enrollment and every future,
-- not-yet-completed booking it produced. Never deletes: bookings has no
-- DELETE policy, by design, and neither does this table's caller-facing path.
-- ============================================================================

create or replace function public.withdraw_from_training_series(p_enrollment_id uuid)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_enrollment public.training_series_enrollments;
begin
  select * into v_enrollment
    from public.training_series_enrollments
   where id = p_enrollment_id
   for update;

  if not found then
    raise exception 'No such enrollment.' using errcode = '23503';
  end if;

  update public.training_series_enrollments
     set status = 'cancelled'
   where id = p_enrollment_id;

  update public.bookings b
     set status = 'cancelled'
   where b.training_series_session_id in (
           select tss.id from public.training_series_sessions tss
            where tss.series_id = v_enrollment.series_id
         )
     and b.client_id = v_enrollment.client_id
     and b.start_at >= now()
     and b.status not in ('completed', 'cancelled', 'no_show')
     and exists (
           select 1 from public.booking_pets bp
            where bp.booking_id = b.id and bp.pet_id = v_enrollment.pet_id
         );
end;
$$;

comment on function public.withdraw_from_training_series(uuid) is
  'Cancels an enrollment and its still-upcoming bookings. Past/completed sessions are left alone -- withdrawing does not rewrite history. SECURITY INVOKER.';

revoke all on function public.withdraw_from_training_series(uuid) from public, anon;
grant execute on function public.withdraw_from_training_series(uuid) to authenticated;
