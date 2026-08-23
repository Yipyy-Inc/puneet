-- ============================================================================
-- A gift card is money the business owes (20260822900000 / 20260822910000).
--
--   bun run test:sql gift-cards
--
-- One transaction, rolled back.
--
-- ── RUN THIS INSIDE A TRANSACTION, ALWAYS ──────────────────────────────────
--
-- `gift_card_transactions` is append-only for EVERY role. A row written outside
-- a transaction cannot be updated or deleted by anyone afterwards. Same warning
-- as payments-store-credit.sql, and for the same reason.
--
-- ── WHAT THIS FILE IS REALLY ABOUT ─────────────────────────────────────────
--
-- 1. THE BALANCE IS DERIVED (G2, G3). A gift card balance is a debt to a
--    customer. If an application can PATCH it, it is not a balance. G2 proves
--    the column is refused directly; G3 proves the ledger under it cannot be
--    rewritten either, so the number has exactly one origin.
--
-- 2. THE MONEY CANNOT GO NEGATIVE (G6). The overdraft is refused AND the
--    balance is unchanged afterwards — an assertion about the error alone would
--    pass against a function that raised after already taking the money.
--
-- 3. THERE IS NO EXISTENCE ORACLE (G10). A gift card code is a BEARER
--    INSTRUMENT: whoever holds it can spend it. So "that code is real but not
--    yours" would be a way to find real codes. The test asserts the two errors
--    are the SAME, which is a claim no amount of reading the function proves as
--    well as running it.
--
-- 4. A DECISION BEATS ARITHMETIC (G8, G9). A cancelled card with a balance, and
--    an expired card with a balance, are both unspendable. Expiry is judged
--    against the DATABASE's clock, because nothing sweeps these rows and the
--    stored status still says `active` on a card that is not.
-- ============================================================================

begin;

set local client_min_messages to warning;

create temp table tap (n serial, name text, ok boolean, detail text);
grant all on tap to authenticated, anon;
-- `serial` makes a sequence, and GRANT on the table does not reach it. Without
-- this every pg_temp.t() call under `set local role authenticated` fails with
-- "permission denied for sequence tap_n_seq" and the whole file reports ERROR
-- rather than a single failing assertion.
grant usage, select on sequence tap_n_seq to authenticated, anon;

create or replace function pg_temp.t(p_name text, p_ok boolean, p_detail text default '')
returns void language sql as $$
  insert into tap(name, ok, detail) values (p_name, p_ok, p_detail);
$$;

-- ── Fixture: an owner, a groomer with no financial permission, a rival ─────

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-000000190001', 'gc-owner@example.invalid'),
  ('00000000-0000-0000-0000-000000190002', 'gc-groom@example.invalid'),
  ('00000000-0000-0000-0000-000000190003', 'gc-rival@example.invalid'),
  ('00000000-0000-0000-0000-000000190004', 'gc-buyer@example.invalid')
on conflict (id) do nothing;

insert into public.profiles (id, email, full_name) values
  ('00000000-0000-0000-0000-000000190001', 'gc-owner@example.invalid', 'GC Owner'),
  ('00000000-0000-0000-0000-000000190002', 'gc-groom@example.invalid', 'GC Groomer'),
  ('00000000-0000-0000-0000-000000190003', 'gc-rival@example.invalid', 'GC Rival'),
  ('00000000-0000-0000-0000-000000190004', 'gc-buyer@example.invalid', 'GC Buyer')
on conflict (id) do update set full_name = excluded.full_name;

insert into public.orgs (id, name, slug) values
  ('00000000-0000-0000-0000-000000190010', 'GC Org', 'gc-org'),
  ('00000000-0000-0000-0000-000000190011', 'GC Rival Org', 'gc-rival-org')
on conflict (id) do nothing;

insert into public.facilities (id, org_id, name, slug, legacy_id) values
  ('00000000-0000-0000-0000-000000190020', '00000000-0000-0000-0000-000000190010',
   'GC Salon', 'gc-salon', 'gc-salon'),
  ('00000000-0000-0000-0000-000000190021', '00000000-0000-0000-0000-000000190011',
   'GC Rival Salon', 'gc-rival-salon', 'gc-rival-salon')
on conflict (id) do nothing;

-- owner holds financial_manage_gift_cards; groomer does not.
insert into public.facility_memberships (id, facility_id, profile_id, role, is_active) values
  ('00000000-0000-0000-0000-000000190030', '00000000-0000-0000-0000-000000190020',
   '00000000-0000-0000-0000-000000190001', 'owner', true),
  ('00000000-0000-0000-0000-000000190031', '00000000-0000-0000-0000-000000190020',
   '00000000-0000-0000-0000-000000190002', 'groomer', true),
  ('00000000-0000-0000-0000-000000190032', '00000000-0000-0000-0000-000000190021',
   '00000000-0000-0000-0000-000000190003', 'owner', true)
on conflict (id) do nothing;

insert into public.clients (id, facility_id, name, email, profile_id) values
  ('00000000-0000-0000-0000-000000190040', '00000000-0000-0000-0000-000000190020',
   'GC Buyer', 'gc-buyer@example.invalid', '00000000-0000-0000-0000-000000190004'),
  ('00000000-0000-0000-0000-000000190041', '00000000-0000-0000-0000-000000190020',
   'GC Someone Else', 'gc-else@example.invalid', null)
on conflict (id) do nothing;

-- ── As the owner ──────────────────────────────────────────────────────────

select set_config('request.jwt.claims',
  json_build_object('sub','00000000-0000-0000-0000-000000190001','role','authenticated')::text, true);
set local role authenticated;

do $$
declare v_card public.gift_cards%rowtype; v_entries int; state text;
begin
  begin
    v_card := public.issue_gift_card(
      '00000000-0000-0000-0000-000000190020'::uuid, 100.00, 'online', 'GCTEST0001',
      'Recipient', 'gc-recipient@example.invalid', 'Happy birthday', null,
      '00000000-0000-0000-0000-000000190040'::uuid);
    select count(*) into v_entries from public.gift_card_transactions
     where gift_card_id = v_card.id;
    state := 'balance=' || v_card.balance || ' entries=' || v_entries
             || ' status=' || v_card.status;
    perform pg_temp.t('G1 issuing creates the card AND its opening ledger entry',
      v_card.balance = 100.00 and v_entries = 1 and v_card.status = 'active', state);
  exception when others then
    perform pg_temp.t('G1 issuing creates the card AND its opening ledger entry',
      false, sqlstate || ' ' || sqlerrm);
  end;
end $$;

do $$
declare state text;
begin
  begin
    update public.gift_cards set balance = 999
     where code = 'GCTEST0001';
    state := 'ALLOWED';
  exception when others then state := sqlstate;
  end;
  perform pg_temp.t('G2 the balance cannot be written directly',
    state = '42501', 'state=' || state);
end $$;

do $$
declare state text;
begin
  begin
    update public.gift_card_transactions set amount = 999
     where gift_card_id = (select id from public.gift_cards where code = 'GCTEST0001');
    state := 'ALLOWED';
  exception when others then state := sqlstate;
  end;
  -- 42501 from the guard, or 0 rows touched because no UPDATE policy exists.
  -- Either way an application cannot rewrite the ledger.
  perform pg_temp.t('G3 the ledger cannot be rewritten',
    state in ('42501', 'ALLOWED')
    and (select amount from public.gift_card_transactions
          where gift_card_id = (select id from public.gift_cards where code='GCTEST0001')
          order by created_at limit 1) = 100.00,
    'state=' || state);
end $$;

do $$
declare state text;
begin
  begin
    insert into public.gift_cards (facility_id, code, initial_amount)
    values ('00000000-0000-0000-0000-000000190020', 'GCFORGED', 500);
    state := 'ALLOWED';
  exception when others then state := sqlstate;
  end;
  perform pg_temp.t('G4 a card cannot be created outside issue_gift_card',
    state = '42501', 'state=' || state);
end $$;

do $$
declare v_card public.gift_cards%rowtype;
begin
  v_card := public.redeem_gift_card('GCTEST0001', 30.00, null, 'part payment');
  perform pg_temp.t('G5 redeeming takes money off the card',
    v_card.balance = 70.00 and v_card.status = 'active',
    'balance=' || v_card.balance || ' status=' || v_card.status);
end $$;

do $$
declare state text; v_balance numeric;
begin
  begin
    perform public.redeem_gift_card('GCTEST0001', 1000.00);
    state := 'ALLOWED';
  exception when others then state := sqlstate;
  end;
  select balance into v_balance from public.gift_cards where code = 'GCTEST0001';
  -- BOTH halves. An assertion on the error alone passes against a function that
  -- raises after it has already taken the money.
  perform pg_temp.t('G6 an overdraft is refused AND takes nothing',
    state = '23514' and v_balance = 70.00,
    'state=' || state || ' balance=' || v_balance);
end $$;

do $$
declare v_card public.gift_cards%rowtype;
begin
  v_card := public.redeem_gift_card('GCTEST0001', 70.00);
  perform pg_temp.t('G7 a card spent to zero reads as redeemed',
    v_card.balance = 0 and v_card.status = 'redeemed',
    'balance=' || v_card.balance || ' status=' || v_card.status);
end $$;

-- ── Correcting a mistake is another entry ─────────────────────────────────
--
-- The card is at zero after G7, so putting money BACK on it is the natural
-- shape of the correction this exists for: a till that charged the whole card
-- when it should have charged part of it.

do $$
declare v_card public.gift_cards%rowtype; v_entries int;
begin
  v_card := public.adjust_gift_card(
    (select id from public.gift_cards where code = 'GCTEST0001'),
    25.00, 'Overcharged at the till');
  select count(*) into v_entries
    from public.gift_card_transactions
   where gift_card_id = v_card.id and kind = 'adjusted';
  perform pg_temp.t('G14 an adjustment puts money back and reads as active',
    v_card.balance = 25.00 and v_card.status = 'active' and v_entries = 1,
    'balance=' || v_card.balance || ' status=' || v_card.status
      || ' adjustments=' || v_entries);
end $$;

do $$
declare state text; v_balance numeric;
begin
  begin
    perform public.adjust_gift_card(
      (select id from public.gift_cards where code = 'GCTEST0001'), -500.00, 'Too much');
    state := 'ALLOWED';
  exception when others then state := sqlstate;
  end;
  select balance into v_balance from public.gift_cards where code = 'GCTEST0001';
  -- Refused BY THE TRIGGER, and the balance is verified unmoved. An adjustment
  -- that reported an error after debiting would be the worst version of this.
  perform pg_temp.t('G15 an adjustment cannot overdraw, and takes nothing',
    state = '23514' and v_balance = 25.00,
    'state=' || state || ' balance=' || v_balance);
end $$;

do $$
declare state text;
begin
  begin
    perform public.adjust_gift_card(
      (select id from public.gift_cards where code = 'GCTEST0001'), 10.00, '   ');
    state := 'ALLOWED';
  exception when others then state := sqlstate;
  end;
  -- A blank reason is refused rather than stored. It is the only record of why
  -- the balance changed, so an adjustment without one is unauditable.
  perform pg_temp.t('G16 an adjustment without a reason is refused',
    state = '22023', 'state=' || state);
end $$;

do $$
declare state text;
begin
  begin
    perform public.adjust_gift_card(
      (select id from public.gift_cards where code = 'GCTEST0001'), 0, 'Nothing');
    state := 'ALLOWED';
  exception when others then state := sqlstate;
  end;
  perform pg_temp.t('G17 a zero adjustment is refused',
    state = '22023', 'state=' || state);
end $$;

-- ── A decision beats arithmetic ───────────────────────────────────────────

do $$
declare state text;
begin
  perform public.issue_gift_card(
    '00000000-0000-0000-0000-000000190020'::uuid, 50.00, 'online', 'GCCANCEL01');
  update public.gift_cards set status = 'cancelled' where code = 'GCCANCEL01';
  begin
    perform public.redeem_gift_card('GCCANCEL01', 10.00);
    state := 'ALLOWED';
  exception when others then state := sqlstate;
  end;
  perform pg_temp.t('G8 a cancelled card is unspendable even with a balance',
    state = '42501', 'state=' || state);
end $$;

do $$
declare state text;
begin
  begin
    perform public.adjust_gift_card(
      (select id from public.gift_cards where code = 'GCCANCEL01'), 10.00, 'Put it back');
    state := 'ALLOWED';
  exception when others then state := sqlstate;
  end;
  -- Cancelling is a DECISION. Money does not go on or off a card somebody
  -- wrote off; reinstate it first, deliberately, or issue a new one.
  perform pg_temp.t('G18 a cancelled card cannot be adjusted either',
    state = '42501', 'state=' || state);
end $$;

do $$
declare state text;
begin
  perform public.issue_gift_card(
    '00000000-0000-0000-0000-000000190020'::uuid, 50.00, 'online', 'GCEXPIRED1',
    null, null, null, now() - interval '1 day');
  begin
    perform public.redeem_gift_card('GCEXPIRED1', 10.00);
    state := 'ALLOWED';
  exception when others then state := sqlstate;
  end;
  perform pg_temp.t('G9 an expired card is unspendable, against the DB clock',
    state = '42501', 'state=' || state);
end $$;

-- ── THE ORACLE GATE ───────────────────────────────────────────────────────
--
-- The rival owner asks about a code that exists at somebody else's facility,
-- and about one that exists nowhere. If those answers differ, the function is a
-- way to discover real gift card codes.

reset role;
select set_config('request.jwt.claims',
  json_build_object('sub','00000000-0000-0000-0000-000000190003','role','authenticated')::text, true);
set local role authenticated;

do $$
declare real_code text; fake_code text;
begin
  begin
    perform public.redeem_gift_card('GCTEST0001', 1.00);
    real_code := 'ALLOWED';
  exception when others then real_code := sqlstate || '|' || sqlerrm;
  end;
  begin
    perform public.redeem_gift_card('NOSUCHCODEATALL', 1.00);
    fake_code := 'ALLOWED';
  exception when others then fake_code := sqlstate || '|' || sqlerrm;
  end;
  perform pg_temp.t('G10 a real code elsewhere is INDISTINGUISHABLE from no code',
    real_code = fake_code and real_code like '42501%',
    'real=' || real_code || ' fake=' || fake_code);
end $$;

do $$
declare state text;
begin
  begin
    perform public.issue_gift_card(
      '00000000-0000-0000-0000-000000190020'::uuid, 25.00);
    state := 'ALLOWED';
  exception when others then state := sqlstate;
  end;
  perform pg_temp.t('G11 a stranger cannot issue against somebody else''s facility',
    state = '42501', 'state=' || state);
end $$;

do $$
declare real_card text; fake_card text;
begin
  begin
    perform public.adjust_gift_card(
      (select id from public.gift_cards where code = 'GCTEST0001'), 10.00, 'Not mine');
    real_card := 'ALLOWED';
  exception when others then real_card := sqlstate || ':' || sqlerrm;
  end;
  begin
    perform public.adjust_gift_card(
      '00000000-0000-0000-0000-0000000cafe1'::uuid, 10.00, 'Not real');
    fake_card := 'ALLOWED';
  exception when others then fake_card := sqlstate || ':' || sqlerrm;
  end;
  -- Same shape as G10. A card that exists somewhere else answers exactly as a
  -- card that does not exist, so this cannot be used to discover either.
  perform pg_temp.t('G19 adjusting a card you cannot reach is INDISTINGUISHABLE from adjusting one that does not exist',
    real_card = fake_card and real_card like '42501%',
    'real=' || real_card || ' fake=' || fake_card);
end $$;

-- ── Who can read one ──────────────────────────────────────────────────────

reset role;
select set_config('request.jwt.claims',
  json_build_object('sub','00000000-0000-0000-0000-000000190002','role','authenticated')::text, true);
set local role authenticated;

select pg_temp.t('G12 a groomer holds no financial permission and sees no cards',
  (select count(*) from public.gift_cards) = 0,
  'visible=' || (select count(*) from public.gift_cards));

reset role;
select set_config('request.jwt.claims',
  json_build_object('sub','00000000-0000-0000-0000-000000190004','role','authenticated')::text, true);
set local role authenticated;

select pg_temp.t('G13 the buyer sees the card they bought, and only that one',
  (select count(*) from public.gift_cards) = 1
  and (select code from public.gift_cards) = 'GCTEST0001',
  'visible=' || (select count(*) from public.gift_cards));

reset role;

-- ── Report ──────────────────────────────────────────────────────────────────
select case when ok then '  PASS  ' else '> FAIL <' end as result, name, detail
  from tap order by n;

select count(*) filter (where ok) || ' passed, '
    || count(*) filter (where not ok) || ' failed' as summary
  from tap;

rollback;
