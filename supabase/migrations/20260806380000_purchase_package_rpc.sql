-- ============================================================================
-- Selling a package: one call, one transaction.
--
-- ── WHY THIS IS AN RPC WHEN THE CATALOGUE EDIT IS NOT ─────────────────────
--
-- Editing a bundle in the catalogue is delete-then-insert across two PostgREST
-- requests, and that was accepted (20260806320000's route header) because a
-- half-applied edit is visible on the screen that made it.
--
-- A purchase is not that. Its two writes are "the customer paid" and "the
-- customer has passes". If the first lands and the second does not, the
-- database holds a paid package with no passes in it — money taken for
-- nothing, and nothing on any screen says so. `customer_package_status` would
-- report it exhausted, which is the most misleading answer available: a
-- package that was never filled looks exactly like one that was used up.
--
-- So the two writes are one statement, and the rule stays the same one applied
-- to `record_payment`: an RPC where a partial write is money.
--
-- ── THE TERMS ARE READ FROM THE CATALOGUE, NEVER FROM THE CALLER ──────────
--
-- The caller names a client and a package. It does not get to say what the
-- package is called, what it costs, how long it lasts, or what is in it —
-- those come from the `prepaid_packages` row inside the transaction. A price
-- posted by a browser is a price the browser chose.
--
-- They are COPIED, not referenced. Repricing or re-bundling the package
-- tomorrow must not change what somebody already bought — which is why
-- `customer_packages` carries `package_name` and `price_paid` at all, and why
-- the pools are their own rows rather than a join back to the catalogue.
--
-- SECURITY INVOKER: the caller's RLS decides whether they may sell a package
-- at this facility. A DEFINER function here would be a way to sell packages at
-- facilities you cannot see.
-- ============================================================================

create or replace function public.purchase_package(
  p_client_id uuid,
  p_package_id uuid,
  p_price_override numeric default null
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_pkg    record;
  v_client uuid;
  v_cp     uuid;
begin
  select p.id, p.facility_id, p.name, p.package_price, p.validity_days, p.status
    into v_pkg
    from public.prepaid_packages p
   where p.id = p_package_id;

  if v_pkg.id is null then
    raise exception 'That package does not exist, or is not yours.'
      using errcode = 'no_data_found';
  end if;

  -- A retired package can still be honoured for someone who already owns one;
  -- it cannot be sold again.
  if v_pkg.status <> 'active' and v_pkg.status <> 'seasonal' then
    raise exception 'That package is not on sale.' using errcode = '23514';
  end if;

  select c.id into v_client
    from public.clients c
   where c.id = p_client_id and c.facility_id = v_pkg.facility_id;

  if v_client is null then
    raise exception 'That client is not at this facility.'
      using errcode = 'no_data_found';
  end if;

  if not exists (select 1 from public.prepaid_package_lines l
                  where l.package_id = v_pkg.id) then
    raise exception 'That package has nothing in it.' using errcode = '23514';
  end if;

  -- A negative override would be a refund wearing a purchase's clothes.
  if p_price_override is not null and p_price_override < 0 then
    raise exception 'A package cannot be sold for less than nothing.'
      using errcode = '23514';
  end if;

  insert into public.customer_packages
    (facility_id, client_id, package_id, package_name, price_paid,
     purchased_at, expires_at)
  values
    (v_pkg.facility_id, v_client, v_pkg.id, v_pkg.name,
     coalesce(p_price_override, v_pkg.package_price),
     now(), now() + make_interval(days => v_pkg.validity_days))
  returning id into v_cp;

  insert into public.customer_package_lines
    (customer_package_id, service_id, service_name, passes_total)
  select v_cp, l.service_id, l.service_name, l.quantity
    from public.prepaid_package_lines l
   where l.package_id = v_pkg.id;

  return v_cp;
end;
$$;

revoke all on function public.purchase_package(uuid, uuid, numeric) from public;
grant execute on function public.purchase_package(uuid, uuid, numeric)
  to authenticated;

comment on function public.purchase_package(uuid, uuid, numeric) is
  'Sells a prepaid package to a client. Name, price, validity and pools are '
  'copied from the catalogue row inside the transaction, never taken from the '
  'caller. p_price_override exists for a negotiated price and is still a '
  'snapshot. Both writes or neither.';
