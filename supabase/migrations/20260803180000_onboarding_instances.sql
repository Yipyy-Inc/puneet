-- ============================================================================
-- Per-hire onboarding INSTANCES — and the token that is the whole security
-- surface of this feature.
--
-- 20260803140000 moved the TEMPLATES (a facility's configuration). This moves
-- the thing a real person walks through: the tokenised link a new hire opens on
-- their own phone, before they have an account, to hand over their bank details
-- and sign their contract.
--
-- ── WHY THE ROUTE HANDLER IS NOT THE PLACE ─────────────────────────────────
--
-- The header of 20260802120000 says it and it is doubly true here: PostgREST is
-- reachable directly with the anon key, so a rule enforced in
-- src/app/onboard/[token] is a rule enforced nowhere. Everything below is in
-- the database.
--
-- ============================================================================
-- THE TOKEN
-- ============================================================================
--
-- STORED AS A HASH, NEVER AS ITSELF.
--
-- `token_hash bytea` is sha256(token). The plaintext exists twice: in the
-- email that carries it, and in the response of the RPC that mints it. It is
-- never written down here. A leaked dump therefore yields hashes of live links
-- rather than the links themselves, which is the difference between an incident
-- and a catastrophe — these tokens authorise handing over an IBAN.
--
-- No salt, deliberately. A salted per-row hash cannot be looked up by index,
-- which would turn every page load into a scan of every instance — and the
-- input is a 128-bit random string, not a password: there is no dictionary to
-- attack and nothing for a salt to defend against.
--
-- THE ANON ROLE HAS NO POLICY ON THESE TABLES. Not a narrow one. None.
--
-- The shape this rejects is `create policy … to anon using (token = current
-- _setting('request.token'))`, or any variant where the token is a filter the
-- caller supplies. That is a table-scan oracle: an attacker varies the
-- predicate and reads the answer off the result count, and PostgREST will
-- happily let them do it a few thousand times a second.
--
-- Instead: one SECURITY DEFINER function taking the token as an ARGUMENT,
-- returning exactly one instance or nothing. The token is hashed inside the
-- function and matched against a unique index — one lookup, no scan, no
-- variable predicate, and one function signature to put a rate limit in front
-- of. (The limit itself is infrastructure and is NOT implemented here; what
-- this migration provides is the single choke point that makes one possible.
-- Saying otherwise would be claiming a control that does not exist.)
--
-- THE RPC REFUSES, and each refusal is silent — it returns null rather than
-- explaining, because "expired" and "no such token" are the same answer to
-- someone guessing:
--
--   • an expired token
--   • an instance already submitted (the link is spent)
--   • an instance whose staff row has left `invited` (activated, or gone)
--
-- ============================================================================
-- WHAT AN EMPLOYEE MAY WRITE
-- ============================================================================
--
-- The same clamp 20260802120000 puts on a customer's booking. A hire fills in
-- their sections; they do not get to declare themselves reviewed:
--
--   raises   any change to staff_id, facility_id, token_hash or
--            token_expires_at by a caller without manage_staff — those are the
--            identity of the invitation, not fields of it
--   reverts  submitted_at and reviewed_at, silently, because the app PATCHes
--            whole objects and erroring would break a legitimate save
--
-- and separately: `resolved_at` on a change request requires manage_staff.
--
-- A DELIBERATE BEHAVIOUR CHANGE. saveOnboardingSectionByTask
-- (staff-onboarding.ts:1341) currently resolves a manager's open change request
-- when the employee completes the flagged section — "Completing a flagged item
-- resolves the manager's open change request for it". That is the employee
-- marking their own correction as accepted, which defeats the point of asking
-- for it. The request now stays open until a manager resolves it.
--
-- ============================================================================
-- SHAPE NOTES
-- ============================================================================
--
-- ONE INSTANCE PER STAFF ROW (`unique (staff_id)`). The mock keys instances by
-- staffId — `hrStore.instances[staffId]` — so a second one was never
-- representable. Resending an invite REPLACES the token on the existing row
-- (regenerateOnboardingToken), it does not make a second instance.
--
-- SECTIONS KEY ON `task_key`, NOT ON THE TASK ROW. Two reasons, and the second
-- is the one that matters:
--   • saveOnboardingSectionByTask keys on a string task id, and
--     `unique (instance_id, task_key)` is exactly the assumption it makes.
--   • template edits DELETE task rows — PATCH /templates/[id] replaces the task
--     set wholesale — so an FK with ON DELETE CASCADE would erase a hire's
--     submitted answers because someone renamed a step. `task_id` is kept as a
--     nullable reference for joins and set to null when its task goes; the
--     answer survives, which is the only acceptable outcome for data a person
--     typed.
--
-- CASCADE FROM STAFF, not from facility: an instance is about one person, and
-- deleting the person's record should take their in-flight onboarding with it.
-- ============================================================================

-- ── Instances ───────────────────────────────────────────────────────────────

create table public.onboarding_instances (
  id          uuid primary key default gen_random_uuid(),
  staff_id    uuid not null unique
                references public.staff (id) on delete cascade,
  facility_id uuid not null references public.facilities (id) on delete cascade,
  template_id uuid references public.onboarding_templates (id) on delete set null,

  -- sha256 of the token. UNIQUE so the RPC below is an index lookup.
  token_hash        bytea not null unique,
  token_expires_at  timestamptz not null,
  invited_at        timestamptz not null default now(),

  -- The set-password step. A timestamp rather than a boolean because "when"
  -- is the question support actually gets asked.
  account_password_set_at timestamptz,

  submitted_at timestamptz,
  reviewed_at  timestamptz,

  -- Notification dedup, carried over from the mock instance.
  last_deadline_reminder date,
  expiry_notified_at     timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index onboarding_instances_facility_idx
  on public.onboarding_instances (facility_id);
create index onboarding_instances_staff_idx
  on public.onboarding_instances (staff_id);

-- ── Sections ────────────────────────────────────────────────────────────────

create table public.onboarding_sections (
  id          uuid primary key default gen_random_uuid(),
  instance_id uuid not null
                references public.onboarding_instances (id) on delete cascade,
  facility_id uuid not null references public.facilities (id) on delete cascade,

  -- The app-side task id. NOT NULL: a section that tracks nothing is not a
  -- section, and it is what the uniqueness below is built on.
  task_key    text not null,
  -- The task row, when it still exists. See the header: set null rather than
  -- cascade, so editing a template cannot delete a hire's answers.
  task_id     uuid references public.onboarding_employee_tasks (id)
                on delete set null,

  section_type text not null check (section_type in (
                 'personal_info', 'contact_details', 'banking',
                 'document_upload', 'document_sign', 'availability',
                 'emergency_contact', 'uniform_prefs', 'custom_question')),
  status       text not null default 'not_started'
                 check (status in ('not_started', 'in_progress', 'complete')),

  -- What the hire typed. Shapes vary per section type (EMPLOYEE_TASK_FIELDS),
  -- and nothing queries inside it.
  data         jsonb not null default '{}'::jsonb,
  completed_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint onboarding_sections_task_key unique (instance_id, task_key)
);

create index onboarding_sections_instance_idx
  on public.onboarding_sections (instance_id);
create index onboarding_sections_facility_idx
  on public.onboarding_sections (facility_id);

-- ── Change requests ─────────────────────────────────────────────────────────

create table public.onboarding_change_requests (
  id          uuid primary key default gen_random_uuid(),
  instance_id uuid not null
                references public.onboarding_instances (id) on delete cascade,
  facility_id uuid not null references public.facilities (id) on delete cascade,

  task_key     text,
  section_type text not null,
  note         text not null,
  resolved_at  timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index onboarding_change_requests_instance_idx
  on public.onboarding_change_requests (instance_id);
create index onboarding_change_requests_open_idx
  on public.onboarding_change_requests (instance_id)
  where resolved_at is null;

-- ── updated_at ──────────────────────────────────────────────────────────────

create trigger onboarding_instances_set_updated_at
  before update on public.onboarding_instances
  for each row execute function private.set_updated_at();
create trigger onboarding_sections_set_updated_at
  before update on public.onboarding_sections
  for each row execute function private.set_updated_at();
create trigger onboarding_change_requests_set_updated_at
  before update on public.onboarding_change_requests
  for each row execute function private.set_updated_at();

-- ── Derived facility ────────────────────────────────────────────────────────
-- An instance's facility is its staff member's; a child's is its instance's.
-- Enforced rather than trusted, the pets_inherit_facility pattern: a mismatch
-- would make a row invisible to its own facility while visible to another.

create or replace function private.onboarding_instance_inherit_facility()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  select s.facility_id into new.facility_id
    from public.staff s where s.id = new.staff_id;
  return new;
end;
$$;

create trigger onboarding_instances_set_facility
  before insert or update of staff_id on public.onboarding_instances
  for each row execute function private.onboarding_instance_inherit_facility();

create or replace function private.onboarding_child_inherit_facility()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  select i.facility_id into new.facility_id
    from public.onboarding_instances i where i.id = new.instance_id;
  return new;
end;
$$;

create trigger onboarding_sections_set_facility
  before insert or update of instance_id on public.onboarding_sections
  for each row execute function private.onboarding_child_inherit_facility();
create trigger onboarding_change_requests_set_facility
  before insert or update of instance_id on public.onboarding_change_requests
  for each row execute function private.onboarding_child_inherit_facility();

-- ── Hashing, in one place ───────────────────────────────────────────────────

create or replace function private.hash_onboarding_token(p_token text)
returns bytea language sql immutable set search_path = '' as $$
  select extensions.digest(p_token, 'sha256');
$$;

-- ── The clamp ───────────────────────────────────────────────────────────────

create or replace function private.enforce_onboarding_instance_integrity()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_can_manage boolean;
begin
  -- service_role and the SECURITY DEFINER RPCs below. Both run with no JWT
  -- subject; both are trusted code paths that set only what they should. An
  -- anon caller cannot reach this table directly at all — there is no policy
  -- for them — so this carve-out is not a hole, it is the seam the RPCs use.
  if (select auth.uid()) is null then
    return new;
  end if;

  v_can_manage := private.has_permission(old.facility_id, 'manage_staff');
  if v_can_manage or private.is_platform_admin() then
    return new;
  end if;

  -- ── The invitation's identity: raise ──────────────────────────────────────
  if new.staff_id is distinct from old.staff_id
     or new.facility_id is distinct from old.facility_id then
    raise exception 'An onboarding invitation belongs to one person at one facility.'
      using errcode = '42501';
  end if;

  if new.token_hash is distinct from old.token_hash
     or new.token_expires_at is distinct from old.token_expires_at then
    raise exception 'Only a manager can reissue an onboarding link.'
      using errcode = '42501';
  end if;

  -- ── Progress the hire does not get to declare: revert ─────────────────────
  -- Silently, because the app PATCHes whole objects: a hire saving a section
  -- sends the instance back with submittedAt on it, and erroring would break
  -- every legitimate save. Reverting is what lets a partial view round-trip.
  new.submitted_at := old.submitted_at;
  new.reviewed_at  := old.reviewed_at;

  return new;
end;
$$;

create trigger onboarding_instances_enforce_integrity
  before update on public.onboarding_instances
  for each row execute function private.enforce_onboarding_instance_integrity();

create or replace function private.enforce_change_request_integrity()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if (select auth.uid()) is null then
    return new;
  end if;
  if private.has_permission(new.facility_id, 'manage_staff')
     or private.is_platform_admin() then
    return new;
  end if;

  -- Resolving is the manager's acceptance of the fix. An employee closing
  -- their own change request is the employee marking their own homework.
  if tg_op = 'INSERT' then
    new.resolved_at := null;
  else
    new.resolved_at := old.resolved_at;
    new.note        := old.note;
  end if;
  return new;
end;
$$;

create trigger onboarding_change_requests_enforce_integrity
  before insert or update on public.onboarding_change_requests
  for each row execute function private.enforce_change_request_integrity();

-- ── RLS ─────────────────────────────────────────────────────────────────────
-- `to authenticated` throughout. The absence of any anon policy is the point:
-- see the header. Split per command so a read grant cannot carry write rights.

alter table public.onboarding_instances       enable row level security;
alter table public.onboarding_sections        enable row level security;
alter table public.onboarding_change_requests enable row level security;

-- A staff member reads their OWN instance through the helper that already
-- answers this question (private.own_staff_ids); managers read their facility's.
create policy onboarding_instances_read on public.onboarding_instances
  for select to authenticated
  using (
    private.is_platform_admin()
    or staff_id in (select private.own_staff_ids())
    or private.has_permission(facility_id, 'manage_staff')
  );
create policy onboarding_instances_insert on public.onboarding_instances
  for insert to authenticated
  with check (private.has_permission(facility_id, 'manage_staff'));
create policy onboarding_instances_update on public.onboarding_instances
  for update to authenticated
  using (
    staff_id in (select private.own_staff_ids())
    or private.has_permission(facility_id, 'manage_staff')
  )
  with check (
    staff_id in (select private.own_staff_ids())
    or private.has_permission(facility_id, 'manage_staff')
  );
create policy onboarding_instances_delete on public.onboarding_instances
  for delete to authenticated
  using (private.has_permission(facility_id, 'manage_staff'));

create policy onboarding_sections_read on public.onboarding_sections
  for select to authenticated
  using (
    private.is_platform_admin()
    or instance_id in (
      select i.id from public.onboarding_instances i
       where i.staff_id in (select private.own_staff_ids())
    )
    or private.has_permission(facility_id, 'manage_staff')
  );
create policy onboarding_sections_insert on public.onboarding_sections
  for insert to authenticated
  with check (
    instance_id in (
      select i.id from public.onboarding_instances i
       where i.staff_id in (select private.own_staff_ids())
    )
    or private.has_permission(facility_id, 'manage_staff')
  );
create policy onboarding_sections_update on public.onboarding_sections
  for update to authenticated
  using (
    instance_id in (
      select i.id from public.onboarding_instances i
       where i.staff_id in (select private.own_staff_ids())
    )
    or private.has_permission(facility_id, 'manage_staff')
  )
  with check (
    instance_id in (
      select i.id from public.onboarding_instances i
       where i.staff_id in (select private.own_staff_ids())
    )
    or private.has_permission(facility_id, 'manage_staff')
  );
create policy onboarding_sections_delete on public.onboarding_sections
  for delete to authenticated
  using (private.has_permission(facility_id, 'manage_staff'));

-- Change requests are the MANAGER'S instrument. A hire reads the note asking
-- them to fix something; they do not write one.
create policy onboarding_change_requests_read on public.onboarding_change_requests
  for select to authenticated
  using (
    private.is_platform_admin()
    or instance_id in (
      select i.id from public.onboarding_instances i
       where i.staff_id in (select private.own_staff_ids())
    )
    or private.has_permission(facility_id, 'manage_staff')
  );
create policy onboarding_change_requests_insert on public.onboarding_change_requests
  for insert to authenticated
  with check (private.has_permission(facility_id, 'manage_staff'));
create policy onboarding_change_requests_update on public.onboarding_change_requests
  for update to authenticated
  using (private.has_permission(facility_id, 'manage_staff'))
  with check (private.has_permission(facility_id, 'manage_staff'));
create policy onboarding_change_requests_delete on public.onboarding_change_requests
  for delete to authenticated
  using (private.has_permission(facility_id, 'manage_staff'));

-- ============================================================================
-- The public token surface — four functions, and nothing else.
-- ============================================================================

-- Resolve a token to its instance. NULL for anything that is not a live,
-- unsubmitted invitation belonging to someone still `invited`.
--
-- Returns jsonb rather than a table so the whole nested shape arrives in one
-- call — the page needs instance + sections + open change requests together,
-- and three round trips would mean three chances to be inconsistent.
create or replace function public.onboarding_by_token(p_token text)
returns jsonb language plpgsql security definer stable set search_path = '' as $$
declare
  v jsonb;
begin
  if p_token is null or length(p_token) < 8 then
    return null;
  end if;

  select jsonb_build_object(
           'instanceId',      i.id,
           'staffId',         s.legacy_id,
           'staffFirstName',  s.first_name,
           'staffLastName',   s.last_name,
           'templateId',      t.legacy_id,
           'tokenExpiresAt',  i.token_expires_at,
           'invitedAt',       i.invited_at,
           'accountPasswordSetAt', i.account_password_set_at,
           'sections', coalesce((
             select jsonb_agg(jsonb_build_object(
                      'taskId',      sec.task_key,
                      'type',        sec.section_type,
                      'status',      sec.status,
                      'data',        sec.data,
                      'completedAt', sec.completed_at)
                    order by sec.created_at)
               from public.onboarding_sections sec
              where sec.instance_id = i.id), '[]'::jsonb),
           'changeRequests', coalesce((
             select jsonb_agg(jsonb_build_object(
                      'taskId',      cr.task_key,
                      'sectionType', cr.section_type,
                      'note',        cr.note,
                      'resolvedAt',  cr.resolved_at)
                    order by cr.created_at)
               from public.onboarding_change_requests cr
              where cr.instance_id = i.id
                and cr.resolved_at is null), '[]'::jsonb))
    into v
    from public.onboarding_instances i
    join public.staff s on s.id = i.staff_id
    left join public.onboarding_templates t on t.id = i.template_id
   where i.token_hash = private.hash_onboarding_token(p_token)
     -- Every refusal returns null rather than explaining itself: to somebody
     -- guessing tokens, "expired" and "no such token" must look the same.
     and i.token_expires_at > now()
     and i.submitted_at is null
     and s.status = 'invited';

  return v;
end;
$$;

-- Save one section. Silent save-and-resume, keyed on the app-side task id.
--
-- Does NOT resolve an open change request, unlike the mock it replaces — see
-- the header. Returns true when something was written, false otherwise, and
-- never says which of the several reasons applied.
create or replace function public.save_onboarding_section(
  p_token        text,
  p_task_key     text,
  p_section_type text,
  p_data         jsonb,
  p_status       text default 'in_progress'
) returns boolean language plpgsql security definer set search_path = '' as $$
declare
  v_instance uuid;
begin
  if p_status not in ('not_started', 'in_progress', 'complete') then
    return false;
  end if;

  select i.id into v_instance
    from public.onboarding_instances i
    join public.staff s on s.id = i.staff_id
   where i.token_hash = private.hash_onboarding_token(p_token)
     and i.token_expires_at > now()
     and i.submitted_at is null
     and s.status = 'invited';

  if v_instance is null then
    return false;
  end if;

  insert into public.onboarding_sections
    (instance_id, task_key, section_type, status, data, completed_at)
  values (v_instance, p_task_key, p_section_type, p_status,
          coalesce(p_data, '{}'::jsonb),
          case when p_status = 'complete' then now() else null end)
  on conflict (instance_id, task_key) do update
    set data         = public.onboarding_sections.data || excluded.data,
        status       = excluded.status,
        section_type = excluded.section_type,
        completed_at = case
                         when excluded.status = 'complete'
                           then coalesce(public.onboarding_sections.completed_at, now())
                         else public.onboarding_sections.completed_at
                       end;

  return true;
end;
$$;

-- The hire declares themselves done. This IS theirs to set — what they may not
-- do is review it, which is a different column and a different caller.
create or replace function public.submit_onboarding(p_token text)
returns boolean language plpgsql security definer set search_path = '' as $$
declare
  v_instance uuid;
begin
  select i.id into v_instance
    from public.onboarding_instances i
    join public.staff s on s.id = i.staff_id
   where i.token_hash = private.hash_onboarding_token(p_token)
     and i.token_expires_at > now()
     and i.submitted_at is null
     and s.status = 'invited';

  if v_instance is null then
    return false;
  end if;

  update public.onboarding_instances
     set submitted_at = now()
   where id = v_instance;
  return true;
end;
$$;

create or replace function public.set_onboarding_account_complete(p_token text)
returns boolean language plpgsql security definer set search_path = '' as $$
declare
  v_instance uuid;
begin
  select i.id into v_instance
    from public.onboarding_instances i
    join public.staff s on s.id = i.staff_id
   where i.token_hash = private.hash_onboarding_token(p_token)
     and i.token_expires_at > now()
     and i.submitted_at is null
     and s.status = 'invited';

  if v_instance is null then
    return false;
  end if;

  update public.onboarding_instances
     set account_password_set_at = coalesce(account_password_set_at, now())
   where id = v_instance;
  return true;
end;
$$;

-- Granted to anon deliberately and narrowly: these four are the ENTIRE surface
-- an unauthenticated token-bearer can reach. `revoke from public` first so the
-- grant is a decision rather than a default.
revoke all on function public.onboarding_by_token(text) from public;
revoke all on function public.save_onboarding_section(text, text, text, jsonb, text) from public;
revoke all on function public.submit_onboarding(text) from public;
revoke all on function public.set_onboarding_account_complete(text) from public;

grant execute on function public.onboarding_by_token(text) to anon, authenticated;
grant execute on function public.save_onboarding_section(text, text, text, jsonb, text) to anon, authenticated;
grant execute on function public.submit_onboarding(text) to anon, authenticated;
grant execute on function public.set_onboarding_account_complete(text) to anon, authenticated;

comment on function public.onboarding_by_token(text) is
  'The ONLY way an unauthenticated caller reaches an onboarding instance. Token is hashed and matched against a unique index - never a policy predicate.';
comment on column public.onboarding_instances.token_hash is
  'sha256 of the invitation token. The plaintext is returned once, at mint time, and never stored.';
comment on constraint onboarding_sections_task_key on public.onboarding_sections is
  'The uniqueness saveOnboardingSectionByTask assumes: one section per task per instance.';
