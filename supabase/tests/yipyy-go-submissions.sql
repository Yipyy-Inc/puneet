-- ============================================================================
-- yipyy_go_submissions, booking_yipyy_go and the pre-arrival form functions
-- (see the migration a_pre_arrival_form_is_a_row).
--
--   bun run test:sql yipyy-go-submissions
--
-- One transaction, rolled back. Fixture emails are @example.invalid.
--
-- ── WHAT THIS FILE IS ABOUT ────────────────────────────────────────────────
--
-- T1  Facility and client come from the booking; a pet not on the booking is
--     refused, by the function and by the table.
-- T2  Saving twice is one row, holding the second answers.
-- T3  Nobody writes the table directly.
-- T4  The deadline closes the form: a booking starting inside it refuses a save.
-- T5  Submitting says whether to tell staff (once); a sent form is not saved
--     back to a draft; "request changes" reopens a form past its deadline; an
--     approved form is closed.
-- T6  Reviewing needs edit_bookings.
-- T7  Staff complete a form only with a reason, and that satisfies the booking.
-- T8  Another facility and another household get the same refusal, and read
--     nothing.
-- T9  A service the facility does not ask about refuses a form.
-- T10 A booking with two dogs is satisfied only when both are.
-- T11 The form state says what each dog's form is and whether it can change;
--     anon holds nothing and authenticated only reads.
-- ============================================================================

begin;

set local client_min_messages to warning;

create temp table tap (n serial, name text, ok boolean, detail text);
grant all on tap to authenticated;

create or replace function pg_temp.t(p_name text, p_ok boolean, p_detail text default '')
returns void language sql as $$
  insert into tap(name, ok, detail) values (p_name, p_ok, p_detail);
$$;

create or replace function pg_temp.as_user(p_sub text)
returns void language sql as $$
  select set_config('request.jwt.claims',
    json_build_object('sub', p_sub, 'role', 'authenticated')::text, true);
$$;

create or replace function pg_temp.as_nobody()
returns void language sql as $$
  select set_config('request.jwt.claims', '', true);
$$;

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000001f7001', 'ygs-owner@example.invalid'),
  ('00000000-0000-0000-0000-0000001f7002', 'ygs-other@example.invalid'),
  ('00000000-0000-0000-0000-0000001f7003', 'ygs-client@example.invalid'),
  ('00000000-0000-0000-0000-0000001f7004', 'ygs-limited@example.invalid'),
  ('00000000-0000-0000-0000-0000001f7005', 'ygs-stranger@example.invalid')
on conflict (id) do nothing;

insert into public.profiles (id, email, full_name) values
  ('00000000-0000-0000-0000-0000001f7001', 'ygs-owner@example.invalid', 'Owner'),
  ('00000000-0000-0000-0000-0000001f7002', 'ygs-other@example.invalid', 'Other'),
  ('00000000-0000-0000-0000-0000001f7003', 'ygs-client@example.invalid', 'Client'),
  ('00000000-0000-0000-0000-0000001f7004', 'ygs-limited@example.invalid', 'Limited'),
  ('00000000-0000-0000-0000-0000001f7005', 'ygs-stranger@example.invalid', 'Stranger')
on conflict (id) do update set full_name = excluded.full_name;

insert into public.orgs (id, name, slug) values
  ('00000000-0000-0000-0000-0000001f7010', 'YGS Org', 'ygs-org')
on conflict do nothing;

insert into public.facilities (id, org_id, name, slug, legacy_id) values
  ('00000000-0000-0000-0000-0000001f7020', '00000000-0000-0000-0000-0000001f7010',
   'Kennel', 'ygs-a', 'ygs-a'),
  ('00000000-0000-0000-0000-0000001f7021', '00000000-0000-0000-0000-0000001f7010',
   'Elsewhere', 'ygs-b', 'ygs-b')
on conflict do nothing;

insert into public.facility_memberships (id, facility_id, profile_id, role, is_active) values
  ('00000000-0000-0000-0000-0000001f7030', '00000000-0000-0000-0000-0000001f7020',
   '00000000-0000-0000-0000-0000001f7001', 'owner', true),
  ('00000000-0000-0000-0000-0000001f7031', '00000000-0000-0000-0000-0000001f7021',
   '00000000-0000-0000-0000-0000001f7002', 'owner', true),
  ('00000000-0000-0000-0000-0000001f7032', '00000000-0000-0000-0000-0000001f7020',
   '00000000-0000-0000-0000-0000001f7004', 'sanitation', true)
on conflict (id) do nothing;

insert into public.clients (id, facility_id, name, email, profile_id) values
  ('00000000-0000-0000-0000-0000001f7040', '00000000-0000-0000-0000-0000001f7020',
   'Guest One', 'ygs-c1@example.invalid', '00000000-0000-0000-0000-0000001f7003'),
  ('00000000-0000-0000-0000-0000001f7041', '00000000-0000-0000-0000-0000001f7020',
   'Guest Two', 'ygs-c2@example.invalid', '00000000-0000-0000-0000-0000001f7005');

insert into public.pets (id, client_id, name, species) values
  ('00000000-0000-0000-0000-0000001f7050', '00000000-0000-0000-0000-0000001f7040', 'Rex', 'dog'),
  ('00000000-0000-0000-0000-0000001f7051', '00000000-0000-0000-0000-0000001f7040', 'Milo', 'dog'),
  ('00000000-0000-0000-0000-0000001f7052', '00000000-0000-0000-0000-0000001f7041', 'Luna', 'dog');

-- Daycare is mandatory, boarding optional, grooming not asked about; the form
-- closes 24 hours before the booking starts.
insert into public.facility_settings (facility_id, domain, value) values
  ('00000000-0000-0000-0000-0000001f7020', 'yipyy_go_config', jsonb_build_object(
     'enabled', true,
     'serviceConfigs', jsonb_build_array(
       jsonb_build_object('serviceType', 'daycare', 'enabled', true, 'requirement', 'mandatory'),
       jsonb_build_object('serviceType', 'boarding', 'enabled', true, 'requirement', 'optional'),
       jsonb_build_object('serviceType', 'grooming', 'enabled', false, 'requirement', 'optional')
     ),
     'timing', jsonb_build_object('initialSendTime', 72, 'deadline', 24,
                                  'reminderRules', '[]'::jsonb, 'deliveryChannels', '[]'::jsonb),
     'notifyStaffEmailOnSubmit', true,
     'confirmationEmail', jsonb_build_object('enabled', false, 'subject', '', 'message', '')
   ))
on conflict (facility_id, domain) do update set value = excluded.value;

insert into public.bookings
  (id, facility_id, client_id, service, service_type, status, start_at, end_at, base_price, total_cost)
values
  -- B1: daycare in three days, two dogs.
  ('00000000-0000-0000-0000-0000001f7090', '00000000-0000-0000-0000-0000001f7020',
   '00000000-0000-0000-0000-0000001f7040', 'daycare', 'Full day', 'confirmed',
   now() + interval '3 days', now() + interval '3 days 8 hours', 40, 40),
  -- B2: daycare in twelve hours — inside the 24-hour deadline.
  ('00000000-0000-0000-0000-0000001f7091', '00000000-0000-0000-0000-0000001f7020',
   '00000000-0000-0000-0000-0000001f7040', 'daycare', 'Full day', 'confirmed',
   now() + interval '12 hours', now() + interval '20 hours', 40, 40),
  -- B3: grooming, which the facility does not ask about.
  ('00000000-0000-0000-0000-0000001f7092', '00000000-0000-0000-0000-0000001f7020',
   '00000000-0000-0000-0000-0000001f7040', 'grooming', 'Bath', 'confirmed',
   now() + interval '3 days', now() + interval '3 days 1 hour', 60, 60),
  -- B4: another household's daycare.
  ('00000000-0000-0000-0000-0000001f7093', '00000000-0000-0000-0000-0000001f7020',
   '00000000-0000-0000-0000-0000001f7041', 'daycare', 'Full day', 'confirmed',
   now() + interval '3 days', now() + interval '3 days 8 hours', 40, 40);

insert into public.booking_pets (booking_id, pet_id) values
  ('00000000-0000-0000-0000-0000001f7090', '00000000-0000-0000-0000-0000001f7050'),
  ('00000000-0000-0000-0000-0000001f7090', '00000000-0000-0000-0000-0000001f7051'),
  ('00000000-0000-0000-0000-0000001f7091', '00000000-0000-0000-0000-0000001f7050'),
  ('00000000-0000-0000-0000-0000001f7092', '00000000-0000-0000-0000-0000001f7050'),
  ('00000000-0000-0000-0000-0000001f7093', '00000000-0000-0000-0000-0000001f7052');

-- ── T1  facility and client come from the booking ───────────────────────────
do $$
declare
  v_row public.yipyy_go_submissions;
  v_fn_refused boolean := false;
  v_table_refused boolean := false;
begin
  perform pg_temp.as_user('00000000-0000-0000-0000-0000001f7003');
  set local role authenticated;
  v_row := public.save_yipyy_go_draft(
    '00000000-0000-0000-0000-0000001f7090', '00000000-0000-0000-0000-0000001f7050',
    '{"belongings": [{"id": "b1", "type": "leash"}]}'::jsonb);
  begin
    perform public.save_yipyy_go_draft(
      '00000000-0000-0000-0000-0000001f7090', '00000000-0000-0000-0000-0000001f7052', '{}'::jsonb);
  exception when insufficient_privilege then v_fn_refused := true;
  end;
  reset role;
  perform pg_temp.as_nobody();
  begin
    insert into public.yipyy_go_submissions (booking_id, pet_id)
    values ('00000000-0000-0000-0000-0000001f7091', '00000000-0000-0000-0000-0000001f7052');
  exception when check_violation then v_table_refused := true;
  end;
  perform pg_temp.t('T1  facility and client are the booking''s; a pet not on it is refused',
    v_row.facility_id = '00000000-0000-0000-0000-0000001f7020'
      and v_row.client_id = '00000000-0000-0000-0000-0000001f7040'
      and v_row.status = 'draft' and v_fn_refused and v_table_refused,
    format('facility=%s client=%s status=%s fn refused=%s table refused=%s',
      v_row.facility_id, v_row.client_id, v_row.status, v_fn_refused, v_table_refused));
exception when others then
  reset role; perform pg_temp.t('T1  derive', false, sqlerrm);
end $$;

-- ── T2  saving twice is one row ─────────────────────────────────────────────
do $$
declare v_rows integer; v_type text;
begin
  perform pg_temp.as_user('00000000-0000-0000-0000-0000001f7003');
  set local role authenticated;
  perform public.save_yipyy_go_draft(
    '00000000-0000-0000-0000-0000001f7090', '00000000-0000-0000-0000-0000001f7050',
    '{"belongings": [{"id": "b1", "type": "bed"}]}'::jsonb);
  select count(*), max(answers -> 'belongings' -> 0 ->> 'type') into v_rows, v_type
    from public.yipyy_go_submissions
   where booking_id = '00000000-0000-0000-0000-0000001f7090'
     and pet_id = '00000000-0000-0000-0000-0000001f7050';
  reset role;
  perform pg_temp.t('T2  saving twice is one row with the second answers',
    v_rows = 1 and v_type = 'bed', format('rows=%s type=%s', v_rows, v_type));
exception when others then
  reset role; perform pg_temp.t('T2  upsert', false, sqlerrm);
end $$;

-- ── T3  nobody writes the table directly ────────────────────────────────────
do $$
declare v_insert boolean := false; v_update boolean := false;
begin
  perform pg_temp.as_user('00000000-0000-0000-0000-0000001f7001');
  set local role authenticated;
  begin
    insert into public.yipyy_go_submissions (booking_id, pet_id, status)
    values ('00000000-0000-0000-0000-0000001f7092', '00000000-0000-0000-0000-0000001f7050', 'approved');
  exception when insufficient_privilege then v_insert := true;
  end;
  begin
    update public.yipyy_go_submissions set status = 'approved'
     where booking_id = '00000000-0000-0000-0000-0000001f7090';
  exception when insufficient_privilege then v_update := true;
  end;
  reset role;
  perform pg_temp.t('T3  even the facility owner cannot insert or update the table directly',
    v_insert and v_update, format('insert refused=%s update refused=%s', v_insert, v_update));
exception when others then
  reset role; perform pg_temp.t('T3  direct writes', false, sqlerrm);
end $$;

-- ── T4  the deadline closes the form ────────────────────────────────────────
do $$
declare v_closed boolean := false;
begin
  perform pg_temp.as_user('00000000-0000-0000-0000-0000001f7003');
  set local role authenticated;
  begin
    perform public.save_yipyy_go_draft(
      '00000000-0000-0000-0000-0000001f7091', '00000000-0000-0000-0000-0000001f7050', '{}'::jsonb);
  exception when invalid_parameter_value then v_closed := true;
  end;
  reset role;
  perform pg_temp.t('T4  a booking starting inside the deadline refuses a save', v_closed,
    format('closed=%s', v_closed));
exception when others then
  reset role; perform pg_temp.t('T4  deadline', false, sqlerrm);
end $$;

-- ── T5  submit, resubmit, reopen, freeze ────────────────────────────────────
do $$
declare
  v_first jsonb; v_again jsonb;
  v_no_draft boolean := false;
  v_reopened jsonb;
  v_frozen boolean := false;
  v_rex uuid;
begin
  -- The owner sends Rex's form, then sends it again.
  perform pg_temp.as_user('00000000-0000-0000-0000-0000001f7003');
  set local role authenticated;
  v_first := public.submit_yipyy_go_form(
    '00000000-0000-0000-0000-0000001f7090', '00000000-0000-0000-0000-0000001f7050',
    '{"belongings": [{"id": "b1", "type": "bed"}]}'::jsonb);
  v_again := public.submit_yipyy_go_form(
    '00000000-0000-0000-0000-0000001f7090', '00000000-0000-0000-0000-0000001f7050',
    '{"belongings": [{"id": "b1", "type": "toy"}]}'::jsonb);
  begin
    perform public.save_yipyy_go_draft(
      '00000000-0000-0000-0000-0000001f7090', '00000000-0000-0000-0000-0000001f7050', '{}'::jsonb);
  exception when invalid_parameter_value then v_no_draft := true;
  end;
  reset role;

  -- A form on B2 (inside its deadline) that the facility sends back.
  perform pg_temp.as_nobody();
  insert into public.yipyy_go_submissions (booking_id, pet_id, status, submitted_at)
  values ('00000000-0000-0000-0000-0000001f7091', '00000000-0000-0000-0000-0000001f7050', 'submitted', now());
  select id into v_rex from public.yipyy_go_submissions
   where booking_id = '00000000-0000-0000-0000-0000001f7091';
  perform pg_temp.as_user('00000000-0000-0000-0000-0000001f7001');
  set local role authenticated;
  perform public.review_yipyy_go_submission(v_rex, 'request_changes', 'Add the vet''s number.', 'Owner');
  reset role;
  perform pg_temp.as_user('00000000-0000-0000-0000-0000001f7003');
  set local role authenticated;
  v_reopened := public.submit_yipyy_go_form(
    '00000000-0000-0000-0000-0000001f7091', '00000000-0000-0000-0000-0000001f7050',
    '{"specialNotes": "Vet: 555-0100"}'::jsonb);
  reset role;

  -- The facility approves Rex's B1 form; the owner can no longer send it.
  select id into v_rex from public.yipyy_go_submissions
   where booking_id = '00000000-0000-0000-0000-0000001f7090'
     and pet_id = '00000000-0000-0000-0000-0000001f7050';
  perform pg_temp.as_user('00000000-0000-0000-0000-0000001f7001');
  set local role authenticated;
  perform public.review_yipyy_go_submission(v_rex, 'approve', null, 'Owner');
  reset role;
  perform pg_temp.as_user('00000000-0000-0000-0000-0000001f7003');
  set local role authenticated;
  begin
    perform public.submit_yipyy_go_form(
      '00000000-0000-0000-0000-0000001f7090', '00000000-0000-0000-0000-0000001f7050', '{}'::jsonb);
  exception when invalid_parameter_value then v_frozen := true;
  end;
  reset role;

  perform pg_temp.t('T5  staff are told once; no draft over a sent form; changes reopen past the deadline; approved is closed',
    (v_first ->> 'notifyStaff')::boolean
      and not (v_again ->> 'notifyStaff')::boolean
      and not (v_first ->> 'sendConfirmation')::boolean
      and v_first -> 'submission' ->> 'status' = 'submitted'
      and v_no_draft
      and v_reopened -> 'submission' ->> 'status' = 'submitted'
      and v_frozen,
    format('notify first=%s again=%s confirm=%s no draft=%s reopened=%s frozen=%s',
      v_first ->> 'notifyStaff', v_again ->> 'notifyStaff', v_first ->> 'sendConfirmation',
      v_no_draft, v_reopened -> 'submission' ->> 'status', v_frozen));
exception when others then
  reset role; perform pg_temp.t('T5  lifecycle', false, sqlerrm);
end $$;

-- ── T6  reviewing needs edit_bookings ───────────────────────────────────────
do $$
declare v_can_edit boolean; v_refused boolean := false; v_id uuid;
begin
  perform pg_temp.as_nobody();
  select id into v_id from public.yipyy_go_submissions
   where booking_id = '00000000-0000-0000-0000-0000001f7091';
  perform pg_temp.as_user('00000000-0000-0000-0000-0000001f7004');
  set local role authenticated;
  v_can_edit := private.has_permission('00000000-0000-0000-0000-0000001f7020', 'edit_bookings');
  begin
    perform public.review_yipyy_go_submission(v_id, 'approve', null, 'Limited');
  exception when insufficient_privilege then v_refused := true;
  end;
  reset role;
  -- The first half guards the second: a role that could edit would prove nothing.
  perform pg_temp.t('T6  a member without edit_bookings cannot review',
    not v_can_edit and v_refused, format('role can edit=%s refused=%s', v_can_edit, v_refused));
exception when others then
  reset role; perform pg_temp.t('T6  review permission', false, sqlerrm);
end $$;

-- ── T7  staff complete a form, with a reason ────────────────────────────────
do $$
declare
  v_no_reason boolean := false;
  v_row public.yipyy_go_submissions;
  v_satisfied boolean; v_status text;
begin
  perform pg_temp.as_user('00000000-0000-0000-0000-0000001f7001');
  set local role authenticated;
  begin
    perform public.complete_yipyy_go_by_staff(
      '00000000-0000-0000-0000-0000001f7093', '00000000-0000-0000-0000-0000001f7052', '  ', 'Owner');
  exception when invalid_parameter_value then v_no_reason := true;
  end;
  v_row := public.complete_yipyy_go_by_staff(
    '00000000-0000-0000-0000-0000001f7093', '00000000-0000-0000-0000-0000001f7052',
    'Owner answered by phone.', 'Owner');
  select satisfied, status into v_satisfied, v_status
    from public.booking_yipyy_go where booking_id = '00000000-0000-0000-0000-0000001f7093';
  reset role;
  perform pg_temp.t('T7  completing needs a reason, and satisfies the booking',
    v_no_reason and v_row.status = 'completed_by_staff' and v_satisfied and v_status = 'approved',
    format('no reason refused=%s status=%s satisfied=%s booking=%s',
      v_no_reason, v_row.status, v_satisfied, v_status));
exception when others then
  reset role; perform pg_temp.t('T7  staff completion', false, sqlerrm);
end $$;

-- ── T8  another facility, another household ─────────────────────────────────
do $$
declare
  v_id uuid;
  v_review boolean := false; v_complete boolean := false; v_household boolean := false;
  v_seen_other integer; v_seen_household integer; v_msg_other text; v_msg_household text;
begin
  perform pg_temp.as_nobody();
  select id into v_id from public.yipyy_go_submissions
   where booking_id = '00000000-0000-0000-0000-0000001f7090'
     and pet_id = '00000000-0000-0000-0000-0000001f7050';

  perform pg_temp.as_user('00000000-0000-0000-0000-0000001f7002');
  set local role authenticated;
  begin
    perform public.review_yipyy_go_submission(v_id, 'approve', null, 'Other');
  exception when insufficient_privilege then v_review := true;
  end;
  begin
    perform public.complete_yipyy_go_by_staff(
      '00000000-0000-0000-0000-0000001f7090', '00000000-0000-0000-0000-0000001f7051', 'Because.', 'Other');
  exception when insufficient_privilege then v_complete := true;
  end;
  select count(*) into v_seen_other from public.yipyy_go_submissions;
  reset role;

  perform pg_temp.as_user('00000000-0000-0000-0000-0000001f7005');
  set local role authenticated;
  begin
    perform public.save_yipyy_go_draft(
      '00000000-0000-0000-0000-0000001f7090', '00000000-0000-0000-0000-0000001f7051', '{}'::jsonb);
  exception when insufficient_privilege then
    v_household := true;
    get stacked diagnostics v_msg_household = message_text;
  end;
  begin
    perform public.save_yipyy_go_draft(
      '00000000-0000-0000-0000-0000001f7099', '00000000-0000-0000-0000-0000001f7051', '{}'::jsonb);
  exception when insufficient_privilege then
    get stacked diagnostics v_msg_other = message_text;
  end;
  select count(*) into v_seen_household from public.yipyy_go_submissions
   where client_id = '00000000-0000-0000-0000-0000001f7040';
  reset role;

  perform pg_temp.t('T8  another facility and household are refused alike and read nothing',
    v_review and v_complete and v_household and v_seen_other = 0 and v_seen_household = 0
      and v_msg_household = v_msg_other,
    format('review=%s complete=%s household=%s seen other=%s seen household=%s same message=%s',
      v_review, v_complete, v_household, v_seen_other, v_seen_household, v_msg_household = v_msg_other));
exception when others then
  reset role; perform pg_temp.t('T8  strangers', false, sqlerrm);
end $$;

-- ── T9  a service the facility does not ask about ───────────────────────────
do $$
declare v_refused boolean := false;
begin
  perform pg_temp.as_user('00000000-0000-0000-0000-0000001f7003');
  set local role authenticated;
  begin
    perform public.save_yipyy_go_draft(
      '00000000-0000-0000-0000-0000001f7092', '00000000-0000-0000-0000-0000001f7050', '{}'::jsonb);
  exception when invalid_parameter_value then v_refused := true;
  end;
  reset role;
  perform pg_temp.t('T9  grooming, not asked about, refuses a form', v_refused,
    format('refused=%s', v_refused));
exception when others then
  reset role; perform pg_temp.t('T9  no requirement', false, sqlerrm);
end $$;

-- ── T10  two dogs, one booking ──────────────────────────────────────────────
do $$
declare
  v_before record; v_after record;
begin
  perform pg_temp.as_user('00000000-0000-0000-0000-0000001f7001');
  set local role authenticated;
  select requirement, pets_total, pets_satisfied, satisfied, status into v_before
    from public.booking_yipyy_go where booking_id = '00000000-0000-0000-0000-0000001f7090';
  reset role;

  perform pg_temp.as_user('00000000-0000-0000-0000-0000001f7003');
  set local role authenticated;
  perform public.submit_yipyy_go_form(
    '00000000-0000-0000-0000-0000001f7090', '00000000-0000-0000-0000-0000001f7051',
    '{"noMedications": true}'::jsonb);
  select requirement, pets_total, pets_satisfied, satisfied, status into v_after
    from public.booking_yipyy_go where booking_id = '00000000-0000-0000-0000-0000001f7090';
  reset role;

  perform pg_temp.t('T10 two dogs: one sent is in progress; both sent is satisfied',
    v_before.requirement = 'mandatory' and v_before.pets_total = 2 and v_before.pets_satisfied = 1
      and not v_before.satisfied and v_before.status = 'in_progress'
      and v_after.pets_satisfied = 2 and v_after.satisfied and v_after.status = 'submitted',
    format('before %s/%s %s %s; after %s/%s %s %s',
      v_before.pets_satisfied, v_before.pets_total, v_before.satisfied, v_before.status,
      v_after.pets_satisfied, v_after.pets_total, v_after.satisfied, v_after.status));
exception when others then
  reset role; perform pg_temp.t('T10 two dogs', false, sqlerrm);
end $$;

-- ── T11  form state, and grants ─────────────────────────────────────────────
do $$
declare
  v_state jsonb; v_staff jsonb; v_stranger boolean := false;
  v_rex jsonb; v_milo jsonb;
begin
  perform pg_temp.as_user('00000000-0000-0000-0000-0000001f7003');
  set local role authenticated;
  v_state := public.yipyy_go_form_state('00000000-0000-0000-0000-0000001f7090');
  reset role;
  perform pg_temp.as_user('00000000-0000-0000-0000-0000001f7001');
  set local role authenticated;
  v_staff := public.yipyy_go_form_state('00000000-0000-0000-0000-0000001f7090');
  reset role;
  perform pg_temp.as_user('00000000-0000-0000-0000-0000001f7002');
  set local role authenticated;
  begin
    perform public.yipyy_go_form_state('00000000-0000-0000-0000-0000001f7090');
  exception when insufficient_privilege then v_stranger := true;
  end;
  reset role;

  select p into v_rex from jsonb_array_elements(v_state -> 'pets') p where p ->> 'petName' = 'Rex';
  select p into v_milo from jsonb_array_elements(v_state -> 'pets') p where p ->> 'petName' = 'Milo';

  perform pg_temp.t('T11 form state: approved is closed, sent is still open, staff read it, a stranger does not',
    v_state ->> 'requirement' = 'mandatory'
      and v_state ->> 'deadline' is not null
      and v_rex ->> 'status' = 'approved' and not (v_rex ->> 'editable')::boolean
      and v_milo ->> 'status' = 'submitted' and (v_milo ->> 'editable')::boolean
      and jsonb_array_length(v_staff -> 'pets') = 2
      and v_stranger
      and not has_table_privilege('anon', 'public.yipyy_go_submissions', 'select')
      and not has_table_privilege('anon', 'public.booking_yipyy_go', 'select')
      and not has_table_privilege('authenticated', 'public.yipyy_go_submissions', 'insert')
      and has_table_privilege('authenticated', 'public.yipyy_go_submissions', 'select')
      and not has_function_privilege('anon', 'public.submit_yipyy_go_form(uuid, uuid, jsonb, jsonb, jsonb)', 'execute')
      and not has_function_privilege('anon', 'public.yipyy_go_form_state(uuid)', 'execute'),
    format('rex=%s milo=%s staff pets=%s stranger refused=%s',
      v_rex, v_milo, jsonb_array_length(v_staff -> 'pets'), v_stranger));
exception when others then
  reset role; perform pg_temp.t('T11 form state and grants', false, sqlerrm);
end $$;

-- ── Report ──────────────────────────────────────────────────────────────────
select case when ok then '  PASS  ' else '> FAIL <' end as result, name, detail
  from tap order by n;

select count(*) filter (where ok) || ' passed, '
    || count(*) filter (where not ok) || ' failed' as summary
  from tap;

rollback;
