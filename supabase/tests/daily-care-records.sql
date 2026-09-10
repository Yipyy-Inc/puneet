-- ============================================================================
-- What a shift leaves for the next one outlives the tab, stays in its
-- facility, and a flag is one flag (20260910230626).
--
--   bun run test:sql daily-care-records
--
-- One transaction, rolled back. Fixture emails are @example.invalid.
--
--   D1  a caretaker leaves a shift note, flags a pet and records a head count
--   D2  a second flag on the same pet the same day is refused — one flag
--   D3  another facility's staff cannot read any of it
--   D4  and cannot write into this facility
--   D5  a flag can be taken down; a shift note and a head count cannot
--   D6  an edit cannot move a record to another facility or change its kind
--   D7  anon holds nothing
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

insert into public.orgs (id, name, slug) values
  ('00000000-0000-0000-0000-0000009d0010', 'Care Org', 'dcr-org')
on conflict do nothing;

insert into public.facilities (id, org_id, name, slug, legacy_id) values
  ('00000000-0000-0000-0000-0000009d0020', '00000000-0000-0000-0000-0000009d0010',
   'Care Facility A', 'dcr-a', 'dcr-a'),
  ('00000000-0000-0000-0000-0000009d0021', '00000000-0000-0000-0000-0000009d0010',
   'Care Facility B', 'dcr-b', 'dcr-b')
on conflict do nothing;

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000009d0100', 'dcr-care@example.invalid'),
  ('00000000-0000-0000-0000-0000009d0101', 'dcr-other@example.invalid')
on conflict do nothing;

insert into public.profiles (id, email, full_name) values
  ('00000000-0000-0000-0000-0000009d0100', 'dcr-care@example.invalid', 'Dana Caretaker'),
  ('00000000-0000-0000-0000-0000009d0101', 'dcr-other@example.invalid', 'Olle Other')
on conflict do nothing;

insert into public.facility_memberships (facility_id, profile_id, role) values
  ('00000000-0000-0000-0000-0000009d0020', '00000000-0000-0000-0000-0000009d0100', 'caretaker'),
  ('00000000-0000-0000-0000-0000009d0021', '00000000-0000-0000-0000-0000009d0101', 'manager')
on conflict do nothing;

-- ── D1, D2 ────────────────────────────────────────────────────────────────
do $$
declare v_state text; v_second text := 'none';
begin
  perform pg_temp.as_user('00000000-0000-0000-0000-0000009d0100');
  set local role authenticated;
  begin
    insert into public.daily_care_records (facility_id, occurred_on, kind, subject, payload)
    values
      ('00000000-0000-0000-0000-0000009d0020', current_date, 'shift_note', '',
       '{"text": "Luna skipped breakfast, try again at 10"}'),
      ('00000000-0000-0000-0000-0000009d0020', current_date, 'pet_flag', '4127',
       '{"reason": "Limping on the left hind"}'),
      ('00000000-0000-0000-0000-0000009d0020', current_date, 'head_count', 'step-am',
       '{"total": 12, "inside": 12}');
    v_state := 'written';
  exception when others then
    v_state := sqlstate || ' ' || sqlerrm;
  end;
  begin
    insert into public.daily_care_records (facility_id, occurred_on, kind, subject)
    values ('00000000-0000-0000-0000-0000009d0020', current_date, 'pet_flag', '4127');
    v_second := 'written';
  exception when unique_violation then
    v_second := '23505';
  end;
  reset role;
  perform pg_temp.t('D1  a caretaker writes a note, a flag and a head count',
    v_state = 'written', v_state);
  perform pg_temp.t('D2  a second flag on the same pet the same day is refused',
    v_second = '23505', v_second);
end $$;

-- ── D3, D4 ────────────────────────────────────────────────────────────────
do $$
declare n int; v_state text := 'none';
begin
  perform pg_temp.as_user('00000000-0000-0000-0000-0000009d0101');
  set local role authenticated;
  select count(*) into n from public.daily_care_records
   where facility_id = '00000000-0000-0000-0000-0000009d0020';
  begin
    insert into public.daily_care_records (facility_id, occurred_on, kind, subject)
    values ('00000000-0000-0000-0000-0000009d0020', current_date, 'shift_note', '');
    v_state := 'written';
  exception when others then
    v_state := sqlstate;
  end;
  reset role;
  perform pg_temp.t('D3  another facility''s staff cannot read it', n = 0, n || ' rows');
  perform pg_temp.t('D4  and cannot write into this facility', v_state = '42501', v_state);
end $$;

-- ── D5 ────────────────────────────────────────────────────────────────────
do $$
declare v_flag int; v_note int;
begin
  perform pg_temp.as_user('00000000-0000-0000-0000-0000009d0100');
  set local role authenticated;
  delete from public.daily_care_records where kind = 'pet_flag' and subject = '4127';
  get diagnostics v_flag = row_count;
  delete from public.daily_care_records where kind in ('shift_note', 'head_count')
     and facility_id = '00000000-0000-0000-0000-0000009d0020';
  get diagnostics v_note = row_count;
  reset role;
  perform pg_temp.t('D5  a flag comes down; a note and a count do not',
    v_flag = 1 and v_note = 0, v_flag || ' flag, ' || v_note || ' others');
end $$;

-- ── D6 ────────────────────────────────────────────────────────────────────
do $$
declare v_facility uuid; v_kind text;
begin
  perform pg_temp.as_user('00000000-0000-0000-0000-0000009d0100');
  set local role authenticated;
  update public.daily_care_records
     set facility_id = '00000000-0000-0000-0000-0000009d0021',
         kind = 'pet_flag', subject = 'x'
   where kind = 'shift_note';
  reset role;
  select facility_id, kind into v_facility, v_kind
    from public.daily_care_records where subject = 'x';
  perform pg_temp.t('D6  an edit keeps the facility and the kind',
    v_facility = '00000000-0000-0000-0000-0000009d0020' and v_kind = 'shift_note',
    coalesce(v_facility::text, 'null') || ' / ' || coalesce(v_kind, 'null'));
end $$;

-- ── D7 ────────────────────────────────────────────────────────────────────
do $$
begin
  perform pg_temp.t('D7  anon holds nothing',
    not has_table_privilege('anon', 'public.daily_care_records', 'select')
    and not has_table_privilege('anon', 'public.daily_care_records', 'insert'),
    'anon can reach the table');
end $$;

select n, name, ok, detail from tap order by n;

rollback;
