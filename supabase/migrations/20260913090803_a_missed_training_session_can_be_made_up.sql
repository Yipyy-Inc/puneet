-- ============================================================================
-- A missed training session can be made up.
--
-- ── WHAT IT REPLACES ──────────────────────────────────────────────────────
--
-- The facility's Make-up sessions page read the `sessionAttendances` fixture
-- for its absences and wrote offers and "ineligible" marks into the query
-- cache ("Offer sent to {owner}" — nothing was stored, nothing was sent). The
-- owner's Make-up sessions tab was mock data end to end: an invented dog's
-- absence, a $40 price from a fixture config, and a request and a skip that
-- were timers.
--
-- ── A MISSED SESSION IS DERIVED, NOT STORED ───────────────────────────────
--
-- Enrolling books a dog into every session of its series (create_booking with
-- training_series_session_id), and a dog that comes is checked in against that
-- booking (training_attendance). So a missed session is a session booking
-- whose session has ended, that was not cancelled or declined, and that never
-- checked in — or that the facility marked a no-show. A booking that is itself
-- a make-up seat is not offered a make-up of its own.
--
-- ── WHAT HAPPENS NEXT IS A ROW ─────────────────────────────────────────────
--
-- training_makeups, one per missed booking, decided 2026-09-12:
--
--   requested   the owner asked for a make-up
--   offered     staff booked the dog a seat in a future session of the same
--               course, in another series: a confirmed booking at $0, because
--               the series is already paid for
--   declined    the owner turned that seat down, and its booking is cancelled
--   skipped     the owner does not want a make-up for that session
--   ineligible  staff decided there is none, and said why
--
-- Nobody writes the table directly. Five functions do, each checking who is
-- asking: the dog's owner (request, skip, decline) or staff who can make
-- bookings (offer, decline, ineligible). Staff who see the training queue and
-- the dog's owner read it.
-- ============================================================================

create table if not exists public.training_makeups (
  id                uuid primary key default gen_random_uuid(),
  facility_id       uuid not null references public.facilities(id) on delete cascade,
  missed_booking_id uuid not null unique references public.bookings(id) on delete cascade,
  missed_session_id uuid references public.training_series_sessions(id) on delete set null,
  pet_id            uuid not null references public.pets(id) on delete cascade,
  client_id         uuid not null references public.clients(id) on delete cascade,
  status            text not null
                    check (status in ('requested', 'offered', 'declined', 'skipped', 'ineligible')),
  host_session_id   uuid references public.training_series_sessions(id) on delete set null,
  host_booking_id   uuid references public.bookings(id) on delete set null,
  owner_note        text check (owner_note is null or length(owner_note) between 1 and 1000),
  ineligible_reason text check (ineligible_reason is null or length(ineligible_reason) between 1 and 1000),
  requested_at      timestamptz,
  offered_at        timestamptz,
  offered_by_name   text,
  answered_at       timestamptz,
  decided_at        timestamptz,
  decided_by_name   text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  constraint training_makeups_ineligible_says_why check (
    status <> 'ineligible' or ineligible_reason is not null
  )
);

comment on table public.training_makeups is
  'What happens after a dog misses a training session: requested, offered (a $0 seat booked in another series), declined, skipped or ineligible. Written only through the five make-up functions. Replaces the make-up fixtures (2026-09-12).';

create index if not exists training_makeups_facility_idx
  on public.training_makeups (facility_id, created_at desc);
create index if not exists training_makeups_client_idx
  on public.training_makeups (client_id);
create index if not exists training_makeups_host_booking_idx
  on public.training_makeups (host_booking_id) where host_booking_id is not null;

-- ── Which booking is a missed session ─────────────────────────────────────

create or replace function private.training_missed_booking(p_booking_id uuid)
returns table (
  facility_id uuid,
  client_id   uuid,
  pet_id      uuid,
  session_id  uuid,
  series_id   uuid,
  course_key  text
)
language sql
stable
security definer
set search_path = ''
as $fn$
  select b.facility_id, b.client_id, bp.pet_id, s.id, s.series_id,
         lower(btrim(coalesce(nullif(btrim(ts.course_type_name), ''), ts.name)))
    from public.bookings b
    join public.training_series_sessions s on s.id = b.training_series_session_id
    join public.training_series ts on ts.id = s.series_id
    join lateral (
      select x.pet_id from public.booking_pets x
       where x.booking_id = b.id
       order by x.pet_id
       limit 1
    ) bp on true
   where b.id = p_booking_id
     and b.service = 'training'
     and s.end_at < now()
     and b.status::text not in ('cancelled', 'declined')
     and (
       b.status::text = 'no_show'
       or not exists (
         select 1 from public.training_attendance a
          where a.booking_id = b.id and a.checked_in_at is not null
       )
     )
     and not exists (
       select 1 from public.training_makeups m where m.host_booking_id = b.id
     );
$fn$;

revoke all on function private.training_missed_booking(uuid) from public;
revoke all on function private.training_missed_booking(uuid) from anon;

-- The owner, staff who can book, or nobody.
create or replace function private.training_makeup_actor(p_facility_id uuid, p_client_id uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $fn$
  select case
    when private.has_permission(p_facility_id, 'create_bookings') then 'staff'
    when p_client_id in (select private.own_client_ids()) then 'owner'
  end;
$fn$;

revoke all on function private.training_makeup_actor(uuid, uuid) from public;
revoke all on function private.training_makeup_actor(uuid, uuid) from anon;

-- ── The owner asks ────────────────────────────────────────────────────────

create or replace function public.request_training_makeup(
  p_missed_booking_id uuid,
  p_note text default null
)
returns public.training_makeups
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  v_missed record;
  v_row    public.training_makeups;
begin
  select * into v_missed from private.training_missed_booking(p_missed_booking_id);
  -- One refusal for "no such missed session" and "not yours".
  if not found or private.training_makeup_actor(v_missed.facility_id, v_missed.client_id) is null then
    raise exception 'That missed session is not yours to make up.' using errcode = '42501';
  end if;

  select * into v_row from public.training_makeups
   where missed_booking_id = p_missed_booking_id
   for update;
  if found then
    if v_row.status = 'requested' then
      return v_row;
    elsif v_row.status = 'offered' then
      raise exception 'A seat is already booked for this make-up.' using errcode = '22023';
    elsif v_row.status = 'ineligible' then
      raise exception 'The facility has decided there is no make-up for this session.' using errcode = '22023';
    end if;
  end if;

  insert into public.training_makeups
    (facility_id, missed_booking_id, missed_session_id, pet_id, client_id,
     status, owner_note, requested_at)
  values
    (v_missed.facility_id, p_missed_booking_id, v_missed.session_id, v_missed.pet_id,
     v_missed.client_id, 'requested', nullif(btrim(coalesce(p_note, '')), ''), now())
  on conflict (missed_booking_id) do update
     set status = 'requested',
         owner_note = excluded.owner_note,
         requested_at = excluded.requested_at,
         answered_at = null,
         updated_at = now()
  returning * into v_row;

  return v_row;
end;
$fn$;

-- ── The owner skips it ────────────────────────────────────────────────────

create or replace function public.skip_training_makeup(p_missed_booking_id uuid)
returns public.training_makeups
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  v_missed record;
  v_row    public.training_makeups;
begin
  select * into v_missed from private.training_missed_booking(p_missed_booking_id);
  if not found or private.training_makeup_actor(v_missed.facility_id, v_missed.client_id) is null then
    raise exception 'That missed session is not yours to skip.' using errcode = '42501';
  end if;

  select * into v_row from public.training_makeups
   where missed_booking_id = p_missed_booking_id
   for update;
  if found then
    if v_row.status = 'skipped' then
      return v_row;
    elsif v_row.status = 'offered' then
      raise exception 'A seat is booked for this make-up; decline it instead.' using errcode = '22023';
    elsif v_row.status = 'ineligible' then
      raise exception 'The facility has decided there is no make-up for this session.' using errcode = '22023';
    end if;
  end if;

  insert into public.training_makeups
    (facility_id, missed_booking_id, missed_session_id, pet_id, client_id, status, answered_at)
  values
    (v_missed.facility_id, p_missed_booking_id, v_missed.session_id, v_missed.pet_id,
     v_missed.client_id, 'skipped', now())
  on conflict (missed_booking_id) do update
     set status = 'skipped',
         answered_at = excluded.answered_at,
         updated_at = now()
  returning * into v_row;

  return v_row;
end;
$fn$;

-- ── Staff book a seat ─────────────────────────────────────────────────────

create or replace function public.offer_training_makeup(
  p_missed_booking_id uuid,
  p_host_session_id uuid,
  p_by_name text default null
)
returns public.training_makeups
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  v_missed  record;
  v_host    record;
  v_taken   integer;
  v_created record;
  v_row     public.training_makeups;
begin
  select * into v_missed from private.training_missed_booking(p_missed_booking_id);
  if not found or not private.has_permission(v_missed.facility_id, 'create_bookings') then
    raise exception 'Not allowed to offer a make-up for that session.' using errcode = '42501';
  end if;

  select * into v_row from public.training_makeups
   where missed_booking_id = p_missed_booking_id
   for update;
  if found and v_row.status = 'offered' then
    raise exception 'A seat is already booked for this make-up.' using errcode = '22023';
  elsif found and v_row.status = 'skipped' then
    raise exception 'The owner skipped this session.' using errcode = '22023';
  elsif found and v_row.status = 'ineligible' then
    raise exception 'This absence was marked ineligible.' using errcode = '22023';
  end if;

  -- Two offers into one session cannot both take its last seat.
  perform pg_advisory_xact_lock(hashtext(p_host_session_id::text));

  select s.start_at, s.end_at, s.status as session_status,
         ts.id as series_id, ts.facility_id, ts.location_id, ts.staff_id, ts.capacity,
         ts.status as series_status, ts.course_type_name,
         lower(btrim(coalesce(nullif(btrim(ts.course_type_name), ''), ts.name))) as course_key
    into v_host
    from public.training_series_sessions s
    join public.training_series ts on ts.id = s.series_id
   where s.id = p_host_session_id;

  if not found or v_host.facility_id <> v_missed.facility_id then
    raise exception 'That session is not at this facility.' using errcode = '22023';
  end if;
  if v_host.series_id = v_missed.series_id then
    raise exception 'A make-up is a session of another series.' using errcode = '22023';
  end if;
  if v_host.course_key <> v_missed.course_key then
    raise exception 'A make-up is a session of the same course.' using errcode = '22023';
  end if;
  if v_host.start_at <= now() or v_host.session_status <> 'scheduled'
     or v_host.series_status <> 'active' then
    raise exception 'That session has started, or is not running.' using errcode = '22023';
  end if;

  select count(*) into v_taken
    from public.bookings b
   where b.training_series_session_id = p_host_session_id
     and b.status::text not in ('cancelled', 'declined');
  if v_taken >= v_host.capacity then
    raise exception 'That session is full.' using errcode = '22023';
  end if;

  if exists (
    select 1
      from public.bookings b
      join public.booking_pets bp on bp.booking_id = b.id
     where b.training_series_session_id = p_host_session_id
       and bp.pet_id = v_missed.pet_id
       and b.status::text not in ('cancelled', 'declined')
  ) then
    raise exception 'That dog is already booked into that session.' using errcode = '22023';
  end if;

  select * into v_created from public.create_booking(
    jsonb_build_object(
      'facility_id', v_host.facility_id,
      'location_id', v_host.location_id,
      'client_id', v_missed.client_id,
      'service', 'training',
      'service_type', v_host.course_type_name,
      'status', 'confirmed',
      'start_at', v_host.start_at,
      'end_at', v_host.end_at,
      'assigned_staff_id', v_host.staff_id,
      'base_price', 0,
      'total_cost', 0,
      'training_series_session_id', p_host_session_id
    ),
    array[v_missed.pet_id],
    null,
    null
  );

  insert into public.training_makeups
    (facility_id, missed_booking_id, missed_session_id, pet_id, client_id, status,
     host_session_id, host_booking_id, offered_at, offered_by_name)
  values
    (v_missed.facility_id, p_missed_booking_id, v_missed.session_id, v_missed.pet_id,
     v_missed.client_id, 'offered', p_host_session_id, v_created.booking_id, now(),
     nullif(btrim(coalesce(p_by_name, '')), ''))
  on conflict (missed_booking_id) do update
     set status = 'offered',
         host_session_id = excluded.host_session_id,
         host_booking_id = excluded.host_booking_id,
         offered_at = excluded.offered_at,
         offered_by_name = excluded.offered_by_name,
         answered_at = null,
         updated_at = now()
  returning * into v_row;

  return v_row;
end;
$fn$;

-- ── The seat is turned down ───────────────────────────────────────────────

create or replace function public.decline_training_makeup(p_makeup_id uuid)
returns public.training_makeups
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  v_row public.training_makeups;
begin
  select * into v_row from public.training_makeups where id = p_makeup_id for update;
  if not found or private.training_makeup_actor(v_row.facility_id, v_row.client_id) is null then
    raise exception 'That make-up is not yours to decline.' using errcode = '42501';
  end if;
  if v_row.status = 'declined' then
    return v_row;
  end if;
  if v_row.status <> 'offered' then
    raise exception 'Only a booked make-up seat can be declined.' using errcode = '22023';
  end if;

  if v_row.host_booking_id is not null then
    if exists (
      select 1 from public.training_attendance a
       where a.booking_id = v_row.host_booking_id and a.checked_in_at is not null
    ) or exists (
      select 1 from public.bookings b
       where b.id = v_row.host_booking_id
         and b.status::text not in ('pending', 'request_submitted', 'confirmed', 'cancelled')
    ) then
      raise exception 'That make-up session has already started.' using errcode = '22023';
    end if;
    update public.bookings
       set status = 'cancelled'
     where id = v_row.host_booking_id
       and status::text <> 'cancelled';
  end if;

  update public.training_makeups
     set status = 'declined', answered_at = now(), updated_at = now()
   where id = v_row.id
  returning * into v_row;

  return v_row;
end;
$fn$;

-- ── Staff decide there is none ────────────────────────────────────────────

create or replace function public.mark_training_makeup_ineligible(
  p_missed_booking_id uuid,
  p_reason text,
  p_by_name text default null
)
returns public.training_makeups
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  v_missed record;
  v_row    public.training_makeups;
  v_reason text := nullif(btrim(coalesce(p_reason, '')), '');
begin
  select * into v_missed from private.training_missed_booking(p_missed_booking_id);
  if not found or not private.has_permission(v_missed.facility_id, 'create_bookings') then
    raise exception 'Not allowed to decide a make-up for that session.' using errcode = '42501';
  end if;
  if v_reason is null or length(v_reason) > 1000 then
    raise exception 'Say why there is no make-up.' using errcode = '22023';
  end if;

  select * into v_row from public.training_makeups
   where missed_booking_id = p_missed_booking_id
   for update;
  if found and v_row.status = 'offered' and v_row.host_booking_id is not null then
    if exists (
      select 1 from public.training_attendance a
       where a.booking_id = v_row.host_booking_id and a.checked_in_at is not null
    ) then
      raise exception 'That make-up session has already started.' using errcode = '22023';
    end if;
    update public.bookings
       set status = 'cancelled'
     where id = v_row.host_booking_id
       and status::text not in ('cancelled', 'completed');
  end if;

  insert into public.training_makeups
    (facility_id, missed_booking_id, missed_session_id, pet_id, client_id, status,
     ineligible_reason, decided_at, decided_by_name)
  values
    (v_missed.facility_id, p_missed_booking_id, v_missed.session_id, v_missed.pet_id,
     v_missed.client_id, 'ineligible', v_reason, now(),
     nullif(btrim(coalesce(p_by_name, '')), ''))
  on conflict (missed_booking_id) do update
     set status = 'ineligible',
         ineligible_reason = excluded.ineligible_reason,
         decided_at = excluded.decided_at,
         decided_by_name = excluded.decided_by_name,
         updated_at = now()
  returning * into v_row;

  return v_row;
end;
$fn$;

-- ── Reading ───────────────────────────────────────────────────────────────

-- Every missed session the caller may see, with its make-up. SECURITY INVOKER:
-- the bookings, sessions and make-ups policies decide what comes back, and
-- p_facility_id narrows staff to the facility on screen.
create or replace function public.training_missed_sessions(p_facility_id uuid default null)
returns table (
  booking_id          uuid,
  booking_ref         bigint,
  facility_id         uuid,
  booking_status      text,
  pet_ref             bigint,
  pet_name            text,
  client_ref          bigint,
  client_name         text,
  client_phone        text,
  client_email        text,
  series_id           uuid,
  series_name         text,
  course_name         text,
  session_id          uuid,
  session_number      integer,
  session_start_at    timestamptz,
  enrollment_id       uuid,
  enrollment_status   text,
  makeup_id           uuid,
  makeup_status       text,
  owner_note          text,
  ineligible_reason   text,
  requested_at        timestamptz,
  offered_at          timestamptz,
  offered_by_name     text,
  answered_at         timestamptz,
  decided_at          timestamptz,
  decided_by_name     text,
  host_session_id     uuid,
  host_session_number integer,
  host_start_at       timestamptz,
  host_series_id      uuid,
  host_series_name    text,
  host_booking_ref    bigint,
  host_booking_status text
)
language sql
stable
security invoker
set search_path = ''
as $fn$
  select b.id, b.ref, b.facility_id, b.status::text,
         p.ref, p.name, c.ref, c.name, c.phone, c.email,
         ts.id, ts.name, coalesce(nullif(btrim(ts.course_type_name), ''), ts.name),
         s.id, s.session_number, s.start_at,
         e.id, e.status,
         m.id, m.status, m.owner_note, m.ineligible_reason,
         m.requested_at, m.offered_at, m.offered_by_name,
         m.answered_at, m.decided_at, m.decided_by_name,
         hs.id, hs.session_number, hs.start_at, hts.id, hts.name,
         hb.ref, hb.status::text
    from public.bookings b
    join public.training_series_sessions s on s.id = b.training_series_session_id
    join public.training_series ts on ts.id = s.series_id
    join lateral (
      select x.pet_id from public.booking_pets x
       where x.booking_id = b.id
       order by x.pet_id
       limit 1
    ) bp on true
    join public.pets p on p.id = bp.pet_id
    join public.clients c on c.id = b.client_id
    left join lateral (
      select y.id, y.status from public.training_series_enrollments y
       where y.series_id = s.series_id and y.pet_id = bp.pet_id and y.client_id = b.client_id
       order by y.enrolled_at desc
       limit 1
    ) e on true
    left join public.training_makeups m on m.missed_booking_id = b.id
    left join public.bookings hb on hb.id = m.host_booking_id
    left join public.training_series_sessions hs on hs.id = m.host_session_id
    left join public.training_series hts on hts.id = hs.series_id
   where b.service = 'training'
     and (p_facility_id is null or b.facility_id = p_facility_id)
     and s.end_at < now()
     and b.status::text not in ('cancelled', 'declined')
     and (
       b.status::text = 'no_show'
       or not exists (
         select 1 from public.training_attendance a
          where a.booking_id = b.id and a.checked_in_at is not null
       )
     )
     and not exists (
       select 1 from public.training_makeups hm where hm.host_booking_id = b.id
     )
   order by s.start_at desc
   limit 1000;
$fn$;

-- The seats a make-up could take: a future session of the same course in
-- another active series of the facility, with room, that the dog is not
-- already in. The offer checks all of it again.
create or replace function public.training_makeup_host_sessions(p_missed_booking_id uuid)
returns table (
  session_id     uuid,
  series_id      uuid,
  series_name    text,
  session_number integer,
  start_at       timestamptz,
  end_at         timestamptz,
  location_name  text,
  trainer_name   text,
  seats_left     integer
)
language plpgsql
stable
security definer
set search_path = ''
as $fn$
declare
  v_missed record;
begin
  select * into v_missed from private.training_missed_booking(p_missed_booking_id);
  if not found or not private.has_permission(v_missed.facility_id, 'create_bookings') then
    raise exception 'Not allowed to offer a make-up for that session.' using errcode = '42501';
  end if;

  return query
    select q.sid, q.tsid, q.tsname, q.snum, q.sstart, q.send,
           q.lname, q.tname, (q.cap - q.taken)::integer
      from (
        select s.id as sid, ts.id as tsid, ts.name as tsname,
               s.session_number as snum, s.start_at as sstart, s.end_at as send,
               l.name as lname,
               nullif(btrim(concat_ws(' ', st.first_name, st.last_name)), '') as tname,
               ts.capacity as cap,
               (select count(*) from public.bookings b
                 where b.training_series_session_id = s.id
                   and b.status::text not in ('cancelled', 'declined')) as taken
          from public.training_series_sessions s
          join public.training_series ts on ts.id = s.series_id
          left join public.locations l on l.id = ts.location_id
          left join public.staff st on st.id = ts.staff_id
         where ts.facility_id = v_missed.facility_id
           and ts.id <> v_missed.series_id
           and ts.status = 'active'
           and s.status = 'scheduled'
           and s.start_at > now()
           and lower(btrim(coalesce(nullif(btrim(ts.course_type_name), ''), ts.name))) = v_missed.course_key
           and not exists (
             select 1
               from public.bookings b
               join public.booking_pets bp on bp.booking_id = b.id
              where b.training_series_session_id = s.id
                and bp.pet_id = v_missed.pet_id
                and b.status::text not in ('cancelled', 'declined')
           )
      ) q
     where q.taken < q.cap
     order by q.sstart
     limit 100;
end;
$fn$;

do $grants$
declare
  v_fn text;
begin
  foreach v_fn in array array[
    'public.request_training_makeup(uuid, text)',
    'public.skip_training_makeup(uuid)',
    'public.offer_training_makeup(uuid, uuid, text)',
    'public.decline_training_makeup(uuid)',
    'public.mark_training_makeup_ineligible(uuid, text, text)',
    'public.training_missed_sessions(uuid)',
    'public.training_makeup_host_sessions(uuid)'
  ] loop
    execute format('revoke all on function %s from public', v_fn);
    execute format('revoke all on function %s from anon', v_fn);
    execute format('grant execute on function %s to authenticated', v_fn);
  end loop;
end;
$grants$;

-- ── RLS ───────────────────────────────────────────────────────────────────

alter table public.training_makeups enable row level security;

revoke all on public.training_makeups from anon;
revoke all on public.training_makeups from authenticated;
grant select on public.training_makeups to authenticated;
grant all on public.training_makeups to service_role;

drop policy if exists training_makeups_read on public.training_makeups;
create policy training_makeups_read on public.training_makeups
  for select using (
    private.is_platform_admin()
    or private.has_permission(facility_id, 'create_bookings')
    or private.has_permission(facility_id, 'view_training_queue')
    or private.has_permission(facility_id, 'training_manage_programs')
    or client_id in (select private.own_client_ids())
  );

-- ── A revoke is not verified by having been written ───────────────────────

do $check$
begin
  if has_table_privilege('anon', 'public.training_makeups', 'select') then
    raise exception 'anon can read training make-ups';
  end if;
  if has_table_privilege('authenticated', 'public.training_makeups', 'insert')
     or has_table_privilege('authenticated', 'public.training_makeups', 'update')
     or has_table_privilege('authenticated', 'public.training_makeups', 'delete') then
    raise exception 'authenticated can write training make-ups without the functions';
  end if;
  if has_function_privilege('anon', 'public.offer_training_makeup(uuid, uuid, text)', 'execute')
     or has_function_privilege('anon', 'public.request_training_makeup(uuid, text)', 'execute')
     or has_function_privilege('anon', 'public.training_missed_sessions(uuid)', 'execute')
     or has_function_privilege('anon', 'private.training_missed_booking(uuid)', 'execute')
     or has_function_privilege('anon', 'private.training_makeup_actor(uuid, uuid)', 'execute') then
    raise exception 'anon can execute a training make-up function';
  end if;
  if not has_function_privilege('authenticated', 'public.decline_training_makeup(uuid)', 'execute') then
    raise exception 'authenticated cannot execute decline_training_makeup()';
  end if;
end;
$check$;
