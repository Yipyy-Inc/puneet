-- ============================================================================
-- Telephony, phase 1: whose phone line it is, and where the token lives.
--
-- ── ONE TWILIO ACCOUNT, ONE SUBACCOUNT PER FACILITY ───────────────────────
--
-- "Each facility has its own number" has two possible shapes, and only one of
-- them is buildable:
--
--   Twilio Connect     the facility signs up for Twilio themselves and
--                      authorises Yipyy, the way Clover works. Legacy, barely
--                      maintained, and it makes onboarding a facility a support
--                      ticket with a third party.
--
--   SUBACCOUNTS        Yipyy owns one Twilio account; each facility gets a
--                      subaccount created over the API, with its own SID, its
--                      own auth token, and its own numbers. Billing rolls up to
--                      the parent, traffic is isolated, and a facility can be
--                      suspended without touching anyone else.
--
-- This table is subaccounts. The PARENT credentials are not in here and must
-- never be: they are TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN in the server
-- environment, because they identify Yipyy rather than any facility, and a
-- parent token can act on every subaccount at once. Putting them in a
-- per-facility table would mean any facility row could hold the keys to all of
-- them — the same mistake the Clover header warns about in the other direction.
--
-- ── THE AUTH TOKEN IS CURRENTLY IN THE BROWSER ────────────────────────────
--
-- src/hooks/use-twilio-config.ts holds `accountSid` and `authToken` in a
-- client-side store, masks them in the UI, and its own comment says that in
-- production they would live server-side. There is no such path today. Nothing
-- in this migration reads that store; it is deleted in the same change.
--
-- This is also why `integrations` was left out of src/lib/settings/domains.ts.
-- facility_settings is readable by every member of a facility with a session,
-- and a Twilio auth token there lets any staff member send messages billed to
-- the facility and read its call recordings. That comment can come out once the
-- functions below are what the app calls.
--
-- ── WHAT IS SECRET AND WHAT IS NOT ────────────────────────────────────────
--
--   public.communication_connections   the subaccount SID, status, last error.
--                                      The SID is the username half of Twilio's
--                                      basic auth and appears in every API path
--                                      — an identifier, not a credential, the
--                                      same standing as Clover's merchant_id.
--
--   public.communication_numbers       the phone numbers themselves. Printed on
--                                      receipts and dialled by customers; there
--                                      is nothing to protect.
--
--   private.communication_credentials  the auth token. No grants to anon or
--                                      authenticated, and `private` is not a
--                                      schema PostgREST exposes.
--
-- And the token is not in the row either — it is in Vault and the row holds the
-- secret's id, so a leaked dump of this table is a list of uuids. A Twilio auth
-- token cannot be hashed: we have to send it to Twilio, and webhook signature
-- validation recomputes an HMAC with it on every inbound request.
--
-- ── NO API KEYS YET, DELIBERATELY ─────────────────────────────────────────
--
-- Twilio's better credential is an API Key pair (SK… + secret), because one can
-- be revoked without resetting the account. It is not here because the auth
-- token is needed regardless — X-Twilio-Signature is an HMAC keyed on the auth
-- token, so validating an inbound webhook requires it. A nullable api_key
-- column nobody writes would be a column that changes nothing, so it arrives on
-- the day something rotates one.
-- ============================================================================

create table if not exists public.communication_connections (
  facility_id      uuid not null references public.facilities (id) on delete cascade,
  provider         text not null default 'twilio' check (provider in ('twilio')),

  -- The subaccount SID (AC + 32 hex). Checked rather than trusted: the parent
  -- SID, an API key SID and a messaging service SID are all plausible pastes,
  -- and all of them would fail later as a confusing 401 from Twilio.
  subaccount_sid   text not null check (subaccount_sid ~ '^AC[0-9a-fA-F]{32}$'),
  friendly_name    text,

  status           text not null default 'pending'
                     check (status in ('pending', 'connected', 'suspended', 'error')),

  connected_by     text references public.profiles (id) on delete set null,
  connected_at     timestamptz,
  suspended_at     timestamptz,
  -- Why the last call failed, so a facility whose messages have silently
  -- stopped sending is visible before a customer misses a pickup.
  last_error       text,
  last_verified_at timestamptz,

  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),

  primary key (facility_id, provider),

  -- A line that claims to be live must name when it went live. Without this a
  -- half-finished provisioning run leaves a row asserting a working subaccount.
  constraint communication_connection_connected_is_dated
    check (status <> 'connected' or connected_at is not null)
);

comment on table public.communication_connections is
  'A facility''s Twilio subaccount. The non-secret half — the auth token lives in private.communication_credentials, in Vault. See the header of 20260809200000.';
comment on column public.communication_connections.subaccount_sid is
  'Twilio subaccount SID. Not a secret — it is in every API path. The PARENT account SID is an environment variable and is never stored here.';

create unique index if not exists communication_connections_subaccount_idx
  on public.communication_connections (provider, subaccount_sid);

alter table public.communication_connections enable row level security;

-- A facility may see whether its own line is connected; the platform team sees
-- every facility. Nobody writes through the table: provisioning is a server
-- action using the service role.
drop policy if exists communication_connections_read on public.communication_connections;
create policy communication_connections_read on public.communication_connections
  for select to authenticated
  using (
    private.is_platform_admin()
    or exists (
      select 1 from public.facility_memberships m
       where m.facility_id = communication_connections.facility_id
         and m.profile_id = (select auth.jwt() ->> 'sub')
         and m.is_active
    )
  );

drop trigger if exists communication_connections_touch on public.communication_connections;
create trigger communication_connections_touch
  before update on public.communication_connections
  for each row execute function private.set_updated_at();

-- ── The numbers ────────────────────────────────────────────────────────────
--
-- Separate from the connection because a facility has more than one: a main
-- line that rings, and often a second used only for outbound SMS so that
-- pickup notifications do not tie up the phone. Capabilities are stored because
-- Twilio sells numbers that cannot do all three, and discovering that at send
-- time means a message that silently never arrives.

create table if not exists public.communication_numbers (
  id            uuid primary key default gen_random_uuid(),
  facility_id   uuid not null,
  provider      text not null default 'twilio',

  -- E.164. The only format Twilio accepts, and the only one that survives a
  -- customer typing their number three different ways.
  phone_number  text not null check (phone_number ~ '^\+[1-9][0-9]{7,14}$'),
  -- Twilio's id for the number (PN + 32 hex), needed to release or reconfigure
  -- it. Absent for a number that was recorded before it was purchased.
  number_sid    text check (number_sid ~ '^PN[0-9a-fA-F]{32}$'),
  country       text not null default 'CA' check (country ~ '^[A-Z]{2}$'),

  sms_enabled   boolean not null default false,
  mms_enabled   boolean not null default false,
  voice_enabled boolean not null default false,

  -- What this number is FOR. A facility with one number has it as 'main'.
  purpose       text not null default 'main'
                  check (purpose in ('main', 'sms', 'voice')),

  -- Released numbers are kept, not deleted: an old number appears in years of
  -- message history and on printed receipts, and a row that vanishes turns
  -- those into an unexplained string.
  released_at   timestamptz,

  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),

  foreign key (facility_id, provider)
    references public.communication_connections (facility_id, provider) on delete cascade,

  -- A number belongs to exactly one facility at a time. Two facilities sending
  -- from the same number would make an inbound reply unroutable.
  constraint communication_number_is_unique unique (provider, phone_number),

  -- A number that can do nothing is a provisioning bug, not a configuration.
  constraint communication_number_does_something
    check (sms_enabled or mms_enabled or voice_enabled)
);

comment on table public.communication_numbers is
  'Phone numbers a facility sends and receives on. Released numbers are retained — message history refers to them.';

create index if not exists communication_numbers_facility_idx
  on public.communication_numbers (facility_id, released_at);

alter table public.communication_numbers enable row level security;

drop policy if exists communication_numbers_read on public.communication_numbers;
create policy communication_numbers_read on public.communication_numbers
  for select to authenticated
  using (
    private.is_platform_admin()
    or exists (
      select 1 from public.facility_memberships m
       where m.facility_id = communication_numbers.facility_id
         and m.profile_id = (select auth.jwt() ->> 'sub')
         and m.is_active
    )
  );

drop trigger if exists communication_numbers_touch on public.communication_numbers;
create trigger communication_numbers_touch
  before update on public.communication_numbers
  for each row execute function private.set_updated_at();

-- ── The token ──────────────────────────────────────────────────────────────
--
-- No policies and no grants. RLS is enabled anyway so that a future GRANT — the
-- kind added at 2am to make something work — still lands on a table with no
-- policy and therefore denies.

create table if not exists private.communication_credentials (
  facility_id          uuid not null,
  provider             text not null,

  -- A Vault secret id, NOT a token.
  auth_token_secret_id uuid not null,

  -- Bumped on every rotation, so a rotation loop that is failing silently shows
  -- up as a stale timestamp rather than as nothing at all.
  rotated_at           timestamptz not null default now(),
  created_at           timestamptz not null default now(),

  primary key (facility_id, provider),
  foreign key (facility_id, provider)
    references public.communication_connections (facility_id, provider) on delete cascade
);

comment on table private.communication_credentials is
  'Vault secret id for a facility''s Twilio subaccount auth token. Never the token. No grants to authenticated or anon, and `private` is not exposed by PostgREST.';

alter table private.communication_credentials enable row level security;

revoke all on private.communication_credentials from anon, authenticated;
revoke all on public.communication_connections from anon;
revoke all on public.communication_numbers from anon;

-- ============================================================================
-- Putting the token away, and getting it back.
--
-- ── GRANTED TO service_role AND NOBODY ELSE ───────────────────────────────
--
-- These live in `public` because that is the only schema PostgREST exposes, so
-- it is the only place the Next.js server can reach a function. That makes the
-- GRANT the whole security boundary: EXECUTE is revoked from `anon` and
-- `authenticated` and given to `service_role`, which the browser never holds.
--
-- SECURITY DEFINER is required as well, because `private.communication_
-- credentials` and `vault` are unreachable for any caller — but a definer
-- function anyone could execute would be a public endpoint handing out live
-- Twilio tokens, so the revoke is the part that matters.
--
-- ── ROTATION OVERWRITES; IT DOES NOT ACCUMULATE ───────────────────────────
--
-- One secret per facility, named twilio:<facility>:auth, updated in place. A
-- vault filling with superseded tokens is a vault full of credentials that all
-- still decrypt.
-- ============================================================================

create or replace function public.store_communication_credentials(
  p_facility_id    uuid,
  p_subaccount_sid text,
  p_auth_token     text,
  p_friendly_name  text default null,
  p_connected_by   text default null,
  p_provider       text default 'twilio'
)
returns void
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  v_secret_name text := format('%s:%s:auth', p_provider, p_facility_id);
  v_secret_id   uuid;
begin
  if p_auth_token is null or length(trim(p_auth_token)) = 0 then
    raise exception 'An auth token is required to record a connection.'
      using errcode = '22023';
  end if;

  insert into public.communication_connections as cc
    (facility_id, provider, subaccount_sid, friendly_name, status,
     connected_by, connected_at, suspended_at, last_error, last_verified_at)
  values
    (p_facility_id, p_provider, p_subaccount_sid, p_friendly_name, 'connected',
     p_connected_by, now(), null, null, now())
  on conflict (facility_id, provider) do update
     set subaccount_sid   = excluded.subaccount_sid,
         friendly_name    = coalesce(excluded.friendly_name, cc.friendly_name),
         status           = 'connected',
         connected_by     = coalesce(excluded.connected_by, cc.connected_by),
         -- Who connected it FIRST is the interesting fact; a token rotation
         -- three months later should not overwrite it.
         connected_at     = coalesce(cc.connected_at, excluded.connected_at),
         suspended_at     = null,
         last_error       = null,
         last_verified_at = now();

  select c.auth_token_secret_id into v_secret_id
    from private.communication_credentials c
   where c.facility_id = p_facility_id and c.provider = p_provider;

  if v_secret_id is null then
    v_secret_id := vault.create_secret(
      p_auth_token, v_secret_name, 'Twilio subaccount auth token');
  else
    perform vault.update_secret(v_secret_id, p_auth_token, v_secret_name);
  end if;

  insert into private.communication_credentials as ccred
    (facility_id, provider, auth_token_secret_id, rotated_at)
  values
    (p_facility_id, p_provider, v_secret_id, now())
  on conflict (facility_id, provider) do update
     set auth_token_secret_id = excluded.auth_token_secret_id,
         rotated_at           = now();
end;
$fn$;

comment on function public.store_communication_credentials is
  'Records a facility''s Twilio subaccount and puts its auth token in Vault. service_role only — see the header of 20260809200000.';

-- Returns the live token. The ONLY reasons to call this are that the server is
-- about to call Twilio, or is about to validate an X-Twilio-Signature.
--
-- Everything else — is this facility connected, what is their number, when did
-- it last work — is on communication_connections and communication_numbers,
-- which the facility itself can read and which contain nothing sensitive.
-- Asking "are we connected?" must never travel through a function that hands
-- back a token, or it ends up in a component that renders it.
create or replace function public.communication_auth_token(
  p_facility_id uuid,
  p_provider    text default 'twilio'
)
returns table (
  auth_token     text,
  subaccount_sid text,
  status         text
)
language sql
stable
security definer
set search_path = ''
as $fn$
  select (select s.decrypted_secret from vault.decrypted_secrets s
           where s.id = c.auth_token_secret_id),
         cc.subaccount_sid,
         cc.status
    from private.communication_credentials c
    join public.communication_connections cc
      on cc.facility_id = c.facility_id and cc.provider = c.provider
   where c.facility_id = p_facility_id
     and c.provider = p_provider
     -- A suspended line still needs its token to VALIDATE an inbound webhook
     -- that was already in flight; only 'error' and 'pending' are excluded,
     -- and 'pending' has no token to return anyway.
     and cc.status in ('connected', 'suspended');
$fn$;

comment on function public.communication_auth_token is
  'Live Twilio credentials, for a server about to call Twilio or validate a webhook signature. service_role only. Ask communication_connections for anything that is not the token.';

-- Marks a line as broken. Deliberately does NOT touch the credential: a failed
-- send is usually a carrier, balance or compliance problem, and throwing the
-- token away turns a retry into a re-provisioning.
create or replace function public.record_communication_connection_error(
  p_facility_id uuid,
  p_error       text,
  p_provider    text default 'twilio'
)
returns void
language sql
security definer
set search_path = ''
as $fn$
  update public.communication_connections
     set status     = 'error',
         last_error = left(coalesce(p_error, 'Unknown error'), 500)
   where facility_id = p_facility_id
     and provider = p_provider;
$fn$;

-- ── The grants ARE the security boundary ──────────────────────────────────

revoke all on function public.store_communication_credentials(
  uuid, text, text, text, text, text) from public, anon, authenticated;
revoke all on function public.communication_auth_token(uuid, text)
  from public, anon, authenticated;
revoke all on function public.record_communication_connection_error(uuid, text, text)
  from public, anon, authenticated;

grant execute on function public.store_communication_credentials(
  uuid, text, text, text, text, text) to service_role;
grant execute on function public.communication_auth_token(uuid, text)
  to service_role;
grant execute on function public.record_communication_connection_error(uuid, text, text)
  to service_role;
