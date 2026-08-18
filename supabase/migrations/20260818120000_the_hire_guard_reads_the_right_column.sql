-- ============================================================================
-- The hire guard reads the right column.
--
-- private.enforce_hire_access_level fires on two tables whose job-title column
-- is named differently: `staff.primary_role` and
-- `facility_membership_grants.role`. The first cut chose between them with a
-- CASE in the DECLARE initialiser:
--
--   v_role public.facility_staff_role :=
--     case tg_table_name when 'staff' then new.primary_role else new.role end;
--
-- plpgsql compiles that into ONE SQL expression, so BOTH field references are
-- resolved against the record no matter which branch would be taken. On a staff
-- row `new.role` does not exist, so every insert and update of either table
-- raised
--
--   record "new" has no field "role"
--
-- Caught by the escalation probe rather than by review: the assertion that a
-- receptionist with manage_staff cannot hire a manager PASSED — but for the
-- wrong reason. The write failed with a schema error, not with the guard. A
-- refusal is not evidence unless you read why it refused.
--
-- Branching with IF evaluates only the arm it takes, one statement at a time.
-- ============================================================================

create or replace function private.enforce_hire_access_level()
returns trigger
language plpgsql
security definer
set search_path to ''
as $fn$
declare
  v_sub  text := (select auth.jwt()->>'sub');
  v_role public.facility_staff_role;
begin
  if tg_table_name = 'staff' then
    v_role := new.primary_role;
  else
    v_role := new.role;
  end if;

  if v_role in ('owner','admin','manager','supervisor') then
    new.access_level := 'admin'::public.facility_access_level;
  end if;

  if new.access_level <> 'admin'::public.facility_access_level then
    return new;
  end if;

  if tg_op = 'UPDATE'
     and old.access_level = 'admin'::public.facility_access_level then
    return new;
  end if;

  if v_sub is null
     or private.is_platform_admin()
     or private.is_facility_admin(new.facility_id) then
    return new;
  end if;

  raise exception
    'Only a facility admin may hire an admin. manage_staff is not enough.'
    using errcode = '42501';
end;
$fn$;
