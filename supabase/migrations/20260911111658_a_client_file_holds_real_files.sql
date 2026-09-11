-- ============================================================================
-- A client's file holds real files.
--
-- ── WHAT WAS THERE ────────────────────────────────────────────────────────
--
-- The client file's Documents tab read `clientDocuments` from
-- `@/data/documents`, keyed by a numeric client id — a real client whose ref
-- matched a fixture client showed that client's "Service Agreement - 2024",
-- linked to a PDF path that does not exist. "Upload" and "Download" had no
-- handler. There was no table and no bucket for a client's files at all; the
-- five buckets are staff documents, grooming photos, facility logos, report
-- card photos and merchant applications.
--
-- ── THE SHAPE ─────────────────────────────────────────────────────────────
--
-- `client_documents` describes a file; the bytes live in the private
-- `client-documents` bucket under {facility_id}/{client_id}/{uuid}-{name}, the
-- prefix storage RLS matches on, built by the route from the row it resolved.
-- The same limits as staff documents (PDF, PNG, JPEG, HEIC; 10 MB) are
-- repeated as CHECK constraints, because PostgREST is reachable without the
-- route.
--
-- Signed agreements are NOT copied here: `waiver_signatures` is already their
-- record, and the tab reads both.
--
-- ── WHO ───────────────────────────────────────────────────────────────────
--
--   read    `view_client_documents` — the front-of-house permission the waiver
--           log uses ("is this on file?" is a check-in question)
--   file    `edit_clients`
--   remove  `edit_clients`
--
-- There is no UPDATE policy. A document filed under the wrong type is removed
-- and filed again; its bytes are never rewritten under the same row.
--
-- The facility is the CLIENT's, set by the trigger below whatever the insert
-- names, and a pet named on the row must belong to that client.
-- ============================================================================

create table if not exists public.client_documents (
  id uuid primary key default gen_random_uuid(),
  facility_id uuid not null references public.facilities(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  pet_id uuid references public.pets(id) on delete set null,

  doc_type text not null default 'other'
    check (doc_type in ('agreement', 'waiver', 'medical', 'vaccination',
                        'license', 'insurance', 'other')),
  file_name text not null
    check (btrim(file_name) <> '' and char_length(file_name) <= 200),
  content_type text not null
    check (content_type in ('application/pdf', 'image/png', 'image/jpeg', 'image/heic')),
  size_bytes integer not null check (size_bytes > 0 and size_bytes <= 10485760),
  storage_path text not null unique,

  notes text check (notes is null or char_length(notes) <= 2000),
  expires_on date,

  uploaded_by text,
  uploaded_by_name text,
  created_at timestamptz not null default now()
);

comment on table public.client_documents is
  'Files on a client''s record (agreements scanned at the desk, vet records, insurance). Bytes in the client-documents bucket; signed waivers live in waiver_signatures.';

create index if not exists client_documents_client_idx
  on public.client_documents (client_id, created_at desc);
create index if not exists client_documents_facility_idx
  on public.client_documents (facility_id);

create or replace function private.client_document_facility()
returns trigger
language plpgsql
security definer
set search_path = ''
as $fn$
declare v_facility uuid;
begin
  select facility_id into v_facility from public.clients where id = new.client_id;
  if v_facility is null then
    raise exception 'no such client' using errcode = '23503';
  end if;
  -- Set, not compared: the client owns the answer.
  new.facility_id := v_facility;

  if new.pet_id is not null and not exists (
    select 1 from public.pets p
     where p.id = new.pet_id and p.client_id = new.client_id
  ) then
    raise exception 'That pet is not this client''s.' using errcode = '23514';
  end if;
  return new;
end;
$fn$;

revoke all on function private.client_document_facility() from public, anon;

drop trigger if exists client_documents_set_facility on public.client_documents;
create trigger client_documents_set_facility
  before insert on public.client_documents
  for each row execute function private.client_document_facility();

alter table public.client_documents enable row level security;

drop policy if exists client_documents_read on public.client_documents;
create policy client_documents_read on public.client_documents
  for select to authenticated
  using (
    private.is_platform_admin()
    or private.has_permission(facility_id, 'view_client_documents')
  );

drop policy if exists client_documents_insert on public.client_documents;
create policy client_documents_insert on public.client_documents
  for insert to authenticated
  with check (private.has_permission(facility_id, 'edit_clients'));

drop policy if exists client_documents_delete on public.client_documents;
create policy client_documents_delete on public.client_documents
  for delete to authenticated
  using (private.has_permission(facility_id, 'edit_clients'));

revoke all on public.client_documents from public, anon;
grant select, insert, delete on public.client_documents to authenticated;

-- ── The bucket ────────────────────────────────────────────────────────────

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('client-documents', 'client-documents', false, 10485760,
        array['application/pdf', 'image/png', 'image/jpeg', 'image/heic'])
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- The segment is computed in the OUTER scope and compared against a set of
-- facility ids — see 20260806200000 for what an unqualified `name` inside the
-- subquery does (it binds to facilities.name and matches nothing).

drop policy if exists client_documents_object_read on storage.objects;
create policy client_documents_object_read on storage.objects
  for select to authenticated
  using (
    bucket_id = 'client-documents'
    and (storage.foldername(name))[1] in (
      select f.id::text from public.facilities f
       where private.has_permission(f.id, 'view_client_documents')
    )
  );

drop policy if exists client_documents_object_insert on storage.objects;
create policy client_documents_object_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'client-documents'
    and (storage.foldername(name))[1] in (
      select f.id::text from public.facilities f
       where private.has_permission(f.id, 'edit_clients')
    )
  );

drop policy if exists client_documents_object_delete on storage.objects;
create policy client_documents_object_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'client-documents'
    and (storage.foldername(name))[1] in (
      select f.id::text from public.facilities f
       where private.has_permission(f.id, 'edit_clients')
    )
  );

do $verify$
begin
  if has_table_privilege('anon', 'public.client_documents', 'select') then
    raise exception 'anon can read client documents';
  end if;
  if has_function_privilege('anon', 'private.client_document_facility()', 'execute') then
    raise exception 'anon can execute the client document trigger function';
  end if;
end $verify$;
