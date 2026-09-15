-- ============================================================================
-- A staff notification is a row, addressed to one person.
--
-- The bell, the notification centre, the per-role defaults and each person's
-- own preferences were browser stores: a seeded array in localStorage that
-- every viewer saw, and two localStorage maps keyed on six roles the database
-- does not have. Nothing a facility set reached anybody.
--
-- ── WHAT THIS ADDS ────────────────────────────────────────────────────────
--
--   staff_notifications             one row per recipient; the recipient reads
--                                   their own and changes only read/archived,
--                                   through two functions
--   staff_notification_preferences  one row per membership: in_app and email
--                                   switches per category, written through
--                                   save_my_notification_preferences
--   notify_staff(...)               SERVICE ROLE ONLY. Fans an event out: every
--                                   active member of the facility who holds the
--                                   kind's permission, whose own switch (or, if
--                                   unset, their role's default) is on — or all
--                                   of them when the kind is mandatory. Returns
--                                   who was newly notified and who wants email.
--
-- The kind's category, permission, urgency and mandatory flag, and the role
-- defaults, are passed in by the one caller (lib/notifications/notify-staff.ts,
-- reading lib/notifications/catalog.ts), so there is one list of them.
-- ============================================================================

create table public.staff_notifications (
  id uuid primary key default gen_random_uuid(),
  facility_id uuid not null references public.facilities (id) on delete cascade,
  membership_id uuid not null references public.facility_memberships (id) on delete cascade,
  recipient_profile_id text not null,
  kind text not null check (kind ~ '^[a-z_]{3,40}$'),
  category text not null
    check (category in ('bookings', 'forms', 'schedule', 'incidents', 'estimates')),
  urgent boolean not null default false,
  params jsonb not null default '{}'::jsonb
    check (jsonb_typeof(params) = 'object' and pg_column_size(params) <= 4096),
  link text check (
    link is null
    or (link like '/%' and link not like '//%' and position('\' in link) = 0 and length(link) <= 512)
  ),
  source_id uuid,
  dedupe_key text not null check (length(dedupe_key) between 1 and 200),
  read_at timestamptz,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  unique (membership_id, dedupe_key)
);

create index staff_notifications_inbox_idx
  on public.staff_notifications (recipient_profile_id, facility_id, created_at desc);
create index staff_notifications_unread_idx
  on public.staff_notifications (recipient_profile_id, facility_id)
  where read_at is null and archived_at is null;

alter table public.staff_notifications enable row level security;

create policy staff_notifications_read on public.staff_notifications
  for select to authenticated
  using (recipient_profile_id = (select auth.jwt()->>'sub'));

revoke all on public.staff_notifications from public, anon, authenticated;
grant select on public.staff_notifications to authenticated;

create table public.staff_notification_preferences (
  membership_id uuid primary key references public.facility_memberships (id) on delete cascade,
  facility_id uuid not null references public.facilities (id) on delete cascade,
  profile_id text not null,
  in_app jsonb not null default '{}'::jsonb check (jsonb_typeof(in_app) = 'object'),
  email jsonb not null default '{}'::jsonb check (jsonb_typeof(email) = 'object'),
  updated_at timestamptz not null default now()
);

alter table public.staff_notification_preferences enable row level security;

create policy staff_notification_preferences_read on public.staff_notification_preferences
  for select to authenticated
  using (profile_id = (select auth.jwt()->>'sub'));

revoke all on public.staff_notification_preferences from public, anon, authenticated;
grant select on public.staff_notification_preferences to authenticated;

-- ── Switches are category → boolean, and nothing else ─────────────────────

create or replace function private.clean_notification_switches(p_value jsonb)
returns jsonb
language sql
immutable
set search_path = ''
as $$
  select coalesce(jsonb_object_agg(e.key, e.value), '{}'::jsonb)
    from jsonb_each(coalesce(p_value, '{}'::jsonb)) as e
   where e.key in ('bookings', 'forms', 'schedule', 'incidents', 'estimates')
     and jsonb_typeof(e.value) = 'boolean';
$$;

-- ── The caller's own role and preferences at one facility ─────────────────

create or replace function public.my_notification_preferences(p_facility_id uuid)
returns table (membership_id uuid, role text, in_app jsonb, email jsonb)
language sql
stable
security definer
set search_path = ''
as $$
  select m.id, m.role::text,
         coalesce(p.in_app, '{}'::jsonb),
         coalesce(p.email, '{}'::jsonb)
    from public.facility_memberships m
    left join public.staff_notification_preferences p on p.membership_id = m.id
   where m.facility_id = p_facility_id
     and m.is_active
     and m.profile_id = (select auth.jwt()->>'sub')
   limit 1;
$$;

create or replace function public.save_my_notification_preferences(
  p_facility_id uuid,
  p_in_app jsonb,
  p_email jsonb
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_membership public.facility_memberships;
begin
  select * into v_membership
    from public.facility_memberships m
   where m.facility_id = p_facility_id
     and m.is_active
     and m.profile_id = (select auth.jwt()->>'sub')
   limit 1;
  if not found then
    raise exception 'You are not a member of this facility.' using errcode = '42501';
  end if;

  insert into public.staff_notification_preferences
    (membership_id, facility_id, profile_id, in_app, email, updated_at)
  values (
    v_membership.id, v_membership.facility_id, v_membership.profile_id,
    private.clean_notification_switches(p_in_app),
    private.clean_notification_switches(p_email),
    now()
  )
  on conflict (membership_id) do update
     set in_app = excluded.in_app,
         email = excluded.email,
         updated_at = now();
end;
$$;

-- ── Read and archive: the recipient's own rows, and only those columns ────

create or replace function public.set_my_notification_state(
  p_id uuid,
  p_read boolean default null,
  p_archived boolean default null
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_found boolean;
begin
  update public.staff_notifications n
     set read_at = case
                     when p_read is null then n.read_at
                     when p_read then coalesce(n.read_at, now())
                     else null
                   end,
         archived_at = case
                         when p_archived is null then n.archived_at
                         when p_archived then coalesce(n.archived_at, now())
                         else null
                       end
   where n.id = p_id
     and n.recipient_profile_id = (select auth.jwt()->>'sub');
  v_found := found;
  if not v_found then
    raise exception 'No such notification.' using errcode = '42501';
  end if;
  return true;
end;
$$;

create or replace function public.mark_all_my_notifications_read(p_facility_id uuid)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count integer;
begin
  update public.staff_notifications n
     set read_at = now()
   where n.facility_id = p_facility_id
     and n.recipient_profile_id = (select auth.jwt()->>'sub')
     and n.read_at is null
     and n.archived_at is null;
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

-- ── The fan-out. Service role only. ───────────────────────────────────────

create or replace function public.notify_staff(
  p_facility_id uuid,
  p_kind text,
  p_category text,
  p_permission text,
  p_mandatory boolean,
  p_urgent boolean,
  p_params jsonb,
  p_link text,
  p_source_id uuid,
  p_dedupe_key text,
  p_role_defaults jsonb,
  p_actor_profile_id text default null,
  p_only_memberships uuid[] default null
)
returns table (
  membership_id uuid,
  email text,
  full_name text,
  created boolean,
  send_email boolean
)
language plpgsql
security definer
set search_path = ''
as $$
#variable_conflict use_column
begin
  return query
  with candidates as (
    select m.id as mid,
           m.profile_id,
           m.role::text as member_role,
           p.email as member_email,
           p.full_name as member_name,
           pref.in_app as pref_in_app,
           pref.email as pref_email
      from public.facility_memberships m
      join public.profiles p on p.id = m.profile_id
      left join public.staff_notification_preferences pref on pref.membership_id = m.id
      left join public.facility_subscriptions s on s.facility_id = m.facility_id
     where m.facility_id = p_facility_id
       and m.is_active
       and coalesce(s.status, 'active') not in ('suspended', 'cancelled')
       -- Nobody is told about what they just did themselves.
       and (p_actor_profile_id is null or m.profile_id <> p_actor_profile_id)
       and (p_only_memberships is null or m.id = any (p_only_memberships))
       and (
         p_permission is null
         or coalesce(private.resolve_permission(m.id, p_permission), 'none'::public.access_scope)
            <> 'none'::public.access_scope
       )
  ),
  decided as (
    select c.*,
           (
             p_mandatory
             or coalesce(
                  (c.pref_in_app ->> p_category)::boolean,
                  -- A notice addressed to one person is on unless they said no.
                  p_only_memberships is not null
                  or coalesce(p_role_defaults -> c.member_role, '[]'::jsonb) ? p_category
                )
           ) as in_app_on,
           coalesce((c.pref_email ->> p_category)::boolean, false) as email_on
      from candidates c
  ),
  inserted as (
    insert into public.staff_notifications as n
      (facility_id, membership_id, recipient_profile_id, kind, category, urgent,
       params, link, source_id, dedupe_key)
    select p_facility_id, d.mid, d.profile_id, p_kind, p_category, p_urgent,
           coalesce(p_params, '{}'::jsonb), p_link, p_source_id, p_dedupe_key
      from decided d
     where d.in_app_on
    on conflict on constraint staff_notifications_membership_id_dedupe_key_key do nothing
    returning n.membership_id
  )
  select d.mid,
         d.member_email::text,
         d.member_name::text,
         (i.membership_id is not null),
         -- Email only for a notice created now, so a retried event never mails twice.
         (i.membership_id is not null and d.email_on
           and d.member_email is not null and btrim(d.member_email::text) <> '')
    from decided d
    left join inserted i on i.membership_id = d.mid
   where d.in_app_on;
end;
$$;

-- ── Grants, read back ──────────────────────────────────────────────────────

do $grants$
declare
  fn text;
begin
  foreach fn in array array[
    'public.my_notification_preferences(uuid)',
    'public.save_my_notification_preferences(uuid, jsonb, jsonb)',
    'public.set_my_notification_state(uuid, boolean, boolean)',
    'public.mark_all_my_notifications_read(uuid)'
  ] loop
    execute format('revoke all on function %s from public', fn);
    execute format('revoke all on function %s from anon', fn);
    execute format('grant execute on function %s to authenticated', fn);
  end loop;

  execute 'revoke all on function public.notify_staff(uuid, text, text, text, boolean, boolean, jsonb, text, uuid, text, jsonb, text, uuid[]) from public';
  execute 'revoke all on function public.notify_staff(uuid, text, text, text, boolean, boolean, jsonb, text, uuid, text, jsonb, text, uuid[]) from anon';
  execute 'revoke all on function public.notify_staff(uuid, text, text, text, boolean, boolean, jsonb, text, uuid, text, jsonb, text, uuid[]) from authenticated';
  execute 'grant execute on function public.notify_staff(uuid, text, text, text, boolean, boolean, jsonb, text, uuid, text, jsonb, text, uuid[]) to service_role';

  revoke all on function private.clean_notification_switches(jsonb) from public;
end
$grants$;

do $check$
begin
  if has_function_privilege('anon', 'public.notify_staff(uuid, text, text, text, boolean, boolean, jsonb, text, uuid, text, jsonb, text, uuid[])', 'execute')
     or has_function_privilege('authenticated', 'public.notify_staff(uuid, text, text, text, boolean, boolean, jsonb, text, uuid, text, jsonb, text, uuid[])', 'execute') then
    raise exception 'notify_staff is callable by a signed-in or anonymous caller';
  end if;
  if has_function_privilege('anon', 'public.set_my_notification_state(uuid, boolean, boolean)', 'execute')
     or has_function_privilege('anon', 'public.save_my_notification_preferences(uuid, jsonb, jsonb)', 'execute') then
    raise exception 'a notification function is callable anonymously';
  end if;
  if has_table_privilege('authenticated', 'public.staff_notifications', 'insert')
     or has_table_privilege('authenticated', 'public.staff_notifications', 'update')
     or has_table_privilege('authenticated', 'public.staff_notification_preferences', 'update') then
    raise exception 'a notification table is directly writable by authenticated';
  end if;
end
$check$;
