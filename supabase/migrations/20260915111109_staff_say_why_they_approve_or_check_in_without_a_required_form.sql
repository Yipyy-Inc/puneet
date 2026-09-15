-- ============================================================================
-- Staff say why they approve or check in without a required form.
--
-- The form requirements stages after booking (before approval, before
-- check-in) are enforced by the routes that make those changes, which ask
-- public.booking_missing_forms first. A staff member going ahead without a
-- blocking form gives a reason, saved here in form_requirement_overrides with
-- who gave it.
--
-- Who may: approving a booking needs edit_bookings; checking in needs
-- edit_bookings, check_in_out or daycare_check_in_out at the booking's
-- facility. A booking that does not exist and one that is not the caller's get
-- the same answer.
--
-- The before-booking stage is recorded by create_booking itself and is refused
-- here. SQL G7-G8 in booking-form-gate.sql.
-- ============================================================================

create or replace function public.record_form_requirement_override(
  p_booking_id uuid,
  p_stage text,
  p_reason text
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_facility uuid;
begin
  if p_stage not in ('before_approval', 'before_checkin') then
    raise exception 'Only approval and check-in overrides are recorded here.'
      using errcode = '22023';
  end if;

  select b.facility_id into v_facility from public.bookings b where b.id = p_booking_id;

  if v_facility is null
     or not (
       private.has_permission(v_facility, 'edit_bookings')
       or (p_stage = 'before_checkin'
           and (private.has_permission(v_facility, 'check_in_out')
                or private.has_permission(v_facility, 'daycare_check_in_out')))
     )
  then
    raise exception 'Not allowed to go ahead without the required forms.'
      using errcode = '42501';
  end if;

  return private.record_form_overrides(p_booking_id, p_stage, p_reason);
end;
$$;

revoke all on function public.record_form_requirement_override(uuid, text, text) from public;
revoke all on function public.record_form_requirement_override(uuid, text, text) from anon;
grant execute on function public.record_form_requirement_override(uuid, text, text)
  to authenticated, service_role;

do $check$
begin
  if has_function_privilege('anon', 'public.record_form_requirement_override(uuid,text,text)', 'execute') then
    raise exception 'anon can execute record_form_requirement_override';
  end if;
  if not has_function_privilege('authenticated', 'public.record_form_requirement_override(uuid,text,text)', 'execute') then
    raise exception 'authenticated cannot execute record_form_requirement_override';
  end if;
end
$check$;
