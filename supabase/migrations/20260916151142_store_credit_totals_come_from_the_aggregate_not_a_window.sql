-- ============================================================================
-- `my_store_credit()` also returns what went IN and what went OUT.
--
-- The wallet shows three numbers: the balance, total received and total spent.
-- The balance came from this function; the other two were being summed in the
-- browser from `my_store_credit_entries()`, which is a WINDOW — the most recent
-- 200. The e2e client has 465 entries, so "Total received" would have been the
-- sum of the last 200 presented as the sum of all of them: understated, with
-- nothing on screen saying so.
--
-- A total is an aggregate fact, so it is computed where the other aggregate
-- facts are, over every row rather than over a page of them.
--
-- Dropped and recreated rather than replaced: Postgres refuses to change the
-- row type defined by OUT parameters. Nothing calls it yet — it shipped hours
-- ago in the migration above and the wallet lands in the same change — so there
-- is no window in which a caller sees the old shape.
-- ============================================================================

drop function if exists public.my_store_credit();

create function public.my_store_credit()
returns table (
  facility_id uuid,
  facility_name text,
  balance numeric,
  total_in numeric,
  total_out numeric,
  entry_count bigint,
  last_activity_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select e.facility_id,
         f.name,
         sum(e.amount)::numeric,
         coalesce(sum(e.amount) filter (where e.amount > 0), 0)::numeric,
         coalesce(abs(sum(e.amount) filter (where e.amount < 0)), 0)::numeric,
         count(*)::bigint,
         max(e.created_at)
    from public.store_credit_entries e
    join public.facilities f on f.id = e.facility_id
   where e.client_id in (select private.own_client_ids())
   group by e.facility_id, f.name
   order by max(e.created_at) desc;
$$;

-- A recreated function starts with default grants, so these are restated, not
-- assumed. `from public` and `from anon` are different grants and both matter.
do $grants$
begin
  execute 'revoke all on function public.my_store_credit() from public';
  execute 'revoke all on function public.my_store_credit() from anon';
  execute 'grant execute on function public.my_store_credit() to authenticated';
end
$grants$;

do $check$
begin
  if has_function_privilege('anon', 'public.my_store_credit()', 'execute') then
    raise exception 'anon can still execute my_store_credit()';
  end if;
  if not has_function_privilege('authenticated', 'public.my_store_credit()', 'execute') then
    raise exception 'authenticated cannot execute my_store_credit()';
  end if;
end
$check$;
