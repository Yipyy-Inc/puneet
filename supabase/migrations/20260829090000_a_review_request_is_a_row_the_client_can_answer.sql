-- ============================================================================
-- A review request is a row, and the client can answer it from their own phone.
--
-- -- WHAT WAS THERE BEFORE ---------------------------------------------------
--
-- Nothing. The whole Reputation Booster was fixtures and `localStorage`: eight
-- tabs over `src/data/reputation.ts`, a 30-second browser tick that flipped a
-- status string and sent no message, and a survey at `/review/<token>` whose
-- "token" WAS the request id, looked up in `localStorage`. Measured 2026-08-28:
-- opening that link in any browser that had not created the request renders
-- "Loading your survey..." for ever. So the outward-facing half of the feature
-- -- the part a customer touches -- has never worked at all.
--
-- -- WHY THERE IS NO `visits` TABLE ------------------------------------------
--
-- The spec asks for one, to stop a groom inside a boarding stay producing two
-- requests. But a visit is `bookings` grouped by (client, location, facility-
-- local day), and 20260828185226 argues at length against storing that shape:
-- the cache goes stale the moment somebody books, cancels or transfers, which
-- is exactly when it must be right.
--
-- What is being asked for is a UNIQUENESS RULE, so it is a unique index. The
-- second check-out of the day raises 23505 and the scheduler treats that as
-- success -- the same contract `emit_automation_event` already has for a
-- duplicate dedupe key. `booking_ids` carries the rest of the visit.
--
-- -- WHY THERE IS NO `review_request_step` TABLE -----------------------------
--
-- A step IS a `message_sends` row. `sent_at`, `status`, `channel`,
-- `scheduled_for` and `provider_id` all already exist there, along with the
-- unique idempotency key that is the authority on double sends. A parallel
-- table would be a second, disagreeing record of what was sent.
--
-- Segment counts and cost are deliberately NOT stored either: both are pure
-- functions of `body_rendered` and the channel, and a stored copy is one more
-- thing that can be wrong.
--
-- -- WHY THERE IS NO `campaign_version` TABLE --------------------------------
--
-- `message_sends.body_rendered` already snapshots the copy, for the CASL reason
-- given in 20260827111420. What remains is the config that changes how a rating
-- is INTERPRETED, and that is two numbers -- so they are two columns on the
-- request. "Was this 2-star escalated under the rule in force at the time" is
-- answerable; "what was the entire configuration on 3 May" is not, and nobody
-- asks it.
--
-- -- THE THING THAT MAKES THIS COMPLIANT -------------------------------------
--
-- `escalation_threshold` decides what happens INTERNALLY. It does not decide
-- who is shown a public review link -- everyone is, at every rating.
-- Suppressing the link for unhappy clients is review gating, which Google's
-- review policies and 16 CFR Part 465 both prohibit. It was a switch in this
-- product until 2026-08-28; `bun run check:no-review-gating` now keeps it out.
-- ============================================================================

-- A review request is its own kind of message: no rule composed it, no sequence
-- owns it, and nobody typed it. Folding it into `manual` would leave the
-- Requests tab unable to tell a templated ask from a message a person wrote.
alter table public.message_sends
  drop constraint if exists message_sends_source_kind_check;
alter table public.message_sends
  add constraint message_sends_source_kind_check
  check (source_kind in (
    'automation_rule', 'workflow', 'manual', 'rebook', 'review_request'));

-- -- The token --------------------------------------------------------------
--
-- Deliberately a sibling of `private.hash_onboarding_token` rather than a
-- shared helper. They are two token families with two lifetimes, and either
-- should be free to change how it hashes without silently invalidating every
-- live link belonging to the other.

create or replace function private.hash_review_token(p_token text)
returns bytea language sql immutable set search_path = '' as $fn$
  select extensions.digest(p_token, 'sha256');
$fn$;

comment on function private.hash_review_token(text) is
  'sha256 of a survey link token. The plaintext is never stored - see 20260803180000 for the argument against a policy that filters on a caller-supplied token.';

revoke all on function private.hash_review_token(text) from public, anon;
grant execute on function private.hash_review_token(text) to authenticated, service_role;

-- -- review_requests ---------------------------------------------------------

create table if not exists public.review_requests (
  id uuid primary key default gen_random_uuid(),

  facility_id uuid not null references public.facilities(id) on delete cascade,
  location_id uuid references public.locations(id) on delete set null,
  client_id   uuid not null references public.clients(id) on delete cascade,

  -- THE VISIT, as a key rather than a row. Facility-local, computed by the
  -- caller: `current_date` here is UTC and would give a Vancouver facility two
  -- "todays" or none -- the same lesson as the night-shift window and the
  -- outbox's occasion_ref.
  business_day date not null,

  -- SNAPSHOTTED, NOT DERIVED. `bookings.assigned_staff_id` gets edited weeks
  -- later and last quarter's staff averages must not move underneath it.
  --
  -- IT REFERENCES `staff`, NOT `facility_memberships`. The column on `bookings`
  -- is DECLARED against facility_memberships in 20260801120000 and REPOINTED to
  -- staff(id) in 20260801150000. Reading the declaration is how a tip trigger
  -- nearly shipped resolving nobody, silently, for every booking.
  primary_staff_id uuid references public.staff(id) on delete set null,

  -- For "Mentions", and nothing else. The count that MAY exceed the number of
  -- responses has to be a different column from the one that may not, or the
  -- staff table ends up claiming 323 reviews out of 247 ratings.
  staff_on_visit uuid[] not null default '{}',

  service_types text[] not null default '{}',
  booking_ids   uuid[] not null default '{}',

  state text not null default 'scheduled' check (state in (
    'scheduled', 'sent', 'delivered', 'failed',
    'rated', 'expired', 'suppressed', 'cancelled')),
  state_changed_at timestamptz not null default now(),

  -- The config in force when this was asked. See the header.
  escalation_threshold smallint not null default 3
    check (escalation_threshold between 1 and 5),
  showcase_min smallint not null default 4
    check (showcase_min between 1 and 5),

  first_send_at timestamptz not null default now(),

  -- A job past this is DROPPED, not sent. The build this replaces once sent a
  -- "gentle nudge" 49 days after the request.
  expires_at timestamptz not null,

  -- ONE NUDGE, EVER -- and not as a counter. A number beside the outbox is free
  -- to disagree with it; the authority is the unique idempotency key on the
  -- nudge's own `message_sends` row. These three columns are the readable
  -- record of which branch fired.
  nudge_due_at      timestamptz,
  nudge_resolved_at timestamptz,
  nudge_outcome     text check (nudge_outcome in ('backup', 'share', 'none', 'expired')),

  channel text check (channel in ('email', 'sms')),

  token_hash       bytea unique,
  token_expires_at timestamptz,

  source text not null default 'automated' check (source in (
    'automated', 'manual', 'report_card', 'portal', 'kiosk')),
  requested_by    text references public.profiles(id) on delete set null,
  override_reason text,

  suppress_reason text check (suppress_reason in (
    'opted_out', 'no_consent', 'campaign_unregistered', 'no_channel',
    'invalid_address', 'hard_bounced', 'cancelled', 'refund_open', 'dispute',
    'cooldown', 'negative_pause', 'manual_hold', 'daily_cap', 'velocity_cap')),
  suppress_stage text check (suppress_stage in ('trigger', 'send')),
  suppressed_at  timestamptz,

  -- X-04: suppression windows are UNIONED, not ranked. The longest applicable
  -- one wins, and the client's profile shows this date.
  next_eligible_at timestamptz,

  created_at timestamptz not null default now(),

  -- A suppressed request says why, and a request that says why is suppressed.
  -- "Why did only 312 of 480 check-outs get asked" is a question the previous
  -- build could not answer at all.
  constraint review_requests_suppressed_says_why
    check ((state = 'suppressed') = (suppress_reason is not null)),
  constraint review_requests_nudge_outcome_needs_resolution
    check ((nudge_resolved_at is null) = (nudge_outcome is null)),
  constraint review_requests_manual_says_who
    check (source <> 'manual' or requested_by is not null)
);

-- THE DEDUPE. `nulls not distinct` because a facility with no locations
-- configured writes a null location_id, and under default null-distinctness
-- every check-out that day would insert its own row -- the exact double-send
-- this index exists to prevent.
create unique index if not exists review_requests_visit_unique
  on public.review_requests (facility_id, client_id, location_id, business_day)
  nulls not distinct;

create index if not exists review_requests_facility_idx
  on public.review_requests (facility_id, created_at desc);
create index if not exists review_requests_client_idx
  on public.review_requests (client_id, created_at desc);

-- The nudge evaluator's query, and only rows it can still act on.
create index if not exists review_requests_nudge_due_idx
  on public.review_requests (nudge_due_at)
  where nudge_resolved_at is null and nudge_due_at is not null;

comment on table public.review_requests is
  'One ask per visit. The visit is the unique index on (facility, client, location, business_day), not a table - see the header of 20260829090000.';
comment on column public.review_requests.primary_staff_id is
  'Snapshot of who the visit was assigned to, as staff(id). NOT facility_memberships - bookings.assigned_staff_id was repointed in 20260801150000.';
comment on column public.review_requests.token_hash is
  'sha256 of the survey link token. The plaintext exists only in the message that was sent.';

-- ── review_responses ──────────────────────────────────────────────────────

create table if not exists public.review_responses (
  id uuid primary key default gen_random_uuid(),
  facility_id uuid not null references public.facilities(id) on delete cascade,

  -- UNIQUE: rate-once, the property `rate_report_card` gets from
  -- `rating_submitted_at is null`. A rating that can be revised is a rating
  -- whose reported satisfaction depends on when the report was run.
  request_id uuid not null unique
    references public.review_requests(id) on delete cascade,

  rating  smallint not null check (rating between 1 and 5),
  comment text,
  locale  text,

  -- G-05. Without this you cannot tell which surface is worth investing in,
  -- which is the whole argument for the report-card embed.
  source text not null check (source in (
    'sms_link', 'email_link', 'report_card', 'portal', 'kiosk', 'staff')),

  -- SINGLE-VALUED. Set from the request's primary staff, or from the survey's
  -- "who looked after Nala?" when the visit had more than one. Any "mentions"
  -- figure is derived separately and labelled as such.
  attributed_staff_id uuid references public.staff(id) on delete set null,

  pet_id uuid references public.pets(id) on delete set null,
  display_consent boolean not null default false,

  -- The showcase is an attribute of a response, not a second table with a
  -- nullable parent.
  moderation_state text not null default 'pending' check (moderation_state in (
    'pending', 'approved', 'live', 'hidden', 'rejected')),
  showcase_sort_order integer,
  showcase_pet_photo_id uuid,
  approved_by text references public.profiles(id) on delete set null,
  approved_at timestamptz,

  -- So is the click.
  public_channel_id uuid,
  public_clicked_at timestamptz,

  submitted_at timestamptz not null default now(),

  constraint review_responses_approved_says_who
    check ((approved_at is null) = (approved_by is null)),
  constraint review_responses_click_names_a_channel
    check ((public_clicked_at is null) = (public_channel_id is null))
);

create index if not exists review_responses_facility_idx
  on public.review_responses (facility_id, submitted_at desc);
create index if not exists review_responses_staff_idx
  on public.review_responses (attributed_staff_id, submitted_at desc)
  where attributed_staff_id is not null;

comment on table public.review_responses is
  'One response per request, enforced by the unique on request_id. Internal survey ratings ONLY - never averaged with public platform ratings (R-04).';

-- ── review_channels ───────────────────────────────────────────────────────

create table if not exists public.review_channels (
  id uuid primary key default gen_random_uuid(),
  facility_id uuid not null references public.facilities(id) on delete cascade,
  location_id uuid references public.locations(id) on delete cascade,

  platform text not null check (platform in (
    'google', 'facebook', 'yelp', 'nextdoor', 'tripadvisor')),

  -- R-10: the durable handle. A pasted short link rots when a business profile
  -- changes; the write-review deep link is generated from the place id at send
  -- time, and the raw URL is kept only as a display fallback.
  place_id    text,
  profile_url text,

  enabled  boolean not null default false,
  priority smallint not null default 0,
  weight   smallint not null default 0 check (weight >= 0),

  -- R-02 AS A CONSTRAINT RATHER THAN A UI RULE. Yelp prohibits soliciting
  -- reviews outright, so asking is a policy violation and not merely an
  -- ineffective channel. A disabled toggle on one screen is a convention
  -- somebody forgets; this is a fact the send path reads.
  solicitable boolean not null default true,

  -- Entered by hand and LABELLED AS SUCH until a platform sync exists. Kept
  -- apart from internal ratings on purpose: averaging survey responses with
  -- public reviews produces a number that means nothing and moves for reasons
  -- nobody can explain.
  public_rating numeric(2,1) check (public_rating between 1 and 5),
  public_review_count integer check (public_review_count >= 0),
  rating_source text not null default 'manual'
    check (rating_source in ('manual', 'synced')),
  rating_confirmed_at timestamptz,
  rating_confirmed_by text references public.profiles(id) on delete set null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint review_channels_yelp_is_never_solicitable
    check (platform <> 'yelp' or solicitable = false)
);

create unique index if not exists review_channels_one_per_platform
  on public.review_channels (facility_id, location_id, platform)
  nulls not distinct;

comment on table public.review_channels is
  'Where a happy client is sent. solicitable = false means display-only: connected for its rating, never offered as a destination.';

alter table public.review_responses
  drop constraint if exists review_responses_public_channel_fkey;
alter table public.review_responses
  add constraint review_responses_public_channel_fkey
  foreign key (public_channel_id) references public.review_channels(id)
  on delete set null;

-- ── review_tags / review_response_tags ────────────────────────────────────
--
-- The improvement tags are the important half: they turn "2 stars, session felt
-- rushed" from prose a manager must read into something countable.

create table if not exists public.review_tags (
  id uuid primary key default gen_random_uuid(),
  facility_id uuid not null references public.facilities(id) on delete cascade,

  -- Idempotency for the shipped catalogue, exactly as automation_rules.seed_key
  -- works: re-seeding a facility must not duplicate its tags.
  seed_key text,

  service_type text not null,
  polarity text not null check (polarity in ('positive', 'improvement')),

  -- 'high' is what will prompt an assignee to link an incident. Incidents are
  -- 651 lines of fixtures today, so it only affects wording for now - read the
  -- debt map before wiring anything else to it.
  severity text not null default 'normal' check (severity in ('normal', 'high')),

  -- {"en": "Gentle handling", "fr": "Manipulation douce"}
  labels jsonb not null default '{}'::jsonb,

  sort_order smallint not null default 0,
  is_active  boolean not null default true,
  created_at timestamptz not null default now()
);

create unique index if not exists review_tags_seed_unique
  on public.review_tags (facility_id, seed_key)
  where seed_key is not null;
create index if not exists review_tags_facility_idx
  on public.review_tags (facility_id, service_type, polarity)
  where is_active;

create table if not exists public.review_response_tags (
  response_id uuid not null
    references public.review_responses(id) on delete cascade,
  -- RESTRICT: a tag a response carries is part of the record of what that
  -- client said. Retire it with is_active = false, the way a template retires.
  tag_id uuid not null
    references public.review_tags(id) on delete restrict,
  primary key (response_id, tag_id)
);

comment on table public.review_response_tags is
  'What the client picked. on delete restrict - retiring a tag must not rewrite history.';

-- ── The anon surface: three functions, and the token is an ARGUMENT ────────
--
-- NOT an RLS policy on `anon` filtering on a caller-supplied token. That shape
-- is a table-scan oracle and 20260803180000 rejects it by name. Here the token
-- is hashed inside the function and hits a unique index, so a caller learns
-- exactly one thing: whether the one token they hold is live.
--
-- EVERY FAILURE LOOKS THE SAME. Expired, already answered, suppressed,
-- cancelled, never existed - all return null, and the route turns that into one
-- 404. A caller guessing tokens learns nothing from the difference.

create or replace function public.review_request_by_token(p_token text)
returns jsonb
language plpgsql stable security definer set search_path = ''
as $fn$
declare
  v jsonb;
begin
  -- Cheap guard before touching the index: a short or absent token is not a
  -- token, and answering instantly costs a guesser nothing to discover.
  if p_token is null or length(p_token) < 16 then
    return null;
  end if;

  select jsonb_build_object(
      'requestId',    r.id,
      'facilityName', f.name,
      'facilitySlug', f.slug,
      'locale',       coalesce(c.preferred_language, 'en'),
      'clientFirstName', split_part(c.name, ' ', 1),
      'serviceTypes', r.service_types,
      'petNames',     coalesce(
        (select array_agg(p.name order by p.name)
           from public.pets p
          where p.id = any (
            select distinct (b.details->>'petId')::uuid
              from public.bookings b
             where b.id = any (r.booking_ids)
               and b.details->>'petId' is not null)),
        '{}'::text[]),
      -- Whether it has been answered. The survey shows a read-only state
      -- rather than a second rating box.
      'answered',     (resp.id is not null),
      'rating',       resp.rating,
      -- The public destinations, in the facility's own priority order and
      -- WITHOUT anything monitor-only. Yelp cannot appear here even if a
      -- facility enabled it: the constraint on the table forbids it.
      'channels',     coalesce(
        (select jsonb_agg(jsonb_build_object(
                  'id', ch.id, 'platform', ch.platform, 'weight', ch.weight)
                  order by ch.priority, ch.platform)
           from public.review_channels ch
          where ch.facility_id = r.facility_id
            and (ch.location_id is null or ch.location_id = r.location_id)
            and ch.enabled
            and ch.solicitable
            and (ch.place_id is not null or ch.profile_url is not null)),
        '[]'::jsonb),
      -- The tags offered depend on the rating the client picks, so both halves
      -- are sent and the page chooses. One round trip, no second call that
      -- could leak which rating somebody was about to give.
      'tags',         coalesce(
        (select jsonb_agg(jsonb_build_object(
                  'id', t.id, 'polarity', t.polarity,
                  'serviceType', t.service_type, 'labels', t.labels)
                  order by t.polarity, t.sort_order)
           from public.review_tags t
          where t.facility_id = r.facility_id
            and t.is_active
            and (r.service_types = '{}' or t.service_type = any (r.service_types))),
        '[]'::jsonb)
    )
    into v
    from public.review_requests r
    join public.facilities f on f.id = r.facility_id
    join public.clients    c on c.id = r.client_id
    left join public.review_responses resp on resp.request_id = r.id
   where r.token_hash = private.hash_review_token(p_token)
     and r.token_expires_at > now()
     and r.state not in ('suppressed', 'cancelled', 'expired');

  return v;
end;
$fn$;

comment on function public.review_request_by_token(text) is
  'The survey page, by link token. Returns null for every kind of failure so a guesser cannot tell them apart.';

revoke all on function public.review_request_by_token(text) from public;
grant execute on function public.review_request_by_token(text) to anon, authenticated;

-- ── Answering ─────────────────────────────────────────────────────────────
--
-- RATE-ONCE, by the unique on request_id rather than by a check-then-insert
-- that two taps could both pass. A second submission raises 42501, the same
-- shape `rate_report_card` raises.

create or replace function public.submit_review_response(
  p_token           text,
  p_rating          integer,
  p_comment         text default null,
  p_tag_ids         uuid[] default '{}',
  p_staff_id        uuid default null,
  p_display_consent boolean default false,
  p_locale          text default null,
  p_source          text default 'sms_link'
)
returns jsonb
language plpgsql volatile security definer set search_path = ''
as $fn$
declare
  v_req      public.review_requests%rowtype;
  v_response uuid;
  v_staff    uuid;
begin
  if p_token is null or length(p_token) < 16 then
    raise exception 'That review link is not valid.' using errcode = '42501';
  end if;
  if p_rating is null or p_rating < 1 or p_rating > 5 then
    raise exception 'A rating is 1 to 5.' using errcode = '22023';
  end if;

  select * into v_req
    from public.review_requests
   where token_hash = private.hash_review_token(p_token)
     and token_expires_at > now()
     and state not in ('suppressed', 'cancelled', 'expired')
   for update;

  if not found then
    raise exception 'That review link is not valid.' using errcode = '42501';
  end if;

  -- Attribution is SINGLE-VALUED, and the answer is validated rather than
  -- trusted: a caller could otherwise credit a rating to somebody at another
  -- facility, or to somebody who was not on the visit.
  if p_staff_id is not null then
    select s.id into v_staff
      from public.staff s
     where s.id = p_staff_id
       and s.facility_id = v_req.facility_id
       and (v_req.staff_on_visit = '{}' or s.id = any (v_req.staff_on_visit));
  end if;
  v_staff := coalesce(v_staff, v_req.primary_staff_id);

  insert into public.review_responses (
    facility_id, request_id, rating, comment, locale, source,
    attributed_staff_id, display_consent)
  values (
    v_req.facility_id, v_req.id, p_rating, nullif(btrim(coalesce(p_comment, '')), ''),
    coalesce(p_locale, v_req.channel, 'en'),
    case when p_source in ('sms_link','email_link','report_card','portal','kiosk','staff')
         then p_source else 'sms_link' end,
    v_staff, coalesce(p_display_consent, false))
  returning id into v_response;

  -- Only tags this facility owns. A caller naming somebody else's tag id is
  -- refused by the join rather than silently recorded.
  insert into public.review_response_tags (response_id, tag_id)
  select v_response, t.id
    from public.review_tags t
   where t.id = any (coalesce(p_tag_ids, '{}'))
     and t.facility_id = v_req.facility_id
     and t.is_active
  on conflict do nothing;

  update public.review_requests
     set state = 'rated', state_changed_at = now()
   where id = v_req.id;

  -- The rating decides what happens INTERNALLY. It does NOT decide whether the
  -- public links come back in this payload - they always do, at every rating.
  -- That single property is what makes this flow compliant.
  return jsonb_build_object(
    'responseId', v_response,
    'rating', p_rating,
    'escalated', p_rating <= v_req.escalation_threshold,
    'showcaseEligible',
      p_rating >= v_req.showcase_min
      and coalesce(p_display_consent, false)
      and nullif(btrim(coalesce(p_comment, '')), '') is not null);

exception
  when unique_violation then
    -- The second tap on a slow phone, or a back button. Not an error worth
    -- showing: it means the answer was already recorded.
    raise exception 'That review has already been submitted.' using errcode = '42501';
end;
$fn$;

comment on function public.submit_review_response(text, integer, text, uuid[], uuid, boolean, text, text) is
  'Records one response, once. Rate-once comes from the unique on request_id, not from a check the caller could race.';

revoke all on function public.submit_review_response(text, integer, text, uuid[], uuid, boolean, text, text) from public;
grant execute on function public.submit_review_response(text, integer, text, uuid[], uuid, boolean, text, text) to anon, authenticated;

-- ── The click ─────────────────────────────────────────────────────────────
--
-- ONE function, not "read the channel then record the click": the redirect has
-- nothing to leak in between, and a click cannot be recorded for a destination
-- the caller was never offered.

create or replace function public.record_review_click(
  p_token      text,
  p_channel_id uuid
)
returns text
language plpgsql volatile security definer set search_path = ''
as $fn$
declare
  v_req  public.review_requests%rowtype;
  v_ch   public.review_channels%rowtype;
begin
  if p_token is null or length(p_token) < 16 then
    return null;
  end if;

  select * into v_req
    from public.review_requests
   where token_hash = private.hash_review_token(p_token)
     and token_expires_at > now()
     and state not in ('suppressed', 'cancelled', 'expired');
  if not found then
    return null;
  end if;

  select * into v_ch
    from public.review_channels
   where id = p_channel_id
     and facility_id = v_req.facility_id
     and (location_id is null or location_id = v_req.location_id)
     and enabled
     and solicitable;
  if not found then
    return null;
  end if;

  -- Only where a response exists, and only the FIRST click: "did they follow
  -- the link" is a yes/no per request, and re-stamping it would make the
  -- interval between rating and click meaningless.
  update public.review_responses
     set public_channel_id = v_ch.id,
         public_clicked_at = now()
   where request_id = v_req.id
     and public_clicked_at is null;

  -- The place id wins. A pasted profile URL is the fallback precisely because
  -- it rots when the business profile changes.
  return case
    when v_ch.place_id is not null
      then 'https://search.google.com/local/writereview?placeid=' || v_ch.place_id
    else v_ch.profile_url
  end;
end;
$fn$;

comment on function public.record_review_click(text, uuid) is
  'Stamps the first public click and returns the destination. Null for anything the caller was not offered.';

revoke all on function public.record_review_click(text, uuid) from public;
grant execute on function public.record_review_click(text, uuid) to anon, authenticated;

-- ── RLS ───────────────────────────────────────────────────────────────────
--
-- NO INSERT POLICY on requests or responses, deliberately. Requests are written
-- by the scheduler as service_role and answers by the definer function above; a
-- session that could forge either could forge the record of who was asked and
-- what they said. Same reasoning as `message_sends`, and the manual-send route
-- applies the permission explicitly instead.

alter table public.review_requests      enable row level security;
alter table public.review_responses     enable row level security;
alter table public.review_channels      enable row level security;
alter table public.review_tags          enable row level security;
alter table public.review_response_tags enable row level security;

drop policy if exists review_requests_read on public.review_requests;
create policy review_requests_read on public.review_requests
  for select using (
    private.is_platform_admin()
    or facility_id in (select private.member_facility_ids())
    or client_id in (select private.own_client_ids())
  );

drop policy if exists review_requests_update on public.review_requests;
create policy review_requests_update on public.review_requests
  for update using (private.has_permission(facility_id, 'marketing_manage_reviews'))
          with check (private.has_permission(facility_id, 'marketing_manage_reviews'));

-- The customer arm exists so a client can see their own review history in the
-- portal (G-06). It is scoped through the request, because a response has no
-- client_id of its own and denormalising one would be a second answer to
-- "whose review is this".
drop policy if exists review_responses_read on public.review_responses;
create policy review_responses_read on public.review_responses
  for select using (
    private.is_platform_admin()
    or facility_id in (select private.member_facility_ids())
    or request_id in (
      select r.id from public.review_requests r
       where r.client_id in (select private.own_client_ids()))
  );

-- Moderation: approving a review for the booking page is a marketing act.
drop policy if exists review_responses_update on public.review_responses;
create policy review_responses_update on public.review_responses
  for update using (private.has_permission(facility_id, 'marketing_manage_reviews'))
          with check (private.has_permission(facility_id, 'marketing_manage_reviews'));

drop policy if exists review_channels_read on public.review_channels;
create policy review_channels_read on public.review_channels
  for select using (
    private.is_platform_admin()
    or facility_id in (select private.member_facility_ids())
  );

drop policy if exists review_channels_write on public.review_channels;
create policy review_channels_write on public.review_channels
  for all using (private.has_permission(facility_id, 'marketing_manage_reviews'))
          with check (private.has_permission(facility_id, 'marketing_manage_reviews'));

drop policy if exists review_tags_read on public.review_tags;
create policy review_tags_read on public.review_tags
  for select using (
    private.is_platform_admin()
    or facility_id in (select private.member_facility_ids())
  );

drop policy if exists review_tags_write on public.review_tags;
create policy review_tags_write on public.review_tags
  for all using (private.has_permission(facility_id, 'marketing_manage_reviews'))
          with check (private.has_permission(facility_id, 'marketing_manage_reviews'));

-- Read follows the response it belongs to. Nobody writes this from a session:
-- the tags a client picked are recorded by submit_review_response and are part
-- of the record afterwards.
drop policy if exists review_response_tags_read on public.review_response_tags;
create policy review_response_tags_read on public.review_response_tags
  for select using (
    response_id in (select id from public.review_responses)
  );

-- ── Grants ────────────────────────────────────────────────────────────────
--
-- The part that has bitten this project four times: Supabase default privileges
-- hand `authenticated` the FULL set on every new table in `public`, so "we
-- simply did not grant INSERT" leaves INSERT exactly where it was. And
-- `revoke ... from public` is NOT `revoke ... from anon` - they are different
-- grants and both are needed. 20260822610000 exists because one attempt named
-- only one of them.

revoke all on public.review_requests      from public, anon;
revoke all on public.review_responses     from public, anon;
revoke all on public.review_channels      from public, anon;
revoke all on public.review_tags          from public, anon;
revoke all on public.review_response_tags from public, anon;

grant select, update         on public.review_requests      to authenticated;
grant select, update         on public.review_responses     to authenticated;
grant select, insert, update, delete on public.review_channels to authenticated;
grant select, insert, update, delete on public.review_tags     to authenticated;
grant select                 on public.review_response_tags to authenticated;

-- EXPLICIT, for the reason above.
revoke insert, delete on public.review_requests      from authenticated;
revoke insert, delete on public.review_responses     from authenticated;
revoke insert, update, delete on public.review_response_tags from authenticated;

grant select, insert, update, delete on public.review_requests      to service_role;
grant select, insert, update, delete on public.review_responses     to service_role;
grant select, insert, update, delete on public.review_channels      to service_role;
grant select, insert, update, delete on public.review_tags          to service_role;
grant select, insert, update, delete on public.review_response_tags to service_role;

-- ── The assertions ────────────────────────────────────────────────────────
--
-- A revoke that names a privilege the role does not hold succeeds silently and
-- looks identical to one that worked. So they are read back.

do $verify$
begin
  if has_table_privilege('anon', 'public.review_requests', 'select') then
    raise exception 'anon can read review requests';
  end if;
  if has_table_privilege('anon', 'public.review_responses', 'select') then
    raise exception 'anon can read review responses';
  end if;
  if has_table_privilege('authenticated', 'public.review_requests', 'insert') then
    raise exception 'authenticated can forge a review request';
  end if;
  if has_table_privilege('authenticated', 'public.review_responses', 'insert') then
    raise exception 'authenticated can forge a review response';
  end if;
  if has_table_privilege('authenticated', 'public.review_responses', 'delete') then
    raise exception 'authenticated can delete a review response';
  end if;
  if has_table_privilege('authenticated', 'public.review_response_tags', 'insert') then
    raise exception 'authenticated can add tags to somebody elses response';
  end if;

  -- The anon surface is the three functions and nothing else.
  if not has_function_privilege('anon', 'public.review_request_by_token(text)', 'execute') then
    raise exception 'anon cannot open a survey link';
  end if;
  if has_function_privilege('anon', 'private.hash_review_token(text)', 'execute') then
    raise exception 'anon can hash tokens for itself';
  end if;
end;
$verify$;
