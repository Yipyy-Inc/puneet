-- ============================================================================
-- The facility's prepaid-package menu.
--
-- CONFIGURATION, not transactions — the same defensible kind of seed as the
-- grooming catalogue and the station estate, and unlike the demo day. This
-- records what the facility SELLS. Nobody has bought any of it: `purchase_count`
-- is a count of `customer_packages` rows and there are none, so the screen shows
-- five packages with zero sales, which is true.
--
-- ── THE DERIVED FIGURES ARE NOT SEEDED, BECAUSE THEY CANNOT BE ────────────
--
-- The fixture carries `regularPrice`, `savings`, `savingsPercentage` and
-- `purchaseCount` on every package. None of them are columns (20260806320000,
-- Decision 1), so this seeds only the lines and the package price and lets the
-- view do the arithmetic.
--
-- CHECKED AFTER SEEDING, against the fixture's own stored numbers. All five
-- agree to the penny and the tenth of a percent:
--
--   gpp-001  5 × 65        = 325 regular, 275 paid → 50 saved, 15.4%
--   gpp-002  10 × 35       = 350 regular, 280 paid → 70 saved, 20.0%
--   gpp-003  6 × 65 + 2×35 = 460 regular, 379 paid → 81 saved, 17.6%
--   gpp-004  3 × 65        = 195 regular, 175 paid → 20 saved, 10.3%
--   gpp-005  2 × 65        = 130 regular, 119 paid → 11 saved,  8.5%
--
-- Stated because the expectation going in was that at least one would drift —
-- five packages carrying four hand-maintained derivations each is twenty
-- chances to fumble one. Whoever wrote the fixture did the arithmetic
-- correctly, and the argument for deriving these was never that the current
-- numbers are wrong. It is that nothing was keeping them right, and the screen
-- edits the inputs.
--
-- Idempotent: keyed on `legacy_id`, which carries the `gpp-*` ids ten
-- components already use.
-- ============================================================================

do $$
declare
  v_fac uuid;
  r record;
  v_pkg uuid;
begin
  select id into v_fac from public.facilities where legacy_id = '11';
  if v_fac is null then
    raise notice 'No demo facility (legacy_id 11) — nothing seeded.';
    return;
  end if;

  if exists (select 1 from public.prepaid_packages
              where facility_id = v_fac and legacy_id like 'gpp-%') then
    raise notice 'Prepaid packages already seeded.';
    return;
  end if;

  for r in
    select * from (values
      ('gpp-001', '5x Full Groom Pack',
       'Five complete grooming sessions to keep your dog looking sharp all season. Save 15% versus à-la-carte pricing.',
       275.00, 180, 'active', true),
      ('gpp-002', '10x Bath & Brush Pack',
       'Ten bath-and-brush visits for the between-groom upkeep.',
       280.00, 365, 'active', true),
      ('gpp-003', 'Puppy First-Year Plan',
       'Six full grooms and two baths across a puppy''s first year.',
       379.00, 365, 'active', false),
      ('gpp-004', 'Spa Day Trio',
       'Three full grooms to be used within the quarter.',
       175.00, 90, 'active', false),
      ('gpp-005', 'Holiday Sparkle Pack',
       'Two full grooms for the party season.',
       119.00, 60, 'seasonal', false)
    ) as t(legacy_id, name, description, price, days, status, popular)
  loop
    insert into public.prepaid_packages
      (facility_id, legacy_id, name, description, package_price,
       validity_days, status, is_popular)
    values (v_fac, r.legacy_id, r.name, r.description, r.price,
            r.days, r.status, r.popular)
    returning id into v_pkg;

    -- The lines. `price_per_session` is the service's price AS OF NOW,
    -- snapshotted deliberately: the à-la-carte comparison a customer was shown
    -- must not move when the facility reprices.
    if r.legacy_id = 'gpp-001' then
      insert into public.prepaid_package_lines
        (package_id, service_id, service_name, quantity, price_per_session)
      values (v_pkg, 'groom-pkg-002', 'Full Groom', 5, 65.00);
    elsif r.legacy_id = 'gpp-002' then
      insert into public.prepaid_package_lines
        (package_id, service_id, service_name, quantity, price_per_session)
      values (v_pkg, 'groom-pkg-001', 'Basic Bath', 10, 35.00);
    elsif r.legacy_id = 'gpp-003' then
      -- The two-service bundle that caused the rebuild.
      insert into public.prepaid_package_lines
        (package_id, service_id, service_name, quantity, price_per_session)
      values (v_pkg, 'groom-pkg-002', 'Full Groom', 6, 65.00),
             (v_pkg, 'groom-pkg-001', 'Basic Bath', 2, 35.00);
    elsif r.legacy_id = 'gpp-004' then
      insert into public.prepaid_package_lines
        (package_id, service_id, service_name, quantity, price_per_session)
      values (v_pkg, 'groom-pkg-002', 'Full Groom', 3, 65.00);
    else
      insert into public.prepaid_package_lines
        (package_id, service_id, service_name, quantity, price_per_session)
      values (v_pkg, 'groom-pkg-002', 'Full Groom', 2, 65.00);
    end if;
  end loop;
end $$;
