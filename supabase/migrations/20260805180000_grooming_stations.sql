-- ============================================================================
-- Grooming stations — the tables, tubs and dryers a pet physically occupies.
--
-- ── DECISION 1: A GROOMING TABLE, NOT A GENERIC "RESOURCE" TABLE ───────────
--
-- `types/rooms.ts` holds three siblings: FacilityRoom (boarding), DaycareSection
-- and GroomingStation. They share a skeleton — facility, name, active, notes,
-- image — and diverge everywhere it matters: rooms hang off a category and
-- carry capacity, sections hang off a play area and carry RoomRule[], stations
-- hang off nothing and carry size eligibility and live status.
--
-- A single `facility_resources` table with a `kind` discriminator would make
-- every query filter by kind and leave most columns null for any given kind —
-- the same sparse-wide-table trade already refused for bookings in
-- 20260805140000. And it would be designed for two callers that do not exist
-- yet: boarding and daycare are not migrated, so their real shape is unknown.
--
-- If a shared shape turns out to be real when they DO migrate, extracting it
-- then is an informed refactor with three data points. Guessing at it now, with
-- one, is how the parallel-model entries in the debt map got written.
--
-- ── DECISION 2: LIVE OCCUPANCY IS DERIVED, NOT STORED ──────────────────────
--
-- The mock keeps `currentPetName`, `currentStylistName` and
-- `estimatedCompletionAt` ON the station (types/rooms.ts:137-143). Those are
-- not facts about a table — they are facts about the APPOINTMENT currently at
-- it, copied. Two places holding the same fact is two places that can disagree,
-- and the one that goes stale is the board a groomer is reading.
--
-- So the station stores none of them. `grooming_appointments.station_id` (added
-- below) records the assignment, and who is on a table is a join away — the
-- same reasoning that made check-in/check-out derive from the booking's status
-- rather than being written twice.
--
-- `status` DOES stay on the station, because "needs cleaning" and "out of
-- service" are genuinely the table's own state and no appointment implies them.
-- It is staff-settable and advisory: when it says `in-use`, the authoritative
-- answer to "in use by whom" is still the appointment.
--
-- ── PERMISSIONS ────────────────────────────────────────────────────────────
--
--   read   `view_services` (the booking flow filters stations by pet size, and
--          the check-in board renders them), or platform admin. NOT clients: a
--          customer picks a time, not a bathtub.
--   write  `manage_services` for the estate, and the SAME key for status —
--          deliberately not split. Unlike rates, "mark this tub as needing a
--          clean" is a floor action, not a pricing decision, and inventing a
--          `manage_stations` key nobody grants would make the status control
--          unusable for the people who actually stand next to the tub.
-- ============================================================================

create table public.grooming_stations (
  id          uuid primary key default gen_random_uuid(),
  facility_id uuid not null references public.facilities (id) on delete cascade,

  -- "gs-t-01". Ten components key on these ids today.
  legacy_id   text,

  name        text not null,
  type        text not null
                check (type in ('table', 'tub', 'cage_dryer', 'stand_dryer')),
  active      boolean not null default true,

  status      text not null default 'available'
                check (status in ('available', 'in-use', 'needs-cleaning',
                                  'out-of-service')),
  -- Drives the "X min ago" label. Maintained by trigger so it cannot be
  -- back-dated by a caller, and so it only moves when the status actually does.
  --
  -- Stamped with clock_timestamp(), NOT now(). Everywhere else in this schema
  -- `now()` is right, because it marks a transaction and every row written
  -- together should agree. This column is different: it is a WALL-CLOCK reading
  -- that a groomer subtracts from the current time to get "needs cleaning for 8
  -- minutes". `now()` is transaction-START time, so a batch that marks six tubs
  -- clean would stamp them all with the instant the batch opened rather than
  -- when each was actually touched — and inside a single transaction it cannot
  -- move at all, which is also why the behaviour was untestable until this
  -- changed.
  status_changed_at timestamptz,

  -- EMPTY MEANS NO RESTRICTION, for both. That is the mock's rule
  -- ("Empty / undefined means multi-purpose") and it is why these are arrays
  -- with a '{}' default rather than nullable — "unrestricted" and "not set" are
  -- the same thing here, and one representation for one meaning.
  allowed_pet_sizes text[] not null default '{}',
  pet_types         text[] not null default '{}',

  max_weight_lbs numeric(6,1) check (max_weight_lbs is null or max_weight_lbs > 0),

  staff_notes text not null default '',
  image_url   text,
  display_order integer not null default 0,

  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),

  constraint grooming_stations_legacy_key unique (facility_id, legacy_id)
);

create index grooming_stations_facility_idx
  on public.grooming_stations (facility_id);
create index grooming_stations_active_idx
  on public.grooming_stations (facility_id, display_order)
  where active;

comment on table public.grooming_stations is
  'Tables, tubs and dryers. Live occupancy is NOT stored here — see Decision 2 in 20260805180000; it comes from grooming_appointments.station_id.';

-- ── The assignment ──────────────────────────────────────────────────────────
-- Deliberately omitted from 20260805140000 ("no station table yet — station_id
-- is deliberately absent rather than a dangling text column"). It exists now.
--
-- `on delete set null`: removing a station from the estate must not delete the
-- appointments that happened on it, and it must not block the removal either.
-- The appointment keeps its history; it simply no longer names a table.

alter table public.grooming_appointments
  add column if not exists station_id uuid
    references public.grooming_stations (id) on delete set null;

create index if not exists grooming_appointments_station_idx
  on public.grooming_appointments (station_id);

-- A station must belong to the appointment's OWN facility. The FK only says the
-- station exists — without this a facility could park a booking on a
-- competitor's tub and read its name off the join.
create or replace function private.grooming_station_same_facility()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_station_facility uuid;
begin
  if new.station_id is null then
    return new;
  end if;
  select facility_id into v_station_facility
    from public.grooming_stations where id = new.station_id;
  if v_station_facility is distinct from new.facility_id then
    raise exception 'That station belongs to a different facility.'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

-- Sorts after grooming_appointments_facility, so it checks the DERIVED
-- facility_id rather than one the caller supplied.
create trigger grooming_zz_station_same_facility
  before insert or update on public.grooming_appointments
  for each row execute function private.grooming_station_same_facility();

-- ── status_changed_at ───────────────────────────────────────────────────────
-- Only moves when the status does. A plain `set to now() on update` would reset
-- it every time somebody renamed a tub, and the board's "needs cleaning for 8
-- minutes" would silently restart.

create or replace function private.grooming_station_status_stamp()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    new.status_changed_at := clock_timestamp();
  elsif new.status is distinct from old.status then
    new.status_changed_at := clock_timestamp();
  else
    -- Explicitly carried over rather than left alone: this is a BEFORE trigger,
    -- so a caller who sends their own status_changed_at on an unrelated edit
    -- would otherwise have it accepted. The clock is the server's.
    new.status_changed_at := old.status_changed_at;
  end if;
  return new;
end;
$$;

create trigger grooming_stations_status_stamp
  before insert or update on public.grooming_stations
  for each row execute function private.grooming_station_status_stamp();

create trigger grooming_stations_touch
  before update on public.grooming_stations
  for each row execute function private.set_updated_at();

-- ── RLS ─────────────────────────────────────────────────────────────────────

alter table public.grooming_stations enable row level security;

create policy grooming_stations_read on public.grooming_stations
  for select to authenticated
  using (
    private.is_platform_admin()
    or private.has_permission(facility_id, 'view_services')
  );
create policy grooming_stations_insert on public.grooming_stations
  for insert to authenticated
  with check (private.has_permission(facility_id, 'manage_services'));
create policy grooming_stations_update on public.grooming_stations
  for update to authenticated
  using (private.has_permission(facility_id, 'manage_services'))
  with check (private.has_permission(facility_id, 'manage_services'));
create policy grooming_stations_delete on public.grooming_stations
  for delete to authenticated
  using (private.has_permission(facility_id, 'manage_services'));
