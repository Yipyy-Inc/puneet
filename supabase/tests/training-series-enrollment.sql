-- ============================================================================
-- A real training series: sessions materialize on create, enrolling books
-- every remaining session for real, capacity/waitlist are enforced, and
-- withdrawing cancels only what's still ahead of you.
--
--   psql "$SUPABASE_DB_URL" -f supabase/tests/training-series-enrollment.sql
--
-- One transaction, rolled back. Synthetic facility/clients/pets, impersonated
-- via set_config('request.jwt.claims', ...) + `set local role authenticated`
-- -- NOT run as the default (superuser/service) connection role, which
-- bypasses RLS entirely. An earlier draft of this file ran everything under
-- the default role and passed while `training_series_sessions` had no INSERT
-- policy at all -- a GRANT with no permissive policy still refuses every row,
-- and nothing here would have caught it without actually being someone.
--
-- Each step is its own top-level `do` block, per the create-booking.sql
-- convention: one block's exception handler only rolls back to that block's
-- own start, so a later failure doesn't erase earlier PASS rows too -- an
-- earlier, single-block draft of this file made every assertion but the
-- first vanish the moment anything downstream raised.
-- ============================================================================

begin;

set local client_min_messages to warning;

create temp table tap (n serial, name text, ok boolean, detail text);
grant all on tap to authenticated;

create or replace function pg_temp.t(p_name text, p_ok boolean, p_detail text default '')
returns void language sql as $$
  insert into tap(name, ok, detail) values (p_name, p_ok, p_detail);
$$;

create or replace function pg_temp.as_user(p_uid uuid) returns void
language plpgsql as $$
begin
  perform set_config('request.jwt.claims',
    case when p_uid is null then ''
         else json_build_object('sub', p_uid::text, 'role', 'authenticated')::text end,
    true);
end $$;

-- Shared state across blocks (plpgsql `do` blocks are anonymous and cannot
-- share local variables -- a temp table is the plain way to carry an id
-- from one step to the next within the same transaction).
create temp table state (key text primary key, value text);

-- Synthetic fixture: one facility, an owner, a groomer (no training
-- permission), a customer's own client record, and two pets.

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000001e9001', 'tse-owner@example.invalid'),
  ('00000000-0000-0000-0000-0000001e9002', 'tse-groomer@example.invalid'),
  ('00000000-0000-0000-0000-0000001e9003', 'tse-customer@example.invalid')
on conflict (id) do nothing;

insert into public.profiles (id, email, full_name) values
  ('00000000-0000-0000-0000-0000001e9001', 'tse-owner@example.invalid', 'TSE Owner'),
  ('00000000-0000-0000-0000-0000001e9002', 'tse-groomer@example.invalid', 'TSE Groomer'),
  ('00000000-0000-0000-0000-0000001e9003', 'tse-customer@example.invalid', 'TSE Customer')
on conflict (id) do update set full_name = excluded.full_name;

insert into public.orgs (id, name, slug) values
  ('00000000-0000-0000-0000-0000001e9010', 'TSE Org', 'tse-org')
on conflict do nothing;

insert into public.facilities (id, org_id, name, slug, legacy_id) values
  ('00000000-0000-0000-0000-0000001e9020', '00000000-0000-0000-0000-0000001e9010',
   'TSE Facility', 'tse-fac', 'tse-fac')
on conflict do nothing;

insert into public.facility_memberships (id, facility_id, profile_id, role, is_active) values
  ('00000000-0000-0000-0000-0000001e9030', '00000000-0000-0000-0000-0000001e9020',
   '00000000-0000-0000-0000-0000001e9001', 'owner', true),
  ('00000000-0000-0000-0000-0000001e9031', '00000000-0000-0000-0000-0000001e9020',
   '00000000-0000-0000-0000-0000001e9002', 'groomer', true)
on conflict (id) do nothing;

-- The customer's own client record (profile_id links it -- own_client_ids()
-- resolves through this) and, separately, a client staff can act for.
insert into public.clients (id, facility_id, name, email, profile_id) values
  ('00000000-0000-0000-0000-0000001e9040', '00000000-0000-0000-0000-0000001e9020',
   'TSE Customer Household', 'tse-c1@example.invalid', '00000000-0000-0000-0000-0000001e9003'),
  ('00000000-0000-0000-0000-0000001e9041', '00000000-0000-0000-0000-0000001e9020',
   'TSE Staff-Booked Household', 'tse-c2@example.invalid', null);

insert into public.pets (id, client_id, name, species) values
  ('00000000-0000-0000-0000-0000001e9050', '00000000-0000-0000-0000-0000001e9040', 'Nova', 'dog'),
  ('00000000-0000-0000-0000-0000001e9051', '00000000-0000-0000-0000-0000001e9041', 'Rex', 'dog'),
  ('00000000-0000-0000-0000-0000001e9052', '00000000-0000-0000-0000-0000001e9041', 'Fido', 'dog');

-- ── T1: a groomer (no training_manage_programs) is refused creating a series ─
do $$
declare v_raised boolean;
begin
  perform pg_temp.as_user('00000000-0000-0000-0000-0000001e9002');
  set local role authenticated;
  begin
    perform public.create_training_series(
      '00000000-0000-0000-0000-0000001e9020', 'Groomer Cannot Create',
      1::smallint, '09:00'::time, 30, current_date + 7, 1, 5, 0
    );
    v_raised := false;
  exception when others then
    v_raised := true;
  end;
  reset role;
  perform pg_temp.t('T1 a groomer is refused creating a series', v_raised);
exception when others then
  reset role; perform pg_temp.t('T1 groomer refusal', false, sqlerrm);
end $$;

-- ── T2: the owner creates a series -- sessions must ACTUALLY be inserted ───
--
-- This is the assertion that would have caught training_series_sessions
-- having no INSERT policy: create_training_series raised 42501 partway
-- through, and a single-block test that never impersonated anyone properly
-- never saw it.
do $$
declare v_series public.training_series; v_sessions int;
begin
  perform pg_temp.as_user('00000000-0000-0000-0000-0000001e9001');
  set local role authenticated;
  select * into v_series from public.create_training_series(
    '00000000-0000-0000-0000-0000001e9020', 'Puppy Basics Test',
    2::smallint, '18:00'::time, 60, current_date + 7, 3, 2, 300, null, null, 'Puppy Class'
  );
  reset role;

  perform pg_temp.t('T2 owner creates the series', v_series.id is not null);
  insert into state values ('series1', v_series.id::text)
    on conflict (key) do update set value = excluded.value;

  select count(*) into v_sessions
    from public.training_series_sessions where series_id = v_series.id;
  perform pg_temp.t('T2b all 3 sessions are real rows, not just claimed by the return value',
    v_sessions = 3, v_sessions::text);
exception when others then
  reset role; perform pg_temp.t('T2 series create', false, sqlerrm);
end $$;

-- ── T3: staff enrolls a client's pet -- real price, real bookings ──────────
do $$
declare v_series_id uuid; v_result jsonb; v_price numeric; v_status text;
begin
  select value::uuid into v_series_id from state where key = 'series1';

  perform pg_temp.as_user('00000000-0000-0000-0000-0000001e9001');
  set local role authenticated;
  v_result := public.enroll_in_training_series(
    v_series_id, '00000000-0000-0000-0000-0000001e9051',
    '00000000-0000-0000-0000-0000001e9041', false);
  reset role;

  perform pg_temp.t('T3 staff enroll returns status enrolled',
    (v_result->'enrollment'->>'status') = 'enrolled');
  perform pg_temp.t('T3b one booking created per remaining session',
    jsonb_array_length(v_result->'bookings') = 3);

  select b.base_price, b.status into v_price, v_status
    from public.bookings b
   where b.id = ((v_result->'bookings'->0->>'bookingId')::uuid);
  perform pg_temp.t('T3c staff-created booking carries the real price and is confirmed',
    v_price = 100 and v_status = 'confirmed',
    format('price=%s status=%s', v_price, v_status));
exception when others then
  reset role; perform pg_temp.t('T3 staff enroll', false, sqlerrm);
end $$;

-- ── T4: a customer enrolling their OWN pet -- the bookings-level trigger
--        zeroes price and forces request_submitted, exactly as it does for
--        every other service -- not reimplemented in enroll_in_training_series.
do $$
declare v_series_id uuid; v_result jsonb; v_price numeric; v_status text; v_bookings int;
begin
  select value::uuid into v_series_id from state where key = 'series1';

  perform pg_temp.as_user('00000000-0000-0000-0000-0000001e9003');
  set local role authenticated;
  v_result := public.enroll_in_training_series(
    v_series_id, '00000000-0000-0000-0000-0000001e9050',
    '00000000-0000-0000-0000-0000001e9040', false);
  reset role;

  perform pg_temp.t('T4 customer self-enroll returns status enrolled',
    (v_result->'enrollment'->>'status') = 'enrolled');

  select b.base_price, b.status into v_price, v_status
    from public.bookings b
   where b.id = ((v_result->'bookings'->0->>'bookingId')::uuid);
  perform pg_temp.t('T4b customer-created booking is priced at zero and a request',
    v_price = 0 and v_status = 'request_submitted',
    format('price=%s status=%s', v_price, v_status));

  select count(*) into v_bookings
    from public.bookings
   where training_series_session_id in
         (select id from public.training_series_sessions where series_id = v_series_id);
  perform pg_temp.t('T4c 6 real bookings total (2 pets x 3 sessions)', v_bookings = 6, v_bookings::text);
exception when others then
  reset role; perform pg_temp.t('T4 customer enroll', false, sqlerrm);
end $$;

-- ── T5: capacity=1 -- first pet fills it ────────────────────────────────────
do $$
declare v_series public.training_series; v_result jsonb;
begin
  perform pg_temp.as_user('00000000-0000-0000-0000-0000001e9001');
  set local role authenticated;
  select * into v_series from public.create_training_series(
    '00000000-0000-0000-0000-0000001e9020', 'Capacity Test',
    3::smallint, '09:00'::time, 45, current_date + 3, 2, 1, 100, null, null, 'Test Course'
  );
  v_result := public.enroll_in_training_series(
    v_series.id, '00000000-0000-0000-0000-0000001e9051',
    '00000000-0000-0000-0000-0000001e9041', false);
  reset role;

  insert into state values ('series2', v_series.id::text)
    on conflict (key) do update set value = excluded.value;
  perform pg_temp.t('T5 first pet fills capacity=1', (v_result->'enrollment'->>'status') = 'enrolled');
exception when others then
  reset role; perform pg_temp.t('T5 capacity fill', false, sqlerrm);
end $$;

-- ── T6: full + no waitlist flag raises ──────────────────────────────────────
do $$
declare v_series_id uuid; v_raised boolean;
begin
  select value::uuid into v_series_id from state where key = 'series2';

  perform pg_temp.as_user('00000000-0000-0000-0000-0000001e9001');
  set local role authenticated;
  begin
    perform public.enroll_in_training_series(
      v_series_id, '00000000-0000-0000-0000-0000001e9052',
      '00000000-0000-0000-0000-0000001e9041', false);
    v_raised := false;
  exception when others then
    v_raised := true;
  end;
  reset role;
  perform pg_temp.t('T6 full + no waitlist flag raises', v_raised);
exception when others then
  reset role; perform pg_temp.t('T6 full refusal', false, sqlerrm);
end $$;

-- ── T7: full + join_waitlist enrolls as waitlisted, zero bookings ──────────
do $$
declare v_series_id uuid; v_result jsonb;
begin
  select value::uuid into v_series_id from state where key = 'series2';

  perform pg_temp.as_user('00000000-0000-0000-0000-0000001e9001');
  set local role authenticated;
  v_result := public.enroll_in_training_series(
    v_series_id, '00000000-0000-0000-0000-0000001e9052',
    '00000000-0000-0000-0000-0000001e9041', true);
  reset role;

  perform pg_temp.t('T7 full + join_waitlist enrolls as waitlisted',
    (v_result->'enrollment'->>'status') = 'waitlisted');
  perform pg_temp.t('T7b a waitlisted enrollment creates zero bookings',
    jsonb_array_length(v_result->'bookings') = 0);
exception when others then
  reset role; perform pg_temp.t('T7 waitlist join', false, sqlerrm);
end $$;

-- ── T8: withdraw cancels the enrollment and its upcoming bookings only ─────
do $$
declare v_series_id uuid; v_enrollment_id uuid; v_active int; v_cancelled int;
begin
  select value::uuid into v_series_id from state where key = 'series2';

  select id into v_enrollment_id from public.training_series_enrollments
   where series_id = v_series_id
     and pet_id = '00000000-0000-0000-0000-0000001e9051'
     and status = 'enrolled';

  select count(*) into v_active
    from public.bookings
   where training_series_session_id in
         (select id from public.training_series_sessions where series_id = v_series_id)
     and status <> 'cancelled';
  perform pg_temp.t('T8 before withdraw, pet1 has active bookings', v_active = 2, v_active::text);

  perform pg_temp.as_user('00000000-0000-0000-0000-0000001e9001');
  set local role authenticated;
  perform public.withdraw_from_training_series(v_enrollment_id);
  reset role;

  select count(*) into v_cancelled
    from public.bookings
   where training_series_session_id in
         (select id from public.training_series_sessions where series_id = v_series_id)
     and status = 'cancelled';
  perform pg_temp.t('T8b after withdraw, those bookings are cancelled (not deleted)',
    v_cancelled = 2, v_cancelled::text);
  perform pg_temp.t('T8c the enrollment row itself is cancelled',
    (select status from public.training_series_enrollments where id = v_enrollment_id) = 'cancelled');

  insert into state values ('enrollment1', v_enrollment_id::text)
    on conflict (key) do update set value = excluded.value;
exception when others then
  reset role; perform pg_temp.t('T8 withdraw', false, sqlerrm);
end $$;

-- ── T9: partial unique index -- cancel then re-enroll the same pet succeeds ─
do $$
declare v_series_id uuid; v_result jsonb;
begin
  select value::uuid into v_series_id from state where key = 'series2';

  perform pg_temp.as_user('00000000-0000-0000-0000-0000001e9001');
  set local role authenticated;
  v_result := public.enroll_in_training_series(
    v_series_id, '00000000-0000-0000-0000-0000001e9051',
    '00000000-0000-0000-0000-0000001e9041', false);
  reset role;
  perform pg_temp.t('T9 re-enrolling the same pet after a cancel is allowed',
    (v_result->'enrollment'->>'status') = 'enrolled');
exception when others then
  reset role; perform pg_temp.t('T9 re-enroll', false, sqlerrm);
end $$;

select n, name, case when ok then 'PASS' else 'FAIL' end as result, detail
  from tap order by n;

do $$
declare v_failed int;
begin
  select count(*) into v_failed from tap where not ok;
  if v_failed > 0 then
    raise exception '% assertion(s) failed', v_failed;
  end if;
end $$;

rollback;
