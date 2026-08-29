-- ============================================================================
-- A published review is readable by somebody deciding whether to book.
--
-- ── THE GAP THIS CLOSES ───────────────────────────────────────────────────
--
-- 20260829090000 gave `review_responses` a `moderation_state`, and the
-- Booking-page-reviews screen can set it to `live`. Nothing read it. So a
-- facility could carefully choose which reviews to publish and publish them
-- nowhere — a control that reaches nothing, which is the shape this whole
-- conversion has been removing.
--
-- ── WHY A FUNCTION AND NOT A POLICY ───────────────────────────────────────
--
-- The obvious move is an `anon` SELECT policy on `review_responses` with
-- `moderation_state = 'live'` in the USING clause. That would expose the TABLE
-- to anon, and every column on it: the client's identity through the request,
-- the attributed staff member, the display consent, the moderation history. A
-- policy filters rows, not columns.
--
-- So this is one SECURITY DEFINER function returning exactly the fields a
-- booking page renders — a rating, some words, a first name, a date — and the
-- table stays unreachable. The same argument `onboarding_by_token` makes, for
-- the same reason.
--
-- ── AND IT ANSWERS ABOUT ONE FACILITY, BY SLUG ────────────────────────────
--
-- Not a listing, not an id somebody can iterate. A caller has to already know
-- which business they are looking at, which is true by construction of anybody
-- who reached a booking page.
--
-- ── THE NAME IS A FIRST NAME ──────────────────────────────────────────────
--
-- "Sarah M." and not "Sarah Mitchell". A testimonial wall is a public document
-- and the person who wrote it was answering a text message from their groomer,
-- not publishing under their full name. Consent to display a review is not
-- consent to be identified.
-- ============================================================================

create or replace function public.published_reviews_for(
  p_slug text,
  p_limit integer default 20
)
returns table (
  id uuid,
  rating smallint,
  comment text,
  author text,
  service_type text,
  submitted_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $fn$
  select
    resp.id,
    resp.rating,
    resp.comment,
    -- First name plus an initial. See the header.
    split_part(c.name, ' ', 1) ||
      case
        when split_part(c.name, ' ', 2) <> ''
          then ' ' || left(split_part(c.name, ' ', 2), 1) || '.'
        else ''
      end,
    coalesce(r.service_types[1], 'visit'),
    resp.submitted_at
  from public.review_responses resp
  join public.review_requests r on r.id = resp.request_id
  join public.clients c on c.id = r.client_id
  join public.facilities f on f.id = resp.facility_id
 where f.slug = p_slug
   -- LIVE only. `approved` means a person said yes; `live` means they put it
   -- up. Publishing on `approved` would take the decision away from them.
   and resp.moderation_state = 'live'
   -- Belt and braces: the same three conditions the moderation screen enforces,
   -- restated here so a row that reached `live` by some other route still
   -- cannot be published without a comment or without consent.
   and resp.display_consent
   and nullif(btrim(resp.comment), '') is not null
   and resp.rating >= r.showcase_min
 order by coalesce(resp.showcase_sort_order, 999), resp.submitted_at desc
 limit least(greatest(coalesce(p_limit, 20), 1), 50);
$fn$;

comment on function public.published_reviews_for(text, integer) is
  'The reviews a facility has put on its own booking page. Returns only the fields that page renders; the tables stay unreachable by anon.';

revoke all on function public.published_reviews_for(text, integer) from public;
grant execute on function public.published_reviews_for(text, integer) to anon, authenticated;

-- ── The summary a booking page puts at the top ────────────────────────────
--
-- Derived from the SAME rows the list returns, so the average cannot disagree
-- with the reviews underneath it. That was one of the audit's nine arithmetic
-- defects in a different place: a header average computed from one set and a
-- list rendered from another.

create or replace function public.published_review_summary(p_slug text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $fn$
  select jsonb_build_object(
    'count', count(*),
    'average', case when count(*) > 0
                    then round(avg(rating)::numeric, 1) end)
    from public.published_reviews_for(p_slug, 50);
$fn$;

comment on function public.published_review_summary(text) is
  'Count and average over exactly the rows published_reviews_for returns, so the header cannot disagree with the list.';

revoke all on function public.published_review_summary(text) from public;
grant execute on function public.published_review_summary(text) to anon, authenticated;

do $verify$
begin
  if has_table_privilege('anon', 'public.review_responses', 'select') then
    raise exception 'anon can read the responses table directly';
  end if;
  if not has_function_privilege('anon', 'public.published_reviews_for(text, integer)', 'execute') then
    raise exception 'a booking page cannot read its own published reviews';
  end if;
end;
$verify$;
