-- ============================================================================
-- The caller's effective permissions, resolved by the database.
--
-- The three-layer cascade (role preset -> facility override -> per-staff
-- override) already exists in private.resolve_permission, but only one key at
-- a time. The client needs the whole map: guards, the dynamic sidebar and
-- field masking all read every key, and 168 round trips is not an option.
--
-- This is the function that lets the browser stop computing permissions from a
-- mock array and start reading the ones the database will actually enforce.
-- Until now those were two independent implementations of the same rules,
-- which is a disagreement waiting to happen — and the client's copy is the one
-- an attacker can edit.
--
-- Returns a scope per key, never a boolean: "granted" is not the question, the
-- question is "granted WHEN" — anytime, operating_hours, assigned_shifts, or
-- none.
--
-- Sanity check at the time of writing, per role preset:
--   owner 168/168 · manager 141 · reception 65 · caretaker 45 · groomer 36
-- ============================================================================

create or replace function public.my_permissions()
returns table (permission_key text, scope public.access_scope)
language sql
stable
security definer
set search_path = ''
as $$
  -- Platform admins are not staff anywhere and hold no membership, so the
  -- cascade has nothing to resolve for them. They get everything.
  select p.key, 'anytime'::public.access_scope
    from public.permissions p
   where private.is_platform_admin()

  union all

  select p.key,
         coalesce(
           private.resolve_permission(m.id, p.key),
           'none'::public.access_scope
         )
    from public.permissions p
    cross join (
      -- The caller's membership. `order by created_at` makes the choice
      -- deterministic for someone who works at two facilities; picking a
      -- facility properly is the multi-location follow-up, not something to
      -- guess at here.
      select fm.id
        from public.facility_memberships fm
       where fm.profile_id = (select auth.uid())
         and fm.is_active
       order by fm.created_at
       limit 1
    ) m
   where not private.is_platform_admin();
$$;

grant execute on function public.my_permissions() to authenticated;
revoke execute on function public.my_permissions() from anon, public;
