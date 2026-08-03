-- ============================================================================
-- Staff documents and signatures — the two things onboarding asks a hire for
-- that have had nowhere to go.
--
-- `document_upload` collects a file (EMPLOYEE_TASK_FIELDS: kind "file") and
-- `document_sign` collects a signature (kind "signature"). Today the first has
-- no storage at all and the second is `agreed: true` in a localStorage object.
-- A signed contract that lives in one browser is not a signed contract.
--
-- ============================================================================
-- THE BUCKET
-- ============================================================================
--
-- PRIVATE. Not "private by convention" — `public = false`, so there is no URL
-- that works without a token, and reads are short-lived signed URLs minted per
-- request. A public bucket with unguessable names is a public bucket.
--
-- PATH: {facility_id}/{staff_id}/{uuid}-{original name}
--
-- The prefix IS the authorisation boundary, which is why it is two levels: the
-- facility segment lets a manager policy match without joining, and the staff
-- segment lets an employee policy match without joining. Storage policies run
-- on every object access; a policy that joins three tables is a policy someone
-- eventually replaces with something looser because it is slow.
--
-- COMPARED AS TEXT, never cast to uuid. `(storage.foldername(name))[1]::uuid`
-- reads naturally and is wrong: the path is caller-supplied, so a malformed
-- segment raises 22P02 and fails the whole query rather than simply matching
-- nothing. Casting the OTHER side (id::text) cannot fail.
--
-- ============================================================================
-- WHICH PERMISSION, AND WHY NOT THE OTHERS
-- ============================================================================
--
--   employee   OWNERSHIP, via private.own_staff_ids(). Not `view_own_documents`
--              — that key exists but is a `is_personal` permission every single
--              role preset holds, so it answers "may this person see a My
--              Documents screen", not "is this file theirs". Ownership is the
--              stricter statement and the one that is actually true.
--
--   manager    `manage_staff`. Chosen over the alternatives on purpose:
--                • `view_staff` is the directory-view key and SUPERVISORS hold
--                  it (operating_hours). A supervisor being able to read the
--                  roster is right; reading a colleague's passport scan is not.
--                • `view_staff_documents` does not exist, and inventing a key
--                  means a key with no preset rows — nobody holds it, every
--                  facility has to grant it by hand, and the first person to
--                  hit the wall "fixes" it by widening something else.
--                • `manage_staff` already gates the sensitive tail of the staff
--                  record — payroll, HR notes, the clock-in code — and is held
--                  by exactly owner/admin/manager. One key per question.
--
-- ============================================================================
-- APPEND-ONLY, AND WHERE THE TWO TABLES DIFFER
-- ============================================================================
--
-- Following 20260625000000_audit_log_append_only.sql: a TRIGGER is the binding
-- guarantee, because RLS is bypassed by service_role and the table owner, and
-- GRANTs are bypassed by the owner. REVOKE and RLS are layered on top.
--
-- SIGNATURES ARE IMMUTABLE TO EVERYONE, including service_role and a facility
-- owner. That is not excessive: the table exists to prove what a person agreed
-- to, and a proof its beneficiary can edit is not a proof. If a signature is
-- wrong the answer is a new one, superseding it — the same answer the audit log
-- gives.
--
-- DOCUMENTS ARE APPEND-ONLY FOR THE EMPLOYEE, and deletable by manage_staff.
-- The brief says "append-only for the employee" and the difference is
-- deliberate: someone eventually uploads the wrong person's ID, or a passport
-- scan that must be destroyed on request, and a system with no way to remove a
-- file is its own liability. What must not happen is the UPLOADER quietly
-- removing what they submitted — so there is no employee delete path, and the
-- update trigger blocks everyone. A document is replaced by uploading another,
-- never by editing the row.
-- ============================================================================

-- ── Bucket ──────────────────────────────────────────────────────────────────

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'staff-documents',
  'staff-documents',
  false,
  10485760,  -- 10 MB. Also enforced on the row below; see that CHECK's comment.
  array['application/pdf', 'image/png', 'image/jpeg', 'image/heic']
)
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- ── Documents ───────────────────────────────────────────────────────────────

create table public.staff_documents (
  id          uuid primary key default gen_random_uuid(),
  facility_id uuid not null references public.facilities (id) on delete cascade,
  staff_id    uuid not null references public.staff (id) on delete cascade,

  -- Which onboarding step produced it, when one did. Nullable because a manager
  -- also files documents outside onboarding, and by task_key rather than a task
  -- row id for the reason onboarding_sections gives: editing a template deletes
  -- task rows, and a hire's contract must outlive a renamed step.
  instance_id uuid references public.onboarding_instances (id) on delete set null,
  task_key    text,

  -- Matches EmployeeDocType in src/types/scheduling.ts, so the existing
  -- My Documents view can render these rows without a translation layer.
  doc_type    text not null default 'other'
                check (doc_type in ('work_permit', 'id_document', 'certification',
                                    'contract', 'tax_form', 'emergency_contact',
                                    'health_record', 'other')),

  file_name    text not null,
  -- What the SERVER determined, not what the browser claimed. The route sniffs
  -- magic bytes; this column records the finding.
  content_type text not null
                 check (content_type in ('application/pdf', 'image/png',
                                         'image/jpeg', 'image/heic')),
  size_bytes   bigint not null check (size_bytes > 0 and size_bytes <= 10485760),
  storage_path text not null unique,

  -- The facility's flag, matching EmployeeDocument.visibleToEmployee. A hire's
  -- own upload is visible to them by definition; an HR file may not be.
  visible_to_employee boolean not null default true,

  uploaded_at timestamptz not null default now(),
  -- The auth account, not a name: names change and are not identifiers.
  uploaded_by uuid references auth.users (id) on delete set null,

  created_at timestamptz not null default now()
);

create index staff_documents_staff_idx    on public.staff_documents (staff_id);
create index staff_documents_facility_idx on public.staff_documents (facility_id);
create index staff_documents_instance_idx on public.staff_documents (instance_id)
  where instance_id is not null;

-- ── Signatures ──────────────────────────────────────────────────────────────

create table public.staff_signatures (
  id          uuid primary key default gen_random_uuid(),
  facility_id uuid not null references public.facilities (id) on delete cascade,
  staff_id    uuid not null references public.staff (id) on delete cascade,

  instance_id uuid references public.onboarding_instances (id) on delete set null,
  task_key    text,

  -- WHAT WAS SIGNED, AS IT WAS AT SIGNING TIME.
  --
  -- THERE IS DELIBERATELY NO FOREIGN KEY TO AN AGREEMENT ROW. A signature that
  -- points at a mutable document proves only that a person clicked something,
  -- once, near a row that has since been edited — which is worth nothing in the
  -- only situation the record matters. So the text is COPIED here, and hashed:
  --
  --   agreement_text  the full text the person actually saw
  --   agreement_hash  sha256 of exactly those bytes
  --
  -- The hash is not a substitute for the text, it is a cheap way to compare two
  -- signatures, prove a stored text has not been altered since, and identify
  -- which version of an agreement a cohort signed without diffing prose.
  --
  -- `agreement_key` and `agreement_title` are for display and grouping. They may
  -- point at something that has changed. The text and the hash may not.
  agreement_key   text not null,
  agreement_title text not null,
  agreement_text  text not null,
  agreement_hash  text not null,

  -- How it was signed. `signature_name` is the typed name (kind "signature" in
  -- EMPLOYEE_TASK_FIELDS); signature_data holds a drawn one when there is one.
  signature_name  text not null,
  signature_data  text,

  -- Evidence, not identity. Useful in a dispute, worthless as authentication —
  -- signed_by is the identity.
  ip_address text,
  user_agent text,

  signed_at timestamptz not null default now(),
  -- The auth account that was signed in when this happened.
  signed_by uuid references auth.users (id) on delete set null,

  created_at timestamptz not null default now()
);

create index staff_signatures_staff_idx    on public.staff_signatures (staff_id);
create index staff_signatures_facility_idx on public.staff_signatures (facility_id);
create index staff_signatures_agreement_idx on public.staff_signatures (agreement_key);

-- ── Immutability ────────────────────────────────────────────────────────────
-- The trigger is the guarantee; REVOKE and RLS are defence in depth. Same
-- structure as the audit log, and for the same reasons written up there.

create or replace function private.prevent_signature_mutation()
returns trigger language plpgsql as $$
begin
  raise exception
    'staff_signatures is append-only: a signature records what a person agreed '
    'to and cannot be edited or removed. Supersede it with a new signature.'
    using errcode = '42501';
end;
$$;

create trigger staff_signatures_block_update
  before update on public.staff_signatures
  for each row execute function private.prevent_signature_mutation();
create trigger staff_signatures_block_delete
  before delete on public.staff_signatures
  for each row execute function private.prevent_signature_mutation();
create trigger staff_signatures_block_truncate
  before truncate on public.staff_signatures
  for each statement execute function private.prevent_signature_mutation();

revoke update, delete, truncate on public.staff_signatures from public;
revoke update, delete, truncate on public.staff_signatures from anon;
revoke update, delete, truncate on public.staff_signatures from authenticated;
revoke update, delete, truncate on public.staff_signatures from service_role;

-- Documents: no UPDATE by anyone. A file is superseded by uploading another,
-- not by rewriting the row that describes it — otherwise "this is a contract"
-- can quietly become "this is a payslip" while the bytes stay put.
create or replace function private.prevent_document_update()
returns trigger language plpgsql as $$
begin
  raise exception
    'staff_documents rows are not editable. Upload a replacement instead.'
    using errcode = '42501';
end;
$$;

create trigger staff_documents_block_update
  before update on public.staff_documents
  for each row execute function private.prevent_document_update();

revoke update on public.staff_documents from public;
revoke update on public.staff_documents from anon;
revoke update on public.staff_documents from authenticated;

-- ── RLS ─────────────────────────────────────────────────────────────────────

alter table public.staff_documents  enable row level security;
alter table public.staff_signatures enable row level security;

-- Documents: your own (and only those the facility marked visible), or the
-- facility's if you administer people here.
create policy staff_documents_read on public.staff_documents
  for select to authenticated
  using (
    private.is_platform_admin()
    or (staff_id in (select private.own_staff_ids()) and visible_to_employee)
    or private.has_permission(facility_id, 'manage_staff')
  );

create policy staff_documents_insert on public.staff_documents
  for insert to authenticated
  with check (
    staff_id in (select private.own_staff_ids())
    or private.has_permission(facility_id, 'manage_staff')
  );

-- No employee DELETE policy, deliberately: the uploader must not be able to
-- withdraw what they submitted. A manager can, because sometimes a file has to
-- go — see the header.
create policy staff_documents_delete on public.staff_documents
  for delete to authenticated
  using (private.has_permission(facility_id, 'manage_staff'));

-- Signatures: readable by the signer and by manage_staff. No update or delete
-- policy exists at all, which is the RLS layer of the immutability above.
create policy staff_signatures_read on public.staff_signatures
  for select to authenticated
  using (
    private.is_platform_admin()
    or staff_id in (select private.own_staff_ids())
    or private.has_permission(facility_id, 'manage_staff')
  );

create policy staff_signatures_insert on public.staff_signatures
  for insert to authenticated
  with check (
    staff_id in (select private.own_staff_ids())
    or private.has_permission(facility_id, 'manage_staff')
  );

-- ── Storage RLS ─────────────────────────────────────────────────────────────
-- storage.objects already has RLS enabled by Supabase; these are the policies
-- for this bucket. Every one compares path SEGMENTS as text — see the header on
-- why casting the path to uuid would be a bug rather than a tidy-up.

drop policy if exists staff_documents_object_read on storage.objects;
create policy staff_documents_object_read on storage.objects
  for select to authenticated
  using (
    bucket_id = 'staff-documents'
    and (
      -- your own prefix
      (storage.foldername(name))[2] in (
        select s.id::text from public.staff s
         where s.id in (select private.own_staff_ids())
      )
      -- or a facility you administer
      or exists (
        select 1 from public.facilities f
         where f.id::text = (storage.foldername(name))[1]
           and private.has_permission(f.id, 'manage_staff')
      )
    )
  );

drop policy if exists staff_documents_object_insert on storage.objects;
create policy staff_documents_object_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'staff-documents'
    and (
      (storage.foldername(name))[2] in (
        select s.id::text from public.staff s
         where s.id in (select private.own_staff_ids())
      )
      or exists (
        select 1 from public.facilities f
         where f.id::text = (storage.foldername(name))[1]
           and private.has_permission(f.id, 'manage_staff')
      )
    )
  );

-- No UPDATE policy: an object cannot be overwritten in place, which is what
-- makes the append-only story true of the BYTES and not merely of the row that
-- describes them. Upload a new path instead.
drop policy if exists staff_documents_object_delete on storage.objects;
create policy staff_documents_object_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'staff-documents'
    and exists (
      select 1 from public.facilities f
       where f.id::text = (storage.foldername(name))[1]
         and private.has_permission(f.id, 'manage_staff')
    )
  );

comment on table public.staff_signatures is
  'Append-only. Stores the agreement TEXT and its hash as at signing time - never a FK to a mutable agreement row.';
comment on column public.staff_signatures.agreement_text is
  'The exact text the person saw. Copied, not referenced: editing the source agreement later must not change what an existing signature proves.';
comment on table public.staff_documents is
  'Append-only for the employee; deletable by manage_staff. Rows are never updated - upload a replacement.';
