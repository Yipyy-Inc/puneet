-- ============================================================================
-- A booking is found by its client's name or any of its pets' names
-- (a_booking_is_found_by_its_pets_names).
--
--   bun run test:sql booking-search-names
--
-- One transaction, rolled back. Fixture emails are @example.invalid.
--
--   N1  the names are the client's and every pet's on the booking
--   N2  a pet on another booking of the same client is not this booking's
--   N3  a booking with no pets is found by its client alone
--   N4  a caller who cannot read the client or pets gets no names
--   N5  anon cannot call it
-- ============================================================================

begin;

set local client_min_messages to warning;

create temp table tap (n serial, name text, ok boolean, detail text);
grant all on tap to authenticated;

create or replace function pg_temp.t(p_name text, p_ok boolean, p_detail text default '')
returns void language sql as $$
  insert into tap(name, ok, detail) values (p_name, p_ok, p_detail);
$$;

create or replace function pg_temp.as_user(p_uid text) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims',
    json_build_object('sub', p_uid, 'role', 'authenticated')::text, true);
end $$;

-- ── Fixture ───────────────────────────────────────────────────────────────

insert into public.orgs (id, name, slug) values
  ('00000000-0000-0000-0000-0000009e0010', 'Search Org', 'search-org')
on conflict do nothing;

insert into public.facilities (id, org_id, name, slug, legacy_id, timezone) values
  ('00000000-0000-0000-0000-0000009e0020', '00000000-0000-0000-0000-0000009e0010',
   'Search Facility', 'search-a', 'search-a', 'America/Toronto')
on conflict do nothing;

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000009e0100', 'search-mgr@example.invalid'),
  ('00000000-0000-0000-0000-0000009e0101', 'search-stranger@example.invalid')
on conflict do nothing;

insert into public.profiles (id, email, full_name) values
  ('00000000-0000-0000-0000-0000009e0100', 'search-mgr@example.invalid', 'Sam Manager'),
  ('00000000-0000-0000-0000-0000009e0101', 'search-stranger@example.invalid', 'Sid Stranger')
on conflict do nothing;

insert into public.facility_memberships (facility_id, profile_id, role) values
  ('00000000-0000-0000-0000-0000009e0020', '00000000-0000-0000-0000-0000009e0100', 'manager')
on conflict do nothing;

insert into public.clients (id, facility_id, name, email) values
  ('00000000-0000-0000-0000-0000009e0040', '00000000-0000-0000-0000-0000009e0020',
   'Nadia Okafor', 'search-c@example.invalid');

insert into public.pets (id, facility_id, client_id, name, species) values
  ('00000000-0000-0000-0000-0000009e0050', '00000000-0000-0000-0000-0000009e0020',
   '00000000-0000-0000-0000-0000009e0040', 'Biscuit', 'dog'),
  ('00000000-0000-0000-0000-0000009e0051', '00000000-0000-0000-0000-0000009e0020',
   '00000000-0000-0000-0000-0000009e0040', 'Pepper', 'dog'),
  ('00000000-0000-0000-0000-0000009e0052', '00000000-0000-0000-0000-0000009e0020',
   '00000000-0000-0000-0000-0000009e0040', 'Juniper', 'cat');

insert into public.bookings
  (id, facility_id, client_id, service, status, start_at, end_at, base_price, discount, total_cost)
values
  ('00000000-0000-0000-0000-0000009e0060', '00000000-0000-0000-0000-0000009e0020',
   '00000000-0000-0000-0000-0000009e0040', 'daycare', 'confirmed',
   now(), now() + interval '8 hours', 40, 0, 40),
  ('00000000-0000-0000-0000-0000009e0061', '00000000-0000-0000-0000-0000009e0020',
   '00000000-0000-0000-0000-0000009e0040', 'daycare', 'confirmed',
   now() + interval '1 day', now() + interval '1 day 8 hours', 40, 0, 40),
  ('00000000-0000-0000-0000-0000009e0062', '00000000-0000-0000-0000-0000009e0020',
   '00000000-0000-0000-0000-0000009e0040', 'daycare', 'confirmed',
   now() + interval '2 days', now() + interval '2 days 8 hours', 40, 0, 40);

insert into public.booking_pets (booking_id, pet_id) values
  ('00000000-0000-0000-0000-0000009e0060', '00000000-0000-0000-0000-0000009e0050'),
  ('00000000-0000-0000-0000-0000009e0060', '00000000-0000-0000-0000-0000009e0051'),
  ('00000000-0000-0000-0000-0000009e0061', '00000000-0000-0000-0000-0000009e0052');

create or replace function pg_temp.names(p_booking uuid) returns text language sql as $$
  select public.booking_search_names(b) from public.bookings b where b.id = p_booking;
$$;

-- ── N1 ────────────────────────────────────────────────────────────────────
do $$
declare v text := pg_temp.names('00000000-0000-0000-0000-0000009e0060');
begin
  perform pg_temp.t('N1  the client and every pet on the booking',
    v ilike '%Nadia Okafor%' and v ilike '%Biscuit%' and v ilike '%Pepper%',
    coalesce(v, '<null>'));
end $$;

-- ── N2 ────────────────────────────────────────────────────────────────────
do $$
declare v text := pg_temp.names('00000000-0000-0000-0000-0000009e0060');
begin
  perform pg_temp.t('N2  a pet on another booking is not this one''s',
    v not ilike '%Juniper%', coalesce(v, '<null>'));
end $$;

-- ── N3 ────────────────────────────────────────────────────────────────────
do $$
declare v text := pg_temp.names('00000000-0000-0000-0000-0000009e0062');
begin
  perform pg_temp.t('N3  a booking with no pets is found by its client',
    v = 'Nadia Okafor', coalesce(v, '<null>'));
end $$;

-- ── N4 ────────────────────────────────────────────────────────────────────
do $$
declare v_mgr int; v_stranger int;
begin
  perform pg_temp.as_user('00000000-0000-0000-0000-0000009e0100');
  set local role authenticated;
  select count(*) into v_mgr from public.bookings b
   where b.facility_id = '00000000-0000-0000-0000-0000009e0020'
     and public.booking_search_names(b) ilike '%pepper%';
  reset role;

  -- The function runs on rows the caller holds. Handed a row directly, a
  -- stranger still reads no client and no pets through it.
  perform pg_temp.as_user('00000000-0000-0000-0000-0000009e0101');
  set local role authenticated;
  select count(*) into v_stranger from public.bookings b
   where b.facility_id = '00000000-0000-0000-0000-0000009e0020'
     and public.booking_search_names(b) ilike '%pepper%';
  reset role;

  perform pg_temp.t('N4  RLS decides: the manager finds Pepper''s booking, a stranger none',
    v_mgr = 1 and v_stranger = 0,
    format('manager=%s stranger=%s', v_mgr, v_stranger));
end $$;

-- ── N5 ────────────────────────────────────────────────────────────────────
do $$
begin
  perform pg_temp.t('N5  anon cannot call it',
    not has_function_privilege('anon', 'public.booking_search_names(public.bookings)', 'execute'),
    'anon can execute');
end $$;

-- ── Report ────────────────────────────────────────────────────────────────

select n, case when ok then 'PASS' else 'FAIL' end as result, name, detail
  from tap order by n;

do $$
declare v_failed integer;
begin
  select count(*) into v_failed from tap where not ok;
  if v_failed > 0 then
    raise exception '% assertion(s) failed', v_failed;
  end if;
end $$;

rollback;
