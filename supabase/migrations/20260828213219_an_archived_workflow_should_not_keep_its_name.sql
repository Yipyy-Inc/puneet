-- Deleting a workflow archives it (enrolments are the record of who was sent
-- what, so the row has to survive). But `workflows_name_unique` covered EVERY
-- row including archived ones, so the name never came back: delete "Win-back
-- sequence", try to create it again, and the API answers "a workflow with that
-- name already exists" about a workflow the screen does not show.
--
-- Found by workflow-wizard.spec.ts on its second run, which is the only way it
-- could have been found — the first run of anything passes.
--
-- Partial, so a live workflow still cannot share a name with another live one.

drop index if exists public.workflows_name_unique;

create unique index if not exists workflows_name_unique
  on public.workflows (facility_id, lower(name))
  where status <> 'archived';

do $$
begin
  if not exists (
    select 1 from pg_indexes
     where schemaname = 'public' and indexname = 'workflows_name_unique'
  ) then
    raise exception 'the name index was not recreated';
  end if;
end $$;
