-- ============================================================================
-- A SERVICE CAN SAY IT IS NOT TAXED.
--
-- Reported by the client on 2026-09-21, about the rate editor: "Then choose
-- taxes if they want to skip taxes for any service we can unselect taxes."
--
-- The facility's tax config has been all-or-nothing for the whole business
-- since it became real: a facility charging GST and QST charged them on every
-- booking of every service. Real businesses do not work that way — a training
-- course, a boarding class or a service supplied to a registered charity can be
-- exempt while everything beside it is taxed.
--
-- ── WHERE THE SWITCH LIVES ────────────────────────────────────────────────
--
-- On the priced thing, because that is what the facility creates and what the
-- client was looking at when they asked. Two of the four services price from a
-- table and get a column here; the other two price from a settings document and
-- get an optional field in their Zod schema instead. Custom modules have
-- carried `pricing.taxable` in their wizard since they were written — shown in
-- four places, read by nothing that takes money.
--
-- ── ABSENT MEANS TAXED, EVERYWHERE ────────────────────────────────────────
--
-- `not null default true` rather than a nullable boolean, in every table. Tax
-- that was charged and should not have been is a refund; tax that was NOT
-- charged and should have been is the facility's own money, paid to the
-- government at year end out of their pocket, for every booking since the
-- mistake. So nothing here is ever tax-free by omission — only by somebody
-- saying so.
--
-- ── AND THE CUSTOMER DOES NOT GET A VOTE ──────────────────────────────────
--
-- `bookings.taxable` records the answer for the booking, so a checkout does not
-- have to re-derive which rate priced a stay months later, and so a facility
-- changing a rate does not silently re-tax bookings already taken.
--
-- It is a COLUMN and not a key in `details` for one reason: read the customer
-- branch of private.enforce_booking_integrity below and note that `new.details`
-- is passed through untouched on insert. A customer posting
-- `{"taxable": false}` in their own booking's details would be believed. A
-- column can be pinned by the trigger, and is, in both directions:
--
--   * INSERT — forced to true, beside the price it already zeroes. The server
--     writes the real answer afterwards when it prices the booking, exactly as
--     it already does for base_price and total_cost.
--   * UPDATE — restored from old, beside the other columns a customer may not
--     move.
--
-- Rewritten from the LIVE pg_get_functiondef, not from a migration file: this
-- function has been replaced by the tip pledge (20260913135000) and the
-- presence mirror since it was last written down, and rebuilding it from an
-- older file would silently revert both.
-- ============================================================================

-- ── The two services that price from a table ────────────────────────────────

alter table public.room_categories
  add column if not exists taxable boolean not null default true;

comment on column public.room_categories.taxable is
  'Whether a boarding stay in this class is charged the facility''s tax. Default true: a class that has never been edited keeps charging tax. See 20260921171524.';

alter table public.grooming_services
  add column if not exists taxable boolean not null default true;

comment on column public.grooming_services.taxable is
  'Whether this grooming service is charged the facility''s tax. Default true — see 20260921171524.';

-- ── What the booking was actually priced under ──────────────────────────────

alter table public.bookings
  add column if not exists taxable boolean not null default true;

comment on column public.bookings.taxable is
  'Whether this booking''s OWN service price is taxed. Extras (booking_line_items) are taxed regardless — a tax-free service does not make a bag of food tax-free. Written by the server when it prices the booking; pinned to true for anything a customer inserts. See 20260921171524.';

-- ── The customer may not set it ─────────────────────────────────────────────

create or replace function private.enforce_booking_integrity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_client_facility uuid;
  v_is_staff        boolean;
  v_terms           jsonb;
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

  -- The presence mirror (private.mirror_presence_to_booking): a status-only
  -- move to one of the three statuses the mirror writes.
  if tg_op = 'UPDATE'
     and coalesce(current_setting('yipyy.presence_sync', true), '') = 'on'
     and new.status in ('checked_in', 'completed', 'confirmed')
     and (to_jsonb(new) - v_derived - 'status') = (to_jsonb(old) - v_derived - 'status')
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

    -- Whether tax is charged is not the payer's to decide. The server sets the
    -- real answer when it prices this booking; until then it is taxed, which is
    -- what every booking in the product did before this column existed.
    new.taxable        := true;

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

  -- A customer's cancellation: refused once a booking has started, and
  -- recorded with the terms it was made under. Only this block writes
  -- details.cancellation.
  if new.status = 'cancelled'::public.booking_status
     and old.status <> 'cancelled'::public.booking_status
  then
    v_terms := private.cancel_terms(old.facility_id, old.status, old.start_at);
    if (v_terms->>'started')::boolean and not (v_terms->>'withdrawal')::boolean then
      raise exception 'This booking has already started. Ask the facility to cancel it.'
        using errcode = '55000';
    end if;
    new.details := coalesce(new.details, '{}'::jsonb) || jsonb_build_object(
      'cancellation', (v_terms - 'started') || jsonb_build_object(
        'by', 'customer',
        'at', now(),
        'reason', nullif(left(btrim(coalesce(
          current_setting('yipyy.cancel_reason', true), '')), 500), '')));
  elsif old.details ? 'cancellation' then
    new.details := coalesce(new.details, '{}'::jsonb)
      || jsonb_build_object('cancellation', old.details->'cancellation');
  else
    new.details := coalesce(new.details, '{}'::jsonb) - 'cancellation';
  end if;

  new.client_id           := old.client_id;
  new.service             := old.service;
  new.service_type        := old.service_type;
  new.base_price          := old.base_price;
  new.discount            := old.discount;
  new.total_cost          := old.total_cost;
  new.tip_amount          := old.tip_amount;
  new.taxable             := old.taxable;
  new.start_at            := old.start_at;
  new.end_at              := old.end_at;
  new.assigned_staff_id   := old.assigned_staff_id;
  new.assigned_staff_name := old.assigned_staff_name;

  return new;
end;
$function$;

-- ── And training, where the priced thing is not the program ─────────────────
--
-- The Rates tab's programs are a CATALOGUE. What actually prices a training
-- booking is `training_series.total_price` — a series is created standalone,
-- with its own name, course-type name and price, and carries no reference to
-- the program it was modelled on. So a switch on the program alone would have
-- been read by nothing at checkout: exactly the inert-money-switch defect this
-- whole change exists to remove (custom modules have had one since they were
-- written).
--
-- Both carry the flag. The program's is what a facility sets when it builds
-- its offer; the series' is what a booking is actually resolved against.

alter table public.training_series
  add column if not exists taxable boolean not null default true;

comment on column public.training_series.taxable is
  'Whether enrolment in this series is charged the facility''s tax. The SERIES rather than the program, because training_series.total_price is what actually prices a training booking and a series carries no reference to the program it was modelled on. Default true — see 20260921171524.';
