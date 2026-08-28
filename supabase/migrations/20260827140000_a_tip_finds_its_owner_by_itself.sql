-- ============================================================================
-- A tip finds its owner by itself.
--
-- ── WHY A TRIGGER AND NOT APP CODE ────────────────────────────────────────
--
-- A tip reaches `payments` by four different routes: `record_payment` at the
-- till, `record_clover_payment` for a card, the reconciliation sweep finishing
-- a terminal sale whose HTTP response was lost, and a refund carrying a
-- NEGATIVE tip. Attribution written in the API would have to be added to each
-- of them, and would miss the sweep — which exists precisely because nobody was
-- there to run the next line of code.
--
-- One trigger on the table where the money lands catches all four by
-- construction.
--
-- ── IT NEVER OVERWRITES A PERSON ──────────────────────────────────────────
--
-- `source` separates what this trigger decided from what somebody decided. The
-- trigger only ever writes, replaces and removes `'auto'` rows, and if the
-- booking carries ANY `'manual'` row it does nothing at all. A manager who
-- splits a tip four ways has answered the question; a later payment on the same
-- booking must not silently re-answer it.
--
-- `set_booking_tip_split` deletes every row for the booking and inserts at the
-- column default, so a human's split arrives tagged `'manual'` without that
-- function changing. The one edge: clearing a split to nothing leaves no manual
-- row, so a later payment attributes again. That is the better failure — the
-- alternative is a booking that can never be attributed again with no way to
-- tell why.
--
-- ── A REFUND TAKES THE ATTRIBUTION BACK WITH IT ───────────────────────────
--
-- This is the half that would otherwise rot. A refund inserts a negative tip,
-- so `sum(payments.tip)` falls — but the allocations do not move, and the
-- existing ceiling trigger fires on the ALLOCATION table, not on `payments`.
-- Nothing would notice. The allocations would go on saying a groomer is owed
-- $12 out of a tip the customer got back, and the payout report would pay it.
--
-- So a falling total scales the `'auto'` rows down proportionally and deletes
-- them at zero. `'manual'` rows are left exactly as they are and reported as a
-- discrepancy instead: somebody decided that split, and quietly rewriting a
-- person's decision about money is worse than showing them it no longer adds up.
--
-- ── split_even AND assigned COINCIDE TODAY, AND THAT IS NOT A BUG ─────────
--
-- `bookings.assigned_staff_id` is the only structured staff link a booking has;
-- `booking_line_items` carries no staff column. So "split evenly between the
-- staff on the booking" divides between one person, which is arithmetically
-- correct and currently indistinguishable from `assigned`. The modes are kept
-- apart anyway: the day a booking can name several people, the facilities that
-- chose `split_even` already mean it.
--
-- ── READ THE LIVE CONSTRAINT, NOT THE MIGRATION THAT DECLARED IT ──────────
--
-- `bookings.assigned_staff_id` was declared `references facility_memberships`
-- in 20260801120000 and repointed to `staff(id)` afterwards. The first draft of
-- this trigger joined through `staff.membership_id` on the strength of that
-- original line and resolved nobody at all — every tip attributing to
-- Unassigned, which reads like the facility forgot to assign its groomers.
-- Caught by running it, not by reading it.
-- ============================================================================

-- ── The columns this needs ────────────────────────────────────────────────

alter table public.booking_tip_allocations
  add column if not exists source text not null default 'manual';

do $guard$
begin
  if not exists (
    select 1 from pg_constraint
     where conname = 'booking_tip_allocations_source_check'
  ) then
    alter table public.booking_tip_allocations
      add constraint booking_tip_allocations_source_check
      check (source in ('auto', 'manual'));
  end if;
end $guard$;

comment on column public.booking_tip_allocations.source is
  'auto = decided by the attribution trigger; manual = decided by a person. The trigger never touches a booking that has a manual row.';

-- Payout status. A nullable `paid_at` IS the flag — a boolean beside a date is
-- two sources of truth for one fact, and they drift.
alter table public.booking_tip_allocations
  add column if not exists paid_at timestamptz;
alter table public.booking_tip_allocations
  add column if not exists paid_by uuid references auth.users (id);
alter table public.booking_tip_allocations
  add column if not exists payout_note text;

create index if not exists booking_tip_allocations_unpaid_idx
  on public.booking_tip_allocations (facility_id, staff_id)
  where paid_at is null;

-- ── The method CHECK has to admit what the trigger writes ─────────────────
--
-- An inline `check (method in (...))` is auto-named. Dropping by that name and
-- restating it is the whole change; an insert naming `auto_assigned` against
-- the old constraint fails, and it would fail INSIDE A PAYMENT.
alter table public.booking_tip_allocations
  drop constraint if exists booking_tip_allocations_method_check;
alter table public.booking_tip_allocations
  add constraint booking_tip_allocations_method_check
  check (method in ('by_service', 'equal', 'custom_percent', 'custom_amount',
                    'auto_assigned', 'auto_split'));

-- ── The rule this facility chose ──────────────────────────────────────────

create or replace function private.tip_attribution_mode(
  p_facility_id uuid,
  p_service     text
)
returns text
language sql
stable
security definer
set search_path = ''
as $fn$
  -- The service's own rule, then the facility default, then 'assigned' — which
  -- matches DEFAULT_TIP_ATTRIBUTION in src/lib/settings/domains.ts. A facility
  -- that has never opened the screen has no row here at all, and must behave
  -- exactly like one that opened it and changed nothing.
  select coalesce(
    nullif(s.value #>> array['byService', p_service, 'mode'], ''),
    nullif(s.value ->> 'defaultMode', ''),
    'assigned'
  )
    from public.facility_settings s
   where s.facility_id = p_facility_id
     and s.domain = 'tip_attribution'
  limit 1;
$fn$;

comment on function private.tip_attribution_mode is
  'Which attribution rule applies to a service: the service own rule, else the facility default, else assigned.';

-- ── The trigger ───────────────────────────────────────────────────────────

create or replace function private.attribute_tip_automatically()
returns trigger
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  v_booking   public.bookings%rowtype;
  v_collected numeric(10,2);
  v_allocated numeric(10,2);
  v_mode      text;
  v_staff     uuid;
  v_count     integer;
begin
  -- Nothing to attribute, and nothing to take back.
  if new.booking_id is null or coalesce(new.tip, 0) = 0 then
    return null;
  end if;

  select * into v_booking from public.bookings where id = new.booking_id;
  if not found then
    return null;
  end if;

  -- A person has already answered this. Leave it alone — including when a
  -- refund has just made it wrong, which the report surfaces instead.
  if exists (
    select 1 from public.booking_tip_allocations a
     where a.booking_id = v_booking.id and a.source = 'manual'
  ) then
    return null;
  end if;

  select coalesce(sum(p.tip), 0) into v_collected
    from public.payments p
   where p.booking_id = v_booking.id;

  -- Every tip on this booking has been given back. Nobody is owed anything.
  if v_collected <= 0 then
    delete from public.booking_tip_allocations
     where booking_id = v_booking.id and source = 'auto';
    return null;
  end if;

  v_mode := coalesce(
    private.tip_attribution_mode(v_booking.facility_id, v_booking.service),
    'assigned'
  );

  -- `pool` is owed to the facility's people collectively and distributed by a
  -- human; `none` is not owed to anyone. Neither names a person, so neither
  -- writes a row — and the reports count them separately, because telling an
  -- owner a pooled tip is settled would be false.
  if v_mode in ('pool', 'none') then
    delete from public.booking_tip_allocations
     where booking_id = v_booking.id and source = 'auto';
    return null;
  end if;

  -- ── A REFUND: scale what is there, do not re-attribute ──────────────────
  --
  -- Re-running attribution on a refund would resolve the staff member again and
  -- could move the money to somebody else if the booking was reassigned in
  -- between. Reducing what exists keeps the tip with whoever earned it.
  select coalesce(sum(a.amount), 0), count(*)
    into v_allocated, v_count
    from public.booking_tip_allocations a
   where a.booking_id = v_booking.id and a.source = 'auto';

  if v_count > 0 and v_allocated > v_collected then
    update public.booking_tip_allocations a
       set amount = round(a.amount * (v_collected / v_allocated), 2)
     where a.booking_id = v_booking.id and a.source = 'auto';

    delete from public.booking_tip_allocations a
     where a.booking_id = v_booking.id and a.source = 'auto' and a.amount <= 0;

    return null;
  end if;

  -- ── Otherwise: the whole collected tip, to whoever earned it ────────────
  --
  -- `assigned_staff_id` IS a staff id — the same thing an allocation points at.
  -- Worth stating because the column was declared against
  -- `facility_memberships` in 20260801120000 and repointed later, so the
  -- original definition reads like there is a seam to cross here. There is not,
  -- and a join through `staff.membership_id` would resolve NOBODY: every tip
  -- would come out Unassigned, which looks like a data problem rather than a
  -- code one. Read the live constraint, not the first migration that named it.
  --
  -- The facility check is not redundant: it is what stops a booking that was
  -- moved between facilities attributing its tip to the wrong payroll.
  select s.id into v_staff
    from public.staff s
   where s.id = v_booking.assigned_staff_id
     and s.facility_id = v_booking.facility_id
   limit 1;

  -- Nobody to pay: a booking assigned by NAME only, or an anonymous daycare
  -- drop-off. No row, rather than a row pointing at a guess — the reports count
  -- this as Unassigned, which is a number somebody can act on.
  if v_staff is null then
    delete from public.booking_tip_allocations
     where booking_id = v_booking.id and source = 'auto';
    return null;
  end if;

  insert into public.booking_tip_allocations
    (booking_id, facility_id, staff_id, amount, method, source, author_name)
  values
    (v_booking.id, v_booking.facility_id, v_staff, v_collected,
     case when v_mode = 'split_even' then 'auto_split' else 'auto_assigned' end,
     'auto', 'Yipyy')
  on conflict (booking_id, staff_id) do update
     set amount     = excluded.amount,
         method     = excluded.method,
         updated_at = now()
   -- Never promote a manual row to auto by writing over it. The guard above
   -- should make this unreachable; a conflict clause that could do it anyway is
   -- a trap waiting for the day the guard changes.
   where public.booking_tip_allocations.source = 'auto';

  -- Any OTHER auto row on this booking is from an earlier attribution that
  -- named somebody else — a reassigned groomer. One booking, one auto
  -- allocation: leaving the old one would pay two people for one tip.
  delete from public.booking_tip_allocations
   where booking_id = v_booking.id
     and source = 'auto'
     and staff_id <> v_staff;

  return null;
end $fn$;

comment on function private.attribute_tip_automatically is
  'Attributes a booking tips to its staff on every payment, per the facility tip_attribution rules. Never touches a manual split.';

-- AFTER, so `payments` is already written and `sum(tip)` includes this row.
drop trigger if exists payments_attribute_tip on public.payments;
create trigger payments_attribute_tip
  after insert on public.payments
  for each row
  execute function private.attribute_tip_automatically();

-- ── Marking a payout ──────────────────────────────────────────────────────

create or replace function public.mark_tips_paid(
  p_facility_id uuid,
  p_staff_id    uuid,
  p_from        date,
  p_to          date,
  p_note        text default null
)
returns integer
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  v_count integer;
begin
  -- `edit_payroll`, NOT `take_payment`. Splitting a tip is a till act and
  -- 20260806940000 argues at length for letting reception do it. Recording that
  -- money has LEFT the business is a payroll act, and the same argument runs the
  -- other way.
  if not private.has_permission(p_facility_id, 'edit_payroll') then
    raise exception 'Not allowed to record tip payouts at this facility.'
      using errcode = '42501';
  end if;

  update public.booking_tip_allocations a
     set paid_at     = now(),
         paid_by     = auth.uid(),
         payout_note = p_note
   where a.facility_id = p_facility_id
     and a.staff_id    = p_staff_id
     and a.created_at >= p_from
     and a.created_at <  (p_to + 1)
     -- Already paid stays paid at its original date. Re-running a payout must
     -- not restamp somebody's settled tips with today.
     and a.paid_at is null;

  get diagnostics v_count = row_count;
  return v_count;
end $fn$;

comment on function public.mark_tips_paid is
  'Marks one staff member unpaid tip allocations in a date range as paid. edit_payroll only. Returns the number of rows actually changed - zero means nothing was outstanding, which the caller must not report as a payout.';

-- ── The grants ARE the boundary ───────────────────────────────────────────
--
-- `revoke from public` and `revoke from anon` are DIFFERENT grants and both are
-- needed — 20260822610000 exists because one attempt named only one of them.
revoke all on function public.mark_tips_paid(uuid, uuid, date, date, text)
  from public, anon;
grant execute on function public.mark_tips_paid(uuid, uuid, date, date, text)
  to authenticated;

revoke all on function private.tip_attribution_mode(uuid, text) from public, anon;
revoke all on function private.attribute_tip_automatically() from public, anon;
