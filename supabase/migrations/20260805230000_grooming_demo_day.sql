-- ============================================================================
-- A DEMO DAY of grooming appointments, so the check-in board has something to
-- show.
--
-- ── THIS SEEDS TRANSACTIONS, NOT CONFIGURATION, AND THAT IS DIFFERENT ──────
--
-- The catalogue and station seeds recorded what a facility HAS. This records
-- appointments that never happened. It is defensible only because the whole
-- dataset is a demo one — the 14 clients, 20 pets and 87 bookings already here
-- are all mock-derived — and because the alternative is a board that renders
-- empty and looks broken.
--
-- Every row is therefore MARKED: `details->>'seed' = 'grooming-demo-day'`.
-- Removing them is one delete, and nothing else in the schema depends on them:
--
--   delete from public.bookings where details->>'seed' = 'grooming-demo-day';
--
-- IT SEEDS FOR THE DAY IT RUNS, and does not repeat. The board filters on
-- today, so this populates today and tomorrow it is history — same as the mock
-- fixture it replaces, whose dates were also fixed at authoring time. Keeping
-- a board permanently populated would need a demo-data refresher, which is a
-- different thing and not something to smuggle in behind a seed.
--
-- ── THE STATUSES ARE REACHED BY TRANSITION, NOT WRITTEN ────────────────────
--
-- Every booking is inserted `confirmed` and then UPDATED to its target status,
-- because the lifecycle trigger fires on `after update of status`
-- (20260805140000). Inserting `checked_in` directly would produce a row that
-- claims a pet arrived with no check_in_at and no ready-ETA — the exact
-- inconsistency the trigger exists to prevent, baked in by its own seed.
--
-- Doing it this way also exercises the trigger: the ETAs below are computed by
-- the database from each service's duration plus the add-ons on the ticket, not
-- written here.
-- ============================================================================

do $$
declare
  v_fac   uuid;
  v_loc   uuid;
  v_tz    text;
  -- Groomers. These three map to stylist-001/002/003 in the mock stylist list,
  -- which is what the board groups its columns by.
  v_jess  uuid; v_amy uuid; v_marcus uuid;
  v_bk    uuid;
  v_svc   uuid;
  v_tub1  uuid; v_tbl1 uuid;
  -- (client_ref, pet_ref, service legacy, groomer, start hour, target status)
  r record;
begin
  select id, timezone into v_fac, v_tz from public.facilities where legacy_id = '11';
  if v_fac is null then
    raise notice 'No demo facility (legacy_id 11) — nothing seeded.';
    return;
  end if;

  -- Idempotent: if the marker is already present, this has run.
  if exists (select 1 from public.bookings where details->>'seed' = 'grooming-demo-day') then
    raise notice 'Demo day already seeded.';
    return;
  end if;

  select id into v_loc from public.locations where facility_id = v_fac and is_primary limit 1;
  select id into v_jess   from public.staff where legacy_id = 'fs-groom-08';
  select id into v_amy    from public.staff where legacy_id = 'fs-groom-09';
  select id into v_marcus from public.staff where legacy_id = 'fs-groom-10';
  select id into v_tub1 from public.grooming_stations where facility_id = v_fac and legacy_id = 'gs-tub-01';
  select id into v_tbl1 from public.grooming_stations where facility_id = v_fac and legacy_id = 'gs-t-01';

  for r in
    select * from (values
      -- pet_ref, service legacy_id, groomer, start hour (local), size, price, target status
      (50, 'groom-pkg-002', 'jess',   9,  'small',  55.00, 'ready'),
      (4,  'groom-pkg-003', 'amy',    10, 'small',  85.00, 'checked_in'),
      (1,  'groom-pkg-001', 'jess',   11, 'medium', 35.00, 'in_progress'),
      (6,  'groom-pkg-006', 'amy',    14, 'small',  45.00, 'confirmed'),
      (3,  'groom-pkg-004', 'marcus', 15, 'medium', 25.00, 'confirmed')
    ) as t(pet_ref, svc, groomer, hour, size_label, price, target)
  loop
    select id into v_svc from public.grooming_services
     where facility_id = v_fac and legacy_id = r.svc;

    insert into public.bookings
      (facility_id, location_id, client_id, service, service_type, status,
       start_at, end_at, assigned_staff_id, assigned_staff_name,
       base_price, total_cost, details)
    select
      v_fac, v_loc, p.client_id, 'grooming', s.legacy_id, 'confirmed',
      (current_date + make_interval(hours => r.hour)) at time zone coalesce(v_tz, 'UTC'),
      (current_date + make_interval(hours => r.hour, mins => s.duration_min))
        at time zone coalesce(v_tz, 'UTC'),
      case r.groomer when 'jess' then v_jess when 'amy' then v_amy else v_marcus end,
      case r.groomer when 'jess' then 'Jessica Martinez'
                     when 'amy'  then 'Amy Chen'
                     else 'Marcus Thompson' end,
      r.price, r.price,
      jsonb_build_object('seed', 'grooming-demo-day')
    from public.pets p
    cross join public.grooming_services s
    where p.ref = r.pet_ref and s.id = v_svc
    returning id into v_bk;

    insert into public.booking_pets (booking_id, pet_id)
    select v_bk, id from public.pets where ref = r.pet_ref;

    insert into public.grooming_appointments
      (booking_id, facility_id, service_id, service_name, size_label,
       service_price, service_duration_min, station_id)
    select v_bk, v_fac, s.id, s.name, r.size_label, r.price, s.duration_min,
           case r.target when 'checked_in'  then v_tub1
                         when 'in_progress' then v_tbl1
                         else null end
      from public.grooming_services s where s.id = v_svc;

    -- A couple of tickets carry add-ons, so the trigger's ready-ETA has
    -- something beyond the base duration to add up.
    if r.pet_ref in (4, 1) then
      insert into public.grooming_appointment_add_ons
        (booking_id, facility_id, add_on_id, name, price, duration_min, auto_attached)
      select v_bk, v_fac, a.id, a.name, a.price, a.duration_min, false
        from public.grooming_add_ons a
       where a.facility_id = v_fac
         and a.legacy_id = case when r.pet_ref = 4 then 'ao-03' else 'ao-01' end;
    end if;

    -- The transition. Sequential, so a `ready` ticket passes through check-in
    -- and gets a real arrival time rather than skipping the trigger's guard.
    if r.target in ('checked_in', 'in_progress', 'ready') then
      update public.bookings set status = 'checked_in' where id = v_bk;
    end if;
    if r.target in ('in_progress', 'ready') then
      update public.bookings set status = 'in_progress' where id = v_bk;
    end if;
    if r.target = 'ready' then
      update public.bookings set status = 'ready' where id = v_bk;
    end if;
  end loop;
end $$;
