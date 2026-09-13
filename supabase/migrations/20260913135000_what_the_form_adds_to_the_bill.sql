-- ============================================================================
-- What a pre-arrival form adds to the bill.
--
-- ── WHAT IT REPLACES ──────────────────────────────────────────────────────
--
-- The pre-arrival form offered add-ons from a hardcoded list with invented
-- prices ("these will be added to your booking as pending line items" — they
-- never were), showed a medication fee it never charged, and asked for a tip
-- it kept in the form. The facility decided (2026-09-13) that all three
-- charge.
--
-- ── A CHARGE IS AN UNPAID LINE ON THE BILL ────────────────────────────────
--
-- booking_line_items has no status: every line moves extras_total, and so
-- amount_due, the moment it is written. A form's add-on or medication fee is
-- therefore an ordinary line, written by a DEFINER function the way
-- redeem_promo_code writes its discount (20260911173538) — owners cannot
-- write lines (retail_process_sale).
--
-- The request names an add-on and a quantity, never a price. The price comes
-- from the catalogue: grooming's own add-ons for a grooming booking, the
-- facility's `service_addons` for everything else — active, for this service
-- and location, and not one needing a time slot or a size price. The
-- catalogue's maximum caps the quantity; per-day pricing counts the stay's
-- nights (boarding) or days; a percentage add-on is a share of total_cost.
-- The medication fee counts doses (the times listed each day, or the
-- frequency), days, or the stay, by the facility's billing; as-needed
-- medication adds no dose.
--
-- `yipyy_go_charges` remembers each charge by key, so writing them again
-- changes only what changed. A line staff delete is never put back. When
-- add-ons need approval, they reach the bill when staff approve.
--
-- ── THE TIP ───────────────────────────────────────────────────────────────
--
-- A pledged tip is the booking's tip_amount, validated against the facility's
-- tip popup (a preset, a custom amount within the booking, or skipping).
-- enforce_booking_integrity() puts an owner's tip_amount back — through a
-- DEFINER function too, because it reads the caller's JWT — so it is replaced
-- from its LIVE body with one branch: while the transaction-local flag
-- `yipyy.tip_pledge` is on and nothing else changed, the update stands. The
-- flag cannot be set through the API; PostgREST exposes public functions
-- only.
--
-- Staff emails on submission go to the facility's active owners and admins,
-- listed by yipyy_go_staff_recipients() — for the server only.
-- ============================================================================

-- ── The charges a form made ───────────────────────────────────────────────

create table if not exists public.yipyy_go_charges (
  id            uuid primary key default gen_random_uuid(),
  facility_id   uuid not null references public.facilities(id) on delete cascade,
  booking_id    uuid not null references public.bookings(id) on delete cascade,
  submission_id uuid references public.yipyy_go_submissions(id) on delete set null,
  kind          text not null check (kind in ('add_on', 'medication_fee')),
  add_on_id     text check (add_on_id is null or length(add_on_id) between 1 and 200),
  charge_key    text not null unique check (length(charge_key) between 1 and 300),
  name          text not null check (length(btrim(name)) between 1 and 200),
  unit_price    numeric(10, 2) not null,
  quantity      integer not null check (quantity > 0),
  line_item_id  uuid references public.booking_line_items(id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

comment on table public.yipyy_go_charges is
  'What a pre-arrival form put on the bill: an add-on priced from the facility''s catalogue, or the medication fee. One row per charge key; line_item_id is the booking_line_items row it wrote, and turns null when staff remove that line — which the form then never re-adds. Written only by private.yipyy_go_write_charges().';

create index if not exists yipyy_go_charges_booking_idx on public.yipyy_go_charges (booking_id);

-- ── Pricing, from the catalogue and the booking, never from the request ───

-- Nights for boarding; the days spanned for everything else. The facility's
-- calendar, not UTC.
create or replace function private.yipyy_go_stay_days(p_booking public.bookings)
returns integer
language sql
stable
security definer
set search_path = ''
as $fn$
  select case when p_booking.service = 'boarding'
           then greatest(1, (timezone(z.tz, p_booking.end_at))::date - (timezone(z.tz, p_booking.start_at))::date)
           else greatest(1, (timezone(z.tz, p_booking.end_at))::date - (timezone(z.tz, p_booking.start_at))::date + 1)
         end
    from (
      select coalesce(
        (select nullif(f.timezone, '') from public.facilities f where f.id = p_booking.facility_id),
        'America/Toronto'
      ) as tz
    ) z;
$fn$;

-- An add-on this booking may take: grooming's own list for a grooming booking,
-- the facility's service add-ons for everything else — active, for this
-- service and location, and not one that needs a time slot or a size price.
create or replace function private.yipyy_go_offered_add_on(p_booking public.bookings, p_add_on_id text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $fn$
  select case when p_booking.service = 'grooming' then (
    select jsonb_build_object(
             'id', g.id::text, 'name', g.name, 'description', g.description,
             'pricingType', 'flat', 'price', g.price, 'unitLabel', '',
             'maxQuantity', 1, 'petScope', 'per_pet')
      from public.grooming_add_ons g
     where g.facility_id = p_booking.facility_id
       and g.id::text = p_add_on_id
       and g.is_active
     limit 1
  ) else (
    select jsonb_build_object(
             'id', a.value ->> 'id',
             'name', coalesce(nullif(btrim(a.value ->> 'name'), ''), 'Add-on'),
             'description', coalesce(a.value ->> 'description', ''),
             'pricingType', a.value ->> 'pricingType',
             'price', (a.value ->> 'price')::numeric,
             'unitLabel', coalesce(a.value ->> 'unitLabel', ''),
             'maxQuantity', greatest(1, floor(coalesce((a.value ->> 'maxQuantity')::numeric, 10)))::int,
             'petScope', coalesce(a.value ->> 'petScope', 'per_booking'))
      from public.facility_settings s
      cross join lateral jsonb_array_elements(
        case when jsonb_typeof(s.value -> 'addOns') = 'array' then s.value -> 'addOns' else '[]'::jsonb end
      ) a(value)
     where s.facility_id = p_booking.facility_id
       and s.domain = 'service_addons'
       and a.value ->> 'id' = p_add_on_id
       and coalesce((a.value ->> 'isActive')::boolean, false)
       and not coalesce((a.value ->> 'requiresScheduling')::boolean, false)
       and a.value ->> 'pricingType' in ('flat', 'per_day', 'per_session', 'per_hour', 'per_item', 'percentage_of_booking')
       and jsonb_typeof(a.value -> 'price') = 'number'
       and coalesce(jsonb_array_length(
             case when jsonb_typeof(a.value -> 'sizePricing') = 'array' then a.value -> 'sizePricing' end
           ), 0) = 0
       and jsonb_typeof(a.value -> 'applicableServices') = 'array'
       and (a.value -> 'applicableServices') ?| array[p_booking.service, 'all']
       and (
         coalesce(jsonb_array_length(
           case when jsonb_typeof(a.value -> 'locationIds') = 'array' then a.value -> 'locationIds' end
         ), 0) = 0
         or (p_booking.location_id is not null and (a.value -> 'locationIds') ? p_booking.location_id::text)
       )
     limit 1
  ) end;
$fn$;

create or replace function private.yipyy_go_price_add_on(
  p_booking public.bookings,
  p_add_on jsonb,
  p_requested integer
)
returns table (unit_price numeric, quantity integer)
language sql
stable
security definer
set search_path = ''
as $fn$
  select case p_add_on ->> 'pricingType'
           when 'percentage_of_booking'
             then round(coalesce(p_booking.total_cost, 0) * (p_add_on ->> 'price')::numeric / 100, 2)
           else round((p_add_on ->> 'price')::numeric, 2)
         end,
         case p_add_on ->> 'pricingType'
           when 'flat' then 1
           when 'percentage_of_booking' then 1
           when 'per_day' then
             least(greatest(coalesce(p_requested, 1), 1), greatest(1, (p_add_on ->> 'maxQuantity')::int))
               * private.yipyy_go_stay_days(p_booking)
           else least(greatest(coalesce(p_requested, 1), 1), greatest(1, (p_add_on ->> 'maxQuantity')::int))
         end;
$fn$;

-- Doses over the stay: the times the owner listed each day, or the frequency
-- when they listed none. As-needed medication is not counted.
create or replace function private.yipyy_go_medication_doses(p_answers jsonb, p_days integer)
returns integer
language sql
immutable
set search_path = ''
as $fn$
  select coalesce(sum(
           case
             when m.value ->> 'frequency' = 'prn' then 0
             when m.value ->> 'frequency' = 'every_other_day'
               then ceil(greatest(p_days, 1) / 2.0)::int * greatest(t.len, 1)
             when t.len > 0 then t.len * greatest(p_days, 1)
             when m.value ->> 'frequency' = 'twice_daily' then 2 * greatest(p_days, 1)
             when m.value ->> 'frequency' = 'every_8hrs' then 3 * greatest(p_days, 1)
             else greatest(p_days, 1)
           end
         ), 0)::int
    from jsonb_array_elements(
           case when jsonb_typeof(p_answers -> 'medications') = 'array' then p_answers -> 'medications' else '[]'::jsonb end
         ) m(value)
    cross join lateral (
      select case when jsonb_typeof(m.value -> 'times') = 'array' then jsonb_array_length(m.value -> 'times') else 0 end as len
    ) t
   where not coalesce((p_answers ->> 'noMedications')::boolean, false);
$fn$;

-- ── Writing the charges ───────────────────────────────────────────────────

-- Recomputes every charge the booking's forms should carry, and brings the
-- bill in line: a charge no form asks for any more is removed, a changed one
-- is updated, a new one is added. A line staff removed stays removed. A
-- booking that is over (completed, cancelled, declined, no-show) is not
-- touched.
create or replace function private.yipyy_go_write_charges(p_booking_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  v_booking  public.bookings;
  v_settings jsonb;
  v_mode     text;
  v_fee      jsonb;
  v_days     integer;
  v_desired  jsonb := '{}'::jsonb;
  v_sub      public.yipyy_go_submissions;
  v_req      jsonb;
  v_offer    jsonb;
  v_price    record;
  v_key      text;
  v_qty      integer;
  v_charge   public.yipyy_go_charges;
  v_want     jsonb;
  v_line     uuid;
begin
  select * into v_booking from public.bookings where id = p_booking_id for update;
  if not found or v_booking.status::text in ('completed', 'cancelled', 'declined', 'no_show') then
    return;
  end if;

  select s.value into v_settings from public.facility_settings s
   where s.facility_id = v_booking.facility_id and s.domain = 'yipyy_go_config';
  v_mode := coalesce(v_settings ->> 'addOnsApproval', 'auto');
  v_fee := v_settings -> 'medicationFee';
  v_days := private.yipyy_go_stay_days(v_booking);

  for v_sub in
    select * from public.yipyy_go_submissions y
     where y.booking_id = p_booking_id
       and (y.status = 'approved' or (v_mode = 'auto' and y.status = 'submitted'))
     order by y.created_at
  loop
    for v_req in select e.value from jsonb_array_elements(v_sub.add_on_requests) e(value) loop
      continue when jsonb_typeof(v_req) <> 'object';
      v_offer := private.yipyy_go_offered_add_on(v_booking, v_req ->> 'addOnId');
      continue when v_offer is null;
      select * into v_price
        from private.yipyy_go_price_add_on(
               v_booking, v_offer,
               case when jsonb_typeof(v_req -> 'quantity') = 'number'
                    then floor((v_req ->> 'quantity')::numeric)::int else 1 end);
      continue when v_price.unit_price is null or v_price.unit_price <= 0;
      v_key := case when v_offer ->> 'petScope' = 'per_pet'
                    then 'addon:' || v_sub.id::text || ':' || (v_offer ->> 'id')
                    else 'addon:' || p_booking_id::text || ':' || (v_offer ->> 'id')
               end;
      -- An add-on charged per booking, asked for on two dogs, is one line.
      continue when v_desired ? v_key
                and (v_desired -> v_key ->> 'quantity')::int >= v_price.quantity;
      v_desired := v_desired || jsonb_build_object(v_key, jsonb_build_object(
        'kind', 'add_on',
        'addOnId', v_offer ->> 'id',
        'submissionId', v_sub.id,
        'name', left(v_offer ->> 'name', 200),
        'unitPrice', v_price.unit_price,
        'quantity', v_price.quantity));
    end loop;

    if coalesce((v_fee ->> 'enabled')::boolean, false)
       and jsonb_typeof(v_fee -> 'amount') = 'number'
       and (v_fee ->> 'amount')::numeric > 0
       and not coalesce((v_sub.answers ->> 'noMedications')::boolean, false)
       and jsonb_typeof(v_sub.answers -> 'medications') = 'array'
       and jsonb_array_length(v_sub.answers -> 'medications') > 0
    then
      v_qty := case v_fee ->> 'billing'
                 when 'per_stay' then 1
                 when 'per_day' then v_days
                 else private.yipyy_go_medication_doses(v_sub.answers, v_days)
               end;
      if v_qty > 0 then
        v_desired := v_desired || jsonb_build_object('medfee:' || v_sub.id::text, jsonb_build_object(
          'kind', 'medication_fee',
          'addOnId', null,
          'submissionId', v_sub.id,
          'name', left(coalesce(nullif(btrim(v_fee ->> 'label'), ''), 'Medication fee'), 200),
          'unitPrice', round((v_fee ->> 'amount')::numeric, 2),
          'quantity', v_qty));
      end if;
    end if;
  end loop;

  for v_charge in
    select * from public.yipyy_go_charges c where c.booking_id = p_booking_id for update
  loop
    v_want := v_desired -> v_charge.charge_key;
    if v_want is null then
      if v_charge.line_item_id is not null then
        delete from public.booking_line_items where id = v_charge.line_item_id;
      end if;
      delete from public.yipyy_go_charges where id = v_charge.id;
    elsif v_charge.line_item_id is not null
      and (v_charge.unit_price <> (v_want ->> 'unitPrice')::numeric
           or v_charge.quantity <> (v_want ->> 'quantity')::int)
    then
      update public.booking_line_items
         set unit_price = (v_want ->> 'unitPrice')::numeric,
             quantity = (v_want ->> 'quantity')::int
       where id = v_charge.line_item_id;
      update public.yipyy_go_charges
         set unit_price = (v_want ->> 'unitPrice')::numeric,
             quantity = (v_want ->> 'quantity')::int,
             submission_id = (v_want ->> 'submissionId')::uuid,
             updated_at = now()
       where id = v_charge.id;
    end if;
    -- A charge whose line staff removed (line_item_id is null) is left as it
    -- is: the form does not put it back.
    v_desired := v_desired - v_charge.charge_key;
  end loop;

  for v_key, v_want in select d.key, d.value from jsonb_each(v_desired) d loop
    insert into public.booking_line_items
      (booking_id, facility_id, kind, name, unit_price, quantity, source_id)
    values
      (p_booking_id, v_booking.facility_id,
       case when v_want ->> 'kind' = 'medication_fee' then 'fee' else 'item' end,
       v_want ->> 'name', (v_want ->> 'unitPrice')::numeric, (v_want ->> 'quantity')::int,
       'yipyy-go:' || v_key)
    returning id into v_line;

    insert into public.yipyy_go_charges
      (facility_id, booking_id, submission_id, kind, add_on_id, charge_key, name, unit_price, quantity, line_item_id)
    values
      (v_booking.facility_id, p_booking_id, (v_want ->> 'submissionId')::uuid, v_want ->> 'kind',
       v_want ->> 'addOnId', v_key, v_want ->> 'name', (v_want ->> 'unitPrice')::numeric,
       (v_want ->> 'quantity')::int, v_line);
  end loop;
end;
$fn$;

-- ── The tip the owner pledges ─────────────────────────────────────────────

create or replace function private.yipyy_go_pledge_tip(p_booking_id uuid, p_tip jsonb)
returns numeric
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  v_booking public.bookings;
  v_popup   jsonb;
  v_preset  jsonb;
  v_type    text;
  v_amount  numeric;
begin
  if p_tip is null then
    return null;
  end if;

  select * into v_booking from public.bookings where id = p_booking_id;
  select s.value -> 'tipPopup' into v_popup from public.facility_settings s
   where s.facility_id = v_booking.facility_id and s.domain = 'yipyy_go_config';
  if not coalesce((v_popup ->> 'enabled')::boolean, false) then
    raise exception 'This facility does not take tips on the form.' using errcode = '22023';
  end if;

  v_type := p_tip ->> 'type';
  if v_type = 'none' then
    if not coalesce((v_popup ->> 'allowSkip')::boolean, false) then
      raise exception 'Choose a tip.' using errcode = '22023';
    end if;
    v_amount := 0;
  elsif v_type = 'preset' then
    select p.value into v_preset
      from jsonb_array_elements(
             case when jsonb_typeof(v_popup -> 'presets') = 'array' then v_popup -> 'presets' else '[]'::jsonb end
           ) p(value)
     where p.value ->> 'id' = p_tip ->> 'presetId'
       and jsonb_typeof(p.value -> 'value') = 'number'
     limit 1;
    if v_preset is null then
      raise exception 'That tip is not offered.' using errcode = '22023';
    end if;
    v_amount := case v_preset ->> 'type'
                  when 'percentage'
                    then round(coalesce(v_booking.amount_due, 0) * (v_preset ->> 'value')::numeric / 100, 2)
                  else round((v_preset ->> 'value')::numeric, 2)
                end;
  elsif v_type = 'custom' then
    if not coalesce((v_popup ->> 'allowCustomAmount')::boolean, false) then
      raise exception 'That tip is not offered.' using errcode = '22023';
    end if;
    if jsonb_typeof(p_tip -> 'amount') <> 'number' then
      raise exception 'That is not a tip.' using errcode = '22023';
    end if;
    v_amount := round((p_tip ->> 'amount')::numeric, 2);
    if v_amount > least(1000, greatest(coalesce(v_booking.amount_due, 0), 0)) then
      raise exception 'That tip is more than the booking.' using errcode = '22023';
    end if;
  else
    raise exception 'That is not a tip.' using errcode = '22023';
  end if;

  if v_amount is null or v_amount < 0 or v_amount > 1000 then
    raise exception 'That is not a tip.' using errcode = '22023';
  end if;

  -- The booking trigger puts an owner's tip_amount back; this flag, local to
  -- the transaction and unreachable through the API, lets this one write in.
  perform set_config('yipyy.tip_pledge', 'on', true);
  update public.bookings set tip_amount = nullif(v_amount, 0) where id = p_booking_id;
  perform set_config('yipyy.tip_pledge', 'off', true);

  return v_amount;
end;
$fn$;

-- ── The booking trigger lets a pledged tip in ─────────────────────────────
--
-- Replaced from the live body (pg_get_functiondef, 2026-09-13), with one
-- branch added after the derived-columns early return: while
-- `yipyy.tip_pledge` is on and nothing but the tip (and derived columns)
-- changed, the update stands.

create or replace function private.enforce_booking_integrity()
returns trigger
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_client_facility uuid;
  v_is_staff        boolean;
  v_derived         text[] := array[
    'amount_paid', 'payment_status', 'extras_total', 'amount_due', 'updated_at'
  ];
begin
  if tg_op = 'UPDATE'
     and (to_jsonb(new) - v_derived) = (to_jsonb(old) - v_derived)
  then
    return new;
  end if;

  if tg_op = 'UPDATE'
     and coalesce(current_setting('yipyy.tip_pledge', true), '') = 'on'
     and (to_jsonb(new) - v_derived - 'tip_amount') = (to_jsonb(old) - v_derived - 'tip_amount')
  then
    return new;
  end if;

  v_client_facility := private.facility_of_client(new.client_id);
  if v_client_facility is null then
    raise exception 'Booking references a client that does not exist.'
      using errcode = '23503';
  end if;
  new.facility_id := v_client_facility;

  if new.location_id is not null
     and not exists (
       select 1
         from public.locations l
        where l.id = new.location_id
          and l.facility_id = new.facility_id
     )
  then
    raise exception 'Location does not belong to this booking''s facility.'
      using errcode = '23514';
  end if;

  if (select auth.jwt()->>'sub') is null then
    return new;
  end if;

  v_is_staff := private.has_permission(
    new.facility_id,
    case when tg_op = 'INSERT' then 'create_bookings' else 'edit_bookings' end
  );

  if v_is_staff then
    return new;
  end if;

  if tg_op = 'INSERT' then
    if coalesce(new.base_price, 0) <> 0 or coalesce(new.total_cost, 0) <> 0 then
      new.details := coalesce(new.details, '{}'::jsonb) || jsonb_build_object(
        'requestedQuote', jsonb_build_object(
          'basePrice', new.base_price,
          'discount',  new.discount,
          'totalCost', new.total_cost,
          'quotedAt',  now()
        )
      );
    end if;

    new.status         := 'request_submitted'::public.booking_status;
    new.base_price     := 0;
    new.discount       := 0;
    new.total_cost     := 0;
    new.tip_amount     := null;

    new.assigned_staff_id   := null;
    new.assigned_staff_name := null;

    return new;
  end if;

  if old.status not in (
       'pending', 'request_submitted', 'estimate_sent', 'waitlisted', 'confirmed'
     )
  then
    raise exception 'This booking can no longer be changed.'
      using errcode = '42501';
  end if;

  if new.status is distinct from old.status
     and new.status <> 'cancelled'::public.booking_status
  then
    raise exception 'You may only cancel this booking.'
      using errcode = '42501';
  end if;

  new.client_id           := old.client_id;
  new.service             := old.service;
  new.service_type        := old.service_type;
  new.base_price          := old.base_price;
  new.discount            := old.discount;
  new.total_cost          := old.total_cost;
  new.tip_amount          := old.tip_amount;
  new.start_at            := old.start_at;
  new.end_at              := old.end_at;
  new.assigned_staff_id   := old.assigned_staff_id;
  new.assigned_staff_name := old.assigned_staff_name;

  return new;
end;
$function$;

-- ── What the owner is offered ─────────────────────────────────────────────

create or replace function public.yipyy_go_offered_add_ons(p_booking_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $fn$
declare
  v_booking public.bookings;
begin
  select * into v_booking from public.bookings where id = p_booking_id;
  if not found
     or not (
       private.yipyy_go_is_owner(v_booking.client_id)
       or private.has_permission(v_booking.facility_id, 'view_bookings')
     )
  then
    raise exception 'That booking is not yours.' using errcode = '42501';
  end if;

  if private.yipyy_go_requirement(v_booking.facility_id, v_booking.service) is null then
    return '[]'::jsonb;
  end if;

  return coalesce((
    select jsonb_agg(jsonb_build_object(
             'id', o.offer ->> 'id',
             'name', o.offer ->> 'name',
             'description', o.offer ->> 'description',
             'pricingType', o.offer ->> 'pricingType',
             'unitPrice', pr.unit_price,
             'unitLabel', o.offer ->> 'unitLabel',
             'maxQuantity', (o.offer ->> 'maxQuantity')::int,
             'petScope', o.offer ->> 'petScope'
           ) order by o.ord)
      from (
        select private.yipyy_go_offered_add_on(v_booking, ids.id) as offer, ids.ord
          from (
            select g.id::text as id, g.display_order::bigint as ord
              from public.grooming_add_ons g
             where v_booking.service = 'grooming'
               and g.facility_id = v_booking.facility_id
               and g.is_active
            union all
            select a.value ->> 'id', a.ordinality
              from public.facility_settings s
              cross join lateral jsonb_array_elements(
                case when jsonb_typeof(s.value -> 'addOns') = 'array' then s.value -> 'addOns' else '[]'::jsonb end
              ) with ordinality a(value, ordinality)
             where v_booking.service <> 'grooming'
               and s.facility_id = v_booking.facility_id
               and s.domain = 'service_addons'
          ) ids
      ) o
      cross join lateral private.yipyy_go_price_add_on(v_booking, o.offer, 1) pr
     where o.offer is not null
  ), '[]'::jsonb);
end;
$fn$;

-- ── Who hears about a submission ──────────────────────────────────────────

-- The facility's active owners and admins, while the form is sent. For the
-- server alone: a customer's submission must reach people whose addresses the
-- customer may not read.
create or replace function public.yipyy_go_staff_recipients(p_submission_id uuid)
returns table (email text, full_name text)
language sql
stable
security definer
set search_path = ''
as $fn$
  select distinct p.email::text, p.full_name::text
    from public.yipyy_go_submissions y
    join public.facility_memberships m
      on m.facility_id = y.facility_id
     and m.is_active
     and m.role::text in ('owner', 'admin')
    join public.profiles p on p.id::text = m.profile_id::text
   where y.id = p_submission_id
     and y.status = 'submitted'
     and p.email is not null
     and btrim(p.email::text) <> '';
$fn$;

-- ── Submitting and reviewing now reach the bill ───────────────────────────

create or replace function public.submit_yipyy_go_form(
  p_booking_id uuid,
  p_pet_id uuid,
  p_answers jsonb,
  p_add_on_requests jsonb default '[]'::jsonb,
  p_tip jsonb default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  v_booking  public.bookings;
  v_settings jsonb;
  v_status   text;
  v_name     text;
  v_row      public.yipyy_go_submissions;
  v_entering boolean;
  v_req      jsonb;
begin
  select * into v_booking from public.bookings where id = p_booking_id for update;
  if not found
     or not private.yipyy_go_is_owner(v_booking.client_id)
     or not exists (
       select 1 from public.booking_pets bp where bp.booking_id = p_booking_id and bp.pet_id = p_pet_id
     )
  then
    raise exception 'That booking is not yours.' using errcode = '42501';
  end if;

  if private.yipyy_go_requirement(v_booking.facility_id, v_booking.service) is null then
    raise exception 'This booking does not ask for a pre-arrival form.' using errcode = '22023';
  end if;

  select status into v_status from public.yipyy_go_submissions
   where booking_id = p_booking_id and pet_id = p_pet_id;
  if not coalesce(private.yipyy_go_editable(p_booking_id, v_status), false) then
    raise exception 'This form can no longer be changed.' using errcode = '22023';
  end if;

  if p_tip is not null and jsonb_typeof(p_tip) <> 'object' then
    raise exception 'That is not a tip.' using errcode = '22023';
  end if;
  if p_add_on_requests is not null and jsonb_typeof(p_add_on_requests) <> 'array' then
    raise exception 'That is not a list of add-ons.' using errcode = '22023';
  end if;
  for v_req in select e.value from jsonb_array_elements(coalesce(p_add_on_requests, '[]'::jsonb)) e(value) loop
    if jsonb_typeof(v_req) <> 'object'
       or (v_req ? 'quantity' and jsonb_typeof(v_req -> 'quantity') <> 'number')
       or private.yipyy_go_offered_add_on(v_booking, v_req ->> 'addOnId') is null
    then
      raise exception 'That add-on is not offered on this booking.' using errcode = '22023';
    end if;
  end loop;

  select c.name into v_name from public.clients c where c.id = v_booking.client_id;

  insert into public.yipyy_go_submissions as y
    (booking_id, pet_id, status, answers, add_on_requests, tip_choice, submitted_at, submitted_by_name)
  values
    (p_booking_id, p_pet_id, 'submitted', coalesce(p_answers, '{}'::jsonb),
     coalesce(p_add_on_requests, '[]'::jsonb), p_tip, now(), nullif(left(btrim(coalesce(v_name, '')), 200), ''))
  on conflict (booking_id, pet_id) do update
     set status = 'submitted',
         answers = excluded.answers,
         add_on_requests = excluded.add_on_requests,
         tip_choice = excluded.tip_choice,
         submitted_at = excluded.submitted_at,
         submitted_by_name = excluded.submitted_by_name
  returning * into v_row;

  perform private.yipyy_go_write_charges(p_booking_id);
  perform private.yipyy_go_pledge_tip(p_booking_id, p_tip);

  select s.value into v_settings from public.facility_settings s
   where s.facility_id = v_booking.facility_id and s.domain = 'yipyy_go_config';
  v_entering := v_status is distinct from 'submitted';

  return jsonb_build_object(
    'submission', to_jsonb(v_row),
    'notifyStaff', v_entering and coalesce((v_settings ->> 'notifyStaffEmailOnSubmit')::boolean, false),
    'sendConfirmation', v_entering and coalesce((v_settings -> 'confirmationEmail' ->> 'enabled')::boolean, false),
    'charges', coalesce((
      select jsonb_agg(jsonb_build_object(
               'key', c.charge_key, 'kind', c.kind, 'name', c.name,
               'unitPrice', c.unit_price, 'quantity', c.quantity,
               'onBill', c.line_item_id is not null
             ) order by c.created_at)
        from public.yipyy_go_charges c
       where c.booking_id = p_booking_id
    ), '[]'::jsonb),
    'tipAmount', (select b.tip_amount from public.bookings b where b.id = p_booking_id)
  );
end;
$fn$;

create or replace function public.review_yipyy_go_submission(
  p_submission_id uuid,
  p_action text,
  p_message text default null,
  p_by_name text default null
)
returns public.yipyy_go_submissions
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  v_row public.yipyy_go_submissions;
begin
  select * into v_row from public.yipyy_go_submissions where id = p_submission_id for update;
  if not found or not private.has_permission(v_row.facility_id, 'edit_bookings') then
    raise exception 'That form is not yours to review.' using errcode = '42501';
  end if;

  if p_action = 'approve' then
    if v_row.status <> 'submitted' then
      raise exception 'Only a sent form can be approved.' using errcode = '22023';
    end if;
    update public.yipyy_go_submissions
       set status = 'approved',
           reviewed_at = now(),
           reviewed_by_name = nullif(left(btrim(coalesce(p_by_name, '')), 200), '')
     where id = p_submission_id
    returning * into v_row;
  elsif p_action = 'request_changes' then
    if v_row.status not in ('submitted', 'approved') then
      raise exception 'Only a sent form can be sent back.' using errcode = '22023';
    end if;
    if p_message is null or length(btrim(p_message)) not between 1 and 1000 then
      raise exception 'Say what needs changing.' using errcode = '22023';
    end if;
    update public.yipyy_go_submissions
       set status = 'changes_requested',
           changes_message = btrim(p_message),
           reviewed_at = now(),
           reviewed_by_name = nullif(left(btrim(coalesce(p_by_name, '')), 200), '')
     where id = p_submission_id
    returning * into v_row;
  else
    raise exception 'That is not a review action.' using errcode = '22023';
  end if;

  -- Approval puts a staff-approved form's charges on the bill; sending a form
  -- back takes them off until it is sent again.
  perform private.yipyy_go_write_charges(v_row.booking_id);

  return v_row;
end;
$fn$;

-- ── Grants ────────────────────────────────────────────────────────────────

revoke all on function private.yipyy_go_stay_days(public.bookings) from public;
revoke all on function private.yipyy_go_stay_days(public.bookings) from anon;
revoke all on function private.yipyy_go_offered_add_on(public.bookings, text) from public;
revoke all on function private.yipyy_go_offered_add_on(public.bookings, text) from anon;
revoke all on function private.yipyy_go_price_add_on(public.bookings, jsonb, integer) from public;
revoke all on function private.yipyy_go_price_add_on(public.bookings, jsonb, integer) from anon;
revoke all on function private.yipyy_go_medication_doses(jsonb, integer) from public;
revoke all on function private.yipyy_go_medication_doses(jsonb, integer) from anon;
revoke all on function private.yipyy_go_write_charges(uuid) from public;
revoke all on function private.yipyy_go_write_charges(uuid) from anon;
revoke all on function private.yipyy_go_pledge_tip(uuid, jsonb) from public;
revoke all on function private.yipyy_go_pledge_tip(uuid, jsonb) from anon;

do $grants$
declare
  v_fn text;
begin
  foreach v_fn in array array[
    'public.yipyy_go_offered_add_ons(uuid)',
    'public.submit_yipyy_go_form(uuid, uuid, jsonb, jsonb, jsonb)',
    'public.review_yipyy_go_submission(uuid, text, text, text)'
  ] loop
    execute format('revoke all on function %s from public', v_fn);
    execute format('revoke all on function %s from anon', v_fn);
    execute format('grant execute on function %s to authenticated', v_fn);
  end loop;
end;
$grants$;

revoke all on function public.yipyy_go_staff_recipients(uuid) from public;
revoke all on function public.yipyy_go_staff_recipients(uuid) from anon;
revoke all on function public.yipyy_go_staff_recipients(uuid) from authenticated;
grant execute on function public.yipyy_go_staff_recipients(uuid) to service_role;

alter table public.yipyy_go_charges enable row level security;

revoke all on public.yipyy_go_charges from public;
revoke all on public.yipyy_go_charges from anon;
revoke all on public.yipyy_go_charges from authenticated;
grant select on public.yipyy_go_charges to authenticated;
grant all on public.yipyy_go_charges to service_role;

drop policy if exists yipyy_go_charges_read on public.yipyy_go_charges;
create policy yipyy_go_charges_read on public.yipyy_go_charges
  for select using (
    private.is_platform_admin()
    or private.has_permission(facility_id, 'view_bookings')
    or exists (
      select 1 from public.bookings b
       where b.id = yipyy_go_charges.booking_id
         and b.client_id in (select private.own_client_ids())
    )
  );

-- ── A revoke is not verified by having been written ───────────────────────

do $check$
begin
  if has_table_privilege('anon', 'public.yipyy_go_charges', 'select') then
    raise exception 'anon can read pre-arrival charges';
  end if;
  if has_table_privilege('authenticated', 'public.yipyy_go_charges', 'insert')
     or has_table_privilege('authenticated', 'public.yipyy_go_charges', 'update')
     or has_table_privilege('authenticated', 'public.yipyy_go_charges', 'delete') then
    raise exception 'authenticated can write pre-arrival charges without the functions';
  end if;
  if has_function_privilege('authenticated', 'public.yipyy_go_staff_recipients(uuid)', 'execute')
     or has_function_privilege('anon', 'public.yipyy_go_staff_recipients(uuid)', 'execute') then
    raise exception 'a signed-in user can list a facility''s staff emails';
  end if;
  if not has_function_privilege('service_role', 'public.yipyy_go_staff_recipients(uuid)', 'execute') then
    raise exception 'service_role cannot list recipients';
  end if;
  if has_function_privilege('anon', 'public.yipyy_go_offered_add_ons(uuid)', 'execute')
     or has_function_privilege('anon', 'private.yipyy_go_write_charges(uuid)', 'execute')
     or has_function_privilege('anon', 'private.yipyy_go_pledge_tip(uuid, jsonb)', 'execute')
     or has_function_privilege('anon', 'private.yipyy_go_offered_add_on(public.bookings, text)', 'execute')
     or has_function_privilege('anon', 'private.yipyy_go_price_add_on(public.bookings, jsonb, integer)', 'execute')
     or has_function_privilege('anon', 'private.yipyy_go_stay_days(public.bookings)', 'execute')
     or has_function_privilege('anon', 'private.yipyy_go_medication_doses(jsonb, integer)', 'execute') then
    raise exception 'anon can execute a pre-arrival charge function';
  end if;
  if has_function_privilege('authenticated', 'private.yipyy_go_write_charges(uuid)', 'execute')
     or has_function_privilege('authenticated', 'private.yipyy_go_pledge_tip(uuid, jsonb)', 'execute') then
    raise exception 'authenticated can write charges or a tip without submitting';
  end if;
end;
$check$;
