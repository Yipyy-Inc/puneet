-- ============================================================================
-- public.purge_e2e_forms() — see the migration
-- 20260920122748_the_suite_takes_its_forms_back_out.sql
--
--   bun run test:sql purge-e2e-forms
--
-- One transaction, rolled back. It builds its own forms on the demo facility
-- and asserts against those, so it never depends on what the suite has left
-- lying around — which is the very thing the function exists to remove.
--
-- ── WHAT THIS FILE IS ABOUT ────────────────────────────────────────────────
--
-- T1  A form the suite made is removed, and the answers filled in against it
--     go with it. This is the case a plain DELETE cannot do: `form_submissions`
--     points at `form_versions` ON DELETE RESTRICT, so the answers must go
--     first. Run as a negative control before the function existed:
--       ERROR: ... violates foreign key constraint
--              "form_submissions_form_version_id_fkey"
-- T2  THE ONE THAT MATTERS. A facility's own form is untouched — its row, its
--     version and its submission all survive. A purge that cannot tell the
--     suite's rows from a customer's is worse than no purge.
-- T3  The number returned counts FORMS, not submissions, so `e2e:purge` cannot
--     report a reassuring figure it did not earn.
-- T4  The grants. `revoke from public` and `revoke from anon` are different
--     grants and a function is reachable through either, so both are asserted
--     against has_function_privilege() rather than trusted for having been
--     written in the migration.
-- ============================================================================

begin;

set local client_min_messages to warning;

create temp table tap (n serial, name text, ok boolean, detail text);

create or replace function pg_temp.t(p_name text, p_ok boolean, p_detail text default '')
returns void language sql as $$
  insert into tap(name, ok, detail) values (p_name, p_ok, p_detail);
$$;

do $$
declare
  v_facility  uuid := 'a0000000-0000-4000-8000-0000000000f1';
  v_marked    uuid;
  v_own       uuid;
  v_mver      uuid;
  v_over      uuid;
  v_msub      uuid;
  v_osub      uuid;
  v_returned  integer;
  v_before    integer;
  v_after     integer;
  v_stamp     text := to_char(clock_timestamp(), 'YYYYMMDDHH24MISSUS');
begin
  -- A form the suite would have made, with a version and an answered copy.
  insert into public.forms (facility_id, name, slug)
       values (v_facility, '[e2e] purge probe ' || v_stamp, 'e2e-purge-probe-' || v_stamp)
    returning id into v_marked;
  insert into public.form_versions (form_id, facility_id, version_number)
       values (v_marked, v_facility, 1)
    returning id into v_mver;
  insert into public.form_submissions (facility_id, form_version_id)
       values (v_facility, v_mver)
    returning id into v_msub;

  -- A form the FACILITY made, shaped identically but without the marker.
  insert into public.forms (facility_id, name, slug)
       values (v_facility, 'Boarding intake ' || v_stamp, 'boarding-intake-' || v_stamp)
    returning id into v_own;
  insert into public.form_versions (form_id, facility_id, version_number)
       values (v_own, v_facility, 1)
    returning id into v_over;
  insert into public.form_submissions (facility_id, form_version_id)
       values (v_facility, v_over)
    returning id into v_osub;

  -- Counted before and after, so T3 can assert the RETURN VALUE rather than
  -- restate it. The probe form above guarantees this is at least 1.
  select count(*) into v_before from public.forms where name like '[e2e]%';

  v_returned := public.purge_e2e_forms();

  select count(*) into v_after from public.forms where name like '[e2e]%';

  perform pg_temp.t(
    'T1 a marked form and its answers are gone',
    not exists (select 1 from public.forms            where id = v_marked)
      and not exists (select 1 from public.form_versions    where id = v_mver)
      and not exists (select 1 from public.form_submissions where id = v_msub),
    format('form=%s version=%s submission=%s',
      exists (select 1 from public.forms            where id = v_marked),
      exists (select 1 from public.form_versions    where id = v_mver),
      exists (select 1 from public.form_submissions where id = v_msub)));

  perform pg_temp.t(
    'T2 the facility''s own form is untouched',
    exists (select 1 from public.forms            where id = v_own)
      and exists (select 1 from public.form_versions    where id = v_over)
      and exists (select 1 from public.form_submissions where id = v_osub),
    format('form=%s version=%s submission=%s',
      exists (select 1 from public.forms            where id = v_own),
      exists (select 1 from public.form_versions    where id = v_over),
      exists (select 1 from public.form_submissions where id = v_osub)));

  perform pg_temp.t(
    'T3 it returns the number of FORMS it removed, and leaves none',
    v_before >= 1 and v_returned = v_before and v_after = 0,
    format('before=%s returned=%s after=%s', v_before, v_returned, v_after));
exception when others then
  perform pg_temp.t('T1-T3 purge', false, sqlerrm);
end $$;

do $$
begin
  perform pg_temp.t(
    'T4 only the service role may run it',
    not has_function_privilege('anon',          'public.purge_e2e_forms()', 'execute')
      and not has_function_privilege('authenticated', 'public.purge_e2e_forms()', 'execute')
      and has_function_privilege('service_role',      'public.purge_e2e_forms()', 'execute')
      and 0 = (select count(*) from information_schema.routine_privileges
                 where routine_schema = 'public'
                   and routine_name   = 'purge_e2e_forms'
                   and grantee        = 'PUBLIC'),
    format('anon=%s authenticated=%s service_role=%s',
      has_function_privilege('anon',          'public.purge_e2e_forms()', 'execute'),
      has_function_privilege('authenticated', 'public.purge_e2e_forms()', 'execute'),
      has_function_privilege('service_role',  'public.purge_e2e_forms()', 'execute')));
exception when others then
  perform pg_temp.t('T4 grants', false, sqlerrm);
end $$;

-- ── Report ──────────────────────────────────────────────────────────────────
select case when ok then '  PASS  ' else '> FAIL <' end as result, name, detail
  from tap order by n;

select count(*) filter (where ok) || ' passed, '
    || count(*) filter (where not ok) || ' failed' as summary
  from tap;

rollback;
