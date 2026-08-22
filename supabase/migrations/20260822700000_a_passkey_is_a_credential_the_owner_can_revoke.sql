-- ============================================================================
-- A passkey is a credential the owner can revoke.
--
-- ── WHY THIS TABLE EXISTS AT ALL ──────────────────────────────────────────
--
-- WorkOS has passkeys, and we cannot use them: "Passkey authentication is
-- currently only available with the hosted UI in AuthKit." The hosted page
-- cannot render the per-facility branding that pawradise.yipyy.com shows, and
-- ADR 0004 §4 chose the branding. So the credential lives here instead, and
-- WebAuthn is verified in our own route handlers.
--
-- That decision has a consequence worth stating plainly at the top of the file
-- that embodies it: THE WORKOS DASHBOARD DOES NOT KNOW THESE EXIST. A support
-- person looking at a user in WorkOS sees a password and any social identities
-- and nothing else. Account recovery for a lost passkey is the password reset
-- flow, which is why the password path is not removed when this ships.
--
-- ── THE ROW IS PUBLIC-KEY MATERIAL, NOT A SECRET ──────────────────────────
--
-- Nothing in this table is confidential. `public_key` is a public key; leaking
-- it lets an attacker verify a signature, not produce one — the private key
-- never leaves the user's device and cannot be extracted from it. The RLS below
-- is therefore about INTEGRITY and PRIVACY, not secrecy:
--
--   * integrity — an attacker who could INSERT a row here could register their
--     own authenticator against someone else's account and sign in as them.
--     That is the whole attack, and it is why there is no insert policy.
--   * privacy — the set of devices a person owns is their business.
--
-- ── NO INSERT OR UPDATE POLICY. THAT IS THE POINT ─────────────────────────
--
-- A row may only be written by a route handler that has just verified a
-- WebAuthn attestation, using the service-role client, which bypasses RLS.
-- There is deliberately no policy that would let a signed-in user POST a
-- credential of their own choosing — a self-service INSERT is exactly the
-- attack above, and no `with check` expression can tell a genuine attestation
-- from a fabricated one. Verification is not something SQL can do, so SQL is
-- not asked to.
--
-- `counter` is updated on every sign-in for the same reason and by the same
-- caller. It is the WebAuthn clone-detection signal: an authenticator that
-- presents a counter lower than the one stored is a copy of a credential
-- somebody extracted, and the route refuses it.
--
-- ── A ROW HERE IS NOT ENOUGH TO SIGN SOMEBODY IN ──────────────────────────
--
-- The route that consumes these rows mints its session through Magic Auth, and
-- that path marks the address VERIFIED as a side effect — for a code we read
-- from an API response and never emailed. So a credential belonging to an
-- unverified account would launder it into a verified one.
--
-- The enrolment and sign-in routes both refuse unless `emailVerified` is true,
-- and `bun run check:passkey-email-verified` fails the build if either check
-- goes missing. Full account, with the measurement, in the debt map entry of
-- 2026-08-22. Do not add an enrolment path that bypasses those routes.
--
-- ── SELECT AND DELETE ARE THE OWNER'S, AND ONLY THE OWNER'S ───────────────
--
-- No platform-admin arm, unlike almost every other table here. An admin has no
-- reason to enumerate someone's devices, and "help, I lost my phone" is served
-- by the password reset the user can already do alone. If a support flow ever
-- genuinely needs it, add it then, with an audit trigger — do not leave the
-- door open now against a use nobody has.
--
-- ── WHY THE FK IS TO profiles AND NOT A LOOSE TEXT COLUMN ─────────────────
--
-- `profiles.id` IS the WorkOS subject (`text`, matching `auth.jwt()->>'sub'`)
-- since the cutover in ADR 0004. Pointing at it rather than storing a bare
-- `workos_user_id` buys the cascade: delete the profile and the credentials go
-- with it, instead of becoming rows that authenticate a user who is gone.
-- ============================================================================

create table if not exists public.user_passkeys (
  -- The base64url credential ID from the authenticator. Globally unique by
  -- construction, and the value the sign-in path looks a row up by, so it is
  -- the natural key rather than a surrogate uuid nothing would ever join on.
  credential_id text primary key,

  profile_id text not null
    references public.profiles (id) on delete cascade,

  -- COSE-encoded public key, base64url.
  --
  -- TEXT AND NOT `bytea`, deliberately. The authenticator hands back a
  -- Uint8Array and `bytea` looks like the honest type for it, but every read and
  -- write here goes through PostgREST as JSON — which has no byte array, so the
  -- value would have to be hex-escaped (`\x…`) on the way in and unescaped on
  -- the way out, in two places that must agree forever. base64url is what
  -- `credential_id` already is and what @simplewebauthn hands round, so one
  -- encoding covers the whole path and the decode happens once, at the point of
  -- verification.
  public_key text not null,

  -- WebAuthn signature counter. See the clone-detection note above.
  counter bigint not null default 0,

  -- 'internal', 'hybrid', 'usb', 'nfc', 'ble'. Passed back to the browser as a
  -- hint so it can offer the right affordance ("use your phone") rather than
  -- making the user guess which device holds the credential.
  transports text[] not null default '{}',

  -- Multi-device credentials (iCloud Keychain, Google Password Manager) sync;
  -- single-device ones do not. The UI says so, because "you will lose this if
  -- you lose this laptop" is the difference between the two and users cannot
  -- otherwise tell.
  backed_up boolean not null default false,

  -- What the user calls it. Null until they rename it; the UI falls back to a
  -- description derived from `transports` and `created_at`.
  nickname text,

  created_at  timestamptz not null default now(),
  last_used_at timestamptz
);

-- Every read on the sign-in path is by credential_id (the primary key), but
-- every read on the SETTINGS path is "all of mine", and that is the one that
-- would seq-scan as the table grows.
create index if not exists user_passkeys_profile_id_idx
  on public.user_passkeys (profile_id);

alter table public.user_passkeys enable row level security;

-- A user sees their own credentials. Nobody sees anybody else's.
drop policy if exists user_passkeys_read on public.user_passkeys;
create policy user_passkeys_read on public.user_passkeys
  for select using (profile_id = auth.jwt()->>'sub');

-- Revoking a lost device must not require us. This is the only write a session
-- can perform, and it can only ever remove.
drop policy if exists user_passkeys_delete on public.user_passkeys;
create policy user_passkeys_delete on public.user_passkeys
  for delete using (profile_id = auth.jwt()->>'sub');

-- No insert policy and no update policy. Enrolment and counter bumps go
-- through the service-role client after WebAuthn verification. See the header.
