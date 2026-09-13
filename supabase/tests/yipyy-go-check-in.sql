-- ============================================================================
-- Check-in codes, desk checks and today's arrivals (see the migration
-- a_check_in_code_opens_the_booking_at_the_desk).
--
--   bun run test:sql yipyy-go-check-in
--
-- One transaction, rolled back. Fixture emails are @example.invalid.
--
-- ── WHAT THIS FILE IS ABOUT ────────────────────────────────────────────────
--
-- K1  The owner issues a code for their arriving booking; another household
--     cannot.
-- K2  A hash that is not 32 bytes is refused.
-- K3  A new code replaces the old one: the old one resolves to nothing.
-- K4  The desk resolves a code only with the permission that checks that
--     service in; a groomer on a daycare booking, another facility, an expired
--     code and a short code all get the same empty answer.
-- K5  A desk check covers every dog; a missing mandatory form needs a reason;
--     a member who cannot check the service in is refused.
-- K6  Today's arrivals are today on the facility's calendar, found by a dog's
--     name or the booking number, and only at the facility asked about.
-- K7  anon holds nothing; nobody reads a code's hash or computes one.
-- K8  Where the facility asks no form for the service, a desk check needs no
--     reason and records nothing missing — it used to fail on form_missing.
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
  ('00000000-0000-0000-0000-0000001f4001', 'ygk-owner@example.invalid'),
  ('00000000-0000-0000-0000-0000001f4002', 'ygk-other@example.invalid'),
  ('00000000-0000-0000-0000-0000001f4003', 'ygk-client@example.invalid'),
  ('00000000-0000-0000-0000-0000001f4004', 'ygk-groomer@example.invalid'),
  ('00000000-0000-0000-0000-0000001f4005', 'ygk-stranger@example.invalid')
on conflict (id) do nothing;

insert into public.profiles (id, email, full_name) values
  ('00000000-0000-0000-0000-0000001f4001', 'ygk-owner@example.invalid', 'Owner'),
  ('00000000-0000-0000-0000-0000001f4002', 'ygk-other@example.invalid', 'Other'),
  ('00000000-0000-0000-0000-0000001f4003', 'ygk-client@example.invalid', 'Client'),
  ('00000000-0000-0000-0000-0000001f4004', 'ygk-groomer@example.invalid', 'Groomer'),
  ('00000000-0000-0000-0000-0000001f4005', 'ygk-stranger@example.invalid', 'Stranger')
on conflict (id) do update set full_name = excluded.full_name;

insert into public.orgs (id, name, slug) values
  ('00000000-0000-0000-0000-0000001f4010', 'YGK Org', 'ygk-org')
on conflict do nothing;

insert into public.facilities (id, org_id, name, slug, legacy_id) values
  ('00000000-0000-0000-0000-0000001f4020', '00000000-0000-0000-0000-0000001f4010',
   'Kennel', 'ygk-a', 'ygk-a'),
  ('00000000-0000-0000-0000-0000001f4021', '00000000-0000-0000-0000-0000001f4010',
   'Elsewhere', 'ygk-b', 'ygk-b')
on conflict do nothing;

insert into public.facility_memberships (id, facility_id, profile_id, role, is_active) values
  ('00000000-0000-0000-0000-0000001f4030', '00000000-0000-0000-0000-0000001f4020',
   '00000000-0000-0000-0000-0000001f4001', 'owner', true),
  ('00000000-0000-0000-0000-0000001f4031', '00000000-0000-0000-0000-0000001f4021',
   '00000000-0000-0000-0000-0000001f4002', 'owner', true),
  ('00000000-0000-0000-0000-0000001f4032', '00000000-0000-0000-0000-0000001f4020',
   '00000000-0000-0000-0000-0000001f4004', 'groomer', true)
on conflict (id) do nothing;

insert into public.clients (id, facility_id, name, email, profile_id) values
  ('00000000-0000-0000-0000-0000001f4040', '00000000-0000-0000-0000-0000001f4020',
   'Guest One', 'ygk-c1@example.invalid', '00000000-0000-0000-0000-0000001f4003'),
  ('00000000-0000-0000-0000-0000001f4041', '00000000-0000-0000-0000-0000001f4020',
   'Guest Two', 'ygk-c2@example.invalid', '00000000-0000-0000-0000-0000001f4005');

insert into public.pets (id, client_id, name, species) values
  ('00000000-0000-0000-0000-0000001f4050', '00000000-0000-0000-0000-0000001f4040', 'Rexford', 'dog'),
  ('00000000-0000-0000-0000-0000001f4051', '00000000-0000-0000-0000-0000001f4040', 'Milo', 'dog');

insert into public.facility_settings (facility_id, domain, value) values
  ('00000000-0000-0000-0000-0000001f4020', 'yipyy_go_config', jsonb_build_object(
     'enabled', true,
     'serviceConfigs', jsonb_build_array(
       jsonb_build_object('serviceType', 'daycare', 'enabled', true, 'requirement', 'mandatory')
     ),
     'timing', jsonb_build_object('initialSendTime', 72, 'deadline', 0,
                                  'reminderRules', '[]'::jsonb, 'deliveryChannels', '[]'::jsonb)
   ))
on conflict (facility_id, domain) do update set value = excluded.value;

insert into public.bookings
  (id, facility_id, client_id, service, service_type, status, start_at, end_at, base_price, total_cost)
values
  -- Today: two dogs arriving now.
  ('00000000-0000-0000-0000-0000001f4090', '00000000-0000-0000-0000-0000001f4020',
   '00000000-0000-0000-0000-0000001f4040', 'daycare', 'Full day', 'confirmed',
   now(), now() + interval '8 hours', 40, 40),
  -- In three days.
  ('00000000-0000-0000-0000-0000001f4091', '00000000-0000-0000-0000-0000001f4020',
   '00000000-0000-0000-0000-0000001f4040', 'daycare', 'Full day', 'confirmed',
   now() + interval '3 days', now() + interval '3 days 8 hours', 40, 40);

insert into public.booking_pets (booking_id, pet_id) values
  ('00000000-0000-0000-0000-0000001f4090', '00000000-0000-0000-0000-0000001f4050'),
  ('00000000-0000-0000-0000-0000001f4090', '00000000-0000-0000-0000-0000001f4051'),
  ('00000000-0000-0000-0000-0000001f4091', '00000000-0000-0000-0000-0000001f4050');

-- ── K1  the owner issues a code ─────────────────────────────────────────────
do $$
declare v_expires timestamptz; v_stranger boolean := false;
begin
  perform pg_temp.as_user('00000000-0000-0000-0000-0000001f4003');
  set local role authenticated;
  v_expires := public.issue_yipyy_go_check_in_pass(
    '00000000-0000-0000-0000-0000001f4090', extensions.digest('ygk-first-code-0123456789', 'sha256'));
  reset role;
  perform pg_temp.as_user('00000000-0000-0000-0000-0000001f4005');
  set local role authenticated;
  begin
    perform public.issue_yipyy_go_check_in_pass(
      '00000000-0000-0000-0000-0000001f4090', extensions.digest('ygk-stranger-code-0123456', 'sha256'));
  exception when insufficient_privilege then v_stranger := true;
  end;
  reset role;
  perform pg_temp.t('K1  the owner issues a code; another household is refused',
    v_expires is not null and v_stranger,
    format('expires=%s stranger refused=%s', v_expires, v_stranger));
exception when others then
  reset role; perform pg_temp.t('K1  issue', false, sqlerrm);
end $$;

-- ── K2  a hash is 32 bytes ──────────────────────────────────────────────────
do $$
declare v_refused boolean := false;
begin
  perform pg_temp.as_user('00000000-0000-0000-0000-0000001f4003');
  set local role authenticated;
  begin
    perform public.issue_yipyy_go_check_in_pass('00000000-0000-0000-0000-0000001f4090', '\x0102'::bytea);
  exception when invalid_parameter_value then v_refused := true;
  end;
  reset role;
  perform pg_temp.t('K2  a two-byte hash is refused', v_refused);
exception when others then
  reset role; perform pg_temp.t('K2  hash length', false, sqlerrm);
end $$;

-- ── K3  a new code replaces the old ─────────────────────────────────────────
do $$
declare v_old int; v_new int; v_rotations int;
begin
  perform pg_temp.as_user('00000000-0000-0000-0000-0000001f4003');
  set local role authenticated;
  perform public.issue_yipyy_go_check_in_pass(
    '00000000-0000-0000-0000-0000001f4090', extensions.digest('ygk-second-code-0123456789', 'sha256'));
  reset role;
  perform pg_temp.as_user('00000000-0000-0000-0000-0000001f4001');
  set local role authenticated;
  select count(*) into v_old from public.resolve_yipyy_go_check_in_pass('ygk-first-code-0123456789');
  select count(*) into v_new from public.resolve_yipyy_go_check_in_pass('ygk-second-code-0123456789');
  reset role;
  perform pg_temp.as_nobody();
  select rotations into v_rotations from public.yipyy_go_check_in_passes
   where booking_id = '00000000-0000-0000-0000-0000001f4090';
  perform pg_temp.t('K3  after a second code, the first resolves to nothing and the second to the booking',
    v_old = 0 and v_new = 1 and v_rotations = 1,
    format('old=%s new=%s rotations=%s', v_old, v_new, v_rotations));
exception when others then
  reset role; perform pg_temp.t('K3  rotation', false, sqlerrm);
end $$;

-- ── K4  who may resolve ─────────────────────────────────────────────────────
do $$
declare
  v_groomer_can boolean;
  v_groomer int; v_other int; v_short int; v_expired int;
begin
  perform pg_temp.as_user('00000000-0000-0000-0000-0000001f4004');
  set local role authenticated;
  v_groomer_can := private.has_permission('00000000-0000-0000-0000-0000001f4020', 'daycare_check_in_out');
  select count(*) into v_groomer from public.resolve_yipyy_go_check_in_pass('ygk-second-code-0123456789');
  reset role;

  perform pg_temp.as_user('00000000-0000-0000-0000-0000001f4002');
  set local role authenticated;
  select count(*) into v_other from public.resolve_yipyy_go_check_in_pass('ygk-second-code-0123456789');
  reset role;

  perform pg_temp.as_user('00000000-0000-0000-0000-0000001f4001');
  set local role authenticated;
  select count(*) into v_short from public.resolve_yipyy_go_check_in_pass('short');
  reset role;

  perform pg_temp.as_nobody();
  update public.yipyy_go_check_in_passes set token_expires_at = now() - interval '1 minute'
   where booking_id = '00000000-0000-0000-0000-0000001f4090';
  perform pg_temp.as_user('00000000-0000-0000-0000-0000001f4001');
  set local role authenticated;
  select count(*) into v_expired from public.resolve_yipyy_go_check_in_pass('ygk-second-code-0123456789');
  reset role;
  perform pg_temp.as_nobody();
  update public.yipyy_go_check_in_passes set token_expires_at = now() + interval '8 hours'
   where booking_id = '00000000-0000-0000-0000-0000001f4090';

  -- The first half guards the rest: a groomer who could check daycare in would
  -- prove nothing by being refused.
  perform pg_temp.t('K4  a groomer on daycare, another facility, a short code and an expired code resolve nothing',
    not v_groomer_can and v_groomer = 0 and v_other = 0 and v_short = 0 and v_expired = 0,
    format('groomer can=%s groomer=%s other=%s short=%s expired=%s',
      v_groomer_can, v_groomer, v_other, v_short, v_expired));
exception when others then
  reset role; perform pg_temp.t('K4  resolve permissions', false, sqlerrm);
end $$;

-- ── K5  the desk check ──────────────────────────────────────────────────────
do $$
declare
  v_no_reason boolean := false; v_hint text;
  v_one_dog boolean := false;
  v_groomer boolean := false;
  v_rows int; v_missing int; v_reasoned int;
begin
  perform pg_temp.as_user('00000000-0000-0000-0000-0000001f4001');
  set local role authenticated;
  begin
    perform public.record_yipyy_go_desk_check('00000000-0000-0000-0000-0000001f4090',
      '[{"petId": "00000000-0000-0000-0000-0000001f4050"}, {"petId": "00000000-0000-0000-0000-0000001f4051"}]'::jsonb,
      'code', 'Owner');
  exception when invalid_parameter_value then
    v_no_reason := true;
    get stacked diagnostics v_hint = pg_exception_hint;
  end;
  begin
    perform public.record_yipyy_go_desk_check('00000000-0000-0000-0000-0000001f4090',
      '[{"petId": "00000000-0000-0000-0000-0000001f4050", "overrideReason": "Owner filled it in at the desk."}]'::jsonb,
      'code', 'Owner');
  exception when invalid_parameter_value then v_one_dog := true;
  end;
  select count(*), count(*) filter (where form_missing), count(*) filter (where override_reason is not null)
    into v_rows, v_missing, v_reasoned
    from public.record_yipyy_go_desk_check('00000000-0000-0000-0000-0000001f4090',
      '[{"petId": "00000000-0000-0000-0000-0000001f4050", "overrideReason": "Owner filled it in at the desk.", "medicationsConfirmed": true, "belongingsConfirmed": true},
        {"petId": "00000000-0000-0000-0000-0000001f4051", "overrideReason": "Same.", "belongingsConfirmed": true}]'::jsonb,
      'code', 'Owner');
  reset role;

  perform pg_temp.as_user('00000000-0000-0000-0000-0000001f4004');
  set local role authenticated;
  begin
    perform public.record_yipyy_go_desk_check('00000000-0000-0000-0000-0000001f4090',
      '[{"petId": "00000000-0000-0000-0000-0000001f4050", "overrideReason": "x"}, {"petId": "00000000-0000-0000-0000-0000001f4051", "overrideReason": "x"}]'::jsonb,
      'search', 'Groomer');
  exception when insufficient_privilege then v_groomer := true;
  end;
  reset role;

  perform pg_temp.t('K5  no reason is refused (with its hint); one dog of two is refused; a groomer is refused; with reasons, two rows',
    v_no_reason and v_hint = 'override_reason_required' and v_one_dog and v_groomer
      and v_rows = 2 and v_missing = 2 and v_reasoned = 2,
    format('no reason=%s hint=%s one dog=%s groomer=%s rows=%s missing=%s reasoned=%s',
      v_no_reason, v_hint, v_one_dog, v_groomer, v_rows, v_missing, v_reasoned));
exception when others then
  reset role; perform pg_temp.t('K5  desk check', false, sqlerrm);
end $$;

-- ── K6  today's arrivals ────────────────────────────────────────────────────
do $$
declare
  v_today int; v_later int; v_by_name int; v_by_ref int; v_elsewhere int; v_ref bigint;
begin
  perform pg_temp.as_nobody();
  select ref into v_ref from public.bookings where id = '00000000-0000-0000-0000-0000001f4090';
  perform pg_temp.as_user('00000000-0000-0000-0000-0000001f4001');
  set local role authenticated;
  select count(*) filter (where booking_id = '00000000-0000-0000-0000-0000001f4090'),
         count(*) filter (where booking_id = '00000000-0000-0000-0000-0000001f4091')
    into v_today, v_later
    from public.yipyy_go_arrivals('00000000-0000-0000-0000-0000001f4020');
  select count(*) into v_by_name
    from public.yipyy_go_arrivals('00000000-0000-0000-0000-0000001f4020', 'REXF');
  select count(*) into v_by_ref
    from public.yipyy_go_arrivals('00000000-0000-0000-0000-0000001f4020', v_ref::text);
  reset role;
  perform pg_temp.as_user('00000000-0000-0000-0000-0000001f4002');
  set local role authenticated;
  select count(*) into v_elsewhere
    from public.yipyy_go_arrivals('00000000-0000-0000-0000-0000001f4020');
  reset role;
  perform pg_temp.t('K6  today is listed and later is not; found by name or number; another facility sees none',
    v_today = 1 and v_later = 0 and v_by_name = 1 and v_by_ref = 1 and v_elsewhere = 0,
    format('today=%s later=%s by name=%s by ref=%s elsewhere=%s',
      v_today, v_later, v_by_name, v_by_ref, v_elsewhere));
exception when others then
  reset role; perform pg_temp.t('K6  arrivals', false, sqlerrm);
end $$;

-- ── K7  grants ──────────────────────────────────────────────────────────────
select pg_temp.t('K7  anon holds nothing; nobody reads a code hash or computes one',
  not has_table_privilege('authenticated', 'public.yipyy_go_check_in_passes', 'select')
    and not has_table_privilege('anon', 'public.yipyy_go_check_in_passes', 'select')
    and not has_function_privilege('authenticated', 'private.hash_check_in_token(text)', 'execute')
    and not has_function_privilege('anon', 'public.resolve_yipyy_go_check_in_pass(text)', 'execute')
    and not has_function_privilege('anon', 'public.issue_yipyy_go_check_in_pass(uuid, bytea)', 'execute')
    and not has_function_privilege('anon', 'public.record_yipyy_go_desk_check(uuid, jsonb, text, text)', 'execute')
    and not has_function_privilege('anon', 'public.yipyy_go_arrivals(uuid, text)', 'execute')
    and not has_table_privilege('authenticated', 'public.yipyy_go_desk_checks', 'insert'));


-- ── K8  a desk check where no form is asked ─────────────────────────────────
do $$
declare
  v_rows int; v_missing int; v_requirement text; v_status text; v_reason text;
begin
  -- Boarding: this facility's forms cover daycare only.
  insert into public.bookings
    (id, facility_id, client_id, service, status, start_at, end_at, base_price, total_cost)
  values
    ('00000000-0000-0000-0000-0000001f4092', '00000000-0000-0000-0000-0000001f4020',
     '00000000-0000-0000-0000-0000001f4040', 'boarding', 'confirmed',
     now(), now() + interval '1 day', 60, 60);
  insert into public.booking_pets (booking_id, pet_id) values
    ('00000000-0000-0000-0000-0000001f4092', '00000000-0000-0000-0000-0000001f4051');

  perform pg_temp.as_user('00000000-0000-0000-0000-0000001f4001');
  set local role authenticated;
  select count(*), count(*) filter (where form_missing), max(requirement),
         max(form_status), max(override_reason)
    into v_rows, v_missing, v_requirement, v_status, v_reason
    from public.record_yipyy_go_desk_check('00000000-0000-0000-0000-0000001f4092',
      '[{"petId": "00000000-0000-0000-0000-0000001f4051"}]'::jsonb,
      'search', 'Owner');
  reset role;

  perform pg_temp.t('K8  where no form is asked, the desk check needs no reason and records nothing missing',
    v_rows = 1 and v_missing = 0 and v_requirement is null
      and v_status = 'not_started' and v_reason is null,
    format('rows=%s missing=%s requirement=%s status=%s reason=%s',
      v_rows, v_missing, v_requirement, v_status, v_reason));
exception when others then
  reset role; perform pg_temp.t('K8  desk check without a form', false, sqlerrm);
end $$;

-- ── Report ──────────────────────────────────────────────────────────────────
select case when ok then '  PASS  ' else '> FAIL <' end as result, name, detail
  from tap order by n;

select count(*) filter (where ok) || ' passed, '
    || count(*) filter (where not ok) || ' failed' as summary
  from tap;

rollback;
