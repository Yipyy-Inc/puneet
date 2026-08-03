-- ============================================================================
-- The customer portal's shop catalogue, and the one column it needs.
--
-- ── WHY `popularity_rank` AND NOT `is_popular` ────────────────────────────
--
-- `prepaid_packages.is_popular` already exists; the grooming screen edits it
-- as a switch. The portal shop needs more than a boolean: it sorts by rank and
-- badges rank 1 as "Most Popular" and rank 2 as "Best Value". A boolean cannot
-- say "second".
--
-- So `popularity_rank` is added, nullable, and `is_popular` is left alone. That
-- IS two fields for one idea, and it is recorded here rather than resolved,
-- because collapsing them means deciding whether the grooming screen's switch
-- should become a rank picker — a product question, not a schema one. The seed
-- keeps them consistent (`is_popular` = rank 1) so nothing disagrees today.
--
-- ── THE PORTAL'S SIX PACKAGES ─────────────────────────────────────────────
--
-- Ported from `servicePackages` in src/data/services-pricing.ts. This is a
-- CONFIGURATION seed like the grooming catalogue: what the facility sells, not
-- what anybody bought. `purchase_count` stays derived, so all six show zero
-- sales, which is true — the fixture's counts (156, 89, 67, 34, 45, 22) are not
-- carried, exactly as the grooming catalogue's were not.
--
-- `price_per_session` is the service's base price from the same fixture, and
-- the arithmetic was CHECKED before writing this rather than trusted. All six
-- reconcile against `prepaid_package_pricing` to the penny and the tenth of a
-- percent:
--
--   pkg-001  10 x 35              = 350 regular, 299 paid ->  51 saved, 14.6%
--   pkg-002  20 x 35              = 700 regular, 549 paid -> 151 saved, 21.6%
--   pkg-003  2 x 45  + 1 x 40     = 130 regular, 115 paid ->  15 saved, 11.5%
--   pkg-004  7 x 75  + 1 x 65     = 590 regular, 499 paid ->  91 saved, 15.4%
--   pkg-005  4 x 40               = 160 regular, 140 paid ->  20 saved, 12.5%
--   pkg-006  1 x 250 + 2 x 85     = 420 regular, 375 paid ->  45 saved, 10.7%
--
-- ── THE SERVICE IDS ARE A KNOWN DUPLICATION, CARRIED DELIBERATELY ─────────
--
-- These lines use `srv-*` ids. The grooming catalogue's lines use
-- `groom-pkg-*`. They overlap: `srv-005` is "Bath & Brush" at 40 and
-- `groom-pkg-001` is "Basic Bath" at 35 — plausibly the same service under two
-- names at two prices, in two catalogues, only one of which is in Postgres.
--
-- That duplication is NOT resolved here, and the reason matters: deciding those
-- two rows are the same service is a product decision about what a facility
-- sells, and merging them silently would reprice one of them. Carrying the ids
-- as they are keeps each loop internally consistent — a portal pass is bought
-- and spent in `srv-*`, a counter pass in `groom-pkg-*` — which is exactly the
-- behaviour today, now with real storage under it.
--
-- The consequence, stated plainly: a grooming pass bought in the portal is
-- still not spendable at the grooming counter. That was already true; this
-- migration does not fix it and does not pretend to. See the debt map.
--
-- Idempotent on `legacy_id like 'pkg-%'`.
-- ============================================================================

alter table public.prepaid_packages
  add column if not exists popularity_rank integer;

comment on column public.prepaid_packages.popularity_rank is
  'Portal shop ordering; 1 badges as "Most Popular", 2 as "Best Value". '
  'Overlaps is_popular, which the grooming screen edits as a switch — see the '
  'migration header.';

do $$
declare
  v_fac uuid;
  r     record;
  v_pkg uuid;
begin
  select id into v_fac from public.facilities where legacy_id = '11';
  if v_fac is null then
    raise notice 'No demo facility (legacy_id 11) - nothing seeded.';
    return;
  end if;

  if exists (select 1 from public.prepaid_packages
              where facility_id = v_fac and legacy_id like 'pkg-%') then
    raise notice 'Portal packages already seeded.';
    return;
  end if;

  for r in
    select * from (values
      ('pkg-001', 'Daycare 10-Pack',
       '10 full days of daycare at a discounted rate', 299.00, 180, 1),
      ('pkg-002', 'Daycare 20-Pack',
       '20 full days of daycare - best value!', 549.00, 365, 2),
      ('pkg-003', 'Weekend Getaway',
       '2 nights boarding + 1 bath & brush', 115.00, 90, 3),
      ('pkg-004', 'Vacation Package',
       '7 nights luxury boarding + full groom on pickup day', 499.00, 90, 4),
      ('pkg-005', 'Grooming Maintenance',
       '4 bath & brush sessions', 140.00, 120, null),
      ('pkg-006', 'Training Bootcamp',
       'Basic obedience course + 2 private follow-up sessions', 375.00, 180, null)
    ) as t(legacy_id, name, description, price, days, rank)
  loop
    insert into public.prepaid_packages
      (facility_id, legacy_id, name, description, package_price,
       validity_days, status, is_popular, popularity_rank)
    values (v_fac, r.legacy_id, r.name, r.description, r.price,
            r.days, 'active', coalesce(r.rank, 99) = 1, r.rank)
    returning id into v_pkg;

    -- One line per service, each naming the counter that can spend it. pkg-003
    -- and pkg-004 are the reason `module` is on the line and not the package.
    if r.legacy_id = 'pkg-001' then
      insert into public.prepaid_package_lines
        (package_id, service_id, service_name, quantity, price_per_session, module)
      values (v_pkg, 'srv-003', 'Full Day Daycare', 10, 35.00, 'daycare');
    elsif r.legacy_id = 'pkg-002' then
      insert into public.prepaid_package_lines
        (package_id, service_id, service_name, quantity, price_per_session, module)
      values (v_pkg, 'srv-003', 'Full Day Daycare', 20, 35.00, 'daycare');
    elsif r.legacy_id = 'pkg-003' then
      insert into public.prepaid_package_lines
        (package_id, service_id, service_name, quantity, price_per_session, module)
      values (v_pkg, 'srv-001', 'Standard Boarding', 2, 45.00, 'boarding'),
             (v_pkg, 'srv-005', 'Bath & Brush',      1, 40.00, 'grooming');
    elsif r.legacy_id = 'pkg-004' then
      insert into public.prepaid_package_lines
        (package_id, service_id, service_name, quantity, price_per_session, module)
      values (v_pkg, 'srv-002', 'Luxury Suite Boarding', 7, 75.00, 'boarding'),
             (v_pkg, 'srv-006', 'Full Groom',            1, 65.00, 'grooming');
    elsif r.legacy_id = 'pkg-005' then
      insert into public.prepaid_package_lines
        (package_id, service_id, service_name, quantity, price_per_session, module)
      values (v_pkg, 'srv-005', 'Bath & Brush', 4, 40.00, 'grooming');
    else
      insert into public.prepaid_package_lines
        (package_id, service_id, service_name, quantity, price_per_session, module)
      values (v_pkg, 'srv-007', 'Basic Obedience Training', 1, 250.00, 'training'),
             (v_pkg, 'srv-008', 'Private Training Session', 2,  85.00, 'training');
    end if;
  end loop;
end $$;

-- The policies the fixture carried on two of the six. The rest fall back to the
-- table defaults, which is what `policy: undefined` meant.
update public.prepaid_packages set
  allow_refund_unused = true,
  refund_per_unused_pass = 25,
  allow_store_credit_on_cancel = true,
  allow_transfer = true,
  allow_extension = true,
  max_extension_days = 60,
  extension_fee = 0,
  policy_notes = 'Refunds on unused passes issued at $25/pass (below the '
    || 'per-pass price). Transfers allowed once per package to a household '
    || 'member.'
where legacy_id = 'pkg-001'
  and facility_id = (select id from public.facilities where legacy_id = '11');

update public.prepaid_packages set
  allow_refund_unused = false,
  refund_per_unused_pass = null,
  allow_store_credit_on_cancel = true,
  allow_transfer = false,
  allow_extension = true,
  max_extension_days = 30,
  extension_fee = 15,
  policy_notes = 'Validity extensions available once for up to 30 days ($15 '
    || 'fee). Unused passes convert to store credit on cancellation.'
where legacy_id = 'pkg-005'
  and facility_id = (select id from public.facilities where legacy_id = '11');
