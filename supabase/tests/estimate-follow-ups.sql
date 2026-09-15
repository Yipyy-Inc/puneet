-- ============================================================================
-- An estimate follow-up is a message the tick can queue
-- (an_estimate_follow_up_is_a_message_the_tick_can_queue).
--
--   bun run test:sql estimate-follow-ups
--
-- One transaction, rolled back.
--
--   F1  message_sends admits the estimate_follow_up source kind
--   F2  the kinds already in use are still admitted
--   F3  an unknown source kind is still refused
-- ============================================================================

begin;

set local client_min_messages to warning;

create temp table tap (n serial, name text, ok boolean, detail text);

create or replace function pg_temp.t(p_name text, p_ok boolean, p_detail text default '')
returns void language sql as $$
  insert into tap(name, ok, detail) values (p_name, p_ok, p_detail);
$$;

-- ── F1–F3 ─────────────────────────────────────────────────────────────────

do $$
declare
  v_facility uuid;
  v_refused boolean := false;
begin
  select id into v_facility from public.facilities limit 1;

  insert into public.message_sends
    (facility_id, channel, to_address, source_kind, body_rendered, status,
     scheduled_for, provider, idempotency_key)
  values (v_facility, 'email', 'follow-up@example.invalid', 'estimate_follow_up',
          'test', 'cancelled', now(), 'resend', 'estimate_follow_up:sql-test');
  perform pg_temp.t('F1 estimate_follow_up is an allowed source kind', true);

  insert into public.message_sends
    (facility_id, channel, to_address, source_kind, body_rendered, status,
     scheduled_for, provider, idempotency_key)
  values (v_facility, 'email', 'follow-up@example.invalid', 'form_reminder',
          'test', 'cancelled', now(), 'resend', 'form_reminder:sql-follow-up-test');
  perform pg_temp.t('F2 form_reminder is still an allowed source kind', true);

  begin
    insert into public.message_sends
      (facility_id, channel, to_address, source_kind, body_rendered, status,
       scheduled_for, provider, idempotency_key)
    values (v_facility, 'email', 'follow-up@example.invalid', 'not_a_kind',
            'test', 'cancelled', now(), 'resend', 'not_a_kind:sql-test');
  exception when check_violation then
    v_refused := true;
  end;
  perform pg_temp.t('F3 an unknown source kind is refused', v_refused);
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
