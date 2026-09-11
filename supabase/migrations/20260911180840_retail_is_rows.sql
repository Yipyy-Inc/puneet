-- ============================================================================
-- Retail is rows: products, their stock, suppliers, purchase orders, sales.
--
-- ── WHAT IT REPLACES ──────────────────────────────────────────────────────
--
-- Every retail screen read `@/data/retail`: thirteen products, five
-- suppliers, four purchase orders, six sales, all in module memory. A product
-- created on the Products tab never reached the till; the till's cash sale
-- wrote nothing to the database (only a card charge did, through
-- record_clover_payment); stock was never taken off; an adjustment was a
-- no-op; a purchase order's Create and a supplier's Save did nothing; the
-- receiving screen changed the fixture and threw the new status away.
--
-- ── STOCK IS A LEDGER ─────────────────────────────────────────────────────
--
-- `retail_stock_movements` is every change to a count — a sale, a return, a
-- delivery received, an adjustment, the opening count. Inserting one moves
-- the product's `stock` (or the variant's, inside `variants`) through a
-- trigger, and an UPDATE of the product cannot move either directly: the
-- guard puts them back. So the number on the shelf label and the history
-- beside it cannot disagree. A product's opening count is written as an
-- `opening` movement when the product is created, without moving it twice.
--
-- ── A SALE IS ONE TRANSACTION ─────────────────────────────────────────────
--
-- `record_retail_sale` writes the sale, takes each line off the shelf and
-- records the money — cash, e-transfer, store credit, a gift card — through
-- the same `record_payment` the booking checkout uses, all or nothing. A card
-- is charged BEFORE it (Clover writes that payment, record_clover_payment);
-- the sale then links it. The amounts must meet the total: a sale is never
-- recorded as paid when it was not.
--
-- A promo code at the till is checked by `quote_promo_code` — the same rules
-- as the booking checkout, for the service 'retail' — and its use recorded
-- against the sale (`promo_code_redemptions.retail_sale_id`).
--
-- ── WHO (the role editor's retail keys, until now consulted by nothing) ───
--
--   products      read: staff; write: retail_manage_products
--   suppliers     read: staff; write: retail_manage_suppliers
--   POs           read: staff; write: retail_manage_suppliers;
--                 received through receive_purchase_order (retail_manage_inventory)
--   movements     read: staff; insert: retail_manage_inventory, or
--                 retail_process_sale for a sale or a return; never edited
--   sales         read: staff and the client it was sold to;
--                 written through record_retail_sale (retail_process_sale)
-- ============================================================================

-- ── Products ───────────────────────────────────────────────────────────────

create table if not exists public.retail_products (
  id uuid primary key default gen_random_uuid(),
  facility_id uuid not null references public.facilities(id) on delete cascade,
  name text not null check (length(btrim(name)) between 1 and 200),
  sku text not null default '',
  barcode text not null default '',
  category text not null default '',
  brand text not null default '',
  description text not null default '',
  base_price numeric(10, 2) not null default 0 check (base_price >= 0),
  cost_price numeric(10, 2) not null default 0 check (cost_price >= 0),
  stock integer not null default 0,
  min_stock integer not null default 0 check (min_stock >= 0),
  max_stock integer check (max_stock is null or max_stock >= 0),
  taxable boolean not null default true,
  status text not null default 'active'
    check (status in ('active', 'inactive', 'discontinued')),
  -- [{id, name, sku, barcode, price, costPrice, stock, minStock, ...}]
  variants jsonb not null default '[]'::jsonb check (jsonb_typeof(variants) = 'array'),
  -- The editor's long tail: tags, image, pricing method, packaging, online.
  detail jsonb not null default '{}'::jsonb check (jsonb_typeof(detail) = 'object'),
  created_by text default (auth.jwt()->>'sub'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists retail_products_sku_once
  on public.retail_products (facility_id, lower(sku)) where sku <> '';
create unique index if not exists retail_products_barcode_once
  on public.retail_products (facility_id, barcode) where barcode <> '';
create index if not exists retail_products_facility_idx
  on public.retail_products (facility_id, name);

comment on table public.retail_products is
  'A facility''s products. stock (and each variant''s stock) moves only through retail_stock_movements.';

-- Stock is written by the ledger, never by an edit.
create or replace function private.retail_product_guard()
returns trigger
language plpgsql
set search_path = ''
as $fn$
begin
  new.updated_at := now();
  if tg_op = 'UPDATE' then
    new.facility_id := old.facility_id;
    new.created_by := old.created_by;
    new.created_at := old.created_at;
    if coalesce(current_setting('yipyy.stock_write', true), '') <> 'on' then
      new.stock := old.stock;
      -- A variant that already existed keeps its count; a new one starts at
      -- what it was given.
      new.variants := coalesce((
        select jsonb_agg(
                 case when o.v is not null
                      then jsonb_set(n.v, '{stock}', coalesce(o.v->'stock', '0'::jsonb))
                      else n.v end
                 order by n.ord)
          from jsonb_array_elements(new.variants) with ordinality as n(v, ord)
          left join lateral (
            select x.v from jsonb_array_elements(old.variants) as x(v)
             where x.v->>'id' = n.v->>'id' limit 1
          ) o on true
      ), '[]'::jsonb);
    end if;
  end if;
  return new;
end;
$fn$;

drop trigger if exists retail_products_guard on public.retail_products;
create trigger retail_products_guard
  before insert or update on public.retail_products
  for each row execute function private.retail_product_guard();

alter table public.retail_products enable row level security;

drop policy if exists retail_products_read on public.retail_products;
create policy retail_products_read on public.retail_products
  for select using (
    private.is_platform_admin()
    or facility_id in (select private.member_facility_ids())
  );
drop policy if exists retail_products_insert on public.retail_products;
create policy retail_products_insert on public.retail_products
  for insert with check (private.has_permission(facility_id, 'retail_manage_products'));
drop policy if exists retail_products_update on public.retail_products;
create policy retail_products_update on public.retail_products
  for update
  using (private.has_permission(facility_id, 'retail_manage_products'))
  with check (private.has_permission(facility_id, 'retail_manage_products'));
drop policy if exists retail_products_delete on public.retail_products;
create policy retail_products_delete on public.retail_products
  for delete using (private.has_permission(facility_id, 'retail_manage_products'));

revoke all on public.retail_products from public;
revoke all on public.retail_products from anon;
grant select, insert, update, delete on public.retail_products to authenticated;

-- ── Suppliers ──────────────────────────────────────────────────────────────

create table if not exists public.retail_suppliers (
  id uuid primary key default gen_random_uuid(),
  facility_id uuid not null references public.facilities(id) on delete cascade,
  name text not null check (length(btrim(name)) between 1 and 200),
  contact_name text not null default '',
  email text not null default '',
  phone text not null default '',
  is_active boolean not null default true,
  detail jsonb not null default '{}'::jsonb check (jsonb_typeof(detail) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists retail_suppliers_facility_idx
  on public.retail_suppliers (facility_id, name);

alter table public.retail_suppliers enable row level security;

drop policy if exists retail_suppliers_read on public.retail_suppliers;
create policy retail_suppliers_read on public.retail_suppliers
  for select using (
    private.is_platform_admin()
    or facility_id in (select private.member_facility_ids())
  );
drop policy if exists retail_suppliers_write on public.retail_suppliers;
create policy retail_suppliers_write on public.retail_suppliers
  for all
  using (private.has_permission(facility_id, 'retail_manage_suppliers'))
  with check (private.has_permission(facility_id, 'retail_manage_suppliers'));

revoke all on public.retail_suppliers from public;
revoke all on public.retail_suppliers from anon;
grant select, insert, update, delete on public.retail_suppliers to authenticated;

-- ── Purchase orders ────────────────────────────────────────────────────────

create table if not exists public.retail_purchase_orders (
  id uuid primary key default gen_random_uuid(),
  facility_id uuid not null references public.facilities(id) on delete cascade,
  number bigint generated always as identity,
  supplier_id uuid references public.retail_suppliers(id) on delete set null,
  supplier_name text not null default '',
  status text not null default 'draft'
    check (status in ('draft', 'ordered', 'partial', 'received', 'cancelled')),
  -- [{productId, variantId, productName, sku, quantity, unitCost, received}]
  items jsonb not null default '[]'::jsonb check (jsonb_typeof(items) = 'array'),
  expected_on date,
  received_at timestamptz,
  notes text not null default '',
  created_by text default (auth.jwt()->>'sub'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists retail_purchase_orders_facility_idx
  on public.retail_purchase_orders (facility_id, created_at desc);

alter table public.retail_purchase_orders enable row level security;

drop policy if exists retail_purchase_orders_read on public.retail_purchase_orders;
create policy retail_purchase_orders_read on public.retail_purchase_orders
  for select using (
    private.is_platform_admin()
    or facility_id in (select private.member_facility_ids())
  );
drop policy if exists retail_purchase_orders_insert on public.retail_purchase_orders;
create policy retail_purchase_orders_insert on public.retail_purchase_orders
  for insert with check (private.has_permission(facility_id, 'retail_manage_suppliers'));
drop policy if exists retail_purchase_orders_update on public.retail_purchase_orders;
create policy retail_purchase_orders_update on public.retail_purchase_orders
  for update
  using (private.has_permission(facility_id, 'retail_manage_suppliers')
         or private.has_permission(facility_id, 'retail_manage_inventory'))
  with check (private.has_permission(facility_id, 'retail_manage_suppliers')
              or private.has_permission(facility_id, 'retail_manage_inventory'));
drop policy if exists retail_purchase_orders_delete on public.retail_purchase_orders;
create policy retail_purchase_orders_delete on public.retail_purchase_orders
  for delete using (private.has_permission(facility_id, 'retail_manage_suppliers')
                    and status in ('draft', 'cancelled'));

revoke all on public.retail_purchase_orders from public;
revoke all on public.retail_purchase_orders from anon;
grant select, insert, update, delete on public.retail_purchase_orders to authenticated;

-- ── Sales ──────────────────────────────────────────────────────────────────

create sequence if not exists public.retail_sales_number_seq;

create table if not exists public.retail_sales (
  id uuid primary key default gen_random_uuid(),
  facility_id uuid not null references public.facilities(id) on delete cascade,
  number bigint not null default nextval('public.retail_sales_number_seq'),
  client_id uuid references public.clients(id) on delete set null,
  -- [{productId, variantId, name, variantName, sku, quantity, unitPrice, discount, total, taxable}]
  items jsonb not null check (jsonb_typeof(items) = 'array' and jsonb_array_length(items) > 0),
  subtotal numeric(10, 2) not null check (subtotal >= 0),
  discount_total numeric(10, 2) not null default 0 check (discount_total >= 0),
  promo_code text,
  tax_total numeric(10, 2) not null default 0 check (tax_total >= 0),
  tip numeric(10, 2) not null default 0 check (tip >= 0),
  total numeric(10, 2) not null check (total >= 0),
  tender text not null,
  payment_ids uuid[] not null default '{}',
  status text not null default 'completed'
    check (status in ('completed', 'refunded', 'voided')),
  cashier_name text not null default '',
  note text not null default '',
  created_by text default (auth.jwt()->>'sub'),
  created_at timestamptz not null default now()
);

create index if not exists retail_sales_facility_idx
  on public.retail_sales (facility_id, created_at desc);
create index if not exists retail_sales_client_idx
  on public.retail_sales (client_id);

alter table public.retail_sales enable row level security;

drop policy if exists retail_sales_read on public.retail_sales;
create policy retail_sales_read on public.retail_sales
  for select using (
    private.is_platform_admin()
    or facility_id in (select private.member_facility_ids())
    or client_id in (select private.own_client_ids())
  );
drop policy if exists retail_sales_insert on public.retail_sales;
create policy retail_sales_insert on public.retail_sales
  for insert with check (private.has_permission(facility_id, 'retail_process_sale'));
drop policy if exists retail_sales_update on public.retail_sales;
create policy retail_sales_update on public.retail_sales
  for update
  using (private.has_permission(facility_id, 'retail_process_return'))
  with check (private.has_permission(facility_id, 'retail_process_return'));

revoke all on public.retail_sales from public;
revoke all on public.retail_sales from anon;
grant select, insert, update on public.retail_sales to authenticated;
revoke all on sequence public.retail_sales_number_seq from public;
revoke all on sequence public.retail_sales_number_seq from anon;
grant usage on sequence public.retail_sales_number_seq to authenticated;

-- A sale's line items and money are what it was; only its status moves.
create or replace function private.retail_sale_guard()
returns trigger
language plpgsql
set search_path = ''
as $fn$
begin
  if tg_op = 'UPDATE' then
    if (new.facility_id, new.number, new.client_id, new.items, new.subtotal,
        new.discount_total, new.tax_total, new.tip, new.total, new.tender,
        new.payment_ids, new.created_at, new.created_by)
       is distinct from
       (old.facility_id, old.number, old.client_id, old.items, old.subtotal,
        old.discount_total, old.tax_total, old.tip, old.total, old.tender,
        old.payment_ids, old.created_at, old.created_by) then
      raise exception 'A sale is changed by a return, not an edit.'
        using errcode = '42501';
    end if;
  end if;
  return new;
end;
$fn$;

drop trigger if exists retail_sales_guard on public.retail_sales;
create trigger retail_sales_guard
  before update on public.retail_sales
  for each row execute function private.retail_sale_guard();

-- ── Stock movements ────────────────────────────────────────────────────────

create table if not exists public.retail_stock_movements (
  id uuid primary key default gen_random_uuid(),
  facility_id uuid not null references public.facilities(id) on delete cascade,
  product_id uuid not null references public.retail_products(id) on delete cascade,
  variant_id text,
  delta integer not null check (delta <> 0),
  reason text not null
    check (reason in ('opening', 'sale', 'return', 'received', 'adjustment', 'damaged', 'count')),
  note text not null default '',
  sale_id uuid references public.retail_sales(id) on delete set null,
  purchase_order_id uuid references public.retail_purchase_orders(id) on delete set null,
  author_name text not null default 'Staff',
  created_by text default (auth.jwt()->>'sub'),
  created_at timestamptz not null default now()
);

create index if not exists retail_stock_movements_product_idx
  on public.retail_stock_movements (product_id, created_at desc);
create index if not exists retail_stock_movements_facility_idx
  on public.retail_stock_movements (facility_id, created_at desc);

alter table public.retail_stock_movements enable row level security;

drop policy if exists retail_stock_movements_read on public.retail_stock_movements;
create policy retail_stock_movements_read on public.retail_stock_movements
  for select using (
    private.is_platform_admin()
    or facility_id in (select private.member_facility_ids())
  );
drop policy if exists retail_stock_movements_insert on public.retail_stock_movements;
create policy retail_stock_movements_insert on public.retail_stock_movements
  for insert with check (
    private.has_permission(facility_id, 'retail_manage_inventory')
    or (reason in ('sale', 'return')
        and private.has_permission(facility_id, 'retail_process_sale'))
  );

revoke all on public.retail_stock_movements from public;
revoke all on public.retail_stock_movements from anon;
grant select, insert on public.retail_stock_movements to authenticated;

-- A movement moves the count. SECURITY DEFINER because the person who sells
-- a product does not hold retail_manage_products, and the count must move
-- anyway; the movement's own policy already decided they may record it.
create or replace function private.retail_stock_apply()
returns trigger
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  v_facility uuid;
begin
  select facility_id into v_facility from public.retail_products where id = new.product_id;
  if v_facility is null or v_facility <> new.facility_id then
    raise exception 'That product is not this facility''s.' using errcode = '42501';
  end if;
  if new.reason = 'opening' then
    return new;  -- the count was set by the product row itself
  end if;
  perform set_config('yipyy.stock_write', 'on', true);
  if new.variant_id is null or new.variant_id = '' then
    update public.retail_products set stock = stock + new.delta
     where id = new.product_id;
  else
    update public.retail_products set variants = (
      select coalesce(jsonb_agg(
               case when v->>'id' = new.variant_id
                    then jsonb_set(v, '{stock}',
                           to_jsonb(coalesce((v->>'stock')::integer, 0) + new.delta))
                    else v end
               order by ord), '[]'::jsonb)
        from jsonb_array_elements(variants) with ordinality as x(v, ord)
    )
    where id = new.product_id;
  end if;
  perform set_config('yipyy.stock_write', 'off', true);
  return new;
end;
$fn$;

revoke all on function private.retail_stock_apply() from public;
revoke all on function private.retail_stock_apply() from anon;

drop trigger if exists retail_stock_movements_apply on public.retail_stock_movements;
create trigger retail_stock_movements_apply
  before insert on public.retail_stock_movements
  for each row execute function private.retail_stock_apply();

-- A new product's opening counts, written to the ledger.
create or replace function private.retail_product_opening()
returns trigger
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  v jsonb;
begin
  if jsonb_array_length(new.variants) = 0 then
    if new.stock <> 0 then
      insert into public.retail_stock_movements
        (facility_id, product_id, delta, reason, note, author_name)
      values (new.facility_id, new.id, new.stock, 'opening', 'Opening count', 'Staff');
    end if;
  else
    for v in select * from jsonb_array_elements(new.variants) loop
      if coalesce((v->>'stock')::integer, 0) <> 0 then
        insert into public.retail_stock_movements
          (facility_id, product_id, variant_id, delta, reason, note, author_name)
        values (new.facility_id, new.id, v->>'id', (v->>'stock')::integer,
                'opening', 'Opening count', 'Staff');
      end if;
    end loop;
  end if;
  return new;
end;
$fn$;

revoke all on function private.retail_product_opening() from public;
revoke all on function private.retail_product_opening() from anon;

drop trigger if exists retail_products_opening on public.retail_products;
create trigger retail_products_opening
  after insert on public.retail_products
  for each row execute function private.retail_product_opening();

-- ── A promo code at the till ───────────────────────────────────────────────

alter table public.promo_code_redemptions
  add column if not exists retail_sale_id uuid references public.retail_sales(id) on delete cascade;

-- The checks the booking checkout's redeem_promo_code makes, for an amount
-- that is not a booking: dates, the service, the day, limits, first visit,
-- minimum. Returns what comes off; refuses with a HINT the screen says.
-- p_lock takes the code's row for the rest of the caller's transaction.
create or replace function public.quote_promo_code(
  p_facility_id uuid,
  p_code text,
  p_client_id uuid,
  p_service text,
  p_amount numeric,
  p_lock boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  v_promo public.promo_codes;
  v_tz text;
  v_today date;
  v_uses integer;
  v_days jsonb;
  v_amount numeric(10, 2);
begin
  if not private.has_permission(p_facility_id, 'retail_process_sale') then
    raise exception 'Not allowed to take a sale at this facility.'
      using errcode = '42501', hint = 'promo_not_allowed';
  end if;

  if p_lock then
    select * into v_promo from public.promo_codes
     where facility_id = p_facility_id and code = upper(btrim(coalesce(p_code, '')))
     for update;
  else
    select * into v_promo from public.promo_codes
     where facility_id = p_facility_id and code = upper(btrim(coalesce(p_code, '')));
  end if;
  if not found or not v_promo.is_active then
    raise exception 'No active promo code by that name.' using hint = 'promo_unknown';
  end if;

  select timezone into v_tz from public.facilities where id = p_facility_id;
  v_today := (now() at time zone coalesce(v_tz, 'America/Toronto'))::date;
  if (v_promo.valid_from is not null and v_today < v_promo.valid_from)
     or (v_promo.valid_until is not null and v_today > v_promo.valid_until) then
    raise exception 'That code is outside its dates.' using hint = 'promo_expired';
  end if;
  if cardinality(v_promo.applies_to) > 0
     and not (lower(coalesce(p_service, '')) = any (v_promo.applies_to)) then
    raise exception 'That code does not cover this service.' using hint = 'promo_wrong_service';
  end if;
  v_days := v_promo.detail->'specificDays';
  if jsonb_typeof(v_days) = 'array' and jsonb_array_length(v_days) > 0
     and not (v_days ? trim(to_char(now() at time zone coalesce(v_tz, 'America/Toronto'), 'fmday'))) then
    raise exception 'That code is not valid on this day.' using hint = 'promo_wrong_day';
  end if;
  if v_promo.usage_limit is not null then
    select count(*) into v_uses from public.promo_code_redemptions where promo_code_id = v_promo.id;
    if v_uses >= v_promo.usage_limit then
      raise exception 'That code has been used up.' using hint = 'promo_used_up';
    end if;
  end if;
  if v_promo.per_customer_limit is not null and p_client_id is not null then
    select count(*) into v_uses from public.promo_code_redemptions
     where promo_code_id = v_promo.id and client_id = p_client_id;
    if v_uses >= v_promo.per_customer_limit then
      raise exception 'This client has already used that code.' using hint = 'promo_client_limit';
    end if;
  end if;
  if v_promo.first_time_only and (
       p_client_id is null
       or exists (select 1 from public.bookings o
                   where o.client_id = p_client_id and o.status = 'completed')
       or exists (select 1 from public.retail_sales s
                   where s.client_id = p_client_id and s.status = 'completed')) then
    raise exception 'That code is for a first visit.' using hint = 'promo_first_time';
  end if;
  if v_promo.min_purchase is not null and coalesce(p_amount, 0) < v_promo.min_purchase then
    raise exception 'The sale is under the code''s minimum.' using hint = 'promo_minimum';
  end if;

  v_amount := case v_promo.discount_type
    when 'percentage' then round(coalesce(p_amount, 0) * v_promo.discount_value / 100, 2)
    when 'fixed' then v_promo.discount_value
    else coalesce(p_amount, 0)
  end;
  if v_promo.max_discount is not null then
    v_amount := least(v_amount, v_promo.max_discount);
  end if;
  v_amount := greatest(0, least(v_amount, coalesce(p_amount, 0)));
  if v_amount <= 0 then
    raise exception 'Nothing is left to discount.' using hint = 'promo_nothing_due';
  end if;
  return jsonb_build_object('promoCodeId', v_promo.id, 'code', v_promo.code, 'amount', v_amount);
end;
$fn$;

revoke execute on function public.quote_promo_code(uuid, text, uuid, text, numeric, boolean) from public;
revoke execute on function public.quote_promo_code(uuid, text, uuid, text, numeric, boolean) from anon;
grant execute on function public.quote_promo_code(uuid, text, uuid, text, numeric, boolean) to authenticated;

-- ── Recording a sale ───────────────────────────────────────────────────────

create or replace function public.record_retail_sale(
  p_facility_id uuid,
  p_items jsonb,
  p_subtotal numeric,
  p_discount numeric,
  p_tax numeric,
  p_tip numeric,
  p_total numeric,
  p_tender text,
  p_client_id uuid default null,
  -- Money already taken (a Clover card charge): the payments to link.
  p_payment_ids uuid[] default '{}',
  -- Money to record now: [{method, amount, cashReceived?, giftCardCode?}]
  p_payments jsonb default '[]'::jsonb,
  p_promo_code text default null,
  p_note text default null,
  p_cashier_name text default null
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $fn$
declare
  v_sale public.retail_sales;
  v_number bigint;
  v_label text;
  v_cashier text := coalesce(nullif(btrim(coalesce(p_cashier_name, '')), ''), 'Staff');
  v_item jsonb;
  v_pay jsonb;
  v_method text;
  v_amount numeric;
  v_paid numeric := 0;
  v_ids uuid[] := '{}';
  v_payment jsonb;
  v_card public.gift_cards;
  v_linked numeric;
  v_count integer;
  v_promo jsonb;
  v_product uuid;
  v_qty integer;
begin
  if not private.has_permission(p_facility_id, 'retail_process_sale') then
    raise exception 'Not allowed to take a sale at this facility.' using errcode = '42501';
  end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'A sale needs at least one line.' using errcode = '22023';
  end if;
  if p_client_id is not null and not exists (
    select 1 from public.clients where id = p_client_id and facility_id = p_facility_id
  ) then
    raise exception 'That client is not this facility''s.' using errcode = '42501';
  end if;

  -- The promo code, checked and locked before anything is written.
  if nullif(btrim(coalesce(p_promo_code, '')), '') is not null then
    v_promo := public.quote_promo_code(p_facility_id, p_promo_code, p_client_id,
                                       'retail', p_subtotal, true);
  end if;

  v_number := nextval('public.retail_sales_number_seq');
  v_label := 'Retail sale #' || v_number;

  -- Money taken by card before this call: this facility's, with no booking.
  if cardinality(p_payment_ids) > 0 then
    select coalesce(sum(grand_total), 0), count(*) into v_linked, v_count
      from public.payments
     where id = any (p_payment_ids) and facility_id = p_facility_id
       and booking_id is null and refund_of_payment_id is null;
    if v_count <> cardinality(p_payment_ids) then
      raise exception 'A linked payment is not a counter payment of this facility.'
        using errcode = '42501';
    end if;
    v_paid := v_paid + v_linked;
    v_ids := v_ids || p_payment_ids;
  end if;

  -- Money recorded now, through the checkout's own record_payment.
  for v_pay in select * from jsonb_array_elements(coalesce(p_payments, '[]'::jsonb)) loop
    v_method := v_pay->>'method';
    v_amount := round(coalesce((v_pay->>'amount')::numeric, 0), 2);
    if v_amount <= 0 then
      raise exception 'A payment needs an amount.' using errcode = '22023';
    end if;
    if v_method = 'gift-card' then
      v_card := public.redeem_gift_card(v_pay->>'giftCardCode', v_amount, null, v_label);
      if v_card.facility_id <> p_facility_id then
        raise exception 'That gift card belongs to another business.' using errcode = '42501';
      end if;
      v_payment := public.record_payment(
        p_facility_id => p_facility_id, p_method => 'gift-card',
        p_subtotal => v_amount, p_tax => 0, p_tip => 0,
        p_amount_charged => v_amount, p_grand_total => v_amount,
        p_client_id => p_client_id, p_service_label => v_label,
        p_note => 'Gift card ending ' || right(btrim(v_pay->>'giftCardCode'), 4));
    elsif v_method = 'store-credit' then
      v_payment := public.record_payment(
        p_facility_id => p_facility_id, p_method => 'store-credit',
        p_subtotal => v_amount, p_tax => 0, p_tip => 0,
        p_amount_charged => 0, p_grand_total => v_amount,
        p_client_id => p_client_id, p_store_credit_applied => v_amount,
        p_credit_note => v_label, p_service_label => v_label);
    elsif v_method in ('cash', 'e-transfer') then
      v_payment := public.record_payment(
        p_facility_id => p_facility_id, p_method => v_method,
        p_subtotal => v_amount, p_tax => 0, p_tip => 0,
        p_amount_charged => v_amount, p_grand_total => v_amount,
        p_client_id => p_client_id,
        p_cash_received => case when v_method = 'cash'
                                then coalesce((v_pay->>'cashReceived')::numeric, v_amount) end,
        p_service_label => v_label,
        p_note => nullif(btrim(coalesce(v_pay->>'note', '')), ''));
    else
      raise exception 'The till cannot record a % payment.', v_method using errcode = '22023';
    end if;
    v_ids := v_ids || (v_payment->>'payment_id')::uuid;
    v_paid := v_paid + v_amount;
  end loop;

  -- Paid in full, to the cent: a sale is never recorded as paid when it was not.
  if abs(v_paid - p_total) > 0.01 then
    raise exception 'The payments (%) do not meet the total (%).',
      to_char(v_paid, 'FM999999990.00'), to_char(p_total, 'FM999999990.00')
      using errcode = '22023', hint = 'sale_unpaid';
  end if;

  insert into public.retail_sales
    (facility_id, number, client_id, items, subtotal, discount_total, promo_code,
     tax_total, tip, total, tender, payment_ids, cashier_name, note)
  values
    (p_facility_id, v_number, p_client_id, p_items, p_subtotal, coalesce(p_discount, 0),
     v_promo->>'code', coalesce(p_tax, 0), coalesce(p_tip, 0), p_total, p_tender,
     v_ids, v_cashier, coalesce(p_note, ''))
  returning * into v_sale;

  -- Off the shelf, line by line.
  for v_item in select * from jsonb_array_elements(p_items) loop
    v_qty := coalesce((v_item->>'quantity')::integer, 0);
    if v_qty <= 0 then
      raise exception 'Every line needs a quantity.' using errcode = '22023';
    end if;
    v_product := nullif(v_item->>'productId', '')::uuid;
    if v_product is not null then
      insert into public.retail_stock_movements
        (facility_id, product_id, variant_id, delta, reason, note, sale_id, author_name)
      values
        (p_facility_id, v_product, nullif(v_item->>'variantId', ''), -v_qty, 'sale',
         v_label, v_sale.id, v_cashier);
    end if;
  end loop;

  if v_promo is not null then
    insert into public.promo_code_redemptions
      (facility_id, promo_code_id, code, client_id, retail_sale_id, amount)
    values
      (p_facility_id, (v_promo->>'promoCodeId')::uuid, v_promo->>'code', p_client_id,
       v_sale.id, (v_promo->>'amount')::numeric);
  end if;

  return jsonb_build_object(
    'saleId', v_sale.id,
    'number', v_sale.number,
    'paymentIds', to_jsonb(v_ids),
    'promoAmount', coalesce((v_promo->>'amount')::numeric, 0)
  );
end;
$fn$;

revoke execute on function public.record_retail_sale(uuid, jsonb, numeric, numeric, numeric, numeric, numeric, text, uuid, uuid[], jsonb, text, text, text) from public;
revoke execute on function public.record_retail_sale(uuid, jsonb, numeric, numeric, numeric, numeric, numeric, text, uuid, uuid[], jsonb, text, text, text) from anon;
grant execute on function public.record_retail_sale(uuid, jsonb, numeric, numeric, numeric, numeric, numeric, text, uuid, uuid[], jsonb, text, text, text) to authenticated;

-- ── Receiving a purchase order ─────────────────────────────────────────────

-- p_lines: [{index, quantity, unitCost?}] — what arrived, by the PO line's
-- position. Each becomes a `received` movement; the PO's status follows.
create or replace function public.receive_purchase_order(
  p_po_id uuid,
  p_lines jsonb,
  p_author_name text default null
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $fn$
declare
  v_po public.retail_purchase_orders;
  v_line jsonb;
  v_items jsonb;
  v_idx integer;
  v_qty integer;
  v_item jsonb;
  v_all boolean := true;
  v_any boolean := false;
  v_status text;
begin
  select * into v_po from public.retail_purchase_orders where id = p_po_id for update;
  if not found then
    raise exception 'No such purchase order.' using errcode = '42501';
  end if;
  if not private.has_permission(v_po.facility_id, 'retail_manage_inventory') then
    raise exception 'Not allowed to receive stock at this facility.' using errcode = '42501';
  end if;
  if v_po.status in ('received', 'cancelled') then
    raise exception 'That order is already closed.' using errcode = '22023';
  end if;

  v_items := v_po.items;
  for v_line in select * from jsonb_array_elements(coalesce(p_lines, '[]'::jsonb)) loop
    v_idx := (v_line->>'index')::integer;
    v_qty := coalesce((v_line->>'quantity')::integer, 0);
    if v_idx is null or v_idx < 0 or v_idx >= jsonb_array_length(v_items) then
      raise exception 'No such line on the order.' using errcode = '22023';
    end if;
    if v_qty <= 0 then continue; end if;
    v_item := v_items->v_idx;
    if nullif(v_item->>'productId', '') is not null then
      insert into public.retail_stock_movements
        (facility_id, product_id, variant_id, delta, reason, note, purchase_order_id, author_name)
      values
        (v_po.facility_id, (v_item->>'productId')::uuid, nullif(v_item->>'variantId', ''),
         v_qty, 'received', 'PO #' || v_po.number, v_po.id,
         coalesce(nullif(btrim(p_author_name), ''), 'Staff'));
    end if;
    v_item := jsonb_set(v_item, '{received}',
      to_jsonb(coalesce((v_item->>'received')::integer, 0) + v_qty));
    if v_line ? 'unitCost' then
      v_item := jsonb_set(v_item, '{unitCost}', v_line->'unitCost');
    end if;
    v_items := jsonb_set(v_items, array[v_idx::text], v_item);
    v_any := true;
  end loop;
  if not v_any then
    raise exception 'Nothing was received.' using errcode = '22023';
  end if;

  select bool_and(coalesce((x->>'received')::integer, 0) >= coalesce((x->>'quantity')::integer, 0))
    into v_all from jsonb_array_elements(v_items) x;
  v_status := case when v_all then 'received' else 'partial' end;

  update public.retail_purchase_orders
     set items = v_items, status = v_status,
         received_at = case when v_all then now() else received_at end,
         updated_at = now()
   where id = v_po.id;

  return jsonb_build_object('status', v_status, 'items', v_items);
end;
$fn$;

revoke execute on function public.receive_purchase_order(uuid, jsonb, text) from public;
revoke execute on function public.receive_purchase_order(uuid, jsonb, text) from anon;
grant execute on function public.receive_purchase_order(uuid, jsonb, text) to authenticated;

do $verify$
begin
  if has_function_privilege('anon', 'public.record_retail_sale(uuid, jsonb, numeric, numeric, numeric, numeric, numeric, text, uuid, uuid[], jsonb, text, text, text)', 'execute') then
    raise exception 'anon can record a sale';
  end if;
  if has_function_privilege('anon', 'public.quote_promo_code(uuid, text, uuid, text, numeric, boolean)', 'execute') then
    raise exception 'anon can quote a promo code';
  end if;
  if has_function_privilege('anon', 'public.receive_purchase_order(uuid, jsonb, text)', 'execute') then
    raise exception 'anon can receive a purchase order';
  end if;
  if has_table_privilege('anon', 'public.retail_products', 'select')
     or has_table_privilege('anon', 'public.retail_sales', 'select')
     or has_table_privilege('anon', 'public.retail_stock_movements', 'select')
     or has_table_privilege('anon', 'public.retail_suppliers', 'select')
     or has_table_privilege('anon', 'public.retail_purchase_orders', 'select') then
    raise exception 'anon can read retail';
  end if;
end $verify$;
