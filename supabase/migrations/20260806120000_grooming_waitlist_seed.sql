-- ============================================================================
-- Four people waiting, so the queue is not an empty box.
--
-- ── THIS IS TRANSACTIONAL SEED DATA, THE SAME KIND AS THE DEMO DAY ─────────
--
-- Same caveat as 20260805230000: the catalogue and station seeds recorded what
-- a facility HAS; this records requests nobody made. It is defensible only
-- because the whole dataset is demo-derived, and because the check-in board's
-- third zone and the calendar's per-day counts render as "nobody is waiting"
-- otherwise — which reads as a working screen showing a true fact, not as
-- missing data.
--
-- Every row is MARKED. Removing them is one delete:
--
--   delete from public.grooming_waitlist_entries
--    where legacy_id like 'demo-wl-%';
--
-- ── REAL CLIENTS, REAL PETS, REAL SERVICES ────────────────────────────────
--
-- The mock fixture invented seven households (Aman Patel, Marie Tremblay …)
-- who exist in no other table. Those are not carried over. Each entry below
-- points at a client and pet that already exist, and the owner name/phone are
-- snapshotted FROM those records rather than typed here — so the queue cannot
-- show a phone number that disagrees with the client file it came from.
--
-- Pets 13, 52, 53 and 22 are used because their owners have a recorded phone.
-- The panel's primary action is a `tel:` link; an entry with no number is a
-- callback request nobody can action.
--
-- ── ALL FOUR DATE KINDS ARE REPRESENTED, ON PURPOSE ───────────────────────
--
--   asap          Rex     — the common case, and the one that shows today
--   specific-date Canela  — today, with an exact 11:00 preference
--   day-of-week   Taco    — Tue/Thu only, with an expiry
--   range         Max     — a week-long window with one day excluded
--
-- Not decoration: the anchor date is computed by trigger and differs per kind
-- (20260806100000, Decision 3), so a seed that only exercised `asap` would
-- leave three of the four branches unproven against real data.
-- ============================================================================

do $$
declare
  v_fac   uuid;
  v_tz    text;
  v_today date;
  v_jess  uuid;
  v_amy   uuid;
begin
  select id, timezone into v_fac, v_tz
    from public.facilities where legacy_id = '11';
  if v_fac is null then
    raise notice 'No demo facility (legacy_id 11) — nothing seeded.';
    return;
  end if;

  if exists (select 1 from public.grooming_waitlist_entries
              where facility_id = v_fac and legacy_id like 'demo-wl-%') then
    raise notice 'Demo waitlist already seeded.';
    return;
  end if;

  v_today := (now() at time zone coalesce(v_tz, 'UTC'))::date;
  select id into v_jess from public.staff where legacy_id = 'fs-groom-08';
  select id into v_amy  from public.staff where legacy_id = 'fs-groom-09';

  -- 1. ASAP, afternoons, wants Jessica specifically.
  insert into public.grooming_waitlist_entries
    (facility_id, legacy_id, client_id, pet_id, pet_name, pet_breed,
     owner_name, owner_phone, owner_email, service_id, service_name,
     expected_date_kind, expected_time_kind, expected_period,
     preferred_staff_ids, source, comment, added_at)
  select
    v_fac, 'demo-wl-01', p.client_id, p.id, p.name, coalesce(p.breed, ''),
    c.name, coalesce(c.phone, ''), c.email, s.id, s.name,
    'asap', 'period', 'afternoon',
    case when v_jess is null then '{}'::uuid[] else array[v_jess] end,
    'calendar-plus',
    'Going away next week — will take anything that opens up.',
    now() - interval '6 hours'
  from public.pets p
  join public.clients c on c.id = p.client_id
  cross join public.grooming_services s
  where p.ref = 13 and s.facility_id = v_fac and s.legacy_id = 'groom-pkg-002';

  -- 2. A named date — today — and an exact time.
  insert into public.grooming_waitlist_entries
    (facility_id, legacy_id, client_id, pet_id, pet_name, pet_breed,
     owner_name, owner_phone, owner_email, service_id, service_name,
     expected_date_kind, expected_date, expected_time_kind, expected_time,
     source, comment, added_at)
  select
    v_fac, 'demo-wl-02', p.client_id, p.id, p.name, coalesce(p.breed, ''),
    c.name, coalesce(c.phone, ''), c.email, s.id, s.name,
    'specific-date', v_today, 'exact-time', '11:00',
    'manual',
    'Can only make the 11am slot — school run either side of it.',
    now() - interval '2 days'
  from public.pets p
  join public.clients c on c.id = p.client_id
  cross join public.grooming_services s
  where p.ref = 52 and s.facility_id = v_fac and s.legacy_id = 'groom-pkg-001';

  -- 3. Tuesdays and Thursdays only, and the request lapses in a month.
  insert into public.grooming_waitlist_entries
    (facility_id, legacy_id, client_id, pet_id, pet_name, pet_breed,
     owner_name, owner_phone, owner_email, service_id, service_name,
     expected_date_kind, expected_days_of_week, valid_until,
     preferred_staff_ids, source, comment, added_at)
  select
    v_fac, 'demo-wl-03', p.client_id, p.id, p.name, coalesce(p.breed, ''),
    c.name, coalesce(c.phone, ''), c.email, s.id, s.name,
    'day-of-week', array[2, 4]::smallint[], v_today + 30,
    case when v_amy is null then '{}'::uuid[] else array[v_amy] end,
    'moved-from-appointment',
    'Rescheduling last Friday''s booking — only Tue/Thu work now.',
    now() - interval '3 days'
  from public.pets p
  join public.clients c on c.id = p.client_id
  cross join public.grooming_services s
  where p.ref = 53 and s.facility_id = v_fac and s.legacy_id = 'groom-pkg-004';

  -- 4. A window, with one day inside it ruled out.
  insert into public.grooming_waitlist_entries
    (facility_id, legacy_id, client_id, pet_id, pet_name, pet_breed,
     owner_name, owner_phone, owner_email, service_id, service_name,
     expected_date_kind, expected_start_date, expected_end_date,
     excluded_dates, expected_time_kind, expected_period,
     source, comment, added_at)
  select
    v_fac, 'demo-wl-04', p.client_id, p.id, p.name, coalesce(p.breed, ''),
    c.name, coalesce(c.phone, ''), c.email, s.id, s.name,
    'range', v_today + 2, v_today + 9,
    array[v_today + 3], 'period', 'morning',
    'manual',
    'Any morning that week except the Wednesday.',
    now() - interval '1 day'
  from public.pets p
  join public.clients c on c.id = p.client_id
  cross join public.grooming_services s
  where p.ref = 22 and s.facility_id = v_fac and s.legacy_id = 'groom-pkg-006';
end $$;
