-- ============================================================================
-- What a pre-arrival form adds to the bill (see the migration
-- what_the_form_adds_to_the_bill): add-ons, the medication fee and the tip.
--
--   bun run test:sql yipyy-go-charges
--
-- One transaction, rolled back. Fixture emails are @example.invalid.
--
-- ── WHAT THIS FILE IS ABOUT ────────────────────────────────────────────────
--
-- C1  An add-on is priced from the catalogue, whatever the request says.
-- C2  The catalogue's maximum caps the quantity; per-day pricing counts the
--     nights; a percentage add-on is a share of the booking.
-- C3  An inactive, size-priced, other-service or unknown add-on is refused.
-- C4  The medication fee counts doses; as-needed medication and "no
--     medications" add nothing.
-- C5  Sending the same form again leaves the bill as it was.
-- C6  A line staff removed is not put back.
-- C7  An add-on charged per booking, asked for on two dogs, is one line.
-- C8  When the facility approves add-ons, they reach the bill on approval.
-- C9  A pledged tip lands despite the booking trigger, and an owner still
--     cannot write the tip directly.
-- C10 A custom tip larger than the booking is refused; a percentage preset is
--     a share of what is due.
-- C11 A grooming booking offers grooming's own add-ons.
-- C12 Only the server lists the staff to email, and only owners and admins.
-- C13 The owner is offered exactly the add-ons that could be charged; a
--     stranger is refused.
-- ============================================================================

begin;

set local client_min_messages to warning;

create temp table tap (n serial, name text, ok boolean, detail text);
grant all on tap to authenticated;

create or replace function pg_temp.t(p_name text, p_ok boolean, p_detail text default '')
returns void language sql as $$
  insert into tap(name, ok, detail) values (p_name, p_ok, p_detail);
$$;

create or replace function pg_temp.as_user(p_sub text)
returns void language sql as $$
  select set_config('request.jwt.claims',
    json_build_object('sub', p_sub, 'role', 'authenticated')::text, true);
$$;

create or replace function pg_temp.as_nobody()
returns void language sql as $$
  select set_config('request.jwt.claims', '', true);
$$;

create or replace function pg_temp.line(p_booking uuid, p_like text)
returns table (unit_price numeric, quantity integer, lines integer)
language sql as $$
  select max(l.unit_price), max(l.quantity), count(*)::int
    from public.booking_line_items l
   where l.booking_id = p_booking and l.source_id like p_like;
$$;

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000001f6001', 'ygc-owner@example.invalid'),
  ('00000000-0000-0000-0000-0000001f6003', 'ygc-client@example.invalid'),
  ('00000000-0000-0000-0000-0000001f6004', 'ygc-limited@example.invalid'),
  ('00000000-0000-0000-0000-0000001f6005', 'ygc-stranger@example.invalid')
on conflict (id) do nothing;

insert into public.profiles (id, email, full_name) values
  ('00000000-0000-0000-0000-0000001f6001', 'ygc-owner@example.invalid', 'Owner'),
  ('00000000-0000-0000-0000-0000001f6003', 'ygc-client@example.invalid', 'Client'),
  ('00000000-0000-0000-0000-0000001f6004', 'ygc-limited@example.invalid', 'Limited'),
  ('00000000-0000-0000-0000-0000001f6005', 'ygc-stranger@example.invalid', 'Stranger')
on conflict (id) do update set full_name = excluded.full_name;

insert into public.orgs (id, name, slug) values
  ('00000000-0000-0000-0000-0000001f6010', 'YGC Org', 'ygc-org')
on conflict do nothing;

insert into public.facilities (id, org_id, name, slug, legacy_id) values
  ('00000000-0000-0000-0000-0000001f6020', '00000000-0000-0000-0000-0000001f6010',
   'Kennel', 'ygc-a', 'ygc-a')
on conflict do nothing;

insert into public.facility_memberships (id, facility_id, profile_id, role, is_active) values
  ('00000000-0000-0000-0000-0000001f6030', '00000000-0000-0000-0000-0000001f6020',
   '00000000-0000-0000-0000-0000001f6001', 'owner', true),
  ('00000000-0000-0000-0000-0000001f6032', '00000000-0000-0000-0000-0000001f6020',
   '00000000-0000-0000-0000-0000001f6004', 'sanitation', true)
on conflict (id) do nothing;

insert into public.clients (id, facility_id, name, email, profile_id) values
  ('00000000-0000-0000-0000-0000001f6040', '00000000-0000-0000-0000-0000001f6020',
   'Guest One', 'ygc-c1@example.invalid', '00000000-0000-0000-0000-0000001f6003'),
  ('00000000-0000-0000-0000-0000001f6041', '00000000-0000-0000-0000-0000001f6020',
   'Guest Two', 'ygc-c2@example.invalid', '00000000-0000-0000-0000-0000001f6005');

insert into public.pets (id, client_id, name, species) values
  ('00000000-0000-0000-0000-0000001f6050', '00000000-0000-0000-0000-0000001f6040', 'Rex', 'dog'),
  ('00000000-0000-0000-0000-0000001f6051', '00000000-0000-0000-0000-0000001f6040', 'Milo', 'dog');

insert into public.facility_settings (facility_id, domain, value) values
  ('00000000-0000-0000-0000-0000001f6020', 'yipyy_go_config', jsonb_build_object(
     'enabled', true,
     'serviceConfigs', jsonb_build_array(
       jsonb_build_object('serviceType', 'daycare', 'enabled', true, 'requirement', 'mandatory'),
       jsonb_build_object('serviceType', 'boarding', 'enabled', true, 'requirement', 'optional'),
       jsonb_build_object('serviceType', 'grooming', 'enabled', true, 'requirement', 'optional')
     ),
     'timing', jsonb_build_object('initialSendTime', 72, 'deadline', 24,
                                  'reminderRules', '[]'::jsonb, 'deliveryChannels', '[]'::jsonb),
     'addOnsApproval', 'auto',
     'notifyStaffEmailOnSubmit', true,
     'medicationFee', jsonb_build_object('enabled', true, 'amount', 5, 'billing', 'per_dose', 'label', 'Medication'),
     'tipPopup', jsonb_build_object(
       'enabled', true, 'title', 'Tip', 'message', '', 'appliesTo', 'stay_total',
       'allowCustomAmount', true, 'allowSkip', true,
       'presets', jsonb_build_array(
         jsonb_build_object('id', 'p15', 'label', '15%', 'type', 'percentage', 'value', 15),
         jsonb_build_object('id', 'f5', 'label', '$5', 'type', 'fixed', 'value', 5)
       ))
   )),
  ('00000000-0000-0000-0000-0000001f6020', 'service_addons', jsonb_build_object(
     'categories', '[]'::jsonb,
     'addOns', jsonb_build_array(
       jsonb_build_object('id', 'walk', 'name', 'Walk', 'description', '', 'pricingType', 'per_item',
         'price', 10, 'maxQuantity', 3, 'petScope', 'per_pet', 'isActive', true, 'requiresScheduling', false,
         'applicableServices', jsonb_build_array('daycare', 'boarding'), 'locationIds', '[]'::jsonb,
         'generatesTask', false, 'sortOrder', 1),
       jsonb_build_object('id', 'bag', 'name', 'Treat bag', 'description', '', 'pricingType', 'flat',
         'price', 4, 'petScope', 'per_booking', 'isActive', true, 'requiresScheduling', false,
         'applicableServices', jsonb_build_array('daycare'), 'generatesTask', false, 'sortOrder', 2),
       jsonb_build_object('id', 'nightly', 'name', 'Nightly treat', 'description', '', 'pricingType', 'per_day',
         'price', 2, 'petScope', 'per_pet', 'isActive', true, 'requiresScheduling', false,
         'applicableServices', jsonb_build_array('boarding'), 'generatesTask', false, 'sortOrder', 3),
       jsonb_build_object('id', 'pool', 'name', 'Pool', 'description', '', 'pricingType', 'per_item',
         'price', 8, 'petScope', 'per_pet', 'isActive', false, 'requiresScheduling', false,
         'applicableServices', jsonb_build_array('daycare'), 'generatesTask', false, 'sortOrder', 4),
       jsonb_build_object('id', 'spa', 'name', 'Spa', 'description', '', 'pricingType', 'flat',
         'price', 20, 'petScope', 'per_pet', 'isActive', true, 'requiresScheduling', false,
         'applicableServices', jsonb_build_array('daycare'), 'generatesTask', false, 'sortOrder', 5,
         'sizePricing', jsonb_build_array(jsonb_build_object('size', 'large', 'priceModifier', 5, 'modifierType', 'flat'))),
       jsonb_build_object('id', 'premium', 'name', 'Premium', 'description', '', 'pricingType', 'percentage_of_booking',
         'price', 10, 'petScope', 'per_booking', 'isActive', true, 'requiresScheduling', false,
         'applicableServices', jsonb_build_array('daycare'), 'generatesTask', false, 'sortOrder', 6)
     )
   ))
on conflict (facility_id, domain) do update set value = excluded.value;

insert into public.grooming_add_ons (id, facility_id, name, description, price, is_active, display_order) values
  ('00000000-0000-0000-0000-0000001f60a0', '00000000-0000-0000-0000-0000001f6020', 'Nail polish', '', 12, true, 1),
  ('00000000-0000-0000-0000-0000001f60a1', '00000000-0000-0000-0000-0000001f6020', 'Teeth', '', 9, false, 2);

-- Times fixed at 14:00 UTC (10:00 in Toronto) so a day never straddles midnight.
insert into public.bookings
  (id, facility_id, client_id, service, service_type, status, start_at, end_at, base_price, total_cost)
values
  -- D1: daycare, one day, two dogs, $40.
  ('00000000-0000-0000-0000-0000001f6090', '00000000-0000-0000-0000-0000001f6020',
   '00000000-0000-0000-0000-0000001f6040', 'daycare', 'Full day', 'confirmed',
   date_trunc('day', now() + interval '3 days') + interval '14 hours',
   date_trunc('day', now() + interval '3 days') + interval '22 hours', 40, 40),
  -- BR: boarding, three nights, $150.
  ('00000000-0000-0000-0000-0000001f6091', '00000000-0000-0000-0000-0000001f6020',
   '00000000-0000-0000-0000-0000001f6040', 'boarding', 'Standard', 'confirmed',
   date_trunc('day', now() + interval '3 days') + interval '14 hours',
   date_trunc('day', now() + interval '6 days') + interval '14 hours', 150, 150),
  -- GR: grooming, $60.
  ('00000000-0000-0000-0000-0000001f6092', '00000000-0000-0000-0000-0000001f6020',
   '00000000-0000-0000-0000-0000001f6040', 'grooming', 'Bath', 'confirmed',
   date_trunc('day', now() + interval '3 days') + interval '14 hours',
   date_trunc('day', now() + interval '3 days') + interval '15 hours', 60, 60),
  -- D2: another daycare day, $40, for staff approval.
  ('00000000-0000-0000-0000-0000001f6093', '00000000-0000-0000-0000-0000001f6020',
   '00000000-0000-0000-0000-0000001f6040', 'daycare', 'Full day', 'confirmed',
   date_trunc('day', now() + interval '4 days') + interval '14 hours',
   date_trunc('day', now() + interval '4 days') + interval '22 hours', 40, 40);

insert into public.booking_pets (booking_id, pet_id) values
  ('00000000-0000-0000-0000-0000001f6090', '00000000-0000-0000-0000-0000001f6050'),
  ('00000000-0000-0000-0000-0000001f6090', '00000000-0000-0000-0000-0000001f6051'),
  ('00000000-0000-0000-0000-0000001f6091', '00000000-0000-0000-0000-0000001f6050'),
  ('00000000-0000-0000-0000-0000001f6092', '00000000-0000-0000-0000-0000001f6050'),
  ('00000000-0000-0000-0000-0000001f6093', '00000000-0000-0000-0000-0000001f6050');

-- ── C1  the catalogue sets the price ────────────────────────────────────────
do $$
declare v_line record; v_extras numeric;
begin
  perform pg_temp.as_user('00000000-0000-0000-0000-0000001f6003');
  set local role authenticated;
  perform public.submit_yipyy_go_form(
    '00000000-0000-0000-0000-0000001f6090', '00000000-0000-0000-0000-0000001f6050',
    '{"noMedications": true}'::jsonb,
    '[{"addOnId": "walk", "quantity": 2, "price": 0.01, "unitPrice": 0.01}]'::jsonb);
  reset role;
  perform pg_temp.as_nobody();
  select * into v_line from pg_temp.line('00000000-0000-0000-0000-0000001f6090', 'yipyy-go:addon:%:walk');
  select extras_total into v_extras from public.bookings where id = '00000000-0000-0000-0000-0000001f6090';
  perform pg_temp.t('C1  a walk is $10 each on the bill, not the price the request sent',
    v_line.lines = 1 and v_line.unit_price = 10 and v_line.quantity = 2 and v_extras = 20,
    format('lines=%s unit=%s qty=%s extras=%s', v_line.lines, v_line.unit_price, v_line.quantity, v_extras));
exception when others then
  reset role; perform pg_temp.t('C1  catalogue price', false, sqlerrm);
end $$;

-- ── C2  cap, nights, percentage ─────────────────────────────────────────────
do $$
declare v_walk record; v_premium record; v_nightly record;
begin
  perform pg_temp.as_user('00000000-0000-0000-0000-0000001f6003');
  set local role authenticated;
  perform public.submit_yipyy_go_form(
    '00000000-0000-0000-0000-0000001f6090', '00000000-0000-0000-0000-0000001f6050',
    '{"noMedications": true}'::jsonb,
    '[{"addOnId": "walk", "quantity": 9}, {"addOnId": "premium"}]'::jsonb);
  perform public.submit_yipyy_go_form(
    '00000000-0000-0000-0000-0000001f6091', '00000000-0000-0000-0000-0000001f6050',
    '{"noMedications": true}'::jsonb,
    '[{"addOnId": "nightly", "quantity": 1}]'::jsonb);
  reset role;
  perform pg_temp.as_nobody();
  select * into v_walk from pg_temp.line('00000000-0000-0000-0000-0000001f6090', 'yipyy-go:addon:%:walk');
  select * into v_premium from pg_temp.line('00000000-0000-0000-0000-0000001f6090', 'yipyy-go:addon:%:premium');
  select * into v_nightly from pg_temp.line('00000000-0000-0000-0000-0000001f6091', 'yipyy-go:addon:%:nightly');
  perform pg_temp.t('C2  walks cap at 3; nightly treats count 3 nights; premium is 10% of $40',
    v_walk.quantity = 3 and v_walk.lines = 1
      and v_nightly.unit_price = 2 and v_nightly.quantity = 3
      and v_premium.unit_price = 4 and v_premium.quantity = 1,
    format('walk qty=%s; nightly %s x %s; premium %s x %s',
      v_walk.quantity, v_nightly.unit_price, v_nightly.quantity, v_premium.unit_price, v_premium.quantity));
exception when others then
  reset role; perform pg_temp.t('C2  pricing types', false, sqlerrm);
end $$;

-- ── C3  what is not offered is refused ──────────────────────────────────────
do $$
declare
  v_inactive boolean := false; v_sized boolean := false;
  v_other_service boolean := false; v_unknown boolean := false;
begin
  perform pg_temp.as_user('00000000-0000-0000-0000-0000001f6003');
  set local role authenticated;
  begin
    perform public.submit_yipyy_go_form('00000000-0000-0000-0000-0000001f6090', '00000000-0000-0000-0000-0000001f6051',
      '{}'::jsonb, '[{"addOnId": "pool"}]'::jsonb);
  exception when invalid_parameter_value then v_inactive := true;
  end;
  begin
    perform public.submit_yipyy_go_form('00000000-0000-0000-0000-0000001f6090', '00000000-0000-0000-0000-0000001f6051',
      '{}'::jsonb, '[{"addOnId": "spa"}]'::jsonb);
  exception when invalid_parameter_value then v_sized := true;
  end;
  begin
    perform public.submit_yipyy_go_form('00000000-0000-0000-0000-0000001f6090', '00000000-0000-0000-0000-0000001f6051',
      '{}'::jsonb, '[{"addOnId": "nightly"}]'::jsonb);
  exception when invalid_parameter_value then v_other_service := true;
  end;
  begin
    perform public.submit_yipyy_go_form('00000000-0000-0000-0000-0000001f6090', '00000000-0000-0000-0000-0000001f6051',
      '{}'::jsonb, '[{"addOnId": "gold-plated"}]'::jsonb);
  exception when invalid_parameter_value then v_unknown := true;
  end;
  reset role;
  perform pg_temp.t('C3  inactive, size-priced, other-service and unknown add-ons are refused',
    v_inactive and v_sized and v_other_service and v_unknown,
    format('inactive=%s sized=%s other service=%s unknown=%s', v_inactive, v_sized, v_other_service, v_unknown));
exception when others then
  reset role; perform pg_temp.t('C3  not offered', false, sqlerrm);
end $$;

-- ── C4  the medication fee counts doses ─────────────────────────────────────
do $$
declare v_milo record; v_prn record; v_none record;
begin
  perform pg_temp.as_user('00000000-0000-0000-0000-0000001f6003');
  set local role authenticated;
  -- Milo: twice a day, one day of daycare → two doses.
  perform public.submit_yipyy_go_form('00000000-0000-0000-0000-0000001f6090', '00000000-0000-0000-0000-0000001f6051',
    '{"medications": [{"id": "m1", "name": "Apoquel", "dosage": "1 tab", "frequency": "twice_daily", "times": []}]}'::jsonb,
    '[]'::jsonb);
  -- Rex boarding: as-needed only → no doses.
  perform public.submit_yipyy_go_form('00000000-0000-0000-0000-0000001f6091', '00000000-0000-0000-0000-0000001f6050',
    '{"medications": [{"id": "m2", "name": "Trazodone", "dosage": "50mg", "frequency": "prn", "times": []}]}'::jsonb,
    '[{"addOnId": "nightly", "quantity": 1}]'::jsonb);
  reset role;
  perform pg_temp.as_nobody();
  select * into v_milo from pg_temp.line('00000000-0000-0000-0000-0000001f6090', 'yipyy-go:medfee:%');
  select * into v_prn from pg_temp.line('00000000-0000-0000-0000-0000001f6091', 'yipyy-go:medfee:%');
  -- Rex on D1 said "no medications" in C1/C2.
  select count(*)::int as lines into v_none
    from public.yipyy_go_charges c
    join public.yipyy_go_submissions y on y.id = c.submission_id
   where c.kind = 'medication_fee' and y.booking_id = '00000000-0000-0000-0000-0000001f6090'
     and y.pet_id = '00000000-0000-0000-0000-0000001f6050';
  perform pg_temp.t('C4  two doses at $5; as-needed and "no medications" add no fee',
    v_milo.lines = 1 and v_milo.unit_price = 5 and v_milo.quantity = 2 and v_prn.lines = 0 and v_none.lines = 0,
    format('milo %s x %s (%s lines); prn lines=%s; none lines=%s',
      v_milo.unit_price, v_milo.quantity, v_milo.lines, v_prn.lines, v_none.lines));
exception when others then
  reset role; perform pg_temp.t('C4  medication fee', false, sqlerrm);
end $$;

-- ── C5  sending the same form again changes nothing ─────────────────────────
do $$
declare v_due_before numeric; v_due_after numeric; v_lines_before int; v_lines_after int;
begin
  perform pg_temp.as_nobody();
  select amount_due into v_due_before from public.bookings where id = '00000000-0000-0000-0000-0000001f6090';
  select count(*) into v_lines_before from public.booking_line_items where booking_id = '00000000-0000-0000-0000-0000001f6090';
  perform pg_temp.as_user('00000000-0000-0000-0000-0000001f6003');
  set local role authenticated;
  perform public.submit_yipyy_go_form('00000000-0000-0000-0000-0000001f6090', '00000000-0000-0000-0000-0000001f6050',
    '{"noMedications": true}'::jsonb, '[{"addOnId": "walk", "quantity": 9}, {"addOnId": "premium"}]'::jsonb);
  reset role;
  perform pg_temp.as_nobody();
  select amount_due into v_due_after from public.bookings where id = '00000000-0000-0000-0000-0000001f6090';
  select count(*) into v_lines_after from public.booking_line_items where booking_id = '00000000-0000-0000-0000-0000001f6090';
  perform pg_temp.t('C5  an identical resubmit leaves amount due and the lines as they were',
    v_due_before = v_due_after and v_lines_before = v_lines_after,
    format('due %s → %s; lines %s → %s', v_due_before, v_due_after, v_lines_before, v_lines_after));
exception when others then
  reset role; perform pg_temp.t('C5  idempotent', false, sqlerrm);
end $$;

-- ── C6  a line staff removed stays removed ──────────────────────────────────
do $$
declare v_after record; v_charge_line uuid; v_charge_rows int;
begin
  perform pg_temp.as_nobody();
  delete from public.booking_line_items
   where booking_id = '00000000-0000-0000-0000-0000001f6090' and source_id like 'yipyy-go:addon:%:premium';
  perform pg_temp.as_user('00000000-0000-0000-0000-0000001f6003');
  set local role authenticated;
  perform public.submit_yipyy_go_form('00000000-0000-0000-0000-0000001f6090', '00000000-0000-0000-0000-0000001f6050',
    '{"noMedications": true}'::jsonb, '[{"addOnId": "walk", "quantity": 9}, {"addOnId": "premium"}]'::jsonb);
  reset role;
  perform pg_temp.as_nobody();
  select * into v_after from pg_temp.line('00000000-0000-0000-0000-0000001f6090', 'yipyy-go:addon:%:premium');
  select count(*), max(line_item_id::text)::uuid into v_charge_rows, v_charge_line
    from public.yipyy_go_charges where charge_key like 'addon:%:premium';
  perform pg_temp.t('C6  staff removed the premium line; sending the form again does not put it back',
    v_after.lines = 0 and v_charge_rows = 1 and v_charge_line is null,
    format('lines=%s charge rows=%s charge line=%s', v_after.lines, v_charge_rows, coalesce(v_charge_line::text, '<null>')));
exception when others then
  reset role; perform pg_temp.t('C6  removed stays removed', false, sqlerrm);
end $$;

-- ── C7  a per-booking add-on is one line ────────────────────────────────────
do $$
declare v_bag record;
begin
  perform pg_temp.as_user('00000000-0000-0000-0000-0000001f6003');
  set local role authenticated;
  perform public.submit_yipyy_go_form('00000000-0000-0000-0000-0000001f6090', '00000000-0000-0000-0000-0000001f6050',
    '{"noMedications": true}'::jsonb,
    '[{"addOnId": "walk", "quantity": 9}, {"addOnId": "premium"}, {"addOnId": "bag"}]'::jsonb);
  perform public.submit_yipyy_go_form('00000000-0000-0000-0000-0000001f6090', '00000000-0000-0000-0000-0000001f6051',
    '{"medications": [{"id": "m1", "name": "Apoquel", "dosage": "1 tab", "frequency": "twice_daily", "times": []}]}'::jsonb,
    '[{"addOnId": "bag"}]'::jsonb);
  reset role;
  perform pg_temp.as_nobody();
  select * into v_bag from pg_temp.line('00000000-0000-0000-0000-0000001f6090', 'yipyy-go:addon:00000000-0000-0000-0000-0000001f6090:bag');
  perform pg_temp.t('C7  a treat bag asked for on both dogs is one $4 line',
    v_bag.lines = 1 and v_bag.unit_price = 4 and v_bag.quantity = 1,
    format('lines=%s unit=%s qty=%s', v_bag.lines, v_bag.unit_price, v_bag.quantity));
exception when others then
  reset role; perform pg_temp.t('C7  per booking', false, sqlerrm);
end $$;

-- ── C8  staff approval puts add-ons on the bill ─────────────────────────────
do $$
declare v_before record; v_after record; v_id uuid;
begin
  perform pg_temp.as_nobody();
  update public.facility_settings
     set value = jsonb_set(value, '{addOnsApproval}', '"staff_approval"')
   where facility_id = '00000000-0000-0000-0000-0000001f6020' and domain = 'yipyy_go_config';

  perform pg_temp.as_user('00000000-0000-0000-0000-0000001f6003');
  set local role authenticated;
  perform public.submit_yipyy_go_form('00000000-0000-0000-0000-0000001f6093', '00000000-0000-0000-0000-0000001f6050',
    '{"noMedications": true}'::jsonb, '[{"addOnId": "walk", "quantity": 1}]'::jsonb);
  reset role;
  perform pg_temp.as_nobody();
  select * into v_before from pg_temp.line('00000000-0000-0000-0000-0000001f6093', 'yipyy-go:addon:%:walk');
  select id into v_id from public.yipyy_go_submissions where booking_id = '00000000-0000-0000-0000-0000001f6093';

  perform pg_temp.as_user('00000000-0000-0000-0000-0000001f6001');
  set local role authenticated;
  perform public.review_yipyy_go_submission(v_id, 'approve', null, 'Owner');
  reset role;
  perform pg_temp.as_nobody();
  select * into v_after from pg_temp.line('00000000-0000-0000-0000-0000001f6093', 'yipyy-go:addon:%:walk');

  update public.facility_settings
     set value = jsonb_set(value, '{addOnsApproval}', '"auto"')
   where facility_id = '00000000-0000-0000-0000-0000001f6020' and domain = 'yipyy_go_config';

  perform pg_temp.t('C8  with staff approval, the walk reaches the bill only when approved',
    v_before.lines = 0 and v_after.lines = 1 and v_after.unit_price = 10,
    format('before=%s after=%s unit=%s', v_before.lines, v_after.lines, v_after.unit_price));
exception when others then
  reset role; perform pg_temp.t('C8  staff approval', false, sqlerrm);
end $$;

-- ── C9  a pledged tip lands; a direct tip write does not ────────────────────
do $$
declare v_pledged numeric; v_after numeric;
begin
  perform pg_temp.as_user('00000000-0000-0000-0000-0000001f6003');
  set local role authenticated;
  perform public.submit_yipyy_go_form('00000000-0000-0000-0000-0000001f6092', '00000000-0000-0000-0000-0000001f6050',
    '{"noMedications": true}'::jsonb, '[]'::jsonb, '{"type": "preset", "presetId": "f5"}'::jsonb);
  begin
    update public.bookings set tip_amount = 99 where id = '00000000-0000-0000-0000-0000001f6092';
  exception when others then null;
  end;
  reset role;
  perform pg_temp.as_nobody();
  select tip_amount into v_after from public.bookings where id = '00000000-0000-0000-0000-0000001f6092';
  v_pledged := v_after;
  perform pg_temp.t('C9  the $5 pledge is the booking''s tip, and the owner cannot change it to $99',
    v_after = 5, format('tip=%s', v_after));
exception when others then
  reset role; perform pg_temp.t('C9  tip pledge', false, sqlerrm);
end $$;

-- ── C10  a tip larger than the booking; a percentage preset ─────────────────
do $$
declare v_too_big boolean := false; v_tip numeric; v_due numeric;
begin
  perform pg_temp.as_user('00000000-0000-0000-0000-0000001f6003');
  set local role authenticated;
  begin
    perform public.submit_yipyy_go_form('00000000-0000-0000-0000-0000001f6092', '00000000-0000-0000-0000-0000001f6050',
      '{"noMedications": true}'::jsonb, '[]'::jsonb, '{"type": "custom", "amount": 5000}'::jsonb);
  exception when invalid_parameter_value then v_too_big := true;
  end;
  -- Milo's D1 form is still open (C7); the same add-ons and medication, with a 15% tip.
  perform public.submit_yipyy_go_form('00000000-0000-0000-0000-0000001f6090', '00000000-0000-0000-0000-0000001f6051',
    '{"medications": [{"id": "m1", "name": "Apoquel", "dosage": "1 tab", "frequency": "twice_daily", "times": []}]}'::jsonb,
    '[{"addOnId": "bag"}]'::jsonb,
    '{"type": "preset", "presetId": "p15"}'::jsonb);
  reset role;
  perform pg_temp.as_nobody();
  select tip_amount, amount_due into v_tip, v_due from public.bookings where id = '00000000-0000-0000-0000-0000001f6090';
  perform pg_temp.t('C10 a $5,000 tip is refused; 15% is a share of what is due',
    v_too_big and v_tip = round(v_due * 15 / 100, 2),
    format('too big refused=%s tip=%s due=%s', v_too_big, v_tip, v_due));
exception when others then
  reset role; perform pg_temp.t('C10 tip bounds', false, sqlerrm);
end $$;

-- ── C11  grooming's own add-ons ─────────────────────────────────────────────
do $$
declare v_polish record; v_teeth boolean := false;
begin
  perform pg_temp.as_user('00000000-0000-0000-0000-0000001f6003');
  set local role authenticated;
  perform public.submit_yipyy_go_form('00000000-0000-0000-0000-0000001f6092', '00000000-0000-0000-0000-0000001f6050',
    '{"noMedications": true}'::jsonb,
    '[{"addOnId": "00000000-0000-0000-0000-0000001f60a0"}]'::jsonb,
    '{"type": "preset", "presetId": "f5"}'::jsonb);
  begin
    perform public.submit_yipyy_go_form('00000000-0000-0000-0000-0000001f6092', '00000000-0000-0000-0000-0000001f6050',
      '{"noMedications": true}'::jsonb, '[{"addOnId": "00000000-0000-0000-0000-0000001f60a1"}]'::jsonb);
  exception when invalid_parameter_value then v_teeth := true;
  end;
  reset role;
  perform pg_temp.as_nobody();
  select * into v_polish from pg_temp.line('00000000-0000-0000-0000-0000001f6092', 'yipyy-go:addon:%:00000000-0000-0000-0000-0000001f60a0');
  perform pg_temp.t('C11 a grooming booking takes grooming''s nail polish at $12; an inactive one is refused',
    v_polish.lines = 1 and v_polish.unit_price = 12 and v_teeth,
    format('lines=%s unit=%s teeth refused=%s', v_polish.lines, v_polish.unit_price, v_teeth));
exception when others then
  reset role; perform pg_temp.t('C11 grooming add-ons', false, sqlerrm);
end $$;

-- ── C12  who is emailed ─────────────────────────────────────────────────────
do $$
declare v_emails text; v_id uuid;
begin
  perform pg_temp.as_nobody();
  select id into v_id from public.yipyy_go_submissions
   where booking_id = '00000000-0000-0000-0000-0000001f6090' and pet_id = '00000000-0000-0000-0000-0000001f6051';
  select string_agg(email, ',' order by email) into v_emails from public.yipyy_go_staff_recipients(v_id);
  perform pg_temp.t('C12 the owner is emailed, the limited member is not, and only the server may ask',
    v_emails = 'ygc-owner@example.invalid'
      and not has_function_privilege('authenticated', 'public.yipyy_go_staff_recipients(uuid)', 'execute')
      and not has_function_privilege('anon', 'public.yipyy_go_staff_recipients(uuid)', 'execute')
      and has_function_privilege('service_role', 'public.yipyy_go_staff_recipients(uuid)', 'execute'),
    format('emails=%s', v_emails));
exception when others then
  reset role; perform pg_temp.t('C12 recipients', false, sqlerrm);
end $$;

-- ── C13  what the owner is offered ──────────────────────────────────────────
do $$
declare v_offer jsonb; v_ids text; v_premium numeric; v_stranger boolean := false;
begin
  perform pg_temp.as_user('00000000-0000-0000-0000-0000001f6003');
  set local role authenticated;
  v_offer := public.yipyy_go_offered_add_ons('00000000-0000-0000-0000-0000001f6090');
  reset role;
  perform pg_temp.as_user('00000000-0000-0000-0000-0000001f6005');
  set local role authenticated;
  begin
    perform public.yipyy_go_offered_add_ons('00000000-0000-0000-0000-0000001f6090');
  exception when insufficient_privilege then v_stranger := true;
  end;
  reset role;
  select string_agg(o ->> 'id', ',' order by o ->> 'id'), max((o ->> 'unitPrice')::numeric) filter (where o ->> 'id' = 'premium')
    into v_ids, v_premium
    from jsonb_array_elements(v_offer) o;
  perform pg_temp.t('C13 daycare offers bag, premium and walk — premium at $4 — and a stranger is refused',
    v_ids = 'bag,premium,walk' and v_premium = 4 and v_stranger
      and not (v_offer::text like '%"price"%') and not (v_offer::text like '%taxable%'),
    format('ids=%s premium=%s stranger refused=%s', v_ids, v_premium, v_stranger));
exception when others then
  reset role; perform pg_temp.t('C13 offer', false, sqlerrm);
end $$;

-- ── Report ──────────────────────────────────────────────────────────────────
select case when ok then '  PASS  ' else '> FAIL <' end as result, name, detail
  from tap order by n;

select count(*) filter (where ok) || ' passed, '
    || count(*) filter (where not ok) || ' failed' as summary
  from tap;

rollback;
