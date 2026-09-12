-- ============================================================================
-- create_bookings: several bookings from one request, all or none
-- (20260911234642).
--
--   psql "$SUPABASE_DB_URL" -f supabase/tests/create-bookings.sql
--
-- One transaction, rolled back. Fixture emails are @example.invalid.
--
-- ── WHAT THIS FILE IS ABOUT ────────────────────────────────────────────────
--
-- 1. THREE DAYS ARE THREE BOOKINGS (M1). The positive control: every item
--    lands, each with its own pets, and the refs come back in the order asked.
--
-- 2. ALL OR NONE (M2/M3). The reason the function exists. The second stay
--    asks for a kennel the first has just taken, and the third day names a
--    stranger's dog; either way, NOTHING from the request is left behind —
--    bookings have no DELETE policy, so a half-written request could never be
--    tidied up.
--
-- 3. NOT ANON, NOT EMPTY (M4).
-- ============================================================================

begin;

set local client_min_messages to warning;

create temp table tap (n serial, name text, ok boolean, detail text);
grant all on tap to authenticated;

create or replace function pg_temp.t(p_name text, p_ok boolean, p_detail text default '')
returns void language sql as $$
  insert into tap(name, ok, detail) values (p_name, p_ok, p_detail);
$$;

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000001c0001', 'mb-owner@example.invalid')
on conflict (id) do nothing;

insert into public.profiles (id, email, full_name) values
  ('00000000-0000-0000-0000-0000001c0001', 'mb-owner@example.invalid', 'Owner')
on conflict (id) do update set full_name = excluded.full_name;

insert into public.orgs (id, name, slug) values
  ('00000000-0000-0000-0000-0000001c0010', 'MB Org', 'mb-org')
on conflict do nothing;

insert into public.facilities (id, org_id, name, slug, legacy_id) values
  ('00000000-0000-0000-0000-0000001c0020', '00000000-0000-0000-0000-0000001c0010',
   'Kennels', 'mb-a', 'mb-a')
on conflict do nothing;

insert into public.facility_memberships (id, facility_id, profile_id, role, is_active) values
  ('00000000-0000-0000-0000-0000001c0030', '00000000-0000-0000-0000-0000001c0020',
   '00000000-0000-0000-0000-0000001c0001', 'owner', true)
on conflict (id) do nothing;

insert into public.clients (id, facility_id, name, email) values
  ('00000000-0000-0000-0000-0000001c0040', '00000000-0000-0000-0000-0000001c0020',
   'Guest One', 'mb-c1@example.invalid'),
  ('00000000-0000-0000-0000-0000001c0041', '00000000-0000-0000-0000-0000001c0020',
   'Guest Two', 'mb-c2@example.invalid');

insert into public.pets (id, client_id, name, species) values
  ('00000000-0000-0000-0000-0000001c0050', '00000000-0000-0000-0000-0000001c0040', 'Rex', 'dog'),
  ('00000000-0000-0000-0000-0000001c0051', '00000000-0000-0000-0000-0000001c0040', 'Kofi', 'dog'),
  ('00000000-0000-0000-0000-0000001c0052', '00000000-0000-0000-0000-0000001c0041', 'Stranger', 'dog');

insert into public.room_categories
  (id, facility_id, legacy_id, service, name, default_capacity, sort_order)
values
  ('00000000-0000-0000-0000-0000001c0070', '00000000-0000-0000-0000-0000001c0020',
   'mb-cat', 'boarding', 'Kennels', 1, 1);

insert into public.facility_rooms
  (id, facility_id, category_id, legacy_id, name, active)
values
  ('00000000-0000-0000-0000-0000001c0060', '00000000-0000-0000-0000-0000001c0020',
   '00000000-0000-0000-0000-0000001c0070', 'MB-01', 'Kennel 1', true);

/** A daycare day for client one. */
create or replace function pg_temp.day(p_date text)
returns jsonb language sql as $$
  select jsonb_build_object(
    'facility_id', '00000000-0000-0000-0000-0000001c0020',
    'client_id',   '00000000-0000-0000-0000-0000001c0040',
    'service',     'daycare',
    'status',      'confirmed',
    'start_at',    p_date || 'T12:00:00Z',
    'end_at',      p_date || 'T21:00:00Z',
    'base_price',  40,
    'discount',    0,
    'total_cost',  40
  );
$$;

create or replace function pg_temp.bookings_of_client_one()
returns integer language sql as $$
  select count(*)::integer from public.bookings
   where client_id = '00000000-0000-0000-0000-0000001c0040';
$$;

-- ── M1: three days, three bookings, in order ───────────────────────────────
do $$
declare v_refs bigint[]; v_pets integer; v_days text[];
begin
  perform set_config('request.jwt.claims', json_build_object('sub', '00000000-0000-0000-0000-0000001c0001', 'role', 'authenticated')::text, true);
  set local role authenticated;

  select array_agg(booking_ref order by item_index) into v_refs
    from public.create_bookings(jsonb_build_array(
      jsonb_build_object('booking', pg_temp.day('2026-10-05'),
        'petIds', jsonb_build_array('00000000-0000-0000-0000-0000001c0050',
                                    '00000000-0000-0000-0000-0000001c0051')),
      jsonb_build_object('booking', pg_temp.day('2026-10-07'),
        'petIds', jsonb_build_array('00000000-0000-0000-0000-0000001c0050',
                                    '00000000-0000-0000-0000-0000001c0051')),
      jsonb_build_object('booking', pg_temp.day('2026-10-09'),
        'petIds', jsonb_build_array('00000000-0000-0000-0000-0000001c0050',
                                    '00000000-0000-0000-0000-0000001c0051'))
    ));
  reset role;

  select count(*) into v_pets
    from public.booking_pets bp join public.bookings b on b.id = bp.booking_id
   where b.ref = any(v_refs);
  select array_agg(to_char(b.start_at at time zone 'UTC', 'YYYY-MM-DD') order by b.ref)
    into v_days from public.bookings b where b.ref = any(v_refs);

  perform pg_temp.t('M1  three days are three bookings, each with both dogs',
    array_length(v_refs, 1) = 3 and v_pets = 6
      and v_days = array['2026-10-05', '2026-10-07', '2026-10-09']
      and v_refs[1] < v_refs[2] and v_refs[2] < v_refs[3],
    format('refs=%s pets=%s days=%s', v_refs, v_pets, v_days));
exception when others then
  reset role; perform pg_temp.t('M1  three days', false, sqlerrm);
end $$;

-- ── M2: the second stay wants the kennel the first just took ───────────────
do $$
declare v_before integer; v_after integer; v_raised boolean; v_code text;
        v_stay jsonb;
begin
  v_before := pg_temp.bookings_of_client_one();
  v_stay := jsonb_build_object(
    'facility_id', '00000000-0000-0000-0000-0000001c0020',
    'client_id',   '00000000-0000-0000-0000-0000001c0040',
    'service',     'boarding',
    'status',      'confirmed',
    'start_at',    '2026-11-02T20:00:00Z',
    'end_at',      '2026-11-05T15:00:00Z',
    'base_price',  150, 'discount', 0, 'total_cost', 150);

  perform set_config('request.jwt.claims', json_build_object('sub', '00000000-0000-0000-0000-0000001c0001', 'role', 'authenticated')::text, true);
  set local role authenticated;
  begin
    perform public.create_bookings(jsonb_build_array(
      jsonb_build_object('booking', v_stay,
        'petIds', jsonb_build_array('00000000-0000-0000-0000-0000001c0050'),
        'boarding', jsonb_build_object('roomId', 'MB-01')),
      jsonb_build_object('booking', v_stay,
        'petIds', jsonb_build_array('00000000-0000-0000-0000-0000001c0051'),
        'boarding', jsonb_build_object('roomId', 'MB-01'))
    ));
    v_raised := false;
  exception when others then v_raised := true; v_code := sqlstate; end;
  reset role;

  v_after := pg_temp.bookings_of_client_one();
  perform pg_temp.t('M2  a taken kennel on the second stay leaves the first unwritten too',
    v_raised and v_code = '23P01' and v_after = v_before,
    format('raised=%s code=%s before=%s after=%s', v_raised, v_code, v_before, v_after));
exception when others then
  reset role; perform pg_temp.t('M2  kennel clash', false, sqlerrm);
end $$;

-- ── M3: a stranger's dog on the third day takes the whole request down ─────
do $$
declare v_before integer; v_after integer; v_raised boolean;
begin
  v_before := pg_temp.bookings_of_client_one();

  perform set_config('request.jwt.claims', json_build_object('sub', '00000000-0000-0000-0000-0000001c0001', 'role', 'authenticated')::text, true);
  set local role authenticated;
  begin
    perform public.create_bookings(jsonb_build_array(
      jsonb_build_object('booking', pg_temp.day('2026-10-12'),
        'petIds', jsonb_build_array('00000000-0000-0000-0000-0000001c0050')),
      jsonb_build_object('booking', pg_temp.day('2026-10-13'),
        'petIds', jsonb_build_array('00000000-0000-0000-0000-0000001c0050')),
      jsonb_build_object('booking', pg_temp.day('2026-10-14'),
        'petIds', jsonb_build_array('00000000-0000-0000-0000-0000001c0052'))
    ));
    v_raised := false;
  exception when others then v_raised := true; end;
  reset role;

  v_after := pg_temp.bookings_of_client_one();
  perform pg_temp.t('M3  a stranger''s dog on day three leaves days one and two unwritten',
    v_raised and v_after = v_before,
    format('raised=%s before=%s after=%s', v_raised, v_before, v_after));
exception when others then
  reset role; perform pg_temp.t('M3  stranger', false, sqlerrm);
end $$;

-- ── M4: not anon, and not an empty request ─────────────────────────────────
do $$
declare v_raised boolean;
begin
  perform set_config('request.jwt.claims', json_build_object('sub', '00000000-0000-0000-0000-0000001c0001', 'role', 'authenticated')::text, true);
  set local role authenticated;
  begin
    perform public.create_bookings('[]'::jsonb);
    v_raised := false;
  exception when others then v_raised := true; end;
  reset role;

  perform pg_temp.t('M4  anon cannot call it, and an empty request is refused',
    not has_function_privilege('anon', 'public.create_bookings(jsonb)', 'execute')
      and not has_function_privilege('public', 'public.create_bookings(jsonb)', 'execute')
      and has_function_privilege('authenticated', 'public.create_bookings(jsonb)', 'execute')
      and v_raised,
    format('empty raised=%s', v_raised));
exception when others then
  reset role; perform pg_temp.t('M4  grants', false, sqlerrm);
end $$;

-- ── Report ──────────────────────────────────────────────────────────────────
select case when ok then '  PASS  ' else '> FAIL <' end as result, name, detail
  from tap order by n;

select count(*) filter (where ok) || ' passed, '
    || count(*) filter (where not ok) || ' failed' as summary
  from tap;

rollback;
