-- ===========================================================================
-- An onboarding link names the facility the hire is actually joining.
--
-- `/onboard/[token]` greeted every new hire, at every facility, with:
--
--     PawCare Facility
--
-- read from `src/data/settings.ts`. It is on the header, the logo alt text, the
-- avatar fallback initial, and it is the facility name stamped onto the
-- availability record the hire submits. A real person, opening a real link from
-- a real email, welcomed to a business that does not exist.
--
-- ── WHY IT COULD NOT SIMPLY READ THE PROFILE ──────────────────────────────
--
-- That page is a PUBLIC token route. A hire has no session and no membership —
-- that is the whole point of the link — so `getFacilityContext()`, which
-- resolves the facility from the caller's membership, has nothing to work with.
--
-- The token is the only thing that knows. It names an instance, which names a
-- staff row, which carries `facility_id`. So the facility comes back from the
-- same RPC that already resolves everything else on that page — one round trip,
-- and no new way for an unauthenticated caller to ask about a facility.
--
-- ── AND THE ANON ROLE STILL CANNOT READ THE TABLE ─────────────────────────
--
-- This is added INSIDE `onboarding_by_token`, which is SECURITY DEFINER and
-- takes the token as an argument, hashes it, and hits a unique index. No policy
-- is widened: `facilities_read` still refuses anon, and there is deliberately
-- no "anon may read a facility where id = ?" — that shape is a table-scan
-- oracle.
--
-- Everything else about the function is unchanged, including that every failure
-- returns the same null so a caller guessing tokens learns nothing.
-- ===========================================================================

create or replace function public.onboarding_by_token(p_token text)
returns jsonb
language plpgsql
stable
security definer
set search_path to ''
as $function$
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
           -- The hire's own address, shown read-only on the account step. It was
           -- being read from a fixture staff array that a real hire's browser
           -- has no row in.
           'staffEmail',      s.email,
           -- The facility the hire is joining. Nullable in the JSON on purpose:
           -- a facility that has not filled in its details yields null rather
           -- than a placeholder, and the page shows a neutral greeting instead
           -- of somebody else's business name.
           'facilityName',    f.name,
           'facilityLogo',    f.logo_url,
           'templateId',      t.legacy_id,
           'welcomeMessage',  t.welcome_message,
           'tokenExpiresAt',  i.token_expires_at,
           'invitedAt',       i.invited_at,
           'accountPasswordSetAt', i.account_password_set_at,
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
               from public.onboarding_sections sec where sec.instance_id = i.id), '[]'::jsonb),
           'changeRequests', coalesce((
             select jsonb_agg(jsonb_build_object(
                      'taskId', cr.task_key, 'sectionType', cr.section_type,
                      'note', cr.note, 'resolvedAt', cr.resolved_at) order by cr.created_at)
               from public.onboarding_change_requests cr
              where cr.instance_id = i.id and cr.resolved_at is null), '[]'::jsonb))
    into v
    from public.onboarding_instances i
    join public.staff s on s.id = i.staff_id
    left join public.facilities f on f.id = s.facility_id
    left join public.onboarding_templates t on t.id = i.template_id
   where i.token_hash = private.hash_onboarding_token(p_token)
     and i.token_expires_at > now()
     and i.submitted_at is null
     -- 'invited', NOT 'onboarding'. Verified against the deployed function
     -- rather than inferred from the name: a wrong status here returns null for
     -- every valid token, and the route answers the same 404 it gives an
     -- expired one — so every onboarding link in existence would break with no
     -- error anywhere saying why.
     and s.status = 'invited';

  return v;
end;
$function$;
