-- ============================================================================
-- A customer picks from the facility's drop-off and pick-up hours.
--
-- The booking wizard's time chips (the client's mock, 2026-10-01; the client:
-- "the times it shows for drop off and pick up need to be according to the
-- facility") come from `service_time_windows` — boarding's hours per
-- weekday, daycare's full day, morning and afternoon. A customer books with
-- the same chips, so the domain joins the customer allowlist; a facility that
-- never set it answers its documented default, and the chips come from its
-- opening hours as before.
--
-- Patched in place, as 20261001083734 did: the allowlist is one function many
-- migrations add to, and restating it whole would undo a later addition made
-- on another branch of this file's history.
--
-- SQL 16 in customer-visible-settings.sql.
-- ============================================================================

do $patch$
declare
  v_def  text;
  v_hits integer;
  v_was  text := $a$'drop_off_pick_up_overrides',$a$;
  v_now  text := $b$'drop_off_pick_up_overrides',
    'service_time_windows',$b$;
begin
  v_def  := pg_get_functiondef('private.customer_visible_setting_domains()'::regprocedure);
  v_hits := (length(v_def) - length(replace(v_def, v_was, ''))) / length(v_was);
  if v_hits <> 1 then
    raise exception 'Patching the customer allowlist: the passage is there % time(s), not once: %',
      v_hits, v_was;
  end if;
  execute replace(v_def, v_was, v_now);
end
$patch$;
