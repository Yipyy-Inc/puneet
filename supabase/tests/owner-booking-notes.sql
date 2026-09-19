-- ============================================================================
-- A customer can leave a note on their booking, or ask to change its dates
-- (a_customer_can_leave_a_note_on_their_booking).
--
--   O  the owner adds a note and a date-change request to their own booking;
--      each is a shared booking note under the client's name, and they read
--      it back
--   V  empty text and an unknown kind are refused
--   C  a closed booking takes no note; the eleventh in a day is refused
--   N  someone else's booking is not found
--   F  staff cannot make a note look like the client wrote it
--   P  anon cannot call it
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
  ('00000000-0000-0000-0000-0000004e1001', 'on-owner@example.invalid'),
  ('00000000-0000-0000-0000-0000004e1002', 'on-other@example.invalid'),
  ('00000000-0000-0000-0000-0000004e1003', 'on-staff@example.invalid')
on conflict (id) do nothing;

insert into public.profiles (id, email, full_name) values
  ('00000000-0000-0000-0000-0000004e1001', 'on-owner@example.invalid', 'ON Owner'),
  ('00000000-0000-0000-0000-0000004e1002', 'on-other@example.invalid', 'ON Other'),
  ('00000000-0000-0000-0000-0000004e1003', 'on-staff@example.invalid', 'ON Staff')
on conflict (id) do update set full_name = excluded.full_name;

insert into public.orgs (id, name, slug) values
  ('00000000-0000-0000-0000-0000004e1010', 'ON Org', 'on-org')
on conflict do nothing;

insert into public.facilities (id, org_id, name, slug, legacy_id) values
  ('00000000-0000-0000-0000-0000004e1020', '00000000-0000-0000-0000-0000004e1010',
   'ON Facility', 'on-a', 'on-a')
on conflict do nothing;

insert into public.facility_memberships (id, facility_id, profile_id, role, is_active) values
  ('00000000-0000-0000-0000-0000004e1030', '00000000-0000-0000-0000-0000004e1020',
   '00000000-0000-0000-0000-0000004e1003', 'owner', true)
on conflict (id) do nothing;

insert into public.clients (id, facility_id, profile_id, name, email) values
  ('00000000-0000-0000-0000-0000004e1040', '00000000-0000-0000-0000-0000004e1020',
   '00000000-0000-0000-0000-0000004e1001', 'Olive Owner', 'on-owner@example.invalid'),
  ('00000000-0000-0000-0000-0000004e1041', '00000000-0000-0000-0000-0000004e1020',
   '00000000-0000-0000-0000-0000004e1002', 'Otto Other', 'on-other@example.invalid');

insert into public.bookings (id, facility_id, client_id, service, status, start_at, end_at) values
  ('00000000-0000-0000-0000-0000004e1051', '00000000-0000-0000-0000-0000004e1020',
   '00000000-0000-0000-0000-0000004e1040', 'boarding', 'confirmed',
   now() + interval '10 days', now() + interval '13 days'),
  ('00000000-0000-0000-0000-0000004e1052', '00000000-0000-0000-0000-0000004e1020',
   '00000000-0000-0000-0000-0000004e1040', 'daycare', 'cancelled',
   now() + interval '5 days', now() + interval '5 days 8 hours'),
  ('00000000-0000-0000-0000-0000004e1053', '00000000-0000-0000-0000-0000004e1020',
   '00000000-0000-0000-0000-0000004e1041', 'daycare', 'confirmed',
   now() + interval '5 days', now() + interval '5 days 8 hours');

create temp table r as
  select right(id::text, 1)::int as k, ref from public.bookings
   where id::text like '00000000-0000-0000-0000-0000004e105_';
grant select on r to authenticated;

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

select pg_temp.as_user('00000000-0000-0000-0000-0000004e1001');
set local role authenticated;

select pg_temp.t('O1  the owner leaves a note on their booking',
  public.add_owner_booking_note((select ref from r where k = 1), 'note',
    '  She is shy with big dogs  ') is not null);

select pg_temp.t('O2  … and asks to change its dates',
  public.add_owner_booking_note((select ref from r where k = 1), 'change_dates',
    'Could we come a day later?') is not null);

select pg_temp.t('O3  the owner reads both back, shared, under their own name',
  (select count(*) from public.notes
    where entity_id = '00000000-0000-0000-0000-0000004e1051'
      and visibility = 'shared_with_customer'
      and created_by_name = 'Olive Owner'
      and customer_request in ('note', 'change_dates')) = 2);

select pg_temp.t('V1  empty text is refused',
  pg_temp.refusal($q$select public.add_owner_booking_note(
    (select ref from r where k = 1), 'note', '   ')$q$) = '22023');

select pg_temp.t('V2  an unknown kind is refused',
  pg_temp.refusal($q$select public.add_owner_booking_note(
    (select ref from r where k = 1), 'refund_me', 'hello')$q$) = '22023');

select pg_temp.t('C1  a cancelled booking takes no note',
  pg_temp.refusal($q$select public.add_owner_booking_note(
    (select ref from r where k = 2), 'note', 'hello')$q$) = '55000');

select pg_temp.t('N1  someone else''s booking is not found',
  pg_temp.refusal($q$select public.add_owner_booking_note(
    (select ref from r where k = 3), 'note', 'hello')$q$) = 'P0002');

-- Eight more reach ten today; the eleventh is refused.
select public.add_owner_booking_note((select ref from r where k = 1), 'note', 'n' || g)
  from generate_series(1, 8) g;
select pg_temp.t('C2  the eleventh note in a day is refused',
  pg_temp.refusal($q$select public.add_owner_booking_note(
    (select ref from r where k = 1), 'note', 'one more')$q$) = '54000');
reset role;

select pg_temp.t('O4  the note keeps its words trimmed',
  exists (select 1 from public.notes
           where entity_id = '00000000-0000-0000-0000-0000004e1051'
             and content = 'She is shy with big dogs'
             and created_by = '00000000-0000-0000-0000-0000004e1001'));

-- ── Staff cannot put words in the client's mouth ──────────────────────────
select pg_temp.as_user('00000000-0000-0000-0000-0000004e1003');
set local role authenticated;
insert into public.notes (facility_id, category, entity_id, content, visibility, customer_request)
values ('00000000-0000-0000-0000-0000004e1020', 'booking',
        '00000000-0000-0000-0000-0000004e1051', 'staff wrote this',
        'internal', 'change_dates');
update public.notes set customer_request = null
 where entity_id = '00000000-0000-0000-0000-0000004e1051'
   and content = 'She is shy with big dogs';
reset role;

select pg_temp.t('F1  a staff note cannot claim the client asked',
  (select customer_request from public.notes
    where content = 'staff wrote this') is null);
select pg_temp.t('F2  … nor can staff unmark one the client wrote',
  (select customer_request from public.notes
    where content = 'She is shy with big dogs') = 'note');

select pg_temp.t('P1  anon cannot call it',
  not has_function_privilege('anon',
    'public.add_owner_booking_note(bigint,text,text)', 'execute'));

select case when ok then '  PASS  ' else '> FAIL <' end as result, name, detail
  from tap order by n;

select count(*) filter (where ok) || ' passed, '
    || count(*) filter (where not ok) || ' failed' as summary
  from tap;

rollback;
