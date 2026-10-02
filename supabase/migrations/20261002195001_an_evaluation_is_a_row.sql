-- ============================================================================
-- An evaluation is a row (the client's evaluation mocks, 2026-10-02).
--
-- ── WHAT CHANGES ──────────────────────────────────────────────────────────
--
-- Until now an evaluation's result lived only in `pets.details.evaluations`,
-- and nothing wrote it but seeds: the evaluator's form saved to the browser,
-- and "Send result" logged to the console. Operations › Evaluations now runs
-- the whole visit — start, answer, finish, review, send — so the visit is a
-- row of its own, `public.evaluations`, one per pet per evaluation booking
-- (or none, for an evaluation started from a pet's profile).
--
--   in_progress · draft        the evaluator is answering
--   completed   · in_review    finished; waiting in "Report cards to review"
--   completed   · sent         the owner has the card
--
-- "Send back to evaluator" puts a card in review back to in_progress · draft
-- with a comment the evaluator sees.
--
-- ── WHO MAY ────────────────────────────────────────────────────────────────
--
--   read                staff holding "View evaluations" or "Run evaluations"
--                       here, and a platform admin. Never a customer: an
--                       owner reads a SENT card through
--                       public.evaluation_card_for_owner(), which leaves out
--                       the internal note, resource guarding and the
--                       facility's staff-only questions.
--   start, answer,      "Run evaluations"
--   finish
--   send, send back     an owner or admin; the roles the facility's Setup
--                       names under "Who can review & send" (reception and
--                       supervisor until it says otherwise); the evaluator,
--                       where "Evaluator can self-send" is on
--
-- Nobody writes the table directly: every change goes through the functions
-- below, so each state's rules are in one place.
--
-- ── WHAT SENDING DOES ─────────────────────────────────────────────────────
--
-- The user decided (2026-10-02) that "a result unlocks services when the card
-- is sent". Sending therefore
--   * records the result in `pets.details.evaluations` — the record the
--     booking wizard's lock and create_booking's gate already read
--     (private.pet_passed_evaluation_for) — through a narrow exemption in
--     private.enforce_pet_integrity, since the person sending may not hold
--     "Edit pet records";
--   * and, where the booking took the facility's FULL-PRICE deposit
--     (`details.evaluationCredit`), turns the approved pet's share of what was
--     paid into store credit — reason 'evaluation', at most once per
--     evaluation ("Credited to the first daycare day or stay").
--
-- The photo from the visit is a private file in `evaluation-photos`, at
-- `{facility_id}/{evaluation_id}/{uuid}-{name}`.
-- ============================================================================

-- ── The table ──────────────────────────────────────────────────────────────

create table if not exists public.evaluations (
  id                 uuid primary key default gen_random_uuid(),
  facility_id        uuid not null references public.facilities(id) on delete cascade,
  pet_id             uuid not null references public.pets(id) on delete cascade,
  client_id          uuid not null references public.clients(id) on delete cascade,
  booking_id         uuid references public.bookings(id) on delete set null,
  evaluator_staff_id uuid references public.staff(id) on delete set null,
  evaluator_name     text not null default '' check (length(evaluator_name) <= 200),
  status             text not null default 'in_progress'
                       check (status in ('in_progress', 'completed')),
  -- Every answer by its question's key: the core ones (dog, human, energy,
  -- anx, react, play, group, leash, guard, result) and the facility's own.
  answers            jsonb not null default '{}'::jsonb
                       check (jsonb_typeof(answers) = 'object'),
  strengths          text[] not null default '{}',
  watch_for          text[] not null default '{}',
  owner_note         text not null default '' check (length(owner_note) <= 4000),
  internal_note      text not null default '' check (length(internal_note) <= 4000),
  -- answers.result, kept as a column for the lists and the pass rate. The
  -- words are pets.details.evaluations[].resultType's.
  result             text check (result in (
                       'approved', 'approved_with_restrictions',
                       'needs_re_evaluation', 'not_approved')),
  approved_services  text[] not null default '{}',
  -- The facility's own questions as they stood when the evaluation was
  -- finished, so a later edit to the questions cannot move an answer onto,
  -- or off, a card already written.
  custom_questions   jsonb not null default '[]'::jsonb
                       check (jsonb_typeof(custom_questions) = 'array'),
  photo_path         text check (photo_path is null or length(photo_path) between 1 and 500),
  card_status        text not null default 'draft'
                       check (card_status in ('draft', 'in_review', 'sent')),
  -- How the card was sent — theme, photo, "Book first visit" button,
  -- internal notes hidden — snapshotted from Setup when it went out.
  card_options       jsonb not null default '{}'::jsonb
                       check (jsonb_typeof(card_options) = 'object'),
  returned_comment   text check (returned_comment is null or length(returned_comment) <= 1000),
  started_at         timestamptz not null default now(),
  completed_at       timestamptz,
  submitted_at       timestamptz,
  reminded_at        timestamptz,
  sent_at            timestamptz,
  sent_by_name       text,
  auto_sent          boolean not null default false,
  sent_channels      text[] not null default '{}',
  opened_at          timestamptz,
  created_by         text default (auth.jwt() ->> 'sub'),
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  constraint evaluations_one_per_pet_per_booking unique (booking_id, pet_id),
  constraint evaluations_photo_is_its_own check (
    photo_path is null or (
      split_part(photo_path, '/', 1) = facility_id::text
      and split_part(photo_path, '/', 2) = id::text
    )
  ),
  constraint evaluations_sent_is_completed check (
    card_status <> 'sent' or (status = 'completed' and sent_at is not null)
  ),
  constraint evaluations_review_is_completed check (
    card_status = 'draft' or status = 'completed'
  )
);

comment on table public.evaluations is
  'One evaluation visit of one pet: the evaluator''s answers, the result and the owner''s report card (the client''s evaluation mocks, 2026-10-02). Written only through the functions in 20261002220000; read by staff with view_evaluations or perform_evaluations. A customer reads a SENT card through public.evaluation_card_for_owner().';

create index if not exists evaluations_facility_status_idx
  on public.evaluations (facility_id, card_status, submitted_at);
create index if not exists evaluations_facility_sent_idx
  on public.evaluations (facility_id, sent_at desc) where card_status = 'sent';
create index if not exists evaluations_pet_idx
  on public.evaluations (pet_id, completed_at desc);
create index if not exists evaluations_booking_idx
  on public.evaluations (booking_id) where booking_id is not null;
create index if not exists evaluations_client_idx
  on public.evaluations (client_id);
create index if not exists evaluations_evaluator_idx
  on public.evaluations (evaluator_staff_id) where evaluator_staff_id is not null;

-- The facility and the client are the pet's; a booking must be an evaluation
-- of that facility that the pet is on. For every writer, the service role
-- included — a seed cannot file a visit under the wrong facility either.
create or replace function private.evaluation_derive()
returns trigger
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  v_facility uuid;
  v_service  text;
begin
  select p.facility_id, p.client_id
    into new.facility_id, new.client_id
    from public.pets p
   where p.id = new.pet_id;
  if new.facility_id is null then
    raise exception 'That pet does not exist.' using errcode = '23503';
  end if;
  if new.booking_id is not null then
    select b.facility_id, b.service into v_facility, v_service
      from public.bookings b
     where b.id = new.booking_id;
    if v_facility is distinct from new.facility_id
       or v_service is distinct from 'evaluation' then
      raise exception 'That booking is not an evaluation at this pet''s facility.'
        using errcode = '23503';
    end if;
    if not exists (
      select 1 from public.booking_pets bp
       where bp.booking_id = new.booking_id and bp.pet_id = new.pet_id
    ) then
      raise exception 'That pet is not on this booking.' using errcode = '23503';
    end if;
  end if;
  return new;
end;
$fn$;

revoke all on function private.evaluation_derive() from public;
revoke all on function private.evaluation_derive() from anon;

drop trigger if exists evaluations_derive on public.evaluations;
create trigger evaluations_derive
  before insert on public.evaluations
  for each row execute function private.evaluation_derive();

drop trigger if exists evaluations_set_updated_at on public.evaluations;
create trigger evaluations_set_updated_at
  before update on public.evaluations
  for each row execute function private.set_updated_at();

alter table public.evaluations enable row level security;

revoke all on public.evaluations from public;
revoke all on public.evaluations from anon;
revoke all on public.evaluations from authenticated;
grant select on public.evaluations to authenticated;
grant all on public.evaluations to service_role;

drop policy if exists evaluations_read on public.evaluations;
create policy evaluations_read on public.evaluations
  for select to authenticated
  using (
    private.is_platform_admin()
    or private.has_permission(facility_id, 'view_evaluations')
    or private.has_permission(facility_id, 'perform_evaluations')
  );

-- ── A sent card records its result on the pet ─────────────────────────────
--
-- private.enforce_pet_integrity keeps `details.evaluations` out of reach of
-- anyone without "Edit pet records" — the owner, and also the receptionist
-- who sends a report card. private.apply_evaluation_to_pet() raises
-- `yipyy.evaluation_result` around its one update, as other system paths
-- raise theirs (yipyy.presence_sync, yipyy.owner_note). Copied from
-- supabase/baseline and changed only by the block marked 2026-10-02.

create or replace function private.enforce_pet_integrity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_facility_id uuid;
  v_can_edit    boolean;
begin
  if (select auth.jwt()->>'sub') is null then
    return new;
  end if;

  -- 2026-10-02: a sent evaluation report card writing its result.
  if coalesce(current_setting('yipyy.evaluation_result', true), '') = 'on' then
    return new;
  end if;

  select c.facility_id into v_facility_id
    from public.clients c
   where c.id = new.client_id;

  v_can_edit := private.has_permission(v_facility_id, 'edit_pet_records');

  if v_can_edit or private.is_platform_admin() then
    return new;
  end if;

  if tg_op = 'INSERT' then
    new.details := new.details - 'evaluations';
    new.status  := 'active';
    return new;
  end if;

  if new.client_id is distinct from old.client_id then
    raise exception 'Re-homing a pet is done by the facility.'
      using errcode = '42501';
  end if;

  new.status  := old.status;
  new.details := (new.details - 'evaluations')
    || jsonb_strip_nulls(jsonb_build_object(
         'evaluations', old.details -> 'evaluations'));

  return new;
end;
$$;

comment on function private.enforce_pet_integrity() is
  'Column-level rules for pets. Keeps the facility''s assessment out of the owner''s reach. A sent evaluation report card records its result through yipyy.evaluation_result (20261002220000).';

-- ── Store credit: the evaluation deposit ───────────────────────────────────

alter table public.store_credit_entries
  add column if not exists evaluation_id uuid;

comment on column public.store_credit_entries.evaluation_id is
  'The evaluation whose approval turned its share of a full-price evaluation deposit into credit (reason ''evaluation''). An identifier, not a foreign key: this ledger is append-only, and a cascade from it is an UPDATE it refuses. Unique, so an evaluation is credited once.';

create unique index if not exists store_credit_entries_evaluation_once
  on public.store_credit_entries (evaluation_id)
  where evaluation_id is not null;

alter table public.store_credit_entries
  drop constraint if exists store_credit_entries_reason_check;
alter table public.store_credit_entries
  add constraint store_credit_entries_reason_check check (
    reason = any (array['added', 'redeemed', 'expired', 'refund',
                        'adjustment', 'gift_card', 'evaluation'])
  );

alter table public.store_credit_entries
  drop constraint if exists store_credit_sign_matches_reason;
alter table public.store_credit_entries
  add constraint store_credit_sign_matches_reason check (
    case reason
      when 'added'      then amount > 0
      when 'refund'     then amount > 0
      when 'gift_card'  then amount > 0
      when 'evaluation' then amount > 0
      when 'redeemed'   then amount < 0
      when 'expired'    then amount < 0
      when 'adjustment' then true
      else null
    end
  );

alter table public.store_credit_entries
  drop constraint if exists store_credit_evaluation_is_named;
alter table public.store_credit_entries
  add constraint store_credit_evaluation_is_named check (
    (reason = 'evaluation') = (evaluation_id is not null)
  );

-- Staff never write an evaluation credit by hand: only
-- private.grant_evaluation_credit(), which runs as the table's owner.
drop policy if exists store_credit_insert on public.store_credit_entries;
create policy store_credit_insert on public.store_credit_entries
  for insert to authenticated
  with check (
    reason <> 'evaluation'
    and evaluation_id is null
    and case
          when amount > 0 and reason = 'gift_card'
            then private.has_permission(facility_id, 'financial_manage_gift_cards')
          when amount > 0
            then private.has_permission(facility_id, 'process_refund')
          else private.has_permission(facility_id, 'financial_take_payment')
        end
  );

-- ── Helpers ────────────────────────────────────────────────────────────────

-- Setup's "Report card delivery", with the defaults the screen shows before
-- a facility saves it (src/types/facility.ts, evaluationReportCardConfigSchema).
create or replace function private.evaluation_card_settings(p_facility_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $fn$
  select jsonb_build_object(
           'deliveryMode', 'review',
           'reviewerRoles', jsonb_build_array('reception', 'supervisor'),
           'evaluatorSelfSend', false,
           'includePhoto', true,
           'bookFirstVisitButton', true,
           'hideInternal', true,
           'theme', 'green',
           'notifyViaEmail', true,
           'notifyViaSMS', false)
      || coalesce((
           select jsonb_strip_nulls(f.value)
             from public.facility_settings f
            where f.facility_id = p_facility_id
              and f.domain = 'evaluation_report_card'
              and jsonb_typeof(f.value) = 'object'), '{}'::jsonb);
$fn$;

revoke all on function private.evaluation_card_settings(uuid) from public;
revoke all on function private.evaluation_card_settings(uuid) from anon;

-- A JSON array of short strings as text[], or an error naming the field.
create or replace function private.evaluation_text_array(
  p_value jsonb,
  p_field text,
  p_max_items integer,
  p_max_length integer
) returns text[]
language plpgsql
immutable
set search_path = ''
as $fn$
declare
  v_out text[];
begin
  if p_value is null or jsonb_typeof(p_value) = 'null' then
    return '{}';
  end if;
  if jsonb_typeof(p_value) <> 'array'
     or jsonb_array_length(p_value) > p_max_items
     or exists (
       select 1 from jsonb_array_elements(p_value) v
        where jsonb_typeof(v) <> 'string'
           or length(v #>> '{}') not between 1 and p_max_length
     ) then
    raise exception '% must be a list of at most % short words.', p_field, p_max_items
      using errcode = '22023', hint = 'evaluation_invalid';
  end if;
  select coalesce(array_agg(distinct v), '{}') into v_out
    from jsonb_array_elements_text(p_value) v;
  return v_out;
end;
$fn$;

revoke all on function private.evaluation_text_array(jsonb, text, integer, integer) from public;
revoke all on function private.evaluation_text_array(jsonb, text, integer, integer) from anon;

-- The signed-in person's name as staff read it on a card: their staff row
-- here, else their profile.
create or replace function private.evaluation_caller(p_facility_id uuid)
returns table (staff_id uuid, name text)
language sql
stable
security definer
set search_path = ''
as $fn$
  select s.id,
         coalesce(
           nullif(btrim(coalesce(s.first_name, '') || ' ' || coalesce(s.last_name, '')), ''),
           (select coalesce(nullif(btrim(p.full_name), ''), nullif(btrim(p.email), ''))
              from public.profiles p
             where p.id = (select auth.jwt()->>'sub')),
           'Staff')
    from (select 1) one
    left join lateral (
      select st.id, st.first_name, st.last_name
        from public.staff st
        join public.facility_memberships m on m.id = st.membership_id
       where m.profile_id = (select auth.jwt()->>'sub')
         and m.facility_id = p_facility_id
         and st.facility_id = p_facility_id
       order by st.created_at
       limit 1
    ) s on true;
$fn$;

revoke all on function private.evaluation_caller(uuid) from public;
revoke all on function private.evaluation_caller(uuid) from anon;

-- "Who can review & send": owners and admins always; the roles Setup names;
-- the evaluator where self-send is on. They must also see evaluations here.
create or replace function private.may_send_evaluation(
  p_facility_id uuid,
  p_evaluator_staff_id uuid
) returns boolean
language sql
stable
security definer
set search_path = ''
as $fn$
  with settings as (
    select private.evaluation_card_settings(p_facility_id) as v
  )
  select private.is_platform_admin()
      or exists (
        select 1
          from public.facility_memberships m
          left join public.staff s
            on s.membership_id = m.id and s.facility_id = m.facility_id
          cross join settings
         where m.profile_id = (select auth.jwt()->>'sub')
           and m.facility_id = p_facility_id
           and m.is_active
           and (private.has_permission(p_facility_id, 'view_evaluations')
                or private.has_permission(p_facility_id, 'perform_evaluations'))
           and (
             m.role in ('owner', 'admin')
             or exists (
               select 1
                 from jsonb_array_elements_text(
                        case jsonb_typeof(settings.v->'reviewerRoles')
                          when 'array' then settings.v->'reviewerRoles'
                          else '[]'::jsonb
                        end) r(role)
                where r.role = m.role::text
                   or r.role = any(coalesce(s.additional_roles::text[], '{}'))
             )
             or (
               coalesce((settings.v->>'evaluatorSelfSend')::boolean, false)
               and s.id is not null
               and s.id = p_evaluator_staff_id
             )
           )
      );
$fn$;

revoke all on function private.may_send_evaluation(uuid, uuid) from public;
revoke all on function private.may_send_evaluation(uuid, uuid) from anon;

-- ── What sending does ──────────────────────────────────────────────────────

-- The result, as `pets.details.evaluations` records one (src/types/pet.ts,
-- evaluationSchema). Replaces this evaluation's earlier record, if any.
create or replace function private.apply_evaluation_to_pet(p_evaluation_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  v_e      public.evaluations;
  v_pass   boolean;
  v_ref    bigint;
  v_record jsonb;
begin
  select * into v_e from public.evaluations e where e.id = p_evaluation_id;
  if v_e.id is null or v_e.result is null then
    return;
  end if;
  v_pass := v_e.result in ('approved', 'approved_with_restrictions');
  select p.ref into v_ref from public.pets p where p.id = v_e.pet_id;

  v_record := jsonb_build_object(
      'id', v_e.id::text,
      'petId', v_ref,
      'status', case when v_pass then 'passed' else 'failed' end,
      'evaluatedAt', to_char(coalesce(v_e.completed_at, now()) at time zone 'UTC',
                             'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
      'evaluatedBy', v_e.evaluator_name,
      'resultType', v_e.result,
      'isExpired', false,
      'approvedServices', jsonb_build_object(
        'daycare', v_pass and 'daycare' = any(v_e.approved_services),
        'boarding', v_pass and 'boarding' = any(v_e.approved_services),
        'customApproved', case
          when v_pass then to_jsonb(array(
            select s from unnest(v_e.approved_services) s
             where s not in ('daycare', 'boarding')))
          else '[]'::jsonb
        end))
    || case
         when v_e.evaluator_staff_id is not null
           then jsonb_build_object('evaluatedById', v_e.evaluator_staff_id::text)
         else '{}'::jsonb
       end;

  perform set_config('yipyy.evaluation_result', 'on', true);
  update public.pets p
     set details = jsonb_set(
           coalesce(p.details, '{}'::jsonb),
           '{evaluations}',
           coalesce((
             select jsonb_agg(x)
               from jsonb_array_elements(
                      case jsonb_typeof(p.details->'evaluations')
                        when 'array' then p.details->'evaluations'
                        else '[]'::jsonb
                      end) x
              where x->>'id' is distinct from v_e.id::text
           ), '[]'::jsonb) || jsonb_build_array(v_record))
   where p.id = v_e.pet_id;
  perform set_config('yipyy.evaluation_result', '', true);
end;
$fn$;

revoke all on function private.apply_evaluation_to_pet(uuid) from public;
revoke all on function private.apply_evaluation_to_pet(uuid) from anon;

-- A full-price evaluation deposit, credited when the pet is approved: the
-- pet's equal share of what the booking has been paid (net of refunds, tips
-- aside — bookings.amount_paid), the last pet by number taking the cent a
-- split leaves over, so a booking whose pets all pass is credited exactly
-- what was paid. Once per evaluation (a unique index says so too). Returns
-- the amount credited, 0 when there is nothing to credit.
create or replace function private.grant_evaluation_credit(p_evaluation_id uuid)
returns numeric
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  v_e        public.evaluations;
  v_booking  public.bookings;
  v_pets     uuid[];
  v_count    integer;
  v_index    integer;
  v_share    numeric(10,2);
  v_amount   numeric(10,2);
  v_pet_name text;
begin
  select * into v_e from public.evaluations e where e.id = p_evaluation_id;
  if v_e.id is null or v_e.booking_id is null
     or v_e.result is null
     or v_e.result not in ('approved', 'approved_with_restrictions') then
    return 0;
  end if;
  if exists (
    select 1 from public.store_credit_entries s where s.evaluation_id = v_e.id
  ) then
    return 0;
  end if;

  select * into v_booking from public.bookings b where b.id = v_e.booking_id;
  if v_booking.id is null
     or v_booking.service <> 'evaluation'
     or coalesce(v_booking.details->>'evaluationCredit', '') <> 'true'
     or v_booking.amount_paid <= 0 then
    return 0;
  end if;

  select array_agg(bp.pet_id order by p.ref, p.id) into v_pets
    from public.booking_pets bp
    join public.pets p on p.id = bp.pet_id
   where bp.booking_id = v_booking.id;
  v_count := coalesce(array_length(v_pets, 1), 0);
  v_index := array_position(v_pets, v_e.pet_id);
  if v_count = 0 or v_index is null then
    return 0;
  end if;

  v_share := round(v_booking.amount_paid / v_count, 2);
  v_amount := case
    when v_index = v_count then v_booking.amount_paid - v_share * (v_count - 1)
    else v_share
  end;
  if v_amount <= 0 then
    return 0;
  end if;

  select p.name into v_pet_name from public.pets p where p.id = v_e.pet_id;
  insert into public.store_credit_entries
    (facility_id, client_id, amount, reason, note, booking_id, evaluation_id)
  values
    (v_e.facility_id, v_booking.client_id, v_amount, 'evaluation',
     'Evaluation deposit — ' || coalesce(v_pet_name, 'pet') || ' was approved',
     v_booking.id, v_e.id);
  return v_amount;
end;
$fn$;

revoke all on function private.grant_evaluation_credit(uuid) from public;
revoke all on function private.grant_evaluation_credit(uuid) from anon;

-- Out it goes: the card's options snapshotted, the result on the pet, the
-- credit if any. The caller holds the row lock and has checked who is asking.
-- Channels are the ones the caller will send on (Email, Text); the customer
-- portal always.
create or replace function private.deliver_evaluation_card(
  p_evaluation_id uuid,
  p_by_name text,
  p_auto boolean,
  p_channels text[]
) returns void
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  v_facility uuid;
  v_settings jsonb;
  v_theme    text;
begin
  select e.facility_id into v_facility
    from public.evaluations e where e.id = p_evaluation_id;
  v_settings := private.evaluation_card_settings(v_facility);
  v_theme := v_settings->>'theme';
  if v_theme is null or v_theme not in ('green', 'blue', 'plum', 'fall', 'ink') then
    v_theme := 'green';
  end if;

  update public.evaluations e
     set card_status   = 'sent',
         sent_at       = now(),
         sent_by_name  = case when p_auto then null else p_by_name end,
         auto_sent     = p_auto,
         sent_channels = array['portal'] || array(
                           select c from unnest(coalesce(p_channels, '{}')) c
                            where c in ('email', 'sms')
                            group by c order by c),
         card_options  = jsonb_build_object(
                           'theme', v_theme,
                           'includePhoto', coalesce((v_settings->>'includePhoto')::boolean, true),
                           'bookFirstVisitButton', coalesce((v_settings->>'bookFirstVisitButton')::boolean, true),
                           'hideInternal', coalesce((v_settings->>'hideInternal')::boolean, true))
   where e.id = p_evaluation_id;

  perform private.apply_evaluation_to_pet(p_evaluation_id);
  perform private.grant_evaluation_credit(p_evaluation_id);
end;
$fn$;

revoke all on function private.deliver_evaluation_card(uuid, text, boolean, text[]) from public;
revoke all on function private.deliver_evaluation_card(uuid, text, boolean, text[]) from anon;

-- ── The evaluator's functions ─────────────────────────────────────────────

/**
 * Start (or continue) an evaluation: one per pet per evaluation booking, so
 * pressing Start twice opens the same one. Without a booking, a new visit of
 * that pet — "Start an evaluation" on its profile. The evaluator is whoever
 * starts it.
 */
create or replace function public.start_evaluation(
  p_pet_id uuid,
  p_booking_id uuid default null
) returns uuid
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  v_facility uuid;
  v_status   public.booking_status;
  v_service  text;
  v_id       uuid;
  v_caller   record;
begin
  if (select auth.jwt()->>'sub') is null then
    raise exception 'Sign in to run an evaluation.' using errcode = '42501';
  end if;

  select p.facility_id into v_facility from public.pets p where p.id = p_pet_id;
  if v_facility is null then
    raise exception 'That pet does not exist.'
      using errcode = 'P0002', hint = 'evaluation_not_found';
  end if;
  if not (private.has_permission(v_facility, 'perform_evaluations')
          or private.is_platform_admin()) then
    raise exception 'Running evaluations is not part of your role here.'
      using errcode = '42501';
  end if;

  if p_booking_id is not null then
    select b.status, b.service into v_status, v_service
      from public.bookings b
     where b.id = p_booking_id and b.facility_id = v_facility;
    if v_service is distinct from 'evaluation' then
      raise exception 'That booking is not an evaluation.'
        using errcode = 'P0002', hint = 'evaluation_not_found';
    end if;
    if v_status in ('cancelled', 'declined', 'no_show') then
      raise exception 'That evaluation was cancelled.'
        using errcode = '55000', hint = 'evaluation_state';
    end if;
    select e.id into v_id from public.evaluations e
     where e.booking_id = p_booking_id and e.pet_id = p_pet_id;
    if v_id is not null then
      return v_id;
    end if;
  end if;

  select * into v_caller from private.evaluation_caller(v_facility);

  insert into public.evaluations
    (facility_id, pet_id, client_id, booking_id, evaluator_staff_id, evaluator_name)
  select v_facility, p.id, p.client_id, p_booking_id, v_caller.staff_id, v_caller.name
    from public.pets p
   where p.id = p_pet_id
  on conflict on constraint evaluations_one_per_pet_per_booking do nothing
  returning id into v_id;

  if v_id is null then
    select e.id into v_id from public.evaluations e
     where e.booking_id = p_booking_id and e.pet_id = p_pet_id;
  end if;
  return v_id;
end;
$fn$;

revoke all on function public.start_evaluation(uuid, uuid) from public;
revoke all on function public.start_evaluation(uuid, uuid) from anon;
grant execute on function public.start_evaluation(uuid, uuid) to authenticated;

/**
 * Save answers (the evaluator's dialog autosaves). While the evaluation is in
 * progress: any of answers, strengths, watchFor, ownerNote, internalNote,
 * approvedServices, photoPath. In review: the note to the owner only, by
 * someone who may send it ("Edit the note to the owner"). A sent card does
 * not change.
 */
create or replace function public.save_evaluation(
  p_evaluation_id uuid,
  p_patch jsonb
) returns public.evaluations
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  v_e      public.evaluations;
  v_result text;
  v_key    text;
begin
  if (select auth.jwt()->>'sub') is null then
    raise exception 'Sign in to run an evaluation.' using errcode = '42501';
  end if;
  if p_patch is null or jsonb_typeof(p_patch) <> 'object' then
    raise exception 'Nothing to save.' using errcode = '22023', hint = 'evaluation_invalid';
  end if;

  select * into v_e from public.evaluations e where e.id = p_evaluation_id for update;
  if v_e.id is null then
    raise exception 'That evaluation does not exist.'
      using errcode = 'P0002', hint = 'evaluation_not_found';
  end if;
  if v_e.card_status = 'sent' then
    raise exception 'That report card was sent; it can no longer change.'
      using errcode = '55000', hint = 'evaluation_state';
  end if;

  if v_e.card_status = 'in_review' then
    if not private.may_send_evaluation(v_e.facility_id, v_e.evaluator_staff_id) then
      raise exception 'Reviewing report cards is not part of your role here.'
        using errcode = '42501';
    end if;
    for v_key in select jsonb_object_keys(p_patch) loop
      if v_key <> 'ownerNote' then
        raise exception 'Only the note to the owner changes in review.'
          using errcode = '55000', hint = 'evaluation_state';
      end if;
    end loop;
    if jsonb_typeof(p_patch->'ownerNote') <> 'string' then
      raise exception 'The note to the owner is text.'
        using errcode = '22023', hint = 'evaluation_invalid';
    end if;
    update public.evaluations e
       set owner_note = p_patch->>'ownerNote'
     where e.id = v_e.id
    returning * into v_e;
    return v_e;
  end if;

  if not (private.has_permission(v_e.facility_id, 'perform_evaluations')
          or private.is_platform_admin()) then
    raise exception 'Running evaluations is not part of your role here.'
      using errcode = '42501';
  end if;

  if p_patch ? 'answers' then
    if jsonb_typeof(p_patch->'answers') <> 'object'
       or (select count(*) from jsonb_object_keys(p_patch->'answers')) > 80
       or exists (
         select 1 from jsonb_each(p_patch->'answers') a
          where a.key !~ '^[A-Za-z0-9_-]{1,64}$'
             or jsonb_typeof(a.value) <> 'string'
             or length(a.value #>> '{}') > 500
       ) then
      raise exception 'The answers are not in a shape this form writes.'
        using errcode = '22023', hint = 'evaluation_invalid';
    end if;
    v_result := nullif(btrim(coalesce(p_patch->'answers'->>'result', '')), '');
    if v_result is not null and v_result not in (
      'approved', 'approved_with_restrictions', 'needs_re_evaluation', 'not_approved'
    ) then
      raise exception 'That is not an outcome.'
        using errcode = '22023', hint = 'evaluation_invalid';
    end if;
  end if;

  if p_patch ? 'ownerNote' and jsonb_typeof(p_patch->'ownerNote') <> 'string'
     or p_patch ? 'internalNote' and jsonb_typeof(p_patch->'internalNote') <> 'string'
     or p_patch ? 'photoPath' and jsonb_typeof(p_patch->'photoPath') not in ('string', 'null') then
    raise exception 'The notes are text.' using errcode = '22023', hint = 'evaluation_invalid';
  end if;

  update public.evaluations e
     set answers           = case when p_patch ? 'answers'
                               then p_patch->'answers' else e.answers end,
         result            = case when p_patch ? 'answers'
                               then v_result else e.result end,
         strengths         = case when p_patch ? 'strengths'
                               then private.evaluation_text_array(p_patch->'strengths', 'Strengths', 20, 60)
                               else e.strengths end,
         watch_for         = case when p_patch ? 'watchFor'
                               then private.evaluation_text_array(p_patch->'watchFor', 'Watch-for', 20, 60)
                               else e.watch_for end,
         approved_services = case when p_patch ? 'approvedServices'
                               then private.evaluation_text_array(p_patch->'approvedServices', 'Approved for', 20, 80)
                               else e.approved_services end,
         owner_note        = case when p_patch ? 'ownerNote'
                               then p_patch->>'ownerNote' else e.owner_note end,
         internal_note     = case when p_patch ? 'internalNote'
                               then p_patch->>'internalNote' else e.internal_note end,
         photo_path        = case when p_patch ? 'photoPath'
                               then nullif(p_patch->>'photoPath', '') else e.photo_path end
   where e.id = v_e.id
  returning * into v_e;
  return v_e;
end;
$fn$;

revoke all on function public.save_evaluation(uuid, jsonb) from public;
revoke all on function public.save_evaluation(uuid, jsonb) from anon;
grant execute on function public.save_evaluation(uuid, jsonb) to authenticated;

/**
 * "Finish & send for review" / "Finish & send report card". Every core
 * question and every required one of the facility's must be answered. Then
 * Setup's delivery decides: the review queue, or out at once ("Send
 * automatically", or "Auto-send passes" for a clean approval). Returns
 * 'in_review' or 'sent'. `p_channels`: what the caller will send on if it
 * goes out now.
 */
create or replace function public.finish_evaluation(
  p_evaluation_id uuid,
  p_channels text[] default '{}'
) returns text
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  v_e        public.evaluations;
  v_custom   jsonb;
  v_missing  integer;
  v_mode     text;
begin
  if (select auth.jwt()->>'sub') is null then
    raise exception 'Sign in to run an evaluation.' using errcode = '42501';
  end if;

  select * into v_e from public.evaluations e where e.id = p_evaluation_id for update;
  if v_e.id is null then
    raise exception 'That evaluation does not exist.'
      using errcode = 'P0002', hint = 'evaluation_not_found';
  end if;
  if not (private.has_permission(v_e.facility_id, 'perform_evaluations')
          or private.is_platform_admin()) then
    raise exception 'Running evaluations is not part of your role here.'
      using errcode = '42501';
  end if;
  if v_e.status <> 'in_progress' then
    raise exception 'That evaluation is already finished.'
      using errcode = '55000', hint = 'evaluation_state';
  end if;

  select case jsonb_typeof(f.value->'customQuestions')
           when 'array' then f.value->'customQuestions'
           else '[]'::jsonb
         end
    into v_custom
    from public.facility_settings f
   where f.facility_id = v_e.facility_id
     and f.domain = 'evaluation_form_template';
  v_custom := coalesce(v_custom, '[]'::jsonb);

  select count(*) into v_missing
    from (
      select k from unnest(array['dog', 'human', 'energy', 'anx', 'react',
                                 'play', 'group', 'leash', 'guard', 'result']) k
      union all
      select q->>'id' from jsonb_array_elements(v_custom) q
       where coalesce((q->>'required')::boolean, false)
    ) required(k)
   where nullif(btrim(coalesce(v_e.answers->>required.k, '')), '') is null;
  if v_missing > 0 or v_e.result is null then
    raise exception 'Answer all the required questions first (% left).', v_missing
      using errcode = '23514', hint = 'evaluation_incomplete';
  end if;

  update public.evaluations e
     set status            = 'completed',
         card_status       = 'in_review',
         completed_at      = now(),
         submitted_at      = now(),
         reminded_at       = null,
         returned_comment  = null,
         custom_questions  = v_custom,
         -- A verdict that is not a pass approves nothing.
         approved_services = case
           when e.result in ('approved', 'approved_with_restrictions')
             then e.approved_services
           else '{}'
         end
   where e.id = v_e.id;

  v_mode := private.evaluation_card_settings(v_e.facility_id)->>'deliveryMode';
  if v_mode = 'auto' or (v_mode = 'autoPass' and v_e.result = 'approved') then
    perform private.deliver_evaluation_card(v_e.id, null, true, p_channels);
    return 'sent';
  end if;
  return 'in_review';
end;
$fn$;

revoke all on function public.finish_evaluation(uuid, text[]) from public;
revoke all on function public.finish_evaluation(uuid, text[]) from anon;
grant execute on function public.finish_evaluation(uuid, text[]) to authenticated;

/** "Approve & send to owner" — with the reviewer's last edit to the note. */
create or replace function public.send_evaluation_card(
  p_evaluation_id uuid,
  p_owner_note text default null,
  p_channels text[] default '{}'
) returns void
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  v_e      public.evaluations;
  v_caller record;
begin
  if (select auth.jwt()->>'sub') is null then
    raise exception 'Sign in to send a report card.' using errcode = '42501';
  end if;

  select * into v_e from public.evaluations e where e.id = p_evaluation_id for update;
  if v_e.id is null then
    raise exception 'That evaluation does not exist.'
      using errcode = 'P0002', hint = 'evaluation_not_found';
  end if;
  if not private.may_send_evaluation(v_e.facility_id, v_e.evaluator_staff_id) then
    raise exception 'Reviewing report cards is not part of your role here.'
      using errcode = '42501';
  end if;
  if v_e.card_status <> 'in_review' then
    raise exception 'That report card is not waiting for review.'
      using errcode = '55000', hint = 'evaluation_state';
  end if;
  if p_owner_note is not null then
    if length(p_owner_note) > 4000 then
      raise exception 'The note to the owner is too long.'
        using errcode = '22023', hint = 'evaluation_invalid';
    end if;
    update public.evaluations e set owner_note = p_owner_note where e.id = v_e.id;
  end if;

  select * into v_caller from private.evaluation_caller(v_e.facility_id);
  perform private.deliver_evaluation_card(v_e.id, v_caller.name, false, p_channels);
end;
$fn$;

revoke all on function public.send_evaluation_card(uuid, text, text[]) from public;
revoke all on function public.send_evaluation_card(uuid, text, text[]) from anon;
grant execute on function public.send_evaluation_card(uuid, text, text[]) to authenticated;

/** "Send back to evaluator", with what to change. */
create or replace function public.return_evaluation_card(
  p_evaluation_id uuid,
  p_comment text
) returns void
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  v_e public.evaluations;
begin
  if (select auth.jwt()->>'sub') is null then
    raise exception 'Sign in to review a report card.' using errcode = '42501';
  end if;
  if nullif(btrim(coalesce(p_comment, '')), '') is null or length(p_comment) > 1000 then
    raise exception 'Say what the evaluator should change.'
      using errcode = '22023', hint = 'evaluation_invalid';
  end if;

  select * into v_e from public.evaluations e where e.id = p_evaluation_id for update;
  if v_e.id is null then
    raise exception 'That evaluation does not exist.'
      using errcode = 'P0002', hint = 'evaluation_not_found';
  end if;
  if not private.may_send_evaluation(v_e.facility_id, v_e.evaluator_staff_id) then
    raise exception 'Reviewing report cards is not part of your role here.'
      using errcode = '42501';
  end if;
  if v_e.card_status <> 'in_review' then
    raise exception 'That report card is not waiting for review.'
      using errcode = '55000', hint = 'evaluation_state';
  end if;

  update public.evaluations e
     set status           = 'in_progress',
         card_status      = 'draft',
         returned_comment = btrim(p_comment),
         submitted_at     = null,
         reminded_at      = null
   where e.id = v_e.id;
end;
$fn$;

revoke all on function public.return_evaluation_card(uuid, text) from public;
revoke all on function public.return_evaluation_card(uuid, text) from anon;
grant execute on function public.return_evaluation_card(uuid, text) to authenticated;

/**
 * Throw away an evaluation that is still being answered — started on the
 * wrong pet, or never begun. A finished one is not discarded: it is sent
 * back, or sent. Returns the photo's path for the caller to remove.
 */
create or replace function public.discard_evaluation(p_evaluation_id uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  v_e public.evaluations;
begin
  if (select auth.jwt()->>'sub') is null then
    raise exception 'Sign in to run an evaluation.' using errcode = '42501';
  end if;
  select * into v_e from public.evaluations e where e.id = p_evaluation_id for update;
  if v_e.id is null then
    raise exception 'That evaluation does not exist.'
      using errcode = 'P0002', hint = 'evaluation_not_found';
  end if;
  if not (private.has_permission(v_e.facility_id, 'perform_evaluations')
          or private.is_platform_admin()) then
    raise exception 'Running evaluations is not part of your role here.'
      using errcode = '42501';
  end if;
  if v_e.status <> 'in_progress' then
    raise exception 'A finished evaluation is not thrown away.'
      using errcode = '55000', hint = 'evaluation_state';
  end if;
  delete from public.evaluations e where e.id = v_e.id;
  return v_e.photo_path;
end;
$fn$;

revoke all on function public.discard_evaluation(uuid) from public;
revoke all on function public.discard_evaluation(uuid) from anon;
grant execute on function public.discard_evaluation(uuid) to authenticated;

/**
 * Who a "card ready" notice goes to: active members here who may review and
 * send, by the rule above. The server asks with the service role after a
 * card lands in review, and again for the 2-hour reminder.
 */
create or replace function public.evaluation_reviewers(p_facility_id uuid)
returns table (membership_id uuid, profile_id text)
language sql
stable
security definer
set search_path = ''
as $fn$
  with settings as (
    select private.evaluation_card_settings(p_facility_id) as v
  )
  select m.id, m.profile_id
    from public.facility_memberships m
    left join public.staff s
      on s.membership_id = m.id and s.facility_id = m.facility_id
    cross join settings
   where m.facility_id = p_facility_id
     and m.is_active
     and (
       m.role in ('owner', 'admin')
       or exists (
         select 1
           from jsonb_array_elements_text(
                  case jsonb_typeof(settings.v->'reviewerRoles')
                    when 'array' then settings.v->'reviewerRoles'
                    else '[]'::jsonb
                  end) r(role)
          where r.role = m.role::text
             or r.role = any(coalesce(s.additional_roles::text[], '{}'))
       )
     )
   group by m.id, m.profile_id;
$fn$;

revoke all on function public.evaluation_reviewers(uuid) from public;
revoke all on function public.evaluation_reviewers(uuid) from anon;
revoke all on function public.evaluation_reviewers(uuid) from authenticated;
grant execute on function public.evaluation_reviewers(uuid) to service_role;

/**
 * What the signed-in person may do on Operations › Evaluations, by the rules
 * above, so the page offers only what the database will let them press:
 * start and answer (may_run), review and send any card (may_review), or
 * send their own (may_self_send, with staff_id saying which are theirs).
 */
create or replace function public.evaluation_viewer(p_facility_id uuid)
returns table (
  may_run boolean,
  may_review boolean,
  may_self_send boolean,
  staff_id uuid
)
language sql
stable
security definer
set search_path = ''
as $fn$
  select
    private.has_permission(p_facility_id, 'perform_evaluations')
      or private.is_platform_admin(),
    private.may_send_evaluation(p_facility_id, null),
    coalesce((private.evaluation_card_settings(p_facility_id)->>'evaluatorSelfSend')::boolean, false)
      and (private.has_permission(p_facility_id, 'view_evaluations')
           or private.has_permission(p_facility_id, 'perform_evaluations')),
    (select c.staff_id from private.evaluation_caller(p_facility_id) c);
$fn$;

revoke all on function public.evaluation_viewer(uuid) from public;
revoke all on function public.evaluation_viewer(uuid) from anon;
grant execute on function public.evaluation_viewer(uuid) to authenticated;

-- ── The owner's card ───────────────────────────────────────────────────────

/**
 * A SENT report card, for the pet's owner — and nothing staff kept to
 * themselves: no internal note, no resource guarding, none of the
 * facility's staff-only questions, no lead answer the card does not show.
 * Where Setup had "Never show internal notes" OFF when it was sent, the
 * card's "Things to know" carries the watch-for tags as picked, guarding
 * and the internal note — that switch is the facility's to turn.
 */
create or replace function public.evaluation_card_for_owner(p_evaluation_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $fn$
  select jsonb_build_object(
           'id', e.id,
           'facility', jsonb_build_object(
             'id', f.id, 'name', f.name, 'logoUrl', f.logo_url,
             'email', f.email, 'phone', f.phone),
           'pet', jsonb_build_object(
             'id', p.id, 'ref', p.ref, 'name', p.name, 'breed', p.breed,
             'species', p.species, 'imageUrl', p.image_url, 'sex', p.sex),
           'ownerName', c.name,
           'evaluatorName', e.evaluator_name,
           'result', e.result,
           'answers', coalesce((
             select jsonb_object_agg(a.key, a.value)
               from jsonb_each(e.answers) a
              where a.key in ('dog', 'human', 'energy', 'anx', 'react', 'play', 'group', 'result')
                 or (a.key = 'guard' and not card.hide)
                 or a.key in (
                   select q->>'id' from jsonb_array_elements(e.custom_questions) q
                    where coalesce((q->>'onCard')::boolean, false))
           ), '{}'::jsonb),
           'customQuestions', coalesce((
             select jsonb_agg(jsonb_build_object(
                      'id', q->>'id', 'label', q->>'label', 'type', q->>'type'))
               from jsonb_array_elements(e.custom_questions) q
              where coalesce((q->>'onCard')::boolean, false)
           ), '[]'::jsonb),
           'strengths', to_jsonb(e.strengths),
           'watchFor', to_jsonb(case
             when card.hide then array(
               select t from unnest(e.watch_for) t where t <> 'guarder')
             else e.watch_for
           end),
           'ownerNote', e.owner_note,
           'internalNote', case when card.hide then '' else e.internal_note end,
           'approvedServices', to_jsonb(case
             when e.result in ('approved', 'approved_with_restrictions')
               then e.approved_services
             else '{}'::text[]
           end),
           'hasPhoto', e.photo_path is not null
                       and coalesce((e.card_options->>'includePhoto')::boolean, true),
           -- The owner's own session signs it: the storage policy lets them read
           -- this file once the card is sent with its photo.
           'photoPath', case
             when coalesce((e.card_options->>'includePhoto')::boolean, true)
               then e.photo_path
           end,
           'theme', coalesce(e.card_options->>'theme', 'green'),
           'bookFirstVisitButton', coalesce((e.card_options->>'bookFirstVisitButton')::boolean, true),
           'hideInternal', card.hide,
           'completedAt', e.completed_at,
           'sentAt', e.sent_at,
           'openedAt', e.opened_at)
    from public.evaluations e
    join public.pets p on p.id = e.pet_id
    join public.clients c on c.id = p.client_id
    join public.facilities f on f.id = e.facility_id
    cross join lateral (
      select coalesce((e.card_options->>'hideInternal')::boolean, true) as hide
    ) card
   where e.id = p_evaluation_id
     and e.card_status = 'sent'
     and p.client_id in (select private.own_client_ids());
$fn$;

revoke all on function public.evaluation_card_for_owner(uuid) from public;
revoke all on function public.evaluation_card_for_owner(uuid) from anon;
grant execute on function public.evaluation_card_for_owner(uuid) to authenticated;

/** The owner's sent cards, newest first — "Evaluations" on their report cards. */
create or replace function public.my_evaluation_cards(p_facility_id uuid default null)
returns table (
  id uuid,
  facility_id uuid,
  pet_id uuid,
  pet_name text,
  result text,
  completed_at timestamptz,
  sent_at timestamptz,
  opened_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $fn$
  select e.id, e.facility_id, e.pet_id, p.name, e.result,
         e.completed_at, e.sent_at, e.opened_at
    from public.evaluations e
    join public.pets p on p.id = e.pet_id
   where e.card_status = 'sent'
     and p.client_id in (select private.own_client_ids())
     and (p_facility_id is null or e.facility_id = p_facility_id)
   order by e.sent_at desc
   limit 200;
$fn$;

revoke all on function public.my_evaluation_cards(uuid) from public;
revoke all on function public.my_evaluation_cards(uuid) from anon;
grant execute on function public.my_evaluation_cards(uuid) to authenticated;

/** The owner opened the card — "Opened" on the facility's sent list. */
create or replace function public.mark_evaluation_card_opened(p_evaluation_id uuid)
returns void
language sql
volatile
security definer
set search_path = ''
as $fn$
  update public.evaluations e
     set opened_at = now()
   where e.id = p_evaluation_id
     and e.card_status = 'sent'
     and e.opened_at is null
     and e.pet_id in (select private.own_pet_ids());
$fn$;

revoke all on function public.mark_evaluation_card_opened(uuid) from public;
revoke all on function public.mark_evaluation_card_opened(uuid) from anon;
grant execute on function public.mark_evaluation_card_opened(uuid) to authenticated;

-- ── The e2e suite's evaluations ────────────────────────────────────────────

/**
 * YES, THIS DELETES SENT EVALUATIONS — that is the point, and why it is
 * service_role only. A sent card can be neither changed nor thrown away by
 * anyone, because its owner received it; the suite therefore cannot clean up
 * the cards it sends. Takes no argument, so there is no pattern for a caller
 * to widen: it only ever matches a note to the owner that starts "E2E:",
 * which no person writes. For each: the result it recorded on its pet comes
 * off the pet, any deposit credit it gave is balanced by an adjustment (the
 * ledger is append-only), and the row goes. Run by
 * scripts/purge-e2e-bookings.ts after a suite run.
 */
create or replace function public.purge_e2e_evaluations()
returns integer
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  v_row   record;
  v_count integer := 0;
begin
  for v_row in
    select e.id, e.pet_id from public.evaluations e where e.owner_note like 'E2E:%'
  loop
    perform set_config('yipyy.evaluation_result', 'on', true);
    update public.pets p
       set details = jsonb_set(p.details, '{evaluations}', coalesce((
             select jsonb_agg(x)
               from jsonb_array_elements(p.details->'evaluations') x
              where x->>'id' is distinct from v_row.id::text
           ), '[]'::jsonb))
     where p.id = v_row.pet_id
       and jsonb_typeof(p.details->'evaluations') = 'array';
    perform set_config('yipyy.evaluation_result', '', true);

    insert into public.store_credit_entries
      (facility_id, client_id, amount, reason, note, author_name)
    select s.facility_id, s.client_id, -s.amount, 'adjustment',
           '[e2e store-credit] evaluation purge correction', 'e2e:purge'
      from public.store_credit_entries s
     where s.evaluation_id = v_row.id;

    delete from public.evaluations e where e.id = v_row.id;
    v_count := v_count + 1;
  end loop;
  return v_count;
end;
$fn$;

revoke all on function public.purge_e2e_evaluations() from public;
revoke all on function public.purge_e2e_evaluations() from anon;
revoke all on function public.purge_e2e_evaluations() from authenticated;
grant execute on function public.purge_e2e_evaluations() to service_role;

-- ── The photo ──────────────────────────────────────────────────────────────

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'evaluation-photos',
  'evaluation-photos',
  false,
  10485760,  -- 10 MB, as the medication label photos.
  array['image/png', 'image/jpeg', 'image/heic']
)
on conflict (id) do nothing;

-- Read: staff who see evaluations here, and the pet's owner once the card
-- was sent with its photo. Attach and remove: "Run evaluations", until the
-- card is sent.
create or replace function private.evaluation_photo_may(p_evaluation_id uuid, p_action text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $fn$
  select exists (
    select 1 from public.evaluations e
     where e.id = p_evaluation_id
       and case p_action
             when 'read' then
               private.is_platform_admin()
               or private.has_permission(e.facility_id, 'view_evaluations')
               or private.has_permission(e.facility_id, 'perform_evaluations')
               or (
                 e.card_status = 'sent'
                 and coalesce((e.card_options->>'includePhoto')::boolean, true)
                 and e.pet_id in (select private.own_pet_ids())
               )
             when 'attach' then
               e.card_status <> 'sent'
               and (private.has_permission(e.facility_id, 'perform_evaluations')
                    or private.is_platform_admin())
             when 'remove' then
               e.card_status <> 'sent'
               and (private.has_permission(e.facility_id, 'perform_evaluations')
                    or private.is_platform_admin())
             else false
           end
  );
$fn$;

revoke all on function private.evaluation_photo_may(uuid, text) from public;
revoke all on function private.evaluation_photo_may(uuid, text) from anon;
grant execute on function private.evaluation_photo_may(uuid, text) to authenticated;

-- The same question about a stored object: its path names the facility and
-- the evaluation, and both must be the evaluation's own.
create or replace function private.evaluation_photo_object_may(p_name text, p_action text)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $fn$
declare
  v_folders    text[] := storage.foldername(p_name);
  v_evaluation uuid;
begin
  if coalesce(array_length(v_folders, 1), 0) <> 2 then
    return false;
  end if;
  begin
    v_evaluation := v_folders[2]::uuid;
  exception when invalid_text_representation then
    return false;
  end;
  return exists (
    select 1 from public.evaluations e
     where e.id = v_evaluation and e.facility_id::text = v_folders[1]
  ) and private.evaluation_photo_may(v_evaluation, p_action);
end;
$fn$;

revoke all on function private.evaluation_photo_object_may(text, text) from public;
revoke all on function private.evaluation_photo_object_may(text, text) from anon;
grant execute on function private.evaluation_photo_object_may(text, text) to authenticated;

drop policy if exists evaluation_photos_object_read on storage.objects;
create policy evaluation_photos_object_read on storage.objects
  for select to authenticated
  using (
    bucket_id = 'evaluation-photos'
    and private.evaluation_photo_object_may(name, 'read')
  );

drop policy if exists evaluation_photos_object_insert on storage.objects;
create policy evaluation_photos_object_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'evaluation-photos'
    and private.evaluation_photo_object_may(name, 'attach')
  );

drop policy if exists evaluation_photos_object_delete on storage.objects;
create policy evaluation_photos_object_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'evaluation-photos'
    and private.evaluation_photo_object_may(name, 'remove')
  );

-- ── A revoke is not verified by having been written ───────────────────────

do $check$
declare
  v_fn text;
begin
  if exists (select 1 from storage.buckets where id = 'evaluation-photos' and public) then
    raise exception 'the evaluation photo bucket is public';
  end if;
  if has_table_privilege('anon', 'public.evaluations', 'select') then
    raise exception 'anon can read evaluations';
  end if;
  if has_table_privilege('authenticated', 'public.evaluations', 'insert')
     or has_table_privilege('authenticated', 'public.evaluations', 'update')
     or has_table_privilege('authenticated', 'public.evaluations', 'delete') then
    raise exception 'authenticated can write evaluations directly';
  end if;
  foreach v_fn in array array[
    'public.start_evaluation(uuid, uuid)',
    'public.save_evaluation(uuid, jsonb)',
    'public.finish_evaluation(uuid, text[])',
    'public.send_evaluation_card(uuid, text, text[])',
    'public.return_evaluation_card(uuid, text)',
    'public.discard_evaluation(uuid)',
    'public.evaluation_reviewers(uuid)',
    'public.evaluation_viewer(uuid)',
    'public.evaluation_card_for_owner(uuid)',
    'public.my_evaluation_cards(uuid)',
    'public.mark_evaluation_card_opened(uuid)',
    'public.purge_e2e_evaluations()',
    'private.evaluation_derive()',
    'private.evaluation_card_settings(uuid)',
    'private.evaluation_text_array(jsonb, text, integer, integer)',
    'private.evaluation_caller(uuid)',
    'private.may_send_evaluation(uuid, uuid)',
    'private.apply_evaluation_to_pet(uuid)',
    'private.grant_evaluation_credit(uuid)',
    'private.deliver_evaluation_card(uuid, text, boolean, text[])',
    'private.evaluation_photo_may(uuid, text)',
    'private.evaluation_photo_object_may(text, text)'
  ] loop
    if has_function_privilege('anon', v_fn, 'execute') then
      raise exception 'anon can execute %', v_fn;
    end if;
  end loop;
  foreach v_fn in array array[
    'public.evaluation_reviewers(uuid)',
    'public.purge_e2e_evaluations()',
    'private.apply_evaluation_to_pet(uuid)',
    'private.grant_evaluation_credit(uuid)',
    'private.deliver_evaluation_card(uuid, text, boolean, text[])',
    'private.may_send_evaluation(uuid, uuid)'
  ] loop
    if has_function_privilege('authenticated', v_fn, 'execute') then
      raise exception 'authenticated can execute %', v_fn;
    end if;
  end loop;
  if not has_function_privilege('authenticated', 'private.evaluation_photo_object_may(text, text)', 'execute') then
    raise exception 'authenticated cannot execute evaluation_photo_object_may(), which its policies call';
  end if;
end;
$check$;
