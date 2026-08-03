-- ============================================================================
-- Grooming, slice 2: the APPOINTMENT and its lifecycle.
--
-- ── DECISION 1: A GROOMING APPOINTMENT *IS* A BOOKING ──────────────────────
--
-- `grooming_appointments.booking_id` is both the primary key and a foreign key.
-- One booking, at most one grooming extension, and no way to have the extension
-- without the booking.
--
-- What decided it: `booking_status` ALREADY spells the grooming lifecycle —
-- confirmed → checked_in → in_progress → ready → completed, plus no_show and
-- cancelled. That is a 1:1 match for the mock's own groomingStatusEnum
-- (scheduled / checked-in / in-progress / ready-for-pickup / completed /
-- cancelled / no-show). `bookings` also already holds the client, the pets (via
-- booking_pets), the schedule, the assigned staff, the money and the payment
-- status, all with RLS and write-integrity rules that took a migration of their
-- own (20260802120000).
--
-- The two alternatives, and why not:
--
--   Widen `bookings` — boarding, daycare and training would each bolt their own
--   columns onto the same row. That is a wide sparse table where every service
--   pays the cost of every other service's fields.
--
--   A standalone appointments table — duplicates client, pets, schedule, staff
--   and money, and immediately breaks the cross-service surfaces that already
--   read `bookings` (the facility dashboard, the calendar, the reports).
--
-- ── DECISION 2: SNAPSHOT THE MENU, DO NOT POINT AT IT ──────────────────────
--
-- Every line carries name/price/duration AS SOLD, and the FK to the catalogue
-- is `on delete set null`.
--
-- This is the rule staff_signatures already established (20260804090000: "store
-- the agreement TEXT and its hash as at signing time — never a FK to a mutable
-- agreement row"). A grooming appointment is a commercial record. If a facility
-- raises Teeth Brushing from $12 to $15, or renames Full Groom, or retires a
-- service, last month's appointments must still say what was actually sold.
-- Pointing at the live catalogue would silently rewrite history, and it would
-- rewrite the part of history people argue about.
--
-- `size_label` is snapshotted for the same reason one layer up: it is the
-- output of the facility's OWN weight tiers (Decision 2 of 20260805100000), and
-- those tiers are editable. A dog that was medium when booked stays medium on
-- that appointment even after the facility moves the boundary.
--
-- ── DECISION 3: THE SERVER STAMPS THE CLOCK, AND DERIVES THE ETA ───────────
--
-- check_in_at / check_out_at are written by a trigger when the BOOKING's status
-- moves, never by the caller. Same reason completed_by is never taken from a
-- request body (20260804180000): a timestamp the client chose is not a record
-- of when something happened.
--
-- estimated_ready_at is computed at check-in from the service duration plus the
-- add-on durations actually on the appointment. It is the number the owner is
-- told so they know when to come back, and it should not depend on the client
-- clock or on a route remembering to do the arithmetic.
--
-- ── DECISION 4: THE LIFECYCLE CANNOT SKIP CHECK-IN ─────────────────────────
--
-- A groom cannot be in progress or ready for pickup for a pet that never
-- arrived. The trigger refuses those transitions when check_in_at is null.
--
-- It deliberately does NOT forbid going backwards: salons really do reopen a
-- ticket ("we missed the nails"), and a schema that made that impossible would
-- be met with a cancel-and-rebook that loses the history. Reopening clears
-- check_out_at, so the record never claims a pickup that was undone.
--
-- ── WHAT THIS SLICE STILL DOES NOT BUILD ──────────────────────────────────
--
-- Stations (no table yet — `station_id` is deliberately absent rather than a
-- dangling text column), photos, intake forms, express check-in, the progress
-- checklist, co-groomers and split-service stages. Each attaches to this row
-- later. Money reconciliation is also deferred ON PURPOSE: `bookings.total_cost`
-- is NOT derived from these lines, because deposits, invoices, prepaid packages
-- and store credit do not exist yet and a formula written now would be a
-- formula to unpick later.
-- ============================================================================

-- ── The appointment ─────────────────────────────────────────────────────────

create table public.grooming_appointments (
  -- PK and FK in one column: the booking IS the appointment.
  booking_id  uuid primary key references public.bookings (id) on delete cascade,

  -- Denormalised for RLS and for facility-scoped indexes. Derived by trigger.
  facility_id uuid not null references public.facilities (id) on delete cascade,

  -- The catalogue row, if it still exists. Nullable BY DESIGN — see Decision 2.
  service_id  uuid references public.grooming_services (id) on delete set null,

  -- What was actually sold, frozen at booking time.
  service_name    text not null,
  size_label      text,
  service_price   numeric(10,2) not null default 0 check (service_price >= 0),
  service_duration_min integer not null check (service_duration_min > 0),

  -- Stamped by the trigger, never by the caller.
  check_in_at        timestamptz,
  check_out_at       timestamptz,
  estimated_ready_at timestamptz,

  -- Suppresses a repeat "running late" message for the same overdue groom.
  owner_eta_notified_at timestamptz,

  -- Grooming-specific free text. `bookings.special_requests` is the CLIENT's
  -- ask; this is the groomer's own note, and conflating them would lose which
  -- of the two a line came from.
  groomer_notes   text not null default '',

  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),

  -- A pickup cannot precede an arrival.
  constraint grooming_appointment_clock_order
    check (check_out_at is null or check_in_at is null or check_out_at >= check_in_at)
);

create index grooming_appointments_facility_idx
  on public.grooming_appointments (facility_id);
create index grooming_appointments_service_idx
  on public.grooming_appointments (service_id);

comment on table public.grooming_appointments is
  'The grooming half of a booking. booking_id is PK and FK — see Decision 1 in 20260805140000. Menu fields are snapshots, not references.';

-- ── Add-ons sold on the appointment ─────────────────────────────────────────

create table public.grooming_appointment_add_ons (
  id          uuid primary key default gen_random_uuid(),
  booking_id  uuid not null references public.grooming_appointments (booking_id) on delete cascade,
  facility_id uuid not null references public.facilities (id) on delete cascade,

  add_on_id   uuid references public.grooming_add_ons (id) on delete set null,

  -- As sold. See Decision 2.
  name         text not null,
  price        numeric(10,2) not null default 0 check (price >= 0),
  duration_min integer not null default 0 check (duration_min >= 0),

  -- Whether this came from a service's auto-attach rule or was chosen. Worth
  -- keeping: "why is teeth brushing on my bill" has two different answers.
  auto_attached boolean not null default false,

  created_at  timestamptz not null default now(),

  -- One line per add-on per appointment. Booking the same add-on twice is a
  -- quantity, and there is no quantity here — if that is ever needed it is a
  -- column, not a second row that doubles the price by accident.
  constraint grooming_appointment_add_on_unique unique (booking_id, add_on_id)
);

create index grooming_appointment_add_ons_booking_idx
  on public.grooming_appointment_add_ons (booking_id);

-- ── Price adjustments ───────────────────────────────────────────────────────
-- The matted surcharge, a goodwill discount, a difficult-behaviour fee. Kept as
-- ROWS rather than a single "adjustment" number so the bill can explain itself.

create table public.grooming_price_adjustments (
  id          uuid primary key default gen_random_uuid(),
  booking_id  uuid not null references public.grooming_appointments (booking_id) on delete cascade,
  facility_id uuid not null references public.facilities (id) on delete cascade,

  reason      text not null
                check (reason in ('matting', 'behavior', 'size_correction',
                                  'time_overrun', 'discount', 'other')),
  -- Signed: a discount is negative. One column, because a magnitude plus a
  -- direction flag is two ways to say the same thing and they drift.
  amount      numeric(10,2) not null,
  note        text not null default '',

  -- The actor, from the session. Never from a request body.
  created_by  uuid references auth.users (id) on delete set null,
  created_at  timestamptz not null default now(),

  -- 'other' without an explanation is an unexplained charge on a customer's
  -- bill. The database is the right place to refuse that.
  constraint grooming_adjustment_other_needs_note
    check (reason <> 'other' or length(btrim(note)) > 0)
);

create index grooming_price_adjustments_booking_idx
  on public.grooming_price_adjustments (booking_id);

-- ── facility_id is derived, never accepted ──────────────────────────────────
-- Same rule as every other child table here: RLS gates ROWS, so a caller who
-- may insert a line may choose its facility_id, and a wrong one files a charge
-- against another business.

create or replace function private.grooming_appointment_facility()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_facility uuid;
begin
  if tg_table_name = 'grooming_appointments' then
    select facility_id into v_facility
      from public.bookings where id = new.booking_id;
  else
    select facility_id into v_facility
      from public.grooming_appointments where booking_id = new.booking_id;
  end if;

  if v_facility is null then
    raise exception 'Cannot resolve the facility for this row.'
      using errcode = '23503';
  end if;

  new.facility_id := v_facility;
  return new;
end;
$$;

create trigger grooming_appointments_facility
  before insert or update on public.grooming_appointments
  for each row execute function private.grooming_appointment_facility();
create trigger grooming_appointment_add_ons_facility
  before insert or update on public.grooming_appointment_add_ons
  for each row execute function private.grooming_appointment_facility();
create trigger grooming_price_adjustments_facility
  before insert or update on public.grooming_price_adjustments
  for each row execute function private.grooming_appointment_facility();

-- The add-on must come from the SAME facility's menu. The FK only says it
-- exists. Null is fine — that is a retired add-on whose name we still hold.
create or replace function private.grooming_line_same_facility()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_facility uuid;
begin
  if new.add_on_id is null then
    return new;
  end if;
  select facility_id into v_facility
    from public.grooming_add_ons where id = new.add_on_id;
  if v_facility is distinct from new.facility_id then
    raise exception 'That add-on belongs to a different facility.'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

-- Sorts after the facility trigger, so it checks the derived value.
create trigger grooming_zz_add_on_line_same_facility
  before insert or update on public.grooming_appointment_add_ons
  for each row execute function private.grooming_line_same_facility();

-- The actor is the session, not the payload.
create or replace function private.grooming_adjustment_actor()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if (select auth.uid()) is not null then
    new.created_by := (select auth.uid());
  end if;
  return new;
end;
$$;

create trigger grooming_zz_adjustment_actor
  before insert on public.grooming_price_adjustments
  for each row execute function private.grooming_adjustment_actor();

create trigger grooming_appointments_touch
  before update on public.grooming_appointments
  for each row execute function private.set_updated_at();

-- ── The lifecycle ───────────────────────────────────────────────────────────
--
-- Fires on the BOOKING, because that is where status lives, and writes the
-- appointment. Only bookings that HAVE a grooming extension are affected —
-- everything else returns immediately, so boarding and daycare are untouched.

create or replace function private.sync_grooming_lifecycle()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_apt      public.grooming_appointments;
  v_add_mins integer;
begin
  select * into v_apt from public.grooming_appointments where booking_id = new.id;
  if v_apt.booking_id is null then
    return null;                                    -- not a groom; nothing to do
  end if;

  if new.status is not distinct from old.status then
    return null;                                    -- not a status change
  end if;

  -- Decision 4: you cannot be mid-groom for a pet that never arrived.
  if new.status in ('in_progress', 'ready')
     and v_apt.check_in_at is null
     and new.status is distinct from old.status
     and old.status not in ('in_progress', 'ready')
  then
    raise exception 'This pet has not been checked in yet.'
      using errcode = '42501';
  end if;

  if new.status = 'checked_in' and v_apt.check_in_at is null then
    -- The ETA the owner is given: service duration plus everything actually on
    -- the ticket. Computed here so it cannot disagree with the lines.
    select coalesce(sum(duration_min), 0) into v_add_mins
      from public.grooming_appointment_add_ons where booking_id = new.id;

    update public.grooming_appointments
       set check_in_at = now(),
           estimated_ready_at =
             now() + make_interval(mins => v_apt.service_duration_min + v_add_mins)
     where booking_id = new.id;

  elsif new.status = 'completed' and v_apt.check_out_at is null then
    update public.grooming_appointments
       set check_out_at = now()
     where booking_id = new.id;

  elsif new.status in ('confirmed', 'pending', 'checked_in', 'in_progress')
        and v_apt.check_out_at is not null then
    -- Reopened. A record that still claimed a pickup would be a record that
    -- says the pet went home and is also on the table.
    update public.grooming_appointments
       set check_out_at = null
     where booking_id = new.id;
  end if;

  return null;
end;
$$;

create trigger bookings_sync_grooming_lifecycle
  after update of status on public.bookings
  for each row execute function private.sync_grooming_lifecycle();

comment on function private.sync_grooming_lifecycle() is
  'Stamps grooming check-in/check-out from the booking status and derives the ready ETA. No-ops for non-grooming bookings.';

-- ── RLS ─────────────────────────────────────────────────────────────────────
--
-- READ INHERITS FROM THE BOOKING, via `exists (select 1 from bookings …)` —
-- the pattern booking_pets already uses. Because `bookings` has its own RLS,
-- that EXISTS returns nothing for a booking the caller cannot see, so the
-- extension's visibility CANNOT drift from its parent's. Restating the booking
-- read rule here would be a second copy to keep in step.
--
-- WRITE USES private.can_write_booking(), also already built: staff with
-- create/edit_bookings, or the owning customer while the booking is still a
-- request. So a customer can put add-ons on their own pending request and
-- cannot touch the ticket once the pet is on site — which is the same line the
-- booking rules already drew.

alter table public.grooming_appointments          enable row level security;
alter table public.grooming_appointment_add_ons   enable row level security;
alter table public.grooming_price_adjustments     enable row level security;

create policy grooming_appointments_read on public.grooming_appointments
  for select to authenticated
  using (exists (select 1 from public.bookings b where b.id = booking_id));
create policy grooming_appointments_insert on public.grooming_appointments
  for insert to authenticated
  with check (private.can_write_booking(booking_id));
create policy grooming_appointments_update on public.grooming_appointments
  for update to authenticated
  using (private.can_write_booking(booking_id))
  with check (private.can_write_booking(booking_id));
create policy grooming_appointments_delete on public.grooming_appointments
  for delete to authenticated
  using (private.has_permission(facility_id, 'edit_bookings'));

create policy grooming_appointment_add_ons_read on public.grooming_appointment_add_ons
  for select to authenticated
  using (exists (select 1 from public.bookings b where b.id = booking_id));
create policy grooming_appointment_add_ons_insert on public.grooming_appointment_add_ons
  for insert to authenticated
  with check (private.can_write_booking(booking_id));
create policy grooming_appointment_add_ons_update on public.grooming_appointment_add_ons
  for update to authenticated
  using (private.can_write_booking(booking_id))
  with check (private.can_write_booking(booking_id));
create policy grooming_appointment_add_ons_delete on public.grooming_appointment_add_ons
  for delete to authenticated
  using (private.can_write_booking(booking_id));

-- ADJUSTMENTS ARE STAFF-ONLY, and that is narrower than can_write_booking on
-- purpose. A surcharge or a goodwill discount is the facility's judgement about
-- money; a customer editing their own pending request has no business adding
-- one in either direction.
create policy grooming_price_adjustments_read on public.grooming_price_adjustments
  for select to authenticated
  using (exists (select 1 from public.bookings b where b.id = booking_id));
create policy grooming_price_adjustments_insert on public.grooming_price_adjustments
  for insert to authenticated
  with check (private.has_permission(facility_id, 'edit_bookings'));
create policy grooming_price_adjustments_update on public.grooming_price_adjustments
  for update to authenticated
  using (private.has_permission(facility_id, 'edit_bookings'))
  with check (private.has_permission(facility_id, 'edit_bookings'));
create policy grooming_price_adjustments_delete on public.grooming_price_adjustments
  for delete to authenticated
  using (private.has_permission(facility_id, 'edit_bookings'));
