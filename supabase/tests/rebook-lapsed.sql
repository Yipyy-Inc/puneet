-- ============================================================================
-- Who counts as lapsed, and who does not.
--
--   bun run test:sql
--
-- One transaction, rolled back.
--
-- ── WHY THIS FILE EXISTS ──────────────────────────────────────────────────
--
-- `lapsed_clients()` decides who a facility is offered a button to message.
-- Every one of its exclusions is the difference between a useful list and an
-- embarrassing one, and three of them are invisible from the screen:
--
--   P4  somebody with a booking already in the diary is NOT lapsed. This is
--       the whole point. A rebook list that chases people who have already
--       rebooked is worse than no list.
--   P6  a dismissal is compared against the LAST VISIT, not expired on a
--       timer. Somebody dismissed, who then comes back and lapses again,
--       reappears by itself — with no cleanup job to forget to write.
--   P3  a service nobody has configured produces NO rows, rather than being
--       assumed to be monthly. An assumed interval would invent a lapse.
--
-- P9 is the other half: `message_sends` has to accept `source_kind = 'rebook'`,
-- or every reminder fails at the insert and the screen reports it as skipped.
-- ============================================================================

begin;

set local client_min_messages to warning;

create temp table tap (n int, name text, ok boolean, detail text);
grant all on tap to authenticated;

create or replace function pg_temp.t(i int, p text, ok boolean, d text default '')
returns void language sql as $$
  insert into tap(n, name, ok, detail) values (i, p, ok, d);
$$;

do $$
declare
  v_fac    uuid;
  v_admin  text;
  v_client uuid;
  v_book   uuid;
  v_rules  jsonb := '{"grooming":{"frequencyDays":28,"lapsedAfterDays":14}}'::jsonb;
  v_n      int;
begin
  select m.facility_id into v_fac
    from public.facility_memberships m
   where m.is_active and m.role in ('owner', 'admin', 'manager')
   limit 1;

  select profile_id into v_admin
    from public.facility_memberships
   where facility_id = v_fac and is_active
     and role in ('owner', 'admin', 'manager')
   limit 1;

  if v_fac is null or v_admin is null then
    perform pg_temp.t(0, 'fixtures present', false, 'no facility with a manager');
    return;
  end if;

  -- ── Privilege shape, measured not assumed ───────────────────────────────

  perform pg_temp.t(1, 'anon cannot read dismissals',
    not has_table_privilege('anon', 'public.rebook_dismissals', 'select'));

  perform pg_temp.t(2, 'anon cannot ask who has lapsed',
    not has_function_privilege('anon',
      'public.lapsed_clients(uuid, jsonb, date, integer)', 'execute'));

  -- ── A client with one completed groom, 200 days ago ─────────────────────

  insert into public.clients (facility_id, name, email, phone, status)
    values (v_fac, 'ZZ Lapsed Probe', 'zz-lapsed@example.invalid', '+15145550000', 'active')
    returning id into v_client;

  insert into public.bookings
    (facility_id, client_id, service, status, start_at, end_at)
  values
    (v_fac, v_client, 'grooming', 'completed',
     now() - interval '200 days', now() - interval '200 days' + interval '2 hours')
  returning id into v_book;

  select count(*) into v_n
    from public.lapsed_clients(v_fac, v_rules, current_date, 500) l
   where l.client_id = v_client;
  perform pg_temp.t(3, 'a client 200 days past a 28-day service is lapsed',
    v_n = 1, v_n || ' row(s)');

  -- A service the facility has NOT configured must produce nothing. An
  -- assumed interval here would invent a lapse nobody asked about.
  select count(*) into v_n
    from public.lapsed_clients(v_fac, '{}'::jsonb, current_date, 500) l
   where l.client_id = v_client;
  perform pg_temp.t(4, 'an unconfigured service names nobody', v_n = 0, v_n::text);

  -- ── THE ONE THAT MATTERS: they already have a booking ───────────────────

  insert into public.bookings
    (facility_id, client_id, service, status, start_at, end_at)
  values
    (v_fac, v_client, 'grooming', 'confirmed',
     now() + interval '3 days', now() + interval '3 days' + interval '2 hours');

  select count(*) into v_n
    from public.lapsed_clients(v_fac, v_rules, current_date, 500) l
   where l.client_id = v_client;
  perform pg_temp.t(5, 'somebody who has already rebooked is NOT lapsed',
    v_n = 0, v_n || ' row(s)');

  -- Cancel it: a cancelled booking is not a booking, and they lapse again.
  update public.bookings set status = 'cancelled'
   where client_id = v_client and status = 'confirmed';

  select count(*) into v_n
    from public.lapsed_clients(v_fac, v_rules, current_date, 500) l
   where l.client_id = v_client;
  perform pg_temp.t(6, 'a cancelled booking does not keep them off the list',
    v_n = 1, v_n || ' row(s)');

  -- ── Dismissal, and its own undoing ──────────────────────────────────────

  insert into public.rebook_dismissals
    (facility_id, client_id, service, dismissed_by, dismissed_at)
  values (v_fac, v_client, 'grooming', v_admin, now());

  select count(*) into v_n
    from public.lapsed_clients(v_fac, v_rules, current_date, 500) l
   where l.client_id = v_client;
  perform pg_temp.t(7, 'a dismissed client is hidden', v_n = 0, v_n || ' row(s)');

  -- They come back AFTER being dismissed, and lapse again.
  --
  -- Both halves are needed and the order is the point: the dismissal has to
  -- predate the visit. Written as elapsed time rather than "dismiss, then
  -- visit" because a transaction has only one `now()` — dismissed 150 days
  -- ago, returned 100 days ago, still 100 days without a groom today.
  --
  -- Nothing clears the dismissal. It simply stops applying, which is the whole
  -- reason it is a timestamp compared against the last visit rather than a
  -- flag somebody has to remember to reset.
  update public.rebook_dismissals
     set dismissed_at = now() - interval '150 days'
   where client_id = v_client;

  insert into public.bookings
    (facility_id, client_id, service, status, start_at, end_at)
  values
    (v_fac, v_client, 'grooming', 'completed',
     now() - interval '100 days', now() - interval '100 days' + interval '2 hours');

  select count(*) into v_n
    from public.lapsed_clients(v_fac, v_rules, current_date, 500) l
   where l.client_id = v_client;
  perform pg_temp.t(8,
    'a client who returned and lapsed again comes back on the list',
    v_n = 1, v_n || ' row(s)');

  delete from public.rebook_dismissals
   where client_id = v_client;

  -- ── The outbox accepts a rebook, and the count reads back ───────────────

  begin
    insert into public.message_sends
      (facility_id, client_id, channel, to_address, source_kind,
       body_rendered, status, idempotency_key)
    values
      (v_fac, v_client, 'email', 'zz-lapsed@example.invalid', 'rebook',
       'probe', 'queued',
       'rebook:grooming:-:' || v_client::text || ':email:' || current_date);
    perform pg_temp.t(9, 'the outbox accepts source_kind = rebook', true);
  exception when others then
    perform pg_temp.t(9, 'the outbox accepts source_kind = rebook', false, sqlerrm);
  end;

  -- Counted off the key rather than a column, so it cannot disagree with the
  -- log. If the key format ever changes, this is what notices.
  select l.reminders_sent into v_n
    from public.lapsed_clients(v_fac, v_rules, current_date, 500) l
   where l.client_id = v_client;
  perform pg_temp.t(10, 'reminders_sent reads the outbox back',
    v_n = 1, coalesce(v_n::text, 'null'));

  -- ── An inactive client is nobody's rebook target ────────────────────────

  update public.clients set status = 'inactive' where id = v_client;
  select count(*) into v_n
    from public.lapsed_clients(v_fac, v_rules, current_date, 500) l
   where l.client_id = v_client;
  perform pg_temp.t(11, 'an inactive client is not chased', v_n = 0, v_n || ' row(s)');

  update public.clients set status = 'active', is_blocked = true where id = v_client;
  select count(*) into v_n
    from public.lapsed_clients(v_fac, v_rules, current_date, 500) l
   where l.client_id = v_client;
  perform pg_temp.t(12, 'a blocked client is not chased', v_n = 0, v_n || ' row(s)');
end $$;

select n, name, case when ok then 'PASS' else 'FAIL' end as result, detail
  from tap order by n;

do $$
declare v_failed int;
begin
  select count(*) into v_failed from tap where not ok;
  if v_failed > 0 then
    raise exception '% assertion(s) failed', v_failed;
  end if;
end $$;

rollback;
