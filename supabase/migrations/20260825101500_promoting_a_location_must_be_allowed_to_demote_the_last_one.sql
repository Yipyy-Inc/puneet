-- ============================================================================
-- Promoting a location has to be allowed to demote the incumbent.
--
-- Fixes a bug in 20260825095825, found by driving it rather than reading it.
--
-- ── WHAT WENT WRONG ───────────────────────────────────────────────────────
--
-- `private.locations_single_primary()` does two jobs in one trigger:
--
--   1. naming a new primary demotes the incumbent;
--   2. demoting the LAST primary is refused, because facilityContext resolves
--      a facility's primary location on every request.
--
-- Job 1 performs an UPDATE which re-enters the same trigger, and job 2 then
-- runs against it. At that instant the promoted row has NOT been written — it
-- is still inside its own BEFORE trigger — so "is there another primary?" is
-- correctly false, and the guard refuses the demotion that the promotion
-- depends on:
--
--   ERROR: 23001: A facility must have a primary location.
--   CONTEXT: SQL statement "update public.locations set is_primary = false ..."
--            PL/pgSQL function private.locations_single_primary() line 4
--
-- So promoting a second location was impossible. The unique index and the
-- guard were each right; the two of them together admitted no legal order.
--
-- ── THE FIX, AND WHY IT IS A FLAG ─────────────────────────────────────────
--
-- The demotion issued BY the trigger is not the demotion the guard is about.
-- The guard exists to stop a person clearing the only primary and leaving the
-- facility without a default; it was never meant to police the trigger's own
-- bookkeeping. A transaction-local setting distinguishes the two, which is the
-- narrowest thing that can:
--
--   perform set_config('yipyy.locations_demoting', '1', true)
--
-- `true` is the is_local argument: the value dies with the transaction, so it
-- cannot leak into the next request on a pooled connection. It is cleared
-- immediately after anyway, and an exception rolls the whole statement back.
--
-- Deliberately NOT done: dropping the guard, or moving the demotion into an
-- AFTER trigger. AFTER does not work — the partial unique index is checked as
-- the row is written, so the promoted row collides with the still-primary
-- incumbent before any AFTER trigger could run, and Postgres has no deferrable
-- partial unique constraint to defer it with.
--
-- ── HOW IT WAS FOUND ──────────────────────────────────────────────────────
--
-- A probe inside an aborted transaction that promoted a second location, which
-- is the first thing the HQ screen will do. Reading the trigger did not reveal
-- it, and neither did applying the migration: it raised on USE, not on DDL.
-- ============================================================================

create or replace function private.locations_single_primary()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  -- Naming a new primary demotes the incumbent. The flag tells the recursive
  -- fire of this trigger that the demotion below is bookkeeping, not somebody
  -- clearing the last primary by hand.
  if new.is_primary then
    perform set_config('yipyy.locations_demoting', '1', true);
    update public.locations
       set is_primary = false, updated_at = now()
     where facility_id = new.facility_id
       and id <> new.id
       and is_primary;
    perform set_config('yipyy.locations_demoting', '', true);
    return new;
  end if;

  -- Demoting the last primary leaves the facility with no default, which
  -- facilityContext cannot resolve. Promote another one first.
  if tg_op = 'UPDATE'
     and old.is_primary
     and coalesce(current_setting('yipyy.locations_demoting', true), '') <> '1'
     and not exists (
       select 1 from public.locations l
        where l.facility_id = new.facility_id
          and l.id <> new.id
          and l.is_primary
     )
  then
    raise exception using
      errcode = 'restrict_violation',
      message = 'A facility must have a primary location.',
      hint = 'Make another location primary; the current one is demoted automatically.';
  end if;

  return new;
end;
$$;

revoke execute on function private.locations_single_primary() from public, anon;

do $$
begin
  if has_function_privilege('anon', 'private.locations_single_primary()', 'execute') then
    raise exception 'anon can still execute the primary-location guard';
  end if;
end;
$$;
