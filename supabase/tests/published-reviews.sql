-- ============================================================================
-- Only a review a facility actually published is readable without an account
-- (20260829200000).
--
--   psql "$SUPABASE_DB_URL" -f supabase/tests/published-reviews.sql
--
-- One transaction, rolled back. Fixture emails are @example.invalid.
--
-- ── WHAT THIS FILE IS DEFENDING ───────────────────────────────────────────
--
-- This is the only reputation surface an unauthenticated stranger may read, and
-- it renders somebody's words about their own dog on a public page. Four
-- separate conditions decide whether a given row appears, and each one has a
-- customer behind it:
--
--   P2  moderation_state = 'live'. Not 'approved' — approved means a person
--       said yes, live means they put it up, and publishing on the former takes
--       the decision away from the facility.
--   P3  display_consent. A client who did not agree to be shown is not shown,
--       however good the review.
--   P4  a written comment. A bare 5 is not a testimonial.
--   P5  at or above the facility's own showcase minimum.
--
-- P6 is not about rows at all: `anon` must not be able to read the TABLES. A
-- policy can filter rows but not columns, and the row carries the client's
-- identity, the attributed staff member and the moderation history. That is why
-- this is a function and not a policy, and P6 is what keeps it one.
--
-- It asserts `clients` by what anon can READ rather than by the grant, because
-- the grant is there. See the note above P6.
--
-- P7: the header average is computed over the same rows the list returns, so
-- the two cannot disagree — which is one of the audit's nine arithmetic
-- defects, reappearing in a new place if nobody checks.
-- ============================================================================

begin;

set local client_min_messages to warning;

create temp table tap (n serial, name text, ok boolean, detail text);

create or replace function pg_temp.t(p_name text, p_ok boolean, p_detail text default '')
returns void language sql as $$
  insert into tap(name, ok, detail) values (p_name, p_ok, p_detail);
$$;

-- ── Fixture ───────────────────────────────────────────────────────────────

insert into public.orgs (id, name, slug) values
  ('00000000-0000-0000-0000-000000ba0010', 'Pub Org', 'pub-org')
on conflict do nothing;

insert into public.facilities (id, org_id, name, slug, legacy_id) values
  ('00000000-0000-0000-0000-000000ba0020', '00000000-0000-0000-0000-000000ba0010',
   'Pub Facility', 'pub-a', 'pub-a')
on conflict do nothing;

insert into public.clients (id, facility_id, name, email) values
  ('00000000-0000-0000-0000-000000ba0040', '00000000-0000-0000-0000-000000ba0020',
   'Sarah Mitchell', 'pub-c@example.invalid');

/** One answered request, with everything about it under the test's control. */
create or replace function pg_temp.answered(
  p_day date,
  p_rating integer,
  p_comment text,
  p_state text,
  p_consent boolean,
  p_showcase_min integer default 4
)
returns uuid language plpgsql as $$
declare v_req uuid; v_resp uuid;
begin
  insert into public.review_requests
    (facility_id, client_id, business_day, state, service_types,
     showcase_min, expires_at)
  values
    ('00000000-0000-0000-0000-000000ba0020',
     '00000000-0000-0000-0000-000000ba0040', p_day, 'rated', array['grooming'],
     p_showcase_min, now() + interval '7 days')
  returning id into v_req;

  insert into public.review_responses
    (facility_id, request_id, rating, comment, source,
     moderation_state, display_consent)
  values
    ('00000000-0000-0000-0000-000000ba0020', v_req, p_rating, p_comment,
     'sms_link', p_state, p_consent)
  returning id into v_resp;

  return v_resp;
end $$;

-- One of each shape. Only the first should ever be readable.
do $$
begin
  perform pg_temp.answered(current_date,     5, 'Wonderful with Nala', 'live',     true);
  perform pg_temp.answered(current_date - 1, 5, 'Also wonderful',      'approved', true);
  perform pg_temp.answered(current_date - 2, 5, 'Great, keep private', 'live',     false);
  perform pg_temp.answered(current_date - 3, 5, null,                  'live',     true);
  perform pg_temp.answered(current_date - 4, 2, 'Not good at all',     'live',     true);
end $$;

-- ── P1: the published one is returned ─────────────────────────────────────
do $$
declare v_count bigint; v_comment text;
begin
  select count(*) into v_count from public.published_reviews_for('pub-a', 20);
  select comment into v_comment from public.published_reviews_for('pub-a', 20) limit 1;

  perform pg_temp.t(
    'P1  exactly one of the five is published',
    v_count = 1 and v_comment = 'Wonderful with Nala',
    format('count=%s first=%s', v_count, coalesce(v_comment, 'none')));
end $$;

-- ── P2-P5: and each of the other four is held back for its own reason ─────
do $$
declare v_comments text;
begin
  select string_agg(comment, ' | ') into v_comments
    from public.published_reviews_for('pub-a', 20);

  perform pg_temp.t(
    'P2  an approved-but-not-live review is not on the page',
    coalesce(v_comments, '') not like '%Also wonderful%',
    coalesce(v_comments, 'none'));

  perform pg_temp.t(
    'P3  a review without display consent is not on the page',
    coalesce(v_comments, '') not like '%keep private%',
    coalesce(v_comments, 'none'));

  perform pg_temp.t(
    'P4  a rating with no words is not a testimonial',
    (select count(*) from public.published_reviews_for('pub-a', 20)
      where comment is null) = 0,
    'a bare rating must not appear');

  perform pg_temp.t(
    'P5  a review below the showcase minimum is not on the page',
    coalesce(v_comments, '') not like '%Not good at all%',
    coalesce(v_comments, 'none'));
end $$;

-- ── P6: and anon cannot simply read the tables instead ─────────────────
--
-- The reason this is a function. A policy filters rows; the row carries the
-- client's identity, the attributed staff member and the moderation history.
--
-- `clients` is asserted by what anon can actually READ rather than by the
-- grant, and the difference is the finding. anon HOLDS a select grant on
-- `public.clients` -- inherited from Supabase default privileges, and never
-- revoked -- but there is no anon policy, so it reads zero rows. The grant is
-- dangling rather than exploitable, and asserting the row count is what would
-- break if somebody ever added a permissive policy. See the debt map.
do $$
declare v_resp boolean; v_req boolean; v_fn boolean; v_client_rows integer;
begin
  v_resp := has_table_privilege('anon', 'public.review_responses', 'select');
  v_req  := has_table_privilege('anon', 'public.review_requests', 'select');
  v_fn   := has_function_privilege('anon',
    'public.published_reviews_for(text, integer)', 'execute');

  set local role anon;
  select count(*) into v_client_rows from public.clients;
  reset role;

  perform pg_temp.t(
    'P6  anon may call the function, and read neither review table nor a client',
    v_fn and not v_resp and not v_req and v_client_rows = 0,
    format('fn=%s responses=%s requests=%s client_rows=%s',
           v_fn, v_resp, v_req, v_client_rows));
exception when others then
  reset role;
  perform pg_temp.t('P6  the anon surface', false, sqlerrm);
end $$;

-- ── P7: the header cannot disagree with the list ──────────────────────────
do $$
declare v_summary jsonb; v_count bigint; v_avg numeric;
begin
  v_summary := public.published_review_summary('pub-a');
  select count(*), avg(rating) into v_count, v_avg
    from public.published_reviews_for('pub-a', 50);

  perform pg_temp.t(
    'P7  the summary is computed over exactly the rows the list returns',
    (v_summary->>'count')::bigint = v_count
      and (v_summary->>'average')::numeric = round(v_avg, 1),
    format('summary=%s list_count=%s list_avg=%s',
           v_summary::text, v_count, round(v_avg, 1)));
end $$;

-- ── P8: the author is a first name and an initial ─────────────────────────
--
-- Consent to display a review is not consent to be identified. They were
-- answering a text message from their groomer, not publishing under their full
-- name.
do $$
declare v_author text;
begin
  select author into v_author from public.published_reviews_for('pub-a', 1);

  perform pg_temp.t(
    'P8  the reviewer is "Sarah M." and never "Sarah Mitchell"',
    v_author = 'Sarah M.',
    format('author=%s', coalesce(v_author, 'none')));
end $$;

-- ── P9: an unknown facility is an empty list, not an error ────────────────
--
-- A 404 would turn this into a way to ask which businesses are on Yipyy.
do $$
declare v_count bigint;
begin
  select count(*) into v_count
    from public.published_reviews_for('no-such-facility-anywhere', 20);

  perform pg_temp.t(
    'P9  an unknown slug returns nothing rather than raising',
    v_count = 0,
    format('count=%s', v_count));
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
