-- ============================================================================
-- One customer package, so the redemption path has something to redeem.
--
-- ── THE FIXTURE HAD FOUR. THREE OF THEM CANNOT BE PORTED ───────────────────
--
-- `src/data/customer-packages.ts` carries cp-001 … cp-004. Checked each
-- against the real clients table before writing a line of this file:
--
--   cp-001  customerId 1   — no such client. Clients at facility 11 are refs
--   cp-002  customerId 2     15…34. Refs 1, 2 and 3 are not "old" clients,
--   cp-003  customerId 3     they are clients that were never created.
--   cp-004  customerId 15  — Alice Johnson, real, and her pet ref 1 IS Buddy.
--
-- cp-003's redemptions name pet 3 as "Luna"; pet 3 at this facility is Max,
-- and belongs to client 16. So porting those three would mean inventing three
-- households to hang purchases on — the same call already made for the
-- grooming waitlist, and made the same way here: they are not seeded.
--
-- ── AND cp-004 IS NOT PORTED VERBATIM EITHER ──────────────────────────────
--
-- It claims package `gpp-002` under the name "3x Bath & Brush Pack" with 3
-- passes. `gpp-002` is the 10x Bath & Brush Pack, ten passes of Basic Bath.
-- The fixture's name and count belong to no package that exists.
--
-- Keeping "3 passes" would preserve a number while discarding the thing it was
-- a number OF. So the snapshot is taken FROM THE CATALOGUE ROW: whatever
-- gpp-002 is named and priced right now is what Alice is recorded as having
-- bought, and the pools are copies of its lines. Nothing here is typed twice —
-- if the arithmetic is wrong, it is wrong in the catalogue, where it can be
-- seen.
--
-- The fixture also stamps cp-004 `status: "active"` beside `expiresAt:
-- 2026-07-22`, which is in the past. Nothing was lying when it was written;
-- time moved and a stored status cannot. `customer_package_status` derives it,
-- so this one cannot drift the same way.
--
-- ── THIS IS TRANSACTIONAL, UNLIKE THE CATALOGUE SEED ──────────────────────
--
-- A purchase means money changed hands, and one redemption means a bath
-- happened. Stated rather than blurred: this is a demo fact, not a
-- configuration fact, and it is here because a pass ledger with no passes in it
-- cannot demonstrate that it works. It is one row, for a real client, of a
-- package that is really on the menu.
--
-- Idempotent on `legacy_id = 'cp-004'`.
-- ============================================================================

do $$
declare
  v_fac      uuid;
  v_client   uuid;
  v_pet      uuid;
  v_pkg      record;
  v_cp       uuid;
  v_bought   timestamptz;
  v_first    record;
begin
  select id into v_fac from public.facilities where legacy_id = '11';
  if v_fac is null then
    raise notice 'No demo facility (legacy_id 11) — nothing seeded.';
    return;
  end if;

  if exists (select 1 from public.customer_packages
              where facility_id = v_fac and legacy_id = 'cp-004') then
    raise notice 'Customer package already seeded.';
    return;
  end if;

  select id into v_client
    from public.clients where facility_id = v_fac and ref = 15;
  select * into v_pkg
    from public.prepaid_packages
   where facility_id = v_fac and legacy_id = 'gpp-002';

  if v_client is null or v_pkg is null then
    raise notice 'Client 15 or package gpp-002 missing — nothing seeded.';
    return;
  end if;

  -- 60 days ago, so the package is mid-life rather than fresh: the expiry
  -- warning states are reachable without the row being expired on arrival.
  v_bought := now() - interval '60 days';

  insert into public.customer_packages
    (facility_id, legacy_id, client_id, package_id,
     package_name, price_paid, purchased_at, expires_at)
  values
    (v_fac, 'cp-004', v_client, v_pkg.id,
     v_pkg.name, v_pkg.package_price, v_bought,
     v_bought + make_interval(days => v_pkg.validity_days))
  returning id into v_cp;

  -- The pools are the catalogue's lines, copied at purchase time. Copied, not
  -- referenced: repricing or re-bundling gpp-002 tomorrow must not change how
  -- many baths Alice paid for.
  insert into public.customer_package_lines
    (customer_package_id, service_id, service_name, passes_total)
  select v_cp, l.service_id, l.service_name, l.quantity
    from public.prepaid_package_lines l
   where l.package_id = v_pkg.id;

  -- One redemption, 30 days ago, against her first pool. Buddy is pet ref 1
  -- and genuinely hers — checked, not assumed.
  select id into v_pet from public.pets
   where facility_id = v_fac and client_id = v_client and ref = 1;

  select * into v_first from public.customer_package_lines
   where customer_package_id = v_cp order by service_id limit 1;

  if v_pet is not null and v_first is not null then
    insert into public.package_pass_entries
      (facility_id, customer_package_id, service_id, passes, reason,
       pet_id, pet_name, service_label, author_name, created_at)
    values
      (v_fac, v_cp, v_first.service_id, -1, 'redeemed',
       v_pet, 'Buddy', v_first.service_name, 'Front desk',
       now() - interval '30 days');
  end if;
end $$;
