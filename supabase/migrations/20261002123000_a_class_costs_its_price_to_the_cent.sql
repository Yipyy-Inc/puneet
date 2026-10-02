-- ============================================================================
-- A class costs its price, to the cent.
--
-- enroll_in_training_series books a dog into every session still ahead, each
-- at the series' price divided by its sessions and rounded — so a $280 class
-- of six sessions booked six times $46.67, and the owner owed $280.02. The
-- booking wizard's estimate (the client's mock, 2026-10-01) quotes what the
-- enrolment will book, and printed the two cents for the facility to explain.
--
-- Every session still costs the rounded share; the series' LAST session costs
-- what is left of the price ($46.65), so the six add up to $280.00. A dog
-- joining a running class pays the sessions it attends, the last one
-- included — `classPrice` in src/lib/training/offered-classes.ts mirrors this.
--
-- Unchanged otherwise: restated in full from 20260826110000, because a
-- `create or replace` that silently dropped a check would be worse than the
-- duplication. SECURITY INVOKER, as it was.
--
-- SQL T10 in training-series-enrollment.sql.
-- ============================================================================

create or replace function public.enroll_in_training_series(
  p_series_id     uuid,
  p_pet_id        uuid,
  p_client_id     uuid,
  p_join_waitlist boolean default false
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_series     public.training_series;
  v_enrolled   integer;
  v_status     text;
  v_enrollment public.training_series_enrollments;
  v_session    public.training_series_sessions;
  v_created    record;
  v_each       numeric;
  v_last       numeric;
  v_price      numeric;
  v_bookings   jsonb := '[]'::jsonb;
begin
  -- An advisory lock, not `for update`: see 20260826110000.
  perform pg_advisory_xact_lock(hashtext(p_series_id::text));

  select * into v_series from public.training_series where id = p_series_id;
  if not found then
    raise exception 'No such training series.' using errcode = '23503';
  end if;

  if v_series.status <> 'active' then
    raise exception 'This series is not open for enrollment.' using errcode = '22023';
  end if;

  select count(*) into v_enrolled
    from public.training_series_enrollments
   where series_id = p_series_id and status = 'enrolled';

  if v_enrolled >= v_series.capacity then
    if not p_join_waitlist then
      raise exception 'This series is full.' using errcode = '22023';
    end if;
    v_status := 'waitlisted';
  else
    v_status := 'enrolled';
  end if;

  insert into public.training_series_enrollments (
    series_id, facility_id, pet_id, client_id, status
  ) values (
    p_series_id, v_series.facility_id, p_pet_id, p_client_id, v_status
  )
  returning * into v_enrollment;

  -- Waitlisted: no bookings. Nothing to check in for a spot that isn't held.
  if v_status = 'waitlisted' then
    return jsonb_build_object('enrollment', to_jsonb(v_enrollment), 'bookings', v_bookings);
  end if;

  -- Each session the rounded share; the last, what is left of the price.
  v_each := case when v_series.number_of_sessions > 0
                 then round(v_series.total_price / v_series.number_of_sessions, 2)
                 else 0 end;
  v_last := case when v_series.number_of_sessions > 0
                 then v_series.total_price - v_each * (v_series.number_of_sessions - 1)
                 else 0 end;

  -- Only sessions still ahead of us -- enrolling partway through a series
  -- must not retroactively book a session that already happened.
  for v_session in
    select * from public.training_series_sessions
     where series_id = p_series_id
       and status = 'scheduled'
       and start_at >= now()
     order by session_number
  loop
    v_price := case when v_session.session_number = v_series.number_of_sessions
                    then v_last else v_each end;

    select * into v_created from public.create_booking(
      jsonb_build_object(
        'facility_id', v_series.facility_id,
        'location_id', v_series.location_id,
        'client_id', p_client_id,
        'service', 'training',
        'service_type', v_series.course_type_name,
        'status', 'confirmed',
        'start_at', v_session.start_at,
        'end_at', v_session.end_at,
        'assigned_staff_id', v_series.staff_id,
        'base_price', v_price,
        'total_cost', v_price,
        'training_series_session_id', v_session.id
      ),
      array[p_pet_id]
    );

    v_bookings := v_bookings || jsonb_build_object(
      'bookingId', v_created.booking_id,
      'bookingRef', v_created.booking_ref,
      'sessionId', v_session.id,
      'sessionNumber', v_session.session_number
    );
  end loop;

  return jsonb_build_object('enrollment', to_jsonb(v_enrollment), 'bookings', v_bookings);
end;
$$;

comment on function public.enroll_in_training_series(uuid, uuid, uuid, boolean) is
  'Enrolls a pet in a series and books every remaining session through create_booking() itself -- each at the series price divided by its sessions, the last session at what is left of the price, so a whole series costs its price to the cent (20261002090000). Full + not joining the waitlist raises; full + joining creates the enrollment as waitlisted with no bookings. SECURITY INVOKER -- judged by training_series_enrollments_insert and create_booking''s own policies.';

revoke all on function public.enroll_in_training_series(uuid, uuid, uuid, boolean) from public, anon;
grant execute on function public.enroll_in_training_series(uuid, uuid, uuid, boolean) to authenticated;
