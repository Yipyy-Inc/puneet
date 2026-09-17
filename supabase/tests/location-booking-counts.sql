-- ============================================================================
-- location_booking_counts() — a location's booking count, in one query
-- (see the migration a_locations_booking_count_is_one_query_not_one_per_row).
--
--   bun run test:sql location-booking-counts
--
-- One transaction, rolled back. Fixture emails are @example.invalid.
--
-- ── WHAT THIS FILE IS ABOUT ────────────────────────────────────────────────
--
-- L1 Each location is counted, keyed by its id as TEXT — jsonb has no uuid key.
-- L2 A location with NO bookings is absent, not zero. Its reader defaults, and
--    a screen that showed nothing for a branch with no bookings would be wrong
--    in the one direction that matters: it is the empty ones you may delete.
-- L3 A booking with no location at all is in no bucket, and inflates none.
-- L4 Another facility's bookings are not counted.
-- L5 A member WITHOUT view_bookings counts nothing. The function is security
--    invoker, so `bookings_read` is the whole boundary — and this is the
--    assertion that would catch it being changed to DEFINER.
-- L6 anon cannot execute it; authenticated can.
-- ============================================================================

begin;

set local client_min_messages to warning;

create temp table tap (n serial, name text, ok boolean, detail text);
grant all on tap to authenticated;
-- The blocks below run AS `authenticated` so RLS actually applies, and a
-- `serial` needs its sequence as well as its table — without this every
-- assertion dies on "permission denied for sequence tap_n_seq", which reads
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
  ('00000000-0000-0000-0000-0000004bc001'::uuid, 'lbc-ada@example.invalid'),
  ('00000000-0000-0000-0000-0000004bc002'::uuid, 'lbc-bo@example.invalid')
on conflict (id) do nothing;

insert into public.profiles (id, email, full_name) values
  ('00000000-0000-0000-0000-0000004bc001', 'lbc-ada@example.invalid', 'Ada'),
  ('00000000-0000-0000-0000-0000004bc002', 'lbc-bo@example.invalid', 'Bo')
on conflict (id) do update set full_name = excluded.full_name;

insert into public.orgs (id, name, slug) values
  ('00000000-0000-0000-0000-0000004bc010', 'LBC Org', 'lbc-org')
on conflict do nothing;

insert into public.facilities (id, org_id, name, slug, legacy_id) values
  ('00000000-0000-0000-0000-0000004bc020', '00000000-0000-0000-0000-0000004bc010',
   'LBC Here', 'lbc-here', 'lbc-here'),
  ('00000000-0000-0000-0000-0000004bc021', '00000000-0000-0000-0000-0000004bc010',
   'LBC Elsewhere', 'lbc-elsewhere', 'lbc-elsewhere')
on conflict do nothing;

-- Ada may see bookings here. Bo is a member of the same facility and may not —
-- the permission boundary cannot be measured without both.
insert into public.facility_memberships (id, profile_id, facility_id, role, is_active)
values
  ('00000000-0000-0000-0000-0000004bc030', '00000000-0000-0000-0000-0000004bc001',
   '00000000-0000-0000-0000-0000004bc020', 'manager', true),
  ('00000000-0000-0000-0000-0000004bc031', '00000000-0000-0000-0000-0000004bc002',
   '00000000-0000-0000-0000-0000004bc020', 'groomer', true)
on conflict (profile_id, facility_id) do nothing;

-- Granted and refused EXPLICITLY per membership rather than leaning on whatever
-- the role presets say today: this file is about the function, and a preset
-- changing elsewhere must not silently retune it.
insert into public.membership_permissions (membership_id, permission_key, scope)
values
  ('00000000-0000-0000-0000-0000004bc030', 'view_bookings', 'anytime'),
  ('00000000-0000-0000-0000-0000004bc031', 'view_bookings', 'none')
on conflict (membership_id, permission_key) do update set scope = excluded.scope;

insert into public.clients (id, facility_id, name, email) values
  ('00000000-0000-0000-0000-0000004bc040', '00000000-0000-0000-0000-0000004bc020',
   'Cass', 'lbc-cass@example.invalid'),
  ('00000000-0000-0000-0000-0000004bc041', '00000000-0000-0000-0000-0000004bc021',
   'Dee', 'lbc-dee@example.invalid');

-- ── The branches ───────────────────────────────────────────────────────────
--
--   L-A   2 bookings
--   L-B   0 bookings   ← absent from the answer, on purpose (L2)
--   L-X   1 booking    ← OTHER FACILITY (L4)
--
-- Plus one booking here with NO location at all (L3).
insert into public.locations (id, facility_id, name, is_primary) values
  ('00000000-0000-0000-0000-0000004bc050', '00000000-0000-0000-0000-0000004bc020',
   'L-A', true),
  ('00000000-0000-0000-0000-0000004bc051', '00000000-0000-0000-0000-0000004bc020',
   'L-B', false),
  ('00000000-0000-0000-0000-0000004bc052', '00000000-0000-0000-0000-0000004bc021',
   'L-X', true);

insert into public.bookings
  (facility_id, client_id, location_id, service, status, start_at, end_at,
   base_price, discount, total_cost)
values
  ('00000000-0000-0000-0000-0000004bc020', '00000000-0000-0000-0000-0000004bc040',
   '00000000-0000-0000-0000-0000004bc050', 'daycare', 'confirmed',
   now(), now() + interval '8 hours', 40, 0, 40),
  ('00000000-0000-0000-0000-0000004bc020', '00000000-0000-0000-0000-0000004bc040',
   '00000000-0000-0000-0000-0000004bc050', 'daycare', 'completed',
   now() - interval '2 days', now() - interval '2 days' + interval '8 hours', 40, 0, 40),
  -- No location: belongs to the facility, to no branch.
  ('00000000-0000-0000-0000-0000004bc020', '00000000-0000-0000-0000-0000004bc040',
   null, 'grooming', 'confirmed',
   now() + interval '1 day', now() + interval '1 day' + interval '2 hours', 60, 0, 60),
  -- The other facility's.
  ('00000000-0000-0000-0000-0000004bc021', '00000000-0000-0000-0000-0000004bc041',
   '00000000-0000-0000-0000-0000004bc052', 'daycare', 'confirmed',
   now(), now() + interval '8 hours', 40, 0, 40);

-- ── L1-L4 Ada reads her facility's counts ──────────────────────────────────
do $check1$
declare
  v jsonb;
begin
  perform pg_temp.as_user('00000000-0000-0000-0000-0000004bc001');
  -- The ROLE, not just the claim: the function is security invoker, so RLS is
  -- the whole boundary — and a superuser bypasses RLS, which would make every
  -- assertion below pass without testing it.
  execute 'set local role authenticated';

  v := public.location_booking_counts('00000000-0000-0000-0000-0000004bc020');

  perform pg_temp.t(
    'L1 each location is counted, keyed by its id as text',
    (v->>'00000000-0000-0000-0000-0000004bc050')::int = 2,
    format('counts=%s', v));

  perform pg_temp.t(
    'L2 a branch with no bookings is ABSENT, not zero',
    not (v ? '00000000-0000-0000-0000-0000004bc051'),
    format('counts=%s', v));

  perform pg_temp.t(
    'L3 a booking with no location is in no bucket and inflates none',
    (select coalesce(sum(value::int), 0) from jsonb_each_text(v)) = 2,
    format('total counted=%s (three bookings exist here)',
           (select coalesce(sum(value::int), 0) from jsonb_each_text(v))));

  perform pg_temp.t(
    'L4 the other facility''s branch is not in the answer',
    not (v ? '00000000-0000-0000-0000-0000004bc052'),
    format('counts=%s', v));
exception when others then
  perform pg_temp.t('L1-L4 the facility''s counts', false, sqlerrm);
end $check1$;

-- ── L5 a member without view_bookings counts nothing ───────────────────────
do $check2$
declare
  v jsonb;
begin
  perform pg_temp.as_user('00000000-0000-0000-0000-0000004bc002');
  execute 'set local role authenticated';

  v := public.location_booking_counts('00000000-0000-0000-0000-0000004bc020');

  -- An empty object, not an error: the same answer Bo would assemble by
  -- counting the rows they can read, which is none of them. Invoker, so there
  -- is no second boundary here to get wrong.
  perform pg_temp.t(
    'L5 no view_bookings, no counts',
    v = '{}'::jsonb,
    format('counts=%s', v));
exception when others then
  perform pg_temp.t('L5 the permission boundary', false, sqlerrm);
end $check2$;

-- ── L6 grants ───────────────────────────────────────────────────────────────
select pg_temp.t('L6 anon cannot execute it; authenticated can',
  not has_function_privilege('anon', 'public.location_booking_counts(uuid)', 'execute')
  and has_function_privilege('authenticated', 'public.location_booking_counts(uuid)', 'execute'));

-- ── Report ──────────────────────────────────────────────────────────────────
select case when ok then '  PASS  ' else '> FAIL <' end as result, name, detail
  from tap order by n;

select count(*) filter (where ok) || ' passed, '
    || count(*) filter (where not ok) || ' failed' as summary
  from tap;

rollback;
