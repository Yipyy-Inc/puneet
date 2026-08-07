-- ============================================================================
-- Taking a copy of everyone's personal data is an act, and it is recorded.
--
-- Every other audited act writes a row somewhere, so a trigger on that table
-- catches it however it was performed — that is why the audit triggers sit on
-- tables rather than inside the API functions (20260807480000).
--
-- An export writes nothing. It reads every client, every pet, every booking and
-- every member of staff at a facility and hands the lot to whoever asked. There
-- is no row to hang a trigger on, and it is the single most sensitive read the
-- platform can perform: a GDPR Art. 20 portability file is also, in the wrong
-- hands, the whole customer list.
--
-- So this is the exception to "the trigger, not the function": one explicit
-- call, gated to platform admins, that records what was taken and how much.
--
-- It cannot be a general "write me an audit entry" RPC. INSERT on audit_log is
-- revoked from `authenticated` precisely so entries cannot be forged, and a
-- function that accepts an arbitrary action and description would hand that
-- back. This one fixes the action, the category and the entity, and the caller
-- supplies only the facility and what was in the file.
-- ============================================================================

create or replace function public.record_facility_export(
  p_facility_id uuid,
  p_datasets    text[],
  p_row_count   integer
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  v_facility text;
begin
  if not private.is_platform_admin() then
    raise exception 'Only a platform administrator may export a facility''s data.'
      using errcode = '42501';
  end if;

  select f.name into v_facility from public.facilities f where f.id = p_facility_id;
  if v_facility is null then
    raise exception 'No facility %', p_facility_id using errcode = '23503';
  end if;

  return private.record_audit(
    'Facility data exported',
    'Data',
    -- High, not Critical: it is a legitimate and often legally required act.
    -- But it is the one entry you want to find quickly after a data incident,
    -- so it must never sit at the bottom of a list filtered to Medium and up.
    'High',
    'facility', p_facility_id::text, v_facility,
    p_facility_id, v_facility,
    format('%s rows exported from %s (%s)',
           greatest(coalesce(p_row_count, 0), 0),
           v_facility,
           coalesce(array_to_string(p_datasets, ', '), 'no datasets')),
    -- An ARRAY of {field, from, to}, matching every other entry: the reader
    -- (toAuditLogEntry) drops anything that is not one, silently, so an object
    -- here would record the export and lose what was in it.
    jsonb_build_array(
      jsonb_build_object(
        'field', 'datasets',
        'from', null,
        'to', coalesce(array_to_string(p_datasets, ', '), 'none')),
      jsonb_build_object(
        'field', 'rows',
        'from', null,
        'to', greatest(coalesce(p_row_count, 0), 0)))
  );
end;
$fn$;

comment on function public.record_facility_export(uuid, text[], integer) is
  'Records that a facility''s data was exported. The one audited act with no row to hang a trigger on — see the header of 20260807640000.';

revoke execute on function public.record_facility_export(uuid, text[], integer) from anon;
