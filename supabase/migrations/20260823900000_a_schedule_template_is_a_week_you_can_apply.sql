-- ============================================================================
-- A schedule template: the week a facility keeps re-typing.
--
-- ── WHAT THIS REPLACES ────────────────────────────────────────────────────
--
-- `scheduleTemplates` in `src/data/scheduling.ts` — an array the screen listed
-- and nothing applied. The roster itself is REAL (`staff_shifts`, six route
-- groups, publish, swaps, time-off, availability, clock), so the missing piece
-- was never storage. It was the step from "here is the shape of our week" to
-- "put it on the calendar", which nobody could take.
--
-- ── IT REUSES `recurrence_id` RATHER THAN INVENTING A KEY ─────────────────
--
-- `staff_shifts.recurrence_id` already means, in its own migration's words,
-- "every shift generated from one recurrence carries the same id, so 'delete
-- this series' is a where clause rather than a guess about which rows matched."
-- Applying a template IS generating a series. So an application row's id
-- becomes the `recurrence_id` of every shift it creates, and undoing a week is
-- one delete rather than a search for shifts that look like they came from
-- somewhere.
--
-- ── APPLYING IS IDEMPOTENT, BY A UNIQUE CONSTRAINT ────────────────────────
--
-- `schedule_template_applications` is unique on (template, week). Pressing
-- "apply" twice, from two browsers or from a retry, creates the week once. The
-- function returns the shifts it ACTUALLY created, so the screen can say
-- "already applied" rather than "created 34" — different facts.
--
-- ── AND IT COMPUTES IN THE FACILITY'S OWN TIMEZONE ────────────────────────
--
-- This is the part that has already gone wrong once here. A UTC window dropped
-- every night shift out of its own day, and that is recorded in the debt map.
-- A template says "Tuesday, 22:00" — which is 22:00 where the kennels are, not
-- 22:00 UTC. The function reads `locations.timezone` for the facility's primary
-- location and converts there.
--
-- Overnight shifts are ordinary here: an end time at or before the start time
-- means the shift ends the following day. A `check (end_time > start_time)`
-- would have refused every night shift in the business.
-- ============================================================================

-- ── The template ──────────────────────────────────────────────────────────

create table if not exists public.schedule_templates (
  id uuid primary key default gen_random_uuid(),
  facility_id uuid not null
    references public.facilities(id) on delete cascade,

  name text not null check (btrim(name) <> ''),
  description text,

  -- Optional. A template may cover one department or the whole facility; the
  -- SHIFTS carry their own department either way, because a week that spans
  -- two departments is a real thing a small facility writes.
  department_id uuid references public.facility_departments(id) on delete cascade,

  is_active boolean not null default true,

  created_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.schedule_templates is
  'The shape of a week. Applying one generates draft staff_shifts; it does not hold them.';

create index if not exists schedule_templates_facility_idx
  on public.schedule_templates (facility_id, is_active, name);

-- ── The shifts in it ──────────────────────────────────────────────────────

create table if not exists public.schedule_template_shifts (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null
    references public.schedule_templates(id) on delete cascade,

  -- 0=Sunday … 6=Saturday, matching `extract(dow …)` so the apply function
  -- does no arithmetic to line them up.
  day_of_week smallint not null check (day_of_week between 0 and 6),

  -- NULL is an OPEN SHIFT — a slot the roster has to fill. `staff_shifts`
  -- allows it for the same reason and the read policy already admits everyone
  -- to unassigned shifts, so an open template line stays open when applied.
  staff_id uuid references public.staff(id) on delete set null,

  department_id uuid not null
    references public.facility_departments(id) on delete cascade,
  position_id uuid not null
    references public.facility_positions(id) on delete restrict,

  start_time time not null,
  -- At or before `start_time` means it ends the NEXT DAY. A night shift is
  -- 22:00 to 06:00 and refusing that would refuse the night shift.
  end_time time not null,

  break_minutes integer not null default 0 check (break_minutes >= 0),
  slots integer not null default 1 check (slots >= 1),
  required_skills text[] not null default '{}',
  sort_order integer not null default 0,

  created_at timestamptz not null default now()
);

comment on column public.schedule_template_shifts.end_time is
  'At or before start_time means the shift ends the following day. Night shifts are ordinary.';

create index if not exists schedule_template_shifts_template_idx
  on public.schedule_template_shifts (template_id, day_of_week, start_time);

-- ── A week that has been applied ──────────────────────────────────────────

create table if not exists public.schedule_template_applications (
  -- This id becomes the `recurrence_id` of every shift the application makes.
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null
    references public.schedule_templates(id) on delete cascade,
  facility_id uuid not null
    references public.facilities(id) on delete cascade,

  -- The Sunday the week starts on, in the facility's own calendar.
  week_start date not null,

  applied_by text,
  created_at timestamptz not null default now(),

  -- THE IDEMPOTENCE. Pressing apply twice creates the week once.
  constraint schedule_template_applications_once unique (template_id, week_start)
);

comment on table public.schedule_template_applications is
  'One template, one week, once. Its id is the recurrence_id of the shifts it created, so undoing a week is one delete.';

create index if not exists schedule_template_applications_facility_idx
  on public.schedule_template_applications (facility_id, week_start desc);

-- ── Applying it ───────────────────────────────────────────────────────────
--
-- SECURITY INVOKER, deliberately. A definer would bypass RLS entirely — `force
-- row level security` does not stop one, because the owner is a superuser — and
-- this writes shifts. As the caller, `staff_shifts_insert` still asks for
-- `scheduling_create_shifts`, so a supervisor (who may edit shifts but not
-- create them) cannot create a week's worth through here either.

create or replace function public.apply_schedule_template(
  p_template_id uuid,
  p_week_start date
)
returns setof public.staff_shifts
language plpgsql
as $$
declare
  v_template    public.schedule_templates;
  v_application uuid;
  v_tz          text;
  v_line        public.schedule_template_shifts;
  v_day         date;
  v_starts      timestamptz;
  v_ends        timestamptz;
begin
  -- RLS applies to this read, so a caller who cannot see the template gets the
  -- same answer as one naming an id that does not exist.
  select * into v_template
    from public.schedule_templates where id = p_template_id;
  if not found then
    raise exception 'No such schedule template.' using errcode = '42501';
  end if;

  if not v_template.is_active then
    raise exception 'That template is retired.' using errcode = '22023';
  end if;

  -- THE FACILITY'S OWN CLOCK. A template says "Tuesday 22:00" and means 22:00
  -- where the kennels are. Reading this as UTC is what dropped every night
  -- shift out of its own day the last time.
  select l.timezone into v_tz
    from public.locations l
   where l.facility_id = v_template.facility_id
   order by l.is_primary desc
   limit 1;
  v_tz := coalesce(v_tz, 'UTC');

  begin
    insert into public.schedule_template_applications
      (template_id, facility_id, week_start, applied_by)
    values
      (p_template_id, v_template.facility_id, p_week_start,
       (select auth.jwt() ->> 'sub'))
    returning id into v_application;
  exception when unique_violation then
    -- Already applied for this week. Not an error: the caller wanted the week
    -- to exist, and it does.
    return;
  end;

  for v_line in
    select * from public.schedule_template_shifts
     where template_id = p_template_id
     order by day_of_week, start_time, sort_order
  loop
    v_day := p_week_start + v_line.day_of_week;

    v_starts := (v_day + v_line.start_time) at time zone v_tz;
    v_ends := (
      -- At or before the start means it finishes the next day.
      case when v_line.end_time > v_line.start_time
           then v_day + v_line.end_time
           else v_day + 1 + v_line.end_time
      end
    ) at time zone v_tz;

    return query
      insert into public.staff_shifts (
        facility_id, staff_id, department_id, position_id,
        starts_at, ends_at, break_minutes,
        status, recurrence_id, required_skills, slots
      ) values (
        v_template.facility_id, v_line.staff_id, v_line.department_id,
        v_line.position_id, v_starts, v_ends, v_line.break_minutes,
        -- DRAFT. Applying a template proposes a week; publishing it is a
        -- separate decision somebody makes, and `/api/scheduling/shifts/publish`
        -- already exists to make it.
        'draft', v_application, v_line.required_skills, v_line.slots
      )
      returning *;
  end loop;

  return;
end;
$$;

comment on function public.apply_schedule_template(uuid, date) is
  'Creates a week of DRAFT shifts from a template, in the facility''s timezone. Idempotent per (template, week). SECURITY INVOKER.';

-- ── Row-level security ────────────────────────────────────────────────────

alter table public.schedule_templates             enable row level security;
alter table public.schedule_template_shifts       enable row level security;
alter table public.schedule_template_applications enable row level security;

-- Reading is facility-wide: a member may see the shape of the week they work,
-- the same way `staff_shifts_read` admits them to unassigned shifts. Writing is
-- `scheduling_create_shifts` — owner, admin and manager — because a template is
-- a proposal about other people's hours.
drop policy if exists schedule_templates_read on public.schedule_templates;
create policy schedule_templates_read on public.schedule_templates
  for select using (
    private.is_platform_admin()
    or facility_id in (select private.member_facility_ids())
  );

drop policy if exists schedule_templates_write on public.schedule_templates;
create policy schedule_templates_write on public.schedule_templates
  for all using (
    private.has_permission(facility_id, 'scheduling_create_shifts')
  ) with check (
    private.has_permission(facility_id, 'scheduling_create_shifts')
  );

-- The lines carry no facility of their own, so both arms resolve it through the
-- template. A `facility_id` column here could disagree with its parent.
drop policy if exists schedule_template_shifts_read on public.schedule_template_shifts;
create policy schedule_template_shifts_read on public.schedule_template_shifts
  for select using (
    exists (
      select 1 from public.schedule_templates t
       where t.id = template_id
         and (
           private.is_platform_admin()
           or t.facility_id in (select private.member_facility_ids())
         )
    )
  );

drop policy if exists schedule_template_shifts_write on public.schedule_template_shifts;
create policy schedule_template_shifts_write on public.schedule_template_shifts
  for all using (
    exists (
      select 1 from public.schedule_templates t
       where t.id = template_id
         and private.has_permission(t.facility_id, 'scheduling_create_shifts')
    )
  ) with check (
    exists (
      select 1 from public.schedule_templates t
       where t.id = template_id
         and private.has_permission(t.facility_id, 'scheduling_create_shifts')
    )
  );

drop policy if exists schedule_template_applications_read on public.schedule_template_applications;
create policy schedule_template_applications_read on public.schedule_template_applications
  for select using (
    private.is_platform_admin()
    or facility_id in (select private.member_facility_ids())
  );

-- Insert is what the apply function does as the caller; delete is "undo this
-- week", which cascades nothing on its own — the shifts are removed separately
-- by `recurrence_id`, under `scheduling_edit_shifts`, so undoing cannot delete
-- shifts somebody has since edited without that permission.
drop policy if exists schedule_template_applications_write on public.schedule_template_applications;
create policy schedule_template_applications_write on public.schedule_template_applications
  for all using (
    private.has_permission(facility_id, 'scheduling_create_shifts')
  ) with check (
    private.has_permission(facility_id, 'scheduling_create_shifts')
  );

-- ── Privileges, named and then asserted ───────────────────────────────────
--
-- A default privilege in this project grants `authenticated` the full set on
-- every new table, so leaving something out of a grant does not remove it —
-- measured on `facility_tasks`, where DELETE was held after a grant that never
-- mentioned it. These are checked rather than trusted.

grant select, insert, update, delete on public.schedule_templates             to authenticated;
grant select, insert, update, delete on public.schedule_template_shifts       to authenticated;
grant select, insert, delete         on public.schedule_template_applications to authenticated;

revoke all on public.schedule_templates             from public, anon;
revoke all on public.schedule_template_shifts       from public, anon;
revoke all on public.schedule_template_applications from public, anon;

-- An application is a fact about what was done, not a thing to edit.
revoke update on public.schedule_template_applications from authenticated;

revoke execute on function public.apply_schedule_template(uuid, date) from public, anon;
grant  execute on function public.apply_schedule_template(uuid, date) to authenticated;

do $$
declare t text;
begin
  foreach t in array array[
    'public.schedule_templates',
    'public.schedule_template_shifts',
    'public.schedule_template_applications'
  ] loop
    if has_table_privilege('anon', t, 'select') then
      raise exception '% : anon can still read', t;
    end if;
  end loop;

  if has_table_privilege('authenticated', 'public.schedule_template_applications', 'update') then
    raise exception 'an application can still be edited';
  end if;
  if has_function_privilege('anon', 'public.apply_schedule_template(uuid, date)', 'execute') then
    raise exception 'anon can still apply a template';
  end if;
  if not has_function_privilege('authenticated', 'public.apply_schedule_template(uuid, date)', 'execute') then
    raise exception 'authenticated cannot apply a template';
  end if;
end $$;
