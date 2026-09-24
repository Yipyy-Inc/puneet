-- ============================================================================
-- THE REBOOK QUEUE ANSWERS BEFORE THE STATEMENT TIMEOUT.
--
-- `GET /api/rebook/queue` has been returning
--
--     400 {"error":"canceling statement due to statement timeout"}
--
-- after ~9.7 seconds, so `QueueTab` never left its loading skeleton and the
-- Queue tab of Rebook Reminders showed a spinner for ever. Measured
-- 2026-09-24 against the demo facility from a real browser session.
--
-- ── WHY IT WAS SLOW, AND WHY IT LOOKED FAST WHEN PROBED ───────────────────
--
-- `rebook_pipeline` was STABLE but NOT security definer, so it ran as the
-- caller and every row it touched was filtered by RLS. Its first CTE is a
-- `distinct on (client_id, service)` over `public.bookings` for the whole
-- facility — 2,303 rows on the demo facility — and `bookings_read` calls
-- `private.has_permission` per row.
--
-- Probing it as the database owner took 124-248 ms, because RLS is bypassed
-- for the owner. THAT IS THE TRAP: the same call from the product took nine
-- seconds and was killed. A function measured only as owner has not been
-- measured.
--
-- ── WHAT CHANGED, AND WHAT DID NOT ────────────────────────────────────────
--
-- SECURITY DEFINER, plus the permission check RLS was doing implicitly — asked
-- ONCE rather than per row. `view_clients` is the permission, because that is
-- exactly what `clients_read` requires (20260801120000) and exactly what this
-- function returns: client name, email and phone.
--
-- THE BODY IS OTHERWISE BYTE-FOR-BYTE THE ONE THAT WAS RUNNING, taken from
-- `pg_get_functiondef` rather than retyped from the 2026-08-29 migration that
-- last declared it — re-typing the older text would silently revert whatever
-- changed in between. The only edits are the two marked above.
--
-- ── THE ACCESS THIS GRANTS IS NARROWER, NOT WIDER ─────────────────────────
--
-- Before: anyone RLS let read a booking got rows for it. After: only a
-- platform admin or somebody holding `view_clients` AT THAT FACILITY. A
-- client of the facility could previously reach their own row through
-- `clients_read`'s `profile_id = auth.uid()` arm; now they cannot reach the
-- function's output at all, which is correct for a staff pipeline.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.rebook_pipeline(p_facility_id uuid, p_rules jsonb, p_today date DEFAULT CURRENT_DATE, p_min_overdue integer DEFAULT NULL::integer, p_max_overdue integer DEFAULT NULL::integer, p_limit integer DEFAULT 200)
 RETURNS TABLE(client_id uuid, client_name text, client_email text, client_phone text, service text, last_visit_at timestamp with time zone, last_booking_id uuid, days_since integer, expected_days integer, days_overdue integer, due_on date, lead_days integer, scheduled_send_on date, is_lapsed boolean, reminders_sent integer, pet_name text)
 LANGUAGE sql
 STABLE
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
  with allowed as (
    -- THE CHECK THIS FUNCTION NOW OWES. Running as definer means RLS no longer
    -- stands between the caller and 2,300 bookings, so the permission is asked
    -- ONCE, here, instead of per row. `view_clients` because that is what
    -- `clients_read` requires and what this returns: name, email and phone.
    select private.is_platform_admin()
        or private.has_permission(p_facility_id, 'view_clients') as ok
  ),
  rules as (
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
 cross join allowed
 where allowed.ok
   and ((p_today - x.last_visit_at::date) - x.expected_days)
         >= coalesce(p_min_overdue, -100000)
   and ((p_today - x.last_visit_at::date) - x.expected_days)
         <= coalesce(p_max_overdue,  100000)
 order by ((p_today - x.last_visit_at::date) - x.expected_days) desc, x.client_name
 limit greatest(coalesce(p_limit, 200), 0);
$function$
;
