-- ============================================================================
-- A facility is provisioned in one transaction, or not at all.
--
-- Spec 002, phase 1. `/dashboard/facilities/new` is a six-step wizard whose
-- handleComplete was `console.log(...)` and a redirect: nothing was written, so
-- a superadmin could "create" a facility and get an empty list back.
--
-- ── WHY ONE FUNCTION RATHER THAN FIVE POSTGREST CALLS ──────────────────────
--
-- A facility with no owner, or an owner grant pointing at a facility whose
-- insert failed, is a support ticket that reads as corruption. Postgres already
-- gives all-or-nothing; using it costs less than writing compensation logic and
-- cannot drift from it.
--
-- ── WHAT THIS DOES NOT DO ─────────────────────────────────────────────────
--
-- It does not create a Clerk account and it does not take a password. Spec 002
-- D3: the owner is INVITED and sets their own password, so nobody at Yipyy ever
-- holds a credential for a customer's business. This records the membership
-- GRANT; phase 2 sends the invitation email. If the owner already has a Yipyy
-- account the grant is claimed here and now, and their membership is live
-- immediately -- that is `record_grant_for_staff` doing its existing job, not a
-- special case.
-- ============================================================================

-- ── The slug is a hostname, so constrain it like one ───────────────────────
--
-- Spec 002 D2 puts facilities on subdomains, which makes the slug a DNS label
-- rather than a display detail: `Pawradise Resort!` is not a hostname, and
-- `www` is already taken by the marketing site.
--
-- Enforced here rather than only in the wizard because the wizard is not the
-- only thing that will ever insert a facility -- the seed script, a support
-- fix, and a future import all bypass it.

alter table public.facilities
  drop constraint if exists facilities_slug_is_a_dns_label;

alter table public.facilities
  add constraint facilities_slug_is_a_dns_label
  check (slug ~ '^[a-z0-9]([a-z0-9-]{1,48}[a-z0-9])?$');

alter table public.facilities
  drop constraint if exists facilities_slug_not_reserved;

alter table public.facilities
  add constraint facilities_slug_not_reserved
  check (slug not in (
    -- hosts this platform already answers on
    'www', 'app', 'api', 'admin', 'dashboard', 'clerk', 'status', 'accounts',
    -- top-level route segments, so a slug can never shadow one
    'sign-in', 'sign-up', 'sso-callback', 'book', 'review', 'forms', 'onboard',
    'setup', 'profile', 'customer', 'facility', 'employee', 'groomer', 'staff',
    -- infrastructure names that are claimed sooner or later
    'mail', 'smtp', 'ftp', 'cdn', 'static', 'assets', 'support', 'help',
    'billing', 'docs', 'blog', 'test', 'staging', 'dev', 'internal'
  ));

-- ── Idempotency ────────────────────────────────────────────────────────────
--
-- A double-clicked button, a retried fetch or a redeployed serverless function
-- must not create two businesses. The caller mints a request id; the second
-- call with the same id returns the FIRST call's answer rather than doing the
-- work again.
--
-- The response is stored, not recomputed, because "what did that call return"
-- has exactly one true answer and re-deriving it would invent a second.

create table if not exists public.provisioning_requests (
  id          uuid primary key,
  requested_by text not null,
  facility_id uuid not null references public.facilities(id) on delete cascade,
  response    jsonb not null,
  created_at  timestamptz not null default now()
);

alter table public.provisioning_requests enable row level security;

drop policy if exists provisioning_requests_read on public.provisioning_requests;
create policy provisioning_requests_read on public.provisioning_requests
  for select to authenticated
  using (private.is_platform_admin());

-- No insert/update/delete policy at all: rows are written only by
-- provision_facility, which is SECURITY DEFINER. There is no reason for a
-- caller to forge a provisioning receipt, so there is no policy that lets them.

-- ── The grant, factored out so provisioning can reuse it ───────────────────
--
-- record_membership_grant(text) looks a staff member up by LEGACY id. Facilities
-- created from here have no legacy ids -- those belong to the mock era -- so the
-- mechanical half moves into a function that takes the row itself.
--
-- The permission check moves WITH it rather than being hoisted to the callers.
-- Two callers each remembering to check is how one of them eventually does not.

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

  -- The email comes off the STAFF ROW, never off an argument. That is what
  -- stops anyone aiming a membership grant at an address they control, and it
  -- is the reason this function takes the row rather than an email.
  insert into public.facility_membership_grants
    (facility_id, staff_id, email, role, granted_by, expires_at)
  values (p_staff.facility_id, p_staff.id, lower(trim(p_staff.email)),
          p_staff.primary_role, (select auth.jwt()->>'sub'), p_expires_at)
  on conflict (staff_id) do update
    set email       = excluded.email,
        role        = excluded.role,
        granted_by  = excluded.granted_by,
        expires_at  = excluded.expires_at,
        created_at  = now(),
        claimed_at         = null,
        claimed_profile_id = null
  returning id into v_id;

  update public.staff
     set status            = 'invited',
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
    'grantId',    v_id,
    'staffId',    p_staff.legacy_id,
    'facilityId', p_staff.facility_id,
    'email',      lower(trim(p_staff.email)),
    'role',       p_staff.primary_role,
    'claimed',    v_claimed > 0);
end;
$fn$;

-- `private` has USAGE for authenticated, so being in this schema hides nothing.
-- The permission check above is the real guard; this removes the second way in.
revoke execute on function private.record_grant_for_staff(public.staff, timestamptz)
  from public, anon, authenticated;

-- The public entry point keeps its exact signature and behaviour -- callers and
-- supabase/tests/membership-grants.sql are untouched -- and is now a lookup.
create or replace function public.record_membership_grant(
  p_staff_legacy_id text,
  p_expires_at      timestamptz default null
)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $fn$
declare
  v_staff public.staff;
begin
  select * into v_staff from public.staff where legacy_id = p_staff_legacy_id;
  if v_staff.id is null then
    raise exception 'No staff record for %.', p_staff_legacy_id
      using errcode = 'no_data_found';
  end if;

  return private.record_grant_for_staff(v_staff, p_expires_at);
end;
$fn$;

-- ── Provisioning ───────────────────────────────────────────────────────────

create or replace function public.provision_facility(
  p_request_id     uuid,
  p_name           text,
  p_slug           text,
  p_timezone       text,
  p_owner_name     text,
  p_owner_email    text,
  p_owner_phone    text default null,
  p_contact_email  text default null,
  p_contact_phone  text default null,
  p_website        text default null,
  p_locations      jsonb default '[]'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $fn$
declare
  v_existing    jsonb;
  v_org_id      uuid;
  v_facility_id uuid;
  v_location_id uuid;
  v_staff       public.staff;
  v_first       text;
  v_last        text;
  v_loc         jsonb;
  v_primary     boolean := true;
  v_grant       jsonb;
begin
  -- FIRST statement, before anything is read or written. This function runs as
  -- its owner and therefore around RLS, so it is the only thing standing
  -- between a facility owner and the ability to mint facilities.
  if not private.is_platform_admin() then
    raise exception 'Only a platform administrator may create a facility.'
      using errcode = '42501';
  end if;

  if p_request_id is null then
    raise exception 'A request id is required so a retry cannot create a second facility.'
      using errcode = '22023';
  end if;

  -- Idempotent replay. Returns what the first call returned, rather than
  -- re-deriving an answer that could differ from the one already sent.
  select r.response into v_existing
    from public.provisioning_requests r
   where r.id = p_request_id;
  if v_existing is not null then
    return v_existing || jsonb_build_object('replayed', true);
  end if;

  if coalesce(trim(p_name), '') = '' then
    raise exception 'A facility needs a name.' using errcode = '22023';
  end if;
  if coalesce(trim(p_owner_email), '') = '' then
    raise exception 'A facility needs an owner email address to invite.'
      using errcode = '22023';
  end if;

  -- One org per facility for now. Spec 002 open question 3 asks whether orgs
  -- are a real product concept (a chain with several facilities) or a schema
  -- artefact; until that is answered, creating one per facility keeps both
  -- answers reachable and neither is wrong yet.
  insert into public.orgs (name, slug)
  values (trim(p_name), lower(trim(p_slug)))
  returning id into v_org_id;

  insert into public.facilities (org_id, name, slug, timezone)
  values (v_org_id, trim(p_name), lower(trim(p_slug)),
          coalesce(nullif(trim(p_timezone), ''), 'America/Toronto'))
  returning id into v_facility_id;

  -- Locations. The wizard collects zero or more; a facility with none still
  -- needs a primary one, because getFacilityContext resolves a location and
  -- every booking hangs off it.
  if jsonb_array_length(coalesce(p_locations, '[]'::jsonb)) = 0 then
    insert into public.locations (facility_id, name, is_primary, timezone)
    values (v_facility_id, 'Main', true,
            coalesce(nullif(trim(p_timezone), ''), 'America/Toronto'))
    returning id into v_location_id;
  else
    for v_loc in select * from jsonb_array_elements(p_locations)
    loop
      insert into public.locations (facility_id, name, is_primary, timezone)
      values (v_facility_id,
              coalesce(nullif(trim(v_loc->>'name'), ''), 'Main'),
              v_primary,
              coalesce(nullif(trim(p_timezone), ''), 'America/Toronto'))
      returning id into v_location_id;
      v_primary := false;
    end loop;
  end if;

  -- The owner as a member of staff. `staff` is what the facility's own screens
  -- read, and facility_membership_grants.staff_id is NOT NULL, so the grant
  -- below has nothing to point at without this row.
  v_first := split_part(trim(coalesce(p_owner_name, '')), ' ', 1);
  v_last  := nullif(trim(substr(trim(coalesce(p_owner_name, '')),
                                length(v_first) + 1)), '');

  insert into public.staff (
    facility_id, first_name, last_name, email, phone,
    job_title, primary_role, status
  )
  values (
    v_facility_id,
    coalesce(nullif(v_first, ''), 'Owner'),
    coalesce(v_last, ''),
    lower(trim(p_owner_email)),
    nullif(trim(coalesce(p_owner_phone, '')), ''),
    'Owner',
    'owner'::public.facility_staff_role,
    'active'
  )
  returning * into v_staff;

  -- Records the grant, and claims it immediately if this person already has a
  -- Yipyy account. No password is set and no Clerk user is created here.
  v_grant := private.record_grant_for_staff(v_staff, null);

  v_existing := jsonb_build_object(
    'facilityId', v_facility_id,
    'orgId',      v_org_id,
    'locationId', v_location_id,
    'slug',       lower(trim(p_slug)),
    'staffId',    v_staff.id,
    'ownerEmail', lower(trim(p_owner_email)),
    'grant',      v_grant,
    'contact',    jsonb_build_object(
                    'email',   nullif(trim(coalesce(p_contact_email, '')), ''),
                    'phone',   nullif(trim(coalesce(p_contact_phone, '')), ''),
                    'website', nullif(trim(coalesce(p_website, '')), '')),
    'replayed',   false);

  insert into public.provisioning_requests (id, requested_by, facility_id, response)
  values (p_request_id, (select auth.jwt()->>'sub'), v_facility_id, v_existing);

  return v_existing;
end;
$fn$;

revoke execute on function public.provision_facility(
  uuid, text, text, text, text, text, text, text, text, text, jsonb
) from public, anon;

grant execute on function public.provision_facility(
  uuid, text, text, text, text, text, text, text, text, text, jsonb
) to authenticated;

-- Granted to `authenticated` rather than a narrower role because Postgres has
-- no role for "platform admin" -- that is a row in `profiles`. The guard is the
-- first statement in the body, and supabase/tests/facility-provisioning.sql
-- asserts a facility owner calling this is refused 42501.
