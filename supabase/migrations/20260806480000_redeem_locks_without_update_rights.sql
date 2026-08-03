-- ============================================================================
-- Redeeming stops requiring the right to EDIT the purchase.
--
-- ── THE BUG, AND WHY IT IS WORSE THAN AN ERROR ────────────────────────────
--
-- `redeem_package_pass` opened with:
--
--   select cp.facility_id, cp.expires_at into ... from customer_packages cp
--    where cp.id = p_customer_package_id for update;
--
-- `for update` is a row lock, and under RLS Postgres applies the table's
-- UPDATE policy when locking rows — not just the SELECT policy. The only
-- UPDATE policy on `customer_packages` requires `financial_take_payment`.
--
-- A customer has no such permission, so the moment the portal's "Book with
-- Pass" was pointed at this function it stopped working. Measured rather than
-- reasoned about, as the same customer, in one transaction:
--
--   select count(*) ... where id = X              -> 1
--   select count(*) ... where id = X for update   -> 0, and NO ERROR
--
-- That silence is the dangerous part. The locking read does not raise
-- `insufficient_privilege`; it quietly returns nothing, `v_facility` comes back
-- null, and the function raises its own "That package does not exist, or is
-- not yours." — about a package that is unambiguously theirs. Anyone reading
-- that message would go looking at ownership, which is the one thing that was
-- fine.
--
-- ── WHAT REPLACES IT, AND WHAT IT KEEPS ───────────────────────────────────
--
-- A transaction-scoped advisory lock on the package id. The guarantee that
-- matters is unchanged: two tills redeeming the SAME package serialise, so the
-- second waits and then reads a balance that already reflects the first. That
-- is what stops the last pass being spent twice, and P5 asserts it.
--
-- What is given up: `hashtext` collisions mean two different packages can share
-- a lock key and briefly serialise against each other. Harmless — the section
-- being serialised is three statements long — and far cheaper than the
-- alternatives:
--
--   Grant customers UPDATE on `customer_packages`, so the row lock works.
--     That is the right to rewrite a purchase — its price, its expiry — handed
--     over to fix a lock. No.
--
--   Make the function SECURITY DEFINER. It would run as the owner, the lock
--     would work, and every caller's RLS would stop applying to everything the
--     function touches. The rule this schema has followed throughout is
--     INVOKER for atomicity, never DEFINER for convenience.
--
-- The advisory lock is taken FIRST, before the existence check, so two callers
-- cannot both pass the check before either writes.
-- ============================================================================

create or replace function public.redeem_package_pass(
  p_customer_package_id uuid,
  p_service_id text,
  p_service_label text default '',
  p_booking_id uuid default null,
  p_pet_id uuid default null,
  p_pet_name text default null
)
returns integer
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_facility uuid;
  v_expires timestamptz;
  v_remaining integer;
begin
  -- Serialises concurrent redemptions of this package. Held to the end of the
  -- transaction; needs no privilege on the row, which is the whole point.
  perform pg_advisory_xact_lock(hashtext(p_customer_package_id::text));

  select cp.facility_id, cp.expires_at into v_facility, v_expires
    from public.customer_packages cp
   where cp.id = p_customer_package_id;

  if v_facility is null then
    raise exception 'That package does not exist, or is not yours.'
      using errcode = 'no_data_found';
  end if;
  if v_expires is not null and v_expires < now() then
    raise exception 'That package has expired.' using errcode = '23514';
  end if;

  select s.passes_remaining into v_remaining
    from public.customer_package_pool_status s
   where s.customer_package_id = p_customer_package_id
     and s.service_id = p_service_id;

  if v_remaining is null then
    raise exception 'That package does not include that service.'
      using errcode = '23514';
  end if;
  if v_remaining <= 0 then
    raise exception 'No passes left for that service.' using errcode = '23514';
  end if;

  insert into public.package_pass_entries
    (facility_id, customer_package_id, service_id, passes, reason,
     booking_id, pet_id, pet_name, service_label)
  values
    (v_facility, p_customer_package_id, p_service_id, -1, 'redeemed',
     p_booking_id, p_pet_id, p_pet_name, coalesce(p_service_label, ''));

  return v_remaining - 1;
end;
$$;

revoke execute on function
  public.redeem_package_pass(uuid, text, text, uuid, uuid, text)
  from public, anon;
grant execute on function
  public.redeem_package_pass(uuid, text, text, uuid, uuid, text)
  to authenticated;
