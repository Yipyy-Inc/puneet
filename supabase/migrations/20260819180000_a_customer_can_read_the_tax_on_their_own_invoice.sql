-- ============================================================================
-- A customer can read the tax that was charged on their own invoice.
--
-- ── WHY THIS IS NEEDED ────────────────────────────────────────────────────
--
-- `CustomerInvoiceCard` renders the invoice a pet owner downloads, and it built
-- that document from `loadInvoiceTemplate()` — localStorage, falling back to a
-- fixture that names "Example Pet Care Facility" and carries a fabricated
-- registration number, "123456789 RT0001".
--
-- Pointing it at the facility's real details needs two reads. One already
-- works: `facilities_read` has admitted `private.client_facility_ids()` since
-- 20260801130000, so a customer can read the name, address and contact of a
-- facility they are a client of, and of no other.
--
-- The second does not. `facility_settings_read` admits a client only for the
-- domains in `private.customer_visible_setting_domains()`, and `tax_config` —
-- added 2026-08-19 — is not among them. Without it the customer's copy of their
-- own invoice cannot say what tax was charged, or under which registration
-- number, while the facility's copy of the same document can.
--
-- ── AND WHY IT IS SAFE ────────────────────────────────────────────────────
--
-- Nothing in `tax_config` is a secret. Rates and registration numbers are
-- printed on every invoice the facility issues and are, in most jurisdictions,
-- REQUIRED to be. The domain list exists to keep staff-facing configuration
-- away from customers, not to hide the tax a customer paid.
--
-- Scope is unchanged: the policy still restricts a client to facilities they
-- are a client OF. This widens which domains they may read there, not which
-- facilities.
-- ============================================================================

create or replace function private.customer_visible_setting_domains()
returns text[]
language sql
immutable
set search_path to ''
as $$
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
    'tax_config'
  ];
$$;

comment on function private.customer_visible_setting_domains() is
  'Setting domains a CLIENT of a facility may read. Staff-facing configuration is excluded; anything printed on a document the customer is handed is not. See 20260819180000.';
