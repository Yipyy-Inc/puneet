-- ============================================================================
-- A call record is readable, is NOT editable, and a recording needs its own key.
--
--   psql "$SUPABASE_DB_URL" -f supabase/tests/call-record-rls.sql
--
-- ── THE ONE ASSERTION THIS FILE EXISTS FOR ─────────────────────────────────
--
-- `public.call_record` has NO update policy, on purpose. A column-blind one
-- would let a member of staff edit `status` and `duration_s` — the numbers the
-- answer-rate report and the QA screens publish ABOUT THEM. "Missed" becomes
-- "completed" and nothing anywhere records that it changed, because the
-- projection is also the evidence.
--
-- An absent policy is invisible. Nobody reviewing a migration notices a policy
-- that was never written, and the next person adding a feature to this table
-- will reach for `for all using (...)` because that is what every other table
-- here has. This file is what makes the absence deliberate rather than an
-- oversight waiting to be helpfully corrected.
--
-- ── AND WHY THE GRANTS ARE ASKED, NOT READ ─────────────────────────────────
--
-- `grant select` does not take INSERT away; Supabase grants all four to
-- `authenticated` by default and the revoke has to be explicit. A revoke naming
-- a privilege the role does not hold succeeds silently and looks identical to
-- one that worked — see 20260822610000, which exists because of exactly that.
-- So `has_table_privilege` is asked.
--
-- ── SEEDED AS service_role WOULD ───────────────────────────────────────────
--
-- There is no other path: `call_event` is inserted only by the webhook running
-- as service_role, and `call_record` is written only by the trigger. The
-- session-level assertions come after the role switch.
-- ============================================================================

begin;

set local client_min_messages to warning;

create temp table tap (n int, name text, ok boolean, detail text);
grant all on tap to authenticated, anon;

create or replace function pg_temp.t(i int, p text, ok boolean, d text default '')
returns void language sql as $$
  insert into tap(n, name, ok, detail) values (i, p, ok, d);
$$;

-- ── The grants, asked of the database ──────────────────────────────────────

select pg_temp.t(1, 'C1 authenticated may SELECT call_record',
  has_table_privilege('authenticated', 'public.call_record', 'SELECT'));

select pg_temp.t(2, 'C2 authenticated may NOT UPDATE call_record',
  not has_table_privilege('authenticated', 'public.call_record', 'UPDATE'));

select pg_temp.t(3, 'C3 authenticated may NOT INSERT call_record',
  not has_table_privilege('authenticated', 'public.call_record', 'INSERT'));

select pg_temp.t(4, 'C4 authenticated may NOT DELETE call_record',
  not has_table_privilege('authenticated', 'public.call_record', 'DELETE'));

select pg_temp.t(5, 'C5 anon may not even read a call record',
  not has_table_privilege('anon', 'public.call_record', 'SELECT'));

select pg_temp.t(6, 'C6 authenticated may not write the event log',
  not has_table_privilege('authenticated', 'public.call_event', 'INSERT')
  and not has_table_privilege('authenticated', 'public.call_event', 'UPDATE')
  and not has_table_privilege('authenticated', 'public.call_event', 'DELETE'));

-- Belt AND braces: the grant is gone, and there is no policy that would permit
-- it either. Both, because either one alone is a single point of failure and
-- the next person to touch this will change one of them.
select pg_temp.t(7, 'C7 and NO update policy exists on call_record',
  (select count(*) from pg_policies
    where schemaname = 'public' and tablename = 'call_record'
      and cmd in ('UPDATE', 'ALL')) = 0);

select pg_temp.t(8, 'C8 nor any insert or delete policy',
  (select count(*) from pg_policies
    where schemaname = 'public' and tablename = 'call_record'
      and cmd in ('INSERT', 'DELETE')) = 0);

select pg_temp.t(9, 'C9 annotate_call is not callable by anon',
  not has_function_privilege('anon',
    'public.annotate_call(uuid, text, text[], text, uuid, integer, uuid, text)',
    'EXECUTE'));

select pg_temp.t(10, 'C10 but IS callable by authenticated',
  has_function_privilege('authenticated',
    'public.annotate_call(uuid, text, text[], text, uuid, integer, uuid, text)',
    'EXECUTE'));

-- ── The projection, and the retry that must not double-count ───────────────

-- Two facilities of its own.
--
-- The first version of this file selected `comm-alpha` and `comm-beta` out of
-- `public.facilities`, on the assumption that communication-rls.sql had left
-- them there. It had not: that file provisions them inside its own transaction
-- and rolls back, so `ids` was EMPTY and every insert below affected zero rows.
--
-- The failure was quiet in exactly the way this suite is built to avoid. The
-- retry assertion "passed" as ACCEPTED because inserting nothing twice raises
-- no unique violation, and the append-only assertion "passed" because updating
-- nothing fires no trigger. Only the positive controls (C11, C17) failed, and
-- they are the reason the rest were not believed.
insert into public.profiles (id, email, full_name) values
  ('user_callAdmin00000000000000000', 'calladmin@yipyy.invalid', 'Call Admin')
on conflict (id) do nothing;

insert into public.platform_memberships (profile_id, role) values
  ('user_callAdmin00000000000000000', 'superadmin')
on conflict (profile_id) do nothing;

select set_config('request.jwt.claims',
  json_build_object('sub','user_callAdmin00000000000000000','role','authenticated')::text, true);
set local role authenticated;

do $$
begin
  perform public.provision_facility('0000000f-0000-4000-8000-000000000001'::uuid,
    'Call Alpha', 'call-alpha', 'America/Toronto', 'Call A Owner', 'callaowner@alpha.invalid');
  perform public.provision_facility('0000000f-0000-4000-8000-000000000002'::uuid,
    'Call Beta', 'call-beta', 'America/Toronto', 'Call B Owner', 'callbowner@beta.invalid');
end $$;

reset role;

create temp table ids (slug text primary key, id uuid);
grant all on ids to authenticated, anon;
insert into ids (slug, id)
select slug, id from public.facilities where slug in ('call-alpha', 'call-beta');

-- provision_facility invites the owner but leaves no ACTIVE membership, so the
-- member below is granted one explicitly. communication-rls.sql learned this
-- the hard way: without it the session reads nothing, and a "cannot read
-- another facility" assertion passes because it can read nothing at all.

insert into public.profiles (id, email, full_name) values
  ('user_callAlpha000000000000000000', 'callalpha@yipyy.invalid', 'Call Alpha')
on conflict (id) do nothing;

insert into public.facility_memberships (profile_id, facility_id, role, is_active)
select 'user_callAlpha000000000000000000', id, 'owner', true
  from ids where slug = 'call-alpha'
on conflict do nothing;

insert into public.call_event (facility_id, provider_call_sid, type, occurred_at, payload)
select id, 'CAtest0000000001', 'ringing', '2026-09-02T10:00:00Z',
       '{"from":"+15145550100","to":"+15145550199"}'::jsonb from ids where slug = 'call-alpha';
insert into public.call_event (facility_id, provider_call_sid, type, occurred_at, payload)
select id, 'CAtest0000000001', 'answered', '2026-09-02T10:00:05Z', '{}'::jsonb
  from ids where slug = 'call-alpha';
insert into public.call_event (facility_id, provider_call_sid, type, occurred_at, payload)
select id, 'CAtest0000000001', 'completed', '2026-09-02T10:03:00Z',
       '{"duration_s":"175"}'::jsonb from ids where slug = 'call-alpha';

select pg_temp.t(11, 'C11 three events project one call record',
  (select count(*) from public.call_record where provider_call_sid = 'CAtest0000000001') = 1);

select pg_temp.t(12, 'C12 and it carries the measured status and duration',
  (select status || '/' || duration_s from public.call_record
    where provider_call_sid = 'CAtest0000000001') = 'completed/175');

do $$
declare state text;
begin
  begin
    -- Byte-identical to the third event above. Carriers retry for hours when a
    -- webhook is slow, and without the unique constraint this would add a
    -- second completed call to every count on the Analytics tab.
    insert into public.call_event (facility_id, provider_call_sid, type, occurred_at, payload)
    select id, 'CAtest0000000001', 'completed', '2026-09-02T10:03:00Z',
           '{"duration_s":"175"}'::jsonb from ids where slug = 'call-alpha';
    state := 'ACCEPTED';
  exception when unique_violation then state := 'REFUSED';
  end;
  perform pg_temp.t(13, 'C13 a retried webhook is refused, not counted twice',
    state = 'REFUSED', 'state=' || state);
end $$;

do $$
declare state text; n int;
begin
  begin
    -- THE REALISTIC RETRY: the same logical event with a DIFFERENT timestamp.
    --
    -- C13 above retries byte-identically, which is the easy case and the one
    -- the original (sid, type, occurred_at) constraint could catch. A carrier
    -- does not promise an identical timestamp, and a handler stamping its own
    -- now() guarantees a different one — so on the shipped schema this was
    -- ACCEPTED and one call held two completed events.
    --
    -- Measured, then fixed by 20260902125815's partial unique index. The two
    -- assertions are kept apart deliberately: C13 alone passed against a
    -- constraint that could not do the job.
    insert into public.call_event (facility_id, provider_call_sid, type, occurred_at, payload)
    select id, 'CAtest0000000001', 'completed', '2026-09-02T10:03:59Z',
           '{"duration_s":"175"}'::jsonb from ids where slug = 'call-alpha';
    state := 'ACCEPTED';
  exception when unique_violation then state := 'REFUSED';
  end;
  perform pg_temp.t(26, 'C26 a retry with a DIFFERENT timestamp is also refused',
    state = 'REFUSED', 'state=' || state);

  select count(*) into n from public.call_event
   where provider_call_sid = 'CAtest0000000001' and type = 'completed';
  perform pg_temp.t(27, 'C27 so one call still holds one completed event',
    n = 1, 'completed events=' || n);
end $$;

-- The control. Without it, C26 reads as "the index collapses everything" and a
-- ring group of four phones would silently become one ringing event — erasing
-- the fact a facility most wants to see, that four phones rang and nobody
-- picked up.
do $$
declare state text; n int;
begin
  begin
    insert into public.call_event (facility_id, provider_call_sid, type, occurred_at, payload)
    select id, 'CAtest0000000001', 'ringing', '2026-09-02T10:00:02Z',
           '{"device":"mobile"}'::jsonb from ids where slug = 'call-alpha';
    state := 'ACCEPTED';
  exception when unique_violation then state := 'REFUSED';
  end;
  perform pg_temp.t(28, 'C28 but a second device ringing is NOT collapsed',
    state = 'ACCEPTED', 'state=' || state);
end $$;

select pg_temp.t(14, 'C14 and there is still exactly one call record',
  (select count(*) from public.call_record where provider_call_sid = 'CAtest0000000001') = 1);

do $$
declare state text;
begin
  -- A late event overtaking a later one is something carriers genuinely
  -- deliver. It must not walk a finished call back to ringing.
  insert into public.call_event (facility_id, provider_call_sid, type, occurred_at, payload)
  select id, 'CAtest0000000001', 'ringing', '2026-09-02T10:00:01Z', '{}'::jsonb
    from ids where slug = 'call-alpha';
  select status into state from public.call_record where provider_call_sid = 'CAtest0000000001';
  perform pg_temp.t(15, 'C15 a late ringing does not reopen a completed call',
    state = 'completed', 'status=' || state);
end $$;

do $$
declare state text;
begin
  begin
    update public.call_event set type = 'failed'
     where provider_call_sid = 'CAtest0000000001';
    state := 'ACCEPTED';
  exception when others then state := sqlstate;
  end;
  -- Append-only for EVERY role, including the one that writes it. A log that
  -- can be edited is not evidence of anything.
  perform pg_temp.t(16, 'C16 call_event is append-only even for the writer',
    state = '42501', 'state=' || state);
end $$;

-- A second facility's call, so the cross-tenant assertion has something to miss.
insert into public.call_event (facility_id, provider_call_sid, type, occurred_at, payload)
select id, 'CAtest0000000002', 'completed', '2026-09-02T11:00:00Z',
       '{"duration_s":"60"}'::jsonb from ids where slug = 'call-beta';

insert into public.call_recording
  (facility_id, call_record_id, provider_recording_sid, recording_url, duration_s)
select r.facility_id, r.id, 'REtest0000000001', 'https://example.invalid/r1', 175
  from public.call_record r where r.provider_call_sid = 'CAtest0000000001';

-- ── As a member of alpha ───────────────────────────────────────────────────

select set_config('request.jwt.claims',
  json_build_object('sub','user_callAlpha000000000000000000','role','authenticated')::text,
  true);
set local role authenticated;

select pg_temp.t(17, 'C17 a member reads their own facility''s calls',
  (select count(*) from public.call_record where provider_call_sid = 'CAtest0000000001') = 1);

-- The positive above is what makes this meaningful: zero because the policy
-- works, not zero because nothing was seeded.
select pg_temp.t(18, 'C18 and CANNOT read another facility''s calls',
  (select count(*) from public.call_record where provider_call_sid = 'CAtest0000000002') = 0);

do $$
declare state text;
begin
  begin
    -- The attack this table is shaped against: a member of staff turning their
    -- own missed call into a completed one.
    update public.call_record set status = 'completed', duration_s = 999
     where provider_call_sid = 'CAtest0000000001';
    state := 'ACCEPTED';
  exception when others then state := sqlstate;
  end;
  perform pg_temp.t(19, 'C19 a member CANNOT update the measured fields',
    state <> 'ACCEPTED', 'state=' || state);
end $$;

select pg_temp.t(20, 'C20 and the status is untouched',
  (select status from public.call_record where provider_call_sid = 'CAtest0000000001') = 'completed');

do $$
declare state text;
begin
  begin
    delete from public.call_record where provider_call_sid = 'CAtest0000000001';
    state := 'ACCEPTED';
  exception when others then state := sqlstate;
  end;
  perform pg_temp.t(21, 'C21 nor delete a call record',
    state <> 'ACCEPTED', 'state=' || state);
end $$;

-- ── annotate_call reaches the notes and nothing else ───────────────────────

do $$
declare v_id uuid; v_row public.call_record; state text;
begin
  select id into v_id from public.call_record where provider_call_sid = 'CAtest0000000001';
  begin
    select * into v_row from public.annotate_call(
      p_call_id => v_id,
      p_notes => 'called back, left a message',
      p_tags => array['billing'],
      p_follow_up_status => 'completed');
    state := 'ok';
  exception when others then state := sqlstate || ' ' || sqlerrm;
  end;
  perform pg_temp.t(22, 'C22 a member CAN annotate through the RPC',
    state = 'ok', 'state=' || state);
  perform pg_temp.t(23, 'C23 and the annotation landed',
    v_row.notes = 'called back, left a message'
    and v_row.follow_up_status = 'completed', 'notes=' || coalesce(v_row.notes,'null'));
  -- The whole point: the RPC has no parameter that reaches these, so the
  -- annotation cannot become an edit of the measurement.
  perform pg_temp.t(24, 'C24 while status and duration are unchanged by it',
    v_row.status = 'completed' and v_row.duration_s = 175,
    'status=' || v_row.status || ' duration=' || coalesce(v_row.duration_s::text,'null'));
end $$;

-- ── A recording needs its own permission ───────────────────────────────────
--
-- The owner seeded above holds every key, so this asserts the positive. The
-- negative — a groomer without `calling_view_recordings` selecting zero — needs
-- a second membership with a narrowed role and belongs with the e2e permission
-- specs, which already build those. Noted rather than silently skipped.

select pg_temp.t(25, 'C25 an owner reads the recording for their own call',
  (select count(*) from public.call_recording
    where provider_recording_sid = 'REtest0000000001') = 1);

reset role;

-- ── Report ─────────────────────────────────────────────────────────────────

select case when ok then '  PASS  ' else '> FAIL <' end as result, name, detail
  from tap order by n;

select count(*) filter (where ok) || ' passed, '
    || count(*) filter (where not ok) || ' failed' as summary
  from tap;

rollback;
