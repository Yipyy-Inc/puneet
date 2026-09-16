-- ============================================================================
-- my_store_credit() and my_store_credit_entries() — an owner reading their own
-- store credit (see the migration an_owner_can_read_their_own_store_credit).
--
--   bun run test:sql my-store-credit
--
-- One transaction, rolled back. Fixture emails are @example.invalid.
--
-- ── WHAT THIS FILE IS ABOUT ────────────────────────────────────────────────
--
-- S1 The owner reads their own balance, and it is the SUM of the ledger.
-- S2 They read their own movements, newest first.
-- S3 The projection withholds `note` and `author_name` — staff write about a
--    customer in those, to other staff.
-- S4 Another customer's credit is invisible, balance and movements both.
-- S5 A person holding records at two facilities gets one row per facility, and
--    p_facility_id narrows to one.
-- S6 Signed out is an empty answer, not an error and not everybody's.
-- S7 anon can execute neither; authenticated can execute both.
-- ============================================================================

begin;

set local client_min_messages to warning;

create temp table tap (n serial, name text, ok boolean, detail text);
grant all on tap to authenticated;

create or replace function pg_temp.t(p_name text, p_ok boolean, p_detail text default '')
returns void language sql as $$
  insert into tap(name, ok, detail) values (p_name, p_ok, p_detail);
$$;

create or replace function pg_temp.as_user(p_sub text)
returns void language sql as $$
  select set_config('request.jwt.claims',
    json_build_object('sub', p_sub, 'role', 'authenticated')::text, true);
$$;

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000002ac001', 'msc-alice@example.invalid'),
  ('00000000-0000-0000-0000-0000002ac002', 'msc-bob@example.invalid')
on conflict (id) do nothing;

insert into public.profiles (id, email, full_name) values
  ('00000000-0000-0000-0000-0000002ac001', 'msc-alice@example.invalid', 'Alice'),
  ('00000000-0000-0000-0000-0000002ac002', 'msc-bob@example.invalid', 'Bob')
on conflict (id) do update set full_name = excluded.full_name;

insert into public.orgs (id, name, slug) values
  ('00000000-0000-0000-0000-0000002ac010', 'MSC Org', 'msc-org')
on conflict do nothing;

insert into public.facilities (id, org_id, name, slug, legacy_id) values
  ('00000000-0000-0000-0000-0000002ac020', '00000000-0000-0000-0000-0000002ac010',
   'Kennel North', 'msc-a', 'msc-a'),
  ('00000000-0000-0000-0000-0000002ac021', '00000000-0000-0000-0000-0000002ac010',
   'Kennel South', 'msc-b', 'msc-b')
on conflict do nothing;

-- Alice is a client at BOTH facilities; Bob at one.
insert into public.clients (id, facility_id, name, email, profile_id) values
  ('00000000-0000-0000-0000-0000002ac030', '00000000-0000-0000-0000-0000002ac020',
   'Alice', 'msc-alice@example.invalid', '00000000-0000-0000-0000-0000002ac001'),
  ('00000000-0000-0000-0000-0000002ac031', '00000000-0000-0000-0000-0000002ac021',
   'Alice', 'msc-alice@example.invalid', '00000000-0000-0000-0000-0000002ac001'),
  ('00000000-0000-0000-0000-0000002ac032', '00000000-0000-0000-0000-0000002ac020',
   'Bob', 'msc-bob@example.invalid', '00000000-0000-0000-0000-0000002ac002');

-- Alice: +50 then -20 at the north kennel (balance 30), +15 at the south.
-- Bob: +999, which Alice must never see.
insert into public.store_credit_entries
  (facility_id, client_id, amount, reason, note, author_name, created_at)
values
  ('00000000-0000-0000-0000-0000002ac020', '00000000-0000-0000-0000-0000002ac030',
   50, 'added', 'comped after the kennel mix-up', 'Dana', now() - interval '2 days'),
  ('00000000-0000-0000-0000-0000002ac020', '00000000-0000-0000-0000-0000002ac030',
   -20, 'redeemed', 'spent on a bath', 'Dana', now() - interval '1 day'),
  ('00000000-0000-0000-0000-0000002ac021', '00000000-0000-0000-0000-0000002ac031',
   15, 'added', 'south goodwill', 'Eli', now() - interval '3 hours'),
  ('00000000-0000-0000-0000-0000002ac020', '00000000-0000-0000-0000-0000002ac032',
   999, 'added', 'bob only', 'Dana', now());

-- ── S1/S2/S3/S5 Alice reads her own ────────────────────────────────────────
do $check1$
declare
  v_north numeric;
  v_rows  int;
  v_first numeric;
  v_cols  int;
  v_narrowed int;
begin
  perform pg_temp.as_user('00000000-0000-0000-0000-0000002ac001');

  select balance into v_north from public.my_store_credit()
   where facility_id = '00000000-0000-0000-0000-0000002ac020';
  perform pg_temp.t('S1 the balance is the sum of the ledger (50 - 20 = 30)',
    v_north = 30, format('balance=%s', coalesce(v_north::text, 'null')));

  select count(*) into v_rows from public.my_store_credit();
  perform pg_temp.t('S5 one row per facility she holds a record at',
    v_rows = 2, format('rows=%s', v_rows));

  select count(*) into v_narrowed
    from public.my_store_credit_entries('00000000-0000-0000-0000-0000002ac020', 100);
  perform pg_temp.t('S5 p_facility_id narrows to that facility alone',
    v_narrowed = 2, format('rows=%s', v_narrowed));

  select amount into v_first
    from public.my_store_credit_entries(null, 100) limit 1;
  perform pg_temp.t('S2 movements come back newest first (the +15 south entry)',
    v_first = 15, format('first=%s', coalesce(v_first::text, 'null')));

  -- The projection is the point: the money, not the commentary beside it.
  --
  -- Read from `pg_proc.proargnames`, which is where a set-returning function's
  -- OUT columns actually live. `information_schema.columns` knows only about
  -- tables and views, so asking it about a function returns zero rows whatever
  -- the function returns — an assertion that passes for the wrong reason, which
  -- is worse than none.
  select count(*) into v_cols
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
   cross join lateral unnest(coalesce(p.proargnames, '{}')) as col
   where n.nspname = 'public'
     and p.proname = 'my_store_credit_entries'
     and col in ('note', 'author_name');
  perform pg_temp.t('S3 the projection withholds note and author_name',
    v_cols = 0, format('leaked columns=%s', v_cols));
exception when others then
  perform pg_temp.t('S1/S2/S3/S5 owner reads own', false, sqlerrm);
end $check1$;

-- ── S4 Bob's credit is not Alice's ─────────────────────────────────────────
do $check2$
declare
  v_total numeric;
  v_any   int;
begin
  perform pg_temp.as_user('00000000-0000-0000-0000-0000002ac001');
  select coalesce(sum(balance), 0) into v_total from public.my_store_credit();
  select count(*) into v_any
    from public.my_store_credit_entries(null, 500) where amount = 999;
  perform pg_temp.t('S4 another customer''s credit is invisible',
    v_total = 45 and v_any = 0,
    format('alice total=%s bob rows seen=%s', v_total, v_any));
exception when others then
  perform pg_temp.t('S4 stranger', false, sqlerrm);
end $check2$;

-- ── S6 Signed out ──────────────────────────────────────────────────────────
do $check3$
declare
  v_rows int;
begin
  perform set_config('request.jwt.claims', null, true);
  select count(*) into v_rows from public.my_store_credit();
  perform pg_temp.t('S6 signed out is an empty answer, not everybody''s',
    v_rows = 0, format('rows=%s', v_rows));
exception when others then
  perform pg_temp.t('S6 signed out', false, sqlerrm);
end $check3$;

-- ── S7 grants ──────────────────────────────────────────────────────────────
select pg_temp.t('S7 anon executes neither; authenticated executes both',
  not has_function_privilege('anon', 'public.my_store_credit()', 'execute')
    and not has_function_privilege('anon', 'public.my_store_credit_entries(uuid, integer)', 'execute')
    and has_function_privilege('authenticated', 'public.my_store_credit()', 'execute')
    and has_function_privilege('authenticated', 'public.my_store_credit_entries(uuid, integer)', 'execute'));

-- ── Report ──────────────────────────────────────────────────────────────────
select case when ok then '  PASS  ' else '> FAIL <' end as result, name, detail
  from tap order by n;

select count(*) filter (where ok) || ' passed, '
    || count(*) filter (where not ok) || ' failed' as summary
  from tap;

rollback;
