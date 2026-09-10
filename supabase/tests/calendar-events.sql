-- ============================================================================
-- A calendar event is the facility's, readable by its staff, written by the
-- people who run the calendar, and never hard-deleted (20260910223523).
--
--   bun run test:sql calendar-events
--
-- One transaction, rolled back. Fixture emails are @example.invalid.
--
--   C1  a manager writes an event
--   C2  a caretaker reads it — a closure is for everybody
--   C3  a caretaker cannot write one (manage_booking_calendar)
--   C4  another facility's manager cannot read it
--   C5  another facility's manager cannot change it — zero rows, not an error
--   C6  a private event is read by its author and nobody else
--   C7  an edit cannot move an event to another facility or re-author it
--   C8  nobody signed in can hard-delete one; anon holds nothing
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
  ('00000000-0000-0000-0000-0000009c0010', 'Cal Org', 'cal-org')
on conflict do nothing;

insert into public.facilities (id, org_id, name, slug, legacy_id) values
  ('00000000-0000-0000-0000-0000009c0020', '00000000-0000-0000-0000-0000009c0010',
   'Cal Facility A', 'cal-a', 'cal-a'),
  ('00000000-0000-0000-0000-0000009c0021', '00000000-0000-0000-0000-0000009c0010',
   'Cal Facility B', 'cal-b', 'cal-b')
on conflict do nothing;

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000009c0100', 'cal-mgr@example.invalid'),
  ('00000000-0000-0000-0000-0000009c0101', 'cal-care@example.invalid'),
  ('00000000-0000-0000-0000-0000009c0102', 'cal-other@example.invalid')
on conflict do nothing;

insert into public.profiles (id, email, full_name) values
  ('00000000-0000-0000-0000-0000009c0100', 'cal-mgr@example.invalid', 'Mina Manager'),
  ('00000000-0000-0000-0000-0000009c0101', 'cal-care@example.invalid', 'Cal Caretaker'),
  ('00000000-0000-0000-0000-0000009c0102', 'cal-other@example.invalid', 'Otto Other')
on conflict do nothing;

insert into public.facility_memberships (facility_id, profile_id, role) values
  ('00000000-0000-0000-0000-0000009c0020', '00000000-0000-0000-0000-0000009c0100', 'manager'),
  ('00000000-0000-0000-0000-0000009c0020', '00000000-0000-0000-0000-0000009c0101', 'caretaker'),
  ('00000000-0000-0000-0000-0000009c0021', '00000000-0000-0000-0000-0000009c0102', 'manager')
on conflict do nothing;

-- ── C1 ────────────────────────────────────────────────────────────────────
do $$
declare v_state text;
begin
  perform pg_temp.as_user('00000000-0000-0000-0000-0000009c0100');
  set local role authenticated;
  begin
    insert into public.calendar_events
      (facility_id, kind, title, starts_at, ends_at, created_by_name)
    values
      ('00000000-0000-0000-0000-0000009c0020', 'custom-event', 'Staff meeting',
       now(), now() + interval '1 hour', 'Mina Manager');
    insert into public.calendar_events
      (facility_id, kind, title, starts_at, ends_at, private_to)
    values
      ('00000000-0000-0000-0000-0000009c0020', 'custom-event', 'Dentist',
       now(), now() + interval '1 hour', '00000000-0000-0000-0000-0000009c0100');
    v_state := 'written';
  exception when others then
    v_state := sqlstate || ' ' || sqlerrm;
  end;
  reset role;
  perform pg_temp.t('C1  a manager writes an event', v_state = 'written', v_state);
end $$;

-- ── C2, C3, C6 as the caretaker ───────────────────────────────────────────
do $$
declare n int; v_state text := 'none'; v_private int;
begin
  perform pg_temp.as_user('00000000-0000-0000-0000-0000009c0101');
  set local role authenticated;
  select count(*) into n from public.calendar_events where title = 'Staff meeting';
  select count(*) into v_private from public.calendar_events where title = 'Dentist';
  begin
    insert into public.calendar_events
      (facility_id, kind, title, starts_at, ends_at)
    values
      ('00000000-0000-0000-0000-0000009c0020', 'block-time', 'Caretaker block',
       now(), now() + interval '1 hour');
    v_state := 'written';
  exception when others then
    v_state := sqlstate;
  end;
  reset role;
  perform pg_temp.t('C2  a caretaker reads the facility''s event', n = 1, n || ' rows');
  perform pg_temp.t('C3  a caretaker cannot write one', v_state = '42501', v_state);
  perform pg_temp.t('C6  a private event is not read by a colleague', v_private = 0,
    v_private || ' rows');
end $$;

do $$
declare n int;
begin
  perform pg_temp.as_user('00000000-0000-0000-0000-0000009c0100');
  set local role authenticated;
  select count(*) into n from public.calendar_events where title = 'Dentist';
  reset role;
  perform pg_temp.t('C6b and is read by its author', n = 1, n || ' rows');
end $$;

-- ── C4, C5 as another facility's manager ──────────────────────────────────
do $$
declare n int; v_rows int;
begin
  perform pg_temp.as_user('00000000-0000-0000-0000-0000009c0102');
  set local role authenticated;
  select count(*) into n from public.calendar_events
   where facility_id = '00000000-0000-0000-0000-0000009c0020';
  update public.calendar_events set title = 'Hijacked'
   where facility_id = '00000000-0000-0000-0000-0000009c0020';
  get diagnostics v_rows = row_count;
  reset role;
  perform pg_temp.t('C4  another facility''s manager cannot read it', n = 0, n || ' rows');
  perform pg_temp.t('C5  and cannot change it', v_rows = 0, v_rows || ' rows changed');
end $$;

-- ── C7 ────────────────────────────────────────────────────────────────────
do $$
declare v_facility uuid; v_author text;
begin
  perform pg_temp.as_user('00000000-0000-0000-0000-0000009c0100');
  set local role authenticated;
  update public.calendar_events
     set facility_id = '00000000-0000-0000-0000-0000009c0021',
         created_by = 'somebody-else',
         title = 'Staff meeting (moved)'
   where title = 'Staff meeting';
  reset role;
  select facility_id, created_by into v_facility, v_author
    from public.calendar_events where title = 'Staff meeting (moved)';
  perform pg_temp.t('C7  an edit keeps the facility and the author',
    v_facility = '00000000-0000-0000-0000-0000009c0020'
      and v_author = '00000000-0000-0000-0000-0000009c0100',
    coalesce(v_facility::text, 'null') || ' / ' || coalesce(v_author, 'null'));
end $$;

-- ── C8 ────────────────────────────────────────────────────────────────────
do $$
begin
  perform pg_temp.t('C8  nobody signed in can hard-delete; anon holds nothing',
    not has_table_privilege('authenticated', 'public.calendar_events', 'delete')
    and not has_table_privilege('anon', 'public.calendar_events', 'select')
    and not has_table_privilege('anon', 'public.calendar_events', 'insert'),
    'a privilege is still granted');
end $$;

select n, name, ok, detail from tap order by n;

rollback;
