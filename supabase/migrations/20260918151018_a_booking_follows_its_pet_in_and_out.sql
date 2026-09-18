-- ============================================================================
-- A booking follows its pet in and out.
--
-- 20260806960000 decided "derive presence, never copy it into status": the
-- attendance records (daycare_attendance, boarding_stays, training_attendance)
-- say where the pet is, and `booking_presence` reads them. Sound — and it left
-- two records that never agreed. A dog checked in on the daycare board stayed
-- "confirmed"; checked out, it stayed "confirmed"; and the booking page, which
-- wrote only the status, left every board saying "expected". Measured on
-- 2026-09-18: 20+ live bookings where the two disagreed. The list, the
-- calendar, the customer portal and the reports all read the status.
--
-- The owner chose one truth (2026-09-18). Presence stays the record of
-- arrival — the routes that write it are where the required forms, the kennel
-- rule and the check-in automations live — and the status now FOLLOWS it:
--
--   arrival             pending | confirmed                   → checked_in
--   departure           pending | confirmed | on site         → completed
--   departure undone    completed                             → checked_in
--   arrival undone      on site | completed                   → confirmed
--
-- Grooming is left as it was: there the STATUS drives the arrival stamps
-- (sync_grooming_lifecycle), and mirroring back would loop. Its revert only
-- ever cleared the check-out, so undoing a groom's check-in left it "arrived";
-- that is fixed below.
--
-- ── WHY THE MIRROR NEEDS ITS OWN PASS ────────────────────────────────────
--
-- The people who check pets in mostly do NOT hold edit_bookings (caretaker,
-- boarding and daycare attendants, groomers, trainers — role_preset_
-- permissions). enforce_booking_integrity treats a non-editor like a
-- customer, who may only cancel, so the mirror's own update would be refused
-- as theirs. It sets a transaction-local flag, `yipyy.presence_sync`, and the
-- integrity trigger honours it for exactly one thing: a status-only change to
-- checked_in, completed or confirmed. The technique is 20260913135000's
-- `yipyy.tip_pledge`. A caller cannot use the flag to do anything else: every
-- other column still has to be unchanged, and the bookings UPDATE policy still
-- decides whether the row is theirs to touch at all (presence-mirror.sql F2).
--
-- ── AND WHAT CANNOT BE CHECKED IN ────────────────────────────────────────
--
-- An arrival on a request, a waitlisted or estimated booking, or a cancelled,
-- declined, no-show or completed one is refused (22023). Mirrored, it would
-- have confirmed a request nobody approved, at the $0 a customer's request is
-- stored at. Undoing a checkout is the way back into a completed booking.
-- Writes with no end user (seeds, service role) are not guarded, the way the
-- integrity trigger does not guard them either.
-- ============================================================================

-- ── 1. the integrity trigger honours the mirror, and nothing else ─────────
create or replace function private.enforce_booking_integrity()
 returns trigger
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  v_client_facility uuid;
  v_is_staff        boolean;
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

-- ── 2. the mirror ─────────────────────────────────────────────────────────
create or replace function private.mirror_presence_to_booking()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_booking uuid := case when tg_op = 'DELETE' then old.booking_id else new.booking_id end;
  v_was_in  boolean := tg_op <> 'INSERT' and old.checked_in_at is not null;
  v_was_out boolean := tg_op <> 'INSERT' and old.checked_out_at is not null;
  v_is_in   boolean := tg_op <> 'DELETE' and new.checked_in_at is not null;
  v_is_out  boolean := tg_op <> 'DELETE' and new.checked_out_at is not null;
  v_status  public.booking_status;
  v_target  public.booking_status;
begin
  if v_was_in = v_is_in and v_was_out = v_is_out then
    return null;
  end if;

  select status into v_status from public.bookings where id = v_booking for update;
  if not found then
    return null;
  end if;

  if v_is_out and not v_was_out then
    if v_status in ('pending', 'confirmed', 'checked_in', 'in_progress', 'ready') then
      v_target := 'completed';
    end if;
  elsif v_was_out and not v_is_out and v_is_in then
    if v_status = 'completed' then
      v_target := 'checked_in';
    end if;
  elsif v_is_in and not v_was_in then
    if v_status in ('pending', 'confirmed') then
      v_target := 'checked_in';
    end if;
  elsif v_was_in and not v_is_in then
    if v_status in ('checked_in', 'in_progress', 'ready', 'completed') then
      v_target := 'confirmed';
    end if;
  end if;

  if v_target is null or v_target = v_status then
    return null;
  end if;

  perform set_config('yipyy.presence_sync', 'on', true);
  update public.bookings set status = v_target where id = v_booking;
  perform set_config('yipyy.presence_sync', '', true);
  return null;
end;
$$;

create trigger daycare_attendance_mirrors_booking
  after insert or update of checked_in_at, checked_out_at or delete
  on public.daycare_attendance
  for each row execute function private.mirror_presence_to_booking();

create trigger boarding_stays_mirror_booking
  after insert or update of checked_in_at, checked_out_at or delete
  on public.boarding_stays
  for each row execute function private.mirror_presence_to_booking();

create trigger training_attendance_mirrors_booking
  after insert or update of checked_in_at, checked_out_at or delete
  on public.training_attendance
  for each row execute function private.mirror_presence_to_booking();

-- ── 3. what cannot be checked in ──────────────────────────────────────────
create or replace function private.arrival_needs_a_live_booking()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_status public.booking_status;
begin
  if new.checked_in_at is null then
    return new;
  end if;
  if tg_op = 'UPDATE' and old.checked_in_at is not null then
    return new;
  end if;
  if (select auth.jwt()->>'sub') is null then
    return new;
  end if;

  select status into v_status from public.bookings where id = new.booking_id;
  if v_status in (
       'request_submitted', 'waitlisted', 'estimate_sent',
       'declined', 'cancelled', 'no_show', 'completed'
     )
  then
    raise exception 'This booking cannot be checked in while it is %.',
      replace(v_status::text, '_', ' ')
      using errcode = '22023', hint = 'booking_not_arrivable';
  end if;
  return new;
end;
$$;

create trigger daycare_attendance_needs_a_live_booking
  before insert or update of checked_in_at on public.daycare_attendance
  for each row execute function private.arrival_needs_a_live_booking();

create trigger boarding_stays_need_a_live_booking
  before insert or update of checked_in_at on public.boarding_stays
  for each row execute function private.arrival_needs_a_live_booking();

create trigger training_attendance_needs_a_live_booking
  before insert or update of checked_in_at on public.training_attendance
  for each row execute function private.arrival_needs_a_live_booking();

-- ── 4. grooming: undoing a check-in clears the arrival too ────────────────
create or replace function private.sync_grooming_lifecycle()
 returns trigger
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  v_apt      public.grooming_appointments;
  v_add_mins integer;
begin
  select * into v_apt from public.grooming_appointments where booking_id = new.id;
  if v_apt.booking_id is null then
    return null;
  end if;

  if new.status is not distinct from old.status then
    return null;
  end if;

  if new.status in ('in_progress', 'ready')
     and v_apt.check_in_at is null
     and new.status is distinct from old.status
     and old.status not in ('in_progress', 'ready')
  then
    raise exception 'This pet has not been checked in yet.' using errcode = '42501';
  end if;

  if new.status = 'checked_in' and v_apt.check_in_at is null then
    select coalesce(sum(duration_min), 0) into v_add_mins
      from public.grooming_appointment_add_ons where booking_id = new.id;

    update public.grooming_appointments
       set check_in_at = now(),
           estimated_ready_at =
             now() + make_interval(mins => v_apt.service_duration_min + v_add_mins)
     where booking_id = new.id;

  elsif new.status = 'completed' and v_apt.check_out_at is null then
    update public.grooming_appointments set check_out_at = now() where booking_id = new.id;

  elsif new.status in ('confirmed', 'pending')
        and (v_apt.check_in_at is not null or v_apt.check_out_at is not null) then
    -- Back to before arrival: the pet is not here, so it has no arrival, no
    -- ready time and no collection. It only ever cleared the collection.
    update public.grooming_appointments
       set check_in_at = null, estimated_ready_at = null, check_out_at = null
     where booking_id = new.id;

  elsif new.status in ('checked_in', 'in_progress')
        and v_apt.check_out_at is not null then
    update public.grooming_appointments set check_out_at = null where booking_id = new.id;
  end if;

  return null;
end;
$function$;

-- ── grants ────────────────────────────────────────────────────────────────
revoke all on function private.mirror_presence_to_booking() from public;
revoke all on function private.mirror_presence_to_booking() from anon;
revoke all on function private.mirror_presence_to_booking() from authenticated;
revoke all on function private.arrival_needs_a_live_booking() from public;
revoke all on function private.arrival_needs_a_live_booking() from anon;
revoke all on function private.arrival_needs_a_live_booking() from authenticated;

do $check$
begin
  if has_function_privilege('anon', 'private.mirror_presence_to_booking()', 'execute')
     or has_function_privilege('authenticated', 'private.mirror_presence_to_booking()', 'execute')
     or has_function_privilege('anon', 'private.arrival_needs_a_live_booking()', 'execute')
     or has_function_privilege('authenticated', 'private.arrival_needs_a_live_booking()', 'execute')
  then
    raise exception 'a presence-mirror function is callable by anon or authenticated';
  end if;
end
$check$;
