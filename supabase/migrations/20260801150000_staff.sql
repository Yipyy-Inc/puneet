-- ============================================================================
-- Staff.
--
-- The last mock in the operational core, and the one holding three other
-- things up: the legacy identity bridge in src/lib/auth, the booking-assignment
-- rotation that INVENTS which groomer serves an appointment, and the
-- client-writable role systems that stand between us and AUTH_ENFORCED.
--
-- ── A staff record is not a membership ─────────────────────────────────────
-- `facility_memberships` already exists and answers "what may this account
-- do here". That is access. This table answers "who works here" — the HR
-- record: name, contact, job title, hire date, payroll, calendar colour.
--
-- They are separate because they have genuinely different lifecycles. A
-- facility adds someone before they accept an invite (no account, no
-- membership, but a real staff record with shifts assigned). Someone leaves
-- and their access is revoked while their record must survive for payroll and
-- history. Modelling both as one row would force a fake auth user for every
-- new hire and destroy history on offboarding.
--
-- Same relationship clients have to profiles: `membership_id` is nullable, and
-- null is the normal state for a new hire, not an error.
--
-- ── `legacy_id` is the id the app actually uses ─────────────────────────────
-- StaffProfile.id is a string ("fs-owner-01") throughout the TypeScript and
-- in 47 files that still import the mock array. Keeping it means the swap can
-- proceed file by file instead of as one 47-file commit.
--
-- ── permissionOverrides stays in `details`, for now ────────────────────────
-- The three-layer permission cascade already has a home for it:
-- `membership_permissions`. But most staff have no membership yet, so there is
-- nothing to hang an override on. Reconciling the two is the follow-up that
-- comes with giving staff real accounts — not something to half-do here.
-- ============================================================================

create table public.staff (
  id           uuid primary key default gen_random_uuid(),
  facility_id  uuid not null references public.facilities (id) on delete cascade,

  -- Their access, once they have an account. Null for a new hire who has not
  -- accepted an invite — the normal case, not a broken row.
  membership_id uuid references public.facility_memberships (id) on delete set null,

  /** The app-facing string id, e.g. "fs-owner-01". */
  legacy_id    text unique,

  first_name   text not null,
  last_name    text not null,
  email        text not null,
  phone        text,
  job_title    text,
  avatar_url   text,
  color_hex    text,

  primary_role      public.facility_staff_role not null,
  additional_roles  public.facility_staff_role[] not null default '{}',
  service_assignments public.service_module[] not null default '{}',

  status       text not null default 'active'
                 check (status in ('active', 'invited', 'inactive', 'terminated')),
  status_changed_at timestamptz,
  status_reason     text,
  status_note       text,

  show_on_calendar boolean not null default true,
  last_active      timestamptz,

  -- payroll, employment, permissionOverrides, notifications, clockIn,
  -- calendarAccess, assignedLocations, customRoleIds, counters
  details      jsonb not null default '{}'::jsonb,

  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),

  -- One staff record per email per facility. Scoped to the facility for the
  -- same reason clients are: the same person can genuinely work for two
  -- businesses on the platform.
  constraint staff_facility_email_key unique (facility_id, email)
);

create index staff_facility_idx   on public.staff (facility_id);
create index staff_membership_idx on public.staff (membership_id) where membership_id is not null;
create index staff_status_idx     on public.staff (facility_id, status);
create index staff_email_idx      on public.staff (lower(email));

create trigger staff_set_updated_at
  before update on public.staff
  for each row execute function private.set_updated_at();

-- ── Bookings point at a staff record ────────────────────────────────────────
-- `assigned_staff_id` referenced facility_memberships, which was wrong for the
-- same reason above: the person serving an appointment is a staff record, and
-- most of them have no membership. `assigned_staff_name` remains as the
-- display string until every booking has a real assignment.
alter table public.bookings
  drop constraint if exists bookings_assigned_staff_id_fkey;

alter table public.bookings
  add constraint bookings_assigned_staff_id_fkey
  foreign key (assigned_staff_id) references public.staff (id) on delete set null;

-- ── Who am I, as a staff member? ────────────────────────────────────────────
-- SECURITY DEFINER so it can read staff while the staff policies are being
-- evaluated, and in `private` so it is not reachable as an RPC.
create or replace function private.own_staff_ids()
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select s.id
    from public.staff s
    join public.facility_memberships m on m.id = s.membership_id
   where m.profile_id = (select auth.uid())
     and m.is_active;
$$;

-- `authenticated` explicitly. Revoking from PUBLIC also removes what it
-- inherits, and every policy calling this would then fail closed.
grant execute on function private.own_staff_ids() to authenticated;
revoke execute on function private.own_staff_ids() from anon;

-- ── RLS ─────────────────────────────────────────────────────────────────────

alter table public.staff enable row level security;

-- Everyone with a membership can see their colleagues: rotas, calendars and
-- handovers are unusable otherwise. `view_staff` gates the fuller staff
-- directory; being able to see that a groomer exists is not the sensitive part
-- — payroll and permissions are, and those live in `details`.
create policy staff_read on public.staff
  for select to authenticated
  using (
    private.is_platform_admin()
    or id in (select private.own_staff_ids())
    or facility_id in (select private.member_facility_ids())
  );

create policy staff_insert on public.staff
  for insert to authenticated
  with check (private.has_permission(facility_id, 'manage_staff'));

-- A staff member may edit their OWN record (phone, avatar, colour); changing
-- anyone else's needs manage_staff. Which fields they may change is not
-- something RLS can express — that belongs in the route.
create policy staff_update on public.staff
  for update to authenticated
  using (
    id in (select private.own_staff_ids())
    or private.has_permission(facility_id, 'manage_staff')
  )
  with check (
    id in (select private.own_staff_ids())
    or private.has_permission(facility_id, 'manage_staff')
  );

-- No delete policy. Staff are terminated, not deleted — payroll, worked shifts
-- and the audit trail all reference them.
