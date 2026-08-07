-- ============================================================================
-- A merchant's currency comes from the merchant, not from our default.
--
-- Every currency column on this platform defaults to 'USD' — payments,
-- payment_intents, subscription_tiers, modules. That was a safe-looking default
-- and it is wrong for the first merchant we ever connected: Pawradise (Test)
-- reports
--
--   GET /v3/merchants/{mid}/properties  ->  "defaultCurrency": "CAD"
--
-- and Doggieville Mtl, a real facility on this platform, is in Montreal.
--
-- Charging a Canadian customer an amount labelled USD is not a display bug. The
-- amount is sent to Clover in the merchant's own currency whatever we call it,
-- so the money is right and the RECORD is wrong — receipts, reports, the ledger
-- and the customer's expectation all disagree with the bank. That is the kind
-- of error that is discovered by an accountant months later.
--
-- So the connection carries the currency Clover told us, captured when the
-- merchant connects, and the charge path reads it from there rather than
-- falling back to a default that is only correct in one country.
--
-- NULL means "not yet asked". It is deliberately nullable rather than defaulted
-- to USD: an unknown currency should stop a charge and ask, not quietly pick
-- the one that happens to be most common.
-- ============================================================================

alter table public.payment_connections
  add column if not exists currency text
    check (currency is null or currency ~ '^[A-Z]{3}$'),
  add column if not exists country text
    check (country is null or country ~ '^[A-Z]{2}$');

comment on column public.payment_connections.currency is
  'ISO-4217, read from the merchant''s own Clover properties. NULL means not yet asked — never assume USD.';
comment on column public.payment_connections.country is
  'ISO-3166-1 alpha-2, from the merchant record. Decides which Clover estate a production merchant belongs to.';

-- store_payment_credentials gains the two, kept nullable so a token refresh —
-- which does not re-read the merchant — leaves them alone rather than blanking
-- what the connect leg discovered.

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
  p_processor       text default 'clover',
  p_currency        text default null,
  p_country         text default null
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
     last_verified_at, currency, country)
  values
    (p_facility_id, p_processor, p_environment, p_merchant_id, p_public_api_key,
     'connected', coalesce(p_scopes, '{}'), p_connected_by, now(), null, null,
     now(), p_currency, p_country)
  on conflict (facility_id, processor) do update
     set environment      = excluded.environment,
         merchant_id      = excluded.merchant_id,
         -- coalesce, not overwrite: a refresh carries none of these three and
         -- must not erase what connecting discovered.
         public_api_key   = coalesce(excluded.public_api_key, pc.public_api_key),
         currency         = coalesce(excluded.currency, pc.currency),
         country          = coalesce(excluded.country, pc.country),
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

revoke all on function public.store_payment_credentials(
  uuid, text, text, text, text, timestamptz, timestamptz, text, text[], text,
  text, text, text)
  from public, anon, authenticated;
grant execute on function public.store_payment_credentials(
  uuid, text, text, text, text, timestamptz, timestamptz, text, text[], text,
  text, text, text)
  to service_role;

-- The old eleven-argument signature would otherwise linger alongside the new
-- one, and PostgREST would have to guess between them.
drop function if exists public.store_payment_credentials(
  uuid, text, text, text, text, timestamptz, timestamptz, text, text[], text, text);
