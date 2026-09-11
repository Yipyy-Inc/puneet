-- ============================================================================
-- Retail is rows: products, stock, sales, purchase orders (20260911180840).
--
--   psql "$SUPABASE_DB_URL" -f supabase/tests/retail.sql
--
-- One transaction, rolled back. Impersonated through request.jwt.claims and
-- `set local role`, never the connection's own role, which bypasses RLS.
--
--   R1  the owner creates a product; its opening count is on the ledger
--   R2  an edit cannot move the count
--   R3  reception, who sells, can neither make a product nor adjust stock
--   R4  a cash sale of three takes three off the shelf and records the money
--   R5  a sale its payments do not meet leaves nothing behind
--   R6  a variant's count moves, not the product's
--   R7  a retail promo code comes off and its use is the sale's;
--       a grooming code is refused at the till
--   R8  receiving a purchase order moves stock and its status
--   R9  a sale is not edited
--   R10 anon holds nothing
-- ============================================================================

begin;

set local client_min_messages to warning;

create temp table tap (n serial, name text, ok boolean, detail text);
grant all on tap to authenticated, anon;

create or replace function pg_temp.t(p_name text, p_ok boolean, p_detail text default '')
returns void language sql as $$
  insert into tap(name, ok, detail) values (p_name, p_ok, p_detail);
$$;

create or replace function pg_temp.as_user(p_uid uuid) returns void
language plpgsql as $$
begin
  perform set_config('request.jwt.claims',
    json_build_object('sub', p_uid::text, 'role', 'authenticated')::text, true);
end $$;

create temp table state (key text primary key, value text);
grant all on state to authenticated, anon;

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000002c9001', 'rt-owner@example.invalid'),
  ('00000000-0000-0000-0000-0000002c9002', 'rt-recep@example.invalid')
on conflict (id) do nothing;

insert into public.profiles (id, email, full_name) values
  ('00000000-0000-0000-0000-0000002c9001', 'rt-owner@example.invalid', 'RT Owner'),
  ('00000000-0000-0000-0000-0000002c9002', 'rt-recep@example.invalid', 'RT Reception')
on conflict (id) do update set full_name = excluded.full_name;

insert into public.orgs (id, name, slug) values
  ('00000000-0000-0000-0000-0000002c9010', 'RT Org', 'rt-org')
on conflict do nothing;

insert into public.facilities (id, org_id, name, slug, legacy_id) values
  ('00000000-0000-0000-0000-0000002c9020', '00000000-0000-0000-0000-0000002c9010',
   'RT Facility', 'rt-fac', 'rt-fac')
on conflict do nothing;

insert into public.facility_memberships (id, facility_id, profile_id, role, is_active) values
  ('00000000-0000-0000-0000-0000002c9030', '00000000-0000-0000-0000-0000002c9020',
   '00000000-0000-0000-0000-0000002c9001', 'owner', true),
  ('00000000-0000-0000-0000-0000002c9031', '00000000-0000-0000-0000-0000002c9020',
   '00000000-0000-0000-0000-0000002c9002', 'reception', true)
on conflict (id) do nothing;

-- Reception sells and takes the money, and nothing else.
delete from public.membership_permissions
 where membership_id = '00000000-0000-0000-0000-0000002c9031';
insert into public.membership_permissions (membership_id, permission_key, scope) values
  ('00000000-0000-0000-0000-0000002c9031', 'retail_process_sale', 'anytime'),
  ('00000000-0000-0000-0000-0000002c9031', 'financial_take_payment', 'anytime');

insert into public.clients (id, facility_id, name, email) values
  ('00000000-0000-0000-0000-0000002c9040', '00000000-0000-0000-0000-0000002c9020',
   'RT Household', 'rt-c1@example.invalid');

-- ── R1: a product, and its opening count ────────────────────────────────────
do $$
begin
  perform pg_temp.as_user('00000000-0000-0000-0000-0000002c9001');
  set local role authenticated;
  insert into public.retail_products (facility_id, name, sku, base_price, stock)
  values ('00000000-0000-0000-0000-0000002c9020', 'RT Kibble', 'RT-KIB', 24.99, 10);
  insert into public.retail_products (facility_id, name, sku, base_price, variants)
  values ('00000000-0000-0000-0000-0000002c9020', 'RT Collar', 'RT-COL', 18, '[
    {"id": "small", "name": "Small", "stock": 5},
    {"id": "large", "name": "Large", "stock": 4}]');
  reset role;
exception when others then
  reset role; perform pg_temp.t('R1  owner creates', false, sqlerrm);
end $$;

do $$
declare v_id uuid; v_stock integer; v_opening integer;
begin
  select id, stock into v_id, v_stock from public.retail_products where sku = 'RT-KIB';
  select coalesce(sum(delta), 0) into v_opening from public.retail_stock_movements
   where product_id = v_id and reason = 'opening';
  insert into state values ('kibble', v_id::text);
  insert into state select 'collar', id::text from public.retail_products where sku = 'RT-COL';
  perform pg_temp.t('R1  the opening count is on the ledger, and not twice',
    v_stock = 10 and v_opening = 10, format('stock=%s opening=%s', v_stock, v_opening));
end $$;

-- ── R2: an edit cannot move the count ───────────────────────────────────────
do $$
declare v_id uuid; v_stock integer; v_name text;
begin
  select value::uuid into v_id from state where key = 'kibble';
  perform pg_temp.as_user('00000000-0000-0000-0000-0000002c9001');
  set local role authenticated;
  update public.retail_products set stock = 99, name = 'RT Kibble 5 kg' where id = v_id;
  reset role;
  select stock, name into v_stock, v_name from public.retail_products where id = v_id;
  perform pg_temp.t('R2  an edit renames but cannot move the count',
    v_stock = 10 and v_name = 'RT Kibble 5 kg', format('stock=%s', v_stock));
exception when others then
  reset role; perform pg_temp.t('R2  edit', false, sqlerrm);
end $$;

-- ── R3: reception neither makes products nor adjusts stock ─────────────────
do $$
declare v_id uuid; v_make boolean; v_adjust boolean;
begin
  select value::uuid into v_id from state where key = 'kibble';
  perform pg_temp.as_user('00000000-0000-0000-0000-0000002c9002');
  set local role authenticated;
  begin
    insert into public.retail_products (facility_id, name)
    values ('00000000-0000-0000-0000-0000002c9020', 'RT Mine');
    v_make := false;
  exception when insufficient_privilege then v_make := true; end;
  begin
    insert into public.retail_stock_movements (facility_id, product_id, delta, reason)
    values ('00000000-0000-0000-0000-0000002c9020', v_id, 50, 'adjustment');
    v_adjust := false;
  exception when insufficient_privilege then v_adjust := true; end;
  reset role;
  perform pg_temp.t('R3  reception can neither make a product nor adjust stock',
    v_make and v_adjust, format('make=%s adjust=%s', v_make, v_adjust));
end $$;

-- ── R4: a cash sale ─────────────────────────────────────────────────────────
do $$
declare v_id uuid; v_out jsonb; v_stock integer; v_pay record;
begin
  select value::uuid into v_id from state where key = 'kibble';
  perform pg_temp.as_user('00000000-0000-0000-0000-0000002c9002');
  set local role authenticated;
  v_out := public.record_retail_sale(
    p_facility_id => '00000000-0000-0000-0000-0000002c9020',
    p_items => jsonb_build_array(jsonb_build_object(
      'productId', v_id, 'name', 'RT Kibble', 'quantity', 3, 'unitPrice', 24.99, 'total', 74.97)),
    p_subtotal => 74.97, p_discount => 0, p_tax => 3.75, p_tip => 0, p_total => 78.72,
    p_tender => 'cash',
    p_client_id => '00000000-0000-0000-0000-0000002c9040',
    p_payments => '[{"method": "cash", "amount": 78.72, "cashReceived": 80}]');
  reset role;
  insert into state values ('sale', v_out->>'saleId');
  select stock into v_stock from public.retail_products where id = v_id;
  select method, grand_total, booking_id, cash_received into v_pay
    from public.payments where id = (v_out->'paymentIds'->>0)::uuid;
  perform pg_temp.t('R4  a cash sale takes three off and records the money',
    v_stock = 7 and v_pay.method = 'cash' and v_pay.grand_total = 78.72
      and v_pay.booking_id is null and v_pay.cash_received = 80,
    format('stock=%s pay=%s', v_stock, v_pay));
exception when others then
  reset role; perform pg_temp.t('R4  cash sale', false, sqlerrm);
end $$;

-- ── R5: an unpaid sale leaves nothing ───────────────────────────────────────
do $$
declare v_id uuid; v_raised text; v_stock integer; v_sales integer;
begin
  select value::uuid into v_id from state where key = 'kibble';
  perform pg_temp.as_user('00000000-0000-0000-0000-0000002c9002');
  set local role authenticated;
  begin
    perform public.record_retail_sale(
      p_facility_id => '00000000-0000-0000-0000-0000002c9020',
      p_items => jsonb_build_array(jsonb_build_object(
        'productId', v_id, 'name', 'RT Kibble', 'quantity', 2, 'unitPrice', 24.99)),
      p_subtotal => 49.98, p_discount => 0, p_tax => 0, p_tip => 0, p_total => 49.98,
      p_tender => 'cash',
      p_payments => '[{"method": "cash", "amount": 20}]');
    v_raised := 'no';
  exception when others then
    get stacked diagnostics v_raised = pg_exception_hint;
  end;
  reset role;
  select stock into v_stock from public.retail_products where id = v_id;
  select count(*) into v_sales from public.retail_sales
   where facility_id = '00000000-0000-0000-0000-0000002c9020';
  perform pg_temp.t('R5  a sale its payments do not meet is refused, and leaves nothing',
    v_raised = 'sale_unpaid' and v_stock = 7 and v_sales = 1,
    format('hint=%s stock=%s sales=%s', v_raised, v_stock, v_sales));
end $$;

-- ── R6: a variant's count moves ─────────────────────────────────────────────
do $$
declare v_id uuid; v_small integer; v_large integer; v_stock integer;
begin
  select value::uuid into v_id from state where key = 'collar';
  perform pg_temp.as_user('00000000-0000-0000-0000-0000002c9002');
  set local role authenticated;
  perform public.record_retail_sale(
    p_facility_id => '00000000-0000-0000-0000-0000002c9020',
    p_items => jsonb_build_array(jsonb_build_object(
      'productId', v_id, 'variantId', 'small', 'name', 'RT Collar', 'quantity', 2, 'unitPrice', 18)),
    p_subtotal => 36, p_discount => 0, p_tax => 0, p_tip => 0, p_total => 36,
    p_tender => 'e-transfer',
    p_payments => '[{"method": "e-transfer", "amount": 36}]');
  reset role;
  select stock,
         (select (v->>'stock')::integer from jsonb_array_elements(variants) v where v->>'id' = 'small'),
         (select (v->>'stock')::integer from jsonb_array_elements(variants) v where v->>'id' = 'large')
    into v_stock, v_small, v_large
    from public.retail_products where id = v_id;
  perform pg_temp.t('R6  selling two small collars moves the small count only',
    v_small = 3 and v_large = 4 and v_stock = 0,
    format('small=%s large=%s stock=%s', v_small, v_large, v_stock));
exception when others then
  reset role; perform pg_temp.t('R6  variant sale', false, sqlerrm);
end $$;

-- ── R7: a promo code at the till ────────────────────────────────────────────
do $$
declare v_id uuid; v_out jsonb; v_use record; v_wrong text;
begin
  select value::uuid into v_id from state where key = 'kibble';
  perform pg_temp.as_user('00000000-0000-0000-0000-0000002c9001');
  set local role authenticated;
  insert into public.promo_codes (facility_id, code, discount_type, discount_value, applies_to)
  values ('00000000-0000-0000-0000-0000002c9020', 'RTSHOP10', 'percentage', 10, '{retail}'),
         ('00000000-0000-0000-0000-0000002c9020', 'RTGROOM', 'fixed', 5, '{grooming}');
  reset role;

  perform pg_temp.as_user('00000000-0000-0000-0000-0000002c9002');
  set local role authenticated;
  v_out := public.record_retail_sale(
    p_facility_id => '00000000-0000-0000-0000-0000002c9020',
    p_items => jsonb_build_array(jsonb_build_object(
      'productId', v_id, 'name', 'RT Kibble', 'quantity', 1, 'unitPrice', 25)),
    p_subtotal => 25, p_discount => 2.5, p_tax => 0, p_tip => 0, p_total => 22.5,
    p_tender => 'cash', p_promo_code => 'rtshop10',
    p_payments => '[{"method": "cash", "amount": 22.5}]');
  begin
    perform public.record_retail_sale(
      p_facility_id => '00000000-0000-0000-0000-0000002c9020',
      p_items => jsonb_build_array(jsonb_build_object(
        'productId', v_id, 'name', 'RT Kibble', 'quantity', 1, 'unitPrice', 25)),
      p_subtotal => 25, p_discount => 5, p_tax => 0, p_tip => 0, p_total => 20,
      p_tender => 'cash', p_promo_code => 'RTGROOM',
      p_payments => '[{"method": "cash", "amount": 20}]');
    v_wrong := 'no';
  exception when others then
    get stacked diagnostics v_wrong = pg_exception_hint;
  end;
  reset role;
  select code, amount, retail_sale_id into v_use from public.promo_code_redemptions
   where retail_sale_id = (v_out->>'saleId')::uuid;
  perform pg_temp.t('R7  a retail code comes off, and its use belongs to the sale',
    (v_out->>'promoAmount')::numeric = 2.5 and v_use.code = 'RTSHOP10' and v_use.amount = 2.5,
    format('out=%s use=%s', v_out, v_use));
  perform pg_temp.t('R7  a grooming code is refused at the till',
    v_wrong = 'promo_wrong_service', format('hint=%s', v_wrong));
exception when others then
  reset role; perform pg_temp.t('R7  promo at the till', false, sqlerrm);
end $$;

-- ── R8: receiving a purchase order ──────────────────────────────────────────
do $$
declare v_id uuid; v_po uuid; v_first jsonb; v_second jsonb; v_stock integer;
begin
  select value::uuid into v_id from state where key = 'kibble';
  perform pg_temp.as_user('00000000-0000-0000-0000-0000002c9001');
  set local role authenticated;
  insert into public.retail_purchase_orders (facility_id, supplier_name, status, items)
  values ('00000000-0000-0000-0000-0000002c9020', 'RT Supplies', 'ordered',
          jsonb_build_array(jsonb_build_object('productId', v_id, 'productName', 'RT Kibble',
                                               'quantity', 12, 'unitCost', 14)))
  returning id into v_po;
  v_first := public.receive_purchase_order(v_po, '[{"index": 0, "quantity": 5}]');
  v_second := public.receive_purchase_order(v_po, '[{"index": 0, "quantity": 7, "unitCost": 13.5}]');
  reset role;
  select stock into v_stock from public.retail_products where id = v_id;
  perform pg_temp.t('R8  receiving moves stock, and the order goes partial then received',
    v_first->>'status' = 'partial' and v_second->>'status' = 'received'
      and v_stock = 6 + 12,
    format('first=%s second=%s stock=%s', v_first->>'status', v_second->>'status', v_stock));
exception when others then
  reset role; perform pg_temp.t('R8  receiving', false, sqlerrm);
end $$;

-- ── R9: a sale is not edited ────────────────────────────────────────────────
do $$
declare v_sale uuid; v_raised boolean;
begin
  select value::uuid into v_sale from state where key = 'sale';
  perform pg_temp.as_user('00000000-0000-0000-0000-0000002c9001');
  set local role authenticated;
  begin
    update public.retail_sales set total = 1 where id = v_sale;
    v_raised := false;
  exception when insufficient_privilege then v_raised := true; end;
  reset role;
  perform pg_temp.t('R9  a sale''s money is not edited', v_raised,
    format('raised=%s', v_raised));
end $$;

-- ── R10: anon holds nothing ─────────────────────────────────────────────────
do $$
begin
  perform pg_temp.t('R10 anon cannot record a sale, quote a code or receive an order',
    not has_function_privilege('anon', 'public.record_retail_sale(uuid, jsonb, numeric, numeric, numeric, numeric, numeric, text, uuid, uuid[], jsonb, text, text, text)', 'execute')
      and not has_function_privilege('anon', 'public.quote_promo_code(uuid, text, uuid, text, numeric, boolean)', 'execute')
      and not has_function_privilege('anon', 'public.receive_purchase_order(uuid, jsonb, text)', 'execute'));
  perform pg_temp.t('R10 anon reads no retail table',
    not has_table_privilege('anon', 'public.retail_products', 'select')
      and not has_table_privilege('anon', 'public.retail_sales', 'select')
      and not has_table_privilege('anon', 'public.retail_stock_movements', 'select')
      and not has_table_privilege('anon', 'public.retail_suppliers', 'select')
      and not has_table_privilege('anon', 'public.retail_purchase_orders', 'select'));
end $$;

select case when ok then '  PASS  ' else '> FAIL <' end as result, name, detail
  from tap order by n;

select count(*) filter (where ok) || ' passed, '
    || count(*) filter (where not ok) || ' failed' as summary
  from tap;

rollback;
