-- ============================================================================
-- A platform member reads; only a superadmin writes.
--
-- has_permission() and permitted_facility_ids() began with
-- `private.is_platform_admin() or …` — TRUE for every permission to anyone in
-- platform_memberships, whatever their role. So a read-only or support member
-- of Yipyy's own team could edit, cancel and refund any facility's bookings,
-- take payments and change settings, through every policy and RPC built on
-- those two functions. Measured before this change: a read-only member's
-- UPDATE on a facility booking went through (SQL R2).
--
-- private.platform_may(permission) is the platform arm now:
--   * superadmin — every permission, as before;
--   * support, billing, read-only — the VIEWING permissions only: view_*,
--     the *_view* keys (boarding_view_dashboard, financial_view_amounts, …)
--     and the audit log. Never a write, and never an export,
--     which is the whole dataset leaving the building.
--
-- is_platform_admin() is left alone: read policies use it, and reading is
-- what every platform role is for. Both functions are rebuilt from their live
-- bodies (pg_get_functiondef, 2026-09-19). SQL in platform-role-writes.sql.
-- ============================================================================

create or replace function private.platform_may(p_permission text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
      from public.platform_memberships m
     where m.profile_id = (select auth.jwt()->>'sub')
       and (
         m.role = 'superadmin'
         or p_permission ~ '^view_'
         or p_permission ~ '(^|_)view(_|$)'
         or p_permission = 'settings_audit_log'
       )
  );
$$;

revoke all on function private.platform_may(text) from public;
revoke all on function private.platform_may(text) from anon;
revoke all on function private.platform_may(text) from authenticated;

CREATE OR REPLACE FUNCTION private.has_permission(p_facility_id uuid, p_permission text)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select private.platform_may(p_permission) or exists (
    select 1
      from public.facility_memberships m
      left join public.facility_subscriptions s on s.facility_id = m.facility_id
     where m.profile_id  = (select auth.jwt()->>'sub')
       and m.facility_id = p_facility_id
       and m.is_active
       -- Absent subscription counts as active: a provisioning that failed
       -- between the facility and the subscription insert must not become a
       -- business nobody can enter.
       and coalesce(s.status, 'active') not in ('suspended', 'cancelled')
       and coalesce(private.resolve_permission(m.id, p_permission),
                    'none'::public.access_scope) <> 'none'::public.access_scope
  );
$function$;

CREATE OR REPLACE FUNCTION private.permitted_facility_ids(p_permission text)
 RETURNS SETOF uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select f.id
    from public.facilities f
   where private.platform_may(p_permission)
  union
  select m.facility_id
    from public.facility_memberships m
    left join public.facility_subscriptions s on s.facility_id = m.facility_id
   where m.profile_id = (select auth.jwt()->>'sub')
     and m.is_active
     and coalesce(s.status, 'active') not in ('suspended', 'cancelled')
     and coalesce(private.resolve_permission(m.id, p_permission),
                  'none'::public.access_scope) <> 'none'::public.access_scope;
$function$;

do $check$
begin
  if has_function_privilege('anon', 'private.platform_may(text)', 'execute')
     or has_function_privilege('authenticated', 'private.platform_may(text)', 'execute') then
    raise exception 'platform_may is callable by a client role';
  end if;
end
$check$;
