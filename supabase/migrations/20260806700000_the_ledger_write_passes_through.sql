-- ============================================================================
-- Letting the ledger move a booking, and reconciling the thirteen.
--
-- Second half of 20260806680000. Split because the first half can be read on
-- its own — "the status is derived" — while this one is about the two places
-- that fact collides with rules already written.
--
-- ── COLLISION 1: THE CASHIER IS NOT A BOOKING EDITOR ───────────────────────
--
-- `private.payment_moves_the_booking()` updates the booking, and it runs while
-- the CASHIER is the session user. `bookings_enforce_integrity` sees a non-null
-- auth.uid(), asks for `edit_bookings`, and reception and retail do not have
-- it — they have `financial_take_payment`. So the update falls into the
-- customer path and hits "This booking can no longer be changed", because a
-- booking being paid at checkout is checked-in or completed.
--
-- Without the branch below, a receptionist cannot take a payment at all on the
-- bookings receptionists actually take payments on. RLS is not the obstacle:
-- the trigger is SECURITY DEFINER and `bookings` is owned by postgres, which
-- holds BYPASSRLS. The obstacle is this trigger, and it has to be told.
--
-- The condition is NOT "who is calling". It is "what moved": every column but
-- the two derived ones is unchanged. Compared as jsonb rather than by listing
-- columns, so a column added next year is covered by default instead of
-- quietly joining the set anyone may edit for free.
--
-- A caller who UPDATEs nothing but `payment_status` also passes through here.
-- That is safe, and worth saying why rather than leaving it to be noticed:
-- `bookings_set_derived_payment` runs immediately afterwards and overwrites
-- whatever they wrote with the ledger's answer. The pass-through skips the
-- validations; it does not skip the derivation.
--
-- ── COLLISION 2: TWO ASSIGNMENTS THAT NOW DESCRIBE NOTHING ─────────────────
--
-- The customer path set `new.payment_status := 'pending'` on insert and
-- `:= old.payment_status` on update. Both are removed. Neither was wrong, and
-- neither would break anything if left — the derivation runs after them and
-- wins — but a line that assigns a value which is always discarded reads as
-- the rule, and the next person to change payment handling would edit it and
-- watch nothing happen.
--
-- ── THE RECONCILIATION ─────────────────────────────────────────────────────
--
-- Thirteen bookings say 'paid' with no money behind them. They get one payment
-- row each (Decision 4 in 20260806680000), which makes the strongest assertion
-- available here: the distribution must not move. 13 paid and 45 pending before,
-- 13 paid and 45 pending after — but true this time. Any other number means the
-- derivation is wrong, and it fails loudly at the bottom of this file.
--
-- The insert bypasses `payments_insert` (which would demand
-- `financial_take_payment` of a migration that has no session) because postgres
-- holds BYPASSRLS. Stated because `payments` is FORCE ROW LEVEL SECURITY, where
-- owning the table is not enough on its own.
-- ============================================================================

create or replace function private.enforce_booking_integrity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_client_facility uuid;
  v_is_staff        boolean;
begin
  -- 0. A LEDGER WRITE. Nothing but the derived money columns moved, so this is
  --    private.payment_moves_the_booking() rather than a person, and the
  --    checks below — which are about what a person may put in a booking —
  --    have nothing to say about it. See Collision 1 in the header.
  if tg_op = 'UPDATE'
     and (to_jsonb(new) - array['amount_paid', 'payment_status', 'updated_at'])
       = (to_jsonb(old) - array['amount_paid', 'payment_status', 'updated_at'])
  then
    return new;
  end if;

  -- 1. facility_id is DERIVED, never accepted. Validating the caller's value
  --    would work too; deriving it removes the parameter from the attack
  --    surface entirely. There is no legitimate booking whose facility differs
  --    from its client's.
  v_client_facility := private.facility_of_client(new.client_id);
  if v_client_facility is null then
    raise exception 'Booking references a client that does not exist.'
      using errcode = '23503';
  end if;
  new.facility_id := v_client_facility;

  -- 2. A location, if one is given, has to belong to that facility.
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

  -- 3. service_role — seeds, and any server-side job — bypasses RLS and has to
  --    bypass this too, or `bun run db:seed:apply` writes a database full of
  --    zero-priced requests. auth.uid() is null in exactly that case.
  --
  --    It does NOT bypass the payment derivation: that trigger has no such
  --    escape, which is why a seed can no longer write payment_status = 'paid'
  --    over an empty ledger. Thirteen rows were exactly that.
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

  -- ── Everything below is the customer path ────────────────────────────────

  if tg_op = 'INSERT' then
    -- A booking a customer makes is a REQUEST. The facility confirms it and the
    -- facility prices it. Keep what the browser quoted them — that is the
    -- number they will refer to on the phone — but keep it as a claim, in
    -- details, not as the price.
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
    -- payment_status is NOT set here any more. A new booking has no payments —
    -- it has no id anything could reference yet — so the derivation reaches
    -- 'pending' on its own, and it reaches it for the staff path too.

    -- Staffing is a rota decision, not a customer preference. The request can
    -- carry one in details; it does not get to set the column.
    new.assigned_staff_id   := null;
    new.assigned_staff_name := null;

    return new;
  end if;

  -- UPDATE by a customer, on their own booking, and only while it is still
  -- ahead of them. Once the pet is on site the record is the facility's.
  if old.status not in (
       'pending', 'request_submitted', 'estimate_sent', 'waitlisted', 'confirmed'
     )
  then
    raise exception 'This booking can no longer be changed.'
      using errcode = '42501';
  end if;

  -- Two moves are theirs: leave the status alone (they are editing their notes)
  -- or call the booking off. Anything else — confirming it, marking it paid,
  -- checking themselves in — is the facility's to do.
  if new.status is distinct from old.status
     and new.status <> 'cancelled'::public.booking_status
  then
    raise exception 'You may only cancel this booking.'
      using errcode = '42501';
  end if;

  -- Everything they do not own is put back rather than rejected, so the
  -- existing PATCH route — which merges the whole booking and sends it all —
  -- keeps working instead of erroring on fields it never meant to change.
  -- What is left writable: special_requests, and the long tail in details.
  --
  -- payment_status is absent from this list on purpose. Putting back the old
  -- value would be a rule that never fires: the derivation runs afterwards and
  -- computes it from the ledger for every writer, customer or not.
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

-- ── Reconciling the thirteen ────────────────────────────────────────────────
--
-- Cash, no tax, no tip, tendered exactly: the shape that satisfies every CHECK
-- on the table without inventing a tender that was never counted. `author_name`
-- says where it came from, because 'Staff' would be a claim about a person.

insert into public.payments
  (facility_id, booking_id, client_id, method,
   subtotal, tax, tip,
   store_credit_applied, package_pass_applied, loyalty_discount_applied,
   amount_charged, grand_total, cash_received,
   receipt_channels, author_name, created_at)
select b.facility_id, b.id, b.client_id, 'cash',
       b.total_cost, 0, 0,
       0, 0, 0,
       b.total_cost, b.total_cost, b.total_cost,
       '{}', 'Seed', b.created_at
  from public.bookings b
 where b.payment_status = 'paid'
   and b.total_cost > 0
   and not exists (
     select 1 from public.payments p where p.booking_id = b.id
   );

-- Everything else: recompute from an empty ledger, which is what 'pending'
-- means. The trigger does the arithmetic; this statement only has to touch the
-- rows. It passes through branch 0 above, which is the first thing that branch
-- is asked to do.
update public.bookings
   set amount_paid = private.booking_amount_paid(id);

-- ── The assertion this migration is built around ────────────────────────────

do $$
declare
  v_paid    integer;
  v_pending integer;
begin
  select count(*) filter (where payment_status = 'paid'),
         count(*) filter (where payment_status = 'pending')
    into v_paid, v_pending
    from public.bookings;

  if v_paid <> 13 or v_pending <> 45 then
    raise exception
      'Derivation disagrees with the fixture: % paid / % pending, expected 13 / 45.',
      v_paid, v_pending;
  end if;

  if exists (
    select 1 from public.bookings b
     where b.payment_status = 'paid'
       and b.amount_paid < b.total_cost
  ) then
    raise exception 'A booking reads paid for less than it costs.';
  end if;
end;
$$;
