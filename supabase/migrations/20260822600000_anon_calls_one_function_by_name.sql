-- ============================================================================
-- anon may call the functions a signed-out visitor NEEDS, and no others.
--
-- V7 in supabase/tests/rpc-session-required.sql has been failing since the day
-- something first ran it. Eleven functions in `public` carry an EXECUTE grant
-- to `anon` that nobody chose to give them.
--
-- ── WHY THERE ARE ELEVEN AND NOT ZERO ─────────────────────────────────────
--
-- Nobody granted these. Supabase ships
--
--     alter default privileges in schema public
--       grant execute on functions to anon, authenticated, service_role
--
-- so EVERY function born in `public` arrives anon-callable. The grant is the
-- default; a revoke is the only thing that removes it, and `revoke ... from
-- public` does NOT — `public` and `anon` are different grants, and the ACL
-- keeps its explicit `anon=X` entry. That is written down in
-- 20260805210403_revoke_anon_execute_on_public_functions.sql, and it has now
-- been missed five times.
--
-- Which is the actual lesson here: a rule that is only written down gets
-- re-broken by whoever writes the next function. What stops it is V7 going
-- green and STAYING green in CI. This migration is what makes that possible;
-- it is not by itself the fix.
--
-- ── WHAT WAS REACHABLE, MEASURED RATHER THAN ASSUMED ──────────────────────
--
-- Read out of the live catalogue by comparing, per function, the line that
-- raises on a missing row against the line that checks permission:
--
--   THREE EXISTENCE ORACLES — the lookup runs BEFORE the permission check, and
--   the two failures are distinguishable (P0002 vs 42501). Under SECURITY
--   DEFINER that lookup bypasses RLS, so anyone holding the publishable key
--   could tell a real id from an invented one:
--
--       approve_availability_request   lookup line 20, guard line 23
--       approve_shift_swap             lookup line 14, guard line 17
--       time_off_shift_conflicts       lookup line 15, guard line 18
--
--   This is the same shape as `award_loyalty_badge` (20260822400000) and the
--   two functions 20260805210403 fixed. It keeps recurring because resolving
--   the row first is the natural way to write it: the facility you check
--   permission against comes OUT of that row.
--
--   ONE UNGUARDED SECURITY DEFINER READ:
--
--       facility_has_module            no permission check of any kind
--
--   It answers whether a given facility has a given module, to anybody. Not
--   catastrophic — it is one bit about a uuid a caller must already hold — but
--   it is a straight read of another tenant's commercial configuration, and no
--   part of the product asks anon for it.
--
--   THE REMAINING SEVEN are defence in depth, and saying so is more useful
--   than inflating them. `set_facility_module`, `reset_facility_modules` and
--   `record_facility_export` check `private.is_platform_admin()` as their FIRST
--   statement, which is false with no subject, so anon reached nothing.
--   `facility_module_entitlements`, `facility_report` and `set_default_terminal`
--   are SECURITY INVOKER, so RLS applied to anon and returned nothing.
--   `prevent_audit_log_mutation` is a trigger function and raises if called
--   directly. None of them were holes. They are grants nobody asked for, and
--   the reason to drop them is that a function's exposure should be a decision
--   rather than an accident.
--
-- ── THE ONE THAT STAYS, AND WHY REVOKING IT WOULD BE THE REAL OUTAGE ──────
--
-- `facility_branding_by_slug` KEEPS its anon grant. It is not an oversight; it
-- is the only reason a facility's branded sign-in page can render.
-- `src/lib/api/facility-branding.ts` builds its client from
-- `config.publishableKey` with no session — it has to, because the visitor is
-- by definition not signed in yet, that being the page they are trying to sign
-- in on. Revoking it would blank the logo, wordmark, colours and tagline on
-- every facility's front door, and turn `allowCustomerSignup` false so the
-- sign-up option vanished with it.
--
-- It was designed for this exposure rather than left open by accident: it takes
-- an EXACT slug and answers about one facility, so it is a lookup and not a
-- directory (anon reads zero rows from `facilities` — measured in
-- supabase/tests/facility-branding.sql), and it deliberately omits
-- support_email and support_phone so anon cannot harvest contact details.
--
-- So V7's allowlist grows by one name. An allowlist entry is the right artefact
-- precisely because it is not silent: the next person to add one has to write
-- down why, in a test somebody reviews, instead of inheriting a default nobody
-- chose.
-- ============================================================================

revoke execute on function public.approve_availability_request(p_request_id uuid, p_notes text) from anon;
revoke execute on function public.approve_shift_swap(p_request_id uuid, p_notes text) from anon;
revoke execute on function public.facility_has_module(p_facility_id uuid, p_module_id text) from anon;
revoke execute on function public.facility_module_entitlements(p_facility_id uuid) from anon;
revoke execute on function public.facility_report(p_facility_id uuid, p_months integer) from anon;
revoke execute on function public.prevent_audit_log_mutation() from anon;
revoke execute on function public.record_facility_export(p_facility_id uuid, p_datasets text[], p_row_count integer) from anon;
revoke execute on function public.reset_facility_modules(p_facility_id uuid) from anon;
revoke execute on function public.set_default_terminal(p_terminal_id uuid) from anon;
revoke execute on function public.set_facility_module(p_facility_id uuid, p_module_id text, p_enabled boolean, p_price_override_cents integer, p_note text, p_expires_at timestamp with time zone) from anon;
revoke execute on function public.time_off_shift_conflicts(p_request_id uuid) from anon;

comment on function public.facility_branding_by_slug(p_slug text) is
  'The public branding for one facility, by exact slug. DELIBERATELY anon-callable and allowlisted in V7 of rpc-session-required.sql: a branded sign-in page renders for a visitor who is by definition not signed in, so src/lib/api/facility-branding.ts calls this with the publishable key and no session. An exact-slug lookup rather than a directory, and it omits support_email/support_phone on purpose. Revoking anon here blanks every facility''s front door.';
