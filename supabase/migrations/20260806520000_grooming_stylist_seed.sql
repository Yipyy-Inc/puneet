-- ============================================================================
-- The five grooming profiles, and the hours they work.
--
-- CONFIGURATION, like the service catalogue and the station estate: this is who
-- the facility employs to groom and what they are qualified for, not a record
-- of anything that happened.
--
-- ── EVERY PERSON HERE IS REAL, AND WAS CHECKED FIRST ──────────────────────
--
-- Unlike the customer packages, nothing had to be dropped. All five fixture
-- stylists resolve to staff rows that already exist at this facility, by name:
--
--   stylist-001  fs-groom-08  Jessica Martinez   active
--   stylist-002  fs-groom-09  Amy Chen           active
--   stylist-003  fs-groom-10  Marcus Thompson    active
--   stylist-004  fs-groom-11  Sophie Laurent     active
--   stylist-005  fs-groom-12  David Kim          INACTIVE
--
-- Resolved by `legacy_id` rather than by name, so a rename cannot silently
-- attach a profile to the wrong person.
--
-- ── WHAT IS NOT SEEDED ────────────────────────────────────────────────────
--
-- `rating` and `totalAppointments`. Neither is a column (20260806500000,
-- Decision 4): appointments are counted by a view, and a rating has no source
-- in this database at all. The fixture's 4.9 / 1250 are not carried, so five
-- groomers show no rating and a small honest appointment count.
--
-- `name`, `email`, `phone`, `photoUrl`, `hireDate`, `status` — all read from
-- `staff`. The fixture's contact details (jessica@pawsplay.com, (514)
-- 555-0201) are NOT written anywhere: `staff` already holds contact details for
-- these five people, and seeding a second set would be the exact duplication
-- the table was shaped to prevent. If the two disagree today, the staff record
-- is the one the rest of the app already uses.
--
-- David Kim's `on_leave` is seeded true, preserving the fixture's intent, even
-- though he currently reads `inactive` because his staff record says so.
-- Employment wins; the flag waits.
--
-- ── AVAILABILITY ──────────────────────────────────────────────────────────
--
-- 18 rows, exactly as the fixture had them, keyed to staff. Jessica Mon–Fri,
-- Amy Tue–Sat, Marcus Mon/Wed/Thu/Sat, Sophie Mon–Thu. David has none in the
-- fixture and gets none here — which is consistent with being away.
--
-- Idempotent: keyed on `legacy_id like 'stylist-%'`.
-- ============================================================================

do $$
declare
  v_fac uuid;
  r     record;
  v_staff uuid;
begin
  select id into v_fac from public.facilities where legacy_id = '11';
  if v_fac is null then
    raise notice 'No demo facility (legacy_id 11) - nothing seeded.';
    return;
  end if;

  if exists (select 1 from public.grooming_stylist_profiles
              where facility_id = v_fac and legacy_id like 'stylist-%') then
    raise notice 'Stylist profiles already seeded.';
    return;
  end if;

  for r in
    select * from (values
      ('stylist-001', 'fs-groom-08',
       array['Breed-specific cuts','Show grooming','De-matting','Senior pets'],
       array['Certified Master Groomer (CMG)','Pet First Aid & CPR'],
       8, 'Jessica has been grooming professionally for 8 years and specializes in breed-specific cuts and show grooming. She has a gentle touch that puts even the most nervous pets at ease.',
       false, 8, 1, array['small','medium','large'], 'premium', true, true, false),
      ('stylist-002', 'fs-groom-09',
       array['Asian fusion styles','Creative grooming','Puppies','Small breeds'],
       array['Certified Professional Groomer (CPG)','Fear Free Certified'],
       5, 'Amy is known for her creative grooming skills and patience with puppies. She specializes in Asian fusion styles and loves working with small breeds.',
       false, 6, 1, array['small','medium'], 'standard', true, true, false),
      ('stylist-003', 'fs-groom-10',
       array['Large breeds','Hand stripping','Double coats','Anxious pets'],
       array['Certified Professional Groomer (CPG)','Canine Behavior Specialist'],
       6, 'Marcus excels with large breed dogs and has specialized training in handling anxious pets. His calm demeanor and expertise make him a favorite among nervous fur parents.',
       false, 7, 1, array['medium','large','giant'], 'premium', true, true, true),
      ('stylist-004', 'fs-groom-11',
       array['Poodles','Doodles','Cats','Exotic breeds'],
       array['National Cat Groomers Institute Certified','Certified Master Groomer (CMG)'],
       10, 'Sophie is our most experienced groomer with a special talent for poodles, doodles, and cats. Her precision cuts and attention to detail are unmatched.',
       false, 10, 1, array['small','medium','large'], 'platinum', true, true, false),
      ('stylist-005', 'fs-groom-12',
       array['Speed grooming','Basic baths','Nail trimming','Walk-ins'],
       array['Certified Professional Groomer (CPG)'],
       3, 'David is efficient and great with routine grooming services. He handles our walk-in appointments and express services with ease.',
       true, 12, 1, array['small','medium'], 'standard', false, true, false)
    ) as t(legacy_id, staff_legacy, specializations, certifications,
           years_experience, bio, on_leave, max_daily, max_concurrent,
           sizes, skill, matted, anxious, aggressive)
  loop
    select id into v_staff from public.staff
     where facility_id = v_fac and legacy_id = r.staff_legacy;

    if v_staff is null then
      raise notice 'No staff row for % - profile % skipped.',
        r.staff_legacy, r.legacy_id;
      continue;
    end if;

    insert into public.grooming_stylist_profiles
      (facility_id, legacy_id, staff_id, specializations, certifications,
       years_experience, bio, on_leave, max_daily_appointments,
       max_concurrent_appointments, preferred_pet_sizes, skill_level,
       can_handle_matted, can_handle_anxious, can_handle_aggressive)
    values
      (v_fac, r.legacy_id, v_staff, r.specializations, r.certifications,
       r.years_experience, r.bio, r.on_leave, r.max_daily,
       r.max_concurrent, r.sizes, r.skill,
       r.matted, r.anxious, r.aggressive);
  end loop;
end $$;

-- Amy's notification overrides (spec Table 83): no SMS, summary an hour
-- earlier, and no 30-minute pings. The only stylist in the fixture with any,
-- and absence still means "facility defaults".
update public.grooming_stylist_profiles set notification_prefs = jsonb_build_object(
  'types', jsonb_build_object(
    'new_booking', true, 'changes', true, 'cancellations', true,
    'tomorrow_summary', true, 'day_of', true, 'thirty_min', false),
  'channels', jsonb_build_object(
    'sms', false, 'email', true, 'in_app', true, 'push', true),
  'summaryTime', '17:00')
where legacy_id = 'stylist-002'
  and facility_id = (select id from public.facilities where legacy_id = '11');

-- ── Working hours ───────────────────────────────────────────────────────────

do $$
declare
  v_fac uuid;
  r     record;
  v_staff uuid;
begin
  select id into v_fac from public.facilities where legacy_id = '11';
  if v_fac is null then return; end if;

  if exists (select 1 from public.grooming_stylist_availability
              where facility_id = v_fac) then
    raise notice 'Stylist availability already seeded.';
    return;
  end if;

  for r in
    select * from (values
      ('stylist-001', 1, '08:00'::time, '16:00'::time),
      ('stylist-001', 2, '08:00'::time, '16:00'::time),
      ('stylist-001', 3, '08:00'::time, '16:00'::time),
      ('stylist-001', 4, '08:00'::time, '16:00'::time),
      ('stylist-001', 5, '08:00'::time, '14:00'::time),
      ('stylist-002', 2, '09:00'::time, '17:00'::time),
      ('stylist-002', 3, '09:00'::time, '17:00'::time),
      ('stylist-002', 4, '09:00'::time, '17:00'::time),
      ('stylist-002', 5, '09:00'::time, '17:00'::time),
      ('stylist-002', 6, '08:00'::time, '16:00'::time),
      ('stylist-003', 1, '10:00'::time, '18:00'::time),
      ('stylist-003', 3, '10:00'::time, '18:00'::time),
      ('stylist-003', 4, '10:00'::time, '18:00'::time),
      ('stylist-003', 6, '08:00'::time, '16:00'::time),
      ('stylist-004', 1, '08:00'::time, '16:00'::time),
      ('stylist-004', 2, '08:00'::time, '16:00'::time),
      ('stylist-004', 3, '08:00'::time, '16:00'::time),
      ('stylist-004', 4, '08:00'::time, '16:00'::time)
    ) as t(stylist_legacy, day_of_week, start_time, end_time)
  loop
    select p.staff_id into v_staff
      from public.grooming_stylist_profiles p
     where p.facility_id = v_fac and p.legacy_id = r.stylist_legacy;
    if v_staff is null then continue; end if;

    insert into public.grooming_stylist_availability
      (facility_id, staff_id, day_of_week, start_time, end_time, is_available)
    values (v_fac, v_staff, r.day_of_week, r.start_time, r.end_time, true);
  end loop;
end $$;
