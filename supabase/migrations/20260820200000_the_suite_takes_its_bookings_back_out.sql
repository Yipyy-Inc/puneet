-- ============================================================================
-- The e2e suite stops leaving its bookings in a real facility's database.
--
-- ── WHAT WAS MEASURED ─────────────────────────────────────────────────────
--
-- 2026-08-20: `public.bookings` held 477 rows. 434 of them were e2e leftovers.
-- The facility had 43 bookings of its own.
--
-- Every spec "cleans up" by CANCELLING what it created, which is what keeps the
-- boards honest — a cancelled booking is excluded everywhere. It is not what
-- keeps the table honest. Each full run of the operations cluster leaves ~35
-- permanent rows, and the plan is to run that cluster on every pull request.
--
-- ── WHAT CAN AND CANNOT GO ────────────────────────────────────────────────
--
-- Everything a booking owns cascades — stays, line items, pets, tips, care log
-- entries, daycare and training attendance, grooming appointments. Three things
-- do not: `payments`, `store_credit_entries` and `package_pass_entries` are
-- RESTRICT, and `payments` is an append-only ledger on purpose.
--
-- So a booking that took money is not deletable and should not be: 158 of those
-- 434 have payments against them. The other 276 are pure clutter and go.
--
-- ── IT TAKES NO ARGUMENT, WHICH IS THE POINT ──────────────────────────────
--
-- A `purge(pattern)` is a DELETE statement with the pattern supplied by
-- whoever is calling, in production, through a definer function. This one can
-- only ever match `%[e2e %`, and only rows that are already cancelled, and only
-- rows with no payment against them. There is no argument to get wrong.
--
-- Cancelled-only also makes it self-healing rather than dangerous: a run that
-- crashes leaves live rows, the next run of the same spec cancels them by
-- marker, and the purge after it takes them out.
-- ============================================================================

create or replace function public.purge_e2e_bookings()
returns integer
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  v_deleted integer;
begin
  with removable as (
    select b.id
      from public.bookings b
     where b.special_requests like '%[e2e %'
       and b.status = 'cancelled'
       -- The ledger is append-only. A booking that took money keeps its row so
       -- the payment still points at something.
       and not exists (
         select 1 from public.payments p where p.booking_id = b.id
       )
       -- Both RESTRICT, and both mean somebody's balance refers to this stay.
       and not exists (
         select 1 from public.store_credit_entries s where s.booking_id = b.id
       )
       and not exists (
         select 1 from public.package_pass_entries k where k.booking_id = b.id
       )
  )
  delete from public.bookings b
   using removable r
   where b.id = r.id;

  get diagnostics v_deleted = row_count;
  return v_deleted;
end;
$fn$;

comment on function public.purge_e2e_bookings() is
  'Delete cancelled e2e bookings that hold no money. Takes no argument on purpose — it can only ever match ''%[e2e %''. Run by scripts/purge-e2e-bookings.ts after a suite run.';

-- ── The grant is the boundary ─────────────────────────────────────────────
--
-- Same rule as the rest of this family: `public` because PostgREST exposes
-- nothing else, SECURITY DEFINER because `bookings` has no DELETE policy for
-- anyone, and EXECUTE to `service_role` alone — a value no browser holds and no
-- app route needs. Nothing in src/ calls this; the only caller is a script.

revoke all on function public.purge_e2e_bookings() from public, anon, authenticated;
grant execute on function public.purge_e2e_bookings() to service_role;
