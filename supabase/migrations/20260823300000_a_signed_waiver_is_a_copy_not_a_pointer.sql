-- ============================================================================
-- A signed waiver is a COPY of what somebody read, not a pointer at it.
--
-- ── WHAT WAS THERE ────────────────────────────────────────────────────────
--
-- Nothing. `/facility/dashboard/waivers` renders `DigitalWaiversManager`, 930
-- lines over `src/data/additional-features`, and every waiver it publishes and
-- every signature it captures lives for as long as the tab stays open.
--
-- That is worse here than on any other unconverted screen except gift cards,
-- and for a different reason. A gift card that saves nowhere loses money the
-- business owes. A waiver that saves nowhere loses the document a business
-- produces AFTER a dog bites somebody — so the facility believes it is covered
-- in precisely the situation the record exists for.
--
-- ── THE FIXTURE'S SIGNATURE PROVES NOTHING, AND THAT IS THE POINT ─────────
--
-- `WaiverSignature` carries `waiverId` and `waiverName` — a POINTER at a
-- document the facility can edit afterwards — and no copy of the text.
--
-- `staff_signatures` (20260804090000) already worked this out for the employee
-- side and says so in the table itself:
--
--   "A signature that points at a mutable document proves only that a person
--    clicked something, once, near a row that has since been edited — which is
--    worth nothing in the only situation the record matters."
--
-- So the same shape here. At signing, the waiver's text is COPIED onto the
-- signature and hashed. `waiver_name` and `waiver_version` are for display and
-- grouping and may drift; `waiver_text` and `waiver_hash` may not.
--
-- ── `waiver_id` CARRIES NO FOREIGN KEY, DELIBERATELY ──────────────────────
--
-- Twice-learned, in this repo, this month. An append-only table cannot hold
-- `on delete set null` — SET NULL is an UPDATE and the append-only guard
-- refuses it, which is exactly how `audit_log.facility_id` made every facility
-- undeletable (20260822500000). And `on delete cascade` would be worse than
-- either: deleting a waiver would delete the evidence that people signed it.
--
-- The column is descriptive. The signature does not depend on the waiver row
-- continuing to exist, which is the whole idea.
--
-- ── AND NO `BEFORE DELETE` TRIGGER, FOR THE SAME REASON AS THE LEDGERS ────
--
-- A BEFORE DELETE guard fires on a CASCADE too, and would make the client — and
-- the facility above them — undeletable. Append-only against APPLICATIONS is
-- achieved by granting no delete policy at all. `client_id` DOES cascade, on
-- purpose: an erasure request has to be able to complete.
-- ============================================================================

-- ── THE DOCUMENT ──────────────────────────────────────────────────────────

create table if not exists public.waivers (
  id uuid primary key default gen_random_uuid(),
  facility_id uuid not null references public.facilities(id) on delete cascade,

  name text not null,
  -- Which services it applies to ('boarding', 'daycare', 'grooming', …).
  -- A text array rather than a join table: it is a tag list the facility edits
  -- as one field, and nothing joins on it.
  services text[] not null default '{}',

  -- `body` is the flat text that gets COPIED onto a signature. `blocks` is the
  -- structured version the editor round-trips. The flat text is the one that
  -- matters: it is what a person can be shown to have read.
  body text not null,
  blocks jsonb not null default '[]'::jsonb,

  version text not null default '1.0',
  category text,

  active boolean not null default true,
  requires_signature boolean not null default true,
  /** A drawn/typed signature rather than a tick-box. */
  requires_digital_signature boolean not null default true,
  requires_witness boolean not null default false,

  -- Null means it never expires. Nullable rather than a large number: "does not
  -- expire" is a decision somebody made, not a duration they picked.
  expiry_days integer check (expiry_days is null or expiry_days > 0),

  created_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- A waiver with no text is a document that LOOKS like proof and is not one.
  -- The staff-signature route already refuses to sign one ("that agreement has
  -- no text to sign"); here it cannot be created in the first place.
  constraint waivers_body_not_empty check (btrim(body) <> '')
);

comment on table public.waivers is
  'A waiver document a facility publishes. Editable - which is why a signature COPIES the text rather than pointing here. See waiver_signatures.';

create index if not exists waivers_facility_idx
  on public.waivers (facility_id, active);

-- ── THE SIGNATURE ─────────────────────────────────────────────────────────

create table if not exists public.waiver_signatures (
  id uuid primary key default gen_random_uuid(),
  facility_id uuid not null references public.facilities(id) on delete cascade,

  -- NO FOREIGN KEY. See the header. Which document this was, for grouping and
  -- for the screen; not what makes the record stand up.
  waiver_id uuid,

  -- Cascades on purpose: an erasure request has to be able to complete.
  client_id uuid not null references public.clients(id) on delete cascade,
  -- Descriptive, like waiver_id: a pet may be removed and the signature stays.
  pet_id uuid,

  -- WHAT WAS SIGNED, AS IT WAS AT SIGNING TIME.
  waiver_name text not null,
  waiver_version text not null,
  waiver_text text not null,
  -- sha256 of exactly those bytes. Not a substitute for the text - a cheap way
  -- to prove the stored text has not been altered since, and to tell which
  -- version a cohort signed without diffing prose.
  waiver_hash text not null,

  signature_name text not null,
  signature_data text,
  witness_name text,
  witness_signature_data text,

  -- Evidence, not identity. Useful in a dispute, worthless as authentication -
  -- `signed_by` is who they were.
  ip_address text,
  user_agent text,

  signed_at timestamptz not null default now(),
  signed_by text,

  -- Computed from the waiver's `expiry_days` AT SIGNING. Null never expires.
  expires_at timestamptz,

  -- The one mutable pair on the row, and it may be set exactly once. See the
  -- trigger: a signature is superseded, not edited.
  revoked_at timestamptz,
  revoked_reason text,
  revoked_by text,

  created_at timestamptz not null default now(),

  constraint waiver_signatures_text_not_empty check (btrim(waiver_text) <> ''),
  constraint waiver_signatures_revocation_has_a_reason
    check (revoked_at is null or btrim(coalesce(revoked_reason, '')) <> '')
);

comment on table public.waiver_signatures is
  'Append-only record of a person agreeing to a waiver. Carries a COPY of the text and its sha256, not a reference to a document that can be edited afterwards. Only `revoked_at`/`revoked_reason`/`revoked_by` may ever change, once.';

comment on column public.waiver_signatures.waiver_id is
  'Which waiver this was. DESCRIPTIVE, not referential: no foreign key, so the signature outlives the document. An append-only table cannot hold `on delete set null` (SET NULL is an UPDATE the guard refuses - see audit_log, 20260822500000) and a cascade would delete the evidence.';

create index if not exists waiver_signatures_client_idx
  on public.waiver_signatures (client_id, signed_at desc);

create index if not exists waiver_signatures_facility_idx
  on public.waiver_signatures (facility_id, signed_at desc);

-- ── IMMUTABILITY, WITH ONE DOOR ───────────────────────────────────────────
--
-- Strictly append-only would be the simpler rule and it is not the right one: a
-- signature captured in error, or consent a customer withdraws, has to be
-- recordable. So exactly one transition is allowed - unrevoked to revoked - and
-- nothing else on the row may move with it.
--
-- Un-revoking is not a transition. Somebody signs again.

create or replace function private.waiver_signature_is_append_only()
returns trigger
language plpgsql
as $$
begin
  if old.revoked_at is not null then
    raise exception
      'That signature is already revoked. A signature is superseded by a new one, not edited.'
      using errcode = '42501';
  end if;

  if new.revoked_at is null then
    raise exception
      'waiver_signatures is append-only. The only change a signature accepts is being revoked.'
      using errcode = '42501';
  end if;

  -- Every column that is not part of revoking must be untouched. Listed rather
  -- than compared with `to_jsonb(old) - keys`, so adding a column later fails
  -- loudly here instead of quietly becoming editable.
  if new.id                     is distinct from old.id
     or new.facility_id         is distinct from old.facility_id
     or new.waiver_id           is distinct from old.waiver_id
     or new.client_id           is distinct from old.client_id
     or new.pet_id              is distinct from old.pet_id
     or new.waiver_name         is distinct from old.waiver_name
     or new.waiver_version      is distinct from old.waiver_version
     or new.waiver_text         is distinct from old.waiver_text
     or new.waiver_hash         is distinct from old.waiver_hash
     or new.signature_name      is distinct from old.signature_name
     or new.signature_data      is distinct from old.signature_data
     or new.witness_name        is distinct from old.witness_name
     or new.witness_signature_data is distinct from old.witness_signature_data
     or new.ip_address          is distinct from old.ip_address
     or new.user_agent          is distinct from old.user_agent
     or new.signed_at           is distinct from old.signed_at
     or new.signed_by           is distinct from old.signed_by
     or new.expires_at          is distinct from old.expires_at
     or new.created_at          is distinct from old.created_at
  then
    raise exception
      'A signature records what a person agreed to and cannot be edited. Only revoking it is allowed.'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

drop trigger if exists waiver_signatures_append_only on public.waiver_signatures;
create trigger waiver_signatures_append_only
  before update on public.waiver_signatures
  for each row execute function private.waiver_signature_is_append_only();

-- No BEFORE DELETE trigger. See the header: it would fire on the cascade from
-- `clients` and make an erasure request impossible to complete.

-- ── ROW-LEVEL SECURITY ────────────────────────────────────────────────────

alter table public.waivers            enable row level security;
alter table public.waiver_signatures  enable row level security;

-- READING A WAIVER IS WIDER THAN MANAGING ONE, and it has to be.
--
-- `view_waivers` is held by owner, admin and manager ONLY - measured, not
-- assumed. Reception does not hold it, and reception is exactly who hands a
-- tablet across the counter at check-in. A customer holds no permissions at all
-- and still has to read what they are about to sign.
--
-- So: anyone at the facility, and any customer of it, may read an ACTIVE
-- waiver. `view_waivers` is what additionally shows the retired ones.
drop policy if exists waivers_read on public.waivers;
create policy waivers_read on public.waivers
  for select using (
    private.is_platform_admin()
    or private.has_permission(facility_id, 'view_waivers')
    or (
      active
      and (
        facility_id in (select private.member_facility_ids())
        or facility_id in (
          select c.facility_id from public.clients c
           where c.id in (select private.own_client_ids())
        )
      )
    )
  );

-- Publishing one is deciding what the business's legal text says.
-- `settings_manage_forms` is owner/admin/manager - the same three, and an
-- existing key rather than a new one nobody's role editor knows about.
drop policy if exists waivers_write on public.waivers;
create policy waivers_write on public.waivers
  for all using (
    private.has_permission(facility_id, 'settings_manage_forms')
  ) with check (
    private.has_permission(facility_id, 'settings_manage_forms')
  );

-- A customer sees their own signatures. Staff who can see client documents see
-- the facility's - which is every front-of-house role, because "is this waiver
-- on file?" is a question asked at check-in rather than in an office.
drop policy if exists waiver_signatures_read on public.waiver_signatures;
create policy waiver_signatures_read on public.waiver_signatures
  for select using (
    private.is_platform_admin()
    or private.has_permission(facility_id, 'view_client_documents')
    or client_id in (select private.own_client_ids())
  );

-- Signing: the customer for themselves, or staff capturing one at the counter.
-- `edit_clients` for the staff arm rather than `view_client_documents` - a
-- VIEW permission must not authorise a WRITE, and `edit_clients` is held by
-- owner, admin, manager and reception, which is who takes a signature.
--
-- The TEXT is not trusted from the caller. `POST /api/waivers/[id]/sign` reads
-- the waiver body out of Postgres and hashes it server-side, exactly as
-- `/api/staff-signatures` does, so a caller cannot show one thing and store
-- another. That is a property of the route, and it is why this policy governs
-- WHO may sign rather than WHAT gets written.
drop policy if exists waiver_signatures_insert on public.waiver_signatures;
create policy waiver_signatures_insert on public.waiver_signatures
  for insert with check (
    client_id in (select private.own_client_ids())
    or private.has_permission(facility_id, 'edit_clients')
  );

-- Revoking. The trigger above decides WHAT may change; this decides who.
drop policy if exists waiver_signatures_revoke on public.waiver_signatures;
create policy waiver_signatures_revoke on public.waiver_signatures
  for update using (
    private.has_permission(facility_id, 'settings_manage_forms')
  ) with check (
    private.has_permission(facility_id, 'settings_manage_forms')
  );

-- No DELETE policy on either table, deliberately.
