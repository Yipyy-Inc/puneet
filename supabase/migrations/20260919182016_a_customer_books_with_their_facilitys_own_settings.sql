-- ============================================================================
-- A customer books with their facility's own settings.
--
-- The customer booking wizard read every setting through
-- /api/facility/settings, which resolves the facility by MEMBERSHIP — and for
-- a customer, who has none, falls back to the demo facility. So a pet owner at
-- any business was priced, scheduled and asked for deposits by the demo
-- facility's rules.
--
-- The wizard now reads /api/customer/settings, which resolves the facility
-- through the customer's own client row and reads facility_settings under
-- RLS. These are the domains it books with — prices, surcharges, deposits,
-- care fees, add-ons, approval, daycare rates, the scheduling blocks and
-- overrides, grooming slots, and the training catalogue. All of it is what the
-- customer is quoted or scheduled by anyway; none of it is staff, payroll,
-- messaging or integration configuration.
--
-- From its live body (pg_get_functiondef, 2026-09-19), with the booking
-- domains added. SQL #12-13 in customer-visible-settings.sql.
-- ============================================================================

create or replace function private.customer_visible_setting_domains()
returns text[]
language sql
immutable
set search_path to ''
as $function$
  select array[
    'business_hours',
    'booking_rules',
    'tip_config',
    'booking_flow',
    'daycare_config',
    'boarding_config',
    'grooming_config',
    'training_config',
    'tax_config',
    'loyalty_config',
    'yipyy_go_config',
    'mobile_app_config',
    'training_module_settings',
    'training_pathways',
    'training_disciplines',
    -- What the booking wizard prices and schedules with.
    'pricing_rules',
    'deposit_rules',
    'service_addons',
    'care_fees',
    'booking_approval',
    'evaluation_config',
    'daycare_rates',
    'service_date_blocks',
    'schedule_time_overrides',
    'drop_off_pick_up_overrides',
    'grooming_scheduling',
    'training_programs',
    'training_course_types'
  ];
$function$;
