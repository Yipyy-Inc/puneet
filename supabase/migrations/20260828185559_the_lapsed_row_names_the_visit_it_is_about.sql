-- A lapsed row now carries the booking it is about.
--
-- Without it the reminder has no booking context, so a facility that edits the
-- shipped template to say "your last {{service_name}}" gets a message that is
-- refused at queue time for an unresolved tag -- correct, but baffling. It is
-- also what "Book now" prefills from.
--
-- DROP and CREATE rather than CREATE OR REPLACE: the OUT columns change, and
-- Postgres refuses to replace a function whose return type differs. Nothing
-- references it yet.

drop function if exists public.lapsed_clients(uuid, jsonb, date, integer);

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
  last_booking_id uuid,
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
    lv.booking_id,
    (p_today - lv.last_visit_at::date)::int,
    r.expected_days,
    ((p_today - lv.last_visit_at::date) - r.expected_days)::int,
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
  if has_function_privilege('anon',
       'public.lapsed_clients(uuid, jsonb, date, integer)', 'execute') then
    raise exception 'anon can ask who has lapsed';
  end if;
  if not has_function_privilege('authenticated',
       'public.lapsed_clients(uuid, jsonb, date, integer)', 'execute') then
    raise exception 'authenticated cannot ask who has lapsed';
  end if;
end $$;
