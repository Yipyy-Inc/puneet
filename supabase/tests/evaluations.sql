-- ============================================================================
-- public.evaluations — the evaluator's visit, the report card, and what
-- sending it does (20261002195001_an_evaluation_is_a_row.sql).
--
--   bun run test:sql evaluations
--
-- One transaction, rolled back. Fixture emails are @example.invalid.
--
-- V1   A groomer cannot start an evaluation; a boarding attendant can, and
--      pressing Start twice opens the same one.
-- V2   A pet that is not on the booking is refused.
-- V3   Who reads: staff who see evaluations here — not a groomer, not
--      another facility, not the customer.
-- V4   Answers: a made-up outcome is refused; the outcome column follows.
-- V5   Finishing needs every required answer.
-- V6   Finished, it waits for review (the default delivery).
-- V7   The evaluator may not send it (reception and supervisor review until
--      Setup says otherwise); reception may edit the note — only the note.
-- V8   Before it is sent: the pet is not unlocked and the owner sees nothing.
-- V9   Sent: the channels, the reviewer, the theme.
-- V10  The result is on the pet, and unlocks the service it approves.
-- V11  The full-price deposit: the approved pet's share is store credit, once.
-- V12  The owner's card holds nothing staff kept to themselves.
-- V13  Opened — by the owner only. Their list of cards.
-- V14  Send back, with a comment the evaluator sees.
-- V15  "Send automatically": out at finish, no reviewer; a fail credits
--      nothing.
-- V16  "Auto-send passes": a clean approval goes out at once.
-- V17  A customer still cannot write a result onto their pet.
-- V18  Nobody writes an evaluation credit by hand.
-- V19  The reviewers a "card ready" notice goes to.
-- V20  The photo: evaluators attach until the card is sent; a groomer never.
-- V21  Discard: an evaluation still being answered, never a sent one.
-- V22  Grants.
-- V23  The e2e purge takes only an "E2E:" card, with its record and credit.
-- ============================================================================

begin;

set local client_min_messages to warning;

create temp table tap (n serial, name text, ok boolean, detail text);
grant all on tap to authenticated, anon, service_role;

create or replace function pg_temp.t(p_name text, p_ok boolean, p_detail text default '')
returns void language sql as $$
  insert into tap(name, ok, detail) values (p_name, coalesce(p_ok, false), p_detail);
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

-- Who: owner, reception, boarding attendant, groomer of facility A; two
-- customers of A; the owner of facility B.
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000001e7001', 'ev-owner@example.invalid'),
  ('00000000-0000-0000-0000-0000001e7002', 'ev-desk@example.invalid'),
  ('00000000-0000-0000-0000-0000001e7003', 'ev-attendant@example.invalid'),
  ('00000000-0000-0000-0000-0000001e7004', 'ev-groomer@example.invalid'),
  ('00000000-0000-0000-0000-0000001e7005', 'ev-client@example.invalid'),
  ('00000000-0000-0000-0000-0000001e7006', 'ev-neighbour@example.invalid'),
  ('00000000-0000-0000-0000-0000001e7007', 'ev-elsewhere@example.invalid')
on conflict (id) do nothing;

insert into public.profiles (id, email, full_name) values
  ('00000000-0000-0000-0000-0000001e7001', 'ev-owner@example.invalid', 'Olive Owner'),
  ('00000000-0000-0000-0000-0000001e7002', 'ev-desk@example.invalid', 'Dana Desk'),
  ('00000000-0000-0000-0000-0000001e7003', 'ev-attendant@example.invalid', 'Ari Attendant'),
  ('00000000-0000-0000-0000-0000001e7004', 'ev-groomer@example.invalid', 'Gus Groomer'),
  ('00000000-0000-0000-0000-0000001e7005', 'ev-client@example.invalid', 'Cleo Client'),
  ('00000000-0000-0000-0000-0000001e7006', 'ev-neighbour@example.invalid', 'Ned Neighbour'),
  ('00000000-0000-0000-0000-0000001e7007', 'ev-elsewhere@example.invalid', 'Elle Elsewhere')
on conflict (id) do update set full_name = excluded.full_name;

insert into public.orgs (id, name, slug) values
  ('00000000-0000-0000-0000-0000001e7010', 'EV Org', 'ev-org')
on conflict do nothing;

insert into public.facilities (id, org_id, name, slug, legacy_id) values
  ('00000000-0000-0000-0000-0000001e7020', '00000000-0000-0000-0000-0000001e7010',
   'Evaluated Pets', 'ev-a', 'ev-a'),
  ('00000000-0000-0000-0000-0000001e7021', '00000000-0000-0000-0000-0000001e7010',
   'Elsewhere Pets', 'ev-b', 'ev-b')
on conflict do nothing;

insert into public.facility_memberships (id, facility_id, profile_id, role, is_active) values
  ('00000000-0000-0000-0000-0000001e7030', '00000000-0000-0000-0000-0000001e7020',
   '00000000-0000-0000-0000-0000001e7001', 'owner', true),
  ('00000000-0000-0000-0000-0000001e7031', '00000000-0000-0000-0000-0000001e7020',
   '00000000-0000-0000-0000-0000001e7002', 'reception', true),
  ('00000000-0000-0000-0000-0000001e7032', '00000000-0000-0000-0000-0000001e7020',
   '00000000-0000-0000-0000-0000001e7003', 'boarding_attendant', true),
  ('00000000-0000-0000-0000-0000001e7033', '00000000-0000-0000-0000-0000001e7020',
   '00000000-0000-0000-0000-0000001e7004', 'groomer', true),
  ('00000000-0000-0000-0000-0000001e7034', '00000000-0000-0000-0000-0000001e7021',
   '00000000-0000-0000-0000-0000001e7007', 'owner', true)
on conflict (id) do nothing;

insert into public.staff (id, facility_id, membership_id, first_name, last_name, email, primary_role, legacy_id) values
  ('00000000-0000-0000-0000-0000001e7060', '00000000-0000-0000-0000-0000001e7020',
   '00000000-0000-0000-0000-0000001e7032', 'Ari', 'Attendant', 'ev-attendant@example.invalid',
   'boarding_attendant', 'ev-staff-ari'),
  ('00000000-0000-0000-0000-0000001e7061', '00000000-0000-0000-0000-0000001e7020',
   '00000000-0000-0000-0000-0000001e7031', 'Dana', 'Desk', 'ev-desk@example.invalid',
   'reception', 'ev-staff-dana');

insert into public.clients (id, facility_id, name, email, phone, profile_id) values
  ('00000000-0000-0000-0000-0000001e7040', '00000000-0000-0000-0000-0000001e7020',
   'Cleo Client', 'ev-client@example.invalid', '+15550000001',
   '00000000-0000-0000-0000-0000001e7005'),
  ('00000000-0000-0000-0000-0000001e7041', '00000000-0000-0000-0000-0000001e7020',
   'Ned Neighbour', 'ev-neighbour@example.invalid', null,
   '00000000-0000-0000-0000-0000001e7006');

-- Kiwi before Mango: the order a deposit is shared in.
insert into public.pets (id, ref, client_id, name, species, breed) values
  ('00000000-0000-0000-0000-0000001e7050', 9917001, '00000000-0000-0000-0000-0000001e7040',
   'Kiwi', 'dog', 'Beagle'),
  ('00000000-0000-0000-0000-0000001e7051', 9917002, '00000000-0000-0000-0000-0000001e7040',
   'Mango', 'dog', 'Poodle'),
  ('00000000-0000-0000-0000-0000001e7052', 9917003, '00000000-0000-0000-0000-0000001e7041',
   'Luna', 'dog', 'Husky');

-- An evaluation of Kiwi and Mango that took the full-price deposit.
insert into public.bookings
  (id, facility_id, client_id, service, service_type, status, start_at, end_at,
   base_price, total_cost, details)
values
  ('00000000-0000-0000-0000-0000001e7090', '00000000-0000-0000-0000-0000001e7020',
   '00000000-0000-0000-0000-0000001e7040', 'evaluation', 'Evaluation', 'confirmed',
   now() + interval '1 hour', now() + interval '2 hours', 67.50, 67.50,
   '{"evaluationCredit": true}'::jsonb);

insert into public.booking_pets (booking_id, pet_id) values
  ('00000000-0000-0000-0000-0000001e7090', '00000000-0000-0000-0000-0000001e7050'),
  ('00000000-0000-0000-0000-0000001e7090', '00000000-0000-0000-0000-0000001e7051');

insert into public.payments
  (facility_id, booking_id, client_id, method, subtotal, amount_charged, grand_total)
values
  ('00000000-0000-0000-0000-0000001e7020', '00000000-0000-0000-0000-0000001e7090',
   '00000000-0000-0000-0000-0000001e7040', 'e-transfer', 67.50, 67.50, 67.50);

-- The facility's own question: one on the card, one for staff only.
insert into public.facility_settings (facility_id, domain, value) values
  ('00000000-0000-0000-0000-0000001e7020', 'evaluation_form_template',
   jsonb_build_object('customQuestions', jsonb_build_array(
     jsonb_build_object('id', 'c-toy', 'section', 1, 'label', 'Favourite toy',
       'type', 'text', 'options', '[]'::jsonb, 'onCard', true, 'required', true),
     jsonb_build_object('id', 'c-vet', 'section', 2, 'label', 'Vet flags',
       'type', 'text', 'options', '[]'::jsonb, 'onCard', false, 'required', false))))
on conflict (facility_id, domain) do update set value = excluded.value;

create temp table ids (name text primary key, id uuid);
grant all on ids to authenticated, anon, service_role;

create or replace function pg_temp.id(p_name text) returns uuid
language sql as $$ select id from ids where name = p_name $$;

-- A call's SQLSTATE and hint, or 'ok'.
create or replace function pg_temp.outcome(p_sql text) returns text
language plpgsql as $$
declare v_state text; v_hint text;
begin
  execute p_sql;
  return 'ok';
exception when others then
  get stacked diagnostics v_state = returned_sqlstate, v_hint = pg_exception_hint;
  return v_state || coalesce('/' || nullif(v_hint, ''), '');
end $$;

create or replace function pg_temp.complete_answers(p_result text) returns jsonb
language sql as $$
  select jsonb_build_object(
    'dog', 'y', 'human', 'y', 'energy', 'h', 'anx', 'l', 'react', 'l',
    'play', 'rough', 'group', 'large', 'leash', 'pulls_little', 'guard', 'y',
    'result', p_result, 'c-toy', 'The squeaky duck', 'c-vet', 'Watch the left hip');
$$;

-- ── V1  who starts ─────────────────────────────────────────────────────────
do $$
declare v_out text; v_first uuid; v_again uuid;
begin
  perform pg_temp.as_user('00000000-0000-0000-0000-0000001e7004');
  set local role authenticated;
  v_out := pg_temp.outcome($q$select public.start_evaluation(
    '00000000-0000-0000-0000-0000001e7050', '00000000-0000-0000-0000-0000001e7090')$q$);
  reset role;
  perform pg_temp.t('V1  a groomer cannot start an evaluation', v_out = '42501', v_out);

  perform pg_temp.as_user('00000000-0000-0000-0000-0000001e7003');
  set local role authenticated;
  v_first := public.start_evaluation('00000000-0000-0000-0000-0000001e7050',
                                     '00000000-0000-0000-0000-0000001e7090');
  v_again := public.start_evaluation('00000000-0000-0000-0000-0000001e7050',
                                     '00000000-0000-0000-0000-0000001e7090');
  reset role;
  insert into ids values ('kiwi', v_first);
  perform pg_temp.t('V1  an attendant starts one, and Start again opens the same one',
    v_first is not null and v_first = v_again, coalesce(v_again::text, 'null'));
  perform pg_temp.t('V1  the evaluator is whoever started it',
    exists (select 1 from public.evaluations e
             where e.id = v_first
               and e.evaluator_staff_id = '00000000-0000-0000-0000-0000001e7060'
               and e.evaluator_name = 'Ari Attendant'
               and e.client_id = '00000000-0000-0000-0000-0000001e7040'
               and e.facility_id = '00000000-0000-0000-0000-0000001e7020'));
exception when others then
  reset role; perform pg_temp.t('V1  start', false, sqlerrm);
end $$;

-- ── V2  a pet that is not on the booking ───────────────────────────────────
do $$
declare v_out text;
begin
  perform pg_temp.as_user('00000000-0000-0000-0000-0000001e7003');
  set local role authenticated;
  v_out := pg_temp.outcome($q$select public.start_evaluation(
    '00000000-0000-0000-0000-0000001e7052', '00000000-0000-0000-0000-0000001e7090')$q$);
  reset role;
  perform pg_temp.t('V2  a pet that is not on the booking is refused', v_out = '23503', v_out);
end $$;

-- ── V3  who reads ──────────────────────────────────────────────────────────
do $$
declare v_desk int; v_groomer int; v_client int; v_elsewhere int; v_owner int;
begin
  perform pg_temp.as_user('00000000-0000-0000-0000-0000001e7002');
  set local role authenticated;
  select count(*) into v_desk from public.evaluations;
  reset role;
  perform pg_temp.as_user('00000000-0000-0000-0000-0000001e7001');
  set local role authenticated;
  select count(*) into v_owner from public.evaluations;
  reset role;
  perform pg_temp.as_user('00000000-0000-0000-0000-0000001e7004');
  set local role authenticated;
  select count(*) into v_groomer from public.evaluations;
  reset role;
  perform pg_temp.as_user('00000000-0000-0000-0000-0000001e7005');
  set local role authenticated;
  select count(*) into v_client from public.evaluations;
  reset role;
  perform pg_temp.as_user('00000000-0000-0000-0000-0000001e7007');
  set local role authenticated;
  select count(*) into v_elsewhere from public.evaluations;
  reset role;
  perform pg_temp.t('V3  reception and the owner read it (arms the rest of V3)',
    v_desk = 1 and v_owner = 1, format('desk=%s owner=%s', v_desk, v_owner));
  perform pg_temp.t('V3  a groomer, the customer and another facility read nothing',
    v_groomer = 0 and v_client = 0 and v_elsewhere = 0,
    format('groomer=%s client=%s elsewhere=%s', v_groomer, v_client, v_elsewhere));
end $$;

-- ── V4  answers ────────────────────────────────────────────────────────────
do $$
declare v_out text; v_result text;
begin
  perform pg_temp.as_user('00000000-0000-0000-0000-0000001e7003');
  set local role authenticated;
  v_out := pg_temp.outcome(format(
    $q$select public.save_evaluation(%L, '{"answers": {"result": "great"}}'::jsonb)$q$,
    pg_temp.id('kiwi')));
  perform public.save_evaluation(pg_temp.id('kiwi'),
    '{"answers": {"dog": "y", "result": "approved"}}'::jsonb);
  select e.result into v_result from public.evaluations e where e.id = pg_temp.id('kiwi');
  reset role;
  perform pg_temp.t('V4  a made-up outcome is refused', v_out = '22023/evaluation_invalid', v_out);
  perform pg_temp.t('V4  the outcome column follows the answer', v_result = 'approved',
    coalesce(v_result, 'null'));
exception when others then
  reset role; perform pg_temp.t('V4  answers', false, sqlerrm);
end $$;

-- ── V5, V6  finishing ──────────────────────────────────────────────────────
do $$
declare v_out text; v_finish text; v_row public.evaluations;
begin
  perform pg_temp.as_user('00000000-0000-0000-0000-0000001e7003');
  set local role authenticated;
  v_out := pg_temp.outcome(format(
    $q$select public.finish_evaluation(%L)$q$, pg_temp.id('kiwi')));
  perform public.save_evaluation(pg_temp.id('kiwi'), jsonb_build_object(
    'answers', pg_temp.complete_answers('approved'),
    'strengths', jsonb_build_array('toy', 'recall'),
    'watchFor', jsonb_build_array('jumper', 'guarder'),
    'ownerNote', 'Kiwi settled in fast and loved the ball pit.',
    'internalNote', 'Guards the water bowl — feed apart.',
    'approvedServices', jsonb_build_array('daycare', 'boarding')));
  v_finish := public.finish_evaluation(pg_temp.id('kiwi'));
  reset role;
  select * into v_row from public.evaluations e where e.id = pg_temp.id('kiwi');
  perform pg_temp.t('V5  finishing without every required answer is refused',
    v_out = '23514/evaluation_incomplete', v_out);
  perform pg_temp.t('V6  finished, it waits for review',
    v_finish = 'in_review' and v_row.status = 'completed' and v_row.card_status = 'in_review'
      and v_row.submitted_at is not null and v_row.completed_at is not null,
    format('%s %s/%s', v_finish, v_row.status, v_row.card_status));
  perform pg_temp.t('V6  the facility''s questions are kept as they stood',
    jsonb_array_length(v_row.custom_questions) = 2);
exception when others then
  reset role; perform pg_temp.t('V5/V6  finish', false, sqlerrm);
end $$;

-- ── V7  who reviews ────────────────────────────────────────────────────────
do $$
declare v_send text; v_edit text; v_answers text; v_note text;
begin
  perform pg_temp.as_user('00000000-0000-0000-0000-0000001e7003');
  set local role authenticated;
  v_send := pg_temp.outcome(format(
    $q$select public.send_evaluation_card(%L)$q$, pg_temp.id('kiwi')));
  v_edit := pg_temp.outcome(format(
    $q$select public.save_evaluation(%L, '{"ownerNote": "Changed by the evaluator"}'::jsonb)$q$,
    pg_temp.id('kiwi')));
  reset role;

  perform pg_temp.as_user('00000000-0000-0000-0000-0000001e7002');
  set local role authenticated;
  perform public.save_evaluation(pg_temp.id('kiwi'),
    '{"ownerNote": "Kiwi settled in fast — we loved having her."}'::jsonb);
  v_answers := pg_temp.outcome(format(
    $q$select public.save_evaluation(%L, '{"answers": {"result": "not_approved"}}'::jsonb)$q$,
    pg_temp.id('kiwi')));
  reset role;
  select e.owner_note into v_note from public.evaluations e where e.id = pg_temp.id('kiwi');

  perform pg_temp.t('V7  the evaluator may not send their own card (self-send off)',
    v_send = '42501' and v_edit = '42501', v_send || ' ' || v_edit);
  perform pg_temp.t('V7  reception edits the note to the owner',
    v_note = 'Kiwi settled in fast — we loved having her.', v_note);
  perform pg_temp.t('V7  …and only the note', v_answers = '55000/evaluation_state', v_answers);
exception when others then
  reset role; perform pg_temp.t('V7  review', false, sqlerrm);
end $$;

-- ── V8  not yet sent ───────────────────────────────────────────────────────
do $$
declare v_card jsonb; v_passed boolean;
begin
  v_passed := private.pet_passed_evaluation_for('00000000-0000-0000-0000-0000001e7050', 'daycare');
  perform pg_temp.as_user('00000000-0000-0000-0000-0000001e7005');
  set local role authenticated;
  v_card := public.evaluation_card_for_owner(pg_temp.id('kiwi'));
  reset role;
  perform pg_temp.t('V8  in review: the pet is not unlocked, the owner sees no card',
    not v_passed and v_card is null, coalesce(v_card::text, 'null'));
end $$;

-- ── V9  sent ───────────────────────────────────────────────────────────────
do $$
declare v_row public.evaluations;
begin
  perform pg_temp.as_user('00000000-0000-0000-0000-0000001e7002');
  set local role authenticated;
  perform public.send_evaluation_card(pg_temp.id('kiwi'), null, array['email', 'sms', 'fax']);
  reset role;
  select * into v_row from public.evaluations e where e.id = pg_temp.id('kiwi');
  perform pg_temp.t('V9  sent by reception, on the portal, email and text',
    v_row.card_status = 'sent' and v_row.sent_at is not null
      and v_row.sent_by_name = 'Dana Desk' and not v_row.auto_sent
      and v_row.sent_channels = array['portal', 'email', 'sms'],
    format('%s by %s on %s', v_row.card_status, v_row.sent_by_name, v_row.sent_channels));
  perform pg_temp.t('V9  the card''s options are kept as they were sent',
    v_row.card_options = '{"theme": "green", "includePhoto": true, "hideInternal": true, "bookFirstVisitButton": true}'::jsonb,
    v_row.card_options::text);
exception when others then
  reset role; perform pg_temp.t('V9  send', false, sqlerrm);
end $$;

-- ── V10  the pet ───────────────────────────────────────────────────────────
do $$
declare v_records jsonb; v_daycare boolean; v_grooming boolean;
begin
  select p.details->'evaluations' into v_records
    from public.pets p where p.id = '00000000-0000-0000-0000-0000001e7050';
  v_daycare := private.pet_passed_evaluation_for('00000000-0000-0000-0000-0000001e7050', 'daycare');
  v_grooming := private.pet_passed_evaluation_for('00000000-0000-0000-0000-0000001e7050', 'grooming');
  perform pg_temp.t('V10  the result is on the pet, as the wizard reads one',
    jsonb_array_length(v_records) = 1
      and v_records->0->>'id' = pg_temp.id('kiwi')::text
      and v_records->0->>'status' = 'passed'
      and v_records->0->>'resultType' = 'approved'
      and (v_records->0->>'petId')::bigint = 9917001
      and v_records->0->'approvedServices' = '{"daycare": true, "boarding": true, "customApproved": []}'::jsonb,
    coalesce(v_records::text, 'null'));
  perform pg_temp.t('V10  it unlocks what it approves, and not what it does not',
    v_daycare and not v_grooming, format('daycare=%s grooming=%s', v_daycare, v_grooming));
end $$;

-- ── V11  the deposit ───────────────────────────────────────────────────────
do $$
declare v_count int; v_amount numeric; v_again text;
begin
  select count(*), sum(s.amount) into v_count, v_amount
    from public.store_credit_entries s
   where s.client_id = '00000000-0000-0000-0000-0000001e7040';
  perform pg_temp.t('V11  Kiwi''s share of the $67.50 deposit is store credit',
    v_count = 1 and v_amount = 33.75
      and exists (select 1 from public.store_credit_entries s
                   where s.evaluation_id = pg_temp.id('kiwi') and s.reason = 'evaluation'
                     and s.booking_id = '00000000-0000-0000-0000-0000001e7090'),
    format('%s entries, %s', v_count, v_amount));

  perform pg_temp.as_user('00000000-0000-0000-0000-0000001e7002');
  set local role authenticated;
  v_again := pg_temp.outcome(format(
    $q$select public.send_evaluation_card(%L)$q$, pg_temp.id('kiwi')));
  reset role;
  perform private.grant_evaluation_credit(pg_temp.id('kiwi'));
  select count(*) into v_count from public.store_credit_entries s
   where s.client_id = '00000000-0000-0000-0000-0000001e7040';
  perform pg_temp.t('V11  …once: a sent card is not sent again, nor credited again',
    v_again = '55000/evaluation_state' and v_count = 1, v_again || ' ' || v_count);
exception when others then
  reset role; perform pg_temp.t('V11  credit', false, sqlerrm);
end $$;

-- ── V12  the owner's card ──────────────────────────────────────────────────
do $$
declare v_card jsonb; v_neighbour jsonb;
begin
  perform pg_temp.as_user('00000000-0000-0000-0000-0000001e7005');
  set local role authenticated;
  v_card := public.evaluation_card_for_owner(pg_temp.id('kiwi'));
  reset role;
  perform pg_temp.as_user('00000000-0000-0000-0000-0000001e7006');
  set local role authenticated;
  v_neighbour := public.evaluation_card_for_owner(pg_temp.id('kiwi'));
  reset role;

  perform pg_temp.t('V12  the owner reads their pet''s card (arms the rest of V12)',
    v_card->>'result' = 'approved' and v_card->'pet'->>'name' = 'Kiwi'
      and v_card->>'ownerNote' = 'Kiwi settled in fast — we loved having her.'
      and v_card->'answers'->>'c-toy' = 'The squeaky duck',
    coalesce(v_card::text, 'null'));
  perform pg_temp.t('V12  …without the internal note, guarding, or a staff-only question',
    v_card->>'internalNote' = ''
      and not (v_card->'answers' ? 'guard')
      and not (v_card->'answers' ? 'c-vet')
      and not (v_card->'answers' ? 'leash')
      and not (v_card->'watchFor' ? 'guarder')
      and v_card->'watchFor' ? 'jumper'
      and jsonb_array_length(v_card->'customQuestions') = 1
      and position('water bowl' in v_card::text) = 0
      and position('left hip' in v_card::text) = 0,
    v_card::text);
  perform pg_temp.t('V12  another household reads nothing', v_neighbour is null);
exception when others then
  reset role; perform pg_temp.t('V12  owner card', false, sqlerrm);
end $$;

-- ── V13  opened ────────────────────────────────────────────────────────────
do $$
declare v_after_neighbour timestamptz; v_after_owner timestamptz; v_list int;
begin
  perform pg_temp.as_user('00000000-0000-0000-0000-0000001e7006');
  set local role authenticated;
  perform public.mark_evaluation_card_opened(pg_temp.id('kiwi'));
  reset role;
  select e.opened_at into v_after_neighbour from public.evaluations e where e.id = pg_temp.id('kiwi');

  perform pg_temp.as_user('00000000-0000-0000-0000-0000001e7005');
  set local role authenticated;
  perform public.mark_evaluation_card_opened(pg_temp.id('kiwi'));
  select count(*) into v_list from public.my_evaluation_cards();
  reset role;
  select e.opened_at into v_after_owner from public.evaluations e where e.id = pg_temp.id('kiwi');

  perform pg_temp.t('V13  only the owner marks it opened',
    v_after_neighbour is null and v_after_owner is not null);
  perform pg_temp.t('V13  the owner''s list holds their sent card', v_list = 1, v_list::text);
exception when others then
  reset role; perform pg_temp.t('V13  opened', false, sqlerrm);
end $$;

-- ── V14  send back ─────────────────────────────────────────────────────────
do $$
declare v_empty text; v_row public.evaluations; v_id uuid;
begin
  perform pg_temp.as_user('00000000-0000-0000-0000-0000001e7003');
  set local role authenticated;
  v_id := public.start_evaluation('00000000-0000-0000-0000-0000001e7051',
                                  '00000000-0000-0000-0000-0000001e7090');
  perform public.save_evaluation(v_id, jsonb_build_object(
    'answers', pg_temp.complete_answers('not_approved'),
    'approvedServices', jsonb_build_array('daycare')));
  perform public.finish_evaluation(v_id);
  reset role;
  insert into ids values ('mango', v_id);

  perform pg_temp.as_user('00000000-0000-0000-0000-0000001e7002');
  set local role authenticated;
  v_empty := pg_temp.outcome(format(
    $q$select public.return_evaluation_card(%L, '  ')$q$, v_id));
  perform public.return_evaluation_card(v_id, 'Add how Mango did on the leash walk.');
  reset role;
  select * into v_row from public.evaluations e where e.id = v_id;
  perform pg_temp.t('V14  send back needs a comment', v_empty = '22023/evaluation_invalid', v_empty);
  perform pg_temp.t('V14  sent back: answering again, with the comment',
    v_row.status = 'in_progress' and v_row.card_status = 'draft'
      and v_row.returned_comment = 'Add how Mango did on the leash walk.'
      and v_row.submitted_at is null,
    format('%s/%s', v_row.status, v_row.card_status));
  perform pg_temp.t('V14  a fail approves nothing', v_row.approved_services = '{}',
    v_row.approved_services::text);
exception when others then
  reset role; perform pg_temp.t('V14  send back', false, sqlerrm);
end $$;

-- ── V15  "Send automatically" ──────────────────────────────────────────────
insert into public.facility_settings (facility_id, domain, value) values
  ('00000000-0000-0000-0000-0000001e7020', 'evaluation_report_card',
   '{"deliveryMode": "auto", "theme": "plum"}'::jsonb)
on conflict (facility_id, domain) do update set value = excluded.value;

do $$
declare v_finish text; v_row public.evaluations; v_records jsonb; v_credit int;
begin
  perform pg_temp.as_user('00000000-0000-0000-0000-0000001e7003');
  set local role authenticated;
  v_finish := public.finish_evaluation(pg_temp.id('mango'), array['email']);
  reset role;
  select * into v_row from public.evaluations e where e.id = pg_temp.id('mango');
  select p.details->'evaluations' into v_records
    from public.pets p where p.id = '00000000-0000-0000-0000-0000001e7051';
  select count(*) into v_credit from public.store_credit_entries s
   where s.evaluation_id = pg_temp.id('mango');
  perform pg_temp.t('V15  out at finish, by nobody, in the facility''s theme',
    v_finish = 'sent' and v_row.card_status = 'sent' and v_row.auto_sent
      and v_row.sent_by_name is null and v_row.returned_comment is null
      and v_row.sent_channels = array['portal', 'email']
      and v_row.card_options->>'theme' = 'plum',
    format('%s %s auto=%s', v_finish, v_row.card_status, v_row.auto_sent));
  perform pg_temp.t('V15  a fail is on the pet and credits nothing',
    v_records->0->>'status' = 'failed'
      and v_records->0->'approvedServices' = '{"daycare": false, "boarding": false, "customApproved": []}'::jsonb
      and v_credit = 0,
    coalesce(v_records::text, 'null') || ' credit=' || v_credit);
exception when others then
  reset role; perform pg_temp.t('V15  auto', false, sqlerrm);
end $$;

-- ── V16  "Auto-send passes" ────────────────────────────────────────────────
update public.facility_settings
   set value = '{"deliveryMode": "autoPass"}'::jsonb
 where facility_id = '00000000-0000-0000-0000-0000001e7020'
   and domain = 'evaluation_report_card';

do $$
declare v_pass text; v_notes text; v_pass_id uuid; v_notes_id uuid; v_records int;
begin
  perform pg_temp.as_user('00000000-0000-0000-0000-0000001e7003');
  set local role authenticated;
  -- Booking-less: a re-evaluation from the pet's profile.
  v_pass_id := public.start_evaluation('00000000-0000-0000-0000-0000001e7050');
  perform public.save_evaluation(v_pass_id, jsonb_build_object(
    'answers', pg_temp.complete_answers('approved'),
    'approvedServices', jsonb_build_array('daycare')));
  v_pass := public.finish_evaluation(v_pass_id);
  v_notes_id := public.start_evaluation('00000000-0000-0000-0000-0000001e7052');
  perform public.save_evaluation(v_notes_id, jsonb_build_object(
    'answers', pg_temp.complete_answers('approved_with_restrictions')));
  v_notes := public.finish_evaluation(v_notes_id);
  reset role;
  insert into ids values ('kiwi-again', v_pass_id), ('luna', v_notes_id);
  select jsonb_array_length(p.details->'evaluations') into v_records
    from public.pets p where p.id = '00000000-0000-0000-0000-0000001e7050';
  perform pg_temp.t('V16  a clean approval goes out at once; one with notes waits',
    v_pass = 'sent' and v_notes = 'in_review', v_pass || ' / ' || v_notes);
  perform pg_temp.t('V16  a second visit adds its own record, and no booking means no credit',
    v_records = 2
      and not exists (select 1 from public.store_credit_entries s where s.evaluation_id = v_pass_id),
    coalesce(v_records::text, 'null'));
exception when others then
  reset role; perform pg_temp.t('V16  auto pass', false, sqlerrm);
end $$;

-- ── V17  a customer cannot write a result ──────────────────────────────────
do $$
declare v_records int;
begin
  perform pg_temp.as_user('00000000-0000-0000-0000-0000001e7005');
  set local role authenticated;
  update public.pets p
     set details = p.details || '{"evaluations": [{"id": "forged", "status": "passed"}]}'::jsonb
   where p.id = '00000000-0000-0000-0000-0000001e7051';
  reset role;
  select jsonb_array_length(p.details->'evaluations') into v_records
    from public.pets p where p.id = '00000000-0000-0000-0000-0000001e7051';
  perform pg_temp.t('V17  a customer''s own write cannot replace the result',
    v_records = 1
      and not exists (select 1 from public.pets p,
                        jsonb_array_elements(p.details->'evaluations') e
                       where p.id = '00000000-0000-0000-0000-0000001e7051'
                         and e->>'id' = 'forged'),
    coalesce(v_records::text, 'null'));
exception when others then
  reset role; perform pg_temp.t('V17  forged result', false, sqlerrm);
end $$;

-- ── V18  no evaluation credit by hand ──────────────────────────────────────
do $$
declare v_reason text; v_named text; v_ordinary text;
begin
  perform pg_temp.as_user('00000000-0000-0000-0000-0000001e7001');
  set local role authenticated;
  v_reason := pg_temp.outcome($q$insert into public.store_credit_entries
    (facility_id, client_id, amount, reason, evaluation_id)
    values ('00000000-0000-0000-0000-0000001e7020', '00000000-0000-0000-0000-0000001e7040',
            10, 'evaluation', gen_random_uuid())$q$);
  v_named := pg_temp.outcome(format($q$insert into public.store_credit_entries
    (facility_id, client_id, amount, reason, evaluation_id)
    values ('00000000-0000-0000-0000-0000001e7020', '00000000-0000-0000-0000-0000001e7041',
            10, 'added', %L)$q$, pg_temp.id('luna')));
  -- The owner may add credit by hand: the policy still lets them.
  v_ordinary := pg_temp.outcome($q$insert into public.store_credit_entries
    (facility_id, client_id, amount, reason)
    values ('00000000-0000-0000-0000-0000001e7020', '00000000-0000-0000-0000-0000001e7041',
            5, 'added')$q$);
  reset role;
  perform pg_temp.t('V18  staff add ordinary credit (arms V18)', v_ordinary = 'ok', v_ordinary);
  perform pg_temp.t('V18  …but never an evaluation credit, nor one naming an evaluation',
    v_reason = '42501' and v_named in ('42501', '23514'), v_reason || ' ' || v_named);
end $$;

-- ── V19  the reviewers ─────────────────────────────────────────────────────
do $$
declare v_members uuid[];
begin
  set local role service_role;
  select array_agg(r.membership_id order by r.membership_id) into v_members
    from public.evaluation_reviewers('00000000-0000-0000-0000-0000001e7020') r;
  reset role;
  perform pg_temp.t('V19  the owner and reception, not the attendant or the groomer',
    v_members = array['00000000-0000-0000-0000-0000001e7030',
                      '00000000-0000-0000-0000-0000001e7031']::uuid[],
    coalesce(v_members::text, 'null'));
exception when others then
  reset role; perform pg_temp.t('V19  reviewers', false, sqlerrm);
end $$;

do $$
declare v_desk record; v_attendant record; v_groomer record;
begin
  perform pg_temp.as_user('00000000-0000-0000-0000-0000001e7002');
  set local role authenticated;
  select * into v_desk from public.evaluation_viewer('00000000-0000-0000-0000-0000001e7020');
  reset role;
  perform pg_temp.as_user('00000000-0000-0000-0000-0000001e7003');
  set local role authenticated;
  select * into v_attendant from public.evaluation_viewer('00000000-0000-0000-0000-0000001e7020');
  reset role;
  perform pg_temp.as_user('00000000-0000-0000-0000-0000001e7004');
  set local role authenticated;
  select * into v_groomer from public.evaluation_viewer('00000000-0000-0000-0000-0000001e7020');
  reset role;
  perform pg_temp.t('V19  the page offers reception review, the attendant evaluations, the groomer neither',
    v_desk.may_review and not v_desk.may_run
      and v_attendant.may_run and not v_attendant.may_review
      and v_attendant.staff_id = '00000000-0000-0000-0000-0000001e7060'
      and not v_groomer.may_run and not v_groomer.may_review,
    format('desk=%s/%s attendant=%s/%s groomer=%s/%s',
      v_desk.may_run, v_desk.may_review, v_attendant.may_run, v_attendant.may_review,
      v_groomer.may_run, v_groomer.may_review));
exception when others then
  reset role; perform pg_temp.t('V19  viewer', false, sqlerrm);
end $$;

-- ── V20  the photo ─────────────────────────────────────────────────────────
do $$
declare v_attach text; v_groomer text; v_sent text; v_path text; v_saved text;
begin
  v_path := '00000000-0000-0000-0000-0000001e7020/' || pg_temp.id('luna') || '/visit.jpg';

  -- Luna's card waits for review: a photo can be added until it is sent.
  perform pg_temp.as_user('00000000-0000-0000-0000-0000001e7003');
  set local role authenticated;
  v_attach := pg_temp.outcome(format(
    $q$insert into storage.objects (bucket_id, name) values ('evaluation-photos', %L)$q$, v_path));
  v_sent := pg_temp.outcome(format(
    $q$insert into storage.objects (bucket_id, name) values ('evaluation-photos', %L)$q$,
    '00000000-0000-0000-0000-0000001e7020/' || pg_temp.id('kiwi') || '/late.jpg'));
  reset role;

  perform pg_temp.as_user('00000000-0000-0000-0000-0000001e7004');
  set local role authenticated;
  v_groomer := pg_temp.outcome(format(
    $q$insert into storage.objects (bucket_id, name) values ('evaluation-photos', %L)$q$,
    '00000000-0000-0000-0000-0000001e7020/' || pg_temp.id('luna') || '/groomer.jpg'));
  reset role;

  perform pg_temp.t('V20  an evaluator attaches a photo to a card not yet sent (arms V20)',
    v_attach = 'ok', v_attach);
  perform pg_temp.t('V20  a groomer cannot; nobody can once the card is sent',
    v_groomer = '42501' and v_sent = '42501', v_groomer || ' ' || v_sent);
  perform pg_temp.t('V20  the path must be the evaluation''s own',
    pg_temp.outcome(format(
      $q$update public.evaluations set photo_path = %L where id = %L$q$,
      '00000000-0000-0000-0000-0000001e7021/' || pg_temp.id('luna') || '/x.jpg',
      pg_temp.id('luna'))) = '23514');
end $$;

-- ── V21  discard ───────────────────────────────────────────────────────────
do $$
declare v_sent text; v_draft uuid; v_gone boolean;
begin
  perform pg_temp.as_user('00000000-0000-0000-0000-0000001e7003');
  set local role authenticated;
  v_sent := pg_temp.outcome(format(
    $q$select public.discard_evaluation(%L)$q$, pg_temp.id('kiwi')));
  v_draft := public.start_evaluation('00000000-0000-0000-0000-0000001e7052');
  perform public.discard_evaluation(v_draft);
  reset role;
  v_gone := not exists (select 1 from public.evaluations e where e.id = v_draft);
  perform pg_temp.t('V21  an evaluation still being answered is thrown away; a sent one is not',
    v_gone and v_sent = '55000/evaluation_state', v_sent);
exception when others then
  reset role; perform pg_temp.t('V21  discard', false, sqlerrm);
end $$;

-- ── V23  the e2e purge ─────────────────────────────────────────────────────
do $$
declare v_purged int; v_records int; v_balance numeric; v_kept int;
begin
  update public.evaluations set owner_note = 'E2E: a spec''s card' where id = pg_temp.id('kiwi');
  set local role service_role;
  v_purged := public.purge_e2e_evaluations();
  reset role;
  select count(*) into v_records
    from public.pets p, jsonb_array_elements(p.details->'evaluations') e
   where p.id = '00000000-0000-0000-0000-0000001e7050' and e->>'id' = pg_temp.id('kiwi')::text;
  select coalesce(sum(s.amount), 0) into v_balance
    from public.store_credit_entries s where s.client_id = '00000000-0000-0000-0000-0000001e7040';
  select count(*) into v_kept from public.evaluations e where e.id = pg_temp.id('kiwi-again');
  perform pg_temp.t('V23  the purge takes the E2E card, its record on the pet and its credit — nothing else',
    -- At least this one: a copy may hold a run's own E2E cards too.
    v_purged >= 1
      and not exists (select 1 from public.evaluations e where e.id = pg_temp.id('kiwi'))
      and v_records = 0 and v_balance = 0 and v_kept = 1,
    format('purged=%s records=%s balance=%s kept=%s', v_purged, v_records, v_balance, v_kept));
exception when others then
  reset role; perform pg_temp.t('V23  purge', false, sqlerrm);
end $$;

-- ── V22  grants ────────────────────────────────────────────────────────────
do $$
begin
  perform pg_temp.t('V22  anon reads no evaluation and calls none of the functions',
    not has_table_privilege('anon', 'public.evaluations', 'select')
      and not has_function_privilege('anon', 'public.start_evaluation(uuid, uuid)', 'execute')
      and not has_function_privilege('anon', 'public.save_evaluation(uuid, jsonb)', 'execute')
      and not has_function_privilege('anon', 'public.finish_evaluation(uuid, text[])', 'execute')
      and not has_function_privilege('anon', 'public.send_evaluation_card(uuid, text, text[])', 'execute')
      and not has_function_privilege('anon', 'public.evaluation_card_for_owner(uuid)', 'execute')
      and not has_function_privilege('anon', 'public.mark_evaluation_card_opened(uuid)', 'execute'));
  perform pg_temp.t('V22  a signed-in user writes no evaluation directly, nor sends one past the rules',
    not has_table_privilege('authenticated', 'public.evaluations', 'insert')
      and not has_table_privilege('authenticated', 'public.evaluations', 'update')
      and not has_function_privilege('authenticated', 'private.deliver_evaluation_card(uuid, text, boolean, text[])', 'execute')
      and not has_function_privilege('authenticated', 'private.grant_evaluation_credit(uuid)', 'execute')
      and not has_function_privilege('authenticated', 'private.apply_evaluation_to_pet(uuid)', 'execute')
      and not has_function_privilege('authenticated', 'public.evaluation_reviewers(uuid)', 'execute'));
end $$;

-- ── Report ──────────────────────────────────────────────────────────────────
select case when ok then '  PASS  ' else '> FAIL <' end as result, name, detail
  from tap order by n;

select count(*) filter (where ok) || ' passed, '
    || count(*) filter (where not ok) || ' failed' as summary
  from tap;

rollback;
