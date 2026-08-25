-- ============================================================================
-- A refund says why it happened.
--
-- `RefundModal` has always asked for a reason. It prints it on the receipt, and
-- `useRefundBookingToCard` sends it to `/api/payments/clover/refund`, whose Zod
-- schema parses it — `reason: z.string().max(500).optional()` — and then never
-- reads it again. On the cash path it fared no better: it became `p_credit_note`
-- and landed on `store_credit_entries`, which only exists when the refund goes
-- back as credit. Refund $200 to a card with the reason "boarding shortened by
-- one night" and the string is gone the moment the dialog closes.
--
-- So the ledger could say a facility gave $200 back and could not say why —
-- which is the first question anybody asks about a refund, and the only one
-- that cannot be reconstructed from the amounts.
--
-- ── WHY A COLUMN AND NOT THE AUDIT TRAIL ──────────────────────────────────
--
-- `audit_log` is written by triggers from the ROW (`private.record_audit`). A
-- reason that is not a column is not in the row, so the trigger cannot capture
-- it. There was nowhere for it to go until here.
--
-- ── APPEND-ONLY IS NOT AN OBSTACLE ────────────────────────────────────────
--
-- `payments` refuses UPDATE and DELETE in three layers (triggers, revoked
-- grants, forced RLS with no policy). None of that is touched: `note` is
-- written at INSERT and never again, which is exactly the table's contract. A
-- reason that could be edited afterwards would be worth less than none.
--
-- ── THE 23rd ARGUMENT, AND THE TRAP 20260806760000 WARNED ABOUT ───────────
--
-- `create or replace function` with a different argument count creates an
-- OVERLOAD, not a replacement — two `record_payment`s would exist and PostgREST
-- would have to guess. So the 22-argument version is DROPPED first and the
-- 23-argument one created, which also means the grants must be restated:
-- dropping a function drops its ACL with it. Same shape as 20260806320000.
--
-- `p_credit_note` keeps its own job and its own name. It describes the
-- store-credit ENTRY — why a balance moved — and a payment's note is a
-- different sentence about a different row. Renaming an input parameter is
-- refused by `create or replace` anyway.
-- ============================================================================

alter table public.payments
  add column if not exists note text;

comment on column public.payments.note is
  'Why this payment or refund happened, in the operator''s own words. Written at insert and never updated, like every other column here. Null on an ordinary sale, where the line items already say it.';

-- ── The 22-argument version goes, so the 23-argument one replaces rather
--    than joins it ───────────────────────────────────────────────────────────

drop function if exists public.record_payment(
  uuid, text, numeric, numeric, numeric, numeric, numeric, uuid, uuid,
  numeric, numeric, numeric, numeric, text, text, text[], text,
  uuid, text, uuid, text, text
);

create or replace function public.record_payment(
  p_facility_id uuid,
  p_method text,
  p_subtotal numeric,
  p_tax numeric,
  p_tip numeric,
  p_amount_charged numeric,
  p_grand_total numeric,
  p_booking_id uuid default null,
  p_client_id uuid default null,
  p_store_credit_applied numeric default 0,
  p_package_pass_applied numeric default 0,
  p_loyalty_discount_applied numeric default 0,
  p_cash_received numeric default null,
  p_saved_card_id text default null,
  p_package_pass_id text default null,
  p_receipt_channels text[] default '{}',
  p_credit_note text default '',
  p_customer_package_id uuid default null,
  p_package_service_id text default null,
  p_pet_id uuid default null,
  p_pet_name text default null,
  p_service_label text default '',
  p_note text default null
)
returns jsonb
language plpgsql
-- Unchanged, and load-bearing: both inserts still face their own policies, so
-- the negative row needs `process_refund` and nothing here grants it.
security invoker
set search_path = ''
as $$
declare
  v_payment_id uuid;
  v_passes_remaining integer;
begin
  insert into public.payments
    (facility_id, booking_id, client_id, method,
     subtotal, tax, tip,
     store_credit_applied, package_pass_applied, loyalty_discount_applied,
     amount_charged, grand_total,
     cash_received, saved_card_id, package_pass_id, receipt_channels, note)
  values
    (p_facility_id, p_booking_id, p_client_id, p_method,
     p_subtotal, p_tax, p_tip,
     p_store_credit_applied, p_package_pass_applied, p_loyalty_discount_applied,
     p_amount_charged, p_grand_total,
     p_cash_received, p_saved_card_id, p_package_pass_id, p_receipt_channels,
     -- An empty string is not a reason. Stored as null so "nobody said" and
     -- "somebody typed nothing" read the same way in a report.
     nullif(btrim(coalesce(p_note, '')), ''))
  returning id into v_payment_id;

  -- Credit being SPENT. A negative ledger entry, same transaction as the
  -- payment claiming to have spent it.
  if p_store_credit_applied > 0 then
    if p_client_id is null then
      raise exception 'Store credit cannot be applied without a client.'
        using errcode = '23502';
    end if;
    insert into public.store_credit_entries
      (facility_id, client_id, amount, reason, note, booking_id, payment_id)
    values
      (p_facility_id, p_client_id, -p_store_credit_applied, 'redeemed',
       p_credit_note, p_booking_id, v_payment_id);
  end if;

  -- Credit being GIVEN. A refund whose method is store credit, so the money
  -- lands on the customer's balance rather than back on a card.
  if p_grand_total < 0 and p_method = 'store-credit' then
    if p_client_id is null then
      raise exception 'A refund to store credit needs a client to credit.'
        using errcode = '23502';
    end if;
    insert into public.store_credit_entries
      (facility_id, client_id, amount, reason, note, booking_id, payment_id)
    values
      (p_facility_id, p_client_id, -p_grand_total, 'refund',
       p_credit_note, p_booking_id, v_payment_id);
  end if;

  if p_customer_package_id is not null then
    if p_package_service_id is null then
      raise exception 'A pass redemption must name which service it is for.'
        using errcode = '23502';
    end if;
    v_passes_remaining := public.redeem_package_pass(
      p_customer_package_id, p_package_service_id, p_service_label,
      p_booking_id, p_pet_id, p_pet_name
    );
  end if;

  return jsonb_build_object(
    'payment_id', v_payment_id,
    'passes_remaining', v_passes_remaining
  );
end;
$$;

comment on function public.record_payment is
  'Records a payment and, in the SAME transaction, the store-credit entry it implies — negative when credit is spent, positive when a refund is issued as credit. p_note is why it happened, in the operator''s words. SECURITY INVOKER: every insert still faces its own table''s RLS.';

-- Dropping a function drops its ACL, so every grant is restated. `public` and
-- `anon` are revoked SEPARATELY and deliberately: they are different grants and
-- revoking one leaves the other standing (20260822610000 exists because that
-- was learned the expensive way).

revoke execute on function public.record_payment(
  uuid, text, numeric, numeric, numeric, numeric, numeric, uuid, uuid,
  numeric, numeric, numeric, numeric, text, text, text[], text,
  uuid, text, uuid, text, text, text
) from public;

revoke execute on function public.record_payment(
  uuid, text, numeric, numeric, numeric, numeric, numeric, uuid, uuid,
  numeric, numeric, numeric, numeric, text, text, text[], text,
  uuid, text, uuid, text, text, text
) from anon;

grant execute on function public.record_payment(
  uuid, text, numeric, numeric, numeric, numeric, numeric, uuid, uuid,
  numeric, numeric, numeric, numeric, text, text, text[], text,
  uuid, text, uuid, text, text, text
) to authenticated;
