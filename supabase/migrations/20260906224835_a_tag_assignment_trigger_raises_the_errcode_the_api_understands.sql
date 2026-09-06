-- ============================================================================
-- The tag-assignment trigger raises the errcode the API layer already reads.
--
-- ── WHAT WENT WRONG ───────────────────────────────────────────────────────
--
-- `private.tag_assignment_facility()` guards two things and raises for both
-- with the default errcode, P0001:
--
--   'no such tag'
--   'a % tag cannot be applied to a %'
--
-- Nothing maps P0001, so `writeFailure` fell through to its last line and
-- returned **500** with the raw Postgres message. Measured on 2026-09-06 by
-- tests/e2e/tag-catalogue.spec.ts, whose "a customer cannot tag a record" case
-- sent a tag id that does not exist and got a server error rather than a
-- refusal.
--
-- Worse than the status code: this trigger is a BEFORE trigger, so it runs
-- ahead of the `with check` policy. A caller naming a nonexistent tag never
-- reached RLS at all — the 500 came out before the refusal could.
--
-- ── WHY 23503 ─────────────────────────────────────────────────────────────
--
-- src/lib/api/write-failure.ts already has a convention for exactly this, and
-- it is written down there: 23503 is both Postgres's own foreign-key violation
-- and "the errcode our triggers raise when a row names something that has to
-- exist". It distinguishes the two by whether the message reads like a
-- constraint name, and passes a human sentence through as a 400.
-- `grooming_line_names_a_grooming_service` set that precedent.
--
-- So both raises become 23503 and the two sentences reach the person who typed
-- something. Nothing else about the trigger changes: it still stamps
-- `facility_id` from the tag, which is what stops an assignment pointing at one
-- facility's tag and another's pet.
--
-- The route now resolves the tag through RLS first, so this path is a race —
-- a tag retired between the check and the insert. It should still answer 400
-- and not 500.
-- ============================================================================

create or replace function private.tag_assignment_facility()
returns trigger
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  v_facility uuid;
  v_entity_type text;
begin
  select facility_id, entity_type into v_facility, v_entity_type
    from public.facility_tags where id = new.tag_id;
  if v_facility is null then
    raise exception 'There is no such tag.' using errcode = '23503';
  end if;
  if v_entity_type is distinct from new.entity_type then
    raise exception 'A % tag cannot be applied to a %.', v_entity_type, new.entity_type
      using errcode = '23503';
  end if;
  new.facility_id := v_facility;
  return new;
end;
$fn$;

do $verify$
declare
  v_state text;
begin
  begin
    insert into public.facility_tag_assignments (tag_id, entity_type, entity_id)
    values ('00000000-0000-4000-8000-000000000000'::uuid, 'pet',
            '00000000-0000-4000-8000-000000000000'::uuid);
    v_state := 'inserted';
  exception when others then
    v_state := sqlstate;
  end;

  if v_state <> '23503' then
    raise exception 'a nonexistent tag raised % rather than 23503', v_state;
  end if;
end;
$verify$;
