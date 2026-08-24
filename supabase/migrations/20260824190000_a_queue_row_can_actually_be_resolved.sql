-- ============================================================================
-- The rows were readable and nothing could ever resolve them.
--
-- 20260824100000 created `unattached_payments` with RLS on and ONE policy, for
-- SELECT. Its own comment inside `dismiss_unattached_payment` says:
--
--     -- INVOKER cannot help here: there is no UPDATE policy on this table, so
--     -- the permission is asked for directly.
--
-- That sentence contains the bug. "No UPDATE policy" does not mean "UPDATE is
-- unrestricted, so check the permission yourself" — it means **no row is
-- updatable at all**. RLS excludes every row from the UPDATE before the
-- predicate in the WHERE clause is ever evaluated, so `has_permission(...)`
-- was never the thing being tested. Both resolving functions are
-- `security invoker` by deliberate design, which is exactly why they were
-- subject to this and a definer function would not have been.
--
-- ── HOW EACH ONE FAILED, AND WHY ONE WAS MUCH WORSE ───────────────────────
--
-- `dismiss_unattached_payment` returns `row_count > 0`, so it returned false
-- and the screen said so. Wrong, but honest, and that is the only reason this
-- was caught by a person clicking "Not a Yipyy payment" on a 11¢ test charge.
--
-- `attach_unattached_payment` did something far worse, silently:
--
--     1. insert into public.payments        -> SUCCEEDS (payments has a policy)
--     2. update unattached_payments         -> 0 rows, no error
--     3. return v_payment                   -> the caller reports success
--
-- The ledger row is written and PERMANENT — `payments` is append-only, revoked
-- from every role including service_role — while the queue row stays
-- `unattached`. So the payment reappears in "payments to attach", and the next
-- press writes a SECOND ledger row for the same Clover payment. A facility
-- tidying their queue would double their own takings, twice over, with the
-- screen agreeing each time.
--
-- ── THE FIX IS THE MISSING POLICY, PLUS A REFUSAL TO TRUST IT ─────────────
--
-- The policy restores what invoker was supposed to mean. The row_count check in
-- `attach` is the part that matters more: an irreversible INSERT followed by a
-- silent zero-row UPDATE must never again be reportable as success. Raising
-- rolls the INSERT back too, which is the only correct outcome — either both
-- happen or neither does.
--
-- `payments` is append-only, so the ORDER was considered and rejected: claiming
-- the queue row first is impossible, because `unattached_attached_has_payment`
-- requires the payment id the claim would not yet have. The raise is what makes
-- the two atomic, not the sequence.
--
-- `bun run check:rls-writes` exists for precisely this shape and did not catch
-- it: it reads API routes, and this is a plpgsql function. Noted in the debt
-- map rather than quietly worked around.
-- ============================================================================

-- Resolving is the same decision as taking a payment, with either answer.
-- Dropped first because this was applied to the live database by hand the
-- moment it was found, and a migration that cannot be replayed is a migration
-- that fails for the next person who builds this schema from nothing.
drop policy if exists unattached_payments_resolve on public.unattached_payments;
create policy unattached_payments_resolve
  on public.unattached_payments
  for update
  using       (private.has_permission(facility_id, 'financial_take_payment'))
  with check  (private.has_permission(facility_id, 'financial_take_payment'));

-- `authenticated` needs the table grant as well as the policy; the policy alone
-- is not a privilege. SELECT was granted with the read policy; UPDATE was not.
grant update on public.unattached_payments to authenticated;

-- ── attach: never report a payment it did not finish placing ──────────────
create or replace function public.attach_unattached_payment(
  p_id uuid,
  p_booking_ref bigint default null,
  p_client_id uuid default null,
  p_note text default null
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_row       public.unattached_payments;
  v_booking   public.bookings;
  v_client    uuid;
  v_payment   uuid;
  v_subtotal  numeric(10,2);
  v_tax       numeric(10,2);
  v_tip       numeric(10,2);
  v_changed   integer;
begin
  select * into v_row
    from public.unattached_payments
   where id = p_id;

  if v_row.id is null then
    raise exception 'No such payment.' using errcode = '42704';
  end if;

  if v_row.status <> 'unattached' then
    raise exception 'That payment has already been dealt with.'
      using errcode = '42501';
  end if;

  if p_booking_ref is null and p_client_id is null then
    raise exception 'Say which booking or which client this belongs to.'
      using errcode = '22023';
  end if;

  if p_booking_ref is not null then
    select * into v_booking
      from public.bookings
     where ref = p_booking_ref
       and facility_id = v_row.facility_id;

    if v_booking.id is null then
      raise exception 'No booking % at this facility.', p_booking_ref
        using errcode = '42704';
    end if;

    v_client := coalesce(p_client_id, v_booking.client_id);
  else
    v_client := p_client_id;
  end if;

  v_subtotal := (v_row.amount_cents - v_row.tip_cents - v_row.tax_cents) / 100.0;
  v_tax      := v_row.tax_cents / 100.0;
  v_tip      := v_row.tip_cents / 100.0;

  insert into public.payments (
    facility_id, booking_id, client_id, method,
    subtotal, tax, tip,
    amount_charged, grand_total,
    processor, processor_payment_id,
    processor_order_id, processor_merchant_id, processor_device_serial,
    card_brand, card_last4, entry_method,
    author_name
  )
  values (
    v_row.facility_id, v_booking.id, v_client,
    case when v_row.entry_method = 'ecom' then 'new-card' else 'terminal' end,
    v_subtotal, v_tax, v_tip,
    v_row.amount_cents / 100.0, v_row.amount_cents / 100.0,
    v_row.processor, v_row.processor_payment_id,
    v_row.processor_order_id, v_row.processor_merchant_id,
    v_row.processor_device_serial,
    v_row.card_brand, v_row.card_last4, v_row.entry_method,
    'Attached from Clover'
  )
  returning id into v_payment;

  -- THE ROW COUNT IS THE WHOLE FIX. The insert above cannot be undone by
  -- anything except failing this transaction, so this update must either move
  -- the queue row or take the ledger row down with it.
  --
  -- The first attempt at this claimed the queue row BEFORE inserting, reasoning
  -- that nothing irreversible should happen until the reversible thing had
  -- provably succeeded. That is a good instinct and it was wrong here:
  -- `unattached_attached_has_payment` requires `attached_payment_id` whenever
  -- the status is 'attached', so there is no valid moment to claim a row before
  -- the payment it points at exists. Raising after the insert is equivalent and
  -- legal — the exception rolls the insert back with it. Found by C5c, which
  -- was written in the same change and failed on the first run.
  update public.unattached_payments
     set status = 'attached',
         attached_payment_id = v_payment,
         resolved_by = (select auth.jwt() ->> 'sub'),
         resolved_at = now(),
         note = p_note,
         updated_at = now()
   where id = p_id
     and status = 'unattached';

  get diagnostics v_changed = row_count;
  if v_changed = 0 then
    -- No policy, no permission, or somebody claimed it in between. All three
    -- mean the same thing: this transaction must not leave a ledger row behind.
    raise exception
      'That payment could not be claimed — either somebody else dealt with it first, or you cannot take payments at this facility.'
      using errcode = '42501';
  end if;

  return v_payment;
end;
$$;

comment on function public.attach_unattached_payment(uuid, bigint, uuid, text) is
  'Places a Clover payment against a booking. Claims the queue row BEFORE writing the append-only ledger row and refuses on a zero-row claim, so a payment can never be recorded twice. security invoker: payments_insert and the resolve policy both judge the caller.';
