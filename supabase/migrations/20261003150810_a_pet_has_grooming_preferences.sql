-- ============================================================================
-- A pet has grooming preferences.
--
-- ── WHAT IT IS FOR ────────────────────────────────────────────────────────
--
-- The client's grooming mock of the booking page (2026-10-03) has a "Groom
-- preferences" card — Cut, Face, Ears, Shampoo, Behavior — and nothing stored
-- any of it: the nearest things were a groom's own intake (one visit) and the
-- pet's free-text notes. These are the PET's, carried from groom to groom, so
-- the next booking shows what the last groomer settled on. One row per pet,
-- edited from the booking page's card.
--
-- The behaviour line is what the header raises as an amber chip on a groom
-- ("Nervous with the dryer").
--
-- ── WHO MAY ────────────────────────────────────────────────────────────────
--
--   read    a platform admin, and staff who may view the facility's pet
--           records
--   write   staff who may edit pet records, or manage grooming styles
--
-- The row's facility is the pet's, set by trigger, so a write cannot place a
-- pet's preferences in another facility.
-- ============================================================================

create table if not exists public.pet_grooming_preferences (
  pet_id          uuid primary key references public.pets(id) on delete cascade,
  facility_id     uuid not null references public.facilities(id) on delete cascade,
  cut             text not null default '' check (length(cut) <= 200),
  face            text not null default '' check (length(face) <= 200),
  ears            text not null default '' check (length(ears) <= 200),
  shampoo         text not null default '' check (length(shampoo) <= 200),
  behavior        text not null default '' check (length(behavior) <= 500),
  updated_at      timestamptz not null default now(),
  updated_by      text default (auth.jwt() ->> 'sub'),
  updated_by_name text
);

comment on table public.pet_grooming_preferences is
  'How a pet is groomed — cut, face, ears, shampoo and behaviour — carried from groom to groom. One row per pet; its facility is the pet''s (trigger). Shown and edited on the booking page''s grooming card (2026-10-03).';

-- The facility is the pet's, and the row says when and by whom it changed —
-- the name from the session's own profile, as private.stamp_author() does,
-- never from the request.
create or replace function private.pet_grooming_preferences_stamp()
returns trigger
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  v_uid text := (select auth.jwt() ->> 'sub');
begin
  select p.facility_id into new.facility_id
    from public.pets p
   where p.id = new.pet_id;
  if new.facility_id is null then
    raise exception 'That pet does not exist.' using errcode = '23503';
  end if;
  new.updated_at := now();
  new.updated_by := v_uid;
  new.updated_by_name := (
    select coalesce(nullif(btrim(pr.full_name), ''), nullif(btrim(pr.email), ''))
      from public.profiles pr
     where pr.id = v_uid
  );
  return new;
end;
$fn$;

revoke all on function private.pet_grooming_preferences_stamp() from public;
revoke all on function private.pet_grooming_preferences_stamp() from anon;

drop trigger if exists pet_grooming_preferences_stamp on public.pet_grooming_preferences;
create trigger pet_grooming_preferences_stamp
  before insert or update on public.pet_grooming_preferences
  for each row execute function private.pet_grooming_preferences_stamp();

alter table public.pet_grooming_preferences enable row level security;

revoke all on public.pet_grooming_preferences from public;
revoke all on public.pet_grooming_preferences from anon;
revoke all on public.pet_grooming_preferences from authenticated;
grant select, insert, update on public.pet_grooming_preferences to authenticated;
grant all on public.pet_grooming_preferences to service_role;

drop policy if exists pet_grooming_preferences_read on public.pet_grooming_preferences;
create policy pet_grooming_preferences_read on public.pet_grooming_preferences
  for select to authenticated
  using (
    private.is_platform_admin()
    or private.has_permission(facility_id, 'view_pet_records')
  );

drop policy if exists pet_grooming_preferences_insert on public.pet_grooming_preferences;
create policy pet_grooming_preferences_insert on public.pet_grooming_preferences
  for insert to authenticated
  with check (
    private.has_permission(facility_id, 'edit_pet_records')
    or private.has_permission(facility_id, 'grooming_manage_styles')
  );

drop policy if exists pet_grooming_preferences_update on public.pet_grooming_preferences;
create policy pet_grooming_preferences_update on public.pet_grooming_preferences
  for update to authenticated
  using (
    private.has_permission(facility_id, 'edit_pet_records')
    or private.has_permission(facility_id, 'grooming_manage_styles')
  )
  with check (
    private.has_permission(facility_id, 'edit_pet_records')
    or private.has_permission(facility_id, 'grooming_manage_styles')
  );
