-- ============================================================================
-- A facility membership is admin or staff, and a job title is not an access
-- tier.
--
-- ADR 0005. The product owner's model is three facility roles — Facility
-- admin, Staff, Customer. The database had thirteen, and they were doing two
-- unrelated jobs at once:
--
--   1. deciding which PORTAL you land in   (an access question, 2 answers)
--   2. selecting a PERMISSION TEMPLATE     (a job question, 13 answers)
--
-- Collapsing the thirteen would have destroyed (2): the presets genuinely
-- differ — owner 168 keys, manager 141, supervisor 82, reception 65, caretaker
-- 45, accountant 44, groomer 36, sanitation 24 — so one Staff role with one
-- permission set gives a sanitation worker an accountant's access, or everyone
-- the smallest set.
--
-- So (1) becomes its own column and (2) keeps `role` unchanged.
--
-- ── WHY `role` IS NOT RENAMED ─────────────────────────────────────────────
--
-- private.resolve_permission joins `facility_memberships.role` by name against
-- role_preset_permissions.role and facility_role_permissions.role. The three
-- must stay symmetric. Its MEANING changes — job title, not access tier — and a
-- comment says so; a rename would be a 930-row, three-table refactor to say the
-- same thing.
--
-- ── THE COLUMN IS NEVER LESS THAN THE ROLE IMPLIES ────────────────────────
--
-- Two columns that can disagree is how you get a membership with role='owner'
-- and access_level='staff': 168 permissions, and no admin portal to exercise
-- them in. RLS reads permissions, the gates read access — so that row is a
-- person who can drain the data through the API while the UI calls them staff.
--
-- The trigger below makes that state unrepresentable: an admin-tier job title
-- FORCES admin access. The column may only ever be MORE permissive than the
-- role implies (a receptionist promoted to run the business), never less. An
-- explicit attempt to demote an owner raises rather than being silently undone,
-- because "change their job title first" is the real answer.
--
-- ── THE ESCALATION THIS CLOSES, WHICH PRE-DATES IT ────────────────────────
--
-- memberships_insert/update are gated on `manage_staff`. That is a PERMISSION,
-- and a facility can grant a permission to any job title through its own role
-- editor (facility_role_permissions) or to one person (staff_permissions,
-- membership_permissions). So today a receptionist who has been given
-- manage_staff — a plausible thing for a front desk that books and hires — can
-- set anybody's primary_role to 'owner' and mint 168 permissions.
--
-- private.is_facility_admin is deliberately NOT routed through
-- private.has_permission for exactly this reason. If admin-ness were a
-- permission key, a facility could grant itself admin from its own settings
-- screen. It reads the membership column directly, which nothing but this
-- trigger and a platform admin can raise.
--
-- ── AND IT DOES NOT ASK ABOUT THE SUBSCRIPTION ────────────────────────────
--
-- private.has_permission excludes suspended and cancelled facilities. This
-- function must NOT, and the difference is load-bearing: the admin-only screen
-- a suspended facility needs most is the one showing them they are suspended
-- and letting them pay. Identity ("are you an admin here") and entitlement
-- ("is this business current") are separate questions, and gating the first on
-- the second locks the only person who can fix it out of the fix.
--
-- ── WHAT THIS MIGRATION DOES NOT DO ───────────────────────────────────────
--
-- It does not move any RLS policy onto is_facility_admin. Not one row changes
-- who may read it. facility_subscriptions_read and payment_connections_read are
-- still "any active member", which is too wide — that is the next change, kept
-- separate so this one can be proved to alter nothing but routing.
--
-- Proof that the permission cascade is untouched (per membership, before):
--   owner      9f0011c366274d2ca2ba9560926f1b05  168 granted
--   manager    d27ca77bfdb58b85a961c4ed527f65e1  141
--   reception  2cec40d076a5855b7c150d11cf8bb4a1   65
--   caretaker  ed3106456f6728173186f47da784d670   45
--   groomer    e7064586bccf0b3949cc9d30cc8342dc   36
-- ============================================================================

do $mig$
begin
  if not exists (select 1 from pg_type where typname = 'facility_access_level') then
    create type public.facility_access_level as enum (
      'admin',  -- runs the business: /facility, billing, staff, settings
      'staff'   -- works there: /employee, scoped by permissions
    );
  end if;
end $mig$;

-- ── The column, on all three tables in the grant chain ─────────────────────
--
-- Not just memberships. "Hire this person as an admin" has to survive the trip
-- staff -> facility_membership_grants -> facility_memberships, because the
-- membership does not exist until they accept. A level recorded only on the
-- membership could not be expressed at the moment somebody is hired.
--
-- DEFAULT 'staff', never 'admin'. Several code paths insert memberships without
-- naming a level, and every one of them must fail closed.

alter table public.facility_memberships
  add column if not exists access_level public.facility_access_level
    not null default 'staff';

alter table public.staff
  add column if not exists access_level public.facility_access_level
    not null default 'staff';

alter table public.facility_membership_grants
  add column if not exists access_level public.facility_access_level
    not null default 'staff';

comment on column public.facility_memberships.access_level is
  'Which portal this person gets: admin -> /facility, staff -> /employee. '
  'The access model (ADR 0005). Raised only by an existing facility admin, and '
  'forced to admin when role is an admin-tier job title.';

comment on column public.facility_memberships.role is
  'JOB TITLE, not an access tier (ADR 0005). Selects the permission template '
  'private.resolve_permission reads. Which portal you land in is access_level. '
  'Joined by name against role_preset_permissions and facility_role_permissions '
  '— do not rename.';

comment on column public.staff.access_level is
  'The access level this hire will hold once they accept. Travels to the grant '
  'and then to the membership.';

comment on column public.facility_membership_grants.access_level is
  'The access level being granted. Read from the staff row, never from a '
  'request — the same reason the grant carries the role rather than an '
  'invitation naming one.';

-- ── Backfill ───────────────────────────────────────────────────────────────
--
-- Exactly the set src/lib/auth/viewer.ts already routed to /facility, so the
-- landing path for all 9 live memberships is unchanged by this migration. That
-- is the point: the column starts out describing what is already true.
--
-- supervisor is included because ADR 0005 §3 says so and because it is what the
-- code did. Worth knowing that its preset holds neither manage_staff nor
-- settings_general (82 of 168 keys), so a supervisor reaches the admin portal
-- and finds much of it refuses them. No production membership is a supervisor.
-- Recorded rather than silently corrected — narrowing it is a product decision.

update public.facility_memberships
   set access_level = 'admin'
 where role in ('owner','admin','manager','supervisor')
   and access_level <> 'admin';

update public.staff
   set access_level = 'admin'
 where primary_role in ('owner','admin','manager','supervisor')
   and access_level <> 'admin';

update public.facility_membership_grants
   set access_level = 'admin'
 where role in ('owner','admin','manager','supervisor')
   and access_level <> 'admin';

-- ── The question every admin-only gate should ask ──────────────────────────

create or replace function private.is_facility_admin(p_facility_id uuid)
returns boolean
language sql
stable
security definer
set search_path to ''
as $fn$
  select private.is_platform_admin() or exists (
    select 1
      from public.facility_memberships m
     where m.profile_id   = (select auth.jwt()->>'sub')
       and m.facility_id  = p_facility_id
       and m.is_active
       and m.access_level = 'admin'::public.facility_access_level
  );
$fn$;

-- Callable by `authenticated` for the same reason has_platform_role is: an RLS
-- policy expression runs as the CURRENT user, so a policy calling a function
-- the caller may not execute FAILS rather than returning false. It leaks
-- nothing — it reads the caller's own sub, so it can only answer about them.
revoke execute on function private.is_facility_admin(uuid) from public, anon;
grant  execute on function private.is_facility_admin(uuid) to authenticated;

-- ── Normalisation + the escalation guard, in one BEFORE trigger ────────────
--
-- One trigger and not two, because the order matters: a role change to 'owner'
-- IS a request for admin access, so normalisation has to run first and the
-- escalation check has to see its result. Two triggers would let the raise
-- depend on alphabetical firing order.

create or replace function private.enforce_membership_access_level()
returns trigger
language plpgsql
security definer
set search_path to ''
as $fn$
declare
  v_sub      text := (select auth.jwt()->>'sub');
  v_becoming boolean;
begin
  -- Step 1 — an admin-tier job title forces admin access.
  if new.role in ('owner','admin','manager','supervisor') then
    if tg_op = 'UPDATE'
       and old.access_level = 'admin'::public.facility_access_level
       and new.access_level <> 'admin'::public.facility_access_level then
      raise exception
        'A % keeps admin access. Change their job title first, then their access.',
        new.role
        using errcode = '42501';
    end if;
    new.access_level := 'admin'::public.facility_access_level;
  end if;

  v_becoming := new.access_level = 'admin'::public.facility_access_level
                and (tg_op = 'INSERT'
                     or old.access_level is distinct from
                        'admin'::public.facility_access_level);

  if not v_becoming then
    return new;
  end if;

  -- Step 2 — only an admin makes an admin.
  --
  -- No JWT subject means the service role or a migration, which is the same
  -- carve-out private.enforce_staff_integrity already makes. The webhook that
  -- writes profiles — and therefore private.claim_grants_for, which runs off
  -- its trigger — has no session to check.
  if v_sub is null then
    return new;
  end if;

  if private.is_platform_admin() then
    return new;
  end if;

  if private.is_facility_admin(new.facility_id) then
    return new;
  end if;

  -- Claiming an admin grant made FOR you. Without this the founding owner
  -- cannot accept their own invitation: at that moment the facility has no
  -- admin, so there is nobody who could approve it.
  if exists (
    select 1
      from public.facility_membership_grants g
      join public.profiles p on lower(p.email) = g.email
     where g.facility_id  = new.facility_id
       and p.id           = new.profile_id
       and g.access_level = 'admin'::public.facility_access_level
  ) then
    return new;
  end if;

  raise exception
    'Only a facility admin may grant admin access. manage_staff is not enough.'
    using errcode = '42501';
end;
$fn$;

drop trigger if exists facility_memberships_access_level on public.facility_memberships;
create trigger facility_memberships_access_level
  before insert or update on public.facility_memberships
  for each row execute function private.enforce_membership_access_level();

-- The same rule where the level is FIRST written. A staff row and a grant are
-- how "hire this person as an admin" is expressed, so leaving them ungated
-- would let a manage_staff holder create the admin one table upstream and let
-- the claim carry it in.

create or replace function private.enforce_hire_access_level()
returns trigger
language plpgsql
security definer
set search_path to ''
as $fn$
declare
  v_sub  text := (select auth.jwt()->>'sub');
  v_role public.facility_staff_role :=
    case tg_table_name when 'staff' then new.primary_role else new.role end;
begin
  if v_role in ('owner','admin','manager','supervisor') then
    new.access_level := 'admin'::public.facility_access_level;
  end if;

  if new.access_level <> 'admin'::public.facility_access_level then
    return new;
  end if;

  if tg_op = 'UPDATE'
     and old.access_level = 'admin'::public.facility_access_level then
    return new;
  end if;

  if v_sub is null
     or private.is_platform_admin()
     or private.is_facility_admin(new.facility_id) then
    return new;
  end if;

  raise exception
    'Only a facility admin may hire an admin. manage_staff is not enough.'
    using errcode = '42501';
end;
$fn$;

drop trigger if exists staff_access_level on public.staff;
create trigger staff_access_level
  before insert or update on public.staff
  for each row execute function private.enforce_hire_access_level();

drop trigger if exists membership_grants_access_level on public.facility_membership_grants;
create trigger membership_grants_access_level
  before insert or update on public.facility_membership_grants
  for each row execute function private.enforce_hire_access_level();

-- ── A facility never runs out of admins ────────────────────────────────────
--
-- Nothing else in the schema can restore one: memberships_insert requires
-- manage_staff, which only the admin-tier presets hold, and raising
-- access_level now requires an existing admin. A facility that demotes its last
-- one is unrecoverable without a platform admin.

create or replace function private.protect_last_facility_admin()
returns trigger
language plpgsql
security definer
set search_path to ''
as $fn$
begin
  if old.access_level <> 'admin'::public.facility_access_level
     or not old.is_active then
    return coalesce(new, old);
  end if;

  if tg_op = 'UPDATE'
     and new.access_level = 'admin'::public.facility_access_level
     and new.is_active then
    return new;
  end if;

  -- The whole facility is being deleted, and memberships cascade from it. There
  -- is no business left to lock anybody out of.
  if tg_op = 'DELETE'
     and not exists (select 1 from public.facilities where id = old.facility_id) then
    return old;
  end if;

  if not exists (
    select 1 from public.facility_memberships m
     where m.facility_id   = old.facility_id
       and m.id           <> old.id
       and m.is_active
       and m.access_level  = 'admin'::public.facility_access_level
  ) then
    raise exception
      'That is the last admin of this facility. Promote somebody else first.'
      using errcode = '42501';
  end if;

  return coalesce(new, old);
end;
$fn$;

drop trigger if exists facility_memberships_last_admin on public.facility_memberships;
create trigger facility_memberships_last_admin
  before update or delete on public.facility_memberships
  for each row execute function private.protect_last_facility_admin();

-- ── The two functions that move a level along the chain ────────────────────
--
-- Both are reproduced from their LIVE bodies (pg_get_functiondef), not from the
-- migration that first created them — private.has_permission gained its
-- suspended-subscription check in a later migration, and rebuilding a function
-- from the older text is how work like that gets quietly undone.

create or replace function private.claim_grants_for(p_profile_id text, p_email text)
returns integer
language plpgsql
security definer
set search_path to ''
as $fn$
declare
  v_grant      record;
  v_membership uuid;
  v_claimed    integer := 0;
begin
  if p_profile_id is null or p_profile_id !~ '^user_' or p_email is null then
    return 0;
  end if;

  for v_grant in
    select * from public.facility_membership_grants
     where claimed_at is null
       and email = lower(p_email)
       and (expires_at is null or expires_at > now())
  loop
    insert into public.facility_memberships
      (facility_id, profile_id, role, access_level, is_active)
    values (v_grant.facility_id, p_profile_id, v_grant.role,
            v_grant.access_level, true)
    on conflict (profile_id, facility_id) do update
      set role         = excluded.role,
          access_level = excluded.access_level,
          is_active    = true
    returning id into v_membership;

    update public.facility_membership_grants
       set claimed_at         = now(),
           claimed_profile_id = p_profile_id
     where id = v_grant.id;

    update public.staff
       set membership_id = v_membership
     where id = v_grant.staff_id;

    v_claimed := v_claimed + 1;
  end loop;

  return v_claimed;
end;
$fn$;

create or replace function private.record_grant_for_staff(
  p_staff      public.staff,
  p_expires_at timestamptz default null
)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $fn$
declare
  v_id         uuid;
  v_profile_id text;
  v_claimed    integer := 0;
begin
  if (select auth.jwt()->>'sub') is null then
    raise exception 'You must be signed in to invite staff.'
      using errcode = '42501';
  end if;

  if p_staff.id is null then
    raise exception 'No staff record to grant a membership to.'
      using errcode = '22023';
  end if;

  if not private.has_permission(p_staff.facility_id, 'manage_staff')
     and not private.is_platform_admin() then
    raise exception 'You may not invite staff at this facility.'
      using errcode = '42501';
  end if;

  if coalesce(trim(p_staff.email), '') = '' then
    raise exception 'That staff member has no email address to invite.'
      using errcode = '22023';
  end if;

  insert into public.facility_membership_grants
    (facility_id, staff_id, email, role, access_level, granted_by, expires_at)
  values (p_staff.facility_id, p_staff.id, lower(trim(p_staff.email)),
          p_staff.primary_role, p_staff.access_level,
          (select auth.jwt()->>'sub'), p_expires_at)
  on conflict (staff_id) do update
    set email        = excluded.email,
        role         = excluded.role,
        access_level = excluded.access_level,
        granted_by   = excluded.granted_by,
        expires_at   = excluded.expires_at,
        created_at   = now(),
        claimed_at         = null,
        claimed_profile_id = null
  returning id into v_id;

  update public.staff
     set status = case
                    when p_staff.primary_role = 'owner'::public.facility_staff_role
                      then 'active'
                    else 'invited'
                  end,
         status_changed_at = now()
   where id = p_staff.id;

  select p.id into v_profile_id
    from public.profiles p
   where lower(p.email) = lower(trim(p_staff.email))
   limit 1;

  if v_profile_id is not null then
    v_claimed := private.claim_grants_for(v_profile_id, p_staff.email);
  end if;

  return jsonb_build_object(
    'grantId',     v_id,
    'staffId',     p_staff.legacy_id,
    'facilityId',  p_staff.facility_id,
    'email',       lower(trim(p_staff.email)),
    'role',        p_staff.primary_role,
    'accessLevel', p_staff.access_level,
    'claimed',     v_claimed > 0);
end;
$fn$;
