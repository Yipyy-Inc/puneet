-- ============================================================================
-- A care log entry can be cleared — by whoever may record it, and on the
-- record.
--
-- ── WHAT IT IS FOR ────────────────────────────────────────────────────────
--
-- The client's journal on the booking page (2026-10-03) logs a meal, a dose or
-- a potty break with one tap, and a second tap on the same answer takes it
-- back — "logged by mistake" is the commonest correction there is, and until
-- now a mistaken row could only be overwritten with another answer:
-- `care_log_entries` has insert, read and update policies and no delete.
--
-- ── WHY A FUNCTION, NOT A POLICY ──────────────────────────────────────────
--
-- A care log is a record. Clearing one should leave a trace of what it said
-- and who took it back, and that trace is `audit_log`, which only
-- private.record_audit() writes. So the delete and its audit row happen
-- together here, or not at all. The entry is recorded against its BOOKING, so
-- it reads in the booking's own history.
--
-- Who may: the same permission that may record that kind of entry
-- (private.care_log_permission_for).
-- ============================================================================

create or replace function public.clear_care_log_entry(p_entry uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  v_row public.care_log_entries;
begin
  select * into v_row from public.care_log_entries where id = p_entry;
  if not found then
    raise exception 'No such care log entry.' using errcode = 'P0002';
  end if;
  if not private.has_permission(
    v_row.facility_id,
    private.care_log_permission_for(v_row.task_type)
  ) then
    raise exception 'Not allowed to clear this care log entry.'
      using errcode = '42501';
  end if;

  delete from public.care_log_entries where id = p_entry;

  perform private.record_audit(
    p_action      => 'Care log entry cleared',
    p_category    => 'Data',
    p_severity    => 'Low',
    p_entity_type => 'booking',
    p_entity_id   => v_row.booking_id::text,
    p_facility_id => v_row.facility_id,
    p_description => format(
      'Cleared %s logged as %s on %s.',
      v_row.task_key, v_row.outcome, v_row.occurred_on
    ),
    p_changes     => jsonb_build_array(jsonb_build_object(
      'field', 'care_log',
      'from', jsonb_build_object(
        'taskKey', v_row.task_key,
        'taskType', v_row.task_type,
        'outcome', v_row.outcome,
        'occurredOn', v_row.occurred_on
      ),
      'to', null
    ))
  );
end;
$fn$;

comment on function public.clear_care_log_entry(uuid) is
  'Clears one care log entry, under the permission that may record it, and records what it said in audit_log against its booking (2026-10-03).';

revoke all on function public.clear_care_log_entry(uuid) from public;
revoke all on function public.clear_care_log_entry(uuid) from anon;
grant execute on function public.clear_care_log_entry(uuid) to authenticated;
