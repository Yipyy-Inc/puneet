-- ============================================================================
-- Rotate the development account passwords.
--
-- The seven @yipyy.dev accounts were created by dev-accounts.sql sharing one
-- password, which was fine while the app was unreachable and stopped being
-- fine the moment /login went live on a public domain. This changes them
-- without touching anything else — no re-seeding, no lost memberships, no
-- lost staff records.
--
-- ── HOW TO USE ──────────────────────────────────────────────────────────────
--
--   1. Replace the value of v_pwd below. Do NOT commit the replacement.
--   2. Run it (SQL editor, or `supabase db execute --file`).
--   3. Put the same value in .env.local as E2E_PASSWORD, or the e2e suite
--      will keep trying the old one — tests/e2e/_auth.ts reads it from there.
--
-- Set a DIFFERENT password per account by running the UPDATE once per email
-- instead of using the `in (...)` list. One shared password is a convenience
-- for a demo, not a position anyone should defend.
--
-- ── WHY IT IS SAFE TO RE-RUN ────────────────────────────────────────────────
--
-- Only `encrypted_password` and `updated_at` change. Sessions are NOT revoked
-- by this — see the optional block at the end if that is what you want, which
-- it usually is after a credential has been shared around.
--
-- ── THE HASH ────────────────────────────────────────────────────────────────
--
-- `extensions.crypt(pwd, extensions.gen_salt('bf'))` — bcrypt, the same call
-- dev-accounts.sql uses. GoTrue verifies against this format directly, so an
-- account rotated here signs in exactly like one freshly seeded.
-- ============================================================================

do $$
declare
  -- ▼▼▼ REPLACE THIS ▼▼▼
  v_pwd text := 'CHANGE-ME-BEFORE-RUNNING';
  -- ▲▲▲ REPLACE THIS ▲▲▲
  v_count int;
begin
  if v_pwd = 'CHANGE-ME-BEFORE-RUNNING' then
    raise exception 'Set v_pwd to a real password before running this.';
  end if;

  if length(v_pwd) < 12 then
    raise exception 'Use at least 12 characters. This account can reach live data.';
  end if;

  update auth.users
     set encrypted_password = extensions.crypt(v_pwd, extensions.gen_salt('bf')),
         updated_at         = now()
   where email like '%@yipyy.dev';

  get diagnostics v_count = row_count;
  raise notice 'Rotated % account(s).', v_count;

  if v_count = 0 then
    raise exception 'No @yipyy.dev accounts found — nothing was rotated.';
  end if;
end $$;

-- Confirm: every account should show a fresh updated_at and no NULL hash.
select email, updated_at, encrypted_password is not null as has_password
  from auth.users
 where email like '%@yipyy.dev'
 order by email;

-- ── OPTIONAL: sign everyone out ─────────────────────────────────────────────
-- Rotating a password does NOT invalidate tokens already issued. Anyone
-- holding a live session keeps it until it expires. Uncomment to end them all,
-- which is the point of rotating if the old password went anywhere it should
-- not have.
--
-- delete from auth.sessions
--  where user_id in (select id from auth.users where email like '%@yipyy.dev');
