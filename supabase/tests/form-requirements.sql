-- ============================================================================
-- A required form is a question the database answers
-- (a_required_form_is_a_question_the_database_answers).
--
--   bun run test:sql form-requirements
--
-- One transaction, rolled back. Fixture emails are @example.invalid.
--
--   R1  a service with no requirement is missing nothing
--   R2  a blocking form nobody has answered is missing; an unpublished one is
--       not listed, because nobody could answer it
--   R3  a submitted answer satisfies it
--   R4  a draft or archived answer does not
--   R5  a per-pet form applies to the booked pets of the named species only,
--       case-insensitively, and carries its enforcement
--   R6  that pet's own answer satisfies it; another pet's does not
--   R7  another client's answer to the same form does not count
--   R8  booking_missing_forms: the customer sees their own booking's gaps, a
--       stranger sees nothing, an unknown stage returns nothing
--   R9  grants: anon executes neither; nobody writes overrides directly
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
  ('00000000-0000-0000-0000-0000009a0010', 'Req Org', 'req-org')
on conflict do nothing;

insert into public.facilities (id, org_id, name, slug, legacy_id, timezone) values
  ('00000000-0000-0000-0000-0000009a0020', '00000000-0000-0000-0000-0000009a0010',
   'Req Facility', 'req-a', 'req-a', 'America/Toronto')
on conflict do nothing;

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000009a0100', 'req-customer@example.invalid'),
  ('00000000-0000-0000-0000-0000009a0101', 'req-stranger@example.invalid')
on conflict do nothing;

insert into public.profiles (id, email, full_name) values
  ('00000000-0000-0000-0000-0000009a0100', 'req-customer@example.invalid', 'Rae Customer'),
  ('00000000-0000-0000-0000-0000009a0101', 'req-stranger@example.invalid', 'Ray Stranger')
on conflict do nothing;

insert into public.clients (id, facility_id, name, email, profile_id) values
  ('00000000-0000-0000-0000-0000009a0040', '00000000-0000-0000-0000-0000009a0020',
   'Rae Customer', 'req-customer@example.invalid', '00000000-0000-0000-0000-0000009a0100'),
  ('00000000-0000-0000-0000-0000009a0041', '00000000-0000-0000-0000-0000009a0020',
   'Other Client', 'req-other@example.invalid', null);

insert into public.pets (id, facility_id, client_id, name, species) values
  ('00000000-0000-0000-0000-0000009a0050', '00000000-0000-0000-0000-0000009a0020',
   '00000000-0000-0000-0000-0000009a0040', 'Rex', 'Dog'),
  ('00000000-0000-0000-0000-0000009a0051', '00000000-0000-0000-0000-0000009a0020',
   '00000000-0000-0000-0000-0000009a0040', 'Tom', 'cat');

-- Intake: once per client. Temperament: once per pet. Draft: never published.
insert into public.forms (id, facility_id, name, slug, status, audience, repeat_per_pet) values
  ('00000000-0000-0000-0000-0000009a0060', '00000000-0000-0000-0000-0000009a0020',
   'Intake', 'req-intake', 'published', 'customer', false),
  ('00000000-0000-0000-0000-0000009a0061', '00000000-0000-0000-0000-0000009a0020',
   'Temperament', 'req-temperament', 'published', 'customer', true),
  ('00000000-0000-0000-0000-0000009a0062', '00000000-0000-0000-0000-0000009a0020',
   'Unfinished', 'req-unfinished', 'draft', 'customer', false);

insert into public.form_versions (id, form_id, facility_id, version_number, schema, published_at) values
  ('00000000-0000-0000-0000-0000009a0070', '00000000-0000-0000-0000-0000009a0060',
   '00000000-0000-0000-0000-0000009a0020', 1, '{"questions":[]}'::jsonb, now()),
  ('00000000-0000-0000-0000-0000009a0071', '00000000-0000-0000-0000-0000009a0061',
   '00000000-0000-0000-0000-0000009a0020', 1, '{"questions":[]}'::jsonb, now()),
  ('00000000-0000-0000-0000-0000009a0072', '00000000-0000-0000-0000-0000009a0062',
   '00000000-0000-0000-0000-0000009a0020', 1, '{"questions":[]}'::jsonb, null);

insert into public.facility_settings (facility_id, domain, value) values
  ('00000000-0000-0000-0000-0000009a0020', 'form_requirements', jsonb_build_object(
    'services', jsonb_build_array(jsonb_build_object(
      'serviceType', 'daycare', 'serviceLabel', 'Daycare',
      'requirements', jsonb_build_array(
        jsonb_build_object('formId', '00000000-0000-0000-0000-0000009a0060',
          'formName', 'Intake', 'enabled', true,
          'gates', jsonb_build_array(jsonb_build_object('stage', 'before_booking', 'enforcement', 'block'))),
        jsonb_build_object('formId', '00000000-0000-0000-0000-0000009a0061',
          'formName', 'Temperament', 'enabled', true, 'petTypes', jsonb_build_array('dog'),
          'gates', jsonb_build_array(jsonb_build_object('stage', 'before_checkin', 'enforcement', 'warn'))),
        jsonb_build_object('formId', '00000000-0000-0000-0000-0000009a0062',
          'formName', 'Unfinished', 'enabled', true,
          'gates', jsonb_build_array(jsonb_build_object('stage', 'before_booking', 'enforcement', 'block')))
      )))))
on conflict (facility_id, domain) do update set value = excluded.value;

insert into public.bookings
  (id, facility_id, client_id, service, status, start_at, end_at, base_price, discount, total_cost)
values
  ('00000000-0000-0000-0000-0000009a0080', '00000000-0000-0000-0000-0000009a0020',
   '00000000-0000-0000-0000-0000009a0040', 'daycare', 'confirmed',
   now() + interval '1 day', now() + interval '1 day 8 hours', 40, 0, 40);

insert into public.booking_pets (booking_id, pet_id) values
  ('00000000-0000-0000-0000-0000009a0080', '00000000-0000-0000-0000-0000009a0050'),
  ('00000000-0000-0000-0000-0000009a0080', '00000000-0000-0000-0000-0000009a0051');

create or replace function pg_temp.missing(p_service text, p_stage text) returns text language sql as $$
  select coalesce(string_agg(form_slug || coalesce(':' || pet_id::text, '') || '/' || enforcement,
                             ',' order by form_slug, pet_id), '')
    from private.missing_required_forms(
      '00000000-0000-0000-0000-0000009a0020', '00000000-0000-0000-0000-0000009a0040',
      array['00000000-0000-0000-0000-0000009a0050', '00000000-0000-0000-0000-0000009a0051']::uuid[],
      p_service, p_stage);
$$;

create or replace function pg_temp.submit(p_form text, p_version text, p_client text, p_pet text, p_status text)
returns void language sql as $$
  insert into public.form_submissions
    (facility_id, form_version_id, form_id, client_id, pet_id, answers, status)
  values ('00000000-0000-0000-0000-0000009a0020', p_version::uuid, p_form::uuid,
          p_client::uuid, p_pet::uuid, '{}'::jsonb, p_status);
$$;

-- ── R1 ────────────────────────────────────────────────────────────────────
select pg_temp.t('R1  a service with no requirement is missing nothing',
  pg_temp.missing('grooming', 'before_booking') = '', pg_temp.missing('grooming', 'before_booking'));

-- ── R2 ────────────────────────────────────────────────────────────────────
select pg_temp.t('R2  the unanswered blocking form is missing; the unpublished one is not listed',
  pg_temp.missing('daycare', 'before_booking') = 'req-intake/block',
  pg_temp.missing('daycare', 'before_booking'));

-- ── R4 (before R3: these must not satisfy it) ─────────────────────────────
select pg_temp.submit('00000000-0000-0000-0000-0000009a0060', '00000000-0000-0000-0000-0000009a0070',
  '00000000-0000-0000-0000-0000009a0040', null, 'draft');
select pg_temp.t('R4  a draft answer does not satisfy it',
  pg_temp.missing('daycare', 'before_booking') = 'req-intake/block',
  pg_temp.missing('daycare', 'before_booking'));

-- ── R7 ────────────────────────────────────────────────────────────────────
select pg_temp.submit('00000000-0000-0000-0000-0000009a0060', '00000000-0000-0000-0000-0000009a0070',
  '00000000-0000-0000-0000-0000009a0041', null, 'submitted');
select pg_temp.t('R7  another client''s answer does not count',
  pg_temp.missing('daycare', 'before_booking') = 'req-intake/block',
  pg_temp.missing('daycare', 'before_booking'));

-- ── R3 ────────────────────────────────────────────────────────────────────
select pg_temp.submit('00000000-0000-0000-0000-0000009a0060', '00000000-0000-0000-0000-0000009a0070',
  '00000000-0000-0000-0000-0000009a0040', null, 'submitted');
select pg_temp.t('R3  a submitted answer satisfies it',
  pg_temp.missing('daycare', 'before_booking') = '',
  pg_temp.missing('daycare', 'before_booking'));

-- ── R5 ────────────────────────────────────────────────────────────────────
select pg_temp.t('R5  the per-pet form is asked of the dog only, as a warning',
  pg_temp.missing('daycare', 'before_checkin') = 'req-temperament:00000000-0000-0000-0000-0000009a0050/warn',
  pg_temp.missing('daycare', 'before_checkin'));

-- ── R6 ────────────────────────────────────────────────────────────────────
select pg_temp.submit('00000000-0000-0000-0000-0000009a0061', '00000000-0000-0000-0000-0000009a0071',
  '00000000-0000-0000-0000-0000009a0040', '00000000-0000-0000-0000-0000009a0051', 'submitted');
do $$
declare v_after_cat text; v_after_dog text;
begin
  v_after_cat := pg_temp.missing('daycare', 'before_checkin');
  perform pg_temp.submit('00000000-0000-0000-0000-0000009a0061', '00000000-0000-0000-0000-0000009a0071',
    '00000000-0000-0000-0000-0000009a0040', '00000000-0000-0000-0000-0000009a0050', 'submitted');
  v_after_dog := pg_temp.missing('daycare', 'before_checkin');
  perform pg_temp.t('R6  the cat''s answer leaves the dog missing; the dog''s own answer clears it',
    v_after_cat <> '' and v_after_dog = '',
    format('after cat=%s after dog=%s', v_after_cat, v_after_dog));
end $$;

-- ── R8 ────────────────────────────────────────────────────────────────────
-- A fresh form at check-in so there is a gap to see.
insert into public.facility_settings (facility_id, domain, value)
select facility_id, domain,
       jsonb_set(value, '{services,0,requirements,0,gates}',
         '[{"stage":"before_booking","enforcement":"block"},{"stage":"before_approval","enforcement":"block"}]'::jsonb)
  from public.facility_settings
 where facility_id = '00000000-0000-0000-0000-0000009a0020' and domain = 'form_requirements'
on conflict (facility_id, domain) do update set value = excluded.value;

update public.form_submissions set status = 'archived'
 where client_id = '00000000-0000-0000-0000-0000009a0040'
   and form_id = '00000000-0000-0000-0000-0000009a0060';

do $$
declare v_customer int; v_stranger int; v_bad_stage int;
begin
  perform pg_temp.as_user('00000000-0000-0000-0000-0000009a0100');
  set local role authenticated;
  select count(*) into v_customer
    from public.booking_missing_forms('00000000-0000-0000-0000-0000009a0080', 'before_approval');
  select count(*) into v_bad_stage
    from public.booking_missing_forms('00000000-0000-0000-0000-0000009a0080', 'whenever');
  reset role;

  perform pg_temp.as_user('00000000-0000-0000-0000-0000009a0101');
  set local role authenticated;
  select count(*) into v_stranger
    from public.booking_missing_forms('00000000-0000-0000-0000-0000009a0080', 'before_approval');
  reset role;

  perform pg_temp.t('R8  the customer sees their gap (an archived answer is no answer); a stranger and an unknown stage see nothing',
    v_customer = 1 and v_stranger = 0 and v_bad_stage = 0,
    format('customer=%s stranger=%s bad_stage=%s', v_customer, v_stranger, v_bad_stage));
end $$;

-- ── R9 ────────────────────────────────────────────────────────────────────
do $$
begin
  perform pg_temp.t('R9  anon executes neither function, and nobody writes an override directly',
    not has_function_privilege('anon', 'private.missing_required_forms(uuid,uuid,uuid[],text,text)', 'execute')
      and not has_function_privilege('anon', 'public.booking_missing_forms(uuid,text)', 'execute')
      and not has_table_privilege('anon', 'public.form_requirement_overrides', 'select')
      and not has_table_privilege('authenticated', 'public.form_requirement_overrides', 'insert')
      and not has_table_privilege('authenticated', 'public.form_requirement_overrides', 'update'),
    'a grant is wider than intended');
end $$;

-- ── R10 ───────────────────────────────────────────────────────────────────
do $$
begin
  perform pg_temp.t('R10 only the service role lists a facility''s staff to email',
    not has_function_privilege('anon', 'public.facility_staff_recipients(uuid)', 'execute')
      and not has_function_privilege('authenticated', 'public.facility_staff_recipients(uuid)', 'execute')
      and has_function_privilege('service_role', 'public.facility_staff_recipients(uuid)', 'execute'),
    'a grant is wider or narrower than intended');
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
