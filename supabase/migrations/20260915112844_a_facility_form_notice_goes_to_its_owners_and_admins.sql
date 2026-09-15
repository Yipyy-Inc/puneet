-- ============================================================================
-- A facility's form notice goes to its owners and admins.
--
-- When a customer submits a form, the facility's `form_notifications` setting
-- decides whether staff hear about it. The people who hear are the facility's
-- active owners and admins with an email address, the same people the
-- pre-arrival form already notifies (yipyy_go_staff_recipients), but named by
-- the facility rather than by a pre-arrival submission.
--
-- Executable by the service role alone: the customer who submitted must not be
-- able to read the facility's staff addresses.
-- ============================================================================

create or replace function public.facility_staff_recipients(p_facility_id uuid)
returns table (email text, full_name text)
language sql
stable
security definer
set search_path = ''
as $$
  select distinct p.email::text, p.full_name::text
    from public.facility_memberships m
    join public.profiles p on p.id::text = m.profile_id::text
   where m.facility_id = p_facility_id
     and m.is_active
     and m.role::text in ('owner', 'admin')
     and p.email is not null
     and btrim(p.email::text) <> '';
$$;

revoke all on function public.facility_staff_recipients(uuid) from public;
revoke all on function public.facility_staff_recipients(uuid) from anon;
revoke all on function public.facility_staff_recipients(uuid) from authenticated;
grant execute on function public.facility_staff_recipients(uuid) to service_role;

do $check$
begin
  if has_function_privilege('anon', 'public.facility_staff_recipients(uuid)', 'execute')
     or has_function_privilege('authenticated', 'public.facility_staff_recipients(uuid)', 'execute') then
    raise exception 'facility_staff_recipients is callable by a signed-in or anonymous user';
  end if;
  if not has_function_privilege('service_role', 'public.facility_staff_recipients(uuid)', 'execute') then
    raise exception 'the service role cannot list facility staff recipients';
  end if;
end
$check$;
