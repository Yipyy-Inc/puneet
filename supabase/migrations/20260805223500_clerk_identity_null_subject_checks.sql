-- ============================================================================
-- The remaining 9 functions: the null-subject checks.
--
-- Finishes 20260805223000_clerk_identity_is_text.sql. Without this the database
-- is half-migrated — the policies read auth.jwt()->>'sub' but these still call
-- auth.uid(), which now RAISES 22P02 for a Clerk subject instead of returning
-- null. Every write passing through one of the seven triggers would fail.
--
-- WHY THIS IS A PROGRAMMATIC REWRITE AND NOT NINE HAND-WRITTEN BODIES.
-- All nine contain exactly one occurrence, in exactly one form:
--
--     if (select auth.uid()) is null then
--
-- and none declares a uuid variable from it (verified against pg_proc before
-- writing this). So a textual substitution is total, and it PRESERVES THE
-- STRUCTURE — which is what matters here, because the structure IS the security
-- boundary:
--
--   7 TRIGGERS  → `... then return new;`   a service_role BYPASS. Correct:
--                 a trigger only fires on a write that already cleared RLS, so
--                 a missing subject really does mean service_role, and the
--                 early return is how a seed inserts a catalogue without
--                 tripping its own rules.
--   2 RPCs      → `... then raise ...;`    a REFUSAL. Also correct: an RPC is a
--                 front door reachable by anon at /rest/v1/rpc/<name>, where the
--                 same carve-out would admit the internet. This project has
--                 shipped that bug twice; see docs/quality/debt-map.md.
--
-- Hand-transcribing nine long plpgsql bodies to change one line each is exactly
-- where a `return new` gets typed into an RPC. Substitution cannot make that
-- mistake. The distinction is then ASSERTED, not assumed, by V1/V2 of
-- supabase/tests/rpc-session-required.sql.
--
-- `create or replace` preserves ownership and ACL, so the anon revokes from
-- 20260805210403 survive — re-checked by V7 after applying.
--
-- VERIFIED AFTER APPLYING (against the live project):
--   V1-V7  7 passed, 0 failed   — anon still refused, manager path still works
--   T1     service_role insert still takes the trigger bypass, no 22P02
--   Clerk subject resolves: 1 profile, 1 membership, has_permission() true
-- ============================================================================

do $$
declare
  r         record;
  new_def   text;
  rewritten int := 0;
begin
  for r in
    select p.oid, p.proname, pg_get_functiondef(p.oid) as def
      from pg_proc p
      join pg_namespace nsp on nsp.oid = p.pronamespace
     where nsp.nspname in ('public', 'private')
       and p.prokind = 'f'
       and pg_get_functiondef(p.oid) like '%(select auth.uid())%'
  loop
    new_def := replace(r.def,
                       '(select auth.uid())',
                       '(select auth.jwt()->>''sub'')');
    execute new_def;
    rewritten := rewritten + 1;
  end loop;

  -- A count that drifts means the catalog is not what this migration was
  -- written against. Fail rather than leave the checks in a mixed state, where
  -- some functions refuse a Clerk caller and others raise on them.
  if rewritten <> 9 then
    raise exception
      'Expected to rewrite 9 functions, rewrote %. Aborting rather than leaving '
      'the null-subject checks in a mixed state.', rewritten;
  end if;

  raise notice 'rewrote % null-subject checks', rewritten;
end $$;

-- Nothing may still resolve identity through the uuid cast.
do $$
declare leftover text;
begin
  select string_agg(p.proname, ', ' order by p.proname) into leftover
    from pg_proc p join pg_namespace nsp on nsp.oid = p.pronamespace
   where nsp.nspname in ('public', 'private') and p.prokind = 'f'
     and pg_get_functiondef(p.oid) like '%auth.uid()%'
     and pg_get_functiondef(p.oid) not like '%-- %auth.uid()%';
  if leftover is not null then
    raise exception 'Functions still calling auth.uid(): %', leftover;
  end if;
end $$;
