-- ============================================================================
-- Somebody can be taken out of a sequence by hand.
--
-- `STOP_CONDITIONS` has offered "Someone stops it by hand" since the workflows
-- landed, with the hint "staff can end a sequence for one client from the
-- workflow's detail page". Nothing on that page could, and nothing in the API
-- could either. This is the thing that makes the sentence true.
--
-- -- WHY AN RPC AND NOT A TABLE WRITE ---------------------------------------
--
-- `workflow_enrollments` deliberately revokes insert/update/delete from
-- `authenticated` (20260828134132): an enrolment is the engine's account of who
-- was sent what and when, and a session that could rewrite it could rewrite
-- that account. Handing staff a general UPDATE to enable one button would undo
-- that for every column and every row.
--
-- So this is the one deliberate exception, and it is narrow by construction: it
-- can only move an ACTIVE enrolment to 'stopped', it can only do so for a
-- facility the caller may manage automations for, and it cannot touch anything
-- else on the row.
--
-- -- A STOP THAT LEAVES A QUEUED MESSAGE IS NOT A STOP -----------------------
--
-- Setting `next_run_at = null` prevents the NEXT step. It does nothing about a
-- message this enrolment has already queued -- and quiet hours routinely defer
-- one to 08:00 tomorrow. Staff who stop a sequence at 21:30 mean "do not send
-- that", so the queued rows are cancelled in the same call.
--
-- This is not airtight against a tick that has already claimed the enrolment
-- and is mid-render -- PostgREST gives the engine no transaction spanning both.
-- The engine re-reads the status immediately before queueing, which closes the
-- reachable case; the sub-second window between that read and the insert
-- remains, and is worth naming rather than pretending away.
-- ============================================================================

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

  -- Not found and not allowed are answered the same way on purpose: a caller
  -- who may not manage this facility's automations must not be able to probe
  -- for which enrolment ids exist.
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
         -- Prefixed, so the detail panel can tell a person's decision from the
         -- engine's. `stopped_reason = 'booked'` and `= 'manual:...'` are
         -- different facts and staff ask different questions about them.
         stopped_reason = 'manual:' ||
           coalesce(nullif(btrim(p_reason), ''), 'stopped by staff'),
         next_run_at    = null,
         completed_at   = now(),
         updated_at     = now()
   where id = p_enrollment_id
     and status = 'active';

  -- NOTE: this reference is ambiguous against the OUT parameter of the same
  -- name and raises at run time. Corrected in 20260828162443, which is kept
  -- separate because that is the order the live database saw them in.
  update public.message_sends
     set status      = 'cancelled',
         skip_reason = 'enrolment_stopped'
   where enrollment_id = p_enrollment_id
     and status = 'queued';
  get diagnostics v_cancelled = row_count;

  return query select p_enrollment_id, v_cancelled;
end;
$fn$;

comment on function public.stop_workflow_enrollment(uuid, text) is
  'Take one client out of one workflow by hand. The only write a session may make to workflow_enrollments; also cancels that enrolment''s queued messages.';

revoke all on function public.stop_workflow_enrollment(uuid, text) from public, anon;
grant execute on function public.stop_workflow_enrollment(uuid, text) to authenticated;

-- A revoke naming a privilege the role does not hold succeeds silently and
-- looks identical to one that worked (20260822610000). Read it back.
do $$
begin
  if has_function_privilege('anon',
       'public.stop_workflow_enrollment(uuid, text)', 'execute') then
    raise exception 'anon can stop an enrolment';
  end if;
  if not has_function_privilege('authenticated',
       'public.stop_workflow_enrollment(uuid, text)', 'execute') then
    raise exception 'authenticated cannot stop an enrolment';
  end if;
end $$;
