-- ============================================================================
-- The ledger pins what it references.
--
-- ── WHAT WAS MISSING ──────────────────────────────────────────────────────
--
-- Eleven reference columns across the four money and audit tables had NO
-- foreign key at all:
--
--   payments                      booking_id, client_id, facility_id
--   store_credit_entries          booking_id, client_id, facility_id, payment_id
--   package_pass_entries          booking_id, pet_id
--   grooming_appointment_history  booking_id, facility_id
--
-- Found while clearing e2e leftovers: deleting a cancelled booking would not
-- have been blocked, it would have quietly left 238 payment rows totalling
-- $2,954 pointing at ids that no longer existed. And `payments` carries
-- `payments_block_delete` (20260803...), so the ledger is append-only and those
-- orphans could never have been cleaned up afterwards. The delete was hand-
-- guarded with a NOT IN instead; this is that guard made structural.
--
-- ── WHY RESTRICT AND NOT CASCADE ──────────────────────────────────────────
--
-- CASCADE is the wrong instinct here and would be worse than the gap. These
-- tables are deliberately immutable — no UPDATE, no DELETE, by trigger — and a
-- cascade is a DELETE arriving through the back door: removing a booking would
-- silently destroy the record of money taken for it.
--
-- RESTRICT says the thing the business means: you may not delete a booking, a
-- client, a pet or a facility that has money or audit history against it. The
-- record pins its subject in place.
--
-- ── THE BEHAVIOUR THIS CHANGES, DELIBERATELY ──────────────────────────────
--
-- DELETE /api/clients/[ref] and DELETE /api/pets/[ref] hard-delete. Against a
-- client with payments, they will now fail with 23503 instead of succeeding and
-- orphaning the ledger. That is the correct answer to "delete this client" when
-- their money is on record, and it is why this is RESTRICT rather than SET NULL:
-- a payment that has forgotten whose it was is not an improvement on one that
-- points at a ghost.
--
-- Consequence worth knowing: `writeFailure` has no mapping for 23503, so the
-- refusal currently surfaces as a generic error rather than "this client has
-- payments on record and cannot be removed". Loud and unhelpful beats silent
-- and corrupting, but the message deserves improving.
--
-- ── VERIFIED BEFORE APPLYING ──────────────────────────────────────────────
--
-- All eleven columns had 0 orphans on the live project. The guard below re-
-- checks rather than trusting that, because this file also runs against
-- databases that have drifted — and a bare `alter table` would report only the
-- first violation, with no indication of how many there are or where.
-- ============================================================================

do $$
declare
  r         record;
  v_count   bigint;
  v_report  text := '';
begin
  for r in
    select * from (values
      ('payments',                     'booking_id', 'bookings'),
      ('payments',                     'client_id',  'clients'),
      ('payments',                     'facility_id','facilities'),
      ('store_credit_entries',         'booking_id', 'bookings'),
      ('store_credit_entries',         'client_id',  'clients'),
      ('store_credit_entries',         'facility_id','facilities'),
      ('store_credit_entries',         'payment_id', 'payments'),
      ('package_pass_entries',         'booking_id', 'bookings'),
      ('package_pass_entries',         'pet_id',     'pets'),
      ('grooming_appointment_history', 'booking_id', 'bookings'),
      ('grooming_appointment_history', 'facility_id','facilities')
    ) as t(child, col, parent)
  loop
    execute format(
      'select count(*) from public.%I c where c.%I is not null
         and not exists (select 1 from public.%I p where p.id = c.%I)',
      r.child, r.col, r.parent, r.col)
    into v_count;

    if v_count > 0 then
      v_report := v_report || format('%s.%s -> %s: %s orphan(s); ',
                                     r.child, r.col, r.parent, v_count);
    end if;
  end loop;

  if v_report <> '' then
    raise exception
      'Refusing to add foreign keys while rows point at nothing: %', v_report;
  end if;
end $$;

alter table public.payments
  add constraint payments_booking_id_fkey
  foreign key (booking_id) references public.bookings(id) on delete restrict;

alter table public.payments
  add constraint payments_client_id_fkey
  foreign key (client_id) references public.clients(id) on delete restrict;

alter table public.payments
  add constraint payments_facility_id_fkey
  foreign key (facility_id) references public.facilities(id) on delete restrict;

alter table public.store_credit_entries
  add constraint store_credit_entries_booking_id_fkey
  foreign key (booking_id) references public.bookings(id) on delete restrict;

alter table public.store_credit_entries
  add constraint store_credit_entries_client_id_fkey
  foreign key (client_id) references public.clients(id) on delete restrict;

alter table public.store_credit_entries
  add constraint store_credit_entries_facility_id_fkey
  foreign key (facility_id) references public.facilities(id) on delete restrict;

alter table public.store_credit_entries
  add constraint store_credit_entries_payment_id_fkey
  foreign key (payment_id) references public.payments(id) on delete restrict;

alter table public.package_pass_entries
  add constraint package_pass_entries_booking_id_fkey
  foreign key (booking_id) references public.bookings(id) on delete restrict;

alter table public.package_pass_entries
  add constraint package_pass_entries_pet_id_fkey
  foreign key (pet_id) references public.pets(id) on delete restrict;

alter table public.grooming_appointment_history
  add constraint grooming_appointment_history_booking_id_fkey
  foreign key (booking_id) references public.bookings(id) on delete restrict;

alter table public.grooming_appointment_history
  add constraint grooming_appointment_history_facility_id_fkey
  foreign key (facility_id) references public.facilities(id) on delete restrict;

-- A foreign key does not index the CHILD side, and every one of these is read
-- that way: "what did this booking cost", "what has this client paid". Without
-- them a RESTRICT check is a sequential scan of the ledger on every parent
-- delete, and the screens that list a booking's money are too.
create index if not exists payments_booking_id_idx                     on public.payments (booking_id);
create index if not exists payments_client_id_idx                      on public.payments (client_id);
create index if not exists store_credit_entries_booking_id_idx         on public.store_credit_entries (booking_id);
create index if not exists store_credit_entries_client_id_idx          on public.store_credit_entries (client_id);
create index if not exists store_credit_entries_payment_id_idx         on public.store_credit_entries (payment_id);
create index if not exists package_pass_entries_booking_id_idx         on public.package_pass_entries (booking_id);
create index if not exists grooming_appointment_history_booking_id_idx on public.grooming_appointment_history (booking_id);
