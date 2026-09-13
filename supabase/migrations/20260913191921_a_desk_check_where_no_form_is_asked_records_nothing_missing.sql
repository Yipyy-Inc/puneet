-- A desk check where no form is asked records nothing missing.
--
-- record_yipyy_go_desk_check() (20260913140335) computed
--   v_missing := v_requirement = 'mandatory' and v_status not in (...)
-- For a service the facility asks no pre-arrival form for, the requirement
-- is NULL, so the comparison was NULL, the NOT NULL form_missing column
-- refused the insert (23502), and the desk answered 500 for every dog at
-- every such service: boarding at a facility whose forms cover daycare only,
-- and every service at a facility with no forms at all.
--
-- The one change is that a NULL requirement reads as "not required". The
-- signature, SECURITY DEFINER, the search path, every refusal and its code
-- are as they were; `create or replace` keeps the grants, which the check at
-- the end reads back. Tested by supabase/tests/yipyy-go-check-in.sql, K8.

create or replace function public.record_yipyy_go_desk_check(
  p_booking_id uuid,
  p_pets jsonb,
  p_source text,
  p_by_name text default null
)
returns setof public.yipyy_go_desk_checks
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  v_booking     public.bookings;
  v_requirement text;
  v_pet         record;
  v_entry       jsonb;
  v_status      text;
  v_missing     boolean;
  v_reason      text;
  v_row         public.yipyy_go_desk_checks;
begin
  select * into v_booking from public.bookings where id = p_booking_id;
  if not found or not private.yipyy_go_may_check_in(v_booking.facility_id, v_booking.service) then
    raise exception 'That booking is not yours to check in.' using errcode = '42501';
  end if;
  if v_booking.status::text in ('cancelled', 'declined', 'no_show', 'completed') then
    raise exception 'This booking is not arriving.' using errcode = '22023';
  end if;
  if p_source is null or p_source not in ('code', 'search') then
    raise exception 'Say how the booking was found.' using errcode = '22023';
  end if;
  if p_pets is null or jsonb_typeof(p_pets) <> 'array'
     or (select count(*) from jsonb_array_elements(p_pets)) <> (
       select count(*) from public.booking_pets bp where bp.booking_id = p_booking_id
     )
     or exists (
       select 1 from public.booking_pets bp
        where bp.booking_id = p_booking_id
          and not exists (
            select 1 from jsonb_array_elements(p_pets) e(value)
             where e.value ->> 'petId' = bp.pet_id::text
          )
     )
  then
    raise exception 'Check in every dog on the booking.' using errcode = '22023';
  end if;

  v_requirement := private.yipyy_go_requirement(v_booking.facility_id, v_booking.service);

  for v_pet in
    select p.id, p.name
      from public.booking_pets bp
      join public.pets p on p.id = bp.pet_id
     where bp.booking_id = p_booking_id
     order by p.name
  loop
    select e.value into v_entry from jsonb_array_elements(p_pets) e(value)
     where e.value ->> 'petId' = v_pet.id::text
     limit 1;

    select coalesce(
      (select y.status from public.yipyy_go_submissions y
        where y.booking_id = p_booking_id and y.pet_id = v_pet.id),
      'not_started') into v_status;
    -- No requirement is not a mandatory one: NULL must not reach form_missing.
    v_missing := coalesce(v_requirement = 'mandatory', false)
                 and v_status not in ('submitted', 'approved', 'completed_by_staff');
    v_reason := nullif(btrim(coalesce(v_entry ->> 'overrideReason', '')), '');

    if v_missing and v_reason is null then
      raise exception 'Say why % is checking in without the form.', v_pet.name
        using errcode = '22023', hint = 'override_reason_required';
    end if;
    if v_reason is not null and length(v_reason) > 1000 then
      raise exception 'Keep the reason under 1,000 characters.' using errcode = '22023';
    end if;

    insert into public.yipyy_go_desk_checks
      (facility_id, booking_id, pet_id, source, medications_confirmed, belongings_confirmed,
       requirement, form_status, form_missing, override_reason, recorded_by_name)
    values
      (v_booking.facility_id, p_booking_id, v_pet.id, p_source,
       coalesce((v_entry ->> 'medicationsConfirmed')::boolean, false),
       coalesce((v_entry ->> 'belongingsConfirmed')::boolean, false),
       v_requirement, v_status, v_missing, case when v_missing then v_reason else null end,
       nullif(left(btrim(coalesce(p_by_name, '')), 200), ''))
    returning * into v_row;

    return next v_row;
  end loop;
end;
$fn$;

do $check$
begin
  if has_function_privilege('anon', 'public.record_yipyy_go_desk_check(uuid, jsonb, text, text)', 'execute') then
    raise exception 'anon can execute record_yipyy_go_desk_check';
  end if;
  if not has_function_privilege('authenticated', 'public.record_yipyy_go_desk_check(uuid, jsonb, text, text)', 'execute') then
    raise exception 'authenticated cannot execute record_yipyy_go_desk_check';
  end if;
end
$check$;
