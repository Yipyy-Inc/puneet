-- ============================================================================
-- A connection marked broken must still be able to fetch its refresh token.
--
-- `payment_access_token` was written with `and pc.status = 'connected'`, which
-- reads as obviously correct and is a deadlock:
--
--   1. call Clover, get a 401 (expired token, transient auth blip, anything)
--   2. record_payment_connection_error sets status = 'error'
--   3. try to recover by refreshing
--   4. payment_access_token returns NO ROWS, because status is no longer
--      'connected' — so the refresh token is now unreachable
--   5. the only way back is for the merchant to re-authorise from scratch
--
-- One expired token would turn into a support call and a re-onboarding, for
-- every facility it happened to, on a system whose whole job is taking money.
--
-- Caught by V8 of the migration's own verification: `payment_access_token now
-- returns 0 rows`. I wrote that assertion expecting it to demonstrate a safety
-- property. It was demonstrating the trap.
--
-- ── 'error' IS RECOVERABLE, 'revoked' IS NOT ──────────────────────────────
--
-- The two states differ in who decided:
--
--   error     WE could not use the credential. It may still be perfectly good,
--             and the refresh token is exactly what fixes it. Readable.
--   revoked   the MERCHANT withdrew our access, or an admin disconnected them.
--             Their tokens are dead and using them would be attempting access
--             to an account that has said no. Not readable.
--   pending   the OAuth callback never completed. There is nothing to read.
--
-- So the check becomes "not revoked and not pending" rather than "connected",
-- and a successful refresh puts the row back to 'connected' by itself —
-- store_payment_credentials already does that, which is what makes this
-- self-healing rather than merely unblocked.
-- ============================================================================

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
  environment              text,
  -- Surfaced so the caller can tell "this should work" from "this is being
  -- retried after a failure" without a second query.
  connection_status        text
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
         pc.environment,
         pc.status
    from private.payment_credentials c
    join public.payment_connections pc
      on pc.facility_id = c.facility_id and pc.processor = c.processor
   where c.facility_id = p_facility_id
     and c.processor = p_processor
     -- Not 'connected': a connection in error still needs its refresh token,
     -- which is the only thing that can repair it. See the header.
     and pc.status not in ('revoked', 'pending');
$fn$;

comment on function public.payment_access_token is
  'Live merchant tokens, for a server about to call Clover. Readable while a connection is connected OR in error — the second is what a refresh repairs. service_role only.';

revoke all on function public.payment_access_token(uuid, text)
  from public, anon, authenticated;
grant execute on function public.payment_access_token(uuid, text) to service_role;
