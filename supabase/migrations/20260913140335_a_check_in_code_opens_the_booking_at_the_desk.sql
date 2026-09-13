-- ============================================================================
-- A check-in code opens the booking at the desk.
--
-- ── WHAT IT REPLACES ──────────────────────────────────────────────────────
--
-- The QR code an owner showed at the facility encoded a token kept in an
-- in-memory Map (src/lib/qr-checkin.ts) in the browser that made it — so a
-- code made on the owner's phone could never be read on the facility's
-- tablet. The kiosk found bookings in a fixture, and what it "recorded" at
-- the desk (the override reason, the medications and belongings gone
-- through) was pushed to arrays that vanished with the tab.
--
-- ── THE CODE ──────────────────────────────────────────────────────────────
--
-- The same scheme as the review-survey token (20260829090000): the server
-- mints 32 random bytes, stores only their sha256 (`token_hash`, one per
-- booking), and hands the owner the token once. Showing a new code replaces
-- the old one, so an old screenshot stops working. A code expires with its
-- booking (never sooner than twelve hours after the start).
--
-- issue_yipyy_go_check_in_pass() is the owner's, for a booking that is still
-- arriving and asks for a pre-arrival form. resolve_yipyy_go_check_in_pass()
-- is the desk's: one empty answer for a code that is too short, too long,
-- unknown or expired, for a booking that is not arriving, and for a booking
-- this member may not check in — the permission that service's own check-in
-- needs (private.yipyy_go_may_check_in). Nobody reads the passes table, and
-- nobody but those functions computes a hash.
--
-- ── THE DESK ──────────────────────────────────────────────────────────────
--
-- record_yipyy_go_desk_check() writes what the desk confirmed for EVERY dog
-- on the booking, how the booking was found, where each dog's form stood,
-- and — when a mandatory form is missing — why the dog came in anyway (22023
-- with hint `override_reason_required` until a reason is given). The arrival
-- itself is still each service's own check-in; this is the record around it.
--
-- yipyy_go_arrivals() is today at the facility, on its own calendar — plus a
-- boarding stay that began earlier and has not arrived — searchable by a
-- dog's or client's name (a plain substring, never a LIKE pattern) or the
-- booking number. SECURITY INVOKER: the bookings policy decides what the desk
-- sees.
-- ============================================================================

-- ── The code ──────────────────────────────────────────────────────────────

create or replace function private.hash_check_in_token(p_token text)
returns bytea
language sql
immutable
set search_path = ''
as $fn$
  select extensions.digest(p_token, 'sha256');
$fn$;

revoke all on function private.hash_check_in_token(text) from public;
revoke all on function private.hash_check_in_token(text) from anon;
revoke all on function private.hash_check_in_token(text) from authenticated;

create table if not exists public.yipyy_go_check_in_passes (
  booking_id       uuid primary key references public.bookings(id) on delete cascade,
  facility_id      uuid not null references public.facilities(id) on delete cascade,
  token_hash       bytea not null unique check (octet_length(token_hash) = 32),
  token_expires_at timestamptz not null,
  issued_at        timestamptz not null default now(),
  issued_by        text default (auth.jwt() ->> 'sub'),
  rotations        integer not null default 0 check (rotations >= 0)
);

comment on table public.yipyy_go_check_in_passes is
  'The check-in code an owner shows at the desk: one per booking, stored as the sha256 of a random token (the token itself is never stored). Showing a new code replaces the old one. Read and written only through issue_ and resolve_yipyy_go_check_in_pass(). Replaces an in-memory Map that could not be read on any other device (2026-09-13).';

alter table public.yipyy_go_check_in_passes enable row level security;
revoke all on public.yipyy_go_check_in_passes from public;
revoke all on public.yipyy_go_check_in_passes from anon;
revoke all on public.yipyy_go_check_in_passes from authenticated;
grant all on public.yipyy_go_check_in_passes to service_role;

create or replace function public.issue_yipyy_go_check_in_pass(p_booking_id uuid, p_token_hash bytea)
returns timestamptz
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  v_booking public.bookings;
  v_expires timestamptz;
begin
  select * into v_booking from public.bookings where id = p_booking_id;
  if not found or not private.yipyy_go_is_owner(v_booking.client_id) then
    raise exception 'That booking is not yours.' using errcode = '42501';
  end if;
  if p_token_hash is null or octet_length(p_token_hash) <> 32 then
    raise exception 'That is not a check-in code.' using errcode = '22023';
  end if;
  if v_booking.status::text not in ('pending', 'request_submitted', 'estimate_sent', 'waitlisted', 'confirmed')
     or v_booking.end_at < now()
     or exists (
       select 1 from public.booking_presence p
        where p.booking_id = p_booking_id and p.arrived_at is not null
     )
  then
    raise exception 'This booking is not arriving.' using errcode = '22023';
  end if;
  if private.yipyy_go_requirement(v_booking.facility_id, v_booking.service) is null then
    raise exception 'This booking does not use a check-in code.' using errcode = '22023';
  end if;

  v_expires := greatest(v_booking.end_at, v_booking.start_at + interval '12 hours');

  insert into public.yipyy_go_check_in_passes as cp (booking_id, facility_id, token_hash, token_expires_at)
  values (p_booking_id, v_booking.facility_id, p_token_hash, v_expires)
  on conflict (booking_id) do update
     set token_hash = excluded.token_hash,
         token_expires_at = excluded.token_expires_at,
         issued_at = now(),
         issued_by = excluded.issued_by,
         rotations = cp.rotations + 1;

  return v_expires;
end;
$fn$;

-- The desk reads a code. One empty answer for a code that is too short, too
-- long, unknown, expired, for a booking that is not arriving, or for a booking
-- this member may not check in.
create or replace function public.resolve_yipyy_go_check_in_pass(p_token text)
returns table (booking_id uuid, booking_ref bigint)
language plpgsql
stable
security definer
set search_path = ''
as $fn$
begin
  if p_token is null or length(p_token) < 16 or length(p_token) > 128 then
    return;
  end if;

  return query
    select b.id, b.ref
      from public.yipyy_go_check_in_passes cp
      join public.bookings b on b.id = cp.booking_id
     where cp.token_hash = private.hash_check_in_token(p_token)
       and cp.token_expires_at > now()
       and b.status::text not in ('cancelled', 'declined', 'no_show', 'completed')
       and private.yipyy_go_may_check_in(b.facility_id, b.service);
end;
$fn$;

-- ── The desk ──────────────────────────────────────────────────────────────

create table if not exists public.yipyy_go_desk_checks (
  id                    uuid primary key default gen_random_uuid(),
  facility_id           uuid not null references public.facilities(id) on delete cascade,
  booking_id            uuid not null references public.bookings(id) on delete cascade,
  pet_id                uuid not null references public.pets(id) on delete cascade,
  source                text not null check (source in ('code', 'search')),
  medications_confirmed boolean not null default false,
  belongings_confirmed  boolean not null default false,
  requirement           text check (requirement is null or requirement in ('mandatory', 'optional')),
  form_status           text not null,
  form_missing          boolean not null,
  override_reason       text check (override_reason is null or length(btrim(override_reason)) between 1 and 1000),
  recorded_by           text default (auth.jwt() ->> 'sub'),
  recorded_by_name      text check (recorded_by_name is null or length(recorded_by_name) between 1 and 200),
  created_at            timestamptz not null default now(),
  constraint yipyy_go_desk_checks_missing_form_says_why check (not form_missing or override_reason is not null)
);

comment on table public.yipyy_go_desk_checks is
  'What the desk confirmed when a dog was checked in from the kiosk: how it was found (code or search), that medications and belongings were gone through, where its pre-arrival form stood — and, when a mandatory form was missing, why it came in anyway. Replaces an in-memory audit array (2026-09-13). The arrival itself is the service''s own check-in.';

create index if not exists yipyy_go_desk_checks_booking_idx on public.yipyy_go_desk_checks (booking_id, created_at desc);

create or replace function public.record_yipyy_go_desk_check(
  p_booking_id uuid,
  p_pets jsonb,
  p_source text,
  p_by_name text default null
)
returns setof public.yipyy_go_desk_checks
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  v_booking     public.bookings;
  v_requirement text;
  v_pet         record;
  v_entry       jsonb;
  v_status      text;
  v_missing     boolean;
  v_reason      text;
  v_row         public.yipyy_go_desk_checks;
begin
  select * into v_booking from public.bookings where id = p_booking_id;
  if not found or not private.yipyy_go_may_check_in(v_booking.facility_id, v_booking.service) then
    raise exception 'That booking is not yours to check in.' using errcode = '42501';
  end if;
  if v_booking.status::text in ('cancelled', 'declined', 'no_show', 'completed') then
    raise exception 'This booking is not arriving.' using errcode = '22023';
  end if;
  if p_source is null or p_source not in ('code', 'search') then
    raise exception 'Say how the booking was found.' using errcode = '22023';
  end if;
  if p_pets is null or jsonb_typeof(p_pets) <> 'array'
     or (select count(*) from jsonb_array_elements(p_pets)) <> (
       select count(*) from public.booking_pets bp where bp.booking_id = p_booking_id
     )
     or exists (
       select 1 from public.booking_pets bp
        where bp.booking_id = p_booking_id
          and not exists (
            select 1 from jsonb_array_elements(p_pets) e(value)
             where e.value ->> 'petId' = bp.pet_id::text
          )
     )
  then
    raise exception 'Check in every dog on the booking.' using errcode = '22023';
  end if;

  v_requirement := private.yipyy_go_requirement(v_booking.facility_id, v_booking.service);

  for v_pet in
    select p.id, p.name
      from public.booking_pets bp
      join public.pets p on p.id = bp.pet_id
     where bp.booking_id = p_booking_id
     order by p.name
  loop
    select e.value into v_entry from jsonb_array_elements(p_pets) e(value)
     where e.value ->> 'petId' = v_pet.id::text
     limit 1;

    select coalesce(
      (select y.status from public.yipyy_go_submissions y
        where y.booking_id = p_booking_id and y.pet_id = v_pet.id),
      'not_started') into v_status;
    v_missing := v_requirement = 'mandatory'
                 and v_status not in ('submitted', 'approved', 'completed_by_staff');
    v_reason := nullif(btrim(coalesce(v_entry ->> 'overrideReason', '')), '');

    if v_missing and v_reason is null then
      raise exception 'Say why % is checking in without the form.', v_pet.name
        using errcode = '22023', hint = 'override_reason_required';
    end if;
    if v_reason is not null and length(v_reason) > 1000 then
      raise exception 'Keep the reason under 1,000 characters.' using errcode = '22023';
    end if;

    insert into public.yipyy_go_desk_checks
      (facility_id, booking_id, pet_id, source, medications_confirmed, belongings_confirmed,
       requirement, form_status, form_missing, override_reason, recorded_by_name)
    values
      (v_booking.facility_id, p_booking_id, v_pet.id, p_source,
       coalesce((v_entry ->> 'medicationsConfirmed')::boolean, false),
       coalesce((v_entry ->> 'belongingsConfirmed')::boolean, false),
       v_requirement, v_status, v_missing, case when v_missing then v_reason else null end,
       nullif(left(btrim(coalesce(p_by_name, '')), 200), ''))
    returning * into v_row;

    return next v_row;
  end loop;
end;
$fn$;

-- ── Today's arrivals ──────────────────────────────────────────────────────

-- SECURITY INVOKER: the bookings policy decides what the desk may see. The
-- facility's day, not UTC; a boarding stay that began earlier and has not yet
-- arrived is still expected. The search is a plain substring (no LIKE
-- pattern), or a booking number.
create or replace function public.yipyy_go_arrivals(p_facility_id uuid, p_query text default null)
returns table (
  booking_id   uuid,
  booking_ref  bigint,
  service      text,
  status       text,
  start_at     timestamptz,
  end_at       timestamptz,
  client_name  text,
  pets         jsonb,
  requirement  text,
  form_status  text,
  satisfied    boolean,
  presence     text
)
language sql
stable
security invoker
set search_path = ''
as $fn$
  with z as (
    select coalesce(
      (select nullif(f.timezone, '') from public.facilities f where f.id = p_facility_id),
      'America/Toronto'
    ) as tz
  ), q as (
    select nullif(btrim(coalesce(p_query, '')), '') as needle
  )
  select b.id, b.ref, b.service, b.status::text, b.start_at, b.end_at, c.name,
         coalesce((
           select jsonb_agg(jsonb_build_object('id', p.id, 'ref', p.ref, 'name', p.name) order by p.name)
             from public.booking_pets bp
             join public.pets p on p.id = bp.pet_id
            where bp.booking_id = b.id
         ), '[]'::jsonb),
         yg.requirement, yg.status, yg.satisfied, pr.presence
    from public.bookings b
    cross join z
    cross join q
    join public.clients c on c.id = b.client_id
    left join public.booking_yipyy_go yg on yg.booking_id = b.id
    left join public.booking_presence pr on pr.booking_id = b.id
   where p_facility_id is not null
     and b.facility_id = p_facility_id
     and b.status::text in ('pending', 'request_submitted', 'confirmed', 'checked_in')
     and (
       (timezone(z.tz, b.start_at))::date = (timezone(z.tz, now()))::date
       or (
         b.service = 'boarding'
         and (timezone(z.tz, b.start_at))::date < (timezone(z.tz, now()))::date
         and (timezone(z.tz, b.end_at))::date >= (timezone(z.tz, now()))::date
         and coalesce(pr.presence, 'expected') = 'expected'
       )
     )
     and (
       q.needle is null
       or strpos(lower(coalesce(c.name, '')), lower(q.needle)) > 0
       or b.ref::text = q.needle
       or exists (
         select 1 from public.booking_pets bp2
           join public.pets p2 on p2.id = bp2.pet_id
          where bp2.booking_id = b.id
            and strpos(lower(p2.name), lower(q.needle)) > 0
       )
     )
   order by b.start_at
   limit 200;
$fn$;

-- ── Grants and RLS ────────────────────────────────────────────────────────

do $grants$
declare
  v_fn text;
begin
  foreach v_fn in array array[
    'public.issue_yipyy_go_check_in_pass(uuid, bytea)',
    'public.resolve_yipyy_go_check_in_pass(text)',
    'public.record_yipyy_go_desk_check(uuid, jsonb, text, text)',
    'public.yipyy_go_arrivals(uuid, text)'
  ] loop
    execute format('revoke all on function %s from public', v_fn);
    execute format('revoke all on function %s from anon', v_fn);
    execute format('grant execute on function %s to authenticated', v_fn);
  end loop;
end;
$grants$;

alter table public.yipyy_go_desk_checks enable row level security;

revoke all on public.yipyy_go_desk_checks from public;
revoke all on public.yipyy_go_desk_checks from anon;
revoke all on public.yipyy_go_desk_checks from authenticated;
grant select on public.yipyy_go_desk_checks to authenticated;
grant all on public.yipyy_go_desk_checks to service_role;

drop policy if exists yipyy_go_desk_checks_read on public.yipyy_go_desk_checks;
create policy yipyy_go_desk_checks_read on public.yipyy_go_desk_checks
  for select using (
    private.is_platform_admin()
    or private.has_permission(facility_id, 'view_bookings')
  );

-- ── A revoke is not verified by having been written ───────────────────────

do $check$
begin
  if has_table_privilege('authenticated', 'public.yipyy_go_check_in_passes', 'select')
     or has_table_privilege('anon', 'public.yipyy_go_check_in_passes', 'select') then
    raise exception 'a check-in code hash is readable';
  end if;
  if has_function_privilege('authenticated', 'private.hash_check_in_token(text)', 'execute')
     or has_function_privilege('anon', 'private.hash_check_in_token(text)', 'execute') then
    raise exception 'the check-in token hash is callable';
  end if;
  if has_table_privilege('anon', 'public.yipyy_go_desk_checks', 'select')
     or has_table_privilege('authenticated', 'public.yipyy_go_desk_checks', 'insert') then
    raise exception 'desk checks are writable or readable without the functions';
  end if;
  if has_function_privilege('anon', 'public.resolve_yipyy_go_check_in_pass(text)', 'execute')
     or has_function_privilege('anon', 'public.issue_yipyy_go_check_in_pass(uuid, bytea)', 'execute')
     or has_function_privilege('anon', 'public.record_yipyy_go_desk_check(uuid, jsonb, text, text)', 'execute')
     or has_function_privilege('anon', 'public.yipyy_go_arrivals(uuid, text)', 'execute') then
    raise exception 'anon can execute a check-in function';
  end if;
  if not has_function_privilege('authenticated', 'public.resolve_yipyy_go_check_in_pass(text)', 'execute') then
    raise exception 'authenticated cannot resolve a check-in code';
  end if;
end;
$check$;
