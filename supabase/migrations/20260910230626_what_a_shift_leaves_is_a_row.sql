-- ============================================================================
-- What a shift leaves for the next one is a row.
--
-- ── WHAT IT REPLACES ──────────────────────────────────────────────────────
--
-- The Daily Care board's guests and its care log have been Postgres for a
-- while. Three things on the same board were module-level Maps keyed by a
-- hard-coded facility id of 11, living in one browser tab:
--
--   shift_note   "Shift note saved for the next shift." — the next shift is
--                on another device, and never saw it
--   pet_flag     "Biscuit flagged for attention — manager notified." — no
--                manager was notified, and the flag was gone on reload
--   head_count   "Confirmed 12/12 dogs inside. Head count complete." — the
--                safety record of who was counted, and who could not be
--                found, did not outlive the tab
--
-- ── THE SHAPE ─────────────────────────────────────────────────────────────
--
-- One table, three kinds, because all three are the same fact: on this day,
-- at this facility, somebody on the floor wrote this down about this subject.
-- `subject` is what it is about — a guest (the booking ref the board keys
-- guests by), a head-count step, or nothing for a shift note. A pet flag and
-- a head count are ONE per subject per day (a second flag is the same flag);
-- a shift note is one of many.
--
-- ── WHO ───────────────────────────────────────────────────────────────────
--
-- Anyone who reads the board — view_pet_records, the care log's own read —
-- may write on it. These are floor acts: the caretaker who counted the dogs
-- records the count.
-- ============================================================================

create table if not exists public.daily_care_records (
  id uuid primary key default gen_random_uuid(),
  facility_id uuid not null references public.facilities(id) on delete cascade,
  occurred_on date not null,
  kind text not null check (kind in ('shift_note', 'pet_flag', 'head_count')),
  subject text not null default '',
  payload jsonb not null default '{}'::jsonb check (jsonb_typeof(payload) = 'object'),
  created_by text default (auth.jwt()->>'sub'),
  created_by_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint daily_care_records_subject_needed
    check (kind = 'shift_note' or subject <> '')
);

comment on table public.daily_care_records is
  'Daily Care floor records: shift-handoff notes, pet attention flags and head counts, per facility per day.';

-- One flag and one head count per subject per day; shift notes are many.
create unique index if not exists daily_care_records_one_per_subject
  on public.daily_care_records (facility_id, occurred_on, kind, subject)
  where kind in ('pet_flag', 'head_count');

create index if not exists daily_care_records_day_idx
  on public.daily_care_records (facility_id, occurred_on);

create or replace function private.daily_care_record_touch()
returns trigger
language plpgsql
set search_path = ''
as $fn$
begin
  new.updated_at := now();
  new.created_by := old.created_by;
  new.facility_id := old.facility_id;
  new.kind := old.kind;
  return new;
end;
$fn$;

drop trigger if exists daily_care_records_touch on public.daily_care_records;
create trigger daily_care_records_touch
  before update on public.daily_care_records
  for each row execute function private.daily_care_record_touch();

alter table public.daily_care_records enable row level security;

drop policy if exists daily_care_records_read on public.daily_care_records;
create policy daily_care_records_read on public.daily_care_records
  for select using (
    private.is_platform_admin()
    or private.has_permission(facility_id, 'view_pet_records')
  );

drop policy if exists daily_care_records_insert on public.daily_care_records;
create policy daily_care_records_insert on public.daily_care_records
  for insert with check (private.has_permission(facility_id, 'view_pet_records'));

drop policy if exists daily_care_records_update on public.daily_care_records;
create policy daily_care_records_update on public.daily_care_records
  for update using (private.has_permission(facility_id, 'view_pet_records'))
  with check (private.has_permission(facility_id, 'view_pet_records'));

-- Only a flag comes down: it is a toggle. A note and a count are records.
drop policy if exists daily_care_records_delete on public.daily_care_records;
create policy daily_care_records_delete on public.daily_care_records
  for delete using (
    kind = 'pet_flag'
    and private.has_permission(facility_id, 'view_pet_records')
  );

revoke all on public.daily_care_records from public, anon;
grant select, insert, update, delete on public.daily_care_records to authenticated;
revoke all on function private.daily_care_record_touch() from public, anon;

do $verify$
begin
  if has_table_privilege('anon', 'public.daily_care_records', 'select') then
    raise exception 'anon can read daily care records';
  end if;
  if (select count(*) from pg_policies
        where schemaname = 'public' and tablename = 'daily_care_records') <> 4 then
    raise exception 'daily_care_records should carry exactly four policies';
  end if;
end $verify$;
