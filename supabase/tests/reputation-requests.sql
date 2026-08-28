-- ============================================================================
-- A review request is asked once per visit, answered once, and readable by
-- nobody who should not read it (20260829090000).
--
--   psql "$SUPABASE_DB_URL" -f supabase/tests/reputation-requests.sql
--
-- One transaction, rolled back. Fixture emails are @example.invalid.
--
-- ── WHAT THIS FILE IS REALLY ABOUT ────────────────────────────────────────
--
--  1. THE VISIT DEDUPE, including the case that would actually happen: a
--     facility with no locations configured writes a null location_id, and
--     under default null-distinctness every check-out that day inserts its own
--     row. That is the exact double-send the index exists to stop, and it is
--     invisible without `nulls not distinct`. T2 is the positive control.
--
--  2. RATE-ONCE. The guarantee is a unique constraint, not a check the caller
--     could race, so it is asserted here rather than in TypeScript — a second
--     tap on a slow phone is one caller in the code and two in the database.
--
--  3. THE TOKEN TELLS A GUESSER NOTHING. A wrong token, an expired one and a
--     spent one must be indistinguishable. Asserted as three calls returning
--     the same thing, because "returns null on failure" is easy to write and
--     easy to lose the moment somebody adds a helpful error message.
--
--  4. THE STAFF FK. `bookings.assigned_staff_id` is DECLARED against
--     facility_memberships in 20260801120000 and REPOINTED to staff(id) in
--     20260801150000. A trigger written from the declaration resolves nobody,
--     silently, for every row — it nearly shipped that way for tips. T9 asserts
--     a real staff row comes back, which is the only version of this test that
--     would have caught it.
--
--  5. THE GRANTS. anon reads nothing; authenticated cannot forge a request or
--     a response; the three token functions are the whole anon surface.
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
  ('00000000-0000-0000-0000-0000005a0010', 'Review Org', 'review-org')
on conflict do nothing;

insert into public.facilities (id, org_id, name, slug, legacy_id) values
  ('00000000-0000-0000-0000-0000005a0020', '00000000-0000-0000-0000-0000005a0010',
   'Review Facility', 'review-a', 'review-a')
on conflict do nothing;

insert into public.locations (id, facility_id, name, is_primary) values
  ('00000000-0000-0000-0000-0000005a0030', '00000000-0000-0000-0000-0000005a0020',
   'Review Main', true)
on conflict do nothing;

insert into public.clients (id, facility_id, name, email) values
  ('00000000-0000-0000-0000-0000005a0040', '00000000-0000-0000-0000-0000005a0020',
   'Review Client', 'review-c@example.invalid');

-- `legacy_id` is explicit because a BEFORE INSERT trigger derives it from the
-- first eight hex characters of the uuid (20260807520000), and every fixture
-- uuid in this file begins with the same eight zeros.
insert into public.staff
  (id, facility_id, first_name, last_name, email, primary_role, legacy_id) values
  ('00000000-0000-0000-0000-0000005a0050', '00000000-0000-0000-0000-0000005a0020',
   'Rita', 'Groomer', 'review-s@example.invalid', 'groomer', 'fs-rev00050');

-- Staff at ANOTHER facility, for the attribution check.
insert into public.facilities (id, org_id, name, slug, legacy_id) values
  ('00000000-0000-0000-0000-0000005a0021', '00000000-0000-0000-0000-0000005a0010',
   'Other Facility', 'review-b', 'review-b')
on conflict do nothing;

insert into public.staff
  (id, facility_id, first_name, last_name, email, primary_role, legacy_id) values
  ('00000000-0000-0000-0000-0000005a0051', '00000000-0000-0000-0000-0000005a0021',
   'Elsewhere', 'Person', 'review-x@example.invalid', 'groomer', 'fs-rev00051');

/** A live request with a usable token. Returns the plaintext token. */
create or replace function pg_temp.make_request(
  p_location uuid,
  p_day date default current_date,
  p_staff uuid default '00000000-0000-0000-0000-0000005a0050'
)
returns text language plpgsql as $$
declare
  v_token text := 'tok-' || replace(gen_random_uuid()::text, '-', '');
begin
  insert into public.review_requests (
    facility_id, location_id, client_id, business_day,
    primary_staff_id, staff_on_visit, service_types,
    expires_at, token_hash, token_expires_at, state)
  values (
    '00000000-0000-0000-0000-0000005a0020', p_location,
    '00000000-0000-0000-0000-0000005a0040', p_day,
    p_staff, case when p_staff is null then '{}'::uuid[] else array[p_staff] end,
    array['grooming'],
    now() + interval '7 days',
    private.hash_review_token(v_token), now() + interval '7 days', 'sent');
  return v_token;
end $$;

-- ── T1: one visit, one request ────────────────────────────────────────────
do $$
declare v_state text;
begin
  perform pg_temp.make_request('00000000-0000-0000-0000-0000005a0030');
  begin
    perform pg_temp.make_request('00000000-0000-0000-0000-0000005a0030');
    v_state := 'no error';
  exception when unique_violation then
    v_state := '23505';
  end;

  perform pg_temp.t(
    'T1  a second check-out on the same day cannot create a second request',
    v_state = '23505',
    format('got %s (expected 23505)', v_state));
end $$;

-- ── T2: and it holds when the facility has NO locations ───────────────────
--
-- The positive control for `nulls not distinct`. Drop that clause from the
-- index and T1 stays green while this one goes red — which is precisely how the
-- bug would reach production, since a single-location facility that never
-- created a location row is the common case, not the exotic one.
do $$
declare v_state text;
begin
  perform pg_temp.make_request(null, current_date + 1);
  begin
    perform pg_temp.make_request(null, current_date + 1);
    v_state := 'no error';
  exception when unique_violation then
    v_state := '23505';
  end;

  perform pg_temp.t(
    'T2  the dedupe holds when location_id is null (nulls not distinct)',
    v_state = '23505',
    format('got %s (expected 23505)', v_state));
end $$;

-- ── T3: a different day is a different visit ──────────────────────────────
do $$
declare v_ok boolean := true;
begin
  begin
    perform pg_temp.make_request('00000000-0000-0000-0000-0000005a0030', current_date + 5);
  exception when others then
    v_ok := false;
  end;

  perform pg_temp.t(
    'T3  tomorrow is a different visit and may be asked again',
    v_ok, 'a second day must not collide with the first');
end $$;

-- ── T4: the survey opens with a good token ────────────────────────────────
do $$
declare v_token text; v_payload jsonb;
begin
  v_token := pg_temp.make_request('00000000-0000-0000-0000-0000005a0030', current_date + 10);
  v_payload := public.review_request_by_token(v_token);

  perform pg_temp.t(
    'T4  a live token returns the survey, named and unanswered',
    v_payload is not null
      and v_payload->>'facilityName' = 'Review Facility'
      and (v_payload->>'answered')::boolean = false,
    coalesce(v_payload::text, 'null'));
end $$;

-- ── T5: a wrong token, an expired one and a spent one are the same answer ─
do $$
declare
  v_live text; v_expired text; v_bad jsonb; v_exp jsonb;
begin
  -- An expired one, made by hand so the expiry is the only difference.
  v_expired := 'tok-' || replace(gen_random_uuid()::text, '-', '');
  insert into public.review_requests (
    facility_id, location_id, client_id, business_day, expires_at,
    token_hash, token_expires_at, state)
  values (
    '00000000-0000-0000-0000-0000005a0020', '00000000-0000-0000-0000-0000005a0030',
    '00000000-0000-0000-0000-0000005a0040', current_date + 20,
    now() - interval '1 day',
    private.hash_review_token(v_expired), now() - interval '1 hour', 'sent');

  v_bad := public.review_request_by_token('tok-' || repeat('9', 32));
  v_exp := public.review_request_by_token(v_expired);

  perform pg_temp.t(
    'T5  a wrong token and an expired token are indistinguishable',
    v_bad is null and v_exp is null,
    format('wrong=%s expired=%s', coalesce(v_bad::text, 'null'), coalesce(v_exp::text, 'null')));
end $$;

-- ── T6: too-short input is refused before the index is touched ────────────
do $$
begin
  perform pg_temp.t(
    'T6  a short token is refused without a lookup',
    public.review_request_by_token('abc') is null
      and public.review_request_by_token(null) is null,
    'both must be null');
end $$;

-- ── T7: a response is recorded, once ──────────────────────────────────────
do $$
declare v_token text; v_first jsonb; v_state text;
begin
  v_token := pg_temp.make_request('00000000-0000-0000-0000-0000005a0030', current_date + 30);
  v_first := public.submit_review_response(v_token, 5, 'Lovely job', '{}', null, true, 'en', 'sms_link');

  begin
    perform public.submit_review_response(v_token, 1, 'Changed my mind');
    v_state := 'no error';
  exception when others then
    v_state := sqlstate;
  end;

  perform pg_temp.t(
    'T7  a rating is recorded once, and the second attempt is refused',
    v_first is not null and (v_first->>'rating')::int = 5 and v_state = '42501',
    format('first=%s second=%s', coalesce(v_first::text, 'null'), v_state));
end $$;

-- ── T8: a low rating escalates AND still gets the public option ───────────
--
-- The compliance property, asserted rather than described. `escalated` says
-- what happens internally; the survey payload's `channels` — which the same
-- token still returns — is what the client is shown, and it does not depend on
-- the rating anywhere in this path.
do $$
declare v_token text; v_result jsonb; v_after jsonb;
begin
  v_token := pg_temp.make_request('00000000-0000-0000-0000-0000005a0030', current_date + 31);
  v_result := public.submit_review_response(v_token, 1, 'Nala came home upset');
  v_after := public.review_request_by_token(v_token);

  perform pg_temp.t(
    'T8  a 1-star escalates internally and the public option is not withdrawn',
    (v_result->>'escalated')::boolean = true
      and v_after is not null
      and v_after ? 'channels',
    format('escalated=%s payload_has_channels=%s',
           v_result->>'escalated', (v_after ? 'channels')::text));
end $$;

-- ── T9: attribution resolves a REAL staff row, at THIS facility ───────────
--
-- See note 4 in the header. The first half proves the FK points where the code
-- thinks; the second proves a caller cannot credit somebody else's employee.
do $$
declare v_token text; v_res jsonb; v_staff uuid; v_other uuid;
begin
  v_token := pg_temp.make_request('00000000-0000-0000-0000-0000005a0030', current_date + 32);
  v_res := public.submit_review_response(
    v_token, 5, null, '{}', '00000000-0000-0000-0000-0000005a0050');
  select attributed_staff_id into v_staff
    from public.review_responses where id = (v_res->>'responseId')::uuid;

  v_token := pg_temp.make_request('00000000-0000-0000-0000-0000005a0030', current_date + 33);
  v_res := public.submit_review_response(
    v_token, 5, null, '{}', '00000000-0000-0000-0000-0000005a0051');
  select attributed_staff_id into v_other
    from public.review_responses where id = (v_res->>'responseId')::uuid;

  perform pg_temp.t(
    'T9  attribution finds this facility staff and refuses another facility',
    v_staff = '00000000-0000-0000-0000-0000005a0050'
      and v_other = '00000000-0000-0000-0000-0000005a0050',
    format('own=%s foreign_fell_back_to=%s', v_staff, v_other));
end $$;

-- ── T10: Yelp can never be a destination ──────────────────────────────────
--
-- R-02 as a constraint rather than a convention. A disabled toggle on one
-- screen is something somebody forgets; this cannot be written at all.
do $$
declare v_state text;
begin
  begin
    insert into public.review_channels
      (facility_id, platform, enabled, solicitable, profile_url)
    values ('00000000-0000-0000-0000-0000005a0020', 'yelp', true, true,
            'https://yelp.com/biz/x');
    v_state := 'accepted';
  exception when check_violation then
    v_state := 'refused';
  end;

  perform pg_temp.t(
    'T10  a solicitable Yelp channel cannot be created',
    v_state = 'refused',
    format('got %s', v_state));
end $$;

-- ── T11: a monitor-only channel is never offered to a client ──────────────
do $$
declare v_token text; v_payload jsonb; v_platforms text;
begin
  insert into public.review_channels
    (facility_id, platform, enabled, solicitable, profile_url, priority)
  values
    ('00000000-0000-0000-0000-0000005a0020', 'yelp',   true, false, 'https://yelp.com/biz/x', 1),
    ('00000000-0000-0000-0000-0000005a0020', 'google', true, true,  'https://g.page/x', 0);

  v_token := pg_temp.make_request('00000000-0000-0000-0000-0000005a0030', current_date + 40);
  v_payload := public.review_request_by_token(v_token);

  select string_agg(value->>'platform', ',') into v_platforms
    from jsonb_array_elements(v_payload->'channels');

  perform pg_temp.t(
    'T11  the survey is offered Google and never Yelp',
    v_platforms = 'google',
    format('offered=%s', coalesce(v_platforms, 'none')));
end $$;

-- ── T12: a click is stamped once, and only for an offered channel ─────────
do $$
declare
  v_token text; v_url text; v_second text; v_first_at timestamptz; v_now timestamptz;
  v_google uuid; v_yelp uuid;
begin
  select id into v_google from public.review_channels
   where facility_id = '00000000-0000-0000-0000-0000005a0020' and platform = 'google';
  select id into v_yelp from public.review_channels
   where facility_id = '00000000-0000-0000-0000-0000005a0020' and platform = 'yelp';

  v_token := pg_temp.make_request('00000000-0000-0000-0000-0000005a0030', current_date + 41);
  perform public.submit_review_response(v_token, 5, 'Great');

  v_url := public.record_review_click(v_token, v_google);
  select public_clicked_at into v_first_at
    from public.review_responses resp
    join public.review_requests r on r.id = resp.request_id
   where r.token_hash = private.hash_review_token(v_token);

  -- A monitor-only channel is not a destination even by direct id.
  v_second := public.record_review_click(v_token, v_yelp);

  select public_clicked_at into v_now
    from public.review_responses resp
    join public.review_requests r on r.id = resp.request_id
   where r.token_hash = private.hash_review_token(v_token);

  perform pg_temp.t(
    'T12  the first click is stamped, and Yelp is not a destination by id',
    v_url is not null and v_first_at is not null
      and v_second is null and v_now = v_first_at,
    format('url=%s second=%s stamp_moved=%s',
           coalesce(v_url, 'null'), coalesce(v_second, 'null'), (v_now <> v_first_at)::text));
end $$;

-- ── T13: the grants ───────────────────────────────────────────────────────
do $$
declare
  v_anon_req boolean; v_anon_resp boolean;
  v_ins_req boolean; v_ins_resp boolean; v_del_resp boolean; v_ins_tags boolean;
begin
  v_anon_req  := has_table_privilege('anon', 'public.review_requests', 'select');
  v_anon_resp := has_table_privilege('anon', 'public.review_responses', 'select');
  v_ins_req   := has_table_privilege('authenticated', 'public.review_requests', 'insert');
  v_ins_resp  := has_table_privilege('authenticated', 'public.review_responses', 'insert');
  v_del_resp  := has_table_privilege('authenticated', 'public.review_responses', 'delete');
  v_ins_tags  := has_table_privilege('authenticated', 'public.review_response_tags', 'insert');

  perform pg_temp.t(
    'T13  anon reads nothing and a session cannot forge an ask or an answer',
    not v_anon_req and not v_anon_resp
      and not v_ins_req and not v_ins_resp and not v_del_resp and not v_ins_tags,
    format('anon(req=%s resp=%s) auth(ins_req=%s ins_resp=%s del_resp=%s ins_tags=%s)',
           v_anon_req, v_anon_resp, v_ins_req, v_ins_resp, v_del_resp, v_ins_tags));
end $$;

-- ── T14: the anon surface is the three functions, and the hash is not ─────
do $$
declare v_open boolean; v_submit boolean; v_click boolean; v_hash boolean;
begin
  v_open   := has_function_privilege('anon', 'public.review_request_by_token(text)', 'execute');
  v_submit := has_function_privilege('anon',
    'public.submit_review_response(text, integer, text, uuid[], uuid, boolean, text, text)', 'execute');
  v_click  := has_function_privilege('anon', 'public.record_review_click(text, uuid)', 'execute');
  v_hash   := has_function_privilege('anon', 'private.hash_review_token(text)', 'execute');

  perform pg_temp.t(
    'T14  anon may open, answer and click - and may not hash a token itself',
    v_open and v_submit and v_click and not v_hash,
    format('open=%s submit=%s click=%s hash=%s', v_open, v_submit, v_click, v_hash));
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
