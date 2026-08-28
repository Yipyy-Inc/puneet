-- ============================================================================
-- The outbox is evidence, and nobody with a session may write it.
--
--   bun run test:sql   (or -f this file against SUPABASE_DB_URL)
--
-- One transaction, rolled back.
--
-- ── WHAT THIS FILE IS REALLY ABOUT ─────────────────────────────────────────
--
-- `message_sends` answers "what did we actually tell this customer, and when".
-- Under CASL that is a record a facility has to be able to produce, and in
-- every support argument it is the thing that settles it. A session that can
-- INSERT or UPDATE there can forge that answer.
--
-- So the grants on this table are deliberately narrower than the rest of the
-- schema, and P1-P4 measure that rather than trusting it. A default privilege
-- in this project hands `authenticated` the full set on every new table, so
-- "we only granted SELECT" does NOT mean the rest was taken away — an explicit
-- REVOKE is what does that, and a REVOKE naming a privilege the role never
-- held succeeds silently and looks identical to one that worked.
--
-- P6/P7 use GET DIAGNOSTICS row_count rather than re-reading the row. An
-- RLS-refused UPDATE affects zero rows SILENTLY — it does not raise — so
-- "the row still looks right" proves nothing.
--
-- P8/P9 cover the two guards that make the two-template design work: a rule
-- may not name an SMS template in its email slot, and may not reach another
-- facility's template at all.
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
  v_fac uuid;
  v_other uuid;
  v_admin text;
  v_plain text;
  v_email uuid;
  v_sms uuid;
  v_rule uuid;
  v_rows int;
  v_ok boolean;
begin
  -- A facility that has BOTH someone who may manage automations and someone
  -- who may not. The permission boundary is the interesting one here, and it
  -- cannot be measured without both.
  select m.facility_id into v_fac
    from public.facility_memberships m
   where m.is_active and m.role in ('owner', 'admin', 'manager')
     and exists (
       select 1 from public.facility_memberships o
        where o.facility_id = m.facility_id and o.is_active
          and o.role not in ('owner', 'admin', 'manager')
     )
   limit 1;

  -- Fall back to any facility with a manager, if no such pair exists.
  if v_fac is null then
    select facility_id into v_fac
      from public.facility_memberships
     where is_active and role in ('owner', 'admin', 'manager')
     limit 1;
  end if;

  select profile_id into v_admin
    from public.facility_memberships
   where facility_id = v_fac and is_active
     and role in ('owner', 'admin', 'manager')
   limit 1;

  select profile_id into v_plain
    from public.facility_memberships
   where facility_id = v_fac and is_active
     and role not in ('owner', 'admin', 'manager')
   limit 1;

  if v_fac is null or v_admin is null then
    perform pg_temp.t(0, 'fixtures present', false, 'no facility with a manager');
    return;
  end if;

  -- ── Privilege shape, measured not assumed ───────────────────────────────

  perform pg_temp.t(1, 'anon cannot read the outbox',
    not has_table_privilege('anon', 'public.message_sends', 'select'));

  perform pg_temp.t(2, 'authenticated cannot INSERT into the outbox',
    not has_table_privilege('authenticated', 'public.message_sends', 'insert'));

  perform pg_temp.t(3, 'authenticated cannot UPDATE the outbox',
    not has_table_privilege('authenticated', 'public.message_sends', 'update'));

  perform pg_temp.t(4, 'authenticated cannot write automation_events directly',
    not has_table_privilege('authenticated', 'public.automation_events', 'insert'));

  -- The seeding function must be service_role only, or any signed-in user
  -- could aim it at an arbitrary facility.
  perform pg_temp.t(5, 'ensure_message_templates is not callable by a session',
    not has_function_privilege('authenticated', 'public.ensure_message_templates(uuid)', 'execute')
    and not has_function_privilege('anon', 'public.ensure_message_templates(uuid)', 'execute'));

  -- ── As a member of the facility ─────────────────────────────────────────

  perform public.ensure_message_templates(v_fac);
  select id into v_email from public.message_templates
    where facility_id = v_fac and key = 'booking_confirmation';
  select id into v_sms from public.message_templates
    where facility_id = v_fac and key = 'reminder_24h';

  perform set_config('request.jwt.claims',
    json_build_object('sub', v_admin, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';

  -- A rule created through a session is DISABLED. The column default is the
  -- only thing standing between an import and a facility messaging everybody.
  insert into public.automation_rules (facility_id, name, trigger, email_template_id)
    values (v_fac, 'ZZ rls probe', 'booking_created', v_email)
    returning id, not enabled into v_rule, v_ok;
  perform pg_temp.t(6, 'a new rule is created switched OFF', v_ok);

  execute 'reset role';

  -- ── A member of the SAME facility, without the permission ───────────────
  --
  -- Reading is deliberately wide: a receptionist asked "did the customer get
  -- the confirmation?" has to be able to see that the rule exists. WRITING is
  -- marketing_manage_automations, because a rule is an instruction to message
  -- other people's customers unattended.
  if v_plain is not null then
    perform set_config('request.jwt.claims',
      json_build_object('sub', v_plain, 'role', 'authenticated')::text, true);
    execute 'set local role authenticated';

    select count(*) into v_rows from public.automation_rules where id = v_rule;
    perform pg_temp.t(13, 'a colleague without the permission can still READ the rule',
      v_rows = 1, v_rows || ' rows visible');

    update public.automation_rules set enabled = true where id = v_rule;
    get diagnostics v_rows = row_count;
    perform pg_temp.t(14, 'a colleague without the permission cannot ENABLE it',
      v_rows = 0, v_rows || ' rows affected');

    execute 'reset role';
  else
    perform pg_temp.t(13, 'a colleague without the permission can still READ the rule', true, 'skipped: no such member');
    perform pg_temp.t(14, 'a colleague without the permission cannot ENABLE it', true, 'skipped: no such member');
  end if;

  -- ── A member of a DIFFERENT facility ────────────────────────────────────

  select f.id into v_other from public.facilities f where f.id <> v_fac limit 1;

  if v_other is not null then
    declare v_stranger text;
    begin
      -- NOT a platform admin. `private.is_platform_admin()` is the first arm
      -- of every read policy here, so a Yipyy staffer reading another
      -- facility's rules is the system working, not a leak — and the first
      -- draft of this test picked one and reported a false failure. The
      -- stranger has to be somebody with no business seeing this facility at
      -- all.
      select m.profile_id into v_stranger
        from public.facility_memberships m
       where m.facility_id = v_other and m.is_active
         and m.profile_id not in (
           select profile_id from public.facility_memberships where facility_id = v_fac
         )
         and not exists (
           select 1 from public.platform_memberships p
            where p.profile_id = m.profile_id
         )
       limit 1;

      if v_stranger is not null then
        perform set_config('request.jwt.claims',
          json_build_object('sub', v_stranger, 'role', 'authenticated')::text, true);
        execute 'set local role authenticated';

        select count(*) into v_rows from public.automation_rules where facility_id = v_fac;
        perform pg_temp.t(7, 'another facility cannot read these rules',
          v_rows = 0, v_rows || ' rows visible');

        -- Zero rows affected IS the refusal. It does not raise.
        update public.automation_rules set enabled = true where id = v_rule;
        get diagnostics v_rows = row_count;
        perform pg_temp.t(8, 'another facility cannot enable this rule',
          v_rows = 0, v_rows || ' rows affected');

        execute 'reset role';
      else
        perform pg_temp.t(7, 'another facility cannot read these rules', true, 'skipped: no disjoint member');
        perform pg_temp.t(8, 'another facility cannot enable this rule', true, 'skipped: no disjoint member');
      end if;
    end;
  else
    perform pg_temp.t(7, 'another facility cannot read these rules', true, 'skipped: single facility');
    perform pg_temp.t(8, 'another facility cannot enable this rule', true, 'skipped: single facility');
  end if;

  -- ── The template guards ─────────────────────────────────────────────────
  --
  -- These are what make one-column-per-channel safe. Without them the shape is
  -- no better than the single `templateId` it replaced, which is how "Payment
  -- Receipt" came to render the Check-Out SMS body.

  begin
    insert into public.automation_rules (facility_id, name, trigger, email_template_id)
      values (v_fac, 'ZZ rls probe wrong channel', 'booking_created', v_sms);
    perform pg_temp.t(9, 'an SMS template is refused in the email slot', false, 'it was accepted');
  exception when others then
    perform pg_temp.t(9, 'an SMS template is refused in the email slot', true, sqlerrm);
  end;

  begin
    insert into public.automation_rules (facility_id, name, trigger)
      values (v_fac, 'ZZ rls probe no template', 'booking_created');
    perform pg_temp.t(10, 'a rule with no template at all is refused', false, 'it was accepted');
  exception when others then
    perform pg_temp.t(10, 'a rule with no template at all is refused', true, sqlerrm);
  end;

  -- ── The idempotency key is the authority on double sends ────────────────

  insert into public.message_sends
    (facility_id, channel, to_address, source_kind, source_id,
     body_rendered, idempotency_key)
  values
    (v_fac, 'email', 'probe@example.com', 'automation_rule', v_rule,
     'body', 'ZZ:probe:key');

  begin
    insert into public.message_sends
      (facility_id, channel, to_address, source_kind, source_id,
       body_rendered, idempotency_key)
    values
      (v_fac, 'email', 'probe@example.com', 'automation_rule', v_rule,
       'body', 'ZZ:probe:key');
    perform pg_temp.t(11, 'a duplicate idempotency key is refused', false, 'it was accepted');
  exception when unique_violation then
    perform pg_temp.t(11, 'a duplicate idempotency key is refused', true);
  end;

  -- ── A sent message is frozen ────────────────────────────────────────────

  update public.message_sends
     set status = 'sent', sent_at = now()
   where idempotency_key = 'ZZ:probe:key';

  begin
    update public.message_sends
       set body_rendered = 'rewritten after the fact'
     where idempotency_key = 'ZZ:probe:key';
    perform pg_temp.t(12, 'a sent message cannot be rewritten', false, 'it was accepted');
  exception when others then
    perform pg_temp.t(12, 'a sent message cannot be rewritten', true, sqlerrm);
  end;
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
