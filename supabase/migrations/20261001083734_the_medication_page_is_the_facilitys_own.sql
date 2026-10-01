-- ============================================================================
-- THE MEDICATIONS STEP IS THE FACILITY'S OWN, AND ITS WAIVER IS STAFF'S.
--
-- The booking form's Medications step was rebuilt to the client's design
-- (2026-10-01): forms, quick-pick amounts, which days, which times, how it is
-- given — and what the facility supplies to give it with (a pill pocket, a
-- piece of cheese), charged per dose or per day as a line on the bill.
--
-- ── 1. A CLIENT READS WHAT THE STEP OFFERS ────────────────────────────────
--
-- Two settings domains decide what the Feeding and Medications steps show:
-- `feeding_instructions` and `medication_instructions`. The steps are in the
-- booking form a CUSTOMER fills, so the customer has to read them — the same
-- reason `care_fees` joined this list (20260919182016). Added beside it, in
-- place, so the list keeps exactly what it holds today (20260922120000's full
-- restatement still names `service_addons`, which 20260930184018 took off).
--
-- ── 2. A WAIVED CHARGE IS THE FACILITY'S TO GRANT ─────────────────────────
--
-- Staff may waive the charge for what the facility supplies, on one
-- medication of one booking: `aidWaived` on the medication, in `details`.
-- The booking route drops it from a customer's request, but a customer can
-- write `details` three other ways — the `create_bookings` function, the
-- booking PATCH route and PostgREST — and the server prices the charge from
-- what is stored. So the integrity trigger does it, the way it pins
-- `taxable` and `service_charges_included` for them (20260930231159): on a
-- customer's insert every `aidWaived` is dropped; on a customer's update each
-- medication gets back the `aidWaived` it had, by its id, and a new one has
-- none. Staff, and the server's own writes, are untouched.
--
-- Both functions are changed WHERE THEY STAND, as 20260930231159 changed its
-- own: the definition is read, one passage replaced and the result run, and a
-- passage that is not there exactly once stops the migration.
-- ============================================================================

-- `p_new`'s medications, each with the `aidWaived` its namesake in `p_old` had
-- (matched by id), or none. Anything that is not a medication list passes
-- through untouched.
create or replace function private.keep_medication_waivers(
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
      or jsonb_typeof(p_new -> 'medications') is distinct from 'array'
      then p_new
    else jsonb_set(
      p_new,
      '{medications}',
      coalesce((
        select jsonb_agg(
                 case
                   when jsonb_typeof(m.value) is distinct from 'object'
                     then m.value
                   else (m.value - 'aidWaived') || coalesce((
                     select jsonb_build_object('aidWaived', o.value -> 'aidWaived')
                       from jsonb_array_elements(
                              case
                                when jsonb_typeof(p_old -> 'medications') = 'array'
                                  then p_old -> 'medications'
                                else '[]'::jsonb
                              end
                            ) as o(value)
                      where jsonb_typeof(o.value) = 'object'
                        and o.value ->> 'id' = m.value ->> 'id'
                        and o.value ? 'aidWaived'
                      limit 1
                   ), '{}'::jsonb)
                 end
                 order by m.ordinality
               )
          from jsonb_array_elements(p_new -> 'medications')
               with ordinality as m(value, ordinality)
      ), '[]'::jsonb)
    )
  end
$$;

revoke all on function private.keep_medication_waivers(jsonb, jsonb) from public, anon;

do $patch$
declare
  v_patch record;
  v_def   text;
  v_hits  integer;
begin
  for v_patch in
    select *
      from (values
        (1, 'private.customer_visible_setting_domains()'::regprocedure,
$a$'care_fees',$a$,
$b$'care_fees',
    'feeding_instructions',
    'medication_instructions',$b$),

        (2, 'private.enforce_booking_integrity()'::regprocedure,
$a$    new.service_charges_included := false;

    return new;
  end if;
$a$,
$b$    new.service_charges_included := false;

    -- A waived charge for what the facility supplies to give a medication
    -- with is the facility's to grant, never the payer's.
    new.details := private.keep_medication_waivers(new.details, null);

    return new;
  end if;
$b$),

        (3, 'private.enforce_booking_integrity()'::regprocedure,
$a$  new.service_charges_included := old.service_charges_included;
$a$,
$b$  new.service_charges_included := old.service_charges_included;
  new.details := private.keep_medication_waivers(new.details, old.details);
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
