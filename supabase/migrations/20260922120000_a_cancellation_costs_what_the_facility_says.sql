-- ============================================================================
-- What a cancellation costs, decided in one place.
--
-- ── THE FOUR SHAPES, AND WHY THIS REPLACES THEM ───────────────────────────
--
-- `booking_rules.cancelPolicyHours` + `cancelFeePercentage` were real, stored,
-- shown to customers, and applied by NOTHING. `deposit_rules.refundPolicy` was
-- a second and conflicting notice window. Custom services carried a third
-- shape through a `.passthrough()` that nothing read, and `BookingEngineConfig`
-- a fourth that only a fixture ever saw.
--
-- `cancellation_policies` (2026-09-22) replaced them in the editor. This makes
-- the database read it.
--
-- ── A NEW FUNCTION, TAKING THE WHOLE ROW ──────────────────────────────────
--
-- `private.cancel_terms(facility, status, start_at)` could not do this job: the
-- new domain is PER SERVICE and those three arguments do not say which service
-- a booking is. Adding a fourth would have created an OVERLOAD — the trigger
-- would have gone on calling the three-argument body for ever, silently, which
-- is the failure this whole round of work keeps finding.
--
-- So the evaluator takes `public.bookings` itself. It has the service, the
-- totals and what has actually been paid, and the name is new, so no overload
-- is possible. `cancel_terms` is dropped at the foot of this file rather than
-- left behind: a second body that still parses is a second body that will be
-- called by something, eventually.
--
-- ── THE RESOLUTION RULE, WHICH EXISTS TWICE AND MUST NOT DIVERGE ──────────
--
-- `resolveTier` in `src/lib/settings/cancellation.ts` picks a tier for the
-- EDITOR's words; this picks one for the MONEY. Two implementations of one
-- rule is exactly the time-fee bug that opened this round, so the rule is
-- stated identically in both and asserted in both:
--
--   walk the tiers, take the greatest `minNoticeHours` that is <= the notice
--   actually given. The boundary is >=, so exactly 72.0 hours' notice gets the
--   72h tier — the cheaper side. A tier at 0 is the last-minute catch-all.
--   With NO tier at 0 and a customer inside every window, NOTHING applies: the
--   nearest tier is never borrowed, because a facility that wrote three tiers
--   starting at 24 hours did not write a rule for two hours' notice.
--
-- ── IT RETURNS A SUPERSET, SO NOTHING BREAKS ──────────────────────────────
--
-- `withdrawal`, `started`, `late`, `noticeHours` and `feePercentage` are all
-- still there and still mean what they meant. The trigger stores this object
-- as `details.cancellation`, and the customer's screen reads those keys today.
-- The new keys sit alongside.
-- ============================================================================

-- ── WHAT A DEPOSIT WAS, WHEN NOTHING RECORDS IT ───────────────────────────
--
-- `keep_deposit` needs the deposit, and there is no deposit column on
-- `bookings` — measured 2026-09-22, `details.depositRequired` exists on ONE
-- booking out of more than two thousand. So the amount is derived from the
-- facility's own deposit rules, the same ones the booking flow quotes from.
--
-- Two clamps, and both matter: never more than the rule asks for, and never
-- more than the customer actually handed over. A facility that takes no
-- deposit keeps nothing, which is the honest answer rather than a surprise.
create or replace function private.deposit_for_booking(b public.bookings)
returns numeric
language plpgsql
stable
security definer
set search_path to ''
as $deposit$
declare
  v_rules jsonb;
  v_rule  jsonb;
  v_total numeric := coalesce(b.total_cost, 0);
  v_amt   numeric;
begin
  select s.value into v_rules
    from public.facility_settings s
   where s.facility_id = b.facility_id
     and s.domain = 'deposit_rules';

  if v_rules is null or jsonb_typeof(v_rules->'rules') <> 'array' then
    return 0;
  end if;

  -- A rule naming this service wins over a by-value one: it is the more
  -- specific statement the facility made.
  for v_rule in
    select value
      from jsonb_array_elements(v_rules->'rules')
     where coalesce((value->>'enabled')::boolean, false)
     order by case when value->>'scope' = 'service' then 0 else 1 end
  loop
    if v_rule->>'scope' = 'service'
       and v_rule->>'serviceType' is distinct from b.service then
      continue;
    end if;

    if v_rule->>'scope' = 'booking_value' then
      if coalesce((v_rule->>'minBookingValue')::numeric, 0) > v_total then
        continue;
      end if;
    end if;

    if coalesce(v_rule->>'amount', '') !~ '^\d+(\.\d+)?$' then
      continue;
    end if;
    v_amt := (v_rule->>'amount')::numeric;

    if v_rule->>'amountType' = 'percentage' then
      return round(v_total * greatest(0, v_amt) / 100.0, 2);
    end if;
    return round(greatest(0, v_amt), 2);
  end loop;

  return 0;
end;
$deposit$;

comment on function private.deposit_for_booking(public.bookings) is
  'What this booking''s deposit should have been, from the facility''s deposit rules. There is no deposit column to read.';

create or replace function private.cancellation_terms(b public.bookings)
returns jsonb
language plpgsql
stable
security definer
set search_path to ''
as $terms$
declare
  v_withdrawal boolean := b.status in
    ('request_submitted', 'estimate_sent', 'waitlisted');
  v_started    boolean := b.start_at <= now();
  -- Fractional on purpose. The old rule used `make_interval(hours => x::int)`,
  -- which TRUNCATES — a 1.5-hour window behaved as 1. Nothing inherits that.
  v_notice     numeric := greatest(
                 0, extract(epoch from (b.start_at - now())) / 3600.0);

  v_policies jsonb;
  v_service  jsonb;
  v_tier     jsonb;
  v_each     jsonb;
  v_best     numeric;
  v_min      numeric;

  v_charge   jsonb;
  v_kind     text;
  v_value    numeric;
  v_amount   numeric := 0;
  v_refund   text;
  v_may      text;

  v_total    numeric := coalesce(b.total_cost, 0);
  v_paid     numeric := coalesce(b.amount_paid, 0);

  v_rules    jsonb;
  v_hours    numeric;
  v_fee      numeric;
  v_late     boolean := false;
begin
  select s.value into v_policies
    from public.facility_settings s
   where s.facility_id = b.facility_id
     and s.domain = 'cancellation_policies';

  v_service := v_policies -> 'services' -> b.service;
  v_may := coalesce(v_service->>'customerMayCancel', 'instant');

  if v_service is not null
     and coalesce((v_service->>'enabled')::boolean, false)
     and jsonb_typeof(v_service->'tiers') = 'array'
     and jsonb_array_length(v_service->'tiers') > 0
  then
    for v_each in select value from jsonb_array_elements(v_service->'tiers')
    loop
      if coalesce(v_each->>'minNoticeHours', '0') ~ '^\d+(\.\d+)?$' then
        v_min := (v_each->>'minNoticeHours')::numeric;
      else
        v_min := 0;
      end if;
      if v_min <= v_notice and (v_best is null or v_min > v_best) then
        v_best := v_min;
        v_tier := v_each;
      end if;
    end loop;

    if v_tier is null then
      -- Inside every window, with no catch-all. Charging the nearest tier
      -- would invent a rule the facility did not write.
      return jsonb_build_object(
        'withdrawal', v_withdrawal,
        'started', v_started,
        'late', false,
        'noticeHours', null,
        'noticeGivenHours', round(v_notice, 2),
        'feePercentage', null,
        'source', 'policy',
        'tierId', null,
        'tierLabel', null,
        'charge', 'none',
        'amount', 0,
        'refund', 'original',
        'forfeitsPass', false,
        'customerMayCancel', v_may);
    end if;

    v_charge := coalesce(v_tier->'charge', jsonb_build_object('kind', 'none'));
    v_kind   := coalesce(v_charge->>'kind', 'none');
    v_refund := coalesce(v_tier->>'refund', 'original');
    if coalesce(v_charge->>'value', '') ~ '^\d+(\.\d+)?$' then
      v_value := (v_charge->>'value')::numeric;
    else
      v_value := 0;
    end if;

    if v_kind = 'percentage' then
      v_amount := round(v_total * greatest(0, v_value) / 100.0, 2);
    elsif v_kind = 'flat' then
      v_amount := round(greatest(0, v_value), 2);
    elsif v_kind = 'keep_deposit' then
      -- Never more than the rule asked for, never more than they paid.
      v_amount := round(least(private.deposit_for_booking(b), v_paid), 2);
    else
      -- 'none', and 'forfeit_pass' — a pass is not money.
      v_amount := 0;
    end if;

    -- A cancellation fee is never larger than the booking it is for.
    v_amount := greatest(0, least(v_amount, v_total));

    return jsonb_build_object(
      'withdrawal', v_withdrawal,
      'started', v_started,
      -- `late` means "something is owed", which is what every reader of this
      -- key already does with it.
      'late', v_amount > 0 or v_kind = 'forfeit_pass',
      -- `noticeHours` is the RULE'S THRESHOLD, which is what it has always
      -- meant — the old function returned the configured window here, not the
      -- notice given. Under a policy the threshold is the winning tier's.
      -- How much notice the customer actually managed is its own key, because
      -- one field carrying two meanings is the bug this codebase keeps finding.
      'noticeHours', v_best,
      'noticeGivenHours', round(v_notice, 2),
      -- Kept for the screens that still read a percentage; null unless the
      -- facility actually expressed one.
      'feePercentage', case when v_kind = 'percentage' then v_value end,
      'source', 'policy',
      'tierId', v_tier->>'id',
      'tierLabel', v_tier->>'label',
      'charge', v_kind,
      'amount', v_amount,
      'refund', v_refund,
      'forfeitsPass', v_kind = 'forfeit_pass',
      'customerMayCancel', v_may);
  end if;

  -- ── NO POLICY: THE FLAT RULE, EXACTLY AS IT BEHAVED BEFORE ──────────────
  --
  -- Lifted from `private.cancel_terms` unchanged, including the truncating
  -- `make_interval`. A facility that has not written a policy must see no
  -- change at all on the deploy that makes policies possible.
  select s.value into v_rules
    from public.facility_settings s
   where s.facility_id = b.facility_id
     and s.domain = 'booking_rules';

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
            and b.start_at - now() < make_interval(hours => v_hours::int);

  return jsonb_build_object(
    'withdrawal', v_withdrawal,
    'started', v_started,
    'late', v_late,
    'noticeHours', v_hours,
    'noticeGivenHours', round(v_notice, 2),
    'feePercentage', case when v_late and coalesce(v_fee, 0) > 0 then v_fee end,
    'source', case when v_rules is null then 'none' else 'booking_rules' end,
    'tierId', null,
    'tierLabel', null,
    'charge', case when v_late and coalesce(v_fee, 0) > 0
                   then 'percentage' else 'none' end,
    -- The old rule never produced a figure. It does now, from the same
    -- percentage it has always shown the customer.
    'amount', case when v_late and coalesce(v_fee, 0) > 0
                   then greatest(0, least(round(v_total * v_fee / 100.0, 2), v_total))
                   else 0 end,
    'refund', 'original',
    'forfeitsPass', false,
    'customerMayCancel', 'instant');
end;
$terms$;

comment on function private.cancellation_terms(public.bookings) is
  'The ONE evaluator: a cancellation policy plus a booking, as a dollar figure. Falls back to booking_rules when the facility has written no policy.';

-- ── THE TWO CALLERS, REPOINTED ────────────────────────────────────────────
--
-- Rebuilt from `pg_get_functiondef` as it stands on 2026-09-22, NOT from a
-- migration file. `enforce_booking_integrity` has been re-emitted three times
-- now — the tip pledge, the presence mirror and the taxable column — and an
-- older copy would silently revert whichever it predates.

create or replace function public.my_booking_cancel_terms(p_ref bigint)
returns jsonb
language plpgsql
stable
security definer
set search_path to ''
as $mine$
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
  return private.cancellation_terms(v_booking)
    || jsonb_build_object(
         'status', v_booking.status,
         'cancellable',
           v_booking.status in ('pending', 'request_submitted', 'estimate_sent',
                                'waitlisted', 'confirmed')
           and (v_booking.status in ('request_submitted', 'estimate_sent', 'waitlisted')
                or v_booking.start_at > now()));
end;
$mine$;

-- Rebuilt from the LIVE body. Exactly one line differs from what was running
-- before this migration: the call to `private.cancel_terms(...)` becomes
-- `private.cancellation_terms(old)`. Everything else — the tip-pledge escape,
-- the presence mirror, the taxable column, the staff early return — is here
-- because it is here in production, not because a migration file said so.
create or replace function private.enforce_booking_integrity()
returns trigger
language plpgsql
security definer
set search_path to ''
as $integrity$
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
$integrity$;

-- ── AND THE OLD EVALUATOR GOES ────────────────────────────────────────────
--
-- Both callers now read `cancellation_terms`. Leaving `cancel_terms` behind
-- would leave a body that still parses, still compiles, and still answers the
-- old way — which is precisely how the till and the quote ended up disagreeing
-- about a late fee for months.
drop function if exists private.cancel_terms(uuid, public.booking_status, timestamptz);

-- The customer's own screen has to be able to read what a cancellation costs.
-- Rebuilt from the LIVE body — 29 domains on 2026-09-22, where the plan said
-- 31, which is the whole reason this is read from the database and not from
-- the plan. `cancellation_policies` is the only addition.
create or replace function private.customer_visible_setting_domains()
returns text[]
language sql
immutable
set search_path to ''
as $domains$
  select array[
    'business_hours',
    'booking_rules',
    'tip_config',
    'booking_flow',
    'daycare_config',
    'boarding_config',
    'grooming_config',
    'training_config',
    'tax_config',
    'loyalty_config',
    'yipyy_go_config',
    'mobile_app_config',
    'training_module_settings',
    'training_pathways',
    'training_disciplines',
    'pricing_rules',
    'deposit_rules',
    'cancellation_policies',
    'service_addons',
    'care_fees',
    'booking_approval',
    'evaluation_config',
    'daycare_rates',
    'service_date_blocks',
    'schedule_time_overrides',
    'drop_off_pick_up_overrides',
    'grooming_scheduling',
    'training_programs',
    'training_course_types',
    'vaccination_rules'
  ];
$domains$;

-- ── NOBODY CALLS THE EVALUATOR BUT THE DATABASE ─────────────────────────
--
-- A function is EXECUTABLE BY PUBLIC the moment it is created, so a new one
-- is open until it is closed. These are SECURITY DEFINER and take a booking
-- row, so left open a caller could hand them a row they invented and read a
-- policy or a deposit rule for any facility.
--
-- Three statements, not one: `public`, `anon` and `authenticated` are
-- DIFFERENT grants, and revoking one leaves the others (AGENTS.md, and the
-- migration 20260822610000 that exists because the first attempt named only
-- one of them). Asserted afterwards in supabase/tests/owner-cancel.sql,
-- because a revoke naming a privilege the role does not hold succeeds
-- silently and looks identical to one that worked.
revoke all on function private.cancellation_terms(public.bookings) from public;
revoke all on function private.cancellation_terms(public.bookings) from anon;
revoke all on function private.cancellation_terms(public.bookings) from authenticated;

revoke all on function private.deposit_for_booking(public.bookings) from public;
revoke all on function private.deposit_for_booking(public.bookings) from anon;
revoke all on function private.deposit_for_booking(public.bookings) from authenticated;
