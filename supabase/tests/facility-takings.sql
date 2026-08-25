-- ============================================================================
-- `public.facility_takings` — the aggregate behind the Yipyy Pay Transactions
-- tab.
--
-- WHAT THIS IS FOR, AND WHY IT IS NOT OPTIONAL
--
-- The function is `security invoker` ON PURPOSE, so RLS decides which payment
-- rows count. That makes RLS the only thing standing between a groomer and the
-- facility's takings, and between one facility and another's. An aggregate is
-- a particularly quiet place for that to fail: a leak does not look like a leak,
-- it looks like a slightly larger number.
--
-- Every assertion here therefore comes in a pair. The permitted person must get
-- the RIGHT figure, not merely a figure; the refused person must get ZERO, not
-- merely less. On 2026-08-24 this repo shipped an `unattached_payments` queue
-- that nobody could resolve, and five tests passed against it because every one
-- of them asserted a refusal. See the debt map.
--
-- Runs in a transaction and ends in `rollback`, so nothing here persists.
-- ============================================================================

begin;

create temporary table tap (n serial, ok boolean, name text, detail text)
  on commit drop;

create or replace function pg_temp.t(p_name text, p_ok boolean, p_detail text default '')
returns void language sql as $$
  insert into tap (ok, name, detail) values (p_ok, p_name, p_detail);
$$;

-- ── Fixture ───────────────────────────────────────────────────────────────
--
-- TWO facilities, deliberately. One is the subject; the other exists only so a
-- test can prove its money is NOT counted. A single-facility fixture cannot
-- tell a working scope from a missing one.

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000003a0001', 'ft-owner@example.invalid'),
  ('00000000-0000-0000-0000-0000003a0002', 'ft-groomer@example.invalid')
on conflict (id) do nothing;

insert into public.profiles (id, email, full_name) values
  ('00000000-0000-0000-0000-0000003a0001', 'ft-owner@example.invalid', 'FT Owner'),
  ('00000000-0000-0000-0000-0000003a0002', 'ft-groomer@example.invalid', 'FT Groomer')
on conflict (id) do update set full_name = excluded.full_name;

insert into public.orgs (id, name, slug) values
  ('00000000-0000-0000-0000-0000003a0010', 'FT Org', 'ft-org')
on conflict (id) do nothing;

insert into public.facilities (id, org_id, name, slug, legacy_id) values
  ('00000000-0000-0000-0000-0000003a0020', '00000000-0000-0000-0000-0000003a0010',
   'FT Kennels', 'ft-kennels', 'ft-kennels'),
  ('00000000-0000-0000-0000-0000003a0021', '00000000-0000-0000-0000-0000003a0010',
   'FT Rivals', 'ft-rivals', 'ft-rivals')
on conflict (id) do nothing;

-- The owner belongs to ONE of them. The groomer belongs to the same one and
-- holds neither financial permission.
insert into public.facility_memberships (id, facility_id, profile_id, role, is_active) values
  ('00000000-0000-0000-0000-0000003a0030', '00000000-0000-0000-0000-0000003a0020',
   '00000000-0000-0000-0000-0000003a0001', 'owner', true),
  ('00000000-0000-0000-0000-0000003a0031', '00000000-0000-0000-0000-0000003a0020',
   '00000000-0000-0000-0000-0000003a0002', 'groomer', true)
on conflict (id) do nothing;

set local role service_role;

-- 100.00 taken, 25.00 handed back, 10.00 of it tip. Chosen so gross, net and
-- refunded are three DIFFERENT numbers — a fixture where they coincide cannot
-- catch a function that returns the wrong one of the three.
insert into public.payments
  (id, facility_id, method, subtotal, tax, tip, amount_charged, grand_total,
   processor, processor_payment_id, created_at)
values
  ('00000000-0000-0000-0000-0000003a0040', '00000000-0000-0000-0000-0000003a0020',
   'terminal', 80, 10, 10, 100, 100, 'clover', 'FT-PAY-1',
   '2026-06-15T14:00:00Z'),
  ('00000000-0000-0000-0000-0000003a0041', '00000000-0000-0000-0000-0000003a0020',
   'terminal', -20, -5, 0, -25, -25, 'clover', 'FT-PAY-2',
   '2026-06-15T15:00:00Z'),
  -- The other facility's money. Never to be counted.
  --
  -- `e-transfer`, not `cash`: `payments_cash_shape` requires `cash_received >=
  -- amount_charged`, so a cash row needs the tendered amount as well. Worth
  -- knowing before writing a fixture - the CHECK constraints on this table are
  -- strict and they are the reason a malformed ledger row cannot be stored.
  ('00000000-0000-0000-0000-0000003a0042', '00000000-0000-0000-0000-0000003a0021',
   'e-transfer', 500, 0, 0, 500, 500, null, null,
   '2026-06-15T14:30:00Z');

reset role;

-- ── T1  The owner gets the RIGHT figures, not merely some figures ─────────

do $$
declare r jsonb;
begin
  set local role authenticated;
  set local request.jwt.claims to
    '{"sub":"00000000-0000-0000-0000-0000003a0001","role":"authenticated"}';

  r := public.facility_takings(
    '00000000-0000-0000-0000-0000003a0020'::uuid,
    '2026-06-01T00:00:00Z'::timestamptz,
    '2026-07-01T00:00:00Z'::timestamptz,
    'UTC');
  reset role;

  perform pg_temp.t('T1a gross counts only what was taken',
    (r ->> 'gross')::numeric = 100, 'gross=' || (r ->> 'gross'));
  perform pg_temp.t('T1b refunded is reported POSITIVE, not as a negative sum',
    (r ->> 'refunded')::numeric = 25, 'refunded=' || (r ->> 'refunded'));
  perform pg_temp.t('T1c net is gross minus refunded',
    (r ->> 'net')::numeric = 75, 'net=' || (r ->> 'net'));
  -- Three different numbers. A function returning net for all three would pass
  -- any one of these on its own.
  perform pg_temp.t('T1d gross, net and refunded are not the same number',
    (r ->> 'gross')::numeric <> (r ->> 'net')::numeric
    and (r ->> 'net')::numeric <> (r ->> 'refunded')::numeric, '');
  perform pg_temp.t('T1e sales and refunds are counted apart',
    (r ->> 'sales')::int = 1 and (r ->> 'refunds')::int = 1,
    'sales=' || (r ->> 'sales') || ' refunds=' || (r ->> 'refunds'));
end $$;

-- ── T2  Another facility's takings are NOT in the total ───────────────────
--
-- The rival took 500 on the same day. If scoping ever breaks, gross becomes 600
-- and every other assertion above still passes.

do $$
declare r jsonb;
begin
  set local role authenticated;
  set local request.jwt.claims to
    '{"sub":"00000000-0000-0000-0000-0000003a0001","role":"authenticated"}';
  r := public.facility_takings(
    '00000000-0000-0000-0000-0000003a0020'::uuid,
    '2026-06-01T00:00:00Z'::timestamptz,
    '2026-07-01T00:00:00Z'::timestamptz, 'UTC');
  reset role;

  perform pg_temp.t('T2 a rival facility''s 500 is not in this facility''s gross',
    (r ->> 'gross')::numeric = 100, 'gross=' || (r ->> 'gross'));
end $$;

-- ── T3  Asking for a facility you do not belong to yields NOTHING ─────────

do $$
declare r jsonb;
begin
  set local role authenticated;
  set local request.jwt.claims to
    '{"sub":"00000000-0000-0000-0000-0000003a0001","role":"authenticated"}';
  -- The owner names the OTHER facility explicitly. `security invoker` means RLS
  -- answers, not the parameter.
  r := public.facility_takings(
    '00000000-0000-0000-0000-0000003a0021'::uuid,
    '2026-06-01T00:00:00Z'::timestamptz,
    '2026-07-01T00:00:00Z'::timestamptz, 'UTC');
  reset role;

  perform pg_temp.t('T3 naming a facility you do not belong to returns zero',
    (r ->> 'gross')::numeric = 0 and (r ->> 'sales')::int = 0,
    'gross=' || (r ->> 'gross'));
end $$;

-- ── T4  A groomer sees no money at all ────────────────────────────────────

do $$
declare r jsonb;
begin
  set local role authenticated;
  set local request.jwt.claims to
    '{"sub":"00000000-0000-0000-0000-0000003a0002","role":"authenticated"}';
  r := public.facility_takings(
    '00000000-0000-0000-0000-0000003a0020'::uuid,
    '2026-06-01T00:00:00Z'::timestamptz,
    '2026-07-01T00:00:00Z'::timestamptz, 'UTC');
  reset role;

  -- Zero, and NOT an error: the aggregate is allowed to run, RLS simply gives
  -- it nothing to add up. T1 is what proves this zero means "refused" rather
  -- than "the function always returns zero".
  perform pg_temp.t('T4 a groomer gets zero, not the takings',
    (r ->> 'gross')::numeric = 0 and (r ->> 'tips')::numeric = 0,
    'gross=' || (r ->> 'gross'));
end $$;

-- ── T5  The day bucket follows the ZONE it is given ───────────────────────
--
-- The 14:00Z payment is the 15th in UTC and still the 15th in Toronto (10:00),
-- but the 15:00Z refund is the 15th everywhere too. The zone that MOVES it is
-- one far enough east: in Asia/Tokyo, 15:00Z on the 15th is 00:00 on the 16th.

do $$
declare r_utc jsonb; r_tokyo jsonb; days_utc int; days_tokyo int;
begin
  set local role authenticated;
  set local request.jwt.claims to
    '{"sub":"00000000-0000-0000-0000-0000003a0001","role":"authenticated"}';
  r_utc := public.facility_takings(
    '00000000-0000-0000-0000-0000003a0020'::uuid,
    '2026-06-01T00:00:00Z'::timestamptz,
    '2026-07-01T00:00:00Z'::timestamptz, 'UTC');
  r_tokyo := public.facility_takings(
    '00000000-0000-0000-0000-0000003a0020'::uuid,
    '2026-06-01T00:00:00Z'::timestamptz,
    '2026-07-01T00:00:00Z'::timestamptz, 'Asia/Tokyo');
  reset role;

  days_utc   := jsonb_array_length(r_utc   -> 'byDay');
  days_tokyo := jsonb_array_length(r_tokyo -> 'byDay');

  perform pg_temp.t('T5a UTC puts both payments on one day',
    days_utc = 1, 'days=' || days_utc);
  -- 15:00Z is midnight in Tokyo, so the refund lands on the following day.
  -- This is the whole reason the zone is a parameter: bucketing a facility's
  -- evening by UTC splits its takings across two dates every night.
  perform pg_temp.t('T5b a far-east zone splits them across two days',
    days_tokyo = 2, 'days=' || days_tokyo);
  perform pg_temp.t('T5c the TOTAL is identical whichever zone is used',
    (r_utc ->> 'net')::numeric = (r_tokyo ->> 'net')::numeric,
    'utc=' || (r_utc ->> 'net') || ' tokyo=' || (r_tokyo ->> 'net'));
  perform pg_temp.t('T5d the zone it used is reported back',
    r_tokyo ->> 'timeZone' = 'Asia/Tokyo', r_tokyo ->> 'timeZone');
end $$;

-- ── T6  A nonsense zone falls back rather than 500ing a dashboard ─────────

do $$
declare r jsonb;
begin
  set local role authenticated;
  set local request.jwt.claims to
    '{"sub":"00000000-0000-0000-0000-0000003a0001","role":"authenticated"}';
  begin
    r := public.facility_takings(
      '00000000-0000-0000-0000-0000003a0020'::uuid,
      '2026-06-01T00:00:00Z'::timestamptz,
      '2026-07-01T00:00:00Z'::timestamptz, 'Not/AZone');
  exception when others then r := null;
  end;
  reset role;

  perform pg_temp.t('T6 an unknown timezone falls back to UTC, it does not raise',
    r is not null and r ->> 'timeZone' = 'UTC',
    coalesce(r ->> 'timeZone', 'RAISED'));
end $$;

-- ── T7  anon reaches none of it ───────────────────────────────────────────

do $$
declare state text;
begin
  set local role anon;
  begin
    perform public.facility_takings(
      '00000000-0000-0000-0000-0000003a0020'::uuid,
      '2026-06-01T00:00:00Z'::timestamptz,
      '2026-07-01T00:00:00Z'::timestamptz, 'UTC');
    state := 'ALLOWED';
  exception when others then state := sqlstate;
  end;
  reset role;

  -- 42501 from the GRANT, before RLS is consulted. Asserted as the code it is,
  -- not as "an error happened" — the lesson from clover-sync C6.
  perform pg_temp.t('T7 anon cannot execute it at all',
    state = '42501', 'state=' || state);
end $$;

-- ── Report ────────────────────────────────────────────────────────────────
select case when ok then '  PASS  ' else '> FAIL <' end as result, name, detail
  from tap order by n;

select count(*) filter (where ok) || ' passed, '
    || count(*) filter (where not ok) || ' failed' as summary
  from tap;

rollback;
