-- ============================================================================
-- Several bookings from one request, all or none.
--
-- The database holds one room per booking (boarding_stays is keyed on
-- booking_id) and one attendance per booking (daycare_attendance, the same).
-- The New Booking form let staff pick three daycare days, or two dogs in two
-- kennels, and saved ONE booking: the first day, the first kennel. So the form
-- now asks for one booking per day, or per room — and they have to land
-- together. Written one call at a time from the route, a refusal on the third
-- (the kennel is taken that night) would leave the first two, and bookings
-- have no DELETE policy to take them back.
--
-- Each item goes through create_booking unchanged, so every rule it enforces
-- — the pets belong to the client, the room is this facility's and free, the
-- grooming service is on the menu — holds for every item. SECURITY INVOKER,
-- like create_booking: RLS judges each insert as the caller.
-- ============================================================================

create or replace function public.create_bookings(p_items jsonb)
returns table (item_index integer, booking_id uuid, booking_ref bigint)
language plpgsql
set search_path to ''
as $$
declare
  v_item    jsonb;
  v_index   integer := 0;
  v_pets    uuid[];
  v_created record;
begin
  if p_items is null or jsonb_typeof(p_items) <> 'array'
     or jsonb_array_length(p_items) = 0 then
    raise exception 'create_bookings needs at least one booking.'
      using errcode = '22023';
  end if;

  if jsonb_array_length(p_items) > 100 then
    raise exception 'create_bookings takes at most 100 bookings at once.'
      using errcode = '22023';
  end if;

  for v_item in select value from jsonb_array_elements(p_items) loop
    select coalesce(array_agg(x::uuid), '{}'::uuid[]) into v_pets
      from jsonb_array_elements_text(coalesce(v_item->'petIds', '[]'::jsonb)) x;

    select * into v_created from public.create_booking(
      v_item->'booking',
      v_pets,
      nullif(v_item->'grooming', 'null'::jsonb),
      nullif(v_item->'boarding', 'null'::jsonb)
    );

    item_index  := v_index;
    booking_id  := v_created.booking_id;
    booking_ref := v_created.booking_ref;
    return next;
    v_index := v_index + 1;
  end loop;
end;
$$;

revoke all on function public.create_bookings(jsonb) from public;
revoke all on function public.create_bookings(jsonb) from anon;
grant execute on function public.create_bookings(jsonb) to authenticated, service_role;

do $$
begin
  if has_function_privilege('anon', 'public.create_bookings(jsonb)', 'execute') then
    raise exception 'anon can still execute create_bookings';
  end if;
  if not has_function_privilege('authenticated', 'public.create_bookings(jsonb)', 'execute') then
    raise exception 'authenticated cannot execute create_bookings';
  end if;
end $$;
