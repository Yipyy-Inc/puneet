-- ============================================================================
-- status_page_maintenance() is called by the server, not by anyone.
--
-- 20260918103842 granted it to anon so the public status page could call it
-- with the publishable key. rpc-session-required.sql (V7) refused that on its
-- first run: the set of functions callable without a session is a reviewed
-- list, and a new entry needs a reason no other shape can meet. This one has
-- another shape — the page is server-rendered, so the server calls it with the
-- service role and the anonymous surface does not grow.
-- ============================================================================

revoke all on function public.status_page_maintenance() from public;
revoke all on function public.status_page_maintenance() from anon;
revoke all on function public.status_page_maintenance() from authenticated;
grant execute on function public.status_page_maintenance() to service_role;

do $check$
begin
  if has_function_privilege('anon', 'public.status_page_maintenance()', 'execute')
     or has_function_privilege('authenticated', 'public.status_page_maintenance()', 'execute') then
    raise exception 'status_page_maintenance is still callable without the service role';
  end if;
end
$check$;
