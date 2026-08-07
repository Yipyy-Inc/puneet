-- ============================================================================
-- A second facility can actually use the product.
--
--   psql "$(supabase status -o json | jq -r .DB_URL)" \
--     -f supabase/tests/facility-resolution.sql
--
-- One transaction, rolled back.
--
-- ── WHAT THIS FILE IS REALLY ABOUT ─────────────────────────────────────────
--
-- src/lib/api/facility-context.ts resolved `legacy_id = "11"` unconditionally,
-- and 38 call sites across 19 API routes took their facility from it. Its own
-- comment said the fix was to "take the id from the viewer's membership
-- instead", and nothing looked wrong while one facility existed.
--
-- /dashboard/facilities/new can create a second one today. The moment it does,
-- that facility's staff meet a product that does not work:
--
--   READS  are correctly scoped by RLS, so they see an empty application
--   WRITES are stamped with the DEMO facility, and the insert policies refuse
--          them because the caller holds no membership there
--
-- M3 is that failure, preserved. M4 is the fix. Keeping both in one file is
-- the point: a test that only proves the write succeeds would still pass if
-- the facility were resolved from something the caller controls, and the whole
-- claim is that it comes from their membership.
--
-- NOT A SECURITY TEST. RLS was always right here — it refused the wrong write
-- rather than accepting it, which is why this was a hard block and not
-- corruption. What is being tested is that the application now names the
-- facility RLS was going to accept anyway.
-- ============================================================================

begin;

set local client_min_messages to warning;

create temp table tap (n int, name text, ok boolean, detail text);
grant all on tap to authenticated;

create or replace function pg_temp.t(i int, p text, ok boolean, d text default '')
returns void language sql as $$
  insert into tap(n, name, ok, detail) values (i, p, ok, d);
$$;

-- ── A second facility, exactly as the add-facility wizard would make one ────

insert into public.orgs (id, name, slug) values
  ('00000000-0000-0000-0000-00000f2c0001', 'Second Org', 'second-org')
on conflict (id) do nothing;

insert into public.facilities (id, org_id, name, slug, legacy_id, timezone) values
  ('00000000-0000-0000-0000-00000f2c0010', '00000000-0000-0000-0000-00000f2c0001',
   'Second Facility', 'second-facility', '12', 'America/Toronto')
on conflict (id) do nothing;

insert into public.locations (id, facility_id, name, is_primary, timezone, legacy_id) values
  ('00000000-0000-0000-0000-00000f2c0020', '00000000-0000-0000-0000-00000f2c0010',
   'Main', true, 'America/Toronto', '12-1')
on conflict (id) do nothing;

insert into public.profiles (id, email, full_name) values
  ('user_3f2cOwner00000000000000000000', 'owner@second.invalid', 'Second Owner')
on conflict (id) do nothing;

insert into public.facility_memberships (profile_id, facility_id, role, is_active) values
  ('user_3f2cOwner00000000000000000000', '00000000-0000-0000-0000-00000f2c0010', 'owner', true)
on conflict (profile_id, facility_id) do nothing;

select set_config('request.jwt.claims',
  json_build_object('sub','user_3f2cOwner00000000000000000000','role','authenticated')::text, true);
set local role authenticated;

-- M1: the source getFacilityContext now reads. Asserted directly, because if
-- the membership does not name this facility nothing below means anything.
select pg_temp.t(1, 'M1 their membership names the second facility',
  (select facility_id from public.facility_memberships)
    = '00000000-0000-0000-0000-00000f2c0010');

-- M2: reads were never the problem. Stated anyway, so a future change that
-- widens RLS fails here rather than somewhere quieter.
select pg_temp.t(2, 'M2 they see none of the demo facility''s clients',
  (select count(*) from public.clients) = 0);

-- M3: THE BLOCKER, preserved. Every route did this for every second facility.
do $$
declare state text;
begin
  begin
    insert into public.room_categories (facility_id, name, service, legacy_id)
    values ('a0000000-0000-4000-8000-0000000000f1', 'Wrongly stamped', 'boarding', 'f2c-wrong');
    state := 'ALLOWED';
  exception when others then state := sqlstate;
  end;
  perform pg_temp.t(3, 'M3 a write stamped with the demo facility is REFUSED',
    state = '42501', 'state=' || state);
end $$;

-- M4: the fix. Same write, stamped from their membership.
do $$
declare state text;
begin
  begin
    insert into public.room_categories (facility_id, name, service, legacy_id)
    values ('00000000-0000-0000-0000-00000f2c0010', 'Correctly stamped', 'boarding', 'f2c-right');
    state := 'ALLOWED';
  exception when others then state := sqlstate || ' ' || sqlerrm;
  end;
  perform pg_temp.t(4, 'M4 the same write stamped with THEIR facility succeeds',
    state = 'ALLOWED', state);
end $$;

-- M5: and it comes back to them, and only it.
select pg_temp.t(5, 'M5 they read back exactly their own row',
  (select count(*) from public.room_categories) = 1,
  (select string_agg(name, ', ') from public.room_categories));

-- ── The DISPLAY LABELS, which outlived the scoping fix ──────────────────────
--
-- getFacilityContext was fixed first, but three client routes and two rooms
-- routes were not going through it: they each looked the demo facility up
-- themselves, `.eq("legacy_id", "11")`.
--
-- facilities_read admits your own facilities and nothing else, so for this
-- owner that lookup is REFUSED. It used maybeSingle(), which returns null
-- rather than raising — so the refusal was invisible and the routes fell
-- through to a hardcoded "Example Pet Care Facility". Every client in a second
-- facility's list carried a name belonging to nobody, and the rooms carried
-- facilityId 11.
--
-- M6 is that refusal, asserted so nobody "fixes" it by widening the policy.
-- M7 is the replacement, which is just their membership again.

select pg_temp.t(6, 'M6 the OLD demo-name lookup returns NOTHING to them',
  (select count(*) from public.facilities where legacy_id = '11') = 0);

select pg_temp.t(7, 'M7 the NEW lookup gives their own name and ref',
  (select f.name || '/' || f.legacy_id
     from public.facilities f
     join public.facility_memberships m on m.facility_id = f.id)
    = 'Second Facility/12',
  (select f.name || '/' || f.legacy_id
     from public.facilities f
     join public.facility_memberships m on m.facility_id = f.id));

reset role;

-- ── Report ──────────────────────────────────────────────────────────────────
select case when ok then '  PASS  ' else '> FAIL <' end as result, name, detail
  from tap order by n;

select count(*) filter (where ok) || ' passed, '
    || count(*) filter (where not ok) || ' failed' as summary
  from tap;

rollback;
