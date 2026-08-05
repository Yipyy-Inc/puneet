-- ============================================================================
-- create_booking: a booking, its pets and its grooming appointment, or nothing
-- (20260806560000).
--
--   psql "$(supabase status -o json | jq -r .DB_URL)" \
--     -f supabase/tests/create-booking.sql
--
-- One transaction, rolled back. Fixture emails are @example.invalid.
--
-- ── WHAT THIS FILE IS REALLY ABOUT ─────────────────────────────────────────
--
-- 1. GROOMING BOOKINGS GET AN APPOINTMENT (B1). The bug that started this: the
--    board reads grooming_appointments, /api/bookings wrote only `bookings`, so
--    a grooming booking made in the app was invisible to the people who had to
--    do it. B1 is the positive control -- if only the deny assertions passed,
--    this file would prove nothing, which is exactly how the stylist read
--    policy shipped broken.
--
-- 2. NOTHING, OR EVERYTHING (B2/B3). `bookings` has no DELETE policy, so a
--    booking that gets written and then half-furnished cannot be withdrawn. B2
--    pushes a pet belonging to someone else and B3 an unknown service, and both
--    assert the BOOKING IS GONE afterwards -- not merely that an error was
--    raised.
--
-- 3. THE SERVER PRICES IT (B4). The caller asks for a service by name and sends
--    a price of its own choosing; the appointment carries the catalogue's.
--
-- 4. A CUSTOMER REQUEST CARRIES NO AGREED PRICE (B5). enforce_booking_integrity
--    already zeroes a customer's prices and files what they asked for under
--    details.requestedQuote. If the appointment snapshotted the catalogue price
--    regardless, the trigger's decision would leak straight back in through the
--    extension -- which is the row the board and the invoice actually read.
--
-- 5. A NEW COLUMN CANNOT GO MISSING QUIETLY (B6). The insert lists its columns,
--    so a column added to `bookingToRow` and not to this function would be
--    dropped on the floor by a write that answered 201. It raises instead.
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
  ('00000000-0000-0000-0000-000000190001', 'cb-owner@example.invalid'),
  ('00000000-0000-0000-0000-000000190005', 'cb-cust@example.invalid')
on conflict (id) do nothing;

insert into public.profiles (id, email, full_name) values
  ('00000000-0000-0000-0000-000000190001', 'cb-owner@example.invalid', 'Owner'),
  ('00000000-0000-0000-0000-000000190005', 'cb-cust@example.invalid', 'Customer')
on conflict (id) do update set full_name = excluded.full_name;

insert into public.orgs (id, name, slug) values
  ('00000000-0000-0000-0000-000000190010', 'CB Org', 'cb-org')
on conflict do nothing;

insert into public.facilities (id, org_id, name, slug, legacy_id) values
  ('00000000-0000-0000-0000-000000190020', '00000000-0000-0000-0000-000000190010',
   'Salon', 'cb-a', 'cb-a')
on conflict do nothing;

insert into public.facility_memberships (id, facility_id, profile_id, role, is_active) values
  ('00000000-0000-0000-0000-000000190030', '00000000-0000-0000-0000-000000190020',
   '00000000-0000-0000-0000-000000190001', 'owner', true)
on conflict (id) do nothing;

-- Two clients: the customer owns the first, and the second exists only so that
-- B2 has somebody else's animal to try to attach.
insert into public.clients (id, facility_id, name, email, profile_id) values
  ('00000000-0000-0000-0000-000000190040', '00000000-0000-0000-0000-000000190020',
   'Mine', 'cb-c1@example.invalid', '00000000-0000-0000-0000-000000190005'),
  ('00000000-0000-0000-0000-000000190041', '00000000-0000-0000-0000-000000190020',
   'Theirs', 'cb-c2@example.invalid', null);

-- 22 lbs: inside the medium band below, outside small.
insert into public.pets (id, client_id, name, species, weight) values
  ('00000000-0000-0000-0000-000000190050', '00000000-0000-0000-0000-000000190040',
   'Rex', 'dog', 22),
  ('00000000-0000-0000-0000-000000190051', '00000000-0000-0000-0000-000000190041',
   'Stranger', 'dog', 22);

insert into public.grooming_config (facility_id, pet_size_tiers) values
  ('00000000-0000-0000-0000-000000190020', '[
     {"id": "small",  "label": "Small",  "maxWeightLbs": 15},
     {"id": "medium", "label": "Medium", "maxWeightLbs": 35},
     {"id": "large",  "label": "Large"}
   ]'::jsonb)
on conflict (facility_id) do update set pet_size_tiers = excluded.pet_size_tiers;

insert into public.grooming_services
  (id, facility_id, legacy_id, name, base_price, duration_min)
values
  ('00000000-0000-0000-0000-000000190060', '00000000-0000-0000-0000-000000190020',
   'cb-svc-1', 'Full Groom', 65, 90);

-- The medium band costs more and takes longer than the base.
insert into public.grooming_service_size_prices
  (facility_id, service_id, size_label, price, duration_min)
values
  ('00000000-0000-0000-0000-000000190020',
   '00000000-0000-0000-0000-000000190060', 'medium', 80, 105);

insert into public.grooming_add_ons
  (id, facility_id, legacy_id, name, price, duration_min)
values
  ('00000000-0000-0000-0000-000000190070', '00000000-0000-0000-0000-000000190020',
   'cb-add-1', 'Nail Trim', 12, 10);

-- The booking body the route will send, minus whatever each test varies.
create or replace function pg_temp.booking(p_client uuid, p_price numeric default 65)
returns jsonb language sql as $$
  select jsonb_build_object(
    'facility_id', '00000000-0000-0000-0000-000000190020',
    'client_id',   p_client,
    'service',     'grooming',
    'service_type','cb-svc-1',
    'status',      'confirmed',
    -- No payment_status: create_booking rejects the column outright since
    -- 20260806720000, because the database derives it.
    'start_at',    '2026-08-10T14:00:00Z',
    'end_at',      '2026-08-10T15:30:00Z',
    'base_price',  p_price,
    'discount',    0,
    'total_cost',  p_price
  );
$$;

-- ── B1: a grooming booking arrives with its appointment ────────────────────
--
-- The positive control. Size, price and duration all come from the medium band,
-- not from the request and not from the service's base row.
do $$
declare
  v_id uuid; v_size text; v_price numeric; v_dur integer; v_addons integer;
  v_pets integer;
begin
  perform set_config('request.jwt.claims', json_build_object('sub', '00000000-0000-0000-0000-000000190001', 'role', 'authenticated')::text, true);
  set local role authenticated;

  select booking_id into v_id from public.create_booking(
    pg_temp.booking('00000000-0000-0000-0000-000000190040'),
    array['00000000-0000-0000-0000-000000190050']::uuid[],
    jsonb_build_object('serviceId', 'cb-svc-1',
                       'addOnIds', jsonb_build_array('cb-add-1'))
  );
  reset role;

  select size_label, service_price, service_duration_min
    into v_size, v_price, v_dur
    from public.grooming_appointments where booking_id = v_id;
  select count(*) into v_addons
    from public.grooming_appointment_add_ons where booking_id = v_id;
  select count(*) into v_pets
    from public.booking_pets where booking_id = v_id;

  perform pg_temp.t('B1  a grooming booking creates its appointment, sized and priced',
    v_size = 'medium' and v_price = 80 and v_dur = 105
      and v_addons = 1 and v_pets = 1,
    format('size=%s price=%s duration=%s add_ons=%s pets=%s',
           v_size, v_price, v_dur, v_addons, v_pets));
exception when others then
  reset role; perform pg_temp.t('B1  appointment created', false, sqlerrm);
end $$;

-- ── B2: somebody else's animal takes the whole booking down ────────────────
do $$
declare v_before integer; v_after integer; v_raised boolean;
begin
  select count(*) into v_before from public.bookings
   where client_id = '00000000-0000-0000-0000-000000190040';

  perform set_config('request.jwt.claims', json_build_object('sub', '00000000-0000-0000-0000-000000190001', 'role', 'authenticated')::text, true);
  set local role authenticated;
  begin
    perform public.create_booking(
      pg_temp.booking('00000000-0000-0000-0000-000000190040'),
      array['00000000-0000-0000-0000-000000190051']::uuid[],
      jsonb_build_object('serviceId', 'cb-svc-1')
    );
    v_raised := false;
  exception when others then v_raised := true; end;
  reset role;

  select count(*) into v_after from public.bookings
   where client_id = '00000000-0000-0000-0000-000000190040';

  perform pg_temp.t('B2  a stranger''s pet rolls the booking back, not just the join row',
    v_raised and v_after = v_before,
    format('raised=%s bookings before=%s after=%s', v_raised, v_before, v_after));
exception when others then
  reset role; perform pg_temp.t('B2  rollback on bad pet', false, sqlerrm);
end $$;

-- ── B3: an unknown service takes the whole booking down ────────────────────
--
-- This is the one the old route could not have survived: the booking was
-- already committed by the time anything grooming-specific was attempted, and
-- there is no DELETE policy to take it back.
do $$
declare v_before integer; v_after integer; v_raised boolean;
begin
  select count(*) into v_before from public.bookings
   where client_id = '00000000-0000-0000-0000-000000190040';

  perform set_config('request.jwt.claims', json_build_object('sub', '00000000-0000-0000-0000-000000190001', 'role', 'authenticated')::text, true);
  set local role authenticated;
  begin
    perform public.create_booking(
      pg_temp.booking('00000000-0000-0000-0000-000000190040'),
      array['00000000-0000-0000-0000-000000190050']::uuid[],
      jsonb_build_object('serviceId', 'cb-does-not-exist')
    );
    v_raised := false;
  exception when others then v_raised := true; end;
  reset role;

  select count(*) into v_after from public.bookings
   where client_id = '00000000-0000-0000-0000-000000190040';

  perform pg_temp.t('B3  an unknown service leaves no orphan booking behind',
    v_raised and v_after = v_before,
    format('raised=%s bookings before=%s after=%s', v_raised, v_before, v_after));
exception when others then
  reset role; perform pg_temp.t('B3  rollback on bad service', false, sqlerrm);
end $$;

-- ── B4: the caller's price is a suggestion ─────────────────────────────────
do $$
declare v_id uuid; v_price numeric;
begin
  perform set_config('request.jwt.claims', json_build_object('sub', '00000000-0000-0000-0000-000000190001', 'role', 'authenticated')::text, true);
  set local role authenticated;
  select booking_id into v_id from public.create_booking(
    pg_temp.booking('00000000-0000-0000-0000-000000190040', 5),
    array['00000000-0000-0000-0000-000000190050']::uuid[],
    jsonb_build_object('serviceId', 'cb-svc-1')
  );
  reset role;

  select service_price into v_price
    from public.grooming_appointments where booking_id = v_id;

  perform pg_temp.t('B4  the appointment carries the catalogue price, not the requested one',
    v_price = 80, format('asked 5, recorded %s', v_price));
exception when others then
  reset role; perform pg_temp.t('B4  server-side pricing', false, sqlerrm);
end $$;

-- ── B5: a customer's request is not a price ────────────────────────────────
--
-- Both halves matter. The appointment must exist -- a customer CAN request a
-- groom -- and it must carry no money, matching what the trigger did to the
-- booking beside it.
do $$
declare v_id uuid; v_price numeric; v_addon numeric; v_booking numeric; v_status text;
begin
  perform set_config('request.jwt.claims', json_build_object('sub', '00000000-0000-0000-0000-000000190005', 'role', 'authenticated')::text, true);
  set local role authenticated;
  select booking_id into v_id from public.create_booking(
    pg_temp.booking('00000000-0000-0000-0000-000000190040'),
    array['00000000-0000-0000-0000-000000190050']::uuid[],
    jsonb_build_object('serviceId', 'cb-svc-1',
                       'addOnIds', jsonb_build_array('cb-add-1'))
  );
  reset role;

  select service_price into v_price
    from public.grooming_appointments where booking_id = v_id;
  select price into v_addon
    from public.grooming_appointment_add_ons where booking_id = v_id;
  select total_cost, status::text into v_booking, v_status
    from public.bookings where id = v_id;

  perform pg_temp.t('B5  a customer request books the groom and agrees no price',
    v_id is not null and v_price = 0 and v_addon = 0
      and v_booking = 0 and v_status = 'request_submitted',
    format('appointment=%s service_price=%s add_on=%s booking_total=%s status=%s',
           v_id is not null, v_price, v_addon, v_booking, v_status));
exception when others then
  reset role; perform pg_temp.t('B5  customer request pricing', false, sqlerrm);
end $$;

-- ── B6: an unhandled column is an error, not a shrug ───────────────────────
do $$
declare v_raised boolean; v_message text;
begin
  perform set_config('request.jwt.claims', json_build_object('sub', '00000000-0000-0000-0000-000000190001', 'role', 'authenticated')::text, true);
  set local role authenticated;
  begin
    perform public.create_booking(
      pg_temp.booking('00000000-0000-0000-0000-000000190040')
        || jsonb_build_object('kennel_number', 4),
      array['00000000-0000-0000-0000-000000190050']::uuid[],
      jsonb_build_object('serviceId', 'cb-svc-1')
    );
    v_raised := false;
  exception when others then v_raised := true; v_message := sqlerrm; end;
  reset role;

  perform pg_temp.t('B6  a column this function does not place is refused, not dropped',
    v_raised and v_message like '%kennel_number%',
    format('raised=%s message=%s', v_raised, coalesce(v_message, '-')));
exception when others then
  reset role; perform pg_temp.t('B6  unknown column', false, sqlerrm);
end $$;

-- ── B7: grooming without an appointment is refused ─────────────────────────
--
-- The bug itself, asserted directly: a caller cannot produce the exact row that
-- was invisible on the board for the last three weeks.
do $$
declare v_raised boolean;
begin
  perform set_config('request.jwt.claims', json_build_object('sub', '00000000-0000-0000-0000-000000190001', 'role', 'authenticated')::text, true);
  set local role authenticated;
  begin
    perform public.create_booking(
      pg_temp.booking('00000000-0000-0000-0000-000000190040'),
      array['00000000-0000-0000-0000-000000190050']::uuid[],
      null
    );
    v_raised := false;
  exception when others then v_raised := true; end;
  reset role;

  perform pg_temp.t('B7  a grooming booking cannot be created without its appointment',
    v_raised, format('raised=%s', v_raised));
exception when others then
  reset role; perform pg_temp.t('B7  grooming needs an appointment', false, sqlerrm);
end $$;

-- ── B8: anon cannot call it ────────────────────────────────────────────────
do $$
declare v_allowed boolean;
begin
  set local role anon;
  begin
    perform public.create_booking(
      pg_temp.booking('00000000-0000-0000-0000-000000190040'),
      array[]::uuid[],
      jsonb_build_object('serviceId', 'cb-svc-1')
    );
    v_allowed := true;
  exception when insufficient_privilege then v_allowed := false;
           when others then v_allowed := false; end;
  reset role;

  perform pg_temp.t('B8  anon cannot execute create_booking',
    not v_allowed, format('allowed=%s', v_allowed));
exception when others then
  reset role; perform pg_temp.t('B8  anon execute', false, sqlerrm);
end $$;

-- ── B9: an add-on the facility does not have is not quietly skipped ────────
--
-- The insert is a JOIN, and a join that matches nothing inserts nothing and
-- raises nothing -- the pet would arrive without the nail trim the booking
-- screen had already charged for. B1 is the positive control for this: it
-- writes a real add-on and counts it.
do $$
declare v_before integer; v_after integer; v_raised boolean;
begin
  select count(*) into v_before from public.bookings
   where client_id = '00000000-0000-0000-0000-000000190040';

  perform set_config('request.jwt.claims', json_build_object('sub', '00000000-0000-0000-0000-000000190001', 'role', 'authenticated')::text, true);
  set local role authenticated;
  begin
    perform public.create_booking(
      pg_temp.booking('00000000-0000-0000-0000-000000190040'),
      array['00000000-0000-0000-0000-000000190050']::uuid[],
      jsonb_build_object('serviceId', 'cb-svc-1',
                         'addOnIds', jsonb_build_array('cb-add-1', 'cb-nope'))
    );
    v_raised := false;
  exception when others then v_raised := true; end;
  reset role;

  select count(*) into v_after from public.bookings
   where client_id = '00000000-0000-0000-0000-000000190040';

  perform pg_temp.t('B9  an unknown add-on is refused, not silently dropped',
    v_raised and v_after = v_before,
    format('raised=%s before=%s after=%s', v_raised, v_before, v_after));
exception when others then
  reset role; perform pg_temp.t('B9  unknown add-on', false, sqlerrm);
end $$;

-- ── Report ──────────────────────────────────────────────────────────────────
select case when ok then '  PASS  ' else '> FAIL <' end as result, name, detail
  from tap order by n;

select count(*) filter (where ok) || ' passed, '
    || count(*) filter (where not ok) || ' failed' as summary
  from tap;

rollback;
