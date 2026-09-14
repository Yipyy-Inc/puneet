-- ============================================================================
-- A booking made for a client and service recovers their unfinished one.
--
-- The customer's booking form now saves its draft as they go, not only when
-- they discard it, so a customer who finishes has a draft too. Left
-- `abandoned`, the messaging tick would send them a recovery message for a
-- booking they made. And a customer who comes back in another tab, or whom
-- staff book by phone, was never marked recovered at all.
--
-- So the database marks it: when a booking is inserted, every open draft of
-- that client for that service (or with no service chosen yet) becomes
-- `recovered`. The unfinished-booking guard allows the change for any caller.
--
-- Tested by supabase/tests/unfinished-bookings.sql, U12.
-- ============================================================================

create or replace function private.booking_recovers_unfinished()
returns trigger
language plpgsql
security definer
set search_path = ''
as $fn$
begin
  if new.client_id is not null then
    update public.unfinished_bookings
       set status = 'recovered'
     where client_id = new.client_id
       and status <> 'recovered'
       and (service is null or service = new.service::text);
  end if;
  return null;
end;
$fn$;

drop trigger if exists bookings_recover_unfinished on public.bookings;
create trigger bookings_recover_unfinished
  after insert on public.bookings
  for each row execute function private.booking_recovers_unfinished();

revoke all on function private.booking_recovers_unfinished() from public;
revoke all on function private.booking_recovers_unfinished() from anon;
revoke all on function private.booking_recovers_unfinished() from authenticated;

do $check$
begin
  if has_function_privilege('anon', 'private.booking_recovers_unfinished()', 'execute')
     or has_function_privilege('authenticated', 'private.booking_recovers_unfinished()', 'execute') then
    raise exception 'a session can execute the booking recovery trigger function';
  end if;
end $check$;
