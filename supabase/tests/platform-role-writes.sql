-- ============================================================================
-- A platform member reads; only a superadmin writes
-- (a_platform_member_reads_only_a_superadmin_writes).
--
-- has_permission() and permitted_facility_ids() answered TRUE for every
-- permission to anyone in platform_memberships, whatever their role — so a
-- read-only or support member could edit, cancel and refund any facility's
-- bookings. Now a superadmin holds every permission; support, billing and
-- read-only hold only the viewing ones.
--
--   R  a read-only member sees a facility's bookings, and cannot change one
--   P  has_permission / permitted_facility_ids say the same
--   S  support and billing are read-only too; a superadmin still writes
--   N  platform_may is not callable by anon or authenticated
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
  ('00000000-0000-0000-0000-0000004f1001', 'pr-readonly@example.invalid'),
  ('00000000-0000-0000-0000-0000004f1002', 'pr-support@example.invalid'),
  ('00000000-0000-0000-0000-0000004f1003', 'pr-billing@example.invalid'),
  ('00000000-0000-0000-0000-0000004f1004', 'pr-super@example.invalid')
on conflict (id) do nothing;

insert into public.profiles (id, email, full_name) values
  ('00000000-0000-0000-0000-0000004f1001', 'pr-readonly@example.invalid', 'PR Readonly'),
  ('00000000-0000-0000-0000-0000004f1002', 'pr-support@example.invalid', 'PR Support'),
  ('00000000-0000-0000-0000-0000004f1003', 'pr-billing@example.invalid', 'PR Billing'),
  ('00000000-0000-0000-0000-0000004f1004', 'pr-super@example.invalid', 'PR Super')
on conflict (id) do update set full_name = excluded.full_name;

insert into public.platform_memberships (profile_id, role) values
  ('00000000-0000-0000-0000-0000004f1001', 'readonly'),
  ('00000000-0000-0000-0000-0000004f1002', 'support'),
  ('00000000-0000-0000-0000-0000004f1003', 'billing'),
  ('00000000-0000-0000-0000-0000004f1004', 'superadmin')
on conflict do nothing;

insert into public.orgs (id, name, slug) values
  ('00000000-0000-0000-0000-0000004f1010', 'PR Org', 'pr-org')
on conflict do nothing;

insert into public.facilities (id, org_id, name, slug, legacy_id) values
  ('00000000-0000-0000-0000-0000004f1020', '00000000-0000-0000-0000-0000004f1010',
   'PR Facility', 'pr-a', 'pr-a')
on conflict do nothing;

insert into public.clients (id, facility_id, name, email) values
  ('00000000-0000-0000-0000-0000004f1040', '00000000-0000-0000-0000-0000004f1020',
   'PR Client', 'pr-c@example.invalid');

insert into public.bookings (id, facility_id, client_id, service, status, start_at, end_at, total_cost) values
  ('00000000-0000-0000-0000-0000004f1050', '00000000-0000-0000-0000-0000004f1020',
   '00000000-0000-0000-0000-0000004f1040', 'daycare', 'confirmed',
   now() + interval '10 days', now() + interval '10 days 8 hours', 40);

create or replace function pg_temp.as_user(p_uid uuid) returns void
language plpgsql as $$
begin
  perform set_config('request.jwt.claims',
    json_build_object('sub', p_uid::text, 'role', 'authenticated')::text, true);
end $$;

-- ── Read-only ──────────────────────────────────────────────────────────────
select pg_temp.as_user('00000000-0000-0000-0000-0000004f1001');
set local role authenticated;

select pg_temp.t('R1  a read-only member sees the facility''s booking',
  exists (select 1 from public.bookings
           where id = '00000000-0000-0000-0000-0000004f1050'));

with changed as (
  update public.bookings set status = 'cancelled'
   where id = '00000000-0000-0000-0000-0000004f1050'
  returning 1)
select pg_temp.t('R2  … and cannot cancel it', (select count(*) from changed) = 0);

select pg_temp.t('P1  has_permission: view_bookings yes, edit_bookings no',
  private.has_permission('00000000-0000-0000-0000-0000004f1020', 'view_bookings')
  and not private.has_permission('00000000-0000-0000-0000-0000004f1020', 'edit_bookings')
  and not private.has_permission('00000000-0000-0000-0000-0000004f1020', 'process_refund'));

select pg_temp.t('P2  permitted_facility_ids admits the facility to read, not to write',
  '00000000-0000-0000-0000-0000004f1020'::uuid in
     (select private.permitted_facility_ids('view_bookings'))
  and '00000000-0000-0000-0000-0000004f1020'::uuid not in
     (select private.permitted_facility_ids('edit_bookings')));

-- A made-up key: the rule is "not a view", and no real permission needs
-- naming to test it (check:inert-permissions reads this file too).
select pg_temp.t('P3  a key that is not a view is not a platform member''s',
  not private.has_permission('00000000-0000-0000-0000-0000004f1020', 'export_everything'));
reset role;

-- ── Support and billing ────────────────────────────────────────────────────
select pg_temp.as_user('00000000-0000-0000-0000-0000004f1002');
set local role authenticated;
select pg_temp.t('S1  support reads and does not write',
  private.has_permission('00000000-0000-0000-0000-0000004f1020', 'view_clients')
  and not private.has_permission('00000000-0000-0000-0000-0000004f1020', 'edit_clients'));
reset role;

select pg_temp.as_user('00000000-0000-0000-0000-0000004f1003');
set local role authenticated;
select pg_temp.t('S2  billing reads the money and does not take any',
  private.has_permission('00000000-0000-0000-0000-0000004f1020', 'financial_view_amounts')
  and not private.has_permission('00000000-0000-0000-0000-0000004f1020', 'financial_take_payment'));
reset role;

-- ── Superadmin ─────────────────────────────────────────────────────────────
select pg_temp.as_user('00000000-0000-0000-0000-0000004f1004');
set local role authenticated;
with changed as (
  update public.bookings set special_requests = 'superadmin was here'
   where id = '00000000-0000-0000-0000-0000004f1050'
  returning 1)
select pg_temp.t('S3  a superadmin still writes', (select count(*) from changed) = 1);
select pg_temp.t('S4  … and holds every permission',
  private.has_permission('00000000-0000-0000-0000-0000004f1020', 'edit_bookings')
  and '00000000-0000-0000-0000-0000004f1020'::uuid in
     (select private.permitted_facility_ids('edit_bookings')));
reset role;

select pg_temp.t('N1  platform_may is nobody''s to call directly',
  exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
           where n.nspname = 'private' and p.proname = 'platform_may')
  and not has_function_privilege('anon', 'private.platform_may(text)', 'execute'));

select case when ok then '  PASS  ' else '> FAIL <' end as result, name, detail
  from tap order by n;

select count(*) filter (where ok) || ' passed, '
    || count(*) filter (where not ok) || ' failed' as summary
  from tap;

rollback;
