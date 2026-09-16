-- ============================================================================
-- gift_card_totals() — the gift-card numbers, added up by the database
-- (see the migration gift_card_totals_come_from_the_database_not_the_browser).
--
--   bun run test:sql gift-card-totals
--
-- One transaction, rolled back. Fixture emails are @example.invalid.
--
-- ── WHAT THIS FILE IS ABOUT ────────────────────────────────────────────────
--
-- G1 Liability is ACTIVE cards with a balance — a cancelled card still holding
--    money is not money the facility owes.
-- G2 Sales and redemptions respect their own date ranges, and neither range
--    touches liability.
-- G3 Sales are split physical / digital, and a kind that is not 'physical'
--    counts as digital rather than falling out of both.
-- G4 salesByMonth buckets by the month a card was issued, in order.
-- G5 A redemption is `redeemed` OR a NEGATIVE `adjusted`, and a positive
--    adjustment is not one. This is the split to-legacy-card.ts makes, and a
--    total that disagreed with the rows under it would be the defect again.
-- G6 Redemptions are attributed to the BOOKING'S OWN SERVICE, and one with no
--    booking is 'unattributed'. The screen used to hash the card's uuid into
--    one of five service names — this is the assertion that stops that coming
--    back.
-- G7 Another facility's cards and movements are not in the answer.
-- G8 A member WITHOUT financial_manage_gift_cards aggregates nothing. The
--    function is security invoker, so gift_cards RLS is the whole boundary.
-- G9 anon cannot execute it; authenticated can.
-- ============================================================================

begin;

set local client_min_messages to warning;

create temp table tap (n serial, name text, ok boolean, detail text);
grant all on tap to authenticated;
-- The blocks below run AS `authenticated` so that RLS actually applies, and a
-- `serial` column needs its sequence as well as its table. Without this every
-- assertion dies on "permission denied for sequence tap_n_seq" — which reads
-- like the function failed rather than like the recorder did.
grant usage, select on sequence tap_n_seq to authenticated;

create or replace function pg_temp.t(p_name text, p_ok boolean, p_detail text default '')
returns void language sql as $$
  insert into tap(name, ok, detail) values (p_name, p_ok, p_detail);
$$;

create or replace function pg_temp.as_user(p_sub text)
returns void language sql as $$
  select set_config('request.jwt.claims',
    json_build_object('sub', p_sub, 'role', 'authenticated')::text, true);
$$;

-- ── The cast ────────────────────────────────────────────────────────────────

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000003fc001'::uuid, 'gct-ada@example.invalid'),
  ('00000000-0000-0000-0000-0000003fc002'::uuid, 'gct-bo@example.invalid')
on conflict (id) do nothing;

insert into public.profiles (id, email, full_name) values
  ('00000000-0000-0000-0000-0000003fc001', 'gct-ada@example.invalid', 'Ada'),
  ('00000000-0000-0000-0000-0000003fc002', 'gct-bo@example.invalid', 'Bo')
on conflict (id) do update set full_name = excluded.full_name;

insert into public.orgs (id, name, slug) values
  ('00000000-0000-0000-0000-0000003fc010', 'GCT Org', 'gct-org')
on conflict do nothing;

insert into public.facilities (id, org_id, name, slug, legacy_id) values
  ('00000000-0000-0000-0000-0000003fc020', '00000000-0000-0000-0000-0000003fc010',
   'GCT Here', 'gct-here', 'gct-here'),
  ('00000000-0000-0000-0000-0000003fc021', '00000000-0000-0000-0000-0000003fc010',
   'GCT Elsewhere', 'gct-elsewhere', 'gct-elsewhere')
on conflict do nothing;

-- Ada may manage gift cards here. Bo is a member of the same facility and may
-- not — the permission boundary cannot be measured without both.
insert into public.facility_memberships (id, profile_id, facility_id, role, is_active)
values
  ('00000000-0000-0000-0000-0000003fc030', '00000000-0000-0000-0000-0000003fc001',
   '00000000-0000-0000-0000-0000003fc020', 'manager', true),
  ('00000000-0000-0000-0000-0000003fc031', '00000000-0000-0000-0000-0000003fc002',
   '00000000-0000-0000-0000-0000003fc020', 'groomer', true)
on conflict (profile_id, facility_id) do nothing;

-- Granted and refused EXPLICITLY, per membership, rather than leaning on
-- whatever the role presets happen to say today: this file is about the
-- function, and a preset changing elsewhere must not silently retune it.
insert into public.membership_permissions (membership_id, permission_key, scope)
values
  ('00000000-0000-0000-0000-0000003fc030', 'financial_manage_gift_cards', 'anytime'),
  ('00000000-0000-0000-0000-0000003fc031', 'financial_manage_gift_cards', 'none')
on conflict (membership_id, permission_key) do update set scope = excluded.scope;

insert into public.clients (id, facility_id, name, email) values
  ('00000000-0000-0000-0000-0000003fc040', '00000000-0000-0000-0000-0000003fc020',
   'Cass', 'gct-cass@example.invalid');

-- The booking a redemption paid for. Its SERVICE is the answer G6 wants.
insert into public.bookings
  (id, facility_id, client_id, service, status, start_at, end_at,
   base_price, discount, total_cost)
values
  ('00000000-0000-0000-0000-0000003fc050', '00000000-0000-0000-0000-0000003fc020',
   '00000000-0000-0000-0000-0000003fc040', 'grooming', 'completed',
   now() - interval '2 days', now() - interval '2 days' + interval '2 hours',
   80, 0, 80);

-- ── The cards, funded the way the app funds them ────────────────────────────
--
-- A card's balance is NOT settable: `gift_card_balance_comes_from_the_ledger`
-- refuses a direct write and `gift_card_apply_transaction` moves it when a
-- movement is posted. So each card is inserted EMPTY and then issued, exactly
-- as issue_gift_card does it. A fixture that could not happen through the app
-- would be testing a state the product cannot reach.
--
-- That also rules one case out of this file: an ACTIVE card with a zero
-- balance does not exist, because the apply trigger flips a card to 'redeemed'
-- the moment its balance reaches 0. The real exclusion liability has to get
-- right is c3 — CANCELLED, and still holding 99.
--
--   c1  online    initial  50  →  50 -20 -5  =  25  active     2026-03-10
--   c2  online    initial  20  →  20 -3 +7   =  24  active     2026-03-20
--   c3  online    initial  99  →  99             =  99  cancelled  2026-04-02
--   c4  physical  initial  10  →  10             =  10  active     2026-04-05
--   c5  online    initial 500  ← OTHER FACILITY             2026-03-15
insert into public.gift_cards
  (id, facility_id, code, kind, initial_amount, balance, status, issued_at)
values
  ('00000000-0000-0000-0000-0000003fc060', '00000000-0000-0000-0000-0000003fc020',
   'GCT-C1', 'online',   50, 0, 'active', '2026-03-10T12:00:00Z'),
  ('00000000-0000-0000-0000-0000003fc061', '00000000-0000-0000-0000-0000003fc020',
   'GCT-C2', 'online',   20, 0, 'active', '2026-03-20T12:00:00Z'),
  ('00000000-0000-0000-0000-0000003fc062', '00000000-0000-0000-0000-0000003fc020',
   'GCT-C3', 'online',   99, 0, 'active', '2026-04-02T12:00:00Z'),
  ('00000000-0000-0000-0000-0000003fc063', '00000000-0000-0000-0000-0000003fc020',
   'GCT-C4', 'physical', 10, 0, 'active', '2026-04-05T12:00:00Z'),
  ('00000000-0000-0000-0000-0000003fc064', '00000000-0000-0000-0000-0000003fc021',
   'GCT-C5', 'online',  500, 0, 'active', '2026-03-15T12:00:00Z');

-- ── The movements, ONE STATEMENT EACH ───────────────────────────────────────
--
-- Not one multi-row insert. The apply trigger reads the card `for update` and
-- writes its new balance, and inside a single statement the next row does not
-- reliably see what the previous row just wrote — the first draft of this file
-- funded a card and drained it in the same insert and was refused with "that
-- gift card holds 0.00". Separate statements each take a fresh snapshot.
--
-- `balance_after` is deliberately not supplied: the trigger computes it, and a
-- fixture that asserted its own arithmetic would be asserting itself.
insert into public.gift_card_transactions
  (gift_card_id, facility_id, kind, amount, booking_id, created_at)
values ('00000000-0000-0000-0000-0000003fc060', '00000000-0000-0000-0000-0000003fc020',
        'issued', 50, null, '2026-03-10T12:00:00Z');

insert into public.gift_card_transactions
  (gift_card_id, facility_id, kind, amount, booking_id, created_at)
values ('00000000-0000-0000-0000-0000003fc061', '00000000-0000-0000-0000-0000003fc020',
        'issued', 20, null, '2026-03-20T12:00:00Z');

insert into public.gift_card_transactions
  (gift_card_id, facility_id, kind, amount, booking_id, created_at)
values ('00000000-0000-0000-0000-0000003fc062', '00000000-0000-0000-0000-0000003fc020',
        'issued', 99, null, '2026-04-02T12:00:00Z');

insert into public.gift_card_transactions
  (gift_card_id, facility_id, kind, amount, booking_id, created_at)
values ('00000000-0000-0000-0000-0000003fc063', '00000000-0000-0000-0000-0000003fc020',
        'issued', 10, null, '2026-04-05T12:00:00Z');

insert into public.gift_card_transactions
  (gift_card_id, facility_id, kind, amount, booking_id, created_at)
values ('00000000-0000-0000-0000-0000003fc064', '00000000-0000-0000-0000-0000003fc021',
        'issued', 500, null, '2026-03-15T12:00:00Z');

-- A redemption that PAID FOR A BOOKING. The booking's service is the answer.
insert into public.gift_card_transactions
  (gift_card_id, facility_id, kind, amount, booking_id, created_at)
values ('00000000-0000-0000-0000-0000003fc060', '00000000-0000-0000-0000-0000003fc020',
        'redeemed', -20, '00000000-0000-0000-0000-0000003fc050', '2026-04-10T12:00:00Z');

-- A redemption with no booking behind it — a counter drain. 'unattributed'.
insert into public.gift_card_transactions
  (gift_card_id, facility_id, kind, amount, booking_id, created_at)
values ('00000000-0000-0000-0000-0000003fc060', '00000000-0000-0000-0000-0000003fc020',
        'redeemed', -5, null, '2026-04-11T12:00:00Z');

-- An adjustment that TOOK money off: a redemption by any honest reading.
insert into public.gift_card_transactions
  (gift_card_id, facility_id, kind, amount, booking_id, created_at)
values ('00000000-0000-0000-0000-0000003fc061', '00000000-0000-0000-0000-0000003fc020',
        'adjusted', -3, null, '2026-04-12T12:00:00Z');

-- An adjustment that PUT money on. Not a redemption, and G5 is about this one.
insert into public.gift_card_transactions
  (gift_card_id, facility_id, kind, amount, booking_id, created_at)
values ('00000000-0000-0000-0000-0000003fc061', '00000000-0000-0000-0000-0000003fc020',
        'adjusted', 7, null, '2026-04-13T12:00:00Z');

-- The other facility's, which must not reach any total here.
insert into public.gift_card_transactions
  (gift_card_id, facility_id, kind, amount, booking_id, created_at)
values ('00000000-0000-0000-0000-0000003fc064', '00000000-0000-0000-0000-0000003fc021',
        'redeemed', -90, null, '2026-04-10T12:00:00Z');

-- Voided AFTER it was funded, which is the only order the triggers allow and
-- the order a real cancellation happens in. Status is writable; balance is not.
update public.gift_cards set status = 'cancelled'
 where id = '00000000-0000-0000-0000-0000003fc062';

-- ── G1-G7 Ada reads her facility's numbers ──────────────────────────────────
do $check1$
declare
  v jsonb;
  v_month jsonb;
  v_svc jsonb;
begin
  perform pg_temp.as_user('00000000-0000-0000-0000-0000003fc001');
  -- The ROLE, not just the claim. gift_card_totals is security invoker, so
  -- gift_cards RLS is the whole boundary — and a superuser bypasses RLS, which
  -- would make every assertion below pass without ever testing it.
  execute 'set local role authenticated';

  v := public.gift_card_totals(
         '00000000-0000-0000-0000-0000003fc020',
         '2026-01-01T00:00:00Z', '2027-01-01T00:00:00Z',
         '2026-01-01T00:00:00Z', '2027-01-01T00:00:00Z');

  perform pg_temp.t(
    'G1 liability is active cards holding money: 25 + 24 + 10, not c3''s 99',
    (v->'liability'->>'total')::numeric = 59
      and (v->'liability'->>'count')::int = 3,
    format('liability=%s', v->'liability'));

  perform pg_temp.t(
    'G7 the other facility''s 500 is not in it',
    (v->>'cardCount')::int = 4
      and (v->'byStatus'->>'active')::int = 3
      and (v->'byStatus'->>'cancelled')::int = 1,
    format('cardCount=%s byStatus=%s', v->>'cardCount', v->'byStatus'));

  perform pg_temp.t(
    'G3 sales split physical from digital: 1 and 3, value 179',
    (v->'sales'->>'count')::int = 4
      and (v->'sales'->>'value')::numeric = 179
      and (v->'sales'->>'physical')::int = 1
      and (v->'sales'->>'digital')::int = 3,
    format('sales=%s', v->'sales'));

  v_month := v->'salesByMonth';
  perform pg_temp.t(
    'G4 salesByMonth is 2026-03 = 70 then 2026-04 = 109, in order',
    jsonb_array_length(v_month) = 2
      and v_month->0->>'month' = '2026-03'
      and (v_month->0->>'value')::numeric = 70
      and v_month->1->>'month' = '2026-04'
      and (v_month->1->>'value')::numeric = 109,
    format('salesByMonth=%s', v_month));

  perform pg_temp.t(
    'G5 a redemption is redeemed or a NEGATIVE adjusted: 20 + 5 + 3',
    (v->'redemptions'->>'total')::numeric = 28
      and (v->'redemptions'->>'count')::int = 3,
    format('redemptions=%s (the +7 adjustment and the five issues are not)',
           v->'redemptions'));

  -- The one that matters most. `categoryFor` hashed the CARD'S UUID into one
  -- of five service names, so every facility saw a confident five-way split of
  -- money that had never been attributed to anything at all.
  v_svc := v->'redemptionsByService';
  perform pg_temp.t(
    'G6 the service comes from the BOOKING; no booking is unattributed',
    jsonb_array_length(v_svc) = 2
      and v_svc->0->>'service' = 'grooming'
      and (v_svc->0->>'value')::numeric = 20
      and v_svc->1->>'service' = 'unattributed'
      and (v_svc->1->>'value')::numeric = 8,
    format('byService=%s', v_svc));
exception when others then
  perform pg_temp.t('G1-G7 the facility''s numbers', false, sqlerrm);
end $check1$;

-- ── G2 the ranges move sales and redemptions, and leave liability alone ─────
do $check2$
declare
  v jsonb;
begin
  perform pg_temp.as_user('00000000-0000-0000-0000-0000003fc001');
  -- The ROLE, not just the claim. gift_card_totals is security invoker, so
  -- gift_cards RLS is the whole boundary — and a superuser bypasses RLS, which
  -- would make every assertion below pass without ever testing it.
  execute 'set local role authenticated';

  -- April only: c3 (99) and c4 (10) were issued then. Redemptions from the
  -- 12th: only the -3 adjustment.
  v := public.gift_card_totals(
         '00000000-0000-0000-0000-0000003fc020',
         '2026-04-01T00:00:00Z', '2026-05-01T00:00:00Z',
         '2026-04-12T00:00:00Z', '2027-01-01T00:00:00Z');

  perform pg_temp.t(
    'G2 sales narrow to the window: 2 cards, 109',
    (v->'sales'->>'count')::int = 2
      and (v->'sales'->>'value')::numeric = 109,
    format('sales=%s', v->'sales'));

  perform pg_temp.t(
    'G2 liability ignores the window - money owed is owed today',
    (v->'liability'->>'total')::numeric = 59,
    format('liability=%s', v->'liability'));

  perform pg_temp.t(
    'G2 the redemption window is its own, and excludes the earlier two',
    (v->'redemptions'->>'total')::numeric = 3
      and (v->'redemptions'->>'count')::int = 1,
    format('redemptions=%s', v->'redemptions'));
exception when others then
  perform pg_temp.t('G2 the date ranges', false, sqlerrm);
end $check2$;

-- ── G8 a member without the permission aggregates nothing ───────────────────
do $check3$
declare
  v jsonb;
begin
  perform pg_temp.as_user('00000000-0000-0000-0000-0000003fc002');
  execute 'set local role authenticated';

  v := public.gift_card_totals(
         '00000000-0000-0000-0000-0000003fc020',
         '2026-01-01T00:00:00Z', '2027-01-01T00:00:00Z',
         '2026-01-01T00:00:00Z', '2027-01-01T00:00:00Z');

  -- Zeroes, not an error: the same answer Bo would assemble by reading the
  -- rows one at a time, which is none of them. The function is invoker, so
  -- there is no second boundary here to get wrong.
  perform pg_temp.t(
    'G8 no financial_manage_gift_cards, no numbers',
    (v->>'cardCount')::int = 0
      and (v->'liability'->>'total')::numeric = 0
      and (v->'sales'->>'value')::numeric = 0
      and (v->'redemptions'->>'total')::numeric = 0,
    format('cardCount=%s liability=%s', v->>'cardCount', v->'liability'));
exception when others then
  perform pg_temp.t('G8 the permission boundary', false, sqlerrm);
end $check3$;

-- ── G9 grants ───────────────────────────────────────────────────────────────
select pg_temp.t('G9 anon cannot execute it; authenticated can',
  not has_function_privilege('anon',
    'public.gift_card_totals(uuid, timestamptz, timestamptz, timestamptz, timestamptz)', 'execute')
  and has_function_privilege('authenticated',
    'public.gift_card_totals(uuid, timestamptz, timestamptz, timestamptz, timestamptz)', 'execute'));

-- ── Report ──────────────────────────────────────────────────────────────────
select case when ok then '  PASS  ' else '> FAIL <' end as result, name, detail
  from tap order by n;

select count(*) filter (where ok) || ' passed, '
    || count(*) filter (where not ok) || ' failed' as summary
  from tap;

rollback;
