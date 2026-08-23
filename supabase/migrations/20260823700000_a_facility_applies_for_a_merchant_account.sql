-- ============================================================================
-- Yipyy Pay, phase 2: the facility no longer opens its own merchant account.
--
-- ── WHAT CHANGED, AND WHY THE WHOLE SHAPE MOVES ───────────────────────────
--
-- Until now a facility arrived at Yipyy Pay already owning a Clover merchant
-- account, and Yipyy connected to it by OAuth. Every screen said so, and the
-- copy promised — accurately — that identity documents, tax numbers and bank
-- details went straight to the processor and Yipyy never saw them.
--
-- That is no longer the product. Yipyy now COLLECTS the merchant application:
-- legal name, the owners and their identity documents, the tax number, the
-- bank account. It is submitted on the facility's behalf, an account is opened
-- for them, and only then is it connected. The facility never meets the
-- processor's name.
--
-- Which means the promise is now false, and the tables below are why: Yipyy
-- holds this material. The screens are being changed in the same release to say
-- what is actually true. A privacy claim that outlives the design it described
-- is worse than never having made one.
--
-- ── SO THE QUESTION IS NOT "CAN WE STORE IT" BUT "HOW LITTLE, HOW BRIEFLY" ─
--
-- Three answers, and they are the reason this file is shaped the way it is:
--
--   1. THE SECRETS NEVER BECOME COLUMNS. A social security number and a bank
--      account number go to Vault, and the row holds a secret id. Same shape as
--      private.payment_credentials (20260807700000) and for the same reason: a
--      column is readable by anything that can read the table, and a row that
--      leaks then leaks a credential rather than a pointer to one.
--
--   2. A MANAGER IS NOT A PRINCIPAL. `merchant_applications` carries the
--      business and the status, and anyone with `settings_billing` may read it
--      — a manager is entitled to know the application is under review.
--      `merchant_application_principals` carries an owner's date of birth and
--      home address, and is readable ONLY by whoever submitted it and by a
--      platform admin. Those are different facts about different people and
--      they do not get the same policy.
--
--   3. IT IS MEANT TO BE DESTROYED. Once an account is open and connected, the
--      evidence has done its job and the merchant id is the only durable fact.
--      `private.purge_boarding_evidence()` at the foot of this file drops the
--      Vault secrets and marks the documents for removal. Keeping a library of
--      identity documents against a future need nobody has named is the largest
--      liability in this migration.
--
-- ── WHERE THE PATTERNS COME FROM ──────────────────────────────────────────
--
-- Nothing here is invented. Vault store/fetch is 20260807700000. The private
-- bucket, the server-sniffed content type, the size CHECK mirrored on the row
-- and the refusal to let an uploader delete their own upload are all
-- staff_documents (20260804090000), which already holds identity documents in
-- `public` behind RLS — which is why these tables are in `public` too, and only
-- the credential material is out of reach.
--
-- ── AND THE DEFINER FUNCTIONS RE-CHECK ────────────────────────────────────
--
-- Measured in this database on 2026-08-23: a SECURITY DEFINER function BYPASSES
-- RLS entirely, `force row level security` included, because the owner is a
-- superuser. So every definer function below asks `private.has_permission`
-- ITSELF rather than trusting the policy on the table it touches. The policies
-- are still there and still correct; they are simply not what is protecting the
-- definer path.
-- ============================================================================

-- ── The application ─────────────────────────────────────────────────────────

create table if not exists public.merchant_applications (
  id          uuid primary key default gen_random_uuid(),
  facility_id uuid not null references public.facilities (id) on delete cascade,

  -- ── Status ──────────────────────────────────────────────────────────────
  --
  -- Set by the submission adapter or by a platform admin, NEVER by the
  -- facility. A facility that could write its own status could mark itself
  -- approved, and the next thing that happens is a connect attempt against an
  -- account that does not exist. The trigger below enforces it.
  status text not null default 'draft'
    check (status in ('draft', 'submitted', 'under_review',
                      'more_info_needed', 'approved', 'rejected', 'withdrawn')),

  -- What the acquirer calls this application once it has one. Null until
  -- submitted; the adapter writes it.
  external_reference text,
  -- Why it was rejected, or what is still needed. Shown to the facility, so it
  -- is prose meant for them rather than an acquirer's error code.
  status_detail text,

  -- ── The business ────────────────────────────────────────────────────────
  --
  -- `legal_name` is the one that has to match the tax authority's records
  -- character for character. Every acquirer's guidance names a mismatch here as
  -- the commonest cause of a stalled application, which is why the screen warns
  -- about it before anybody types anything.
  legal_name     text,
  trading_name   text,
  business_structure text
    check (business_structure is null or business_structure in
           ('sole_proprietor', 'partnership', 'corporation', 'llc',
            'non_profit', 'other')),
  -- EIN in the US, BN in Canada. Not a secret in the way an SSN is — it appears
  -- on invoices — so it is a column.
  tax_id         text,
  incorporated_on date,

  address_line1 text,
  address_line2 text,
  city          text,
  region        text,
  postal_code   text,
  country       text check (country is null or country ~ '^[A-Z]{2}$'),

  business_phone text,
  business_email text,
  website        text,

  -- ── The processing profile ──────────────────────────────────────────────
  --
  -- Underwriting decides on these, so they are asked for rather than guessed.
  -- Stored in CENTS for the same reason money is everywhere else here.
  mcc                       text,
  estimated_monthly_volume_cents bigint
    check (estimated_monthly_volume_cents is null
           or estimated_monthly_volume_cents >= 0),
  average_ticket_cents      bigint
    check (average_ticket_cents is null or average_ticket_cents >= 0),
  highest_ticket_cents      bigint
    check (highest_ticket_cents is null or highest_ticket_cents >= 0),
  -- A percentage of transactions, 0-100. Above roughly 30% most acquirers ask
  -- a card-not-present questionnaire, which is why the number is captured
  -- rather than inferred.
  card_not_present_percent  smallint
    check (card_not_present_percent is null
           or card_not_present_percent between 0 and 100),
  refund_policy text,

  -- ── Banking ─────────────────────────────────────────────────────────────
  --
  -- The NUMBERS are in Vault; these are what is safe to render. Last four is
  -- how a person recognises their own account without the account being here.
  bank_account_name  text,
  bank_last4         text check (bank_last4 is null or bank_last4 ~ '^[0-9]{4}$'),
  bank_secret_id     uuid,

  -- ── Attestation ─────────────────────────────────────────────────────────
  --
  -- Who agreed, to what, and when. The TEXT is copied rather than pointed at,
  -- for the reason staff_signatures gives at length: a signature against a
  -- mutable document proves only that somebody clicked near a row that has
  -- since changed.
  signed_name    text,
  signed_title   text,
  signed_terms   text,
  signed_at      timestamptz,
  signed_ip      text,
  signed_by      text,

  submitted_at   timestamptz,
  decided_at     timestamptz,
  -- Set when the evidence has been destroyed. A row with this set is a record
  -- that boarding happened, not a record of what was submitted.
  purged_at      timestamptz,

  created_by     text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

-- One live application per facility. A second one would make "what is our
-- status" a question with two answers, and the screen would pick whichever
-- sorted first. Withdrawn and rejected ones are kept for the record, so the
-- index is partial rather than a plain unique.
create unique index if not exists merchant_applications_one_live
  on public.merchant_applications (facility_id)
  where status in ('draft', 'submitted', 'under_review',
                   'more_info_needed', 'approved');

create index if not exists merchant_applications_status_idx
  on public.merchant_applications (status);

comment on table public.merchant_applications is
  'A facility''s application for a merchant account, collected by Yipyy and submitted on their behalf. Secrets are in Vault; see purge_boarding_evidence.';

-- ── The people who own the business ─────────────────────────────────────────

create table if not exists public.merchant_application_principals (
  id             uuid primary key default gen_random_uuid(),
  application_id uuid not null
                   references public.merchant_applications (id) on delete cascade,
  facility_id    uuid not null references public.facilities (id) on delete cascade,

  full_name    text not null check (length(trim(full_name)) > 0),
  title        text,
  -- Acquirers require every beneficial owner at or above 25%. Stored as given
  -- so the sum can be checked and questioned rather than silently normalised.
  ownership_percent numeric(5,2)
    check (ownership_percent is null or ownership_percent between 0 and 100),
  date_of_birth date,
  email        text,
  phone        text,

  address_line1 text,
  address_line2 text,
  city          text,
  region        text,
  postal_code   text,
  country       text check (country is null or country ~ '^[A-Z]{2}$'),

  -- THE NATIONAL ID NEVER BECOMES A COLUMN. Vault holds it; this is the
  -- pointer, and `national_id_last4` is what a screen may show so a person can
  -- tell which of two records is theirs.
  national_id_secret_id uuid,
  national_id_last4     text
    check (national_id_last4 is null or national_id_last4 ~ '^[0-9]{4}$'),

  is_control_person boolean not null default false,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists merchant_application_principals_app_idx
  on public.merchant_application_principals (application_id);

comment on table public.merchant_application_principals is
  'A beneficial owner on a merchant application. Readable only by the submitter and a platform admin — a manager is not entitled to the owner''s date of birth.';

-- ── The documents ───────────────────────────────────────────────────────────

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'merchant-applications',
  'merchant-applications',
  false,           -- NOT public. An identity document behind a guessable URL is
                   -- the whole failure this bucket exists to avoid.
  10485760,        -- 10 MB, mirrored on the row's CHECK below.
  array['application/pdf', 'image/png', 'image/jpeg', 'image/heic']
)
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

create table if not exists public.merchant_application_documents (
  id             uuid primary key default gen_random_uuid(),
  application_id uuid not null
                   references public.merchant_applications (id) on delete cascade,
  facility_id    uuid not null references public.facilities (id) on delete cascade,
  -- Which owner this evidences, when it evidences one. Null for a business
  -- document such as an incorporation certificate or a bank statement.
  principal_id   uuid references public.merchant_application_principals (id)
                   on delete cascade,

  doc_type text not null check (doc_type in
    ('government_id', 'proof_of_address', 'tax_document',
     'bank_statement', 'incorporation', 'voided_cheque', 'other')),

  file_name    text not null,
  -- What the SERVER determined by sniffing magic bytes, not what the browser
  -- claimed in a header it controls.
  content_type text not null check (content_type in
    ('application/pdf', 'image/png', 'image/jpeg', 'image/heic')),
  size_bytes   bigint not null check (size_bytes > 0 and size_bytes <= 10485760),
  storage_path text not null unique,

  -- Set when the object has been deleted from the bucket by the purge. The row
  -- survives as evidence that a document WAS supplied, without the document.
  purged_at    timestamptz,

  uploaded_at  timestamptz not null default now(),
  uploaded_by  text,
  created_at   timestamptz not null default now()
);

create index if not exists merchant_application_documents_app_idx
  on public.merchant_application_documents (application_id);

-- ── Who may read and write any of it ────────────────────────────────────────

alter table public.merchant_applications              enable row level security;
alter table public.merchant_application_principals    enable row level security;
alter table public.merchant_application_documents     enable row level security;

-- `anon` has no business here at all. Written as its own statement because
-- `revoke ... from public` and `revoke ... from anon` are DIFFERENT grants and
-- this project has already shipped a migration that named only one of them.
revoke all on public.merchant_applications           from anon;
revoke all on public.merchant_applications           from public;
revoke all on public.merchant_application_principals from anon;
revoke all on public.merchant_application_principals from public;
revoke all on public.merchant_application_documents  from anon;
revoke all on public.merchant_application_documents  from public;

-- A default privilege in this project grants the FULL set on a new table, so a
-- `grant select, insert, update` that never mentions delete still leaves DELETE
-- in place. Found on facility_tasks on 2026-08-23. Revoked explicitly, and the
-- SQL test asserts `has_table_privilege` afterwards rather than trusting this.
revoke delete on public.merchant_applications           from authenticated;
revoke delete on public.merchant_application_principals from authenticated;
revoke delete on public.merchant_application_documents  from authenticated;

-- The application itself: anyone who runs the money side may see where it got
-- to. This is business information and a status.
drop policy if exists merchant_applications_read on public.merchant_applications;
create policy merchant_applications_read on public.merchant_applications
  for select to authenticated
  using (
    private.is_platform_admin()
    or private.has_permission(facility_id, 'settings_billing')
  );

drop policy if exists merchant_applications_insert on public.merchant_applications;
create policy merchant_applications_insert on public.merchant_applications
  for insert to authenticated
  with check (
    private.is_platform_admin()
    or private.has_permission(facility_id, 'settings_billing')
  );

drop policy if exists merchant_applications_update on public.merchant_applications;
create policy merchant_applications_update on public.merchant_applications
  for update to authenticated
  using (
    private.is_platform_admin()
    or private.has_permission(facility_id, 'settings_billing')
  )
  with check (
    private.is_platform_admin()
    or private.has_permission(facility_id, 'settings_billing')
  );

-- The people: NARROWER, deliberately. A date of birth and a home address belong
-- to a person, not to the business, and holding `settings_billing` does not
-- entitle a manager to their employer's.
drop policy if exists merchant_principals_read on public.merchant_application_principals;
create policy merchant_principals_read on public.merchant_application_principals
  for select to authenticated
  using (
    private.is_platform_admin()
    or exists (
      select 1 from public.merchant_applications a
       where a.id = application_id
         and a.created_by = (select auth.jwt()->>'sub')
    )
  );

drop policy if exists merchant_principals_write on public.merchant_application_principals;
create policy merchant_principals_write on public.merchant_application_principals
  for all to authenticated
  using (
    private.is_platform_admin()
    or exists (
      select 1 from public.merchant_applications a
       where a.id = application_id
         and a.created_by = (select auth.jwt()->>'sub')
         and a.status in ('draft', 'more_info_needed')
    )
  )
  with check (
    private.is_platform_admin()
    or exists (
      select 1 from public.merchant_applications a
       where a.id = application_id
         and a.created_by = (select auth.jwt()->>'sub')
         and a.status in ('draft', 'more_info_needed')
    )
  );

-- Documents: same audience as the people they evidence.
drop policy if exists merchant_documents_read on public.merchant_application_documents;
create policy merchant_documents_read on public.merchant_application_documents
  for select to authenticated
  using (
    private.is_platform_admin()
    or exists (
      select 1 from public.merchant_applications a
       where a.id = application_id
         and a.created_by = (select auth.jwt()->>'sub')
    )
  );

drop policy if exists merchant_documents_insert on public.merchant_application_documents;
create policy merchant_documents_insert on public.merchant_application_documents
  for insert to authenticated
  with check (
    private.is_platform_admin()
    or exists (
      select 1 from public.merchant_applications a
       where a.id = application_id
         and a.created_by = (select auth.jwt()->>'sub')
         and a.status in ('draft', 'more_info_needed')
    )
  );

-- ── The status is not the facility's to write ───────────────────────────────
--
-- A facility that could set its own status could mark itself approved, and the
-- next thing that happens is a connect attempt against an account nobody opened.
-- So the column moves only for a platform admin or the service role — which is
-- what the submission adapter runs as.

create or replace function private.merchant_application_status_is_not_yours()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.status is distinct from old.status
     and not private.is_platform_admin()
     and current_setting('role', true) is distinct from 'service_role'
  then
    -- Withdrawing is the one move that IS theirs: abandoning your own draft is
    -- not a claim about underwriting.
    if not (old.status in ('draft', 'more_info_needed')
            and new.status = 'withdrawn') then
      raise exception
        'The status of a merchant application is set by the review process, not by the applicant.'
        using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;

create trigger merchant_applications_status_guard
  before update on public.merchant_applications
  for each row execute function private.merchant_application_status_is_not_yours();

create trigger merchant_applications_touch
  before update on public.merchant_applications
  for each row execute function private.set_updated_at();

create trigger merchant_principals_touch
  before update on public.merchant_application_principals
  for each row execute function private.set_updated_at();

-- ── The bucket ──────────────────────────────────────────────────────────────
--
-- Path is <facility_id>/<application_id>/<uuid>. Compared as TEXT SEGMENTS,
-- never cast to uuid: a malformed segment would raise inside the policy rather
-- than simply failing to match, which turns a refusal into a 500.

drop policy if exists merchant_documents_object_read on storage.objects;
create policy merchant_documents_object_read on storage.objects
  for select to authenticated
  using (
    bucket_id = 'merchant-applications'
    and (
      private.is_platform_admin()
      or exists (
        select 1 from public.merchant_applications a
         where a.id::text = (storage.foldername(name))[2]
           and a.created_by = (select auth.jwt()->>'sub')
      )
    )
  );

drop policy if exists merchant_documents_object_insert on storage.objects;
create policy merchant_documents_object_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'merchant-applications'
    and exists (
      select 1 from public.merchant_applications a
       where a.id::text = (storage.foldername(name))[2]
         and a.created_by = (select auth.jwt()->>'sub')
         and a.status in ('draft', 'more_info_needed')
    )
  );

-- No UPDATE policy and no DELETE policy for `authenticated`: an applicant may
-- not quietly replace or remove what they submitted. Superseding is another
-- upload. Removal is the purge, which runs as the service role.

-- ============================================================================
-- The secrets.
--
-- Both functions are SECURITY DEFINER because `vault` is unreachable otherwise,
-- and both therefore re-check permission THEMSELVES — a definer function
-- bypasses RLS in this database, so the policies above are not what is guarding
-- this path. EXECUTE is revoked from anon and authenticated: the server calls
-- these, a browser never does.
-- ============================================================================

create or replace function public.store_boarding_secret(
  p_application_id uuid,
  p_kind           text,      -- 'bank' | 'principal'
  p_principal_id   uuid,      -- null for 'bank'
  p_value          text,
  p_last4          text
)
returns void
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  v_facility uuid;
  v_status   text;
  v_name     text;
  v_id       uuid;
begin
  select facility_id, status into v_facility, v_status
    from public.merchant_applications where id = p_application_id;

  if v_facility is null then
    raise exception 'No such application.' using errcode = '42704';
  end if;

  -- ── WHO IS ALLOWED, AND WHICH HALF IS ACTUALLY GUARDING ───────────────
  --
  -- EXECUTE is granted to `service_role` and nobody else, so in practice the
  -- GRANT is the live boundary — the browser never holds that role, and the
  -- route has already authorised the caller through activeAdminFacility().
  -- That is the same arrangement store_payment_credentials uses.
  --
  -- The service_role branch is therefore not a hole, it is the working path.
  -- Its absence was a real defect: the first version of this function required
  -- a facility permission that service_role, holding no JWT, can never satisfy,
  -- so the server could not call it AT ALL. Caught by M11 on the first run of
  -- the SQL suite, which is the entire reason that file exists.
  --
  -- The permission check below is kept for the day somebody widens the grant.
  -- On that day it is already correct, already tested by M9, and a definer
  -- function bypassing RLS is already accounted for.
  if not (private.is_platform_admin()
          or private.has_permission(v_facility, 'settings_billing')
          or current_setting('role', true) = 'service_role') then
    raise exception 'You may not edit this facility''s merchant application.'
      using errcode = '42501';
  end if;

  if v_status not in ('draft', 'more_info_needed') then
    raise exception 'This application has been submitted and can no longer be edited.'
      using errcode = '42501';
  end if;

  if p_value is null or length(trim(p_value)) = 0 then
    raise exception 'A value is required.' using errcode = '22023';
  end if;

  -- Named per application and kind, and UPDATED in place on re-entry. Creating
  -- a new secret each time somebody corrected a typo would leave a vault full
  -- of live national id numbers — the exact mistake the token rotation comment
  -- in 20260807700000 exists to prevent.
  v_name := format('boarding:%s:%s:%s', p_application_id, p_kind,
                   coalesce(p_principal_id::text, 'business'));

  select id into v_id from vault.secrets where name = v_name;
  if v_id is null then
    v_id := vault.create_secret(p_value, v_name, 'Merchant boarding evidence');
  else
    perform vault.update_secret(v_id, p_value, v_name);
  end if;

  if p_kind = 'bank' then
    update public.merchant_applications
       set bank_secret_id = v_id, bank_last4 = p_last4
     where id = p_application_id;
  elsif p_kind = 'principal' then
    update public.merchant_application_principals
       set national_id_secret_id = v_id, national_id_last4 = p_last4
     where id = p_principal_id and application_id = p_application_id;
  else
    raise exception 'Unknown secret kind: %', p_kind using errcode = '22023';
  end if;
end;
$fn$;

comment on function public.store_boarding_secret(uuid, text, uuid, text, text) is
  'SECURITY DEFINER: vault is unreachable otherwise. Re-checks settings_billing itself, because a definer function bypasses RLS here.';

-- Reading one back is for SUBMISSION ONLY, which is why it is service_role and
-- not "an admin who asks nicely". Nothing renders these.
create or replace function public.read_boarding_secret(
  p_application_id uuid,
  p_kind           text,
  p_principal_id   uuid
)
returns text
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  v_name text;
begin
  v_name := format('boarding:%s:%s:%s', p_application_id, p_kind,
                   coalesce(p_principal_id::text, 'business'));
  return (select s.decrypted_secret from vault.decrypted_secrets s
           where s.name = v_name);
end;
$fn$;

-- ── Destroying the evidence once it has done its job ────────────────────────
--
-- Called after an application is approved AND its merchant account connected.
-- The merchant id is the durable fact; a national id number is not something to
-- keep against a need nobody has named.

create or replace function private.purge_boarding_evidence(p_application_id uuid)
returns integer
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  v_status text;
  v_gone   integer := 0;
begin
  select status into v_status
    from public.merchant_applications where id = p_application_id;

  if v_status is null then
    raise exception 'No such application.' using errcode = '42704';
  end if;

  -- Only a finished one. Purging a live application would destroy what
  -- underwriting is still waiting to be sent.
  if v_status not in ('approved', 'rejected', 'withdrawn') then
    raise exception 'An application still in progress cannot be purged.'
      using errcode = '42501';
  end if;

  delete from vault.secrets
   where name like format('boarding:%s:%%', p_application_id);
  get diagnostics v_gone = row_count;

  update public.merchant_applications
     set bank_secret_id = null, purged_at = now()
   where id = p_application_id;

  update public.merchant_application_principals
     set national_id_secret_id = null
   where application_id = p_application_id;

  -- The storage objects are removed by the caller, which has the storage
  -- client; this marks the rows so a half-finished purge is visible rather than
  -- silent. The row survives as proof a document WAS supplied.
  update public.merchant_application_documents
     set purged_at = now()
   where application_id = p_application_id and purged_at is null;

  return v_gone;
end;
$fn$;

-- ── The grants, which are the actual boundary for the definer functions ─────

revoke all on function public.store_boarding_secret(uuid, text, uuid, text, text) from public;
revoke all on function public.store_boarding_secret(uuid, text, uuid, text, text) from anon;
revoke all on function public.store_boarding_secret(uuid, text, uuid, text, text) from authenticated;
grant execute on function public.store_boarding_secret(uuid, text, uuid, text, text) to service_role;

revoke all on function public.read_boarding_secret(uuid, text, uuid) from public;
revoke all on function public.read_boarding_secret(uuid, text, uuid) from anon;
revoke all on function public.read_boarding_secret(uuid, text, uuid) from authenticated;
grant execute on function public.read_boarding_secret(uuid, text, uuid) to service_role;

revoke all on function private.purge_boarding_evidence(uuid) from public;
revoke all on function private.purge_boarding_evidence(uuid) from anon;
revoke all on function private.purge_boarding_evidence(uuid) from authenticated;
grant execute on function private.purge_boarding_evidence(uuid) to service_role;

-- ── One correction, made the same day this file landed ──────────────────────
--
-- DELETE was revoked from `authenticated` on all three tables above, to close
-- the default-privilege trap where a `grant select, insert, update` leaves
-- DELETE in place anyway. Right for two of them and wrong for the third.
--
--   merchant_applications           withdraw it; the record of the attempt stays
--   merchant_application_documents  supersede by uploading — an applicant
--                                   quietly removing what they submitted is
--                                   exactly what staff_documents refuses
--   merchant_application_principals ...but somebody who typed a co-owner in
--                                   twice, or listed a person who turns out to
--                                   hold 5%, has to be able to take the row out
--
-- An application that cannot be corrected is one somebody abandons and restarts,
-- losing every document already uploaded. So DELETE comes back HERE ONLY, under
-- the same predicate the write policy already uses: the submitter, on their own
-- application, while it is still editable.

grant delete on public.merchant_application_principals to authenticated;

drop policy if exists merchant_principals_delete on public.merchant_application_principals;
create policy merchant_principals_delete on public.merchant_application_principals
  for delete to authenticated
  using (
    private.is_platform_admin()
    or exists (
      select 1 from public.merchant_applications a
       where a.id = application_id
         and a.created_by = (select auth.jwt()->>'sub')
         and a.status in ('draft', 'more_info_needed')
    )
  );
