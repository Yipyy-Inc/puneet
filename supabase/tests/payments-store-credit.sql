-- ============================================================================
-- Money — immutability, the arithmetic, and who may take vs. give back
-- (20260806220000).
--
--   psql "$(supabase status -o json | jq -r .DB_URL)" \
--     -f supabase/tests/payments-store-credit.sql
--
-- One transaction, rolled back. Fixture emails are @example.invalid.
--
-- ── RUN THIS INSIDE A TRANSACTION, ALWAYS ──────────────────────────────────
--
-- Both tables are append-only for EVERY role. A row written outside a
-- transaction cannot be deleted afterwards by anyone — the table would have to
-- be dropped and recreated. That already happened once on
-- grooming_appointment_history; do not repeat it with money.
--
-- ── WHAT THIS FILE IS REALLY ABOUT ─────────────────────────────────────────
--
-- 1. TAKING MONEY AND GIVING IT BACK ARE DIFFERENT AUTHORITIES (P2/S2). The
--    role presets already draw the line — reception holds
--    `financial_take_payment` and not `process_refund` — so the insert policy
--    branches on the SIGN of the amount. P2 proves a receptionist cannot refund
--    AND that an owner can, so the deny is not simply a broken policy.
--
-- 2. THE ARITHMETIC IS THE DATABASE'S PROBLEM (P3). A total that does not equal
--    its parts, or a charge that ignores the credit applied, is the kind of row
--    that surfaces during a dispute. Five malformed shapes, plus a correct one
--    so the CHECKs are not simply refusing everything.
--
-- 3. NOT EVEN THE OWNER CAN REWRITE A PAYMENT (P4) — the assertion RLS cannot
--    make, since service_role bypasses it and GRANTs are bypassed by the table
--    owner. The trigger is the binding layer.
--
-- 4. THE BALANCE IS DERIVED (S1). The mock stored `balance` beside
--    `transactions[]`; there is no balance column here, and S1 checks the view
--    sums to 70 after +100 and −30.
-- ============================================================================

begin;

set local client_min_messages to warning;

create temp table tap (n serial, name text, ok boolean, detail text);
grant all on tap to authenticated;

create or replace function pg_temp.t(p_name text, p_ok boolean, p_detail text default '')
returns void language sql as $$
  insert into tap(name, ok, detail) values (p_name, p_ok, p_detail);
$$;

-- ── Fixture: an owner, a receptionist, a groomer, and a rival ──────────────

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000012d001', 'pay-owner@example.invalid'),
  ('00000000-0000-0000-0000-00000012d002', 'pay-recep@example.invalid'),
  ('00000000-0000-0000-0000-00000012d003', 'pay-groom@example.invalid'),
  ('00000000-0000-0000-0000-00000012d004', 'pay-rival@example.invalid')
on conflict (id) do nothing;

insert into public.profiles (id, email, full_name) values
  ('00000000-0000-0000-0000-00000012d001', 'pay-owner@example.invalid', 'Owner'),
  ('00000000-0000-0000-0000-00000012d002', 'pay-recep@example.invalid', 'Reception Rita'),
  ('00000000-0000-0000-0000-00000012d003', 'pay-groom@example.invalid', 'Groomer'),
  ('00000000-0000-0000-0000-00000012d004', 'pay-rival@example.invalid', 'Rival')
on conflict (id) do update set full_name = excluded.full_name;

insert into public.orgs (id, name, slug) values
  ('00000000-0000-0000-0000-00000012d010', 'Pay Org', 'pay-org'),
  ('00000000-0000-0000-0000-00000012d011', 'Pay Rival', 'pay-rival-org')
on conflict (id) do nothing;

insert into public.facilities (id, org_id, name, slug, legacy_id) values
  ('00000000-0000-0000-0000-00000012d020', '00000000-0000-0000-0000-00000012d010',
   'Salon A', 'pay-a', 'pay-a'),
  ('00000000-0000-0000-0000-00000012d021', '00000000-0000-0000-0000-00000012d011',
   'Salon B', 'pay-b', 'pay-b')
on conflict (id) do nothing;

insert into public.facility_memberships (id, facility_id, profile_id, role, is_active) values
  ('00000000-0000-0000-0000-00000012d030', '00000000-0000-0000-0000-00000012d020',
   '00000000-0000-0000-0000-00000012d001', 'owner', true),
  -- reception: financial_take_payment, NOT process_refund
  ('00000000-0000-0000-0000-00000012d032', '00000000-0000-0000-0000-00000012d020',
   '00000000-0000-0000-0000-00000012d002', 'reception', true),
  -- groomer: neither, and no financial_view_amounts
  ('00000000-0000-0000-0000-00000012d033', '00000000-0000-0000-0000-00000012d020',
   '00000000-0000-0000-0000-00000012d003', 'groomer', true),
  ('00000000-0000-0000-0000-00000012d031', '00000000-0000-0000-0000-00000012d021',
   '00000000-0000-0000-0000-00000012d004', 'owner', true)
on conflict (id) do nothing;

insert into public.clients (id, facility_id, name, email) values
  ('00000000-0000-0000-0000-00000012d040', '00000000-0000-0000-0000-00000012d020',
   'Client A', 'pay-client@example.invalid'),
  ('00000000-0000-0000-0000-00000012d041', '00000000-0000-0000-0000-00000012d021',
   'Rival Client', 'pay-rc@example.invalid');

insert into public.bookings
  (id, facility_id, client_id, service, service_type, status, start_at, end_at,
   base_price, total_cost)
values ('00000000-0000-0000-0000-00000012d070', '00000000-0000-0000-0000-00000012d020',
        '00000000-0000-0000-0000-00000012d040', 'grooming', 'full_groom', 'confirmed',
        '2026-08-07T10:00:00Z', '2026-08-07T11:30:00Z', 80, 80);

-- ── P1: reception takes a payment; the author is stamped ───────────────────
do $$
declare who text; cnt integer;
begin
  perform set_config('request.jwt.claims', json_build_object('sub', '00000000-0000-0000-0000-00000012d002', 'role', 'authenticated')::text, true);
  set local role authenticated;
  insert into public.payments
    (id, facility_id, booking_id, client_id, method, subtotal, tax, tip,
     amount_charged, grand_total, author_name)
  values ('00000000-0000-0000-0000-00000012d080', '00000000-0000-0000-0000-00000012d020',
          '00000000-0000-0000-0000-00000012d070', '00000000-0000-0000-0000-00000012d040',
          'new-card', 80.00, 10.40, 12.00, 102.40, 102.40, 'Somebody Else');
  reset role;
  select author_name into who from public.payments
   where id = '00000000-0000-0000-0000-00000012d080';
  select count(*) into cnt from public.payments;
  perform pg_temp.t('P1  reception can take a payment; the author is the session''s',
    cnt = 1 and who = 'Reception Rita', format('rows=%s author=%s', cnt, who));
exception when others then
  reset role; perform pg_temp.t('P1  take payment', false, sqlerrm);
end $$;

-- ── P2: reception cannot refund; an owner can ──────────────────────────────
-- The allow half is what keeps the deny half honest.
do $$
declare blocked boolean; allowed boolean;
begin
  perform set_config('request.jwt.claims', json_build_object('sub', '00000000-0000-0000-0000-00000012d002', 'role', 'authenticated')::text, true);
  set local role authenticated;
  begin
    insert into public.payments
      (facility_id, booking_id, client_id, method, subtotal, tax, tip,
       amount_charged, grand_total)
    values ('00000000-0000-0000-0000-00000012d020', '00000000-0000-0000-0000-00000012d070',
            '00000000-0000-0000-0000-00000012d040', 'new-card',
            -80.00, -10.40, -12.00, -102.40, -102.40);
    blocked := false;
  exception when insufficient_privilege then blocked := true; end;
  reset role;

  perform set_config('request.jwt.claims', json_build_object('sub', '00000000-0000-0000-0000-00000012d001', 'role', 'authenticated')::text, true);
  set local role authenticated;
  insert into public.payments
    (facility_id, booking_id, client_id, method, subtotal, tax, tip,
     amount_charged, grand_total)
  values ('00000000-0000-0000-0000-00000012d020', '00000000-0000-0000-0000-00000012d070',
          '00000000-0000-0000-0000-00000012d040', 'new-card',
          -80.00, -10.40, -12.00, -102.40, -102.40);
  allowed := true;
  reset role;
  perform pg_temp.t('P2  reception cannot refund; an owner can (the sign picks the key)',
    blocked and allowed, format('reception_blocked=%s owner_allowed=%s', blocked, allowed));
exception when others then
  reset role; perform pg_temp.t('P2  refund split', false, sqlerrm);
end $$;

-- ── P3: the arithmetic must hold ───────────────────────────────────────────
do $$
declare bad integer := 0;
begin
  perform set_config('request.jwt.claims', json_build_object('sub', '00000000-0000-0000-0000-00000012d001', 'role', 'authenticated')::text, true);
  set local role authenticated;
  begin  -- the total is not its parts
    insert into public.payments (facility_id, method, subtotal, tax, tip, amount_charged, grand_total)
    values ('00000000-0000-0000-0000-00000012d020', 'new-card', 80, 10, 5, 999, 999);
    bad := bad + 1;
  exception when check_violation then null; end;
  begin  -- the charge ignores the credit applied
    insert into public.payments (facility_id, method, subtotal, tax, tip,
                                 store_credit_applied, amount_charged, grand_total)
    values ('00000000-0000-0000-0000-00000012d020', 'new-card', 80, 10, 5, 20, 95, 95);
    bad := bad + 1;
  exception when check_violation then null; end;
  begin  -- cash with nothing tendered
    insert into public.payments (facility_id, method, subtotal, tax, tip, amount_charged, grand_total)
    values ('00000000-0000-0000-0000-00000012d020', 'cash', 80, 10, 5, 95, 95);
    bad := bad + 1;
  exception when check_violation then null; end;
  begin  -- tendered less than the amount due
    insert into public.payments (facility_id, method, subtotal, tax, tip, amount_charged, grand_total, cash_received)
    values ('00000000-0000-0000-0000-00000012d020', 'cash', 80, 10, 5, 95, 95, 40);
    bad := bad + 1;
  exception when check_violation then null; end;
  begin  -- a saved card on a cash payment
    insert into public.payments (facility_id, method, subtotal, tax, tip, amount_charged,
                                 grand_total, cash_received, saved_card_id)
    values ('00000000-0000-0000-0000-00000012d020', 'cash', 80, 10, 5, 95, 95, 100, 'card_x');
    bad := bad + 1;
  exception when check_violation then null; end;
  -- Not vacuous: a correct cash payment with credit applied.
  insert into public.payments (facility_id, method, subtotal, tax, tip,
                               store_credit_applied, amount_charged, grand_total, cash_received)
  values ('00000000-0000-0000-0000-00000012d020', 'cash', 80, 10, 5, 20, 75, 95, 80);
  reset role;
  perform pg_temp.t('P3  a payment whose arithmetic does not hold is refused',
    bad = 0, format('accepted_bad=%s', bad));
exception when others then
  reset role; perform pg_temp.t('P3  arithmetic', false, sqlerrm);
end $$;

-- ── P4: not even the owner can rewrite a payment ───────────────────────────
do $$
declare blocked integer := 0;
begin
  perform set_config('request.jwt.claims', '', true);
  begin
    update public.payments set grand_total = 1
     where id = '00000000-0000-0000-0000-00000012d080';
  exception when insufficient_privilege then blocked := blocked + 1; end;
  begin
    delete from public.payments where id = '00000000-0000-0000-0000-00000012d080';
  exception when insufficient_privilege then blocked := blocked + 1; end;
  begin
    truncate public.payments;
  exception when insufficient_privilege then blocked := blocked + 1; end;
  perform pg_temp.t('P4  not even the owner can edit, delete or truncate a payment',
    blocked = 3, format('blocked=%s/3', blocked));
end $$;

-- ── P5: a payment cannot reach across facilities ───────────────────────────
do $$
declare ok boolean;
begin
  perform set_config('request.jwt.claims', json_build_object('sub', '00000000-0000-0000-0000-00000012d001', 'role', 'authenticated')::text, true);
  set local role authenticated;
  begin
    insert into public.payments (facility_id, client_id, method, subtotal, tax, tip,
                                 amount_charged, grand_total)
    values ('00000000-0000-0000-0000-00000012d020', '00000000-0000-0000-0000-00000012d041',
            'new-card', 10, 0, 0, 10, 10);
    ok := false;
  exception when insufficient_privilege then ok := true; end;
  reset role;
  perform pg_temp.t('P5  a payment cannot name another facility''s client', ok);
exception when others then
  reset role; perform pg_temp.t('P5  cross-facility', false, sqlerrm);
end $$;

-- ── P6: amounts are not for everyone ───────────────────────────────────────
-- A groomer holds view_bookings but not financial_view_amounts.
do $$
declare g integer; r integer;
begin
  perform set_config('request.jwt.claims', json_build_object('sub', '00000000-0000-0000-0000-00000012d003', 'role', 'authenticated')::text, true);
  set local role authenticated;
  select count(*) into g from public.payments;
  reset role;
  perform set_config('request.jwt.claims', json_build_object('sub', '00000000-0000-0000-0000-00000012d004', 'role', 'authenticated')::text, true);
  set local role authenticated;
  select count(*) into r from public.payments;
  reset role;
  perform pg_temp.t('P6  a groomer and a rival see no payments',
    g = 0 and r = 0, format('groomer=%s rival=%s', g, r));
exception when others then
  reset role; perform pg_temp.t('P6  read isolation', false, sqlerrm);
end $$;

-- ── S1: sign/reason agreement, and the derived balance ─────────────────────
do $$
declare bad integer := 0; bal numeric;
begin
  perform set_config('request.jwt.claims', json_build_object('sub', '00000000-0000-0000-0000-00000012d001', 'role', 'authenticated')::text, true);
  set local role authenticated;
  begin  -- "redeemed" that ADDS money is how a ledger silently mints it
    insert into public.store_credit_entries (facility_id, client_id, amount, reason)
    values ('00000000-0000-0000-0000-00000012d020',
            '00000000-0000-0000-0000-00000012d040', 50, 'redeemed');
    bad := bad + 1;
  exception when check_violation then null; end;
  begin  -- zero is not an event
    insert into public.store_credit_entries (facility_id, client_id, amount, reason)
    values ('00000000-0000-0000-0000-00000012d020',
            '00000000-0000-0000-0000-00000012d040', 0, 'added');
    bad := bad + 1;
  exception when check_violation then null; end;
  insert into public.store_credit_entries (facility_id, client_id, amount, reason)
  values ('00000000-0000-0000-0000-00000012d020',
          '00000000-0000-0000-0000-00000012d040', 100, 'added');
  reset role;

  perform set_config('request.jwt.claims', json_build_object('sub', '00000000-0000-0000-0000-00000012d002', 'role', 'authenticated')::text, true);
  set local role authenticated;
  insert into public.store_credit_entries (facility_id, client_id, amount, reason)
  values ('00000000-0000-0000-0000-00000012d020',
          '00000000-0000-0000-0000-00000012d040', -30, 'redeemed');
  select balance into bal from public.client_store_credit
   where client_id = '00000000-0000-0000-0000-00000012d040';
  reset role;
  perform pg_temp.t('S1  the ledger refuses a sign/reason mismatch; the balance derives to 70',
    bad = 0 and bal = 70, format('accepted_bad=%s balance=%s', bad, bal));
exception when others then
  reset role; perform pg_temp.t('S1  ledger', false, sqlerrm);
end $$;

-- ── S2: spending credit is not the same as granting it ─────────────────────
do $$
declare blocked boolean;
begin
  perform set_config('request.jwt.claims', json_build_object('sub', '00000000-0000-0000-0000-00000012d002', 'role', 'authenticated')::text, true);
  set local role authenticated;
  begin
    insert into public.store_credit_entries (facility_id, client_id, amount, reason)
    values ('00000000-0000-0000-0000-00000012d020',
            '00000000-0000-0000-0000-00000012d040', 500, 'added');
    blocked := false;
  exception when insufficient_privilege then blocked := true; end;
  reset role;
  perform pg_temp.t('S2  reception can spend credit but cannot grant it', blocked);
exception when others then
  reset role; perform pg_temp.t('S2  grant credit', false, sqlerrm);
end $$;

-- ── Report ──────────────────────────────────────────────────────────────────
select case when ok then '  PASS  ' else '> FAIL <' end as result, name, detail
  from tap order by n;

select count(*) filter (where ok) || ' passed, '
    || count(*) filter (where not ok) || ' failed' as summary
  from tap;

rollback;
