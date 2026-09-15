-- ============================================================================
-- An estimate follow-up is a message the tick can queue.
--
-- The facility's `estimate_follow_ups` settings promise a reminder to a
-- customer who has not opened an estimate, or opened it and not booked. The
-- messaging tick queues that reminder into message_sends like every other
-- message, under its own source kind, so the send pass can check the estimate
-- is still open before it goes and the outbox can tell it apart.
-- ============================================================================

alter table public.message_sends
  drop constraint message_sends_source_kind_check;

alter table public.message_sends
  add constraint message_sends_source_kind_check
  check (source_kind = any (array[
    'automation_rule', 'workflow', 'manual', 'rebook', 'review_request',
    'booking_recovery', 'form_reminder', 'estimate_follow_up'
  ]));

do $check$
begin
  if not exists (
    select 1 from pg_constraint
     where conname = 'message_sends_source_kind_check'
       and pg_get_constraintdef(oid) like '%estimate_follow_up%'
       and pg_get_constraintdef(oid) like '%form_reminder%'
  ) then
    raise exception 'estimate_follow_up is not an allowed message source';
  end if;
end
$check$;
