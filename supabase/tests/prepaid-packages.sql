-- ============================================================================
-- Prepaid packages: selling one, spending it, and the counts nobody stores
-- (20260806320000 + 20260806380000 + 20260806400000).
--
--   psql "$(supabase status -o json | jq -r .DB_URL)" \
--     -f supabase/tests/prepaid-packages.sql
--
-- One transaction, rolled back. Fixture emails are @example.invalid.
--
-- ── THIS FILE WAS REWRITTEN, NOT EXTENDED ──────────────────────────────────
--
-- The version it replaces was written against the FIRST package schema, where
-- a package was one service and a count: `prepaid_packages(price, service_id,
-- total_passes)`. 20260806320000 replaced that model because the product sells
-- multi-service bundles -- the Puppy First-Year Plan is six grooms and two
-- baths -- and a single `service_id` cannot hold one.
--
-- The old tests stayed in the repo afterwards, proving nothing: every one of
-- them referenced columns that no longer exist, so the file errors on its first
-- statement. A suite that cannot run against its own schema is worse than no
-- suite, because its presence in the directory is read as coverage.
--
-- ── WHAT THIS FILE IS REALLY ABOUT ─────────────────────────────────────────
--
-- 1. A PURCHASE IS ONE TRANSACTION OR IT IS NOTHING (P3). Its two writes are
--    "the customer paid" and "the customer has passes". P3 forces the second
--    to fail and proves the first did not survive it -- because a paid package
--    with no pools reads as `exhausted`, which is the most convincing wrong
--    answer this schema can give.
--
-- 2. THE TERMS ARE A SNAPSHOT (P2). The catalogue is repriced AND re-bundled
--    after the sale; the sold package does not move.
--
-- 3. THE POOLS ARE SEPARATE (P4). The whole reason for the rebuild: a Basic
--    Bath redemption must not be able to eat a Full Groom pass.
--
-- 4. NO COUNTER EXISTS (P5). The mock stored the used-count in three places at
--    once -- `passesUsed`, `passes[0].usedPasses`, `redemptions.length` -- and
--    updated them by hand. Here there is nothing to forget to update.
--
-- 5. THE LEDGER IS APPEND-ONLY (P6) AND EXPIRY BEATS A BALANCE (P7).
--
-- 6. PASSES ARE MONEY (P8/P9/P10): wrong facility, wrong role, not logged in.
--
-- 7. A CUSTOMER MAY SPEND THEIR OWN AND CONJURE NONE (P11/P12). The portal's
--    read policies were added after pointing it at these tables produced an
--    empty shop for everybody; the insert policy that came with them is the
--    one that needs watching, because an entry with a POSITIVE `passes` is a
--    pass nobody paid for.
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
  ('00000000-0000-0000-0000-000000160001', 'pk2-owner@example.invalid'),
  ('00000000-0000-0000-0000-000000160003', 'pk2-groom@example.invalid'),
  -- a customer: an auth account with NO facility membership at all
  ('00000000-0000-0000-0000-000000160005', 'pk2-cust@example.invalid')
on conflict (id) do nothing;

insert into public.profiles (id, email, full_name) values
  ('00000000-0000-0000-0000-000000160001', 'pk2-owner@example.invalid', 'Owner'),
  ('00000000-0000-0000-0000-000000160003', 'pk2-groom@example.invalid', 'Groomer'),
  ('00000000-0000-0000-0000-000000160005', 'pk2-cust@example.invalid', 'Customer')
on conflict (id) do update set full_name = excluded.full_name;

insert into public.orgs (id, name, slug) values
  ('00000000-0000-0000-0000-000000160010', 'PK2 Org', 'pk2-org')
on conflict do nothing;

-- Two facilities: the second exists only so P8 has somewhere to point.
insert into public.facilities (id, org_id, name, slug, legacy_id) values
  ('00000000-0000-0000-0000-000000160020', '00000000-0000-0000-0000-000000160010',
   'Salon A', 'pk2-a', 'pk2-a'),
  ('00000000-0000-0000-0000-000000160021', '00000000-0000-0000-0000-000000160010',
   'Salon B', 'pk2-b', 'pk2-b')
on conflict do nothing;

insert into public.facility_memberships (id, facility_id, profile_id, role, is_active) values
  ('00000000-0000-0000-0000-000000160030', '00000000-0000-0000-0000-000000160020',
   '00000000-0000-0000-0000-000000160001', 'owner', true),
  -- a groomer holds neither financial_view_amounts nor financial_take_payment
  ('00000000-0000-0000-0000-000000160033', '00000000-0000-0000-0000-000000160020',
   '00000000-0000-0000-0000-000000160003', 'groomer', true)
on conflict (id) do nothing;

-- 'Ours' is the customer's own client row; 'Theirs' belongs to Salon B and to
-- nobody's login, which is what makes P11's scope assertion mean something.
insert into public.clients (id, facility_id, name, email, profile_id) values
  ('00000000-0000-0000-0000-000000160040', '00000000-0000-0000-0000-000000160020',
   'Ours', 'pk2-c@example.invalid', '00000000-0000-0000-0000-000000160005'),
  ('00000000-0000-0000-0000-000000160041', '00000000-0000-0000-0000-000000160021',
   'Theirs', 'pk2-d@example.invalid', null);

-- The catalogue: a two-service bundle, the shape that forced the rebuild.
insert into public.prepaid_packages
  (id, facility_id, name, description, package_price, validity_days, status)
values
  ('00000000-0000-0000-0000-000000160050', '00000000-0000-0000-0000-000000160020',
   'Puppy Plan', 'Grooms and baths', 379, 365, 'active'),
  -- deliberately empty: P3's instrument
  ('00000000-0000-0000-0000-000000160051', '00000000-0000-0000-0000-000000160020',
   'Empty Pack', 'Nothing in it', 100, 90, 'active');

insert into public.prepaid_package_lines
  (package_id, service_id, service_name, quantity, price_per_session, module)
values
  ('00000000-0000-0000-0000-000000160050', 'svc-groom', 'Full Groom', 6, 65, 'grooming'),
  ('00000000-0000-0000-0000-000000160050', 'svc-bath',  'Basic Bath', 2, 35, 'grooming');

create temp table pk2_sale (id uuid);
grant all on pk2_sale to authenticated;

-- ── P1: a sale copies the catalogue's terms, and both writes land ──────────
do $$
declare v_cp uuid; nm text; paid numeric; pools integer; total integer; st text;
begin
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000160001', true);
  set local role authenticated;
  select public.purchase_package(
    '00000000-0000-0000-0000-000000160040'::uuid,
    '00000000-0000-0000-0000-000000160050'::uuid) into v_cp;
  insert into pk2_sale values (v_cp);
  select cp.package_name, cp.price_paid into nm, paid
    from public.customer_packages cp where cp.id = v_cp;
  select count(*) into pools
    from public.customer_package_lines where customer_package_id = v_cp;
  select s.passes_total, s.status into total, st
    from public.customer_package_status s where s.id = v_cp;
  reset role;
  perform pg_temp.t('P1  a sale snapshots name and price and creates both pools',
    nm = 'Puppy Plan' and paid = 379 and pools = 2 and total = 8 and st = 'active',
    format('name=%s paid=%s pools=%s total=%s status=%s', nm, paid, pools, total, st));
exception when others then
  reset role; perform pg_temp.t('P1  sale', false, sqlerrm);
end $$;

-- ── P1b: the module travels with the pool ─────────────────────────────────
do $$
declare modules text; v_cp uuid;
begin
  select id into v_cp from pk2_sale;
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000160001', true);
  set local role authenticated;
  select string_agg(distinct l.module::text, ',') into modules
    from public.customer_package_lines l where l.customer_package_id = v_cp;
  reset role;
  perform pg_temp.t('P1b each pool carries the module that can spend it',
    modules = 'grooming', format('modules=%s', modules));
exception when others then
  reset role; perform pg_temp.t('P1b module copy', false, sqlerrm);
end $$;

-- ── P2: repricing and re-bundling the catalogue does not touch the sale ────
do $$
declare paid numeric; nm text; total integer; v_cp uuid;
begin
  select id into v_cp from pk2_sale;
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000160001', true);
  set local role authenticated;
  update public.prepaid_packages
     set package_price = 999, name = 'Puppy Plan (2027 pricing)'
   where id = '00000000-0000-0000-0000-000000160050';
  delete from public.prepaid_package_lines
   where package_id = '00000000-0000-0000-0000-000000160050'
     and service_id = 'svc-bath';
  update public.prepaid_package_lines set quantity = 1
   where package_id = '00000000-0000-0000-0000-000000160050';
  select cp.price_paid, cp.package_name into paid, nm
    from public.customer_packages cp where cp.id = v_cp;
  select s.passes_total into total
    from public.customer_package_status s where s.id = v_cp;
  reset role;
  perform pg_temp.t('P2  repricing and re-bundling the catalogue leaves the sale alone',
    paid = 379 and nm = 'Puppy Plan' and total = 8,
    format('paid=%s name=%s total=%s', paid, nm, total));
exception when others then
  reset role; perform pg_temp.t('P2  snapshot', false, sqlerrm);
end $$;

-- ── P3: an empty package is refused, and leaves nothing behind ─────────────
--
-- The negative control that matters most. Without the second assertion this
-- would pass while leaving a paid package with no pools -- which reads as
-- `exhausted`, indistinguishable from one legitimately used up.
do $$
declare blocked boolean; orphans integer;
begin
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000160001', true);
  set local role authenticated;
  begin
    perform public.purchase_package(
      '00000000-0000-0000-0000-000000160040'::uuid,
      '00000000-0000-0000-0000-000000160051'::uuid);
    blocked := false;
  exception when check_violation then blocked := true; end;
  select count(*) into orphans from public.customer_packages
   where package_id = '00000000-0000-0000-0000-000000160051';
  reset role;
  perform pg_temp.t('P3  an empty package is refused AND no half-sale survives it',
    blocked and orphans = 0, format('blocked=%s orphan_rows=%s', blocked, orphans));
exception when others then
  reset role; perform pg_temp.t('P3  atomicity', false, sqlerrm);
end $$;

-- ── P4: a bath cannot eat a groom pass ─────────────────────────────────────
do $$
declare bath_left integer; groom_left integer; wrong_pool boolean; v_cp uuid;
begin
  select id into v_cp from pk2_sale;
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000160001', true);
  set local role authenticated;
  select public.redeem_package_pass(v_cp, 'svc-bath', 'Basic Bath') into bath_left;
  select s.passes_remaining into groom_left
    from public.customer_package_pool_status s
   where s.customer_package_id = v_cp and s.service_id = 'svc-groom';
  begin
    -- a service the bundle never contained has no pool to draw on
    perform public.redeem_package_pass(v_cp, 'svc-nails', 'Nail Trim');
    wrong_pool := false;
  exception when check_violation then wrong_pool := true; end;
  reset role;
  perform pg_temp.t('P4  a bath pass leaves all six groom passes; an unbundled service is refused',
    bath_left = 1 and groom_left = 6 and wrong_pool,
    format('bath_left=%s groom_left=%s unbundled_blocked=%s',
           bath_left, groom_left, wrong_pool));
exception when others then
  reset role; perform pg_temp.t('P4  pools', false, sqlerrm);
end $$;

-- ── P5: the count moves without a counter; the last pass goes once ─────────
do $$
declare last_left integer; blocked boolean; used integer; v_cp uuid;
begin
  select id into v_cp from pk2_sale;
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000160001', true);
  set local role authenticated;
  select public.redeem_package_pass(v_cp, 'svc-bath', 'Basic Bath') into last_left;
  begin
    perform public.redeem_package_pass(v_cp, 'svc-bath', 'Basic Bath');
    blocked := false;
  exception when check_violation then blocked := true; end;
  select s.passes_used into used
    from public.customer_package_status s where s.id = v_cp;
  reset role;
  perform pg_temp.t('P5  the bath pool empties, refuses a third, and the total says 2 used',
    last_left = 0 and blocked and used = 2,
    format('last_left=%s blocked=%s used=%s', last_left, blocked, used));
exception when others then
  reset role; perform pg_temp.t('P5  exhaustion', false, sqlerrm);
end $$;

-- ── P6: a reversal is an entry; the ledger takes no edits ──────────────────
do $$
declare rem integer; bad integer := 0; updated integer; deleted integer; v_cp uuid;
begin
  select id into v_cp from pk2_sale;
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000160001', true);
  set local role authenticated;
  insert into public.package_pass_entries
    (facility_id, customer_package_id, service_id, passes, reason, note)
  values ('00000000-0000-0000-0000-000000160020', v_cp, 'svc-bath',
          1, 'reversed', 'Booking cancelled');
  select s.passes_remaining into rem
    from public.customer_package_pool_status s
   where s.customer_package_id = v_cp and s.service_id = 'svc-bath';
  begin
    insert into public.package_pass_entries
      (facility_id, customer_package_id, service_id, passes, reason)
    values ('00000000-0000-0000-0000-000000160020', v_cp, 'svc-bath', 5, 'redeemed');
    bad := bad + 1;
  exception when check_violation then null; end;
  update public.package_pass_entries set passes = 99 where customer_package_id = v_cp;
  get diagnostics updated = row_count;
  delete from public.package_pass_entries where customer_package_id = v_cp;
  get diagnostics deleted = row_count;
  reset role;
  perform pg_temp.t('P6  a cancellation returns the pass; entries cannot be edited or deleted',
    rem = 1 and bad = 0 and updated = 0 and deleted = 0,
    format('remaining=%s accepted_bad=%s updated=%s deleted=%s',
           rem, bad, updated, deleted));
exception when others then
  reset role; perform pg_temp.t('P6  ledger', false, sqlerrm);
end $$;

-- ── P7: expiry beats an unused balance ─────────────────────────────────────
do $$
declare blocked boolean; st text;
begin
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000160001', true);
  set local role authenticated;
  insert into public.customer_packages
    (id, facility_id, client_id, package_name, price_paid, expires_at)
  values ('00000000-0000-0000-0000-000000160061', '00000000-0000-0000-0000-000000160020',
          '00000000-0000-0000-0000-000000160040', 'Lapsed 5-pack', 300,
          now() - interval '1 day');
  insert into public.customer_package_lines
    (customer_package_id, service_id, service_name, passes_total, module)
  values ('00000000-0000-0000-0000-000000160061', 'svc-groom', 'Full Groom', 5, 'grooming');
  begin
    perform public.redeem_package_pass(
      '00000000-0000-0000-0000-000000160061'::uuid, 'svc-groom', 'Full Groom');
    blocked := false;
  exception when check_violation then blocked := true; end;
  select s.status into st from public.customer_package_status s
   where s.id = '00000000-0000-0000-0000-000000160061';
  reset role;
  perform pg_temp.t('P7  an expired pack refuses redemption with five passes unused',
    blocked and st = 'expired', format('blocked=%s status=%s', blocked, st));
exception when others then
  reset role; perform pg_temp.t('P7  expiry', false, sqlerrm);
end $$;

-- ── P8: a package cannot be sold to another facility's client ──────────────
do $$
declare blocked boolean; leaked integer;
begin
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000160001', true);
  set local role authenticated;
  begin
    perform public.purchase_package(
      '00000000-0000-0000-0000-000000160041'::uuid,   -- Salon B's client
      '00000000-0000-0000-0000-000000160050'::uuid);  -- Salon A's package
    blocked := false;
  exception when no_data_found then blocked := true; end;
  select count(*) into leaked from public.customer_packages
   where client_id = '00000000-0000-0000-0000-000000160041';
  reset role;
  perform pg_temp.t('P8  a package cannot be sold to a client at another facility',
    blocked and leaked = 0, format('blocked=%s rows=%s', blocked, leaked));
exception when others then
  reset role; perform pg_temp.t('P8  cross-facility', false, sqlerrm);
end $$;

-- ── P9: a groomer can neither see purchases, spend a pass, nor sell one ────
--
-- Paired with a positive control: P1 already proved the owner sees this sale,
-- so `seen = 0` here is a denial rather than an empty table.
do $$
declare seen integer; spend_blocked boolean; sell_blocked boolean; v_cp uuid;
begin
  select id into v_cp from pk2_sale;
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000160003', true);
  set local role authenticated;
  select count(*) into seen from public.customer_packages;
  begin
    perform public.redeem_package_pass(v_cp, 'svc-groom', 'Full Groom');
    spend_blocked := false;
  exception when insufficient_privilege or no_data_found then spend_blocked := true; end;
  begin
    perform public.purchase_package(
      '00000000-0000-0000-0000-000000160040'::uuid,
      '00000000-0000-0000-0000-000000160050'::uuid);
    sell_blocked := false;
  exception when insufficient_privilege or no_data_found then sell_blocked := true; end;
  reset role;
  perform pg_temp.t('P9  a groomer sees no purchases and can neither spend nor sell',
    seen = 0 and spend_blocked and sell_blocked,
    format('visible=%s spend_blocked=%s sell_blocked=%s',
           seen, spend_blocked, sell_blocked));
exception when others then
  reset role; perform pg_temp.t('P9  groomer', false, sqlerrm);
end $$;

-- ── P10: anon cannot even reach the function ───────────────────────────────
--
-- 20260806380000 shipped with EXECUTE still granted to `anon`, because
-- `revoke ... from public` does not revoke from a role granted BY NAME. It was
-- not exploitable -- every policy involved is `to authenticated`, so the first
-- write would have raised -- but the grant is gone (20260806400000) and this
-- asserts it stays gone.
do $$
declare blocked boolean;
begin
  set local role anon;
  begin
    perform public.purchase_package(
      '00000000-0000-0000-0000-000000160040'::uuid,
      '00000000-0000-0000-0000-000000160050'::uuid);
    blocked := false;
  exception when insufficient_privilege then blocked := true; end;
  reset role;
  perform pg_temp.t('P10 anon has no EXECUTE on purchase_package',
    blocked, format('blocked=%s', blocked));
exception when others then
  reset role; perform pg_temp.t('P10 anon execute', false, sqlerrm);
end $$;

-- ── P11: a customer sees their own package, and only their own ────────────
do $$
declare mine integer; theirs integer; catalogue integer;
        actually_mine integer; actually_theirs integer;
begin
  -- a second purchase, for the OTHER facility's client, as the owner cannot
  -- reach it: inserted here with elevated rights precisely so P11 has
  -- something it must NOT see.
  insert into public.customer_packages
    (id, facility_id, client_id, package_name, price_paid)
  values ('00000000-0000-0000-0000-000000160062',
          '00000000-0000-0000-0000-000000160021',
          '00000000-0000-0000-0000-000000160041', 'Not yours', 100);

  -- The truth, read with no policy in the way. Comparing against a hardcoded 1
  -- was wrong: P7 sells this client a second (lapsed) pack, so "one" was an
  -- assumption about test order rather than a fact about visibility.
  select count(*) into actually_mine from public.customer_packages
   where client_id = '00000000-0000-0000-0000-000000160040';
  select count(*) into actually_theirs from public.customer_packages
   where client_id = '00000000-0000-0000-0000-000000160041';

  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000160005', true);
  set local role authenticated;
  select count(*) into mine from public.customer_packages
   where client_id = '00000000-0000-0000-0000-000000160040';
  select count(*) into theirs from public.customer_packages
   where client_id = '00000000-0000-0000-0000-000000160041';
  select count(*) into catalogue from public.prepaid_packages;
  reset role;
  perform pg_temp.t('P11 a customer sees every package of their own, the shop, and no other client''s',
    mine = actually_mine and actually_mine > 0
      and theirs = 0 and actually_theirs > 0
      and catalogue >= 1,
    format('mine=%s/%s theirs=%s/%s catalogue=%s',
           mine, actually_mine, theirs, actually_theirs, catalogue));
exception when others then
  reset role; perform pg_temp.t('P11 customer scope', false, sqlerrm);
end $$;

-- ── P12: a customer can spend a pass and cannot conjure one ───────────────
--
-- The insert policy allows exactly `reason = 'redeemed'` with `passes = -1`.
-- Both halves are asserted: without the positive one this would pass on a
-- policy that lets a customer do nothing at all.
do $$
declare spent integer; reversal_blocked boolean; gift_blocked boolean;
        bulk_blocked boolean; v_cp uuid;
begin
  select id into v_cp from pk2_sale;
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000160005', true);
  set local role authenticated;

  -- The positive half. It failed until 20260806480000: `for update` applies
  -- the UPDATE policy when locking, and a customer holds no
  -- `financial_take_payment`, so the locking read returned NOTHING AND NO
  -- ERROR and the function reported the package as not theirs.
  begin
    select public.redeem_package_pass(v_cp, 'svc-groom', 'Full Groom') into spent;
  exception when others then spent := -1; end;

  begin
    insert into public.package_pass_entries
      (facility_id, customer_package_id, service_id, passes, reason)
    values ('00000000-0000-0000-0000-000000160020', v_cp, 'svc-groom', 1, 'reversed');
    reversal_blocked := false;
  exception when insufficient_privilege then reversal_blocked := true; end;

  begin
    insert into public.package_pass_entries
      (facility_id, customer_package_id, service_id, passes, reason)
    values ('00000000-0000-0000-0000-000000160020', v_cp, 'svc-groom', 10, 'adjustment');
    gift_blocked := false;
  exception when insufficient_privilege then gift_blocked := true; end;

  -- and cannot spend more than one at a time to dodge the sign rule
  begin
    insert into public.package_pass_entries
      (facility_id, customer_package_id, service_id, passes, reason)
    values ('00000000-0000-0000-0000-000000160020', v_cp, 'svc-groom', -5, 'redeemed');
    bulk_blocked := false;
  exception when insufficient_privilege then bulk_blocked := true; end;

  reset role;
  perform pg_temp.t('P12 a customer spends one pass; reversals, gifts and bulk writes are refused',
    spent = 5 and reversal_blocked and gift_blocked and bulk_blocked,
    format('groom_left=%s reversal_blocked=%s gift_blocked=%s bulk_blocked=%s',
           spent, reversal_blocked, gift_blocked, bulk_blocked));
exception when others then
  reset role; perform pg_temp.t('P12 customer ledger', false, sqlerrm);
end $$;

-- ── Report ──────────────────────────────────────────────────────────────────
select case when ok then '  PASS  ' else '> FAIL <' end as result, name, detail
  from tap order by n;

select count(*) filter (where ok) || ' passed, '
    || count(*) filter (where not ok) || ' failed' as summary
  from tap;

rollback;
