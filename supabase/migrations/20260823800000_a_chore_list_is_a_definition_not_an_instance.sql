-- ============================================================================
-- The chore library, and the groups that turn it into work.
--
-- ── WHAT THIS COMPLETES ───────────────────────────────────────────────────
--
-- 20260823600000 gave `facility_tasks` an INSTANCE: one thing one person has to
-- do, with a status and a due time. This is the DEFINITION half — the reusable
-- chore ("hose down run 3", 15 minutes, needs a photo) and the named sets that
-- say when it is owed: on the morning shift, or by everyone in Sanitation.
--
-- The two are separate tables on purpose. Editing "hose down run 3" to say 20
-- minutes must not reach back into a task somebody already finished at 15 —
-- the same rule the form versions and waiver signatures follow, arrived at from
-- the other direction. A generated task COPIES what the definition said; it
-- does not point at it.
--
-- ── NOT `task_templates`, WHICH ALREADY EXISTS AND IS DIFFERENT ───────────
--
-- `task_templates` (34 rows per facility, real since 20260810) is BOOKING
-- driven: when a boarding stay begins, create these. This is SHIFT driven:
-- every morning, regardless of who is staying. Two schedules, two tables. They
-- were nearly merged during this change on the strength of both being called
-- "templates", which would have made one screen quietly rewrite the other's
-- rows.
--
-- ── A SHIFT IS A STRING, A DEPARTMENT IS A KEY ────────────────────────────
--
-- `shift_key` is 'morning' | 'afternoon' | 'night' — a daypart, not a row.
-- `staff_shifts` holds ACTUAL shifts with real times, and a group is not tied
-- to one of those; it recurs across all of them. Inventing a `shifts` table to
-- hold three constants would be a foreign key that means nothing.
--
-- Departments are real rows and get a real key, cascading: a department that is
-- dissolved takes its task groups with it, because "the Sanitation team's daily
-- duties" is not a meaningful thing to keep once there is no Sanitation team.
-- Tasks ALREADY GENERATED from it survive — they name nobody's department.
-- ============================================================================

-- ── The library ───────────────────────────────────────────────────────────

create table if not exists public.facility_task_definitions (
  id uuid primary key default gen_random_uuid(),
  facility_id uuid not null
    references public.facilities(id) on delete cascade,

  title text not null check (btrim(title) <> ''),
  description text,
  category text not null default 'general',
  priority text not null default 'medium'
    check (priority in ('low', 'medium', 'high', 'urgent')),

  estimated_minutes integer
    check (estimated_minutes is null or estimated_minutes > 0),
  requires_photo boolean not null default false,
  requires_signoff boolean not null default false,

  -- Retired, not deleted: a definition that has generated work is part of the
  -- record of how the facility ran, and the groups that name it should not
  -- silently lose a line.
  is_active boolean not null default true,

  created_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.facility_task_definitions is
  'The reusable chore library. Shift-driven, unlike task_templates which is booking-driven.';

create index if not exists facility_task_definitions_facility_idx
  on public.facility_task_definitions (facility_id, is_active, title);

-- ── The groups ────────────────────────────────────────────────────────────

create table if not exists public.facility_task_groups (
  id uuid primary key default gen_random_uuid(),
  facility_id uuid not null
    references public.facilities(id) on delete cascade,

  name text not null check (btrim(name) <> ''),
  description text,

  scope text not null check (scope in ('shift', 'position')),

  -- A daypart, not a row. See the header.
  shift_key text check (shift_key in ('morning', 'afternoon', 'night')),
  department_id uuid references public.facility_departments(id) on delete cascade,

  -- 0=Sunday … 6=Saturday. Empty means every day, which is what the fixture
  -- meant by `daysOfWeek: []` and is worth keeping rather than making somebody
  -- tick seven boxes.
  days_of_week smallint[] not null default '{}',
  is_recurring boolean not null default true,
  specific_date date,

  is_active boolean not null default true,

  created_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- The scope decides which target column is meaningful, and the other must be
  -- empty. Without this a row can claim to be a shift group AND name a
  -- department, and every reader has to guess which half to believe.
  constraint facility_task_groups_scope_target check (
    (scope = 'shift'    and shift_key is not null and department_id is null)
    or
    (scope = 'position' and department_id is not null and shift_key is null)
  ),

  -- A one-off group has a date; a recurring one has days. Same reasoning.
  constraint facility_task_groups_when check (
    (is_recurring and specific_date is null)
    or (not is_recurring and specific_date is not null)
  )
);

comment on table public.facility_task_groups is
  'A named set of chores owed on a shift or by a department. Generates facility_tasks; does not hold them.';

create index if not exists facility_task_groups_facility_idx
  on public.facility_task_groups (facility_id, is_active, scope);

-- ── What is in a group ────────────────────────────────────────────────────

create table if not exists public.facility_task_group_items (
  group_id uuid not null
    references public.facility_task_groups(id) on delete cascade,
  definition_id uuid not null
    references public.facility_task_definitions(id) on delete restrict,
  sort_order integer not null default 0,
  primary key (group_id, definition_id)
);

comment on column public.facility_task_group_items.definition_id is
  'ON DELETE RESTRICT: a chore named by a group cannot vanish underneath it. Retire the definition instead.';

create index if not exists facility_task_group_items_definition_idx
  on public.facility_task_group_items (definition_id);

-- ── Turning a group into work ─────────────────────────────────────────────
--
-- The fixture had groups and never generated anything from them, so the two
-- tabs listed sets of chores nobody was ever asked to do. This is the step that
-- was missing.
--
-- IDEMPOTENT BY CONSTRUCTION. Each generated task carries
-- `source_ref = '<group id>:<date>:<definition id>'`, and
-- `facility_tasks_source_unique` refuses a second one — so running this twice
-- for the same day, from two browsers or from a scheduler that retries, creates
-- nothing the second time. That is the same index the call follow-ups use, and
-- the reason it was keyed on (facility, source, ref) rather than on a call id.
--
-- SECURITY INVOKER, deliberately. A definer here would bypass RLS entirely —
-- `force row level security` does not stop one, because the owner is a
-- superuser — and this function writes tasks. Running as the caller means
-- `facility_tasks_insert` and `facility_task_groups` RLS both still apply, so a
-- groomer calling it directly generates nothing they could not have created by
-- hand.

create or replace function public.generate_tasks_from_group(
  p_group_id uuid,
  p_for_date date default null,
  p_assign_to uuid default null
)
returns setof public.facility_tasks
language plpgsql
as $$
declare
  v_group   public.facility_task_groups;
  v_date    date;
  v_due     timestamptz;
  v_def     public.facility_task_definitions;
  v_ref     text;
begin
  -- RLS applies to this read, so a caller who cannot see the group gets the
  -- same answer as one naming an id that does not exist.
  select * into v_group from public.facility_task_groups where id = p_group_id;
  if not found then
    raise exception 'No such task group.' using errcode = '42501';
  end if;

  if not v_group.is_active then
    raise exception 'That task group is retired.' using errcode = '22023';
  end if;

  v_date := coalesce(p_for_date, current_date);

  -- A one-off group generates on its own date and no other.
  if not v_group.is_recurring and v_group.specific_date is distinct from v_date then
    raise exception 'That group only runs on %.', v_group.specific_date
      using errcode = '22023';
  end if;

  -- An empty `days_of_week` means every day.
  if v_group.is_recurring
     and array_length(v_group.days_of_week, 1) is not null
     and not (extract(dow from v_date)::smallint = any (v_group.days_of_week))
  then
    raise exception 'That group does not run on that day of the week.'
      using errcode = '22023';
  end if;

  -- The daypart decides when it is owed. Local to the facility's own date
  -- rather than to the caller's clock.
  v_due := case v_group.shift_key
             when 'morning'   then v_date + time '12:00'
             when 'afternoon' then v_date + time '17:00'
             when 'night'     then v_date + time '23:59'
             else v_date + time '23:59'
           end;

  for v_def in
    select d.*
      from public.facility_task_group_items i
      join public.facility_task_definitions d on d.id = i.definition_id
     where i.group_id = p_group_id
       and d.is_active
     order by i.sort_order, d.title
  loop
    v_ref := p_group_id::text || ':' || v_date::text || ':' || v_def.id::text;

    -- The definition's wording is COPIED, not referenced. Editing the chore
    -- tomorrow must not change what somebody was asked to do today.
    begin
      return query
        insert into public.facility_tasks (
          facility_id, title, description, category, priority,
          assigned_to, due_at, estimated_minutes,
          requires_photo, requires_signoff,
          source, source_ref
        ) values (
          v_group.facility_id, v_def.title, v_def.description,
          v_def.category, v_def.priority,
          p_assign_to, v_due, v_def.estimated_minutes,
          v_def.requires_photo, v_def.requires_signoff,
          'template', v_ref
        )
        returning *;
    exception when unique_violation then
      -- Already generated for this group, this date, this chore. Not an error:
      -- it is the idempotence working, and the caller wanted the day's tasks to
      -- exist rather than to be told who created them.
      null;
    end;
  end loop;

  return;
end;
$$;

comment on function public.generate_tasks_from_group(uuid, date, uuid) is
  'Creates today''s tasks for a group. Idempotent via facility_tasks_source_unique. SECURITY INVOKER so RLS still decides.';

-- ── Row-level security ────────────────────────────────────────────────────

alter table public.facility_task_definitions enable row level security;
alter table public.facility_task_groups      enable row level security;
alter table public.facility_task_group_items enable row level security;

-- Reading is wide: a caretaker has to be able to see what the morning shift
-- owes, and they hold no management permission. Writing is `ops_manage_tasks`,
-- because a chore list is an instruction to other people.
drop policy if exists facility_task_definitions_read on public.facility_task_definitions;
create policy facility_task_definitions_read on public.facility_task_definitions
  for select using (
    private.is_platform_admin()
    or facility_id in (select private.member_facility_ids())
  );

drop policy if exists facility_task_definitions_write on public.facility_task_definitions;
create policy facility_task_definitions_write on public.facility_task_definitions
  for all using (
    private.has_permission(facility_id, 'ops_manage_tasks')
  ) with check (
    private.has_permission(facility_id, 'ops_manage_tasks')
  );

drop policy if exists facility_task_groups_read on public.facility_task_groups;
create policy facility_task_groups_read on public.facility_task_groups
  for select using (
    private.is_platform_admin()
    or facility_id in (select private.member_facility_ids())
  );

drop policy if exists facility_task_groups_write on public.facility_task_groups;
create policy facility_task_groups_write on public.facility_task_groups
  for all using (
    private.has_permission(facility_id, 'ops_manage_tasks')
  ) with check (
    private.has_permission(facility_id, 'ops_manage_tasks')
  );

-- The join table carries no facility of its own, so both arms resolve it
-- through the group. Taking a `facility_id` column here instead would let a row
-- claim one facility while its group belongs to another.
drop policy if exists facility_task_group_items_read on public.facility_task_group_items;
create policy facility_task_group_items_read on public.facility_task_group_items
  for select using (
    exists (
      select 1 from public.facility_task_groups g
       where g.id = group_id
         and (
           private.is_platform_admin()
           or g.facility_id in (select private.member_facility_ids())
         )
    )
  );

drop policy if exists facility_task_group_items_write on public.facility_task_group_items;
create policy facility_task_group_items_write on public.facility_task_group_items
  for all using (
    exists (
      select 1 from public.facility_task_groups g
       where g.id = group_id
         and private.has_permission(g.facility_id, 'ops_manage_tasks')
    )
  ) with check (
    exists (
      select 1 from public.facility_task_groups g
       where g.id = group_id
         and private.has_permission(g.facility_id, 'ops_manage_tasks')
    )
  );

-- ── Privileges ────────────────────────────────────────────────────────────
--
-- Named one by one and then ASSERTED. A default privilege in this project hands
-- `authenticated` the full set on every new table, so leaving DELETE out of a
-- grant does not remove it — that was measured on `facility_tasks` and is the
-- reason these three are checked rather than trusted.
--
-- DELETE is granted here, unlike on `facility_tasks`: a chore list is a
-- configuration, not a record of work. Removing a group nobody has run is
-- housekeeping. `on delete restrict` on the join still stops a definition
-- disappearing from under a group.

grant select, insert, update, delete on public.facility_task_definitions to authenticated;
grant select, insert, update, delete on public.facility_task_groups      to authenticated;
grant select, insert, update, delete on public.facility_task_group_items to authenticated;

revoke all on public.facility_task_definitions from public, anon;
revoke all on public.facility_task_groups      from public, anon;
revoke all on public.facility_task_group_items from public, anon;

revoke execute on function public.generate_tasks_from_group(uuid, date, uuid) from public, anon;
grant  execute on function public.generate_tasks_from_group(uuid, date, uuid) to authenticated;

do $$
declare t text;
begin
  foreach t in array array[
    'public.facility_task_definitions',
    'public.facility_task_groups',
    'public.facility_task_group_items'
  ] loop
    if has_table_privilege('anon', t, 'select') then
      raise exception '% : anon can still read', t;
    end if;
  end loop;

  -- A revoke naming a privilege the role does not hold succeeds silently and
  -- looks identical to one that worked, so the assertion is the evidence.
  if has_function_privilege('anon', 'public.generate_tasks_from_group(uuid, date, uuid)', 'execute') then
    raise exception 'anon can still generate tasks';
  end if;
  if not has_function_privilege('authenticated', 'public.generate_tasks_from_group(uuid, date, uuid)', 'execute') then
    raise exception 'authenticated cannot generate tasks';
  end if;
end $$;
