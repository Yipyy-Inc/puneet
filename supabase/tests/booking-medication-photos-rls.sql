-- ============================================================================
-- booking_medication_photos and the booking-medication-photos bucket (see the
-- migration a_medication_label_photo_is_a_private_file).
--
--   bun run test:sql booking-medication-photos-rls
--
-- One transaction, rolled back. Fixture emails are @example.invalid.
--
-- ── ASSERT THE ALLOWED UPLOAD FIRST ────────────────────────────────────────
--
-- A storage policy that denies everyone passes every "cannot" test. S1
-- asserts that the client AND staff CAN upload under the booking's own path;
-- only then do S2–S6 mean anything (grooming-photos-intake-rls.sql).
--
-- ── WHAT THIS FILE IS ABOUT ────────────────────────────────────────────────
--
-- S0  The bucket is private, 10 MB, images only.
-- S1  The client and staff can upload under the booking's facility/booking.
-- S2  A client cannot under another household's booking.
-- S3  …nor under their own booking with another facility's segment.
-- S4  Another facility's staff read and upload nothing; staff and the
--     client read the file.
-- S5  Signed out, nothing.
-- S6  A booking that is over — completed, cancelled — takes no new photo
--     from its client.
-- S7  The row: its facility is the booking's; its path must be its own; its
--     medication must be on the booking; nobody moves one.
-- S8  A client's delete removes nothing; staff remove.
-- G1  The functions are not anon's.
-- ============================================================================

begin;

set local client_min_messages to warning;

create temp table tap (n serial, name text, ok boolean, detail text);
grant all on tap to authenticated, anon;

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
  ('00000000-0000-0000-0000-0000001f6001', 'bmp-owner@example.invalid'),
  ('00000000-0000-0000-0000-0000001f6002', 'bmp-other@example.invalid'),
  ('00000000-0000-0000-0000-0000001f6003', 'bmp-client@example.invalid'),
  ('00000000-0000-0000-0000-0000001f6005', 'bmp-stranger@example.invalid')
on conflict (id) do nothing;

insert into public.profiles (id, email, full_name) values
  ('00000000-0000-0000-0000-0000001f6001', 'bmp-owner@example.invalid', 'Owner'),
  ('00000000-0000-0000-0000-0000001f6002', 'bmp-other@example.invalid', 'Other'),
  ('00000000-0000-0000-0000-0000001f6003', 'bmp-client@example.invalid', 'Client'),
  ('00000000-0000-0000-0000-0000001f6005', 'bmp-stranger@example.invalid', 'Stranger')
on conflict (id) do update set full_name = excluded.full_name;

insert into public.orgs (id, name, slug) values
  ('00000000-0000-0000-0000-0000001f6010', 'BMP Org', 'bmp-org')
on conflict do nothing;

insert into public.facilities (id, org_id, name, slug, legacy_id) values
  ('00000000-0000-0000-0000-0000001f6020', '00000000-0000-0000-0000-0000001f6010',
   'Kennel', 'bmp-a', 'bmp-a'),
  ('00000000-0000-0000-0000-0000001f6021', '00000000-0000-0000-0000-0000001f6010',
   'Elsewhere', 'bmp-b', 'bmp-b')
on conflict do nothing;

insert into public.facility_memberships (id, facility_id, profile_id, role, is_active) values
  ('00000000-0000-0000-0000-0000001f6030', '00000000-0000-0000-0000-0000001f6020',
   '00000000-0000-0000-0000-0000001f6001', 'owner', true),
  ('00000000-0000-0000-0000-0000001f6031', '00000000-0000-0000-0000-0000001f6021',
   '00000000-0000-0000-0000-0000001f6002', 'owner', true)
on conflict (id) do nothing;

insert into public.clients (id, facility_id, name, email, profile_id) values
  ('00000000-0000-0000-0000-0000001f6040', '00000000-0000-0000-0000-0000001f6020',
   'Guest One', 'bmp-c1@example.invalid', '00000000-0000-0000-0000-0000001f6003'),
  ('00000000-0000-0000-0000-0000001f6041', '00000000-0000-0000-0000-0000001f6020',
   'Guest Two', 'bmp-c2@example.invalid', '00000000-0000-0000-0000-0000001f6005');

insert into public.pets (id, client_id, name, species) values
  ('00000000-0000-0000-0000-0000001f6050', '00000000-0000-0000-0000-0000001f6040', 'Rex', 'dog'),
  ('00000000-0000-0000-0000-0000001f6052', '00000000-0000-0000-0000-0000001f6041', 'Luna', 'dog');

-- Written as the service would: the integrity trigger is about what a client
-- may insert, which is not what this file tests.
insert into public.bookings
  (id, facility_id, client_id, service, service_type, status, start_at, end_at,
   base_price, total_cost, details)
values
  -- Ahead, the client's.
  ('00000000-0000-0000-0000-0000001f6090', '00000000-0000-0000-0000-0000001f6020',
   '00000000-0000-0000-0000-0000001f6040', 'boarding', 'Standard', 'confirmed',
   now() + interval '3 days', now() + interval '5 days', 90, 90,
   '{"medications": [{"id": "med-apoquel", "name": "Apoquel"}]}'::jsonb),
  -- Over: completed, the client's.
  ('00000000-0000-0000-0000-0000001f6091', '00000000-0000-0000-0000-0000001f6020',
   '00000000-0000-0000-0000-0000001f6040', 'boarding', 'Standard', 'completed',
   now() - interval '5 days', now() - interval '3 days', 90, 90,
   '{"medications": [{"id": "med-apoquel", "name": "Apoquel"}]}'::jsonb),
  -- Over: cancelled, the client's.
  ('00000000-0000-0000-0000-0000001f6093', '00000000-0000-0000-0000-0000001f6020',
   '00000000-0000-0000-0000-0000001f6040', 'boarding', 'Standard', 'cancelled',
   now() + interval '8 days', now() + interval '9 days', 90, 90,
   '{"medications": [{"id": "med-apoquel", "name": "Apoquel"}]}'::jsonb),
  -- Another household's, ahead.
  ('00000000-0000-0000-0000-0000001f6092', '00000000-0000-0000-0000-0000001f6020',
   '00000000-0000-0000-0000-0000001f6041', 'boarding', 'Standard', 'confirmed',
   now() + interval '3 days', now() + interval '5 days', 90, 90,
   '{"medications": [{"id": "med-luna", "name": "Rimadyl"}]}'::jsonb);

insert into public.booking_pets (booking_id, pet_id) values
  ('00000000-0000-0000-0000-0000001f6090', '00000000-0000-0000-0000-0000001f6050'),
  ('00000000-0000-0000-0000-0000001f6091', '00000000-0000-0000-0000-0000001f6050'),
  ('00000000-0000-0000-0000-0000001f6093', '00000000-0000-0000-0000-0000001f6050'),
  ('00000000-0000-0000-0000-0000001f6092', '00000000-0000-0000-0000-0000001f6052');

-- ── S0  the bucket ──────────────────────────────────────────────────────────
select pg_temp.t('S0  the bucket is private, 10 MB, images only',
  exists (
    select 1 from storage.buckets
     where id = 'booking-medication-photos' and not public and file_size_limit = 10485760
       and allowed_mime_types @> array['image/png', 'image/jpeg', 'image/heic']
       and not (allowed_mime_types && array['application/pdf', 'image/svg+xml'])
  ));

-- ── S1  the client and staff upload under the booking ──────────────────────
do $$
begin
  perform pg_temp.as_user('00000000-0000-0000-0000-0000001f6003');
  set local role authenticated;
  insert into storage.objects (bucket_id, name)
  values ('booking-medication-photos',
          '00000000-0000-0000-0000-0000001f6020/00000000-0000-0000-0000-0000001f6090/label.jpg');
  reset role;
  perform pg_temp.as_user('00000000-0000-0000-0000-0000001f6001');
  set local role authenticated;
  insert into storage.objects (bucket_id, name)
  values ('booking-medication-photos',
          '00000000-0000-0000-0000-0000001f6020/00000000-0000-0000-0000-0000001f6092/staff.jpg');
  reset role;
  perform pg_temp.t('S1  the client and staff CAN upload under the booking (arms S2–S6)', true);
exception when others then
  reset role; perform pg_temp.t('S1  allowed uploads', false, sqlerrm);
end $$;

-- ── S2  not under another household's booking ──────────────────────────────
do $$
declare v_refused boolean := false;
begin
  perform pg_temp.as_user('00000000-0000-0000-0000-0000001f6003');
  set local role authenticated;
  begin
    insert into storage.objects (bucket_id, name)
    values ('booking-medication-photos',
            '00000000-0000-0000-0000-0000001f6020/00000000-0000-0000-0000-0000001f6092/label.jpg');
  exception when insufficient_privilege then v_refused := true;
  end;
  reset role;
  perform pg_temp.t('S2  a client cannot upload under another household''s booking', v_refused);
exception when others then
  reset role; perform pg_temp.t('S2  other household', false, sqlerrm);
end $$;

-- ── S3  not with another facility's segment ─────────────────────────────────
do $$
declare v_refused boolean := false;
begin
  perform pg_temp.as_user('00000000-0000-0000-0000-0000001f6003');
  set local role authenticated;
  begin
    insert into storage.objects (bucket_id, name)
    values ('booking-medication-photos',
            '00000000-0000-0000-0000-0000001f6021/00000000-0000-0000-0000-0000001f6090/label.jpg');
  exception when insufficient_privilege then v_refused := true;
  end;
  reset role;
  perform pg_temp.t('S3  a client cannot put their booking''s file under another facility', v_refused);
exception when others then
  reset role; perform pg_temp.t('S3  mismatched facility', false, sqlerrm);
end $$;

-- ── S4  another facility's staff, and who reads ────────────────────────────
do $$
declare
  v_refused boolean := false;
  v_staff int; v_client int; v_other int; v_stranger int;
begin
  perform pg_temp.as_user('00000000-0000-0000-0000-0000001f6002');
  set local role authenticated;
  begin
    insert into storage.objects (bucket_id, name)
    values ('booking-medication-photos',
            '00000000-0000-0000-0000-0000001f6020/00000000-0000-0000-0000-0000001f6090/theirs.jpg');
  exception when insufficient_privilege then v_refused := true;
  end;
  select count(*) into v_other from storage.objects
   where bucket_id = 'booking-medication-photos'
     and name like '00000000-0000-0000-0000-0000001f6020/%';
  reset role;
  perform pg_temp.as_user('00000000-0000-0000-0000-0000001f6001');
  set local role authenticated;
  select count(*) into v_staff from storage.objects
   where bucket_id = 'booking-medication-photos'
     and name like '00000000-0000-0000-0000-0000001f6020/%';
  reset role;
  perform pg_temp.as_user('00000000-0000-0000-0000-0000001f6003');
  set local role authenticated;
  select count(*) into v_client from storage.objects
   where bucket_id = 'booking-medication-photos'
     and name like '00000000-0000-0000-0000-0000001f6020/%';
  reset role;
  perform pg_temp.as_user('00000000-0000-0000-0000-0000001f6005');
  set local role authenticated;
  select count(*) into v_stranger from storage.objects
   where bucket_id = 'booking-medication-photos'
     and name like '00000000-0000-0000-0000-0000001f6020/%/label.jpg';
  reset role;
  perform pg_temp.t('S4  another facility uploads and reads nothing; staff read both files, the client their own',
    v_refused and v_other = 0 and v_staff = 2 and v_client = 1 and v_stranger = 0,
    format('other facility refused=%s other reads=%s staff=%s client=%s other household=%s',
      v_refused, v_other, v_staff, v_client, v_stranger));
exception when others then
  reset role; perform pg_temp.t('S4  reads', false, sqlerrm);
end $$;

-- ── S5  signed out ──────────────────────────────────────────────────────────
do $$
declare v_files int := -1; v_rows int := -1; v_refused boolean := false;
begin
  perform pg_temp.as_nobody();
  set local role anon;
  select count(*) into v_files from storage.objects
   where bucket_id = 'booking-medication-photos';
  begin
    select count(*) into v_rows from public.booking_medication_photos;
  exception when insufficient_privilege then v_refused := true;
  end;
  reset role;
  perform pg_temp.t('S5  signed out reads no file and no row',
    v_files = 0 and (v_refused or v_rows = 0),
    format('files=%s rows refused=%s rows=%s', v_files, v_refused, v_rows));
exception when others then
  reset role; perform pg_temp.t('S5  anon', false, sqlerrm);
end $$;

-- ── S6  a booking that is over takes nothing from its client ───────────────
do $$
declare v_completed boolean := false; v_cancelled boolean := false; v_row boolean := false;
begin
  perform pg_temp.as_user('00000000-0000-0000-0000-0000001f6003');
  set local role authenticated;
  begin
    insert into storage.objects (bucket_id, name)
    values ('booking-medication-photos',
            '00000000-0000-0000-0000-0000001f6020/00000000-0000-0000-0000-0000001f6091/label.jpg');
  exception when insufficient_privilege then v_completed := true;
  end;
  begin
    insert into storage.objects (bucket_id, name)
    values ('booking-medication-photos',
            '00000000-0000-0000-0000-0000001f6020/00000000-0000-0000-0000-0000001f6093/label.jpg');
  exception when insufficient_privilege then v_cancelled := true;
  end;
  begin
    insert into public.booking_medication_photos (booking_id, medication_id, storage_path, content_type, size_bytes)
    values ('00000000-0000-0000-0000-0000001f6091', 'med-apoquel',
            '00000000-0000-0000-0000-0000001f6020/00000000-0000-0000-0000-0000001f6091/label.jpg',
            'image/jpeg', 1024);
  exception when insufficient_privilege then v_row := true;
  end;
  reset role;
  perform pg_temp.t('S6  a completed or cancelled booking refuses its client a new file and row',
    v_completed and v_cancelled and v_row,
    format('completed=%s cancelled=%s row=%s', v_completed, v_cancelled, v_row));
exception when others then
  reset role; perform pg_temp.t('S6  over', false, sqlerrm);
end $$;

-- ── S7  the photo row ───────────────────────────────────────────────────────
do $$
declare
  v_row public.booking_medication_photos;
  v_wrong_path boolean := false;
  v_unknown text := '';
  v_no_move boolean := false;
  v_staff_sees int;
begin
  perform pg_temp.as_user('00000000-0000-0000-0000-0000001f6003');
  set local role authenticated;
  -- The facility the caller names is overwritten with the booking's.
  insert into public.booking_medication_photos
    (facility_id, booking_id, medication_id, storage_path, content_type, size_bytes)
  values ('00000000-0000-0000-0000-0000001f6020', '00000000-0000-0000-0000-0000001f6090', 'med-apoquel',
          '00000000-0000-0000-0000-0000001f6020/00000000-0000-0000-0000-0000001f6090/label.jpg',
          'image/jpeg', 2048)
  returning * into v_row;
  begin
    insert into public.booking_medication_photos (booking_id, medication_id, storage_path, content_type, size_bytes)
    values ('00000000-0000-0000-0000-0000001f6090', 'med-apoquel',
            '00000000-0000-0000-0000-0000001f6021/00000000-0000-0000-0000-0000001f6090/elsewhere.jpg',
            'image/jpeg', 2048);
  exception when check_violation then v_wrong_path := true;
  end;
  begin
    insert into public.booking_medication_photos (booking_id, medication_id, storage_path, content_type, size_bytes)
    values ('00000000-0000-0000-0000-0000001f6090', 'med-not-on-it',
            '00000000-0000-0000-0000-0000001f6020/00000000-0000-0000-0000-0000001f6090/other.jpg',
            'image/jpeg', 2048);
  exception when others then v_unknown := sqlstate;
  end;
  begin
    update public.booking_medication_photos set storage_path = 'moved.jpg' where id = v_row.id;
  exception when insufficient_privilege then v_no_move := true;
  end;
  reset role;
  perform pg_temp.as_user('00000000-0000-0000-0000-0000001f6001');
  set local role authenticated;
  select count(*) into v_staff_sees from public.booking_medication_photos where id = v_row.id;
  reset role;
  perform pg_temp.t('S7  the row''s facility is the booking''s; its path its own; its medication the booking''s; nobody moves it',
    v_row.facility_id = '00000000-0000-0000-0000-0000001f6020' and v_wrong_path
      and v_unknown = '23503' and v_no_move and v_staff_sees = 1,
    format('facility=%s wrong path refused=%s unknown medication=%s move refused=%s staff sees=%s',
      v_row.facility_id, v_wrong_path, v_unknown, v_no_move, v_staff_sees));
exception when others then
  reset role; perform pg_temp.t('S7  photo row', false, sqlerrm);
end $$;

-- ── S8  removing ────────────────────────────────────────────────────────────
do $$
declare v_client_gone int; v_staff_gone int; v_left int;
begin
  perform pg_temp.as_user('00000000-0000-0000-0000-0000001f6003');
  set local role authenticated;
  with gone as (
    delete from public.booking_medication_photos
     where booking_id = '00000000-0000-0000-0000-0000001f6090' returning 1
  ) select count(*) into v_client_gone from gone;
  reset role;
  perform pg_temp.as_user('00000000-0000-0000-0000-0000001f6001');
  set local role authenticated;
  with gone as (
    delete from public.booking_medication_photos
     where booking_id = '00000000-0000-0000-0000-0000001f6090' returning 1
  ) select count(*) into v_staff_gone from gone;
  reset role;
  select count(*) into v_left from public.booking_medication_photos
   where booking_id = '00000000-0000-0000-0000-0000001f6090';
  perform pg_temp.t('S8  a client''s delete removes nothing; staff remove',
    v_client_gone = 0 and v_staff_gone = 1 and v_left = 0,
    format('client removed=%s staff removed=%s left=%s', v_client_gone, v_staff_gone, v_left));
exception when others then
  reset role; perform pg_temp.t('S8  removing', false, sqlerrm);
end $$;

-- ── G1  grants ──────────────────────────────────────────────────────────────
select pg_temp.t('G1  no function of the photos is anon''s; the policies'' are authenticated''s',
  not has_function_privilege('anon', 'private.medication_photo_may(uuid, text)', 'execute')
  and not has_function_privilege('anon', 'private.medication_photo_object_may(text, text)', 'execute')
  and not has_function_privilege('anon', 'private.booking_medication_photo_derive()', 'execute')
  and has_function_privilege('authenticated', 'private.medication_photo_may(uuid, text)', 'execute')
  and has_function_privilege('authenticated', 'private.medication_photo_object_may(text, text)', 'execute')
  and not has_table_privilege('anon', 'public.booking_medication_photos', 'select')
  and not has_table_privilege('authenticated', 'public.booking_medication_photos', 'update'));

-- ── Report ──────────────────────────────────────────────────────────────────
select case when ok then '  PASS  ' else '> FAIL <' end as result, name, detail
  from tap order by n;

select count(*) filter (where ok) || ' passed, '
    || count(*) filter (where not ok) || ' failed' as summary
  from tap;

rollback;
