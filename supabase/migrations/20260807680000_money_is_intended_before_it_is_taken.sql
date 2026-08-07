-- ============================================================================
-- Clover, phase 0b: the ledger's processor half, and the row that exists
-- BEFORE anyone is charged.
--
-- ── THE FAILURE THIS PREVENTS ─────────────────────────────────────────────
--
-- Today `record_payment` writes a row and the booking becomes paid. Nothing
-- authorised anything; it is bookkeeping. The moment a real processor is on the
-- other end there is a window that did not exist before:
--
--   1. we ask Clover for $80
--   2. Clover charges the card
--   3. the process dies / the network drops / the deploy rolls
--   4. no ledger row
--
-- The customer has paid and the system does not know. Worse, the obvious
-- recovery — the member of staff pressing the button again — charges them
-- twice, and nothing anywhere can tell that from two genuine payments.
--
-- A `payments` row cannot close that window, because it is written at step 4.
-- So an INTENT is written at step 0, before Clover is called, carrying the
-- idempotency key that will be sent. After a crash the intent is still there,
-- saying "we asked for $80 with key K and never heard back" — which is both the
-- thing to reconcile and the thing that makes the retry safe, because Clover
-- honours the key and returns the original charge rather than making a second.
--
-- ── PAYMENTS STAYS APPEND-ONLY, SO STATUS DOES NOT LIVE THERE ─────────────
--
-- `payments` is the immutable record of money actually taken; a refund is a new
-- row with negative amounts (20260804202828). A card payment, by contrast, has
-- a life: created, sent, approved or declined. Putting a mutable status on an
-- immutable table would force one of the two properties to give.
--
-- So the split is by lifetime, not by subject:
--
--   payment_intents   everything that CAN change. Attempts, declines,
--                     timeouts, the device it went to, the failure code.
--   payments          only what happened. A row appears when money moved,
--                     and never changes afterwards.
--
-- A declined card leaves an intent and no payment, which is correct: nothing
-- was taken, and the ledger should not record an event that did not occur.
--
-- ── CENTS HERE, DOLLARS THERE, ON PURPOSE ─────────────────────────────────
--
-- The ledger is numeric dollars and stays that way. An intent stores
-- amount_cents, because that is the unit sent to Clover, and the number in this
-- row must be the number on the wire — this table exists to be compared against
-- what the processor says. One conversion, at the boundary, in the open.
--
-- ── IDEMPOTENCY IS A CONSTRAINT, NOT A CONVENTION ─────────────────────────
--
-- Webhooks retry. A retried webhook that inserts a second payment row is a
-- phantom transaction in the facility's revenue. `payments_processor_identity`
-- makes that impossible at the database rather than in whichever handler
-- remembers to check first.
-- ============================================================================

-- ── What the ledger was missing ───────────────────────────────────────────

alter table public.payments
  add column if not exists processor           text,
  add column if not exists processor_payment_id text,
  add column if not exists card_brand          text,
  add column if not exists card_last4          text,
  add column if not exists auth_code           text,
  add column if not exists entry_method        text,
  add column if not exists refund_of_payment_id uuid;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'payments_processor_check') then
    alter table public.payments
      add constraint payments_processor_check
      check (processor is null or processor in ('clover'));
  end if;

  -- Four digits or nothing. A truncated PAN, a masked string with asterisks or
  -- a full card number would all pass a plain text column, and exactly one of
  -- those three is a reportable incident.
  if not exists (select 1 from pg_constraint where conname = 'payments_card_last4_shape') then
    alter table public.payments
      add constraint payments_card_last4_shape
      check (card_last4 is null or card_last4 ~ '^[0-9]{4}$');
  end if;

  if not exists (select 1 from pg_constraint where conname = 'payments_entry_method_check') then
    alter table public.payments
      add constraint payments_entry_method_check
      check (entry_method is null or entry_method in
             ('swipe', 'chip', 'contactless', 'keyed', 'ecom', 'manual'));
  end if;

  -- A processor id without a processor names nothing, and a processed payment
  -- without an id cannot be reconciled or refunded. Both or neither.
  if not exists (select 1 from pg_constraint where conname = 'payments_processor_pairing') then
    alter table public.payments
      add constraint payments_processor_pairing
      check ((processor is null) = (processor_payment_id is null));
  end if;

  if not exists (select 1 from pg_constraint where conname = 'payments_refund_of_fkey') then
    alter table public.payments
      add constraint payments_refund_of_fkey
      foreign key (refund_of_payment_id) references public.payments (id);
  end if;

  -- A refund row is negative, by the ledger's existing rule. Linking a POSITIVE
  -- row to an original would be recording a second charge as a giving-back.
  if not exists (select 1 from pg_constraint where conname = 'payments_refund_is_negative') then
    alter table public.payments
      add constraint payments_refund_is_negative
      check (refund_of_payment_id is null or grand_total < 0);
  end if;
end $$;

-- The one that makes a replayed webhook harmless.
create unique index if not exists payments_processor_identity
  on public.payments (processor, processor_payment_id)
  where processor_payment_id is not null;

comment on column public.payments.processor_payment_id is
  'Clover''s id for this payment. Unique per processor — a retried webhook cannot create a second row.';
comment on column public.payments.card_last4 is
  'Exactly four digits or NULL. Never a masked PAN.';

-- ── The row that exists before the money moves ────────────────────────────

create table if not exists public.payment_intents (
  id                   uuid primary key default gen_random_uuid(),
  facility_id          uuid not null references public.facilities (id) on delete cascade,
  booking_id           uuid references public.bookings (id) on delete set null,
  client_id            uuid references public.clients (id) on delete set null,

  processor            text not null default 'clover' check (processor in ('clover')),
  environment          text not null check (environment in ('sandbox', 'production')),
  -- terminal: a Clover device at the counter (REST Pay Display).
  -- ecom:     the hosted iframe, card not present.
  -- refund:   giving money back through the processor.
  kind                 text not null check (kind in ('terminal', 'ecom', 'refund')),

  amount_cents         integer not null check (amount_cents <> 0),
  currency             text not null default 'USD',

  -- Sent to Clover. Unique here so the same key cannot be issued twice on our
  -- side either; Clover enforces the other half.
  idempotency_key      text not null unique,

  status               text not null default 'created'
                         check (status in ('created', 'sent', 'approved',
                                           'declined', 'failed', 'cancelled', 'expired')),
  processor_payment_id text,
  -- The Clover device this was sent to, for a counter payment.
  device_id            text,
  failure_code         text,
  failure_message      text,

  -- Set once the ledger row exists. NULL on an approved intent is the
  -- reconciliation alarm: money moved and the books do not show it.
  payment_id           uuid references public.payments (id) on delete set null,

  created_by           text references public.profiles (id) on delete set null,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  completed_at         timestamptz,

  -- An approved charge that cannot name itself cannot be refunded or matched
  -- against a settlement file.
  constraint payment_intent_approved_has_an_id
    check (status <> 'approved' or processor_payment_id is not null),
  constraint payment_intent_failure_is_explained
    check (status not in ('declined', 'failed') or failure_code is not null)
);

comment on table public.payment_intents is
  'Written BEFORE the processor is called, so a crash mid-charge is recoverable rather than an invisible double charge. See the header of 20260807680000.';
comment on column public.payment_intents.amount_cents is
  'Cents, unlike the dollars in payments: this is the number sent to Clover, and it exists to be compared with what Clover reports.';
comment on column public.payment_intents.payment_id is
  'NULL on an approved intent means money moved and no ledger row was written. That is the condition unreconciled_payments surfaces.';

create index if not exists payment_intents_facility_idx
  on public.payment_intents (facility_id, created_at desc);
create index if not exists payment_intents_booking_idx
  on public.payment_intents (booking_id) where booking_id is not null;
-- Partial, because the alarm query only ever looks at this slice.
create index if not exists payment_intents_unreconciled_idx
  on public.payment_intents (facility_id)
  where status = 'approved' and payment_id is null;

alter table public.payment_intents enable row level security;

-- Whoever may see the money may see the attempts at it — same permission the
-- payments ledger uses, so the two cannot drift apart.
drop policy if exists payment_intents_read on public.payment_intents;
create policy payment_intents_read on public.payment_intents
  for select to authenticated
  using (
    private.is_platform_admin()
    or private.has_permission(facility_id, 'financial_view_amounts')
  );

-- No insert or update policy at all. Intents are written by the server through
-- the service role, because the client must never choose the amount or the
-- idempotency key.

drop trigger if exists payment_intents_touch on public.payment_intents;
create trigger payment_intents_touch
  before update on public.payment_intents
  for each row execute function private.set_updated_at();

revoke all on public.payment_intents from anon;

-- ── The alarm ─────────────────────────────────────────────────────────────
--
-- Money the processor approved that the ledger does not know about. This should
-- always be empty; a row here is a customer who has been charged and a facility
-- whose books disagree, and it is worth finding in minutes rather than at the
-- month end.

create or replace view public.unreconciled_payments
with (security_invoker = true) as
  select i.id            as intent_id,
         i.facility_id,
         f.name          as facility_name,
         i.booking_id,
         i.client_id,
         i.kind,
         i.amount_cents,
         i.currency,
         i.processor,
         i.processor_payment_id,
         i.environment,
         i.created_at,
         i.completed_at,
         now() - i.completed_at as unreconciled_for
    from public.payment_intents i
    join public.facilities f on f.id = i.facility_id
   where i.status = 'approved'
     and i.payment_id is null;

comment on view public.unreconciled_payments is
  'Approved charges with no ledger row: the customer paid and the books do not show it. Should always be empty. security_invoker, so it shows the caller only their own facilities.';

revoke all on public.unreconciled_payments from anon;
