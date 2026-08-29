-- `rebook_pipeline` used the facility's interval for everybody. It now prefers
-- the CLIENT's, where one has been set, and skips a client the facility has
-- asked not to chase.
--
-- Done here rather than in the routes because this function is the one place
-- the Queue, the Lapsed tab and the send route all read: an override applied in
-- a route would leave the send able to write to somebody the screen showed as
-- excluded, which is the disagreement `is_lapsed` was made returnable to avoid.
--
-- The override drives everything downstream of it -- days_overdue, due_on,
-- scheduled_send_on and is_lapsed all fall out of expected_days -- so a dog on
-- a three-week cycle appears a week before one on four, with no second rule
-- anywhere. The card already shows the interval it used ("every 21d"), which is
-- why no extra column was added to say so: the number IS the answer, and
-- changing the return type would have meant dropping and recreating a function
-- three shipped callers depend on.

create or replace function public.rebook_pipeline(
  p_facility_id uuid,
  p_rules jsonb,
  p_today date default current_date,
  p_min_overdue integer default null,
  p_max_overdue integer default null,
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
  due_on date,
  lead_days integer,
  scheduled_send_on date,
  is_lapsed boolean,
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
           (value ->> 'frequencyDays')::int              as expected_days,
           (value ->> 'lapsedAfterDays')::int            as grace_days,
           coalesce((value ->> 'leadDays')::int, 0)      as lead_days
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
  ),
  resolved as (
    select
      c.id   as client_id,
      c.name as client_name,
      c.email as client_email,
      c.phone as client_phone,
      lv.service,
      lv.last_visit_at,
      lv.booking_id,
      r.grace_days,
      r.lead_days,
      coalesce(pref.frequency_days::int, r.expected_days) as expected_days
    from last_visit lv
    join rules r          on r.service = lv.service
    join public.clients c on c.id = lv.client_id
    left join public.client_rebook_preferences pref
      on pref.facility_id = p_facility_id
     and pref.client_id   = c.id
     and pref.service     = lv.service
    left join public.client_rebook_preferences whole
      on whole.facility_id = p_facility_id
     and whole.client_id   = c.id
     and whole.service is null
   where c.facility_id = p_facility_id
     and c.status = 'active'
     and not coalesce(c.is_blocked, false)
     -- The facility's own note: do not chase this client. For this service, or
     -- for all of them.
     and coalesce(pref.reminders_enabled, true)
     and coalesce(whole.reminders_enabled, true)
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
  )
  select
    x.client_id,
    x.client_name,
    x.client_email,
    x.client_phone,
    x.service,
    x.last_visit_at,
    x.booking_id,
    (p_today - x.last_visit_at::date)::int,
    x.expected_days,
    ((p_today - x.last_visit_at::date) - x.expected_days)::int,
    (x.last_visit_at::date + x.expected_days),
    x.lead_days,
    (x.last_visit_at::date + x.expected_days - x.lead_days),
    ((p_today - x.last_visit_at::date) >= x.expected_days + x.grace_days),
    (select count(*)::int
       from public.message_sends ms
      where ms.facility_id = p_facility_id
        and ms.status in ('queued', 'sending', 'sent')
        and ms.idempotency_key like
            'rebook:' || x.service || ':-:' || x.client_id::text || ':%'),
    (select p.name
       from public.booking_pets bp
       join public.pets p on p.id = bp.pet_id
      where bp.booking_id = x.booking_id
      order by p.name
      limit 1)
  from resolved x
 where ((p_today - x.last_visit_at::date) - x.expected_days)
         >= coalesce(p_min_overdue, -100000)
   and ((p_today - x.last_visit_at::date) - x.expected_days)
         <= coalesce(p_max_overdue,  100000)
 order by ((p_today - x.last_visit_at::date) - x.expected_days) desc, x.client_name
 limit greatest(coalesce(p_limit, 200), 0);
$fn$;

comment on function public.rebook_pipeline(uuid, jsonb, date, integer, integer, integer) is
  'Every client+service pairing with a completed visit, over a window on days_overdue, using the CLIENT''s interval where they have one. is_lapsed is returned, not filtered: the Queue reads the false half and the Lapsed tab the true half, from one definition of who is excluded.';
