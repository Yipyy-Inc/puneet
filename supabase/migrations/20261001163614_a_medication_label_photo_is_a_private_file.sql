-- ============================================================================
-- A medication's label photo is a private file.
--
-- ── WHAT IT IS FOR ────────────────────────────────────────────────────────
--
-- The facility's Feeding & medications settings can ask for a photo of a
-- medication's pharmacy label ("Ask for a photo of the label"). The booking
-- form's Medications step takes one per medication; the booking page shows
-- it beside the medication, for staff checking what arrived against what was
-- booked.
--
-- ── A FILE AND A ROW ──────────────────────────────────────────────────────
--
-- The file goes to the private `booking-medication-photos` bucket at
-- `{facility_id}/{booking_id}/{uuid}-{name}`; `booking_medication_photos` is
-- the row that says which medication of which booking it shows. Not a field
-- in `details`: the booking's details are replaced whole by every save, and a
-- medication's item is rebuilt by the step — a photo there would be dropped
-- by the next edit. The row's facility is the booking's (trigger), its path
-- must be that facility and that booking (CHECK), and its medication must be
-- one the booking holds (trigger). Nobody updates a photo; a wrong one is
-- removed and another added.
--
-- ── WHO MAY ────────────────────────────────────────────────────────────────
--
--   read     a platform admin, staff who may view the facility's bookings,
--            and the booking's own client
--   attach   staff who may create or edit bookings, and the client while
--            the booking is still ahead — pending, a request, an estimate,
--            waitlisted or confirmed
--   remove   staff who may create or edit bookings
--
-- Decided once, in private.medication_photo_may(), which the row policies and
-- the object policies both call. The object policies read the facility and
-- the booking from the object's own path inside a function, never in a
-- subquery over a table with a `name` column (20260806180000).
-- ============================================================================

-- ── Bucket ──────────────────────────────────────────────────────────────────

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'booking-medication-photos',
  'booking-medication-photos',
  false,
  10485760,  -- 10 MB, matching the CHECK on booking_medication_photos.size_bytes.
  array['image/png', 'image/jpeg', 'image/heic']
)
on conflict (id) do nothing;

-- ── The photos ──────────────────────────────────────────────────────────────

create table if not exists public.booking_medication_photos (
  id            uuid primary key default gen_random_uuid(),
  facility_id   uuid not null references public.facilities(id) on delete cascade,
  booking_id    uuid not null references public.bookings(id) on delete cascade,
  medication_id text not null check (length(medication_id) between 1 and 100),
  storage_path  text not null unique check (length(storage_path) between 1 and 500),
  content_type  text not null check (content_type in ('image/png', 'image/jpeg', 'image/heic')),
  size_bytes    integer not null check (size_bytes > 0 and size_bytes <= 10485760),
  created_by    text default (auth.jwt() ->> 'sub'),
  created_at    timestamptz not null default now(),
  constraint booking_medication_photos_path_is_its_own check (
    split_part(storage_path, '/', 1) = facility_id::text
    and split_part(storage_path, '/', 2) = booking_id::text
  )
);

comment on table public.booking_medication_photos is
  'A photo of a medication''s pharmacy label, taken on the booking form''s Medications step where the facility asks for one. The file lives in the private booking-medication-photos bucket at {facility_id}/{booking_id}/…; this row names the booking and the medication (details.medications[].id) it shows (2026-10-01).';

create index if not exists booking_medication_photos_booking_idx
  on public.booking_medication_photos (booking_id, medication_id, created_at desc);

-- The facility is the booking's, and the medication is one it holds.
create or replace function private.booking_medication_photo_derive()
returns trigger
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  v_medications jsonb;
begin
  select b.facility_id,
         case when jsonb_typeof(b.details -> 'medications') = 'array'
              then b.details -> 'medications' else '[]'::jsonb end
    into new.facility_id, v_medications
    from public.bookings b
   where b.id = new.booking_id;
  if new.facility_id is null then
    raise exception 'That booking does not exist.' using errcode = '23503';
  end if;
  if not exists (
    select 1 from jsonb_array_elements(v_medications) m
     where m ->> 'id' = new.medication_id
  ) then
    raise exception 'That medication is not on this booking.' using errcode = '23503';
  end if;
  return new;
end;
$fn$;

revoke all on function private.booking_medication_photo_derive() from public;
revoke all on function private.booking_medication_photo_derive() from anon;

drop trigger if exists booking_medication_photo_derive on public.booking_medication_photos;
create trigger booking_medication_photo_derive
  before insert on public.booking_medication_photos
  for each row execute function private.booking_medication_photo_derive();

-- Whether the signed-in caller may read, attach to, or remove from a booking's
-- label photos. Called inside policies, so authenticated must execute it.
create or replace function private.medication_photo_may(p_booking_id uuid, p_action text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $fn$
  select exists (
    select 1 from public.bookings b
     where b.id = p_booking_id
       and case p_action
             when 'read' then
               private.is_platform_admin()
               or private.has_permission(b.facility_id, 'view_bookings')
               or b.client_id in (select private.own_client_ids())
             when 'attach' then
               private.has_permission(b.facility_id, 'create_bookings')
               or private.has_permission(b.facility_id, 'edit_bookings')
               or (
                 b.client_id in (select private.own_client_ids())
                 and b.status in ('pending', 'request_submitted', 'estimate_sent', 'waitlisted', 'confirmed')
               )
             when 'remove' then
               private.has_permission(b.facility_id, 'create_bookings')
               or private.has_permission(b.facility_id, 'edit_bookings')
             else false
           end
  );
$fn$;

revoke all on function private.medication_photo_may(uuid, text) from public;
revoke all on function private.medication_photo_may(uuid, text) from anon;
grant execute on function private.medication_photo_may(uuid, text) to authenticated;

-- The same question about a stored object: its path names the facility and
-- the booking, and both must be the booking's own.
create or replace function private.medication_photo_object_may(p_name text, p_action text)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $fn$
declare
  v_folders text[] := storage.foldername(p_name);
  v_booking uuid;
begin
  if coalesce(array_length(v_folders, 1), 0) <> 2 then
    return false;
  end if;
  begin
    v_booking := v_folders[2]::uuid;
  exception when invalid_text_representation then
    return false;
  end;
  return exists (
    select 1 from public.bookings b
     where b.id = v_booking and b.facility_id::text = v_folders[1]
  ) and private.medication_photo_may(v_booking, p_action);
end;
$fn$;

revoke all on function private.medication_photo_object_may(text, text) from public;
revoke all on function private.medication_photo_object_may(text, text) from anon;
grant execute on function private.medication_photo_object_may(text, text) to authenticated;

alter table public.booking_medication_photos enable row level security;

revoke all on public.booking_medication_photos from public;
revoke all on public.booking_medication_photos from anon;
revoke all on public.booking_medication_photos from authenticated;
grant select, insert, delete on public.booking_medication_photos to authenticated;
grant all on public.booking_medication_photos to service_role;

drop policy if exists booking_medication_photos_read on public.booking_medication_photos;
create policy booking_medication_photos_read on public.booking_medication_photos
  for select to authenticated
  using (private.medication_photo_may(booking_id, 'read'));

drop policy if exists booking_medication_photos_insert on public.booking_medication_photos;
create policy booking_medication_photos_insert on public.booking_medication_photos
  for insert to authenticated
  with check (private.medication_photo_may(booking_id, 'attach'));

drop policy if exists booking_medication_photos_delete on public.booking_medication_photos;
create policy booking_medication_photos_delete on public.booking_medication_photos
  for delete to authenticated
  using (private.medication_photo_may(booking_id, 'remove'));

-- ── RLS on the objects ──────────────────────────────────────────────────────

drop policy if exists booking_medication_photos_object_read on storage.objects;
create policy booking_medication_photos_object_read on storage.objects
  for select to authenticated
  using (
    bucket_id = 'booking-medication-photos'
    and private.medication_photo_object_may(name, 'read')
  );

drop policy if exists booking_medication_photos_object_insert on storage.objects;
create policy booking_medication_photos_object_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'booking-medication-photos'
    and private.medication_photo_object_may(name, 'attach')
  );

drop policy if exists booking_medication_photos_object_delete on storage.objects;
create policy booking_medication_photos_object_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'booking-medication-photos'
    and private.medication_photo_object_may(name, 'remove')
  );

-- ── A revoke is not verified by having been written ───────────────────────

do $check$
begin
  if exists (select 1 from storage.buckets where id = 'booking-medication-photos' and public) then
    raise exception 'the medication photo bucket is public';
  end if;
  if has_table_privilege('anon', 'public.booking_medication_photos', 'select') then
    raise exception 'anon can read medication photos';
  end if;
  if has_table_privilege('authenticated', 'public.booking_medication_photos', 'update') then
    raise exception 'authenticated can move a medication photo';
  end if;
  if has_function_privilege('anon', 'private.medication_photo_may(uuid, text)', 'execute') then
    raise exception 'anon can execute medication_photo_may()';
  end if;
  if has_function_privilege('anon', 'private.medication_photo_object_may(text, text)', 'execute') then
    raise exception 'anon can execute medication_photo_object_may()';
  end if;
  if has_function_privilege('anon', 'private.booking_medication_photo_derive()', 'execute') then
    raise exception 'anon can execute booking_medication_photo_derive()';
  end if;
  if not has_function_privilege('authenticated', 'private.medication_photo_may(uuid, text)', 'execute') then
    raise exception 'authenticated cannot execute medication_photo_may(), which its policies call';
  end if;
  if not has_function_privilege('authenticated', 'private.medication_photo_object_may(text, text)', 'execute') then
    raise exception 'authenticated cannot execute medication_photo_object_may(), which its policies call';
  end if;
end;
$check$;
