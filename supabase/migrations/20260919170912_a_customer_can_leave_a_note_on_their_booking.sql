-- ============================================================================
-- A customer can leave a note on their booking, or ask to change its dates.
--
-- The customer portal's "Add a note" saved nothing and toasted "Note added";
-- "Reschedule" opened a blank booking form. Rescheduling stays the facility's
-- to do (the plan: no self-service reschedule). What the customer can do is
-- ask, and say things — and both are now a row the staff read.
--
-- public.add_owner_booking_note(ref, kind, content):
--   * only the caller's own booking; someone else's and a missing one are the
--     same answer (P0002);
--   * only a booking still open or under way — not a finished one (55000);
--   * kind is 'note' or 'change_dates'; content is 1-1000 characters (22023);
--   * at most ten a day per booking from the same person (54000);
--   * written into public.notes as a booking note SHARED with the customer,
--     under the client's name, with notes.customer_request saying which.
--
-- notes.customer_request is set only by that function: a staff insert or
-- update cannot make a note look like the client wrote it. SQL in
-- owner-booking-notes.sql.
-- ============================================================================

alter table public.notes
  add column customer_request text
    check (customer_request in ('note', 'change_dates'));

create or replace function private.guard_customer_request()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if coalesce(current_setting('yipyy.owner_note', true), '') = 'on' then
    return new;
  end if;
  if tg_op = 'INSERT' then
    new.customer_request := null;
  else
    new.customer_request := old.customer_request;
  end if;
  return new;
end;
$$;

revoke all on function private.guard_customer_request() from public, anon, authenticated;

create trigger notes_guard_customer_request
  before insert or update on public.notes
  for each row execute function private.guard_customer_request();

create or replace function public.add_owner_booking_note(
  p_ref bigint,
  p_kind text,
  p_content text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_booking public.bookings;
  v_name    text;
  v_text    text := btrim(coalesce(p_content, ''));
  v_sub     text := (select auth.jwt()->>'sub');
  v_id      uuid;
begin
  select b.* into v_booking
    from public.bookings b
   where b.ref = p_ref
     and b.client_id in (select private.own_client_ids());
  if not found then
    raise exception 'No such booking.' using errcode = 'P0002';
  end if;

  if p_kind is null or p_kind not in ('note', 'change_dates') then
    raise exception 'A note or a request to change dates.' using errcode = '22023';
  end if;
  if length(v_text) = 0 or length(v_text) > 1000 then
    raise exception 'Write between 1 and 1000 characters.' using errcode = '22023';
  end if;
  if v_booking.status not in ('pending', 'request_submitted', 'estimate_sent',
                              'waitlisted', 'confirmed', 'checked_in',
                              'in_progress', 'ready') then
    raise exception 'This booking is closed. Contact the facility.'
      using errcode = '55000';
  end if;
  if (select count(*) from public.notes n
       where n.entity_id = v_booking.id
         and n.category = 'booking'
         and n.customer_request is not null
         and n.created_by = v_sub
         and n.created_at > now() - interval '1 day') >= 10 then
    raise exception 'That is ten today. Call the facility instead.'
      using errcode = '54000';
  end if;

  select c.name into v_name from public.clients c where c.id = v_booking.client_id;

  perform set_config('yipyy.owner_note', 'on', true);
  insert into public.notes
    (facility_id, category, entity_id, content, visibility,
     created_by, created_by_name, customer_request)
  values
    (v_booking.facility_id, 'booking', v_booking.id, v_text,
     'shared_with_customer', v_sub, v_name, p_kind)
  returning id into v_id;
  perform set_config('yipyy.owner_note', '', true);

  return v_id;
end;
$$;

revoke all on function public.add_owner_booking_note(bigint, text, text) from public;
revoke all on function public.add_owner_booking_note(bigint, text, text) from anon;
grant execute on function public.add_owner_booking_note(bigint, text, text)
  to authenticated, service_role;

do $check$
begin
  if has_function_privilege('anon', 'public.add_owner_booking_note(bigint,text,text)', 'execute') then
    raise exception 'anon can call add_owner_booking_note';
  end if;
  if has_function_privilege('authenticated', 'private.guard_customer_request()', 'execute') then
    raise exception 'authenticated can call guard_customer_request';
  end if;
end
$check$;
