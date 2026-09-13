-- ============================================================================
-- Grooming appointments — lifecycle, snapshots and RLS for 20260805140000.
--
--   psql "$(supabase status -o json | jq -r .DB_URL)" \
--     -f supabase/tests/grooming-appointments-rls.sql
--
-- One transaction, rolled back. Fixture emails are @example.invalid.
--
-- FOUR CLAIMS THIS FILE EXISTS TO PROVE:
--
--   1. THE CLOCK IS THE SERVER'S. check_in_at / check_out_at are stamped when
--      the booking's status moves, and the ready-ETA is derived from the
--      service duration plus the add-ons actually on the ticket (T3). A route
--      that passed its own timestamps could not be caught by reading the code;
--      it is caught here.
--
--   2. A GROOM CANNOT SKIP CHECK-IN. No pet is "in progress" or "ready for
--      pickup" without having arrived (T2) — and after check-in both are fine,
--      so T2 is measuring the guard and not a broken update (T4).
--
--   3. THE MENU IS SNAPSHOTTED, NOT REFERENCED. Renaming, repricing or deleting
--      a service does not rewrite what was sold (T7). This is the rule
--      staff_signatures already set: store the text as at signing, never a FK
--      to a mutable row.
--
--   4. THE TICKET IS THE FACILITY'S (20260912220846). A customer changes no
--      appointment (T14, armed by T15), and a row their own request inserts
--      carries no price (T16) — while that request still reaches the board
--      through create_booking() (T17).
--
-- NEGATIVE CONTROLS, run before this file was written:
--
--   * Reading name/price through a join to grooming_services instead of the
--     snapshot turns an $80 "Full Groom" into a $120 "Full Groom (Deluxe)" the
--     moment the facility reprices — the customer's own history, rewritten.
--   * Dropping bookings_sync_grooming_lifecycle lets a booking reach `ready`
--     with check_in_at still null: ready for pickup, never arrived.
--
-- TO RE-RUN THEM: drop the trigger and re-run — T2/T3/T5/T6 go green-to-red.
-- ============================================================================

begin;

set local client_min_messages to warning;

create temp table tap (n serial, name text, ok boolean, detail text);
grant all on tap to authenticated;

create or replace function pg_temp.t(p_name text, p_ok boolean, p_detail text default '')
returns void language sql as $$
  insert into tap(name, ok, detail) values (p_name, p_ok, p_detail);
$$;

-- ── Fixture ─────────────────────────────────────────────────────────────────
-- Two facilities and three callers: the salon owner, the pet's owner (a real
-- auth user linked to the client row, so private.own_client_ids() resolves),
-- and a rival salon.

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000a001', 'ga-owner@example.invalid'),
  ('00000000-0000-0000-0000-00000000a003', 'ga-client@example.invalid'),
  ('00000000-0000-0000-0000-00000000a004', 'ga-rival@example.invalid')
on conflict (id) do nothing;

insert into public.profiles (id, email, full_name) values
  ('00000000-0000-0000-0000-00000000a001', 'ga-owner@example.invalid',  'Owner'),
  ('00000000-0000-0000-0000-00000000a003', 'ga-client@example.invalid', 'Client'),
  ('00000000-0000-0000-0000-00000000a004', 'ga-rival@example.invalid',  'Rival')
on conflict (id) do update set full_name = excluded.full_name;

insert into public.orgs (id, name, slug) values
  ('00000000-0000-0000-0000-00000000a010', 'GA Org',   'ga-org'),
  ('00000000-0000-0000-0000-00000000a011', 'GA Rival', 'ga-rival-org')
on conflict (id) do nothing;

insert into public.facilities (id, org_id, name, slug, legacy_id) values
  ('00000000-0000-0000-0000-00000000a020', '00000000-0000-0000-0000-00000000a010',
   'GA Salon', 'ga-salon', 'ga-a'),
  ('00000000-0000-0000-0000-00000000a021', '00000000-0000-0000-0000-00000000a011',
   'Rival Salon', 'ga-rival', 'ga-b')
on conflict (id) do nothing;

insert into public.facility_memberships (id, facility_id, profile_id, role, is_active) values
  ('00000000-0000-0000-0000-00000000a030', '00000000-0000-0000-0000-00000000a020',
   '00000000-0000-0000-0000-00000000a001', 'owner', true),
  ('00000000-0000-0000-0000-00000000a031', '00000000-0000-0000-0000-00000000a021',
   '00000000-0000-0000-0000-00000000a004', 'owner', true)
on conflict (id) do nothing;

insert into public.clients (id, facility_id, name, email, profile_id) values
  ('00000000-0000-0000-0000-00000000a040', '00000000-0000-0000-0000-00000000a020',
   'Client', 'ga-client@example.invalid', '00000000-0000-0000-0000-00000000a003');

insert into public.grooming_services (id, facility_id, legacy_id, name, base_price, duration_min) values
  ('00000000-0000-0000-0000-00000000a050', '00000000-0000-0000-0000-00000000a020',
   'p1', 'Full Groom', 80, 90);

insert into public.grooming_add_ons (id, facility_id, legacy_id, name, price, duration_min) values
  ('00000000-0000-0000-0000-00000000a060', '00000000-0000-0000-0000-00000000a020',
   'ao1', 'Teeth Brushing', 12, 10),
  ('00000000-0000-0000-0000-00000000a061', '00000000-0000-0000-0000-00000000a020',
   'ao2', 'De-shed', 20, 20),
  ('00000000-0000-0000-0000-00000000a062', '00000000-0000-0000-0000-00000000a021',
   'aoR', 'Rival Add-on', 5, 5);

insert into public.bookings
  (id, facility_id, client_id, service, service_type, status, start_at, end_at, base_price, total_cost)
values
  ('00000000-0000-0000-0000-00000000a070', '00000000-0000-0000-0000-00000000a020',
   '00000000-0000-0000-0000-00000000a040', 'Full Groom', 'grooming', 'confirmed',
   '2026-08-06T10:00:00Z', '2026-08-06T11:30:00Z', 80, 80);

-- ── T1: facility_id is DERIVED from the booking ─────────────────────────────
-- The caller sends the ORG id instead. RLS gates rows, not columns, so nothing
-- in a policy stops that: the trigger has to.
do $$
declare got uuid;
begin
  perform set_config('request.jwt.claims', json_build_object('sub', '00000000-0000-0000-0000-00000000a001', 'role', 'authenticated')::text, true);
  set local role authenticated;
  insert into public.grooming_appointments
    (booking_id, facility_id, service_id, service_name, size_label,
     service_price, service_duration_min)
  values ('00000000-0000-0000-0000-00000000a070',
          '00000000-0000-0000-0000-00000000a010',    -- a lie
          '00000000-0000-0000-0000-00000000a050', 'Full Groom', 'medium', 80, 90);

  insert into public.grooming_appointment_add_ons
    (booking_id, facility_id, add_on_id, name, price, duration_min, auto_attached)
  values ('00000000-0000-0000-0000-00000000a070', '00000000-0000-0000-0000-00000000a010',
          '00000000-0000-0000-0000-00000000a060', 'Teeth Brushing', 12, 10, true),
         ('00000000-0000-0000-0000-00000000a070', '00000000-0000-0000-0000-00000000a010',
          '00000000-0000-0000-0000-00000000a061', 'De-shed', 20, 20, false);
  reset role;

  -- Scoped to the fixture's own booking. Read after `reset role`, so RLS is
  -- not filtering and the query saw every appointment in the database — the
  -- demo facility's included, which is the id it reported.
  select facility_id into got from public.grooming_appointments
   where booking_id = '00000000-0000-0000-0000-00000000a070';
  perform pg_temp.t('T1  facility_id derived from the BOOKING, not the payload',
    got = '00000000-0000-0000-0000-00000000a020', format('stored=%s', got));
exception when others then
  reset role; perform pg_temp.t('T1  facility derivation', false, sqlerrm);
end $$;

-- ── T2: a groom cannot skip check-in ────────────────────────────────────────
do $$
declare ok boolean; st text;
begin
  perform set_config('request.jwt.claims', json_build_object('sub', '00000000-0000-0000-0000-00000000a001', 'role', 'authenticated')::text, true);
  set local role authenticated;
  begin
    update public.bookings set status = 'in_progress'
     where id = '00000000-0000-0000-0000-00000000a070';
    ok := false;
  exception when insufficient_privilege then ok := true; end;
  reset role;
  select status::text into st from public.bookings
   where id = '00000000-0000-0000-0000-00000000a070';
  perform pg_temp.t('T2  cannot go in_progress for a pet that never arrived',
    ok and st = 'confirmed', format('refused=%s status=%s', ok, st));
exception when others then
  reset role; perform pg_temp.t('T2  lifecycle guard', false, sqlerrm);
end $$;

-- ── T3: check-in stamps the clock and DERIVES the ETA ───────────────────────
-- 90 (service) + 10 (teeth) + 20 (de-shed) = 120. Asserted as a number rather
-- than "not null", because an ETA that ignores the add-ons is the bug worth
-- catching — it is what sends an owner back to the counter early.
do $$
declare ci timestamptz; eta timestamptz; mins numeric;
begin
  perform set_config('request.jwt.claims', json_build_object('sub', '00000000-0000-0000-0000-00000000a001', 'role', 'authenticated')::text, true);
  set local role authenticated;
  update public.bookings set status = 'checked_in'
   where id = '00000000-0000-0000-0000-00000000a070';
  reset role;
  select check_in_at, estimated_ready_at into ci, eta
    from public.grooming_appointments
   where booking_id = '00000000-0000-0000-0000-00000000a070';
  mins := extract(epoch from (eta - ci)) / 60;
  perform pg_temp.t('T3  check-in stamps the clock and derives ETA (90+10+20=120m)',
    ci is not null and mins = 120,
    format('check_in=%s eta_minutes=%s', ci is not null, mins));
exception when others then
  reset role; perform pg_temp.t('T3  check-in', false, sqlerrm);
end $$;

-- ── T4: …and now the forward moves are allowed ──────────────────────────────
-- Arms T2. Without this, T2 would pass against a trigger that rejects every
-- status change.
do $$
declare ok boolean;
begin
  perform set_config('request.jwt.claims', json_build_object('sub', '00000000-0000-0000-0000-00000000a001', 'role', 'authenticated')::text, true);
  set local role authenticated;
  update public.bookings set status = 'in_progress' where id = '00000000-0000-0000-0000-00000000a070';
  update public.bookings set status = 'ready'       where id = '00000000-0000-0000-0000-00000000a070';
  ok := true;
  reset role;
  perform pg_temp.t('T4  after check-in, in_progress and ready are allowed (T2 not vacuous)', ok);
exception when others then
  reset role; perform pg_temp.t('T4  forward transitions', false, sqlerrm);
end $$;

-- ── T5: completing stamps check-out ─────────────────────────────────────────
do $$
declare co timestamptz;
begin
  perform set_config('request.jwt.claims', json_build_object('sub', '00000000-0000-0000-0000-00000000a001', 'role', 'authenticated')::text, true);
  set local role authenticated;
  update public.bookings set status = 'completed' where id = '00000000-0000-0000-0000-00000000a070';
  reset role;
  select check_out_at into co from public.grooming_appointments
   where booking_id = '00000000-0000-0000-0000-00000000a070';
  perform pg_temp.t('T5  completing stamps check-out', co is not null,
    format('check_out=%s', co is not null));
exception when others then
  reset role; perform pg_temp.t('T5  check-out', false, sqlerrm);
end $$;

-- ── T6: reopening clears the pickup and keeps the arrival ───────────────────
-- Salons really do reopen a ticket ("we missed the nails"). A schema that made
-- that impossible would be met with cancel-and-rebook, which loses the history.
do $$
declare co timestamptz; ci timestamptz;
begin
  perform set_config('request.jwt.claims', json_build_object('sub', '00000000-0000-0000-0000-00000000a001', 'role', 'authenticated')::text, true);
  set local role authenticated;
  update public.bookings set status = 'in_progress' where id = '00000000-0000-0000-0000-00000000a070';
  reset role;
  select check_out_at, check_in_at into co, ci
    from public.grooming_appointments
   where booking_id = '00000000-0000-0000-0000-00000000a070';
  perform pg_temp.t('T6  reopening clears check-out but KEEPS the arrival',
    co is null and ci is not null,
    format('check_out=%s check_in=%s', coalesce(co::text, '<null>'), ci is not null));
exception when others then
  reset role; perform pg_temp.t('T6  reopen', false, sqlerrm);
end $$;

-- ── T7: THE SNAPSHOT ────────────────────────────────────────────────────────
-- Rename it, reprice it, then delete it outright. The sale is unchanged and
-- service_id goes null — history survives a menu the facility keeps editing.
do $$
declare nm text; pr numeric; sid uuid;
begin
  perform set_config('request.jwt.claims', json_build_object('sub', '00000000-0000-0000-0000-00000000a001', 'role', 'authenticated')::text, true);
  set local role authenticated;
  update public.grooming_services
     set name = 'Full Groom (2027 pricing)', base_price = 120
   where id = '00000000-0000-0000-0000-00000000a050';
  delete from public.grooming_services where id = '00000000-0000-0000-0000-00000000a050';
  reset role;

  select service_name, service_price, service_id into nm, pr, sid
    from public.grooming_appointments
   where booking_id = '00000000-0000-0000-0000-00000000a070';
  perform pg_temp.t('T7  renaming AND deleting the service does not rewrite the sale',
    nm = 'Full Groom' and pr = 80 and sid is null,
    format('name=%s price=%s service_id=%s', nm, pr, coalesce(sid::text, '<null>')));
exception when others then
  reset role; perform pg_temp.t('T7  snapshot', false, sqlerrm);
end $$;

-- ── T8: a rival reads none of it ────────────────────────────────────────────
-- The read policy is `exists (select 1 from bookings …)`, so it inherits the
-- booking's own RLS and cannot drift from it.
do $$
declare a integer; l integer; adj integer;
begin
  perform set_config('request.jwt.claims', json_build_object('sub', '00000000-0000-0000-0000-00000000a004', 'role', 'authenticated')::text, true);
  set local role authenticated;
  select count(*) into a   from public.grooming_appointments;
  select count(*) into l   from public.grooming_appointment_add_ons;
  select count(*) into adj from public.grooming_price_adjustments;
  reset role;
  perform pg_temp.t('T8  a rival facility reads none of it',
    a = 0 and l = 0 and adj = 0,
    format('appts=%s lines=%s adjustments=%s', a, l, adj));
exception when others then
  reset role; perform pg_temp.t('T8  isolation', false, sqlerrm);
end $$;

-- ── T9: the owning customer reads their own ─────────────────────────────────
-- Arms T8: without it, T8's zeros could mean nobody can read the table at all.
do $$
declare a integer;
begin
  perform set_config('request.jwt.claims', json_build_object('sub', '00000000-0000-0000-0000-00000000a003', 'role', 'authenticated')::text, true);
  set local role authenticated;
  select count(*) into a from public.grooming_appointments;
  reset role;
  perform pg_temp.t('T9  the owning customer reads their own appointment (T8 not vacuous)',
    a = 1, format('appts=%s', a));
exception when others then
  reset role; perform pg_temp.t('T9  customer read', false, sqlerrm);
end $$;

-- ── T10: a customer cannot adjust their own bill ────────────────────────────
-- Adjustments are staff-only, which is NARROWER than can_write_booking on
-- purpose: a surcharge or a goodwill discount is the facility's judgement about
-- money, in either direction.
do $$
declare ok boolean;
begin
  perform set_config('request.jwt.claims', json_build_object('sub', '00000000-0000-0000-0000-00000000a003', 'role', 'authenticated')::text, true);
  set local role authenticated;
  begin
    insert into public.grooming_price_adjustments (booking_id, facility_id, reason, amount, note)
    values ('00000000-0000-0000-0000-00000000a070', '00000000-0000-0000-0000-00000000a020',
            'discount', -50, 'me');
    ok := false;
  exception when insufficient_privilege then ok := true; end;
  reset role;
  perform pg_temp.t('T10 a customer cannot discount their own bill', ok);
exception when others then
  reset role; perform pg_temp.t('T10 adjustment permission', false, sqlerrm);
end $$;

-- ── T11: cross-facility add-on line ─────────────────────────────────────────
do $$
declare ok boolean;
begin
  perform set_config('request.jwt.claims', json_build_object('sub', '00000000-0000-0000-0000-00000000a001', 'role', 'authenticated')::text, true);
  set local role authenticated;
  begin
    insert into public.grooming_appointment_add_ons
      (booking_id, facility_id, add_on_id, name, price, duration_min)
    values ('00000000-0000-0000-0000-00000000a070', '00000000-0000-0000-0000-00000000a020',
            '00000000-0000-0000-0000-00000000a062', 'Rival Add-on', 5, 5);
    ok := false;
  exception when insufficient_privilege then ok := true; end;
  reset role;
  perform pg_temp.t('T11 cannot bill another facility''s add-on', ok);
exception when others then
  reset role; perform pg_temp.t('T11 cross-facility line', false, sqlerrm);
end $$;

-- ── T12: the actor is the session ───────────────────────────────────────────
-- The payload blames the CUSTOMER for a matting surcharge. An audit field taken
-- from a request body is a caller-supplied audit trail.
do $$
declare who uuid;
begin
  perform set_config('request.jwt.claims', json_build_object('sub', '00000000-0000-0000-0000-00000000a001', 'role', 'authenticated')::text, true);
  set local role authenticated;
  insert into public.grooming_price_adjustments
    (booking_id, facility_id, reason, amount, note, created_by)
  values ('00000000-0000-0000-0000-00000000a070', '00000000-0000-0000-0000-00000000a020',
          -- 'matting-fee', not 'matting'. The reason vocabulary was closed by a
          -- CHECK constraint after this file was written, and the rejected
          -- insert reported itself as "the adjustment actor is wrong" when the
          -- actor was never reached.
          'matting-fee', 25, '', '00000000-0000-0000-0000-00000000a003');
  reset role;
  select created_by into who from public.grooming_price_adjustments
   where booking_id = '00000000-0000-0000-0000-00000000a070';
  perform pg_temp.t('T12 the adjustment actor is the SESSION, not the payload',
    who = '00000000-0000-0000-0000-00000000a001', format('created_by=%s', who));
exception when others then
  reset role; perform pg_temp.t('T12 actor', false, sqlerrm);
end $$;

-- ── T13: an unexplained charge is refused ───────────────────────────────────
do $$
declare refused boolean; allowed boolean;
begin
  perform set_config('request.jwt.claims', json_build_object('sub', '00000000-0000-0000-0000-00000000a001', 'role', 'authenticated')::text, true);
  set local role authenticated;
  begin
    insert into public.grooming_price_adjustments (booking_id, facility_id, reason, amount)
    values ('00000000-0000-0000-0000-00000000a070', '00000000-0000-0000-0000-00000000a020',
            'other', 40);
    refused := false;
  exception when check_violation then refused := true; end;
  begin
    insert into public.grooming_price_adjustments (booking_id, facility_id, reason, amount, note)
    values ('00000000-0000-0000-0000-00000000a070', '00000000-0000-0000-0000-00000000a020',
            'other', 40, 'Extra dryer time');
    allowed := true;
  exception when check_violation then allowed := false; end;
  reset role;
  perform pg_temp.t('T13 an unexplained "other" charge is refused; an explained one is not',
    refused and allowed, format('refused=%s allowed=%s', refused, allowed));
exception when others then
  reset role; perform pg_temp.t('T13 unexplained charge', false, sqlerrm);
end $$;

-- ── T14: a customer cannot change their own pending appointment ────────────
-- a_customer_changes_no_grooming_appointment. can_write_booking() let the
-- pet's owner update the appointment while the booking was still a request,
-- and UPDATE is granted on every column: an owner could set their own price,
-- or a check-in, through the API.
do $$
declare v_updated integer; v_price numeric; v_in timestamptz;
begin
  insert into public.bookings
    (id, facility_id, client_id, service, service_type, status, start_at, end_at, base_price, total_cost)
  values ('00000000-0000-0000-0000-00000000a071', '00000000-0000-0000-0000-00000000a020',
          '00000000-0000-0000-0000-00000000a040', 'Full Groom', 'grooming', 'request_submitted',
          '2026-08-07T10:00:00Z', '2026-08-07T11:30:00Z', 0, 0);
  insert into public.grooming_appointments
    (booking_id, facility_id, service_name, service_price, service_duration_min)
  values ('00000000-0000-0000-0000-00000000a071', '00000000-0000-0000-0000-00000000a020',
          'Full Groom', 0, 90);

  perform set_config('request.jwt.claims', json_build_object('sub', '00000000-0000-0000-0000-00000000a003', 'role', 'authenticated')::text, true);
  set local role authenticated;
  update public.grooming_appointments
     set service_price = 1, check_in_at = now(), groomer_notes = 'Owner note'
   where booking_id = '00000000-0000-0000-0000-00000000a071';
  get diagnostics v_updated = row_count;
  reset role;
  select service_price, check_in_at into v_price, v_in
    from public.grooming_appointments
   where booking_id = '00000000-0000-0000-0000-00000000a071';
  perform pg_temp.t('T14 a customer cannot change their own pending appointment',
    v_updated = 0 and v_price = 0 and v_in is null,
    format('updated=%s price=%s check_in=%s', v_updated, v_price, coalesce(v_in::text, '<null>')));
exception when others then
  reset role; perform pg_temp.t('T14 customer update', false, sqlerrm);
end $$;

-- ── T15: …and staff still can ───────────────────────────────────────────────
-- Arms T14: without it, T14's zero could mean nobody can update the table.
do $$
declare v_updated integer;
begin
  perform set_config('request.jwt.claims', json_build_object('sub', '00000000-0000-0000-0000-00000000a001', 'role', 'authenticated')::text, true);
  set local role authenticated;
  update public.grooming_appointments
     set groomer_notes = 'Nervous with the clippers'
   where booking_id = '00000000-0000-0000-0000-00000000a071';
  get diagnostics v_updated = row_count;
  reset role;
  perform pg_temp.t('T15 staff still change the appointment (T14 not vacuous)',
    v_updated = 1, format('updated=%s', v_updated));
exception when others then
  reset role; perform pg_temp.t('T15 staff update', false, sqlerrm);
end $$;

-- ── T16: a customer's own row carries no price ─────────────────────────────
-- The owner keeps INSERT, because create_booking() writes their row as them,
-- so a priced row is refused and one shaped like create_booking's is not.
do $$
declare v_refused boolean := false; v_allowed boolean := false;
begin
  insert into public.bookings
    (id, facility_id, client_id, service, service_type, status, start_at, end_at, base_price, total_cost)
  values ('00000000-0000-0000-0000-00000000a072', '00000000-0000-0000-0000-00000000a020',
          '00000000-0000-0000-0000-00000000a040', 'Full Groom', 'grooming', 'request_submitted',
          '2026-08-08T10:00:00Z', '2026-08-08T11:30:00Z', 0, 0);

  perform set_config('request.jwt.claims', json_build_object('sub', '00000000-0000-0000-0000-00000000a003', 'role', 'authenticated')::text, true);
  set local role authenticated;
  begin
    insert into public.grooming_appointments
      (booking_id, facility_id, service_name, service_price, service_duration_min)
    values ('00000000-0000-0000-0000-00000000a072', '00000000-0000-0000-0000-00000000a020',
            'Full Groom', 50, 90);
  exception when insufficient_privilege then v_refused := true;
  end;
  begin
    insert into public.grooming_appointments
      (booking_id, facility_id, service_name, service_price, service_duration_min)
    values ('00000000-0000-0000-0000-00000000a072', '00000000-0000-0000-0000-00000000a020',
            'Full Groom', 0, 90);
    v_allowed := true;
  exception when insufficient_privilege then v_allowed := false;
  end;
  reset role;
  perform pg_temp.t('T16 a customer''s own row is refused with a price, allowed without one',
    v_refused and v_allowed,
    format('priced refused=%s unpriced allowed=%s', v_refused, v_allowed));
exception when others then
  reset role; perform pg_temp.t('T16 customer insert', false, sqlerrm);
end $$;

-- ── T17: a customer's request still reaches the grooming board ─────────────
-- The flow the insert rule has to keep: create_booking() as the customer,
-- writing the booking and its appointment, at $0 until the facility prices it.
do $$
declare v_created record; v_name text; v_price numeric; v_status text;
begin
  insert into public.grooming_services (id, facility_id, legacy_id, name, base_price, duration_min)
  values ('00000000-0000-0000-0000-00000000a051', '00000000-0000-0000-0000-00000000a020',
          'p2', 'Bath', 45, 45);
  insert into public.pets (id, client_id, name, species)
  values ('00000000-0000-0000-0000-00000000a045', '00000000-0000-0000-0000-00000000a040',
          'Biscuit', 'dog');

  perform set_config('request.jwt.claims', json_build_object('sub', '00000000-0000-0000-0000-00000000a003', 'role', 'authenticated')::text, true);
  set local role authenticated;
  select * into v_created
    from public.create_booking(
      jsonb_build_object(
        'facility_id',  '00000000-0000-0000-0000-00000000a020',
        'client_id',    '00000000-0000-0000-0000-00000000a040',
        'service',      'grooming',
        'service_type', 'p2',
        'status',       'pending',
        'start_at',     '2026-08-09T10:00:00Z',
        'end_at',       '2026-08-09T10:45:00Z',
        'base_price',   45,
        'total_cost',   45
      ),
      array['00000000-0000-0000-0000-00000000a045']::uuid[],
      jsonb_build_object('serviceId', 'p2'),
      null
    );
  reset role;
  select ga.service_name, ga.service_price, b.status::text
    into v_name, v_price, v_status
    from public.grooming_appointments ga
    join public.bookings b on b.id = ga.booking_id
   where ga.booking_id = v_created.booking_id;
  perform pg_temp.t('T17 a customer''s request through create_booking still writes its appointment, at $0',
    v_name = 'Bath' and v_price = 0 and v_status = 'request_submitted',
    format('name=%s price=%s status=%s', v_name, v_price, v_status));
exception when others then
  reset role; perform pg_temp.t('T17 customer request', false, sqlerrm);
end $$;

-- ── Report ──────────────────────────────────────────────────────────────────
select case when ok then '  PASS  ' else '> FAIL <' end as result, name, detail
  from tap order by n;

select count(*) filter (where ok) || ' passed, '
    || count(*) filter (where not ok) || ' failed' as summary
  from tap;

rollback;
