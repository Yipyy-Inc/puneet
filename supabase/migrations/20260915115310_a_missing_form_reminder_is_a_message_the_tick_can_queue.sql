-- ============================================================================
-- A missing-form reminder is a message the tick can queue.
--
-- The facility's `form_notifications.customer.missingRequiredFormsReminder`
-- promised to remind a customer, before their booking, about a required form
-- they have not submitted. The messaging tick queues that reminder into
-- message_sends like every other message, under its own source kind, so the
-- send pass and the outbox can tell it apart. One reminder per booking and
-- form: the idempotency key says so.
-- ============================================================================

alter table public.message_sends
  drop constraint message_sends_source_kind_check;

alter table public.message_sends
  add constraint message_sends_source_kind_check
  check (source_kind = any (array[
    'automation_rule', 'workflow', 'manual', 'rebook', 'review_request',
    'booking_recovery', 'form_reminder'
  ]));

do $check$
begin
  if not exists (
    select 1 from pg_constraint
     where conname = 'message_sends_source_kind_check'
       and pg_get_constraintdef(oid) like '%form_reminder%'
  ) then
    raise exception 'form_reminder is not an allowed message source';
  end if;
end
$check$;
