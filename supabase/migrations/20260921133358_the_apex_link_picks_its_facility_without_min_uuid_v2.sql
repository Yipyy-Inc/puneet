-- ============================================================================
-- Restoring the corrected function after the negative control.
--
-- 20260921133226 fixed `min(uuid)`. Proving that the REWRITTEN SQL test would
-- have caught it meant putting the broken body back for one run — through
-- `execute_sql`, so no migration recorded it — and watching
-- supabase/tests/apex-client-link.sql fail with `function min(uuid) does not
-- exist` where the source-reading version had passed.
--
-- This restores the correction. The body is identical to 20260921133226 and
-- `create or replace` is idempotent, so replaying both in order is the same as
-- replaying either — it exists because the migration was really applied twice
-- and the files name the versions the database recorded.
--
-- The lesson is in 133226's header: assert behaviour, not source.
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
