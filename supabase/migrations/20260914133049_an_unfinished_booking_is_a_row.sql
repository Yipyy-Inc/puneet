-- ============================================================================
-- A booking a customer started and did not finish is a row.
--
-- The facility's Unfinished tab, the recovery sheet and the customer's
-- "Resume your booking" all read src/data/unfinished-bookings — invented
-- abandonments at facility 11, the same everywhere — and nothing recorded a
-- real one. Now the customer portal's booking form saves what was entered
-- when a customer leaves it partway, and the resume link reopens that draft.
--
-- Who:
--   the customer   saves, re-saves and dismisses their own; may mark it
--                  recovered (they came back and booked) and nothing else
--   staff          read with view_bookings; mark contacted or recovered and
--                  write notes with edit_bookings
-- The facility is the client's, set by trigger, never the request's.
--
-- Tested by supabase/tests/unfinished-bookings.sql, U1–U6.
-- ============================================================================

create table if not exists public.unfinished_bookings (
  id uuid primary key default gen_random_uuid(),
  facility_id uuid not null references public.facilities(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  service text check (service is null or length(service) <= 60),
  step text not null check (step in (
    'service_selection', 'pet_selection', 'date_and_details', 'add_ons',
    'forms', 'review', 'payment')),
  status text not null default 'abandoned'
    check (status in ('abandoned', 'contacted', 'recovered')),
  requested_start date,
  requested_end date,
  estimated_value numeric(10, 2) check (estimated_value is null or estimated_value >= 0),
  -- What the form held: the BookingModal preselection shape, owned by the app.
  draft jsonb not null default '{}'::jsonb
    check (jsonb_typeof(draft) = 'object' and pg_column_size(draft) <= 65536),
  -- Staff notes, oldest first: [{id, text, staffName, createdAt}].
  notes jsonb not null default '[]'::jsonb check (jsonb_typeof(notes) = 'array'),
  last_contacted_at timestamptz,
  recovered_at timestamptz,
  abandoned_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists unfinished_bookings_facility_idx
  on public.unfinished_bookings (facility_id, status, abandoned_at desc);
create index if not exists unfinished_bookings_client_idx
  on public.unfinished_bookings (client_id);

create or replace function private.unfinished_booking_guard()
returns trigger
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  v_facility uuid;
  v_staff boolean;
begin
  if tg_op = 'INSERT' then
    select facility_id into v_facility from public.clients where id = new.client_id;
    if v_facility is null then
      raise exception 'No such client.' using errcode = '23503';
    end if;
    new.facility_id := v_facility;
    new.status := 'abandoned';
    new.notes := '[]'::jsonb;
    new.last_contacted_at := null;
    new.recovered_at := null;
    new.abandoned_at := now();
    new.created_at := now();
    new.updated_at := now();
    return new;
  end if;

  new.id := old.id;
  new.facility_id := old.facility_id;
  new.client_id := old.client_id;
  new.created_at := old.created_at;

  v_staff := private.is_platform_admin()
    or private.has_permission(old.facility_id, 'edit_bookings');
  if not v_staff then
    -- A customer may re-save their draft or say they came back; the outreach
    -- record is the facility's.
    if new.status is distinct from old.status and new.status <> 'recovered' then
      raise exception 'Only the facility marks a booking as contacted.'
        using errcode = '42501';
    end if;
    new.notes := old.notes;
    new.last_contacted_at := old.last_contacted_at;
  end if;

  if new.status = 'recovered' and old.status <> 'recovered' then
    new.recovered_at := now();
  elsif new.status <> 'recovered' then
    new.recovered_at := null;
  end if;
  if new.status = 'contacted' and old.status <> 'contacted' then
    new.last_contacted_at := now();
  end if;
  new.updated_at := now();
  return new;
end;
$fn$;

drop trigger if exists unfinished_bookings_guard on public.unfinished_bookings;
create trigger unfinished_bookings_guard
  before insert or update on public.unfinished_bookings
  for each row execute function private.unfinished_booking_guard();

revoke all on function private.unfinished_booking_guard() from public;
revoke all on function private.unfinished_booking_guard() from anon;

alter table public.unfinished_bookings enable row level security;

drop policy if exists unfinished_bookings_read on public.unfinished_bookings;
create policy unfinished_bookings_read on public.unfinished_bookings
  for select using (
    private.is_platform_admin()
    or private.has_permission(facility_id, 'view_bookings')
    or client_id in (select private.own_client_ids())
  );

drop policy if exists unfinished_bookings_insert on public.unfinished_bookings;
create policy unfinished_bookings_insert on public.unfinished_bookings
  for insert with check (client_id in (select private.own_client_ids()));

drop policy if exists unfinished_bookings_update on public.unfinished_bookings;
create policy unfinished_bookings_update on public.unfinished_bookings
  for update using (
    private.has_permission(facility_id, 'edit_bookings')
    or client_id in (select private.own_client_ids())
  )
  with check (
    private.has_permission(facility_id, 'edit_bookings')
    or client_id in (select private.own_client_ids())
  );

drop policy if exists unfinished_bookings_delete on public.unfinished_bookings;
create policy unfinished_bookings_delete on public.unfinished_bookings
  for delete using (client_id in (select private.own_client_ids()));

revoke all on public.unfinished_bookings from public, anon;
revoke all on public.unfinished_bookings from authenticated;
grant select, insert, update, delete on public.unfinished_bookings to authenticated;
grant all on public.unfinished_bookings to service_role;

do $check$
begin
  if has_table_privilege('anon', 'public.unfinished_bookings', 'select')
     or has_table_privilege('anon', 'public.unfinished_bookings', 'insert') then
    raise exception 'anon can reach unfinished bookings';
  end if;
  if has_function_privilege('anon', 'private.unfinished_booking_guard()', 'execute') then
    raise exception 'anon can execute the unfinished booking guard';
  end if;
  if (select count(*) from pg_policies
        where schemaname = 'public' and tablename = 'unfinished_bookings') <> 4 then
    raise exception 'unfinished_bookings should carry exactly four policies';
  end if;
end $check$;
