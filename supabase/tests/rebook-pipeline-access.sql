-- ============================================================================
-- `rebook_pipeline` is SECURITY DEFINER now, so it owes its own permission
-- check. See
-- 20260924230000_the_rebook_queue_answers_before_the_statement_timeout.sql
--
--   bun run test:sql rebook-pipeline-access
--
-- One transaction, rolled back. It provisions its own two facilities, so it
-- never depends on what any suite has left behind. NO SAVEPOINTS: a
-- `rollback to savepoint` discards the `tap` rows written since it.
--
-- ── WHY THIS FILE EXISTS ───────────────────────────────────────────────────
--
-- The function ran as the CALLER and was killed by the statement timeout after
-- ~9.7 seconds, because its first CTE walks the facility's whole `bookings`
-- table and RLS called `private.has_permission` per row. Making it a definer
-- fixes that by asking ONCE — and moves the entire burden of not leaking onto
-- one `where` clause, which is the kind of thing that must be asserted rather
-- than believed.
--
-- R0  A member holding `view_clients` gets their own facility's rows.
-- R1  THE OTHER FACILITY'S ROWS ARE NOT RETURNED. The defining risk: a definer
--     function takes a facility id as an ARGUMENT, so naming somebody else's
--     is exactly the attack, and RLS is no longer there to stop it.
-- R2  An OFFBOARDED member gets nothing. Every staff role this database has
--     holds `view_clients` at some scope (measured), so "a role without it"
--     is not a real negative control; `is_active` is, and it is the path an
--     offboarding actually takes. This is the assertion that fails if the
--     guard is dropped while the happy path keeps working.
-- R3  A CLIENT of the facility gets nothing. They could previously reach their
--     own row through `clients_read`'s `profile_id = auth.uid()` arm; a staff
--     pipeline returning every client's contact details is not theirs.
-- R4  anon cannot execute it at all.
-- R5  It IS security definer and it DOES pin `search_path` — the two
--     properties that make the rest of this file mean anything.
-- ============================================================================

begin;

set local client_min_messages to warning;

create temp table tap (n int, name text, ok boolean, detail text);
grant all on tap to authenticated, anon;

create or replace function pg_temp.t(i int, p text, ok boolean, d text default '')
returns void language sql as $$
  insert into tap(n, name, ok, detail) values (i, p, ok, d);
$$;

insert into public.profiles (id, email, full_name) values
  ('user_rbpAdmin000000000000000000000', 'rbpadmin@yipyy.invalid', 'RBP Admin')
on conflict (id) do nothing;

insert into public.platform_memberships (profile_id, role) values
  ('user_rbpAdmin000000000000000000000', 'superadmin')
on conflict (profile_id) do nothing;

select set_config('request.jwt.claims',
  json_build_object('sub','user_rbpAdmin000000000000000000000','role','authenticated')::text, true);
set local role authenticated;

do $$
begin
  perform public.provision_facility('0000000e-0000-4000-8000-000000000001'::uuid,
    'Rho Pets', 'rho-pets-rbp', 'America/Toronto', 'R Owner', 'rowner@rho.invalid');
  perform public.provision_facility('0000000e-0000-4000-8000-000000000002'::uuid,
    'Sigma Pets', 'sigma-pets-rbp', 'America/Toronto', 'S Owner', 'sowner@sigma.invalid');
end $$;

reset role;

-- ── A completed stay at each facility, so both have something to return ────

do $$
declare
  v_rho uuid; v_sigma uuid;
  v_rc uuid; v_sc uuid;
  v_rp uuid; v_sp uuid;
  v_rb uuid; v_sb uuid;
begin
  select id into v_rho   from public.facilities where slug = 'rho-pets-rbp';
  select id into v_sigma from public.facilities where slug = 'sigma-pets-rbp';

  insert into public.clients (facility_id, name, email, status, details)
  values (v_rho, 'Rho Client', 'rho.client@rbp.invalid', 'active', '{}'::jsonb)
  returning id into v_rc;
  insert into public.clients (facility_id, name, email, status, details)
  values (v_sigma, 'Sigma Client', 'sigma.client@rbp.invalid', 'active', '{}'::jsonb)
  returning id into v_sc;

  insert into public.pets (facility_id, client_id, name, species, status)
  values (v_rho, v_rc, 'Rho Dog', 'Dog', 'active') returning id into v_rp;
  insert into public.pets (facility_id, client_id, name, species, status)
  values (v_sigma, v_sc, 'Sigma Dog', 'Dog', 'active') returning id into v_sp;

  -- Completed 40 days ago, so a 30-day rule makes them due.
  insert into public.bookings
    (facility_id, client_id, service, status, start_at, end_at, base_price, total_cost)
  values (v_rho, v_rc, 'grooming', 'completed',
          now() - interval '40 days', now() - interval '40 days', 0, 0)
  returning id into v_rb;
  insert into public.bookings
    (facility_id, client_id, service, status, start_at, end_at, base_price, total_cost)
  values (v_sigma, v_sc, 'grooming', 'completed',
          now() - interval '40 days', now() - interval '40 days', 0, 0)
  returning id into v_sb;

  insert into public.booking_pets (booking_id, pet_id) values (v_rb, v_rp);
  insert into public.booking_pets (booking_id, pet_id) values (v_sb, v_sp);
end $$;

-- ── R0-R1 the owner of Rho sees Rho, and only Rho ──────────────────────────

do $$
declare
  v_rho uuid; v_sigma uuid; v_owner text;
  v_mine integer; v_theirs integer;
  v_rules jsonb := '{"grooming":{"frequencyDays":30,"lapsedAfterDays":30,"leadDays":0}}'::jsonb;
begin
  select id into v_rho   from public.facilities where slug = 'rho-pets-rbp';
  select id into v_sigma from public.facilities where slug = 'sigma-pets-rbp';

  -- provision_facility does NOT create a membership — it never has. The
  -- owner is made a member here, explicitly, or every permission check in
  -- this file is asking about somebody who works nowhere.
  insert into public.profiles (id, email, full_name) values
    ('user_rbpOwner000000000000000000000', 'rowner@rho.invalid', 'R Owner')
  on conflict (id) do nothing;

  insert into public.facility_memberships
    (facility_id, profile_id, role, access_level, is_active)
  values (v_rho, 'user_rbpOwner000000000000000000000', 'owner', 'admin', true)
  on conflict do nothing;

  v_owner := 'user_rbpOwner000000000000000000000';

  perform set_config('request.jwt.claims',
    json_build_object('sub', v_owner, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';

  select count(*) into v_mine
    from public.rebook_pipeline(v_rho, v_rules, current_date, -400, null, 300);

  -- NAMING SOMEBODY ELSE'S FACILITY IS THE ATTACK. A definer function takes
  -- the id as an argument and RLS is no longer behind it.
  select count(*) into v_theirs
    from public.rebook_pipeline(v_sigma, v_rules, current_date, -400, null, 300);

  perform pg_temp.t(0,
    'a member with view_clients gets their own facility rows',
    v_mine > 0, format('%s row(s)', v_mine));

  perform pg_temp.t(1,
    'and NOTHING for a facility they are not a member of',
    v_theirs = 0, format('%s row(s) from the other facility', v_theirs));

  execute 'reset role';
end $$;

-- ── R2 a member without the permission ─────────────────────────────────────

do $$
declare
  v_rho uuid; v_rows integer;
  v_rules jsonb := '{"grooming":{"frequencyDays":30,"lapsedAfterDays":30,"leadDays":0}}'::jsonb;
begin
  select id into v_rho from public.facilities where slug = 'rho-pets-rbp';

  insert into public.profiles (id, email, full_name) values
    ('user_rbpGone0000000000000000000000', 'rbpgone@yipyy.invalid', 'RBP Leaver')
  on conflict (id) do nothing;

  -- SOMEBODY WHO USED TO WORK HERE. Every staff role this database has holds
  -- `view_clients` at some scope — measured 2026-09-24 — so an offboarded
  -- membership is the honest negative control rather than a role invented to
  -- fail. `has_permission` checks `m.is_active`, which is the same path an
  -- offboarding takes.
  insert into public.facility_memberships
    (facility_id, profile_id, role, access_level, is_active)
  values (v_rho, 'user_rbpGone0000000000000000000000', 'manager', 'staff', false)
  on conflict do nothing;

  perform set_config('request.jwt.claims',
    json_build_object('sub','user_rbpGone0000000000000000000000','role','authenticated')::text, true);
  execute 'set local role authenticated';

  select count(*) into v_rows
    from public.rebook_pipeline(v_rho, v_rules, current_date, -400, null, 300);

  -- THE ASSERTION THAT FAILS IF THE GUARD IS EVER DROPPED while the happy
  -- path keeps working — which is how a definer function leaks quietly.
  perform pg_temp.t(2,
    'an OFFBOARDED member gets nothing, though their row is still there',
    v_rows = 0, format('%s row(s)', v_rows));

  execute 'reset role';
end $$;

-- ── R3 a client of the facility ────────────────────────────────────────────

do $$
declare
  v_rho uuid; v_rows integer;
  v_rules jsonb := '{"grooming":{"frequencyDays":30,"lapsedAfterDays":30,"leadDays":0}}'::jsonb;
begin
  select id into v_rho from public.facilities where slug = 'rho-pets-rbp';

  insert into public.profiles (id, email, full_name) values
    ('user_rbpClient00000000000000000000', 'rho.client@rbp.invalid', 'Rho Client')
  on conflict (id) do nothing;

  perform set_config('request.jwt.claims',
    json_build_object('sub','user_rbpClient00000000000000000000','role','authenticated')::text, true);
  execute 'set local role authenticated';

  perform public.link_client_record('rho-pets-rbp');

  select count(*) into v_rows
    from public.rebook_pipeline(v_rho, v_rules, current_date, -400, null, 300);

  perform pg_temp.t(3,
    'a CLIENT of the facility gets nothing — this is a staff pipeline',
    v_rows = 0, format('%s row(s)', v_rows));

  execute 'reset role';
end $$;

-- ── R4-R5 the grants and the function's own properties ─────────────────────

do $$
declare
  v_anon boolean; v_auth boolean; v_secdef boolean; v_config text[];
begin
  select has_function_privilege('anon', p.oid, 'execute'),
         has_function_privilege('authenticated', p.oid, 'execute'),
         p.prosecdef,
         p.proconfig
    into v_anon, v_auth, v_secdef, v_config
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public' and p.proname = 'rebook_pipeline';

  perform pg_temp.t(4,
    'anon cannot ask who is due, and authenticated can',
    v_anon = false and v_auth = true,
    format('anon=%s authenticated=%s', v_anon, v_auth));

  -- A definer function with a mutable search_path is the classic escalation:
  -- the caller picks which `public` it means. Both properties, together.
  perform pg_temp.t(5,
    'it is security definer AND it pins search_path',
    v_secdef = true
      and exists (select 1 from unnest(v_config) c where c like 'search_path=%'),
    format('secdef=%s config=%s', v_secdef, coalesce(v_config::text, 'null')));
end $$;

-- ── Report ──────────────────────────────────────────────────────────────────
select case when ok then '  PASS  ' else '> FAIL <' end as result, name, detail
  from tap order by n;

select count(*) filter (where ok) || ' passed, '
    || count(*) filter (where not ok) || ' failed' as summary
  from tap;

rollback;
