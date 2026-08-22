-- ============================================================================
-- An audit trail must not hold a foreign key to the thing it audits.
--
-- Found by `bun run test:sql` on 2026-08-22, the first time anything ran the 41
-- files in supabase/tests/. Two of them fail, and both are RIGHT — the product
-- is what changed under them.
--
-- ── THE CONTRADICTION IN `audit_log` ──────────────────────────────────────
--
-- `audit_log_facility_id_fkey` is ON DELETE SET NULL. A SET NULL is an UPDATE,
-- performed by the system — and `prevent_audit_log_mutation` raises on every
-- UPDATE without exception. So the two rules cancel: deleting a facility is
-- refused with
--
--     audit_log is append-only: UPDATE is not permitted on an audit entry
--
-- which names neither the facility nor the cascade, and a platform admin
-- removing a facility they provisioned by mistake has no way to read that as
-- "your audit history is in the way".
--
-- The resolution is NOT to let the trigger through. Nulling the column would
-- succeed and then ERASE which facility each entry concerned — data loss inside
-- the one table whose entire purpose is not losing things. The append-only rule
-- is the one that is right.
--
-- What is wrong is the foreign key. `audit_log` already carries
-- `facility_name` beside `facility_id`, denormalised precisely so an entry
-- stays readable when the facility is gone, and `audit_log_read` gates on
-- `private.is_platform_admin()` rather than on the facility. So the column is
-- DESCRIPTIVE, not referential: it records which facility an event happened at,
-- including events at facilities that no longer exist.
--
-- ── AND THE SAME MISTAKE IN `grooming_appointment_history` ────────────────
--
-- Its own test says so out loud, in a comment written before the constraint
-- existed:
--
--     T7: the trail outlives the appointment
--     No FK, so deleting the booking cannot cascade the history away — which is
--     what makes it an audit trail rather than a detail-page field.
--
-- It has TWO foreign keys now, both ON DELETE RESTRICT: one to `bookings` and
-- one to `facilities`. The first makes a groomed booking undeletable and the
-- second holds the facility hostage to it. Neither is load-bearing:
-- `grooming_history_read` gates on `has_permission(facility_id, 'view_bookings')`,
-- which is a value comparison and works whether or not a row still exists on the
-- other side.
--
-- ── WHAT THIS DELIBERATELY DOES NOT TOUCH ─────────────────────────────────
--
-- Deleting a facility is still refused by `payments`, `store_credit_entries`
-- and `daycare_attendance`; deleting a booking is still refused by `payments`,
-- `store_credit_entries` and `package_pass_entries`. Those RESTRICTs are
-- CORRECT and stay. A booking with money against it must not be deletable, and
-- a facility with a payment history is an accounting record before it is a row.
-- Bookings are cancelled, not deleted.
--
-- This change is not "make things deletable". It removes two constraints that
-- contradict the tables they are on, and it is that narrow on purpose.
-- ============================================================================

-- ── The audit log records a facility; it does not depend on one ────────────
alter table public.audit_log
  drop constraint if exists audit_log_facility_id_fkey;

comment on column public.audit_log.facility_id is
  'Which facility the event happened at. DESCRIPTIVE, not referential: no foreign key, deliberately, so an entry outlives the facility it describes — see facility_name beside it. An audit trail that could be nulled by a cascade would lose the fact it exists to keep.';

-- ── The grooming trail outlives both the appointment and the salon ─────────
alter table public.grooming_appointment_history
  drop constraint if exists grooming_appointment_history_booking_id_fkey;

alter table public.grooming_appointment_history
  drop constraint if exists grooming_appointment_history_facility_id_fkey;

comment on column public.grooming_appointment_history.booking_id is
  'The appointment this entry describes. No foreign key, deliberately: the trail outlives the booking, which is what makes it an audit trail rather than a detail-page field. RESTRICT was added at some point and made a groomed booking undeletable.';

comment on column public.grooming_appointment_history.facility_id is
  'Whose salon it was. No foreign key, for the same reason as booking_id — and it is still what grooming_history_read gates on, which is a value comparison and needs no referenced row.';
