-- ============================================================================
-- AN ADD-ON IS A LINE ON THE BILL.
--
-- Until now a booking's add-ons were money folded into `bookings.total_cost`
-- and a list in `details.extraServices` (grooming's in their own table). So an
-- add-on appeared on no receipt or invoice, was taxed by the SERVICE's flag
-- whatever its own said, could carry no staff member, and an edit to its price
-- could not reach the bookings already holding it — every one of which the
-- reference's add-on setup expects.
--
-- The booking's own add-ons are `booking_line_items` of kind 'add_on' now,
-- the precedent custom fees set (20260806820000, Decision 3): `total_cost` is
-- the SERVICE, and a customer owes `total_cost + extras_total - discount`.
--
-- ── WHO WRITES THEM, AND AT WHAT PRICE ─────────────────────────────────────
--
-- `create_booking(s)` run as the caller, and a line needs
-- `retail_process_sale` — which a customer and a groomer do not hold. So
-- `private.place_add_on_lines` writes them as its owner, after checking
-- `private.can_write_booking`, and prices each one from the catalogue at the
-- booking's location (`private.add_on_for_booking`, the rule the booking
-- form's total has applied since the one add-ons list, 20260926223644:
-- active, not deleted, at this location, for this type of service). A price
-- in the request is never read. A customer's lines are not zeroed as the
-- service is: the catalogue is the facility's own number, and a number from
-- the customer's browser is the reason the service's is zeroed.
--
-- ── WHERE THEY LAND ────────────────────────────────────────────────────────
--
-- The wizard splits a request into one booking per daycare DAY or boarding
-- ROOM and copies `details.extraServices` onto every part. Lines are written
-- ONCE per request: a pet's add-on on the part that holds that pet, anything
-- else on the request's first booking (lowest ref) — the service charges'
-- precedent. A daycare pet is on every day, so its add-ons go on the first.
-- A request's parts share `details.bookingGroup.id`.
--
-- ── `add_ons_total`, SO NOTHING THAT COUNTED THEM STOPS ────────────────────
--
-- `bookings.add_ons_total` is the booking's `add_on` lines, derived with
-- `extras_total`. Only the booking's OWN selection is written as `add_on`
-- (check-in extras, the ops calendar and the pre-arrival form still write
-- `item`, as before), so `add_ons_total` is exactly the money that used to sit
-- in `total_cost` — and every reader that must keep counting it reads
-- `total_cost + add_ons_total`: the commission basis, the cancellation and
-- deposit percentages, the bookings page's totals, the occupancy report's
-- revenue and a rebook reminder's return, each changed below where it stands.
--
-- Existing bookings are left as they are: their add-on money stays in
-- `total_cost`, with `add_ons_total` 0.
-- ============================================================================

-- ── The line ────────────────────────────────────────────────────────────────

alter table public.booking_line_items
  drop constraint booking_line_items_kind_check,
  add constraint booking_line_items_kind_check
    check (kind = any (array['item', 'fee', 'add_on']));

alter table public.booking_line_items
  add column add_on_id    uuid references public.service_add_ons (id) on delete set null,
  add column pet_id       uuid references public.pets (id) on delete set null,
  add column staff_id     uuid references public.staff (id) on delete set null,
  add column duration_min integer
    check (duration_min is null or duration_min between 0 and 1440);

create index booking_line_items_add_on_idx
  on public.booking_line_items (add_on_id) where add_on_id is not null;

comment on column public.booking_line_items.add_on_id is
  'For kind add_on: the add-on this line is. Deleting the add-on keeps the line (name and price are the line''s own).';
comment on column public.booking_line_items.pet_id is
  'For kind add_on: the pet it is for, when the booking said.';
comment on column public.booking_line_items.staff_id is
  'For kind add_on: the member of staff it is assigned to — "does this add-on require staff?", yes.';
comment on column public.booking_line_items.duration_min is
  'For kind add_on: the minutes one of it adds to the appointment.';

-- ── What the booking's own add-ons come to ─────────────────────────────────

alter table public.bookings
  add column add_ons_total numeric(10,2) not null default 0;

comment on column public.bookings.add_ons_total is
  'The booking''s add_on lines — derived with extras_total, and inside it. What total_cost held for add-ons before 2026-09-30, so a reader that counted them reads total_cost + add_ons_total.';

create or replace function private.booking_add_ons_total(p_booking_id uuid)
returns numeric
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(sum(li.price), 0)::numeric(10,2)
    from public.booking_line_items li
   where li.booking_id = p_booking_id
     and li.kind = 'add_on';
$$;

revoke all on function private.booking_add_ons_total(uuid) from public, anon;

-- ── What an add-on costs on this booking, if it may be on it at all ────────

create or replace function private.add_on_for_booking(
  p_booking public.bookings,
  p_requested text
)
returns table (
  add_on_id      uuid,
  name           text,
  price          numeric,
  taxable        boolean,
  duration_min   integer,
  requires_staff boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  select a.id,
         a.name,
         coalesce(o.price, a.price),
         coalesce(o.taxable, a.taxable),
         coalesce(o.duration_min, a.duration_min),
         a.requires_staff
    from public.service_add_ons a
    left join public.service_add_on_location_overrides o
      on o.add_on_id = a.id and o.location_id = p_booking.location_id
   where a.facility_id = p_booking.facility_id
     and (a.legacy_id = p_requested or a.id::text = p_requested)
     and a.is_active
     and a.archived_at is null
     -- A booking with no location is not refused by one, as in the wizard.
     and (cardinality(a.location_ids) = 0
          or p_booking.location_id is null
          or p_booking.location_id = any (a.location_ids))
     and (a.applies_to_all_services
          or exists (
            select 1 from unnest(a.service_refs) r(ref)
             where r.ref = p_booking.service
                or r.ref like p_booking.service || ':%'
                or r.ref = 'custom:' || p_booking.service))
   limit 1;
$$;

revoke all on function private.add_on_for_booking(public.bookings, text) from public, anon;

-- ── Writing a request's add-ons as lines ───────────────────────────────────
--
-- `p_lines` is the booking's selection as the wizard saves it:
-- [{serviceId, quantity, petId, staffId?}] — `serviceId` the add-on's legacy
-- id or uuid, `petId` the pet's ref. Returns how many lines the request holds
-- for it afterwards.
--
-- THREE CALLERS, THREE MODES:
--
--   'create'  — a new request. Every line is written at the catalogue's
--               price; one the booking may not have refuses the lot.
--   'replace' — an edit to the selection. A line the request already has
--               (same add-on, same pet) is KEPT as it was sold, with its new
--               quantity and staff member; a new one is priced from the
--               catalogue, and refused as in 'create'; one no longer chosen
--               is removed. So an add-on the facility has since deleted stays
--               on the bookings that bought it, and cannot block an edit.
--   'adopt'   — a booking made before these lines existed, re-priced by an
--               edit. Its add-ons are written at today's prices; one the
--               catalogue no longer offers is left out, as the edit form has
--               always left it out of the total.

create or replace function private.place_add_on_lines(
  p_booking_id uuid,
  p_lines jsonb,
  p_mode text default 'create'
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_booking   public.bookings;
  v_group     text;
  v_first     uuid;
  v_line      jsonb;
  v_requested text;
  v_qty       integer;
  v_target    uuid;
  v_pet       uuid;
  v_staff     uuid;
  v_on        public.bookings;
  v_terms     record;
  v_line_id   uuid;
  v_held      uuid[] := '{}';
  v_name      text;
  v_named     text;
begin
  if p_mode not in ('create', 'replace', 'adopt') then
    raise exception 'place_add_on_lines: unknown mode %.', p_mode
      using errcode = '22023';
  end if;
  if p_lines is null or jsonb_typeof(p_lines) <> 'array' then
    p_lines := '[]'::jsonb;
  end if;
  -- Nothing chosen is nothing to write — except in an edit, where it means
  -- "take them all off".
  if p_mode <> 'replace' and jsonb_array_length(p_lines) = 0 then
    return 0;
  end if;

  select * into v_booking from public.bookings where id = p_booking_id;
  if not found then
    raise exception 'That booking does not exist.' using errcode = 'P0002';
  end if;
  if not private.can_write_booking(p_booking_id) then
    raise exception 'You may not change this booking''s add-ons.'
      using errcode = '42501';
  end if;

  -- The request's first booking: where an add-on goes unless its pet is on
  -- another part. A booking made alone is its own request.
  v_group := nullif(v_booking.details->'bookingGroup'->>'id', '');
  select b.id into v_first
    from public.bookings b
   where b.facility_id = v_booking.facility_id
     and (b.id = p_booking_id
          or (v_group is not null and b.details->'bookingGroup'->>'id' = v_group))
   order by b.ref
   limit 1;

  for v_line in select value from jsonb_array_elements(p_lines) loop
    v_requested := nullif(btrim(coalesce(v_line->>'serviceId', '')), '');
    v_qty := case
      when coalesce(v_line->>'quantity', '') ~ '^\d{1,4}$'
        then (v_line->>'quantity')::integer
      else 1
    end;
    continue when v_requested is null or v_qty < 1;

    -- The pet, among the request's own bookings — and the part that holds
    -- it, preferring the first when every part does (a daycare pet is on
    -- every day).
    v_pet := null;
    v_target := v_first;
    if coalesce(v_line->>'petId', '') ~ '^\d{1,18}$' then
      select p.id, b.id into v_pet, v_target
        from public.booking_pets bp
        join public.pets p on p.id = bp.pet_id
        join public.bookings b on b.id = bp.booking_id
       where p.ref = (v_line->>'petId')::bigint
         and b.facility_id = v_booking.facility_id
         and (b.id = p_booking_id
              or (v_group is not null and b.details->'bookingGroup'->>'id' = v_group))
       order by (b.id = v_first) desc, b.ref
       limit 1;
      if v_target is null then
        v_target := v_first;
      end if;
    end if;

    -- Who it is assigned to, as the staff list names them: a legacy id or
    -- the row's uuid. Somebody from another facility is nobody.
    v_staff := null;
    v_named := nullif(btrim(coalesce(v_line->>'staffId', '')), '');
    if v_named is not null then
      select s.id into v_staff
        from public.staff s
       where s.facility_id = v_booking.facility_id
         and (s.legacy_id = v_named or s.id::text = v_named)
       limit 1;
    end if;

    -- An edit keeps a line the request already has, as it was sold.
    if p_mode = 'replace' then
      select li.id into v_line_id
        from public.booking_line_items li
        join public.bookings b on b.id = li.booking_id
       where li.kind = 'add_on'
         and li.source_id = 'booking:' || v_requested
         and li.pet_id is not distinct from v_pet
         and not (li.id = any (v_held))
         and b.facility_id = v_booking.facility_id
         and (b.id = p_booking_id
              or (v_group is not null and b.details->'bookingGroup'->>'id' = v_group))
       order by li.created_at, li.id
       limit 1;
      if found then
        update public.booking_line_items
           set quantity = v_qty, staff_id = v_staff
         where id = v_line_id
           and (quantity, staff_id) is distinct from (v_qty, v_staff);
        v_held := v_held || v_line_id;
        continue;
      end if;
    end if;

    select * into v_on from public.bookings where id = v_target;
    select * into v_terms from private.add_on_for_booking(v_on, v_requested);
    if not found then
      continue when p_mode = 'adopt';
      -- Named, when the facility has it at all: switched off, deleted, or
      -- not for this service or location. An id means nothing to the
      -- person reading the refusal.
      select a.name into v_name
        from public.service_add_ons a
       where a.facility_id = v_booking.facility_id
         and (a.legacy_id = v_requested or a.id::text = v_requested)
       limit 1;
      raise exception '%', case
          when v_name is null
            then 'This booking names an add-on this facility does not have.'
          else format('%s is not offered on this booking. Take it off and try again.', v_name)
        end
        using errcode = '23503';
    end if;

    -- "Does this add-on require staff?" Yes, and nobody was chosen: whoever
    -- the booking is with — a groom's groomer — until somebody says
    -- otherwise.
    if v_staff is null and v_terms.requires_staff then
      v_staff := v_on.assigned_staff_id;
    end if;

    insert into public.booking_line_items (
      booking_id, facility_id, kind, name, unit_price, quantity, taxable,
      source_id, add_on_id, pet_id, staff_id, duration_min, author_name
    ) values (
      v_target, v_booking.facility_id, 'add_on', v_terms.name, v_terms.price,
      v_qty, v_terms.taxable, 'booking:' || v_requested, v_terms.add_on_id,
      v_pet, v_staff, v_terms.duration_min, 'Booking'
    )
    returning id into v_line_id;
    v_held := v_held || v_line_id;
  end loop;

  -- An edit takes off what is no longer chosen — the request's OWN lines
  -- only; what was added at check-in, on the calendar or by the pre-arrival
  -- form is not this function's to touch.
  if p_mode = 'replace' then
    delete from public.booking_line_items li
     using public.bookings b
     where li.booking_id = b.id
       and li.kind = 'add_on'
       and li.source_id like 'booking:%'
       and not (li.id = any (v_held))
       and b.facility_id = v_booking.facility_id
       and (b.id = p_booking_id
            or (v_group is not null and b.details->'bookingGroup'->>'id' = v_group));
  end if;

  return coalesce(array_length(v_held, 1), 0);
end;
$$;

revoke all on function private.place_add_on_lines(uuid, jsonb, text) from public, anon;
-- `create_bookings` runs as the caller and calls this; its own check is
-- `can_write_booking`, and the private schema is not in the API.
grant execute on function private.place_add_on_lines(uuid, jsonb, text) to authenticated;

-- ── An edit to a booking's add-ons ─────────────────────────────────────────
--
-- The request's own add-on lines follow the new selection ('replace', above),
-- across the whole request, and the selection is copied to the request's
-- other parts so every day or room lists the same add-ons. Lines added any
-- other way (check-in, the calendar, the pre-arrival form) are not touched.

create or replace function public.set_booking_add_ons(
  p_booking_id uuid,
  p_lines jsonb,
  -- For an edit that re-prices the booking without changing its add-ons:
  -- write them only if the request has none of its own yet — a booking made
  -- before 2026-09-30, whose add-on money the new total no longer holds
  -- ('adopt', above). A request that has them keeps them as they were sold.
  p_only_if_missing boolean default false
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_booking public.bookings;
  v_group   text;
begin
  select * into v_booking from public.bookings where id = p_booking_id;
  if not found or not private.can_write_booking(p_booking_id) then
    raise exception 'You may not change this booking''s add-ons.'
      using errcode = '42501';
  end if;

  v_group := nullif(v_booking.details->'bookingGroup'->>'id', '');

  if p_only_if_missing then
    if exists (
      select 1
        from public.booking_line_items li
        join public.bookings b on b.id = li.booking_id
       where li.kind = 'add_on'
         and li.source_id like 'booking:%'
         and b.facility_id = v_booking.facility_id
         and (b.id = p_booking_id
              or (v_group is not null and b.details->'bookingGroup'->>'id' = v_group))
    ) then
      return 0;
    end if;
    return private.place_add_on_lines(p_booking_id, p_lines, 'adopt');
  end if;

  if v_group is not null then
    update public.bookings b
       set details = jsonb_set(b.details, '{extraServices}',
                               coalesce(p_lines, '[]'::jsonb))
     where b.facility_id = v_booking.facility_id
       and b.details->'bookingGroup'->>'id' = v_group
       and b.id <> p_booking_id;
  end if;

  return private.place_add_on_lines(p_booking_id, p_lines, 'replace');
end;
$$;

revoke all on function public.set_booking_add_ons(uuid, jsonb, boolean) from public, anon;
grant execute on function public.set_booking_add_ons(uuid, jsonb, boolean) to authenticated;

comment on function public.set_booking_add_ons(uuid, jsonb, boolean) is
  'Bring a booking''s own add-on lines (source booking:*) to a new selection, across its request: kept lines stay as sold, new ones are priced from the catalogue, dropped ones are removed. Staff who may create or edit bookings, or the booking''s client while it is open.';

-- ── Nobody hand-writes an `add_on` line ─────────────────────────────────────
--
-- `add_ons_total` is read as "what the booking's own selection costs at the
-- catalogue's price" — by the commission, the deposit and the percentage
-- fees. That holds only if an `add_on` line can come from nowhere but the
-- functions above, which run as their owner and so are not subject to these
-- policies. What is sold at the counter stays 'item' or 'fee', as before, and
-- taking a line off a bill (delete) is unchanged.

drop policy booking_line_items_insert on public.booking_line_items;
create policy booking_line_items_insert on public.booking_line_items
  for insert
  with check (
    kind <> 'add_on'
    and private.has_permission(facility_id, 'retail_process_sale')
  );

drop policy booking_line_items_update on public.booking_line_items;
create policy booking_line_items_update on public.booking_line_items
  for update
  using (private.has_permission(facility_id, 'retail_process_sale'))
  with check (
    kind <> 'add_on'
    and private.has_permission(facility_id, 'retail_process_sale')
  );

-- ── Creating bookings writes their add-ons ─────────────────────────────────
--
-- Unchanged but for the last block: a request's add-ons travel ONCE, as
-- `addOns` on its first item, and are placed after every part exists — so a
-- pet's add-on can land on the part that holds it.

create or replace function public.create_bookings(p_items jsonb)
returns table(item_index integer, booking_id uuid, booking_ref bigint)
language plpgsql
set search_path to ''
as $function$
declare
  v_item    jsonb;
  v_index   integer := 0;
  v_pets    uuid[];
  v_created record;
  v_move    jsonb;
  v_first   uuid;
begin
  if p_items is null or jsonb_typeof(p_items) <> 'array'
     or jsonb_array_length(p_items) = 0 then
    raise exception 'create_bookings needs at least one booking.'
      using errcode = '22023';
  end if;

  if jsonb_array_length(p_items) > 100 then
    raise exception 'create_bookings takes at most 100 bookings at once.'
      using errcode = '22023';
  end if;

  for v_item in select value from jsonb_array_elements(p_items) loop
    select coalesce(array_agg(x::uuid), '{}'::uuid[]) into v_pets
      from jsonb_array_elements_text(coalesce(v_item->'petIds', '[]'::jsonb)) x;

    select * into v_created from public.create_booking(
      v_item->'booking',
      v_pets,
      nullif(v_item->'grooming', 'null'::jsonb),
      nullif(nullif(v_item->'boarding', 'null'::jsonb) - 'moves', '{}'::jsonb)
    );

    -- The kennel changes planned with the booking, earliest first, in this
    -- same transaction: a taken kennel refuses the lot.
    for v_move in
      select value
        from jsonb_array_elements(coalesce(v_item->'boarding'->'moves', '[]'::jsonb))
       order by (value->>'from')::date
    loop
      perform public.split_boarding_stay(
        v_created.booking_ref,
        (v_move->>'from')::date,
        v_move->>'roomId',
        nullif(trim(coalesce(v_move->>'overrideReason', '')), ''));
    end loop;

    if v_index = 0 then
      v_first := v_created.booking_id;
    end if;

    item_index  := v_index;
    booking_id  := v_created.booking_id;
    booking_ref := v_created.booking_ref;
    return next;
    v_index := v_index + 1;
  end loop;

  -- The request's add-ons, once, now that every part exists (2026-09-30).
  perform private.place_add_on_lines(v_first, p_items->0->'addOns');
end;
$function$;

-- ── The readers that must keep counting add-ons ───────────────────────────
--
-- Eight functions measured a booking by `total_cost`. Each is changed WHERE
-- IT STANDS: its definition is read (`pg_get_functiondef`), one passage is
-- replaced, and the result is run. Nothing else about the function can move,
-- and a passage that is not there exactly once stops the migration instead of
-- patching the wrong thing. (Restating eight bodies — one of them four
-- hundred lines — to change a line in each is how a function loses an edit
-- made to it since it was last copied.)
--
--   1  derive_booking_extras      derives `add_ons_total` with the extras
--   2  derive_booking_commission  a variable for the service and its add-ons,
--   3                             and the basis taken of it
--   4  cancellation_terms         a percentage fee is of both
--   5  deposit_for_booking        a percentage deposit is of both
--   6  booking_facility_totals    the bookings page's totals count both
--   7  sync_grooming_lifecycle    the ready time counts the lines' minutes
--   8  facility_report_dataset    the occupancy report's revenue per night
--   9  rebook_history             what a rebook reminder brought back

do $patch$
declare
  v_patch record;
  v_def   text;
  v_hits  integer;
begin
  for v_patch in
    select *
      from (values
        (1, 'private.derive_booking_extras()'::regprocedure,
$a$  new.taxable_extras_total := private.booking_taxable_extras_total(new.id);
$a$,
$b$  new.taxable_extras_total := private.booking_taxable_extras_total(new.id);
  new.add_ons_total := private.booking_add_ons_total(new.id);
$b$),

        (2, 'private.derive_booking_commission()'::regprocedure,
$a$  v_gross  numeric(12,4);
$a$,
$b$  v_gross  numeric(12,4);
  v_service numeric(12,2);
$b$),

        (3, 'private.derive_booking_commission()'::regprocedure,
$a$  v_gross := coalesce(new.total_cost, 0) + coalesce(new.extras_total, 0);
  v_basis := case
    when v_gross <= 0 then 0
    else greatest(
      0,
      round(
        coalesce(new.total_cost, 0)
          - coalesce(new.discount, 0) * (coalesce(new.total_cost, 0) / v_gross),
        2)
    )
  end;
$a$,
$b$  -- The booking's own add-ons count as the service always has: they were
  -- inside `total_cost` until they became `add_on` lines, and a groomer does
  -- not stop earning on a nail trim because it moved (add_ons_total, 2026-09-30).
  v_service := coalesce(new.total_cost, 0) + coalesce(new.add_ons_total, 0);
  v_gross := coalesce(new.total_cost, 0) + coalesce(new.extras_total, 0);
  v_basis := case
    when v_gross <= 0 then 0
    else greatest(
      0,
      round(
        v_service
          - coalesce(new.discount, 0) * (v_service / v_gross),
        2)
    )
  end;
$b$),

        (4, 'private.cancellation_terms(public.bookings)'::regprocedure,
$a$  v_total    numeric := coalesce(b.total_cost, 0);
$a$,
$b$  -- The service and its own add-ons, as `total_cost` held them before the
  -- add-ons became `add_on` lines (2026-09-30).
  v_total    numeric := coalesce(b.total_cost, 0) + coalesce(b.add_ons_total, 0);
$b$),

        (5, 'private.deposit_for_booking(public.bookings)'::regprocedure,
$a$  v_total numeric := coalesce(b.total_cost, 0);
$a$,
$b$  -- The service and its own add-ons (see cancellation_terms, 2026-09-30).
  v_total numeric := coalesce(b.total_cost, 0) + coalesce(b.add_ons_total, 0);
$b$),

        (6, 'public.booking_facility_totals(uuid, uuid, uuid)'::regprocedure,
$a$           b.total_cost,
$a$,
$b$           b.total_cost + b.add_ons_total as total_cost,
$b$),

        (7, 'private.sync_grooming_lifecycle()'::regprocedure,
$a$    select coalesce(sum(duration_min), 0) into v_add_mins
      from public.grooming_appointment_add_ons where booking_id = new.id;
$a$,
$b$    -- The add-ons' minutes: the old table for bookings made before
    -- 2026-09-30, the booking's `add_on` lines since.
    select coalesce(sum(duration_min), 0) into v_add_mins
      from (
        select duration_min from public.grooming_appointment_add_ons
         where booking_id = new.id
        union all
        select coalesce(li.duration_min, 0) * li.quantity
          from public.booking_line_items li
         where li.booking_id = new.id and li.kind = 'add_on'
      ) minutes;
$b$),

        (8, 'public.facility_report_dataset(uuid, text, timestamptz, timestamptz, timestamptz, timestamptz)'::regprocedure,
$a$      select b.start_at, b.end_at, b.total_cost,
$a$,
$b$      -- A stay's revenue is its service and its own add-ons, as `total_cost`
      -- held them before the add-ons became lines (add_ons_total, 2026-09-30).
      select b.start_at, b.end_at, b.total_cost + b.add_ons_total as total_cost,
$b$),

        (9, 'public.rebook_history(uuid, integer)'::regprocedure,
$a$    select b.created_at, b.total_cost
$a$,
$b$    -- The service and its own add-ons (add_ons_total, 2026-09-30).
    select b.created_at, b.total_cost + b.add_ons_total as total_cost
$b$)
      ) as p(step, fn, was, becomes)
     order by step
  loop
    v_def  := pg_get_functiondef(v_patch.fn);
    v_hits := (length(v_def) - length(replace(v_def, v_patch.was, '')))
              / length(v_patch.was);
    if v_hits <> 1 then
      raise exception 'Patching %: the passage is there % time(s), not once: %',
        v_patch.fn, v_hits, v_patch.was;
    end if;
    execute replace(v_def, v_patch.was, v_patch.becomes);
  end loop;
end
$patch$;

-- ── "Apply the changes to all unconfirmed upcoming appointments?" ──────────
--
-- The reference asks this after an add-on is edited. Yes brings the add-on's
-- lines on every UNCONFIRMED booking that has not started — pending, a
-- customer's request, waitlisted or still an estimate: the statuses before
-- confirmation, the ones `can_write_booking` calls open — to its current
-- name, price (at that booking's location), tax and minutes. No leaves them
-- as they were sold. A confirmed booking keeps what was agreed either way.
-- The extras, the tax and the ready time follow through the existing
-- triggers.

create or replace function public.add_on_upcoming_bookings(p_add_on uuid)
returns integer
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_facility uuid;
begin
  select a.facility_id into v_facility
    from public.service_add_ons a where a.id = p_add_on;
  if v_facility is null
     or not private.has_permission(v_facility, 'manage_services') then
    raise exception 'You may not change this facility''s add-ons.'
      using errcode = '42501';
  end if;

  return (
    select count(distinct li.booking_id)::integer
      from public.booking_line_items li
      join public.bookings b on b.id = li.booking_id
     where li.add_on_id = p_add_on
       and li.kind = 'add_on'
       and b.status in ('pending', 'request_submitted', 'waitlisted', 'estimate_sent')
       and b.start_at >= now()
  );
end;
$$;

revoke all on function public.add_on_upcoming_bookings(uuid) from public, anon;
grant execute on function public.add_on_upcoming_bookings(uuid) to authenticated;

comment on function public.add_on_upcoming_bookings(uuid) is
  'How many unconfirmed bookings that have not started carry this add-on — what "apply the changes to upcoming appointments?" would change. manage_services.';

create or replace function public.apply_add_on_to_upcoming(p_add_on uuid)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_facility uuid;
  v_bookings integer;
begin
  select a.facility_id into v_facility
    from public.service_add_ons a where a.id = p_add_on;
  if v_facility is null
     or not private.has_permission(v_facility, 'manage_services') then
    raise exception 'You may not change this facility''s add-ons.'
      using errcode = '42501';
  end if;

  select count(distinct li.booking_id)::integer into v_bookings
    from public.booking_line_items li
    join public.bookings b on b.id = li.booking_id
   where li.add_on_id = p_add_on
     and li.kind = 'add_on'
     and b.status in ('pending', 'request_submitted', 'waitlisted', 'estimate_sent')
     and b.start_at >= now();

  update public.booking_line_items li
     set name         = a.name,
         unit_price   = coalesce(o.price, a.price),
         taxable      = coalesce(o.taxable, a.taxable),
         duration_min = coalesce(o.duration_min, a.duration_min)
    from public.bookings b
    join public.service_add_ons a on a.id = p_add_on
    left join public.service_add_on_location_overrides o
      on o.add_on_id = a.id and o.location_id = b.location_id
   where li.booking_id = b.id
     and li.add_on_id = p_add_on
     and li.kind = 'add_on'
     and b.status in ('pending', 'request_submitted', 'waitlisted', 'estimate_sent')
     and b.start_at >= now();

  return v_bookings;
end;
$$;

revoke all on function public.apply_add_on_to_upcoming(uuid) from public, anon;
grant execute on function public.apply_add_on_to_upcoming(uuid) to authenticated;

comment on function public.apply_add_on_to_upcoming(uuid) is
  'Bring this add-on''s lines on every unconfirmed booking that has not started to its current name, price (at the booking''s location), tax and minutes. Returns the number of bookings changed. manage_services.';
