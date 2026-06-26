-- ============================================================================
-- Audit Trail — write-once, append-only, IMMUTABLE.
--
-- Requirement: no role may edit, delete, or modify an audit_log entry — not
-- even the table owner / Super Administrator / service_role.
--
-- Why a trigger (and not RLS or GRANTs alone):
--   * RLS is BYPASSED by `service_role` and the table owner, so an "no UPDATE
--     policy" rule does not stop privileged roles.
--   * Column/table GRANTs are bypassed by the table owner and superusers.
--   * A trigger fires for EVERY role (including the owner and service_role)
--     unless session_replication_role = 'replica' or the trigger is explicitly
--     disabled via DDL — so the trigger is the binding immutability guarantee.
-- REVOKE + RLS are layered on as defense-in-depth (privilege + Data API layers).
--
-- This migration is idempotent and safe to re-run.
-- ============================================================================

-- 1. The append-only table ---------------------------------------------------
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
  facility_id   text,
  facility_name text,
  severity      text not null default 'Low'
    check (severity in ('Low','Medium','High','Critical')),
  status        text not null default 'Success'
    check (status in ('Success','Failed','Pending')),
  description   text
);

comment on table public.audit_log is
  'Immutable, append-only audit trail. UPDATE/DELETE/TRUNCATE are blocked at the database level for EVERY role (see prevent_audit_log_mutation triggers). Insert-only.';

-- 2. The immutability guard (fires for every role, including the owner) -------
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

comment on function public.prevent_audit_log_mutation is
  'Raises on any UPDATE/DELETE/TRUNCATE of public.audit_log. Triggers fire for all roles (including the table owner and service_role), making this the binding append-only guarantee.';

-- Row-level: block UPDATE and DELETE of existing rows.
drop trigger if exists audit_log_block_update on public.audit_log;
create trigger audit_log_block_update
  before update on public.audit_log
  for each row execute function public.prevent_audit_log_mutation();

drop trigger if exists audit_log_block_delete on public.audit_log;
create trigger audit_log_block_delete
  before delete on public.audit_log
  for each row execute function public.prevent_audit_log_mutation();

-- Statement-level: block TRUNCATE (not a row event, so it needs its own trigger).
drop trigger if exists audit_log_block_truncate on public.audit_log;
create trigger audit_log_block_truncate
  before truncate on public.audit_log
  for each statement execute function public.prevent_audit_log_mutation();

-- 3. Privilege layer (defense-in-depth) --------------------------------------
-- Strip UPDATE/DELETE/TRUNCATE from every grantable role; keep INSERT + SELECT
-- so the application can append and read.
revoke update, delete, truncate on public.audit_log from public;
revoke update, delete, truncate on public.audit_log from anon;
revoke update, delete, truncate on public.audit_log from authenticated;
revoke update, delete, truncate on public.audit_log from service_role;

grant select, insert on public.audit_log to authenticated;
grant select, insert on public.audit_log to service_role;

-- 4. RLS layer (Data API) ----------------------------------------------------
alter table public.audit_log enable row level security;
-- FORCE so RLS applies to the table owner too (the trigger is still the real
-- UPDATE/DELETE guard; service_role bypasses RLS but is caught by the trigger).
alter table public.audit_log force row level security;

-- Read: restrict to administrators. Authorization MUST come from app_metadata
-- (never user_metadata, which is user-editable). Adjust the claim/roles to this
-- project's RBAC model.
drop policy if exists audit_log_select_admins on public.audit_log;
create policy audit_log_select_admins
  on public.audit_log
  for select
  to authenticated
  using (
    coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') in
      ('super_admin', 'admin', 'auditor')
  );

-- Append: inserts are the ONLY permitted write. There are deliberately NO
-- UPDATE or DELETE policies, so those are denied under RLS in addition to the
-- trigger + REVOKE above.
drop policy if exists audit_log_insert on public.audit_log;
create policy audit_log_insert
  on public.audit_log
  for insert
  to authenticated
  with check (true);

-- 5. Read indexes ------------------------------------------------------------
create index if not exists audit_log_occurred_at_idx
  on public.audit_log (occurred_at desc);
create index if not exists audit_log_entity_idx
  on public.audit_log (entity_type, entity_id);

-- ============================================================================
-- Verification (run manually after applying; each mutating statement MUST fail):
--   insert into public.audit_log (action, category) values ('test','System');   -- OK
--   update public.audit_log set action = 'x';   -- ERROR: audit_log is append-only: UPDATE ...
--   delete from public.audit_log;                -- ERROR: audit_log is append-only: DELETE ...
--   truncate public.audit_log;                   -- ERROR: audit_log is append-only: TRUNCATE ...
-- ============================================================================
