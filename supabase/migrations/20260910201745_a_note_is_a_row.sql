-- ============================================================================
-- A note is a row.
--
-- ── WHAT IT REPLACES ──────────────────────────────────────────────────────
--
-- Every note in the facility portal — on a pet, a client, a booking, an
-- incident — went through `useNotesForEntity`, which kept them in React state
-- seeded from the `@/data/tags-notes` FIXTURE and pushed new ones onto that
-- module array. "Note added" was true until the next reload. The booking
-- page's own Notes card was two hard-coded notes about a dog called Buddy,
-- shown on every booking.
--
-- ── THE SHAPE ─────────────────────────────────────────────────────────────
--
-- Polymorphic, like `facility_tag_assignments` (20260828134018), for the same
-- reason: one shared component attaches notes to five kinds of thing. So there
-- is no foreign key on `entity_id`, and the facility is not taken from the
-- caller — the trigger reads it off the entity itself, and a note about a
-- pet that does not exist is refused (23503).
--
-- Who may read and write follows the permission for what the note is ABOUT:
--
--   category         read               write
--   pet              view_pet_records   add_pet_notes
--   customer         view_clients       edit_clients
--   booking          view_bookings      edit_bookings
--   incident         ops_incidents_view log_incidents
--   internal_staff   view_staff         manage_staff
--
-- `visibility = 'shared_with_customer'` is stored but not yet read by any
-- customer path: a customer read policy is a separate decision, not a default.
-- ============================================================================

create table if not exists public.notes (
  id uuid primary key default gen_random_uuid(),
  facility_id uuid not null references public.facilities(id) on delete cascade,
  category text not null
    check (category in ('pet', 'customer', 'booking', 'incident', 'internal_staff')),
  sub_type text
    check (sub_type is null or sub_type in ('general', 'behavior', 'medical', 'feeding')),
  entity_id uuid not null,
  content text not null check (length(btrim(content)) between 1 and 5000),
  visibility text not null default 'internal'
    check (visibility in ('internal', 'shared_with_customer')),
  is_pinned boolean not null default false,
  edit_history jsonb not null default '[]'::jsonb
    check (jsonb_typeof(edit_history) = 'array'),
  created_by text default (auth.jwt()->>'sub'),
  created_by_name text,
  updated_by_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.notes is
  'Staff notes on a pet, client, booking, incident or staff member. entity_id is polymorphic and unkeyed; facility_id is asserted from the entity by trigger.';

create index if not exists notes_entity_idx
  on public.notes (facility_id, category, entity_id);

-- ── The facility comes from the entity, never from the caller ─────────────

create or replace function private.note_facility()
returns trigger
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  v_facility uuid;
begin
  v_facility := case new.category
    when 'pet'            then (select facility_id from public.pets      where id = new.entity_id)
    when 'customer'       then (select facility_id from public.clients   where id = new.entity_id)
    when 'booking'        then (select facility_id from public.bookings  where id = new.entity_id)
    when 'incident'       then (select facility_id from public.incidents where id = new.entity_id)
    when 'internal_staff' then (select facility_id from public.staff     where id = new.entity_id)
  end;
  if v_facility is null then
    raise exception 'That % does not exist.', new.category using errcode = '23503';
  end if;
  new.facility_id := v_facility;
  if tg_op = 'UPDATE' then
    new.updated_at := now();
  end if;
  return new;
end;
$fn$;

drop trigger if exists notes_set_facility on public.notes;
create trigger notes_set_facility
  before insert or update on public.notes
  for each row execute function private.note_facility();

-- ── The permission a note's category asks for ─────────────────────────────

create or replace function private.note_permission(p_category text, p_write boolean)
returns text
language sql
immutable
set search_path = ''
as $fn$
  select case p_category
    when 'pet'            then case when p_write then 'add_pet_notes' else 'view_pet_records' end
    when 'customer'       then case when p_write then 'edit_clients'  else 'view_clients' end
    when 'booking'        then case when p_write then 'edit_bookings' else 'view_bookings' end
    when 'incident'       then case when p_write then 'log_incidents' else 'ops_incidents_view' end
    when 'internal_staff' then case when p_write then 'manage_staff'  else 'view_staff' end
  end;
$fn$;

alter table public.notes enable row level security;

drop policy if exists notes_read on public.notes;
create policy notes_read on public.notes
  for select using (
    private.is_platform_admin()
    or private.has_permission(facility_id, private.note_permission(category, false))
  );

drop policy if exists notes_insert on public.notes;
create policy notes_insert on public.notes
  for insert with check (
    private.has_permission(facility_id, private.note_permission(category, true))
  );

drop policy if exists notes_update on public.notes;
create policy notes_update on public.notes
  for update using (
    private.has_permission(facility_id, private.note_permission(category, true))
  ) with check (
    private.has_permission(facility_id, private.note_permission(category, true))
  );

drop policy if exists notes_delete on public.notes;
create policy notes_delete on public.notes
  for delete using (
    private.has_permission(facility_id, private.note_permission(category, true))
  );

-- ── Privileges: authenticated only; public and anon are separate grants ────

grant select, insert, update, delete on public.notes to authenticated;
revoke all on public.notes from public, anon;

revoke all on function private.note_facility() from public, anon;
revoke all on function private.note_permission(text, boolean) from public, anon;
grant execute on function private.note_permission(text, boolean) to authenticated;

do $verify$
begin
  if has_table_privilege('anon', 'public.notes', 'select') then
    raise exception 'anon can read notes';
  end if;
  if has_function_privilege('anon', 'private.note_permission(text, boolean)', 'execute') then
    raise exception 'anon can execute note_permission';
  end if;
  if (select count(*) from pg_policies where schemaname = 'public' and tablename = 'notes') <> 4 then
    raise exception 'notes should carry exactly four policies';
  end if;
end $verify$;
