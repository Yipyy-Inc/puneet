-- ============================================================================
-- A customer on the apex finds their own record — and only ever one.
--
--   psql "$SUPABASE_DB_URL" -f supabase/tests/apex-client-link.sql
--
-- One transaction, rolled back.
--
-- ── WHAT 20260921143000 CHANGED ───────────────────────────────────────────
--
-- `/api/clients/me` healed a null `clients.profile_id` only when a facility
-- slug was present, and `proxy.ts` stamps an empty slug on yipyy.com. So a
-- customer at the apex was never linked, saw no pets, was told "no pet added"
-- when booking, and could not add one either.
--
-- `public.link_my_client_record()` heals that case. The claim it must NOT make
-- is the one spec 002 phase 5 removed — claiming at every facility carrying
-- that address at once — so the assertions below are as much about what it
-- leaves alone as what it takes.
--
-- ── IT CALLS THE FUNCTION. THE FIRST VERSION DID NOT, AND THAT COST ──────
--
-- This file originally asserted the ambiguity rule by reading the function's
-- SOURCE with pg_get_functiondef and matching `%v_matches <> 1%`. Every
-- assertion passed against a function that could not run at all: it used
-- `min(c.facility_id)` on a uuid, and Postgres has no min() for uuid, so the
-- first real call raised `function min(uuid) does not exist` and
-- /api/clients/me answered 500. A test that reads code rather than running it
-- confirms the code says what you wrote, which is the one thing never in doubt.
--
-- `auth.jwt()` reads `request.jwt.claims`, and `set local` provides it — so
-- the claim is EXECUTED below, as a signed-in caller, inside the rollback.
-- ============================================================================

begin;

set local client_min_messages to warning;

create temp table tap (n int, name text, ok boolean, detail text);

create or replace function pg_temp.t(i int, p text, ok boolean, d text default '')
returns void language sql as $$
  insert into tap(n, name, ok, detail) values (i, p, ok, d);
$$;

do $$
declare
  v_org      uuid;
  v_fac_a    uuid;
  v_fac_b    uuid;
  v_client_a uuid;
  v_client_b uuid;
  v_matches  integer;
  v_claimed  uuid;
  v_src      text;
  v_unused   text;
begin
  -- Two facilities of this test's own, so nothing depends on seed data.
  insert into public.orgs (name, slug)
       values ('[sql] apex link org', 'sql-apex-link-org')
    returning id into v_org;
  insert into public.facilities (org_id, name, slug)
       values (v_org, '[sql] apex A', 'sql-apex-a') returning id into v_fac_a;
  insert into public.facilities (org_id, name, slug)
       values (v_org, '[sql] apex B', 'sql-apex-b') returning id into v_fac_b;

  -- ── L1. One unclaimed row carrying the address: claimable ───────────────
  insert into public.clients (facility_id, name, email)
       values (v_fac_a, '[sql] Apex Person', 'sql-apex@example.test')
    returning id into v_client_a;

  select count(*) into v_matches
    from public.clients c
   where lower(c.email) = lower('sql-apex@example.test')
     and c.profile_id is null;
  perform pg_temp.t(1, 'one unclaimed row is an unambiguous match',
                    v_matches = 1, v_matches || ' match(es)');

  -- ── L2. A SECOND facility with the same address makes it ambiguous ──────
  --
  -- The case the function must refuse. A facility that mistypes an address
  -- creates a row addressed to somebody else, and claiming it would hand that
  -- stranger the row's pets and bookings.
  insert into public.clients (facility_id, name, email)
       values (v_fac_b, '[sql] Apex Person', 'sql-apex@example.test')
    returning id into v_client_b;

  select count(*) into v_matches
    from public.clients c
   where lower(c.email) = lower('sql-apex@example.test')
     and c.profile_id is null;
  perform pg_temp.t(2, 'two unclaimed rows are ambiguous, and must claim none',
                    v_matches = 2, v_matches || ' match(es)');

  -- ── L3. RUN IT, as that person, with TWO matches: it must claim none ────
  --
  -- A profile whose address is the one both rows carry. `set local` supplies
  -- the claims `auth.jwt()` reads, so this is the real code path.
  insert into public.profiles (id, email)
       values ('user_sql_apex_me', 'sql-apex@example.test')
  on conflict (id) do nothing;
  perform set_config('request.jwt.claims',
                     '{"sub":"user_sql_apex_me"}', true);

  v_claimed := public.link_my_client_record();
  perform pg_temp.t(3, 'two matches claim nothing',
                    v_claimed is null,
                    coalesce(v_claimed::text, 'null'));

  select count(*) into v_matches
    from public.clients c
   where lower(c.email) = lower('sql-apex@example.test')
     and c.profile_id is null;
  perform pg_temp.t(4, 'and both rows are still unclaimed',
                    v_matches = 2, v_matches || ' still unclaimed');

  perform pg_temp.t(5, 'it takes no argument to point at a facility',
                    (select coalesce(array_length(p.proargnames, 1), 0) = 0
                       from pg_proc p
                       join pg_namespace n on n.oid = p.pronamespace
                      where n.nspname = 'public'
                        and p.proname = 'link_my_client_record'),
                    'scoped by the caller alone');

  -- ── L6. The second row is addressed to somebody else after all ──────────
  --
  -- Its EMAIL changes rather than its profile_id: a trigger refuses a direct
  -- `update clients set profile_id`, with "You may not change which account a
  -- client record belongs to" — which is why `link_client_at` is SECURITY
  -- DEFINER, and a protection this test has no business going around.
  update public.clients set email = 'sql-apex-elsewhere@example.test'
   where id = v_client_b;

  -- RUN IT AGAIN. One unclaimed match now, so it must claim exactly that one
  -- — and this is the call that caught `min(uuid)`.
  v_claimed := public.link_my_client_record();
  perform pg_temp.t(6, 'one match is claimed, and it is the right row',
                    v_claimed = v_client_a,
                    coalesce(v_claimed::text, 'null'));

  perform pg_temp.t(7, 'the row that was not theirs is still unclaimed',
                    (select profile_id from public.clients where id = v_client_b)
                      is null,
                    'untouched');

  -- ── L10. Asking twice returns the same row rather than claiming another ─
  perform pg_temp.t(10, 'a second call is idempotent',
                    public.link_my_client_record() = v_client_a,
                    'same row');

  -- ── L11. Somebody else's session claims nothing of theirs ───────────────
  insert into public.profiles (id, email)
       values ('user_sql_apex_other', 'sql-apex-nobody@example.test')
  on conflict (id) do nothing;
  perform set_config('request.jwt.claims',
                     '{"sub":"user_sql_apex_other"}', true);
  perform pg_temp.t(11, 'a stranger with no matching row claims nothing',
                    public.link_my_client_record() is null
                and (select profile_id from public.clients where id = v_client_a)
                      = 'user_sql_apex_me',
                    'row A still belongs to its owner');

  -- ── L8/L9. The grants, measured rather than assumed ─────────────────────
  perform pg_temp.t(8, 'anon cannot execute it',
                    not has_function_privilege('anon',
                      'public.link_my_client_record()', 'execute'));
  perform pg_temp.t(9, 'authenticated can',
                    has_function_privilege('authenticated',
                      'public.link_my_client_record()', 'execute'));
end $$;

select n, name, ok, detail from tap order by n;

select count(*) filter (where ok) || ' passed, '
    || count(*) filter (where not ok) || ' failed' as summary
  from tap;

rollback;
