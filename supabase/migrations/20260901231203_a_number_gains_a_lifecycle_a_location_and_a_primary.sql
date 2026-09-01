-- ============================================================================
-- A facility's numbers gain a lifecycle, a location and a primary.
--
-- 20260809200000 created `communication_numbers` for the end state: a number
-- that has been bought and works. Provisioning has states before that one and
-- porting has states beside it, and none of them could be recorded.
--
-- ── `status` IS ADDED, NOT WIDENED ────────────────────────────────────────
--
-- The roadmap said to widen `status` to
-- provisioning|active|porting|port_failed|released. There is no `status` column
-- on this table and never was — the shipped design carried `released_at` alone,
-- because the only two states it needed were "in use" and "released". Checked
-- against information_schema rather than the migration, which is how the
-- absence turned up.
--
-- So `released_at` stays and does not become a second source of truth: a check
-- constraint makes it agree with `status` in both directions. A row that says
-- released with no timestamp, or carries a timestamp without saying released,
-- is refused rather than left for a report to average over.
--
-- ── AND THE CAPABILITY CHECK HAD TO BE RELAXED, OR NOTHING COULD START ────
--
-- `communication_number_does_something` requires sms, mms or voice to be
-- enabled. That is right for a number in service and impossible for one being
-- provisioned: the first write happens BEFORE the number is bought, when its
-- capabilities are not yet known. The constraint as written would have refused
-- the opening step of the flow it exists to protect. It now applies to `active`
-- rows, which is where it was doing the work.
--
-- ── NO WRITE POLICY, DELIBERATELY ─────────────────────────────────────────
--
-- Provisioning runs as service_role and bypasses RLS. A write policy here would
-- let a member of a facility edit which number their calls come from.
-- supabase/tests/communication-rls.sql asserts the absence.
-- ============================================================================

alter table public.communication_numbers
  add column if not exists status text not null default 'active',
  add column if not exists location_id uuid,
  add column if not exists label text,
  add column if not exists is_primary boolean not null default false;

do $mig$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'communication_numbers_status_check'
  ) then
    alter table public.communication_numbers
      add constraint communication_numbers_status_check
      check (status in ('provisioning', 'active', 'porting', 'port_failed', 'released'));
  end if;

  -- A number outlives the location it was bought for: it appears in years of
  -- message history and on printed receipts, so losing the location must not
  -- take the number's record with it.
  if not exists (
    select 1 from pg_constraint where conname = 'communication_numbers_location_id_fkey'
  ) then
    alter table public.communication_numbers
      add constraint communication_numbers_location_id_fkey
      foreign key (location_id) references public.locations (id) on delete set null;
  end if;

  -- One fact, not two.
  if not exists (
    select 1 from pg_constraint where conname = 'communication_number_released_agrees'
  ) then
    alter table public.communication_numbers
      add constraint communication_number_released_agrees
      check ((status = 'released') = (released_at is not null));
  end if;

  -- Relaxed to `active`. See the banner: as written it refused the first write
  -- of the provisioning flow.
  if exists (
    select 1 from pg_constraint where conname = 'communication_number_does_something'
  ) then
    alter table public.communication_numbers
      drop constraint communication_number_does_something;
  end if;

  alter table public.communication_numbers
    add constraint communication_number_does_something
    check (status <> 'active' or sms_enabled or mms_enabled or voice_enabled);
end
$mig$;

-- At most one primary per facility. Partial, so the many non-primary numbers do
-- not collide with each other — a plain unique index on (facility_id,
-- is_primary) would allow exactly one NON-primary number too, which is the
-- mistake this shape avoids.
create unique index if not exists communication_numbers_one_primary
  on public.communication_numbers (facility_id)
  where is_primary;

-- Reading a facility's numbers by location is what the multi-location screens
-- do; without this it is a sequential scan behind an RLS predicate.
create index if not exists communication_numbers_location_idx
  on public.communication_numbers (location_id)
  where location_id is not null;

comment on column public.communication_numbers.status is
  'provisioning | active | porting | port_failed | released. Agrees with released_at by constraint.';
comment on column public.communication_numbers.location_id is
  'Which branch this number belongs to. Null means the facility as a whole.';
comment on column public.communication_numbers.label is
  'What staff call it — "Front desk", "Grooming". Display only.';
comment on column public.communication_numbers.is_primary is
  'The number used when nothing names a location. At most one per facility.';
