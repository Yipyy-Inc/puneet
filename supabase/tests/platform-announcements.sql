-- ============================================================================
-- A platform announcement is a row, and it shows only while it is live
-- (20260918103842).
--
--   W  only a platform admin writes one; a facility owner cannot, and cannot
--      read the table either — facilities read through the function
--   L  live = published, started, not auto-archived; a draft, a scheduled one
--      and an expired one are all invisible
--   T  targeting: all, named facilities, business type, plan tier — and a
--      non-member asking about someone else's facility gets nothing
--   R  a dismissal is the caller's own receipt, and cannot be written for
--      someone else
--   P  the public status page sees only live, all-facility maintenance — read
--      by the server as service_role (20260918110704), never by anon
--   G  grants
-- ============================================================================

begin;

set local client_min_messages to warning;

create temp table tap (n serial, name text, ok boolean, detail text);
grant all on tap to authenticated, anon;

create or replace function pg_temp.t(p_name text, p_ok boolean, p_detail text default '')
returns void language sql as $$
  insert into tap(name, ok, detail) values (p_name, p_ok, p_detail);
$$;

create or replace function pg_temp.as_user(p_uid text) returns void
language plpgsql as $$
begin
  perform set_config('request.jwt.claims',
    json_build_object('sub', p_uid, 'role', 'authenticated')::text, true);
end $$;

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000003e1001', 'ann-admin@example.invalid'),
  ('00000000-0000-0000-0000-0000003e1002', 'ann-owner@example.invalid'),
  ('00000000-0000-0000-0000-0000003e1003', 'ann-outsider@example.invalid')
on conflict (id) do nothing;

insert into public.profiles (id, email, full_name) values
  ('00000000-0000-0000-0000-0000003e1001', 'ann-admin@example.invalid', 'Admin'),
  ('00000000-0000-0000-0000-0000003e1002', 'ann-owner@example.invalid', 'Owner'),
  ('00000000-0000-0000-0000-0000003e1003', 'ann-outsider@example.invalid', 'Outsider')
on conflict (id) do update set full_name = excluded.full_name;

insert into public.platform_memberships (profile_id, role)
values ('00000000-0000-0000-0000-0000003e1001', 'superadmin')
on conflict do nothing;

insert into public.orgs (id, name, slug) values
  ('00000000-0000-0000-0000-0000003e1010', 'Ann Org', 'ann-org')
on conflict do nothing;

-- A: grooming, on tier-pro. B: boarding, no subscription row.
insert into public.facilities (id, org_id, name, slug, legacy_id, business_types) values
  ('00000000-0000-0000-0000-0000003e1020', '00000000-0000-0000-0000-0000003e1010',
   'Ann A', 'ann-a', 'ann-a', '{grooming}'),
  ('00000000-0000-0000-0000-0000003e1021', '00000000-0000-0000-0000-0000003e1010',
   'Ann B', 'ann-b', 'ann-b', '{boarding}')
on conflict do nothing;

insert into public.facility_subscriptions (facility_id, tier_id, tier_name, status)
values ('00000000-0000-0000-0000-0000003e1020', 'tier-pro', 'Pack Leader', 'active');

insert into public.facility_memberships (id, facility_id, profile_id, role, is_active) values
  ('00000000-0000-0000-0000-0000003e1030', '00000000-0000-0000-0000-0000003e1020',
   '00000000-0000-0000-0000-0000003e1002', 'owner', true)
on conflict (id) do nothing;

-- Rows seeded as the migration owner (RLS bypassed), each named for its case.
insert into public.platform_announcements
  (id, title, body, priority, status, target, plan_tier_ids, business_types,
   facility_ids, starts_at, auto_archive_days, published_at, created_by) values
  ('00000000-0000-0000-0000-0000003e1101', 'Draft', '<p>x</p>', 'urgent', 'draft',
   'all', '{}', '{}', '{}', null, null, null, 'seed'),
  ('00000000-0000-0000-0000-0000003e1102', 'Live for all', '<p>x</p>', 'urgent', 'published',
   'all', '{}', '{}', '{}', null, null, now() - interval '1 hour', 'seed'),
  ('00000000-0000-0000-0000-0000003e1103', 'Scheduled', '<p>x</p>', 'high', 'published',
   'all', '{}', '{}', '{}', now() + interval '1 day', null, now(), 'seed'),
  ('00000000-0000-0000-0000-0000003e1104', 'Expired', '<p>x</p>', 'high', 'published',
   'all', '{}', '{}', '{}', null, 1, now() - interval '3 days', 'seed'),
  ('00000000-0000-0000-0000-0000003e1105', 'Only B', '<p>x</p>', 'normal', 'published',
   'facilities', '{}', '{}', '{00000000-0000-0000-0000-0000003e1021}', null, null, now(), 'seed'),
  ('00000000-0000-0000-0000-0000003e1106', 'Groomers', '<p>x</p>', 'normal', 'published',
   'business_type', '{}', '{grooming}', '{}', null, null, now(), 'seed'),
  ('00000000-0000-0000-0000-0000003e1107', 'Pack Leaders', '<p>x</p>', 'normal', 'published',
   'plan_tier', '{tier-pro}', '{}', '{}', null, null, now(), 'seed'),
  ('00000000-0000-0000-0000-0000003e1108', 'Boarding only', '<p>x</p>', 'normal', 'published',
   'business_type', '{}', '{boarding}', '{}', null, null, now(), 'seed'),
  ('00000000-0000-0000-0000-0000003e1109', 'Scheduled maintenance tonight', '<p>down 2-4</p>',
   'urgent', 'published', 'facilities', '{}', '{}', '{00000000-0000-0000-0000-0000003e1020}',
   null, null, now(), 'seed'),
  ('00000000-0000-0000-0000-0000003e1110', 'Database maintenance', '<p>brief downtime</p>',
   'urgent', 'published', 'all', '{}', '{}', '{}', null, null, now(), 'seed');

create temp table seen (who text, id uuid, dismissed boolean);
grant all on seen to authenticated;

-- ── W ──────────────────────────────────────────────────────────────────────
do $$
begin
  perform pg_temp.as_user('00000000-0000-0000-0000-0000003e1001');
  set local role authenticated;
  insert into public.platform_announcements (title, body, status)
  values ('Admin wrote this', '<p>ok</p>', 'draft');
  reset role;
  perform pg_temp.t('W1  a platform admin can write an announcement', true);
exception when others then
  reset role;
  perform pg_temp.t('W1  a platform admin can write an announcement', false, sqlerrm);
end $$;

do $$
begin
  perform pg_temp.as_user('00000000-0000-0000-0000-0000003e1002');
  set local role authenticated;
  insert into public.platform_announcements (title, body, status)
  values ('Owner wrote this', '<p>no</p>', 'draft');
  reset role;
  perform pg_temp.t('W2  a facility owner cannot write one', false, 'insert accepted');
exception when insufficient_privilege then
  reset role;
  perform pg_temp.t('W2  a facility owner cannot write one', true, sqlstate);
end $$;

do $$
declare v int;
begin
  perform pg_temp.as_user('00000000-0000-0000-0000-0000003e1002');
  set local role authenticated;
  select count(*) into v from public.platform_announcements;
  reset role;
  perform pg_temp.t('W3  a facility owner reads nothing from the table itself', v = 0, v::text);
end $$;

do $$
begin
  perform pg_temp.as_user('00000000-0000-0000-0000-0000003e1001');
  set local role authenticated;
  insert into public.platform_announcements (title, status, target)
  values ('Nobody', 'draft', 'facilities');
  reset role;
  perform pg_temp.t('W4  a target that names nothing is refused', false, 'accepted');
exception when check_violation then
  reset role;
  perform pg_temp.t('W4  a target that names nothing is refused', true, sqlstate);
end $$;

-- ── L + T, as the owner of facility A ───────────────────────────────────────
do $$
begin
  perform pg_temp.as_user('00000000-0000-0000-0000-0000003e1002');
  set local role authenticated;
  insert into seen
  select 'owner-A', id, dismissed_at is not null
    from public.active_platform_announcements('00000000-0000-0000-0000-0000003e1020')
   where id::text like '00000000-0000-0000-0000-0000003e11%';
  reset role;
end $$;

select pg_temp.t('L1  a draft is not shown',
  not exists (select 1 from seen where id = '00000000-0000-0000-0000-0000003e1101'));
select pg_temp.t('L2  a live announcement for all facilities is shown',
  exists (select 1 from seen where id = '00000000-0000-0000-0000-0000003e1102'));
select pg_temp.t('L3  a scheduled one is not shown before it starts',
  not exists (select 1 from seen where id = '00000000-0000-0000-0000-0000003e1103'));
select pg_temp.t('L4  one past its auto-archive is not shown',
  not exists (select 1 from seen where id = '00000000-0000-0000-0000-0000003e1104'));
select pg_temp.t('T1  one addressed to another facility is not shown',
  not exists (select 1 from seen where id = '00000000-0000-0000-0000-0000003e1105'));
select pg_temp.t('T2  a business-type match is shown',
  exists (select 1 from seen where id = '00000000-0000-0000-0000-0000003e1106'));
select pg_temp.t('T3  a plan-tier match is shown',
  exists (select 1 from seen where id = '00000000-0000-0000-0000-0000003e1107'));
select pg_temp.t('T4  a business-type miss is not shown',
  not exists (select 1 from seen where id = '00000000-0000-0000-0000-0000003e1108'));
select pg_temp.t('T5  one addressed to this facility by name is shown',
  exists (select 1 from seen where id = '00000000-0000-0000-0000-0000003e1109'));

do $$
declare v int;
begin
  perform pg_temp.as_user('00000000-0000-0000-0000-0000003e1003');
  set local role authenticated;
  select count(*) into v
    from public.active_platform_announcements('00000000-0000-0000-0000-0000003e1020');
  reset role;
  perform pg_temp.t('T6  a non-member asking about facility A gets nothing', v = 0, v::text);
end $$;

-- ── R ──────────────────────────────────────────────────────────────────────
do $$
declare v boolean;
begin
  perform pg_temp.as_user('00000000-0000-0000-0000-0000003e1002');
  set local role authenticated;
  insert into public.platform_announcement_receipts (announcement_id, dismissed_at)
  values ('00000000-0000-0000-0000-0000003e1102', now())
  on conflict (announcement_id, profile_id) do update set dismissed_at = excluded.dismissed_at;
  select dismissed_at is not null into v
    from public.active_platform_announcements('00000000-0000-0000-0000-0000003e1020')
   where id = '00000000-0000-0000-0000-0000003e1102';
  reset role;
  perform pg_temp.t('R1  a dismissal is the caller''s own receipt, and reads back', coalesce(v, false));
exception when others then
  reset role;
  perform pg_temp.t('R1  a dismissal is the caller''s own receipt, and reads back', false, sqlerrm);
end $$;

do $$
begin
  perform pg_temp.as_user('00000000-0000-0000-0000-0000003e1003');
  set local role authenticated;
  insert into public.platform_announcement_receipts (announcement_id, profile_id, dismissed_at)
  values ('00000000-0000-0000-0000-0000003e1102', '00000000-0000-0000-0000-0000003e1002', now());
  reset role;
  perform pg_temp.t('R2  nobody can write a receipt for someone else', false, 'accepted');
exception when insufficient_privilege then
  reset role;
  perform pg_temp.t('R2  nobody can write a receipt for someone else', true, sqlstate);
end $$;

-- ── P ──────────────────────────────────────────────────────────────────────
create temp table pub (id uuid);
grant all on pub to service_role;
do $$
begin
  perform set_config('request.jwt.claims', json_build_object('role', 'service_role')::text, true);
  set local role service_role;
  insert into pub select id from public.status_page_maintenance();
  reset role;
end $$;

select pg_temp.t('P1  the status page shows live, all-facility maintenance',
  exists (select 1 from pub where id = '00000000-0000-0000-0000-0000003e1110'));
select pg_temp.t('P2  and not maintenance addressed to one facility',
  not exists (select 1 from pub where id = '00000000-0000-0000-0000-0000003e1109'));
select pg_temp.t('P3  and not an announcement that is not about maintenance',
  not exists (select 1 from pub where id = '00000000-0000-0000-0000-0000003e1102'));

-- ── G ──────────────────────────────────────────────────────────────────────
select pg_temp.t('G1  anon cannot call the facility read',
  not has_function_privilege('anon', 'public.active_platform_announcements(uuid)', 'execute'));
select pg_temp.t('G2  anon cannot read either table',
  not has_table_privilege('anon', 'public.platform_announcements', 'select')
  and not has_table_privilege('anon', 'public.platform_announcement_receipts', 'select'));
select pg_temp.t('G4  the status page read is not callable by anon or a signed-in user',
  not has_function_privilege('anon', 'public.status_page_maintenance()', 'execute')
  and not has_function_privilege('authenticated', 'public.status_page_maintenance()', 'execute'));
select pg_temp.t('G3  the live-window helper is not callable by anon',
  not has_function_privilege('anon',
    'private.platform_announcement_is_live(text, timestamptz, timestamptz, integer)', 'execute'));

select case when ok then '  PASS  ' else '> FAIL <' end as result, name, detail
  from tap order by n;

select count(*) filter (where ok) || ' passed, '
    || count(*) filter (where not ok) || ' failed' as summary
  from tap;

rollback;
