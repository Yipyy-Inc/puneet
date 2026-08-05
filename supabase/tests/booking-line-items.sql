-- ============================================================================
-- Things added to a booking, and what they do to the bill
-- (20260806820000 + 20260806840000).
--
--   psql "$(supabase status -o json | jq -r .DB_URL)" \
--     -f supabase/tests/booking-line-items.sql
--
-- One transaction, rolled back. Fixture emails are @example.invalid.
--
-- ── WHAT THIS FILE IS REALLY ABOUT ─────────────────────────────────────────
--
-- 1. THE BILL CAN GROW AFTER IT WAS SETTLED (L1/L2). The single assertion the
--    whole change exists for: a $100 booking paid in full reads 'paid', and
--    the moment $30 of food is added it reads 'pending' again with
--    `amount_due` at $130. Without repointing the derivations at `amount_due`
--    it would still read 'paid' and the $30 would never be chased.
--
-- 2. EVERY DERIVATION MOVED, NOT JUST THE STATUS (L3/L4). The client's debt
--    includes the fee, and a bulk settle charges the fee. Three functions
--    compared against `total_cost`; missing one would leave a number that
--    disagrees with the other two.
--
-- 3. THE LINE'S PRICE IS NOT WRITABLE (L5). `price` is generated from
--    `unit_price * quantity`.
--
-- 4. PUTTING SOMETHING ON A BILL IS A TILL JOB (L6). `retail_process_sale`,
--    which the accountant does not have — they reconcile, they do not sell.
--
-- 5. IT COMES BACK OFF (L7). An item added by mistake is deleted and the bill
--    returns to what it was.
--
-- ── THE ONE THAT ALMOST SHIPPED WRONG ──────────────────────────────────────
--
-- `derive_booking_payment` is a BEFORE trigger, and `amount_due` is a STORED
-- generated column — computed AFTER before-triggers, so inside that function it
-- is not the value about to be written. Reading it there makes every booking
-- 'pending' regardless, which is the right answer often enough to look fine.
-- Verified by doing it: a $100 booking paid $100 came back 'pending'. The
-- trigger adds `total_cost + extras_total` itself.
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
  ('00000000-0000-0000-0000-000000270001', 'li-owner@example.invalid'),
  ('00000000-0000-0000-0000-000000270002', 'li-retail@example.invalid'),
  ('00000000-0000-0000-0000-000000270003', 'li-acct@example.invalid')
on conflict (id) do nothing;

insert into public.profiles (id, email, full_name) values
  ('00000000-0000-0000-0000-000000270001', 'li-owner@example.invalid',  'Owner'),
  ('00000000-0000-0000-0000-000000270002', 'li-retail@example.invalid', 'Retail'),
  ('00000000-0000-0000-0000-000000270003', 'li-acct@example.invalid',   'Accountant')
on conflict (id) do update set full_name = excluded.full_name;

insert into public.orgs (id, name, slug) values
  ('00000000-0000-0000-0000-000000270010', 'LI Org', 'li-org')
on conflict do nothing;

insert into public.facilities (id, org_id, name, slug, legacy_id) values
  ('00000000-0000-0000-0000-000000270020', '00000000-0000-0000-0000-000000270010',
   'LI Facility', 'li-a', 'li-a')
on conflict do nothing;

-- retail:     retail_process_sale, NO edit_bookings
-- accountant: financial_manage_invoices, NO retail_process_sale
insert into public.facility_memberships (id, facility_id, profile_id, role, is_active) values
  ('00000000-0000-0000-0000-000000270030', '00000000-0000-0000-0000-000000270020',
   '00000000-0000-0000-0000-000000270001', 'owner', true),
  ('00000000-0000-0000-0000-000000270031', '00000000-0000-0000-0000-000000270020',
   '00000000-0000-0000-0000-000000270002', 'retail', true),
  ('00000000-0000-0000-0000-000000270032', '00000000-0000-0000-0000-000000270020',
   '00000000-0000-0000-0000-000000270003', 'accountant', true)
on conflict (id) do nothing;

insert into public.clients (id, facility_id, name, email) values
  ('00000000-0000-0000-0000-000000270040', '00000000-0000-0000-0000-000000270020',
   'Buyer', 'li-c@example.invalid');

create or replace function pg_temp.as_user(p_uid uuid) returns void
language plpgsql as $$
begin
  perform set_config('request.jwt.claims',
    case when p_uid is null then ''
         else json_build_object('sub', p_uid::text,
                                'role', 'authenticated')::text end,
    true);
end $$;

create or replace function pg_temp.bk(p_status text, p_total numeric default 100)
returns uuid language plpgsql as $$
declare v_id uuid;
begin
  insert into public.bookings
    (facility_id, client_id, service, status, start_at, end_at,
     base_price, discount, total_cost)
  values
    ('00000000-0000-0000-0000-000000270020', '00000000-0000-0000-0000-000000270040',
     'daycare', p_status::public.booking_status,
     now(), now() + interval '8 hours', p_total, 0, p_total)
  returning id into v_id;
  return v_id;
end $$;

create or replace function pg_temp.pay(p_b uuid, p_amt numeric)
returns void language plpgsql as $$
begin
  insert into public.payments
    (facility_id, booking_id, client_id, method, subtotal, tax, tip,
     store_credit_applied, package_pass_applied, loyalty_discount_applied,
     amount_charged, grand_total, cash_received, receipt_channels, author_name)
  values
    ('00000000-0000-0000-0000-000000270020', p_b,
     '00000000-0000-0000-0000-000000270040', 'cash',
     p_amt, 0, 0, 0, 0, 0, p_amt, p_amt, p_amt, '{}', 'Test');
end $$;

create or replace function pg_temp.add_line(
  p_b uuid, p_kind text, p_name text, p_unit numeric, p_qty integer default 1)
returns void language plpgsql as $$
begin
  insert into public.booking_line_items
    (booking_id, facility_id, kind, name, unit_price, quantity)
  values
    (p_b, '00000000-0000-0000-0000-000000270020', p_kind, p_name, p_unit, p_qty);
end $$;

-- ── L1/L2: a settled booking reopens when something is added ───────────────
--
-- Note the booking is COMPLETED, so `retail` — who has no `edit_bookings` —
-- is adding to a booking past the point the customer path would refuse. That
-- exercises the pass-through in `enforce_booking_integrity` as a side effect.
do $$
declare v_b uuid; r public.bookings;
begin
  perform pg_temp.as_user('00000000-0000-0000-0000-000000270001');
  set local role authenticated;
  v_b := pg_temp.bk('completed', 100);
  perform pg_temp.pay(v_b, 100);
  reset role;

  select * into r from public.bookings where id = v_b;
  perform pg_temp.t('L1  the booking is settled before anything is added',
    r.payment_status = 'paid' and r.amount_due = 100,
    format('status=%s due=%s', r.payment_status, r.amount_due));

  perform pg_temp.as_user('00000000-0000-0000-0000-000000270002');
  set local role authenticated;
  perform pg_temp.add_line(v_b, 'item', 'Bag of food', 15, 2);
  reset role;

  select * into r from public.bookings where id = v_b;
  perform pg_temp.t('L2  $30 of food reopens it -- the reason this change exists',
    r.payment_status = 'pending' and r.amount_due = 130 and r.extras_total = 30,
    format('status=%s due=%s extras=%s paid=%s',
           r.payment_status, r.amount_due, r.extras_total, r.amount_paid));
exception when others then
  reset role; perform pg_temp.t('L1  adding to a settled booking', false, sqlerrm);
end $$;

-- ── L3/L4: the client's debt and a bulk settle both follow ─────────────────
do $$
declare v_b uuid; v_bal numeric; v_out jsonb; r public.bookings;
begin
  perform pg_temp.as_user('00000000-0000-0000-0000-000000270001');
  set local role authenticated;
  v_b := pg_temp.bk('completed', 50);
  reset role;

  perform pg_temp.as_user('00000000-0000-0000-0000-000000270002');
  set local role authenticated;
  perform pg_temp.add_line(v_b, 'fee', 'Late pickup', 20, 1);
  reset role;

  select outstanding_balance into v_bal
    from public.clients where id = '00000000-0000-0000-0000-000000270040';

  perform pg_temp.as_user('00000000-0000-0000-0000-000000270001');
  set local role authenticated;
  v_out := public.settle_bookings(
    '00000000-0000-0000-0000-000000270020', 'cash', array[v_b]);
  reset role;

  select * into r from public.bookings where id = v_b;

  -- $30 still standing from L2, plus $70 here.
  perform pg_temp.t('L3  the client is chased for the fee too',
    v_bal = 100, format('client balance=%s', v_bal));
  perform pg_temp.t('L4  a bulk settle charges $70, not the $50 booking price',
    (v_out->0->>'amount')::numeric = 70 and r.payment_status = 'paid',
    format('taken=%s status=%s', v_out->0->>'amount', r.payment_status));
exception when others then
  reset role; perform pg_temp.t('L3  debt and batch', false, sqlerrm);
end $$;

-- ── L5/L6: the price is generated, and selling is a permission ─────────────
do $$
declare v_b uuid; v_price numeric; v_err text := 'no error'; v_rows integer;
begin
  perform pg_temp.as_user('00000000-0000-0000-0000-000000270001');
  set local role authenticated;
  v_b := pg_temp.bk('confirmed', 10);
  reset role;

  perform pg_temp.as_user('00000000-0000-0000-0000-000000270002');
  set local role authenticated;
  perform pg_temp.add_line(v_b, 'item', 'Chew', 7.50, 4);
  reset role;
  select price into v_price from public.booking_line_items where booking_id = v_b;

  perform pg_temp.as_user('00000000-0000-0000-0000-000000270003');
  set local role authenticated;
  begin
    perform pg_temp.add_line(v_b, 'item', 'Shampoo', 9, 1);
  exception when others then v_err := sqlerrm;
  end;
  reset role;
  select count(*) into v_rows from public.booking_line_items where booking_id = v_b;

  perform pg_temp.t('L5  price is unit_price x quantity, and not writable',
    v_price = 30, format('price=%s', v_price));
  perform pg_temp.t('L6  an accountant cannot put anything on a bill',
    v_err <> 'no error' and v_rows = 1,
    format('err=%s rows=%s', left(v_err, 45), v_rows));
end $$;

-- ── L7: added by mistake, taken back off ───────────────────────────────────
do $$
declare v_b uuid; r public.bookings;
begin
  perform pg_temp.as_user('00000000-0000-0000-0000-000000270001');
  set local role authenticated;
  v_b := pg_temp.bk('confirmed', 40);
  reset role;

  perform pg_temp.as_user('00000000-0000-0000-0000-000000270002');
  set local role authenticated;
  perform pg_temp.add_line(v_b, 'item', 'Added by mistake', 25, 1);
  delete from public.booking_line_items where booking_id = v_b;
  reset role;

  select * into r from public.bookings where id = v_b;
  perform pg_temp.t('L7  removing the line takes it back off the bill',
    r.extras_total = 0 and r.amount_due = 40,
    format('extras=%s due=%s', r.extras_total, r.amount_due));
exception when others then
  reset role; perform pg_temp.t('L7  removal', false, sqlerrm);
end $$;

-- ── Results ────────────────────────────────────────────────────────────────

do $$
declare v_failed integer;
begin
  select count(*) into v_failed from tap where not ok;
  if v_failed > 0 then
    raise warning '% assertion(s) FAILED', v_failed;
  else
    raise warning 'all % assertions passed', (select count(*) from tap);
  end if;
end $$;

select n, case when ok then 'PASS' else 'FAIL' end as result, name, detail
  from tap order by n;

rollback;
