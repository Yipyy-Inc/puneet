-- ============================================================================
-- Clover, phase 0a: who is connected, and where the tokens live.
--
-- ── TWO DIFFERENT MERCHANTS, AND CONFLATING THEM IS THE CLASSIC MISTAKE ───
--
-- The product promises Clover for both directions of money, and they are not
-- the same integration:
--
--   customer -> facility   EACH FACILITY is the Clover merchant. Yipyy is an
--                          app they authorise via OAuth. One connection per
--                          facility, one set of tokens per facility.
--
--   facility -> Yipyy      YIPYY is the merchant, with one account and its own
--                          credentials. Nothing per-facility about it.
--
-- This table is the FIRST one. The second is a single set of platform
-- credentials and does not belong in a per-facility table — putting them here
-- would mean every facility row could hold the platform's own keys.
--
-- ── THE APP SECRET IS CURRENTLY IN localStorage ───────────────────────────
--
-- src/lib/clover-config-store.ts takes the App ID, the App Secret and the
-- webhook signing secret from a form and persists them to `window.localStorage`
-- under "yipyy.clover-config", on every admin's machine, in plain text. Its own
-- comment says credentials are "treated as encrypted at rest in production".
-- They are not; there is no production path.
--
-- Nothing in this migration reads that store. The App ID and App Secret belong
-- in server environment variables (CLOVER_APP_ID / CLOVER_APP_SECRET) because
-- they identify YIPYY, not a facility, and they must never reach a browser.
--
-- ── WHAT IS SECRET AND WHAT IS NOT ────────────────────────────────────────
--
-- Getting this wrong is how a private key ends up in a JavaScript bundle, so
-- the split is a table boundary rather than a naming convention:
--
--   public.payment_connections   merchant id, environment, status, and the
--                                PUBLIC apiAccessKey (PAKMS). Clover's own
--                                documentation requires that key in the
--                                browser — it is what the hosted iframe
--                                initialises with. Safe, by design.
--
--   private.payment_credentials  the OAuth access and refresh tokens. Not
--                                readable by `authenticated` or `anon` under
--                                any policy, because they hold no grants on
--                                the table at all, and `private` is not a
--                                schema PostgREST exposes. Two independent
--                                reasons a client cannot reach them.
--
-- ── AND THE TOKENS THEMSELVES ARE NOT IN THE ROW ──────────────────────────
--
-- The standing rule on this project is that a leaked database dump must not
-- hand over live credentials. An OAuth token cannot be hashed — we have to send
-- it to Clover — so it goes in Supabase Vault and the row holds only the
-- secret's id. A dump of `private.payment_credentials` yields a list of uuids.
--
-- ── OAUTH v2, NOT v1 ──────────────────────────────────────────────────────
--
-- Clover still issues non-expiring v1 tokens. For a marketplace app holding
-- tokens for many merchants, a credential that never expires and cannot be
-- rotated is a liability that grows with the customer base. v2 gives an
-- access/refresh pair (/oauth/v2/authorize -> /oauth/v2/token -> /oauth/v2/
-- refresh), which is why both expiry columns exist and are NOT NULL-able-away.
-- ============================================================================

create table if not exists public.payment_connections (
  facility_id      uuid not null references public.facilities (id) on delete cascade,
  processor        text not null default 'clover' check (processor in ('clover')),
  environment      text not null check (environment in ('sandbox', 'production')),

  -- Clover's merchant id (Mxxxxxxxxxxxx). Not a secret: it appears in every
  -- API path and in the merchant's own dashboard URL.
  merchant_id      text not null check (length(trim(merchant_id)) > 0),

  -- The PUBLIC apiAccessKey / PAKMS key. Belongs in the browser — the hosted
  -- iframe cannot tokenise a card without it. Never the private API key.
  public_api_key   text,

  status           text not null default 'pending'
                     check (status in ('pending', 'connected', 'revoked', 'error')),
  scopes           text[] not null default '{}',

  connected_by     text references public.profiles (id) on delete set null,
  connected_at     timestamptz,
  revoked_at       timestamptz,
  -- Why the last call failed, so a facility that has silently stopped taking
  -- card payments is visible before the owner rings up to say so.
  last_error       text,
  last_verified_at timestamptz,

  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),

  primary key (facility_id, processor),

  -- A connection that says it is live must name who made it live. Without this
  -- a half-finished OAuth callback leaves a row claiming a working merchant.
  constraint payment_connection_connected_is_dated
    check (status <> 'connected' or connected_at is not null)
);

comment on table public.payment_connections is
  'A facility''s own payment-processor account. The non-secret half — tokens live in private.payment_credentials, in Vault. See the header of 20260807660000.';
comment on column public.payment_connections.public_api_key is
  'The PUBLIC apiAccessKey (PAKMS). Required in the browser by Clover''s hosted iframe. The private key is never stored here.';
comment on column public.payment_connections.merchant_id is
  'Clover merchant id. Not a secret — it is in every API path.';

create index if not exists payment_connections_merchant_idx
  on public.payment_connections (processor, merchant_id);

alter table public.payment_connections enable row level security;

-- A facility may see whether its own payments are connected; the platform team
-- sees every facility. Nobody writes through the table: connecting is an OAuth
-- callback on the server, which uses the service role.
drop policy if exists payment_connections_read on public.payment_connections;
create policy payment_connections_read on public.payment_connections
  for select to authenticated
  using (
    private.is_platform_admin()
    or exists (
      select 1 from public.facility_memberships m
       where m.facility_id = payment_connections.facility_id
         and m.profile_id = (select auth.jwt() ->> 'sub')
         and m.is_active
    )
  );

drop trigger if exists payment_connections_touch on public.payment_connections;
create trigger payment_connections_touch
  before update on public.payment_connections
  for each row execute function private.set_updated_at();

-- ── The tokens ─────────────────────────────────────────────────────────────
--
-- No policies, and no grants. `authenticated` and `anon` cannot select, insert,
-- update or delete, and PostgREST does not expose `private` in the first place.
-- RLS is enabled anyway so that a future GRANT — the kind added at 2am to make
-- something work — still lands on a table with no policy and therefore denies.

create table if not exists private.payment_credentials (
  facility_id              uuid not null,
  processor                text not null,

  -- Vault secret ids, NOT tokens. A dump of this table is a list of uuids.
  access_token_secret_id   uuid not null,
  refresh_token_secret_id  uuid,

  access_token_expires_at  timestamptz,
  refresh_token_expires_at timestamptz,
  -- Bumped every time the pair is rotated, so a refresh loop that is failing
  -- silently shows up as a stale timestamp rather than as nothing at all.
  rotated_at               timestamptz not null default now(),
  created_at               timestamptz not null default now(),

  primary key (facility_id, processor),
  foreign key (facility_id, processor)
    references public.payment_connections (facility_id, processor) on delete cascade
);

comment on table private.payment_credentials is
  'Vault secret ids for a facility''s OAuth tokens. Never the tokens. No grants to authenticated or anon, and `private` is not exposed by PostgREST.';

alter table private.payment_credentials enable row level security;

revoke all on private.payment_credentials from anon, authenticated;
revoke all on public.payment_connections from anon;
