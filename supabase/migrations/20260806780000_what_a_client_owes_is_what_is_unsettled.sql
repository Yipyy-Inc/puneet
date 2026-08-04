-- ============================================================================
-- What a client owes is what their delivered bookings have not settled.
--
-- `clients.outstanding_balance` is a stored number nobody maintains. It is the
-- same defect as `bookings.payment_status` one level up, and now provably so,
-- because 20260806680000 gave every booking an `amount_paid` to check against:
--
--   client            stored    unsettled per the ledger
--   Alice Johnson      $0.00    $1,440.00
--   John Doe           $0.00    $1,005.00
--   Bob Smith         $75.00       $65.00
--
-- Six clients, about $2,695 between them on the loosest reading, and the column
-- says $75 — attributed to the one person whose real figure it also gets wrong.
--
-- It is not a cosmetic field. It is read by `ActiveCallPanel` and
-- `IncomingCallPanel` (shown to whoever answers the phone, mid-conversation),
-- by `lib/calling/routing-rules.ts` (calls are ROUTED on it), and by
-- `lib/facility-export.ts` (it goes into the GDPR Article 20 export, so a
-- customer can request a copy of a wrong statement about their own money).
--
-- ── DECISION 1: OUTSTANDING MEANS DELIVERED AND UNSETTLED ──────────────────
--
-- The definition decides the number, so it is written down rather than implied:
--
--   ready, completed     the service is finished and the bill is not settled.
--                        COUNTED.
--   checked_in,          the pet is on site and the service is under way.
--   in_progress          Not counted: payment is due at pickup, and a multi-
--                        night stay has not earned its total yet. Showing a
--                        balance for someone standing at the counter who has
--                        not been asked to pay is wrong.
--   confirmed, pending,  booked, not delivered. Not counted — this is the
--   estimate_sent,       difference between "you owe us" and "you have
--   waitlisted,          something coming up", which are two different
--   request_submitted    conversations.
--   no_show              NOT counted. A facility usually charges a no-show
--                        FEE, and the fee is not the booking price. Counting
--                        `total_cost` would overstate the debt on every one.
--   cancelled, declined  not owed.
--
-- On this database that is $150 across the facility, against $2,695 for the
-- loosest reading. The gap is entirely `confirmed` and `estimate_sent` — money
-- that has not been earned.
--
-- ── DECISION 2: MAINTAINED, NOT SUMMED AT READ TIME ────────────────────────
--
-- Every shipped preset that has `view_clients` also has `view_bookings`, so a
-- read-time aggregate would be correct today. That is a parity being RELIED ON
-- rather than enforced: the day the two come apart, the sum returns zero for
-- those callers and reports it as "nothing owed". Same failure mode the booking
-- derivation exists to avoid, and the same answer — a column, kept by trigger,
-- computed by a DEFINER function that sees every booking.
--
-- It also keeps five existing consumers working unchanged, and makes a client
-- LIST one column read rather than one aggregate per row.
--
-- ── NO PASS-THROUGH IS NEEDED HERE, AND THAT IS NOT AN OVERSIGHT ───────────
--
-- `bookings` needed one (20260806700000) because a cashier without
-- `edit_bookings` fell into the customer path and hit a RAISE.
-- `enforce_client_integrity` has no equivalent: for a caller without
-- `edit_clients` it RESTORES `outstanding_balance` rather than refusing, and
-- the derivation runs immediately afterwards and overwrites the restored value.
-- Nothing it can raise on is touched by a balance-only update.
--
-- Asserted in supabase/tests/client-balance-derivation.sql rather than assumed.
-- ============================================================================

-- ── What the bookings say this client owes ──────────────────────────────────
--
-- DEFINER for the reason in Decision 2, and granted to nobody: it answers "how
-- much does this person owe" without asking whether the caller may see their
-- bookings, which is exactly the question the policies are for.

create or replace function private.client_outstanding_balance(p_client_id uuid)
returns numeric
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(sum(b.total_cost - b.amount_paid), 0)::numeric(12,2)
    from public.bookings b
   where b.client_id = p_client_id
     and b.status in ('ready', 'completed')
     and b.total_cost > b.amount_paid;
$$;

revoke execute on function private.client_outstanding_balance(uuid) from public;
revoke execute on function private.client_outstanding_balance(uuid) from anon;
revoke execute on function private.client_outstanding_balance(uuid) from authenticated;

comment on function private.client_outstanding_balance is
  'Sum of what DELIVERED bookings have not settled: ready and completed only. See Decision 1 in 20260806780000 for why checked_in, confirmed and no_show are excluded.';

-- ── The derivation ──────────────────────────────────────────────────────────
--
-- Trigger order is by name, as everywhere else here:
--   clients_enforce_integrity → clients_set_derived_balance → clients_set_updated_at
-- 'e' < 's', and 'set_d' < 'set_u'.

create or replace function private.derive_client_balance()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.outstanding_balance := private.client_outstanding_balance(new.id);
  return new;
end;
$$;

comment on function private.derive_client_balance is
  'Overwrites clients.outstanding_balance from the bookings ledger. Runs for EVERY writer including service_role — there is no path that sets it by hand.';

drop trigger if exists clients_set_derived_balance on public.clients;
create trigger clients_set_derived_balance
  before insert or update on public.clients
  for each row execute function private.derive_client_balance();

-- ── A booking moves its client ──────────────────────────────────────────────
--
-- DEFINER, and it took two probes to find out why — the first answer was wrong.
--
-- Paying a booking does NOT need it: that path already runs inside
-- `payment_moves_the_booking`, which is DEFINER, so this trigger inherits
-- postgres and works either way. The case that needs it is a booking marked
-- COMPLETED by hand, with no payment anywhere in the chain. `supervisor` holds
-- `edit_bookings` and not `edit_clients` — a shipped preset — and as INVOKER it
-- fails TWICE, in an order worth knowing:
--
--   1. `permission denied for function client_outstanding_balance`. LOUD, and
--      it aborts the whole booking update, so the supervisor cannot mark the
--      booking completed at all.
--   2. Grant the helper to make that go away, and the UPDATE on `clients` is
--      refused by RLS instead — zero rows, NO ERROR, balance left at the old
--      value. Verified, not assumed.
--
-- So the obvious fix for the loud failure converts it into the silent one. Both
-- are closed by running as the owner, which is the point: the value written is
-- computed from the bookings, never supplied, so the authority buys nothing a
-- caller could aim.
--
-- BOTH client ids on an UPDATE. A booking reassigned from one client to another
-- leaves a debt behind on the old one otherwise — the kind of thing that is
-- discovered when somebody is chased for money that moved.

create or replace function private.booking_moves_the_client()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_old uuid := case when tg_op <> 'INSERT' then old.client_id end;
  v_new uuid := case when tg_op <> 'DELETE' then new.client_id end;
begin
  if v_new is not null then
    update public.clients
       set outstanding_balance = private.client_outstanding_balance(v_new)
     where id = v_new;
  end if;

  if v_old is not null and v_old is distinct from v_new then
    update public.clients
       set outstanding_balance = private.client_outstanding_balance(v_old)
     where id = v_old;
  end if;

  return null;
end;
$$;

comment on function private.booking_moves_the_client is
  'Recomputes the client(s) a booking touches. Handles both ids on an UPDATE so a reassigned booking does not leave its debt behind.';

drop trigger if exists bookings_move_the_client on public.bookings;
create trigger bookings_move_the_client
  after insert or update or delete on public.bookings
  for each row execute function private.booking_moves_the_client();
