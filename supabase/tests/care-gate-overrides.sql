-- ============================================================================
-- Staff say why they check a pet out with today's care not logged
-- (staff_say_why_they_check_out_with_care_not_logged).
--
-- "Check out anyway" went ahead with a toast and kept nothing. The reason is
-- now required and kept, append-only, and the booking's history shows it.
--
--   O  a member who may check out records a reason; the row and a booking
--      history entry are written, with who gave it
--   V  an empty reason is refused
--   S  someone who is not staff at the facility is refused, the same as for a
--      booking that does not exist
--   A  nobody writes the table directly, or changes or removes a row
--   R  a member with view_bookings reads the reasons; one without reads none
-- ============================================================================

begin;

set local client_min_messages to warning;

create temp table tap (n serial, name text, ok boolean, detail text);
grant all on tap to authenticated;
grant usage on sequence tap_n_seq to authenticated;

create or replace function pg_temp.t(p_name text, p_ok boolean, p_detail text default '')
returns void language sql as $$
  insert into tap(name, ok, detail) values (p_name, p_ok, p_detail);
$$;

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000004c9001', 'cg-caretaker@example.invalid'),
  ('00000000-0000-0000-0000-0000004c9002', 'cg-sanitation@example.invalid'),
  ('00000000-0000-0000-0000-0000004c9003', 'cg-stranger@example.invalid')
on conflict (id) do nothing;

insert into public.profiles (id, email, full_name) values
  ('00000000-0000-0000-0000-0000004c9001', 'cg-caretaker@example.invalid', 'CG Caretaker'),
  ('00000000-0000-0000-0000-0000004c9002', 'cg-sanitation@example.invalid', 'CG Sanitation'),
  ('00000000-0000-0000-0000-0000004c9003', 'cg-stranger@example.invalid', 'CG Stranger')
on conflict (id) do update set full_name = excluded.full_name;

insert into public.orgs (id, name, slug) values
  ('00000000-0000-0000-0000-0000004c9010', 'CG Org', 'cg-org')
on conflict do nothing;

insert into public.facilities (id, org_id, name, slug, legacy_id) values
  ('00000000-0000-0000-0000-0000004c9020', '00000000-0000-0000-0000-0000004c9010',
   'CG Facility', 'cg-a', 'cg-a')
on conflict do nothing;

insert into public.facility_memberships (id, facility_id, profile_id, role, is_active) values
  ('00000000-0000-0000-0000-0000004c9030', '00000000-0000-0000-0000-0000004c9020',
   '00000000-0000-0000-0000-0000004c9001', 'caretaker', true),
  ('00000000-0000-0000-0000-0000004c9031', '00000000-0000-0000-0000-0000004c9020',
   '00000000-0000-0000-0000-0000004c9002', 'sanitation', true)
on conflict (id) do nothing;

insert into public.clients (id, facility_id, name, email) values
  ('00000000-0000-0000-0000-0000004c9040', '00000000-0000-0000-0000-0000004c9020',
   'CG Client', 'cg-c@example.invalid');

insert into public.bookings
  (id, facility_id, client_id, service, status, start_at, end_at,
   base_price, discount, total_cost)
values
  ('00000000-0000-0000-0000-0000004c9050', '00000000-0000-0000-0000-0000004c9020',
   '00000000-0000-0000-0000-0000004c9040', 'boarding', 'confirmed',
   now() + interval '20 days', now() + interval '22 days', 90, 0, 90);

create or replace function pg_temp.as_user(p_uid uuid) returns void
language plpgsql as $$
begin
  perform set_config('request.jwt.claims',
    case when p_uid is null then ''
         else json_build_object('sub', p_uid::text, 'role', 'authenticated')::text end,
    true);
end $$;

create or replace function pg_temp.refusal(p_sql text) returns text
language plpgsql as $$
begin
  execute p_sql;
  return 'accepted';
exception when others then
  return sqlstate;
end $$;

-- ── The caretaker checks out with the dinner not logged ────────────────────
select pg_temp.as_user('00000000-0000-0000-0000-0000004c9001');
set local role authenticated;

select pg_temp.t('O1  a caretaker records why',
  public.record_care_gate_override(
    '00000000-0000-0000-0000-0000004c9050',
    '  Owner fed him at pickup  ',
    '[{"kind":"feeding","label":"Dinner","critical":false},
      {"kind":"medication","label":"Apoquel 08:00","critical":true}]'::jsonb) is not null);

select pg_temp.t('V1  an empty reason is refused',
  pg_temp.refusal($q$select public.record_care_gate_override(
    '00000000-0000-0000-0000-0000004c9050', '   ', '[]'::jsonb)$q$) = '22023');

select pg_temp.t('A1  the table is not written directly',
  pg_temp.refusal($q$insert into public.care_gate_overrides
    (facility_id, booking_id, reason) values
    ('00000000-0000-0000-0000-0000004c9020',
     '00000000-0000-0000-0000-0000004c9050', 'direct')$q$) = '42501');

select pg_temp.t('A2  a reason is not changed afterwards',
  pg_temp.refusal($q$update public.care_gate_overrides set reason = 'edited'$q$) = '42501');

select pg_temp.t('A3  a reason is not removed afterwards',
  pg_temp.refusal($q$delete from public.care_gate_overrides$q$) = '42501');

select pg_temp.t('R1  the caretaker (view_bookings) reads it',
  (select count(*) from public.care_gate_overrides
    where booking_id = '00000000-0000-0000-0000-0000004c9050') = 1);
reset role;

select pg_temp.t('O2  the reason is kept trimmed, with its items and who gave it',
  exists (select 1 from public.care_gate_overrides
           where booking_id = '00000000-0000-0000-0000-0000004c9050'
             and reason = 'Owner fed him at pickup'
             and jsonb_array_length(items) = 2
             and has_critical
             and created_by = '00000000-0000-0000-0000-0000004c9001'));

select pg_temp.t('O3  the booking''s history shows it, by the caretaker',
  exists (select 1 from public.audit_log
           where entity_type = 'booking'
             and entity_id = '00000000-0000-0000-0000-0000004c9050'
             and action = 'Checked out with care not logged'
             and user_name = 'CG Caretaker'
             and severity = 'Medium'
             and changes @> '[{"field":"careGate","to":"Owner fed him at pickup"}]'));

-- ── Refusals ───────────────────────────────────────────────────────────────
select pg_temp.as_user('00000000-0000-0000-0000-0000004c9003');
set local role authenticated;
select pg_temp.t('S1  someone not on the staff is refused',
  pg_temp.refusal($q$select public.record_care_gate_override(
    '00000000-0000-0000-0000-0000004c9050', 'because', '[]'::jsonb)$q$) = '42501');
select pg_temp.t('S2  … the same as for a booking that does not exist',
  pg_temp.refusal($q$select public.record_care_gate_override(
    '00000000-0000-0000-0000-0000004c90ff', 'because', '[]'::jsonb)$q$) = '42501');
reset role;

select pg_temp.as_user('00000000-0000-0000-0000-0000004c9002');
set local role authenticated;
select pg_temp.t('R2  a member without view_bookings (sanitation) reads none',
  not exists (select 1 from public.care_gate_overrides
               where booking_id = '00000000-0000-0000-0000-0000004c9050'));
reset role;

select pg_temp.t('P1  anon cannot call it, authenticated can',
  not has_function_privilege('anon',
        'public.record_care_gate_override(uuid,text,jsonb)', 'execute')
  and has_function_privilege('authenticated',
        'public.record_care_gate_override(uuid,text,jsonb)', 'execute'));

select case when ok then '  PASS  ' else '> FAIL <' end as result, name, detail
  from tap order by n;

select count(*) filter (where ok) || ' passed, '
    || count(*) filter (where not ok) || ' failed' as summary
  from tap;

rollback;
