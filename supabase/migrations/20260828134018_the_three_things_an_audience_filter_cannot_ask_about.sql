-- ============================================================================
-- Vaccinations, tags and memberships become rows you can query across.
--
-- ── WHY THESE THREE, AND WHY NOW ──────────────────────────────────────────
--
-- The Smart Workflows spec lists eight audience filters. Five of them compile
-- against columns that already exist — last visit, last service, active
-- booking, total visits, last booking date. Three do not:
--
--   pet vaccination status   lives in `pets.details` jsonb
--   customer tag             has no table at all, only a fixture
--   membership status        lives in `clients.details` jsonb
--
-- And `clients.details` carries an explicit instruction from the migration that
-- created it: those keys are "displayed on the profile, NEVER queried across
-- rows". A jsonb blob has no index for "everyone whose vaccines expire within
-- 30 days" and would table-scan every client to answer it.
--
-- The vaccination one is not a corner case. It is the spec's own flagship
-- example — the placeholder text in the Create Workflow dialog is literally
-- "e.g. Vaccine Reminder Sequence" — and two of the automation rules shipped as
-- "Active" depend on it. Without this table that headline feature cannot be
-- built at all, only mocked.
--
-- ── THERE IS NO BACKFILL, AND THAT IS MEASURED, NOT ASSUMED ───────────────
--
-- Run against production immediately before writing this file:
--
--   pets total                              23
--   pets with details ? 'vaccinations'       0
--   clients total                           17
--   clients with details ? 'membership'      1
--   clients with details ? 'tags'            0
--
-- Zero vaccination records and zero tags, because the only writer was an
-- `await new Promise(r => setTimeout(r, 500))` followed by a success toast —
-- the modal never wrote anything. So no vaccination or tag backfill exists to
-- get wrong. The single membership is carried over at the end of this file,
-- copied and not moved: `clients.details->'membership'` is left exactly where
-- it is, so reverting is `truncate public.customer_memberships` and nothing
-- else. Deleting the jsonb key is a separate change for a later week, once this
-- table has been the read path in production for a while.
--
-- ── NOT A NEW TAG SYSTEM ──────────────────────────────────────────────────
--
-- `src/types/tags.ts` already models a tag over pets, clients AND bookings,
-- with ten shared components and a settings screen behind it. This makes THAT
-- real. A second, marketing-only tag table would give staff two "VIP"s that
-- cannot see each other, which is worse than none.
-- ============================================================================

-- ── Vaccinations ──────────────────────────────────────────────────────────

create table if not exists public.pet_vaccinations (
  id uuid primary key default gen_random_uuid(),
  pet_id uuid not null references public.pets(id) on delete cascade,

  -- Denormalised from the pet, and enforced by the trigger below rather than
  -- trusted. Every audience query filters by facility first; resolving it
  -- through a join on every row of a 30-day expiry scan is the difference
  -- between an index and a table scan.
  facility_id uuid not null references public.facilities(id) on delete cascade,

  vaccine_name text not null check (btrim(vaccine_name) <> ''),
  administered_on date,

  -- The one column the whole feature turns on.
  expires_on date,

  veterinarian_name text,
  veterinary_clinic text,
  document_url text,

  status text not null default 'pending_review'
    check (status in ('pending_review', 'approved', 'rejected', 'exception')),
  reviewed_by text,
  reviewed_at timestamptz,

  -- ONE reason column, not `rejectionReason` + `exceptionReason`. Two columns
  -- for one fact is how the fixture drifted.
  review_reason text,
  notes text,

  created_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.pet_vaccinations is
  'Vaccination records, queryable across pets. Replaces pets.details->vaccinations, which nothing ever wrote.';

-- DELIBERATELY NO `reminder_sent` COLUMN.
--
-- Whether a reminder went out is a question `message_sends` answers, keyed by
-- its idempotency key. A boolean here could disagree with the outbox, and two
-- places that disagree about whether a customer was told something is exactly
-- the failure this whole system was built to remove.

-- The index the expiry scan and the `vaccination_expiring_in_days` filter both
-- hit. Partial on `approved`: a rejected record is not protection, so counting
-- it as cover would be worse than having none.
create index if not exists pet_vaccinations_expiry_idx
  on public.pet_vaccinations (facility_id, expires_on)
  where status = 'approved';

create index if not exists pet_vaccinations_pet_idx
  on public.pet_vaccinations (pet_id, expires_on desc);

create or replace function private.pet_vaccination_facility()
returns trigger
language plpgsql
security definer
set search_path = ''
as $fn$
declare v_facility uuid;
begin
  select facility_id into v_facility from public.pets where id = new.pet_id;
  if v_facility is null then
    raise exception 'no such pet';
  end if;
  -- Set rather than compared: a caller naming another facility is not refused,
  -- it is corrected. The pet owns the answer.
  new.facility_id := v_facility;
  return new;
end;
$fn$;

drop trigger if exists pet_vaccinations_set_facility on public.pet_vaccinations;
create trigger pet_vaccinations_set_facility
  before insert or update on public.pet_vaccinations
  for each row execute function private.pet_vaccination_facility();

-- ── Tags ──────────────────────────────────────────────────────────────────

create table if not exists public.facility_tags (
  id uuid primary key default gen_random_uuid(),
  facility_id uuid not null references public.facilities(id) on delete cascade,

  -- Matches `tagTypeEnum` in src/types/tags.ts exactly, so the existing
  -- TagBadge / TagList / TagAssignmentPopover components are repointed rather
  -- than forked.
  entity_type text not null check (entity_type in ('pet', 'customer', 'booking')),

  name text not null check (btrim(name) <> ''),
  color text not null default 'slate',
  icon text,
  description text,
  priority text not null default 'informational'
    check (priority in ('informational', 'warning', 'critical')),
  visibility text not null default 'internal'
    check (visibility in ('internal', 'client_visible')),
  scope text not null default 'global'
    check (scope in ('global', 'location_specific')),
  location_ids uuid[] not null default '{}',

  is_active boolean not null default true,
  created_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.facility_tags is
  'The tag library — pet, customer and booking tags in one taxonomy. Makes src/types/tags.ts real.';

create unique index if not exists facility_tags_name_unique
  on public.facility_tags (facility_id, entity_type, lower(name));

create table if not exists public.facility_tag_assignments (
  id uuid primary key default gen_random_uuid(),
  tag_id uuid not null references public.facility_tags(id) on delete cascade,

  -- Polymorphic, so no foreign key is possible. Three narrow join tables would
  -- be referentially tidier and would fork three shared components that are
  -- already polymorphic, so the trade is taken deliberately and the facility is
  -- asserted by trigger instead.
  entity_type text not null check (entity_type in ('pet', 'customer', 'booking')),
  entity_id uuid not null,

  facility_id uuid not null references public.facilities(id) on delete cascade,

  assigned_by text,
  assigned_at timestamptz not null default now(),
  expires_at timestamptz,
  notes text
);

comment on table public.facility_tag_assignments is
  'Which tag is on which pet/client/booking. entity_id is polymorphic and therefore unkeyed; facility_id is asserted against the tag by trigger.';

create unique index if not exists facility_tag_assignments_unique
  on public.facility_tag_assignments (tag_id, entity_id);

-- The audience filter's query: which clients carry tag X?
create index if not exists facility_tag_assignments_lookup_idx
  on public.facility_tag_assignments (facility_id, entity_type, entity_id);

create or replace function private.tag_assignment_facility()
returns trigger
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  v_facility uuid;
  v_entity_type text;
begin
  select facility_id, entity_type into v_facility, v_entity_type
    from public.facility_tags where id = new.tag_id;
  if v_facility is null then
    raise exception 'no such tag';
  end if;
  if v_entity_type is distinct from new.entity_type then
    raise exception 'a % tag cannot be applied to a %', v_entity_type, new.entity_type;
  end if;
  new.facility_id := v_facility;
  return new;
end;
$fn$;

drop trigger if exists facility_tag_assignments_set_facility on public.facility_tag_assignments;
create trigger facility_tag_assignments_set_facility
  before insert or update on public.facility_tag_assignments
  for each row execute function private.tag_assignment_facility();

-- ── Memberships ───────────────────────────────────────────────────────────

create table if not exists public.customer_memberships (
  id uuid primary key default gen_random_uuid(),
  facility_id uuid not null references public.facilities(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,

  -- Free text, matching `membershipSchema.plan`. A `membership_plans`
  -- catalogue is the correct model and is DEFERRED on purpose: nothing in the
  -- spec edits plans, and inventing a catalogue nothing writes to would be a
  -- table with no editor.
  plan_name text not null check (btrim(plan_name) <> ''),

  status text not null default 'active'
    check (status in ('active', 'expired', 'cancelled')),
  starts_on date,
  ends_on date,

  discount_percent numeric(5, 2)
    check (discount_percent is null or (discount_percent >= 0 and discount_percent <= 100)),
  benefits jsonb not null default '{}',

  created_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.customer_memberships is
  'A CUSTOMER''s membership plan. Not facility_memberships, which is staff, and not customer_packages, which is prepaid credit.';

-- ONE active plan per client. The alternative — several at once — is either
-- right or a production 409, so it is decided here rather than discovered: a
-- second concurrent plan is what `customer_packages` is for, and "which
-- discount applies" has to have one answer.
create unique index if not exists customer_memberships_one_active
  on public.customer_memberships (client_id) where status = 'active';

create index if not exists customer_memberships_status_idx
  on public.customer_memberships (facility_id, status, ends_on);

-- ── Row-level security ────────────────────────────────────────────────────

alter table public.pet_vaccinations          enable row level security;
alter table public.facility_tags             enable row level security;
alter table public.facility_tag_assignments  enable row level security;
alter table public.customer_memberships      enable row level security;

-- Reading is wide throughout: the person at the door checking a dog in needs to
-- see that its shots are current, and holds no management permission.

drop policy if exists pet_vaccinations_read on public.pet_vaccinations;
create policy pet_vaccinations_read on public.pet_vaccinations
  for select using (
    private.is_platform_admin()
    or facility_id in (select private.member_facility_ids())
  );

drop policy if exists pet_vaccinations_write on public.pet_vaccinations;
create policy pet_vaccinations_write on public.pet_vaccinations
  for all using (
    private.has_permission(facility_id, 'edit_pet_medical')
  ) with check (
    private.has_permission(facility_id, 'edit_pet_medical')
  );

-- The tag LIBRARY is configuration; assigning a tag is editing a client.
drop policy if exists facility_tags_read on public.facility_tags;
create policy facility_tags_read on public.facility_tags
  for select using (
    private.is_platform_admin()
    or facility_id in (select private.member_facility_ids())
  );

drop policy if exists facility_tags_write on public.facility_tags;
create policy facility_tags_write on public.facility_tags
  for all using (
    private.has_permission(facility_id, 'manage_facility_settings')
  ) with check (
    private.has_permission(facility_id, 'manage_facility_settings')
  );

drop policy if exists facility_tag_assignments_read on public.facility_tag_assignments;
create policy facility_tag_assignments_read on public.facility_tag_assignments
  for select using (
    private.is_platform_admin()
    or facility_id in (select private.member_facility_ids())
  );

drop policy if exists facility_tag_assignments_write on public.facility_tag_assignments;
create policy facility_tag_assignments_write on public.facility_tag_assignments
  for all using (
    private.has_permission(facility_id, 'edit_clients')
  ) with check (
    private.has_permission(facility_id, 'edit_clients')
  );

drop policy if exists customer_memberships_read on public.customer_memberships;
create policy customer_memberships_read on public.customer_memberships
  for select using (
    private.is_platform_admin()
    or facility_id in (select private.member_facility_ids())
  );

drop policy if exists customer_memberships_write on public.customer_memberships;
create policy customer_memberships_write on public.customer_memberships
  for all using (
    private.has_permission(facility_id, 'edit_clients')
  ) with check (
    private.has_permission(facility_id, 'edit_clients')
  );

-- ── Privileges ────────────────────────────────────────────────────────────

grant select, insert, update, delete on public.pet_vaccinations         to authenticated;
grant select, insert, update, delete on public.facility_tags            to authenticated;
grant select, insert, update, delete on public.facility_tag_assignments to authenticated;
grant select, insert, update, delete on public.customer_memberships     to authenticated;

revoke all on public.pet_vaccinations         from public, anon;
revoke all on public.facility_tags            from public, anon;
revoke all on public.facility_tag_assignments from public, anon;
revoke all on public.customer_memberships     from public, anon;

do $$
declare t text;
begin
  foreach t in array array[
    'public.pet_vaccinations',
    'public.facility_tags',
    'public.facility_tag_assignments',
    'public.customer_memberships'
  ] loop
    if has_table_privilege('anon', t, 'select') then
      raise exception '% : anon can still read', t;
    end if;
    if has_table_privilege('anon', t, 'insert') then
      raise exception '% : anon can still write', t;
    end if;
    if not has_table_privilege('authenticated', t, 'select') then
      raise exception '% : authenticated cannot read it at all', t;
    end if;
  end loop;
end $$;

-- ── The one membership that exists ────────────────────────────────────────
--
-- COPIED, not moved. `clients.details->'membership'` stays exactly where it is,
-- so reverting this is `truncate public.customer_memberships` and nothing else.
-- `on conflict do nothing` against the one-active index makes a re-run a no-op.
--
-- `nullif(..., '')` on the dates because an empty string round-tripped into a
-- `date` column is a 500, and the fixture shape allows one.

insert into public.customer_memberships
  (facility_id, client_id, plan_name, status, starts_on, ends_on, discount_percent, benefits, created_by)
select
  c.facility_id,
  c.id,
  coalesce(nullif(c.details -> 'membership' ->> 'plan', ''), 'Membership'),
  case
    when c.details -> 'membership' ->> 'status' in ('active', 'expired', 'cancelled')
      then c.details -> 'membership' ->> 'status'
    else 'active'
  end,
  nullif(c.details -> 'membership' ->> 'startDate', '')::date,
  nullif(c.details -> 'membership' ->> 'expiryDate', '')::date,
  nullif(c.details -> 'membership' -> 'benefits' ->> 'discountPercent', '')::numeric,
  coalesce(c.details -> 'membership' -> 'benefits', '{}'::jsonb),
  'migration 20260828120000'
from public.clients c
where c.details ? 'membership'
on conflict do nothing;

do $$
declare
  v_source int;
  v_copied int;
begin
  select count(*) into v_source from public.clients where details ? 'membership';
  select count(*) into v_copied from public.customer_memberships;

  -- The uuid/number trap: VaccinationRecord.petId and TagAssignment.entityId
  -- are `number` in TypeScript while real ids are uuid, so a copy that skips
  -- the mapping "succeeds" having moved zero rows. Nothing here maps an id, but
  -- the assertion is the habit — a backfill that silently copies nothing is the
  -- one that gets believed.
  if v_source > 0 and v_copied = 0 then
    raise exception 'membership backfill copied 0 of % rows', v_source;
  end if;
  raise notice 'memberships: % source row(s), % in the new table', v_source, v_copied;
end $$;
