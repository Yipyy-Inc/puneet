-- ============================================================================
-- Staff read the same cancellation terms the customer is shown.
--
-- ── WHY A SECOND WRAPPER ──────────────────────────────────────────────────
--
-- `public.my_booking_cancel_terms` is scoped to `private.own_client_ids()` —
-- it answers for the CALLER'S OWN bookings and returns null for anyone else's,
-- which is right for the customer portal and useless at the front desk.
--
-- So staff get their own door onto the SAME evaluator. Not a second
-- calculation: `private.cancellation_terms` is the only thing that turns a
-- policy into a figure, and the whole point of Phase 3 is that the counter and
-- the customer cannot be shown different numbers for the same cancellation.
--
-- ── THE PERMISSION IS `edit_bookings`, NOT A ROLE ─────────────────────────
--
-- Whoever may cancel a booking may see what cancelling it costs. Asking for
-- anything stricter would leave the person doing the work reading the terms
-- off a different screen, which is how two numbers start existing.
-- ============================================================================

create or replace function public.booking_cancel_terms(p_ref bigint)
returns jsonb
language plpgsql
stable
security definer
set search_path to ''
as $staff$
declare
  v_booking public.bookings;
begin
  select * into v_booking from public.bookings b where b.ref = p_ref;
  if not found then
    return null;
  end if;

  -- Not theirs to see and not real are the same answer, deliberately: a
  -- refusal that distinguishes them tells a stranger the booking exists.
  if not private.has_permission(v_booking.facility_id, 'edit_bookings') then
    return null;
  end if;

  return private.cancellation_terms(v_booking)
    || jsonb_build_object(
         'status', v_booking.status,
         'totalCost', coalesce(v_booking.total_cost, 0),
         'amountPaid', coalesce(v_booking.amount_paid, 0),
         'cancellable', v_booking.status in (
           'pending', 'request_submitted', 'estimate_sent',
           'waitlisted', 'confirmed', 'checked_in'));
end;
$staff$;

comment on function public.booking_cancel_terms(bigint) is
  'What a cancellation costs, for staff. The same evaluator the customer preview reads.';

-- `public`, `anon` and `authenticated` are three different grants; revoking
-- one leaves the others. Asserted in supabase/tests/cancellation-policy.sql,
-- because a revoke naming a privilege the role does not hold succeeds
-- silently and looks exactly like one that worked.
revoke all on function public.booking_cancel_terms(bigint) from public;
revoke all on function public.booking_cancel_terms(bigint) from anon;
grant execute on function public.booking_cancel_terms(bigint) to authenticated, service_role;
