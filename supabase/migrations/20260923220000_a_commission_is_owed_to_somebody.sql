-- ============================================================================
-- A commission is owed to somebody — and a service charge is not part of it.
--
-- ── WHY THIS EXISTS AT ALL ────────────────────────────────────────────────
--
-- MoéGo's service-charge page ends with "not included in staff commission
-- calculations". This product could not honour that rule or break it, because
-- it had no commission engine: `staff.details -> 'payroll'` has stored
-- `generalServiceCommission`, `hourlyRate`, `tipsRate` and per-module
-- `overrides` since 20260801150000, a screen edits them behind `view_payroll`,
-- and NOTHING has ever computed a figure from them. A rate nobody applies is a
-- number in a form.
--
-- ── IT IS MODELLED ON booking_tip_allocations, DELIBERATELY ───────────────
--
-- 20260806940000 and 20260827140000 already solved this exact problem for
-- tips: attribute money to a person from `bookings.assigned_staff_id`, keep
-- why beside the how much, let a person override the machine, and make a
-- refund take the attribution back with it. Inventing a second shape for the
-- same idea would leave a payroll report joining two tables that disagree.
--
-- So: one row per person per booking, `source` auto/manual with the trigger
-- never touching a manual row, and `paid_at` as the payout flag because a
-- boolean beside a date is two sources of truth for one fact.
--
-- ── WHAT IT IS CALCULATED ON ──────────────────────────────────────────────
--
-- Settled 2026-09-23: the SERVICE, net of discounts, before tax, in
-- proportion to what has actually been PAID.
--
--   basis  = greatest(0, total_cost - discount)
--   earned = rate x basis x least(1, amount_paid / amount_due)
--
-- Four things follow from that, and each is the reason for a clause:
--
--   * SERVICE CHARGES ARE EXCLUDED, which is the rule this migration is for.
--     They live in `extras_total`, and `total_cost` is the booking's own
--     price — 20260806820000 Decision 3. So the exclusion is structural
--     rather than a `where fee_id is null` somebody has to remember. Retail
--     items and add-ons sit in `extras_total` too and are excluded with them.
--   * NET OF DISCOUNTS. `amount_due` is
--     `greatest(0, (total_cost + extras_total) - discount)` — read from the
--     live generated column, not from the migration that first declared it —
--     so the discount is subtracted OUTSIDE `total_cost` and the basis has to
--     subtract it too. Paying commission on a price the facility discounted
--     away pays out money that never arrived.
--   * PAID, NOT OWED. A booking nobody has paid for owes no commission, and
--     `amount_paid` is derived from the payments ledger, so a refund lowers
--     it and the allocation follows it down. That is the half that would
--     otherwise rot, exactly as 20260827140000 found for tips.
--   * BEFORE TAX. Tax is the government's, never the facility's to share.
--
-- ── IT DOES NOT BACKFILL, AND THAT IS A DECISION ──────────────────────────
--
-- 20 bookings on this database already have an assigned member of staff, a
-- payment, and a facility that has authored rates — so a backfill would be
-- three lines and would work. It is deliberately not here.
--
-- Those bookings were priced, sold and paid while no commission scheme
-- existed. Creating allocations for them does not describe something that
-- happened; it invents a payroll liability retroactively, and the first
-- anybody would learn of it is a payout report that says staff are owed money
-- for last month. That is a business decision belonging to whoever signs the
-- cheques, not a side effect of a migration.
--
-- So commission accrues from the next write onwards. A facility that does
-- want history can have it — touching the rows fires this trigger — but
-- somebody has to ask for that.
--
-- ── THE RATE COMES FROM THE STAFF ROW, PER SERVICE ────────────────────────
--
-- `details -> 'payroll' -> 'overrides'` is a list of
-- `{serviceModule, commission}`; `generalServiceCommission` is the fallback.
-- A rate of zero is a real answer (this person earns no commission), which is
-- why the allocation is DELETED rather than written as 0 — a row saying
-- somebody is owed nothing is indistinguishable from a row nobody has
-- computed yet.
-- ============================================================================

create table if not exists public.booking_commission_allocations (
  id           uuid primary key default gen_random_uuid(),
  booking_id   uuid not null references public.bookings(id) on delete cascade,
  facility_id  uuid not null references public.facilities(id) on delete cascade,
  staff_id     uuid not null references public.staff(id) on delete restrict,

  -- WHAT IT WAS WORKED OUT FROM, kept beside the answer because "why is Amy
  -- owed $12" is the question this table exists to settle. Recomputing it
  -- from today's booking would answer about today's booking.
  basis        numeric(10,2) not null check (basis >= 0),
  rate         numeric(6,3)  not null check (rate >= 0 and rate <= 100),
  paid_share   numeric(6,4)  not null check (paid_share >= 0 and paid_share <= 1),
  amount       numeric(10,2) not null check (amount > 0),

  -- 'auto' = the trigger worked it out; 'manual' = a person decided. The
  -- trigger never touches a manual row.
  source       text not null default 'auto'
                 check (source in ('auto', 'manual')),

  -- A nullable timestamp IS the payout flag. See 20260827140000.
  paid_at      timestamptz,
  paid_by      uuid references auth.users(id),
  payout_note  text,

  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),

  -- One row per person per booking. Two is the same allocation written twice.
  unique (booking_id, staff_id)
);

comment on table public.booking_commission_allocations is
  'What each member of staff earned on a booking. Service only, net of discounts, before tax, in proportion to what was paid — service charges and every other extra are excluded by construction. Derived by private.derive_booking_commission() unless source = manual.';
comment on column public.booking_commission_allocations.basis is
  'The service revenue this was a percentage OF, as it stood when the row was written.';
comment on column public.booking_commission_allocations.paid_share is
  'How much of the bill had been paid. 1.0000 is settled in full.';

create index if not exists booking_commission_allocations_staff_idx
  on public.booking_commission_allocations (staff_id, created_at desc);
create index if not exists booking_commission_allocations_facility_idx
  on public.booking_commission_allocations (facility_id, created_at desc);
create index if not exists booking_commission_allocations_unpaid_idx
  on public.booking_commission_allocations (facility_id, paid_at)
  where paid_at is null;

-- ── The rate this person earns on this service ────────────────────────────

create or replace function private.staff_commission_rate(
  p_staff_id uuid,
  p_service  text
)
returns numeric
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    -- A per-module override wins, matched case-insensitively because
    -- `bookings.service` is free text ('Boarding') and the payroll form
    -- stores a module key ('boarding').
    (select (o ->> 'commission')::numeric
       from public.staff s,
            lateral jsonb_array_elements(
              case
                when jsonb_typeof(s.details -> 'payroll' -> 'overrides') = 'array'
                  then s.details -> 'payroll' -> 'overrides'
                else '[]'::jsonb
              end
            ) as o
      where s.id = p_staff_id
        and lower(o ->> 'serviceModule') = lower(coalesce(p_service, ''))
        and (o ->> 'commission') ~ '^[0-9]+(\.[0-9]+)?$'
      limit 1),
    (select (s.details -> 'payroll' ->> 'generalServiceCommission')::numeric
       from public.staff s
      where s.id = p_staff_id
        and (s.details -> 'payroll' ->> 'generalServiceCommission')
              ~ '^[0-9]+(\.[0-9]+)?$'),
    0
  );
$$;

revoke execute on function private.staff_commission_rate(uuid, text) from public;
revoke execute on function private.staff_commission_rate(uuid, text) from anon;
revoke execute on function private.staff_commission_rate(uuid, text) from authenticated;

comment on function private.staff_commission_rate(uuid, text) is
  'The percentage this member of staff earns on this service: a per-module override, else generalServiceCommission, else 0. A malformed value reads as absent rather than as an error — payroll must not stop a booking being saved.';

-- ── Working one booking's commission out ──────────────────────────────────

create or replace function private.derive_booking_commission()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_basis  numeric(10,2);
  v_rate   numeric;
  v_share  numeric;
  v_amount numeric(10,2);
begin
  -- A person decided this one. Quietly rewriting somebody's decision about
  -- money is worse than leaving it — 20260827140000 reached the same answer
  -- for tips and reports a discrepancy instead.
  if exists (
    select 1 from public.booking_commission_allocations a
     where a.booking_id = new.id and a.source = 'manual'
  ) then
    return new;
  end if;

  -- Nobody to pay, or a booking that no longer earns anything.
  if new.assigned_staff_id is null or new.status = 'cancelled' then
    delete from public.booking_commission_allocations a
     where a.booking_id = new.id and a.source = 'auto';
    return new;
  end if;

  -- The SERVICE, net of the discount. `extras_total` is deliberately absent:
  -- that is where service charges live, and they are not commissionable.
  v_basis := greatest(0, coalesce(new.total_cost, 0) - coalesce(new.discount, 0));

  -- How much of the bill has actually been paid. `amount_paid` is derived
  -- from the payments ledger, so a refund lowers it and this follows.
  v_share := case
    when coalesce(new.amount_due, 0) <= 0 then 0
    else least(1, greatest(0, coalesce(new.amount_paid, 0) / new.amount_due))
  end;

  v_rate := private.staff_commission_rate(new.assigned_staff_id, new.service);
  v_amount := round(v_basis * (v_rate / 100) * v_share, 2);

  -- A rate of zero, an unpaid booking, or a fully discounted one all land
  -- here. NO ROW rather than a row of 0: "owed nothing" and "not worked out
  -- yet" must not look the same in a payout report.
  if v_amount <= 0 then
    delete from public.booking_commission_allocations a
     where a.booking_id = new.id and a.source = 'auto';
    return new;
  end if;

  insert into public.booking_commission_allocations
    (booking_id, facility_id, staff_id, basis, rate, paid_share, amount, source)
  values
    (new.id, new.facility_id, new.assigned_staff_id,
     v_basis, v_rate, round(v_share, 4), v_amount, 'auto')
  on conflict (booking_id, staff_id) do update
    set basis      = excluded.basis,
        rate       = excluded.rate,
        paid_share = excluded.paid_share,
        amount     = excluded.amount,
        updated_at = now()
  -- A row somebody has already been PAID is history, not a working figure.
  where public.booking_commission_allocations.source = 'auto'
    and public.booking_commission_allocations.paid_at is null;

  -- Reassigned to somebody else: the previous person's automatic row goes.
  delete from public.booking_commission_allocations a
   where a.booking_id = new.id
     and a.staff_id <> new.assigned_staff_id
     and a.source = 'auto'
     and a.paid_at is null;

  return new;
end;
$$;

-- AFTER, not BEFORE: `amount_due` is a STORED generated column and is not
-- readable from a BEFORE trigger, and `amount_paid` is set by
-- `bookings_set_derived_payment` on the way in. Named to sort after those.
--
-- ── AND ON EVERY UPDATE, NOT `UPDATE OF <columns>` ────────────────────────
--
-- The obvious version lists the columns that matter. It would work today:
-- `private.payment_moves_the_booking()` does
-- `update public.bookings set amount_paid = ...`, so a column list naming
-- `amount_paid` fires on the real payment path.
--
-- It works because of a SET list in ANOTHER function, which nothing connects
-- to this one. Change that to `set updated_at = now()` and commission
-- silently stops following payments — no error, no failing test unless one
-- happens to drive a real payment, just figures that quietly stop moving.
-- Money attribution firing too often is a few index lookups; firing too
-- rarely is a wrong payout nobody notices.
drop trigger if exists bookings_zz_derive_commission on public.bookings;
create trigger bookings_zz_derive_commission
  after insert or update on public.bookings
  for each row execute function private.derive_booking_commission();

create or replace function private.touch_commission_allocation()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists booking_commission_allocations_set_updated_at
  on public.booking_commission_allocations;
create trigger booking_commission_allocations_set_updated_at
  before update on public.booking_commission_allocations
  for each row execute function private.touch_commission_allocation();

-- ── Who may see it ────────────────────────────────────────────────────────
--
-- Commission is pay. `view_payroll` is the permission that already gates the
-- rates on the staff screen, and the same one gates the figures here — a
-- groomer told what the facility pays a colleague is the exposure
-- `staff-field-exposure.spec.ts` exists to catch.
--
-- No INSERT/UPDATE/DELETE policy at all, exactly as tips: the trigger writes
-- these, and a table with no write policy refuses every direct write.

alter table public.booking_commission_allocations enable row level security;

drop policy if exists booking_commission_allocations_read
  on public.booking_commission_allocations;
-- `private.own_staff_ids()` and `private.has_permission(facility, permission)`
-- READ OFF THE LIVE DATABASE, not from the migrations that declared them:
-- `staff` has no `profile_id` and the permission helper takes the facility
-- FIRST. 20260827140000's own header warns about exactly this — its first
-- draft joined through a column a later migration had moved, resolved nobody,
-- and attributed every tip to Unassigned.
create policy booking_commission_allocations_read
  on public.booking_commission_allocations for select
  using (
    -- Their own, always: a person may see what they earned.
    staff_id in (select private.own_staff_ids())
    -- Everybody else's needs the permission that already gates the rates on
    -- the staff screen. A groomer told what a colleague is paid is the
    -- exposure `staff-field-exposure.spec.ts` exists to catch.
    or private.has_permission(facility_id, 'view_payroll')
  );

-- EVERY WRITE NAMED SEPARATELY, and `authenticated` revoked as explicitly as
-- `anon`. Measured while writing the test for this: `booking_tip_allocations`
-- grants anon SELECT, INSERT, UPDATE and DELETE today, even though
-- 20260806940000 says `revoke all ... from public` — a later blanket grant
-- across the schema handed it back, and nothing has ever read the grants back
-- to notice. RLS still refuses the writes there (no policy is a denial), so
-- it is depth rather than a hole, but it is exactly the trap AGENTS.md
-- records: a revoke is not verified by having been written.
--
-- So these are asserted against has_table_privilege() in
-- supabase/tests/booking-commission.sql rather than trusted.
revoke all on public.booking_commission_allocations from public;
revoke all on public.booking_commission_allocations from anon;
revoke insert, update, delete, truncate, references, trigger
  on public.booking_commission_allocations from authenticated;
grant select on public.booking_commission_allocations to authenticated;
grant all on public.booking_commission_allocations to service_role;
