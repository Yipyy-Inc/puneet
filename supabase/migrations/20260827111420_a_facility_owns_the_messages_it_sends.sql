-- ============================================================================
-- Automations, for real: the templates, the rules, and the outbox that proves
-- a message went out.
--
-- ── WHAT WAS THERE BEFORE ─────────────────────────────────────────────────
--
-- Nothing. `/facility/dashboard/automations` showed 18 rules, four KPI tiles,
-- per-rule "Total Sent" figures and "Last Triggered" dates, and every one of
-- them was a literal in `src/data/communications-hub.ts`. The save handler was
-- `console.log(formData)`. No automation has ever sent anything.
--
-- That is worth stating in the schema because it explains two choices below
-- that would otherwise look paranoid: `enabled` defaults to FALSE, and there
-- are no `total_sent` / `last_triggered` columns.
--
-- ── FIVE TABLES, AND WHY NONE OF THEM CAN BE DROPPED ──────────────────────
--
--   message_templates      what to say
--   automation_rules       when to say it
--   automation_events      the fact that the when happened
--   message_sends          the outbox AND the log — one table, see below
--   message_suppressions   who has told us to stop
--
-- The temptation is to ship the first two and add the rest "when sending
-- works". That produces a screen with a working Enabled toggle that enables
-- nothing, which is strictly worse than the fixture it replaces: the fixture
-- never persisted a claim. A rule that can be turned on must be a rule that
-- can send, and a rule that can send must be suppressible before it does.
--
-- ── NOT `task_templates`, NOT `onboarding_templates`, NOT `email_templates` ─
--
-- Three things in this repo are already called templates. `task_templates` is
-- booking-driven work. `onboarding_templates` is staff paperwork. The platform
-- support screen has its own email templates for Yipyy's own mail. This is a
-- FACILITY's customer messaging. They were nearly conflated on the strength of
-- the word, which is exactly how `task_templates` and the chore list nearly
-- merged (20260823800000).
-- ============================================================================

-- ── What to say ───────────────────────────────────────────────────────────

create table if not exists public.message_templates (
  id uuid primary key default gen_random_uuid(),
  facility_id uuid not null references public.facilities(id) on delete cascade,

  -- A stable handle for the templates Yipyy ships ('booking_confirmation').
  -- NULL for anything a facility wrote itself, so the shipped set can be
  -- re-seeded by key without ever colliding with their own work.
  key text,

  name text not null check (btrim(name) <> ''),
  channel text not null check (channel in ('email', 'sms')),
  category text not null default 'general'
    check (category in ('reminder', 'confirmation', 'update', 'general')),

  subject text,
  body text not null check (btrim(body) <> ''),

  -- Retired, not deleted: a template a message was sent from is part of the
  -- record of what this facility said to its customers.
  is_active boolean not null default true,

  -- Shipped by Yipyy. Editable, but restored by key if deleted.
  is_system boolean not null default false,

  created_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- An email with no subject line is not a sendable email, and finding that
  -- out at send time means a row in the outbox that can never leave it.
  constraint message_templates_email_needs_subject
    check (channel <> 'email' or subject is not null)
);

comment on table public.message_templates is
  'A facility''s customer-facing message bodies. NOT task_templates (booking-driven work), onboarding_templates (staff paperwork), or the platform support email templates.';

-- DELIBERATELY NO `variables text[]` COLUMN.
--
-- The variable list is a projection of the body through VARIABLE_PATTERN, and
-- a stored copy is one more thing that can disagree with what the body says.
-- The fixture this replaces drifted exactly that way: seven rules named
-- templates that no longer existed, and every one of those rules opened with a
-- blank editor and a disabled Save button. `templateVariableKeys()` in
-- src/lib/messaging/render.ts computes it.

create unique index if not exists message_templates_key_unique
  on public.message_templates (facility_id, key) where key is not null;

-- Case-insensitive: "Booking Confirmation" and "booking confirmation" in the
-- same picker is a support ticket.
create unique index if not exists message_templates_name_unique
  on public.message_templates (facility_id, lower(name));

-- ── When to say it ────────────────────────────────────────────────────────

create table if not exists public.automation_rules (
  id uuid primary key default gen_random_uuid(),
  facility_id uuid not null references public.facilities(id) on delete cascade,

  name text not null check (btrim(name) <> ''),

  -- The canonical trigger list. NINETEEN values: the seventeen that were in
  -- `automationTriggerEnum`, plus `booking_cancelled` and `payment_overdue`,
  -- which the spec asked for and which only existed in a second, disagreeing
  -- list in a dead component (src/components/messaging/AutomationsView.tsx,
  -- deleted in this change).
  --
  -- `bun run check:automation-triggers` asserts this list against the
  -- TypeScript enum. It exists because the editor's dropdown offered EIGHT of
  -- the seventeen, so nine seeded rules could not be re-selected and touching
  -- the dropdown silently rewrote a rule's trigger. A SQL test cannot read
  -- TypeScript, so the drift needs its own guard.
  trigger text not null check (trigger in (
    'booking_created',
    'booking_cancelled',
    'booking_request_submitted',
    'booking_request_approved',
    'booking_request_declined',
    '24h_before',
    'check_in',
    'check_out',
    'payment_received',
    'payment_overdue',
    'vaccination_expiry',
    'appointment_reminder',
    'form_link_sent',
    'form_started',
    'form_submitted',
    'form_incomplete_by_deadline',
    'form_red_flag_answer',
    'booking_abandoned',
    'package_expiry'
  )),

  -- FALSE, and this is the most important default in the file.
  --
  -- Every path that creates a rule — a seed, an import, a restore, a future
  -- template gallery — must produce something that cannot send. Turning a rule
  -- on is a deliberate act by a person who can see what it will do. The API
  -- refuses `enabled: true` in the same request that creates the rule.
  enabled boolean not null default false,

  -- TWO template columns, not one `template_id` plus a `messageType` of
  -- 'email' | 'sms' | 'both'.
  --
  -- That shape is what produced the off-by-one in the fixture: one id pretending
  -- to serve two media, so "Payment Receipt" rendered the Check-Out SMS body and
  -- nobody noticed because the name on the rule still read correctly. With one
  -- column per channel, plus the trigger below asserting each named template's
  -- channel, the whole bug class is unrepresentable.
  email_template_id uuid references public.message_templates(id) on delete restrict,
  sms_template_id   uuid references public.message_templates(id) on delete restrict,

  -- Narrowing. Empty array means "all", never "none" — an empty scope that
  -- meant none would silently stop every rule the day someone cleared a chip.
  service_types text[] not null default '{}',
  location_ids  uuid[] not null default '{}',
  min_amount    numeric(12, 2),

  -- Signed minutes from the triggering moment. -1440 is "24 hours before",
  -- +60 is "an hour after". One column instead of the fixture's `hoursBefore`
  -- and `daysBeforeExpiry`, which could both be set and disagreed.
  offset_minutes integer,

  -- Do not send to the same client from this rule more often than this.
  -- 0 = no limit. Enforced against `message_sends`, not stored per client.
  cooldown_days smallint not null default 0 check (cooldown_days >= 0),

  -- CASL: a message confirming something the customer asked for is a
  -- relationship message and is not withdrawable. A booking confirmation must
  -- still arrive for someone who unsubscribed from marketing. This flag is the
  -- only thing that distinguishes them, so it is a column and not a guess made
  -- from the trigger name.
  is_transactional boolean not null default false,

  created_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint automation_rules_needs_a_template
    check (email_template_id is not null or sms_template_id is not null)
);

comment on table public.automation_rules is
  'Event-driven customer messaging. NOT the tag-reaction rule in src/types/tags.ts, which was also called AutomationRule until 2026-08-27 and is now TagAutomationRule.';

-- DELIBERATELY NO `total_sent` / `last_triggered` COLUMNS.
--
-- They are questions `message_sends` answers. A counter maintained beside the
-- log is a counter that can disagree with the log, and the screen this replaces
-- displayed "Total Sent: 1,392" for a system that had never sent anything.
-- A number that cannot be produced from evidence should not be displayable.

create unique index if not exists automation_rules_name_unique
  on public.automation_rules (facility_id, lower(name));

-- The dispatcher's query: given a facility and a trigger, which rules are live?
create index if not exists automation_rules_live_idx
  on public.automation_rules (facility_id, trigger) where enabled;

-- A template cannot be deleted while a rule names it (on delete restrict), but
-- nothing above stops a rule naming an SMS template in its email column, or a
-- template belonging to a different facility. Both are silent at write time and
-- catastrophic at send time.
create or replace function private.assert_rule_templates()
returns trigger
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  v_channel text;
  v_facility uuid;
begin
  if new.email_template_id is not null then
    select channel, facility_id into v_channel, v_facility
      from public.message_templates where id = new.email_template_id;
    if v_channel is distinct from 'email' then
      raise exception 'email_template_id names a % template', coalesce(v_channel, 'missing');
    end if;
    if v_facility is distinct from new.facility_id then
      raise exception 'email_template_id belongs to a different facility';
    end if;
  end if;

  if new.sms_template_id is not null then
    select channel, facility_id into v_channel, v_facility
      from public.message_templates where id = new.sms_template_id;
    if v_channel is distinct from 'sms' then
      raise exception 'sms_template_id names a % template', coalesce(v_channel, 'missing');
    end if;
    if v_facility is distinct from new.facility_id then
      raise exception 'sms_template_id belongs to a different facility';
    end if;
  end if;

  return new;
end;
$fn$;

drop trigger if exists automation_rules_assert_templates on public.automation_rules;
create trigger automation_rules_assert_templates
  before insert or update on public.automation_rules
  for each row execute function private.assert_rule_templates();

-- ── The fact that the when happened ───────────────────────────────────────

create table if not exists public.automation_events (
  -- bigint identity, not uuid: the dispatcher reads these in order and a
  -- monotonic key makes "everything after X" a range scan.
  id bigint generated always as identity primary key,
  facility_id uuid not null references public.facilities(id) on delete cascade,

  kind text not null check (kind in (
    'booking_created',
    'booking_cancelled',
    'booking_request_submitted',
    'booking_request_approved',
    'booking_request_declined',
    '24h_before',
    'check_in',
    'check_out',
    'payment_received',
    'payment_overdue',
    'vaccination_expiry',
    'appointment_reminder',
    'form_link_sent',
    'form_started',
    'form_submitted',
    'form_incomplete_by_deadline',
    'form_red_flag_answer',
    'booking_abandoned',
    'package_expiry'
  )),

  occurred_at timestamptz not null default now(),

  client_id   uuid references public.clients(id)   on delete cascade,
  pet_id      uuid references public.pets(id)      on delete set null,
  booking_id  uuid references public.bookings(id)  on delete cascade,
  location_id uuid references public.locations(id) on delete set null,
  payload jsonb not null default '{}',

  -- '<kind>:<subject id>' — one row per thing that happened, forever. Two
  -- emitters racing on the same booking insert once between them.
  dedupe_key text not null,

  -- CLAIMED, not cursored. `processed_at is null` + `for update skip locked`
  -- is how the dispatcher takes work.
  --
  -- The obvious alternative was to reuse public.audit_log, and it is a trap:
  -- its occurred_at is clock_timestamp(), stamped at INSERT and visible at
  -- COMMIT, so a watermark over it silently skips rows that committed out of
  -- stamp order. It also refuses every UPDATE for every role, so nothing can be
  -- marked consumed — and it has no trigger on booking INSERT anyway.
  processed_at timestamptz,

  created_at timestamptz not null default now()
);

comment on table public.automation_events is
  'Domain events that automations react to. Claimed via processed_at + FOR UPDATE SKIP LOCKED. Not an audit trail — see public.audit_log for that.';

create unique index if not exists automation_events_dedupe
  on public.automation_events (dedupe_key);

create index if not exists automation_events_pending_idx
  on public.automation_events (occurred_at) where processed_at is null;

-- ── The outbox, which is also the log ─────────────────────────────────────

create table if not exists public.message_sends (
  id uuid primary key default gen_random_uuid(),
  facility_id uuid not null references public.facilities(id) on delete cascade,

  -- Which branch's name and phone number stamped this. The rule's location_ids
  -- decide whether it FIRES; this records who it appeared to come from, so
  -- "why does this say Plateau" has an answer.
  location_id uuid references public.locations(id) on delete set null,

  -- SET NULL, not cascade. A deleted client must leave a readable record of
  -- what was sent to them: `to_address` below survives independently.
  client_id uuid references public.clients(id) on delete set null,

  channel text not null check (channel in ('email', 'sms')),

  -- Normalised by src/lib/messaging/send.ts — the SAME function the
  -- suppression list is written with. A suppression on '+15145551234' against
  -- a send attempted on '5145551234' is a suppression that does not exist.
  to_address text not null,

  source_kind text not null
    check (source_kind in ('automation_rule', 'workflow', 'manual')),

  -- NO FOREIGN KEY, deliberately. A deleted rule must not delete, or null, the
  -- record that a message went out under it. Same reasoning as 20260822500000:
  -- an account of what happened must not hold a key to the thing it describes.
  source_id uuid,

  -- Populated from P5. A five-step workflow's five sends are otherwise
  -- indistinguishable from each other.
  enrollment_id uuid,
  step_index smallint,

  template_id uuid references public.message_templates(id) on delete set null,

  -- What was ACTUALLY sent, snapshotted. Yes, it duplicates the template. It is
  -- also the only way to answer "what did this customer receive" after someone
  -- edits the template, which CASL requires us to be able to do.
  subject_rendered text,
  body_rendered text not null,

  status text not null default 'queued'
    check (status in ('queued', 'sending', 'sent', 'failed', 'skipped', 'cancelled')),

  -- Why not, when not. `status = 'skipped'` with no reason means the History
  -- tab can say "not sent" and nothing else, which is the only question staff
  -- actually ask. Same lesson as 20260825190000_a_refund_says_why.
  skip_reason text,

  scheduled_for timestamptz not null default now(),
  attempts smallint not null default 0,
  last_error text,

  provider text check (provider in ('resend', 'twilio')),
  provider_id text,

  -- Held by whichever tick claimed the row. A reaper returns rows stuck here
  -- for more than fifteen minutes to 'queued'.
  locked_at timestamptz,
  sent_at timestamptz,

  -- PER SEND, not per client: it answers "which message made them leave".
  unsubscribe_token uuid not null default gen_random_uuid(),

  -- '<source_kind>:<source_id>:<step|->:<client_id>:<channel>:<occasion>'
  --
  -- Debuggable composite text rather than a hash, because the first thing
  -- anyone does with a duplicate-send report is try to reconstruct the key by
  -- hand. `occasion` is the booking id for event rules and the FACILITY-LOCAL
  -- date for recurring ones — UTC current_date gives a Vancouver facility two
  -- "todays" or none.
  --
  -- This unique index is the authority on double sends. Every cooldown and
  -- already-sent check elsewhere is an optimisation; two ticks can both pass a
  -- read, and only one can win an insert.
  idempotency_key text not null,

  created_at timestamptz not null default now()
);

comment on table public.message_sends is
  'Outbox and delivery log in one table. Every automated message, whether it left or not. Retain >= 3 years: CASL record-keeping. Do not add a cleanup job that predates that.';

create unique index if not exists message_sends_idempotency
  on public.message_sends (idempotency_key);

create unique index if not exists message_sends_unsubscribe_token
  on public.message_sends (unsubscribe_token);

create index if not exists message_sends_due_idx
  on public.message_sends (scheduled_for) where status = 'queued';

create index if not exists message_sends_facility_idx
  on public.message_sends (facility_id, created_at desc);

-- The cooldown query: has this rule written to this client lately?
create index if not exists message_sends_cooldown_idx
  on public.message_sends (facility_id, client_id, created_at desc);

-- A sent message is a historical fact. The row still transitions
-- queued -> sending -> sent, so it cannot be append-only like audit_log, but
-- once it says 'sent' the parts describing what left are frozen.
create or replace function private.freeze_sent_message()
returns trigger
language plpgsql
security definer
set search_path = ''
as $fn$
begin
  if old.status = 'sent' then
    if new.to_address     is distinct from old.to_address
    or new.body_rendered  is distinct from old.body_rendered
    or new.subject_rendered is distinct from old.subject_rendered
    or new.sent_at        is distinct from old.sent_at
    or new.channel        is distinct from old.channel then
      raise exception 'a sent message cannot be rewritten';
    end if;
  end if;
  return new;
end;
$fn$;

drop trigger if exists message_sends_freeze on public.message_sends;
create trigger message_sends_freeze
  before update on public.message_sends
  for each row execute function private.freeze_sent_message();

-- ── Who has told us to stop ───────────────────────────────────────────────

create table if not exists public.message_suppressions (
  id uuid primary key default gen_random_uuid(),
  facility_id uuid not null references public.facilities(id) on delete cascade,

  channel text not null check (channel in ('email', 'sms')),

  -- KEYED BY ADDRESS, NOT BY CLIENT.
  --
  -- Under CASL, withdrawal attaches to the electronic address, not to our row
  -- for a person. Someone who unsubscribes at sam@example.com must stay
  -- unsubscribed if staff later create a second client record with that
  -- address, or delete and recreate the first. `client_id` below is a
  -- convenience for the UI, not the key.
  address text not null,

  -- 'marketing' (the default, and what an unsubscribe click means) or 'all'.
  -- Unsubscribing from win-back campaigns must not stop booking confirmations:
  -- those are transactional, and killing them would be both a compliance
  -- problem in the other direction and simply rude.
  scope text not null default 'marketing' check (scope in ('all', 'marketing')),

  client_id uuid references public.clients(id) on delete set null,

  reason text not null
    check (reason in ('unsubscribed', 'complaint', 'hard_bounce', 'staff', 'sms_stop')),

  -- Free text: which send, which webhook, which member of staff.
  source text,

  created_at timestamptz not null default now(),

  -- NEVER DELETED ON RESUBSCRIBE. Deleting the row destroys the proof that the
  -- withdrawal was honoured, which is the one record worth keeping.
  released_at timestamptz,
  released_by text
);

comment on table public.message_suppressions is
  'CASL withdrawal, keyed by address. Released, never deleted. Retain >= 3 years.';

create unique index if not exists message_suppressions_active_unique
  on public.message_suppressions (facility_id, channel, address)
  where released_at is null;

create index if not exists message_suppressions_client_idx
  on public.message_suppressions (facility_id, client_id)
  where released_at is null;

-- ── Emitting an event ─────────────────────────────────────────────────────
--
-- One entry point, so `automation_events` itself stays closed to direct writes
-- and no caller invents its own dedupe scheme.
--
-- SECURITY DEFINER with a membership check that applies WHEN THERE IS A
-- SESSION. A call with no `sub` is already inside a trusted server context —
-- either service_role, or a SECURITY DEFINER RPC like create_booking serving a
-- public booking link, where the customer holds no membership and must still
-- get their confirmation. Direct execute is revoked from anon and public, so
-- "no session" cannot be reached from outside.

create or replace function public.emit_automation_event(
  p_facility_id uuid,
  p_kind        text,
  p_dedupe_key  text,
  p_client_id   uuid default null,
  p_pet_id      uuid default null,
  p_booking_id  uuid default null,
  p_location_id uuid default null,
  p_payload     jsonb default '{}'
)
returns bigint
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  v_sub text := (select auth.jwt() ->> 'sub');
  v_id bigint;
begin
  if v_sub is not null
     and not private.is_platform_admin()
     and p_facility_id not in (select private.member_facility_ids()) then
    raise exception 'not a member of that facility';
  end if;

  insert into public.automation_events (
    facility_id, kind, dedupe_key, client_id, pet_id, booking_id, location_id, payload
  ) values (
    p_facility_id, p_kind, p_dedupe_key, p_client_id, p_pet_id, p_booking_id, p_location_id,
    coalesce(p_payload, '{}'::jsonb)
  )
  on conflict (dedupe_key) do nothing
  returning id into v_id;

  -- NULL means the event already existed. That is a success, not a failure:
  -- the caller asked for the event to exist and it does.
  return v_id;
end;
$fn$;

comment on function public.emit_automation_event(uuid, text, text, uuid, uuid, uuid, uuid, jsonb) is
  'Record a domain event for automations. Idempotent on dedupe_key. Returns NULL when the event already existed.';

-- ── Row-level security ────────────────────────────────────────────────────

alter table public.message_templates     enable row level security;
alter table public.automation_rules      enable row level security;
alter table public.automation_events     enable row level security;
alter table public.message_sends         enable row level security;
alter table public.message_suppressions  enable row level security;

-- Reading templates and rules is wide: a receptionist asked "did the customer
-- get the confirmation?" needs to see that a rule exists and what it says.
-- Writing is `marketing_manage_automations` — owner, admin and manager in
-- seed.sql — because a rule is an instruction to message other people's
-- customers, unattended, at scale.

drop policy if exists message_templates_read on public.message_templates;
create policy message_templates_read on public.message_templates
  for select using (
    private.is_platform_admin()
    or facility_id in (select private.member_facility_ids())
  );

drop policy if exists message_templates_write on public.message_templates;
create policy message_templates_write on public.message_templates
  for all using (
    private.has_permission(facility_id, 'marketing_manage_automations')
  ) with check (
    private.has_permission(facility_id, 'marketing_manage_automations')
  );

drop policy if exists automation_rules_read on public.automation_rules;
create policy automation_rules_read on public.automation_rules
  for select using (
    private.is_platform_admin()
    or facility_id in (select private.member_facility_ids())
  );

drop policy if exists automation_rules_write on public.automation_rules;
create policy automation_rules_write on public.automation_rules
  for all using (
    private.has_permission(facility_id, 'marketing_manage_automations')
  ) with check (
    private.has_permission(facility_id, 'marketing_manage_automations')
  );

-- The outbox and the event log are READ-ONLY to everyone with a session.
--
-- Nothing holding a user's JWT may write a send record: a forged 'sent' row is
-- a false answer to "did the customer get it", and that answer is evidence. The
-- dispatcher writes as service_role, which RLS does not constrain. Events are
-- written only through emit_automation_event().
--
-- Cancelling a queued message is a real thing staff will want and is NOT
-- possible yet. It needs a route that checks the permission and writes as
-- service_role; a policy letting a session update status would also let it
-- update `sent_at`.

drop policy if exists message_sends_read on public.message_sends;
create policy message_sends_read on public.message_sends
  for select using (
    private.is_platform_admin()
    or facility_id in (select private.member_facility_ids())
  );

drop policy if exists automation_events_read on public.automation_events;
create policy automation_events_read on public.automation_events
  for select using (
    private.is_platform_admin()
    or facility_id in (select private.member_facility_ids())
  );

-- Suppressions are writable by permission holders: "take me off your list" said
-- over the counter has to be actionable by the person who heard it.
drop policy if exists message_suppressions_read on public.message_suppressions;
create policy message_suppressions_read on public.message_suppressions
  for select using (
    private.is_platform_admin()
    or facility_id in (select private.member_facility_ids())
  );

drop policy if exists message_suppressions_write on public.message_suppressions;
create policy message_suppressions_write on public.message_suppressions
  for all using (
    private.has_permission(facility_id, 'marketing_manage_automations')
  ) with check (
    private.has_permission(facility_id, 'marketing_manage_automations')
  );

-- ── Privileges ────────────────────────────────────────────────────────────
--
-- Named one by one and then ASSERTED. A default privilege in this project hands
-- `authenticated` the full set on every new table, so leaving INSERT out of a
-- grant does NOT remove it. That was measured on facility_tasks; the assertion
-- block below is the evidence that it worked here.
--
-- And `revoke ... from public` is not `revoke ... from anon` — they are
-- different grants and both are needed. 20260822610000 exists because one
-- attempt named only one of them.

grant select, insert, update, delete on public.message_templates    to authenticated;
grant select, insert, update, delete on public.automation_rules     to authenticated;
grant select, insert, update, delete on public.message_suppressions to authenticated;

-- Read only. See the RLS note above: a session may look at the outbox and the
-- event log, never write to them.
grant select on public.message_sends     to authenticated;
grant select on public.automation_events to authenticated;

revoke all on public.message_templates    from public, anon;
revoke all on public.automation_rules     from public, anon;
revoke all on public.automation_events    from public, anon;
revoke all on public.message_sends        from public, anon;
revoke all on public.message_suppressions from public, anon;

-- EXPLICIT, because granting only SELECT above does not take the rest away.
-- The default privilege on a new table in this project hands `authenticated`
-- the full set, so "we simply did not grant INSERT" leaves INSERT in place —
-- measured on facility_tasks, and the reason the assertion block exists at all.
-- The outbox is evidence about what a facility said to its customers; a session
-- that can write it can forge that evidence.
revoke insert, update, delete on public.message_sends     from authenticated;
revoke insert, update, delete on public.automation_events from authenticated;

revoke execute on function public.emit_automation_event(uuid, text, text, uuid, uuid, uuid, uuid, jsonb) from public, anon;
grant  execute on function public.emit_automation_event(uuid, text, text, uuid, uuid, uuid, uuid, jsonb) to authenticated;

do $$
declare t text;
begin
  foreach t in array array[
    'public.message_templates',
    'public.automation_rules',
    'public.automation_events',
    'public.message_sends',
    'public.message_suppressions'
  ] loop
    if has_table_privilege('anon', t, 'select') then
      raise exception '% : anon can still read', t;
    end if;
    if has_table_privilege('anon', t, 'insert') then
      raise exception '% : anon can still write', t;
    end if;
  end loop;

  -- The outbox is evidence. Prove no session can forge a row in it.
  if has_table_privilege('authenticated', 'public.message_sends', 'insert') then
    raise exception 'authenticated can forge a message_sends row';
  end if;
  if has_table_privilege('authenticated', 'public.message_sends', 'update') then
    raise exception 'authenticated can rewrite a message_sends row';
  end if;
  if has_table_privilege('authenticated', 'public.automation_events', 'insert') then
    raise exception 'authenticated can write automation_events directly';
  end if;

  -- A revoke naming a privilege the role does not hold succeeds silently and
  -- looks identical to one that worked, so these are checked rather than
  -- trusted.
  if has_function_privilege('anon',
       'public.emit_automation_event(uuid, text, text, uuid, uuid, uuid, uuid, jsonb)', 'execute') then
    raise exception 'anon can still emit automation events';
  end if;
  if not has_function_privilege('authenticated',
       'public.emit_automation_event(uuid, text, text, uuid, uuid, uuid, uuid, jsonb)', 'execute') then
    raise exception 'authenticated cannot emit automation events';
  end if;
end $$;
