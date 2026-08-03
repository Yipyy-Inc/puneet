-- ============================================================================
-- Seeds the demo facility's grooming stations (legacy_id '11') from
-- src/data/rooms.ts. Same reasoning as the catalogue seed: every other migrated
-- domain has real rows, and the stations screen has shown these eight since the
-- prototype.
--
-- ── ONE DELIBERATE DEPARTURE FROM THE MOCK ─────────────────────────────────
--
-- `gs-t-01` and `gs-tub-01` are `status: "in-use"` in the fixture, with
-- currentPetName / currentStylistName / estimatedCompletionAt filled in. Those
-- occupancy fields have no columns here on purpose (Decision 2 of
-- 20260805180000: they are facts about the APPOINTMENT, and a second copy is a
-- second thing that can go stale).
--
-- Seeding the STATUS as "in-use" without them would produce exactly the lie
-- that decision exists to prevent: a table claiming to be occupied, by nobody,
-- since never — and no appointment anywhere that would ever clear it. So both
-- seed as `available`. They become genuinely in-use when a booking is assigned
-- to them and checked in, which is the only way that state should ever arise.
--
-- The other six keep their fixture status: `needs-cleaning` and
-- `out-of-service` are the station's own state and imply no appointment, so
-- they are true as written.
--
-- Idempotent, and a no-op without the demo facility.
-- ============================================================================

do $$
declare v_fac uuid;
begin
  select id into v_fac from public.facilities where legacy_id = '11';
  if v_fac is null then
    raise notice 'No demo facility (legacy_id 11) — nothing seeded.';
    return;
  end if;

  insert into public.grooming_stations
    (facility_id, legacy_id, name, type, active, status,
     allowed_pet_sizes, max_weight_lbs, display_order)
  values
    -- 'in-use' in the mock; seeded available. See the header.
    (v_fac, 'gs-t-01',     'Table 1',       'table',        true,  'available',
     array['small','medium','large'], 70,   0),
    (v_fac, 'gs-t-02',     'Table 2',       'table',        true,  'available',
     array['small','medium'],         40,   1),
    (v_fac, 'gs-t-03',     'Table 3',       'table',        true,  'needs-cleaning',
     array['large','giant'],          null, 2),
    (v_fac, 'gs-t-04',     'Table 4',       'table',        false, 'out-of-service',
     '{}',                            null, 3),
    -- 'in-use' in the mock; seeded available. See the header.
    (v_fac, 'gs-tub-01',   'Tub 1',         'tub',          true,  'available',
     '{}',                            null, 4),
    (v_fac, 'gs-tub-02',   'Tub 2',         'tub',          true,  'available',
     array['small','medium'],         35,   5),
    (v_fac, 'gs-dryer-01', 'Cage Dryer 1',  'cage_dryer',   true,  'available',
     '{}',                            null, 6),
    (v_fac, 'gs-dryer-02', 'Stand Dryer 1', 'stand_dryer',  true,  'available',
     '{}',                            null, 7)
  on conflict (facility_id, legacy_id) do nothing;
end $$;
