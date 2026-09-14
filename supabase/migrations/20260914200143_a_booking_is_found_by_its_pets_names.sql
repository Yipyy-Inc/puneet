-- The bookings page searches a booking by its client's name OR any of its
-- pets' names. PostgREST cannot OR a filter across two embedded tables, and
-- passing matching ids back would not fit a URL (a daycare regular has
-- hundreds of bookings), so the searchable names are a computed field.
--
-- SECURITY INVOKER: it reads clients and pets under the caller's own RLS, and
-- it only runs on booking rows the caller could already read.
create or replace function public.booking_search_names(b public.bookings)
returns text
language sql
stable
security invoker
set search_path = ''
as $$
  select concat_ws(' ',
    (select c.name from public.clients c where c.id = b.client_id),
    (select string_agg(p.name, ' ')
       from public.booking_pets bp
       join public.pets p on p.id = bp.pet_id
      where bp.booking_id = b.id));
$$;

revoke all on function public.booking_search_names(public.bookings) from public;
revoke all on function public.booking_search_names(public.bookings) from anon;
grant execute on function public.booking_search_names(public.bookings) to authenticated, service_role;

do $check$
begin
  if has_function_privilege('anon', 'public.booking_search_names(public.bookings)', 'execute') then
    raise exception 'anon can execute booking_search_names';
  end if;
  if not has_function_privilege('authenticated', 'public.booking_search_names(public.bookings)', 'execute') then
    raise exception 'authenticated cannot execute booking_search_names';
  end if;
end
$check$;

notify pgrst, 'reload schema';
