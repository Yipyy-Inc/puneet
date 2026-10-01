-- ============================================================================
-- THE FEEDING STEP IS THE FACILITY'S OWN, AND ITS WAIVER IS STAFF'S.
--
-- The booking form's Feeding step was rebuilt to the client's design
-- (2026-10-01): a plan per pet — meal times, which days, each food and its
-- portion — and the facility's house food, priced per meal or per day in
-- Settings → Care tasks and charged as a line on the bill.
--
-- ── A WAIVED HOUSE FOOD IS THE FACILITY'S TO GRANT ────────────────────────
--
-- Staff may waive the house-food charge on one food of one booking:
-- `waivedFoods` on the feeding plan, in `details.feedingSchedule`, the ids of
-- the foods waived. The booking route drops it from a customer's request, but
-- a customer can write `details` three other ways — the `create_bookings`
-- function, the booking PATCH route and PostgREST — and the server prices the
-- charge from what is stored. So the integrity trigger does it, as it does
-- for a medication's `aidWaived` (20261001083734): on a customer's insert
-- every `waivedFoods` is dropped; on a customer's update each plan gets back
-- the `waivedFoods` it had, by its id, and a new one has none. Staff, and the
-- server's own writes, are untouched.
--
-- The trigger is changed WHERE IT STANDS, as 20261001083734 changed it: the
-- definition is read, one passage replaced and the result run, and a passage
-- that is not there exactly once stops the migration.
--
-- `feeding_instructions` is already on the list of domains a customer reads
-- (20261001083734), so nothing else changes.
-- ============================================================================

-- `p_new`'s feeding plans, each with the `waivedFoods` its namesake in `p_old`
-- had (matched by id), or none. Anything that is not a list of plans passes
-- through untouched.
create or replace function private.keep_feeding_waivers(
  p_new jsonb,
  p_old jsonb
)
returns jsonb
language sql
immutable
set search_path to ''
as $$
  select case
    when p_new is null
      or jsonb_typeof(p_new -> 'feedingSchedule') is distinct from 'array'
      then p_new
    else jsonb_set(
      p_new,
      '{feedingSchedule}',
      coalesce((
        select jsonb_agg(
                 case
                   when jsonb_typeof(f.value) is distinct from 'object'
                     then f.value
                   else (f.value - 'waivedFoods') || coalesce((
                     select jsonb_build_object('waivedFoods', o.value -> 'waivedFoods')
                       from jsonb_array_elements(
                              case
                                when jsonb_typeof(p_old -> 'feedingSchedule') = 'array'
                                  then p_old -> 'feedingSchedule'
                                else '[]'::jsonb
                              end
                            ) as o(value)
                      where jsonb_typeof(o.value) = 'object'
                        and o.value ->> 'id' = f.value ->> 'id'
                        and o.value ? 'waivedFoods'
                      limit 1
                   ), '{}'::jsonb)
                 end
                 order by f.ordinality
               )
          from jsonb_array_elements(p_new -> 'feedingSchedule')
               with ordinality as f(value, ordinality)
      ), '[]'::jsonb)
    )
  end
$$;

-- The trigger calls it as its owner; nobody calls it directly.
revoke all on function private.keep_feeding_waivers(jsonb, jsonb)
  from public, anon, authenticated;

do $patch$
declare
  v_patch record;
  v_def   text;
  v_hits  integer;
begin
  for v_patch in
    select *
      from (values
        (1, 'private.enforce_booking_integrity()'::regprocedure,
$a$    new.details := private.keep_medication_waivers(new.details, null);
$a$,
$b$    new.details := private.keep_medication_waivers(new.details, null);
    -- And a waived house food on a feeding plan, the same way (2026-10-01).
    new.details := private.keep_feeding_waivers(new.details, null);
$b$),

        (2, 'private.enforce_booking_integrity()'::regprocedure,
$a$  new.details := private.keep_medication_waivers(new.details, old.details);
$a$,
$b$  new.details := private.keep_medication_waivers(new.details, old.details);
  new.details := private.keep_feeding_waivers(new.details, old.details);
$b$)
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
