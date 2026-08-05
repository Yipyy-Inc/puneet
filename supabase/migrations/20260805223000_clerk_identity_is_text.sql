-- ============================================================================
-- The identity of a caller becomes a Clerk `sub` (text), not a Supabase auth
-- user id (uuid).
--
-- ONE MIGRATION BY NECESSITY, not by preference. The identity columns and the
-- functions that compare against them cannot move independently: change either
-- side alone and every policy raises
-- `operator does not exist: text = uuid`. There is no ordering that keeps the
-- database working in between, so it is one transaction or none.
--
-- READ FROM THE LIVE CATALOG, NOT THE MIGRATION FILES. The two disagree — the
-- files carry superseded definitions — so every list below came from
-- pg_policy / pg_constraint / pg_proc on the running database.
--
-- WHY SO FEW POLICIES ARE TOUCHED. There are 220 policies in `public`, but 192
-- delegate to the private helpers and never name a column. Rewriting the 13
-- identity functions carries them all. Only 10 policies compare an id inline,
-- and they are exactly the 10 that block the type change. They are dropped and
-- recreated verbatim apart from the identity expression.
--
-- FIDELITY NOTE: four of those policies are `to public`, not `to authenticated`
-- (daycare_attendance_read, daycare_config_read, facility_rooms_read,
-- room_categories_read) — which contradicts the tenancy migration's own claim
-- that "every policy below is to authenticated". They are recreated AS FOUND.
-- Not exploitable (anon carries no subject, so the predicates match nothing),
-- but tightening them is a behaviour change and does not belong inside a type
-- migration. Flagged for a separate decision.
-- ============================================================================

-- ── 1. Drop the policies that depend on the identity columns ────────────────
-- Postgres refuses `alter column type` while a policy references the column.
-- Recreated verbatim in section 6.
drop policy "clients_read"                  on public.clients;
drop policy "clients_update"                on public.clients;
drop policy "daycare_attendance_read"       on public.daycare_attendance;
drop policy "daycare_config_read"           on public.daycare_config;
drop policy "memberships_read"              on public.facility_memberships;
drop policy "facility_rooms_read"           on public.facility_rooms;
drop policy "membership_permissions_read"   on public.membership_permissions;
drop policy "profiles_read"                 on public.profiles;
drop policy "profiles_update_self"          on public.profiles;
drop policy "room_categories_read"          on public.room_categories;

-- ── 2. Drop the foreign keys into auth.users ────────────────────────────────
-- auth.users stops being the source of truth for identity. GoTrue's own tables
-- (auth.identities, auth.sessions, …) keep their FKs and are simply unused.
alter table public.profiles                 drop constraint profiles_id_fkey;
alter table public.clients                  drop constraint clients_profile_id_fkey;
alter table public.facility_memberships     drop constraint facility_memberships_profile_id_fkey;
alter table public.booking_tip_allocations  drop constraint booking_tip_allocations_created_by_fkey;
alter table public.grooming_alert_notes     drop constraint grooming_alert_notes_created_by_fkey;
alter table public.grooming_price_adjustments drop constraint grooming_price_adjustments_created_by_fkey;
alter table public.grooming_ticket_comments drop constraint grooming_ticket_comments_created_by_fkey;
alter table public.training_attendance      drop constraint training_attendance_created_by_fkey;
alter table public.offboarding_task_states  drop constraint offboarding_task_states_completed_by_fkey;
alter table public.staff_documents          drop constraint staff_documents_uploaded_by_fkey;
alter table public.staff_signatures         drop constraint staff_signatures_signed_by_fkey;

-- ── 3. Retype the identity columns ──────────────────────────────────────────
-- Existing values are uuid strings. They are kept rather than cleared: the 9
-- current profiles still carry their memberships, and re-pointing them at Clerk
-- ids is a separate, deliberate step. Until then they simply match no caller.
alter table public.profiles                   alter column id           type text using id::text;
alter table public.clients                    alter column profile_id   type text using profile_id::text;
alter table public.facility_memberships       alter column profile_id   type text using profile_id::text;
alter table public.booking_tip_allocations    alter column created_by   type text using created_by::text;
alter table public.grooming_alert_notes       alter column created_by   type text using created_by::text;
alter table public.grooming_price_adjustments alter column created_by   type text using created_by::text;
alter table public.grooming_ticket_comments   alter column created_by   type text using created_by::text;
alter table public.training_attendance        alter column created_by   type text using created_by::text;
alter table public.offboarding_task_states    alter column completed_by type text using completed_by::text;
alter table public.staff_documents            alter column uploaded_by  type text using uploaded_by::text;
alter table public.staff_signatures           alter column signed_by    type text using signed_by::text;

-- ── 4. Restore referential integrity where it is safe ───────────────────────
-- clients.profile_id and facility_memberships.profile_id are re-pointed at
-- profiles(id) with their original delete actions. Both are written by
-- deliberate admin/linking flows, after the person exists.
alter table public.clients
  add constraint clients_profile_id_fkey
  foreign key (profile_id) references public.profiles (id) on delete set null;

alter table public.facility_memberships
  add constraint facility_memberships_profile_id_fkey
  foreign key (profile_id) references public.profiles (id) on delete cascade;

-- The 8 AUTHORSHIP columns are deliberately left WITHOUT a foreign key.
-- Re-pointing them at profiles(id) would look tidier and would be a bug: the
-- profile row is created by an asynchronous Clerk webhook, so a user who signs
-- in and writes before that webhook lands would have the write REJECTED by the
-- FK. Clerk's own guidance is not to put webhook delivery in a synchronous
-- path. An unmatched author id is recoverable; a refused write is not.

-- ── 5. The 13 functions that resolve the caller ─────────────────────────────
-- `(select auth.jwt()->>'sub')` rather than a bare call: the subquery form is
-- evaluated once per statement (InitPlan) instead of once per row.
--
-- NOTE auth.jwt() reads request.jwt.claims (JSON) and CANNOT see the scalar
-- request.jwt.claim.sub. The RLS test harness was converted to set the JSON
-- form in a prior commit for exactly this reason.

create or replace function private.is_platform_admin()
returns boolean language sql stable security definer set search_path = ''
as $$
  select coalesce(
    (select p.is_platform_admin from public.profiles p
      where p.id = (select auth.jwt()->>'sub')),
    false
  );
$$;

create or replace function private.member_facility_ids()
returns setof uuid language sql stable security definer set search_path = ''
as $$
  select m.facility_id
    from public.facility_memberships m
   where m.profile_id = (select auth.jwt()->>'sub')
     and m.is_active;
$$;

create or replace function private.has_permission(p_facility_id uuid, p_permission text)
returns boolean language sql stable security definer set search_path = ''
as $$
  select private.is_platform_admin() or exists (
    select 1
      from public.facility_memberships m
     where m.profile_id  = (select auth.jwt()->>'sub')
       and m.facility_id = p_facility_id
       and m.is_active
       and coalesce(private.resolve_permission(m.id, p_permission),
                    'none'::public.access_scope) <> 'none'::public.access_scope
  );
$$;

create or replace function private.client_facility_ids()
returns setof uuid language sql stable security definer set search_path = ''
as $$
  select distinct c.facility_id
    from public.clients c
   where c.profile_id = (select auth.jwt()->>'sub');
$$;

create or replace function private.own_client_ids()
returns setof uuid language sql stable security definer set search_path = ''
as $$
  select c.id from public.clients c
   where c.profile_id = (select auth.jwt()->>'sub');
$$;

create or replace function private.own_staff_ids()
returns setof uuid language sql stable security definer set search_path = ''
as $$
  select s.id
    from public.staff s
    join public.facility_memberships m on m.id = s.membership_id
   where m.profile_id = (select auth.jwt()->>'sub')
     and m.is_active;
$$;

create or replace function private.former_staff_ids()
returns setof uuid language sql stable security definer set search_path = ''
as $$
  select s.id from public.staff s
    join public.facility_memberships m on m.id = s.membership_id
   where m.profile_id = (select auth.jwt()->>'sub');
$$;

create or replace function private.grooming_adjustment_actor()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  if (select auth.jwt()->>'sub') is not null then
    new.created_by := (select auth.jwt()->>'sub');
  end if;
  return new;
end;
$$;

-- v_uid becomes text along with the columns it is written into.
create or replace function private.grooming_note_author()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare
  v_uid  text := (select auth.jwt()->>'sub');
  v_name text;
begin
  if v_uid is null then
    return new;
  end if;

  new.created_by := v_uid;

  select coalesce(nullif(btrim(p.full_name), ''), nullif(btrim(p.email), ''))
    into v_name
    from public.profiles p
   where p.id = v_uid;

  if v_name is not null then
    new.author_name := v_name;
  end if;

  return new;
end;
$$;

create or replace function private.stamp_author()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare
  v_uid  text := (select auth.jwt()->>'sub');
  v_name text;
begin
  if v_uid is null then
    return new;
  end if;
  new.created_by := v_uid;
  select coalesce(nullif(btrim(p.full_name), ''), nullif(btrim(p.email), ''))
    into v_name
    from public.profiles p where p.id = v_uid;
  if v_name is not null then
    new.author_name := v_name;
  end if;
  return new;
end;
$$;

create or replace function public.my_permissions()
returns table(permission_key text, scope public.access_scope)
language sql stable security definer set search_path = ''
as $$
  -- Platform admins are not staff anywhere and hold no membership, so the
  -- cascade has nothing to resolve for them. They get everything.
  select p.key, 'anytime'::public.access_scope
    from public.permissions p
   where private.is_platform_admin()

  union all

  select p.key,
         coalesce(
           private.resolve_permission(m.id, p.key),
           'none'::public.access_scope
         )
    from public.permissions p
    cross join (
      -- The caller's membership. `order by created_at` makes the choice
      -- deterministic for someone who works at two facilities; picking a
      -- facility properly is the multi-location follow-up, not something to
      -- guess at here.
      select fm.id
        from public.facility_memberships fm
       where fm.profile_id = (select auth.jwt()->>'sub')
         and fm.is_active
       order by fm.created_at
       limit 1
    ) m
   where not private.is_platform_admin();
$$;

-- THE ONE FUNCTION THAT NEEDED MORE THAN A SUBSTITUTION.
-- It previously read the caller's address out of auth.users. Under Clerk there
-- is no auth.users row, so that lookup would return null and the function would
-- silently link nothing — no error, just customers never matched to their
-- client record. The address now comes from public.profiles, which the Clerk
-- sync webhook populates.
--
-- Still idempotent and still safe to call on every sign-in, which is what makes
-- the webhook race benign: a call that arrives before the profile exists
-- returns null and the next sign-in links.
create or replace function public.link_client_record()
returns uuid language plpgsql security definer set search_path = ''
as $$
declare
  v_user_id text := (select auth.jwt()->>'sub');
  v_email   text;
  v_client  uuid;
begin
  if v_user_id is null then
    return null;
  end if;

  -- From the synced profile, not from an argument: a caller-supplied email
  -- would let anyone claim any unclaimed client record.
  select p.email into v_email from public.profiles p where p.id = v_user_id;
  if v_email is null then
    return null;
  end if;

  -- Already linked — idempotent, so this is safe to call on every sign-in.
  select c.id into v_client
    from public.clients c
   where c.profile_id = v_user_id
   limit 1;
  if v_client is not null then
    return v_client;
  end if;

  update public.clients c
     set profile_id = v_user_id
   where lower(c.email) = lower(v_email)
     and c.profile_id is null
  returning c.id into v_client;

  return v_client;
end;
$$;

create or replace function public.set_booking_tip_split(
  p_booking_ref bigint, p_method text, p_allocations jsonb)
returns integer language plpgsql security definer set search_path = ''
as $$
declare
  v_booking   public.bookings%rowtype;
  v_collected numeric(10,2);
  v_total     numeric(10,2) := 0;
  v_count     integer := 0;
  v_row       jsonb;
  v_staff     uuid;
begin
  if p_method not in ('by_service', 'equal', 'custom_percent', 'custom_amount') then
    raise exception 'Unknown split method "%".', p_method using errcode = '22023';
  end if;

  select * into v_booking from public.bookings where ref = p_booking_ref;
  if not found then
    raise exception 'That booking does not exist.' using errcode = 'P0002';
  end if;

  if not private.has_permission(v_booking.facility_id, 'take_payment') then
    raise exception 'Not allowed to split tips at this facility.'
      using errcode = '42501';
  end if;

  select coalesce(sum(p.tip), 0) into v_collected
    from public.payments p
   where p.booking_id = v_booking.id;

  delete from public.booking_tip_allocations where booking_id = v_booking.id;

  for v_row in select * from jsonb_array_elements(coalesce(p_allocations, '[]'::jsonb))
  loop
    select s.id into v_staff
      from public.staff s
     where s.id = (v_row->>'staffId')::uuid
       and s.facility_id = v_booking.facility_id;

    if v_staff is null then
      raise exception 'No such staff member at this facility: %.',
        coalesce(v_row->>'staffId', 'null') using errcode = '23503';
    end if;

    if (v_row->>'amount')::numeric <= 0 then
      continue;
    end if;

    insert into public.booking_tip_allocations
      (booking_id, facility_id, staff_id, amount, method, created_by, author_name)
    values
      (v_booking.id, v_booking.facility_id, v_staff,
       round((v_row->>'amount')::numeric, 2), p_method,
       (select auth.jwt()->>'sub'),
       (select p.full_name from public.profiles p
         where p.id = (select auth.jwt()->>'sub')));

    v_total := v_total + round((v_row->>'amount')::numeric, 2);
    v_count := v_count + 1;
  end loop;

  if v_total > v_collected + 0.005 then
    raise exception
      'Tips allocated (%) exceed the tips collected on this booking (%).',
      to_char(v_total, 'FM999999990.00'),
      to_char(v_collected, 'FM999999990.00')
      using errcode = '23514';
  end if;

  return v_count;
end $$;

-- The revokes from 20260805210403 do not survive `create or replace`'s
-- re-grant on some paths; re-assert them so V7 cannot regress.
revoke execute on function public.set_booking_tip_split(bigint, text, jsonb) from anon;
revoke execute on function public.link_client_record()                       from anon;
revoke execute on function public.my_permissions()                           from anon;

-- ── 6. Recreate the 10 policies, verbatim but for the identity expression ───

create policy "clients_read" on public.clients
for select to authenticated
using (
  private.is_platform_admin()
  or (profile_id = (select auth.jwt()->>'sub'))
  or private.has_permission(facility_id, 'view_clients')
);

create policy "clients_update" on public.clients
for update to authenticated
using (
  (profile_id = (select auth.jwt()->>'sub'))
  or private.has_permission(facility_id, 'edit_clients')
)
with check (
  (profile_id = (select auth.jwt()->>'sub'))
  or private.has_permission(facility_id, 'edit_clients')
);

create policy "daycare_attendance_read" on public.daycare_attendance
for select
using (
  private.is_platform_admin()
  or exists (
    select 1 from public.facility_memberships m
     where m.facility_id = daycare_attendance.facility_id
       and m.profile_id = (select auth.jwt()->>'sub')
       and m.is_active)
  or exists (
    select 1 from public.bookings b
     where b.id = daycare_attendance.booking_id
       and b.client_id in (select private.own_client_ids()))
);

create policy "daycare_config_read" on public.daycare_config
for select
using (
  private.is_platform_admin()
  or exists (
    select 1 from public.facility_memberships m
     where m.facility_id = daycare_config.facility_id
       and m.profile_id = (select auth.jwt()->>'sub')
       and m.is_active)
);

create policy "memberships_read" on public.facility_memberships
for select to authenticated
using (
  (profile_id = (select auth.jwt()->>'sub'))
  or private.is_platform_admin()
  or (facility_id in (select private.member_facility_ids()))
);

create policy "facility_rooms_read" on public.facility_rooms
for select
using (
  private.is_platform_admin()
  or exists (
    select 1 from public.facility_memberships m
     where m.facility_id = facility_rooms.facility_id
       and m.profile_id = (select auth.jwt()->>'sub')
       and m.is_active)
);

create policy "membership_permissions_read" on public.membership_permissions
for select to authenticated
using (
  private.is_platform_admin()
  or exists (
    select 1 from public.facility_memberships m
     where m.id = membership_permissions.membership_id
       and ((m.profile_id = (select auth.jwt()->>'sub'))
         or (m.facility_id in (select private.member_facility_ids()))))
);

create policy "profiles_read" on public.profiles
for select to authenticated
using (
  (id = (select auth.jwt()->>'sub'))
  or private.is_platform_admin()
  or exists (
    select 1 from public.facility_memberships m
     where m.profile_id = profiles.id
       and m.facility_id in (select private.member_facility_ids()))
);

create policy "profiles_update_self" on public.profiles
for update to authenticated
using      (id = (select auth.jwt()->>'sub'))
with check (id = (select auth.jwt()->>'sub'));

create policy "room_categories_read" on public.room_categories
for select
using (
  private.is_platform_admin()
  or exists (
    select 1 from public.facility_memberships m
     where m.facility_id = room_categories.facility_id
       and m.profile_id = (select auth.jwt()->>'sub')
       and m.is_active)
);
