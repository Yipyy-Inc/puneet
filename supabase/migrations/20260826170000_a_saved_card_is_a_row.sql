-- ============================================================================
-- A card a customer has agreed we may charge again.
--
-- ── THE COLUMN HAS BEEN POINTING AT NOTHING ───────────────────────────────
--
-- `public.payments.saved_card_id` has existed since the ledger was built and
-- there has never been a `saved_cards` table for it to reference. Every row
-- carries a null, and the 26 payments recorded with method `card-on-file` are
-- bookkeeping entries a staff member typed, not charges against a stored card.
-- This is the table that column was always meant to name.
--
-- ── WHAT IS STORED IS NOT A CARD ──────────────────────────────────────────
--
-- No PAN, no CVV, no expiry we could reconstruct a card from. Clover's own
-- documentation for vaulting says its tokens are "one-way encrypted and can be
-- stored on systems that are not in the Payment Card Industry Data Security
-- Standard (PCI DSS) scope" — which is the entire reason this table may exist
-- in our Postgres at all. `processor_customer_id` and `processor_card_id` are
-- Clover's identifiers; `card_brand`, `card_last4` and the expiry are there so
-- a human can tell two cards apart on a screen, and for nothing else.
--
-- If anybody ever adds a column that could hold a card number, this deployment
-- enters PCI scope and the answer is no.
--
-- ── CONSENT IS A COLUMN, NOT AN ASSUMPTION ────────────────────────────────
--
-- Clover requires that "merchants must obtain explicit consent from cardholders
-- before storing and using their payment credentials for future transactions".
-- So consent is recorded as WHEN and BY WHOM, not as a boolean somebody could
-- default to true. A row whose `consent_at` is null is not chargeable, and the
-- charge path checks it rather than trusting that the UI asked.
--
-- ── AND A CARD IS REVOKED, NEVER DELETED ──────────────────────────────────
--
-- `payments.saved_card_id` will reference these rows, and `payments` is
-- append-only — a deleted card would orphan the ledger's account of how a
-- payment was taken. `revoked_at` is how a customer removes a card: it stops
-- being offered and stops being chargeable, and the history stays readable.
-- ============================================================================

create table if not exists public.saved_cards (
  id uuid primary key default gen_random_uuid(),

  facility_id uuid not null references public.facilities (id) on delete cascade,
  -- Whose card it is. A vaulted card belongs to a person, not to a booking.
  client_id uuid not null references public.clients (id) on delete cascade,

  -- Which processor holds the card. Named rather than assumed, so a second
  -- processor does not need a second table.
  processor text not null default 'clover',
  -- Clover's customer, created with POST /v1/customers, and the card on it.
  processor_customer_id text not null,
  processor_card_id text,

  -- For telling one card from another on a screen. Never enough to use a card.
  card_brand text,
  card_last4 text,
  exp_month smallint,
  exp_year smallint,

  -- Explicit, per Clover's requirement. Null means "not chargeable".
  consent_at timestamptz,
  consent_by text,

  created_at timestamptz not null default now(),
  created_by text,
  revoked_at timestamptz,

  -- Four digits or nothing. A `last4` of "4242424242424242" would mean somebody
  -- has put a card number in the wrong column, and it should fail loudly here
  -- rather than sit in the database.
  constraint saved_cards_last4_shape
    check (card_last4 is null or card_last4 ~ '^[0-9]{4}$'),

  -- A consented card must say who consented. Half a consent record is not one.
  constraint saved_cards_consent_complete
    check ((consent_at is null) = (consent_by is null))
);

comment on table public.saved_cards is
  'Cards a customer has consented to Yipyy storing at the processor. Holds only processor identifiers and display metadata - never a card number, which is what keeps this deployment out of PCI scope.';

comment on column public.saved_cards.consent_at is
  'When the cardholder agreed we may charge this card again. Null means the card is NOT chargeable; the charge path checks this rather than trusting the UI.';

comment on column public.saved_cards.revoked_at is
  'A removed card. Never deleted: payments.saved_card_id references these rows and payments is append-only.';

-- ── ONE ROW PER CARD PER CLIENT ────────────────────────────────────────────
--
-- Clover returns the same card id if the same card is vaulted twice. Saving a
-- card the customer already has stored should be a no-op, not a second entry
-- they then see twice in a list. Partial, so a revoked card can be re-added.
create unique index if not exists saved_cards_one_per_card
  on public.saved_cards (client_id, processor, processor_card_id)
  where revoked_at is null and processor_card_id is not null;

-- The list a checkout screen asks for: this client's live cards.
create index if not exists saved_cards_client_live_idx
  on public.saved_cards (client_id, created_at desc)
  where revoked_at is null;

create index if not exists saved_cards_facility_idx
  on public.saved_cards (facility_id, created_at desc);

-- ── THE LEDGER CAN NOW NAME THE CARD IT CHARGED ────────────────────────────
--
-- The column has always been there. This is the reference it never had.
--
-- It was declared TEXT, because it was written before there was anything for it
-- to point at and nothing ever constrained it. Measured before changing it:
-- 0 non-null values across all 612 payment rows, so the conversion loses
-- nothing and cannot fail on existing data.
--
-- Worth being explicit that this is safe on an append-only table: the ledger
-- forbids UPDATE and DELETE of its ROWS. This is DDL on an all-null column, run
-- by the owner in a migration, and it rewrites no history.
alter table public.payments
  drop constraint if exists payments_saved_card_id_fkey;

alter table public.payments
  alter column saved_card_id type uuid using saved_card_id::uuid;

alter table public.payments
  add constraint payments_saved_card_id_fkey
  foreign key (saved_card_id) references public.saved_cards (id)
  on delete set null;

alter table public.saved_cards enable row level security;
-- FORCED. A stored payment credential is a privacy boundary, and the table
-- owner is not exempt from it.
alter table public.saved_cards force row level security;

revoke all on public.saved_cards from anon;
revoke all on public.saved_cards from public;

-- ── WHO MAY SEE A STORED CARD ──────────────────────────────────────────────
--
-- Its owner, and staff who are already trusted with money at that facility.
-- `financial_view_amounts` is the permission that already gates the ledger
-- these cards get charged into, so a card is no more visible than the payments
-- it produces.
create policy saved_cards_read on public.saved_cards
  for select to authenticated
  using (
    private.is_platform_admin()
    or client_id in (select private.own_client_ids())
    or private.has_permission(facility_id, 'financial_view_amounts')
  );

-- ── WHO MAY STORE ONE ──────────────────────────────────────────────────────
--
-- The customer themselves, or somebody who may take a payment at that facility.
-- Taking a card at the counter and saving it for next time is one act by one
-- person, so it is one permission.
create policy saved_cards_insert on public.saved_cards
  for insert to authenticated
  with check (
    private.is_platform_admin()
    or client_id in (select private.own_client_ids())
    or private.has_permission(facility_id, 'financial_take_payment')
  );

-- ── WHO MAY REVOKE ONE ─────────────────────────────────────────────────────
--
-- The same people. A customer must always be able to remove their own card.
--
-- NOTE FOR THE NEXT PERSON: a policy is not a privilege. `unattached_payments`
-- shipped with a correct-looking UPDATE policy and no `grant update`, so every
-- row was silently unupdatable and one screen reported success having changed
-- nothing (20260824190000). The grant is below, and the SQL test asserts it
-- with has_table_privilege rather than trusting that this comment is true.
create policy saved_cards_update on public.saved_cards
  for update to authenticated
  using (
    private.is_platform_admin()
    or client_id in (select private.own_client_ids())
    or private.has_permission(facility_id, 'financial_take_payment')
  )
  with check (
    private.is_platform_admin()
    or client_id in (select private.own_client_ids())
    or private.has_permission(facility_id, 'financial_take_payment')
  );

grant select, insert, update on public.saved_cards to authenticated;

-- No delete, for anybody. Revocation is an update; see the banner.
revoke delete on public.saved_cards from authenticated;

-- ============================================================================
-- `record_payment` has to be told the column changed.
--
-- Found by `bun run test:sql`, not by reasoning: converting saved_card_id to
-- uuid left this function inserting a TEXT parameter into it, and Postgres does
-- not coerce that on the way in. Every manual payment — the cash, e-transfer
-- and hand-recorded card rows that are 95% of this ledger — would have failed
-- at runtime with "column saved_card_id is of type uuid but expression is of
-- type text". Three existing SQL tests went red and that is the only reason it
-- was caught before deploy.
--
-- ── WHY THE PARAMETER STAYS TEXT ──────────────────────────────────────────
--
-- Changing it to uuid would change the function's identity arguments, which
-- means dropping and recreating it, re-granting it, and updating the generated
-- TypeScript for every caller — to gain nothing. JSON has no uuid: the browser
-- sends a string either way. The cast belongs at the boundary, once, here.
--
-- `nullif(btrim(...), '')` because an empty string is what a form sends when
-- nobody picked a card, and '' is not a uuid. A caller that sends actual
-- rubbish now gets 22P02 rather than storing rubbish in a foreign key.
-- ============================================================================

create or replace function public.record_payment(
  p_facility_id uuid, p_method text, p_subtotal numeric, p_tax numeric,
  p_tip numeric, p_amount_charged numeric, p_grand_total numeric,
  p_booking_id uuid default null, p_client_id uuid default null,
  p_store_credit_applied numeric default 0, p_package_pass_applied numeric default 0,
  p_loyalty_discount_applied numeric default 0, p_cash_received numeric default null,
  p_saved_card_id text default null, p_package_pass_id text default null,
  p_receipt_channels text[] default '{}'::text[], p_credit_note text default '',
  p_customer_package_id uuid default null, p_package_service_id text default null,
  p_pet_id uuid default null, p_pet_name text default null,
  p_service_label text default '', p_note text default null
)
returns jsonb
language plpgsql
set search_path to ''
as $function$
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
     p_cash_received,
     nullif(btrim(coalesce(p_saved_card_id, '')), '')::uuid,
     p_package_pass_id, p_receipt_channels,
     nullif(btrim(coalesce(p_note, '')), ''))
  returning id into v_payment_id;

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
$function$;
