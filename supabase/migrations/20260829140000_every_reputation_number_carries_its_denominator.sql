-- ============================================================================
-- Every reputation number carries its denominator.
--
-- ── WHAT THE AUDIT ACTUALLY FOUND ─────────────────────────────────────────
--
-- The v2 spec lists nine separate arithmetic defects on these screens: a
-- distribution summing to 99%, staff review counts exceeding total ratings by
-- 31%, sentiment buckets that never equalled their row, three different
-- averages, and two headline percentages with no stated denominator at all.
--
-- Every one of them was a property of hand-written arrays in
-- src/data/reputation.ts. None of them is a bug to be fixed: they are what
-- happens when nine numbers are typed independently. When all nine come from
-- ONE query over ONE dataset they become unrepresentable, which is a different
-- and much better thing than fixed.
--
-- So this file is the metric dictionary, as SQL. §14 of the spec is its
-- contract, and supabase/tests/reputation-metrics.sql asserts the identities
-- the spec's QA matrix asks for.
--
-- ── EVERY METRIC RETURNS ITS NUMERATOR AND ITS DENOMINATOR ────────────────
--
-- Not just a percentage. "Public conversions 41.3%" was unresolvable from the
-- screen — 41.3% of 247 is 102, of 312 is 129, and nothing said which. Shipping
-- the denominator in the payload makes the card's subtitle a fact rather than a
-- caption, and makes that class of defect impossible to reintroduce.
--
-- ── ONE DEFINITION OF "NEGATIVE" ──────────────────────────────────────────
--
-- Four shipped at once: a 6.5% negative rate, a 6% 1-2 star band, a threshold
-- of "3 stars and below stays private" (14%), and a flagged count of 8. Here
-- there is one: `rating <= escalation_threshold`, read from the REQUEST ROW so
-- a facility that changed its threshold last month does not retroactively
-- reclassify what it escalated. Move the threshold and the detractor rate, the
-- negative counts and the escalation totals all move together, because they are
-- the same expression.
--
-- ── WHAT IS DELIBERATELY MISSING: DELIVERY RATE ───────────────────────────
--
-- The spec asks response rate to divide by DELIVERED rather than sent, so that
-- a hard-bounced address does not depress a number staff are measured on. It is
-- right, and it cannot be honoured yet: nothing in this product receives a
-- delivery receipt. Resend and Twilio both report a bounce asynchronously by
-- webhook, and there is no webhook.
--
-- So the denominator here is `sent` — accepted by the provider, excluding
-- `failed` and `skipped` — which is strictly better than the old "requests
-- created" and is NOT called delivery. When the bounce webhook lands, this
-- function gains `delivered` and the response-rate denominator moves. Naming a
-- number "delivery rate" before anything can measure delivery would be the
-- same defect the spec is complaining about, one layer down.
--
-- ── SECURITY INVOKER ──────────────────────────────────────────────────────
--
-- These read through the CALLER's RLS. A metric function that ran as definer
-- would be a way to count other facilities' reviews, and "it only returns
-- aggregates" is not a defence — a count of one is a fact about one customer.
-- ============================================================================

create or replace function public.reputation_metrics(
  p_facility_id uuid,
  p_from date,
  p_to date,
  p_location_ids uuid[] default null
)
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $fn$
with scoped as (
  select r.*
    from public.review_requests r
   where r.facility_id = p_facility_id
     and r.created_at >= p_from::timestamptz
     and r.created_at < (p_to + 1)::timestamptz
     -- NULL means every location, never "no locations". An empty array meaning
     -- none would silently blank every card the day somebody cleared the last
     -- chip on the scope selector.
     and (p_location_ids is null or r.location_id = any (p_location_ids))
),
asked as (
  -- The initial ask only. Nudges and backups are excluded so the number is not
  -- inflated by retries -- "requests sent" must mean people asked, not
  -- messages emitted.
  select s.source_id, min(s.sent_at) as sent_at
    from public.message_sends s
    join scoped r on r.id = s.source_id
   where s.source_kind = 'review_request'
     and s.step_index = 0
     and s.status = 'sent'
   group by s.source_id
),
nudged as (
  select s.source_id, min(s.sent_at) as sent_at
    from public.message_sends s
    join scoped r on r.id = s.source_id
   where s.source_kind = 'review_request'
     and s.step_index = 1
     and s.status = 'sent'
   group by s.source_id
),
answers as (
  select resp.*, r.escalation_threshold, r.id as request_id_key
    from public.review_responses resp
    join scoped r on r.id = resp.request_id
),
counts as (
  select
    (select count(*) from scoped)                                   as visits,
    (select count(*) from asked)                                    as sent,
    (select count(*) from nudged)                                   as nudges,
    (select count(*) from scoped where state = 'suppressed')        as suppressed,
    (select count(*) from answers)                                  as responses,
    (select count(*) from answers where rating = 5)                 as five_star,
    (select count(*) from answers where rating >= 4)                as positive,
    (select count(*) from answers where rating = 3)                 as neutral,
    (select count(*) from answers where rating <= 2)                as negative,
    (select count(*) from answers
      where rating <= escalation_threshold)                         as detractors,
    (select count(*) from answers where public_clicked_at is not null) as clicked,
    (select count(*) from answers a
       join nudged n on n.source_id = a.request_id_key
      where a.submitted_at > n.sent_at)                             as after_nudge,
    (select coalesce(sum(rating), 0) from answers)                  as rating_sum
)
select jsonb_build_object(
  'scope', jsonb_build_object(
    'facilityId', p_facility_id,
    'locationIds', p_location_ids,
    'from', p_from,
    'to', p_to),

  -- Each metric is {value, numerator, denominator}. `value` is null rather
  -- than 0 when the denominator is 0: "0% of nobody responded" is a false
  -- statement, and a card showing 0% reads as a failure rather than as no data.
  'requestsSent', jsonb_build_object(
    'value', sent, 'numerator', sent, 'denominator', null,
    'definition', 'initial sends that the provider accepted; excludes nudges'),

  'responseRate', jsonb_build_object(
    'value', case when sent > 0 then round(responses::numeric / sent, 4) end,
    'numerator', responses, 'denominator', sent,
    'definition', 'responses per initial send; not per DELIVERED - see the header'),

  'averageRating', jsonb_build_object(
    'value', case when responses > 0
                  then round(rating_sum::numeric / responses, 2) end,
    'numerator', rating_sum, 'denominator', responses,
    'definition', 'count-weighted, rounded once; never an average of averages'),

  'fiveStarShare', jsonb_build_object(
    'value', case when responses > 0
                  then round(five_star::numeric / responses, 4) end,
    'numerator', five_star, 'denominator', responses,
    'definition', 'responses rating exactly 5'),

  'detractorRate', jsonb_build_object(
    'value', case when responses > 0
                  then round(detractors::numeric / responses, 4) end,
    'numerator', detractors, 'denominator', responses,
    'definition', 'rating <= the escalation threshold in force when asked'),

  'publicClickRate', jsonb_build_object(
    'value', case when responses > 0
                  then round(clicked::numeric / responses, 4) end,
    'numerator', clicked, 'denominator', responses,
    'definition', 'responses that followed a public link; was "public conversions"'),

  'nudgeRecovery', jsonb_build_object(
    'value', case when nudges > 0
                  then round(after_nudge::numeric / nudges, 4) end,
    'numerator', after_nudge, 'denominator', nudges,
    'definition', 'responses arriving after a nudge, per nudge sent'),

  'suppressionRate', jsonb_build_object(
    'value', case when visits > 0
                  then round(suppressed::numeric / visits, 4) end,
    'numerator', suppressed, 'denominator', visits,
    'definition', 'visits considered but not asked; the answer to "why only 312 of 480"'),

  -- THE THREE BUCKETS SUM TO THE RESPONSE COUNT, BY CONSTRUCTION. They are
  -- three ranges over one column with no gap and no overlap, which is what the
  -- shipped screens could not manage: Emma had 84 + 1 = 85 against 87 reviews.
  'sentiment', jsonb_build_object(
    'positive', positive, 'neutral', neutral, 'negative', negative,
    'total', responses,
    'definition', 'positive >= 4, neutral = 3, negative <= 2; sums to total')
)
from counts;
$fn$;

comment on function public.reputation_metrics(uuid, date, date, uuid[]) is
  'The metric dictionary, as one query. Every metric carries its numerator and denominator; see the header of 20260829140000 for why delivery rate is absent.';

revoke all on function public.reputation_metrics(uuid, date, date, uuid[]) from public, anon;
grant execute on function public.reputation_metrics(uuid, date, date, uuid[]) to authenticated;

-- ── Per staff ─────────────────────────────────────────────────────────────
--
-- D-03: the shipped screen showed staff review counts totalling 323 against 247
-- ratings, because a rating was credited to every person on the visit. The fix
-- is not smaller numbers, it is TWO COLUMNS with different meanings:
--
--   reviews  -- responses whose single `attributed_staff_id` is this person.
--              These SUM to the total response count. It is the column a
--              performance conversation should use.
--   mentions -- responses whose visit had this person on it. These may exceed
--              the total, legitimately, and the screen has to say so.
--
-- Shipping one number that quietly meant the second while being labelled the
-- first is the actual defect.

create or replace function public.reputation_staff_stats(
  p_facility_id uuid,
  p_from date,
  p_to date,
  p_location_ids uuid[] default null
)
returns table (
  staff_id uuid,
  staff_name text,
  reviews bigint,
  mentions bigint,
  rating_sum bigint,
  average_rating numeric,
  detractors bigint,
  praise bigint
)
language sql
stable
security invoker
set search_path = ''
as $fn$
with scoped as (
  select r.*
    from public.review_requests r
   where r.facility_id = p_facility_id
     and r.created_at >= p_from::timestamptz
     and r.created_at < (p_to + 1)::timestamptz
     and (p_location_ids is null or r.location_id = any (p_location_ids))
),
answers as (
  select resp.*, r.escalation_threshold, r.staff_on_visit
    from public.review_responses resp
    join scoped r on r.id = resp.request_id
)
select
  s.id,
  s.first_name || ' ' || s.last_name,
  count(*) filter (where a.attributed_staff_id = s.id),
  (select count(*) from answers m where s.id = any (m.staff_on_visit)),
  coalesce(sum(a.rating) filter (where a.attributed_staff_id = s.id), 0)::bigint,
  case
    when count(*) filter (where a.attributed_staff_id = s.id) > 0
    then round(
      sum(a.rating) filter (where a.attributed_staff_id = s.id)::numeric
      / count(*) filter (where a.attributed_staff_id = s.id), 2)
  end,
  count(*) filter (
    where a.attributed_staff_id = s.id
      and a.rating <= a.escalation_threshold),
  -- X-12: the "Praise" column existed on the shipped screen with no tag
  -- catalogue anywhere behind it. This is the number it was pretending to be.
  (select count(*)
     from public.review_response_tags rt
     join public.review_tags t on t.id = rt.tag_id
     join answers pa on pa.id = rt.response_id
    where t.polarity = 'positive'
      and pa.attributed_staff_id = s.id)
from public.staff s
left join answers a on a.attributed_staff_id = s.id
where s.facility_id = p_facility_id
group by s.id, s.first_name, s.last_name
having count(*) filter (where a.attributed_staff_id = s.id) > 0
    or (select count(*) from answers m where s.id = any (m.staff_on_visit)) > 0
order by count(*) filter (where a.attributed_staff_id = s.id) desc;
$fn$;

comment on function public.reputation_staff_stats(uuid, date, date, uuid[]) is
  'Per staff. `reviews` is single-valued and SUMS to the response total; `mentions` may exceed it and must be labelled separately (D-03).';

revoke all on function public.reputation_staff_stats(uuid, date, date, uuid[]) from public, anon;
grant execute on function public.reputation_staff_stats(uuid, date, date, uuid[]) to authenticated;

-- ── Per service ───────────────────────────────────────────────────────────

create or replace function public.reputation_service_stats(
  p_facility_id uuid,
  p_from date,
  p_to date,
  p_location_ids uuid[] default null
)
returns table (
  service_type text,
  requests bigint,
  responses bigint,
  average_rating numeric,
  detractors bigint
)
language sql
stable
security invoker
set search_path = ''
as $fn$
with scoped as (
  select r.*
    from public.review_requests r
   where r.facility_id = p_facility_id
     and r.created_at >= p_from::timestamptz
     and r.created_at < (p_to + 1)::timestamptz
     and (p_location_ids is null or r.location_id = any (p_location_ids))
),
-- A visit can carry more than one service - a groom inside a boarding stay is
-- the case the whole visit key exists for - so the request is counted once
-- under EACH of its services. That means these rows do not sum to the visit
-- count, and the screen must not present them as a breakdown of one.
exploded as (
  select unnest(
           case when cardinality(r.service_types) = 0
                then array['unknown']::text[]
                else r.service_types end) as service_type,
         r.id, r.escalation_threshold
    from scoped r
)
select
  e.service_type,
  count(distinct e.id),
  count(resp.id),
  case when count(resp.id) > 0
       then round(sum(resp.rating)::numeric / count(resp.id), 2) end,
  count(*) filter (where resp.rating <= e.escalation_threshold)
from exploded e
left join public.review_responses resp on resp.request_id = e.id
group by e.service_type
order by count(distinct e.id) desc;
$fn$;

comment on function public.reputation_service_stats(uuid, date, date, uuid[]) is
  'Per service. A multi-service visit is counted under each of its services, so these do NOT sum to the visit count.';

revoke all on function public.reputation_service_stats(uuid, date, date, uuid[]) from public, anon;
grant execute on function public.reputation_service_stats(uuid, date, date, uuid[]) to authenticated;

do $verify$
begin
  if has_function_privilege('anon', 'public.reputation_metrics(uuid, date, date, uuid[])', 'execute') then
    raise exception 'anon can read reputation metrics';
  end if;
  if has_function_privilege('anon', 'public.reputation_staff_stats(uuid, date, date, uuid[])', 'execute') then
    raise exception 'anon can read staff stats';
  end if;
end;
$verify$;
