-- ============================================================================
-- The session record — what staff WRITE during a groom.
--
-- Everything below currently lives in React state on the appointment detail
-- page and the session panel. A groomer types "muzzle needed, snapped at the
-- dryer" on a booking, hits refresh, and it is gone. That is the largest
-- remaining seam on the check-in board, which reads these and now gets real
-- ones.
--
-- ── DECISION 1: ALERTS AND COMMENTS ARE DIFFERENT TABLES ───────────────────
--
-- Both are "a bit of text somebody typed on a booking", and one
-- `grooming_notes` table with a `kind` column is the obvious economy. It is
-- refused for the same reason the sparse-wide-table trade was refused for
-- bookings and stations — they diverge exactly where it matters:
--
--   an ALERT carries `applies_to_future`, surfaces on every later booking for
--   the same pet, and is REMOVABLE (an alert on the wrong dog has to come off).
--
--   a COMMENT is a handoff thread between a bather and a groomer. It carries
--   nothing forward and is APPEND-ONLY — see Decision 3.
--
-- One table would mean a nullable flag that is meaningless for half its rows,
-- and one delete policy covering both, which would quietly make the thread
-- editable.
--
-- ── DECISION 2: THE AUTHOR IS STAMPED, NEVER SENT ──────────────────────────
--
-- The mock writes `staff: "You"` on every comment. The real answer is the
-- session's, and it is taken by trigger rather than from the request body: a
-- handoff note attributed to the wrong person is worse than an anonymous one,
-- and an alert about a dog that bites needs to say who saw it bite.
--
-- Both the uuid AND a name snapshot are stored. The uuid is the fact; the name
-- is what the card renders, frozen at write time so a staff member leaving does
-- not blank out the authorship on two years of notes. Same reasoning as
-- `owner_name` on the waitlist and `service_name` on the appointment.
--
-- ── DECISION 3: THE COMMENT THREAD IS APPEND-ONLY ──────────────────────────
--
-- No update policy, no delete policy. A handoff thread whose entries can be
-- silently edited afterwards is worse than no thread at all — the whole point
-- is that the bather can prove what they told the groomer. Correcting a comment
-- means posting another one, which is what people do in every chat they have
-- ever used.
--
-- Alerts DO get a delete policy, because "bites when ears are touched" on the
-- wrong pet is a safety problem that has to be removable, and because the
-- screen already has the button.
--
-- ── DECISION 4: THE CHECKLIST IS JSONB, AND THAT IS NOT A CONTRADICTION ────
--
-- 20260806100000 refused jsonb for the waitlist's preference unions. This is
-- the opposite case, and the difference is worth naming so the next person does
-- not read one of the two as a mistake:
--
--   the waitlist preference is BRANCHED ON and QUERIED. A malformed value there
--   does not raise — it makes the matcher skip a client who then waits forever.
--
--   the session checklist is written whole, read whole, never filtered, and
--   never branched on. Its worst failure mode is a checkbox rendering unticked.
--   The panel already replaces the entire array on every toggle.
--
-- A `(booking_id, step, done, done_at)` table would model it more precisely and
-- would let somebody ask which step dogs stall on. Nobody asks. The CHECK below
-- keeps it an array so at least the shape cannot rot.
--
-- ── WHAT IS NOT HERE ───────────────────────────────────────────────────────
--
-- `history` (AppointmentHistoryEntry) is still local, deliberately. It is an
-- append-only audit trail with ~15 call sites and needs the immutability
-- enforcement the audit log already has (trigger + REVOKE, 20260802...), which
-- is its own pass rather than a rider on this one.
--
-- CONSEQUENCE, stated rather than discovered: `recordHistory` is called from
-- the very functions that now persist. Adding an alert writes the alert to
-- Postgres and its "Alert added" history line to React state, so the note
-- survives a reload and the record of who added it does not. That is strictly
-- better than today, and it is not finished.
-- ============================================================================

create table public.grooming_alert_notes (
  id          uuid primary key default gen_random_uuid(),
  booking_id  uuid not null
                references public.grooming_appointments (booking_id) on delete cascade,
  facility_id uuid not null references public.facilities (id) on delete cascade,

  body        text not null check (length(btrim(body)) > 0),

  -- Carry-forward. The alert surfaces on every LATER booking for the same pet,
  -- derived at render by `getEffectiveAlertNotes` rather than copied onto those
  -- bookings — copying would mean editing the original stopped fixing the
  -- copies, which is how a corrected alert stays wrong on the calendar.
  applies_to_future boolean not null default false,

  -- Stamped, not sent. See Decision 2.
  author_name text not null default 'Staff',
  created_by  uuid references auth.users (id) on delete set null,
  created_at  timestamptz not null default now()
);

create index grooming_alert_notes_booking_idx
  on public.grooming_alert_notes (booking_id);

comment on table public.grooming_alert_notes is
  'At-a-glance safety alerts on a grooming booking. Carry-forward is DERIVED at render, never copied — see Decision 1 in 20260806140000.';

create table public.grooming_ticket_comments (
  id          uuid primary key default gen_random_uuid(),
  booking_id  uuid not null
                references public.grooming_appointments (booking_id) on delete cascade,
  facility_id uuid not null references public.facilities (id) on delete cascade,

  message     text not null check (length(btrim(message)) > 0),

  author_name text not null default 'Staff',
  created_by  uuid references auth.users (id) on delete set null,
  created_at  timestamptz not null default now()
);

create index grooming_ticket_comments_booking_idx
  on public.grooming_ticket_comments (booking_id, created_at);

comment on table public.grooming_ticket_comments is
  'Append-only staff handoff thread on a grooming booking. No update or delete policy, on purpose — see Decision 3 in 20260806140000.';

-- ── The session checklist ───────────────────────────────────────────────────
-- See Decision 4 for why this is a column and not a table.

alter table public.grooming_appointments
  add column if not exists session_progress jsonb not null default '[]'::jsonb;

alter table public.grooming_appointments
  add constraint grooming_appointments_progress_is_array
    check (jsonb_typeof(session_progress) = 'array');

comment on column public.grooming_appointments.session_progress is
  'The in-progress step checklist, [{step, done, at?}]. Written and read whole; never queried by element — see Decision 4 in 20260806140000.';

-- ── facility_id is derived, never accepted ──────────────────────────────────
--
-- Reusing `private.grooming_appointment_facility()` (20260805140000) rather
-- than writing a third copy: its non-`grooming_appointments` branch already
-- resolves the facility from the parent appointment by `booking_id`, which is
-- exactly what both tables need. RLS gates ROWS, so without this a caller who
-- may write a note may choose its facility_id and file it against another
-- business.

create trigger grooming_alert_notes_facility
  before insert or update on public.grooming_alert_notes
  for each row execute function private.grooming_appointment_facility();

create trigger grooming_ticket_comments_facility
  before insert or update on public.grooming_ticket_comments
  for each row execute function private.grooming_appointment_facility();

-- ── The author ──────────────────────────────────────────────────────────────
--
-- Both columns come from the session. `author_name` prefers the profile's full
-- name, falls back to its email, then to the column default — a note by
-- somebody with no profile row still says something true rather than claiming
-- to be from a person who does not exist.
--
-- When there is no session (service_role: seeds, migrations) the supplied
-- values are left alone. A trigger only runs after RLS has already decided the
-- caller may write, so a null subject here means the service role, not an
-- anonymous user.

create or replace function private.grooming_note_author()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_uid  uuid := (select auth.uid());
  v_name text;
begin
  if v_uid is null then
    return new;
  end if;

  new.created_by := v_uid;

  select coalesce(nullif(btrim(p.full_name), ''), nullif(btrim(p.email), ''))
    into v_name
    from public.profiles p
   where p.id = v_uid;

  if v_name is not null then
    new.author_name := v_name;
  end if;

  return new;
end;
$$;

create trigger grooming_zz_alert_note_author
  before insert on public.grooming_alert_notes
  for each row execute function private.grooming_note_author();

create trigger grooming_zz_ticket_comment_author
  before insert on public.grooming_ticket_comments
  for each row execute function private.grooming_note_author();

-- ── RLS ─────────────────────────────────────────────────────────────────────
--
-- ── READ IS STAFF-ONLY, AND THIS WAS A CORRECTION ──────────────────────────
--
-- The first cut mirrored the parent booking — `exists (select 1 from bookings
-- b where b.id = booking_id)` — copied from grooming_price_adjustments, on the
-- reasoning that a child's visibility should never drift from the row it
-- describes.
--
-- The RLS test caught it: a CLIENT could read every note on their own booking.
-- `bookings_read` deliberately lets an owner see their own bookings, so
-- mirroring it handed the customer "Muzzle needed — snapped at the dryer" and
-- the bather's handoff thread about their dog.
--
-- Mirroring the parent is right when the child is part of what the parent
-- already shows the customer. A price adjustment IS that — it is a line on
-- their bill, and they are entitled to it. An internal note is the opposite:
-- the type calls it an "internal staff note" and the screen files it under
-- staff-only. So these two ask for the permission directly.
--
-- The general rule, since the wrong instinct was the obvious one: mirror the
-- parent for things the customer is entitled to see, name the permission for
-- things they are not.

alter table public.grooming_alert_notes enable row level security;
alter table public.grooming_ticket_comments enable row level security;

create policy grooming_alert_notes_read on public.grooming_alert_notes
  for select to authenticated
  using (
    private.is_platform_admin()
    or private.has_permission(facility_id, 'view_bookings')
  );
create policy grooming_alert_notes_insert on public.grooming_alert_notes
  for insert to authenticated
  with check (private.has_permission(facility_id, 'edit_bookings'));
-- Removable: an alert on the wrong pet is a safety problem, not history.
create policy grooming_alert_notes_delete on public.grooming_alert_notes
  for delete to authenticated
  using (private.has_permission(facility_id, 'edit_bookings'));
-- No UPDATE policy. The screen adds and removes; editing the text of a safety
-- alert in place would change what a colleague already read, with nothing
-- recording that it changed.

create policy grooming_ticket_comments_read on public.grooming_ticket_comments
  for select to authenticated
  using (
    private.is_platform_admin()
    or private.has_permission(facility_id, 'view_bookings')
  );
create policy grooming_ticket_comments_insert on public.grooming_ticket_comments
  for insert to authenticated
  with check (private.has_permission(facility_id, 'edit_bookings'));
-- No UPDATE and no DELETE. See Decision 3 — the thread is append-only.
