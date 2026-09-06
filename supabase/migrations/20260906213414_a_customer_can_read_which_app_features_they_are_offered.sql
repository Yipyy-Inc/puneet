-- ============================================================================
-- A customer can read which app features their facility offers them.
--
-- ── WHY IT HAS TO BE READABLE ─────────────────────────────────────────────
--
-- `mobile_app_config` holds the white-label app's identity and its feature
-- switches, and two of those switches are read by the CUSTOMER portal:
--
--   src/app/customer/cameras/page.tsx      `enableLiveCamera`
--   src/components/customer/CustomerSidebar.tsx  `enableLiveCamera`
--
-- They decide whether a pet owner is offered a live camera feed at all — the
-- page's camera list and the nav item that reaches it. Until 2026-09-06 both
-- read a fixture in the bundle that shipped `enableLiveCamera: true`, so every
-- facility on the platform advertised a feed nobody there had switched on, and
-- a facility that turned it OFF changed nothing a customer saw.
--
-- The rest of the domain is addressed at the customer too: the app's name and
-- icon are what they install, the store links are where they get it, and the
-- terms and privacy URLs are the documents they are asked to accept.
--
-- ── AND WHY THIS IS NOT A DISCLOSURE ──────────────────────────────────────
--
-- Every field is published to an app store or rendered in an app the customer
-- runs. `tax_config` (20260819180000), `loyalty_config` (20260822100000) and
-- `yipyy_go_config` (20260906194753) joined this list on the same reasoning: a
-- customer may read what they are charged under, what they are offered, and
-- what they are asked to complete.
--
-- No credential and no other party's data. The domain holds preferences and
-- public identifiers only.
--
-- Read-only, and only for a facility they are a client of: this function feeds
-- the SELECT policy alone. Writing settings still needs `manage_settings`.
-- ============================================================================
create or replace function private.customer_visible_setting_domains()
returns text[]
language sql
immutable
set search_path = ''
as $fn$
  select array[
    'business_hours',
    'booking_rules',
    'tip_config',
    'booking_flow',
    'daycare_config',
    'boarding_config',
    'grooming_config',
    'training_config',
    -- The tax a customer was charged, and the registration number it was
    -- charged under. Read-only, and only for a facility they are a client of.
    'tax_config',
    -- The loyalty programme they are in: tiers, thresholds, earn rules, the
    -- redemption rate. What a facility advertises. Balances are NOT here —
    -- `loyalty_accounts` admits a client to their own row only.
    'loyalty_config',
    -- The pre-arrival form they are being asked for: whether one is expected on
    -- their service, whether it is mandatory, what it asks, when it is due and
    -- what it adds to their invoice. Submitted forms are NOT here.
    'yipyy_go_config',
    -- Which features the facility's app offers them — `enableLiveCamera` gates
    -- the customer portal's camera page and its nav item — plus the app's name,
    -- icon, store links and the policy documents they are asked to accept.
    'mobile_app_config'
  ];
$fn$;

comment on function private.customer_visible_setting_domains() is
  'Setting domains a client may SELECT for a facility they are a client of. '
  'Feeds facility_settings_read only; writing still requires manage_settings. '
  'Each entry is something addressed at the customer: what they are charged '
  'under, what they are offered, or what they are asked to complete.';
