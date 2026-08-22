-- ============================================================================
-- The other half of the rule: revoking `anon` does not remove `PUBLIC`.
--
-- 20260822600000 revoked EXECUTE from `anon` on eleven functions. It changed
-- nothing. V7 failed afterwards naming the same eleven.
--
-- ── WHY ───────────────────────────────────────────────────────────────────
--
-- The ACL of every one of them looked like this:
--
--     {=X/postgres, postgres=X/postgres, authenticated=X/postgres, ...}
--        ^^
--        an EMPTY grantee is PUBLIC
--
-- There was no `anon=X` entry to remove. The grant `anon` was using came from
-- PUBLIC, and every role is a member of PUBLIC, so
-- `has_function_privilege('anon', ...)` stayed true and the revoke was a no-op
-- against a privilege it did not name.
--
-- This repo has the rule written down in three places, and it is written down
-- BACKWARDS — or rather, only forwards:
--
--     "`revoke ... from public` does NOT remove anon"          (true)
--     "`revoke ... from anon`   does NOT remove PUBLIC"        (also true,
--                                                               never said)
--
-- Both halves are the same fact seen from two sides: `public` and `anon` are
-- SEPARATE ACL entries and a revoke only ever removes the one it names. Which
-- is why the working migrations in this repo all say `from public, anon` — and
-- until now that looked like belt-and-braces rather than two necessary halves.
-- 20260805210403 says it, and the three loyalty functions say it. The two that
-- did not (`award_loyalty_badge` yesterday, and 20260822600000 today) were
-- written by reading the rule instead of reading an ACL.
--
-- `award_loyalty_badge` came out right ANYWAY, and only by luck: its original
-- migration had already said `revoke ... from public`, so yesterday's
-- `from anon` completed a pair rather than starting one. Reading that fix as a
-- pattern — which is exactly what happened here — reproduces half of it.
--
-- ── THE LESSON WORTH KEEPING ──────────────────────────────────────────────
--
-- A revoke is not verified by having been written. It is verified by asking the
-- catalogue afterwards, which is what V7 does and why it caught this within a
-- minute of the first attempt. Assert on `has_function_privilege`, never on the
-- fact that a `revoke` statement ran without error — a revoke that names a
-- privilege the role does not hold succeeds silently, and looks identical to
-- one that worked.
--
-- `facility_branding_by_slug` is untouched here and stays anon-callable by
-- design; see 20260822600000 and V7's allowlist.
-- ============================================================================

revoke execute on function public.approve_availability_request(p_request_id uuid, p_notes text) from public, anon;
revoke execute on function public.approve_shift_swap(p_request_id uuid, p_notes text) from public, anon;
revoke execute on function public.facility_has_module(p_facility_id uuid, p_module_id text) from public, anon;
revoke execute on function public.facility_module_entitlements(p_facility_id uuid) from public, anon;
revoke execute on function public.facility_report(p_facility_id uuid, p_months integer) from public, anon;
revoke execute on function public.prevent_audit_log_mutation() from public, anon;
revoke execute on function public.record_facility_export(p_facility_id uuid, p_datasets text[], p_row_count integer) from public, anon;
revoke execute on function public.reset_facility_modules(p_facility_id uuid) from public, anon;
revoke execute on function public.set_default_terminal(p_terminal_id uuid) from public, anon;
revoke execute on function public.set_facility_module(p_facility_id uuid, p_module_id text, p_enabled boolean, p_price_override_cents integer, p_note text, p_expires_at timestamp with time zone) from public, anon;
revoke execute on function public.time_off_shift_conflicts(p_request_id uuid) from public, anon;
