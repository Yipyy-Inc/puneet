-- ============================================================================
-- The appointment history trail — write-once, append-only, IMMUTABLE.
--
-- 20260806140000 gave the session record its tables and said plainly what it
-- left behind: `recordHistory` is called from the very functions that now
-- persist, so adding an alert stored the alert and appended its "Alert added"
-- line to React state. The note survived a reload; the record of who added it
-- and when did not — which is the half that matters when somebody asks why a
-- muzzle warning appeared on their dog's file.
--
-- ── DECISION 1: THE UNION IS A DISCRIMINANT PLUS CHECKED COLUMNS ───────────
--
-- `AppointmentHistoryEntry` is a union in practice, and its own doc comment
-- says so: "either a freeform `description` event (created, email sent…) or a
-- structured `fieldChange` with before / after values so accountability is
-- preserved at the field level."
--
-- Same treatment as the waitlist's preference unions (20260806100000,
-- Decision 2): a `kind` column plus a CHECK asserting exactly which fields that
-- kind may use. A nullable-everything row would let a `field_change` be stored
-- with no field, and the entry would render as an accountability record that
-- accounts for nothing.
--
-- `before_value` and `after_value` stay nullable INSIDE a field_change,
-- deliberately — the type has them as `string | null`, and "this field was
-- empty before" is a real answer, distinct from "we did not record it".
--
-- ── DECISION 2: AN IMMUTABLE TABLE HOLDS NO FOREIGN KEYS ───────────────────
--
-- This is the one that is easy to get wrong, and it took a contradiction to
-- see it. The obvious schema gives this table three FKs — booking, facility,
-- author — matching every other child table here. Every one of them is a bug:
--
--   `booking_id  … on delete cascade`   → deleting a booking DELETES history
--   `facility_id … on delete cascade`   → deleting a facility DELETES history
--   `created_by  … on delete set null`  → deleting a user UPDATES history
--
-- All three are mutations, and the immutability trigger below refuses
-- mutations. So the FKs would not quietly corrupt the trail — they would make
-- the parent rows undeletable, with an error about an audit trigger that says
-- nothing about the booking somebody is trying to remove.
--
-- The resolution is to hold IDENTIFIERS rather than REFERENCES, and to validate
-- them once, at insert, where validation belongs for a row that will never
-- change again. `private.grooming_appointment_facility()` already does exactly
-- that: it resolves the facility from the parent appointment and raises 23503
-- when there is no such appointment. So a history row cannot be written against
-- a booking that does not exist, and cannot be rewritten afterwards.
--
-- THE TRAIL THEREFORE OUTLIVES THE APPOINTMENT, and that is the point rather
-- than a side effect. A record of what happened that disappears when somebody
-- deletes the thing it happened to is not an audit trail. Note that no role can
-- delete a booking through the API anyway — `public.bookings` has INSERT,
-- SELECT and UPDATE policies and no DELETE policy; cancellation is a status.
--
-- ── DECISION 3: THREE LAYERS, AND THE TRIGGER IS THE BINDING ONE ───────────
--
-- Copied from 20260625000000 (the audit log) rather than reinvented, including
-- its reasoning:
--
--   * RLS is BYPASSED by service_role, so "no UPDATE policy" does not stop a
--     privileged caller.
--   * GRANTs are bypassed by the table owner.
--   * A trigger fires for EVERY role, including the owner and service_role.
--
-- REVOKE and RLS are defence in depth. The trigger is the guarantee. TRUNCATE
-- needs its own statement-level trigger because it is not a row event.
--
-- REVOKE NAMES EVERY ROLE. `revoke … from public` is NOT `revoke … from anon`:
-- Supabase's `alter default privileges` grants to `anon` and `authenticated` BY
-- NAME, and revoking the PUBLIC pseudo-role leaves those standing. That
-- distinction was a live security bug in this project once already
-- (20260804200000); it is not going to be one twice.
--
-- ── READ IS STAFF-ONLY ─────────────────────────────────────────────────────
--
-- Named directly rather than mirrored from the parent booking. The last slice
-- shipped a leak by copying `exists (… from bookings …)` onto internal rows —
-- `bookings_read` lets a client read their OWN bookings, so mirroring it handed
-- the customer the internal record. History is staff-only for the same reason
-- the notes are.
-- ============================================================================

create table public.grooming_appointment_history (
  id uuid primary key default gen_random_uuid(),

  -- Identifiers, NOT references. See Decision 2. Validated at insert by the
  -- facility trigger, which raises when the appointment does not exist.
  booking_id  uuid not null,
  facility_id uuid not null,

  kind text not null check (kind in ('event', 'field_change')),

  description text,
  field       text,
  before_value text,
  after_value  text,

  -- Stamped from the session, never accepted from a caller.
  author_name text not null default 'Staff',
  created_by  uuid,
  created_at  timestamptz not null default now(),

  constraint grooming_history_shape check (
    case kind
      when 'event' then
        description is not null and length(btrim(description)) > 0
        and field is null and before_value is null and after_value is null
      when 'field_change' then
        field is not null and length(btrim(field)) > 0
        and description is null
    end
  )
);

create index grooming_appointment_history_booking_idx
  on public.grooming_appointment_history (booking_id, created_at);

comment on table public.grooming_appointment_history is
  'Immutable, append-only history of a grooming appointment. UPDATE/DELETE/TRUNCATE are blocked for EVERY role by trigger. Holds identifiers rather than foreign keys — see Decision 2 in 20260806160000.';

-- ── Derived columns, at insert only ─────────────────────────────────────────
-- Registered for INSERT alone: there is no UPDATE to derive anything for, and
-- registering one would imply updates are a thing that happens here.

create trigger grooming_appointment_history_facility
  before insert on public.grooming_appointment_history
  for each row execute function private.grooming_appointment_facility();

create trigger grooming_zz_history_author
  before insert on public.grooming_appointment_history
  for each row execute function private.grooming_note_author();

-- ── Layer 1: the immutability trigger (binding) ─────────────────────────────

create or replace function public.prevent_grooming_history_mutation()
returns trigger language plpgsql as $$
begin
  raise exception
    'grooming_appointment_history is append-only: % is not permitted', tg_op
    using errcode = 'insufficient_privilege',
          hint    = 'History entries are immutable; append a corrective entry instead.';
  return null;
end;
$$;

comment on function public.prevent_grooming_history_mutation is
  'Raises on any UPDATE/DELETE/TRUNCATE of public.grooming_appointment_history. Triggers fire for all roles including the table owner and service_role, which is what makes this the binding append-only guarantee.';

create trigger grooming_history_block_update
  before update on public.grooming_appointment_history
  for each row execute function public.prevent_grooming_history_mutation();

create trigger grooming_history_block_delete
  before delete on public.grooming_appointment_history
  for each row execute function public.prevent_grooming_history_mutation();

-- Statement-level: TRUNCATE is not a row event and needs its own trigger.
create trigger grooming_history_block_truncate
  before truncate on public.grooming_appointment_history
  for each statement execute function public.prevent_grooming_history_mutation();

-- ── Layer 2: privileges ─────────────────────────────────────────────────────
-- Every role BY NAME. See the header on why `public` alone is not enough.

revoke update, delete, truncate on public.grooming_appointment_history from public;
revoke update, delete, truncate on public.grooming_appointment_history from anon;
revoke update, delete, truncate on public.grooming_appointment_history from authenticated;
revoke update, delete, truncate on public.grooming_appointment_history from service_role;

grant select, insert on public.grooming_appointment_history to authenticated;
grant select, insert on public.grooming_appointment_history to service_role;

-- ── Layer 3: RLS ────────────────────────────────────────────────────────────

alter table public.grooming_appointment_history enable row level security;
-- FORCE so RLS applies to the table owner too. The trigger is still the real
-- guard; service_role bypasses RLS but is caught by it.
alter table public.grooming_appointment_history force row level security;

create policy grooming_history_read on public.grooming_appointment_history
  for select to authenticated
  using (
    private.is_platform_admin()
    or private.has_permission(facility_id, 'view_bookings')
  );

-- Appending is the only permitted write. There are deliberately NO update or
-- delete policies, so those are denied under RLS as well as by the trigger and
-- the REVOKE above.
create policy grooming_history_insert on public.grooming_appointment_history
  for insert to authenticated
  with check (private.has_permission(facility_id, 'edit_bookings'));
