-- ============================================================================
-- Seeds the DEMO facility's grooming menu (legacy_id '11') from the six mock
-- services and eight add-ons the screens have always shown.
--
-- WHY A SEED AND NOT AN EMPTY MENU. Every other migrated domain has real rows
-- (14 clients, 20 pets, 87 bookings), and the grooming screens have shown these
-- six services since the prototype. Cutting them over to Postgres and leaving
-- the table empty would look like the migration broke the page — an empty
-- state is honest for a NEW facility and misleading for this one.
--
-- IDEMPOTENT AND SCOPED. `on conflict … do nothing` throughout, and the whole
-- block returns early when there is no demo facility, so this is safe on a
-- fresh project and safe to re-run.
--
-- THE LEGACY IDS ARE PRESERVED EXACTLY ("groom-pkg-001", "ao-01"). The booking
-- form, the pricing-rule builder and the appointment fixtures all key on them,
-- and re-minting ids here would silently orphan every one of those references.
--
-- The prices are copied from src/data/grooming.ts as they stood. They are the
-- facility's to change from here — this is a starting menu, not a fixture the
-- app keeps reading.
-- ============================================================================

do $$
declare v_fac uuid;
begin
  select id into v_fac from public.facilities where legacy_id = '11';
  if v_fac is null then
    raise notice 'No demo facility (legacy_id 11) — nothing seeded.';
    return;
  end if;

  insert into public.grooming_services
    (facility_id, legacy_id, name, description, base_price, duration_min, includes, display_order)
  values
  (v_fac, 'groom-pkg-001', 'Basic Bath', 'Essential bath and dry service perfect for regular maintenance', 35, 60, array['Shampoo & conditioner','Towel and blow dry','Brush out','Nail trim','Ear cleaning'], 0),
  (v_fac, 'groom-pkg-002', 'Full Groom', 'Complete grooming experience with haircut and styling', 65, 120, array['Bath with premium products','Haircut and styling','Nail trim & filing','Ear cleaning','Teeth brushing','Cologne spritz','Bandana or bow'], 1),
  (v_fac, 'groom-pkg-003', 'Spa Day Deluxe', 'Ultimate pampering experience for your beloved pet', 95, 180, array['Luxury bath with aromatherapy','Professional haircut and styling','Nail trim, filing & paw pad treatment','Deep ear cleaning','Teeth brushing & breath freshener','Blueberry facial','Paw balm treatment','Cologne & accessories','Photo session'], 2),
  (v_fac, 'groom-pkg-004', 'Quick Tidy Up', 'Fast touch-up between full grooms', 25, 30, array['Sanitary trim','Face & paw trim','Nail trim','Quick brush'], 3),
  (v_fac, 'groom-pkg-005', 'Puppy''s First Groom', 'Gentle introduction to grooming for puppies under 6 months', 40, 45, array['Gentle bath','Light trimming','Nail clip','Ear cleaning','Positive reinforcement','Treats included'], 4),
  (v_fac, 'groom-pkg-006', 'De-Shedding Treatment', 'Specialized treatment to reduce shedding for double-coated breeds', 55, 90, array['De-shedding shampoo & conditioner','Undercoat removal','High-velocity blow dry','Thorough brush out','Nail trim','Ear cleaning'], 5)
  on conflict (facility_id, legacy_id) do nothing;

  -- Joined on legacy_id rather than hardcoding uuids, so the prices attach to
  -- whichever rows the insert above actually produced (or already had).
  insert into public.grooming_service_size_prices (service_id, facility_id, size_label, price)
  select s.id, v_fac, p.size_label, p.price
    from (values
      ('groom-pkg-001','small',30),('groom-pkg-001','medium',35),('groom-pkg-001','large',45),('groom-pkg-001','giant',55),
      ('groom-pkg-002','small',55),('groom-pkg-002','medium',65),('groom-pkg-002','large',85),('groom-pkg-002','giant',105),
      ('groom-pkg-003','small',85),('groom-pkg-003','medium',95),('groom-pkg-003','large',120),('groom-pkg-003','giant',150),
      ('groom-pkg-004','small',20),('groom-pkg-004','medium',25),('groom-pkg-004','large',30),('groom-pkg-004','giant',40),
      ('groom-pkg-005','small',35),('groom-pkg-005','medium',40),('groom-pkg-005','large',45),('groom-pkg-005','giant',50),
      ('groom-pkg-006','small',45),('groom-pkg-006','medium',55),('groom-pkg-006','large',70),('groom-pkg-006','giant',85)
    ) as p(legacy_id, size_label, price)
    join public.grooming_services s
      on s.facility_id = v_fac and s.legacy_id = p.legacy_id
  on conflict (service_id, size_label) do nothing;

  -- The eight add-ons from src/data/grooming-add-ons.ts, ids preserved. Note
  -- these are the CANONICAL grooming add-ons (groomingAddOnSchema), not the
  -- cross-service `ServiceAddOn` registry — see the debt map, 2026-08-05.
  insert into public.grooming_add_ons
    (facility_id, legacy_id, name, price, duration_min, display_order)
  values
    (v_fac, 'ao-01', 'Teeth Brushing', 15, 10, 0),
    (v_fac, 'ao-02', 'Nail Grinding', 12, 10, 1),
    (v_fac, 'ao-03', 'Blueberry Facial', 20, 15, 2),
    (v_fac, 'ao-04', 'De-shedding Treatment', 25, 20, 3),
    (v_fac, 'ao-05', 'Paw Balm Treatment', 10, 10, 4),
    (v_fac, 'ao-06', 'Anal Gland Expression', 18, 10, 5),
    (v_fac, 'ao-07', 'Flea Treatment', 22, 15, 6),
    (v_fac, 'ao-08', 'Bandana or Bow', 5, 0, 7)
  on conflict (facility_id, legacy_id) do nothing;

  insert into public.grooming_config (facility_id) values (v_fac)
  on conflict (facility_id) do nothing;
end $$;
