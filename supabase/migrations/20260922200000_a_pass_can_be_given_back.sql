-- ============================================================================
-- Giving a pass back.
--
-- ── WHY THIS DID NOT EXIST ────────────────────────────────────────────────
--
-- `redeem_package_pass` appends -1 and there has never been a way to undo it.
-- The ledger was always ready for one: `package_pass_entries.reason` admits
-- 'reversed', a CHECK forces `passes > 0` for it, and
-- `customer_package_pool_status` sums the entries — so a +1 restores the
-- balance with nothing else to update.
--
-- What was missing is the LINK. Measured 2026-09-22: 25 redeemed entries, and
-- `booking_id` null on every one. The column exists and `redeem_package_pass`
-- takes the parameter; the three call sites simply never passed it, so the
-- ledger could not say which booking spent which pass and "give that one back"
-- had no subject. That is fixed in the same change as this.
--
-- ── IT CAN NEVER MINT A PASS ──────────────────────────────────────────────
--
-- The guard is a count, not a flag: a booking may be reversed only while it
-- has more 'redeemed' entries than 'reversed' ones. So a second call gives
-- nothing back, which makes cancelling twice — or a retried request — safe by
-- construction rather than by the caller remembering.
--
-- ── NOT SECURITY DEFINER, ON PURPOSE ──────────────────────────────────────
--
-- Like `redeem_package_pass`, this runs as the caller, and RLS already draws
-- the right line: `package_pass_entries_redeem_own` lets a CUSTOMER insert
-- only `reason = 'redeemed'` with `passes = -1`, while
-- `package_pass_entries_insert` requires `financial_take_payment` for anything
-- else. So a customer cannot hand themselves a pass back, and no new policy is
-- needed to say so.
-- ============================================================================

create or replace function public.reverse_package_pass(
  p_ref bigint,
  p_note text default ''
)
returns integer
language plpgsql
set search_path to ''
as $reverse$
declare
  v_booking   uuid;
  v_entry     public.package_pass_entries;
  v_redeemed  integer;
  v_reversed  integer;
  v_remaining integer;
begin
  select b.id into v_booking from public.bookings b where b.ref = p_ref;
  if v_booking is null then
    raise exception 'No such booking.' using errcode = 'P0002';
  end if;

  -- The pass this booking spent. Newest first, because a booking that somehow
  -- spent two gives back the most recent one first.
  select e.* into v_entry
    from public.package_pass_entries e
   where e.booking_id = v_booking
     and e.reason = 'redeemed'
   order by e.created_at desc
   limit 1;

  -- Nothing was spent on this booking, so there is nothing to return. Null
  -- rather than an exception: "this booking used no pass" is an ordinary
  -- answer at a cancellation, not a failure.
  if not found then
    return null;
  end if;

  perform pg_advisory_xact_lock(hashtext(v_entry.customer_package_id::text));

  select
    count(*) filter (where e.reason = 'redeemed'),
    count(*) filter (where e.reason = 'reversed')
    into v_redeemed, v_reversed
    from public.package_pass_entries e
   where e.booking_id = v_booking
     and e.service_id = v_entry.service_id
     and e.customer_package_id = v_entry.customer_package_id;

  -- Already given back. Idempotent by counting, so a repeated cancel, a
  -- retried request and a double click all do the same nothing.
  if v_reversed >= v_redeemed then
    return null;
  end if;

  insert into public.package_pass_entries
    (facility_id, customer_package_id, service_id, passes, reason,
     booking_id, pet_id, pet_name, service_label, note)
  values
    (v_entry.facility_id, v_entry.customer_package_id, v_entry.service_id,
     1, 'reversed', v_booking, v_entry.pet_id, v_entry.pet_name,
     v_entry.service_label, left(coalesce(p_note, ''), 500));

  select s.passes_remaining into v_remaining
    from public.customer_package_pool_status s
   where s.customer_package_id = v_entry.customer_package_id
     and s.service_id = v_entry.service_id;

  return v_remaining;
end;
$reverse$;

comment on function public.reverse_package_pass(bigint, text) is
  'Give back the pass a booking spent. Null when it spent none, or when one was already returned.';

-- `public`, `anon` and `authenticated` are three different grants; revoking
-- one leaves the others. Asserted in supabase/tests/package-pass-reverse.sql,
-- because a revoke naming a privilege the role does not hold succeeds silently
-- and looks exactly like one that worked.
revoke all on function public.reverse_package_pass(bigint, text) from public;
revoke all on function public.reverse_package_pass(bigint, text) from anon;
grant execute on function public.reverse_package_pass(bigint, text) to authenticated, service_role;
