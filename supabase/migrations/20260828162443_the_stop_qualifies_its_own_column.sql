-- The stop function's OUT parameter is called `enrollment_id`, and so is the
-- column on `message_sends` it filters by. Unqualified, that reference is
-- AMBIGUOUS, and Postgres refuses it at run time rather than guessing -- so the
-- enrolment moved to 'stopped' and the call then raised, leaving the queued
-- messages uncancelled.
--
-- Caught by workflows-rls.sql on its first run, which is the argument for
-- writing the assertions in the same change as the function: a stop that raises
-- halfway is not something the UI would have shown as a failure.

create or replace function public.stop_workflow_enrollment(
  p_enrollment_id uuid,
  p_reason text default null
)
returns table (enrollment_id uuid, cancelled_messages integer)
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  v_facility uuid;
  v_status   text;
  v_cancelled integer := 0;
begin
  select w.facility_id, e.status
    into v_facility, v_status
    from public.workflow_enrollments e
    join public.workflows w on w.id = e.workflow_id
   where e.id = p_enrollment_id;

  if v_facility is null
     or not private.has_permission(v_facility, 'marketing_manage_automations')
  then
    raise exception 'no such enrolment, or not yours to stop'
      using errcode = '42501';
  end if;

  if v_status is distinct from 'active' then
    raise exception 'that sequence has already ended (%)', v_status
      using errcode = '22023';
  end if;

  update public.workflow_enrollments
     set status         = 'stopped',
         stopped_reason = 'manual:' ||
           coalesce(nullif(btrim(p_reason), ''), 'stopped by staff'),
         next_run_at    = null,
         completed_at   = now(),
         updated_at     = now()
   where public.workflow_enrollments.id = p_enrollment_id
     and public.workflow_enrollments.status = 'active';

  update public.message_sends
     set status      = 'cancelled',
         skip_reason = 'enrolment_stopped'
   where public.message_sends.enrollment_id = p_enrollment_id
     and public.message_sends.status = 'queued';
  get diagnostics v_cancelled = row_count;

  return query select p_enrollment_id, v_cancelled;
end;
$fn$;

revoke all on function public.stop_workflow_enrollment(uuid, text) from public, anon;
grant execute on function public.stop_workflow_enrollment(uuid, text) to authenticated;

do $$
begin
  if has_function_privilege('anon',
       'public.stop_workflow_enrollment(uuid, text)', 'execute') then
    raise exception 'anon can stop an enrolment';
  end if;
end $$;
