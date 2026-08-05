-- ============================================================================
-- Grooming photos + intake, and the storage-object policies
-- (20260806180000, 20260806200000).
--
--   psql "$(supabase status -o json | jq -r .DB_URL)" \
--     -f supabase/tests/grooming-photos-intake-rls.sql
--
-- One transaction, rolled back. Fixture emails are @example.invalid.
--
-- ── ASSERT THE POSITIVE CASE, OR THE NEGATIVE ONE MEANS NOTHING ────────────
--
-- This file exists in its current shape because of what S1 caught. The first
-- version of the grooming object policies used:
--
--   exists (select 1 from public.facilities f
--            where f.id::text = (storage.foldername(name))[1] and …)
--
-- `public.facilities` has a column called `name`, so the unqualified `name`
-- inside that subquery binds to the FACILITY's name rather than the object's.
-- The predicate was false for every row and every access was denied.
--
-- S2 — "cannot upload under another facility's prefix" — PASSED THROUGHOUT.
-- It was passing because nobody could upload anywhere. Only S1, asserting that
-- a facility CAN upload under its own prefix, exposed it.
--
-- The same bug was live in the shipped staff-documents policies; D1–D4 below
-- cover the fix (20260806200000).
--
-- ── WHAT ELSE THIS FILE IS ABOUT ───────────────────────────────────────────
--
-- 1. THE BUCKET IS PRIVATE AND IMAGES-ONLY (T1). "Private by convention" is
--    not private; `public = false` means no URL works without a token.
-- 2. THE FACILITY AND AUTHOR ARE DERIVED (T2) on both tables — RLS gates rows,
--    not columns, so a caller who may write may otherwise choose whose business
--    the row belongs to and whose name is on it.
-- 3. HALF A MATTING FEE IS REFUSED (T3). A warning with no amount is a warning
--    about nothing; an amount with no warning is a charge nobody was told about.
-- 4. A CLIENT SEES NEITHER (T5), while still seeing their own booking.
-- ============================================================================

begin;

set local client_min_messages to warning;

create temp table tap (n serial, name text, ok boolean, detail text);
grant all on tap to authenticated;

create or replace function pg_temp.t(p_name text, p_ok boolean, p_detail text default '')
returns void language sql as $$
  insert into tap(name, ok, detail) values (p_name, p_ok, p_detail);
$$;

-- ── Fixture ─────────────────────────────────────────────────────────────────

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000010a001', 'ph-owner@example.invalid'),
  ('00000000-0000-0000-0000-00000010a003', 'ph-client@example.invalid'),
  ('00000000-0000-0000-0000-00000010a004', 'ph-rival@example.invalid')
on conflict (id) do nothing;

insert into public.profiles (id, email, full_name) values
  ('00000000-0000-0000-0000-00000010a001', 'ph-owner@example.invalid',  'Marcus Thompson'),
  ('00000000-0000-0000-0000-00000010a003', 'ph-client@example.invalid', 'Client'),
  ('00000000-0000-0000-0000-00000010a004', 'ph-rival@example.invalid',  'Rival')
on conflict (id) do update set full_name = excluded.full_name;

insert into public.orgs (id, name, slug) values
  ('00000000-0000-0000-0000-00000010a010', 'Ph Org',   'ph-org'),
  ('00000000-0000-0000-0000-00000010a011', 'Ph Rival', 'ph-rival-org')
on conflict (id) do nothing;

insert into public.facilities (id, org_id, name, slug, legacy_id) values
  ('00000000-0000-0000-0000-00000010a020', '00000000-0000-0000-0000-00000010a010',
   'Salon A', 'ph-a', 'ph-a'),
  ('00000000-0000-0000-0000-00000010a021', '00000000-0000-0000-0000-00000010a011',
   'Salon B', 'ph-b', 'ph-b')
on conflict (id) do nothing;

insert into public.facility_memberships (id, facility_id, profile_id, role, is_active) values
  ('00000000-0000-0000-0000-00000010a030', '00000000-0000-0000-0000-00000010a020',
   '00000000-0000-0000-0000-00000010a001', 'owner', true),
  ('00000000-0000-0000-0000-00000010a031', '00000000-0000-0000-0000-00000010a021',
   '00000000-0000-0000-0000-00000010a004', 'owner', true)
on conflict (id) do nothing;

insert into public.clients (id, facility_id, name, email, profile_id) values
  ('00000000-0000-0000-0000-00000010a040', '00000000-0000-0000-0000-00000010a020',
   'Client A', 'ph-client@example.invalid', '00000000-0000-0000-0000-00000010a003');

insert into public.bookings
  (id, facility_id, client_id, service, service_type, status, start_at, end_at,
   base_price, total_cost)
values
  ('00000000-0000-0000-0000-00000010a070', '00000000-0000-0000-0000-00000010a020',
   '00000000-0000-0000-0000-00000010a040', 'grooming', 'full_groom', 'confirmed',
   '2026-08-07T10:00:00Z', '2026-08-07T11:30:00Z', 80, 80);

insert into public.grooming_appointments
  (booking_id, facility_id, service_name, service_price, service_duration_min)
values
  ('00000000-0000-0000-0000-00000010a070', '00000000-0000-0000-0000-00000010a020',
   'Full Groom', 80, 90);

-- ── T1: the bucket is private, images only ──────────────────────────────────
do $$
declare pub boolean; mimes text[]; lim bigint;
begin
  select public, allowed_mime_types, file_size_limit into pub, mimes, lim
    from storage.buckets where id = 'grooming-photos';
  perform pg_temp.t('T1  the bucket is PRIVATE and images-only',
    pub = false and lim = 10485760
    and mimes @> array['image/png','image/jpeg','image/heic']
    and not (mimes @> array['application/pdf']),
    format('public=%s limit=%s mimes=%s', pub, lim, mimes));
end $$;

-- ── T2: the facility and the author are derived, not accepted ───────────────
do $$
declare pf uuid; pa text; if_ uuid; ia text;
begin
  perform set_config('request.jwt.claims', json_build_object('sub', '00000000-0000-0000-0000-00000010a001', 'role', 'authenticated')::text, true);
  set local role authenticated;
  insert into public.grooming_photos
    (id, booking_id, facility_id, kind, storage_path, content_type, size_bytes, author_name)
  values ('00000000-0000-0000-0000-00000010a080', '00000000-0000-0000-0000-00000010a070',
          '00000000-0000-0000-0000-00000010a021',   -- Salon B's id
          'before', 'p/1.jpg', 'image/jpeg', 1024, 'Somebody Else');
  insert into public.grooming_intake (booking_id, facility_id, coat_condition, author_name)
  values ('00000000-0000-0000-0000-00000010a070',
          '00000000-0000-0000-0000-00000010a021', 'matted', 'Somebody Else');
  reset role;
  select facility_id, author_name into pf, pa from public.grooming_photos
   where id = '00000000-0000-0000-0000-00000010a080';
  select facility_id, author_name into if_, ia from public.grooming_intake
   where booking_id = '00000000-0000-0000-0000-00000010a070';
  perform pg_temp.t('T2  facility and author are derived on both tables, not accepted',
    pf = '00000000-0000-0000-0000-00000010a020' and pa = 'Marcus Thompson'
    and if_ = '00000000-0000-0000-0000-00000010a020' and ia = 'Marcus Thompson',
    format('photo=%s/%s intake=%s/%s', pf, pa, if_, ia));
exception when others then
  reset role; perform pg_temp.t('T2  derivation', false, sqlerrm);
end $$;

-- ── T3: shape checks ────────────────────────────────────────────────────────
do $$
declare bad integer := 0;
begin
  perform set_config('request.jwt.claims', json_build_object('sub', '00000000-0000-0000-0000-00000010a001', 'role', 'authenticated')::text, true);
  set local role authenticated;
  begin  -- a PDF recorded as a photo
    insert into public.grooming_photos (booking_id, facility_id, kind, storage_path, content_type, size_bytes)
    values ('00000000-0000-0000-0000-00000010a070', '00000000-0000-0000-0000-00000010a020',
            'before', 'p/2.pdf', 'application/pdf', 1024);
    bad := bad + 1;
  exception when check_violation then null; end;
  begin  -- oversize
    insert into public.grooming_photos (booking_id, facility_id, kind, storage_path, content_type, size_bytes)
    values ('00000000-0000-0000-0000-00000010a070', '00000000-0000-0000-0000-00000010a020',
            'before', 'p/3.jpg', 'image/jpeg', 10485761);
    bad := bad + 1;
  exception when check_violation then null; end;
  begin  -- a matting fee with no warning
    update public.grooming_intake set matting_fee_amount = 25
     where booking_id = '00000000-0000-0000-0000-00000010a070';
    bad := bad + 1;
  exception when check_violation then null; end;
  begin  -- a warning with no amount
    update public.grooming_intake set matting_fee_warning = true
     where booking_id = '00000000-0000-0000-0000-00000010a070';
    bad := bad + 1;
  exception when check_violation then null; end;
  -- Not vacuous: both together are accepted.
  update public.grooming_intake set matting_fee_warning = true, matting_fee_amount = 25
   where booking_id = '00000000-0000-0000-0000-00000010a070';
  reset role;
  perform pg_temp.t('T3  non-images, oversize files and half a matting fee are refused',
    bad = 0, format('accepted_bad=%s', bad));
exception when others then
  reset role; perform pg_temp.t('T3  shape', false, sqlerrm);
end $$;

-- ── T4: intake is one row per appointment ───────────────────────────────────
do $$
declare ok boolean;
begin
  perform set_config('request.jwt.claims', json_build_object('sub', '00000000-0000-0000-0000-00000010a001', 'role', 'authenticated')::text, true);
  set local role authenticated;
  begin
    insert into public.grooming_intake (booking_id, facility_id)
    values ('00000000-0000-0000-0000-00000010a070', '00000000-0000-0000-0000-00000010a020');
    ok := false;
  exception when unique_violation then ok := true; end;
  reset role;
  perform pg_temp.t('T4  an appointment cannot have two intake records', ok);
exception when others then
  reset role; perform pg_temp.t('T4  1:1', false, sqlerrm);
end $$;

-- ── T5: staff-only reads ────────────────────────────────────────────────────
do $$
declare cph integer; cin integer; cbk integer; rph integer;
begin
  perform set_config('request.jwt.claims', json_build_object('sub', '00000000-0000-0000-0000-00000010a003', 'role', 'authenticated')::text, true);
  set local role authenticated;
  select count(*) into cph from public.grooming_photos;
  select count(*) into cin from public.grooming_intake;
  select count(*) into cbk from public.bookings;
  reset role;
  perform set_config('request.jwt.claims', json_build_object('sub', '00000000-0000-0000-0000-00000010a004', 'role', 'authenticated')::text, true);
  set local role authenticated;
  select count(*) into rph from public.grooming_photos;
  reset role;
  perform pg_temp.t('T5  a client sees no photos or intake but still sees their booking',
    cph = 0 and cin = 0 and cbk = 1 and rph = 0,
    format('client photos=%s intake=%s bookings=%s | rival photos=%s',
           cph, cin, cbk, rph));
exception when others then
  reset role; perform pg_temp.t('T5  read isolation', false, sqlerrm);
end $$;

-- ── S1: a facility CAN upload under its own prefix ──────────────────────────
-- THE ASSERTION THAT CAUGHT THE BUG. See the header — without this, S2 passes
-- against a policy that denies everybody.
do $$
declare ok boolean;
begin
  perform set_config('request.jwt.claims', json_build_object('sub', '00000000-0000-0000-0000-00000010a001', 'role', 'authenticated')::text, true);
  set local role authenticated;
  insert into storage.objects (bucket_id, name)
  values ('grooming-photos', '00000000-0000-0000-0000-00000010a020/bk/a.jpg');
  ok := true;
  reset role;
  perform pg_temp.t('S1  a facility CAN upload under its own prefix (arms S2)', ok);
exception when others then
  reset role; perform pg_temp.t('S1  own-prefix upload', false, sqlerrm);
end $$;

-- ── S2: …and cannot upload under another facility's ─────────────────────────
do $$
declare ok boolean;
begin
  perform set_config('request.jwt.claims', json_build_object('sub', '00000000-0000-0000-0000-00000010a001', 'role', 'authenticated')::text, true);
  set local role authenticated;
  begin
    insert into storage.objects (bucket_id, name)
    values ('grooming-photos', '00000000-0000-0000-0000-00000010a021/bk/steal.jpg');
    ok := false;
  exception when insufficient_privilege then ok := true; end;
  reset role;
  perform pg_temp.t('S2  cannot upload under another facility''s prefix', ok);
exception when others then
  reset role; perform pg_temp.t('S2  cross-prefix upload', false, sqlerrm);
end $$;

-- ── S3: object reads are scoped to the facility ─────────────────────────────
do $$
declare mine integer; theirs integer;
begin
  perform set_config('request.jwt.claims', json_build_object('sub', '00000000-0000-0000-0000-00000010a001', 'role', 'authenticated')::text, true);
  set local role authenticated;
  select count(*) into mine from storage.objects where bucket_id = 'grooming-photos';
  reset role;
  perform set_config('request.jwt.claims', json_build_object('sub', '00000000-0000-0000-0000-00000010a004', 'role', 'authenticated')::text, true);
  set local role authenticated;
  select count(*) into theirs from storage.objects where bucket_id = 'grooming-photos';
  reset role;
  perform pg_temp.t('S3  the owner sees its object; the rival sees none',
    mine = 1 and theirs = 0, format('owner=%s rival=%s', mine, theirs));
exception when others then
  reset role; perform pg_temp.t('S3  object read', false, sqlerrm);
end $$;

-- ── S4: a malformed segment matches nothing rather than erroring ────────────
-- Why the path is compared AS TEXT. `(storage.foldername(name))[1]::uuid` would
-- raise 22P02 on this row and fail the whole query for every caller.
do $$
declare visible integer;
begin
  perform set_config('request.jwt.claims', '', true);
  insert into storage.objects (bucket_id, name)
  values ('grooming-photos', 'not-a-uuid/bk/x.jpg');
  perform set_config('request.jwt.claims', json_build_object('sub', '00000000-0000-0000-0000-00000010a001', 'role', 'authenticated')::text, true);
  set local role authenticated;
  select count(*) into visible from storage.objects where bucket_id = 'grooming-photos';
  reset role;
  perform pg_temp.t('S4  a malformed path segment matches nothing instead of erroring the query',
    visible = 1, format('visible=%s of 2 objects', visible));
exception when others then
  reset role; perform pg_temp.t('S4  malformed segment', false, sqlerrm);
end $$;

-- NOTE: there is no object-DELETE assertion. Supabase refuses direct DELETE on
-- `storage.objects` from SQL ("Use the Storage API instead") whatever the
-- policy says, so it cannot be exercised here. The delete policy carries the
-- same predicate as the insert policy, which S1/S2 do cover.

-- ── D1–D4: the staff-documents fix (20260806200000) ────────────────────────
-- The same shadowing bug was live in the shipped policies. Its `manage_staff`
-- arm never matched, so a manager could not read or upload, and DELETE — whose
-- only arm was that one — was impossible for everybody.

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000011c001', 'sd-mgr@example.invalid'),
  ('00000000-0000-0000-0000-00000011c002', 'sd-emp@example.invalid')
on conflict (id) do nothing;
insert into public.profiles (id, email, full_name) values
  ('00000000-0000-0000-0000-00000011c001', 'sd-mgr@example.invalid', 'Manager'),
  ('00000000-0000-0000-0000-00000011c002', 'sd-emp@example.invalid', 'Employee')
on conflict (id) do update set full_name = excluded.full_name;
insert into public.facility_memberships (id, facility_id, profile_id, role, is_active) values
  ('00000000-0000-0000-0000-00000011c030', '00000000-0000-0000-0000-00000010a020',
   '00000000-0000-0000-0000-00000011c001', 'owner', true),
  ('00000000-0000-0000-0000-00000011c032', '00000000-0000-0000-0000-00000010a020',
   '00000000-0000-0000-0000-00000011c002', 'groomer', true)
on conflict (id) do nothing;
insert into public.staff
  (id, facility_id, membership_id, legacy_id, first_name, last_name, email, primary_role)
values ('00000000-0000-0000-0000-00000011c050', '00000000-0000-0000-0000-00000010a020',
        '00000000-0000-0000-0000-00000011c032', 'sd-emp',
        'The', 'Employee', 'sd-emp@example.invalid', 'groomer');

do $$
declare ok boolean;
begin
  perform set_config('request.jwt.claims', json_build_object('sub', '00000000-0000-0000-0000-00000011c001', 'role', 'authenticated')::text, true);
  set local role authenticated;
  insert into storage.objects (bucket_id, name)
  values ('staff-documents',
          '00000000-0000-0000-0000-00000010a020/00000000-0000-0000-0000-00000011c050/roe.pdf');
  ok := true;
  reset role;
  perform pg_temp.t('D1  a manage_staff holder can upload for a staff member', ok);
exception when others then
  reset role; perform pg_temp.t('D1  manager upload', false, sqlerrm);
end $$;

do $$
declare mgr integer; emp integer;
begin
  perform set_config('request.jwt.claims', json_build_object('sub', '00000000-0000-0000-0000-00000011c001', 'role', 'authenticated')::text, true);
  set local role authenticated;
  select count(*) into mgr from storage.objects where bucket_id = 'staff-documents';
  reset role;
  perform set_config('request.jwt.claims', json_build_object('sub', '00000000-0000-0000-0000-00000011c002', 'role', 'authenticated')::text, true);
  set local role authenticated;
  select count(*) into emp from storage.objects where bucket_id = 'staff-documents';
  reset role;
  perform pg_temp.t('D2  the manager reads it; the employee still reads their own',
    mgr = 1 and emp = 1, format('manager=%s employee=%s', mgr, emp));
exception when others then
  reset role; perform pg_temp.t('D2  reads', false, sqlerrm);
end $$;

do $$
declare seen integer; blocked boolean;
begin
  perform set_config('request.jwt.claims', json_build_object('sub', '00000000-0000-0000-0000-00000010a004', 'role', 'authenticated')::text, true);
  set local role authenticated;
  select count(*) into seen from storage.objects where bucket_id = 'staff-documents';
  begin
    insert into storage.objects (bucket_id, name)
    values ('staff-documents',
            '00000000-0000-0000-0000-00000010a020/00000000-0000-0000-0000-00000011c050/steal.pdf');
    blocked := false;
  exception when insufficient_privilege then blocked := true; end;
  reset role;
  perform pg_temp.t('D3  a rival sees nothing and cannot upload into that facility''s prefix',
    seen = 0 and blocked, format('seen=%s blocked=%s', seen, blocked));
exception when others then
  reset role; perform pg_temp.t('D3  rival', false, sqlerrm);
end $$;

do $$
declare blocked boolean;
begin
  perform set_config('request.jwt.claims', json_build_object('sub', '00000000-0000-0000-0000-00000011c002', 'role', 'authenticated')::text, true);
  set local role authenticated;
  begin
    insert into storage.objects (bucket_id, name)
    values ('staff-documents',
            '00000000-0000-0000-0000-00000010a020/00000000-0000-0000-0000-00000011c099/other.pdf');
    blocked := false;
  exception when insufficient_privilege then blocked := true; end;
  reset role;
  perform pg_temp.t('D4  an employee cannot upload into a colleague''s prefix', blocked);
exception when others then
  reset role; perform pg_temp.t('D4  colleague prefix', false, sqlerrm);
end $$;

-- ── Report ──────────────────────────────────────────────────────────────────
select case when ok then '  PASS  ' else '> FAIL <' end as result, name, detail
  from tap order by n;

select count(*) filter (where ok) || ' passed, '
    || count(*) filter (where not ok) || ' failed' as summary
  from tap;

rollback;
