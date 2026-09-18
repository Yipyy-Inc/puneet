-- ============================================================================
-- The database no longer trusts the till with two money facts.
--
-- Found 2026-09-18 while wiring the POS's fake buttons to real ones. Both the
-- store-credit ledger and the retail sale took whatever the caller sent, and
-- `authenticated` can INSERT into both tables directly, so a check inside
-- `record_payment` / `record_retail_sale` alone would have been a fence with a
-- gate beside it. Both guards are therefore on the TABLES:
--
--   S  store_credit_entries  a spend that would take a client's balance below
--                            zero is refused — by anyone, service role included.
--                            The balance is a sum; nothing refused a negative sum.
--   D  retail_sales          a MANUAL discount needs retail_apply_discount.
--                            Checked at COMMIT (a deferred constraint trigger),
--                            because a promo code's discount is written after the
--                            sale, as a redemption row, and must not count as
--                            manual. Every file here rolls back, so each D test
--                            forces the check with SET CONSTRAINTS ALL IMMEDIATE.
--
-- No built-in role can take a sale without also being able to discount
-- (measured: owner, admin, manager, supervisor, reception and retail all hold
-- both), so the cashier here has retail_apply_discount REMOVED through a
-- membership_permissions override — the way a facility actually does it.
-- ============================================================================

begin;

set local client_min_messages to warning;

create temp table tap (n serial, name text, ok boolean, detail text);
grant all on tap to authenticated, service_role;

create or replace function pg_temp.t(p_name text, p_ok boolean, p_detail text default '')
returns void language sql as $$
  insert into tap(name, ok, detail) values (p_name, p_ok, p_detail);
$$;

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000003d7001', 'trust-owner@example.invalid'),
  ('00000000-0000-0000-0000-0000003d7002', 'trust-cashier@example.invalid')
on conflict (id) do nothing;

insert into public.profiles (id, email, full_name) values
  ('00000000-0000-0000-0000-0000003d7001', 'trust-owner@example.invalid',   'Owner'),
  ('00000000-0000-0000-0000-0000003d7002', 'trust-cashier@example.invalid', 'Cashier')
on conflict (id) do update set full_name = excluded.full_name;

insert into public.orgs (id, name, slug) values
  ('00000000-0000-0000-0000-0000003d7010', 'Trust Org', 'trust-org')
on conflict do nothing;

insert into public.facilities (id, org_id, name, slug, legacy_id) values
  ('00000000-0000-0000-0000-0000003d7020', '00000000-0000-0000-0000-0000003d7010',
   'Trust Facility', 'trust-a', 'trust-a')
on conflict do nothing;

insert into public.facility_memberships (id, facility_id, profile_id, role, is_active) values
  ('00000000-0000-0000-0000-0000003d7030', '00000000-0000-0000-0000-0000003d7020',
   '00000000-0000-0000-0000-0000003d7001', 'owner', true),
  ('00000000-0000-0000-0000-0000003d7031', '00000000-0000-0000-0000-0000003d7020',
   '00000000-0000-0000-0000-0000003d7002', 'retail', true)
on conflict (id) do nothing;

-- The cashier may take a sale but not discount one.
insert into public.membership_permissions (membership_id, permission_key, scope) values
  ('00000000-0000-0000-0000-0000003d7031', 'retail_apply_discount', 'none');

insert into public.clients (id, facility_id, name, email) values
  ('00000000-0000-0000-0000-0000003d7040', '00000000-0000-0000-0000-0000003d7020',
   'Credit Holder', 'trust-c1@example.invalid');

insert into public.promo_codes (id, facility_id, code, discount_type, discount_value,
                                applies_to, is_active) values
  ('00000000-0000-0000-0000-0000003d7050', '00000000-0000-0000-0000-0000003d7020',
   'TRUST5', 'fixed', 5, '{retail}', true);

create or replace function pg_temp.as_user(p_uid uuid) returns void
language plpgsql as $$
begin
  perform set_config('request.jwt.claims',
    json_build_object('sub', p_uid::text, 'role', 'authenticated')::text, true);
end $$;

create or replace function pg_temp.balance() returns numeric
language sql as $$
  select coalesce(sum(amount), 0) from public.store_credit_entries
   where client_id = '00000000-0000-0000-0000-0000003d7040';
$$;

-- ── P: the preconditions the D tests depend on ─────────────────────────────
do $$
declare v_sale boolean; v_disc boolean;
begin
  perform pg_temp.as_user('00000000-0000-0000-0000-0000003d7002');
  v_sale := private.has_permission('00000000-0000-0000-0000-0000003d7020', 'retail_process_sale');
  v_disc := private.has_permission('00000000-0000-0000-0000-0000003d7020', 'retail_apply_discount');
  perform pg_temp.t('P1  the cashier can take a sale but cannot discount one',
    v_sale and not v_disc, format('sale=%s discount=%s', v_sale, v_disc));
end $$;

-- ── S: the store-credit balance never goes below zero ──────────────────────
do $$
begin
  perform pg_temp.as_user('00000000-0000-0000-0000-0000003d7001');
  set local role authenticated;
  insert into public.store_credit_entries (facility_id, client_id, amount, reason)
  values ('00000000-0000-0000-0000-0000003d7020', '00000000-0000-0000-0000-0000003d7040',
          50, 'added');
  insert into public.store_credit_entries (facility_id, client_id, amount, reason)
  values ('00000000-0000-0000-0000-0000003d7020', '00000000-0000-0000-0000-0000003d7040',
          -20, 'redeemed');
  reset role;
  perform pg_temp.t('S1  a spend within the balance is taken',
    pg_temp.balance() = 30, format('balance=%s', pg_temp.balance()));
exception when others then
  reset role; perform pg_temp.t('S1  a spend within the balance is taken', false, sqlerrm);
end $$;

do $$
declare v_hint text := 'accepted';
begin
  perform pg_temp.as_user('00000000-0000-0000-0000-0000003d7001');
  set local role authenticated;
  begin
    insert into public.store_credit_entries (facility_id, client_id, amount, reason)
    values ('00000000-0000-0000-0000-0000003d7020', '00000000-0000-0000-0000-0000003d7040',
            -30.01, 'redeemed');
  exception when check_violation then
    get stacked diagnostics v_hint = pg_exception_hint;
  end;
  reset role;
  perform pg_temp.t('S2  a spend of one cent more than the balance is refused',
    v_hint = 'store_credit_insufficient' and pg_temp.balance() = 30,
    format('hint=%s balance=%s', v_hint, pg_temp.balance()));
end $$;

do $$
begin
  perform pg_temp.as_user('00000000-0000-0000-0000-0000003d7001');
  set local role authenticated;
  insert into public.store_credit_entries (facility_id, client_id, amount, reason)
  values ('00000000-0000-0000-0000-0000003d7020', '00000000-0000-0000-0000-0000003d7040',
          -30, 'redeemed');
  reset role;
  perform pg_temp.t('S3  the balance can be spent to exactly zero',
    pg_temp.balance() = 0, format('balance=%s', pg_temp.balance()));
exception when others then
  reset role; perform pg_temp.t('S3  the balance can be spent to exactly zero', false, sqlerrm);
end $$;

-- The real path: a store-credit payment through record_payment, at zero balance.
do $$
declare v_hint text := 'accepted';
begin
  perform pg_temp.as_user('00000000-0000-0000-0000-0000003d7001');
  set local role authenticated;
  begin
    perform public.record_payment(
      p_facility_id => '00000000-0000-0000-0000-0000003d7020',
      p_method => 'store-credit',
      p_subtotal => 10, p_tax => 0, p_tip => 0,
      p_amount_charged => 0, p_grand_total => 10,
      p_client_id => '00000000-0000-0000-0000-0000003d7040',
      p_store_credit_applied => 10);
  exception when check_violation then
    get stacked diagnostics v_hint = pg_exception_hint;
  end;
  reset role;
  perform pg_temp.t('S4  record_payment cannot spend credit the client does not have',
    v_hint = 'store_credit_insufficient' and pg_temp.balance() = 0,
    format('hint=%s balance=%s', v_hint, pg_temp.balance()));
end $$;

-- No exemption: the server key cannot overdraw a client either.
do $$
declare v_hint text := 'accepted';
begin
  set local role service_role;
  begin
    insert into public.store_credit_entries (facility_id, client_id, amount, reason)
    values ('00000000-0000-0000-0000-0000003d7020', '00000000-0000-0000-0000-0000003d7040',
            -1, 'redeemed');
  exception when check_violation then
    get stacked diagnostics v_hint = pg_exception_hint;
  end;
  reset role;
  perform pg_temp.t('S5  the service role cannot overdraw a client either',
    v_hint = 'store_credit_insufficient', format('hint=%s', v_hint));
end $$;

-- ── D: a manual discount needs retail_apply_discount ───────────────────────
--
-- One helper per sale shape. A fee-like line with no productId keeps the tests
-- off the product catalogue — and proves such a line records at all (F1).

create or replace function pg_temp.sale(p_discount numeric, p_promo text default null)
returns jsonb language plpgsql as $$
declare v_total numeric := 40 - p_discount;
begin
  return public.record_retail_sale(
    p_facility_id => '00000000-0000-0000-0000-0000003d7020',
    p_items => jsonb_build_array(jsonb_build_object(
      'name', 'Special order', 'quantity', 1, 'unitPrice', 40, 'total', 40)),
    p_subtotal => 40, p_discount => p_discount, p_tax => 0, p_tip => 0,
    p_total => v_total,
    p_tender => 'cash',
    p_client_id => '00000000-0000-0000-0000-0000003d7040',
    p_payments => jsonb_build_array(jsonb_build_object(
      'method', 'cash', 'amount', v_total, 'cashReceived', v_total)),
    p_promo_code => p_promo);
end $$;

do $$
declare v_out jsonb; v_moves integer;
begin
  perform pg_temp.as_user('00000000-0000-0000-0000-0000003d7002');
  set local role authenticated;
  v_out := pg_temp.sale(0);
  set constraints all immediate;
  set constraints all deferred;
  reset role;
  select count(*) into v_moves from public.retail_stock_movements
   where sale_id = (v_out->>'saleId')::uuid;
  perform pg_temp.t('D1  the cashier can take an undiscounted sale',
    v_out ? 'saleId', format('sale=%s', v_out->>'saleId'));
  perform pg_temp.t('F1  a line with no product records, with no stock movement',
    v_moves = 0, format('stock movements=%s', v_moves));
exception when others then
  reset role; perform pg_temp.t('D1  the cashier can take an undiscounted sale', false, sqlerrm);
end $$;

do $$
declare v_hint text := 'accepted';
begin
  perform pg_temp.as_user('00000000-0000-0000-0000-0000003d7002');
  set local role authenticated;
  begin
    perform pg_temp.sale(10);
    set constraints all immediate;
  exception when insufficient_privilege then
    get stacked diagnostics v_hint = pg_exception_hint;
  end;
  set constraints all deferred;
  reset role;
  perform pg_temp.t('D2  the cashier cannot give a manual discount',
    v_hint = 'discount_not_permitted', format('hint=%s', v_hint));
end $$;

do $$
declare v_out jsonb;
begin
  perform pg_temp.as_user('00000000-0000-0000-0000-0000003d7002');
  set local role authenticated;
  v_out := pg_temp.sale(5, 'TRUST5');
  set constraints all immediate;
  set constraints all deferred;
  reset role;
  perform pg_temp.t('D3  the cashier CAN ring up a promo code — its discount is not manual',
    (v_out->>'promoAmount')::numeric = 5, format('promoAmount=%s', v_out->>'promoAmount'));
exception when others then
  reset role; perform pg_temp.t('D3  the cashier can ring up a promo code', false, sqlerrm);
end $$;

do $$
declare v_hint text := 'accepted';
begin
  perform pg_temp.as_user('00000000-0000-0000-0000-0000003d7002');
  set local role authenticated;
  begin
    perform pg_temp.sale(15, 'TRUST5');   -- $5 promo + $10 nobody allowed
    set constraints all immediate;
  exception when insufficient_privilege then
    get stacked diagnostics v_hint = pg_exception_hint;
  end;
  set constraints all deferred;
  reset role;
  perform pg_temp.t('D4  a promo code cannot carry a manual discount in with it',
    v_hint = 'discount_not_permitted', format('hint=%s', v_hint));
end $$;

do $$
declare v_out jsonb;
begin
  perform pg_temp.as_user('00000000-0000-0000-0000-0000003d7001');
  set local role authenticated;
  v_out := pg_temp.sale(10);
  set constraints all immediate;
  set constraints all deferred;
  reset role;
  perform pg_temp.t('D5  the owner can give a manual discount',
    v_out ? 'saleId', format('sale=%s', v_out->>'saleId'));
exception when others then
  reset role; perform pg_temp.t('D5  the owner can give a manual discount', false, sqlerrm);
end $$;

-- ── G: the guard functions are not callable by anyone ─────────────────────
do $$
declare v_bad text := '';
begin
  if has_function_privilege('anon', 'private.store_credit_never_overdrawn()', 'execute') then
    v_bad := v_bad || 'anon:overdrawn '; end if;
  if has_function_privilege('authenticated', 'private.store_credit_never_overdrawn()', 'execute') then
    v_bad := v_bad || 'authenticated:overdrawn '; end if;
  if has_function_privilege('anon', 'private.retail_sale_discount_is_permitted()', 'execute') then
    v_bad := v_bad || 'anon:discount '; end if;
  if has_function_privilege('authenticated', 'private.retail_sale_discount_is_permitted()', 'execute') then
    v_bad := v_bad || 'authenticated:discount '; end if;
  perform pg_temp.t('G1  neither guard is executable by anon or authenticated',
    v_bad = '', coalesce(nullif(v_bad, ''), 'none'));
exception when others then
  perform pg_temp.t('G1  neither guard is executable by anon or authenticated', false, sqlerrm);
end $$;

select case when ok then '  PASS  ' else '> FAIL <' end as result, name, detail
  from tap order by n;

select count(*) filter (where ok) || ' passed, '
    || count(*) filter (where not ok) || ' failed' as summary
  from tap;

rollback;
