-- ============================================================================
-- A platform announcement is a row, and it shows only while it is live.
--
-- Until now an announcement was a fixture (src/data/enhanced-announcements.ts)
-- seeded into a browser store, and the store's own comment said "the
-- published, in-platform ones are also what facilities see by default". So
-- every facility, on every page, was shown an URGENT red banner announcing a
-- "Scheduled maintenance window this weekend" that was never scheduled — and
-- the public /status page repeated it to anyone. The super-admin composer
-- "published" into the same browser store: nothing left the admin's tab.
--
-- ── WHAT IS LIVE ──────────────────────────────────────────────────────────
--
-- An announcement is shown when status = 'published', its start (starts_at, or
-- the moment it was published) has passed, and it has not auto-archived
-- (start + auto_archive_days). Nothing needs a timer: scheduling and expiry
-- are both a comparison with now() at read time. With no published row, no
-- facility sees anything — which is the point.
--
-- ── WHO ───────────────────────────────────────────────────────────────────
--
-- Platform admins write, through RLS. Facilities never read the table: they
-- call active_platform_announcements(facility), which answers only for a
-- facility the caller belongs to and applies the targeting — all facilities,
-- plan tier (facility_subscriptions.tier_id), business type
-- (facilities.business_types), or named facilities.
--
-- A read or a dismissal is per PERSON (a receipt row), so dismissing the
-- banner on one device dismisses it on the others.
--
-- The body is HTML from the composer's editor. It is sanitised by the app on
-- write and again on render (src/lib/announcements/sanitize-html.ts); only a
-- platform admin can write one at all.
-- ============================================================================

create table public.platform_announcements (
  id                uuid primary key default gen_random_uuid(),
  title             text not null check (length(btrim(title)) between 1 and 200),
  body              text not null default '' check (length(body) <= 50000),
  priority          text not null default 'normal'
                      check (priority in ('normal', 'high', 'urgent')),
  status            text not null default 'draft'
                      check (status in ('draft', 'published', 'archived')),
  target            text not null default 'all'
                      check (target in ('all', 'plan_tier', 'business_type', 'facilities')),
  plan_tier_ids     text[] not null default '{}',
  business_types    text[] not null default '{}',
  facility_ids      uuid[] not null default '{}',
  starts_at         timestamptz,
  auto_archive_days integer check (auto_archive_days is null or auto_archive_days between 1 and 365),
  published_at      timestamptz,
  author_name       text,
  created_by        text not null default (auth.jwt()->>'sub'),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  -- A target that names nothing would show to nobody; refuse it rather than
  -- publish something silent.
  constraint platform_announcements_target_named check (
    target = 'all'
    or (target = 'plan_tier' and cardinality(plan_tier_ids) > 0)
    or (target = 'business_type' and cardinality(business_types) > 0)
    or (target = 'facilities' and cardinality(facility_ids) > 0)
  ),
  constraint platform_announcements_published_stamped check (
    status <> 'published' or published_at is not null
  )
);

create index platform_announcements_live_idx
  on public.platform_announcements (status, starts_at)
  where status = 'published';

create trigger platform_announcements_updated_at
  before update on public.platform_announcements
  for each row execute function private.set_updated_at();

alter table public.platform_announcements enable row level security;

create policy platform_announcements_admin_all on public.platform_announcements
  for all to authenticated
  using ((select private.is_platform_admin()))
  with check ((select private.is_platform_admin()));

revoke all on public.platform_announcements from public, anon, authenticated;
grant select, insert, update, delete on public.platform_announcements to authenticated;

create table public.platform_announcement_receipts (
  announcement_id uuid not null references public.platform_announcements (id) on delete cascade,
  profile_id      text not null default (auth.jwt()->>'sub'),
  read_at         timestamptz,
  dismissed_at    timestamptz,
  primary key (announcement_id, profile_id)
);

alter table public.platform_announcement_receipts enable row level security;

create policy platform_announcement_receipts_own on public.platform_announcement_receipts
  for all to authenticated
  using (profile_id = (select auth.jwt()->>'sub'))
  with check (profile_id = (select auth.jwt()->>'sub'));

revoke all on public.platform_announcement_receipts from public, anon, authenticated;
grant select, insert, update on public.platform_announcement_receipts to authenticated;

-- ── live window, one definition ────────────────────────────────────────────
create or replace function private.platform_announcement_is_live(
  p_status text, p_starts_at timestamptz, p_published_at timestamptz, p_days integer
)
returns boolean
language sql
stable
set search_path = ''
as $$
  select p_status = 'published'
     and coalesce(p_starts_at, p_published_at) is not null
     and coalesce(p_starts_at, p_published_at) <= now()
     and (p_days is null
          or coalesce(p_starts_at, p_published_at) + make_interval(days => p_days) > now());
$$;

-- ── what a facility member sees ─────────────────────────────────────────────
create or replace function public.active_platform_announcements(p_facility_id uuid)
returns table (
  id uuid, title text, body text, priority text, published_at timestamptz,
  starts_at timestamptz, read_at timestamptz, dismissed_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select a.id, a.title, a.body, a.priority, a.published_at, a.starts_at,
         r.read_at, r.dismissed_at
    from public.platform_announcements a
    left join public.platform_announcement_receipts r
      on r.announcement_id = a.id
     and r.profile_id = (select auth.jwt()->>'sub')
   where (p_facility_id in (select private.member_facility_ids())
          or (select private.is_platform_admin()))
     and private.platform_announcement_is_live(a.status, a.starts_at, a.published_at, a.auto_archive_days)
     and (
           a.target = 'all'
        or (a.target = 'facilities' and p_facility_id = any (a.facility_ids))
        or (a.target = 'business_type' and exists (
              select 1 from public.facilities f
               where f.id = p_facility_id and f.business_types && a.business_types))
        or (a.target = 'plan_tier' and exists (
              select 1 from public.facility_subscriptions s
               where s.facility_id = p_facility_id and s.tier_id = any (a.plan_tier_ids)))
     )
   order by coalesce(a.starts_at, a.published_at) desc;
$$;

-- ── the public status page ─────────────────────────────────────────────────
-- Only what was addressed to EVERY facility and is about maintenance: the
-- same test the page applied to the fixture, now applied to real rows.
create or replace function public.status_page_maintenance()
returns table (id uuid, title text, body text, published_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select a.id, a.title, a.body, coalesce(a.starts_at, a.published_at)
    from public.platform_announcements a
   where a.target = 'all'
     and private.platform_announcement_is_live(a.status, a.starts_at, a.published_at, a.auto_archive_days)
     and (a.title || ' ' || a.body) ~* 'maintenance|downtime|service window|scheduled\s+upgrade'
   order by coalesce(a.starts_at, a.published_at) desc
   limit 10;
$$;

revoke all on function private.platform_announcement_is_live(text, timestamptz, timestamptz, integer) from public;
revoke all on function private.platform_announcement_is_live(text, timestamptz, timestamptz, integer) from anon;
revoke all on function public.active_platform_announcements(uuid) from public;
revoke all on function public.active_platform_announcements(uuid) from anon;
grant execute on function public.active_platform_announcements(uuid) to authenticated;
revoke all on function public.status_page_maintenance() from public;
grant execute on function public.status_page_maintenance() to anon, authenticated;

-- A revoke is not verified by having been written.
do $check$
begin
  if has_function_privilege('anon', 'public.active_platform_announcements(uuid)', 'execute') then
    raise exception 'active_platform_announcements is callable by anon';
  end if;
  if has_table_privilege('anon', 'public.platform_announcements', 'select')
     or has_table_privilege('anon', 'public.platform_announcement_receipts', 'select') then
    raise exception 'an announcement table is readable by anon';
  end if;
  if has_table_privilege('authenticated', 'public.platform_announcement_receipts', 'delete') then
    raise exception 'receipts are deletable';
  end if;
end
$check$;
