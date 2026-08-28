-- ============================================================================
-- A facility should not open Automations to an empty screen.
--
-- The old fixture showed eighteen rules. Making rules real correctly replaced
-- that with the true answer - zero - but the true answer is also useless: there
-- is nothing to read, nothing to configure, and no indication of what the
-- module is even for. The spec asks for the opposite in as many words: "Do not
-- hide inactive rules - their existence should be discoverable."
--
-- So every facility gets a starter set, ALL SWITCHED OFF. They are a menu, not
-- a running system. Turning one on stays a deliberate act by somebody who has
-- read what it will send, and most of them cannot be turned on at all yet
-- because nothing emits their trigger - the row says so.
--
-- Two of these are named by the spec directly: "Overdue Invoice Reminder"
-- existed only as a template in a picker, with no rule anywhere, so staff had
-- no way to discover it; and "Deposit Request" did not exist at all.
--
-- ── seed_key, FOR THE SAME REASON message_templates HAS key ───────────────
--
-- Idempotency on the NAME would fight the user: rename "Booking Confirmation"
-- to "Welcome email" and the next seed would helpfully recreate the original
-- alongside it. `seed_key` is stable and invisible, so a renamed, edited or
-- deliberately deleted rule stays that way.
-- ============================================================================

alter table public.automation_rules
  add column if not exists seed_key text;

comment on column public.automation_rules.seed_key is
  'Stable handle for a rule Yipyy ships. NULL for a facility''s own. Idempotency for ensure_automation_rules - never the name, which the user may change.';

create unique index if not exists automation_rules_seed_key_unique
  on public.automation_rules (facility_id, seed_key) where seed_key is not null;

CREATE OR REPLACE FUNCTION public.ensure_automation_rules(p_facility_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_email uuid;
  v_sms uuid;
begin
  -- The templates have to exist first; both seeders are idempotent so calling
  -- this twice, or in either order, is safe.
  perform public.ensure_message_templates(p_facility_id);

  -- Booking confirmation. The one trigger that actually delivers today.
  select id into v_email from public.message_templates
   where facility_id = p_facility_id and key = 'booking_confirmation';
  insert into public.automation_rules
    (facility_id, seed_key, name, trigger, email_template_id, is_transactional, created_by)
  values (p_facility_id, 'booking_confirmation', 'Booking Confirmation',
          'booking_created', v_email, true, 'yipyy')
  on conflict (facility_id, seed_key) where seed_key is not null do nothing;

  -- Check-out notice, email and text on one rule.
  select id into v_email from public.message_templates
   where facility_id = p_facility_id and key = 'check_out_notice';
  select id into v_sms from public.message_templates
   where facility_id = p_facility_id and key = 'check_out_notice_sms';
  insert into public.automation_rules
    (facility_id, seed_key, name, trigger, email_template_id, sms_template_id, is_transactional, created_by)
  values (p_facility_id, 'check_out_notice', 'Check-Out Notice',
          'check_out', v_email, v_sms, true, 'yipyy')
  on conflict (facility_id, seed_key) where seed_key is not null do nothing;

  select id into v_email from public.message_templates
   where facility_id = p_facility_id and key = 'check_in_notice';
  insert into public.automation_rules
    (facility_id, seed_key, name, trigger, email_template_id, is_transactional, created_by)
  values (p_facility_id, 'check_in_notice', 'Check-In Notice',
          'check_in', v_email, true, 'yipyy')
  on conflict (facility_id, seed_key) where seed_key is not null do nothing;

  select id into v_sms from public.message_templates
   where facility_id = p_facility_id and key = 'reminder_24h';
  insert into public.automation_rules
    (facility_id, seed_key, name, trigger, sms_template_id, offset_minutes, is_transactional, created_by)
  values (p_facility_id, 'reminder_24h', '24-Hour Reminder',
          '24h_before', v_sms, -1440, true, 'yipyy')
  on conflict (facility_id, seed_key) where seed_key is not null do nothing;

  -- ── Payment ──────────────────────────────────────────────────────────────
  select id into v_email from public.message_templates
   where facility_id = p_facility_id and key = 'payment_receipt';
  insert into public.automation_rules
    (facility_id, seed_key, name, trigger, email_template_id, is_transactional, created_by)
  values (p_facility_id, 'payment_receipt', 'Payment Receipt',
          'payment_received', v_email, true, 'yipyy')
  on conflict (facility_id, seed_key) where seed_key is not null do nothing;

  -- The one the spec calls out by name: the template existed in the picker and
  -- there was no rule anywhere, so staff had no way to discover it at all.
  select id into v_email from public.message_templates
   where facility_id = p_facility_id and key = 'overdue_invoice';
  insert into public.automation_rules
    (facility_id, seed_key, name, trigger, email_template_id, is_transactional, created_by)
  values (p_facility_id, 'overdue_invoice', 'Overdue Invoice Reminder',
          'payment_overdue', v_email, true, 'yipyy')
  on conflict (facility_id, seed_key) where seed_key is not null do nothing;

  -- Revenue protection for facilities that hold a booking against a deposit.
  select id into v_email from public.message_templates
   where facility_id = p_facility_id and key = 'deposit_request';
  insert into public.automation_rules
    (facility_id, seed_key, name, trigger, email_template_id, is_transactional, created_by)
  values (p_facility_id, 'deposit_request', 'Deposit Request',
          'booking_created', v_email, true, 'yipyy')
  on conflict (facility_id, seed_key) where seed_key is not null do nothing;

  -- ── Booking requests ─────────────────────────────────────────────────────
  select id into v_email from public.message_templates
   where facility_id = p_facility_id and key = 'booking_request_received';
  insert into public.automation_rules
    (facility_id, seed_key, name, trigger, email_template_id, is_transactional, created_by)
  values (p_facility_id, 'booking_request_received', 'Booking Request Received',
          'booking_request_submitted', v_email, true, 'yipyy')
  on conflict (facility_id, seed_key) where seed_key is not null do nothing;

  select id into v_email from public.message_templates
   where facility_id = p_facility_id and key = 'booking_request_approved';
  insert into public.automation_rules
    (facility_id, seed_key, name, trigger, email_template_id, is_transactional, created_by)
  values (p_facility_id, 'booking_request_approved', 'Booking Request Approved',
          'booking_request_approved', v_email, true, 'yipyy')
  on conflict (facility_id, seed_key) where seed_key is not null do nothing;

  select id into v_email from public.message_templates
   where facility_id = p_facility_id and key = 'booking_request_declined';
  insert into public.automation_rules
    (facility_id, seed_key, name, trigger, email_template_id, is_transactional, created_by)
  values (p_facility_id, 'booking_request_declined', 'Booking Request Declined',
          'booking_request_declined', v_email, true, 'yipyy')
  on conflict (facility_id, seed_key) where seed_key is not null do nothing;

  -- ── Reminders ────────────────────────────────────────────────────────────
  --
  -- NOT transactional. A vaccination reminder is a relationship message about a
  -- service requirement, but it is not confirming something the customer just
  -- asked for, so a marketing opt-out should stop it.
  select id into v_email from public.message_templates
   where facility_id = p_facility_id and key = 'vaccination_expiry';
  insert into public.automation_rules
    (facility_id, seed_key, name, trigger, email_template_id, offset_minutes, is_transactional, created_by)
  values (p_facility_id, 'vaccination_expiry', 'Vaccination Expiry Warning',
          'vaccination_expiry', v_email, -43200, false, 'yipyy')
  on conflict (facility_id, seed_key) where seed_key is not null do nothing;
end;
$function$;


comment on function public.ensure_automation_rules(uuid) is
  'Install the starter rule set, all DISABLED. Idempotent on seed_key. service_role only - called from the rules GET route.';

revoke execute on function public.ensure_automation_rules(uuid) from public, anon, authenticated;
grant  execute on function public.ensure_automation_rules(uuid) to service_role;

do $$
begin
  if has_function_privilege('authenticated', 'public.ensure_automation_rules(uuid)', 'execute') then
    raise exception 'authenticated can seed rules';
  end if;
  if not has_function_privilege('service_role', 'public.ensure_automation_rules(uuid)', 'execute') then
    raise exception 'service_role cannot seed rules - the screen will stay empty';
  end if;
end $$;
