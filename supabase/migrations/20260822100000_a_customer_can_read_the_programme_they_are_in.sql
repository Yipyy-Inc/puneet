-- ============================================================================
-- A customer can read the loyalty programme they are in.
--
-- ── WHY IT HAS TO BE READABLE ─────────────────────────────────────────────
--
-- The customer portal shows how points are earned, what the tiers are, what
-- their own tier gives them, and how many points buy a dollar. Every one of
-- those lives in `facility_settings.loyalty_config`, and `facility_settings_read`
-- admits a client only to the domains this function lists — so the wallet was
-- reading a hand-authored fixture instead, and telling a customer about a
-- programme their facility had never configured.
--
-- ── AND WHY THIS IS NOT A DISCLOSURE ──────────────────────────────────────
--
-- A loyalty programme is advertised. Tiers, thresholds, earn rules and the
-- redemption rate are the things a facility puts on a poster; a customer who
-- could not see them could not decide whether the programme was worth
-- anything. `tax_config` joined this list on the same reasoning
-- (20260819180000): a customer may read what they were charged under.
--
-- The domain carries no other party's data — no balances, no accounts, no other
-- customer. Those live in `loyalty_accounts`, whose own policy admits a client
-- to their OWN row and nothing else.
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
    'loyalty_config'
  ];
$fn$;
