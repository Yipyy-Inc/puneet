-- ============================================================================
-- A booking's changes record themselves (a_bookings_changes_record_themselves).
--
-- Every booking page showed six invented "Change History" entries and nothing
-- recorded a real one. A trigger on public.bookings now writes audit_log
-- entries for what changed, and a policy lets the people who may see a booking
-- read its history.
--
--   H  a new booking and a status change are recorded, with who made them
--   M  a price change is its own Financial entry
--   N  an update that changes no watched column records nothing
--   R  who reads: a member with view_bookings reads the booking's history; its
--      Financial entries need view_booking_financials; a member without
--      view_bookings reads none of it
--   P  the trigger function is not callable by anon or authenticated
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
  ('00000000-0000-0000-0000-0000004b1001', 'bh-owner@example.invalid'),
  ('00000000-0000-0000-0000-0000004b1002', 'bh-caretaker@example.invalid'),
  ('00000000-0000-0000-0000-0000004b1003', 'bh-sanitation@example.invalid')
on conflict (id) do nothing;

insert into public.profiles (id, email, full_name) values
  ('00000000-0000-0000-0000-0000004b1001', 'bh-owner@example.invalid', 'BH Owner'),
  ('00000000-0000-0000-0000-0000004b1002', 'bh-caretaker@example.invalid', 'BH Caretaker'),
  ('00000000-0000-0000-0000-0000004b1003', 'bh-sanitation@example.invalid', 'BH Sanitation')
on conflict (id) do update set full_name = excluded.full_name;

insert into public.orgs (id, name, slug) values
  ('00000000-0000-0000-0000-0000004b1010', 'BH Org', 'bh-org')
on conflict do nothing;

insert into public.facilities (id, org_id, name, slug, legacy_id) values
  ('00000000-0000-0000-0000-0000004b1020', '00000000-0000-0000-0000-0000004b1010',
   'BH Facility', 'bh-a', 'bh-a')
on conflict do nothing;

insert into public.facility_memberships (id, facility_id, profile_id, role, is_active) values
  ('00000000-0000-0000-0000-0000004b1030', '00000000-0000-0000-0000-0000004b1020',
   '00000000-0000-0000-0000-0000004b1001', 'owner', true),
  ('00000000-0000-0000-0000-0000004b1031', '00000000-0000-0000-0000-0000004b1020',
   '00000000-0000-0000-0000-0000004b1002', 'caretaker', true),
  ('00000000-0000-0000-0000-0000004b1032', '00000000-0000-0000-0000-0000004b1020',
   '00000000-0000-0000-0000-0000004b1003', 'sanitation', true)
on conflict (id) do nothing;

insert into public.clients (id, facility_id, name, email) values
  ('00000000-0000-0000-0000-0000004b1040', '00000000-0000-0000-0000-0000004b1020',
   'BH Client', 'bh-c@example.invalid');

create or replace function pg_temp.as_user(p_uid uuid) returns void
language plpgsql as $$
begin
  perform set_config('request.jwt.claims',
    case when p_uid is null then ''
         else json_build_object('sub', p_uid::text, 'role', 'authenticated')::text end,
    true);
end $$;

-- As the owner: a booking, then its status, then its price.
select pg_temp.as_user('00000000-0000-0000-0000-0000004b1001');
set local role authenticated;

insert into public.bookings
  (id, facility_id, client_id, service, status, start_at, end_at,
   base_price, discount, total_cost)
values
  ('00000000-0000-0000-0000-0000004b1050', '00000000-0000-0000-0000-0000004b1020',
   '00000000-0000-0000-0000-0000004b1040', 'daycare', 'confirmed',
   now() + interval '30 days', now() + interval '30 days 8 hours', 40, 0, 40);

update public.bookings set status = 'cancelled'
 where id = '00000000-0000-0000-0000-0000004b1050';
update public.bookings set total_cost = 30, discount = 10
 where id = '00000000-0000-0000-0000-0000004b1050';
-- Nothing a person would call a change: a derived column only.
update public.bookings set updated_at = now()
 where id = '00000000-0000-0000-0000-0000004b1050';

reset role;

select pg_temp.t('H1  the new booking is recorded, by the owner',
  exists (select 1 from public.audit_log
           where entity_type = 'booking'
             and entity_id = '00000000-0000-0000-0000-0000004b1050'
             and action = 'Booking created'
             and user_name = 'BH Owner'));

select pg_temp.t('H2  the status change is recorded, from and to',
  exists (select 1 from public.audit_log
           where entity_id = '00000000-0000-0000-0000-0000004b1050'
             and category = 'Data'
             and changes @> '[{"field":"status","from":"confirmed","to":"cancelled"}]'));

select pg_temp.t('M1  the price change is its own Financial entry',
  exists (select 1 from public.audit_log
           where entity_id = '00000000-0000-0000-0000-0000004b1050'
             and category = 'Financial'
             and changes @> '[{"field":"total"}]'
             and changes @> '[{"field":"discount"}]'));

select pg_temp.t('N1  an update to a derived column only records nothing',
  (select count(*) from public.audit_log
    where entity_id = '00000000-0000-0000-0000-0000004b1050') = 3,
  (select count(*)::text from public.audit_log
    where entity_id = '00000000-0000-0000-0000-0000004b1050'));

-- ── Who reads it ────────────────────────────────────────────────────────────
select pg_temp.as_user('00000000-0000-0000-0000-0000004b1002');
set local role authenticated;
select pg_temp.t('R1  a caretaker (view_bookings, no financials) reads the Data entries',
  (select count(*) from public.audit_log
    where entity_id = '00000000-0000-0000-0000-0000004b1050'
      and category = 'Data') = 2);
select pg_temp.t('R2  … and not the Financial one',
  not exists (select 1 from public.audit_log
               where entity_id = '00000000-0000-0000-0000-0000004b1050'
                 and category = 'Financial'));
reset role;

select pg_temp.as_user('00000000-0000-0000-0000-0000004b1003');
set local role authenticated;
select pg_temp.t('R3  a member without view_bookings (sanitation) reads none of it',
  not exists (select 1 from public.audit_log
               where entity_id = '00000000-0000-0000-0000-0000004b1050'));
reset role;

select pg_temp.as_user('00000000-0000-0000-0000-0000004b1001');
set local role authenticated;
select pg_temp.t('R4  the owner reads all three',
  (select count(*) from public.audit_log
    where entity_id = '00000000-0000-0000-0000-0000004b1050') = 3);
reset role;

-- ── The function is the trigger's, not anyone's ────────────────────────────
select pg_temp.t('P1  audit_booking_change is not callable by anon or authenticated',
  exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
           where n.nspname = 'private' and p.proname = 'audit_booking_change')
  and not exists (
    select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'private' and p.proname = 'audit_booking_change'
       and (has_function_privilege('anon', p.oid, 'execute')
            or has_function_privilege('authenticated', p.oid, 'execute'))));

select case when ok then '  PASS  ' else '> FAIL <' end as result, name, detail
  from tap order by n;

select count(*) filter (where ok) || ' passed, '
    || count(*) filter (where not ok) || ' failed' as summary
  from tap;

rollback;
