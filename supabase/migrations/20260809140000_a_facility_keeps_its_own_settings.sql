-- ===========================================================================
-- A facility keeps its own settings.
--
-- `useSettings` is a React context holding twenty-odd configuration domains in
-- useState, seeded from `src/data/settings.ts`, read by 41 components and
-- persisted NOWHERE. A facility that changes its opening hours loses them on
-- refresh, and until then every facility on the platform shares one set of
-- values belonging to nobody:
--
--     open 07:00-19:00 weekdays, 24h minimum notice, 48h cancellation,
--     25% deposit, capacity 50
--
-- These are not cosmetic. `hours` and `rules` feed the booking modals — they
-- decide what a customer is offered and what a deposit costs. A facility open
-- until 21:00 was being told it closes at 19:00, by its own software.
--
-- ── ONE TABLE, NOT TWENTY COLUMNS ─────────────────────────────────────────
--
-- Two domains land here today (business_hours, booking_rules) and the rest
-- follow. Twenty jsonb columns on `facilities` would mean twenty migrations,
-- twenty type regenerations and a table whose shape is a changelog. A row per
-- (facility, domain) means the next domain is an INSERT.
--
-- The cost is that Postgres cannot type the contents. That is paid in the API
-- layer, which validates each domain against a Zod schema before writing — and
-- deliberately NOT with a check constraint here, which would put the app's
-- shape in two places and let them disagree.
--
-- ── NOTHING IS SEEDED ─────────────────────────────────────────────────────
--
-- No rows are created for existing facilities. An absent row means "this
-- facility has not configured this", and the app supplies a documented default
-- for it — which is a different thing from a stored value nobody chose. If the
-- fixture's 07:00-19:00 were written in here, a facility's real hours would be
-- indistinguishable from the ones the seed invented for them.
-- ===========================================================================

create table if not exists public.facility_settings (
  facility_id uuid        not null references public.facilities (id) on delete cascade,
  domain      text        not null,
  value       jsonb       not null,
  updated_at  timestamptz not null default now(),
  updated_by  text        references public.profiles (id) on delete set null,
  primary key (facility_id, domain)
);

comment on table public.facility_settings is
  'One row per (facility, configuration domain). Shape is validated by the API, not here.';
comment on column public.facility_settings.domain is
  'business_hours, booking_rules, … — the key the app knows the Zod schema for.';

create index if not exists facility_settings_facility_idx
  on public.facility_settings (facility_id);

alter table public.facility_settings enable row level security;

-- ---------------------------------------------------------------------------
-- Reading.
--
-- Staff of the facility, AND its clients. Not generosity: the customer booking
-- modal needs the opening hours and the cancellation policy to show someone
-- what they can book and what it would cost to cancel. A customer who cannot
-- read the hours cannot be shown a slot.
--
-- `private.client_facility_ids()` is the same function `facilities_read`
-- already uses for exactly this, so a customer's reach here is identical to
-- their reach for the facility row itself rather than a second, subtly
-- different answer.
-- ---------------------------------------------------------------------------

drop policy if exists facility_settings_read on public.facility_settings;
create policy facility_settings_read
  on public.facility_settings
  for select
  using (
    private.is_platform_admin()
    or facility_id in (select private.member_facility_ids_all())
    or facility_id in (select private.client_facility_ids())
  );

-- ---------------------------------------------------------------------------
-- Writing.
--
-- `settings_general` — owner, admin and manager. The same key that gates the
-- business profile, because these live on the same screen and a facility that
-- may correct its address may set its opening hours.
--
-- Checked against `public.permissions` rather than assumed. `has_permission()`
-- fails CLOSED on a key that does not exist, and the resulting lockout is
-- indistinguishable from a correct refusal — a mistake already paid for once
-- on this project.
--
-- Separate INSERT and UPDATE policies because a settings save is an upsert: the
-- first save for a domain is an INSERT (there is no row yet) and every one
-- after it is an UPDATE.
-- ---------------------------------------------------------------------------

drop policy if exists facility_settings_insert on public.facility_settings;
create policy facility_settings_insert
  on public.facility_settings
  for insert
  with check (private.has_permission(facility_id, 'settings_general'));

drop policy if exists facility_settings_update on public.facility_settings;
create policy facility_settings_update
  on public.facility_settings
  for update
  using (private.has_permission(facility_id, 'settings_general'))
  with check (private.has_permission(facility_id, 'settings_general'));

-- No DELETE policy, and that is the design. Removing a row means "never
-- configured", which is not a state a facility should be able to return to by
-- accident — and there is no screen that asks for it. Resetting to defaults is
-- a write of the default, which leaves a record of who chose it.

-- ---------------------------------------------------------------------------
-- Who last changed it, without trusting the caller to say.
-- ---------------------------------------------------------------------------

create or replace function private.stamp_facility_setting()
returns trigger
language plpgsql
security definer
set search_path to ''
as $$
begin
  new.updated_at := now();
  new.updated_by := coalesce((select auth.jwt()->>'sub'), new.updated_by);
  -- A settings row cannot be moved between facilities. Same reasoning as
  -- `enforce_client_integrity`: the row's facility is its identity, and an
  -- update that changes it is one facility writing into another's settings.
  if tg_op = 'UPDATE' then
    new.facility_id := old.facility_id;
    new.domain      := old.domain;
  end if;
  return new;
end;
$$;

drop trigger if exists facility_settings_stamp on public.facility_settings;
create trigger facility_settings_stamp
  before insert or update on public.facility_settings
  for each row execute function private.stamp_facility_setting();
