-- ============================================================================
-- A staff notification is a row, addressed to one person
-- (a_staff_notification_is_a_row_addressed_to_one_person).
--
--   bun run test:sql staff-notifications
--
-- One transaction, rolled back. Fixture emails are @example.invalid. Roles
-- resolve their permissions through role_preset_permissions, as a new facility
-- does: owner, reception, groomer and caretaker see bookings; retail sees
-- bookings but not estimates or incidents.
--
--   N1  only the service role fans out; signed-in callers read, never write
--   N2  the role default decides: owner and reception hear a booking request,
--       groomer and retail do not; the actor is never told
--   N3  a person's own switch overrides the role, both ways
--   N4  no permission, no notice, whatever the switches say
--   N5  a mandatory notice reaches someone who switched its category off
--   N6  the same event twice is one row, and mails nobody the second time
--   N7  email only for those who switched it on, and only when newly created
--   N8  a notice addressed to one person reaches them without the role default
--   N9  RLS: a person reads only their own; marking read is theirs alone
--   N10 preferences are cleaned to category → boolean; a non-member is refused
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
  ('00000000-0000-0000-0000-00000009e010', 'Notify Org', 'notify-org')
on conflict do nothing;

insert into public.facilities (id, org_id, name, slug, legacy_id, timezone) values
  ('00000000-0000-0000-0000-00000009e020', '00000000-0000-0000-0000-00000009e010',
   'Notify Facility', 'notify-a', 'notify-a', 'America/Toronto')
on conflict do nothing;

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000009e100', 'n-owner@example.invalid'),
  ('00000000-0000-0000-0000-00000009e101', 'n-reception@example.invalid'),
  ('00000000-0000-0000-0000-00000009e102', 'n-groomer@example.invalid'),
  ('00000000-0000-0000-0000-00000009e103', 'n-caretaker@example.invalid'),
  ('00000000-0000-0000-0000-00000009e104', 'n-retail@example.invalid'),
  ('00000000-0000-0000-0000-00000009e105', 'n-stranger@example.invalid')
on conflict do nothing;

insert into public.profiles (id, email, full_name) values
  ('00000000-0000-0000-0000-00000009e100', 'n-owner@example.invalid', 'Nia Owner'),
  ('00000000-0000-0000-0000-00000009e101', 'n-reception@example.invalid', 'Ren Reception'),
  ('00000000-0000-0000-0000-00000009e102', 'n-groomer@example.invalid', 'Gus Groomer'),
  ('00000000-0000-0000-0000-00000009e103', 'n-caretaker@example.invalid', 'Cat Caretaker'),
  ('00000000-0000-0000-0000-00000009e104', 'n-retail@example.invalid', 'Rae Retail'),
  ('00000000-0000-0000-0000-00000009e105', 'n-stranger@example.invalid', 'Stan Stranger')
on conflict do nothing;

insert into public.facility_memberships (id, profile_id, facility_id, role, is_active, access_level) values
  ('00000000-0000-0000-0000-00000009e200', '00000000-0000-0000-0000-00000009e100',
   '00000000-0000-0000-0000-00000009e020', 'owner', true, 'admin'),
  ('00000000-0000-0000-0000-00000009e201', '00000000-0000-0000-0000-00000009e101',
   '00000000-0000-0000-0000-00000009e020', 'reception', true, 'staff'),
  ('00000000-0000-0000-0000-00000009e202', '00000000-0000-0000-0000-00000009e102',
   '00000000-0000-0000-0000-00000009e020', 'groomer', true, 'staff'),
  ('00000000-0000-0000-0000-00000009e203', '00000000-0000-0000-0000-00000009e103',
   '00000000-0000-0000-0000-00000009e020', 'caretaker', true, 'staff'),
  ('00000000-0000-0000-0000-00000009e204', '00000000-0000-0000-0000-00000009e104',
   '00000000-0000-0000-0000-00000009e020', 'retail', true, 'staff');

-- The shipped role defaults, as lib/notifications/catalog.ts passes them.
create temp table defaults as select '{
  "owner": ["bookings","forms","schedule","incidents","estimates"],
  "admin": ["bookings","forms","schedule","incidents","estimates"],
  "manager": ["bookings","forms","schedule","incidents","estimates"],
  "supervisor": ["bookings","forms","schedule","incidents"],
  "reception": ["bookings","forms","incidents","estimates"],
  "groomer": ["forms","incidents"],
  "trainer": ["forms","incidents"],
  "caretaker": ["forms","incidents"],
  "daycare_attendant": ["forms","incidents"],
  "boarding_attendant": ["forms","incidents"],
  "retail": [],
  "accountant": ["estimates"],
  "sanitation": ["incidents"]
}'::jsonb as roles;

create or replace function pg_temp.fan_out(
  p_kind text, p_category text, p_permission text, p_mandatory boolean,
  p_dedupe text, p_only uuid[] default null
) returns table (membership_id uuid, created boolean, send_email boolean)
language sql as $$
  select f.membership_id, f.created, f.send_email
    from public.notify_staff(
      '00000000-0000-0000-0000-00000009e020', p_kind, p_category, p_permission,
      p_mandatory, p_mandatory, '{"client":"Alex"}'::jsonb, '/facility/dashboard/bookings/1',
      null, p_dedupe, (select roles from defaults),
      '00000000-0000-0000-0000-00000009e103', p_only) as f;
$$;

create or replace function pg_temp.got(p_dedupe text, p_membership text) returns boolean
language sql as $$
  select exists (select 1 from public.staff_notifications
                  where dedupe_key = p_dedupe and membership_id = p_membership::uuid);
$$;

-- ── N1 ────────────────────────────────────────────────────────────────────
do $$
begin
  perform pg_temp.t('N1  only the service role fans out; signed-in callers read and never write',
    not has_function_privilege('anon', 'public.notify_staff(uuid, text, text, text, boolean, boolean, jsonb, text, uuid, text, jsonb, text, uuid[])', 'execute')
      and not has_function_privilege('authenticated', 'public.notify_staff(uuid, text, text, text, boolean, boolean, jsonb, text, uuid, text, jsonb, text, uuid[])', 'execute')
      and has_function_privilege('service_role', 'public.notify_staff(uuid, text, text, text, boolean, boolean, jsonb, text, uuid, text, jsonb, text, uuid[])', 'execute')
      and has_table_privilege('authenticated', 'public.staff_notifications', 'select')
      and not has_table_privilege('authenticated', 'public.staff_notifications', 'insert')
      and not has_table_privilege('authenticated', 'public.staff_notifications', 'update')
      and not has_table_privilege('authenticated', 'public.staff_notification_preferences', 'insert')
      and not has_function_privilege('anon', 'public.set_my_notification_state(uuid, boolean, boolean)', 'execute'),
    'a grant is wider or narrower than intended');
end $$;

-- ── N2 ────────────────────────────────────────────────────────────────────
do $$
begin
  perform count(*) from pg_temp.fan_out('booking_request', 'bookings', 'view_bookings', false, 'n2');
  perform pg_temp.t('N2  the role default decides, and the actor is never told',
    pg_temp.got('n2', '00000000-0000-0000-0000-00000009e200')
      and pg_temp.got('n2', '00000000-0000-0000-0000-00000009e201')
      and not pg_temp.got('n2', '00000000-0000-0000-0000-00000009e202')
      and not pg_temp.got('n2', '00000000-0000-0000-0000-00000009e204')
      and not pg_temp.got('n2', '00000000-0000-0000-0000-00000009e203'),
    format('owner=%s reception=%s groomer=%s retail=%s caretaker=%s',
      pg_temp.got('n2', '00000000-0000-0000-0000-00000009e200'),
      pg_temp.got('n2', '00000000-0000-0000-0000-00000009e201'),
      pg_temp.got('n2', '00000000-0000-0000-0000-00000009e202'),
      pg_temp.got('n2', '00000000-0000-0000-0000-00000009e204'),
      pg_temp.got('n2', '00000000-0000-0000-0000-00000009e203')));
end $$;

-- ── N3 ────────────────────────────────────────────────────────────────────
do $$
begin
  perform pg_temp.as_user('00000000-0000-0000-0000-00000009e102');
  set local role authenticated;
  perform public.save_my_notification_preferences(
    '00000000-0000-0000-0000-00000009e020', '{"bookings": true}'::jsonb, '{}'::jsonb);
  reset role;

  perform pg_temp.as_user('00000000-0000-0000-0000-00000009e101');
  set local role authenticated;
  perform public.save_my_notification_preferences(
    '00000000-0000-0000-0000-00000009e020', '{"bookings": false}'::jsonb, '{}'::jsonb);
  reset role;

  perform count(*) from pg_temp.fan_out('booking_request', 'bookings', 'view_bookings', false, 'n3');
  perform pg_temp.t('N3  a person''s own switch overrides the role, both ways',
    pg_temp.got('n3', '00000000-0000-0000-0000-00000009e202')
      and not pg_temp.got('n3', '00000000-0000-0000-0000-00000009e201'),
    format('groomer=%s reception=%s',
      pg_temp.got('n3', '00000000-0000-0000-0000-00000009e202'),
      pg_temp.got('n3', '00000000-0000-0000-0000-00000009e201')));
end $$;

-- ── N4 ────────────────────────────────────────────────────────────────────
do $$
begin
  perform pg_temp.as_user('00000000-0000-0000-0000-00000009e104');
  set local role authenticated;
  perform public.save_my_notification_preferences(
    '00000000-0000-0000-0000-00000009e020', '{"estimates": true}'::jsonb, '{"estimates": true}'::jsonb);
  reset role;

  perform count(*) from pg_temp.fan_out('estimate_accepted', 'estimates', 'view_estimates', false, 'n4');
  perform pg_temp.t('N4  no permission, no notice, whatever the switches say',
    not pg_temp.got('n4', '00000000-0000-0000-0000-00000009e204')
      and pg_temp.got('n4', '00000000-0000-0000-0000-00000009e200'));
end $$;

-- ── N5 ────────────────────────────────────────────────────────────────────
do $$
begin
  perform pg_temp.as_user('00000000-0000-0000-0000-00000009e102');
  set local role authenticated;
  perform public.save_my_notification_preferences(
    '00000000-0000-0000-0000-00000009e020', '{"bookings": true, "incidents": false}'::jsonb, '{}'::jsonb);
  reset role;

  perform count(*) from pg_temp.fan_out('incident_reported', 'incidents', 'ops_incidents_view', true, 'n5');
  perform pg_temp.t('N5  a mandatory notice reaches someone who switched its category off',
    pg_temp.got('n5', '00000000-0000-0000-0000-00000009e202')
      and exists (select 1 from public.staff_notifications
                   where dedupe_key = 'n5' and urgent));
end $$;

-- ── N6, N7 ────────────────────────────────────────────────────────────────
create temp table first_call (membership_id uuid, created boolean, send_email boolean);

do $$
declare
  v_owner_mail boolean;
  v_reception_mail boolean;
  v_first_rows integer;
  v_second_new integer;
  v_rows_after integer;
begin
  perform pg_temp.as_user('00000000-0000-0000-0000-00000009e100');
  set local role authenticated;
  perform public.save_my_notification_preferences(
    '00000000-0000-0000-0000-00000009e020', '{}'::jsonb, '{"forms": true}'::jsonb);
  reset role;

  -- The first time: who was notified, and who asked for email.
  insert into first_call
    select * from pg_temp.fan_out('form_submitted', 'forms', 'view_clients', false, 'n6');
  select send_email into v_owner_mail from first_call
   where membership_id = '00000000-0000-0000-0000-00000009e200';
  select send_email into v_reception_mail from first_call
   where membership_id = '00000000-0000-0000-0000-00000009e201';
  select count(*) into v_first_rows from public.staff_notifications where dedupe_key = 'n6';

  -- The same event again.
  select count(*) filter (where f.created or f.send_email) into v_second_new
    from pg_temp.fan_out('form_submitted', 'forms', 'view_clients', false, 'n6') f;
  select count(*) into v_rows_after from public.staff_notifications where dedupe_key = 'n6';

  perform pg_temp.t('N6  the same event twice is one row per person, and mails nobody again',
    v_first_rows > 0 and v_second_new = 0 and v_rows_after = v_first_rows,
    format('first_rows=%s second_new_or_mail=%s rows_after=%s', v_first_rows, v_second_new, v_rows_after));
  perform pg_temp.t('N7  email for whoever switched it on, and nobody else',
    v_owner_mail is true and v_reception_mail is false,
    format('owner=%s reception=%s', v_owner_mail, v_reception_mail));
end $$;

-- ── N8 ────────────────────────────────────────────────────────────────────
do $$
begin
  perform count(*) from pg_temp.fan_out('time_off_decided', 'schedule', null, false, 'n8',
    array['00000000-0000-0000-0000-00000009e204']::uuid[]);
  perform pg_temp.t('N8  a notice addressed to one person reaches only them, without the role default',
    pg_temp.got('n8', '00000000-0000-0000-0000-00000009e204')
      and (select count(*) from public.staff_notifications where dedupe_key = 'n8') = 1);
end $$;

-- ── N9 ────────────────────────────────────────────────────────────────────
do $$
declare
  v_owner_rows integer;
  v_all_owner integer;
  v_foreign_id uuid;
  v_refused boolean := false;
  v_marked integer;
begin
  select id into v_foreign_id from public.staff_notifications
   where membership_id = '00000000-0000-0000-0000-00000009e200' limit 1;
  select count(*) into v_all_owner from public.staff_notifications
   where membership_id = '00000000-0000-0000-0000-00000009e200';

  perform pg_temp.as_user('00000000-0000-0000-0000-00000009e202');
  set local role authenticated;
  begin
    perform public.set_my_notification_state(v_foreign_id, true, null);
  exception when insufficient_privilege then
    v_refused := true;
  end;
  select count(*) into v_owner_rows from public.staff_notifications
   where membership_id = '00000000-0000-0000-0000-00000009e200';
  reset role;

  perform pg_temp.as_user('00000000-0000-0000-0000-00000009e100');
  set local role authenticated;
  select public.mark_all_my_notifications_read('00000000-0000-0000-0000-00000009e020') into v_marked;
  reset role;

  perform pg_temp.t('N9  a person reads only their own, and marks only their own read',
    v_owner_rows = 0 and v_refused and v_marked = v_all_owner
      and not exists (select 1 from public.staff_notifications
                       where membership_id = '00000000-0000-0000-0000-00000009e200' and read_at is null),
    format('groomer_sees_owner_rows=%s refused=%s marked=%s of %s', v_owner_rows, v_refused, v_marked, v_all_owner));
end $$;

-- ── N10 ───────────────────────────────────────────────────────────────────
do $$
declare
  v_in_app jsonb;
  v_refused boolean := false;
begin
  perform pg_temp.as_user('00000000-0000-0000-0000-00000009e101');
  set local role authenticated;
  perform public.save_my_notification_preferences(
    '00000000-0000-0000-0000-00000009e020',
    '{"bookings": true, "parties": true, "forms": "yes"}'::jsonb, '{}'::jsonb);
  select in_app into v_in_app from public.my_notification_preferences('00000000-0000-0000-0000-00000009e020');
  reset role;

  perform pg_temp.as_user('00000000-0000-0000-0000-00000009e105');
  set local role authenticated;
  begin
    perform public.save_my_notification_preferences(
      '00000000-0000-0000-0000-00000009e020', '{"bookings": true}'::jsonb, '{}'::jsonb);
  exception when insufficient_privilege then
    v_refused := true;
  end;
  reset role;

  perform pg_temp.t('N10 preferences keep only category → boolean, and a non-member is refused',
    v_in_app = '{"bookings": true}'::jsonb and v_refused,
    format('in_app=%s refused=%s', v_in_app, v_refused));
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
