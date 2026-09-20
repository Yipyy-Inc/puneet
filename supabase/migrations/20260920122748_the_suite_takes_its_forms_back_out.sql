-- ============================================================================
-- public.purge_e2e_forms() — the forms half of `bun run e2e:purge`.
--
-- ── WHY ───────────────────────────────────────────────────────────────────
--
-- There is one Postgres. `purge_e2e_bookings()` has taken the suite's BOOKINGS
-- back out since 2026-08-20; nothing has ever taken its FORMS. Measured
-- 2026-09-20: `forms` held 1,117 rows and 1,076 of them were e2e leftovers,
-- accumulated since 2026-08-23, with 880 of the 905 rows in `form_submissions`
-- hanging off them.
--
-- That is not only untidy. `GET /api/forms` sets no limit, so PostgREST caps
-- the answer at 1,000 rows — and `forms.spec.ts` "the screen shows the forms
-- the database holds" began failing because the row it had just created sorted
-- past the cap. The data made a real screen wrong, not just a test.
--
-- ── ORDER MATTERS, AND THAT IS THE WHOLE FUNCTION ─────────────────────────
--
-- `form_versions.form_id` and `form_requirement_overrides.form_id` are ON
-- DELETE CASCADE, so a form takes them with it. `form_submissions` is NOT a
-- child of `forms` at all — it points at `form_versions` ON DELETE **RESTRICT**.
-- So a form the suite filled in cannot be deleted while its answers are still
-- there. Verified as a negative control before this migration was written:
--
--   delete from public.forms where name like '[e2e]%';
--   ERROR: update or delete on table "form_versions" violates foreign key
--          constraint "form_submissions_form_version_id_fkey"
--
-- Hence: submissions first, then the forms.
--
-- ── THE SAFETY IS IN HERE, NOT IN THE CALLER ──────────────────────────────
--
-- Like `purge_e2e_bookings()`, this takes no argument. The pattern cannot be
-- passed in and so cannot be got wrong, and nothing in `src/` calls it — only
-- `scripts/purge-e2e-bookings.ts`, under the service role. `[e2e]` is the
-- marker every spec puts at the FRONT of a form name, which is why the match
-- is anchored rather than `%[e2e]%`.
--
-- No facility is named here, deliberately: CI and a developer's machine run
-- against different facilities, and the marker is what identifies the row.
-- ============================================================================

create or replace function public.purge_e2e_forms()
returns integer
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_deleted integer;
begin
  -- The answers first: RESTRICT would otherwise refuse the form.
  delete from public.form_submissions s
   using public.form_versions v, public.forms f
   where s.form_version_id = v.id
     and v.form_id = f.id
     and f.name like '[e2e]%';

  -- Versions and requirement overrides cascade from here.
  delete from public.forms f
   where f.name like '[e2e]%';

  get diagnostics v_deleted = row_count;
  return v_deleted;
end;
$function$;

-- `revoke from public` and `revoke from anon` are different grants; a function
-- is reachable through either, so both are named. The revoke is asserted
-- against has_function_privilege() in supabase/tests/purge-e2e-forms.sql
-- rather than trusted for having been written.
revoke execute on function public.purge_e2e_forms() from public;
revoke execute on function public.purge_e2e_forms() from anon;
revoke execute on function public.purge_e2e_forms() from authenticated;
grant execute on function public.purge_e2e_forms() to service_role;

comment on function public.purge_e2e_forms() is
  'Deletes forms named [e2e]% and their submissions. Service role only; called by bun run e2e:purge.';
