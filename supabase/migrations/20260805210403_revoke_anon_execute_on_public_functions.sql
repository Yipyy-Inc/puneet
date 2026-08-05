-- ============================================================================
-- Close the anon EXECUTE grant on four functions in `public`.
--
-- Caught by V7 of supabase/tests/rpc-session-required.sql — the sweep that
-- exists because two earlier functions shipped reachable from the publishable
-- key. This is the same root cause, third occurrence:
--
--   Supabase ships `alter default privileges in schema public grant execute
--   on functions to anon, authenticated, service_role`, so EVERY function born
--   in `public` carries an explicit `anon=X` ACL entry. `revoke ... from public`
--   is a different grant and leaves `anon=X` standing.
--
-- Neither SECURITY DEFINER function was privilege-escalation exploitable:
-- `private.has_permission()` returns false without a subject, so the action is
-- refused. But both perform their booking lookup BEFORE the permission check
-- and raise a distinguishable 'That booking does not exist.' (P0002) versus
-- 'Not allowed...' (42501). Under SECURITY DEFINER that lookup bypasses RLS, so
-- an unauthenticated caller could enumerate valid booking refs by comparing
-- errors — the existence-oracle pattern rpc_require_session was written to
-- eliminate.
--
-- The two `prevent_*_mutation` functions return `trigger`, so PostgREST will not
-- route to them; they are revoked anyway because the invariant V7 asserts is
-- "no unexpected anon-callable function in public", and an invariant with
-- exceptions is not one. (They needed a second revoke — see the follow-up
-- migration 20260805210435.)
-- ============================================================================

revoke execute on function public.record_boarding_arrival(bigint, text) from anon;
revoke execute on function public.set_booking_tip_split(bigint, text, jsonb)  from anon;
revoke execute on function public.prevent_grooming_history_mutation()          from anon;
revoke execute on function public.prevent_money_mutation()                     from anon;

comment on function public.record_boarding_arrival(bigint, text) is
  'Check-in/out for a boarding stay. Requires check_in_out on the booking''s own facility. anon holds no EXECUTE grant — see rpc_require_session for why that must be revoked explicitly.';

comment on function public.set_booking_tip_split(bigint, text, jsonb) is
  'Rewrites a booking''s tip allocations. Requires take_payment on the booking''s own facility. anon holds no EXECUTE grant.';
