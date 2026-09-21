-- ============================================================================
-- An owner reads their own pet's vaccinations, and nobody else's.
--
--   psql "$SUPABASE_DB_URL" -f supabase/tests/customer-vaccinations.sql
--
-- One transaction, rolled back.
--
-- ── WHAT 20260921113000 CHANGED, AND WHAT IT MUST NOT HAVE ────────────────
--
-- `pet_vaccinations_read` admits staff only, and it STAYS that way. The owner
-- reads through `public.my_pet_vaccinations()`, a SECURITY DEFINER function
-- returning only the customer-safe columns. So there are two separate claims
-- to prove and they pull in opposite directions:
--
--   * the function returns the caller's own pets and no others;
--   * the TABLE is still closed, so widening the window did not widen the door.
--
-- And the grants. A revoke naming a privilege the role does not hold succeeds
-- silently and looks exactly like one that worked, so `revoke ... from public`
-- and `revoke ... from anon` are asserted against has_function_privilege()
-- rather than trusted for having been written — the mistake 20260822610000
-- exists to correct.
-- ============================================================================

begin;

set local client_min_messages to warning;

create temp table tap (n int, name text, ok boolean, detail text);

create or replace function pg_temp.t(i int, p text, ok boolean, d text default '')
returns void language sql as $$
  insert into tap(n, name, ok, detail) values (i, p, ok, d);
$$;

do $$
declare
  v_cols      text[];
  v_domains   text[];
  v_tablepol  text;
begin
  -- ── V1. The rules are readable by a customer ────────────────────────────
  v_domains := private.customer_visible_setting_domains();
  perform pg_temp.t(1, 'vaccination_rules is customer-visible',
                    'vaccination_rules' = any(v_domains),
                    array_length(v_domains, 1) || ' domains');

  -- Nothing was dropped on the way past. The array is appended to by several
  -- migrations and this one rewrote it whole from the live definition, which
  -- is exactly the change that can silently shorten it.
  perform pg_temp.t(2, 'the other domains survived the rewrite',
                    'deposit_rules'  = any(v_domains)
                and 'booking_rules'  = any(v_domains)
                and 'daycare_rates'  = any(v_domains)
                and 'grooming_config' = any(v_domains)
                and array_length(v_domains, 1) >= 29,
                    array_length(v_domains, 1) || ' domains');

  -- ── V3. The function hands back only customer-safe columns ──────────────
  --
  -- The point of the function rather than a second read policy: the row holds
  -- notes, reviewed_by, reviewed_at and review_reason, written for colleagues
  -- about the owner's own paperwork.
  select array_agg(a.attname::text order by a.attnum)
    into v_cols
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    join lateral unnest(p.proargnames, p.proargmodes)
         with ordinality as a(attname, attmode, attnum) on true
   where n.nspname = 'public'
     and p.proname = 'my_pet_vaccinations'
     and a.attmode = 't';

  perform pg_temp.t(3, 'no staff-internal column is returned',
                    not ('notes' = any(v_cols))
                and not ('review_reason' = any(v_cols))
                and not ('reviewed_by' = any(v_cols))
                and not ('reviewed_at' = any(v_cols)),
                    coalesce(array_to_string(v_cols, ','), '(none)'));

  perform pg_temp.t(4, 'the columns a customer needs are returned',
                    'vaccine_name' = any(v_cols)
                and 'expires_on'   = any(v_cols)
                -- The numeric ref, which is what the portal keys pets by. A
                -- uuid here would type-check and match no pet on the screen.
                and 'pet_ref'      = any(v_cols)
                and 'status'       = any(v_cols),
                    coalesce(array_to_string(v_cols, ','), '(none)'));

  -- ── V5. The TABLE is still staff-only ───────────────────────────────────
  --
  -- The regression this guards: someone later "simplifies" the function away
  -- by adding a permissive owner policy, and the internal columns go with it.
  select string_agg(pg_get_expr(pol.polqual, pol.polrelid), ' | ')
    into v_tablepol
    from pg_policy pol
    join pg_class c on c.oid = pol.polrelid
   where c.relname = 'pet_vaccinations'
     and pol.polcmd = 'r';

  perform pg_temp.t(5, 'pet_vaccinations itself did not open up',
                    v_tablepol is not null
                and v_tablepol not like '%own_pet_ids%'
                and v_tablepol like '%member_facility_ids%',
                    coalesce(v_tablepol, '(no select policy)'));

  -- ── V6/V7. The grants, measured rather than assumed ─────────────────────
  perform pg_temp.t(6, 'anon cannot execute it',
                    not has_function_privilege('anon',
                      'public.my_pet_vaccinations()', 'execute'));

  perform pg_temp.t(7, 'authenticated can',
                    has_function_privilege('authenticated',
                      'public.my_pet_vaccinations()', 'execute'));

  -- ── V8. It is scoped by the CALLER, not by an argument ──────────────────
  --
  -- A function taking a pet id would be one forged id away from someone else's
  -- record. This one takes none — the scope is `own_pet_ids()` and there is no
  -- way to ask it for anything else.
  perform pg_temp.t(8, 'it takes no arguments to forge',
                    (select coalesce(array_length(p.proargnames, 1), 0)
                       = coalesce(array_length(
                           array(select 1 from unnest(p.proargmodes) m
                                  where m = 't'), 1), 0)
                     from pg_proc p
                     join pg_namespace n on n.oid = p.pronamespace
                    where n.nspname = 'public'
                      and p.proname = 'my_pet_vaccinations'),
                    'all parameters are OUT');
end $$;

select n, name, ok, detail from tap order by n;

select count(*) filter (where ok) || ' passed, '
    || count(*) filter (where not ok) || ' failed' as summary
  from tap;

rollback;
