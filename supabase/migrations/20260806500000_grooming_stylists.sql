-- ============================================================================
-- Stylists: a grooming profile ON a staff member, not a second copy of them.
--
-- ── DECISION 1: THE PERSON IS NOT STORED HERE ─────────────────────────────
--
-- The fixture's `Stylist` carries name, email, phone, photo, hireDate and
-- status. Every one of those is already a column on `staff`, and duplicating
-- them is the drift this schema keeps removing. The evidence was sitting in the
-- data before a line of this was written:
--
--   staff  fs-groom-12  David Kim   status = inactive
--   mock   stylist-005  David Kim   status = "on-leave"
--
-- Two records of one person's employment, disagreeing. So this table holds
-- ONLY what is true of a groomer as a groomer -- what they are qualified for,
-- how much they can take on, how they want to be notified -- and the person is
-- read from `staff` through `staff_id`.
--
-- The app already wanted this: `buildMergedStylists` on the stylists page
-- starts from the staff roster, filters to `primaryRole = 'groomer'`, and
-- layers the grooming profile on top, with `hasGroomingProfile` marking the
-- ones that have none. Three groomers at this facility (fs-groom-01/02/03) are
-- exactly that case, and after this they still are, correctly.
--
-- ── DECISION 2: STATUS IS DERIVED, AND `on_leave` IS THE ONLY THING STORED ─
--
-- `staff.status` is active | inactive | invited | terminated. A groomer being
-- ON LEAVE is a grooming-floor state it cannot express, so the profile keeps a
-- boolean for it — and nothing else about status.
--
-- The status the app reads is then:
--
--   staff.status <> 'active'  ->  'inactive'   (employment wins)
--   on_leave                  ->  'on-leave'
--   otherwise                 ->  'active'
--
-- Storing the full status instead would let a stylist row say "active" about
-- somebody who has been terminated. This shape makes that unrepresentable.
--
-- Consequence, stated: David Kim reads `inactive`, not `on-leave`, because his
-- staff record says he is not currently employed. His `on_leave` flag is
-- seeded true anyway, so if that account is reactivated he comes back as
-- on-leave rather than silently available.
--
-- ── DECISION 3: CAPACITY IS COLUMNS ───────────────────────────────────────
--
-- `skill_level`, `can_handle_matted` and the rest are BRANCHED ON — the
-- appointment dialog filters groomers by them. Columns and CHECKs, not jsonb,
-- for the same reason the waitlist's date kinds are columns.
--
-- `notification_prefs` IS jsonb, and that is not inconsistent: it is written
-- whole by a preferences panel, read whole to decide a send, and never
-- filtered. Same test, opposite answer.
--
-- ── DECISION 4: `rating` AND `totalAppointments` GET NO COLUMNS ───────────
--
-- `totalAppointments` is a count of appointments, so it is a view.
--
-- `rating` has NO SOURCE. There is no reviews table, no report-card rating,
-- nothing in this database that a 4.9 could come from — it was a number typed
-- into a fixture. Rather than carry it forward as a column nothing can ever
-- update, it is absent, and the mapper returns 0. The stylists page already
-- draws "—" for an unrated groomer and averages only the rated ones, so the
-- KPI reads "no ratings yet", which is true. It stops being true the day there
-- is a review system, and then `rating` becomes a view over that.
-- ============================================================================

create table public.grooming_stylist_profiles (
  id uuid primary key default gen_random_uuid(),
  facility_id uuid not null references public.facilities (id) on delete cascade,
  legacy_id text,

  -- One profile per person. The unique constraint is the whole Decision 1:
  -- there is no way to give one groomer two grooming identities.
  staff_id uuid not null unique
    references public.staff (id) on delete cascade,

  specializations text[] not null default '{}',
  certifications  text[] not null default '{}',
  years_experience integer not null default 0
    check (years_experience >= 0 and years_experience <= 70),
  bio text not null default '',

  on_leave       boolean not null default false,
  visible_online boolean not null default false,
  calendar_color text check (calendar_color is null
                             or calendar_color ~ '^#[0-9a-fA-F]{6}$'),

  -- Services this groomer is explicitly qualified for. Empty means "not
  -- restricted", which is what the page's `ids.length === 0` branch renders.
  qualified_service_ids text[] not null default '{}',

  -- Capacity (Decision 3)
  max_daily_appointments      integer not null default 6
    check (max_daily_appointments > 0),
  max_weekly_appointments     integer
    check (max_weekly_appointments is null or max_weekly_appointments > 0),
  max_concurrent_appointments integer not null default 1
    check (max_concurrent_appointments > 0),
  preferred_pet_sizes text[] not null default '{}',
  skill_level text not null default 'standard'
    check (skill_level in ('basic', 'standard', 'premium', 'platinum')),
  can_handle_matted     boolean not null default false,
  can_handle_anxious    boolean not null default false,
  can_handle_aggressive boolean not null default false,

  notification_prefs jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint grooming_stylist_profiles_legacy_key unique (facility_id, legacy_id),
  -- A weekly ceiling below the daily one is a typo, not a policy.
  constraint grooming_stylist_weekly_ge_daily check (
    max_weekly_appointments is null
    or max_weekly_appointments >= max_daily_appointments
  )
);

create index grooming_stylist_profiles_facility_idx
  on public.grooming_stylist_profiles (facility_id);

-- ── Availability ────────────────────────────────────────────────────────────
--
-- Keyed by STAFF, not by profile: a groomer's working hours are a fact about
-- the person's week. Keying it to the profile would mean deleting a grooming
-- profile silently erases when somebody works.

create table public.grooming_stylist_availability (
  id uuid primary key default gen_random_uuid(),
  facility_id uuid not null references public.facilities (id) on delete cascade,
  staff_id uuid not null references public.staff (id) on delete cascade,

  day_of_week integer not null check (day_of_week between 0 and 6),
  start_time time not null,
  end_time   time not null,
  is_available boolean not null default true,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint grooming_stylist_availability_ends_after_start
    check (end_time > start_time),
  constraint grooming_stylist_availability_one_per_slot
    unique (staff_id, day_of_week, start_time)
);

create index grooming_stylist_availability_staff_idx
  on public.grooming_stylist_availability (staff_id, day_of_week);

-- ── The derived half ────────────────────────────────────────────────────────
--
-- `total_appointments` counts the grooming appointments assigned to this
-- person. The fixture's numbers (1250, 890, 720, 2100, 450) were lifetime
-- totals from before this system existed; they are not carried, so the counts
-- start at what this database actually knows. Small and true beats large and
-- invented -- the same call as the catalogue's `purchase_count`.

create view public.grooming_stylist_stats
with (security_invoker = true) as
  select
    s.id as staff_id,
    s.facility_id,
    count(ga.booking_id) as total_appointments
  from public.staff s
  left join public.bookings b on b.assigned_staff_id = s.id
  left join public.grooming_appointments ga on ga.booking_id = b.id
  group by s.id;

create trigger grooming_stylist_profiles_touch
  before update on public.grooming_stylist_profiles
  for each row execute function private.set_updated_at();
create trigger grooming_stylist_availability_touch
  before update on public.grooming_stylist_availability
  for each row execute function private.set_updated_at();

-- ── RLS ─────────────────────────────────────────────────────────────────────
--
-- READ is `view_services`, not `manage_staff`: the people who need to know who
-- can take a matted giant-breed at 3pm are schedulers and receptionists, and
-- they hold the former. WRITE is `manage_staff`, because changing somebody's
-- skill tier, certifications or capacity is a decision about a person's job.
--
-- Customers get a NARROW read: only groomers marked `visible_online`, and only
-- at a facility they are a client of. That flag exists to answer exactly this
-- question, and without the policy the booking flow's groomer picker would be
-- empty for the people it is for.

alter table public.grooming_stylist_profiles enable row level security;
alter table public.grooming_stylist_availability enable row level security;

create policy grooming_stylist_profiles_read on public.grooming_stylist_profiles
  for select to authenticated
  using (private.is_platform_admin()
         or private.has_permission(facility_id, 'view_services'));

create policy grooming_stylist_profiles_read_customer
  on public.grooming_stylist_profiles
  for select to authenticated
  using (
    visible_online
    and facility_id in (
      select c.facility_id from public.clients c
       where c.id in (select private.own_client_ids())
    )
  );

create policy grooming_stylist_profiles_write on public.grooming_stylist_profiles
  for all to authenticated
  using (private.has_permission(facility_id, 'manage_staff'))
  with check (private.has_permission(facility_id, 'manage_staff'));

create policy grooming_stylist_availability_read
  on public.grooming_stylist_availability
  for select to authenticated
  using (private.is_platform_admin()
         or private.has_permission(facility_id, 'view_services'));

create policy grooming_stylist_availability_write
  on public.grooming_stylist_availability
  for all to authenticated
  using (private.has_permission(facility_id, 'manage_staff'))
  with check (private.has_permission(facility_id, 'manage_staff'));

comment on table public.grooming_stylist_profiles is
  'The grooming-specific half of a groomer. The person -- name, contact, '
  'photo, employment status -- lives on `staff`; see the migration header for '
  'why status is derived rather than stored.';
