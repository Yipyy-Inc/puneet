-- ============================================================================
-- Restore SECURITY DEFINER on the two booking payment derivations.
--
-- ── WHAT BROKE ────────────────────────────────────────────────────────────
--
-- `CREATE OR REPLACE FUNCTION` replaces the whole definition, and every
-- attribute not restated reverts to its default. 20260819210000 restated the
-- body, the language, the volatility and the search_path -- but not
-- `security definer`. Both functions silently became SECURITY INVOKER.
--
-- `authenticated` holds no EXECUTE on `private.booking_amount_paid`, so the
-- BEFORE trigger on `bookings` could no longer call it, and EVERY booking
-- update failed for every signed-in user:
--
--   permission denied for function booking_amount_paid
--
-- Check in, status change, edit — all of it, reported from the running app as
-- "you are not allowed to edit booking". It read like an RLS refusal, which is
-- what made it worth writing down: the message names a permission, and the
-- cause was a missing function attribute.
--
-- Their siblings show what they should have been all along:
-- `booking_extras_total` and `derive_booking_extras` are both definer.
--
-- ── THE RULE ──────────────────────────────────────────────────────────────
--
-- When replacing a function in this schema, restate `security definer` and
-- `set search_path to ''` every time. Neither is inherited. Compare against a
-- sibling in the same family before applying, and prove an ordinary write still
-- works as `authenticated` afterwards — a superuser never sees this failure.
-- ============================================================================

create or replace function private.booking_amount_paid(p_booking_id uuid)
returns numeric
language sql
stable
security definer
set search_path to ''
as $$
  select coalesce(sum(p.grand_total - p.tip - p.tax), 0)::numeric(10,2)
    from public.payments p
   where p.booking_id = p_booking_id;
$$;

create or replace function private.derive_booking_payment()
returns trigger
language plpgsql
security definer
set search_path to ''
as $$
declare
  v_due numeric(10,2) := greatest(
    0::numeric,
    new.total_cost + new.extras_total - coalesce(new.discount, 0)
  );
begin
  new.amount_paid := private.booking_amount_paid(new.id);

  new.payment_status := case
    when private.booking_was_refunded(new.id) and new.amount_paid <= 0
      then 'refunded'
    when new.amount_paid > 0 and new.amount_paid >= v_due
      then 'paid'
    else 'pending'
  end;

  return new;
end;
$$;
