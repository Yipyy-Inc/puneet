-- ============================================================================
-- In-stay care from an incident: what staff are to do for a hurt or unwell pet
-- while it is still here, and each time somebody did it.
--
-- The incident migration (20260829180000) left in-stay care, medications and
-- their logs "as their own future tables rather than a blob". These are those
-- tables. The screens read an empty fixture until now, so a care action added
-- on an incident was saved nowhere and Daily Care never showed it.
--
--   incident_care_items  one care action or medication on an incident
--   incident_care_logs   one administration of an item — append-only
--   incidents.in_stay_care_locked_at   set at checkout; items and logs refuse
--                                      writes after it
--
-- Who: adding or stopping an item is a management act (ops_incidents_manage,
-- as changing the incident is). Logging is a floor act — the caretaker who gave
-- the dose records it (view_pet_records, as Daily Care records are). Nobody
-- deletes either: they are the record of care given to an animal.
--
-- Tested by supabase/tests/incidents.sql, I7–I10.
-- ============================================================================

alter table public.incidents
  add column if not exists in_stay_care_locked_at timestamptz;

create table if not exists public.incident_care_items (
  id uuid primary key default gen_random_uuid(),
  facility_id uuid not null references public.facilities(id) on delete cascade,
  incident_id uuid not null references public.incidents(id) on delete cascade,
  kind text not null check (kind in ('action', 'medication')),
  name text not null check (btrim(name) <> '' and length(name) <= 200),
  detail jsonb not null default '{}'::jsonb check (jsonb_typeof(detail) = 'object'),
  active boolean not null default true,
  created_by text default (auth.jwt()->>'sub'),
  created_by_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists incident_care_items_incident_idx
  on public.incident_care_items (incident_id);

create table if not exists public.incident_care_logs (
  id uuid primary key default gen_random_uuid(),
  facility_id uuid not null references public.facilities(id) on delete cascade,
  incident_id uuid not null references public.incidents(id) on delete cascade,
  care_item_id uuid not null references public.incident_care_items(id) on delete restrict,
  note text check (note is null or length(note) <= 2000),
  -- A stored photo, never a browser's temporary blob: address only.
  photo_url text check (photo_url is null or photo_url ~ '^https://'),
  logged_by text default (auth.jwt()->>'sub'),
  logged_by_name text,
  logged_at timestamptz not null default now()
);

create index if not exists incident_care_logs_incident_idx
  on public.incident_care_logs (incident_id);
create index if not exists incident_care_logs_item_idx
  on public.incident_care_logs (care_item_id);

-- ── The facility comes from the incident, and a lock is a lock ────────────
-- DEFINER because a caretaker logging a dose may hold view_pet_records but not
-- ops_incidents_view, and would otherwise read no incident and be refused.
create or replace function private.incident_care_item_guard()
returns trigger
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  v_facility uuid;
  v_locked timestamptz;
begin
  select facility_id, in_stay_care_locked_at into v_facility, v_locked
    from public.incidents where id = new.incident_id;
  if v_facility is null then
    raise exception 'No such incident.' using errcode = '23503';
  end if;
  if v_locked is not null then
    raise exception 'In-stay care was locked at checkout.' using errcode = '22023';
  end if;
  if tg_op = 'INSERT' then
    new.facility_id := v_facility;
    new.created_at := now();
  else
    new.facility_id := old.facility_id;
    new.incident_id := old.incident_id;
    new.kind := old.kind;
    new.created_by := old.created_by;
    new.created_by_name := old.created_by_name;
    new.created_at := old.created_at;
  end if;
  new.updated_at := now();
  return new;
end;
$fn$;

drop trigger if exists incident_care_items_guard on public.incident_care_items;
create trigger incident_care_items_guard
  before insert or update on public.incident_care_items
  for each row execute function private.incident_care_item_guard();

create or replace function private.incident_care_log_guard()
returns trigger
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  v_item record;
  v_locked timestamptz;
begin
  select i.incident_id, i.facility_id, i.active into v_item
    from public.incident_care_items i where i.id = new.care_item_id;
  if v_item.incident_id is null then
    raise exception 'No such care item.' using errcode = '23503';
  end if;
  select in_stay_care_locked_at into v_locked
    from public.incidents where id = v_item.incident_id;
  if v_locked is not null then
    raise exception 'In-stay care was locked at checkout.' using errcode = '22023';
  end if;
  new.incident_id := v_item.incident_id;
  new.facility_id := v_item.facility_id;
  new.logged_at := now();
  return new;
end;
$fn$;

drop trigger if exists incident_care_logs_guard on public.incident_care_logs;
create trigger incident_care_logs_guard
  before insert on public.incident_care_logs
  for each row execute function private.incident_care_log_guard();

revoke all on function private.incident_care_item_guard() from public;
revoke all on function private.incident_care_item_guard() from anon;
revoke all on function private.incident_care_log_guard() from public;
revoke all on function private.incident_care_log_guard() from anon;

-- ── Row-level security ────────────────────────────────────────────────────
alter table public.incident_care_items enable row level security;
alter table public.incident_care_logs enable row level security;

drop policy if exists incident_care_items_read on public.incident_care_items;
create policy incident_care_items_read on public.incident_care_items
  for select using (
    private.is_platform_admin()
    or private.has_permission(facility_id, 'ops_incidents_view')
    or private.has_permission(facility_id, 'view_pet_records')
  );

drop policy if exists incident_care_items_insert on public.incident_care_items;
create policy incident_care_items_insert on public.incident_care_items
  for insert with check (private.has_permission(facility_id, 'ops_incidents_manage'));

drop policy if exists incident_care_items_update on public.incident_care_items;
create policy incident_care_items_update on public.incident_care_items
  for update using (private.has_permission(facility_id, 'ops_incidents_manage'))
  with check (private.has_permission(facility_id, 'ops_incidents_manage'));

drop policy if exists incident_care_logs_read on public.incident_care_logs;
create policy incident_care_logs_read on public.incident_care_logs
  for select using (
    private.is_platform_admin()
    or private.has_permission(facility_id, 'ops_incidents_view')
    or private.has_permission(facility_id, 'view_pet_records')
  );

drop policy if exists incident_care_logs_insert on public.incident_care_logs;
create policy incident_care_logs_insert on public.incident_care_logs
  for insert with check (
    private.has_permission(facility_id, 'view_pet_records')
    or private.has_permission(facility_id, 'ops_incidents_manage')
  );

revoke all on public.incident_care_items from public, anon;
revoke all on public.incident_care_logs from public, anon;
revoke all on public.incident_care_items from authenticated;
revoke all on public.incident_care_logs from authenticated;
grant select, insert, update on public.incident_care_items to authenticated;
grant select, insert on public.incident_care_logs to authenticated;
grant all on public.incident_care_items to service_role;
grant all on public.incident_care_logs to service_role;

-- ── A revoke is not verified by having been written ───────────────────────
do $check$
begin
  if has_table_privilege('anon', 'public.incident_care_items', 'select')
     or has_table_privilege('anon', 'public.incident_care_logs', 'select')
     or has_table_privilege('authenticated', 'public.incident_care_items', 'delete')
     or has_table_privilege('authenticated', 'public.incident_care_logs', 'delete')
     or has_table_privilege('authenticated', 'public.incident_care_logs', 'update') then
    raise exception 'in-stay care grants are wider than intended';
  end if;
  if has_function_privilege('anon', 'private.incident_care_item_guard()', 'execute')
     or has_function_privilege('anon', 'private.incident_care_log_guard()', 'execute') then
    raise exception 'anon can execute an in-stay care guard';
  end if;
end $check$;
