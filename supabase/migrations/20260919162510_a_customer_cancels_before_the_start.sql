-- ============================================================================
-- A customer cancels before the start, and the booking says on what terms.
--
-- The customer portal's Cancel button waited a second and said "cancelled";
-- nothing was written. The database already let an owner move their own open
-- booking to cancelled (enforce_booking_integrity), but at any time — a
-- confirmed stay could be "cancelled" by its owner halfway through — and with
-- no record of whether it was late under the facility's own rule.
--
-- Now, when someone who is not staff cancels:
--   * a confirmed or pending booking that has started is refused (55000);
--     withdrawing a request is always allowed;
--   * the trigger writes details.cancellation itself — by, at, the reason
--     (from cancel_my_booking), whether it was a withdrawal, whether it was
--     inside the notice window of the facility's booking_rules
--     (cancelPolicyHours) and, if so, the fee percentage it names. Only a rule
--     the facility saved counts: no row, no late flag.
--   * nobody but the trigger writes details.cancellation: a customer's update
--     that touches it is put back.
-- Nothing is charged or refunded here; the fee is for the facility to apply.
--
-- public.my_booking_cancel_terms(ref) answers the same question before the
-- customer confirms; public.cancel_my_booking(ref, reason) cancels. Both admit
-- only the caller's own bookings. SQL T9b-T9f in booking-write-integrity.sql
-- and owner-cancel.sql.
--
-- enforce_booking_integrity is replaced from its live body
-- (pg_get_functiondef, 2026-09-19) with the cancellation block added.
-- ============================================================================

create or replace function private.cancel_terms(
  p_facility_id uuid,
  p_status public.booking_status,
  p_start_at timestamptz
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_rules      jsonb;
  v_hours      numeric;
  v_fee        numeric;
  v_withdrawal boolean := p_status in ('request_submitted', 'estimate_sent', 'waitlisted');
  v_late       boolean := false;
begin
  select s.value into v_rules
    from public.facility_settings s
   where s.facility_id = p_facility_id and s.domain = 'booking_rules';

  if v_rules is not null then
    if coalesce(v_rules->>'cancelPolicyHours', '') ~ '^\d+(\.\d+)?$' then
      v_hours := (v_rules->>'cancelPolicyHours')::numeric;
    end if;
    if coalesce(v_rules->>'cancelFeePercentage', '') ~ '^\d+(\.\d+)?$' then
      v_fee := (v_rules->>'cancelFeePercentage')::numeric;
    end if;
  end if;

  v_late := not v_withdrawal
            and coalesce(v_hours, 0) > 0
            and p_start_at - now() < make_interval(hours => v_hours::int);

  return jsonb_build_object(
    'withdrawal', v_withdrawal,
    'started', p_start_at <= now(),
    'late', v_late,
    'noticeHours', v_hours,
    'feePercentage', case when v_late and coalesce(v_fee, 0) > 0 then v_fee end
  );
end;
$$;

revoke all on function private.cancel_terms(uuid, public.booking_status, timestamptz) from public;
revoke all on function private.cancel_terms(uuid, public.booking_status, timestamptz) from anon;
revoke all on function private.cancel_terms(uuid, public.booking_status, timestamptz) from authenticated;

CREATE OR REPLACE FUNCTION private.enforce_booking_integrity()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_client_facility uuid;
  v_is_staff        boolean;
  v_terms           jsonb;
  v_derived         text[] := array[
    'amount_paid', 'payment_status', 'extras_total', 'amount_due', 'updated_at'
  ];
begin
  if tg_op = 'UPDATE'
     and (to_jsonb(new) - v_derived) = (to_jsonb(old) - v_derived)
  then
    return new;
  end if;

  if tg_op = 'UPDATE'
     and coalesce(current_setting('yipyy.tip_pledge', true), '') = 'on'
     and (to_jsonb(new) - v_derived - 'tip_amount') = (to_jsonb(old) - v_derived - 'tip_amount')
  then
    return new;
  end if;

  -- The presence mirror (private.mirror_presence_to_booking): a status-only
  -- move to one of the three statuses the mirror writes.
  if tg_op = 'UPDATE'
     and coalesce(current_setting('yipyy.presence_sync', true), '') = 'on'
     and new.status in ('checked_in', 'completed', 'confirmed')
     and (to_jsonb(new) - v_derived - 'status') = (to_jsonb(old) - v_derived - 'status')
  then
    return new;
  end if;

  v_client_facility := private.facility_of_client(new.client_id);
  if v_client_facility is null then
    raise exception 'Booking references a client that does not exist.'
      using errcode = '23503';
  end if;
  new.facility_id := v_client_facility;

  if new.location_id is not null
     and not exists (
       select 1
         from public.locations l
        where l.id = new.location_id
          and l.facility_id = new.facility_id
     )
  then
    raise exception 'Location does not belong to this booking''s facility.'
      using errcode = '23514';
  end if;

  if (select auth.jwt()->>'sub') is null then
    return new;
  end if;

  v_is_staff := private.has_permission(
    new.facility_id,
    case when tg_op = 'INSERT' then 'create_bookings' else 'edit_bookings' end
  );

  if v_is_staff then
    return new;
  end if;

  if tg_op = 'INSERT' then
    if coalesce(new.base_price, 0) <> 0 or coalesce(new.total_cost, 0) <> 0 then
      new.details := coalesce(new.details, '{}'::jsonb) || jsonb_build_object(
        'requestedQuote', jsonb_build_object(
          'basePrice', new.base_price,
          'discount',  new.discount,
          'totalCost', new.total_cost,
          'quotedAt',  now()
        )
      );
    end if;

    new.status         := 'request_submitted'::public.booking_status;
    new.base_price     := 0;
    new.discount       := 0;
    new.total_cost     := 0;
    new.tip_amount     := null;

    new.assigned_staff_id   := null;
    new.assigned_staff_name := null;

    return new;
  end if;

  if old.status not in (
       'pending', 'request_submitted', 'estimate_sent', 'waitlisted', 'confirmed'
     )
  then
    raise exception 'This booking can no longer be changed.'
      using errcode = '42501';
  end if;

  if new.status is distinct from old.status
     and new.status <> 'cancelled'::public.booking_status
  then
    raise exception 'You may only cancel this booking.'
      using errcode = '42501';
  end if;

  -- A customer's cancellation: refused once a booking has started, and
  -- recorded with the terms it was made under. Only this block writes
  -- details.cancellation.
  if new.status = 'cancelled'::public.booking_status
     and old.status <> 'cancelled'::public.booking_status
  then
    v_terms := private.cancel_terms(old.facility_id, old.status, old.start_at);
    if (v_terms->>'started')::boolean and not (v_terms->>'withdrawal')::boolean then
      raise exception 'This booking has already started. Ask the facility to cancel it.'
        using errcode = '55000';
    end if;
    new.details := coalesce(new.details, '{}'::jsonb) || jsonb_build_object(
      'cancellation', (v_terms - 'started') || jsonb_build_object(
        'by', 'customer',
        'at', now(),
        'reason', nullif(left(btrim(coalesce(
          current_setting('yipyy.cancel_reason', true), '')), 500), '')));
  elsif old.details ? 'cancellation' then
    new.details := coalesce(new.details, '{}'::jsonb)
      || jsonb_build_object('cancellation', old.details->'cancellation');
  else
    new.details := coalesce(new.details, '{}'::jsonb) - 'cancellation';
  end if;

  new.client_id           := old.client_id;
  new.service             := old.service;
  new.service_type        := old.service_type;
  new.base_price          := old.base_price;
  new.discount            := old.discount;
  new.total_cost          := old.total_cost;
  new.tip_amount          := old.tip_amount;
  new.start_at            := old.start_at;
  new.end_at              := old.end_at;
  new.assigned_staff_id   := old.assigned_staff_id;
  new.assigned_staff_name := old.assigned_staff_name;

  return new;
end;
$function$;

-- What cancelling would mean, asked before the customer confirms.
create or replace function public.my_booking_cancel_terms(p_ref bigint)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_booking public.bookings;
begin
  select * into v_booking
    from public.bookings b
   where b.ref = p_ref
     and b.client_id in (select private.own_client_ids());
  if not found then
    return null;
  end if;
  return private.cancel_terms(v_booking.facility_id, v_booking.status, v_booking.start_at)
    || jsonb_build_object(
         'status', v_booking.status,
         'cancellable',
           v_booking.status in ('pending', 'request_submitted', 'estimate_sent',
                                'waitlisted', 'confirmed')
           and (v_booking.status in ('request_submitted', 'estimate_sent', 'waitlisted')
                or v_booking.start_at > now()));
end;
$$;

-- Cancels the caller's own booking, under their own RLS; the trigger decides
-- whether it may and records the terms. Returns the recorded cancellation.
create or replace function public.cancel_my_booking(p_ref bigint, p_reason text default null)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_id uuid;
  v_cancellation jsonb;
begin
  perform set_config('yipyy.cancel_reason', coalesce(p_reason, ''), true);

  select b.id into v_id
    from public.bookings b
   where b.ref = p_ref
     and b.client_id in (select private.own_client_ids());
  if v_id is null then
    raise exception 'No such booking.' using errcode = 'P0002';
  end if;

  update public.bookings b
     set status = 'cancelled'
   where b.id = v_id
  returning b.details->'cancellation' into v_cancellation;

  perform set_config('yipyy.cancel_reason', '', true);
  return coalesce(v_cancellation, '{}'::jsonb);
end;
$$;

revoke all on function public.my_booking_cancel_terms(bigint) from public;
revoke all on function public.my_booking_cancel_terms(bigint) from anon;
grant execute on function public.my_booking_cancel_terms(bigint) to authenticated, service_role;

revoke all on function public.cancel_my_booking(bigint, text) from public;
revoke all on function public.cancel_my_booking(bigint, text) from anon;
grant execute on function public.cancel_my_booking(bigint, text) to authenticated, service_role;

do $check$
begin
  if has_function_privilege('anon', 'public.cancel_my_booking(bigint,text)', 'execute')
     or has_function_privilege('anon', 'public.my_booking_cancel_terms(bigint)', 'execute') then
    raise exception 'anon can call an owner-cancel function';
  end if;
  if has_function_privilege('authenticated',
       'private.cancel_terms(uuid,public.booking_status,timestamptz)', 'execute') then
    raise exception 'authenticated can call private.cancel_terms';
  end if;
end
$check$;
