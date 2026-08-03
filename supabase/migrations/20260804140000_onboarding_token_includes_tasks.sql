-- ============================================================================
-- The token payload carries the TASKS, not just the instance.
--
-- /onboard/[token] renders a form per employee task: the field specs, the
-- document names, the custom questions. Those live in
-- onboarding_employee_tasks, whose policies are `to authenticated` — which is
-- correct, and which means an anon token-bearer cannot read them.
--
-- The page did not notice because it was rendering from the MOCK template
-- catalogue. Moving it onto real data is what surfaced the gap.
--
-- Widening the table policy to anon would recreate exactly what 20260803180000
-- refused: a surface an unauthenticated caller can query and vary. So the tasks
-- ride along inside the RPC's payload instead — same single choke point, same
-- hash lookup against a unique index, nothing newly exposed.
--
-- A token buys you your own instance AND the form you are being asked to fill
-- in. That is one coherent answer to one question, and it is strictly less
-- surface than two ways of asking.
-- ============================================================================

create or replace function public.onboarding_by_token(p_token text)
returns jsonb language plpgsql security definer stable set search_path = '' as $$
declare
  v jsonb;
begin
  if p_token is null or length(p_token) < 8 then
    return null;
  end if;

  select jsonb_build_object(
           'instanceId',      i.id,
           'staffId',         s.legacy_id,
           'staffFirstName',  s.first_name,
           'staffLastName',   s.last_name,
           'templateId',      t.legacy_id,
           'welcomeMessage',  t.welcome_message,
           'tokenExpiresAt',  i.token_expires_at,
           'invitedAt',       i.invited_at,
           'accountPasswordSetAt', i.account_password_set_at,
           -- The form itself, ordered by `position` — the ordering the
           -- templates migration went out of its way to make explicit.
           'tasks', coalesce((
             select jsonb_agg(jsonb_build_object(
                      'id',           coalesce(et.legacy_id, et.id::text),
                      'type',         et.task_type,
                      'name',         et.name,
                      'description',  et.description,
                      'required',     et.required,
                      'documentName', et.document_name,
                      'documentRef',  et.document_ref,
                      'fields',       coalesce(et.config -> 'fields', '[]'::jsonb),
                      'question',     et.config -> 'question')
                    order by et.position)
               from public.onboarding_employee_tasks et
              where et.template_id = i.template_id), '[]'::jsonb),
           'sections', coalesce((
             select jsonb_agg(jsonb_build_object(
                      'taskId', sec.task_key, 'type', sec.section_type,
                      'status', sec.status, 'data', sec.data,
                      'completedAt', sec.completed_at) order by sec.created_at)
               from public.onboarding_sections sec
              where sec.instance_id = i.id), '[]'::jsonb),
           'changeRequests', coalesce((
             select jsonb_agg(jsonb_build_object(
                      'taskId', cr.task_key, 'sectionType', cr.section_type,
                      'note', cr.note, 'resolvedAt', cr.resolved_at)
                    order by cr.created_at)
               from public.onboarding_change_requests cr
              where cr.instance_id = i.id and cr.resolved_at is null), '[]'::jsonb))
    into v
    from public.onboarding_instances i
    join public.staff s on s.id = i.staff_id
    left join public.onboarding_templates t on t.id = i.template_id
   where i.token_hash = private.hash_onboarding_token(p_token)
     and i.token_expires_at > now()
     and i.submitted_at is null
     and s.status = 'invited';

  return v;
end;
$$;
