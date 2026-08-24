-- ============================================================================
-- The identifiers that make one system out of two.
--
-- ── WHY THE IDS GO ON THE PAYMENT ROW ─────────────────────────────────────
--
-- A Clover payment currently arrives carrying an order, a merchant and a device,
-- and Yipyy keeps exactly one of the four: `processor_payment_id`. So a payment
-- is reconcilable but not explicable — you can prove it happened and not say
-- which terminal took it or what was sold.
--
-- The merchant id is the one people argue about, because it looks derivable:
-- `payment_connections` already knows which merchant a facility uses. It is
-- derivable TODAY and wrong TOMORROW. A facility that disconnects and reconnects
-- against a different merchant would rewrite the origin of every payment it has
-- ever taken. The merchant that took the money is a fact about the payment.
--
-- ── AND WHY AN UNCLAIMED PAYMENT NEEDS ITS OWN TABLE ──────────────────────
--
-- `public.payments` is append-only, and not by convention: UPDATE, DELETE and
-- TRUNCATE are revoked from every role INCLUDING service_role, there is no
-- update policy anywhere, and `payments_block_update` raises for the table owner
-- too. So "record it now, attach it to a booking later" is not available — the
-- attach would be an UPDATE.
--
-- A payment taken on the merchant's own device therefore waits in
-- `unattached_payments` and BECOMES a payments row at the moment somebody says
-- which booking it belongs to. That is the same two-stage shape
-- `payment_intents` → `payments` already uses, for the same reason: the ledger
-- records what is settled, and something not yet settled does not belong in it.
--
-- ── THE TWO FUNCTIONS HAVE DIFFERENT SECURITY, DELIBERATELY ───────────────
--
--   record_unattached_payment   definer, service_role   — nobody is signed in;
--                                                         Clover is calling
--   attach_unattached_payment   INVOKER                 — a person is signed in,
--                                                         so `payments_insert`
--                                                         decides, and it asks
--                                                         for financial_take_payment
--
-- Making the second one definer would have been easier and would have moved the
-- authorisation decision out of the policy and into this file, where nobody
-- reviewing permissions would look for it. `set_booking_tip_split` made the same
-- call for the same reason.
-- ============================================================================

-- ── The identifiers ───────────────────────────────────────────────────────

alter table public.payments
  add column if not exists processor_order_id      text,
  add column if not exists processor_merchant_id   text,
  add column if not exists processor_device_serial text;

comment on column public.payments.processor_order_id is
  'Clover''s order id, when one exists. Card-present sales have none: the REST Pay Display API is documented as payment-only and will not accept an order id.';
comment on column public.payments.processor_merchant_id is
  'The merchant that took this money, as it was AT THE TIME. Not read from payment_connections, which describes the merchant a facility uses now.';
comment on column public.payments.processor_device_serial is
  'Which terminal took it. The SERIAL — what X-Clover-Device-Id actually wants — not Clover''s device id.';

-- Answering "what did this facility take on that terminal" without a seq scan.
-- Partial: almost every row is online or cash and has no serial at all.
create index if not exists payments_by_device
  on public.payments (facility_id, processor_device_serial)
  where processor_device_serial is not null;

alter table public.payment_intents
  add column if not exists processor_order_id text;

-- The reconciler is about to look payments up by Clover's id on this table, and
-- the column has had no index at all since it was added.
create index if not exists payment_intents_processor_payment
  on public.payment_intents (processor_payment_id)
  where processor_payment_id is not null;

-- ── The lost-sale index ───────────────────────────────────────────────────
--
-- `externalPaymentId` is sent to Clover as the intent id with its dashes
-- stripped (lib/clover/terminal.ts), because Clover caps that field at 32
-- characters and a uuid with dashes is 36. It has been going out since the
-- terminal path was built and has never once been read back.
--
-- It is the only identifier that can rescue a terminal sale whose 150-second
-- HTTP response was lost: Clover has the money, Yipyy has an intent and no
-- payment, and the webhook that follows currently resolves to `not_ours`.
--
-- An EXPRESSION index rather than a stored column, because the value is not a
-- second fact — it is this row's own id, written differently. A column would be
-- a copy that can disagree with its source.

create index if not exists payment_intents_external_payment_id
  on public.payment_intents ((replace(id::text, '-', '')));

-- ── One merchant, one facility ────────────────────────────────────────────
--
-- Both the webhook route and `record_payment_webhook` resolve merchant→facility
-- with a single-row read and no ordering. With a plain index that is an
-- assumption; a second facility on the same merchant would send one of them the
-- other's payments, and which one would depend on the plan.
--
-- Verified before writing this: one connection exists, one merchant, nothing
-- shared. So the constraint records a rule that already holds rather than
-- imposing one that might not.

create unique index if not exists payment_connections_merchant_identity
  on public.payment_connections (processor, merchant_id);

-- Where the sweep got to. Null means never swept, which is different from swept
-- and found nothing — the first run must look further back than the second.
alter table public.payment_connections
  add column if not exists last_swept_at timestamptz;

comment on column public.payment_connections.last_swept_at is
  'High-water mark for the reconciliation sweep. Null means never swept.';

-- ── A payment nobody has claimed ──────────────────────────────────────────

create table if not exists public.unattached_payments (
  id uuid primary key default gen_random_uuid(),

  facility_id uuid not null references public.facilities (id) on delete cascade,

  processor text not null default 'clover'
    check (processor in ('clover')),
  -- Clover's id for the payment. The whole point of the row.
  processor_payment_id    text not null,
  processor_order_id      text,
  processor_merchant_id   text,
  processor_device_serial text,

  -- CENTS, like payment_intents and unlike payments. This is what Clover said,
  -- not what Yipyy computed, and converting it to dollars before anybody has
  -- agreed what it belongs to would be doing arithmetic on evidence.
  amount_cents integer not null check (amount_cents >= 0),
  tip_cents    integer not null default 0 check (tip_cents >= 0),
  tax_cents    integer not null default 0 check (tax_cents >= 0),
  currency     text check (currency is null or currency ~ '^[A-Z]{3}$'),

  card_brand   text,
  card_last4   text check (card_last4 is null or card_last4 ~ '^[0-9]{4}$'),
  entry_method text check (
    entry_method is null
    or entry_method in ('swipe', 'chip', 'contactless', 'keyed', 'ecom', 'manual')
  ),

  -- Clover's own timestamp, not ours. A payment discovered by a sweep three
  -- days later still happened on the day it happened.
  taken_at timestamptz,

  -- The Clover payment verbatim, so a parsing mistake here is recoverable
  -- without asking Clover again. Same reasoning as payment_webhook_events.
  payload jsonb,

  status text not null default 'unattached'
    check (status in ('unattached', 'attached', 'dismissed')),

  attached_payment_id uuid references public.payments (id),
  resolved_by text,
  resolved_at timestamptz,
  -- Why it was dismissed, or which booking it went to. A terminal status with
  -- no reason is indistinguishable from a bug that dropped a payment.
  note text,

  discovered_at timestamptz not null default now(),
  updated_at    timestamptz not null default now(),

  constraint unattached_terminal_has_reason
    check (status = 'unattached' or note is not null or attached_payment_id is not null),
  constraint unattached_attached_has_payment
    check (status <> 'attached' or attached_payment_id is not null)
);

comment on table public.unattached_payments is
  'A card payment Clover has that Yipyy cannot place. Held here rather than in payments, which is append-only and could never be corrected afterwards.';

-- Idempotency is a constraint, not a convention: a replayed webhook and the
-- sweep both arrive with the same Clover id and must converge on one row.
create unique index if not exists unattached_payments_identity
  on public.unattached_payments (processor, processor_payment_id);

-- The query a facility actually runs: what is still waiting.
create index if not exists unattached_payments_outstanding
  on public.unattached_payments (facility_id, taken_at desc)
  where status = 'unattached';

-- ── Who may read it ───────────────────────────────────────────────────────
--
-- It carries an amount and a card's last four, so it is gated on the same
-- permission as the ledger it will become part of. No insert, update or delete
-- policy and no write grants: the only ways in are the two functions below.

alter table public.unattached_payments enable row level security;

revoke all on public.unattached_payments from anon;
revoke all on public.unattached_payments from public;

grant select on public.unattached_payments to authenticated;
grant select, insert, update on public.unattached_payments to service_role;

drop policy if exists unattached_payments_read on public.unattached_payments;
create policy unattached_payments_read on public.unattached_payments
  for select to authenticated
  using (
    private.is_platform_admin()
    or private.has_permission(facility_id, 'financial_view_amounts')
  );

-- ── Recording one ─────────────────────────────────────────────────────────

create or replace function public.record_unattached_payment(
  p_facility_id uuid,
  p_processor_payment_id text,
  p_amount_cents integer,
  p_tip_cents integer default 0,
  p_tax_cents integer default 0,
  p_currency text default null,
  p_processor_order_id text default null,
  p_processor_merchant_id text default null,
  p_processor_device_serial text default null,
  p_card_brand text default null,
  p_card_last4 text default null,
  p_entry_method text default null,
  p_taken_at timestamptz default null,
  p_payload jsonb default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
begin
  insert into public.unattached_payments (
    facility_id, processor, processor_payment_id,
    processor_order_id, processor_merchant_id, processor_device_serial,
    amount_cents, tip_cents, tax_cents, currency,
    card_brand, card_last4, entry_method, taken_at, payload
  )
  values (
    p_facility_id, 'clover', p_processor_payment_id,
    p_processor_order_id, p_processor_merchant_id, p_processor_device_serial,
    p_amount_cents, coalesce(p_tip_cents, 0), coalesce(p_tax_cents, 0), p_currency,
    p_card_brand, p_card_last4, p_entry_method, p_taken_at, p_payload
  )
  on conflict (processor, processor_payment_id) do nothing
  returning id into v_id;

  if v_id is not null then
    return v_id;
  end if;

  -- Already known. Hand back the original rather than deciding again — the same
  -- contract record_payment_webhook keeps, and for the same reason.
  select u.id into v_id
    from public.unattached_payments u
   where u.processor = 'clover'
     and u.processor_payment_id = p_processor_payment_id;

  return v_id;
end;
$$;

comment on function public.record_unattached_payment(
  uuid, text, integer, integer, integer, text, text, text, text, text, text,
  text, timestamptz, jsonb) is
  'Idempotent. Records a Clover payment Yipyy cannot place, or returns the row that already holds it.';

-- ── Attaching one ─────────────────────────────────────────────────────────
--
-- SECURITY INVOKER. The insert below is judged by `payments_insert`, which asks
-- for `financial_take_payment` — so a member who may look at the queue but not
-- take money can see the payment and cannot claim it.
--
-- The booking is named by its `ref`, the number staff actually read off a
-- screen, and resolved here. Taking a uuid would mean the caller had already
-- looked it up, which is one more read under one more policy.

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
begin
  -- Read under the caller's own policies. A row they cannot see does not exist
  -- to them, and saying "no such payment" rather than "not yours" tells an
  -- outsider nothing about what the facility holds.
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

  -- Cents to dollars, once, here. `payments_total_is_its_parts` will refuse the
  -- row if these three do not add up, which is the check that catches a
  -- rounding mistake rather than storing one.
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

  update public.unattached_payments
     set status = 'attached',
         attached_payment_id = v_payment,
         resolved_by = (select auth.jwt() ->> 'sub'),
         resolved_at = now(),
         note = p_note,
         updated_at = now()
   where id = p_id;

  return v_payment;
end;
$$;

comment on function public.attach_unattached_payment(uuid, bigint, uuid, text) is
  'Turns an unclaimed Clover payment into a ledger row against a booking. SECURITY INVOKER: payments_insert decides, so the caller needs financial_take_payment.';

-- Setting one aside — a test charge, a payment that belongs to another system.
-- It is not deleted: the evidence that Clover took money stays either way.
create or replace function public.dismiss_unattached_payment(
  p_id uuid,
  p_note text
)
returns boolean
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_changed integer;
begin
  if coalesce(trim(p_note), '') = '' then
    raise exception 'Say why this payment is being set aside.'
      using errcode = '22023';
  end if;

  update public.unattached_payments
     set status = 'dismissed',
         resolved_by = (select auth.jwt() ->> 'sub'),
         resolved_at = now(),
         note = p_note,
         updated_at = now()
   where id = p_id
     and status = 'unattached'
     -- INVOKER cannot help here: there is no UPDATE policy on this table, so
     -- the permission is asked for directly. `financial_take_payment` is the
     -- same key attaching requires — setting a payment aside is the same
     -- decision with the opposite answer.
     and private.has_permission(facility_id, 'financial_take_payment');

  get diagnostics v_changed = row_count;
  return v_changed > 0;
end;
$$;

comment on function public.dismiss_unattached_payment(uuid, text) is
  'Sets an unclaimed payment aside with a stated reason. Returns false when nothing moved — the caller must not report success on a zero-row update.';

-- ── The grants ARE the security boundary for the definer function ─────────

revoke all on function public.record_unattached_payment(
  uuid, text, integer, integer, integer, text, text, text, text, text, text,
  text, timestamptz, jsonb) from public, anon, authenticated;
grant execute on function public.record_unattached_payment(
  uuid, text, integer, integer, integer, text, text, text, text, text, text,
  text, timestamptz, jsonb) to service_role;

-- The invoker functions are safe for `authenticated` precisely BECAUSE they are
-- invoker: everything they touch is still judged by a policy or an explicit
-- permission check. `anon` holds no membership and so passes neither.
revoke all on function public.attach_unattached_payment(uuid, bigint, uuid, text)
  from public, anon;
grant execute on function public.attach_unattached_payment(uuid, bigint, uuid, text)
  to authenticated, service_role;

revoke all on function public.dismiss_unattached_payment(uuid, text)
  from public, anon;
grant execute on function public.dismiss_unattached_payment(uuid, text)
  to authenticated, service_role;

-- Keeps `updated_at` honest without every caller remembering.
drop trigger if exists unattached_payments_touch on public.unattached_payments;
create trigger unattached_payments_touch
  before update on public.unattached_payments
  for each row execute function private.set_updated_at();
