-- ============================================================================
-- A booking waits for the forms the facility requires before booking
-- (a_booking_waits_for_the_forms_the_facility_requires).
--
--   bun run test:sql booking-form-gate
--
-- One transaction, rolled back. Fixture emails are @example.invalid.
--
--   G1  a customer missing a blocking form is refused (hint form_required),
--       and no booking is written
--   G2  staff missing it are asked why (hint form_override_reason_required)
--   G3  staff with a reason book, and the override is saved with the reason
--       and who gave it
--   G4  once the customer has submitted the form, their booking goes through
--   G5  a form set to warn never refuses, and records no override
--   G6  client_missing_forms answers for a client the caller can see, and
--       nothing for a stranger; anon executes neither new function
--   G7  a stranger cannot record an approval or check-in override
--   G8  staff record one at check-in; the before-booking stage is refused
--       there, because create_booking records it
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
  ('00000000-0000-0000-0000-0000009b0010', 'Gate Org', 'gate-org')
on conflict do nothing;

insert into public.facilities (id, org_id, name, slug, legacy_id, timezone) values
  ('00000000-0000-0000-0000-0000009b0020', '00000000-0000-0000-0000-0000009b0010',
   'Gate Facility', 'gate-a', 'gate-a', 'America/Toronto')
on conflict do nothing;

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000009b0100', 'gate-owner@example.invalid'),
  ('00000000-0000-0000-0000-0000009b0101', 'gate-customer@example.invalid'),
  ('00000000-0000-0000-0000-0000009b0102', 'gate-stranger@example.invalid')
on conflict do nothing;

insert into public.profiles (id, email, full_name) values
  ('00000000-0000-0000-0000-0000009b0100', 'gate-owner@example.invalid', 'Gia Owner'),
  ('00000000-0000-0000-0000-0000009b0101', 'gate-customer@example.invalid', 'Gus Customer'),
  ('00000000-0000-0000-0000-0000009b0102', 'gate-stranger@example.invalid', 'Gil Stranger')
on conflict do nothing;

insert into public.facility_memberships (facility_id, profile_id, role) values
  ('00000000-0000-0000-0000-0000009b0020', '00000000-0000-0000-0000-0000009b0100', 'owner')
on conflict do nothing;

insert into public.clients (id, facility_id, name, email, profile_id) values
  ('00000000-0000-0000-0000-0000009b0040', '00000000-0000-0000-0000-0000009b0020',
   'Gus Customer', 'gate-customer@example.invalid', '00000000-0000-0000-0000-0000009b0101');

insert into public.pets (id, facility_id, client_id, name, species) values
  ('00000000-0000-0000-0000-0000009b0050', '00000000-0000-0000-0000-0000009b0020',
   '00000000-0000-0000-0000-0000009b0040', 'Pip', 'Dog');

insert into public.forms (id, facility_id, name, slug, status, audience) values
  ('00000000-0000-0000-0000-0000009b0060', '00000000-0000-0000-0000-0000009b0020',
   'Gate Intake', 'gate-intake', 'published', 'customer');

insert into public.form_versions (id, form_id, facility_id, version_number, schema, published_at) values
  ('00000000-0000-0000-0000-0000009b0070', '00000000-0000-0000-0000-0000009b0060',
   '00000000-0000-0000-0000-0000009b0020', 1, '{"questions":[]}'::jsonb, now());

create or replace function pg_temp.require(p_enforcement text) returns void language sql as $$
  insert into public.facility_settings (facility_id, domain, value)
  values ('00000000-0000-0000-0000-0000009b0020', 'form_requirements', jsonb_build_object(
    'services', jsonb_build_array(jsonb_build_object(
      'serviceType', 'daycare', 'serviceLabel', 'Daycare',
      'requirements', jsonb_build_array(jsonb_build_object(
        'formId', '00000000-0000-0000-0000-0000009b0060', 'formName', 'Gate Intake',
        'enabled', true,
        'gates', jsonb_build_array(jsonb_build_object(
          'stage', 'before_booking', 'enforcement', p_enforcement))))))))
  on conflict (facility_id, domain) do update set value = excluded.value;
$$;

select pg_temp.require('block');

create or replace function pg_temp.payload(p_status text, p_reason text default null)
returns jsonb language sql as $$
  select jsonb_strip_nulls(jsonb_build_object(
    'facility_id', '00000000-0000-0000-0000-0000009b0020',
    'client_id', '00000000-0000-0000-0000-0000009b0040',
    'service', 'daycare',
    'status', p_status,
    'start_at', (now() + interval '3 days')::text,
    'end_at', (now() + interval '3 days 8 hours')::text,
    'form_override_reason', p_reason));
$$;

-- Try a booking; answer 'OK <ref>' or '<sqlstate> <hint>'.
create or replace function pg_temp.try_book(p_payload jsonb) returns text language plpgsql as $$
declare v_row record; v_state text; v_hint text;
begin
  select * into v_row from public.create_booking(
    p_payload, array['00000000-0000-0000-0000-0000009b0050']::uuid[]);
  return 'OK ' || v_row.booking_ref;
exception when others then
  get stacked diagnostics v_state = returned_sqlstate, v_hint = pg_exception_hint;
  return v_state || ' ' || coalesce(v_hint, '');
end $$;

-- ── G1 ────────────────────────────────────────────────────────────────────
do $$
declare v_answer text; v_bookings int;
begin
  perform pg_temp.as_user('00000000-0000-0000-0000-0000009b0101');
  set local role authenticated;
  v_answer := pg_temp.try_book(pg_temp.payload('request_submitted'));
  reset role;
  select count(*) into v_bookings from public.bookings
   where client_id = '00000000-0000-0000-0000-0000009b0040';
  perform pg_temp.t('G1  a customer without the form is refused, and nothing is written',
    v_answer = '22023 form_required' and v_bookings = 0,
    format('answer=%s bookings=%s', v_answer, v_bookings));
end $$;

-- ── G2 ────────────────────────────────────────────────────────────────────
do $$
declare v_answer text;
begin
  perform pg_temp.as_user('00000000-0000-0000-0000-0000009b0100');
  set local role authenticated;
  v_answer := pg_temp.try_book(pg_temp.payload('confirmed'));
  reset role;
  perform pg_temp.t('G2  staff without a reason are asked for one',
    v_answer = '22023 form_override_reason_required', v_answer);
end $$;

-- ── G3 ────────────────────────────────────────────────────────────────────
do $$
declare v_answer text; v_override record;
begin
  perform pg_temp.as_user('00000000-0000-0000-0000-0000009b0100');
  set local role authenticated;
  v_answer := pg_temp.try_book(pg_temp.payload('confirmed', '  Completing it at drop-off  '));
  reset role;
  select o.reason, o.created_by, o.form_id, o.stage into v_override
    from public.form_requirement_overrides o
    join public.bookings b on b.id = o.booking_id
   where b.client_id = '00000000-0000-0000-0000-0000009b0040';
  perform pg_temp.t('G3  staff with a reason book, and the override is saved',
    v_answer like 'OK %'
      and v_override.reason = 'Completing it at drop-off'
      and v_override.created_by = '00000000-0000-0000-0000-0000009b0100'
      and v_override.form_id = '00000000-0000-0000-0000-0000009b0060'
      and v_override.stage = 'before_booking',
    format('answer=%s override=%s', v_answer, row_to_json(v_override)));
end $$;

-- ── G4 ────────────────────────────────────────────────────────────────────
insert into public.form_submissions
  (facility_id, form_version_id, form_id, client_id, answers, status)
values ('00000000-0000-0000-0000-0000009b0020', '00000000-0000-0000-0000-0000009b0070',
        '00000000-0000-0000-0000-0000009b0060', '00000000-0000-0000-0000-0000009b0040',
        '{}'::jsonb, 'submitted');

do $$
declare v_answer text;
begin
  perform pg_temp.as_user('00000000-0000-0000-0000-0000009b0101');
  set local role authenticated;
  v_answer := pg_temp.try_book(pg_temp.payload('request_submitted'));
  reset role;
  perform pg_temp.t('G4  with the form submitted, the customer''s booking goes through',
    v_answer like 'OK %', v_answer);
end $$;

-- ── G5 ────────────────────────────────────────────────────────────────────
update public.form_submissions set status = 'archived'
 where client_id = '00000000-0000-0000-0000-0000009b0040';
select pg_temp.require('warn');

do $$
declare v_answer text; v_overrides_before int; v_overrides_after int;
begin
  select count(*) into v_overrides_before from public.form_requirement_overrides o
    join public.bookings b on b.id = o.booking_id
   where b.client_id = '00000000-0000-0000-0000-0000009b0040';
  perform pg_temp.as_user('00000000-0000-0000-0000-0000009b0100');
  set local role authenticated;
  v_answer := pg_temp.try_book(pg_temp.payload('confirmed'));
  reset role;
  select count(*) into v_overrides_after from public.form_requirement_overrides o
    join public.bookings b on b.id = o.booking_id
   where b.client_id = '00000000-0000-0000-0000-0000009b0040';
  perform pg_temp.t('G5  a warning never refuses and records no override',
    v_answer like 'OK %' and v_overrides_after = v_overrides_before,
    format('answer=%s overrides %s -> %s', v_answer, v_overrides_before, v_overrides_after));
end $$;

-- ── G6 ────────────────────────────────────────────────────────────────────
do $$
declare v_customer int; v_stranger int;
begin
  perform pg_temp.as_user('00000000-0000-0000-0000-0000009b0101');
  set local role authenticated;
  select count(*) into v_customer from public.client_missing_forms(
    '00000000-0000-0000-0000-0000009b0040',
    array['00000000-0000-0000-0000-0000009b0050']::uuid[], 'daycare', 'before_booking');
  reset role;

  perform pg_temp.as_user('00000000-0000-0000-0000-0000009b0102');
  set local role authenticated;
  select count(*) into v_stranger from public.client_missing_forms(
    '00000000-0000-0000-0000-0000009b0040',
    array['00000000-0000-0000-0000-0000009b0050']::uuid[], 'daycare', 'before_booking');
  reset role;

  perform pg_temp.t('G6  the customer sees their own gap, a stranger nothing, anon neither function',
    v_customer = 1 and v_stranger = 0
      and not has_function_privilege('anon', 'public.client_missing_forms(uuid,uuid[],text,text)', 'execute')
      and not has_function_privilege('anon', 'private.record_form_overrides(uuid,text,text)', 'execute'),
    format('customer=%s stranger=%s', v_customer, v_stranger));
end $$;

-- ── G7 / G8: approval and check-in overrides ─────────────────────────────
-- A check-in requirement set to block, on the booking G5 made.
insert into public.facility_settings (facility_id, domain, value)
values ('00000000-0000-0000-0000-0000009b0020', 'form_requirements', jsonb_build_object(
  'services', jsonb_build_array(jsonb_build_object(
    'serviceType', 'daycare', 'serviceLabel', 'Daycare',
    'requirements', jsonb_build_array(jsonb_build_object(
      'formId', '00000000-0000-0000-0000-0000009b0060', 'formName', 'Gate Intake',
      'enabled', true,
      'gates', jsonb_build_array(jsonb_build_object(
        'stage', 'before_checkin', 'enforcement', 'block'))))))))
on conflict (facility_id, domain) do update set value = excluded.value;

do $$
declare
  v_booking uuid;
  v_stranger text; v_owner integer; v_owner_booking_stage text; v_saved int;
begin
  select id into v_booking from public.bookings
   where client_id = '00000000-0000-0000-0000-0000009b0040'
   order by created_at desc limit 1;

  perform pg_temp.as_user('00000000-0000-0000-0000-0000009b0102');
  set local role authenticated;
  begin
    perform public.record_form_requirement_override(v_booking, 'before_checkin', 'no reason to trust');
    v_stranger := 'ALLOWED';
  exception when others then v_stranger := sqlstate;
  end;
  reset role;

  perform pg_temp.as_user('00000000-0000-0000-0000-0000009b0100');
  set local role authenticated;
  v_owner := public.record_form_requirement_override(v_booking, 'before_checkin', 'Owner vouched at the door');
  begin
    perform public.record_form_requirement_override(v_booking, 'before_booking', 'wrong door');
    v_owner_booking_stage := 'ALLOWED';
  exception when others then v_owner_booking_stage := sqlstate;
  end;
  reset role;

  select count(*) into v_saved from public.form_requirement_overrides
   where booking_id = v_booking and stage = 'before_checkin'
     and reason = 'Owner vouched at the door';

  perform pg_temp.t('G7  a stranger cannot record a check-in override',
    v_stranger = '42501', v_stranger);
  perform pg_temp.t('G8  staff record one at check-in; the before-booking stage is not theirs to write here',
    v_owner = 1 and v_saved = 1 and v_owner_booking_stage = '22023',
    format('owner=%s saved=%s booking_stage=%s', v_owner, v_saved, v_owner_booking_stage));
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
