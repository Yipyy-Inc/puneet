-- ============================================================================
-- A module audit entry says which thing changed.
--
-- The trigger added minutes ago in 20260807560000 derives its action from
-- new.enabled, so ANY update to a facility_modules row is logged as
--
--   "Module enabled"  ...  enabled -> enabled
--
-- even when what actually changed was the price or the expiry date. Caught in
-- E8b of that migration's own verification: agreeing a $0 price for Grooming
-- produced an entry claiming the module had just been switched on.
--
-- On most tables that would be a cosmetic wording bug. On this one it is the
-- content: the row exists so that "who turned this on, and when" has an answer,
-- and an entry that says a module was enabled on a day it was already enabled
-- makes the trail actively misleading — worse than not recording the price
-- change at all, because it looks like a record of something else.
--
-- Three changes are worth recording separately, so each one names itself and
-- carries its own before/after:
--
--   enabled      Module enabled / Module disabled   Medium / High
--   price        Module price changed               Medium
--   expiry       Module expiry changed              Low
--
-- Precedence is deliberate rather than one entry per field: a single save that
-- turns a module on AND prices it is one commercial act, and the fact that
-- matters is that it was turned on. Turning something off stays High — that is
-- the entry a support call starts from.
-- ============================================================================

create or replace function private.audit_facility_module()
returns trigger
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  v_row      record;
  v_facility text;
  v_module   text;
  v_action   text;
  v_severity text;
  v_field    text;
  v_from     text;
  v_to       text;
begin
  if tg_op = 'DELETE' then v_row := old; else v_row := new; end if;

  select f.name into v_facility from public.facilities f where f.id = v_row.facility_id;
  select m.name into v_module   from public.modules m    where m.id = v_row.module_id;

  if tg_op = 'DELETE' then
    v_action   := 'Module exception removed';
    v_severity := 'Medium';
    v_field    := 'enabled';
    v_from     := case when old.enabled then 'enabled' else 'disabled' end;
    v_to       := 'plan default';

  elsif tg_op = 'INSERT' or new.enabled is distinct from old.enabled then
    v_action   := case when new.enabled then 'Module enabled' else 'Module disabled' end;
    v_severity := case when new.enabled then 'Medium' else 'High' end;
    v_field    := 'enabled';
    v_from     := case
                    when tg_op = 'INSERT' then 'plan default'
                    when old.enabled then 'enabled'
                    else 'disabled'
                  end;
    v_to       := case when new.enabled then 'enabled' else 'disabled' end;

  elsif new.price_override_cents is distinct from old.price_override_cents then
    v_action   := 'Module price changed';
    v_severity := 'Medium';
    v_field    := 'price_override_cents';
    -- "catalogue price" rather than an empty string: NULL here means the
    -- agreement was withdrawn, not that the price became nothing.
    v_from     := coalesce(old.price_override_cents::text, 'catalogue price');
    v_to       := coalesce(new.price_override_cents::text, 'catalogue price');

  elsif new.expires_at is distinct from old.expires_at then
    v_action   := 'Module expiry changed';
    v_severity := 'Low';
    v_field    := 'expires_at';
    v_from     := coalesce(old.expires_at::text, 'no expiry');
    v_to       := coalesce(new.expires_at::text, 'no expiry');

  else
    -- A note edit or a re-save. Nothing about the entitlement moved.
    return null;
  end if;

  perform private.record_audit(
    v_action,
    'Financial',
    v_severity,
    'module', v_row.module_id, coalesce(v_module, v_row.module_id),
    v_row.facility_id, v_facility,
    format('%s: %s %s -> %s',
           coalesce(v_facility, 'facility'), coalesce(v_module, v_row.module_id), v_from, v_to),
    jsonb_build_array(jsonb_build_object('field', v_field, 'from', v_from, 'to', v_to)));

  return null;
end;
$fn$;
