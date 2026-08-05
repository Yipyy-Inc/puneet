-- ============================================================================
-- A tip is owed to somebody.
--
-- ── WHAT WAS THERE ────────────────────────────────────────────────────────
--
-- `<TipSplitModal onSave={() => {}} />`. The modal computed a split four ways,
-- refused to submit unless the allocations balanced to the cent, said "Tip
-- split saved" — and threw the result away. The money was collected
-- (`payments.tip` is real), and who earned it was never recorded anywhere.
--
-- The staff it offered to split between were five hardcoded strings:
-- "Jessica M.", "Amy C.", "Sarah K.", "Mike R.", "Emily T." — not the
-- facility's people, and not linkable to anyone who could be paid.
--
-- ── AN ALLOCATION POINTS AT A PERSON, NOT AT A NAME ───────────────────────
--
-- `staff_id`, with ON DELETE RESTRICT. A name is not something payroll can pay
-- and not something that survives a marriage; and a row that says $12 is owed
-- to a staff member who has been deleted is a debt with no creditor. Retire
-- somebody with `status` instead — the same argument `boarding_stays` makes
-- for rooms.
--
-- ── YOU CANNOT PAY OUT MORE TIP THAN WAS COLLECTED ────────────────────────
--
-- The ceiling is `sum(payments.tip)` for the booking, which lives in another
-- table, so a CHECK cannot express it. A trigger can, and this one is
-- SECURITY DEFINER because `payments` is FORCE ROW LEVEL SECURITY: a till
-- operator who may allocate a tip cannot necessarily read every payment row it
-- came from, and the guard has to see all of them or it is not a guard.
--
-- It compares the WHOLE booking's allocations against the WHOLE booking's tips
-- rather than checking row by row, because the modal saves a set and any single
-- row of a valid set can exceed the total on its own.
--
-- ── REPLACING A SPLIT IS ONE TRANSACTION ──────────────────────────────────
--
-- `set_booking_tip_split` deletes and re-inserts. Two calls from the client
-- would leave a window where the tip is allocated to nobody, and — worse under
-- RLS — a DELETE refused by a policy matches no rows and REPORTS SUCCESS, so a
-- client-side "delete then insert" could double the allocations and tell the
-- operator it had worked.
--
-- ── WHY `take_payment` AND NOT `edit_payroll` ─────────────────────────────
--
-- `edit_payroll` is owner and admin only. Splitting a tip that has already been
-- collected is a till operation — recording who earned money that is already in
-- the drawer, not changing what anybody is paid — and the person doing it is
-- whoever closed the ticket. Gating on `edit_payroll` would have locked
-- reception out of a modal they are standing in front of, which is the mistake
-- 20260806920000 had to undo for boarding attendants.
-- ============================================================================

create table if not exists public.booking_tip_allocations (
  id           uuid primary key default gen_random_uuid(),
  booking_id   uuid not null references public.bookings(id) on delete cascade,
  facility_id  uuid not null references public.facilities(id) on delete cascade,
  staff_id     uuid not null references public.staff(id) on delete restrict,
  amount       numeric(10,2) not null check (amount > 0),
  -- How it was arrived at, kept because "why does Amy have $4 more" is the
  -- question this table exists to answer.
  method       text not null check (
                 method in ('by_service', 'equal', 'custom_percent', 'custom_amount')
               ),
  author_name  text,
  created_by   uuid references auth.users(id),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  -- One row per person per booking. Two rows for the same person is the same
  -- allocation written twice.
  unique (booking_id, staff_id)
);

create index if not exists booking_tip_allocations_staff_idx
  on public.booking_tip_allocations (staff_id, created_at desc);
create index if not exists booking_tip_allocations_facility_idx
  on public.booking_tip_allocations (facility_id, created_at desc);

comment on table public.booking_tip_allocations is
  'Who earned the tip on a booking. The tip itself lives in payments.tip; this '
  'says how it is divided. Sum per booking may not exceed the tips collected.';

-- ── The ceiling ────────────────────────────────────────────────────────────

create or replace function private.tips_allocated_within_tips_taken()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_booking   uuid := coalesce(new.booking_id, old.booking_id);
  v_collected numeric(10,2);
  v_allocated numeric(10,2);
begin
  select coalesce(sum(p.tip), 0) into v_collected
    from public.payments p
   where p.booking_id = v_booking;

  select coalesce(sum(a.amount), 0) into v_allocated
    from public.booking_tip_allocations a
   where a.booking_id = v_booking;

  if v_allocated > v_collected + 0.005 then
    raise exception
      'Tips allocated (%) exceed the tips collected on this booking (%).',
      to_char(v_allocated, 'FM999999990.00'),
      to_char(v_collected, 'FM999999990.00')
      using errcode = '23514';
  end if;

  return null;
end $$;

-- AFTER and per STATEMENT: the modal writes a whole split, and a per-row check
-- would refuse a valid set on its first row.
drop trigger if exists booking_tip_allocations_within_tips on public.booking_tip_allocations;
create constraint trigger booking_tip_allocations_within_tips
  after insert or update on public.booking_tip_allocations
  deferrable initially deferred
  for each row
  execute function private.tips_allocated_within_tips_taken();

create or replace function private.touch_tip_allocation()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists booking_tip_allocations_set_updated_at on public.booking_tip_allocations;
create trigger booking_tip_allocations_set_updated_at
  before update on public.booking_tip_allocations
  for each row execute function private.touch_tip_allocation();

-- ── Who may see and set them ───────────────────────────────────────────────

alter table public.booking_tip_allocations enable row level security;

drop policy if exists booking_tip_allocations_read on public.booking_tip_allocations;
create policy booking_tip_allocations_read
  on public.booking_tip_allocations for select
  using (
    exists (select 1 from public.bookings b where b.id = booking_id)
  );

-- No INSERT/UPDATE/DELETE policies at all: every write goes through
-- `set_booking_tip_split`, which is the only way to keep a split consistent.
-- A table with no write policy refuses every direct write, loudly for INSERT
-- and silently for DELETE — which is exactly why the RPC exists.

revoke all on public.booking_tip_allocations from public;
grant select on public.booking_tip_allocations to authenticated;

-- ── The write ──────────────────────────────────────────────────────────────

create or replace function public.set_booking_tip_split(
  p_booking_ref bigint,
  p_method      text,
  p_allocations jsonb
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_booking   public.bookings%rowtype;
  v_collected numeric(10,2);
  v_total     numeric(10,2) := 0;
  v_count     integer := 0;
  v_row       jsonb;
  v_staff     uuid;
begin
  if p_method not in ('by_service', 'equal', 'custom_percent', 'custom_amount') then
    raise exception 'Unknown split method "%".', p_method using errcode = '22023';
  end if;

  select * into v_booking from public.bookings where ref = p_booking_ref;
  if not found then
    raise exception 'That booking does not exist.' using errcode = 'P0002';
  end if;

  if not private.has_permission(v_booking.facility_id, 'take_payment') then
    raise exception 'Not allowed to split tips at this facility.'
      using errcode = '42501';
  end if;

  select coalesce(sum(p.tip), 0) into v_collected
    from public.payments p
   where p.booking_id = v_booking.id;

  -- Replace, not merge: the modal edits the whole split, so a name dropped from
  -- it must lose its allocation rather than keep a stale one.
  delete from public.booking_tip_allocations where booking_id = v_booking.id;

  for v_row in select * from jsonb_array_elements(coalesce(p_allocations, '[]'::jsonb))
  loop
    -- The staff member is resolved BY ID, and must belong to this facility.
    -- Trusting a client-supplied uuid here would let one business allocate a
    -- tip to another's employee.
    select s.id into v_staff
      from public.staff s
     where s.id = (v_row->>'staffId')::uuid
       and s.facility_id = v_booking.facility_id;

    if v_staff is null then
      raise exception 'No such staff member at this facility: %.',
        coalesce(v_row->>'staffId', 'null') using errcode = '23503';
    end if;

    if (v_row->>'amount')::numeric <= 0 then
      -- Zero is not an allocation, it is an absence, and storing it would put
      -- somebody on a tip report who earned nothing.
      continue;
    end if;

    insert into public.booking_tip_allocations
      (booking_id, facility_id, staff_id, amount, method, created_by, author_name)
    values
      (v_booking.id, v_booking.facility_id, v_staff,
       round((v_row->>'amount')::numeric, 2), p_method,
       auth.uid(),
       (select p.full_name from public.profiles p where p.id = auth.uid()));

    v_total := v_total + round((v_row->>'amount')::numeric, 2);
    v_count := v_count + 1;
  end loop;

  if v_total > v_collected + 0.005 then
    raise exception
      'Tips allocated (%) exceed the tips collected on this booking (%).',
      to_char(v_total, 'FM999999990.00'),
      to_char(v_collected, 'FM999999990.00')
      using errcode = '23514';
  end if;

  return v_count;
end $$;

revoke all on function public.set_booking_tip_split(bigint, text, jsonb) from public;
grant execute on function public.set_booking_tip_split(bigint, text, jsonb) to authenticated;

comment on function public.set_booking_tip_split(bigint, text, jsonb) is
  'The only write path for tip allocations. Replaces the whole split in one '
  'transaction and refuses to allocate more than the booking''s payments '
  'actually collected in tips.';
