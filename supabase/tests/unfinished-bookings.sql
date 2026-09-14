-- ============================================================================
-- A booking a customer left partway is theirs to save and resume, and the
-- facility's to follow up (an_unfinished_booking_is_a_row).
--
--   bun run test:sql unfinished-bookings
--
-- One transaction, rolled back. Fixture emails are @example.invalid.
--
--   U1  a customer saves their own draft; the facility is the client's
--   U2  another customer reads none of it
--   U3  the customer cannot mark it contacted, or write the facility's notes
--   U4  staff with edit_bookings mark it contacted and add a note
--   U5  the customer marks it recovered when they come back and book
--   U6  anon holds nothing
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
  ('00000000-0000-0000-0000-0000009b0010', 'Unf Org', 'unf-org')
on conflict do nothing;

insert into public.facilities (id, org_id, name, slug, legacy_id) values
  ('00000000-0000-0000-0000-0000009b0020', '00000000-0000-0000-0000-0000009b0010',
   'Unf Facility', 'unf-a', 'unf-a')
on conflict do nothing;

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000009b0100', 'unf-owner@example.invalid'),
  ('00000000-0000-0000-0000-0000009b0101', 'unf-other@example.invalid'),
  ('00000000-0000-0000-0000-0000009b0102', 'unf-mgr@example.invalid')
on conflict do nothing;

insert into public.profiles (id, email, full_name) values
  ('00000000-0000-0000-0000-0000009b0100', 'unf-owner@example.invalid', 'Olive Owner'),
  ('00000000-0000-0000-0000-0000009b0101', 'unf-other@example.invalid', 'Otto Other'),
  ('00000000-0000-0000-0000-0000009b0102', 'unf-mgr@example.invalid', 'Mina Manager')
on conflict do nothing;

insert into public.clients (id, facility_id, name, email, profile_id) values
  ('00000000-0000-0000-0000-0000009b0040', '00000000-0000-0000-0000-0000009b0020',
   'Olive Owner', 'unf-owner@example.invalid', '00000000-0000-0000-0000-0000009b0100'),
  ('00000000-0000-0000-0000-0000009b0041', '00000000-0000-0000-0000-0000009b0020',
   'Otto Other', 'unf-other@example.invalid', '00000000-0000-0000-0000-0000009b0101');

insert into public.facility_memberships (facility_id, profile_id, role) values
  ('00000000-0000-0000-0000-0000009b0020', '00000000-0000-0000-0000-0000009b0102', 'manager')
on conflict do nothing;

-- ── U1 ────────────────────────────────────────────────────────────────────
do $$
declare v_state text := 'none'; v_facility uuid; v_status text;
begin
  perform pg_temp.as_user('00000000-0000-0000-0000-0000009b0100');
  set local role authenticated;
  begin
    -- A facility and a status in the request are both overwritten.
    insert into public.unfinished_bookings
      (facility_id, client_id, service, step, status, requested_start, draft)
    values
      ('00000000-0000-0000-0000-000000000bad', '00000000-0000-0000-0000-0000009b0040',
       'boarding', 'date_and_details', 'recovered', current_date + 7,
       '{"preSelectedService": "boarding"}')
    returning facility_id, status into v_facility, v_status;
    v_state := 'saved';
  exception when others then
    v_state := sqlstate || ' ' || sqlerrm;
  end;
  reset role;
  perform pg_temp.t('U1  a customer saves their draft on their own facility',
    v_state = 'saved' and v_facility = '00000000-0000-0000-0000-0000009b0020'
      and v_status = 'abandoned',
    format('%s facility=%s status=%s', v_state, v_facility, v_status));
end $$;

-- ── U2 ────────────────────────────────────────────────────────────────────
do $$
declare n int;
begin
  perform pg_temp.as_user('00000000-0000-0000-0000-0000009b0101');
  set local role authenticated;
  select count(*) into n from public.unfinished_bookings
   where client_id = '00000000-0000-0000-0000-0000009b0040';
  reset role;
  perform pg_temp.t('U2  another customer reads none of it', n = 0, n || ' rows');
end $$;

-- ── U3 ────────────────────────────────────────────────────────────────────
do $$
declare v_contacted text := 'none'; v_notes jsonb;
begin
  perform pg_temp.as_user('00000000-0000-0000-0000-0000009b0100');
  set local role authenticated;
  begin
    update public.unfinished_bookings set status = 'contacted'
     where client_id = '00000000-0000-0000-0000-0000009b0040';
    v_contacted := 'changed';
  exception when others then
    v_contacted := sqlstate;
  end;
  update public.unfinished_bookings
     set notes = '[{"id": "n1", "text": "I am staff, honest"}]'
   where client_id = '00000000-0000-0000-0000-0000009b0040';
  reset role;
  select notes into v_notes from public.unfinished_bookings
   where client_id = '00000000-0000-0000-0000-0000009b0040';
  perform pg_temp.t('U3  the customer cannot mark it contacted or write notes',
    v_contacted = '42501' and v_notes = '[]'::jsonb,
    format('contacted=%s notes=%s', v_contacted, v_notes));
end $$;

-- ── U4 ────────────────────────────────────────────────────────────────────
do $$
declare v_rows int; v_status text; v_contacted timestamptz; v_notes int;
begin
  perform pg_temp.as_user('00000000-0000-0000-0000-0000009b0102');
  set local role authenticated;
  with touched as (
    update public.unfinished_bookings
       set status = 'contacted',
           notes = '[{"id": "n1", "text": "Left a voicemail", "staffName": "Mina Manager"}]'
     where client_id = '00000000-0000-0000-0000-0000009b0040'
    returning 1
  ) select count(*) into v_rows from touched;
  reset role;
  select status, last_contacted_at, jsonb_array_length(notes)
    into v_status, v_contacted, v_notes
    from public.unfinished_bookings
   where client_id = '00000000-0000-0000-0000-0000009b0040';
  perform pg_temp.t('U4  staff mark it contacted and add a note',
    v_rows = 1 and v_status = 'contacted' and v_contacted is not null and v_notes = 1,
    format('rows=%s status=%s contacted=%s notes=%s', v_rows, v_status, v_contacted, v_notes));
end $$;

-- ── U5 ────────────────────────────────────────────────────────────────────
do $$
declare v_status text; v_recovered timestamptz; v_notes int;
begin
  perform pg_temp.as_user('00000000-0000-0000-0000-0000009b0100');
  set local role authenticated;
  update public.unfinished_bookings set status = 'recovered'
   where client_id = '00000000-0000-0000-0000-0000009b0040';
  reset role;
  select status, recovered_at, jsonb_array_length(notes)
    into v_status, v_recovered, v_notes
    from public.unfinished_bookings
   where client_id = '00000000-0000-0000-0000-0000009b0040';
  perform pg_temp.t('U5  the customer marks it recovered, and the notes stay',
    v_status = 'recovered' and v_recovered is not null and v_notes = 1,
    format('status=%s recovered=%s notes=%s', v_status, v_recovered, v_notes));
end $$;

-- ── U6 ────────────────────────────────────────────────────────────────────
do $$
begin
  perform pg_temp.t('U6  anon holds nothing',
    not has_table_privilege('anon', 'public.unfinished_bookings', 'select')
    and not has_table_privilege('anon', 'public.unfinished_bookings', 'insert'),
    'anon can reach the table');
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
