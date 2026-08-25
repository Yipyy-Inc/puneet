-- ============================================================================
-- A location is a branch, and a branch has an address.
--
-- ── WHAT WAS ALREADY HERE ─────────────────────────────────────────────────
--
-- `public.locations` has existed since 20260726120000 with (id, facility_id,
-- name, is_primary, timezone) and full RLS, and THREE tables already point at
-- it: bookings.location_id, facility_memberships.home_location_id and
-- facility_terminals.location_id. Three rows exist — one primary location per
-- facility, and no facility has ever had a second.
--
-- Meanwhile /facility/hq/locations renders `src/data/locations.ts`: three
-- fictional Montreal branches keyed `facilityId: 11`, edited through two
-- `useSyncExternalStore` overlays whose own headers say "Swap for a real
-- mutation API when the backend lands". Nothing that screen does survives a
-- refresh.
--
-- So this migration does not invent multi-location. It gives the table that
-- already models it the columns the screen needs, and nothing more.
--
-- ── WHY THE DELETE GUARD IS THE POINT OF THIS FILE ────────────────────────
--
-- `bookings_location_id_fkey` is ON DELETE SET NULL. Deleting a branch today
-- therefore succeeds, silently, and takes with it the answer to "which branch
-- did this happen at" for every booking ever taken there. Same shape as the
-- facility-delete entry in the debt map: the cascade is not wrong, it is just
-- not what anybody means by "remove this location from the list".
--
-- A branch that has traded closes; it does not cease to have existed. So a
-- location with bookings against it is REFUSED, and `status = 'inactive'` is
-- the operation the screen actually wants.
--
-- ── AND `is_primary` IS AN INVARIANT, NOT A FLAG ──────────────────────────
--
-- Every facility with a location has exactly one primary: `facilityContext`
-- resolves it on every request and would otherwise have to guess. Enforced two
-- ways, because neither alone is enough:
--
--   * a partial unique index, so two primaries cannot coexist even under
--     concurrent writes;
--   * a BEFORE trigger that demotes the incumbent when a new primary is named,
--     because a partial unique index is checked per row and NOT deferrable, so
--     "promote B" would fail against the still-primary A. Postgres has no
--     deferrable partial unique constraint — the trigger is the only ordering
--     that works.
--
-- ── STATUS REPLACES A SECOND BOOLEAN ──────────────────────────────────────
--
-- The fixture type carries BOTH `isActive: boolean` and
-- `status?: "active" | "inactive" | "coming_soon"`, with a comment explaining
-- which wins. Two columns for one fact is how a screen starts disagreeing with
-- itself, so only `status` exists here.
-- ============================================================================

alter table public.locations
  add column if not exists short_code text,
  add column if not exists address jsonb,
  add column if not exists email text,
  add column if not exists phone text,
  add column if not exists status text not null default 'active',
  add column if not exists capacity jsonb not null default '{}'::jsonb,
  add column if not exists color text;

comment on column public.locations.address is
  'Same shape as facilities.address — {street, city, state, country, zipCode}. One shape, so one renderer.';
comment on column public.locations.status is
  'active | inactive | coming_soon. A branch that has traded is never deleted; it goes inactive.';
comment on column public.locations.capacity is
  'Per-service headcount, e.g. {"daycare": 40, "boarding": 25}. Absent key means no stated limit.';

alter table public.locations drop constraint if exists locations_status_check;
alter table public.locations add constraint locations_status_check
  check (status in ('active', 'inactive', 'coming_soon'));

-- A short code is a handle staff type; it has to be unambiguous within the
-- business, and case is not a distinction anybody means.
create unique index if not exists locations_short_code_per_facility
  on public.locations (facility_id, upper(short_code))
  where short_code is not null;

-- At most one primary. See the header for why the trigger below is also needed.
create unique index if not exists locations_one_primary_per_facility
  on public.locations (facility_id)
  where is_primary;

-- ── One primary, maintained rather than demanded ──────────────────────────

create or replace function private.locations_single_primary()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  -- Naming a new primary demotes the incumbent. The recursive fire of this
  -- trigger on that UPDATE takes the `else` path (is_primary is false), so it
  -- terminates after one hop.
  if new.is_primary then
    update public.locations
       set is_primary = false, updated_at = now()
     where facility_id = new.facility_id
       and id <> new.id
       and is_primary;
    return new;
  end if;

  -- Demoting the last primary would leave the facility with no default, which
  -- `facilityContext` cannot resolve. Promote another one first.
  if tg_op = 'UPDATE'
     and old.is_primary
     and not exists (
       select 1 from public.locations l
        where l.facility_id = new.facility_id
          and l.id <> new.id
          and l.is_primary
     )
  then
    raise exception using
      errcode = 'restrict_violation',
      message = 'A facility must have a primary location.',
      hint = 'Make another location primary; the current one is demoted automatically.';
  end if;

  return new;
end;
$$;

revoke execute on function private.locations_single_primary() from public, anon;

drop trigger if exists locations_single_primary on public.locations;
create trigger locations_single_primary
  before insert or update of is_primary on public.locations
  for each row execute function private.locations_single_primary();

-- ── A branch that has traded is not deleted ───────────────────────────────

create or replace function private.guard_location_delete()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_bookings bigint;
begin
  -- The facility itself is going. Everything below is about protecting history
  -- that is being removed anyway, so stand aside — the same carve-out the
  -- roster audit triggers make (20260824200000).
  if not exists (select 1 from public.facilities f where f.id = old.facility_id) then
    return old;
  end if;

  select count(*) into v_bookings
    from public.bookings b
   where b.location_id = old.id;

  if v_bookings > 0 then
    raise exception using
      errcode = 'restrict_violation',
      message = format(
        'This location has %s booking(s) recorded against it and cannot be deleted.',
        v_bookings
      ),
      hint = 'Set its status to inactive. The branch stops taking work and its history stays readable.';
  end if;

  if old.is_primary
     and exists (
       select 1 from public.locations l
        where l.facility_id = old.facility_id
          and l.id <> old.id
     )
  then
    raise exception using
      errcode = 'restrict_violation',
      message = 'The primary location cannot be deleted while other locations exist.',
      hint = 'Make another location primary first.';
  end if;

  return old;
end;
$$;

revoke execute on function private.guard_location_delete() from public, anon;

drop trigger if exists locations_guard_delete on public.locations;
create trigger locations_guard_delete
  before delete on public.locations
  for each row execute function private.guard_location_delete();

-- ── Backfill: the branch that already exists is the business itself ───────
--
-- Every one of the three live rows is its facility's only location, so its
-- address IS the facility's address. Leaving them null would show every
-- existing customer a blank branch card on the day this ships.

update public.locations l
   set address = coalesce(l.address, f.address),
       phone   = coalesce(l.phone, f.phone),
       email   = coalesce(l.email, f.email),
       updated_at = now()
  from public.facilities f
 where f.id = l.facility_id
   and (l.address is null or l.phone is null or l.email is null);

-- ── Assert, rather than trust that the statements ran ─────────────────────
--
-- A revoke naming a privilege the role does not hold succeeds silently and
-- looks identical to one that worked. See the two revoke entries in the debt
-- map; this file is not going to be the sixth occurrence.

do $$
declare
  v_missing text;
begin
  select string_agg(c.column_name, ', ')
    into v_missing
    from (values ('short_code'), ('address'), ('email'), ('phone'),
                 ('status'), ('capacity'), ('color')) as c(column_name)
   where not exists (
     select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'locations'
        and column_name = c.column_name
   );
  if v_missing is not null then
    raise exception 'locations is missing columns: %', v_missing;
  end if;

  if has_function_privilege('anon', 'private.locations_single_primary()', 'execute')
     or has_function_privilege('anon', 'private.guard_location_delete()', 'execute')
  then
    raise exception 'anon can still execute a location guard';
  end if;

  if exists (
    select 1 from public.locations
     group by facility_id
    having count(*) filter (where is_primary) <> 1
  ) then
    raise exception 'a facility does not have exactly one primary location';
  end if;
end;
$$;
