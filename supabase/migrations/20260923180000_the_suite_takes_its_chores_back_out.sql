-- ============================================================================
-- public.purge_e2e_task_groups() — the chores half of `bun run e2e:purge`.
--
-- ── WHY ───────────────────────────────────────────────────────────────────
--
-- There is one Postgres, and `facility-task-groups.spec.ts` cleans up by
-- RETIRING what it made — `is_active = false` — because that is the only thing
-- the API offers. Retiring keeps the SCREENS honest. It does nothing for the
-- table.
--
-- Measured 2026-09-23, before this ran for the first time:
--
--   facility_task_groups        896 rows,  896 of them '[e2e]%'
--   facility_task_definitions  1117 rows, 1117 of them '[e2e]%'
--   facility_task_group_items  1006 rows
--   facility_tasks             1369 rows, 1362 of them '[e2e]%'
--
-- Read those first two numbers again: there is no real row in either table.
-- Every chore and every group in the database is test debris, accumulated
-- since 2026-08-23.
--
-- It was not only untidy. `GET /api/task-groups` fetched all 896 with two
-- nested embeds, took 7.5-9s against them, sat on the statement timeout and
-- failed about half the time — and the screen rendered that failure as
-- "Groups 0" rather than as an error, because `data ?? []` cannot tell an
-- empty list from a broken request. The route was bounded to active groups on
-- 2026-09-23 (b6e04b99) and that IS the fix; this is the debris the fix was
-- needed for, and leaving it in place leaves the next unbounded read to find
-- it.
--
-- ── ORDER MATTERS, AND THAT IS THE WHOLE FUNCTION ─────────────────────────
--
-- `facility_task_group_items.group_id` is ON DELETE CASCADE, so a group takes
-- its own lines with it. `definition_id` is ON DELETE **RESTRICT**, deliberately
-- — 20260823800000 says why: "a chore named by a group cannot vanish underneath
-- it". So the groups must go before the chores, and a chore any SURVIVING group
-- still names must stay.
--
-- That last part is a `not exists` guard rather than a bare delete. A bare
-- delete would raise on the first still-referenced chore and take the whole
-- purge down with it, including the work that had already succeeded; the guard
-- leaves exactly those rows and the returned count says how many. It matters
-- for nothing today (every group is e2e) and it is the difference between a
-- function that is correct and one that has not been tested against a real
-- facility yet.
--
-- `facility_tasks` has NO foreign key to either table — a generated task
-- carries `source_ref = '<group id>:<date>:<definition id>'` as TEXT. So the
-- tasks neither block the delete nor follow it, and deleting the groups alone
-- would leave 1,362 rows pointing at nothing. They go first, by the same
-- marker.
--
-- ── THREE COUNTS, NOT ONE ─────────────────────────────────────────────────
--
-- Its three siblings return a single integer because they have one thing to
-- say. This has three, and collapsing them would hide the only interesting
-- case — chores left behind because a real group still names them.
--
-- ── THE SAFETY IS IN HERE, NOT IN THE CALLER ──────────────────────────────
--
-- Like the other three, this takes no argument: the pattern cannot be passed
-- in and so cannot be got wrong, and nothing in `src/` calls it. `[e2e]` is the
-- marker `fresh()` puts at the FRONT of every name and title, which is why the
-- match is anchored rather than `%[e2e]%`. No facility is named, deliberately
-- — CI and a developer's machine run against different ones, and the marker is
-- what identifies the row.
-- ============================================================================

create or replace function public.purge_e2e_task_groups()
returns table (tasks integer, groups integer, definitions integer)
language plpgsql
security definer
set search_path to ''
as $function$
begin
  -- No foreign key binds these to anything, so they are neither a blocker nor
  -- a cascade. Deleted first only so the count reads in dependency order.
  delete from public.facility_tasks t where t.title like '[e2e]%';
  get diagnostics tasks = row_count;

  -- Their items cascade from here.
  delete from public.facility_task_groups g where g.name like '[e2e]%';
  get diagnostics groups = row_count;

  -- Only the chores nothing names any more. A chore a surviving group still
  -- uses stays, and the count is how you find out.
  delete from public.facility_task_definitions d
   where d.title like '[e2e]%'
     and not exists (
       select 1 from public.facility_task_group_items i
        where i.definition_id = d.id
     );
  get diagnostics definitions = row_count;

  return next;
end;
$function$;

-- `revoke from public` and `revoke from anon` are different grants; a function
-- is reachable through either, so both are named. The revoke is asserted
-- against has_function_privilege() in supabase/tests/purge-e2e-task-groups.sql
-- rather than trusted for having been written — see 20260822610000, which
-- exists only because a first attempt named one of them.
revoke execute on function public.purge_e2e_task_groups() from public;
revoke execute on function public.purge_e2e_task_groups() from anon;
revoke execute on function public.purge_e2e_task_groups() from authenticated;
grant execute on function public.purge_e2e_task_groups() to service_role;

comment on function public.purge_e2e_task_groups() is
  'Deletes facility tasks, task groups and unreferenced task definitions named [e2e]%. Service role only; called by bun run e2e:purge.';
