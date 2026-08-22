-- ============================================================================
-- The report-card RPCs are not anon-callable.
--
-- 20260822300000 shipped four SECURITY DEFINER functions with
-- `revoke all ... from public` and no revoke naming `anon`. That is the third
-- occurrence of the trap 20260805210403 documents, and the reason V7 of
-- `supabase/tests/rpc-session-required.sql` exists:
--
--   Supabase ships `alter default privileges in schema public grant execute on
--   functions to anon, authenticated, service_role`, so every function born in
--   `public` carries an explicit `anon=X` ACL entry. `revoke ... from public`
--   is a DIFFERENT grant and leaves `anon=X` standing.
--
-- Not exploitable as written — each function filters on
-- `client_id in (select private.own_client_ids())`, which is empty without a
-- subject, so an anon caller matches zero rows and gets 42501. Crucially the
-- error does not distinguish "no such card" from "not your card", so there is
-- no existence oracle of the kind that made `record_boarding_arrival`
-- interesting. The table was also empty when this was caught.
--
-- Revoked anyway, because V7 asserts "no unexpected anon-callable function in
-- public" and an invariant with exceptions is not one.
--
-- ── THE SWEEP HAS ROTTED, AND THAT IS A SEPARATE PROBLEM ──────────────────
--
-- V7 does not currently pass, and has not for some time — the sweep was
-- written to fail when someone forgot, and then nothing ran it. After this
-- migration and 20260822400000 (which closed the same hole on
-- `award_loyalty_badge`), its query still names TWELVE functions:
--
--   approve_availability_request, approve_shift_swap, facility_branding_by_slug,
--   facility_has_module, facility_module_entitlements, facility_report,
--   prevent_audit_log_mutation, record_facility_export, reset_facility_modules,
--   set_default_terminal, set_facility_module, time_off_shift_conflicts
--
-- NOT a to-do list, and reading it as one would break production. Every entry
-- classified against pg_proc rather than assumed:
--
--   6 — SECURITY DEFINER, write, and they check the caller first:
--       approve_availability_request, approve_shift_swap,
--       record_facility_export, reset_facility_modules, set_facility_module,
--       time_off_shift_conflicts
--       anon is refused. Residual exposure is an existence oracle, the same
--       shape as the one this migration fixes.
--
--   2 — SECURITY DEFINER, read-only, NO caller check:
--       facility_branding_by_slug — INTENTIONAL. Must stay anon-callable: anon
--         reads zero rows from `facilities`, so this projection is the only way
--         a signed-out visitor's subdomain resolves to a logo and colours (see
--         the header of src/lib/api/facility-branding.ts). Revoking it breaks
--         every facility's branded sign-in page. It needs an ALLOWLIST ENTRY in
--         V7 — the grant is right and the TEST is what is stale.
--       facility_has_module — a minor metadata leak at worst.
--
--   3 — SECURITY INVOKER, so RLS applies and anon reaches nothing new:
--       facility_module_entitlements, facility_report, set_default_terminal
--
--   1 — returns `trigger`, so PostgREST will not route to it at all:
--       prevent_audit_log_mutation
--
-- 6 + 2 + 3 + 1 = 12. No unauthenticated WRITE is reachable anywhere in that
-- list.
--
-- Which is the whole argument for leaving them: each needs a judgement — revoke,
-- allowlist, or reorder its checks — and one migration reaching across
-- scheduling, facility modules and reporting to change privileges is not one
-- anybody can review. Recorded so the next person finds the list rather than
-- rediscovering it.
--
-- (Denominator note: V7's raw query returns 17; four are already exempted by
-- its allowlist as the onboarding token RPCs, and one was fixed alongside this.)
-- ============================================================================

revoke execute on function public.mark_report_card_viewed(uuid)            from anon;
revoke execute on function public.set_report_card_favourite(uuid, boolean) from anon;
revoke execute on function public.reply_to_report_card(uuid, text)         from anon;
revoke execute on function public.rate_report_card(uuid, integer, text)    from anon;

comment on function public.mark_report_card_viewed(uuid) is
  'Record the first time the owner opened a sent card. Raises 42501 for a card belonging to someone else, and for one that does not exist — the two are deliberately indistinguishable. anon holds no EXECUTE grant.';

comment on function public.set_report_card_favourite(uuid, boolean) is
  'Favourite or unfavourite a sent card the caller owns. anon holds no EXECUTE grant.';

comment on function public.reply_to_report_card(uuid, text) is
  'Record the owner''s reply to a sent card they own. anon holds no EXECUTE grant.';

comment on function public.rate_report_card(uuid, integer, text) is
  'Record the owner''s star rating once. Raises 42501 on a second attempt. anon holds no EXECUTE grant.';
