-- ============================================================================
-- Booking write integrity — behaviour tests for 20260802120000.
--
-- Not a new gate and not a runner: a psql script run by hand, because what it
-- checks cannot be reached from Playwright. RLS decides what a caller may
-- write, and the only honest way to ask is to BE that caller —
-- `set local role authenticated` plus the JWT subject auth.uid() reads. That is
-- the position a browser holding the anon key and a session cookie is in, which
-- is the whole point: the Route Handler in src/app/api/bookings/ is a
-- convenience, not a gate, and testing through it would prove the wrong thing.
--
--   supabase start
--   psql "$(supabase status -o json | jq -r .DB_URL)" \
--     -f supabase/tests/booking-write-integrity.sql
--
-- Runs inside one transaction and rolls back, so it leaves nothing behind and
-- is safe against a seeded dev database. The fixture uses `wi-test-*` slugs so
-- it cannot collide with facility 11.
--
-- TO CONFIRM THESE FAIL WITHOUT THE FIX: move 20260802120000 out of
-- supabase/migrations, `supabase db reset`, and re-run. 11 of them go red —
-- among them a customer confirming their own booking, paying nothing for it,
-- and filing it against a facility they have never been to.
--
-- T7b and T15b are NOT among those 11: they belong to 20260806680000, which
-- took `payment_status` away from staff and the seed as well. Their siblings T7
-- and T15 used to assert the opposite — that a 'paid' written by staff or by
-- the seed was KEPT — which is how thirteen seeded bookings came to claim
-- $790.75 against an empty ledger. The full case is in
-- supabase/tests/booking-payment-derivation.sql.
-- ============================================================================

begin;

set local client_min_messages to warning;

create temp table tap (n serial, name text, ok boolean, detail text);
grant all on tap to authenticated;

create or replace function pg_temp.t(p_name text, p_ok boolean, p_detail text default '')
returns void language sql as $$
  insert into tap(name, ok, detail) values (p_name, p_ok, p_detail);
$$;

-- ── Fixture ────────────────────────────────────────────────────────────────
-- Two facilities (so cross-tenant forgery is expressible), three staff on
-- different presets, and two customers who each own a pet — the smallest cast
-- that can act out every refusal below.
-- EMAILS ARE FIXTURE-ONLY, and deliberately not the dev accounts'.
--
-- The first version of this used owner@yipyy.dev / groomer@yipyy.dev, which
-- reads nicely and does not work: auth.users carries a unique index on email
-- (users_email_partial_key), so on any database where those accounts already
-- exist — the seeded dev one included — the fixture aborts the transaction and
-- every test below reports a failure that is really a collision.
-- `on conflict (id)` does not save it; the conflict is on email, not id.
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000a1', 'wi-test-owner@example.invalid'),
  ('00000000-0000-0000-0000-0000000000a2', 'wi-test-groomer@example.invalid'),
  ('00000000-0000-0000-0000-0000000000a3', 'wi-test-reception@example.invalid'),
  ('00000000-0000-0000-0000-0000000000c1', 'wi-test-sam@example.invalid'),
  ('00000000-0000-0000-0000-0000000000c2', 'wi-test-mallory@example.invalid')
on conflict (id) do nothing;

insert into public.profiles (id, email, full_name) values
  ('00000000-0000-0000-0000-0000000000a1', 'wi-test-owner@example.invalid',     'Owner'),
  ('00000000-0000-0000-0000-0000000000a2', 'wi-test-groomer@example.invalid',   'Groomer'),
  ('00000000-0000-0000-0000-0000000000a3', 'wi-test-reception@example.invalid', 'Reception'),
  ('00000000-0000-0000-0000-0000000000c1', 'wi-test-sam@example.invalid',       'Sam'),
  ('00000000-0000-0000-0000-0000000000c2', 'wi-test-mallory@example.invalid',   'Mallory')
on conflict (id) do nothing;

insert into public.orgs (id, name, slug) values
  ('00000000-0000-0000-0000-00000000000f', 'Write-Integrity Test Org', 'wi-test-org');

insert into public.facilities (id, org_id, name, slug, legacy_id) values
  ('00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-00000000000f', 'Facility A', 'wi-test-facility-a', 'wi-test-a'),
  ('00000000-0000-0000-0000-0000000000f2', '00000000-0000-0000-0000-00000000000f', 'Facility B', 'wi-test-facility-b', 'wi-test-b');

insert into public.locations (id, facility_id, name, is_primary) values
  ('00000000-0000-0000-0000-00000000ab01', '00000000-0000-0000-0000-0000000000f1', 'A Main', true),
  ('00000000-0000-0000-0000-00000000ab02', '00000000-0000-0000-0000-0000000000f2', 'B Main', true);

insert into public.facility_memberships (profile_id, facility_id, role, is_active) values
  ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000f1', 'owner',     true),
  ('00000000-0000-0000-0000-0000000000a2', '00000000-0000-0000-0000-0000000000f1', 'groomer',   true),
  ('00000000-0000-0000-0000-0000000000a3', '00000000-0000-0000-0000-0000000000f1', 'reception', true);

insert into public.clients (id, facility_id, profile_id, name, email) values
  ('00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-0000000000c1', 'Sam',     'wi-test-sam@example.invalid'),
  ('00000000-0000-0000-0000-0000000000d2', '00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-0000000000c2', 'Mallory', 'wi-test-mallory@example.invalid');

insert into public.pets (id, client_id, name) values
  ('00000000-0000-0000-0000-0000000000e1', '00000000-0000-0000-0000-0000000000d1', 'Rex'),
  ('00000000-0000-0000-0000-0000000000e2', '00000000-0000-0000-0000-0000000000d2', 'Biscuit');

-- ── T1-T3: a customer books ────────────────────────────────────────────────
do $$
declare r public.bookings;
begin
  perform set_config('request.jwt.claims', json_build_object('sub', '00000000-0000-0000-0000-0000000000c1', 'role', 'authenticated')::text, true);
  set local role authenticated;

  insert into public.bookings
    (facility_id, client_id, service, status, payment_status,
     start_at, end_at, base_price, discount, total_cost, tip_amount)
  values
    -- Facility B is forged: Sam's client record lives at Facility A.
    ('00000000-0000-0000-0000-0000000000f2', '00000000-0000-0000-0000-0000000000d1', 'grooming', 'confirmed', 'paid',
     now() + interval '2 days', now() + interval '2 days 1 hour',
     0, 0, 0, 0)
  returning * into r;

  reset role;
  -- payment_status is still 'pending', but no longer BECAUSE the customer path
  -- put it back — that assignment is gone (20260806700000). It is 'pending'
  -- because the ledger is empty, which is a stronger reason: it holds for
  -- staff and for the seed too, and T7 and T15 below now say so.
  perform pg_temp.t('T1  customer cannot self-confirm',
            r.status = 'request_submitted' and r.payment_status = 'pending',
            format('status=%s payment=%s', r.status, r.payment_status));
  perform pg_temp.t('T3  forged facility_id is derived back to the client''s',
            r.facility_id = '00000000-0000-0000-0000-0000000000f1', format('facility=%s', r.facility_id));
exception when others then
  reset role;
  perform pg_temp.t('T1  customer books', false, sqlerrm);
end $$;

do $$
declare r public.bookings;
begin
  perform set_config('request.jwt.claims', json_build_object('sub', '00000000-0000-0000-0000-0000000000c1', 'role', 'authenticated')::text, true);
  set local role authenticated;

  insert into public.bookings
    (facility_id, client_id, service, status, payment_status,
     start_at, end_at, base_price, discount, total_cost)
  values
    ('00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-0000000000d1', 'boarding', 'pending', 'pending',
     now() + interval '5 days', now() + interval '7 days',
     -- What the browser quoted them, sent as if it were the price.
     240, 40, 200)
  returning * into r;

  reset role;
  perform pg_temp.t('T2a customer-supplied price is not the price',
            r.base_price = 0 and r.total_cost = 0 and r.discount = 0,
            format('base=%s discount=%s total=%s', r.base_price, r.discount, r.total_cost));
  perform pg_temp.t('T2b what they were quoted survives in details',
            (r.details->'requestedQuote'->>'totalCost')::numeric = 200,
            coalesce(r.details->>'requestedQuote', '(absent)'));
exception when others then
  reset role;
  perform pg_temp.t('T2  quote preservation', false, sqlerrm);
end $$;

-- ── T4/T5: whose pet may go on the booking ─────────────────────────────────
do $$
declare v_booking uuid; v_ok boolean;
begin
  perform set_config('request.jwt.claims', json_build_object('sub', '00000000-0000-0000-0000-0000000000c1', 'role', 'authenticated')::text, true);
  set local role authenticated;

  select id into v_booking from public.bookings
   where client_id = '00000000-0000-0000-0000-0000000000d1' order by created_at limit 1;

  insert into public.booking_pets (booking_id, pet_id) values (v_booking, '00000000-0000-0000-0000-0000000000e1');
  reset role;
  perform pg_temp.t('T4  customer attaches their own pet', true);

  perform set_config('request.jwt.claims', json_build_object('sub', '00000000-0000-0000-0000-0000000000c1', 'role', 'authenticated')::text, true);
  set local role authenticated;
  begin
    insert into public.booking_pets (booking_id, pet_id) values (v_booking, '00000000-0000-0000-0000-0000000000e2');
    v_ok := false;                        -- reached only if the insert landed
  exception when insufficient_privilege then
    v_ok := true;
  end;
  reset role;
  perform pg_temp.t('T5  customer cannot attach a stranger''s pet', v_ok,
            case when v_ok then 'refused by RLS' else 'INSERT SUCCEEDED' end);
exception when others then
  reset role;
  perform pg_temp.t('T4/T5 crew writes', false, sqlerrm);
end $$;

-- ── T6: view-only staff cannot re-crew ─────────────────────────────────────
do $$
declare v_booking uuid; v_deleted int;
begin
  -- Set up as the owner so the row is unambiguously at Facility A with a pet
  -- on it. Picking "whatever booking exists" made this pass for the wrong
  -- reason before the fix: the forged booking had landed at Facility B, where
  -- the groomer has no membership and so could not see it either way.
  perform set_config('request.jwt.claims', json_build_object('sub', '00000000-0000-0000-0000-0000000000a1', 'role', 'authenticated')::text, true);
  set local role authenticated;
  insert into public.bookings (facility_id, client_id, service, status, start_at, end_at)
  values ('00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-0000000000d1', 'grooming', 'confirmed',
          now() + interval '4 days', now() + interval '4 days 1 hour')
  returning id into v_booking;
  insert into public.booking_pets (booking_id, pet_id) values (v_booking, '00000000-0000-0000-0000-0000000000e1');
  reset role;

  perform set_config('request.jwt.claims', json_build_object('sub', '00000000-0000-0000-0000-0000000000a2', 'role', 'authenticated')::text, true);
  set local role authenticated;
  -- The groomer holds view_bookings and can read this row. That is the point:
  -- being able to see it must not be the same as being able to re-crew it.
  perform 1 from public.bookings where id = v_booking;
  delete from public.booking_pets where booking_id = v_booking;
  get diagnostics v_deleted = row_count;
  reset role;

  perform pg_temp.t('T6  view-only groomer cannot detach a pet', v_deleted = 0,
            format('%s row(s) deleted', v_deleted));
exception when others then
  reset role;
  perform pg_temp.t('T6  view-only groomer', false, sqlerrm);
end $$;

-- T6b proves the groomer really could see the row, so T6 is a refusal to write
-- rather than a failure to find.
do $$
declare v_seen int;
begin
  perform set_config('request.jwt.claims', json_build_object('sub', '00000000-0000-0000-0000-0000000000a2', 'role', 'authenticated')::text, true);
  set local role authenticated;
  select count(*) into v_seen from public.bookings
   where facility_id = '00000000-0000-0000-0000-0000000000f1' and client_id = '00000000-0000-0000-0000-0000000000d1';
  reset role;
  perform pg_temp.t('T6b the groomer can read those bookings', v_seen > 0,
            format('%s visible', v_seen));
exception when others then
  reset role; perform pg_temp.t('T6b groomer visibility', false, sqlerrm);
end $$;

-- ── T7/T8: staff keep their authority ──────────────────────────────────────
do $$
declare r public.bookings;
begin
  perform set_config('request.jwt.claims', json_build_object('sub', '00000000-0000-0000-0000-0000000000a1', 'role', 'authenticated')::text, true);
  set local role authenticated;

  insert into public.bookings
    (facility_id, client_id, service, status, payment_status,
     start_at, end_at, base_price, discount, total_cost, assigned_staff_name)
  values
    ('00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-0000000000d1', 'daycare', 'confirmed', 'paid',
     now() + interval '1 day', now() + interval '1 day 8 hours',
     90, 10, 80, 'Jules')
  returning * into r;
  reset role;

  -- The price, the status and the rota ARE staff's to set. `payment_status` is
  -- NOT, and was until 20260806680000 — this insert asks for 'paid' over an
  -- empty ledger and gets 'pending', which is how thirteen seeded bookings came
  -- to claim $790.75 that no payment row backed.
  perform pg_temp.t('T7  staff price and status are kept',
            r.status = 'confirmed'
            and r.total_cost = 80 and r.assigned_staff_name = 'Jules',
            format('status=%s total=%s staff=%s', r.status, r.total_cost, r.assigned_staff_name));
  perform pg_temp.t('T7b staff cannot declare a booking paid',
            r.payment_status = 'pending' and r.amount_paid = 0,
            format('payment=%s amount_paid=%s', r.payment_status, r.amount_paid));
exception when others then
  reset role;
  perform pg_temp.t('T7  staff booking', false, sqlerrm);
end $$;

do $$
declare v_booking uuid;
begin
  -- Reception holds create_bookings but NOT edit_bookings. Creating a booking
  -- and then attaching its pets must work in one breath.
  perform set_config('request.jwt.claims', json_build_object('sub', '00000000-0000-0000-0000-0000000000a3', 'role', 'authenticated')::text, true);
  set local role authenticated;

  insert into public.bookings
    (facility_id, client_id, service, status, start_at, end_at, base_price, total_cost)
  values ('00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-0000000000d2', 'grooming', 'confirmed',
          now() + interval '3 days', now() + interval '3 days 2 hours', 70, 70)
  returning id into v_booking;

  insert into public.booking_pets (booking_id, pet_id) values (v_booking, '00000000-0000-0000-0000-0000000000e2');
  reset role;
  perform pg_temp.t('T8  reception can crew the booking it just made', true);
exception when others then
  reset role;
  perform pg_temp.t('T8  reception create+crew', false, sqlerrm);
end $$;

-- ── T9-T12: what a customer may do to an existing booking ──────────────────
do $$
declare v_booking uuid; r public.bookings; v_ok boolean;
begin
  -- The daycare booking from T7 specifically: it is the one with a real price
  -- on it, which is what makes "the price survived the cancellation" a claim.
  select id into v_booking from public.bookings
   where client_id = '00000000-0000-0000-0000-0000000000d1' and status = 'confirmed' and service = 'daycare' limit 1;

  perform set_config('request.jwt.claims', json_build_object('sub', '00000000-0000-0000-0000-0000000000c1', 'role', 'authenticated')::text, true);
  set local role authenticated;
  update public.bookings set status = 'cancelled' where id = v_booking;
  reset role;

  select * into r from public.bookings where id = v_booking;
  perform pg_temp.t('T9  customer can cancel their own booking',
            r.status = 'cancelled' and r.total_cost = 80,
            format('status=%s total=%s', r.status, r.total_cost));
exception when others then
  reset role;
  perform pg_temp.t('T9  customer cancel', false, sqlerrm);
end $$;

do $$
declare v_booking uuid; v_ok boolean;
begin
  select id into v_booking from public.bookings
   where client_id = '00000000-0000-0000-0000-0000000000d1' and status = 'request_submitted' limit 1;

  perform set_config('request.jwt.claims', json_build_object('sub', '00000000-0000-0000-0000-0000000000c1', 'role', 'authenticated')::text, true);
  set local role authenticated;
  begin
    update public.bookings set status = 'confirmed' where id = v_booking;
    v_ok := false;
  exception when insufficient_privilege then
    v_ok := true;
  end;
  reset role;
  perform pg_temp.t('T10 customer cannot confirm their own request', v_ok,
            case when v_ok then 'refused' else 'UPDATE SUCCEEDED' end);
exception when others then
  reset role;
  perform pg_temp.t('T10 customer confirm', false, sqlerrm);
end $$;

do $$
declare v_booking uuid; r public.bookings;
begin
  select id into v_booking from public.bookings
   where client_id = '00000000-0000-0000-0000-0000000000d1' and status = 'request_submitted' limit 1;

  perform set_config('request.jwt.claims', json_build_object('sub', '00000000-0000-0000-0000-0000000000c1', 'role', 'authenticated')::text, true);
  set local role authenticated;
  -- The shape the PATCH route sends: the whole merged booking, cancelled, with
  -- the money quietly rewritten.
  update public.bookings
     set status = 'cancelled', base_price = 0, total_cost = 0, discount = 0,
         start_at = now() + interval '99 days'
   where id = v_booking;
  reset role;

  select * into r from public.bookings where id = v_booking;
  perform pg_temp.t('T11 cancelling cannot smuggle other changes',
            r.status = 'cancelled' and r.start_at < now() + interval '90 days',
            format('status=%s start=%s', r.status, r.start_at));
exception when others then
  reset role;
  perform pg_temp.t('T11 cancel smuggling', false, sqlerrm);
end $$;

do $$
declare v_booking uuid; v_ok boolean;
begin
  -- Checked in BY STAFF, which is the only way a booking reaches that status.
  -- Inserting it as the session role would work here but not against a real
  -- caller, and a fixture that only exists under a superuser proves nothing.
  perform set_config('request.jwt.claims', json_build_object('sub', '00000000-0000-0000-0000-0000000000a1', 'role', 'authenticated')::text, true);
  set local role authenticated;
  insert into public.bookings
    (facility_id, client_id, service, status, start_at, end_at)
  values ('00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-0000000000d1', 'boarding', 'checked_in',
          now() - interval '1 hour', now() + interval '1 day')
  returning id into v_booking;
  reset role;

  perform set_config('request.jwt.claims', json_build_object('sub', '00000000-0000-0000-0000-0000000000c1', 'role', 'authenticated')::text, true);
  set local role authenticated;
  begin
    update public.bookings set status = 'cancelled' where id = v_booking;
    v_ok := false;
  exception when insufficient_privilege then
    v_ok := true;
  end;
  reset role;
  perform pg_temp.t('T12 cannot cancel a pet already on site', v_ok,
            case when v_ok then 'refused' else 'UPDATE SUCCEEDED' end);
exception when others then
  reset role;
  perform pg_temp.t('T12 cancel after check-in', false, sqlerrm);
end $$;

-- ── T13/T14: money that cannot be nonsense ─────────────────────────────────
do $$
declare v_ok boolean;
begin
  perform set_config('request.jwt.claims', json_build_object('sub', '00000000-0000-0000-0000-0000000000a1', 'role', 'authenticated')::text, true);
  set local role authenticated;
  begin
    insert into public.bookings (facility_id, client_id, service, start_at, end_at, base_price, total_cost)
    values ('00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-0000000000d1', 'retail', now(), now() + interval '1 hour', -50, -50);
    v_ok := false;
  exception when check_violation then v_ok := true;
  end;
  reset role;
  perform pg_temp.t('T13 negative money is rejected', v_ok);
exception when others then
  reset role; perform pg_temp.t('T13 negative money', false, sqlerrm);
end $$;

do $$
declare v_ok boolean;
begin
  perform set_config('request.jwt.claims', json_build_object('sub', '00000000-0000-0000-0000-0000000000a1', 'role', 'authenticated')::text, true);
  set local role authenticated;
  begin
    insert into public.bookings (facility_id, client_id, service, start_at, end_at, base_price, discount, total_cost)
    values ('00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-0000000000d1', 'retail', now(), now() + interval '1 hour', 20, 500, 0);
    v_ok := false;
  exception when check_violation then v_ok := true;
  end;
  reset role;
  perform pg_temp.t('T14 a discount cannot exceed the price', v_ok);
exception when others then
  reset role; perform pg_temp.t('T14 discount cap', false, sqlerrm);
end $$;

-- ── T15: the seed path must survive ────────────────────────────────────────
do $$
declare r public.bookings;
begin
  -- No JWT subject at all: this is `bun run db:seed:apply` / any service_role job.
  perform set_config('request.jwt.claims', '', true);
  insert into public.bookings
    (facility_id, client_id, service, status, payment_status, start_at, end_at,
     base_price, discount, total_cost)
  values ('00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-0000000000d1', 'training', 'completed', 'paid',
          now() - interval '10 days', now() - interval '10 days' + interval '1 hour',
          150, 25, 125)
  returning * into r;

  perform pg_temp.t('T15 seeds keep their prices and statuses',
            r.status = 'completed' and r.total_cost = 125,
            format('status=%s total=%s', r.status, r.total_cost));
  -- The seed path bypasses enforce_booking_integrity entirely (auth.uid() is
  -- null) and it does NOT bypass the derivation. There is no writer left that
  -- can say 'paid' without a payment — which is the whole point, since the seed
  -- is the writer that did.
  perform pg_temp.t('T15b not even the seed can declare a booking paid',
            r.payment_status = 'pending' and r.amount_paid = 0,
            format('payment=%s amount_paid=%s', r.payment_status, r.amount_paid));
exception when others then
  perform pg_temp.t('T15 seed path', false, sqlerrm);
end $$;

-- ── T16: a location has to belong to the facility ──────────────────────────
do $$
declare v_ok boolean;
begin
  perform set_config('request.jwt.claims', json_build_object('sub', '00000000-0000-0000-0000-0000000000a1', 'role', 'authenticated')::text, true);
  set local role authenticated;
  begin
    insert into public.bookings (facility_id, client_id, location_id, service, start_at, end_at)
    values ('00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-00000000ab02', 'daycare', now(), now() + interval '1 hour');
    v_ok := false;
  exception when check_violation then v_ok := true;
  end;
  reset role;
  perform pg_temp.t('T16 a booking cannot point at another facility''s location', v_ok);
exception when others then
  reset role; perform pg_temp.t('T16 location tenancy', false, sqlerrm);
end $$;

-- ── T17: view-only staff still cannot edit ─────────────────────────────────
do $$
declare v_booking uuid; v_updated int;
begin
  select id into v_booking from public.bookings where client_id = '00000000-0000-0000-0000-0000000000d1' limit 1;
  perform set_config('request.jwt.claims', json_build_object('sub', '00000000-0000-0000-0000-0000000000a2', 'role', 'authenticated')::text, true);
  set local role authenticated;
  update public.bookings set total_cost = 1 where id = v_booking;
  get diagnostics v_updated = row_count;
  reset role;
  perform pg_temp.t('T17 view-only groomer cannot edit a booking', v_updated = 0,
            format('%s row(s) updated', v_updated));
exception when others then
  reset role; perform pg_temp.t('T17 groomer edit', false, sqlerrm);
end $$;


-- ── T18: a customer may still edit their own notes ─────────────────────────
do $$
declare v_booking uuid; r public.bookings;
begin
  select id into v_booking from public.bookings
   where client_id = '00000000-0000-0000-0000-0000000000d1' and status = 'request_submitted' limit 1;

  perform set_config('request.jwt.claims', json_build_object('sub', '00000000-0000-0000-0000-0000000000c1', 'role', 'authenticated')::text, true);
  set local role authenticated;
  -- The whole merged object, as the PATCH route sends it, with only the note
  -- actually changed — and a hopeful attempt on the service and the price.
  update public.bookings
     set special_requests = 'Rex is nervous around clippers',
         service = 'boarding_suite', total_cost = 5
   where id = v_booking;
  reset role;

  select * into r from public.bookings where id = v_booking;
  perform pg_temp.t('T18 customer can edit their own notes, nothing else',
            r.special_requests = 'Rex is nervous around clippers'
            and r.service = 'boarding' and r.total_cost = 0,
            format('note=%s service=%s total=%s', r.special_requests, r.service, r.total_cost));
exception when others then
  reset role; perform pg_temp.t('T18 customer note edit', false, sqlerrm);
end $$;

-- ── Report ─────────────────────────────────────────────────────────────────
select case when ok then '  PASS  ' else '> FAIL <' end as result,
       name, detail
  from tap order by n;

select count(*) filter (where ok) || ' passed, '
    || count(*) filter (where not ok) || ' failed' as summary
  from tap;

rollback;
