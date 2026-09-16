-- ============================================================================
-- An owner can read their own store credit.
--
-- `store_credit_entries` is the real ledger — `record_payment` spends from it
-- and a refund to store credit writes into it — and its read policy admits a
-- platform admin or staff holding `financial_view_amounts`. It has NO owner
-- arm, so the person whose money it is cannot see it. Meanwhile
-- /customer/wallet, which is in the customer sidebar, renders
-- `customerWallets` at a hardcoded `MOCK_CLIENT_ID = 15`: every signed-in
-- owner is shown one fixture client's balance, history and gift cards as their
-- own. Both halves of that are fixed together.
--
-- ── WHY A FUNCTION AND NOT AN ARM ON THE POLICY ───────────────────────────
--
-- Widening `store_credit_read` with `client_id in (select
-- private.own_client_ids())` — the shape `gift_cards_read` already uses —
-- would hand the customer the whole ROW, including `note` and `author_name`.
-- Those are staff writing about a customer, to other staff ("comped after the
-- kennel mix-up"), and the ledger is not the place to discover that the note
-- is readable. A DEFINER projection returns the money and withholds the
-- commentary, the same way `facility_branding_by_slug` deliberately omits
-- support_email.
--
-- Signed out, `private.own_client_ids()` returns no rows, so both functions
-- answer empty rather than refusing — there is nothing to distinguish and
-- nothing to probe.
-- ============================================================================

create or replace function public.my_store_credit()
returns table (
  facility_id uuid,
  facility_name text,
  balance numeric,
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
         count(*)::bigint,
         max(e.created_at)
    from public.store_credit_entries e
    join public.facilities f on f.id = e.facility_id
   where e.client_id in (select private.own_client_ids())
   group by e.facility_id, f.name
   order by max(e.created_at) desc;
$$;

-- The owner's own movements. `note` and `author_name` are deliberately absent;
-- see the header.
create or replace function public.my_store_credit_entries(
  p_facility_id uuid default null,
  p_limit integer default 100
)
returns table (
  id uuid,
  facility_id uuid,
  amount numeric,
  reason text,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select e.id, e.facility_id, e.amount, e.reason, e.created_at
    from public.store_credit_entries e
   where e.client_id in (select private.own_client_ids())
     and (p_facility_id is null or e.facility_id = p_facility_id)
   order by e.created_at desc
   limit least(greatest(coalesce(p_limit, 100), 1), 500);
$$;

-- Grants: `from public` and `from anon` are DIFFERENT grants and both are
-- needed — see 20260822610000, which exists because the first attempt named
-- only one of them.
do $grants$
declare
  fn text;
begin
  foreach fn in array array[
    'public.my_store_credit()',
    'public.my_store_credit_entries(uuid, integer)'
  ] loop
    execute format('revoke all on function %s from public', fn);
    execute format('revoke all on function %s from anon', fn);
    execute format('grant execute on function %s to authenticated', fn);
  end loop;
end
$grants$;

-- A revoke naming a privilege the role does not hold succeeds silently and
-- looks identical to one that worked. Assert it.
do $check$
begin
  if has_function_privilege('anon', 'public.my_store_credit()', 'execute') then
    raise exception 'anon can still execute my_store_credit()';
  end if;
  if has_function_privilege('anon', 'public.my_store_credit_entries(uuid, integer)', 'execute') then
    raise exception 'anon can still execute my_store_credit_entries()';
  end if;
  if not has_function_privilege('authenticated', 'public.my_store_credit()', 'execute') then
    raise exception 'authenticated cannot execute my_store_credit()';
  end if;
  if not has_function_privilege('authenticated', 'public.my_store_credit_entries(uuid, integer)', 'execute') then
    raise exception 'authenticated cannot execute my_store_credit_entries()';
  end if;
end
$check$;
