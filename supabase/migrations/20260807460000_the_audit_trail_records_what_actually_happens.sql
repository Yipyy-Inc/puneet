-- ============================================================================
-- The audit trail records what actually happens.
--
-- Nothing on this platform recorded who did anything. Today alone: a facility
-- was suspended, a superadmin role was granted, an owner's invitation was
-- withdrawn and re-aimed at a different address. None of it left a trace.
--
-- ── WHAT WAS ALREADY THERE, AND WHY IT WAS NOT ENOUGH ─────────────────────
--
-- 20260625000000_audit_log_append_only.sql builds a genuinely immutable table
-- — a trigger that fires for every role including the owner and service_role,
-- plus REVOKE and RLS as layers. That part is good and is kept.
--
-- It was NEVER APPLIED to this project, and src/lib/api/audit-log.ts is a
-- module-level array over a frozen mock seed: it documents itself as immutable
-- and durable and is neither. `appended` dies with the process, and on
-- serverless it is not even shared between two requests.
--
-- Two things in it also have to be corrected before it is safe to apply:
--
--   1. THE READ POLICY CAN NEVER BE TRUE.
--        auth.jwt() -> 'app_metadata' ->> 'role' in ('super_admin', ...)
--      `app_metadata` is a Supabase Auth concept. Clerk owns identity here and
--      the custom access token hook was dropped, so that claim is absent from
--      every token this platform issues. Nobody could read the audit log —
--      including the auditor it exists for. The file says "adjust the claim to
--      this project's RBAC model"; it never was.
--
--   2. ANYONE COULD FORGE AN ENTRY.
--        create policy audit_log_insert ... with check (true)
--      granted to `authenticated` — so any signed-in customer could write
--      whatever they liked into a table that can never be edited or deleted.
--      A poisoned immutable log is worse than no log: you cannot clean it, and
--      you can no longer trust the entries that are real.
--
--      Fixed structurally rather than with a cleverer policy. INSERT is
--      revoked from `authenticated` entirely and entries are written by
--      private.record_audit(), a SECURITY DEFINER function that only the
--      functions performing the audited acts can reach. An entry can therefore
--      only exist because the act happened.
-- ============================================================================

-- ── The table ──────────────────────────────────────────────────────────────
--
-- Same shape as 20260625000000, which the audit screen already renders, with
-- facility_id as a real uuid rather than the text of the mock era. Created
-- here because that migration has never run against this project.

create table if not exists public.audit_log (
  id            uuid primary key default gen_random_uuid(),
  occurred_at   timestamptz not null default now(),
  user_id       text,
  user_name     text,
  user_role     text,
  action        text not null,
  category      text not null
    check (category in ('Financial','User Access','Configuration','Security','Data','System')),
  entity_type   text,
  entity_id     text,
  entity_name   text,
  changes       jsonb not null default '[]'::jsonb,
  ip_address    inet,
  user_agent    text,
  facility_id   uuid references public.facilities(id) on delete set null,
  facility_name text,
  severity      text not null default 'Low'
    check (severity in ('Low','Medium','High','Critical')),
  status        text not null default 'Success'
    check (status in ('Success','Failed','Pending')),
  description   text
);

comment on table public.audit_log is
  'Immutable, append-only audit trail. UPDATE/DELETE/TRUNCATE are blocked for EVERY role by trigger. Entries are written only by private.record_audit().';

-- ── Immutability: the trigger is the binding guarantee ─────────────────────
--
-- RLS is bypassed by service_role and the table owner; GRANTs are bypassed by
-- the owner and superusers. A trigger fires for all of them.

create or replace function public.prevent_audit_log_mutation()
returns trigger
language plpgsql
as $$
begin
  raise exception
    'audit_log is append-only: % is not permitted on an audit entry', tg_op
    using errcode = 'insufficient_privilege',
          hint    = 'Audit entries are immutable; insert a new corrective entry instead.';
  return null;
end;
$$;

drop trigger if exists audit_log_block_update on public.audit_log;
create trigger audit_log_block_update
  before update on public.audit_log
  for each row execute function public.prevent_audit_log_mutation();

drop trigger if exists audit_log_block_delete on public.audit_log;
create trigger audit_log_block_delete
  before delete on public.audit_log
  for each row execute function public.prevent_audit_log_mutation();

drop trigger if exists audit_log_block_truncate on public.audit_log;
create trigger audit_log_block_truncate
  before truncate on public.audit_log
  for each statement execute function public.prevent_audit_log_mutation();

-- ── Privilege ──────────────────────────────────────────────────────────────
--
-- INSERT is NOT granted to authenticated. That is the correction: writing is
-- something the audited action does, never something a caller asks for.

revoke update, delete, truncate on public.audit_log from public, anon, authenticated, service_role;
revoke insert on public.audit_log from public, anon, authenticated;

grant select on public.audit_log to authenticated;

alter table public.audit_log enable row level security;
alter table public.audit_log force row level security;

-- ── Who may read ───────────────────────────────────────────────────────────
--
-- The platform team, through the same function 60+ other policies use. A
-- facility reading its OWN entries is a reasonable future addition and is
-- deliberately not guessed at here.

drop policy if exists audit_log_select_admins on public.audit_log;
drop policy if exists audit_log_insert on public.audit_log;

drop policy if exists audit_log_read on public.audit_log;
create policy audit_log_read on public.audit_log
  for select to authenticated
  using (private.is_platform_admin());

-- No INSERT policy at all, deliberately. private.record_audit is SECURITY
-- DEFINER and runs as the owner, so it is unaffected; anything else is refused
-- by the missing GRANT and the missing policy both.

create index if not exists audit_log_occurred_at_idx
  on public.audit_log (occurred_at desc);
create index if not exists audit_log_entity_idx
  on public.audit_log (entity_type, entity_id);
create index if not exists audit_log_facility_idx
  on public.audit_log (facility_id, occurred_at desc);

-- ── Recording ──────────────────────────────────────────────────────────────
--
-- The actor is taken from the JWT and their name from `profiles`, never from
-- an argument: an audit entry naming whoever the caller says they are is not
-- an audit entry.

create or replace function private.record_audit(
  p_action        text,
  p_category      text,
  p_severity      text default 'Low',
  p_entity_type   text default null,
  p_entity_id     text default null,
  p_entity_name   text default null,
  p_facility_id   uuid default null,
  p_facility_name text default null,
  p_description   text default null,
  p_changes       jsonb default '[]'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path to ''
as $fn$
declare
  v_user text := (select auth.jwt()->>'sub');
  v_name text;
  v_role text;
  v_id   uuid;
begin
  select p.full_name,
         case when p.is_platform_admin then 'Platform' else 'User' end
    into v_name, v_role
    from public.profiles p
   where p.id = v_user;

  insert into public.audit_log (
    user_id, user_name, user_role,
    action, category, severity,
    entity_type, entity_id, entity_name,
    facility_id, facility_name, description, changes)
  values (
    v_user, coalesce(v_name, v_user), coalesce(v_role, 'System'),
    p_action, p_category, p_severity,
    p_entity_type, p_entity_id, p_entity_name,
    p_facility_id, p_facility_name, p_description, coalesce(p_changes, '[]'::jsonb))
  returning id into v_id;

  return v_id;
end;
$fn$;

-- Not callable by a client: `private` is not exposed through PostgREST, and the
-- grant is removed as well so the only callers are the SECURITY DEFINER
-- functions in this schema that perform the audited acts.
revoke execute on function private.record_audit(
  text, text, text, text, text, text, uuid, text, text, jsonb)
  from public, anon, authenticated;
