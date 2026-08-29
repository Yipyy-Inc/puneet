-- ============================================================================
-- The metric dictionary holds (20260829140000).
--
--   psql "$SUPABASE_DB_URL" -f supabase/tests/reputation-metrics.sql
--
-- One transaction, rolled back. Fixture emails are @example.invalid.
--
-- ── WHY THESE ASSERTIONS AND NOT OTHERS ───────────────────────────────────
--
-- The v2 audit found nine arithmetic defects on the shipped screens, and every
-- one was a property of numbers typed independently into a fixture. This file
-- asserts the IDENTITIES that make them unrepresentable now that all nine come
-- from one query:
--
--   M2  the three sentiment buckets sum to the response count, exactly. The
--       shipped screen had Emma at 84 + 1 = 85 against 87 reviews, four staff
--       rows all wrong in the same way, because the buckets were three
--       independent numbers rather than three ranges over one column.
--
--   M3  `reviews` summed across staff equals the response count, while
--       `mentions` may exceed it. The shipped screen showed 323 staff reviews
--       against 247 ratings — 31% over — because one rating was credited to
--       everybody on the visit and then labelled "Reviews".
--
--   M4  moving the escalation threshold moves the detractor rate WITH it.
--       Four definitions of "negative" shipped simultaneously; this asserts
--       there is now one.
--
--   M5  every metric carries its own numerator and denominator. "Public
--       conversions 41.3%" was unresolvable from the screen — 41.3% of 247 is
--       102, of 312 is 129, and nothing said which.
--
-- ── AND ONE THING THIS FILE DELIBERATELY DOES NOT ASSERT ──────────────────
--
-- A delivery rate. Nothing in this product receives a delivery receipt, so the
-- response-rate denominator is `sent` and is named as such. Asserting a
-- delivery rate here would be asserting a number nothing can measure.
-- ============================================================================

begin;

set local client_min_messages to warning;

create temp table tap (n serial, name text, ok boolean, detail text);
grant all on tap to authenticated;

create or replace function pg_temp.t(p_name text, p_ok boolean, p_detail text default '')
returns void language sql as $$
  insert into tap(name, ok, detail) values (p_name, p_ok, p_detail);
$$;

-- ── Fixture ───────────────────────────────────────────────────────────────

insert into public.orgs (id, name, slug) values
  ('00000000-0000-0000-0000-0000007a0010', 'Metric Org', 'metric-org')
on conflict do nothing;

insert into public.facilities (id, org_id, name, slug, legacy_id) values
  ('00000000-0000-0000-0000-0000007a0020', '00000000-0000-0000-0000-0000007a0010',
   'Metric Facility', 'metric-a', 'metric-a')
on conflict do nothing;

insert into public.clients (id, facility_id, name, email) values
  ('00000000-0000-0000-0000-0000007a0040', '00000000-0000-0000-0000-0000007a0020',
   'Metric Client', 'metric-c@example.invalid');

-- Two people, because the whole point of M3 is telling their columns apart.
insert into public.staff
  (id, facility_id, first_name, last_name, email, primary_role, legacy_id) values
  ('00000000-0000-0000-0000-0000007a0050', '00000000-0000-0000-0000-0000007a0020',
   'Ada', 'Groomer', 'metric-s1@example.invalid', 'groomer', 'fs-met00050'),
  ('00000000-0000-0000-0000-0000007a0051', '00000000-0000-0000-0000-0000007a0020',
   'Ben', 'Bather', 'metric-s2@example.invalid', 'groomer', 'fs-met00051');

-- A destination, because `review_responses_click_names_a_channel` requires a
-- recorded click to name where it went. A clicked_at with no channel is a
-- click to nowhere, and the constraint refuses it -- which is how this fixture
-- failed on its first run.
insert into public.review_channels
  (id, facility_id, platform, enabled, solicitable, profile_url) values
  ('00000000-0000-0000-0000-0000007a0060', '00000000-0000-0000-0000-0000007a0020',
   'google', true, true, 'https://g.page/metric');

/**
 * A request that was asked and answered.
 *
 * BOTH people are on the visit; only `p_staff` is attributed. That asymmetry is
 * the entire subject of M3, so it is baked into the fixture rather than added
 * for one assertion.
 */
create or replace function pg_temp.answered(
  p_day date,
  p_rating integer,
  p_staff uuid,
  p_threshold integer default 3,
  p_clicked boolean default false
)
returns uuid language plpgsql as $$
declare v_req uuid; v_resp uuid;
begin
  insert into public.review_requests
    (facility_id, client_id, business_day, state, service_types,
     primary_staff_id, staff_on_visit, escalation_threshold, expires_at)
  values
    ('00000000-0000-0000-0000-0000007a0020',
     '00000000-0000-0000-0000-0000007a0040', p_day, 'rated', array['grooming'],
     p_staff,
     array['00000000-0000-0000-0000-0000007a0050'::uuid,
           '00000000-0000-0000-0000-0000007a0051'::uuid],
     p_threshold, now() + interval '7 days')
  returning id into v_req;

  -- The initial send, which is the denominator of the response rate.
  insert into public.message_sends
    (facility_id, client_id, channel, to_address, source_kind, source_id,
     step_index, body_rendered, status, sent_at, idempotency_key, provider)
  values
    ('00000000-0000-0000-0000-0000007a0020',
     '00000000-0000-0000-0000-0000007a0040', 'email',
     'metric-c@example.invalid', 'review_request', v_req, 0,
     'Body', 'sent', now(), 'met:' || gen_random_uuid()::text, 'resend');

  insert into public.review_responses
    (facility_id, request_id, rating, source, attributed_staff_id,
     public_channel_id, public_clicked_at)
  values
    ('00000000-0000-0000-0000-0000007a0020', v_req, p_rating, 'sms_link',
     p_staff,
     case when p_clicked then '00000000-0000-0000-0000-0000007a0060'::uuid end,
     case when p_clicked then now() end)
  returning id into v_resp;

  return v_req;
end $$;

-- Six responses: 5, 5, 4, 3, 2, 1. Chosen so every bucket and every threshold
-- boundary has something in it, and so no two metrics can coincide by accident.
do $$
begin
  perform pg_temp.answered(current_date, 5, '00000000-0000-0000-0000-0000007a0050', 3, true);
  perform pg_temp.answered(current_date - 1, 5, '00000000-0000-0000-0000-0000007a0050');
  perform pg_temp.answered(current_date - 2, 4, '00000000-0000-0000-0000-0000007a0050');
  perform pg_temp.answered(current_date - 3, 3, '00000000-0000-0000-0000-0000007a0051');
  perform pg_temp.answered(current_date - 4, 2, '00000000-0000-0000-0000-0000007a0051');
  perform pg_temp.answered(current_date - 5, 1, '00000000-0000-0000-0000-0000007a0051');
end $$;

-- And one that was never asked, so the suppression rate has something to say.
insert into public.review_requests
  (facility_id, client_id, business_day, state, expires_at,
   suppress_reason, suppress_stage, suppressed_at)
values
  ('00000000-0000-0000-0000-0000007a0020',
   '00000000-0000-0000-0000-0000007a0040', current_date - 6, 'suppressed',
   now() + interval '7 days', 'cooldown', 'trigger', now());

-- ── M1: the headline figures ──────────────────────────────────────────────
do $$
declare m jsonb;
begin
  m := public.reputation_metrics(
    '00000000-0000-0000-0000-0000007a0020',
    current_date - 30, current_date, null);

  perform pg_temp.t(
    'M1  six asked, six answered, average 3.33',
    (m->'requestsSent'->>'numerator')::int = 6
      and (m->'responseRate'->>'numerator')::int = 6
      and (m->'responseRate'->>'denominator')::int = 6
      and (m->'averageRating'->>'value')::numeric = 3.33,
    format('sent=%s responses=%s avg=%s',
           m->'requestsSent'->>'numerator',
           m->'responseRate'->>'numerator',
           m->'averageRating'->>'value'));
end $$;

-- ── M2: the buckets sum to the total, exactly ─────────────────────────────
--
-- The identity the shipped screen could not hold. 5,5,4 are positive; 3 is
-- neutral; 2,1 are negative. Any gap or overlap in the ranges breaks this, and
-- nothing else would notice.
do $$
declare m jsonb; s jsonb;
begin
  m := public.reputation_metrics(
    '00000000-0000-0000-0000-0000007a0020',
    current_date - 30, current_date, null);
  s := m->'sentiment';

  perform pg_temp.t(
    'M2  positive + neutral + negative == responses',
    (s->>'positive')::int + (s->>'neutral')::int + (s->>'negative')::int
      = (s->>'total')::int
    and (s->>'positive')::int = 3
    and (s->>'neutral')::int = 1
    and (s->>'negative')::int = 2,
    s::text);
end $$;

-- ── M3: reviews sum to the total; mentions may exceed it ──────────────────
do $$
declare v_reviews bigint; v_mentions bigint; v_responses int;
begin
  select sum(reviews), sum(mentions) into v_reviews, v_mentions
    from public.reputation_staff_stats(
      '00000000-0000-0000-0000-0000007a0020',
      current_date - 30, current_date, null);

  select count(*) into v_responses
    from public.review_responses
   where facility_id = '00000000-0000-0000-0000-0000007a0020';

  perform pg_temp.t(
    'M3  attributed reviews sum to the response count, mentions exceed it',
    v_reviews = v_responses and v_mentions > v_responses,
    format('reviews=%s mentions=%s responses=%s',
           v_reviews, v_mentions, v_responses));
end $$;

-- ── M3b: and they are attributed to the right person ──────────────────────
--
-- The positive control for M3. Equal totals would also hold if every response
-- were credited to one person, so the split is asserted too.
do $$
declare v_ada bigint; v_ben bigint;
begin
  select reviews into v_ada from public.reputation_staff_stats(
    '00000000-0000-0000-0000-0000007a0020', current_date - 30, current_date, null)
   where staff_id = '00000000-0000-0000-0000-0000007a0050';
  select reviews into v_ben from public.reputation_staff_stats(
    '00000000-0000-0000-0000-0000007a0020', current_date - 30, current_date, null)
   where staff_id = '00000000-0000-0000-0000-0000007a0051';

  perform pg_temp.t(
    'M3b the three good ratings are Ada''s and the three poor ones are Ben''s',
    v_ada = 3 and v_ben = 3,
    format('ada=%s ben=%s', v_ada, v_ben));
end $$;

-- ── M4: one definition of negative, and it moves with the threshold ───────
--
-- Six requests at threshold 3 give three detractors (3, 2, 1). Raise every
-- request to 4 and it becomes four (4, 3, 2, 1). If detractor rate were a
-- stored number, or read from current config rather than the request, this
-- would not move at all.
do $$
declare m jsonb; v_before int; v_after int;
begin
  m := public.reputation_metrics(
    '00000000-0000-0000-0000-0000007a0020',
    current_date - 30, current_date, null);
  v_before := (m->'detractorRate'->>'numerator')::int;

  update public.review_requests set escalation_threshold = 4
   where facility_id = '00000000-0000-0000-0000-0000007a0020';

  m := public.reputation_metrics(
    '00000000-0000-0000-0000-0000007a0020',
    current_date - 30, current_date, null);
  v_after := (m->'detractorRate'->>'numerator')::int;

  perform pg_temp.t(
    'M4  raising the escalation threshold moves the detractor count with it',
    v_before = 3 and v_after = 4,
    format('at_3=%s at_4=%s (expected 3 / 4)', v_before, v_after));

  update public.review_requests set escalation_threshold = 3
   where facility_id = '00000000-0000-0000-0000-0000007a0020';
end $$;

-- ── M5: every metric declares its denominator ─────────────────────────────
--
-- Structural rather than arithmetic, and it is the assertion that stops the
-- whole class coming back: a metric added later without a denominator fails
-- here rather than shipping as an unresolvable percentage.
do $$
declare m jsonb; k text; v_missing text := '';
begin
  m := public.reputation_metrics(
    '00000000-0000-0000-0000-0000007a0020',
    current_date - 30, current_date, null);

  for k in select jsonb_object_keys(m) loop
    if k in ('scope', 'sentiment') then continue; end if;
    if not (m->k ? 'numerator') or not (m->k ? 'denominator')
       or not (m->k ? 'definition') then
      v_missing := v_missing || k || ' ';
    end if;
  end loop;

  perform pg_temp.t(
    'M5  every metric carries numerator, denominator and a definition',
    v_missing = '',
    coalesce(nullif(v_missing, ''), 'all present'));
end $$;

-- ── M6: no denominator means no percentage, not 0% ────────────────────────
--
-- A facility with nothing in range must not be shown "0% response rate", which
-- reads as a failure rather than as no data.
do $$
declare m jsonb;
begin
  m := public.reputation_metrics(
    '00000000-0000-0000-0000-0000007a0020',
    current_date - 400, current_date - 300, null);

  perform pg_temp.t(
    'M6  an empty range gives null values, never 0%',
    (m->'responseRate'->>'value') is null
      and (m->'averageRating'->>'value') is null
      and (m->'responseRate'->>'denominator')::int = 0,
    (m->'responseRate')::text);
end $$;

-- ── M7: the suppression rate answers the question nobody could ────────────
do $$
declare m jsonb;
begin
  m := public.reputation_metrics(
    '00000000-0000-0000-0000-0000007a0020',
    current_date - 30, current_date, null);

  perform pg_temp.t(
    'M7  one of seven visits was suppressed, and it is countable',
    (m->'suppressionRate'->>'numerator')::int = 1
      and (m->'suppressionRate'->>'denominator')::int = 7,
    (m->'suppressionRate')::text);
end $$;

-- ── M8: the public click rate names its base ──────────────────────────────
do $$
declare m jsonb;
begin
  m := public.reputation_metrics(
    '00000000-0000-0000-0000-0000007a0020',
    current_date - 30, current_date, null);

  perform pg_temp.t(
    'M8  one click of six responses, stated as such',
    (m->'publicClickRate'->>'numerator')::int = 1
      and (m->'publicClickRate'->>'denominator')::int = 6,
    (m->'publicClickRate')::text);
end $$;

-- ── M9: anon cannot read any of it ────────────────────────────────────────
do $$
declare v_m boolean; v_s boolean; v_v boolean;
begin
  v_m := has_function_privilege('anon',
    'public.reputation_metrics(uuid, date, date, uuid[])', 'execute');
  v_s := has_function_privilege('anon',
    'public.reputation_staff_stats(uuid, date, date, uuid[])', 'execute');
  v_v := has_function_privilege('anon',
    'public.reputation_service_stats(uuid, date, date, uuid[])', 'execute');

  perform pg_temp.t(
    'M9  none of the metric functions is anon-callable',
    not v_m and not v_s and not v_v,
    format('metrics=%s staff=%s service=%s', v_m, v_s, v_v));
end $$;

-- ── Report ────────────────────────────────────────────────────────────────

select n, case when ok then 'PASS' else 'FAIL' end as result, name, detail
  from tap order by n;

do $$
declare v_failed integer;
begin
  select count(*) into v_failed from tap where not ok;
  if v_failed > 0 then
    raise exception '% assertion(s) failed', v_failed;
  end if;
end $$;

rollback;
