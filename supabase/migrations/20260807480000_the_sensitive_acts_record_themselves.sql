-- ============================================================================
-- The acts that matter record themselves.
--
-- ── WHY TRIGGERS AND NOT A LINE IN EACH FUNCTION ──────────────────────────
--
-- The obvious implementation is a private.record_audit() call inside
-- set_subscription_status, grant_platform_role, invite_facility_owner and the
-- rest. It was rejected for a reason that is easy to check: TODAY, every
-- sensitive change to this database was made by direct SQL, not through those
-- functions.
--
-- A superadmin role was granted, two owners' staff rows were repaired, an
-- invitation was inspected — all by hand, through the MCP connection. An audit
-- trail that only records the happy path through the API records none of the
-- work that most needs recording, and the gap is invisible: the log looks
-- healthy and is simply missing entries.
--
-- A trigger fires for every writer. Function, migration, psql, a support
-- engineer with a connection string. That is what an audit trail is for.
--
-- ── EACH TRIGGER FUNCTION IS SECURITY DEFINER ─────────────────────────────
--
-- private.record_audit has EXECUTE revoked from `authenticated` — writing an
-- entry is something an audited act does, never something a caller may ask
-- for. A trigger function running as the invoking user could therefore not
-- call it. Running as the owner is what lets the trail be written while the
-- callers stay unable to forge entries directly.
-- ============================================================================

-- ── A facility exists ──────────────────────────────────────────────────────

create or replace function private.audit_facility_created()
returns trigger language plpgsql security definer set search_path to '' as $fn$
begin
  perform private.record_audit(
    'Facility provisioned', 'Configuration', 'Medium',
    'facility', new.id::text, new.name, new.id, new.name,
    format('%s was created at %s.yipyy.com', new.name, new.slug));
  return null;
end $fn$;

drop trigger if exists facilities_audit_insert on public.facilities;
create trigger facilities_audit_insert
  after insert on public.facilities
  for each row execute function private.audit_facility_created();

-- Registration being opened or closed changes who can put themselves on a
-- facility's client list, so it is a configuration change worth a line.
create or replace function private.audit_facility_signup()
returns trigger language plpgsql security definer set search_path to '' as $fn$
begin
  if new.allow_customer_signup is distinct from old.allow_customer_signup then
    perform private.record_audit(
      case when new.allow_customer_signup
           then 'Customer sign-up opened' else 'Customer sign-up closed' end,
      'Configuration', 'Medium',
      'facility', new.id::text, new.name, new.id, new.name,
      null,
      jsonb_build_array(jsonb_build_object(
        'field', 'allow_customer_signup',
        'from',  old.allow_customer_signup,
        'to',    new.allow_customer_signup)));
  end if;
  return null;
end $fn$;

drop trigger if exists facilities_audit_signup on public.facilities;
create trigger facilities_audit_signup
  after update of allow_customer_signup on public.facilities
  for each row execute function private.audit_facility_signup();

-- ── A facility's doors open or close ───────────────────────────────────────
--
-- Suspension stops a business trading. High, or Critical when it is cancelled.

create or replace function private.audit_subscription_status()
returns trigger language plpgsql security definer set search_path to '' as $fn$
declare v_name text;
begin
  if new.status is not distinct from old.status then
    return null;
  end if;

  select f.name into v_name from public.facilities f where f.id = new.facility_id;

  perform private.record_audit(
    format('Subscription %s', new.status),
    'Financial',
    case when new.status = 'cancelled' then 'Critical'
         when new.status in ('suspended','past_due') then 'High'
         else 'Medium' end,
    'subscription', new.facility_id::text, v_name, new.facility_id, v_name,
    format('%s: %s -> %s', coalesce(v_name, 'facility'), old.status, new.status),
    jsonb_build_array(jsonb_build_object(
      'field', 'status', 'from', old.status, 'to', new.status)));
  return null;
end $fn$;

drop trigger if exists facility_subscriptions_audit_status on public.facility_subscriptions;
create trigger facility_subscriptions_audit_status
  after update of status on public.facility_subscriptions
  for each row execute function private.audit_subscription_status();

-- ── Somebody joins or leaves the platform team ─────────────────────────────
--
-- Critical without exception. A superadmin can suspend any business on the
-- platform and grant the same power to anyone else, so who holds it and since
-- when is the single most important thing this table records.

create or replace function private.audit_platform_role()
returns trigger language plpgsql security definer set search_path to '' as $fn$
declare
  v_subject text;
  v_email   text;
begin
  v_subject := case when tg_op = 'DELETE' then old.profile_id else new.profile_id end;
  select p.email into v_email from public.profiles p where p.id = v_subject;

  if tg_op = 'INSERT' then
    perform private.record_audit(
      'Platform role granted', 'User Access', 'Critical',
      'platform_membership', v_subject, v_email, null, null,
      format('%s was granted %s', coalesce(v_email, v_subject), new.role),
      jsonb_build_array(jsonb_build_object('field','role','from',null,'to',new.role)));
  elsif tg_op = 'UPDATE' then
    if new.role is not distinct from old.role then return null; end if;
    perform private.record_audit(
      'Platform role changed', 'User Access', 'Critical',
      'platform_membership', v_subject, v_email, null, null,
      format('%s: %s -> %s', coalesce(v_email, v_subject), old.role, new.role),
      jsonb_build_array(jsonb_build_object('field','role','from',old.role,'to',new.role)));
  else
    perform private.record_audit(
      'Platform role revoked', 'User Access', 'Critical',
      'platform_membership', v_subject, v_email, null, null,
      format('%s lost %s', coalesce(v_email, v_subject), old.role),
      jsonb_build_array(jsonb_build_object('field','role','from',old.role,'to',null)));
  end if;
  return null;
end $fn$;

drop trigger if exists platform_memberships_audit on public.platform_memberships;
create trigger platform_memberships_audit
  after insert or update or delete on public.platform_memberships
  for each row execute function private.audit_platform_role();

-- ── An invitation is sent, accepted, or taken back ─────────────────────────
--
-- The three states of the thing that went wrong this afternoon. "Sent to
-- whom, when, and did they accept" had no answer outside the database.

create or replace function private.audit_membership_grant()
returns trigger language plpgsql security definer set search_path to '' as $fn$
declare
  v_name text;
  v_fid  uuid;
begin
  v_fid := case when tg_op = 'DELETE' then old.facility_id else new.facility_id end;
  select f.name into v_name from public.facilities f where f.id = v_fid;

  if tg_op = 'INSERT' then
    perform private.record_audit(
      'Invitation sent', 'User Access', 'Medium',
      'membership_grant', new.email, new.email, v_fid, v_name,
      format('%s invited as %s', new.email, new.role));
  elsif tg_op = 'UPDATE' then
    -- Only the transition to claimed is interesting; a re-send rewrites the
    -- row and is already recorded by its own INSERT ... ON CONFLICT path.
    if old.claimed_at is null and new.claimed_at is not null then
      perform private.record_audit(
        'Invitation accepted', 'User Access', 'Medium',
        'membership_grant', new.email, new.email, v_fid, v_name,
        format('%s accepted and can now sign in', new.email));
    elsif old.email is distinct from new.email then
      perform private.record_audit(
        'Invitation re-addressed', 'User Access', 'High',
        'membership_grant', new.email, new.email, v_fid, v_name,
        format('invitation moved from %s to %s', old.email, new.email),
        jsonb_build_array(jsonb_build_object(
          'field','email','from',old.email,'to',new.email)));
    end if;
  else
    perform private.record_audit(
      'Invitation withdrawn', 'User Access', 'High',
      'membership_grant', old.email, old.email, v_fid, v_name,
      format('the invitation to %s was withdrawn', old.email));
  end if;
  return null;
end $fn$;

drop trigger if exists membership_grants_audit on public.facility_membership_grants;
create trigger membership_grants_audit
  after insert or update or delete on public.facility_membership_grants
  for each row execute function private.audit_membership_grant();

-- ── Access itself ──────────────────────────────────────────────────────────
--
-- The grant is the invitation; THIS is the access. Deactivating a membership
-- is how somebody loses their way into a business, and it left no trace.

create or replace function private.audit_facility_membership()
returns trigger language plpgsql security definer set search_path to '' as $fn$
declare
  v_name  text;
  v_email text;
  v_fid   uuid;
  v_pid   text;
begin
  v_fid := case when tg_op = 'DELETE' then old.facility_id else new.facility_id end;
  v_pid := case when tg_op = 'DELETE' then old.profile_id  else new.profile_id  end;
  select f.name into v_name from public.facilities f where f.id = v_fid;
  select p.email into v_email from public.profiles p where p.id = v_pid;

  if tg_op = 'INSERT' then
    perform private.record_audit(
      'Facility access granted', 'User Access', 'High',
      'membership', v_pid, v_email, v_fid, v_name,
      format('%s joined %s as %s', coalesce(v_email, v_pid), coalesce(v_name,'a facility'), new.role));
  elsif tg_op = 'DELETE' then
    perform private.record_audit(
      'Facility access removed', 'User Access', 'High',
      'membership', v_pid, v_email, v_fid, v_name,
      format('%s was removed from %s', coalesce(v_email, v_pid), coalesce(v_name,'a facility')));
  elsif new.is_active is distinct from old.is_active or new.role is distinct from old.role then
    perform private.record_audit(
      case when new.is_active then 'Facility access changed' else 'Facility access suspended' end,
      'User Access', 'High',
      'membership', v_pid, v_email, v_fid, v_name,
      format('%s at %s', coalesce(v_email, v_pid), coalesce(v_name,'a facility')),
      jsonb_build_array(
        jsonb_build_object('field','role','from',old.role,'to',new.role),
        jsonb_build_object('field','is_active','from',old.is_active,'to',new.is_active)));
  else
    return null;
  end if;
  return null;
end $fn$;

drop trigger if exists facility_memberships_audit on public.facility_memberships;
create trigger facility_memberships_audit
  after insert or update or delete on public.facility_memberships
  for each row execute function private.audit_facility_membership();
