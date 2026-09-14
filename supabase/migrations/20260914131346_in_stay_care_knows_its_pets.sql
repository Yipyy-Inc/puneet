-- ============================================================================
-- An in-stay care item carries the incident's pets.
--
-- Daily Care is where care is given, and the caretaker giving it holds
-- view_pet_records — which reads a care item but not the incident behind it
-- (incidents stay behind ops_incidents_view). So the board cannot learn WHICH
-- pet an item is for by joining the incident. The pets are copied onto the
-- item when it is made, by the same guard that copies the facility, and never
-- change after.
--
-- Tested by supabase/tests/incidents.sql, I11.
-- ============================================================================

alter table public.incident_care_items
  add column if not exists pet_ids uuid[] not null default '{}';

create index if not exists incident_care_items_pets_idx
  on public.incident_care_items using gin (pet_ids);

create or replace function private.incident_care_item_guard()
returns trigger
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  v_facility uuid;
  v_pets uuid[];
  v_locked timestamptz;
begin
  select facility_id, pet_ids, in_stay_care_locked_at
    into v_facility, v_pets, v_locked
    from public.incidents where id = new.incident_id;
  if v_facility is null then
    raise exception 'No such incident.' using errcode = '23503';
  end if;
  if v_locked is not null then
    raise exception 'In-stay care was locked at checkout.' using errcode = '22023';
  end if;
  if tg_op = 'INSERT' then
    new.facility_id := v_facility;
    new.pet_ids := coalesce(v_pets, '{}');
    new.created_at := now();
  else
    new.facility_id := old.facility_id;
    new.incident_id := old.incident_id;
    new.pet_ids := old.pet_ids;
    new.kind := old.kind;
    new.created_by := old.created_by;
    new.created_by_name := old.created_by_name;
    new.created_at := old.created_at;
  end if;
  new.updated_at := now();
  return new;
end;
$fn$;

revoke all on function private.incident_care_item_guard() from public;
revoke all on function private.incident_care_item_guard() from anon;

-- Any item made before this migration takes its incident's pets.
alter table public.incident_care_items disable trigger incident_care_items_guard;
update public.incident_care_items i
   set pet_ids = inc.pet_ids
  from public.incidents inc
 where inc.id = i.incident_id and i.pet_ids = '{}';
alter table public.incident_care_items enable trigger incident_care_items_guard;

do $check$
begin
  if has_function_privilege('anon', 'private.incident_care_item_guard()', 'execute') then
    raise exception 'anon can execute the in-stay care guard';
  end if;
end $check$;
