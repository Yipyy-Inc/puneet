-- ============================================================================
-- Every balance now measures against what the booking COSTS, not its price.
--
-- Second half of 20260806820000, and the half that makes the first safe. Three
-- derivations compared `amount_paid` against `total_cost`, which is the
-- BOOKING's price and says nothing about the bag of food added at pickup.
-- Shipping the line-items table without this would mean a $100 booking with
-- $30 of extras reading PAID at $100, and the $30 never chased.
--
--   private.derive_booking_payment      'paid' / 'pending' / 'refunded'
--   private.client_outstanding_balance  what the client owes
--   public.settle_bookings              what a bulk payment charges
--
-- ── A GENERATED COLUMN IS NOT VISIBLE TO A BEFORE TRIGGER ──────────────────
--
-- `amount_due` is `generated always as (total_cost + extras_total) stored`, and
-- Postgres computes stored generated columns AFTER before-row triggers. So
-- inside `derive_booking_payment` — a BEFORE trigger — `new.amount_due` is not
-- the value about to be written; on an INSERT it is null.
--
-- Reading it there would have made every new booking 'pending' regardless, and
-- 'pending' is the right answer often enough that it would have looked fine.
-- That trigger adds `new.total_cost + new.extras_total` itself. The other two
-- are ordinary reads of committed rows and use the column.
--
-- ── THE PASS-THROUGH HAS TO KNOW ABOUT THE NEW COLUMNS ─────────────────────
--
-- `private.line_item_moves_the_booking` updates `bookings.extras_total`, and
-- `bookings_enforce_integrity` lets a write past untouched only when nothing
-- BUT the derived money columns moved (20260806700000). `extras_total` and
-- `amount_due` are now two of those. Without adding them, a `retail` user — who
-- holds `retail_process_sale` and not `edit_bookings` — adding a bag of food to
-- a checked-in booking falls into the customer path and is refused with "This
-- booking can no longer be changed."
-- ============================================================================

create or replace function private.derive_booking_payment()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  -- NOT new.amount_due: see the header. This is the same sum the generated
  -- column will hold once the row lands.
  v_due numeric(10,2) := new.total_cost + new.extras_total;
begin
  new.amount_paid := private.booking_amount_paid(new.id);

  new.payment_status := case
    when private.booking_was_refunded(new.id) and new.amount_paid <= 0
      then 'refunded'
    when new.amount_paid > 0 and new.amount_paid >= v_due
      then 'paid'
    else 'pending'
  end;

  return new;
end;
$$;

comment on function private.derive_booking_payment is
  'Overwrites bookings.amount_paid and payment_status from the payments ledger, measured against total_cost + extras_total. Runs for EVERY writer including service_role.';

create or replace function private.client_outstanding_balance(p_client_id uuid)
returns numeric
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(sum(b.amount_due - b.amount_paid), 0)::numeric(12,2)
    from public.bookings b
   where b.client_id = p_client_id
     and b.status in ('ready', 'completed')
     and b.amount_due > b.amount_paid;
$$;

comment on function private.client_outstanding_balance is
  'What DELIVERED bookings have not settled: ready and completed only, measured against amount_due so anything added at the counter is chased too.';

create or replace function public.settle_bookings(
  p_facility_id      uuid,
  p_method           text,
  p_booking_ids      uuid[],
  p_receipt_channels text[] default '{}'
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_booking record;
  v_balance numeric(10,2);
  v_settled jsonb := '[]'::jsonb;
begin
  if p_booking_ids is null or array_length(p_booking_ids, 1) is null then
    raise exception 'No bookings were named.' using errcode = '22023';
  end if;

  for v_booking in
    select b.id, b.ref, b.client_id, b.facility_id,
           (b.amount_due - b.amount_paid)::numeric(10,2) as balance
      from public.bookings b
     where b.id = any(p_booking_ids)
     order by b.ref
  loop
    if v_booking.facility_id is distinct from p_facility_id then
      raise exception 'Booking % belongs to a different facility.', v_booking.ref
        using errcode = '42501';
    end if;

    v_balance := v_booking.balance;

    if v_balance is null or v_balance <= 0 then
      continue;
    end if;

    perform public.record_payment(
      p_facility_id      => p_facility_id,
      p_method           => p_method,
      p_subtotal         => v_balance,
      p_tax              => 0,
      p_tip              => 0,
      p_amount_charged   => v_balance,
      p_grand_total      => v_balance,
      p_booking_id       => v_booking.id,
      p_client_id        => v_booking.client_id,
      p_cash_received    => case when p_method = 'cash' then v_balance end,
      p_receipt_channels => p_receipt_channels
    );

    v_settled := v_settled || jsonb_build_object(
      'bookingRef', v_booking.ref,
      'amount',     v_balance
    );
  end loop;

  return v_settled;
end;
$$;

comment on function public.settle_bookings is
  'Settles the outstanding balance on several bookings in ONE transaction, measured against amount_due. Takes booking ids, computes each amount from the ledger, and returns what it actually took.';

-- ── The pass-through learns the two new columns ─────────────────────────────

create or replace function private.enforce_booking_integrity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
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

  if (select auth.uid()) is null then
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
$$;

-- ── Nothing to reconcile, asserted rather than assumed ──────────────────────

do $$
declare v_items integer; v_wrong integer;
begin
  select count(*) into v_items from public.booking_line_items;
  if v_items <> 0 then
    raise exception 'Expected no line items yet; found %.', v_items;
  end if;

  -- amount_due must equal total_cost everywhere while extras are all zero. If
  -- it does not, the generated column is not what this migration thinks it is.
  select count(*) into v_wrong from public.bookings
   where amount_due is distinct from total_cost;
  if v_wrong <> 0 then
    raise exception '% booking(s) have amount_due <> total_cost with no extras.',
      v_wrong;
  end if;
end;
$$;
