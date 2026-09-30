-- ============================================================================
-- NOTHING READS THE OLD ADD-ON STORES.
--
-- Add-ons are one list (`service_add_ons`, 20260926223644) and a booking's own
-- are lines on its bill (`booking_line_items` of kind 'add_on',
-- 20260930153912). Three older stores were left standing while the app moved
-- off them, and four functions still named one:
--
--   grooming_appointment_add_ons   a groom's add-ons, one row each
--   grooming_add_ons               once a table, since a view over the list
--   facility_settings 'service_addons'   the JSON list the one list replaced
--
-- This is the first of two steps. It takes the last readers and the one
-- writer off them; the stores themselves go in the migration after it, once
-- the build that still selects from two of them is no longer the one serving.
-- Dropped here, the grooming calendar would answer an error for as long as a
-- deploy takes.
--
-- Each function is changed WHERE IT STANDS, as 20260930153912 changed its
-- readers: the definition is read, one passage replaced and the result run,
-- and a passage that is not there exactly once stops the migration.
--
--   1  create_booking                 REFUSES add-on ids in the grooming
--                                     payload, where it wrote them to the
--                                     table. Refused, not ignored: a list
--                                     nothing reads is a nail trim the screen
--                                     promised and no bill carries. An empty
--                                     list passes — the build being replaced
--                                     sends one on every groom.
--   2                                 and then no longer declares the two
--                                     counters only that block used (in that
--                                     order: each step is compiled)
--   3  sync_grooming_lifecycle        the ready time counts the minutes of
--                                     the booking's add-on lines, and no
--                                     longer the old table's as well
--   4  grooming_add_on_same_facility  a grooming service's default add-on is
--                                     looked up in the list, not the view
--   5  customer_visible_setting_domains   'service_addons' leaves the domains
--                                     a customer may read: the app no longer
--                                     has the domain, and a customer reads
--                                     add-ons through the table's own policy
-- ============================================================================

do $patch$
declare
  v_patch record;
  v_def   text;
  v_hits  integer;
begin
  for v_patch in
    select *
      from (values
        (1, 'public.create_booking(jsonb, uuid[], jsonb, jsonb)'::regprocedure,
$a$  if jsonb_typeof(p_grooming->'addOnIds') = 'array' then
    insert into public.grooming_appointment_add_ons (
      booking_id, facility_id, add_on_id, name, price, duration_min
    )
    select v_booking_id, v_facility_id, a.id, a.name,
           case when v_is_staff then a.price else 0 end, a.duration_min
      from jsonb_array_elements_text(p_grooming->'addOnIds') requested
      join public.grooming_add_ons a
        on a.facility_id = v_facility_id
       and (a.legacy_id = requested or a.id::text = requested);

    get diagnostics v_written = row_count;
    v_requested := jsonb_array_length(p_grooming->'addOnIds');

    if v_written <> v_requested then
      raise exception 'This facility has % of the % grooming add-ons requested.',
        v_written, v_requested using errcode = '23503';
    end if;
  end if;
$a$,
$b$  -- A groom's add-ons are `add_on` lines on the bill, placed by
  -- `create_bookings` from the request's `addOns` (20260930153912). Ids sent
  -- here were once written to a table of their own; they are refused rather
  -- than dropped, so nobody books an add-on no bill carries.
  if jsonb_typeof(p_grooming->'addOnIds') = 'array'
     and jsonb_array_length(p_grooming->'addOnIds') > 0 then
    raise exception 'A groom''s add-ons are sent as the request''s addOns, not as addOnIds.'
      using errcode = '22023';
  end if;
$b$),

        (2, 'public.create_booking(jsonb, uuid[], jsonb, jsonb)'::regprocedure,
$a$  v_written      integer;
  v_requested    integer;
$a$,
$b$$b$),

        (3, 'private.sync_grooming_lifecycle()'::regprocedure,
$a$    -- The add-ons' minutes: the old table for bookings made before
    -- 2026-09-30, the booking's `add_on` lines since.
    select coalesce(sum(duration_min), 0) into v_add_mins
      from (
        select duration_min from public.grooming_appointment_add_ons
         where booking_id = new.id
        union all
        select coalesce(li.duration_min, 0) * li.quantity
          from public.booking_line_items li
         where li.booking_id = new.id and li.kind = 'add_on'
      ) minutes;
$a$,
$b$    -- The add-ons' minutes, from the booking's `add_on` lines.
    select coalesce(sum(coalesce(li.duration_min, 0) * li.quantity), 0)
      into v_add_mins
      from public.booking_line_items li
     where li.booking_id = new.id and li.kind = 'add_on';
$b$),

        (4, 'private.grooming_add_on_same_facility()'::regprocedure,
$a$    from public.grooming_add_ons where id = new.add_on_id;
$a$,
$b$    from public.service_add_ons where id = new.add_on_id;
$b$),

        (5, 'private.customer_visible_setting_domains()'::regprocedure,
$a$    'service_addons',
$a$,
$b$$b$)
      ) as p(step, fn, was, becomes)
     order by step
  loop
    v_def  := pg_get_functiondef(v_patch.fn);
    v_hits := (length(v_def) - length(replace(v_def, v_patch.was, '')))
              / length(v_patch.was);
    if v_hits <> 1 then
      raise exception 'Patching %: the passage is there % time(s), not once: %',
        v_patch.fn, v_hits, v_patch.was;
    end if;
    execute replace(v_def, v_patch.was, v_patch.becomes);
  end loop;
end
$patch$;
