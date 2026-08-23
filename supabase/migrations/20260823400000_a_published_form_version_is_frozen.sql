-- ============================================================================
-- A published form version is frozen, so a submission can be read back.
--
-- ── WHAT WAS THERE ────────────────────────────────────────────────────────
--
-- `src/data/forms.ts` and `src/data/form-submissions.ts`. `/forms/[slug]` is a
-- PUBLIC page a customer fills in, `/facility/dashboard/forms/submissions/[id]`
-- is where staff read the answers, and neither outlived a refresh.
--
-- ── THE FIXTURE LOOKED LIKE IT SOLVED THIS, WHICH IS WORSE ────────────────
--
-- It had a version table, and submissions carried `formVersionId`. That is the
-- right idea and it was not implemented: `updateForm()` finds the LATEST
-- version and rewrites it in place —
--
--     formFields  = formFields.filter(f => !oldSectionIds.includes(f.sectionId))
--     formSections = formSections.filter(s => s.formVersionId !== version.id)
--     logicRules  = logicRules.filter(r => r.formVersionId !== version.id)
--
-- — deleting that version's sections, fields, options and logic and writing new
-- ones, whether or not it is published and whether or not submissions point at
-- it. So editing a form silently changed the questions every past submission is
-- recorded against, and the answers stayed put. "Yes" to a question nobody can
-- now see.
--
-- That is the same defect as the waiver pointer (20260823300000), disguised by
-- the presence of a version table. A structure that LOOKS like it preserves
-- history is worse than an obvious absence of one, because nobody checks it.
--
-- ── THE RULE ──────────────────────────────────────────────────────────────
--
-- A version holds the WHOLE definition as one `schema` blob, and once it is
-- published nothing about it may change — enforced by trigger, for every role.
-- Editing a published form creates a NEW draft version. A submission names the
-- exact version it was filled against, so what was asked can always be
-- reconstructed, and it can never be edited out from under the answers.
--
-- ── WHY THE SCHEMA IS ONE JSONB AND NOT FIVE TABLES ───────────────────────
--
-- The fixture normalised sections -> fields -> options -> logic. Nothing in the
-- product queries across that structure; the whole definition is authored as a
-- unit and rendered as a unit, and `FormWizard` already consumes it whole
-- against a `Record<string, unknown>` answers bag (CLAUDE.md says so, and says
-- that pattern is correct for dynamic forms).
--
-- Normalising it would also mean `form_answers.field_id` referencing a fields
-- table, which would be a foreign key into a mutable definition — the very
-- thing this migration exists to stop. In a frozen blob the field id is part of
-- the record.
--
-- ── ANONYMOUS SUBMISSION IS DELIBERATELY NOT HERE ─────────────────────────
--
-- `/forms/[slug]` is reachable signed-out, and its "email verification" is a
-- `sessionStorage` flag the browser sets for itself. Storing submissions from
-- an unauthenticated caller needs an anon-callable write path, which is exactly
-- the class of thing this repo has had to repair five times (20260805210403,
-- 20260822400000, 20260822600000, 20260822610000). So v1 records submissions
-- from a SIGNED-IN caller — the customer in their portal, or staff capturing
-- one at the counter — and the public anonymous path is unchanged and still
-- saves nothing. That is a known gap, not an oversight.
-- ============================================================================

-- ── THE FORM ──────────────────────────────────────────────────────────────

create table if not exists public.forms (
  id uuid primary key default gen_random_uuid(),
  facility_id uuid not null references public.facilities(id) on delete cascade,

  name text not null,
  -- What `/forms/[slug]` resolves. Unique per facility, not globally: two
  -- businesses may both have a "boarding-intake".
  slug text not null,

  type text not null default 'custom',
  status text not null default 'draft'
    check (status in ('draft', 'published', 'archived')),
  audience text not null default 'customer'
    check (audience in ('customer', 'staff', 'both')),

  applies_to jsonb not null default '{}'::jsonb,
  settings jsonb not null default '{}'::jsonb,
  repeat_per_pet boolean not null default false,
  require_auth boolean not null default true,

  created_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint forms_slug_unique_per_facility unique (facility_id, slug),
  constraint forms_name_not_empty check (btrim(name) <> '')
);

comment on table public.forms is
  'A form''s identity and settings. The QUESTIONS live on form_versions, because they have to be frozen once anybody has answered them.';

create index if not exists forms_facility_idx
  on public.forms (facility_id, status);

-- ── THE VERSION, WHICH IS THE THING THAT MUST NOT MOVE ────────────────────

create table if not exists public.form_versions (
  id uuid primary key default gen_random_uuid(),
  form_id uuid not null references public.forms(id) on delete cascade,
  facility_id uuid not null references public.facilities(id) on delete cascade,

  version_number integer not null check (version_number > 0),

  -- Sections, fields, options and logic rules, as one document. See the header
  -- for why this is not five tables.
  schema jsonb not null default '{}'::jsonb,

  -- Null means DRAFT. Once set, this row is frozen.
  published_at timestamptz,

  created_by text,
  created_at timestamptz not null default now(),

  constraint form_versions_number_unique_per_form unique (form_id, version_number)
);

comment on table public.form_versions is
  'An immutable snapshot of a form''s questions. Once `published_at` is set nothing on the row may change - a submission names the version it was filled against, and the questions must still be readable years later.';

comment on column public.form_versions.schema is
  'The WHOLE definition: sections, fields, options, logic. One document because it is authored and rendered as one, and because a normalised field table would give answers a foreign key into a mutable definition.';

create index if not exists form_versions_form_idx
  on public.form_versions (form_id, version_number desc);

-- ── THE SUBMISSION ────────────────────────────────────────────────────────

create table if not exists public.form_submissions (
  id uuid primary key default gen_random_uuid(),
  facility_id uuid not null references public.facilities(id) on delete cascade,

  -- The version is what makes the answers readable, so it is the FK that
  -- matters and it is `restrict`: a version somebody has answered cannot be
  -- removed, which is the whole point.
  form_version_id uuid not null
    references public.form_versions(id) on delete restrict,
  -- Descriptive, for grouping the log by form. The version above is the record.
  form_id uuid,

  -- Cascades on purpose: an erasure request has to be able to complete.
  client_id uuid references public.clients(id) on delete cascade,
  -- Descriptive: a pet or booking may be removed and the answers stay.
  pet_id uuid,
  booking_id uuid,

  status text not null default 'submitted'
    check (status in ('draft', 'submitted', 'reviewed', 'flagged', 'archived')),

  -- The answers bag, keyed by the field ids in the frozen schema above. The
  -- shape `FormWizard` already produces (CLAUDE.md: a `Record<string, unknown>`
  -- answers bag is the correct pattern for dynamic forms).
  answers jsonb not null default '{}'::jsonb,

  -- Whether somebody filled it in for the customer, and who.
  staff_assisted boolean not null default false,
  staff_assistant_id text,

  score numeric(6, 2),
  score_outcome text,
  score_details jsonb,

  submitted_by text,
  submitted_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.form_submissions is
  'What somebody answered, against a FROZEN version. `answers` may not be rewritten once submitted - only the review status advances.';

create index if not exists form_submissions_facility_idx
  on public.form_submissions (facility_id, submitted_at desc);
create index if not exists form_submissions_client_idx
  on public.form_submissions (client_id, submitted_at desc);
create index if not exists form_submissions_version_idx
  on public.form_submissions (form_version_id);

-- ── FREEZING ──────────────────────────────────────────────────────────────

create or replace function private.published_form_version_is_frozen()
returns trigger
language plpgsql
as $$
begin
  -- A draft may be edited freely; publishing it is the one-way door.
  if old.published_at is null then
    return new;
  end if;

  -- Listed explicitly rather than compared wholesale, so a column added later
  -- fails loudly here instead of quietly becoming editable on a published row.
  if new.schema         is distinct from old.schema
     or new.form_id     is distinct from old.form_id
     or new.facility_id is distinct from old.facility_id
     or new.version_number is distinct from old.version_number
     or new.published_at   is distinct from old.published_at
     or new.created_at     is distinct from old.created_at
  then
    raise exception
      'That form version is published and cannot be changed. Somebody may already have answered it - publish a new version instead.'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

drop trigger if exists form_versions_frozen on public.form_versions;
create trigger form_versions_frozen
  before update on public.form_versions
  for each row execute function private.published_form_version_is_frozen();

-- ── AND THE ANSWERS ───────────────────────────────────────────────────────
--
-- A submission's REVIEW STATE moves — staff mark it reviewed or flagged, and
-- score it. What somebody answered does not.

create or replace function private.submitted_answers_are_final()
returns trigger
language plpgsql
as $$
begin
  -- A draft the customer has not sent yet is still theirs to change.
  if old.status = 'draft' then
    return new;
  end if;

  if new.answers is distinct from old.answers then
    raise exception
      'Those answers have been submitted and cannot be edited. They are the record of what the person said.'
      using errcode = '42501';
  end if;

  if new.form_version_id is distinct from old.form_version_id
     or new.client_id    is distinct from old.client_id
     or new.submitted_at is distinct from old.submitted_at
     or new.submitted_by is distinct from old.submitted_by
  then
    raise exception
      'A submission cannot be reassigned or re-dated. Only its review state changes.'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

drop trigger if exists form_submissions_answers_final on public.form_submissions;
create trigger form_submissions_answers_final
  before update on public.form_submissions
  for each row execute function private.submitted_answers_are_final();

-- No BEFORE DELETE trigger on either, for the reason the ledgers have none: it
-- fires on the cascade from `clients` and would make an erasure request
-- impossible to honour.

-- ── ROW-LEVEL SECURITY ────────────────────────────────────────────────────

alter table public.forms            enable row level security;
alter table public.form_versions    enable row level security;
alter table public.form_submissions enable row level security;

-- Reading a form is wider than authoring one, exactly as with waivers: a
-- customer holds no permission and must be able to see the form they are
-- filling in, and front-desk staff need it without `settings_manage_forms`.
drop policy if exists forms_read on public.forms;
create policy forms_read on public.forms
  for select using (
    private.is_platform_admin()
    or private.has_permission(facility_id, 'settings_manage_forms')
    or (
      status = 'published'
      and (
        facility_id in (select private.member_facility_ids())
        or facility_id in (
          select c.facility_id from public.clients c
           where c.id in (select private.own_client_ids())
        )
      )
    )
  );

drop policy if exists forms_write on public.forms;
create policy forms_write on public.forms
  for all using (
    private.has_permission(facility_id, 'settings_manage_forms')
  ) with check (
    private.has_permission(facility_id, 'settings_manage_forms')
  );

-- A version is readable by whoever can read its form. Drafts are for authors.
drop policy if exists form_versions_read on public.form_versions;
create policy form_versions_read on public.form_versions
  for select using (
    private.is_platform_admin()
    or private.has_permission(facility_id, 'settings_manage_forms')
    or (
      published_at is not null
      and (
        facility_id in (select private.member_facility_ids())
        or facility_id in (
          select c.facility_id from public.clients c
           where c.id in (select private.own_client_ids())
        )
      )
    )
  );

drop policy if exists form_versions_write on public.form_versions;
create policy form_versions_write on public.form_versions
  for all using (
    private.has_permission(facility_id, 'settings_manage_forms')
  ) with check (
    private.has_permission(facility_id, 'settings_manage_forms')
  );

-- A customer sees their own answers. Staff who may see client documents see the
-- facility's - "has this been filled in?" is a check-in question.
drop policy if exists form_submissions_read on public.form_submissions;
create policy form_submissions_read on public.form_submissions
  for select using (
    private.is_platform_admin()
    or private.has_permission(facility_id, 'view_client_documents')
    or client_id in (select private.own_client_ids())
  );

-- Submitting: the customer for themselves, or staff capturing one at the
-- counter. `edit_clients` for the staff arm rather than `view_client_documents`
-- - a VIEW permission must not authorise a WRITE.
drop policy if exists form_submissions_insert on public.form_submissions;
create policy form_submissions_insert on public.form_submissions
  for insert with check (
    client_id in (select private.own_client_ids())
    or private.has_permission(facility_id, 'edit_clients')
  );

-- Reviewing. The trigger decides WHAT may change; this decides who.
drop policy if exists form_submissions_review on public.form_submissions;
create policy form_submissions_review on public.form_submissions
  for update using (
    private.has_permission(facility_id, 'view_client_documents')
  ) with check (
    private.has_permission(facility_id, 'view_client_documents')
  );

-- No DELETE policy on any of the three, deliberately.
