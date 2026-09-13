-- ============================================================================
-- yipyy_go_photos and the yipyy-go-photos bucket (see the migration
-- a_pre_arrival_photo_is_a_private_file).
--
--   bun run test:sql yipyy-go-photos-rls
--
-- One transaction, rolled back. Fixture emails are @example.invalid.
--
-- ── ASSERT THE ALLOWED UPLOAD FIRST ────────────────────────────────────────
--
-- A storage policy that denies everyone passes every "cannot" test. S1 asserts
-- that the owner CAN upload under their own form; only then do S2 and S3 mean
-- anything (grooming-photos-intake-rls.sql, which caught exactly that).
--
-- ── WHAT THIS FILE IS ABOUT ────────────────────────────────────────────────
--
-- S0  The bucket is private and images only.
-- S1  The owner can upload under their own form's facility/submission path.
-- S2  …and cannot under another household's form.
-- S3  …nor under their own form with another facility's segment.
-- S4  Staff read their facility's photos; another facility and another
--     household read none.
-- S5  A closed form (inside its deadline) refuses a new file and a new row.
-- R1  A photo row's path must be its own facility and form; nobody moves one.
-- ============================================================================

begin;

set local client_min_messages to warning;

create temp table tap (n serial, name text, ok boolean, detail text);
grant all on tap to authenticated;

create or replace function pg_temp.t(p_name text, p_ok boolean, p_detail text default '')
returns void language sql as $$
  insert into tap(name, ok, detail) values (p_name, p_ok, p_detail);
$$;

create or replace function pg_temp.as_user(p_sub text)
returns void language sql as $$
  select set_config('request.jwt.claims',
    json_build_object('sub', p_sub, 'role', 'authenticated')::text, true);
$$;

create or replace function pg_temp.as_nobody()
returns void language sql as $$
  select set_config('request.jwt.claims', '', true);
$$;

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000001f5001', 'ygp-owner@example.invalid'),
  ('00000000-0000-0000-0000-0000001f5002', 'ygp-other@example.invalid'),
  ('00000000-0000-0000-0000-0000001f5003', 'ygp-client@example.invalid'),
  ('00000000-0000-0000-0000-0000001f5005', 'ygp-stranger@example.invalid')
on conflict (id) do nothing;

insert into public.profiles (id, email, full_name) values
  ('00000000-0000-0000-0000-0000001f5001', 'ygp-owner@example.invalid', 'Owner'),
  ('00000000-0000-0000-0000-0000001f5002', 'ygp-other@example.invalid', 'Other'),
  ('00000000-0000-0000-0000-0000001f5003', 'ygp-client@example.invalid', 'Client'),
  ('00000000-0000-0000-0000-0000001f5005', 'ygp-stranger@example.invalid', 'Stranger')
on conflict (id) do update set full_name = excluded.full_name;

insert into public.orgs (id, name, slug) values
  ('00000000-0000-0000-0000-0000001f5010', 'YGP Org', 'ygp-org')
on conflict do nothing;

insert into public.facilities (id, org_id, name, slug, legacy_id) values
  ('00000000-0000-0000-0000-0000001f5020', '00000000-0000-0000-0000-0000001f5010',
   'Kennel', 'ygp-a', 'ygp-a'),
  ('00000000-0000-0000-0000-0000001f5021', '00000000-0000-0000-0000-0000001f5010',
   'Elsewhere', 'ygp-b', 'ygp-b')
on conflict do nothing;

insert into public.facility_memberships (id, facility_id, profile_id, role, is_active) values
  ('00000000-0000-0000-0000-0000001f5030', '00000000-0000-0000-0000-0000001f5020',
   '00000000-0000-0000-0000-0000001f5001', 'owner', true),
  ('00000000-0000-0000-0000-0000001f5031', '00000000-0000-0000-0000-0000001f5021',
   '00000000-0000-0000-0000-0000001f5002', 'owner', true)
on conflict (id) do nothing;

insert into public.clients (id, facility_id, name, email, profile_id) values
  ('00000000-0000-0000-0000-0000001f5040', '00000000-0000-0000-0000-0000001f5020',
   'Guest One', 'ygp-c1@example.invalid', '00000000-0000-0000-0000-0000001f5003'),
  ('00000000-0000-0000-0000-0000001f5041', '00000000-0000-0000-0000-0000001f5020',
   'Guest Two', 'ygp-c2@example.invalid', '00000000-0000-0000-0000-0000001f5005');

insert into public.pets (id, client_id, name, species) values
  ('00000000-0000-0000-0000-0000001f5050', '00000000-0000-0000-0000-0000001f5040', 'Rex', 'dog'),
  ('00000000-0000-0000-0000-0000001f5052', '00000000-0000-0000-0000-0000001f5041', 'Luna', 'dog');

insert into public.facility_settings (facility_id, domain, value) values
  ('00000000-0000-0000-0000-0000001f5020', 'yipyy_go_config', jsonb_build_object(
     'enabled', true,
     'serviceConfigs', jsonb_build_array(
       jsonb_build_object('serviceType', 'daycare', 'enabled', true, 'requirement', 'mandatory')
     ),
     'timing', jsonb_build_object('initialSendTime', 72, 'deadline', 24,
                                  'reminderRules', '[]'::jsonb, 'deliveryChannels', '[]'::jsonb)
   ))
on conflict (facility_id, domain) do update set value = excluded.value;

insert into public.bookings
  (id, facility_id, client_id, service, service_type, status, start_at, end_at, base_price, total_cost)
values
  -- Open: in three days.
  ('00000000-0000-0000-0000-0000001f5090', '00000000-0000-0000-0000-0000001f5020',
   '00000000-0000-0000-0000-0000001f5040', 'daycare', 'Full day', 'confirmed',
   now() + interval '3 days', now() + interval '3 days 8 hours', 40, 40),
  -- Closed: in twelve hours, inside the 24-hour deadline.
  ('00000000-0000-0000-0000-0000001f5091', '00000000-0000-0000-0000-0000001f5020',
   '00000000-0000-0000-0000-0000001f5040', 'daycare', 'Full day', 'confirmed',
   now() + interval '12 hours', now() + interval '20 hours', 40, 40),
  -- Another household's, open.
  ('00000000-0000-0000-0000-0000001f5092', '00000000-0000-0000-0000-0000001f5020',
   '00000000-0000-0000-0000-0000001f5041', 'daycare', 'Full day', 'confirmed',
   now() + interval '3 days', now() + interval '3 days 8 hours', 40, 40);

insert into public.booking_pets (booking_id, pet_id) values
  ('00000000-0000-0000-0000-0000001f5090', '00000000-0000-0000-0000-0000001f5050'),
  ('00000000-0000-0000-0000-0000001f5091', '00000000-0000-0000-0000-0000001f5050'),
  ('00000000-0000-0000-0000-0000001f5092', '00000000-0000-0000-0000-0000001f5052');

-- The three forms, written as the service would (the functions are tested in
-- yipyy-go-submissions.sql).
insert into public.yipyy_go_submissions (id, booking_id, pet_id) values
  ('00000000-0000-0000-0000-0000001f50a0', '00000000-0000-0000-0000-0000001f5090', '00000000-0000-0000-0000-0000001f5050'),
  ('00000000-0000-0000-0000-0000001f50a1', '00000000-0000-0000-0000-0000001f5091', '00000000-0000-0000-0000-0000001f5050'),
  ('00000000-0000-0000-0000-0000001f50a2', '00000000-0000-0000-0000-0000001f5092', '00000000-0000-0000-0000-0000001f5052');

-- ── S0  the bucket ──────────────────────────────────────────────────────────
select pg_temp.t('S0  the bucket is private, 10 MB, images only',
  exists (
    select 1 from storage.buckets
     where id = 'yipyy-go-photos' and not public and file_size_limit = 10485760
       and allowed_mime_types @> array['image/png', 'image/jpeg', 'image/heic']
       and not (allowed_mime_types && array['application/pdf', 'image/svg+xml'])
  ));

-- ── S1  the owner uploads under their own form ──────────────────────────────
do $$
begin
  perform pg_temp.as_user('00000000-0000-0000-0000-0000001f5003');
  set local role authenticated;
  insert into storage.objects (bucket_id, name)
  values ('yipyy-go-photos',
          '00000000-0000-0000-0000-0000001f5020/00000000-0000-0000-0000-0000001f50a0/bed.jpg');
  reset role;
  perform pg_temp.t('S1  the owner CAN upload under their own form (arms S2 and S3)', true);
exception when others then
  reset role; perform pg_temp.t('S1  own-form upload', false, sqlerrm);
end $$;

-- ── S2  not under another household's form ──────────────────────────────────
do $$
declare v_refused boolean := false;
begin
  perform pg_temp.as_user('00000000-0000-0000-0000-0000001f5003');
  set local role authenticated;
  begin
    insert into storage.objects (bucket_id, name)
    values ('yipyy-go-photos',
            '00000000-0000-0000-0000-0000001f5020/00000000-0000-0000-0000-0000001f50a2/bed.jpg');
  exception when insufficient_privilege then v_refused := true;
  end;
  reset role;
  perform pg_temp.t('S2  the owner cannot upload under another household''s form', v_refused);
exception when others then
  reset role; perform pg_temp.t('S2  other household', false, sqlerrm);
end $$;

-- ── S3  not with another facility's segment ─────────────────────────────────
do $$
declare v_refused boolean := false;
begin
  perform pg_temp.as_user('00000000-0000-0000-0000-0000001f5003');
  set local role authenticated;
  begin
    insert into storage.objects (bucket_id, name)
    values ('yipyy-go-photos',
            '00000000-0000-0000-0000-0000001f5021/00000000-0000-0000-0000-0000001f50a0/bed.jpg');
  exception when insufficient_privilege then v_refused := true;
  end;
  reset role;
  perform pg_temp.t('S3  the owner cannot put their own form''s file under another facility', v_refused);
exception when others then
  reset role; perform pg_temp.t('S3  mismatched facility', false, sqlerrm);
end $$;

-- ── S4  who reads the file ──────────────────────────────────────────────────
do $$
declare v_staff int; v_owner int; v_other int; v_stranger int;
begin
  perform pg_temp.as_user('00000000-0000-0000-0000-0000001f5001');
  set local role authenticated;
  select count(*) into v_staff from storage.objects where bucket_id = 'yipyy-go-photos'
     and name like '00000000-0000-0000-0000-0000001f5020/%';
  reset role;
  perform pg_temp.as_user('00000000-0000-0000-0000-0000001f5003');
  set local role authenticated;
  select count(*) into v_owner from storage.objects where bucket_id = 'yipyy-go-photos'
     and name like '00000000-0000-0000-0000-0000001f5020/%';
  reset role;
  perform pg_temp.as_user('00000000-0000-0000-0000-0000001f5002');
  set local role authenticated;
  select count(*) into v_other from storage.objects where bucket_id = 'yipyy-go-photos'
     and name like '00000000-0000-0000-0000-0000001f5020/%';
  reset role;
  perform pg_temp.as_user('00000000-0000-0000-0000-0000001f5005');
  set local role authenticated;
  select count(*) into v_stranger from storage.objects where bucket_id = 'yipyy-go-photos'
     and name like '00000000-0000-0000-0000-0000001f5020/%';
  reset role;
  perform pg_temp.t('S4  staff and the owner read the file; another facility and household do not',
    v_staff = 1 and v_owner = 1 and v_other = 0 and v_stranger = 0,
    format('staff=%s owner=%s other facility=%s other household=%s', v_staff, v_owner, v_other, v_stranger));
exception when others then
  reset role; perform pg_temp.t('S4  object reads', false, sqlerrm);
end $$;

-- ── S5  a closed form takes nothing ─────────────────────────────────────────
do $$
declare v_file boolean := false; v_row boolean := false;
begin
  perform pg_temp.as_user('00000000-0000-0000-0000-0000001f5003');
  set local role authenticated;
  begin
    insert into storage.objects (bucket_id, name)
    values ('yipyy-go-photos',
            '00000000-0000-0000-0000-0000001f5020/00000000-0000-0000-0000-0000001f50a1/bed.jpg');
  exception when insufficient_privilege then v_file := true;
  end;
  begin
    insert into public.yipyy_go_photos (submission_id, kind, storage_path, content_type, size_bytes)
    values ('00000000-0000-0000-0000-0000001f50a1', 'belongings',
            '00000000-0000-0000-0000-0000001f5020/00000000-0000-0000-0000-0000001f50a1/bed.jpg',
            'image/jpeg', 1024);
  exception when insufficient_privilege then v_row := true;
  end;
  reset role;
  perform pg_temp.t('S5  a form inside its deadline refuses a new file and a new row',
    v_file and v_row, format('file refused=%s row refused=%s', v_file, v_row));
exception when others then
  reset role; perform pg_temp.t('S5  closed form', false, sqlerrm);
end $$;

-- ── R1  the photo row ───────────────────────────────────────────────────────
do $$
declare
  v_row public.yipyy_go_photos;
  v_wrong_path boolean := false;
  v_no_move boolean := false;
  v_staff_sees int;
begin
  perform pg_temp.as_user('00000000-0000-0000-0000-0000001f5003');
  set local role authenticated;
  insert into public.yipyy_go_photos (submission_id, kind, item_ref, storage_path, content_type, size_bytes)
  values ('00000000-0000-0000-0000-0000001f50a0', 'belongings', 'b1',
          '00000000-0000-0000-0000-0000001f5020/00000000-0000-0000-0000-0000001f50a0/bed.jpg',
          'image/jpeg', 2048)
  returning * into v_row;
  begin
    insert into public.yipyy_go_photos (submission_id, kind, storage_path, content_type, size_bytes)
    values ('00000000-0000-0000-0000-0000001f50a0', 'belongings',
            '00000000-0000-0000-0000-0000001f5021/00000000-0000-0000-0000-0000001f50a0/elsewhere.jpg',
            'image/jpeg', 2048);
  exception when check_violation then v_wrong_path := true;
  end;
  begin
    update public.yipyy_go_photos set storage_path = 'moved.jpg' where id = v_row.id;
  exception when insufficient_privilege then v_no_move := true;
  end;
  reset role;
  perform pg_temp.as_user('00000000-0000-0000-0000-0000001f5001');
  set local role authenticated;
  select count(*) into v_staff_sees from public.yipyy_go_photos where id = v_row.id;
  reset role;
  perform pg_temp.t('R1  the row''s facility is the form''s; its path must be its own; nobody moves it',
    v_row.facility_id = '00000000-0000-0000-0000-0000001f5020' and v_wrong_path and v_no_move and v_staff_sees = 1,
    format('facility=%s wrong path refused=%s move refused=%s staff sees=%s',
      v_row.facility_id, v_wrong_path, v_no_move, v_staff_sees));
exception when others then
  reset role; perform pg_temp.t('R1  photo row', false, sqlerrm);
end $$;

-- ── Report ──────────────────────────────────────────────────────────────────
select case when ok then '  PASS  ' else '> FAIL <' end as result, name, detail
  from tap order by n;

select count(*) filter (where ok) || ' passed, '
    || count(*) filter (where not ok) || ' failed' as summary
  from tap;

rollback;
