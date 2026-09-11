-- ============================================================================
-- A gift card pays for a booking — both ledgers move, or neither
-- (20260911003221).
--
--   bun run test:sql gift-card-payment
--
-- One transaction, rolled back. Fixture emails are @example.invalid.
--
--   P1  the owner pays part of a booking by card: a gift-card payment, the
--       booking's paid total and the card's balance all move
--   P2  more than the booking still owes is refused, and nothing moves
--   P3  more than the card holds is refused — no payment is left behind
--   P4  another business cannot spend this business's card on its booking
--   P5  a groomer, who takes no payments, cannot pay by card
--   P6  anon cannot call it
--   P7  a card pays the tax on what it pays for, recorded apart (20260911221947)
-- ============================================================================

begin;

set local client_min_messages to warning;

create temp table tap (n serial, name text, ok boolean, detail text);
grant all on tap to authenticated, anon;
grant usage, select on sequence tap_n_seq to authenticated, anon;

create or replace function pg_temp.t(p_name text, p_ok boolean, p_detail text default '')
returns void language sql as $$
  insert into tap(name, ok, detail) values (p_name, p_ok, p_detail);
$$;

create or replace function pg_temp.as_user(p_uid text) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims',
    json_build_object('sub', p_uid, 'role', 'authenticated')::text, true);
end $$;

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000001a0001', 'gcp-owner@example.invalid'),
  ('00000000-0000-0000-0000-0000001a0002', 'gcp-groom@example.invalid'),
  ('00000000-0000-0000-0000-0000001a0003', 'gcp-rival@example.invalid')
on conflict (id) do nothing;

insert into public.profiles (id, email, full_name) values
  ('00000000-0000-0000-0000-0000001a0001', 'gcp-owner@example.invalid', 'GCP Owner'),
  ('00000000-0000-0000-0000-0000001a0002', 'gcp-groom@example.invalid', 'GCP Groomer'),
  ('00000000-0000-0000-0000-0000001a0003', 'gcp-rival@example.invalid', 'GCP Rival')
on conflict (id) do nothing;

insert into public.orgs (id, name, slug) values
  ('00000000-0000-0000-0000-0000001a0010', 'GCP Org', 'gcp-org'),
  ('00000000-0000-0000-0000-0000001a0011', 'GCP Rival Org', 'gcp-rival-org')
on conflict (id) do nothing;

insert into public.facilities (id, org_id, name, slug, legacy_id) values
  ('00000000-0000-0000-0000-0000001a0020', '00000000-0000-0000-0000-0000001a0010',
   'GCP Kennels', 'gcp-kennels', 'gcp-kennels'),
  ('00000000-0000-0000-0000-0000001a0021', '00000000-0000-0000-0000-0000001a0011',
   'GCP Rival Kennels', 'gcp-rival', 'gcp-rival')
on conflict (id) do nothing;

insert into public.facility_memberships (facility_id, profile_id, role, is_active) values
  ('00000000-0000-0000-0000-0000001a0020', '00000000-0000-0000-0000-0000001a0001', 'owner', true),
  ('00000000-0000-0000-0000-0000001a0020', '00000000-0000-0000-0000-0000001a0002', 'groomer', true),
  ('00000000-0000-0000-0000-0000001a0021', '00000000-0000-0000-0000-0000001a0003', 'owner', true)
on conflict do nothing;

insert into public.clients (id, facility_id, name, email) values
  ('00000000-0000-0000-0000-0000001a0040', '00000000-0000-0000-0000-0000001a0020',
   'GCP Client', 'gcp-client@example.invalid'),
  ('00000000-0000-0000-0000-0000001a0041', '00000000-0000-0000-0000-0000001a0021',
   'GCP Rival Client', 'gcp-rival-client@example.invalid')
on conflict (id) do nothing;

-- Three bookings: $80 and $200 here, $50 at the rival.
insert into public.bookings (id, facility_id, client_id, service, start_at, end_at, total_cost, status) values
  ('00000000-0000-0000-0000-0000001a0050', '00000000-0000-0000-0000-0000001a0020',
   '00000000-0000-0000-0000-0000001a0040', 'daycare', now(), now() + interval '8 hours', 80, 'confirmed'),
  ('00000000-0000-0000-0000-0000001a0051', '00000000-0000-0000-0000-0000001a0020',
   '00000000-0000-0000-0000-0000001a0040', 'daycare', now(), now() + interval '8 hours', 200, 'confirmed'),
  ('00000000-0000-0000-0000-0000001a0052', '00000000-0000-0000-0000-0000001a0021',
   '00000000-0000-0000-0000-0000001a0041', 'daycare', now(), now() + interval '8 hours', 50, 'confirmed');

create temp table refs as
  select id, ref from public.bookings
   where id in ('00000000-0000-0000-0000-0000001a0050',
                '00000000-0000-0000-0000-0000001a0051',
                '00000000-0000-0000-0000-0000001a0052');
grant select on refs to authenticated;

-- The owner issues a $100 card.
select pg_temp.as_user('00000000-0000-0000-0000-0000001a0001');
set local role authenticated;
select public.issue_gift_card(
  '00000000-0000-0000-0000-0000001a0020'::uuid, 100.00, 'physical', 'GCPTEST0001',
  'Recipient', 'gcp-recipient@example.invalid', null, null,
  '00000000-0000-0000-0000-0000001a0040'::uuid);
reset role;

-- ── P1 ────────────────────────────────────────────────────────────────────
do $$
declare v_state text; v_paid numeric; v_balance numeric; v_rows int;
begin
  perform pg_temp.as_user('00000000-0000-0000-0000-0000001a0001');
  set local role authenticated;
  begin
    perform public.pay_booking_with_gift_card(
      'GCPTEST0001',
      (select ref from refs where id = '00000000-0000-0000-0000-0000001a0050'),
      50, null);
    v_state := 'paid';
  exception when others then
    v_state := sqlstate || ' ' || sqlerrm;
  end;
  reset role;
  select amount_paid into v_paid from public.bookings
   where id = '00000000-0000-0000-0000-0000001a0050';
  select balance into v_balance from public.gift_cards where code = 'GCPTEST0001';
  select count(*) into v_rows from public.payments
   where booking_id = '00000000-0000-0000-0000-0000001a0050' and method = 'gift-card';
  perform pg_temp.t('P1  a card pays $50 of an $80 booking: payment, paid total, balance',
    v_state = 'paid' and v_paid = 50 and v_balance = 50 and v_rows = 1,
    v_state || ' / paid ' || v_paid || ' / balance ' || v_balance || ' / rows ' || v_rows);
end $$;

-- ── P2 ────────────────────────────────────────────────────────────────────
do $$
declare v_state text := 'none'; v_balance numeric; v_rows int;
begin
  perform pg_temp.as_user('00000000-0000-0000-0000-0000001a0001');
  set local role authenticated;
  begin
    perform public.pay_booking_with_gift_card(
      'GCPTEST0001',
      (select ref from refs where id = '00000000-0000-0000-0000-0000001a0050'),
      40, null);
    v_state := 'paid';
  exception when others then
    v_state := sqlstate;
  end;
  reset role;
  select balance into v_balance from public.gift_cards where code = 'GCPTEST0001';
  select count(*) into v_rows from public.payments
   where booking_id = '00000000-0000-0000-0000-0000001a0050';
  perform pg_temp.t('P2  $40 on a booking that owes $30 is refused, nothing moves',
    v_state = '22023' and v_balance = 50 and v_rows = 1,
    v_state || ' / balance ' || v_balance || ' / rows ' || v_rows);
end $$;

-- ── P3 ────────────────────────────────────────────────────────────────────
do $$
declare v_state text := 'none'; v_balance numeric; v_rows int;
begin
  perform pg_temp.as_user('00000000-0000-0000-0000-0000001a0001');
  set local role authenticated;
  begin
    perform public.pay_booking_with_gift_card(
      'GCPTEST0001',
      (select ref from refs where id = '00000000-0000-0000-0000-0000001a0051'),
      60, null);
    v_state := 'paid';
  exception when others then
    v_state := sqlstate;
  end;
  reset role;
  select balance into v_balance from public.gift_cards where code = 'GCPTEST0001';
  select count(*) into v_rows from public.payments
   where booking_id = '00000000-0000-0000-0000-0000001a0051';
  perform pg_temp.t('P3  $60 from a $50 card is refused, and no payment is left behind',
    v_state <> 'paid' and v_balance = 50 and v_rows = 0,
    v_state || ' / balance ' || v_balance || ' / rows ' || v_rows);
end $$;

-- ── P4 ────────────────────────────────────────────────────────────────────
do $$
declare v_state text := 'none'; v_balance numeric; v_rows int;
begin
  perform pg_temp.as_user('00000000-0000-0000-0000-0000001a0003');
  set local role authenticated;
  begin
    perform public.pay_booking_with_gift_card(
      'GCPTEST0001',
      (select ref from refs where id = '00000000-0000-0000-0000-0000001a0052'),
      10, null);
    v_state := 'paid';
  exception when others then
    v_state := sqlstate;
  end;
  reset role;
  select balance into v_balance from public.gift_cards where code = 'GCPTEST0001';
  select count(*) into v_rows from public.payments
   where booking_id = '00000000-0000-0000-0000-0000001a0052';
  perform pg_temp.t('P4  another business cannot spend this card on its booking',
    v_state = '42501' and v_balance = 50 and v_rows = 0,
    v_state || ' / balance ' || v_balance || ' / rows ' || v_rows);
end $$;

-- ── P5 ────────────────────────────────────────────────────────────────────
do $$
declare v_state text := 'none'; v_balance numeric;
begin
  perform pg_temp.as_user('00000000-0000-0000-0000-0000001a0002');
  set local role authenticated;
  begin
    perform public.pay_booking_with_gift_card(
      'GCPTEST0001',
      (select ref from refs where id = '00000000-0000-0000-0000-0000001a0050'),
      10, null);
    v_state := 'paid';
  exception when others then
    v_state := sqlstate;
  end;
  reset role;
  select balance into v_balance from public.gift_cards where code = 'GCPTEST0001';
  perform pg_temp.t('P5  a groomer cannot pay by gift card',
    v_state <> 'paid' and v_balance = 50, v_state || ' / balance ' || v_balance);
end $$;

-- ── P6 ────────────────────────────────────────────────────────────────────
do $$
begin
  perform pg_temp.t('P6  anon cannot call it',
    not has_function_privilege('anon',
      'public.pay_booking_with_gift_card(text, bigint, numeric, text, numeric)', 'execute'),
    'anon can execute');
end $$;

-- ── P7 (20260911221947) ────────────────────────────────────────────────────
-- A card pays the tax on what it pays for: $20 of supply and $3.00 of tax
-- comes off the card as $23, the payment records them apart, and the booking's
-- paid total counts the supply only — so a taxed bill can be settled.
do $$
declare v_state text; v_paid numeric; v_balance numeric; v_row record;
begin
  perform pg_temp.as_user('00000000-0000-0000-0000-0000001a0001');
  set local role authenticated;
  begin
    perform public.pay_booking_with_gift_card(
      'GCPTEST0001',
      (select ref from refs where id = '00000000-0000-0000-0000-0000001a0051'),
      20, null, 3.00);
    v_state := 'paid';
  exception when others then
    v_state := sqlstate || ' ' || sqlerrm;
  end;
  reset role;
  select amount_paid into v_paid from public.bookings
   where id = '00000000-0000-0000-0000-0000001a0051';
  select balance into v_balance from public.gift_cards where code = 'GCPTEST0001';
  select subtotal, tax, grand_total into v_row from public.payments
   where booking_id = '00000000-0000-0000-0000-0000001a0051' and method = 'gift-card';
  perform pg_temp.t('P7  $20 + $3 tax: card -$23, payment 20/3/23, booking paid 20',
    v_state = 'paid' and v_balance = 27 and v_paid = 20
      and v_row.subtotal = 20 and v_row.tax = 3 and v_row.grand_total = 23,
    v_state || ' / balance ' || v_balance || ' / paid ' || v_paid
      || ' / row ' || coalesce(v_row.subtotal::text, '-') || '/'
      || coalesce(v_row.tax::text, '-') || '/' || coalesce(v_row.grand_total::text, '-'));
end $$;

select n, name, ok, detail from tap order by n;

rollback;
