-- ============================================================================
-- The appointment history trail — append-only, for EVERY role
-- (20260806160000).
--
--   psql "$(supabase status -o json | jq -r .DB_URL)" \
--     -f supabase/tests/grooming-history-immutability.sql
--
-- One transaction, rolled back. Fixture emails are @example.invalid.
--
-- ── RUN THIS ONE INSIDE A TRANSACTION, ALWAYS ──────────────────────────────
--
-- Every other test file here rolls back as good hygiene. This one has no
-- alternative: the table it tests cannot be cleaned up afterwards. An earlier
-- probe of these assertions was run outside a transaction and left two
-- fabricated entries against a real booking that NO role could delete — the
-- table had to be dropped and recreated to clear them. Which is the guarantee
-- working exactly as designed, and a good reason never to test it live.
--
-- ── WHAT THIS FILE IS REALLY ABOUT ─────────────────────────────────────────
--
-- 1. THE OWNER CANNOT REWRITE HISTORY (T3). This is the whole point, and it is
--    the assertion that RLS alone cannot make: RLS is bypassed by service_role
--    and, without FORCE, by the table owner. The trigger fires for every role.
--    T3 runs as the OWNER — the most privileged caller there is — and proves
--    UPDATE, DELETE and TRUNCATE are all refused.
--
-- 2. THE UNION CANNOT BE MALFORMED (T2). A `field_change` with no field is an
--    accountability record that accounts for nothing.
--
-- 3. IDENTIFIERS ARE VALIDATED AT INSERT (T4/T5), which is the trade for
--    holding no foreign keys — see Decision 2 of the migration. A row cannot be
--    written against a booking that does not exist, and the facility is derived
--    rather than accepted.
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

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000f0001', 'hist-owner@example.invalid'),
  ('00000000-0000-0000-0000-0000000f0003', 'hist-client@example.invalid'),
  ('00000000-0000-0000-0000-0000000f0004', 'hist-rival@example.invalid')
on conflict (id) do nothing;

insert into public.profiles (id, email, full_name) values
  ('00000000-0000-0000-0000-0000000f0001', 'hist-owner@example.invalid',  'Amy Chen'),
  ('00000000-0000-0000-0000-0000000f0003', 'hist-client@example.invalid', 'Client'),
  ('00000000-0000-0000-0000-0000000f0004', 'hist-rival@example.invalid',  'Rival')
on conflict (id) do update set full_name = excluded.full_name;

insert into public.orgs (id, name, slug) values
  ('00000000-0000-0000-0000-0000000f0010', 'Hist Org',   'hist-org'),
  ('00000000-0000-0000-0000-0000000f0011', 'Hist Rival', 'hist-rival-org')
on conflict (id) do nothing;

insert into public.facilities (id, org_id, name, slug, legacy_id) values
  ('00000000-0000-0000-0000-0000000f0020', '00000000-0000-0000-0000-0000000f0010',
   'Salon A', 'hist-a', 'hist-a'),
  ('00000000-0000-0000-0000-0000000f0021', '00000000-0000-0000-0000-0000000f0011',
   'Salon B', 'hist-b', 'hist-b')
on conflict (id) do nothing;

insert into public.facility_memberships (id, facility_id, profile_id, role, is_active) values
  ('00000000-0000-0000-0000-0000000f0030', '00000000-0000-0000-0000-0000000f0020',
   '00000000-0000-0000-0000-0000000f0001', 'owner', true),
  ('00000000-0000-0000-0000-0000000f0031', '00000000-0000-0000-0000-0000000f0021',
   '00000000-0000-0000-0000-0000000f0004', 'owner', true)
on conflict (id) do nothing;

insert into public.clients (id, facility_id, name, email, profile_id) values
  ('00000000-0000-0000-0000-0000000f0040', '00000000-0000-0000-0000-0000000f0020',
   'Client A', 'hist-client@example.invalid', '00000000-0000-0000-0000-0000000f0003');

insert into public.bookings
  (id, facility_id, client_id, service, service_type, status, start_at, end_at,
   base_price, total_cost)
values
  ('00000000-0000-0000-0000-0000000f0070', '00000000-0000-0000-0000-0000000f0020',
   '00000000-0000-0000-0000-0000000f0040', 'grooming', 'full_groom', 'confirmed',
   '2026-08-07T10:00:00Z', '2026-08-07T11:30:00Z', 80, 80);

insert into public.grooming_appointments
  (booking_id, facility_id, service_name, service_price, service_duration_min)
values
  ('00000000-0000-0000-0000-0000000f0070', '00000000-0000-0000-0000-0000000f0020',
   'Full Groom', 80, 90);

-- ── T1: both kinds append, and the author is the session's ─────────────────
do $$
declare rows integer; who text;
begin
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000f0001', true);
  set local role authenticated;
  insert into public.grooming_appointment_history
    (id, booking_id, facility_id, kind, description)
  values ('00000000-0000-0000-0000-0000000f0080',
          '00000000-0000-0000-0000-0000000f0070',
          '00000000-0000-0000-0000-0000000f0020',
          'event', 'Alert added (carries to future appointments)');
  insert into public.grooming_appointment_history
    (booking_id, facility_id, kind, field, before_value, after_value, author_name)
  values ('00000000-0000-0000-0000-0000000f0070',
          '00000000-0000-0000-0000-0000000f0020',
          'field_change', 'status', 'checked_in', 'in_progress', 'Somebody Else');
  reset role;
  select count(*) into rows from public.grooming_appointment_history;
  select author_name into who from public.grooming_appointment_history
   where field = 'status';
  perform pg_temp.t('T1  both kinds append; the forged author is discarded',
    rows = 2 and who = 'Amy Chen', format('rows=%s author=%s', rows, who));
exception when others then
  reset role; perform pg_temp.t('T1  append', false, sqlerrm);
end $$;

-- ── T2: the union cannot be malformed ──────────────────────────────────────
do $$
declare bad integer := 0;
begin
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000f0001', true);
  set local role authenticated;
  -- a field_change with no field
  begin
    insert into public.grooming_appointment_history
      (booking_id, facility_id, kind, after_value)
    values ('00000000-0000-0000-0000-0000000f0070',
            '00000000-0000-0000-0000-0000000f0020', 'field_change', 'ready');
    bad := bad + 1;
  exception when check_violation then null; end;
  -- an event with no description
  begin
    insert into public.grooming_appointment_history (booking_id, facility_id, kind)
    values ('00000000-0000-0000-0000-0000000f0070',
            '00000000-0000-0000-0000-0000000f0020', 'event');
    bad := bad + 1;
  exception when check_violation then null; end;
  -- an event carrying a field change as well
  begin
    insert into public.grooming_appointment_history
      (booking_id, facility_id, kind, description, field)
    values ('00000000-0000-0000-0000-0000000f0070',
            '00000000-0000-0000-0000-0000000f0020', 'event', 'Both', 'status');
    bad := bad + 1;
  exception when check_violation then null; end;
  reset role;
  perform pg_temp.t('T2  a malformed history entry is refused',
    bad = 0, format('accepted_bad=%s', bad));
exception when others then
  reset role; perform pg_temp.t('T2  shape', false, sqlerrm);
end $$;

-- ── T3: THE OWNER cannot rewrite history ───────────────────────────────────
-- The assertion RLS cannot make. No `set role` here on purpose: this runs as
-- the most privileged caller available, which is the one the trigger exists
-- for.
do $$
declare blocked integer := 0; attempts integer := 0; still text;
begin
  perform set_config('request.jwt.claim.sub', '', true);
  begin
    attempts := attempts + 1;
    update public.grooming_appointment_history set description = 'Never happened'
     where id = '00000000-0000-0000-0000-0000000f0080';
  exception when insufficient_privilege then blocked := blocked + 1; end;
  begin
    attempts := attempts + 1;
    delete from public.grooming_appointment_history
     where id = '00000000-0000-0000-0000-0000000f0080';
  exception when insufficient_privilege then blocked := blocked + 1; end;
  begin
    attempts := attempts + 1;
    truncate public.grooming_appointment_history;
  exception when insufficient_privilege then blocked := blocked + 1; end;

  select description into still from public.grooming_appointment_history
   where id = '00000000-0000-0000-0000-0000000f0080';
  perform pg_temp.t('T3  not even the owner can edit, delete or truncate history',
    blocked = 3 and attempts = 3
    and still = 'Alert added (carries to future appointments)',
    format('blocked=%s/%s', blocked, attempts));
end $$;

-- ── T4: a row cannot be written against a booking that does not exist ──────
-- The trade for holding no foreign keys (Decision 2): validation happens once,
-- at insert.
do $$
declare ok boolean;
begin
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000f0001', true);
  set local role authenticated;
  begin
    insert into public.grooming_appointment_history
      (booking_id, facility_id, kind, description)
    values ('00000000-0000-0000-0000-00000000dead',
            '00000000-0000-0000-0000-0000000f0020', 'event', 'Ghost');
    ok := false;
  exception when foreign_key_violation then ok := true; end;
  reset role;
  perform pg_temp.t('T4  history cannot be written against a booking that does not exist', ok);
exception when others then
  reset role; perform pg_temp.t('T4  orphan guard', false, sqlerrm);
end $$;

-- ── T5: the facility is derived, not accepted ──────────────────────────────
do $$
declare stored uuid;
begin
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000f0001', true);
  set local role authenticated;
  insert into public.grooming_appointment_history
    (id, booking_id, facility_id, kind, description)
  values ('00000000-0000-0000-0000-0000000f0081',
          '00000000-0000-0000-0000-0000000f0070',
          '00000000-0000-0000-0000-0000000f0021',   -- Salon B's id
          'event', 'Filed against the wrong business');
  reset role;
  select facility_id into stored from public.grooming_appointment_history
   where id = '00000000-0000-0000-0000-0000000f0081';
  perform pg_temp.t('T5  a caller cannot choose the entry''s facility',
    stored = '00000000-0000-0000-0000-0000000f0020', format('stored=%s', stored));
exception when others then
  reset role; perform pg_temp.t('T5  derived facility', false, sqlerrm);
end $$;

-- ── T6: read is staff-only, and the client is not staff ────────────────────
-- The leak the previous slice shipped and this one does not repeat: the client
-- must still see their own BOOKING and none of its history.
do $$
declare rival integer; client_hist integer; client_bookings integer;
begin
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000f0004', true);
  set local role authenticated;
  select count(*) into rival from public.grooming_appointment_history;
  reset role;
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000f0003', true);
  set local role authenticated;
  select count(*) into client_hist from public.grooming_appointment_history;
  select count(*) into client_bookings from public.bookings;
  reset role;
  perform pg_temp.t('T6  a rival and a client see no history; the client still sees their booking',
    rival = 0 and client_hist = 0 and client_bookings = 1,
    format('rival=%s client_history=%s client_bookings=%s',
           rival, client_hist, client_bookings));
exception when others then
  reset role; perform pg_temp.t('T6  read isolation', false, sqlerrm);
end $$;

-- ── T7: the trail outlives the appointment ─────────────────────────────────
-- No FK, so deleting the booking cannot cascade the history away — which is
-- what makes it an audit trail rather than a detail-page field.
do $$
declare survived integer;
begin
  perform set_config('request.jwt.claim.sub', '', true);
  delete from public.bookings where id = '00000000-0000-0000-0000-0000000f0070';
  select count(*) into survived from public.grooming_appointment_history;
  perform pg_temp.t('T7  deleting the booking does not erase its history',
    survived >= 2, format('surviving_entries=%s', survived));
exception when others then
  perform pg_temp.t('T7  survival', false, sqlerrm);
end $$;

-- ── Report ──────────────────────────────────────────────────────────────────
select case when ok then '  PASS  ' else '> FAIL <' end as result, name, detail
  from tap order by n;

select count(*) filter (where ok) || ' passed, '
    || count(*) filter (where not ok) || ' failed' as summary
  from tap;

rollback;
