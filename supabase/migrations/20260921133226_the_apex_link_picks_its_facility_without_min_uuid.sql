-- ============================================================================
-- `link_my_client_record()` COULD NOT RUN AT ALL.
--
-- 20260921121320 picked the matching facility with
--
--   select count(*), min(c.facility_id) into v_matches, v_facility
--
-- and Postgres has no `min()` for uuid. So every call raised
-- `function min(uuid) does not exist`, and `/api/clients/me` answered 500 on
-- the apex — worse than the 404 it was written to replace.
--
-- ── WHAT LET IT THROUGH, WHICH IS THE PART WORTH KEEPING ──────────────────
--
-- `supabase/tests/apex-client-link.sql` passed against it. Every assertion in
-- that file read the function's SOURCE with `pg_get_functiondef` and matched
-- patterns like `%v_matches <> 1%`, because `auth.jwt()` is null inside the
-- test transaction and calling it seemed impossible. A test that reads code
-- rather than running it confirms the code says what you wrote, which is the
-- one thing that was never in doubt.
--
-- It was caught by `tests/e2e/customer-apex-link.spec.ts` — a spec written for
-- the route's wiring, run for the first time against a real build.
--
-- The test now SETS `request.jwt.claims` with `set local` and calls the
-- function for real, and the broken version was re-applied to prove the
-- rewritten test fails against it before this correction was restored.
--
-- The count and the pick are two statements. One `select` cannot do both here,
-- and pretending otherwise is what produced a function that never ran.
-- ============================================================================

create or replace function public.link_my_client_record()
returns uuid
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  v_user_id  text := (select auth.jwt()->>'sub');
  v_email    text;
  v_existing uuid;
  v_facility uuid;
  v_matches  integer;
begin
  if v_user_id is null then
    return null;
  end if;

  select p.email into v_email
    from public.profiles p
   where p.id = v_user_id;
  if v_email is null then
    return null;
  end if;

  select c.id into v_existing
    from public.clients c
   where c.profile_id = v_user_id
   order by c.ref
   limit 1;
  if v_existing is not null then
    return v_existing;
  end if;

  select count(*) into v_matches
    from public.clients c
   where lower(c.email) = lower(v_email)
     and c.profile_id is null;

  if v_matches <> 1 then
    return null;
  end if;

  -- The one match. NOT `min(c.facility_id)` in the count query above: there is
  -- no min() for uuid, and the function raised "function min(uuid) does not
  -- exist" at runtime while a test that only read its SOURCE passed.
  select c.facility_id into v_facility
    from public.clients c
   where lower(c.email) = lower(v_email)
     and c.profile_id is null
   limit 1;

  return private.link_client_at(v_facility);
end;
$fn$;
