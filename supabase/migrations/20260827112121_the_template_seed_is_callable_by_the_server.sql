-- ============================================================================
-- The template seed has to be reachable by the thing that calls it.
--
-- 20260827111502 created `ensure_message_templates` in the `private` schema,
-- alongside the RLS helpers. That was wrong, and wrong in a way that would have
-- been invisible: PostgREST exposes `public` and nothing else, so a `private`
-- function cannot be called through `.rpc()` at all. The templates route seeds
-- on every GET, so the seed would have failed silently on every request and the
-- twelve shipped templates would only ever have existed for a facility somebody
-- seeded by hand.
--
-- It moves to `public` and is locked down explicitly instead - revoked from
-- public, anon and authenticated, granted only to service_role. Seeding is not
-- something a session should be able to aim at an arbitrary facility.
--
-- Same shape, and the same reason, as boarding_secret_writer (20260823180026).
-- ============================================================================

drop function if exists private.ensure_message_templates(uuid);

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

    (p_facility_id, 'deposit_request', 'Deposit Request', 'email', 'reminder',
     'A deposit is needed to hold the booking',
     E'Hi {{customer_first_name|there}},\n\nTo hold {{pet_name}}''s place on {{check_in_date}} we need a deposit of {{amount_due}}.\n\nYou can pay it here: {{payment_link}}\n\n{{facility_name}}\n{{facility_phone}}',
     true)
  on conflict (facility_id, key) where key is not null do nothing;
end;
$fn$;

comment on function public.ensure_message_templates(uuid) is
  'Idempotently install the templates Yipyy ships. service_role only - called from the templates GET route.';

revoke execute on function public.ensure_message_templates(uuid) from public, anon, authenticated;
grant  execute on function public.ensure_message_templates(uuid) to service_role;

do $$
begin
  -- A revoke naming a privilege the role does not hold succeeds silently and
  -- looks identical to one that worked, so these are checked, not trusted.
  if has_function_privilege('authenticated', 'public.ensure_message_templates(uuid)', 'execute') then
    raise exception 'authenticated can seed templates';
  end if;
  if has_function_privilege('anon', 'public.ensure_message_templates(uuid)', 'execute') then
    raise exception 'anon can seed templates';
  end if;
  if not has_function_privilege('service_role', 'public.ensure_message_templates(uuid)', 'execute') then
    raise exception 'service_role cannot seed templates - the route will never install them';
  end if;
end $$;
