-- ============================================================================
-- The Queue and the Lapsed list are ONE question asked at two moments.
--
-- "Who is due back on the 14th" and "who was due back and never came" differ
-- only in where you put the window. They had better not differ in their
-- exclusions: a client with a booking already in the diary must be absent from
-- both, a dismissal must hide them from both, and an inactive client must be
-- chased by neither. Two functions is two places to fix that, and the tabs
-- would drift apart the first time somebody fixed one.
--
-- So `rebook_pipeline` answers it once, over a window, and `lapsed_clients`
-- becomes a thin wrapper on it. Its signature and return type are unchanged --
-- the SQL test, two e2e specs and the shipped route all still call it exactly
-- as before.
--
-- -- WHAT IS LAPSED VS MERELY DUE --------------------------------------------
--
-- `is_lapsed` is computed per service against that service's own
-- `lapsedAfterDays`, not a global constant, and it is RETURNED rather than
-- filtered on. The Queue wants the people who are not lapsed yet; the Lapsed
-- tab wants the rest. One column, two readings, no second definition.
--
-- -- THE SEND DATE IS NOT THE DUE DATE ---------------------------------------
--
-- `scheduled_send_on` is `due_on - leadDays`: a facility that writes a week
-- before the expected return has a queue a week ahead of its due dates. The
-- Queue groups by THAT, because it is the date staff are actually looking at.
-- ============================================================================

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
    (lv.last_visit_at::date + r.expected_days),
    r.lead_days,
    (lv.last_visit_at::date + r.expected_days - r.lead_days),
    ((p_today - lv.last_visit_at::date) >= r.expected_days + r.grace_days),
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
   and ((p_today - lv.last_visit_at::date) - r.expected_days)
         >= coalesce(p_min_overdue, -100000)
   and ((p_today - lv.last_visit_at::date) - r.expected_days)
         <= coalesce(p_max_overdue,  100000)
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

comment on function public.rebook_pipeline(uuid, jsonb, date, integer, integer, integer) is
  'Every client+service pairing with a completed visit, over a window on days_overdue. is_lapsed is returned, not filtered: the Queue reads the false half and the Lapsed tab the true half, from one definition of who is excluded.';

-- The shipped signature, unchanged, now delegating. Callers do not move.
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
  select p.client_id, p.client_name, p.client_email, p.client_phone,
         p.service, p.last_visit_at, p.last_booking_id,
         p.days_since, p.expected_days, p.days_overdue,
         p.reminders_sent, p.pet_name
    from public.rebook_pipeline(p_facility_id, p_rules, p_today,
                                null, null, p_limit) p
   where p.is_lapsed;
$fn$;

revoke all on function public.rebook_pipeline(uuid, jsonb, date, integer, integer, integer) from public, anon;
grant execute on function public.rebook_pipeline(uuid, jsonb, date, integer, integer, integer) to authenticated;

-- ── What actually went out ────────────────────────────────────────────────
--
-- History is a read of `message_sends`, not a second table. The outbox is
-- already the record of every attempt, and a `rebook_history` table would be a
-- copy free to disagree with it -- which is the bug the whole messaging design
-- exists to prevent.
--
-- `rebooked_at` is the number that justifies the feature: did they actually
-- come back after we wrote to them? Computed by a lateral join rather than
-- stored, so it cannot go stale and cannot be wrong about a booking made a
-- minute ago. The service comes out of the idempotency key, which is composite
-- TEXT for exactly this kind of reason.
drop function if exists public.rebook_history(uuid, integer);

create or replace function public.rebook_history(
  p_facility_id uuid,
  p_limit integer default 100
)
returns table (
  send_id uuid,
  client_id uuid,
  client_name text,
  service text,
  channel text,
  status text,
  skip_reason text,
  to_address text,
  created_at timestamptz,
  sent_at timestamptz,
  rebooked_at timestamptz,
  rebooked_total numeric
)
language sql
stable
security invoker
set search_path = ''
as $fn$
  select
    ms.id,
    ms.client_id,
    c.name,
    split_part(ms.idempotency_key, ':', 2),
    ms.channel,
    ms.status,
    ms.skip_reason,
    ms.to_address,
    ms.created_at,
    ms.sent_at,
    rb.created_at,
    rb.total_cost
  from public.message_sends ms
  left join public.clients c on c.id = ms.client_id
  left join lateral (
    -- `total_cost`, not `amount_paid`: this is the value of the booking the
    -- reminder brought back, and it is worth the same whether or not the
    -- customer has settled it yet.
    select b.created_at, b.total_cost
      from public.bookings b
     where b.facility_id = ms.facility_id
       and b.client_id   = ms.client_id
       and b.service     = split_part(ms.idempotency_key, ':', 2)
       and b.status not in ('cancelled', 'declined', 'no_show')
       and b.created_at > coalesce(ms.sent_at, ms.created_at)
     order by b.created_at
     limit 1
  ) rb on true
 where ms.facility_id = p_facility_id
   and ms.source_kind = 'rebook'
 order by ms.created_at desc
 limit greatest(coalesce(p_limit, 100), 0);
$fn$;

comment on function public.rebook_history(uuid, integer) is
  'Rebook reminders that were attempted, read straight off the outbox. rebooked_at is derived by lateral join, never stored.';

revoke all on function public.rebook_history(uuid, integer) from public, anon;
grant execute on function public.rebook_history(uuid, integer) to authenticated;

do $$
begin
  if has_function_privilege('anon',
       'public.rebook_pipeline(uuid, jsonb, date, integer, integer, integer)', 'execute') then
    raise exception 'anon can read the rebook pipeline';
  end if;
  if has_function_privilege('anon', 'public.rebook_history(uuid, integer)', 'execute') then
    raise exception 'anon can read rebook history';
  end if;
  if not has_function_privilege('authenticated',
       'public.rebook_pipeline(uuid, jsonb, date, integer, integer, integer)', 'execute') then
    raise exception 'authenticated cannot read the rebook pipeline';
  end if;
end $$;
