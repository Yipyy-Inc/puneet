-- ============================================================================
-- What a client owes is what their delivered bookings have not settled
-- (20260806780000).
--
--   psql "$(supabase status -o json | jq -r .DB_URL)" \
--     -f supabase/tests/client-balance-derivation.sql
--
-- One transaction, rolled back. Fixture emails are @example.invalid.
--
-- ── WHAT THIS FILE IS REALLY ABOUT ─────────────────────────────────────────
--
-- 1. THE NUMBER MOVES, AND ONLY FOR THE RIGHT BOOKINGS (C1/C2/C3). A completed
--    unpaid booking puts the client in debt; paying it clears the debt. C3 is
--    the one that decides the definition: $2,400 of confirmed, checked_in,
--    cancelled and no_show bookings added on top move the balance by NOTHING.
--    Booked is not owed, on site is not owed yet, and a no-show fee is not the
--    booking price.
--
-- 2. NOBODY SETS IT (C6). Including `postgres`, which holds BYPASSRLS and is
--    the most privileged writer there is.
--
-- 3. THE CASHIER IS NOT A CLIENT EDITOR (C7), AND NEITHER IS THE SUPERVISOR
--    (C7c). The second is the one the SECURITY DEFINER exists for; the first
--    would work without it, because paying already runs inside a definer
--    function. Finding that out took two probes and corrected a wrong comment.
--
-- 4. A REASSIGNED BOOKING TAKES ITS DEBT WITH IT (C8). The trigger recomputes
--    BOTH client ids on an UPDATE. Without that the old client keeps a debt
--    that moved — discovered when somebody is chased for it.
--
-- 5. THE HELPER IS NOT A PUBLIC API (C9). It answers "how much does this person
--    owe" without asking whether the caller may see their bookings.
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
  ('00000000-0000-0000-0000-000000200001', 'cb-owner@example.invalid'),
  ('00000000-0000-0000-0000-000000200002', 'cb-retail@example.invalid'),
  ('00000000-0000-0000-0000-000000200003', 'cb-super@example.invalid')
on conflict (id) do nothing;

insert into public.profiles (id, email, full_name) values
  ('00000000-0000-0000-0000-000000200001', 'cb-owner@example.invalid',  'Owner'),
  ('00000000-0000-0000-0000-000000200002', 'cb-retail@example.invalid', 'Retail'),
  ('00000000-0000-0000-0000-000000200003', 'cb-super@example.invalid',  'Supervisor')
on conflict (id) do update set full_name = excluded.full_name;

insert into public.orgs (id, name, slug) values
  ('00000000-0000-0000-0000-000000200010', 'CB Org', 'cb-org')
on conflict do nothing;

insert into public.facilities (id, org_id, name, slug, legacy_id) values
  ('00000000-0000-0000-0000-000000200020', '00000000-0000-0000-0000-000000200010',
   'CB Facility', 'cb-a', 'cb-a')
on conflict do nothing;

-- retail:     financial_take_payment, NO edit_clients
-- supervisor: edit_bookings, NO edit_clients — the case that needs the DEFINER
insert into public.facility_memberships (id, facility_id, profile_id, role, is_active) values
  ('00000000-0000-0000-0000-000000200030', '00000000-0000-0000-0000-000000200020',
   '00000000-0000-0000-0000-000000200001', 'owner', true),
  ('00000000-0000-0000-0000-000000200031', '00000000-0000-0000-0000-000000200020',
   '00000000-0000-0000-0000-000000200002', 'retail', true),
  ('00000000-0000-0000-0000-000000200032', '00000000-0000-0000-0000-000000200020',
   '00000000-0000-0000-0000-000000200003', 'supervisor', true)
on conflict (id) do nothing;

insert into public.clients (id, facility_id, name, email) values
  ('00000000-0000-0000-0000-000000200040', '00000000-0000-0000-0000-000000200020',
   'Debtor', 'cb-c1@example.invalid'),
  ('00000000-0000-0000-0000-000000200041', '00000000-0000-0000-0000-000000200020',
   'Other', 'cb-c2@example.invalid');

create or replace function pg_temp.as_user(p_uid uuid) returns void
language plpgsql as $$
begin
  perform set_config('request.jwt.claim.sub', p_uid::text, true);
end $$;

/** A booking in the given state. */
create or replace function pg_temp.bk(p_client uuid, p_status text, p_total numeric default 100)
returns uuid language plpgsql as $$
declare v_id uuid;
begin
  insert into public.bookings
    (facility_id, client_id, service, status, start_at, end_at,
     base_price, discount, total_cost)
  values
    ('00000000-0000-0000-0000-000000200020', p_client, 'daycare',
     p_status::public.booking_status,
     now() + interval '1 day', now() + interval '1 day 8 hours',
     p_total, 0, p_total)
  returning id into v_id;
  return v_id;
end $$;

create or replace function pg_temp.pay(p_booking uuid, p_client uuid, p_amount numeric)
returns void language plpgsql as $$
begin
  insert into public.payments
    (facility_id, booking_id, client_id, method, subtotal, tax, tip,
     store_credit_applied, package_pass_applied, loyalty_discount_applied,
     amount_charged, grand_total, cash_received, receipt_channels, author_name)
  values
    ('00000000-0000-0000-0000-000000200020', p_booking, p_client, 'cash',
     p_amount, 0, 0, 0, 0, 0, p_amount, p_amount, p_amount, '{}', 'Test');
end $$;

create or replace function pg_temp.bal(p_client uuid) returns numeric
language sql as $$
  select outstanding_balance from public.clients where id = p_client;
$$;

-- ── C1/C3: only DELIVERED bookings count ───────────────────────────────────
do $$
declare v_delivered numeric; v_after_others numeric;
begin
  perform pg_temp.as_user('00000000-0000-0000-0000-000000200001');
  set local role authenticated;
  perform pg_temp.bk('00000000-0000-0000-0000-000000200040', 'completed', 100);
  reset role;
  v_delivered := pg_temp.bal('00000000-0000-0000-0000-000000200040');

  -- $2,400 of bookings that are NOT delivered, on the same client.
  set local role authenticated;
  perform pg_temp.bk('00000000-0000-0000-0000-000000200040', 'confirmed',  500);
  perform pg_temp.bk('00000000-0000-0000-0000-000000200040', 'checked_in', 300);
  perform pg_temp.bk('00000000-0000-0000-0000-000000200040', 'cancelled',  900);
  perform pg_temp.bk('00000000-0000-0000-0000-000000200040', 'no_show',    700);
  reset role;
  v_after_others := pg_temp.bal('00000000-0000-0000-0000-000000200040');

  perform pg_temp.t('C1  a completed unpaid booking puts the client in debt',
    v_delivered = 100, format('balance=%s', v_delivered));
  perform pg_temp.t('C3  confirmed, checked_in, cancelled and no_show add nothing',
    v_after_others = 100,
    format('balance after $2,400 more of non-delivered=%s', v_after_others));
exception when others then
  reset role; perform pg_temp.t('C1  delivered only', false, sqlerrm);
end $$;

-- ── C2: paying it clears it ────────────────────────────────────────────────
do $$
declare v_b uuid; v_bal numeric;
begin
  perform pg_temp.as_user('00000000-0000-0000-0000-000000200001');
  set local role authenticated;
  v_b := pg_temp.bk('00000000-0000-0000-0000-000000200041', 'completed', 80);
  perform pg_temp.pay(v_b, '00000000-0000-0000-0000-000000200041', 80);
  reset role;
  v_bal := pg_temp.bal('00000000-0000-0000-0000-000000200041');
  perform pg_temp.t('C2  paying the booking clears the balance',
    v_bal = 0, format('balance=%s', v_bal));
exception when others then
  reset role; perform pg_temp.t('C2  paying clears', false, sqlerrm);
end $$;

-- ── C6: nobody sets it by hand, including the owner of the database ────────
do $$
declare v_bal numeric;
begin
  update public.clients set outstanding_balance = 0
   where id = '00000000-0000-0000-0000-000000200040';
  v_bal := pg_temp.bal('00000000-0000-0000-0000-000000200040');
  perform pg_temp.t('C6  postgres (BYPASSRLS) cannot zero a real debt',
    v_bal = 100, format('balance=%s', v_bal));
end $$;

-- ── C7: a cashier without edit_clients still moves the client ──────────────
do $$
declare v_b uuid; v_can_edit boolean; v_bal numeric;
begin
  perform pg_temp.as_user('00000000-0000-0000-0000-000000200001');
  set local role authenticated;
  v_b := pg_temp.bk('00000000-0000-0000-0000-000000200041', 'completed', 60);
  reset role;

  perform pg_temp.as_user('00000000-0000-0000-0000-000000200002');
  set local role authenticated;
  v_can_edit := private.has_permission(
    '00000000-0000-0000-0000-000000200020', 'edit_clients');
  perform pg_temp.pay(v_b, '00000000-0000-0000-0000-000000200041', 60);
  reset role;
  v_bal := pg_temp.bal('00000000-0000-0000-0000-000000200041');

  perform pg_temp.t('C7  retail cannot edit clients (the precondition)',
    v_can_edit = false, format('edit_clients=%s', v_can_edit));
  perform pg_temp.t('C7b and retail settling a booking still clears the balance',
    v_bal = 0, format('balance=%s', v_bal));
exception when others then
  reset role; perform pg_temp.t('C7  cashier', false, sqlerrm);
end $$;

-- ── C7c: the case the DEFINER actually exists for ──────────────────────────
--
-- Paying goes through `payment_moves_the_booking`, which is DEFINER, so this
-- trigger inherits postgres and would work as INVOKER too. Marking a booking
-- COMPLETED by hand has no definer anywhere in the chain, and `supervisor`
-- holds `edit_bookings` without `edit_clients`. As INVOKER that fails twice —
-- loudly on the helper's EXECUTE, then SILENTLY on the clients UPDATE once the
-- helper is granted. See the header of 20260806780000.
do $$
declare v_b uuid; v_can_edit boolean; v_bal numeric;
begin
  perform pg_temp.as_user('00000000-0000-0000-0000-000000200001');
  set local role authenticated;
  v_b := pg_temp.bk('00000000-0000-0000-0000-000000200041', 'checked_in', 120);
  reset role;

  perform pg_temp.as_user('00000000-0000-0000-0000-000000200003');
  set local role authenticated;
  v_can_edit := private.has_permission(
    '00000000-0000-0000-0000-000000200020', 'edit_clients');
  update public.bookings set status = 'completed' where id = v_b;
  reset role;
  v_bal := pg_temp.bal('00000000-0000-0000-0000-000000200041');

  perform pg_temp.t('C7c a supervisor cannot edit clients (the precondition)',
    v_can_edit = false, format('edit_clients=%s', v_can_edit));
  perform pg_temp.t('C7d and completing a booking by hand still bills the client',
    v_bal = 120, format('balance=%s', v_bal));
exception when others then
  reset role; perform pg_temp.t('C7c completing by hand', false, sqlerrm);
end $$;

-- ── C8: a reassigned booking takes its debt with it ────────────────────────
do $$
declare v_b uuid; v_from numeric; v_to numeric;
begin
  perform pg_temp.as_user('00000000-0000-0000-0000-000000200001');
  set local role authenticated;
  v_b := pg_temp.bk('00000000-0000-0000-0000-000000200041', 'completed', 45);
  update public.bookings
     set client_id = '00000000-0000-0000-0000-000000200040' where id = v_b;
  reset role;

  v_from := pg_temp.bal('00000000-0000-0000-0000-000000200041');
  v_to   := pg_temp.bal('00000000-0000-0000-0000-000000200040');
  perform pg_temp.t('C8  the debt follows the booking, and does not stay behind',
    v_from = 120 and v_to = 145,
    format('old client=%s new client=%s', v_from, v_to));
exception when others then
  reset role; perform pg_temp.t('C8  reassignment', false, sqlerrm);
end $$;

-- ── C9: the helper is not callable ─────────────────────────────────────────
do $$
declare v_ok boolean;
begin
  v_ok := has_function_privilege(
    'authenticated', 'private.client_outstanding_balance(uuid)', 'execute');
  perform pg_temp.t('C9  client_outstanding_balance is granted to nobody',
    v_ok = false, format('authenticated can execute=%s', v_ok));
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
