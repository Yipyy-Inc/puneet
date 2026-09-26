-- ============================================================================
-- A service picture can be uploaded, by the people who author the menu, into
-- their own facility's folder — and read by anybody.
--
--   bun run local bun run test:sql
--
-- One transaction, rolled back.
--
-- ── WHY THIS FILE EXISTS ───────────────────────────────────────────────────
--
-- `service-images` was introduced on 2026-09-25 (ead7370a) and the upload code
-- shipped with it. The bucket never reached production. For two days every
-- attempt to put a photo on a room category, a grooming service or a boarding
-- service answered "Bucket not found" — client feedback, 2026-09-26 — while
-- every gate was green, because nothing asserted the bucket existed.
--
-- The migration could not have been applied as written: its last statement was
-- `comment on table storage.buckets`, a table owned by supabase_storage_admin
-- that `postgres` is not a member of, so it failed with "must be owner of
-- table buckets" and the whole transaction — bucket included — rolled back.
-- Reproduced on the local copy before anything was changed.
--
-- S0 is the assertion that would have caught it. The rest pin the policies
-- the bucket depends on, since a public bucket with a loose write policy is a
-- place anybody signed in can put anything under any facility's name.
-- ============================================================================

begin;

set local client_min_messages to warning;

create temp table tap (n serial, name text, ok boolean, detail text);
grant all on tap to anon, authenticated;

create or replace function pg_temp.t(p_name text, p_ok boolean, p_detail text default '')
returns void language sql as $$
  insert into tap(name, ok, detail) values (p_name, p_ok, p_detail);
$$;

create or replace function pg_temp.as_user(p_sub text)
returns void language sql as $$
  select set_config('request.jwt.claims',
    json_build_object('sub', p_sub, 'role', 'authenticated')::text, true);
$$;

-- Two facilities, an owner in each, and a receptionist in the first. Owners
-- hold `manage_services` by preset (owner, admin and manager do); reception
-- does not, which is what makes it the right member to refuse.

insert into public.profiles (id, email, full_name) values
  ('00000000-0000-0000-0000-00000051e001', 'si-owner@example.invalid', 'SI Owner'),
  ('00000000-0000-0000-0000-00000051e002', 'si-other@example.invalid', 'SI Other Owner'),
  ('00000000-0000-0000-0000-00000051e003', 'si-recep@example.invalid', 'SI Reception')
on conflict (id) do update set full_name = excluded.full_name;

insert into public.orgs (id, name, slug) values
  ('00000000-0000-0000-0000-00000051e010', 'SI Org', 'si-org')
on conflict do nothing;

insert into public.facilities (id, org_id, name, slug, legacy_id) values
  ('00000000-0000-0000-0000-00000051e020', '00000000-0000-0000-0000-00000051e010',
   'SI Kennel', 'si-a', 'si-a'),
  ('00000000-0000-0000-0000-00000051e021', '00000000-0000-0000-0000-00000051e010',
   'SI Elsewhere', 'si-b', 'si-b')
on conflict do nothing;

insert into public.facility_memberships (id, facility_id, profile_id, role, is_active) values
  ('00000000-0000-0000-0000-00000051e030', '00000000-0000-0000-0000-00000051e020',
   '00000000-0000-0000-0000-00000051e001', 'owner', true),
  ('00000000-0000-0000-0000-00000051e031', '00000000-0000-0000-0000-00000051e021',
   '00000000-0000-0000-0000-00000051e002', 'owner', true),
  ('00000000-0000-0000-0000-00000051e032', '00000000-0000-0000-0000-00000051e020',
   '00000000-0000-0000-0000-00000051e003', 'reception', true)
on conflict (id) do nothing;

-- ── S0  the bucket exists ───────────────────────────────────────────────────
--
-- Public on purpose: these pictures are drawn on the customer booking wizard,
-- including the signed-out token routes. 5 MB, and photographs only — no SVG,
-- which is a document that can carry script.

select pg_temp.t('S0  service-images exists, is public, 5 MB, png/jpeg/webp only',
  exists (
    select 1 from storage.buckets
     where id = 'service-images' and public and file_size_limit = 5242880
       and allowed_mime_types @> array['image/png', 'image/jpeg', 'image/webp']
       and not (allowed_mime_types && array['image/svg+xml', 'application/pdf'])
  ),
  coalesce((select format('public=%s limit=%s types=%s', public, file_size_limit,
                          array_to_string(allowed_mime_types, ','))
              from storage.buckets where id = 'service-images'),
           'the bucket does not exist'));

-- ── S1  an owner uploads into their own facility's folder ──────────────────
do $$
begin
  perform pg_temp.as_user('00000000-0000-0000-0000-00000051e001');
  set local role authenticated;
  insert into storage.objects (bucket_id, name)
  values ('service-images', '00000000-0000-0000-0000-00000051e020/suite-1.jpg');
  reset role;
  perform pg_temp.t('S1  an owner CAN upload into their own facility''s folder', true);
exception when others then
  reset role; perform pg_temp.t('S1  own-folder upload', false, sqlerrm);
end $$;

-- ── S2  not into another facility's folder ─────────────────────────────────
--
-- The first path segment IS the tenancy boundary. A path is a string the
-- browser chooses, so this is the case that matters most.
do $$
declare v_refused boolean := false;
begin
  perform pg_temp.as_user('00000000-0000-0000-0000-00000051e001');
  set local role authenticated;
  begin
    insert into storage.objects (bucket_id, name)
    values ('service-images', '00000000-0000-0000-0000-00000051e021/suite-1.jpg');
  exception when insufficient_privilege then v_refused := true;
  end;
  reset role;
  perform pg_temp.t('S2  an owner CANNOT upload into another facility''s folder', v_refused);
exception when others then
  reset role; perform pg_temp.t('S2  other facility', false, sqlerrm);
end $$;

-- ── S3  a member without manage_services cannot upload at all ──────────────
do $$
declare v_refused boolean := false;
begin
  perform pg_temp.as_user('00000000-0000-0000-0000-00000051e003');
  set local role authenticated;
  begin
    insert into storage.objects (bucket_id, name)
    values ('service-images', '00000000-0000-0000-0000-00000051e020/suite-2.jpg');
  exception when insufficient_privilege then v_refused := true;
  end;
  reset role;
  perform pg_temp.t('S3  reception (no manage_services) CANNOT upload, even into its own facility', v_refused);
exception when others then
  reset role; perform pg_temp.t('S3  reception upload', false, sqlerrm);
end $$;

-- ── S4  a path with no facility segment is refused ─────────────────────────
do $$
declare v_refused boolean := false;
begin
  perform pg_temp.as_user('00000000-0000-0000-0000-00000051e001');
  set local role authenticated;
  begin
    insert into storage.objects (bucket_id, name)
    values ('service-images', 'suite-at-the-root.jpg');
  exception when insufficient_privilege then v_refused := true;
  end;
  reset role;
  perform pg_temp.t('S4  a file at the bucket root (no facility folder) is refused', v_refused);
exception when others then
  reset role; perform pg_temp.t('S4  root path', false, sqlerrm);
end $$;

-- ── S5  anybody can read it, signed in or not ──────────────────────────────
--
-- The round trip: the file S1 wrote is visible to a signed-out visitor, which
-- is what the booking wizard's token routes need.
do $$
declare v_anon int;
begin
  set local role anon;
  select count(*) into v_anon from storage.objects
   where bucket_id = 'service-images'
     and name = '00000000-0000-0000-0000-00000051e020/suite-1.jpg';
  reset role;
  perform pg_temp.t('S5  a signed-out visitor can read the uploaded picture', v_anon = 1,
    format('rows=%s', v_anon));
exception when others then
  reset role; perform pg_temp.t('S5  anon read', false, sqlerrm);
end $$;

-- ── S6  the other facility's owner cannot delete it ────────────────────────
--
-- `storage.protect_delete` refuses every direct DELETE unless this setting is
-- on — it exists to push the app through the Storage API. It is a statement
-- trigger, so with it on the delete is decided by RLS alone, which is the
-- thing under test. S7 is the control: without it, "the row is still there"
-- could mean a delete that never works for anybody.
select set_config('storage.allow_delete_query', 'true', true);

do $$
declare v_left int;
begin
  perform pg_temp.as_user('00000000-0000-0000-0000-00000051e002');
  set local role authenticated;
  delete from storage.objects
   where bucket_id = 'service-images'
     and name = '00000000-0000-0000-0000-00000051e020/suite-1.jpg';
  reset role;
  select count(*) into v_left from storage.objects
   where bucket_id = 'service-images'
     and name = '00000000-0000-0000-0000-00000051e020/suite-1.jpg';
  perform pg_temp.t('S6  another facility''s owner cannot delete the picture', v_left = 1,
    format('rows left=%s', v_left));
exception when others then
  reset role; perform pg_temp.t('S6  cross-facility delete', false, sqlerrm);
end $$;

-- ── S7  its own owner can ──────────────────────────────────────────────────
do $$
declare v_left int;
begin
  perform pg_temp.as_user('00000000-0000-0000-0000-00000051e001');
  set local role authenticated;
  delete from storage.objects
   where bucket_id = 'service-images'
     and name = '00000000-0000-0000-0000-00000051e020/suite-1.jpg';
  reset role;
  select count(*) into v_left from storage.objects
   where bucket_id = 'service-images'
     and name = '00000000-0000-0000-0000-00000051e020/suite-1.jpg';
  perform pg_temp.t('S7  its own facility''s owner CAN delete it (the control for S6)', v_left = 0,
    format('rows left=%s', v_left));
exception when others then
  reset role; perform pg_temp.t('S7  own delete', false, sqlerrm);
end $$;

-- ── Report ──────────────────────────────────────────────────────────────────
select case when ok then '  PASS  ' else '> FAIL <' end as result, name, detail
  from tap order by n;

select count(*) filter (where ok) || ' passed, '
    || count(*) filter (where not ok) || ' failed' as summary
  from tap;

rollback;
