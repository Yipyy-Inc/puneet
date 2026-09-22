-- ============================================================================
-- A customer asks the facility to cancel, where the facility said to.
--
-- The client's answer to "instant or approved?" was "it depends upon the
-- service", so `cancellation_policies` carries `customerMayCancel` per
-- service. Phase 3 computed it and showed it. This is the phase that makes it
-- decide something.
--
-- ── THE REFUSAL IS IN THE TRIGGER, NOT IN THE PORTAL ──────────────────────
--
-- `cancel_my_booking` is not SECURITY DEFINER: it updates `bookings` as the
-- caller and `private.enforce_booking_integrity` is what actually decides
-- whether a customer may. That is already where a started booking is refused
-- and where the terms are recorded, and it is the only place a direct
-- PostgREST call cannot go around. A hidden button is not a rule.
--
-- ── AND THE CUSTOMER IS NOT LEFT WITH NOWHERE TO GO ───────────────────────
--
-- Refusing without offering the alternative would be a dead end, so the note
-- rail gains a third kind, `cancel_request`, alongside `note` and
-- `change_dates`. It reaches the desk through the same shared booking note
-- and the same staff notice the other two use.
--
-- Both function bodies below were taken from `pg_get_functiondef` on the live
-- database and changed in exactly one place each — `enforce_booking_integrity`
-- has been re-emitted three times (tip pledge, presence mirror, the tax
-- column, then Phase 3's evaluator swap) and rebuilding it from any migration
-- file would silently revert one of them.
-- ============================================================================

-- The column is the record of what kind of request a note is; the check is
-- what stops a fourth kind arriving by accident.
alter table public.notes drop constraint if exists notes_customer_request_check;
alter table public.notes add constraint notes_customer_request_check
  check (customer_request = any (array['note'::text, 'change_dates'::text, 'cancel_request'::text]));

CREATE OR REPLACE FUNCTION public.add_owner_booking_note(p_ref bigint, p_kind text, p_content text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_booking public.bookings;
  v_name    text;
  v_text    text := btrim(coalesce(p_content, ''));
  v_sub     text := (select auth.jwt()->>'sub');
  v_id      uuid;
begin
  select b.* into v_booking
    from public.bookings b
   where b.ref = p_ref
     and b.client_id in (select private.own_client_ids());
  if not found then
    raise exception 'No such booking.' using errcode = 'P0002';
  end if;

  -- `cancel_request` joined on 2026-09-22. A facility whose cancellation
  -- policy says `customerMayCancel: "request"` for this service cancels it
  -- itself, so the customer asks here instead of cancelling. The note IS the
  -- request: there is no approve/deny surface in the product yet, and half of
  -- one would be worse than a request the desk can read and act on.
  if p_kind is null
     or p_kind not in ('note', 'change_dates', 'cancel_request') then
    raise exception 'A note, a request to change dates, or a request to cancel.'
      using errcode = '22023';
  end if;
  if length(v_text) = 0 or length(v_text) > 1000 then
    raise exception 'Write between 1 and 1000 characters.' using errcode = '22023';
  end if;
  if v_booking.status not in ('pending', 'request_submitted', 'estimate_sent',
                              'waitlisted', 'confirmed', 'checked_in',
                              'in_progress', 'ready') then
    raise exception 'This booking is closed. Contact the facility.'
      using errcode = '55000';
  end if;
  if (select count(*) from public.notes n
       where n.entity_id = v_booking.id
         and n.category = 'booking'
         and n.customer_request is not null
         and n.created_by = v_sub
         and n.created_at > now() - interval '1 day') >= 10 then
    raise exception 'That is ten today. Call the facility instead.'
      using errcode = '54000';
  end if;

  select c.name into v_name from public.clients c where c.id = v_booking.client_id;

  perform set_config('yipyy.owner_note', 'on', true);
  insert into public.notes
    (facility_id, category, entity_id, content, visibility,
     created_by, created_by_name, customer_request)
  values
    (v_booking.facility_id, 'booking', v_booking.id, v_text,
     'shared_with_customer', v_sub, v_name, p_kind)
  returning id into v_id;
  perform set_config('yipyy.owner_note', '', true);

  return v_id;
end;
$function$;

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

    -- Whether tax is charged is not the payer's to decide. The server sets the
    -- real answer when it prices this booking; until then it is taxed, which is
    -- what every booking in the product did before this column existed.
    new.taxable        := true;

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

  if new.status = 'cancelled'::public.booking_status
     and old.status <> 'cancelled'::public.booking_status
  then
    v_terms := private.cancellation_terms(old);
    if (v_terms->>'started')::boolean and not (v_terms->>'withdrawal')::boolean then
      raise exception 'This booking has already started. Ask the facility to cancel it.'
        using errcode = '55000';
    end if;

    -- ── THE FACILITY ASKED TO BE CONSULTED ──────────────────────────────
    --
    -- `customerMayCancel: "request"`, per service, out of the facility's own
    -- cancellation policy. Hiding the button is not enforcement: this row is
    -- reachable through PostgREST by anyone signed in as its owner, so the
    -- refusal lives where the cancel actually happens rather than on a screen.
    --
    -- A WITHDRAWAL IS EXEMPT, deliberately. `withdrawal` means the facility
    -- has not accepted the booking yet, and "ask us first" is about a booking
    -- that was agreed. Making somebody request permission to take back a
    -- request nobody has looked at is a worse product, not a safer one.
    --
    -- A policy that is switched off reaches the flat-rule branch of
    -- `cancellation_terms`, which returns 'instant' as a literal — so a
    -- disabled policy cannot strand a customer here.
    if coalesce(v_terms->>'customerMayCancel', 'instant') = 'request'
       and not (v_terms->>'withdrawal')::boolean
    then
      raise exception 'This facility cancels this service itself. Send them a request instead.'
        using errcode = '42501';
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
  new.taxable             := old.taxable;
  new.start_at            := old.start_at;
  new.end_at              := old.end_at;
  new.assigned_staff_id   := old.assigned_staff_id;
  new.assigned_staff_name := old.assigned_staff_name;

  return new;
end;
$function$;


-- `create or replace` keeps the existing ACL, but a grant that is merely
-- believed to be there is the trap this repo has hit five times. Asserted in
-- supabase/tests/cancellation-request.sql.
revoke all on function public.add_owner_booking_note(bigint, text, text) from public;
revoke all on function public.add_owner_booking_note(bigint, text, text) from anon;
grant execute on function public.add_owner_booking_note(bigint, text, text) to authenticated, service_role;
