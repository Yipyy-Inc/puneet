-- ============================================================================
-- Let a customer read the facility they are a client of.
--
-- Found by testing the real read path rather than the policy in isolation: a
-- customer could read their own bookings, but not the facility row those
-- bookings point at. Any query joining the two — including the booking list,
-- which needs facilities.timezone to render an appointment time — came back
-- EMPTY while the rows sat there perfectly readable on their own.
--
-- That failure mode is worth naming: an inner join silently converts "cannot
-- read the joined table" into "there is no data". It looks like an empty
-- account, not a permission error, so nothing surfaces to debug.
--
-- The fix is not to loosen the join. A pet owner should be able to see the
-- business they book with — its name, and its timezone, without which their
-- own appointment times cannot be displayed correctly.
--
-- SECURITY DEFINER in `private` for the same reason as the other helpers: it
-- reads clients while the clients policies are themselves being evaluated, and
-- it must not be reachable as an RPC.
-- ============================================================================

create or replace function private.client_facility_ids()
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select distinct c.facility_id
    from public.clients c
   where c.profile_id = (select auth.uid());
$$;

-- `authenticated` explicitly — revoking from PUBLIC would strip what it
-- inherits and every policy calling this would fail closed.
grant execute on function private.client_facility_ids() to authenticated;
revoke execute on function private.client_facility_ids() from anon;

drop policy if exists facilities_read on public.facilities;

create policy facilities_read on public.facilities
  for select to authenticated
  using (
    private.is_platform_admin()
    or id in (select private.member_facility_ids())
    or id in (select private.client_facility_ids())
  );
