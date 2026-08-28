-- ============================================================================
-- The tip reminder is a template, not a second settings screen.
--
-- ── WHY THIS IS NOT `tip_config.reminder` ─────────────────────────────────
--
-- Settings -> Tip Settings has carried a post-checkout reminder since long
-- before there was anything to send it with: a delay, three channel chips, a
-- headline and a body, all saved to `facility_settings` and read by NOTHING.
-- The Smart Tips specification records that section as "already built and
-- correct".
--
-- Now that messages have somewhere to live, keeping those fields would mean two
-- places describing one message, only one of which has a delivery log, a
-- suppression list, and an audit trail a facility can produce under CASL. So
-- the copy moves here and the settings screen points at it.
--
-- ── IT SHIPS AS A TEMPLATE AND NOT AS A RULE ──────────────────────────────
--
-- No `automation_rules` row is created here, deliberately. A rule created by a
-- migration is a migration that starts emailing a facility's customers on their
-- behalf without anybody choosing to. The facility switches it on in
-- Automations, picking Check-Out and a delay, where the enable toggle already
-- lives.
--
-- ── {{invoice_link}} IS THE POINT OF THE MESSAGE ──────────────────────────
--
-- It resolves to `/pay/{ref}`, which shows the balance AND the tip options, so
-- the link lands somewhere a tip can actually be left. The dispatcher supplies
-- it as of this change; before it, the tag would have gone unresolved and the
-- message would have been SKIPPED rather than sent with a broken sentence --
-- which is that guard working as intended.
-- ============================================================================

create or replace function public.ensure_message_templates(p_facility_id uuid)
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

    (p_facility_id, 'tip_reminder', 'Tip Reminder', 'email', 'reminder',
     'Thank you from {{facility_name}}',
     E'Hi {{customer_first_name|there}},

{{pet_name}} went home today after a lovely visit. If the team made {{pet_name}}''s day, you can leave them a tip in one tap.

Add a tip: {{invoice_link}}

Tips go straight to the people who looked after {{pet_name}}, and are always optional.

{{facility_name}}
{{facility_phone}}',
     true),

    (p_facility_id, 'tip_reminder_sms', 'Tip Reminder (SMS)', 'sms', 'reminder',
     null,
     E'{{pet_name}} had a great day at {{facility_name}}. If you would like to tip the team, you can here: {{invoice_link}} - always optional.',
     true),

    (p_facility_id, 'deposit_request', 'Deposit Request', 'email', 'reminder',
     'A deposit is needed to hold the booking',
     E'Hi {{customer_first_name|there}},\n\nTo hold {{pet_name}}''s place on {{check_in_date}} we need a deposit of {{amount_due}}.\n\nYou can pay it here: {{payment_link}}\n\n{{facility_name}}\n{{facility_phone}}',
     true)
  on conflict (facility_id, key) where key is not null do nothing;
end;
$fn$;

