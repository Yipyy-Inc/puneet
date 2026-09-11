-- ============================================================================
-- A promo code is a row, and using one is a row too.
--
-- ── WHAT IT REPLACES ──────────────────────────────────────────────────────
--
-- Three screens kept three fixture lists of promo codes in three shapes:
-- Marketing → Promo Codes (`promoCodes` in @/data/marketing, whose Save
-- button was a console.log), the retail till (`@/data/retail`, applied to a
-- cart in memory) and an orphaned /facility/services/promo-codes page. None
-- could reach a bill: nothing on a booking checkout took a code at all.
--
-- ── THE SHAPE ─────────────────────────────────────────────────────────────
--
-- `promo_codes` holds what the database must enforce — the code, its value,
-- its window, its limits, what it applies to. `detail` carries the rest of
-- the marketing editor (auto-apply, days of the week) as it went in.
--
-- `promo_code_redemptions` is every use. The used count is COUNTED from it,
-- never stored beside it, so a limit cannot drift from the uses it limits.
-- A redemption on a booking points at the negative line it wrote; deleting
-- that line (the bill is editable up to checkout) deletes the redemption
-- with it, so a removed discount gives the use back.
--
-- ── APPLYING ONE ──────────────────────────────────────────────────────────
--
-- `redeem_promo_code(booking, code)` checks and writes in one transaction,
-- with the code's row locked so two tills cannot both take its last use.
-- SECURITY DEFINER, because the lock is the point: `select ... for update` on
-- a code needs the UPDATE policy (manage_services), and the person at the
-- till who applies a code is not the person who writes the price list. So
-- the function checks, itself, what the line and the redemption would each
-- have needed under RLS — the caller sees the booking and holds
-- retail_process_sale at its facility — before writing either. A refusal
-- names its reason in HINT for the screen to say in its language.
--
-- ── WHO ───────────────────────────────────────────────────────────────────
--
--   codes        read: the facility's staff; write: manage_services
--   redemptions  read: staff, and the client they belong to;
--                insert: retail_process_sale; never updated or deleted
--                directly (a line's delete cascades)
-- ============================================================================

create table if not exists public.promo_codes (
  id uuid primary key default gen_random_uuid(),
  facility_id uuid not null references public.facilities(id) on delete cascade,
  code text not null check (code ~ '^[A-Z0-9][A-Z0-9_-]{1,39}$'),
  description text not null default '' check (length(description) <= 500),
  discount_type text not null
    check (discount_type in ('percentage', 'fixed', 'free_service')),
  discount_value numeric(10, 2) not null default 0 check (discount_value >= 0),
  min_purchase numeric(10, 2) check (min_purchase is null or min_purchase >= 0),
  max_discount numeric(10, 2) check (max_discount is null or max_discount > 0),
  valid_from date,
  valid_until date,
  usage_limit integer check (usage_limit is null or usage_limit > 0),
  per_customer_limit integer check (per_customer_limit is null or per_customer_limit > 0),
  -- Services (booking.service, lower case) it applies to; empty = every one.
  applies_to text[] not null default '{}',
  first_time_only boolean not null default false,
  is_active boolean not null default true,
  detail jsonb not null default '{}'::jsonb check (jsonb_typeof(detail) = 'object'),
  created_by text default (auth.jwt()->>'sub'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint promo_codes_percentage_at_most_100
    check (discount_type <> 'percentage' or discount_value <= 100),
  constraint promo_codes_window_in_order
    check (valid_from is null or valid_until is null or valid_from <= valid_until),
  constraint promo_codes_one_code_per_facility unique (facility_id, code)
);

comment on table public.promo_codes is
  'A facility''s promo codes. Uses are rows in promo_code_redemptions and are counted, never stored here.';

create or replace function private.promo_code_touch()
returns trigger
language plpgsql
set search_path = ''
as $fn$
begin
  new.updated_at := now();
  new.code := upper(btrim(new.code));
  if tg_op = 'UPDATE' then
    new.facility_id := old.facility_id;
    new.created_by := old.created_by;
    new.created_at := old.created_at;
  end if;
  return new;
end;
$fn$;

drop trigger if exists promo_codes_touch on public.promo_codes;
create trigger promo_codes_touch
  before insert or update on public.promo_codes
  for each row execute function private.promo_code_touch();

alter table public.promo_codes enable row level security;

drop policy if exists promo_codes_read on public.promo_codes;
create policy promo_codes_read on public.promo_codes
  for select using (
    private.is_platform_admin()
    or facility_id in (select private.member_facility_ids())
  );

drop policy if exists promo_codes_insert on public.promo_codes;
create policy promo_codes_insert on public.promo_codes
  for insert with check (private.has_permission(facility_id, 'manage_services'));

drop policy if exists promo_codes_update on public.promo_codes;
create policy promo_codes_update on public.promo_codes
  for update
  using (private.has_permission(facility_id, 'manage_services'))
  with check (private.has_permission(facility_id, 'manage_services'));

drop policy if exists promo_codes_delete on public.promo_codes;
create policy promo_codes_delete on public.promo_codes
  for delete using (private.has_permission(facility_id, 'manage_services'));

revoke all on public.promo_codes from public;
revoke all on public.promo_codes from anon;
grant select, insert, update, delete on public.promo_codes to authenticated;

-- ── Redemptions ────────────────────────────────────────────────────────────

create table if not exists public.promo_code_redemptions (
  id uuid primary key default gen_random_uuid(),
  facility_id uuid not null references public.facilities(id) on delete cascade,
  -- SET NULL: deleting a code must not rewrite the history of its uses.
  promo_code_id uuid references public.promo_codes(id) on delete set null,
  code text not null,
  client_id uuid references public.clients(id) on delete set null,
  booking_id uuid references public.bookings(id) on delete cascade,
  line_item_id uuid references public.booking_line_items(id) on delete cascade,
  amount numeric(10, 2) not null check (amount >= 0),
  created_by text default (auth.jwt()->>'sub'),
  created_at timestamptz not null default now()
);

create index if not exists promo_code_redemptions_code_idx
  on public.promo_code_redemptions (promo_code_id);
create index if not exists promo_code_redemptions_client_idx
  on public.promo_code_redemptions (client_id);
-- One use of a code per booking.
create unique index if not exists promo_code_redemptions_once_per_booking
  on public.promo_code_redemptions (promo_code_id, booking_id)
  where booking_id is not null and promo_code_id is not null;

alter table public.promo_code_redemptions enable row level security;

drop policy if exists promo_code_redemptions_read on public.promo_code_redemptions;
create policy promo_code_redemptions_read on public.promo_code_redemptions
  for select using (
    private.is_platform_admin()
    or facility_id in (select private.member_facility_ids())
    or client_id in (select private.own_client_ids())
  );

drop policy if exists promo_code_redemptions_insert on public.promo_code_redemptions;
create policy promo_code_redemptions_insert on public.promo_code_redemptions
  for insert with check (private.has_permission(facility_id, 'retail_process_sale'));

revoke all on public.promo_code_redemptions from public;
revoke all on public.promo_code_redemptions from anon;
grant select, insert on public.promo_code_redemptions to authenticated;

-- ── Applying a code to a booking ───────────────────────────────────────────

create or replace function public.redeem_promo_code(p_booking_id uuid, p_code text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  v_booking record;
  v_promo public.promo_codes;
  v_today date;
  v_balance numeric(10, 2);
  v_amount numeric(10, 2);
  v_uses integer;
  v_line uuid;
  v_days jsonb;
begin
  select b.id, b.facility_id, b.client_id, b.service, b.start_at,
         b.amount_due, b.amount_paid, b.status, f.timezone
    into v_booking
    from public.bookings b
    join public.facilities f on f.id = b.facility_id
   where b.id = p_booking_id;
  if not found then
    raise exception 'No such booking.' using hint = 'promo_no_booking';
  end if;
  -- What RLS would have asked of each write, asked here.
  if not private.has_permission(v_booking.facility_id, 'retail_process_sale') then
    raise exception 'Not allowed to take a sale at this facility.'
      using errcode = '42501', hint = 'promo_not_allowed';
  end if;
  if v_booking.status in ('cancelled', 'declined', 'no_show') then
    raise exception 'That booking is closed.' using hint = 'promo_booking_closed';
  end if;

  -- Locked: the usage limit is read and spent in one step.
  select * into v_promo
    from public.promo_codes
   where facility_id = v_booking.facility_id
     and code = upper(btrim(coalesce(p_code, '')))
   for update;
  if not found or not v_promo.is_active then
    raise exception 'No active promo code by that name.' using hint = 'promo_unknown';
  end if;

  v_today := (now() at time zone coalesce(v_booking.timezone, 'America/Toronto'))::date;
  if (v_promo.valid_from is not null and v_today < v_promo.valid_from)
     or (v_promo.valid_until is not null and v_today > v_promo.valid_until) then
    raise exception 'That code is outside its dates.' using hint = 'promo_expired';
  end if;

  if cardinality(v_promo.applies_to) > 0
     and not (lower(v_booking.service) = any (v_promo.applies_to)) then
    raise exception 'That code does not cover this service.' using hint = 'promo_wrong_service';
  end if;

  v_days := v_promo.detail->'specificDays';
  if jsonb_typeof(v_days) = 'array' and jsonb_array_length(v_days) > 0
     and not (v_days ? trim(to_char(
       v_booking.start_at at time zone coalesce(v_booking.timezone, 'America/Toronto'),
       'fmday'))) then
    raise exception 'That code is not valid on this day.' using hint = 'promo_wrong_day';
  end if;

  if v_promo.usage_limit is not null then
    select count(*) into v_uses from public.promo_code_redemptions
     where promo_code_id = v_promo.id;
    if v_uses >= v_promo.usage_limit then
      raise exception 'That code has been used up.' using hint = 'promo_used_up';
    end if;
  end if;

  if v_promo.per_customer_limit is not null then
    select count(*) into v_uses from public.promo_code_redemptions
     where promo_code_id = v_promo.id and client_id = v_booking.client_id;
    if v_uses >= v_promo.per_customer_limit then
      raise exception 'This client has already used that code.' using hint = 'promo_client_limit';
    end if;
  end if;

  if v_promo.first_time_only and exists (
    select 1 from public.bookings o
     where o.client_id = v_booking.client_id
       and o.id <> v_booking.id
       and o.status = 'completed'
  ) then
    raise exception 'That code is for a first visit.' using hint = 'promo_first_time';
  end if;

  if exists (
    select 1 from public.promo_code_redemptions
     where promo_code_id = v_promo.id and booking_id = v_booking.id
  ) then
    raise exception 'That code is already on this bill.' using hint = 'promo_already_applied';
  end if;

  v_balance := greatest(0, coalesce(v_booking.amount_due, 0) - coalesce(v_booking.amount_paid, 0));
  if v_promo.min_purchase is not null and coalesce(v_booking.amount_due, 0) < v_promo.min_purchase then
    raise exception 'The bill is under the code''s minimum.' using hint = 'promo_minimum';
  end if;

  v_amount := case v_promo.discount_type
    when 'percentage' then round(coalesce(v_booking.amount_due, 0) * v_promo.discount_value / 100, 2)
    when 'fixed' then v_promo.discount_value
    else v_balance
  end;
  if v_promo.max_discount is not null then
    v_amount := least(v_amount, v_promo.max_discount);
  end if;
  v_amount := least(v_amount, v_balance);
  if v_amount <= 0 then
    raise exception 'Nothing is left to discount.' using hint = 'promo_nothing_due';
  end if;

  insert into public.booking_line_items
    (booking_id, facility_id, kind, name, unit_price, quantity, source_id)
  values
    (v_booking.id, v_booking.facility_id, 'item', 'Promo code ' || v_promo.code,
     -v_amount, 1, 'promo:' || v_promo.id::text)
  returning id into v_line;

  insert into public.promo_code_redemptions
    (facility_id, promo_code_id, code, client_id, booking_id, line_item_id, amount)
  values
    (v_booking.facility_id, v_promo.id, v_promo.code, v_booking.client_id,
     v_booking.id, v_line, v_amount);

  return jsonb_build_object(
    'code', v_promo.code,
    'amount', v_amount,
    'lineItemId', v_line
  );
end;
$fn$;

revoke execute on function public.redeem_promo_code(uuid, text) from public;
revoke execute on function public.redeem_promo_code(uuid, text) from anon;
grant execute on function public.redeem_promo_code(uuid, text) to authenticated;

do $verify$
begin
  if has_function_privilege('anon', 'public.redeem_promo_code(uuid, text)', 'execute') then
    raise exception 'anon can redeem a promo code';
  end if;
  if has_table_privilege('anon', 'public.promo_codes', 'select') then
    raise exception 'anon can read promo codes';
  end if;
  if has_table_privilege('anon', 'public.promo_code_redemptions', 'select') then
    raise exception 'anon can read redemptions';
  end if;
end $verify$;
