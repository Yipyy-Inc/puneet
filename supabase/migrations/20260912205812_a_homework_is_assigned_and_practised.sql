-- ============================================================================
-- Training homework is a row, and so is each day it was practised.
--
-- ── WHAT IT REPLACES ──────────────────────────────────────────────────────
--
-- Every homework screen — the trainer's Homework board, the Homework tab on a
-- student's profile, "Assign homework" there and after a session, and the
-- owner's Homework tab and My Pets checklist — read `trainingHomeworkRecords`,
-- a fixture in src/data/training-history.ts, and wrote with
-- `fanOutHomeworkUpsert`, which edits the query cache. Homework assigned to a
-- real dog was gone on reload, "Mark as done" in the owner's portal told the
-- trainer nothing, and a real pet whose ref matched a fixture pet showed that
-- pet's homework.
--
-- ── TWO TABLES ────────────────────────────────────────────────────────────
--
--   training_homework           what the trainer assigned, on one enrollment
--   training_homework_practice  one row per day it was practised, logged by
--                               the owner or by staff, carrying the trainer's
--                               response to that day
--
-- A practice log in a jsonb column would let an owner's "done" and a
-- trainer's response overwrite each other. A row each cannot.
--
-- ── WHO MAY DO WHAT ───────────────────────────────────────────────────────
--
--   read     view_pet_records, or the pet's OWNER — homework is written for
--            them, so there is no private homework
--   assign, edit, complete, delete, respond
--            training_log_progress, as training notes and progress use
--   log a practice
--            public.log_homework_practice(): staff with training_log_progress,
--            or the homework's owner. Nobody holds INSERT on the practice
--            table, so the function is the only way in, and it is what moves
--            next_due_date forward.
--
-- The facility, pet and owner come from the ENROLLMENT, by trigger, never from
-- the caller, and none of them moves after insert.
-- ============================================================================

create table if not exists public.training_homework (
  id             uuid primary key default gen_random_uuid(),
  facility_id    uuid not null references public.facilities(id) on delete cascade,
  enrollment_id  uuid not null references public.training_series_enrollments(id) on delete cascade,
  pet_id         uuid not null references public.pets(id) on delete cascade,
  client_id      uuid not null references public.clients(id) on delete cascade,

  session_number integer not null default 1 check (session_number between 1 and 1000),
  session_date   date,
  title          text not null check (length(btrim(title)) between 1 and 200),
  description    text not null default '' check (length(description) <= 5000),
  instructions   text[] not null default '{}' check (cardinality(instructions) <= 50),
  resources      text[] not null default '{}' check (cardinality(resources) <= 20),
  frequency      text check (frequency is null or length(btrim(frequency)) between 1 and 120),
  next_due_date  date,
  completed_at   timestamptz,

  author_name    text,
  created_by     text default (auth.jwt()->>'sub'),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

comment on table public.training_homework is
  'Homework a trainer assigned on a training enrollment. facility_id, pet_id and client_id come from the enrollment by trigger. Replaces the trainingHomeworkRecords fixture (2026-09-12).';

create index if not exists training_homework_facility_idx
  on public.training_homework (facility_id, created_at desc);
create index if not exists training_homework_enrollment_idx
  on public.training_homework (enrollment_id);
create index if not exists training_homework_client_idx
  on public.training_homework (client_id);

create table if not exists public.training_homework_practice (
  id                   uuid primary key default gen_random_uuid(),
  homework_id          uuid not null references public.training_homework(id) on delete cascade,
  facility_id          uuid not null references public.facilities(id) on delete cascade,
  client_id            uuid not null references public.clients(id) on delete cascade,
  practice_date        date not null,
  logged_by            text not null check (logged_by in ('owner', 'staff')),
  marked_at            timestamptz not null default now(),
  trainer_response     text check (
    trainer_response is null or length(btrim(trainer_response)) between 1 and 2000
  ),
  trainer_responded_at timestamptz,
  trainer_responded_by text,
  constraint training_homework_practice_once_a_day unique (homework_id, practice_date),
  constraint training_homework_practice_response_is_dated check (
    (trainer_response is null) = (trainer_responded_at is null)
  )
);

comment on table public.training_homework_practice is
  'One day a piece of homework was practised, logged by its owner or by staff through log_homework_practice(), with the trainer''s response to that day.';

create index if not exists training_homework_practice_homework_idx
  on public.training_homework_practice (homework_id, practice_date desc);

-- ── The facility, pet and owner come from the enrollment ──────────────────

create or replace function private.training_homework_from_enrollment()
returns trigger
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  v_facility uuid;
  v_pet      uuid;
  v_client   uuid;
begin
  if tg_op = 'INSERT' then
    select e.facility_id, e.pet_id, e.client_id
      into v_facility, v_pet, v_client
      from public.training_series_enrollments e
     where e.id = new.enrollment_id;
    if v_facility is null then
      raise exception 'training_homework: no such enrollment' using errcode = '23503';
    end if;
    new.facility_id := v_facility;
    new.pet_id := v_pet;
    new.client_id := v_client;
  else
    -- None of the four moves after insert.
    new.enrollment_id := old.enrollment_id;
    new.facility_id := old.facility_id;
    new.pet_id := old.pet_id;
    new.client_id := old.client_id;
  end if;
  new.updated_at := now();
  return new;
end;
$fn$;

revoke all on function private.training_homework_from_enrollment() from public;
revoke all on function private.training_homework_from_enrollment() from anon;

drop trigger if exists training_homework_from_enrollment on public.training_homework;
create trigger training_homework_from_enrollment
  before insert or update on public.training_homework
  for each row execute function private.training_homework_from_enrollment();

create or replace function private.training_homework_practice_from_homework()
returns trigger
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  v_facility uuid;
  v_client   uuid;
begin
  if tg_op = 'INSERT' then
    select h.facility_id, h.client_id
      into v_facility, v_client
      from public.training_homework h
     where h.id = new.homework_id;
    if v_facility is null then
      raise exception 'training_homework_practice: no such homework' using errcode = '23503';
    end if;
    new.facility_id := v_facility;
    new.client_id := v_client;
  else
    -- Only the trainer's response changes: the day, and who logged it, stay.
    new.homework_id := old.homework_id;
    new.facility_id := old.facility_id;
    new.client_id := old.client_id;
    new.practice_date := old.practice_date;
    new.logged_by := old.logged_by;
    new.marked_at := old.marked_at;
  end if;
  return new;
end;
$fn$;

revoke all on function private.training_homework_practice_from_homework() from public;
revoke all on function private.training_homework_practice_from_homework() from anon;

drop trigger if exists training_homework_practice_from_homework on public.training_homework_practice;
create trigger training_homework_practice_from_homework
  before insert or update on public.training_homework_practice
  for each row execute function private.training_homework_practice_from_homework();

-- ── Logging a practice ────────────────────────────────────────────────────

-- The cadence `bumpNextDueDate` in src/lib/training-homework.ts applies: a
-- daily exercise is due the next day, three times a week in two days,
-- anything else in a week. Kept in step with it on purpose — the Homework
-- board's Overdue badge reads the date this writes.
create or replace function private.homework_next_due(p_frequency text, p_from date)
returns date
language sql
immutable
set search_path = ''
as $fn$
  select p_from + case
    when lower(coalesce(p_frequency, '')) ~ '(daily|every day|each day|every walk)' then 1
    when lower(coalesce(p_frequency, '')) ~ '(3x.*week|three times.*week)' then 2
    else 7
  end;
$fn$;

revoke all on function private.homework_next_due(text, date) from public;
revoke all on function private.homework_next_due(text, date) from anon;

create or replace function public.log_homework_practice(
  p_homework_id   uuid,
  p_practice_date date
)
returns public.training_homework_practice
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  v_homework public.training_homework;
  v_by       text;
  v_row      public.training_homework_practice;
begin
  select * into v_homework
    from public.training_homework
   where id = p_homework_id;

  -- One refusal for "no such homework" and "not yours", so the answer does
  -- not tell a stranger which homework exists.
  if v_homework.id is null then
    raise exception 'That homework is not yours to log.' using errcode = '42501';
  end if;
  if private.has_permission(v_homework.facility_id, 'training_log_progress') then
    v_by := 'staff';
  elsif v_homework.client_id in (select private.own_client_ids()) then
    v_by := 'owner';
  else
    raise exception 'That homework is not yours to log.' using errcode = '42501';
  end if;

  if v_homework.completed_at is not null then
    raise exception 'That homework is already complete.' using errcode = '22023';
  end if;
  -- A facility's "today" is never later than UTC's tomorrow, so anything past
  -- that is a day that has not happened.
  if p_practice_date is null
     or p_practice_date > (now() at time zone 'utc')::date + 1 then
    raise exception 'Practice is logged for today or a day already past.' using errcode = '22023';
  end if;

  insert into public.training_homework_practice
    (homework_id, facility_id, client_id, practice_date, logged_by)
  values
    (v_homework.id, v_homework.facility_id, v_homework.client_id, p_practice_date, v_by)
  on conflict (homework_id, practice_date) do nothing
  returning * into v_row;

  if v_row.id is null then
    -- Already logged for that day: the same row back, and the due date stays.
    select * into v_row
      from public.training_homework_practice
     where homework_id = v_homework.id
       and practice_date = p_practice_date;
  else
    update public.training_homework
       set next_due_date = private.homework_next_due(v_homework.frequency, p_practice_date)
     where id = v_homework.id;
  end if;

  return v_row;
end;
$fn$;

comment on function public.log_homework_practice(uuid, date) is
  'Log one day of practice on a piece of homework — by staff with training_log_progress or by its owner — and move its next due date. Idempotent per day.';

revoke all on function public.log_homework_practice(uuid, date) from public;
revoke all on function public.log_homework_practice(uuid, date) from anon;
grant execute on function public.log_homework_practice(uuid, date) to authenticated;

-- ── RLS ───────────────────────────────────────────────────────────────────

alter table public.training_homework enable row level security;
alter table public.training_homework_practice enable row level security;

-- Revoked from both before granting: the schema's default privileges would
-- otherwise leave authenticated holding INSERT on the practice table.
revoke all on public.training_homework from anon;
revoke all on public.training_homework from authenticated;
revoke all on public.training_homework_practice from anon;
revoke all on public.training_homework_practice from authenticated;
grant select, insert, update, delete on public.training_homework to authenticated;
grant select, update, delete on public.training_homework_practice to authenticated;
grant all on public.training_homework to service_role;
grant all on public.training_homework_practice to service_role;

drop policy if exists training_homework_read on public.training_homework;
create policy training_homework_read on public.training_homework
  for select using (
    private.is_platform_admin()
    or private.has_permission(facility_id, 'view_pet_records')
    or client_id in (select private.own_client_ids())
  );

drop policy if exists training_homework_insert on public.training_homework;
create policy training_homework_insert on public.training_homework
  for insert with check (
    private.has_permission(facility_id, 'training_log_progress')
  );

drop policy if exists training_homework_update on public.training_homework;
create policy training_homework_update on public.training_homework
  for update
  using (private.has_permission(facility_id, 'training_log_progress'))
  with check (private.has_permission(facility_id, 'training_log_progress'));

drop policy if exists training_homework_delete on public.training_homework;
create policy training_homework_delete on public.training_homework
  for delete using (
    private.has_permission(facility_id, 'training_log_progress')
  );

drop policy if exists training_homework_practice_read on public.training_homework_practice;
create policy training_homework_practice_read on public.training_homework_practice
  for select using (
    private.is_platform_admin()
    or private.has_permission(facility_id, 'view_pet_records')
    or client_id in (select private.own_client_ids())
  );

drop policy if exists training_homework_practice_update on public.training_homework_practice;
create policy training_homework_practice_update on public.training_homework_practice
  for update
  using (private.has_permission(facility_id, 'training_log_progress'))
  with check (private.has_permission(facility_id, 'training_log_progress'));

drop policy if exists training_homework_practice_delete on public.training_homework_practice;
create policy training_homework_practice_delete on public.training_homework_practice
  for delete using (
    private.has_permission(facility_id, 'training_log_progress')
  );

-- ── A revoke is not verified by having been written ───────────────────────

do $check$
begin
  if has_table_privilege('anon', 'public.training_homework', 'select')
     or has_table_privilege('anon', 'public.training_homework_practice', 'select') then
    raise exception 'anon can still read training homework';
  end if;
  if has_table_privilege('authenticated', 'public.training_homework_practice', 'insert') then
    raise exception 'authenticated can insert a practice without log_homework_practice()';
  end if;
  if has_function_privilege('anon', 'public.log_homework_practice(uuid, date)', 'execute') then
    raise exception 'anon can execute log_homework_practice()';
  end if;
  if not has_function_privilege('authenticated', 'public.log_homework_practice(uuid, date)', 'execute') then
    raise exception 'authenticated cannot execute log_homework_practice()';
  end if;
  if has_function_privilege('anon', 'private.training_homework_from_enrollment()', 'execute')
     or has_function_privilege('anon', 'private.training_homework_practice_from_homework()', 'execute')
     or has_function_privilege('anon', 'private.homework_next_due(text, date)', 'execute') then
    raise exception 'anon can execute a training homework helper';
  end if;
end;
$check$;
