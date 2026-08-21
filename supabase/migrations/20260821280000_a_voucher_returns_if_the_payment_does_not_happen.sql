-- ============================================================================
-- Giving a reward back when the payment it was spent on never happened.
--
-- ── THE WINDOW THIS CLOSES ────────────────────────────────────────────────
--
-- Checkout consumes the voucher FIRST and charges second, which is the right
-- way round: the alternative is charging a discounted total and then finding
-- the reward was already spent, which takes money off a bill for nothing.
--
-- But it leaves a window. If the charge then fails — a declined card, a
-- terminal the customer walks away from — the voucher is spent and no money
-- moved. The customer retries and is charged full price, holding a reward the
-- system has already eaten.
--
-- `release_loyalty_voucher` is the undo. It moves a `used` voucher back to
-- `active` and forgets when and where it was spent.
--
-- ── IT ONLY UNDOES A CONSUME, NEVER AN EXPIRY OR A CANCELLATION ───────────
--
-- The WHERE clause matches `status = 'used'` and nothing else. A voucher that
-- expired must not come back to life because a payment failed near it, and a
-- cancelled one was cancelled deliberately. Releasing something that is already
-- active is silently fine — a retry of the release is not an error.
--
-- Expiry is deliberately NOT re-checked here: a reward that expired in the
-- seconds between being spent and the payment failing should return to the
-- customer's hands, and `expires_at` will exclude it from the next checkout on
-- its own. Refusing here would swallow it instead.
-- ============================================================================
create or replace function public.release_loyalty_voucher(
  p_voucher_id uuid
)
returns public.loyalty_vouchers
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  v_facility uuid;
  v_voucher  public.loyalty_vouchers;
begin
  select v.facility_id into v_facility
    from public.loyalty_vouchers v
   where v.id = p_voucher_id;

  if v_facility is null then
    raise exception 'That reward does not exist.' using errcode = 'P0002';
  end if;

  -- The same pair that may spend one. Whoever can take the payment can undo
  -- the reward the failed payment consumed.
  if not (private.has_permission(v_facility, 'take_payment')
          or private.has_permission(v_facility, 'marketing_manage_loyalty')) then
    raise exception 'You do not have permission to return a reward.'
      using errcode = '42501';
  end if;

  update public.loyalty_vouchers v
     set status             = 'active',
         used_at            = null,
         used_on_booking_id = null
   where v.id = p_voucher_id
     and v.status = 'used'
  returning * into v_voucher;

  -- Nothing matched: it was already active, or expired, or cancelled. None of
  -- those is a failure to report — the caller wanted the customer to be holding
  -- their reward, and in every one of those cases the caller is not the reason
  -- they are not.
  if v_voucher.id is null then
    select * into v_voucher from public.loyalty_vouchers where id = p_voucher_id;
  end if;

  return v_voucher;
end;
$fn$;

comment on function public.release_loyalty_voucher(uuid) is
  'Return a voucher consumed for a payment that then failed. Only undoes `used` — never an expiry or a cancellation — and is safe to call twice.';

revoke all on function public.release_loyalty_voucher(uuid) from public, anon;
grant execute on function public.release_loyalty_voucher(uuid) to authenticated, service_role;
