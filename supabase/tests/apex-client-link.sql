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
-- The function reads `auth.jwt()`, which is null in this transaction, so the
-- behavioural half is asserted through `private.link_client_at()` (the claim it
-- delegates to) and through the SHAPE of the ambiguity rule; the grants are
-- asserted directly. A signed-in claim is covered by
-- tests/e2e/customer-apex-link.spec.ts, which has a real session.
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

  -- ── L3. The function encodes exactly that rule ──────────────────────────
  --
  -- Read from the body rather than executed, because `auth.jwt()` is null
  -- here. If the guard is ever loosened to claim the first of several, this
  -- assertion is what notices.
  select pg_get_functiondef(p.oid) into v_src
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public' and p.proname = 'link_my_client_record';

  perform pg_temp.t(3, 'it refuses anything but exactly one match',
                    v_src like '%v_matches <> 1%' and v_src like '%return null%',
                    'guard present');

  perform pg_temp.t(4, 'it claims through link_client_at, not its own update',
                    v_src like '%private.link_client_at%'
                and v_src not like '%update public.clients%',
                    'one place where a row changes hands');

  perform pg_temp.t(5, 'it takes no argument to point at a facility',
                    (select coalesce(array_length(p.proargnames, 1), 0) = 0
                       from pg_proc p
                       join pg_namespace n on n.oid = p.pronamespace
                      where n.nspname = 'public'
                        and p.proname = 'link_my_client_record'),
                    'scoped by the caller alone');

  -- ── L6. A row already claimed is never taken from its owner ─────────────
  --
  -- A real profile row: `clients.profile_id` carries a foreign key, so an
  -- invented id is refused before the assertion can be made.
  insert into public.profiles (id, email)
       values ('user_sql_apex_other', 'sql-apex-other@example.test')
  on conflict (id) do nothing;
  update public.clients set profile_id = 'user_sql_apex_other'
   where id = v_client_b;

  select count(*) into v_matches
    from public.clients c
   where lower(c.email) = lower('sql-apex@example.test')
     and c.profile_id is null;
  perform pg_temp.t(6, 'a claimed row leaves the match unambiguous again',
                    v_matches = 1, v_matches || ' unclaimed');

  -- And link_client_at only ever updates `profile_id is null`.
  select pg_get_functiondef(p.oid) into v_src
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'private' and p.proname = 'link_client_at';
  perform pg_temp.t(7, 'the claim cannot take a row that has an owner',
                    v_src like '%c.profile_id is null%', 'guard present');

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
