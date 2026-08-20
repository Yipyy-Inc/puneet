-- ============================================================================
-- Disconnecting a payment processor destroys the credentials, not just the row.
--
-- ── WHAT "DISCONNECT" DID NOT DO ──────────────────────────────────────────
--
-- `revoke_payment_connection` (20260808140000) flips a status and nothing else.
-- Its own comment says the credentials are deliberately kept, and for the path
-- it was written for — the merchant uninstalled us, so the tokens are already
-- dead at Clover — that is right.
--
-- A facility pressing Disconnect in its own settings is not that path. Nobody
-- told Clover anything, so the access token stays valid and the refresh token
-- keeps minting new ones. Yipyy went on holding working keys to a merchant
-- account whose owner had just asked us to let go of it, for as long as the
-- refresh token lived — which is indefinitely, because it rotates.
--
-- ── AND CLOVER CANNOT BE TOLD ─────────────────────────────────────────────
--
-- Checked against the docs on 2026-08-20: Clover publishes no endpoint that
-- revokes a token or uninstalls an app on a merchant's behalf. The merchant
-- does it from their own dashboard, and only they can. So the tokens cannot be
-- killed at the far end from here, and the honest thing to do is destroy our
-- own copy — the half that is actually ours to give up.
--
-- The UI says the rest: to be certain, uninstall Yipyy in the Clover dashboard.
--
-- ── THE COST, STATED ──────────────────────────────────────────────────────
--
-- `validAccessToken()` never checked the connection's status, so refunding a
-- card payment through Yipyy kept working after a disconnect. It will not any
-- more: the refund route answers 503 with "reconnect the payment account".
--
-- That is the correct trade. The facility still owns the merchant account and
-- can refund from Clover's own dashboard, so no money is trapped — whereas a
-- live token nobody remembers granting is a standing liability. Disconnect has
-- to mean disconnected, or it is a button that lies.
--
-- ── ONE FUNCTION, ONE TRANSACTION ─────────────────────────────────────────
--
-- Revoking and forgetting as two calls would have a window where the status
-- says revoked and the keys are still in the vault — precisely the state being
-- removed. It reports the two outcomes separately so the route can say what
-- actually happened rather than assuming.
-- ============================================================================

create or replace function public.disconnect_payment_connection(
  p_facility_id uuid,
  p_reason      text,
  p_processor   text default 'clover'
)
returns table (connection_revoked boolean, credentials_removed boolean)
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  v_changed  integer;
  v_access   uuid;
  v_refresh  uuid;
begin
  update public.payment_connections
     set status     = 'revoked',
         revoked_at = coalesce(revoked_at, now()),
         last_error = p_reason,
         updated_at = now()
   where facility_id = p_facility_id
     and processor   = p_processor
     -- Already revoked is not a change, and saying so lets the caller report
     -- "nothing to do" instead of claiming it revoked something.
     and status is distinct from 'revoked';

  get diagnostics v_changed = row_count;
  connection_revoked := v_changed > 0;

  -- The credentials go regardless of whether the STATUS changed. A facility
  -- pressing Disconnect a second time is asking us to make sure; leaving a live
  -- token in the vault because the row already read `revoked` would be the
  -- exact opposite of what they asked for.
  delete from private.payment_credentials
   where facility_id = p_facility_id
     and processor   = p_processor
  returning access_token_secret_id, refresh_token_secret_id
       into v_access, v_refresh;

  get diagnostics v_changed = row_count;
  credentials_removed := v_changed > 0;

  -- Vault last. The row pointing at these secrets is already gone, so if a
  -- delete here fails the leftover is an orphaned secret nothing can find —
  -- which is inert. The reverse order could leave a credential row pointing at
  -- a secret that no longer exists, and that reads as "connected" to
  -- payment_access_token until it tries to use it.
  if v_access is not null then
    delete from vault.secrets where id = v_access;
  end if;

  if v_refresh is not null then
    delete from vault.secrets where id = v_refresh;
  end if;

  return next;
end;
$fn$;

comment on function public.disconnect_payment_connection(uuid, text, text) is
  'Revoke a facility''s payment connection AND destroy the stored OAuth credentials. Clover has no revoke API, so this gives up our own copy; the merchant must uninstall the app to kill the tokens at their end.';

-- ── The grant is the boundary ─────────────────────────────────────────────
--
-- Same rule as every function in this family: it lives in `public` because
-- PostgREST exposes nothing else, it is SECURITY DEFINER because `private` and
-- `vault` are unreachable otherwise, and it does NOT check its caller. So the
-- API route that calls it is the authorisation boundary, and EXECUTE is given
-- to `service_role` alone — a value no browser ever holds.

revoke all on function public.disconnect_payment_connection(uuid, text, text)
  from public, anon, authenticated;

grant execute on function public.disconnect_payment_connection(uuid, text, text)
  to service_role;
