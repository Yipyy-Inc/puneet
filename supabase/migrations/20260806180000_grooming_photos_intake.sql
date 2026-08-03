-- ============================================================================
-- Drop-off: the intake record and the before/after photos.
--
-- The last two things on the check-in board with nowhere to go, payment aside.
-- A groomer photographs a matted coat to justify a fee, refreshes, and the
-- evidence is gone — which is the one case where "it was only in React state"
-- has a customer on the other end of it.
--
-- ── DECISION 1: A SECOND PRIVATE BUCKET, NOT A SHARED ONE ──────────────────
--
-- `staff-documents` already exists and is private (20260804090000). Reusing it
-- was considered and refused: its path prefix is `{facility}/{staff}/…` and its
-- policies are written against exactly that shape — an employee reads their own
-- prefix, `manage_staff` reads the facility's. A pet photo has no staff segment
-- and must not be gated on `manage_staff`, so sharing the bucket would mean
-- widening those policies with an `or` for a completely different subject.
--
-- The bucket is the boundary. Two subjects, two buckets, two sets of policies
-- that each say one thing.
--
-- PATH: {facility_id}/{booking_id}/{uuid}-{name}
--
-- Two levels, for the same reason the staff bucket has two: the prefix IS the
-- predicate. A storage policy runs on every object access, so it matches path
-- SEGMENTS rather than joining — and the segments are compared AS TEXT, never
-- cast to uuid. `(storage.foldername(name))[1]::uuid` reads better and is wrong:
-- the path is caller-supplied, so a malformed segment raises 22P02 and fails the
-- whole query instead of simply matching nothing. Casting `id::text` on the
-- other side cannot fail.
--
-- IMAGES ONLY. The staff bucket accepts PDFs because a passport scan is often
-- one. A photo of a dog is not a PDF, and the narrower list is free.
--
-- ── DECISION 2: THE PHOTO ROW IS THE RECORD, THE OBJECT IS THE BYTES ───────
--
-- `grooming_photos` stores no URL. `GroomingPhoto.url` is minted per request as
-- a short-lived signed URL, because the bucket is private and a stored URL is
-- either permanently valid (a public bucket wearing a disguise) or stale.
--
-- ── DECISION 3: INTAKE IS ONE ROW PER APPOINTMENT ──────────────────────────
--
-- `booking_id` is the primary key. Intake is a 1:1 fact about a drop-off, not a
-- collection — and making it the PK means the "does this appointment have
-- intake yet" question is answered by the row's existence rather than by a flag
-- somebody has to remember to set.
--
-- `before_photos` is NOT a column on it. The mock carries
-- `intake.beforePhotos: string[]` alongside `appointment.afterPhotos`, which
-- splits one concept across two shapes for no reason other than the order they
-- were written in. Both are rows in `grooming_photos`, discriminated by `kind`,
-- and the intake's before-photos are a filter rather than a second list that can
-- disagree with the first.
--
-- ── WHAT IS NOT HERE ───────────────────────────────────────────────────────
--
-- `issues` and `careLog` (GroomingIntake's two nested arrays) stay local. They
-- are not intake fields wearing a different hat: an issue auto-creates an
-- incident record and notifies a manager, and the care log seeds from the pet's
-- feeding and medication schedule. Both belong to systems that have not been
-- migrated, and modelling them here would mean guessing at the shape of the
-- incident table before it exists.
--
-- Consequence, stated: the intake row persists everything the check-in dialog
-- collects, and the session panel's issue list and care log still vanish on
-- reload exactly as they do today.
-- ============================================================================

-- ── Bucket ──────────────────────────────────────────────────────────────────

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'grooming-photos',
  'grooming-photos',
  false,
  10485760,  -- 10 MB, matching the CHECK on the row below.
  array['image/png', 'image/jpeg', 'image/heic']
)
on conflict (id) do nothing;

-- ── Photos ──────────────────────────────────────────────────────────────────

create table public.grooming_photos (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null
    references public.grooming_appointments (booking_id) on delete cascade,
  facility_id uuid not null references public.facilities (id) on delete cascade,

  kind text not null check (kind in ('before', 'after')),
  caption text,

  -- Where the bytes are. Unique because two rows pointing at one object means
  -- deleting either one orphans or destroys the other's file.
  storage_path text not null unique,

  -- What the BYTES proved, not what the browser declared. The route sniffs and
  -- stores the result; this CHECK is the floor under it, because PostgREST is
  -- reachable without the route and a rule enforced only there is enforced
  -- nowhere.
  content_type text not null
    check (content_type in ('image/png', 'image/jpeg', 'image/heic')),
  size_bytes integer not null check (size_bytes > 0 and size_bytes <= 10485760),

  -- Named to match `private.grooming_note_author()`, which stamps both from the
  -- session. The app calls this field `takenBy`; the mapper renames it. Sharing
  -- the trigger beats a near-identical copy that drifts.
  author_name text not null default 'Staff',
  created_by uuid,
  created_at timestamptz not null default now()
);

create index grooming_photos_booking_idx
  on public.grooming_photos (booking_id, kind, created_at);

comment on table public.grooming_photos is
  'Before/after grooming photos. Stores no URL — the bucket is private and reads are short-lived signed URLs. See Decision 2 in 20260806180000.';

-- ── Intake ──────────────────────────────────────────────────────────────────

create table public.grooming_intake (
  booking_id uuid primary key
    references public.grooming_appointments (booking_id) on delete cascade,
  facility_id uuid not null references public.facilities (id) on delete cascade,

  coat_condition text not null default 'normal'
    check (coat_condition in ('normal', 'matted', 'severely-matted')),
  behavior_notes text not null default '',

  -- The finer-grained arrival flags. Nullable because they post-date the
  -- session enum above and an older intake genuinely does not have them —
  -- which is a different fact from "the coat was clean".
  arrival_coat_condition text
    check (arrival_coat_condition is null or arrival_coat_condition in
           ('clean', 'slightly-matted', 'heavily-matted', 'flea-tick')),
  arrival_behavior text
    check (arrival_behavior is null or arrival_behavior in
           ('calm', 'anxious', 'aggressive', 'better-than-usual')),
  arrival_health_flags text[] not null default '{}',

  allergies text[] not null default '{}',
  special_instructions text not null default '',

  -- A fee warning with no amount is a warning about nothing, and an amount with
  -- no warning is a charge nobody was told about. One CHECK, both directions.
  matting_fee_warning boolean not null default false,
  matting_fee_amount numeric(10,2)
    check (matting_fee_amount is null or matting_fee_amount >= 0),
  constraint grooming_intake_matting_fee_consistent
    check (matting_fee_warning = (matting_fee_amount is not null)),

  drop_off_observations text,
  session_notes text,
  mood_tags text[] not null default '{}',
  session_started_at timestamptz,

  -- Who took the drop-off, stamped from the session. `completed_at` is set
  -- explicitly by the check-in write rather than defaulting to now(): a row
  -- created when the session panel opens is not a completed intake, and the
  -- screens read this to decide whether to prompt for one.
  author_name text not null default 'Staff',
  created_by uuid,
  completed_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.grooming_intake is
  'One row per grooming appointment, recording the drop-off. before-photos are NOT a column here — they are grooming_photos rows with kind = before. See Decision 3 in 20260806180000.';

-- ── Derived columns ─────────────────────────────────────────────────────────
-- Both reuse the existing helpers: the facility comes from the parent
-- appointment, the author from the session. RLS gates ROWS, so without the
-- first a caller who may add a photo may file it against another business.

create trigger grooming_photos_facility
  before insert or update on public.grooming_photos
  for each row execute function private.grooming_appointment_facility();

create trigger grooming_zz_photos_author
  before insert on public.grooming_photos
  for each row execute function private.grooming_note_author();

create trigger grooming_intake_facility
  before insert or update on public.grooming_intake
  for each row execute function private.grooming_appointment_facility();

create trigger grooming_zz_intake_author
  before insert on public.grooming_intake
  for each row execute function private.grooming_note_author();

create trigger grooming_intake_touch
  before update on public.grooming_intake
  for each row execute function private.set_updated_at();

-- ── RLS on the tables ───────────────────────────────────────────────────────
--
-- STAFF-ONLY READS, named directly rather than mirrored from the parent
-- booking. 20260806140000 shipped a leak by copying `exists (… from bookings …)`
-- onto internal rows — `bookings_read` lets a client read their OWN bookings, so
-- mirroring it hands the customer the record.
--
-- Photos are the case where that instinct is most tempting, because a customer
-- IS eventually meant to see their dog's after-photo — on the Report Card. But
-- that is a curated, published surface, not "every frame the groomer shot
-- including the matted before-shots taken to justify a fee". When the report
-- card is built it can expose what it chooses; the raw list stays internal.

alter table public.grooming_photos enable row level security;
alter table public.grooming_intake enable row level security;

create policy grooming_photos_read on public.grooming_photos
  for select to authenticated
  using (
    private.is_platform_admin()
    or private.has_permission(facility_id, 'view_bookings')
  );
create policy grooming_photos_insert on public.grooming_photos
  for insert to authenticated
  with check (private.has_permission(facility_id, 'edit_bookings'));
-- Deletable: a groomer takes a blurry shot, or one of the wrong dog. Unlike the
-- handoff thread there is nothing to prove by keeping it, and unlike the history
-- trail it is not a record of what happened — it is an attachment.
create policy grooming_photos_delete on public.grooming_photos
  for delete to authenticated
  using (private.has_permission(facility_id, 'edit_bookings'));

create policy grooming_intake_read on public.grooming_intake
  for select to authenticated
  using (
    private.is_platform_admin()
    or private.has_permission(facility_id, 'view_bookings')
  );
create policy grooming_intake_insert on public.grooming_intake
  for insert to authenticated
  with check (private.has_permission(facility_id, 'edit_bookings'));
create policy grooming_intake_update on public.grooming_intake
  for update to authenticated
  using (private.has_permission(facility_id, 'edit_bookings'))
  with check (private.has_permission(facility_id, 'edit_bookings'));

-- ── RLS on the objects ──────────────────────────────────────────────────────
--
-- `storage.objects` already has RLS enabled by Supabase; these are this
-- bucket's policies. Every one matches path SEGMENTS as text — see the header
-- on why casting the path to uuid would be a bug rather than a tidy-up.
--
-- The predicate is the FACILITY segment alone. The staff bucket needs a second
-- arm for "your own prefix" because an employee reads their own file without
-- holding a management permission; there is no equivalent here — nobody reads a
-- grooming photo by virtue of being its subject, since the subject is a dog.
--
-- ── THE SEGMENT IS COMPUTED OUTSIDE THE SUBQUERY, AND THAT IS THE POINT ────
--
-- The natural way to write this is:
--
--   and exists (select 1 from public.facilities f
--                where f.id::text = (storage.foldername(name))[1] and …)
--
-- and it is silently, completely broken. `public.facilities` HAS A COLUMN
-- CALLED `name`, so the unqualified `name` inside that subquery binds to the
-- FACILITY's name, not the object's. The policy then compares a facility's id
-- against a segment of that facility's own name, which never matches — every
-- access is denied and nothing raises.
--
-- It was written that way here first. The test caught it only because it
-- asserts the POSITIVE case as well: "a facility can upload under its own
-- prefix" failed, which is what exposed that "cannot upload under another
-- facility's prefix" had been passing vacuously all along. A suite with only
-- the negative half would have reported a working security boundary on a policy
-- that denied everyone.
--
-- Computing the segment in the outer scope and comparing it to a SET of ids
-- removes the shadowing entirely — `name` is unambiguous where it is evaluated.
--
-- SEE ALSO: the same bug is live in `staff_documents_object_*`
-- (20260804090000), where the `manage_staff` arm uses `storage.foldername(f.name)`
-- and therefore never matches. It fails closed — managers cannot read or delete
-- staff documents — so it is a functionality bug rather than a leak, and it is
-- recorded in the debt map rather than fixed in passing here.

create policy grooming_photos_object_read on storage.objects
  for select to authenticated
  using (
    bucket_id = 'grooming-photos'
    and (storage.foldername(name))[1] in (
      select f.id::text from public.facilities f
       where private.has_permission(f.id, 'view_bookings')
    )
  );

create policy grooming_photos_object_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'grooming-photos'
    and (storage.foldername(name))[1] in (
      select f.id::text from public.facilities f
       where private.has_permission(f.id, 'edit_bookings')
    )
  );

create policy grooming_photos_object_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'grooming-photos'
    and (storage.foldername(name))[1] in (
      select f.id::text from public.facilities f
       where private.has_permission(f.id, 'edit_bookings')
    )
  );
