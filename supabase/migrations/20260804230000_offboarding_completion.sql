-- ============================================================================
-- offboarding_instances.completed_at maintains itself.
--
-- The column existed from 20260804180000 and NOTHING SET IT. In the mock store
-- that was the client's job: setOffboardingTaskComplete stamped the instance
-- when the last task was ticked (staff-onboarding.ts:1707). Moving the tasks
-- into Postgres left the derivation behind on the client, so an offboarding
-- could have every task complete and still read as in progress — which is what
-- "Offboarding complete" badges, the completion notification and any future
-- report all key off.
--
-- IT IS A TRIGGER, NOT ROUTE CODE, for the ordinary reason: `completed_at` is a
-- FACT ABOUT THE TASK ROWS, and anything that can write those rows must not be
-- able to leave it disagreeing with them. PostgREST is reachable without the
-- route, and a second writer (a bulk tool, a future employee-facing action, a
-- fix applied by hand) would otherwise each have to remember.
--
-- IT SETS AND IT CLEARS. Reopening a task un-completes the departure — the
-- alternative is a record that says "complete" while a required task sits
-- pending, which is worse than either state on its own.
--
-- AN EMPTY CHECKLIST IS NOT COMPLETE. `count(*) = 0` would make a departure
-- with no template read as finished the moment it started, and the empty state
-- the UI shows for that case ("this offboarding template has no tasks") says
-- the opposite. So completion requires at least one task.
--
-- The service-role carve-out that belongs in the write-integrity triggers is
-- deliberately ABSENT: this derives a value rather than enforcing a permission,
-- and a seed inserting task rows should get a correct `completed_at` too.
-- ============================================================================

create or replace function private.sync_offboarding_completion()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_instance uuid := coalesce(new.instance_id, old.instance_id);
  v_total    integer;
  v_done     integer;
begin
  select count(*), count(*) filter (where completed_at is not null)
    into v_total, v_done
    from public.offboarding_task_states
   where instance_id = v_instance;

  update public.offboarding_instances i
     set completed_at = case
           when v_total > 0 and v_done = v_total
             then coalesce(i.completed_at, now())   -- keep the FIRST completion
           else null
         end
   where i.id = v_instance
     -- Only write when the answer actually changes, so this does not churn
     -- updated_at on every unrelated task edit.
     and i.completed_at is distinct from (case
           when v_total > 0 and v_done = v_total
             then coalesce(i.completed_at, now())
           else null
         end);

  return null;
end;
$$;

comment on function private.sync_offboarding_completion() is
  'Derives offboarding_instances.completed_at from its task rows. Sets it when every task is done, clears it when one is reopened.';

drop trigger if exists offboarding_completion_sync on public.offboarding_task_states;

create trigger offboarding_completion_sync
  after insert or update of completed_at or delete
  on public.offboarding_task_states
  for each row execute function private.sync_offboarding_completion();

-- Backfill anything already sitting at 100%.
update public.offboarding_instances i
   set completed_at = now()
 where i.completed_at is null
   and exists (select 1 from public.offboarding_task_states s where s.instance_id = i.id)
   and not exists (
     select 1 from public.offboarding_task_states s
      where s.instance_id = i.id and s.completed_at is null);
