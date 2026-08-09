-- ===========================================================================
-- A facility owns its own name, address and contact details.
--
-- Until now it did not, and could not: `facilities` held id, org_id, name,
-- slug, timezone, legacy_id, allow_customer_signup and business_types. There
-- was nowhere to put an email address, a phone number or a street.
--
-- So the settings screen read `src/data/settings.ts`, and EVERY facility —
-- however new, however real — rendered:
--
--     PawCare Facility
--     contact@pawcare.com
--     +1 (555) 123-4567
--     123 Pet Street, San Francisco, CA
--
-- Not as a placeholder awaiting setup. There was no code path that could ever
-- have shown anything else. And it did not stay backstage: the estimate a real
-- customer opens prints "Questions? Call +1 (555) 123-4567 or email
-- contact@pawcare.com", so the fixture was being read out to other people's
-- clients.
--
-- ── NOTHING IS BACKFILLED ─────────────────────────────────────────────────
--
-- Every column lands NULL, including for the demo facility. A default of
-- "PawCare Facility" would move the fiction from the fixture into the
-- database, where it would look like data somebody entered. Empty is the
-- truthful state for a facility that has not filled this in, and the screen
-- can then ask for it.
--
-- `preferences` is the one exception, and it is not invented content: clock
-- format, weight unit and temperature unit have to be SOMETHING to render a
-- number, and these are the values the app already assumed.
-- ===========================================================================

alter table public.facilities
  add column if not exists email        text,
  add column if not exists phone        text,
  add column if not exists website      text,
  add column if not exists description  text,
  add column if not exists logo_url     text,
  add column if not exists address      jsonb,
  add column if not exists social_media jsonb not null default '{}'::jsonb,
  add column if not exists preferences  jsonb not null default
    '{"clockFormat":"12h","weightUnit":"lbs","temperatureUnit":"celsius"}'::jsonb;

comment on column public.facilities.address is
  'street, city, state, zipCode, country — one object because it is always read and written together.';
comment on column public.facilities.preferences is
  'clockFormat 12h|24h, weightUnit lbs|kg, temperatureUnit celsius|fahrenheit.';

-- ---------------------------------------------------------------------------
-- Who may change it.
--
-- `facilities_update` admits `private.is_platform_admin()` and nobody else, so
-- today a facility OWNER cannot correct their own phone number. Policies are
-- OR'd, so this is an ADDITIONAL policy rather than a replacement — revoking
-- the platform admin's route would break facility administration to fix a
-- typo.
--
-- `settings_general` rather than `manage_facility_settings`: the first admits
-- owner, admin AND manager, and a manager fixing a wrong phone number is
-- exactly the case this exists for. Both keys are real — checked against
-- `public.permissions` rather than assumed, because `has_permission()` fails
-- CLOSED on a key that does not exist and the result is indistinguishable from
-- a correct refusal.
-- ---------------------------------------------------------------------------

drop policy if exists facilities_update_own_profile on public.facilities;
create policy facilities_update_own_profile
  on public.facilities
  for update
  using (private.has_permission(id, 'settings_general'))
  with check (private.has_permission(id, 'settings_general'));

-- ---------------------------------------------------------------------------
-- What they may change.
--
-- RLS GATES ROWS, NOT COLUMNS. The policy above says "you may update your own
-- facility row", and without this trigger that sentence also means: move it to
-- another org, take a different slug (breaking every booking link already
-- handed out), or rewrite the legacy_id that half the app still joins on.
--
-- Same shape as `private.enforce_client_integrity()` on public.clients, which
-- exists for the same reason — and deliberately RESTORES the protected values
-- rather than raising. A facility saving its profile through a form that
-- happens to round-trip `slug` should have its address saved, not be handed an
-- error about a field it never touched. Identity is preserved; the edit
-- proceeds.
-- ---------------------------------------------------------------------------

create or replace function private.enforce_facility_profile_scope()
returns trigger
language plpgsql
security definer
set search_path to ''
as $$
begin
  -- No JWT means a server-side job or the service role: not a caller whose
  -- reach needs narrowing.
  if (select auth.jwt()->>'sub') is null then
    return new;
  end if;

  if private.is_platform_admin() then
    return new;
  end if;

  new.id                    := old.id;
  new.org_id                := old.org_id;
  new.slug                  := old.slug;
  new.legacy_id             := old.legacy_id;
  new.created_at            := old.created_at;
  -- Which modules a facility has bought, and whether the public signup page is
  -- open, are commercial state. They are changed where they are sold, not on
  -- the screen that edits a street address.
  new.business_types        := old.business_types;
  new.allow_customer_signup := old.allow_customer_signup;

  return new;
end;
$$;

drop trigger if exists facilities_profile_scope on public.facilities;
create trigger facilities_profile_scope
  before update on public.facilities
  for each row execute function private.enforce_facility_profile_scope();
