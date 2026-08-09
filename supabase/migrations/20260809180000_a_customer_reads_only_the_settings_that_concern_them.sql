-- ===========================================================================
-- A customer reads only the settings that concern them.
--
-- `facility_settings_read` (20260809140000) admits a facility's CLIENTS, and
-- it had to: the customer booking flow needs the opening hours to offer a slot,
-- the cancellation policy to state it, and the tip tiers to display them.
--
-- With two domains in the table that was fine, because both were things a
-- customer is entitled to see. It stops being fine the moment the table fills
-- up. Staff notification defaults, report-card templates, weather thresholds
-- and evaluation configuration are internal, and "a client may read every row
-- for their facility" would hand them over as each one lands.
--
-- ── WRITTEN NOW, BEFORE THE ROWS EXIST ────────────────────────────────────
--
-- Nothing is leaking today. This is the cheap moment to narrow it: an
-- allow-list added before eighteen more domains arrive costs one migration,
-- and the same narrowing after they arrive is a change to a policy people have
-- started trusting.
--
-- ── AND ONE DOMAIN IS BANNED OUTRIGHT ─────────────────────────────────────
--
-- `integrations` is NOT in this table and must not be. The fixture holds
-- `accountSid` and `authToken` for Twilio, and this table is readable by every
-- member of the facility with a session. A credential belongs in Vault or in
-- the deployment's environment — the pattern the Clover connection already
-- follows — never in a jsonb column with a broad read policy.
-- ===========================================================================

/**
 * Domains a customer of the facility may read.
 *
 * Each is something the booking flow SHOWS them: when the facility is open,
 * what cancelling costs, what tip options appear at checkout, which services
 * are offered and under what conditions.
 *
 * A function rather than a literal in the policy so that adding a domain is one
 * edit rather than one per policy, and so the list can be read by a human
 * asking "what can a customer see".
 */
create or replace function private.customer_visible_setting_domains()
returns text[]
language sql
immutable
as $$
  select array[
    'business_hours',
    'booking_rules',
    'tip_config',
    'booking_flow',
    'daycare_config',
    'boarding_config',
    'grooming_config',
    'training_config'
  ];
$$;

drop policy if exists facility_settings_read on public.facility_settings;
create policy facility_settings_read
  on public.facility_settings
  for select
  using (
    private.is_platform_admin()
    -- Staff see everything for their own facility. RLS still scopes the rows;
    -- this is not a permission check, it is a tenancy one.
    or facility_id in (select private.member_facility_ids_all())
    -- A client sees only what the booking flow needs to show them.
    or (
      facility_id in (select private.client_facility_ids())
      and domain = any (private.customer_visible_setting_domains())
    )
  );
