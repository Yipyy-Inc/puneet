-- ============================================================================
-- The grooming session record — RLS, the author stamp, and append-only
-- (20260806140000).
--
--   psql "$(supabase status -o json | jq -r .DB_URL)" \
--     -f supabase/tests/grooming-session-record-rls.sql
--
-- One transaction, rolled back. Fixture emails are @example.invalid.
--
-- ── WHAT THIS FILE IS REALLY ABOUT ─────────────────────────────────────────
--
-- 1. THE AUTHOR IS THE SESSION'S (T2). The mock wrote `staff: "You"` on every
--    comment. If the request body could set it, a handoff note could be
--    attributed to a colleague who never wrote it — and the point of the thread
--    is that the bather can prove what they told the groomer. T2 sends a
--    forged author and proves it is discarded.
--
-- 2. THE THREAD IS APPEND-ONLY (T3). No update policy and no delete policy, so
--    a comment cannot be quietly rewritten after somebody has read it.
--    Asserted both ways, because an RLS-filtered write reports success with
--    zero rows touched rather than raising.
--
-- 3. ALERTS ARE REMOVABLE, COMMENTS ARE NOT (T3/T4). The asymmetry is the
--    whole reason these are two tables — an alert on the wrong dog is a safety
--    problem that has to come off.
--
-- 4. facility_id IS DERIVED (T5). RLS gates rows, not columns, so a caller who
--    may write a note may also name its facility. T5 sends another facility's
--    id and proves the trigger overwrites it.
--
-- 5. THE CHECKLIST STAYS AN ARRAY (T7), and a note cannot outlive the
--    appointment it describes (T8).
-- ============================================================================

begin;

set local client_min_messages to warning;

create temp table tap (n serial, name text, ok boolean, detail text);
grant all on tap to authenticated;

create or replace function pg_temp.t(p_name text, p_ok boolean, p_detail text default '')
returns void language sql as $$
  insert into tap(name, ok, detail) values (p_name, p_ok, p_detail);
$$;

-- ── Fixture: two facilities, one booking each ──────────────────────────────

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000e0001', 'sr-owner@example.invalid'),
  ('00000000-0000-0000-0000-0000000e0003', 'sr-client@example.invalid'),
  ('00000000-0000-0000-0000-0000000e0004', 'sr-rival@example.invalid')
on conflict (id) do nothing;

insert into public.profiles (id, email, full_name) values
  ('00000000-0000-0000-0000-0000000e0001', 'sr-owner@example.invalid',  'Jess Martinez'),
  ('00000000-0000-0000-0000-0000000e0003', 'sr-client@example.invalid', 'Client'),
  ('00000000-0000-0000-0000-0000000e0004', 'sr-rival@example.invalid',  'Rival')
on conflict (id) do update set full_name = excluded.full_name;

insert into public.orgs (id, name, slug) values
  ('00000000-0000-0000-0000-0000000e0010', 'SR Org',   'sr-org'),
  ('00000000-0000-0000-0000-0000000e0011', 'SR Rival', 'sr-rival-org')
on conflict (id) do nothing;

insert into public.facilities (id, org_id, name, slug, legacy_id) values
  ('00000000-0000-0000-0000-0000000e0020', '00000000-0000-0000-0000-0000000e0010',
   'Salon A', 'sr-a', 'sr-a'),
  ('00000000-0000-0000-0000-0000000e0021', '00000000-0000-0000-0000-0000000e0011',
   'Salon B', 'sr-b', 'sr-b')
on conflict (id) do nothing;

insert into public.facility_memberships (id, facility_id, profile_id, role, is_active) values
  ('00000000-0000-0000-0000-0000000e0030', '00000000-0000-0000-0000-0000000e0020',
   '00000000-0000-0000-0000-0000000e0001', 'owner', true),
  ('00000000-0000-0000-0000-0000000e0031', '00000000-0000-0000-0000-0000000e0021',
   '00000000-0000-0000-0000-0000000e0004', 'owner', true)
on conflict (id) do nothing;

insert into public.clients (id, facility_id, name, email, profile_id) values
  ('00000000-0000-0000-0000-0000000e0040', '00000000-0000-0000-0000-0000000e0020',
   'Client A', 'sr-client@example.invalid', '00000000-0000-0000-0000-0000000e0003');

insert into public.bookings
  (id, facility_id, client_id, service, service_type, status, start_at, end_at,
   base_price, total_cost)
values
  ('00000000-0000-0000-0000-0000000e0070', '00000000-0000-0000-0000-0000000e0020',
   '00000000-0000-0000-0000-0000000e0040', 'grooming', 'full_groom', 'confirmed',
   '2026-08-07T10:00:00Z', '2026-08-07T11:30:00Z', 80, 80);

insert into public.grooming_appointments
  (booking_id, facility_id, service_name, service_price, service_duration_min)
values
  ('00000000-0000-0000-0000-0000000e0070', '00000000-0000-0000-0000-0000000e0020',
   'Full Groom', 80, 90);

-- ── T1: a groomer writes an alert and a comment ─────────────────────────────
do $$
declare alerts integer; comments integer;
begin
  perform set_config('request.jwt.claims', json_build_object('sub', '00000000-0000-0000-0000-0000000e0001', 'role', 'authenticated')::text, true);
  set local role authenticated;
  insert into public.grooming_alert_notes
    (id, booking_id, facility_id, body, applies_to_future)
  values ('00000000-0000-0000-0000-0000000e0080',
          '00000000-0000-0000-0000-0000000e0070',
          '00000000-0000-0000-0000-0000000e0020',
          'Muzzle needed — snapped at the dryer.', true);
  insert into public.grooming_ticket_comments
    (id, booking_id, facility_id, message)
  values ('00000000-0000-0000-0000-0000000e0081',
          '00000000-0000-0000-0000-0000000e0070',
          '00000000-0000-0000-0000-0000000e0020',
          'Bathed and dried, handing over for the cut.');
  reset role;
  select count(*) into alerts from public.grooming_alert_notes;
  select count(*) into comments from public.grooming_ticket_comments;
  perform pg_temp.t('T1  staff can write an alert and a handoff comment',
    alerts = 1 and comments = 1, format('alerts=%s comments=%s', alerts, comments));
exception when others then
  reset role; perform pg_temp.t('T1  write', false, sqlerrm);
end $$;

-- ── T2: the author is the session's, not the request body's ────────────────
do $$
declare a_name text; a_uid uuid; c_name text;
begin
  perform set_config('request.jwt.claims', json_build_object('sub', '00000000-0000-0000-0000-0000000e0001', 'role', 'authenticated')::text, true);
  set local role authenticated;
  -- A forged author on the way in. Both should be replaced by the trigger.
  insert into public.grooming_ticket_comments
    (id, booking_id, facility_id, message, author_name, created_by)
  values ('00000000-0000-0000-0000-0000000e0082',
          '00000000-0000-0000-0000-0000000e0070',
          '00000000-0000-0000-0000-0000000e0020',
          'Definitely not me.', 'Somebody Else',
          '00000000-0000-0000-0000-0000000e0004');
  reset role;
  select author_name, created_by into c_name, a_uid
    from public.grooming_ticket_comments
   where id = '00000000-0000-0000-0000-0000000e0082';
  select author_name into a_name from public.grooming_alert_notes
   where id = '00000000-0000-0000-0000-0000000e0080';
  perform pg_temp.t('T2  the author is stamped from the session, not the body',
    c_name = 'Jess Martinez'
    and a_uid = '00000000-0000-0000-0000-0000000e0001'
    and a_name = 'Jess Martinez',
    format('comment_author=%s uid=%s alert_author=%s', c_name, a_uid, a_name));
exception when others then
  reset role; perform pg_temp.t('T2  author stamp', false, sqlerrm);
end $$;

-- ── T3: the comment thread is append-only ───────────────────────────────────
do $$
declare updated integer; deleted integer; body text;
begin
  perform set_config('request.jwt.claims', json_build_object('sub', '00000000-0000-0000-0000-0000000e0001', 'role', 'authenticated')::text, true);
  set local role authenticated;
  update public.grooming_ticket_comments set message = 'Rewritten after the fact.'
   where id = '00000000-0000-0000-0000-0000000e0081';
  get diagnostics updated = row_count;
  delete from public.grooming_ticket_comments
   where id = '00000000-0000-0000-0000-0000000e0081';
  get diagnostics deleted = row_count;
  reset role;
  select message into body from public.grooming_ticket_comments
   where id = '00000000-0000-0000-0000-0000000e0081';
  perform pg_temp.t('T3  a handoff comment cannot be edited or deleted',
    updated = 0 and deleted = 0
    and body = 'Bathed and dried, handing over for the cut.',
    format('updated=%s deleted=%s', updated, deleted));
exception when others then
  reset role; perform pg_temp.t('T3  append-only', false, sqlerrm);
end $$;

-- ── T4: an alert CAN be removed (T3 is a policy, not a missing grant) ───────
do $$
declare remaining integer;
begin
  perform set_config('request.jwt.claims', json_build_object('sub', '00000000-0000-0000-0000-0000000e0001', 'role', 'authenticated')::text, true);
  set local role authenticated;
  insert into public.grooming_alert_notes (id, booking_id, facility_id, body)
  values ('00000000-0000-0000-0000-0000000e0083',
          '00000000-0000-0000-0000-0000000e0070',
          '00000000-0000-0000-0000-0000000e0020', 'Wrong dog.');
  delete from public.grooming_alert_notes
   where id = '00000000-0000-0000-0000-0000000e0083';
  reset role;
  select count(*) into remaining from public.grooming_alert_notes
   where id = '00000000-0000-0000-0000-0000000e0083';
  perform pg_temp.t('T4  an alert on the wrong pet CAN be removed (T3 not vacuous)',
    remaining = 0, format('remaining=%s', remaining));
exception when others then
  reset role; perform pg_temp.t('T4  alert removal', false, sqlerrm);
end $$;

-- ── T5: facility_id is derived, not accepted ────────────────────────────────
do $$
declare stored uuid;
begin
  perform set_config('request.jwt.claims', json_build_object('sub', '00000000-0000-0000-0000-0000000e0001', 'role', 'authenticated')::text, true);
  set local role authenticated;
  insert into public.grooming_alert_notes (id, booking_id, facility_id, body)
  values ('00000000-0000-0000-0000-0000000e0084',
          '00000000-0000-0000-0000-0000000e0070',
          '00000000-0000-0000-0000-0000000e0021',   -- Salon B's id, on Salon A's booking
          'Filed against the wrong business.');
  reset role;
  select facility_id into stored from public.grooming_alert_notes
   where id = '00000000-0000-0000-0000-0000000e0084';
  perform pg_temp.t('T5  a caller cannot choose the note''s facility',
    stored = '00000000-0000-0000-0000-0000000e0020', format('stored=%s', stored));
exception when others then
  reset role; perform pg_temp.t('T5  derived facility', false, sqlerrm);
end $$;

-- ── T6: isolation, and THE ONE THAT CAUGHT THE BUG ─────────────────────────
--
-- The first cut of the read policy mirrored the parent booking, and this test
-- failed with `client=2`: the owner could read every internal note on their own
-- booking, including "Muzzle needed — snapped at the dryer" and the bather's
-- handoff thread about their dog. See the RLS section of 20260806140000.
--
-- The booking count is the arm that keeps the fix honest. Without it, revoking
-- the client's read entirely — or breaking `bookings_read` — would also make
-- this pass. The client must still see their own BOOKING and none of its notes.
do $$
declare rival_alerts integer; rival_comments integer;
        client_alerts integer; client_comments integer; client_bookings integer;
begin
  perform set_config('request.jwt.claims', json_build_object('sub', '00000000-0000-0000-0000-0000000e0004', 'role', 'authenticated')::text, true);
  set local role authenticated;
  select count(*) into rival_alerts   from public.grooming_alert_notes;
  select count(*) into rival_comments from public.grooming_ticket_comments;
  reset role;
  perform set_config('request.jwt.claims', json_build_object('sub', '00000000-0000-0000-0000-0000000e0003', 'role', 'authenticated')::text, true);
  set local role authenticated;
  select count(*) into client_alerts   from public.grooming_alert_notes;
  select count(*) into client_comments from public.grooming_ticket_comments;
  select count(*) into client_bookings from public.bookings;
  reset role;
  perform pg_temp.t('T6  a rival sees no notes; a client sees none on their OWN booking',
    rival_alerts = 0 and rival_comments = 0
    and client_alerts = 0 and client_comments = 0 and client_bookings = 1,
    format('rival=%s/%s client_notes=%s/%s client_can_see_own_booking=%s',
           rival_alerts, rival_comments, client_alerts, client_comments, client_bookings));
exception when others then
  reset role; perform pg_temp.t('T6  isolation', false, sqlerrm);
end $$;

-- ── T7: the checklist stays an array, and blank text is refused ─────────────
do $$
declare bad integer := 0;
begin
  perform set_config('request.jwt.claims', json_build_object('sub', '00000000-0000-0000-0000-0000000e0001', 'role', 'authenticated')::text, true);
  set local role authenticated;
  begin
    update public.grooming_appointments set session_progress = '{"step":"bath"}'::jsonb
     where booking_id = '00000000-0000-0000-0000-0000000e0070';
    bad := bad + 1;
  exception when check_violation then null; end;
  begin
    insert into public.grooming_ticket_comments (booking_id, facility_id, message)
    values ('00000000-0000-0000-0000-0000000e0070',
            '00000000-0000-0000-0000-0000000e0020', '   ');
    bad := bad + 1;
  exception when check_violation then null; end;
  -- Not vacuous: a real array is accepted.
  update public.grooming_appointments
     set session_progress = '[{"step":"Bath","done":true}]'::jsonb
   where booking_id = '00000000-0000-0000-0000-0000000e0070';
  reset role;
  perform pg_temp.t('T7  the checklist must be an array; blank comments refused',
    bad = 0, format('accepted_bad=%s', bad));
exception when others then
  reset role; perform pg_temp.t('T7  shape checks', false, sqlerrm);
end $$;

-- ── T8: notes do not outlive the appointment they describe ─────────────────
do $$
declare alerts integer; comments integer;
begin
  perform set_config('request.jwt.claims', '', true);
  delete from public.bookings where id = '00000000-0000-0000-0000-0000000e0070';
  select count(*) into alerts   from public.grooming_alert_notes;
  select count(*) into comments from public.grooming_ticket_comments;
  perform pg_temp.t('T8  removing the booking removes its notes',
    alerts = 0 and comments = 0, format('alerts=%s comments=%s', alerts, comments));
end $$;

-- ── Report ──────────────────────────────────────────────────────────────────
select case when ok then '  PASS  ' else '> FAIL <' end as result, name, detail
  from tap order by n;

select count(*) filter (where ok) || ' passed, '
    || count(*) filter (where not ok) || ' failed' as summary
  from tap;

rollback;
