-- ============================================================================
-- Clover, phase 1a: putting a merchant's tokens away, and getting them back.
--
-- Two functions, and the interesting part is who may call them.
--
-- ── GRANTED TO service_role AND NOBODY ELSE ───────────────────────────────
--
-- These live in `public` because that is the only schema PostgREST exposes, so
-- it is the only place the Next.js server can reach a function. That makes the
-- GRANT the whole security boundary: EXECUTE is revoked from `anon` and
-- `authenticated` and given to `service_role`, which the browser never holds.
--
-- Being SECURITY DEFINER as well is not belt-and-braces here — it is required,
-- because `private.payment_credentials` and `vault` are unreachable for any
-- caller. But a definer function that anyone could execute would be a public
-- endpoint that returns live merchant tokens, so the revoke is what matters.
--
-- ── ROTATION UPDATES THE SECRET, IT DOES NOT ADD ONE ──────────────────────
--
-- Refreshing an OAuth token every few hours by calling vault.create_secret
-- would leave a vault filling with dead tokens, each one still decryptable and
-- each one a credential. The secret is created once per facility and per kind,
-- named clover:<facility>:access, and rotation overwrites it in place.
--
-- ── THE TOKEN IS NEVER RETURNED TO A CALLER THAT ONLY NEEDS THE STATE ─────
--
-- payment_access_token() exists for one purpose: the server is about to call
-- Clover. Everything else — is this facility connected, which merchant, which
-- environment, when did it last work — is on public.payment_connections, which
-- the facility itself can read and which contains nothing sensitive. Asking
-- "are we connected?" must never travel through a function that hands back a
-- token, or it will end up in a component that renders it.
-- ============================================================================

create or replace function public.store_payment_credentials(
  p_facility_id     uuid,
  p_merchant_id     text,
  p_environment     text,
  p_access_token    text,
  p_refresh_token   text default null,
  p_access_expires  timestamptz default null,
  p_refresh_expires timestamptz default null,
  p_public_api_key  text default null,
  p_scopes          text[] default '{}',
  p_connected_by    text default null,
  p_processor       text default 'clover'
)
returns void
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  v_access_name  text := format('%s:%s:access',  p_processor, p_facility_id);
  v_refresh_name text := format('%s:%s:refresh', p_processor, p_facility_id);
  v_access_id    uuid;
  v_refresh_id   uuid;
begin
  if p_access_token is null or length(trim(p_access_token)) = 0 then
    raise exception 'An access token is required to record a connection.'
      using errcode = '22023';
  end if;

  insert into public.payment_connections as pc
    (facility_id, processor, environment, merchant_id, public_api_key,
     status, scopes, connected_by, connected_at, revoked_at, last_error,
     last_verified_at)
  values
    (p_facility_id, p_processor, p_environment, p_merchant_id, p_public_api_key,
     'connected', coalesce(p_scopes, '{}'), p_connected_by, now(), null, null,
     now())
  on conflict (facility_id, processor) do update
     set environment      = excluded.environment,
         merchant_id      = excluded.merchant_id,
         -- A refresh does not carry a public key; keep the one we have rather
         -- than blanking the value the iframe needs.
         public_api_key   = coalesce(excluded.public_api_key, pc.public_api_key),
         status           = 'connected',
         scopes           = excluded.scopes,
         connected_by     = coalesce(excluded.connected_by, pc.connected_by),
         connected_at     = coalesce(pc.connected_at, excluded.connected_at),
         revoked_at       = null,
         last_error       = null,
         last_verified_at = now();

  select c.access_token_secret_id, c.refresh_token_secret_id
    into v_access_id, v_refresh_id
    from private.payment_credentials c
   where c.facility_id = p_facility_id and c.processor = p_processor;

  if v_access_id is null then
    v_access_id := vault.create_secret(
      p_access_token, v_access_name, 'Clover OAuth access token');
  else
    perform vault.update_secret(v_access_id, p_access_token, v_access_name);
  end if;

  if p_refresh_token is not null then
    if v_refresh_id is null then
      v_refresh_id := vault.create_secret(
        p_refresh_token, v_refresh_name, 'Clover OAuth refresh token');
    else
      perform vault.update_secret(v_refresh_id, p_refresh_token, v_refresh_name);
    end if;
  end if;

  insert into private.payment_credentials as pcred
    (facility_id, processor, access_token_secret_id, refresh_token_secret_id,
     access_token_expires_at, refresh_token_expires_at, rotated_at)
  values
    (p_facility_id, p_processor, v_access_id, v_refresh_id,
     p_access_expires, p_refresh_expires, now())
  on conflict (facility_id, processor) do update
     set access_token_secret_id   = excluded.access_token_secret_id,
         refresh_token_secret_id  = coalesce(excluded.refresh_token_secret_id,
                                             pcred.refresh_token_secret_id),
         access_token_expires_at  = excluded.access_token_expires_at,
         refresh_token_expires_at = coalesce(excluded.refresh_token_expires_at,
                                             pcred.refresh_token_expires_at),
         rotated_at               = now();
end;
$fn$;

comment on function public.store_payment_credentials is
  'Records a merchant connection and puts its OAuth tokens in Vault. service_role only — see the header of 20260807700000.';

-- Returns the live tokens. The ONLY reason to call this is that the server is
-- about to talk to Clover.
create or replace function public.payment_access_token(
  p_facility_id uuid,
  p_processor   text default 'clover'
)
returns table (
  access_token             text,
  refresh_token            text,
  access_token_expires_at  timestamptz,
  refresh_token_expires_at timestamptz,
  merchant_id              text,
  environment              text
)
language sql
stable
security definer
set search_path = ''
as $fn$
  select (select s.decrypted_secret from vault.decrypted_secrets s
           where s.id = c.access_token_secret_id),
         (select s.decrypted_secret from vault.decrypted_secrets s
           where s.id = c.refresh_token_secret_id),
         c.access_token_expires_at,
         c.refresh_token_expires_at,
         pc.merchant_id,
         pc.environment
    from private.payment_credentials c
    join public.payment_connections pc
      on pc.facility_id = c.facility_id and pc.processor = c.processor
   where c.facility_id = p_facility_id
     and c.processor = p_processor
     and pc.status = 'connected';
$fn$;

comment on function public.payment_access_token is
  'Live merchant tokens, for a server about to call Clover. service_role only. Ask payment_connections for anything that is not the token itself.';

-- Marks a connection as broken, so a facility that has silently stopped taking
-- card payments is visible before the owner rings up. Deliberately does NOT
-- touch the credentials: a failed call is usually a network or a scope problem,
-- and throwing the tokens away turns a retry into a re-authorisation.
create or replace function public.record_payment_connection_error(
  p_facility_id uuid,
  p_error       text,
  p_processor   text default 'clover'
)
returns void
language sql
security definer
set search_path = ''
as $fn$
  update public.payment_connections
     set status     = 'error',
         last_error = left(coalesce(p_error, 'Unknown error'), 500)
   where facility_id = p_facility_id
     and processor = p_processor;
$fn$;

-- ── The grants ARE the security boundary ──────────────────────────────────

revoke all on function public.store_payment_credentials(
  uuid, text, text, text, text, timestamptz, timestamptz, text, text[], text, text)
  from public, anon, authenticated;
revoke all on function public.payment_access_token(uuid, text)
  from public, anon, authenticated;
revoke all on function public.record_payment_connection_error(uuid, text, text)
  from public, anon, authenticated;

grant execute on function public.store_payment_credentials(
  uuid, text, text, text, text, timestamptz, timestamptz, text, text[], text, text)
  to service_role;
grant execute on function public.payment_access_token(uuid, text)
  to service_role;
grant execute on function public.record_payment_connection_error(uuid, text, text)
  to service_role;
