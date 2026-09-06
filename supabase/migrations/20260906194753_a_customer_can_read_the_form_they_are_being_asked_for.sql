-- ============================================================================
-- A customer can read the Yipyy Go setup they are being asked to comply with.
--
-- ── WHY IT HAS TO BE READABLE ─────────────────────────────────────────────
--
-- Yipyy Go is the pre-arrival check-in form. The customer portal has to answer
-- three questions from it and cannot answer any of them without the domain:
--
--   * Is a form expected on this booking at all, and is it mandatory?
--     (`enabled`, `serviceConfigs[].enabled`, `.requirement`)
--   * What does it ask? The form the customer fills IS `formTemplate`, or the
--     per-service override in `formTemplates`.
--   * When is it due, and what does a medication or a tip add?
--     (`timing`, `medicationFee`, `tipPopup`)
--
-- Until 2026-09-06 the customer portal read all of that from a module-level
-- fixture array in the JavaScript bundle, so a customer was shown a form a seed
-- file had written rather than the one their facility had configured — and a
-- facility that made a form MANDATORY had no way to tell the customer so.
--
-- ── AND WHY THIS IS NOT A DISCLOSURE ──────────────────────────────────────
--
-- Every field in this domain is addressed AT the customer. The form is put in
-- front of them; the deadline is quoted to them; the medication fee lands on
-- their invoice. `tax_config` (20260819180000) and `loyalty_config`
-- (20260822100000) joined this list on the same reasoning — a customer may read
-- what they are charged under, and what they are being offered.
--
-- The domain carries no other party's data. Submitted FORMS are not here: they
-- live in the booking's own record, whose policy admits a client to their own
-- rows only. This is the blank template and the rules around it.
--
-- Read-only, and only for a facility they are a client of: this function feeds
-- the SELECT policy alone. Writing settings still needs `manage_settings`, so a
-- customer can read the form they are asked for and cannot change what is
-- asked.
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
    'yipyy_go_config'
  ];
$fn$;

comment on function private.customer_visible_setting_domains() is
  'Setting domains a client may SELECT for a facility they are a client of. '
  'Feeds facility_settings_read only; writing still requires manage_settings. '
  'Each entry is something addressed at the customer: what they are charged '
  'under, what they are offered, or what they are asked to complete.';
