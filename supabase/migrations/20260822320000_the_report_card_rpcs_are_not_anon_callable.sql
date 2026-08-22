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
-- Running V7's own query after this fix still names thirteen functions:
--
--   approve_availability_request, approve_shift_swap, award_loyalty_badge,
--   facility_branding_by_slug, facility_has_module,
--   facility_module_entitlements, facility_report,
--   prevent_audit_log_mutation, record_facility_export,
--   reset_facility_modules, set_default_terminal, set_facility_module,
--   time_off_shift_conflicts
--
-- So V7 does not currently pass, and has not for some time — the sweep was
-- written to fail when someone forgot, and then nothing ran it. Those thirteen
-- are NOT fixed here: they belong to scheduling, facility modules, loyalty and
-- reporting, and a migration that reaches across four domains to change their
-- privileges is not one anybody can review. They are recorded here so the next
-- person finds the list rather than rediscovering it, and so the fix is a
-- deliberate change per domain instead of a silent sweep.
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
