-- ============================================================================
-- The templates Yipyy ships.
--
-- Installed LAZILY, by key, from the templates GET route — not as a data
-- migration. Same reasoning as facility_settings: a default is not a stored
-- value until somebody needs it to be, and a facility created next month gets
-- the same set without anyone remembering to backfill it.
--
-- Idempotent by `(facility_id, key)`: re-running restores a shipped template
-- somebody deleted, and leaves an edited one alone. That is deliberate — a
-- facility that rewrites the booking confirmation in its own voice must not
-- have it silently reverted the next time the route runs.
--
-- Split from 20260827111420 (the schema) so a change to the WORDING is not a
-- change to the SCHEMA. These bodies will be edited far more often than the
-- tables they land in.
-- ============================================================================

create or replace function private.ensure_message_templates(p_facility_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $fn$
begin
  insert into public.message_templates
    (facility_id, key, name, channel, category, subject, body, is_system)
  values
    (p_facility_id, 'booking_confirmation', 'Booking Confirmation', 'email', 'confirmation',
     'Your booking at {{facility_name}} is confirmed',
     E'Hi {{customer_first_name|there}},\n\nYour booking for {{pet_name}} is confirmed.\n\nService: {{service_name}}\nArriving: {{check_in_date}} at {{check_in_time}}\nLeaving: {{check_out_date}} at {{check_out_time}}\n\nSee the details any time at {{portal_link}}.\n\n{{facility_name}}\n{{facility_phone}}',
     true),

    (p_facility_id, 'reminder_24h', '24-Hour Reminder', 'sms', 'reminder',
     null,
     E'Hi {{customer_first_name|there}} - reminder that {{pet_name}} is booked in at {{facility_name}} tomorrow, {{check_in_date}} at {{check_in_time}}. Questions? {{facility_phone}}',
     true),

    (p_facility_id, 'check_in_notice', 'Check-In Notice', 'email', 'update',
     '{{pet_name}} has checked in at {{facility_name}}',
     E'Hi {{customer_first_name|there}},\n\n{{pet_name}} arrived safely and is settling in. We will let you know at pick-up time.\n\n{{facility_name}}\n{{facility_phone}}',
     true),

    (p_facility_id, 'check_out_notice', 'Check-Out Notice', 'email', 'update',
     '{{pet_name}} is on the way home',
     E'Hi {{customer_first_name|there}},\n\n{{pet_name}} has checked out of {{facility_name}}. Thank you for trusting us.\n\n{{facility_name}}\n{{facility_phone}}',
     true),

    (p_facility_id, 'check_out_notice_sms', 'Check-Out Notice (SMS)', 'sms', 'update',
     null,
     E'{{pet_name}} has checked out of {{facility_name}} and is ready to go home. Thank you!',
     true),

    (p_facility_id, 'payment_receipt', 'Payment Receipt', 'email', 'confirmation',
     'Your receipt from {{facility_name}}',
     E'Hi {{customer_first_name|there}},\n\nThank you - we have received {{amount_paid}}.\n\nInvoice: {{invoice_id}}\nTotal: {{invoice_total}}\n\nYour full receipt is at {{invoice_link}}.\n\n{{facility_name}}',
     true),

    (p_facility_id, 'overdue_invoice', 'Overdue Invoice Reminder', 'email', 'reminder',
     'Payment reminder - {{amount_due}} due',
     E'Hi {{customer_first_name|there}},\n\nOur records show {{amount_due}} outstanding on invoice {{invoice_id}}, which was due {{due_date}}.\n\nYou can settle it at {{payment_link}}.\n\nIf you have already paid, please ignore this - and thank you.\n\n{{facility_name}}\n{{facility_phone}}',
     true),

    (p_facility_id, 'booking_request_received', 'Booking Request Received', 'email', 'confirmation',
     'We have your booking request',
     E'Hi {{customer_first_name|there}},\n\nThank you - we have your request for {{pet_name}} on {{check_in_date}}. We will confirm shortly.\n\n{{facility_name}}',
     true),

    (p_facility_id, 'booking_request_approved', 'Booking Request Approved', 'email', 'confirmation',
     'Your booking request is approved',
     E'Hi {{customer_first_name|there}},\n\nGood news - {{pet_name}} is booked in for {{service_name}} on {{check_in_date}} at {{check_in_time}}.\n\n{{portal_link}}\n\n{{facility_name}}',
     true),

    (p_facility_id, 'booking_request_declined', 'Booking Request Declined', 'email', 'update',
     'About your booking request',
     E'Hi {{customer_first_name|there}},\n\nWe are sorry - we cannot take {{pet_name}} on {{check_in_date}}. Please call us on {{facility_phone}} and we will find another date.\n\n{{facility_name}}',
     true),

    (p_facility_id, 'vaccination_expiry', 'Vaccination Expiry Warning', 'email', 'reminder',
     'Vaccination records for {{pet_name}} are due',
     E'Hi {{customer_first_name|there}},\n\n{{pet_name}}''s vaccination records are expiring soon. We will need an up-to-date copy before the next visit.\n\nYou can upload it at {{portal_link}}.\n\n{{facility_name}}',
     true),

    (p_facility_id, 'deposit_request', 'Deposit Request', 'email', 'reminder',
     'A deposit is needed to hold the booking',
     E'Hi {{customer_first_name|there}},\n\nTo hold {{pet_name}}''s place on {{check_in_date}} we need a deposit of {{amount_due}}.\n\nYou can pay it here: {{payment_link}}\n\n{{facility_name}}\n{{facility_phone}}',
     true)
  on conflict (facility_id, key) where key is not null do nothing;
end;
$fn$;

comment on function private.ensure_message_templates(uuid) is
  'Idempotently install the templates Yipyy ships. Called from the templates GET route, not from a data migration.';

revoke execute on function private.ensure_message_templates(uuid) from public, anon, authenticated;

do $$
begin
  -- A revoke naming a privilege the role does not hold succeeds silently and
  -- looks identical to one that worked, so this is checked rather than trusted.
  if has_function_privilege('authenticated', 'private.ensure_message_templates(uuid)', 'execute') then
    raise exception 'authenticated can seed templates directly';
  end if;
  if has_function_privilege('anon', 'private.ensure_message_templates(uuid)', 'execute') then
    raise exception 'anon can seed templates';
  end if;
end $$;
