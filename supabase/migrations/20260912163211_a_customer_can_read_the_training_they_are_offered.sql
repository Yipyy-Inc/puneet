-- ============================================================================
-- A customer can read the training their facility offers them.
--
-- ── WHY IT HAS TO BE READABLE ─────────────────────────────────────────────
--
-- Training's catalogue became facility settings on 2026-09-12 (041913ed), and
-- three of those domains are read by the CUSTOMER portal:
--
--   training_module_settings   whether homework needs a video, the drop-in
--                              price and cap, when report cards reach them
--   training_pathways          the program journeys shown on their catalogue
--   training_disciplines       the disciplines those programs are filed under
--
-- The portal read them through /api/facility/settings, which resolves the
-- facility from a staff MEMBERSHIP a customer does not have — so every
-- customer saw the shipped defaults, whatever their facility had saved: a
-- facility that required video for homework, or priced a drop-in, changed
-- nothing its customers were told. They read through the client row now
-- (/api/customer/training-settings), which needs these on the allowlist.
--
-- ── AND WHY THIS IS NOT A DISCLOSURE ──────────────────────────────────────
--
-- Every field is addressed at the customer or published on the catalogue they
-- browse: prices they pay, rules they follow, program and discipline names,
-- the training rooms their dog is taught in and the enrolment message they are
-- sent. No staff, no pay, no other client's data. The other training domains
-- (exercises, homework templates, course types) are the trainers' working
-- library and stay off the list.
--
-- Read-only, and only at a facility they are a client of: this function feeds
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
    'mobile_app_config',
    -- The training they are offered: the rules they train under (homework
    -- video, drop-in price and cap, report-card delivery), the program
    -- journeys on their catalogue and the disciplines those are filed under.
    'training_module_settings',
    'training_pathways',
    'training_disciplines'
  ];
$fn$;

comment on function private.customer_visible_setting_domains() is
  'Setting domains a client may SELECT for a facility they are a client of. '
  'Feeds facility_settings_read only; writing still requires manage_settings. '
  'Each entry is something addressed at the customer: what they are charged '
  'under, what they are offered, or what they are asked to complete.';

-- Privileges are left as they were: `create or replace` keeps the ACL, and
-- the SELECT policy runs as `authenticated`, which executes this through
-- PUBLIC. anon holds no usage on `private` at all.

do $verify$
begin
  if not ('training_pathways' = any(private.customer_visible_setting_domains())) then
    raise exception 'training_pathways is not on the customer allowlist';
  end if;
  if 'training_exercises' = any(private.customer_visible_setting_domains()) then
    raise exception 'the trainers'' exercise library is on the customer allowlist';
  end if;
  if has_schema_privilege('anon', 'private', 'usage') then
    raise exception 'anon can reach the private schema';
  end if;
end $verify$;
