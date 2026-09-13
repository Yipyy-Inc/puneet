-- ============================================================================
-- A pre-arrival photo is a private file.
--
-- ── WHAT IT REPLACES ──────────────────────────────────────────────────────
--
-- The pre-arrival form let an owner photograph the belongings and a
-- medication's label, and kept `URL.createObjectURL(file)` — a blob: URL that
-- means something only in the tab that made it. Nothing was uploaded; the
-- facility never saw a photo, and "use the same as last time" copied a dead
-- link. No bucket let a customer upload at all.
--
-- ── A FILE AND A ROW ──────────────────────────────────────────────────────
--
-- The file goes to the private `yipyy-go-photos` bucket at
-- `{facility_id}/{submission_id}/{uuid}-{name}`; `yipyy_go_photos` is the row
-- the form points at, by id — never a URL. The row's facility is the form's
-- (trigger), and its path must be that facility and that form (CHECK), so a
-- row cannot claim a file somewhere else. Nobody updates a photo; a wrong one
-- is deleted and uploaded again.
--
-- ── WHO MAY ────────────────────────────────────────────────────────────────
--
-- The owner uploads and removes, for a form that is theirs and still open
-- (private.yipyy_go_owner_may_attach — the same editable rule as the form, so
-- a closed form takes no new photos). Staff with view_bookings read their
-- facility's; the owner reads their own. Storage policies compare path
-- segments computed in the outer scope against a set — never inside a
-- subquery over a table with a `name` column (20260806180000).
-- ============================================================================

-- ── Bucket ──────────────────────────────────────────────────────────────────

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'yipyy-go-photos',
  'yipyy-go-photos',
  false,
  10485760,  -- 10 MB, matching the CHECK on yipyy_go_photos.size_bytes.
  array['image/png', 'image/jpeg', 'image/heic']
)
on conflict (id) do nothing;

-- ── The photos ──────────────────────────────────────────────────────────────

create table if not exists public.yipyy_go_photos (
  id            uuid primary key default gen_random_uuid(),
  facility_id   uuid not null references public.facilities(id) on delete cascade,
  submission_id uuid not null references public.yipyy_go_submissions(id) on delete cascade,
  kind          text not null check (kind in ('belongings', 'medication', 'question')),
  item_ref      text check (item_ref is null or length(item_ref) between 1 and 100),
  storage_path  text not null unique check (length(storage_path) between 1 and 500),
  content_type  text not null check (content_type in ('image/png', 'image/jpeg', 'image/heic')),
  size_bytes    integer not null check (size_bytes > 0 and size_bytes <= 10485760),
  created_by    text default (auth.jwt() ->> 'sub'),
  created_at    timestamptz not null default now(),
  constraint yipyy_go_photos_path_is_its_own check (
    split_part(storage_path, '/', 1) = facility_id::text
    and split_part(storage_path, '/', 2) = submission_id::text
  )
);

comment on table public.yipyy_go_photos is
  'A photo an owner attached to a pre-arrival form: of the belongings, a medication label, or an answer to a question. The file lives in the private yipyy-go-photos bucket at {facility_id}/{submission_id}/…; this row is what the form points at, by id. Replaces blob: URLs that died with the tab (2026-09-13).';

create index if not exists yipyy_go_photos_submission_idx on public.yipyy_go_photos (submission_id);

-- The facility is the submission's, and a photo never moves.
create or replace function private.yipyy_go_photo_derive()
returns trigger
language plpgsql
security definer
set search_path = ''
as $fn$
begin
  select y.facility_id into new.facility_id
    from public.yipyy_go_submissions y where y.id = new.submission_id;
  if new.facility_id is null then
    raise exception 'That form does not exist.' using errcode = '23503';
  end if;
  return new;
end;
$fn$;

revoke all on function private.yipyy_go_photo_derive() from public;
revoke all on function private.yipyy_go_photo_derive() from anon;

drop trigger if exists yipyy_go_photo_derive on public.yipyy_go_photos;
create trigger yipyy_go_photo_derive
  before insert on public.yipyy_go_photos
  for each row execute function private.yipyy_go_photo_derive();

-- Whether the signed-in owner may still attach to, or remove from, this form.
-- Called inside policies, so authenticated must be able to execute it.
create or replace function private.yipyy_go_owner_may_attach(p_submission_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $fn$
  select exists (
    select 1 from public.yipyy_go_submissions y
     where y.id = p_submission_id
       and y.client_id in (select private.own_client_ids())
       and coalesce(private.yipyy_go_editable(y.booking_id, y.status), false)
  );
$fn$;

revoke all on function private.yipyy_go_owner_may_attach(uuid) from public;
revoke all on function private.yipyy_go_owner_may_attach(uuid) from anon;
grant execute on function private.yipyy_go_owner_may_attach(uuid) to authenticated;

alter table public.yipyy_go_photos enable row level security;

revoke all on public.yipyy_go_photos from public;
revoke all on public.yipyy_go_photos from anon;
revoke all on public.yipyy_go_photos from authenticated;
grant select, insert, delete on public.yipyy_go_photos to authenticated;
grant all on public.yipyy_go_photos to service_role;

drop policy if exists yipyy_go_photos_read on public.yipyy_go_photos;
create policy yipyy_go_photos_read on public.yipyy_go_photos
  for select using (
    private.is_platform_admin()
    or private.has_permission(facility_id, 'view_bookings')
    or submission_id in (
      select y.id from public.yipyy_go_submissions y
       where y.client_id in (select private.own_client_ids())
    )
  );

drop policy if exists yipyy_go_photos_insert on public.yipyy_go_photos;
create policy yipyy_go_photos_insert on public.yipyy_go_photos
  for insert with check (private.yipyy_go_owner_may_attach(submission_id));

drop policy if exists yipyy_go_photos_delete on public.yipyy_go_photos;
create policy yipyy_go_photos_delete on public.yipyy_go_photos
  for delete using (private.yipyy_go_owner_may_attach(submission_id));

-- ── RLS on the objects ──────────────────────────────────────────────────────
--
-- Segments are computed in the outer scope and compared to a set, never inside
-- a subquery over a table with a `name` column (20260806180000). Staff read by
-- the facility segment; the owner reads, uploads and removes by the
-- facility/submission pair of a form that is theirs and still open.

drop policy if exists yipyy_go_photos_object_read on storage.objects;
create policy yipyy_go_photos_object_read on storage.objects
  for select to authenticated
  using (
    bucket_id = 'yipyy-go-photos'
    and (
      (storage.foldername(name))[1] in (
        select f.id::text from public.facilities f
         where private.has_permission(f.id, 'view_bookings')
      )
      or (storage.foldername(name))[2] in (
        select y.id::text from public.yipyy_go_submissions y
         where y.client_id in (select private.own_client_ids())
      )
    )
  );

drop policy if exists yipyy_go_photos_object_insert on storage.objects;
create policy yipyy_go_photos_object_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'yipyy-go-photos'
    and ((storage.foldername(name))[1] || '/' || (storage.foldername(name))[2]) in (
      select y.facility_id::text || '/' || y.id::text
        from public.yipyy_go_submissions y
       where private.yipyy_go_owner_may_attach(y.id)
    )
  );

drop policy if exists yipyy_go_photos_object_delete on storage.objects;
create policy yipyy_go_photos_object_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'yipyy-go-photos'
    and ((storage.foldername(name))[1] || '/' || (storage.foldername(name))[2]) in (
      select y.facility_id::text || '/' || y.id::text
        from public.yipyy_go_submissions y
       where private.yipyy_go_owner_may_attach(y.id)
    )
  );

-- ── A revoke is not verified by having been written ───────────────────────

do $check$
begin
  if exists (select 1 from storage.buckets where id = 'yipyy-go-photos' and public) then
    raise exception 'the pre-arrival photo bucket is public';
  end if;
  if has_table_privilege('anon', 'public.yipyy_go_photos', 'select') then
    raise exception 'anon can read pre-arrival photos';
  end if;
  if has_table_privilege('authenticated', 'public.yipyy_go_photos', 'update') then
    raise exception 'authenticated can move a pre-arrival photo';
  end if;
  if has_function_privilege('anon', 'private.yipyy_go_owner_may_attach(uuid)', 'execute') then
    raise exception 'anon can execute yipyy_go_owner_may_attach()';
  end if;
  if not has_function_privilege('authenticated', 'private.yipyy_go_owner_may_attach(uuid)', 'execute') then
    raise exception 'authenticated cannot execute yipyy_go_owner_may_attach(), which its policies call';
  end if;
end;
$check$;
