-- ============================================================================
-- Prepaid packages — derived counts, the signed ledger, and expiry
-- (20260806280000).
--
--   psql "$(supabase status -o json | jq -r .DB_URL)" \
--     -f supabase/tests/prepaid-packages.sql
--
-- One transaction, rolled back. Fixture emails are @example.invalid.
--
-- ── WHAT THIS FILE IS REALLY ABOUT ─────────────────────────────────────────
--
-- 1. THE COUNT IS DERIVED (K1/K2). The mock stored it THREE times --
--    pkg.passesUsed, pkg.passes[0].usedPasses and pkg.redemptions.length --
--    all updated by hand inside `redeemPackagePass`. Any path that forgot one
--    left a customer with passes they never bought, or lost ones they did.
--    There is no counter column here; K2 proves the number moves anyway.
--
-- 2. THE LAST PASS CANNOT BE SPENT TWICE (K3). The availability check and the
--    write are one statement with the purchase row locked, so a second till
--    waits and finds the pass gone rather than acting on a stale read.
--
-- 3. A REVERSAL IS AN ENTRY, NOT AN EDIT (K4/K5). A booking cancelled after its
--    pass was redeemed gives the pass back by appending +1. The ledger takes no
--    updates and no deletes, and a "redeemed" entry cannot add passes.
--
-- 4. EXPIRY IS A FUNCTION OF THE CLOCK (K6). A stored status would be wrong the
--    moment a package lapsed unobserved; K6 has five unused passes and is still
--    refused.
-- ============================================================================

begin;

set local client_min_messages to warning;

create temp table tap (n serial, name text, ok boolean, detail text);
grant all on tap to authenticated;

create or replace function pg_temp.t(p_name text, p_ok boolean, p_detail text default '')
returns void language sql as $$
  insert into tap(name, ok, detail) values (p_name, p_ok, p_detail);
$$;

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-000000150001', 'pk-owner@example.invalid'),
  ('00000000-0000-0000-0000-000000150003', 'pk-groom@example.invalid')
on conflict (id) do nothing;

insert into public.profiles (id, email, full_name) values
  ('00000000-0000-0000-0000-000000150001', 'pk-owner@example.invalid', 'Owner'),
  ('00000000-0000-0000-0000-000000150003', 'pk-groom@example.invalid', 'Groomer')
on conflict (id) do update set full_name = excluded.full_name;

insert into public.orgs (id, name, slug) values
  ('00000000-0000-0000-0000-000000150010', 'PK Org', 'pk-org') on conflict do nothing;

insert into public.facilities (id, org_id, name, slug, legacy_id) values
  ('00000000-0000-0000-0000-000000150020', '00000000-0000-0000-0000-000000150010',
   'Salon', 'pk-a', 'pk-a')
on conflict do nothing;

insert into public.facility_memberships (id, facility_id, profile_id, role, is_active) values
  ('00000000-0000-0000-0000-000000150030', '00000000-0000-0000-0000-000000150020',
   '00000000-0000-0000-0000-000000150001', 'owner', true),
  -- a groomer holds neither financial_view_amounts nor financial_take_payment
  ('00000000-0000-0000-0000-000000150033', '00000000-0000-0000-0000-000000150020',
   '00000000-0000-0000-0000-000000150003', 'groomer', true)
on conflict (id) do nothing;

insert into public.clients (id, facility_id, name, email) values
  ('00000000-0000-0000-0000-000000150040', '00000000-0000-0000-0000-000000150020',
   'Client', 'pk-c@example.invalid');

-- ── K1: a fresh 3-pack derives correctly ───────────────────────────────────
do $$
declare rem integer; used integer; st text;
begin
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000150001', true);
  set local role authenticated;
  insert into public.prepaid_packages (id, facility_id, name, price, service_id, total_passes)
  values ('00000000-0000-0000-0000-000000150050', '00000000-0000-0000-0000-000000150020',
          'Groom 3-pack', 210, 'grooming', 3);
  insert into public.customer_packages
    (id, facility_id, client_id, package_id, package_name, service_id, passes_total, price_paid)
  values ('00000000-0000-0000-0000-000000150060', '00000000-0000-0000-0000-000000150020',
          '00000000-0000-0000-0000-000000150040', '00000000-0000-0000-0000-000000150050',
          'Groom 3-pack', 'grooming', 3, 210);
  select passes_remaining, passes_used, status into rem, used, st
    from public.customer_package_status where id = '00000000-0000-0000-0000-000000150060';
  reset role;
  perform pg_temp.t('K1  a fresh 3-pack derives to 3 remaining / 0 used / active',
    rem = 3 and used = 0 and st = 'active',
    format('remaining=%s used=%s status=%s', rem, used, st));
exception when others then
  reset role; perform pg_temp.t('K1  fresh pack', false, sqlerrm);
end $$;

-- ── K2: the count moves without a counter ──────────────────────────────────
do $$
declare left1 integer; left2 integer; rem integer; used integer;
begin
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000150001', true);
  set local role authenticated;
  select public.redeem_package_pass('00000000-0000-0000-0000-000000150060'::uuid, 'Full Groom') into left1;
  select public.redeem_package_pass('00000000-0000-0000-0000-000000150060'::uuid, 'Full Groom') into left2;
  select passes_remaining, passes_used into rem, used
    from public.customer_package_status where id = '00000000-0000-0000-0000-000000150060';
  reset role;
  perform pg_temp.t('K2  two redemptions leave 1; the count is the sum, not a column',
    left1 = 2 and left2 = 1 and rem = 1 and used = 2,
    format('returned=%s,%s remaining=%s used=%s', left1, left2, rem, used));
exception when others then
  reset role; perform pg_temp.t('K2  redeem', false, sqlerrm);
end $$;

-- ── K3: the last pass cannot be spent twice ────────────────────────────────
do $$
declare last_left integer; blocked boolean; st text;
begin
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000150001', true);
  set local role authenticated;
  select public.redeem_package_pass('00000000-0000-0000-0000-000000150060'::uuid, 'Full Groom') into last_left;
  begin
    perform public.redeem_package_pass('00000000-0000-0000-0000-000000150060'::uuid, 'Full Groom');
    blocked := false;
  exception when check_violation then blocked := true; end;
  select status into st from public.customer_package_status
   where id = '00000000-0000-0000-0000-000000150060';
  reset role;
  perform pg_temp.t('K3  the last pass cannot be spent twice; the pack reads exhausted',
    last_left = 0 and blocked and st = 'exhausted',
    format('last_left=%s blocked=%s status=%s', last_left, blocked, st));
exception when others then
  reset role; perform pg_temp.t('K3  exhaustion', false, sqlerrm);
end $$;

-- ── K4: a reversal is an entry ─────────────────────────────────────────────
do $$
declare rem integer; st text;
begin
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000150001', true);
  set local role authenticated;
  insert into public.package_pass_entries
    (facility_id, customer_package_id, passes, reason, note)
  values ('00000000-0000-0000-0000-000000150020', '00000000-0000-0000-0000-000000150060',
          1, 'reversed', 'Booking cancelled');
  select passes_remaining, status into rem, st
    from public.customer_package_status where id = '00000000-0000-0000-0000-000000150060';
  reset role;
  perform pg_temp.t('K4  a cancelled booking gives the pass back, and the pack is active again',
    rem = 1 and st = 'active', format('remaining=%s status=%s', rem, st));
exception when others then
  reset role; perform pg_temp.t('K4  reversal', false, sqlerrm);
end $$;

-- ── K5: the ledger cannot be bent ──────────────────────────────────────────
do $$
declare bad integer := 0; updated integer; deleted integer;
begin
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000150001', true);
  set local role authenticated;
  begin
    insert into public.package_pass_entries (facility_id, customer_package_id, passes, reason)
    values ('00000000-0000-0000-0000-000000150020', '00000000-0000-0000-0000-000000150060', 5, 'redeemed');
    bad := bad + 1;
  exception when check_violation then null; end;
  update public.package_pass_entries set passes = 99
   where customer_package_id = '00000000-0000-0000-0000-000000150060';
  get diagnostics updated = row_count;
  delete from public.package_pass_entries
   where customer_package_id = '00000000-0000-0000-0000-000000150060';
  get diagnostics deleted = row_count;
  reset role;
  perform pg_temp.t('K5  a redeemed entry cannot add passes; entries cannot be edited or deleted',
    bad = 0 and updated = 0 and deleted = 0,
    format('accepted_bad=%s updated=%s deleted=%s', bad, updated, deleted));
exception when others then
  reset role; perform pg_temp.t('K5  ledger integrity', false, sqlerrm);
end $$;

-- ── K6: expiry beats an unused balance ─────────────────────────────────────
do $$
declare blocked boolean; st text;
begin
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000150001', true);
  set local role authenticated;
  insert into public.customer_packages
    (id, facility_id, client_id, package_name, service_id, passes_total, price_paid, expires_at)
  values ('00000000-0000-0000-0000-000000150061', '00000000-0000-0000-0000-000000150020',
          '00000000-0000-0000-0000-000000150040', 'Lapsed 5-pack', 'grooming', 5, 300,
          now() - interval '1 day');
  begin
    perform public.redeem_package_pass('00000000-0000-0000-0000-000000150061'::uuid, 'Full Groom');
    blocked := false;
  exception when check_violation then blocked := true; end;
  select status into st from public.customer_package_status
   where id = '00000000-0000-0000-0000-000000150061';
  reset role;
  perform pg_temp.t('K6  an expired pack refuses redemption even with 5 passes unused',
    blocked and st = 'expired', format('blocked=%s status=%s', blocked, st));
exception when others then
  reset role; perform pg_temp.t('K6  expiry', false, sqlerrm);
end $$;

-- ── K7: passes are money ───────────────────────────────────────────────────
do $$
declare ok boolean; seen integer;
begin
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000150003', true);
  set local role authenticated;
  select count(*) into seen from public.customer_packages;
  begin
    perform public.redeem_package_pass('00000000-0000-0000-0000-000000150060'::uuid, 'Full Groom');
    ok := false;
  exception when insufficient_privilege or no_data_found then ok := true; end;
  reset role;
  perform pg_temp.t('K7  a groomer sees no purchases and cannot spend a pass',
    ok and seen = 0, format('blocked=%s visible=%s', ok, seen));
exception when others then
  reset role; perform pg_temp.t('K7  groomer', false, sqlerrm);
end $$;

-- ── Report ──────────────────────────────────────────────────────────────────
select case when ok then '  PASS  ' else '> FAIL <' end as result, name, detail
  from tap order by n;

select count(*) filter (where ok) || ' passed, '
    || count(*) filter (where not ok) || ' failed' as summary
  from tap;

rollback;
