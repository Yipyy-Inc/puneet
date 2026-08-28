-- ============================================================================
-- A lapsed client is a QUESTION about bookings, not a list somebody keeps.
--
-- The Lapsed tab has shown five invented people since it was built --
-- `lapsedClients` in src/data/rebook-reminders.ts, a hand-written array with
-- hand-written `daysOverdue`. Every button on those cards raised a toast
-- claiming something had happened. Nothing had.
--
-- -- WHY A FUNCTION AND NOT A TABLE ------------------------------------------
--
-- There is nothing to store. "Lapsed" is: their last completed booking for this
-- service, plus how often the facility expects that service to come round, minus
-- today. A table would be a cache of that arithmetic, and a cache that goes
-- stale the moment somebody books -- which is precisely the moment it MUST be
-- right, because the whole point is not to chase somebody who has already
-- rebooked.
--
-- -- WHAT MAKES SOMEBODY NOT LAPSED ------------------------------------------
--
-- Four things, and each has been a bug in somebody's rebook feature:
--
--   1. They have a booking coming up. Anything not completed/cancelled/
--      no_show/declined counts -- including one they requested this morning.
--   2. Staff dismissed them. But only until they next visit: the dismissal is
--      compared against the last visit rather than expiring on a timer, so a
--      client who comes back and lapses again reappears by itself.
--   3. They are not an active client, or they are blocked.
--   4. Nobody configured that service. A service missing from p_rules produces
--      no rows at all, rather than being assumed to be monthly.
--
-- -- TODAY IS PASSED IN ------------------------------------------------------
--
-- `current_date` here would be UTC. At 20:00 in Montreal that is already
-- tomorrow, which moves everybody one day further overdue for four hours every
-- evening. The caller passes the facility's own date -- the same lesson as the
-- night-shift window and the outbox's occasion_ref.
-- ============================================================================

-- A rebook reminder is its own kind of message. It is not an automation_rule
-- (no rule fired it), not a workflow (no sequence), and not `manual` (nobody
-- composed it) -- and lumping it into `manual` would leave the History tab
-- unable to separate a templated reminder from a message somebody typed.
alter table public.message_sends
  drop constraint if exists message_sends_source_kind_check;
alter table public.message_sends
  add constraint message_sends_source_kind_check
  check (source_kind in ('automation_rule', 'workflow', 'manual', 'rebook'));

create table if not exists public.rebook_dismissals (
  id uuid primary key default gen_random_uuid(),
  facility_id uuid not null references public.facilities(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,

  -- `bookings.service`: 'grooming', 'boarding', or a custom slug. Dismissing
  -- somebody from the grooming list must not hide them from the boarding one --
  -- those are different conversations with the same person.
  service text not null check (btrim(service) <> ''),

  reason text,
  note text,
  dismissed_by text,
  dismissed_at timestamptz not null default now()
);

comment on table public.rebook_dismissals is
  'Staff said "stop showing me this one". Compared against the client''s last visit rather than expiring, so somebody who returns and lapses again comes back on the list by itself.';

-- One live dismissal per pairing; dismissing twice is an upsert, not a second
-- row that would make "who dismissed this" ambiguous.
create unique index if not exists rebook_dismissals_unique
  on public.rebook_dismissals (facility_id, client_id, service);

alter table public.rebook_dismissals enable row level security;

drop policy if exists rebook_dismissals_read on public.rebook_dismissals;
create policy rebook_dismissals_read on public.rebook_dismissals
  for select using (
    private.is_platform_admin()
    or facility_id in (select private.member_facility_ids())
  );

drop policy if exists rebook_dismissals_write on public.rebook_dismissals;
create policy rebook_dismissals_write on public.rebook_dismissals
  for all using (
    private.has_permission(facility_id, 'marketing_manage_automations')
  ) with check (
    private.has_permission(facility_id, 'marketing_manage_automations')
  );

grant select, insert, update, delete on public.rebook_dismissals to authenticated;
revoke all on public.rebook_dismissals from public, anon;

create or replace function public.lapsed_clients(
  p_facility_id uuid,
  p_rules jsonb,
  p_today date default current_date,
  p_limit integer default 200
)
returns table (
  client_id uuid,
  client_name text,
  client_email text,
  client_phone text,
  service text,
  last_visit_at timestamptz,
  days_since integer,
  expected_days integer,
  days_overdue integer,
  reminders_sent integer,
  pet_name text
)
language sql
stable
security invoker
set search_path = ''
as $fn$
  with rules as (
    select key as service,
           (value ->> 'frequencyDays')::int   as expected_days,
           (value ->> 'lapsedAfterDays')::int as grace_days
      from jsonb_each(coalesce(p_rules, '{}'::jsonb))
     where (value ->> 'frequencyDays') is not null
       and (value ->> 'lapsedAfterDays') is not null
  ),
  last_visit as (
    select distinct on (b.client_id, b.service)
           b.client_id,
           b.service,
           b.start_at as last_visit_at,
           b.id       as booking_id
      from public.bookings b
     where b.facility_id = p_facility_id
       and b.status = 'completed'
       and b.service is not null
       and b.client_id is not null
     order by b.client_id, b.service, b.start_at desc
  )
  select
    c.id,
    c.name,
    c.email,
    c.phone,
    lv.service,
    lv.last_visit_at,
    (p_today - lv.last_visit_at::date)::int,
    r.expected_days,
    ((p_today - lv.last_visit_at::date) - r.expected_days)::int,
    -- Counted off the outbox, not a column on this row. The key is composite
    -- text precisely so it can be read back like this, and a `reminders_sent`
    -- column would be a second number free to disagree with the log.
    (select count(*)::int
       from public.message_sends ms
      where ms.facility_id = p_facility_id
        and ms.status in ('queued', 'sending', 'sent')
        and ms.idempotency_key like
            'rebook:' || lv.service || ':-:' || c.id::text || ':%'),
    (select p.name
       from public.booking_pets bp
       join public.pets p on p.id = bp.pet_id
      where bp.booking_id = lv.booking_id
      order by p.name
      limit 1)
  from last_visit lv
  join rules r          on r.service = lv.service
  join public.clients c on c.id = lv.client_id
 where c.facility_id = p_facility_id
   and c.status = 'active'
   and not coalesce(c.is_blocked, false)
   and (p_today - lv.last_visit_at::date) >= r.expected_days + r.grace_days
   and not exists (
     select 1 from public.bookings b2
      where b2.facility_id = p_facility_id
        and b2.client_id = c.id
        and b2.service = lv.service
        and b2.status not in ('completed', 'cancelled', 'no_show', 'declined')
   )
   and not exists (
     select 1 from public.rebook_dismissals d
      where d.facility_id = p_facility_id
        and d.client_id = c.id
        and d.service = lv.service
        and d.dismissed_at > lv.last_visit_at
   )
 order by ((p_today - lv.last_visit_at::date) - r.expected_days) desc, c.name
 limit greatest(coalesce(p_limit, 200), 0);
$fn$;

comment on function public.lapsed_clients(uuid, jsonb, date, integer) is
  'Clients overdue for a service, derived from completed bookings and the facility''s own expected frequencies. security invoker: RLS decides what the caller can see.';

revoke all on function public.lapsed_clients(uuid, jsonb, date, integer) from public, anon;
grant execute on function public.lapsed_clients(uuid, jsonb, date, integer) to authenticated;

do $$
begin
  if has_table_privilege('anon', 'public.rebook_dismissals', 'select') then
    raise exception 'anon can read dismissals';
  end if;
  if has_function_privilege('anon',
       'public.lapsed_clients(uuid, jsonb, date, integer)', 'execute') then
    raise exception 'anon can ask who has lapsed';
  end if;
  if not has_function_privilege('authenticated',
       'public.lapsed_clients(uuid, jsonb, date, integer)', 'execute') then
    raise exception 'authenticated cannot ask who has lapsed';
  end if;
end $$;
