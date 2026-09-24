-- ============================================================================
-- A facility can FIX a category, not just make one.
--
--   bun run test:sql service-category-crud
--
-- One transaction, rolled back. It provisions its own facility, so it never
-- depends on what any suite has left behind. NO SAVEPOINTS: a `rollback to
-- savepoint` discards the `tap` rows written since it, which silently turned
-- one of seven assertions in `lodging-area-capacity` into a reported PASS on
-- 2026-09-24.
--
-- ── WHAT THIS FILE IS ABOUT ────────────────────────────────────────────────
--
-- `/api/daycare/service-categories` and `/api/boarding/service-categories`
-- shipped GET and POST and nothing else, so a facility could create a category
-- and then live with the typo forever. The PATCH and DELETE added on
-- 2026-09-24 needed NO migration — both `*_categories_write` policies were
-- already `for all` under `manage_services` — which is exactly the kind of
-- claim worth reading back from the database rather than believing.
--
-- C0  A member who holds `manage_services` can RENAME a category.
-- C1  An OFFBOARDED member cannot. This is the assertion that fails if the
--     guard is ever dropped while the happy path keeps working.
-- C2  …and cannot REMOVE one either.
-- C3  REMOVING A CATEGORY LEAVES ITS SERVICES ON THE MENU, ungrouped. This is
--     the load-bearing one: it is the promise the confirmation dialog makes to
--     somebody about to delete a heading, and `on delete set null` is the only
--     thing making it true. Asserted for daycare AND boarding, because they
--     are twins and a twin is exactly the kind of thing that drifts.
-- C4  A rename onto a name the facility already uses is refused, so the
--     unique (facility_id, name) index still means something after an UPDATE
--     and not only after an INSERT.
--
-- ── WHY THE ACTORS ARE NOT PLATFORM ADMINS ────────────────────────────────
--
-- `private.has_permission` begins `private.is_platform_admin() or …`, so a
-- superadmin passes every permission check there is. Measuring RLS as one
-- measures nothing — it cost two wrong conclusions on 2026-09-24 alone. The
-- admin below exists ONLY to call `provision_facility`; every assertion runs
-- as an ordinary member.
--
-- And the negative control is an OFFBOARDED membership rather than a role
-- invented to fail: `has_permission` checks `m.is_active`, which is the path a
-- real offboarding takes.
-- ============================================================================

begin;

set local client_min_messages to warning;

create temp table tap (n int, name text, ok boolean, detail text);
grant all on tap to authenticated, anon;

create or replace function pg_temp.t(i int, p text, ok boolean, d text default '')
returns void language sql as $$
  insert into tap(n, name, ok, detail) values (i, p, ok, d);
$$;

-- ── A facility of this file's own ─────────────────────────────────────────

insert into public.profiles (id, email, full_name) values
  ('user_sccAdmin000000000000000000000', 'sccadmin@yipyy.invalid', 'SCC Admin')
on conflict (id) do nothing;

insert into public.platform_memberships (profile_id, role) values
  ('user_sccAdmin000000000000000000000', 'superadmin')
on conflict (profile_id) do nothing;

select set_config('request.jwt.claims',
  json_build_object('sub','user_sccAdmin000000000000000000000','role','authenticated')::text, true);
set local role authenticated;

do $$
begin
  perform public.provision_facility('0000000c-0000-4000-8000-00000000000c'::uuid,
    'Chi Pets', 'chi-pets-scc', 'America/Toronto', 'C Owner', 'cowner@chi.invalid');
end $$;

reset role;

-- ── The two actors, and the rows they will act on ─────────────────────────

do $$
declare v_fac uuid; v_dcat uuid; v_bcat uuid;
begin
  select id into v_fac from public.facilities where slug = 'chi-pets-scc';

  insert into public.profiles (id, email, full_name) values
    ('user_sccKeeps000000000000000000000', 'scckeeps@yipyy.invalid', 'SCC Manager'),
    ('user_sccGone0000000000000000000000', 'sccgone@yipyy.invalid',  'SCC Leaver')
  on conflict (id) do nothing;

  -- provision_facility does NOT create a membership — it never has. Without
  -- these two rows every permission check in this file is asking about
  -- somebody who works nowhere, and both actors would fail for the same
  -- reason, which would make C1 and C2 pass for the wrong one.
  insert into public.facility_memberships
    (facility_id, profile_id, role, access_level, is_active)
  values
    (v_fac, 'user_sccKeeps000000000000000000000', 'owner',   'admin', true),
    (v_fac, 'user_sccGone0000000000000000000000', 'manager', 'staff', false)
  on conflict do nothing;

  -- One category per menu, each with a service in it and a second category to
  -- collide with in C4.
  insert into public.daycare_service_categories (facility_id, name)
  values (v_fac, 'SCC Half days') returning id into v_dcat;
  insert into public.daycare_service_categories (facility_id, name)
  values (v_fac, 'SCC Taken');

  insert into public.daycare_services
    (facility_id, legacy_id, name, category_id, price)
  values (v_fac, 'scc-dc', 'SCC Daycare day', v_dcat, 40);

  insert into public.boarding_service_categories (facility_id, name)
  values (v_fac, 'SCC Suites') returning id into v_bcat;

  insert into public.boarding_services
    (facility_id, legacy_id, name, category_id, price, unit)
  values (v_fac, 'scc-bd', 'SCC Boarding night', v_bcat, 80, 'night');
end $$;

-- ── C0 a member with manage_services renames a category ───────────────────

do $$
declare v_fac uuid; v_cat uuid; v_touched integer; v_name text;
begin
  select id into v_fac from public.facilities where slug = 'chi-pets-scc';
  select id into v_cat from public.daycare_service_categories
   where facility_id = v_fac and name = 'SCC Half days';

  perform set_config('request.jwt.claims',
    json_build_object('sub','user_sccKeeps000000000000000000000','role','authenticated')::text, true);
  execute 'set local role authenticated';

  update public.daycare_service_categories
     set name = 'SCC Half days (fixed)'
   where id = v_cat;
  get diagnostics v_touched = row_count;

  select name into v_name from public.daycare_service_categories where id = v_cat;

  execute 'reset role';

  perform pg_temp.t(0,
    'a member holding manage_services can rename a category',
    v_touched = 1 and v_name = 'SCC Half days (fixed)',
    format('%s row(s) touched, name now %s', v_touched, coalesce(v_name, '(gone)')));
end $$;

-- ── C1-C2 an offboarded member can do neither ─────────────────────────────

do $$
declare v_fac uuid; v_cat uuid; v_renamed integer; v_removed integer; v_name text;
begin
  select id into v_fac from public.facilities where slug = 'chi-pets-scc';
  select id into v_cat from public.daycare_service_categories
   where facility_id = v_fac and name = 'SCC Half days (fixed)';

  perform set_config('request.jwt.claims',
    json_build_object('sub','user_sccGone0000000000000000000000','role','authenticated')::text, true);
  execute 'set local role authenticated';

  -- An UPDATE refused by RLS does not RAISE. The row is simply invisible to
  -- the statement, so it touches zero rows and reports success — which is the
  -- whole reason the routes count rows instead of trusting the absence of an
  -- error.
  update public.daycare_service_categories
     set name = 'SCC Renamed by a leaver'
   where id = v_cat;
  get diagnostics v_renamed = row_count;

  delete from public.daycare_service_categories where id = v_cat;
  get diagnostics v_removed = row_count;

  execute 'reset role';

  select name into v_name from public.daycare_service_categories where id = v_cat;

  perform pg_temp.t(1,
    'an offboarded member cannot rename a category',
    v_renamed = 0 and v_name = 'SCC Half days (fixed)',
    format('%s row(s) touched, name now %s', v_renamed, coalesce(v_name, '(gone)')));

  perform pg_temp.t(2,
    'and cannot remove one either',
    v_removed = 0 and v_name is not null,
    format('%s row(s) removed', v_removed));
end $$;

-- ── C3 removing a category keeps its services, ungrouped ──────────────────

do $$
declare
  v_fac uuid; v_dcat uuid; v_bcat uuid;
  v_dsvc uuid; v_bsvc uuid;
  v_dstill boolean; v_bstill boolean;
  v_dcatid uuid; v_bcatid uuid;
begin
  select id into v_fac from public.facilities where slug = 'chi-pets-scc';
  select id into v_dcat from public.daycare_service_categories
   where facility_id = v_fac and name = 'SCC Half days (fixed)';
  select id into v_bcat from public.boarding_service_categories
   where facility_id = v_fac and name = 'SCC Suites';

  select id into v_dsvc from public.daycare_services
   where facility_id = v_fac and legacy_id = 'scc-dc';
  select id into v_bsvc from public.boarding_services
   where facility_id = v_fac and legacy_id = 'scc-bd';

  perform set_config('request.jwt.claims',
    json_build_object('sub','user_sccKeeps000000000000000000000','role','authenticated')::text, true);
  execute 'set local role authenticated';

  delete from public.daycare_service_categories  where id = v_dcat;
  delete from public.boarding_service_categories where id = v_bcat;

  execute 'reset role';

  select exists (select 1 from public.daycare_services  where id = v_dsvc) into v_dstill;
  select exists (select 1 from public.boarding_services where id = v_bsvc) into v_bstill;
  select category_id into v_dcatid from public.daycare_services  where id = v_dsvc;
  select category_id into v_bcatid from public.boarding_services where id = v_bsvc;

  -- THE SENTENCE THE DIALOG PRINTS. "Its services stay on the menu and move to
  -- <ungrouped>" is true only because both FKs are `on delete set null`; make
  -- either one `cascade` and a facility tidying its headings deletes its menu.
  perform pg_temp.t(3,
    'removing a category leaves its services on the menu, ungrouped — daycare AND boarding',
    v_dstill and v_bstill and v_dcatid is null and v_bcatid is null,
    format('daycare kept=%s category=%s | boarding kept=%s category=%s',
           v_dstill, coalesce(v_dcatid::text, 'null'),
           v_bstill, coalesce(v_bcatid::text, 'null')));
end $$;

-- ── C4 a rename cannot collide ────────────────────────────────────────────

do $$
declare v_fac uuid; v_cat uuid; v_blocked boolean := false;
begin
  select id into v_fac from public.facilities where slug = 'chi-pets-scc';

  insert into public.daycare_service_categories (facility_id, name)
  values (v_fac, 'SCC Spare') returning id into v_cat;

  perform set_config('request.jwt.claims',
    json_build_object('sub','user_sccKeeps000000000000000000000','role','authenticated')::text, true);
  execute 'set local role authenticated';

  begin
    update public.daycare_service_categories set name = 'SCC Taken' where id = v_cat;
  exception when unique_violation then
    v_blocked := true;
  end;

  execute 'reset role';

  -- A unique index is checked on UPDATE as well as INSERT, and the route turns
  -- 23505 into a 409 with a sentence rather than a 500.
  perform pg_temp.t(4,
    'renaming a category onto a name the facility already uses is refused',
    v_blocked, case when v_blocked then 'refused' else 'ACCEPTED — the name is now a duplicate' end);
end $$;

-- ── Report ──────────────────────────────────────────────────────────────────
select case when ok then '  PASS  ' else '> FAIL <' end as result, name, detail
  from tap order by n;

select count(*) filter (where ok) || ' passed, '
    || count(*) filter (where not ok) || ' failed' as summary
  from tap;

rollback;
