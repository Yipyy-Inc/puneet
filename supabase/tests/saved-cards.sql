-- ============================================================================
-- Saved cards — who may store one, see one, and revoke one (20260826170000).
--
--   psql "$SUPABASE_DB_URL" -f supabase/tests/saved-cards.sql
--
-- One transaction, rolled back. Fixture emails are @example.invalid.
--
-- ── WHAT THIS FILE IS REALLY ABOUT ────────────────────────────────────────
--
-- 1. A CARD IS ITS OWNER'S (C2, C3). A stored payment credential is the most
--    sensitive row in this database that is not a token. A customer must see
--    their own and never anybody else's; the refusal is asserted by COUNTING
--    ROWS, because RLS does not raise — it filters, and a policy that admits
--    the wrong person looks exactly like one that works until you count.
--
-- 2. EVERY REFUSAL HAS A MATCHING ALLOW (C3, C4). `clover-sync.sql` shipped
--    with five assertions that were satisfied by functions refusing EVERYBODY,
--    and one "positive control" that asserted a second refusal. So each deny
--    here is paired with the same operation succeeding for the person who
--    should be able to do it. A gate that stops everyone is not a gate.
--
-- 3. A POLICY IS NOT A PRIVILEGE (C1). `unattached_payments` shipped with a
--    correct-looking UPDATE policy and no `grant update`, so no row was
--    updatable by anyone and a screen reported success having changed nothing
--    (20260824190000). Asserted here against has_table_privilege rather than
--    read off the migration — and DELETE is asserted ABSENT, because a deleted
--    card would orphan an append-only ledger row that references it.
--
-- 4. CONSENT CANNOT BE HALF-RECORDED (C5). Clover requires explicit cardholder
--    consent before a stored credential may be charged. A row carrying a
--    timestamp and no author, or an author and no timestamp, is not a consent
--    record, and the constraint refuses it rather than leaving the charge path
--    to interpret it.
--
-- 5. THE TABLE CANNOT HOLD A CARD NUMBER (C6). `card_last4` takes four digits
--    or nothing. A full PAN landing in that column is what puts this
--    deployment into PCI scope, so it fails at the constraint.
-- ============================================================================

begin;

set local client_min_messages to warning;

create temp table tap (n serial, name text, ok boolean, detail text);
grant all on tap to authenticated, anon, service_role;
grant usage, select on sequence tap_n_seq to authenticated, anon, service_role;

create or replace function pg_temp.t(p_name text, p_ok boolean, p_detail text default '')
returns void language sql as $$
  insert into tap(name, ok, detail) values (p_name, p_ok, p_detail);
$$;

-- ── Fixture ───────────────────────────────────────────────────────────────
--
-- An owner (holds the money permissions), a groomer (holds neither), and TWO
-- customers at the same facility — the second exists only so "sees their own"
-- can be distinguished from "sees everything".

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000005c0001', 'sc-owner@example.invalid'),
  ('00000000-0000-0000-0000-0000005c0002', 'sc-groomer@example.invalid'),
  ('00000000-0000-0000-0000-0000005c0003', 'sc-customer@example.invalid'),
  ('00000000-0000-0000-0000-0000005c0004', 'sc-other@example.invalid')
on conflict (id) do nothing;

insert into public.profiles (id, email, full_name) values
  ('00000000-0000-0000-0000-0000005c0001', 'sc-owner@example.invalid', 'SC Owner'),
  ('00000000-0000-0000-0000-0000005c0002', 'sc-groomer@example.invalid', 'SC Groomer'),
  ('00000000-0000-0000-0000-0000005c0003', 'sc-customer@example.invalid', 'SC Customer'),
  ('00000000-0000-0000-0000-0000005c0004', 'sc-other@example.invalid', 'SC Other')
on conflict (id) do update set full_name = excluded.full_name;

insert into public.orgs (id, name, slug) values
  ('00000000-0000-0000-0000-0000005c0010', 'SC Org', 'sc-org')
on conflict (id) do nothing;

insert into public.facilities (id, org_id, name, slug, legacy_id) values
  ('00000000-0000-0000-0000-0000005c0020', '00000000-0000-0000-0000-0000005c0010',
   'SC Kennels', 'sc-kennels', 'sc-kennels')
on conflict (id) do nothing;

insert into public.facility_memberships (id, facility_id, profile_id, role, is_active) values
  ('00000000-0000-0000-0000-0000005c0030', '00000000-0000-0000-0000-0000005c0020',
   '00000000-0000-0000-0000-0000005c0001', 'owner', true),
  ('00000000-0000-0000-0000-0000005c0031', '00000000-0000-0000-0000-0000005c0020',
   '00000000-0000-0000-0000-0000005c0002', 'groomer', true)
on conflict (id) do nothing;

-- `ref` has no default on this table; named explicitly rather than left to a
-- sequence that does not exist.
insert into public.clients (id, ref, facility_id, name, email, profile_id) values
  ('00000000-0000-0000-0000-0000005c0050', 92000061,
   '00000000-0000-0000-0000-0000005c0020', 'SC Customer',
   'sc-customer@example.invalid', '00000000-0000-0000-0000-0000005c0003'),
  ('00000000-0000-0000-0000-0000005c0051', 92000062,
   '00000000-0000-0000-0000-0000005c0020', 'SC Other',
   'sc-other@example.invalid', '00000000-0000-0000-0000-0000005c0004')
on conflict (id) do nothing;

set local role service_role;

insert into public.saved_cards
  (id, facility_id, client_id, processor_customer_id, processor_card_id,
   card_brand, card_last4, consent_at, consent_by)
values
  ('00000000-0000-0000-0000-0000005c0060', '00000000-0000-0000-0000-0000005c0020',
   '00000000-0000-0000-0000-0000005c0050', 'CLV-CUST-1', 'CLV-CARD-1',
   'VISA', '4242', now(), 'sc-customer@example.invalid'),
  ('00000000-0000-0000-0000-0000005c0061', '00000000-0000-0000-0000-0000005c0020',
   '00000000-0000-0000-0000-0000005c0051', 'CLV-CUST-2', 'CLV-CARD-2',
   'MC', '5454', now(), 'sc-other@example.invalid')
on conflict (id) do nothing;

reset role;

-- ── C1 · The grants are the boundary ──────────────────────────────────────
--
-- Read from the catalogue, never from the migration. A revoke naming a
-- privilege the role does not hold succeeds silently and looks identical to one
-- that worked.
select pg_temp.t(
  'C1a authenticated may select, insert and update saved_cards',
  has_table_privilege('authenticated', 'public.saved_cards', 'select')
    and has_table_privilege('authenticated', 'public.saved_cards', 'insert')
    and has_table_privilege('authenticated', 'public.saved_cards', 'update')
);

-- A card is revoked, never deleted: `payments.saved_card_id` references these
-- rows and `payments` forbids UPDATE and DELETE, so a deleted card would leave
-- a ledger row unable to say how it was taken.
select pg_temp.t(
  'C1b nobody may DELETE a saved card',
  not has_table_privilege('authenticated', 'public.saved_cards', 'delete')
    and not has_table_privilege('anon', 'public.saved_cards', 'delete')
);

-- `anon` is the publishable key that ships in every browser bundle.
select pg_temp.t(
  'C1c anon holds nothing at all',
  not has_table_privilege('anon', 'public.saved_cards', 'select')
    and not has_table_privilege('anon', 'public.saved_cards', 'insert')
    and not has_table_privilege('anon', 'public.saved_cards', 'update')
);

-- Forced, so the table owner is not quietly exempt from its own policy.
select pg_temp.t(
  'C1d row level security is enabled AND forced',
  (select relrowsecurity and relforcerowsecurity
     from pg_class where oid = 'public.saved_cards'::regclass)
);

-- ── C2 · A customer sees their own card, and only their own ───────────────
do $$
declare v_mine int; v_all int;
begin
  set local role authenticated;
  set local request.jwt.claims to
    '{"sub":"00000000-0000-0000-0000-0000005c0003","role":"authenticated"}';

  select count(*) into v_all from public.saved_cards;
  select count(*) into v_mine from public.saved_cards
   where client_id = '00000000-0000-0000-0000-0000005c0050';

  -- The positive half: they CAN see their own. Without this, a policy that
  -- refused everybody would pass the assertion below.
  perform pg_temp.t('C2a a customer sees their own saved card', v_mine = 1,
                    format('saw %s of their own', v_mine));

  -- The negative half: the other customer's card is filtered away. RLS does
  -- not raise, so this is a COUNT and not an exception test.
  perform pg_temp.t('C2b and nobody else''s', v_all = 1,
                    format('saw %s rows in total, expected 1', v_all));
  reset role;
end $$;

-- ── C3 · Staff trusted with money see the facility's cards ────────────────
do $$
declare v_owner int; v_groomer int;
begin
  set local role authenticated;
  set local request.jwt.claims to
    '{"sub":"00000000-0000-0000-0000-0000005c0001","role":"authenticated"}';
  select count(*) into v_owner from public.saved_cards
   where facility_id = '00000000-0000-0000-0000-0000005c0020';
  reset role;

  set local role authenticated;
  set local request.jwt.claims to
    '{"sub":"00000000-0000-0000-0000-0000005c0002","role":"authenticated"}';
  select count(*) into v_groomer from public.saved_cards;
  reset role;

  -- The owner holds `financial_view_amounts`, which is the same permission that
  -- gates the ledger these cards are charged into. A card is no more visible
  -- than the payments it produces.
  perform pg_temp.t('C3a an owner sees the facility''s stored cards', v_owner = 2,
                    format('saw %s, expected 2', v_owner));

  -- The groomer holds neither money permission and is not the cardholder. This
  -- is the refusal, and C3a is its control.
  perform pg_temp.t('C3b a groomer sees none of them', v_groomer = 0,
                    format('saw %s, expected 0', v_groomer));
end $$;

-- ── C4 · Storing a card, and revoking one ─────────────────────────────────
do $$
declare v_inserted int; v_revoked int; v_refused boolean := false;
begin
  -- The allow: somebody who may take a payment may store the card they took.
  set local role authenticated;
  set local request.jwt.claims to
    '{"sub":"00000000-0000-0000-0000-0000005c0001","role":"authenticated"}';

  insert into public.saved_cards
    (facility_id, client_id, processor_customer_id, processor_card_id,
     card_brand, card_last4, consent_at, consent_by)
  values
    ('00000000-0000-0000-0000-0000005c0020', '00000000-0000-0000-0000-0000005c0050',
     'CLV-CUST-3', 'CLV-CARD-3', 'AMEX', '0005', now(), 'sc-owner@example.invalid');

  select count(*) into v_inserted from public.saved_cards
   where processor_card_id = 'CLV-CARD-3';

  -- Revocation is an UPDATE, and this is where a missing grant would surface as
  -- "succeeded, changed nothing".
  update public.saved_cards set revoked_at = now()
   where processor_card_id = 'CLV-CARD-3';
  get diagnostics v_revoked = row_count;
  reset role;

  perform pg_temp.t('C4a staff who may take a payment may store the card',
                    v_inserted = 1);
  perform pg_temp.t('C4b revoking a card actually updates a row',
                    v_revoked = 1,
                    format('%s rows updated, expected 1', v_revoked));

  -- The refusal, with C4a as its control: a groomer may not store one.
  begin
    set local role authenticated;
    set local request.jwt.claims to
      '{"sub":"00000000-0000-0000-0000-0000005c0002","role":"authenticated"}';
    insert into public.saved_cards
      (facility_id, client_id, processor_customer_id, card_last4, consent_at, consent_by)
    values
      ('00000000-0000-0000-0000-0000005c0020', '00000000-0000-0000-0000-0000005c0050',
       'CLV-CUST-X', '9999', now(), 'sc-groomer@example.invalid');
  exception when insufficient_privilege then
    -- 42501, asserted exactly rather than "anything but success".
    v_refused := true;
  end;
  reset role;

  perform pg_temp.t('C4c a groomer may NOT store a card (42501)', v_refused);
end $$;

-- ── C5 · Half a consent record is not a consent record ────────────────────
do $$
declare v_refused boolean := false;
begin
  set local role service_role;
  begin
    insert into public.saved_cards
      (facility_id, client_id, processor_customer_id, consent_at)
    values
      ('00000000-0000-0000-0000-0000005c0020', '00000000-0000-0000-0000-0000005c0050',
       'CLV-CUST-NOCONSENT', now());
  exception when check_violation then
    v_refused := true;
  end;
  reset role;

  perform pg_temp.t(
    'C5 a consent timestamp with no author is refused (23514)', v_refused);
end $$;

-- ── C6 · The table cannot hold a card number ──────────────────────────────
do $$
declare v_refused boolean := false;
begin
  set local role service_role;
  begin
    insert into public.saved_cards
      (facility_id, client_id, processor_customer_id, card_last4)
    values
      ('00000000-0000-0000-0000-0000005c0020', '00000000-0000-0000-0000-0000005c0050',
       'CLV-CUST-PAN', '4242424242424242');
  exception when check_violation then
    v_refused := true;
  end;
  reset role;

  -- A PAN in `card_last4` is what puts this deployment into PCI scope. It fails
  -- at the constraint rather than sitting in the database unnoticed.
  perform pg_temp.t('C6 a full card number is refused by card_last4 (23514)',
                    v_refused);
end $$;

-- ── Report ────────────────────────────────────────────────────────────────
select n, case when ok then 'ok  ' else 'FAIL' end as status, name, detail
from tap order by n;

do $$
declare v_failed int;
begin
  select count(*) into v_failed from tap where not ok;
  if v_failed > 0 then
    raise exception 'saved-cards.sql: % assertion(s) failed', v_failed;
  end if;
end $$;

rollback;
