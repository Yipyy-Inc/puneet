-- ============================================================================
-- `hq` is Yipyy's own address, so no facility may take it.
--
-- ── WHY THIS IS A MIGRATION AND NOT A CODE CHANGE ─────────────────────────
--
-- From 2026-08-26 the platform super-admin portal answers on `hq.yipyy.com`.
-- `RESERVED` in `src/lib/facility-host.ts` is the copy the edge proxy reads,
-- because it cannot query — but that file says plainly which of the two is the
-- authority:
--
--   "`facilities_slug_not_reserved` (20260807200000) enforces the real rule in
--    Postgres, where every writer passes. This copy exists because the proxy
--    runs at the edge and cannot query. They must agree; the database is the
--    authority, and this list only has to be a SUPERSET of it to stay safe."
--
-- A name reserved in TypeScript but not here is merely unreachable. A name
-- reserved here but not there is the dangerous direction — and adding it to
-- only one of the two is how that happens. Both move in this change.
--
-- ── WHAT WOULD HAPPEN WITHOUT IT ──────────────────────────────────────────
--
-- A facility provisioned with the slug `hq` would own `hq.yipyy.com`: the same
-- hostname the super-admin portal is about to answer on, and one that
-- `/api/internal/tls-ask` is about to authorise a certificate for by name. The
-- tenant would not gain any data — RLS scopes every row from the JWT and a host
-- header decides nothing about authorisation — but two different things would
-- claim one address, and which one you got would depend on routing order.
--
-- No facility uses it today (`yipyy-demo-facility`, `pawradise`,
-- `doggieville-mtl`), so this is additive and cannot fail on existing rows.
-- ============================================================================

alter table public.facilities
  drop constraint if exists facilities_slug_not_reserved;

alter table public.facilities
  add constraint facilities_slug_not_reserved
  check (slug not in (
    -- hosts this platform already answers on
    'www', 'app', 'api', 'admin', 'dashboard', 'clerk', 'status', 'accounts',
    -- `hq` joined them on 2026-08-26: the platform super-admin portal.
    'hq',
    -- top-level route segments, so a slug can never shadow one
    'sign-in', 'sign-up', 'sso-callback', 'book', 'review', 'forms', 'onboard',
    'setup', 'profile', 'customer', 'facility', 'employee', 'groomer', 'staff',
    -- infrastructure names that are claimed sooner or later
    'mail', 'smtp', 'ftp', 'cdn', 'static', 'assets', 'support', 'help',
    'billing', 'docs', 'blog', 'test', 'staging', 'dev', 'internal'
  ));
