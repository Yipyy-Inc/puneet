-- ============================================================================
-- A pre-arrival form is a row.
--
-- ── WHAT IT REPLACES ──────────────────────────────────────────────────────
--
-- Yipyy Go is the form an owner fills before a booking: what the dog brings,
-- how it eats, its medications, how it behaves. The facility's SETTINGS for it
-- have been real since 20260906 (facility_settings, `yipyy_go_config`). The
-- form itself was not: src/data/yipyygo-forms.ts kept every submission in a
-- module array, so an owner's answers lived in their own browser tab, a
-- second dog's form overwrote the first (it was keyed by booking alone), and
-- the facility's bookings list asked that array about real bookings it had
-- never heard of — every mandatory booking read "PreCheck Missing".
--
-- ── ONE ROW PER BOOKING AND PET ───────────────────────────────────────────
--
-- `yipyy_go_submissions` is one form per dog on a booking. Facility and client
-- come from the booking by trigger, never from the request, and never move.
-- `status` is the form's own story:
--
--   draft               the owner has started it
--   submitted           the owner sent it
--   changes_requested   the facility sent it back, saying what to change
--   approved            the facility reviewed it
--   completed_by_staff  the facility filled the gap, saying why
--
-- A mandatory form is satisfied by `submitted`, `approved` or
-- `completed_by_staff` — the owner's submission is enough to check the dog in;
-- approval is a review, not a gate (decided 2026-09-13).
--
-- ── WHO MAY CHANGE IT, AND UNTIL WHEN ─────────────────────────────────────
--
-- Writes go through functions only; authenticated holds SELECT. The owner
-- saves and submits while `private.yipyy_go_editable()` says so: the booking
-- is still ahead (pending through confirmed), the dog has not arrived
-- (booking_presence), and the deadline — `timing.deadline` hours before the
-- start — has not passed. A facility's "request changes" reopens it past the
-- deadline. That rule lives here once; the browser used to compute it, from a
-- date it parsed as UTC.
--
-- Reviewing needs `edit_bookings`. Completing a form for the owner needs the
-- permission that checks the dog in for its service (or `edit_bookings`).
-- One refusal (42501) for "no such booking" and "not yours"; 22023 for a form
-- that cannot move the way it was asked to.
--
-- `booking_yipyy_go` is where each booking stands, derived the way
-- `booking_presence` derives where the dog is.
-- ============================================================================

-- ── The table ─────────────────────────────────────────────────────────────

create table if not exists public.yipyy_go_submissions (
  id                uuid primary key default gen_random_uuid(),
  facility_id       uuid not null references public.facilities(id) on delete cascade,
  client_id         uuid not null references public.clients(id) on delete cascade,
  booking_id        uuid not null references public.bookings(id) on delete cascade,
  pet_id            uuid not null references public.pets(id) on delete cascade,
  status            text not null default 'draft'
                    check (status in ('draft', 'submitted', 'changes_requested', 'approved', 'completed_by_staff')),
  answers           jsonb not null default '{}'::jsonb
                    check (jsonb_typeof(answers) = 'object' and octet_length(answers::text) <= 65536),
  add_on_requests   jsonb not null default '[]'::jsonb
                    check (jsonb_typeof(add_on_requests) = 'array' and jsonb_array_length(add_on_requests) <= 50),
  tip_choice        jsonb check (tip_choice is null or jsonb_typeof(tip_choice) = 'object'),
  submitted_at      timestamptz,
  submitted_by_name text check (submitted_by_name is null or length(submitted_by_name) between 1 and 200),
  reviewed_at       timestamptz,
  reviewed_by_name  text check (reviewed_by_name is null or length(reviewed_by_name) between 1 and 200),
  changes_message   text check (changes_message is null or length(btrim(changes_message)) between 1 and 1000),
  completed_reason  text check (completed_reason is null or length(btrim(completed_reason)) between 1 and 1000),
  completed_at      timestamptz,
  completed_by_name text check (completed_by_name is null or length(completed_by_name) between 1 and 200),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  constraint yipyy_go_submissions_one_per_pet unique (booking_id, pet_id),
  constraint yipyy_go_submissions_changes_say_what check (
    status <> 'changes_requested' or changes_message is not null
  ),
  constraint yipyy_go_submissions_staff_completion_says_why check (
    status <> 'completed_by_staff' or completed_reason is not null
  )
);

comment on table public.yipyy_go_submissions is
  'A pre-arrival (Yipyy Go) form, one per booking and pet: what the owner said about belongings, feeding, medications and behaviour, and where it stands with the facility. Written only through the Yipyy Go functions. Replaces the fixture src/data/yipyygo-forms.ts (2026-09-13).';

create index if not exists yipyy_go_submissions_facility_idx
  on public.yipyy_go_submissions (facility_id, status);
create index if not exists yipyy_go_submissions_client_idx
  on public.yipyy_go_submissions (client_id);

-- ── Facility and client come from the booking, and never move ─────────────

create or replace function private.yipyy_go_submission_derive()
returns trigger
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  v_facility uuid;
  v_client   uuid;
begin
  if tg_op = 'UPDATE' then
    new.id          := old.id;
    new.facility_id := old.facility_id;
    new.client_id   := old.client_id;
    new.booking_id  := old.booking_id;
    new.pet_id      := old.pet_id;
    new.created_at  := old.created_at;
    new.updated_at  := now();
    return new;
  end if;

  select b.facility_id, b.client_id into v_facility, v_client
    from public.bookings b where b.id = new.booking_id;
  if not found then
    raise exception 'That booking does not exist.' using errcode = '23503';
  end if;
  if not exists (
    select 1 from public.booking_pets bp
     where bp.booking_id = new.booking_id and bp.pet_id = new.pet_id
  ) then
    raise exception 'That pet is not on this booking.' using errcode = '23514';
  end if;

  new.facility_id := v_facility;
  new.client_id   := v_client;
  new.created_at  := now();
  new.updated_at  := now();
  return new;
end;
$fn$;

revoke all on function private.yipyy_go_submission_derive() from public;
revoke all on function private.yipyy_go_submission_derive() from anon;

drop trigger if exists yipyy_go_submission_derive on public.yipyy_go_submissions;
create trigger yipyy_go_submission_derive
  before insert or update on public.yipyy_go_submissions
  for each row execute function private.yipyy_go_submission_derive();

-- ── What the facility asks for ────────────────────────────────────────────

-- Mirrors yipyyGoRequirementFor (src/lib/settings/yipyy-go.ts): the feature on
-- for the facility, and the service on within it. No row is off.
create or replace function private.yipyy_go_requirement(p_facility_id uuid, p_service text)
returns text
language sql
stable
security definer
set search_path = ''
as $fn$
  select (
    select sc.value ->> 'requirement'
      from jsonb_array_elements(coalesce(s.value -> 'serviceConfigs', '[]'::jsonb)) sc(value)
     where sc.value ->> 'serviceType' = p_service
       and coalesce((sc.value ->> 'enabled')::boolean, false)
       and sc.value ->> 'requirement' in ('mandatory', 'optional')
     limit 1
  )
    from public.facility_settings s
   where s.facility_id = p_facility_id
     and s.domain = 'yipyy_go_config'
     and coalesce((s.value ->> 'enabled')::boolean, false);
$fn$;

-- The form closes `timing.deadline` hours before the booking starts.
create or replace function private.yipyy_go_deadline(p_booking_id uuid)
returns timestamptz
language sql
stable
security definer
set search_path = ''
as $fn$
  select b.start_at - make_interval(
           hours => greatest(0, floor(coalesce((s.value -> 'timing' ->> 'deadline')::numeric, 0)))::int
         )
    from public.bookings b
    left join public.facility_settings s
      on s.facility_id = b.facility_id and s.domain = 'yipyy_go_config'
   where b.id = p_booking_id;
$fn$;

-- An owner may change a form while the booking is still ahead of them, the dog
-- has not arrived, and the deadline has not passed — or when the facility has
-- asked for changes, which reopens it past the deadline.
create or replace function private.yipyy_go_editable(p_booking_id uuid, p_status text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $fn$
  select b.status::text in ('pending', 'request_submitted', 'estimate_sent', 'waitlisted', 'confirmed')
     and p.arrived_at is null
     and (
       coalesce(p_status, 'draft') = 'changes_requested'
       or (
         coalesce(p_status, 'draft') in ('draft', 'submitted')
         and now() < private.yipyy_go_deadline(b.id)
       )
     )
    from public.bookings b
    join public.booking_presence p on p.booking_id = b.id
   where b.id = p_booking_id;
$fn$;

-- Who may check a dog in, by service: the permission each service's own
-- check-in already requires.
create or replace function private.yipyy_go_may_check_in(p_facility_id uuid, p_service text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $fn$
  select case p_service
    when 'daycare'  then private.has_permission(p_facility_id, 'daycare_check_in_out')
    when 'grooming' then private.has_permission(p_facility_id, 'edit_bookings')
    else private.has_permission(p_facility_id, 'check_in_out')
  end;
$fn$;

-- The dog's owner, or nobody.
create or replace function private.yipyy_go_is_owner(p_client_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $fn$
  select p_client_id in (select private.own_client_ids());
$fn$;

revoke all on function private.yipyy_go_requirement(uuid, text) from public;
revoke all on function private.yipyy_go_requirement(uuid, text) from anon;
revoke all on function private.yipyy_go_deadline(uuid) from public;
revoke all on function private.yipyy_go_deadline(uuid) from anon;
revoke all on function private.yipyy_go_editable(uuid, text) from public;
revoke all on function private.yipyy_go_editable(uuid, text) from anon;
revoke all on function private.yipyy_go_may_check_in(uuid, text) from public;
revoke all on function private.yipyy_go_may_check_in(uuid, text) from anon;
revoke all on function private.yipyy_go_is_owner(uuid) from public;
revoke all on function private.yipyy_go_is_owner(uuid) from anon;

-- ── Where each booking stands ─────────────────────────────────────────────

create or replace view public.booking_yipyy_go
with (security_invoker = true) as
select b.id as booking_id,
       r.requirement,
       pets.total as pets_total,
       coalesce(sub.satisfied, 0) as pets_satisfied,
       (r.requirement is null or (pets.total > 0 and coalesce(sub.satisfied, 0) >= pets.total)) as satisfied,
       case
         when r.requirement is null then 'not_required'
         when coalesce(sub.total, 0) = 0 then 'not_started'
         when coalesce(sub.changes, 0) > 0 then 'changes_requested'
         when pets.total > 0 and coalesce(sub.approved, 0) >= pets.total then 'approved'
         when pets.total > 0 and coalesce(sub.satisfied, 0) >= pets.total then 'submitted'
         else 'in_progress'
       end as status
  from public.bookings b
  left join public.facility_settings s
    on s.facility_id = b.facility_id and s.domain = 'yipyy_go_config'
  cross join lateral (
    select case when coalesce((s.value ->> 'enabled')::boolean, false) then (
      select sc.value ->> 'requirement'
        from jsonb_array_elements(coalesce(s.value -> 'serviceConfigs', '[]'::jsonb)) sc(value)
       where sc.value ->> 'serviceType' = b.service
         and coalesce((sc.value ->> 'enabled')::boolean, false)
         and sc.value ->> 'requirement' in ('mandatory', 'optional')
       limit 1
    ) end as requirement
  ) r
  cross join lateral (
    select count(*)::int as total from public.booking_pets bp where bp.booking_id = b.id
  ) pets
  left join lateral (
    select count(*)::int as total,
           count(*) filter (where y.status in ('submitted', 'approved', 'completed_by_staff'))::int as satisfied,
           count(*) filter (where y.status in ('approved', 'completed_by_staff'))::int as approved,
           count(*) filter (where y.status = 'changes_requested')::int as changes
      from public.yipyy_go_submissions y
     where y.booking_id = b.id
  ) sub on true;

comment on view public.booking_yipyy_go is
  'Where each booking stands on its pre-arrival form: whether the facility asks for one (requirement), how many of its pets have one that counts (submitted, approved or completed by staff), and one status for the booking. SECURITY INVOKER — the bookings, settings and submissions policies decide what comes back.';

revoke all on public.booking_yipyy_go from anon;
grant select on public.booking_yipyy_go to authenticated;

-- ── The owner saves and submits ───────────────────────────────────────────

create or replace function public.save_yipyy_go_draft(
  p_booking_id uuid,
  p_pet_id uuid,
  p_answers jsonb,
  p_add_on_requests jsonb default '[]'::jsonb
)
returns public.yipyy_go_submissions
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  v_booking public.bookings;
  v_status  text;
  v_row     public.yipyy_go_submissions;
begin
  select * into v_booking from public.bookings where id = p_booking_id;
  if not found
     or not private.yipyy_go_is_owner(v_booking.client_id)
     or not exists (
       select 1 from public.booking_pets bp where bp.booking_id = p_booking_id and bp.pet_id = p_pet_id
     )
  then
    raise exception 'That booking is not yours.' using errcode = '42501';
  end if;

  if private.yipyy_go_requirement(v_booking.facility_id, v_booking.service) is null then
    raise exception 'This booking does not ask for a pre-arrival form.' using errcode = '22023';
  end if;

  select status into v_status from public.yipyy_go_submissions
   where booking_id = p_booking_id and pet_id = p_pet_id;
  if v_status = 'submitted' then
    raise exception 'This form has been sent. Send it again to change it.' using errcode = '22023';
  end if;
  if not coalesce(private.yipyy_go_editable(p_booking_id, v_status), false) then
    raise exception 'This form can no longer be changed.' using errcode = '22023';
  end if;

  insert into public.yipyy_go_submissions as y (booking_id, pet_id, answers, add_on_requests)
  values (p_booking_id, p_pet_id, coalesce(p_answers, '{}'::jsonb), coalesce(p_add_on_requests, '[]'::jsonb))
  on conflict (booking_id, pet_id) do update
     set answers = excluded.answers,
         add_on_requests = excluded.add_on_requests
  returning * into v_row;

  return v_row;
end;
$fn$;

create or replace function public.submit_yipyy_go_form(
  p_booking_id uuid,
  p_pet_id uuid,
  p_answers jsonb,
  p_add_on_requests jsonb default '[]'::jsonb,
  p_tip jsonb default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  v_booking  public.bookings;
  v_settings jsonb;
  v_status   text;
  v_name     text;
  v_row      public.yipyy_go_submissions;
  v_entering boolean;
begin
  select * into v_booking from public.bookings where id = p_booking_id for update;
  if not found
     or not private.yipyy_go_is_owner(v_booking.client_id)
     or not exists (
       select 1 from public.booking_pets bp where bp.booking_id = p_booking_id and bp.pet_id = p_pet_id
     )
  then
    raise exception 'That booking is not yours.' using errcode = '42501';
  end if;

  if private.yipyy_go_requirement(v_booking.facility_id, v_booking.service) is null then
    raise exception 'This booking does not ask for a pre-arrival form.' using errcode = '22023';
  end if;

  select status into v_status from public.yipyy_go_submissions
   where booking_id = p_booking_id and pet_id = p_pet_id;
  if not coalesce(private.yipyy_go_editable(p_booking_id, v_status), false) then
    raise exception 'This form can no longer be changed.' using errcode = '22023';
  end if;

  if p_tip is not null and jsonb_typeof(p_tip) <> 'object' then
    raise exception 'That is not a tip.' using errcode = '22023';
  end if;

  select c.name into v_name from public.clients c where c.id = v_booking.client_id;

  insert into public.yipyy_go_submissions as y
    (booking_id, pet_id, status, answers, add_on_requests, tip_choice, submitted_at, submitted_by_name)
  values
    (p_booking_id, p_pet_id, 'submitted', coalesce(p_answers, '{}'::jsonb),
     coalesce(p_add_on_requests, '[]'::jsonb), p_tip, now(), nullif(left(btrim(coalesce(v_name, '')), 200), ''))
  on conflict (booking_id, pet_id) do update
     set status = 'submitted',
         answers = excluded.answers,
         add_on_requests = excluded.add_on_requests,
         tip_choice = excluded.tip_choice,
         submitted_at = excluded.submitted_at,
         submitted_by_name = excluded.submitted_by_name
  returning * into v_row;

  select s.value into v_settings from public.facility_settings s
   where s.facility_id = v_booking.facility_id and s.domain = 'yipyy_go_config';
  v_entering := v_status is distinct from 'submitted';

  return jsonb_build_object(
    'submission', to_jsonb(v_row),
    'notifyStaff', v_entering and coalesce((v_settings ->> 'notifyStaffEmailOnSubmit')::boolean, false),
    'sendConfirmation', v_entering and coalesce((v_settings -> 'confirmationEmail' ->> 'enabled')::boolean, false)
  );
end;
$fn$;

-- ── The facility reviews ──────────────────────────────────────────────────

create or replace function public.review_yipyy_go_submission(
  p_submission_id uuid,
  p_action text,
  p_message text default null,
  p_by_name text default null
)
returns public.yipyy_go_submissions
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  v_row public.yipyy_go_submissions;
begin
  select * into v_row from public.yipyy_go_submissions where id = p_submission_id for update;
  if not found or not private.has_permission(v_row.facility_id, 'edit_bookings') then
    raise exception 'That form is not yours to review.' using errcode = '42501';
  end if;

  if p_action = 'approve' then
    if v_row.status <> 'submitted' then
      raise exception 'Only a sent form can be approved.' using errcode = '22023';
    end if;
    update public.yipyy_go_submissions
       set status = 'approved',
           reviewed_at = now(),
           reviewed_by_name = nullif(left(btrim(coalesce(p_by_name, '')), 200), '')
     where id = p_submission_id
    returning * into v_row;
  elsif p_action = 'request_changes' then
    if v_row.status not in ('submitted', 'approved') then
      raise exception 'Only a sent form can be sent back.' using errcode = '22023';
    end if;
    if p_message is null or length(btrim(p_message)) not between 1 and 1000 then
      raise exception 'Say what needs changing.' using errcode = '22023';
    end if;
    update public.yipyy_go_submissions
       set status = 'changes_requested',
           changes_message = btrim(p_message),
           reviewed_at = now(),
           reviewed_by_name = nullif(left(btrim(coalesce(p_by_name, '')), 200), '')
     where id = p_submission_id
    returning * into v_row;
  else
    raise exception 'That is not a review action.' using errcode = '22023';
  end if;

  return v_row;
end;
$fn$;

create or replace function public.complete_yipyy_go_by_staff(
  p_booking_id uuid,
  p_pet_id uuid,
  p_reason text,
  p_by_name text default null
)
returns public.yipyy_go_submissions
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  v_booking public.bookings;
  v_status  text;
  v_row     public.yipyy_go_submissions;
begin
  select * into v_booking from public.bookings where id = p_booking_id;
  if not found
     or not (
       private.yipyy_go_may_check_in(v_booking.facility_id, v_booking.service)
       or private.has_permission(v_booking.facility_id, 'edit_bookings')
     )
     or not exists (
       select 1 from public.booking_pets bp where bp.booking_id = p_booking_id and bp.pet_id = p_pet_id
     )
  then
    raise exception 'That booking is not yours to complete.' using errcode = '42501';
  end if;

  if private.yipyy_go_requirement(v_booking.facility_id, v_booking.service) is null then
    raise exception 'This booking does not ask for a pre-arrival form.' using errcode = '22023';
  end if;
  if p_reason is null or length(btrim(p_reason)) not between 1 and 1000 then
    raise exception 'Say why the form is being completed for them.' using errcode = '22023';
  end if;

  select status into v_status from public.yipyy_go_submissions
   where booking_id = p_booking_id and pet_id = p_pet_id;
  if v_status in ('submitted', 'approved', 'completed_by_staff') then
    raise exception 'This form is already complete.' using errcode = '22023';
  end if;

  insert into public.yipyy_go_submissions as y
    (booking_id, pet_id, status, completed_reason, completed_at, completed_by_name)
  values
    (p_booking_id, p_pet_id, 'completed_by_staff', btrim(p_reason), now(),
     nullif(left(btrim(coalesce(p_by_name, '')), 200), ''))
  on conflict (booking_id, pet_id) do update
     set status = 'completed_by_staff',
         completed_reason = excluded.completed_reason,
         completed_at = excluded.completed_at,
         completed_by_name = excluded.completed_by_name
  returning * into v_row;

  return v_row;
end;
$fn$;

-- ── One answer to "can this still be changed?" ────────────────────────────

create or replace function public.yipyy_go_form_state(p_booking_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $fn$
declare
  v_booking public.bookings;
begin
  select * into v_booking from public.bookings where id = p_booking_id;
  if not found
     or not (
       private.yipyy_go_is_owner(v_booking.client_id)
       or private.has_permission(v_booking.facility_id, 'view_bookings')
     )
  then
    raise exception 'That booking is not yours.' using errcode = '42501';
  end if;

  return jsonb_build_object(
    'requirement', private.yipyy_go_requirement(v_booking.facility_id, v_booking.service),
    'deadline', private.yipyy_go_deadline(p_booking_id),
    'pets', coalesce((
      select jsonb_agg(jsonb_build_object(
               'petId', p.id,
               'petRef', p.ref,
               'petName', p.name,
               'status', coalesce(y.status, 'not_started'),
               'editable', coalesce(private.yipyy_go_editable(p_booking_id, y.status), false)
             ) order by p.name)
        from public.booking_pets bp
        join public.pets p on p.id = bp.pet_id
        left join public.yipyy_go_submissions y
          on y.booking_id = bp.booking_id and y.pet_id = bp.pet_id
       where bp.booking_id = p_booking_id
    ), '[]'::jsonb)
  );
end;
$fn$;

do $grants$
declare
  v_fn text;
begin
  foreach v_fn in array array[
    'public.save_yipyy_go_draft(uuid, uuid, jsonb, jsonb)',
    'public.submit_yipyy_go_form(uuid, uuid, jsonb, jsonb, jsonb)',
    'public.review_yipyy_go_submission(uuid, text, text, text)',
    'public.complete_yipyy_go_by_staff(uuid, uuid, text, text)',
    'public.yipyy_go_form_state(uuid)'
  ] loop
    execute format('revoke all on function %s from public', v_fn);
    execute format('revoke all on function %s from anon', v_fn);
    execute format('grant execute on function %s to authenticated', v_fn);
  end loop;
end;
$grants$;

-- ── RLS ───────────────────────────────────────────────────────────────────

alter table public.yipyy_go_submissions enable row level security;

revoke all on public.yipyy_go_submissions from public;
revoke all on public.yipyy_go_submissions from anon;
revoke all on public.yipyy_go_submissions from authenticated;
grant select on public.yipyy_go_submissions to authenticated;
grant all on public.yipyy_go_submissions to service_role;

drop policy if exists yipyy_go_submissions_read on public.yipyy_go_submissions;
create policy yipyy_go_submissions_read on public.yipyy_go_submissions
  for select using (
    private.is_platform_admin()
    or private.has_permission(facility_id, 'view_bookings')
    or client_id in (select private.own_client_ids())
  );

-- ── A revoke is not verified by having been written ───────────────────────

do $check$
begin
  if has_table_privilege('anon', 'public.yipyy_go_submissions', 'select')
     or has_table_privilege('anon', 'public.booking_yipyy_go', 'select') then
    raise exception 'anon can read pre-arrival forms';
  end if;
  if has_table_privilege('authenticated', 'public.yipyy_go_submissions', 'insert')
     or has_table_privilege('authenticated', 'public.yipyy_go_submissions', 'update')
     or has_table_privilege('authenticated', 'public.yipyy_go_submissions', 'delete') then
    raise exception 'authenticated can write pre-arrival forms without the functions';
  end if;
  if not has_table_privilege('authenticated', 'public.booking_yipyy_go', 'select') then
    raise exception 'authenticated cannot read booking_yipyy_go';
  end if;
  if has_function_privilege('anon', 'public.submit_yipyy_go_form(uuid, uuid, jsonb, jsonb, jsonb)', 'execute')
     or has_function_privilege('anon', 'public.save_yipyy_go_draft(uuid, uuid, jsonb, jsonb)', 'execute')
     or has_function_privilege('anon', 'public.review_yipyy_go_submission(uuid, text, text, text)', 'execute')
     or has_function_privilege('anon', 'public.complete_yipyy_go_by_staff(uuid, uuid, text, text)', 'execute')
     or has_function_privilege('anon', 'public.yipyy_go_form_state(uuid)', 'execute')
     or has_function_privilege('anon', 'private.yipyy_go_requirement(uuid, text)', 'execute')
     or has_function_privilege('anon', 'private.yipyy_go_editable(uuid, text)', 'execute')
     or has_function_privilege('anon', 'private.yipyy_go_may_check_in(uuid, text)', 'execute')
     or has_function_privilege('anon', 'private.yipyy_go_is_owner(uuid)', 'execute')
     or has_function_privilege('anon', 'private.yipyy_go_deadline(uuid)', 'execute') then
    raise exception 'anon can execute a Yipyy Go function';
  end if;
  if not has_function_privilege('authenticated', 'public.submit_yipyy_go_form(uuid, uuid, jsonb, jsonb, jsonb)', 'execute') then
    raise exception 'authenticated cannot execute submit_yipyy_go_form()';
  end if;
end;
$check$;
