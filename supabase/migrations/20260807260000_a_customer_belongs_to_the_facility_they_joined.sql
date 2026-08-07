-- ============================================================================
-- A customer belongs to the facility they joined, and to no other.
--
-- Spec 002, phase 5. D1: the facility owns the ACCOUNT (the `clients` row);
-- Clerk owns only the credential. Registering at Pawradise must create nothing
-- at Happy Paws, and arriving at Happy Paws signed in must make you a stranger
-- there rather than a customer.
--
-- ── THREE DEFECTS, LATENT BEHIND "THERE IS ONLY ONE FACILITY" ─────────────
--
-- `link_client_record()` had no facility filter at all:
--
--   update public.clients set profile_id = v_user_id
--    where lower(email) = lower(v_email) and profile_id is null
--
--   1. It claims across EVERY facility in one statement. `UPDATE … RETURNING …
--      INTO` does not raise on multiple rows in plpgsql — it silently assigns
--      one — so the caller got an id and no hint the others were touched.
--   2. Its early return (`profile_id = v_user_id limit 1`, unscoped) means that
--      once linked at one facility, a second facility's record for the same
--      person is NEVER claimed. Whether you end up linked at both or at one
--      depended only on which facility entered you first.
--   3. /api/clients/me reads the result with `.maybeSingle()`, which ERRORS on
--      two rows. Not degrades — errors. The customer portal breaks outright for
--      anyone who is a customer at two facilities.
--
-- The INTENT was right and is kept: it only ever claims a row a FACILITY
-- ALREADY CREATED for that address. That is a facility inviting a customer, not
-- a customer admitting themselves.
-- ============================================================================

-- ── Case-insensitive uniqueness ────────────────────────────────────────────
--
-- `clients_facility_email_key` is UNIQUE (facility_id, email) — correct in
-- shape, and case-SENSITIVE. `Person@x.com` and `person@x.com` could both exist
-- at one facility, so a returning customer gets a second record and their
-- history splits in two. `profiles` already solved this with
-- profiles_email_lower_key; this mirrors it.
--
-- Verified before writing: zero existing collisions, so nothing has to be
-- merged first.

alter table public.clients drop constraint if exists clients_facility_email_key;
drop index if exists public.clients_facility_email_key;

create unique index if not exists clients_facility_email_lower_key
  on public.clients (facility_id, lower(email));

-- ── Whether a facility takes registrations at all ──────────────────────────
--
-- Default FALSE, deliberately. A business that has not asked for public
-- registration should not acquire it because we shipped a feature — the
-- reverse default silently turns their client list into an open sign-up form.

alter table public.facilities
  add column if not exists allow_customer_signup boolean not null default false;

-- facilities_update is platform-admin only, so an owner cannot flip their own
-- flag by writing the row. This is the facility's decision to make, so it gets
-- a function gated on the permission that governs their settings.
create or replace function public.set_customer_signup(
  p_facility_id uuid,
  p_enabled     boolean
)
returns boolean
language plpgsql
security definer
set search_path to ''
as $fn$
begin
  if not private.is_platform_admin()
     and not private.has_permission(p_facility_id, 'settings_general') then
    raise exception 'You may not change this facility''s registration setting.'
      using errcode = '42501';
  end if;

  update public.facilities
     set allow_customer_signup = coalesce(p_enabled, false)
   where id = p_facility_id;

  if not found then
    raise exception 'No such facility.' using errcode = 'no_data_found';
  end if;

  return coalesce(p_enabled, false);
end;
$fn$;

revoke execute on function public.set_customer_signup(uuid, boolean) from public, anon;
grant execute on function public.set_customer_signup(uuid, boolean) to authenticated;

-- ── Claiming, scoped to one facility ───────────────────────────────────────
--
-- Explicitly dropped rather than replaced: `create or replace` with a different
-- argument list creates an OVERLOAD, and two functions with the same name and
-- different tenancy semantics is exactly the trap this migration exists to
-- close.

-- THEY TAKE A SLUG, NOT AN ID, and that is not cosmetic. A customer arriving at
-- pawradise.yipyy.com has a slug and nothing else, and `facilities_read` admits
-- members, existing clients and platform admins — so a person who is not yet a
-- customer there CANNOT resolve that slug to an id by any query available to
-- them. Measured: the first draft took a uuid and every call arrived with NULL,
-- because the caller's own subquery returned zero rows.
--
-- The uuid form stays as the private core, because the routes that already know
-- their facility should not have to look a slug back up.

drop function if exists public.link_client_record();

create or replace function private.link_client_at(p_facility_id uuid)
returns uuid
language plpgsql
security definer
set search_path to ''
as $fn$
declare
  v_user_id text := (select auth.jwt()->>'sub');
  v_email   text;
  v_client  uuid;
begin
  if v_user_id is null or p_facility_id is null then
    return null;
  end if;

  -- The caller's VERIFIED address, off their profile. Never an argument: an
  -- email parameter would let anyone claim any unclaimed record by naming it.
  select p.email into v_email from public.profiles p where p.id = v_user_id;
  if v_email is null then
    return null;
  end if;

  -- Already linked AT THIS FACILITY. Scoped, so being a customer at one
  -- facility no longer hides a record waiting at another (defect 2).
  select c.id into v_client
    from public.clients c
   where c.profile_id = v_user_id
     and c.facility_id = p_facility_id;
  if v_client is not null then
    return v_client;
  end if;

  -- At most one row can match: clients_facility_email_lower_key makes
  -- (facility_id, lower(email)) unique, so this is a single-row update by
  -- construction rather than by hope (defects 1 and 3).
  update public.clients c
     set profile_id = v_user_id
   where c.facility_id = p_facility_id
     and lower(c.email) = lower(v_email)
     and c.profile_id is null
  returning c.id into v_client;

  return v_client;
end;
$fn$;

revoke execute on function private.link_client_at(uuid)
  from public, anon, authenticated;

/** The public entry point: a slug, because that is what a subdomain gives you. */
create or replace function public.link_client_record(p_facility_slug text)
returns uuid
language plpgsql
security definer
set search_path to ''
as $fn$
declare
  v_facility uuid;
begin
  select f.id into v_facility
    from public.facilities f
   where f.slug = lower(trim(p_facility_slug));
  if v_facility is null then
    return null;
  end if;
  return private.link_client_at(v_facility);
end;
$fn$;

revoke execute on function public.link_client_record(text) from public, anon;
grant execute on function public.link_client_record(text) to authenticated;

-- ── Registering ────────────────────────────────────────────────────────────
--
-- `clients_insert` requires `create_clients`, which is a STAFF permission — a
-- pet owner has none. So self-registration cannot be a plain insert, and this
-- is the controlled way in.
--
-- The order below is the whole design:
--
--   already a client here      -> return it, idempotent
--   a record is waiting        -> CLAIM it, even when signup is closed, because
--                                 the facility entered them and that is an
--                                 invitation
--   signup is closed           -> refused
--   otherwise                  -> create, with the caller's own verified email
--
-- Nothing here reads an email from the request. The name and phone are theirs
-- to state; who they are is not.

create or replace function public.register_client(
  p_facility_slug text,
  p_name          text,
  p_phone         text default null
)
returns uuid
language plpgsql
security definer
set search_path to ''
as $fn$
declare
  v_user_id   text := (select auth.jwt()->>'sub');
  v_email     text;
  v_facility  uuid;
  v_open      boolean;
  v_client    uuid;
begin
  if v_user_id is null then
    raise exception 'You must be signed in to register.' using errcode = '42501';
  end if;

  select p.email into v_email from public.profiles p where p.id = v_user_id;
  if v_email is null then
    raise exception 'Your account has no verified email address yet.'
      using errcode = '22023';
  end if;

  select f.id, f.allow_customer_signup into v_facility, v_open
    from public.facilities f where f.slug = lower(trim(p_facility_slug));
  if v_facility is null then
    raise exception 'No such facility.' using errcode = 'no_data_found';
  end if;

  -- Idempotent, and it also covers claiming a record the facility already made.
  v_client := private.link_client_at(v_facility);
  if v_client is not null then
    return v_client;
  end if;

  if not v_open then
    raise exception 'This facility does not accept online registration.'
      using errcode = '42501';
  end if;

  insert into public.clients (facility_id, profile_id, name, email, phone, status, details)
  values (
    v_facility,
    v_user_id,
    coalesce(nullif(trim(p_name), ''), split_part(v_email, '@', 1)),
    lower(trim(v_email)),
    nullif(trim(coalesce(p_phone, '')), ''),
    'active',
    '{}'::jsonb
  )
  returning id into v_client;

  return v_client;
end;
$fn$;

revoke execute on function public.register_client(text, text, text) from public, anon;
grant execute on function public.register_client(text, text, text) to authenticated;
