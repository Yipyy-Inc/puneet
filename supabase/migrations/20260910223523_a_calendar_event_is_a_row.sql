-- ============================================================================
-- A calendar event is a row.
--
-- ── WHAT IT REPLACES ──────────────────────────────────────────────────────
--
-- The facility calendar's own events — a staff meeting, a holiday closure,
-- "block 2–4pm, the groomer is at the vet" — lived in localStorage under a key
-- with a hard-coded facility id of 11. Created on the front desk, they were
-- invisible to the groomer's tablet, gone when the browser was cleared, and
-- "Event deleted (recoverable for 30 days)" was a promise one browser kept.
--
-- ── THE SHAPE ─────────────────────────────────────────────────────────────
--
-- The columns are what the database has to reason about: which facility, a
-- kind (event or block time), when, who may see it, and whether it was
-- deleted. The event's own detail — recurrence, reminder, colour, affected
-- resource, linked pet — rides in `event`, exactly the shape the calendar
-- already draws, because nothing here queries into it.
--
-- ── WHO ───────────────────────────────────────────────────────────────────
--
--   read     any member of the facility — a closure is for everybody —
--            except an event marked private, which only its author reads
--   write    manage_booking_calendar (reception and up)
--   delete   nobody: deleting is `deleted_at`, because the calendar offers
--            to recover a deleted event for 30 days
-- ============================================================================

create table if not exists public.calendar_events (
  id uuid primary key default gen_random_uuid(),
  facility_id uuid not null references public.facilities(id) on delete cascade,
  kind text not null check (kind in ('custom-event', 'block-time')),
  title text not null check (length(btrim(title)) between 1 and 200),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  all_day boolean not null default false,
  private_to text,
  event jsonb not null default '{}'::jsonb check (jsonb_typeof(event) = 'object'),
  deleted_at timestamptz,
  created_by text default (auth.jwt()->>'sub'),
  created_by_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint calendar_events_ends_after_it_starts check (ends_at >= starts_at)
);

comment on table public.calendar_events is
  'The facility calendar''s own events and block time. event holds the calendar''s full shape; deleted_at is a soft delete the calendar can recover.';

create index if not exists calendar_events_window_idx
  on public.calendar_events (facility_id, starts_at);

create or replace function private.calendar_event_touch()
returns trigger
language plpgsql
set search_path = ''
as $fn$
begin
  new.updated_at := now();
  -- The author and the facility are not the editor's to change.
  new.created_by := old.created_by;
  new.facility_id := old.facility_id;
  return new;
end;
$fn$;

drop trigger if exists calendar_events_touch on public.calendar_events;
create trigger calendar_events_touch
  before update on public.calendar_events
  for each row execute function private.calendar_event_touch();

alter table public.calendar_events enable row level security;

drop policy if exists calendar_events_read on public.calendar_events;
create policy calendar_events_read on public.calendar_events
  for select using (
    (
      private.is_platform_admin()
      or facility_id in (select private.member_facility_ids())
    )
    and (private_to is null or private_to = (auth.jwt()->>'sub'))
  );

drop policy if exists calendar_events_insert on public.calendar_events;
create policy calendar_events_insert on public.calendar_events
  for insert with check (
    private.has_permission(facility_id, 'manage_booking_calendar')
    and (private_to is null or private_to = (auth.jwt()->>'sub'))
  );

drop policy if exists calendar_events_update on public.calendar_events;
create policy calendar_events_update on public.calendar_events
  for update using (
    private.has_permission(facility_id, 'manage_booking_calendar')
    and (private_to is null or private_to = (auth.jwt()->>'sub'))
  ) with check (
    private.has_permission(facility_id, 'manage_booking_calendar')
    and (private_to is null or private_to = (auth.jwt()->>'sub'))
  );

revoke all on public.calendar_events from public, anon;
grant select, insert, update on public.calendar_events to authenticated;
-- Explicit: Supabase's default privileges hand authenticated the full set.
revoke delete on public.calendar_events from authenticated;
revoke all on function private.calendar_event_touch() from public, anon;

do $verify$
begin
  if has_table_privilege('anon', 'public.calendar_events', 'select') then
    raise exception 'anon can read calendar events';
  end if;
  if has_table_privilege('authenticated', 'public.calendar_events', 'delete') then
    raise exception 'a calendar event can be hard-deleted';
  end if;
  if (select count(*) from pg_policies
        where schemaname = 'public' and tablename = 'calendar_events') <> 3 then
    raise exception 'calendar_events should carry exactly three policies';
  end if;
end $verify$;
