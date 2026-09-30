-- ============================================================================
-- THE OLD ADD-ON STORES ARE DROPPED.
--
-- The second of two steps. The one before it took the last readers and the
-- one writer off these, and the build that selected from them is no longer
-- the one serving, so they can go:
--
--   grooming_appointment_add_ons   a groom's add-ons, one row each. A booking's
--                                  add-ons are lines on its bill
--                                  (20260930153912) and nothing has written
--                                  here since.
--   grooming_add_ons               a view over the one add-ons list, kept under
--                                  the name of the table it replaced
--                                  (20260926223644) for two readers that now
--                                  read the list itself.
--   facility_settings 'service_addons'   the JSON list the one list was made
--                                  from, left in place and unread since, as
--                                  the way back. There is no way back to keep
--                                  it for now.
--
-- Every check comes before anything is dropped, and nothing is dropped with
-- CASCADE: whatever still depends on one of these stops the migration, which
-- is the point.
-- ============================================================================

-- ── 1. Nothing names them ───────────────────────────────────────────────────
--
-- A plpgsql function does not depend on the tables it reads, so dropping one
-- out from under it succeeds and the function fails the next time it runs.
-- The only function allowed to name them is the trigger function dropped
-- below with its table.

do $check$
declare
  v_names text;
begin
  select string_agg(n.nspname || '.' || p.proname, ', ' order by 1)
    into v_names
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
   where n.nspname in ('public', 'private')
     and p.prosrc ~ 'grooming_add_ons|grooming_appointment_add_ons|service_addons'
     and p.oid <> 'private.grooming_line_same_facility()'::regprocedure;
  if v_names is not null then
    raise exception 'Still named by: %', v_names;
  end if;
end
$check$;

-- ── 2. The table holds only what is known to be there ───────────────────────
--
-- It is dropped with whatever it holds, so it may hold only rows of a
-- facility that has been archived. A row of a facility somebody can still
-- open is a groom's add-on that belongs on a bill, and it stops the migration
-- until it is put there.

do $guard$
declare
  v_live integer;
begin
  select count(*) into v_live
    from public.grooming_appointment_add_ons a
    join public.facilities f on f.id = a.facility_id
   where f.archived_at is null;
  if v_live > 0 then
    raise exception
      '% grooming add-on row(s) belong to a facility that is not archived. Put them on their bookings'' bills before dropping the table.',
      v_live;
  end if;
end
$guard$;

-- ── 3. The JSON list holds nothing the one list lacks ───────────────────────
--
-- Every add-on in it became a row of `service_add_ons` under its old id
-- (`legacy_id`) on 2026-09-26, and nothing has written the setting since. It
-- is checked once more rather than trusted: an add-on that exists only there
-- stops the migration instead of being deleted.

do $guard$
declare
  v_missing integer;
begin
  select count(*) into v_missing
    from public.facility_settings s
    cross join lateral jsonb_array_elements(
      case when jsonb_typeof(s.value -> 'addOns') = 'array'
           then s.value -> 'addOns' else '[]'::jsonb end) as e
   where s.domain = 'service_addons'
     and not exists (
       select 1
         from public.service_add_ons a
        where a.facility_id = s.facility_id
          and a.legacy_id = e ->> 'id');
  if v_missing > 0 then
    raise exception
      '% add-on(s) in the service_addons setting never reached service_add_ons; nothing is dropped.',
      v_missing;
  end if;
end
$guard$;

-- ── The drops ───────────────────────────────────────────────────────────────

drop table public.grooming_appointment_add_ons;

-- The table's own trigger function: "that add-on belongs to a different
-- facility". Nothing else called it.
drop function private.grooming_line_same_facility();

drop view public.grooming_add_ons;

delete from public.facility_settings where domain = 'service_addons';

comment on table public.service_add_ons is
  'One add-ons list for every service (Settings > Services > Add-ons). Replaced the facility_settings service_addons JSON and the grooming_add_ons table on 2026-09-26; both, and the view that stood in for the second, were dropped on 2026-09-30. Delete = archive (archived_at).';
