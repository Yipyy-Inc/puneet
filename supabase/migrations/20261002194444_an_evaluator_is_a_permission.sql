-- ============================================================================
-- "Run evaluations" — who meets a new dog and records how it went (the
-- client's evaluation mocks, 2026-10-02).
--
-- `view_evaluations` let a person SEE the Evaluations page and nothing more;
-- nobody could record a result anywhere but their own browser. The page now
-- starts and finishes evaluations for real, so doing one is a permission of
-- its own — and the staff who hold it are the "Evaluator" choices a booking
-- offers ("First available · Sarah Johnson · Emily Davis …").
--
-- The catalogue lives in TypeScript (src/types/facility-staff.ts) and
-- supabase/seed.sql is generated from it (`bun run db:seed:generate`); this
-- carries the same rows into a database that was seeded before the key
-- existed. Idempotent: the seed may already have run.
--
--   owner, admin, manager   anytime
--   supervisor              during operating hours (as they view evaluations)
--   daycare attendant       on their assigned shifts — and they now SEE the
--                           page too, since they run what is on it
--   boarding attendant      anytime, the same
-- ============================================================================

insert into public.permissions (key, category, is_personal, description)
values ('perform_evaluations', 'bookings', false, 'Run evaluations')
on conflict (key) do update
  set category = excluded.category,
      is_personal = excluded.is_personal,
      description = excluded.description;

insert into public.role_preset_permissions (role, permission_key, scope)
values
  ('owner', 'perform_evaluations', 'anytime'),
  ('admin', 'perform_evaluations', 'anytime'),
  ('manager', 'perform_evaluations', 'anytime'),
  ('supervisor', 'perform_evaluations', 'operating_hours'),
  ('daycare_attendant', 'view_evaluations', 'assigned_shifts'),
  ('daycare_attendant', 'perform_evaluations', 'assigned_shifts'),
  ('boarding_attendant', 'view_evaluations', 'anytime'),
  ('boarding_attendant', 'perform_evaluations', 'anytime')
on conflict (role, permission_key) do update set scope = excluded.scope;

-- ============================================================================
-- Who the evaluators are: active staff holding "Run evaluations".
--
-- A member holds it as `private.resolve_permission` says — the same answer
-- `private.has_permission` gives when they press Start. A staff row with no
-- login yet (a person a facility schedules but never invited) holds it
-- through the roles on the row, as the role editor grants them, so a facility
-- can list its handlers before they ever sign in.
-- ============================================================================

create or replace function private.staff_holds(
  p_staff_id uuid,
  p_permission text
) returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when st.membership_id is not null then
      coalesce(
        private.resolve_permission(st.membership_id, p_permission),
        'none'::public.access_scope
      ) <> 'none'::public.access_scope
    else exists (
      select 1
        from unnest(array[st.primary_role] || st.additional_roles) as held(role)
       where coalesce(
               (select frp.scope
                  from public.facility_role_permissions frp
                 where frp.facility_id = st.facility_id
                   and frp.role = held.role
                   and frp.permission_key = p_permission),
               (select rpp.scope
                  from public.role_preset_permissions rpp
                 where rpp.role = held.role
                   and rpp.permission_key = p_permission),
               'none'::public.access_scope
             ) <> 'none'::public.access_scope
    )
  end
    from public.staff st
   where st.id = p_staff_id;
$$;

revoke all on function private.staff_holds(uuid, text) from public;
revoke all on function private.staff_holds(uuid, text) from anon;

/**
 * The facility's evaluators, in the facility's own staff order. Staff of that
 * facility may ask (the wizard's "Evaluator" cards); the service role asks on
 * a customer's behalf, after the customer route has shown they are a client
 * there, and passes on first names and initials only.
 */
create or replace function public.facility_evaluators(p_facility_id uuid)
returns table (
  staff_id uuid,
  membership_id uuid,
  first_name text,
  last_name text,
  job_title text,
  primary_role text
)
language sql
stable
security definer
set search_path = ''
as $$
  select st.id, st.membership_id, st.first_name, st.last_name, st.job_title,
         st.primary_role::text
    from public.staff st
   where st.facility_id = p_facility_id
     and st.status = 'active'
     and private.staff_holds(st.id, 'perform_evaluations')
     and (
       (select auth.role()) = 'service_role'
       or exists (
         select 1
           from public.facility_memberships m
          where m.profile_id = (select auth.jwt()->>'sub')
            and m.facility_id = p_facility_id
            and m.is_active
       )
       -- A platform admin looking after the facility.
       or private.has_permission(p_facility_id, 'view_evaluations')
     )
   order by st.created_at, st.id;
$$;

revoke all on function public.facility_evaluators(uuid) from public;
revoke all on function public.facility_evaluators(uuid) from anon;
grant execute on function public.facility_evaluators(uuid) to authenticated;
grant execute on function public.facility_evaluators(uuid) to service_role;
