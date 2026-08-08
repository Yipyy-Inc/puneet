-- ============================================================================
-- Clover, phase 2: what the merchant does when Yipyy is not looking.
--
-- ── THE DRIFT THIS CLOSES ─────────────────────────────────────────────────
--
-- Everything so far assumes money moves because we asked. It does not. A
-- merchant refunds a customer from Clover's own dashboard, voids a payment on
-- the terminal, or uninstalls the app entirely — and this database learns none
-- of it. The ledger stays confident and stops being true, which is the worst
-- state a ledger has.
--
-- Uninstall is the sharpest case: `payment_connections.status` has had a
-- 'revoked' value since 20260807660000 and NOTHING has ever set it. A merchant
-- who removed the app is still recorded as connected, so the next customer to
-- pay gets a 401 dressed up as a system error.
--
-- ── A WEBHOOK IS A NOTIFICATION, NOT DATA ─────────────────────────────────
--
-- Clover's payload carries an object ID and nothing else:
--
--   { "appId":"…", "merchants": { "<MID>": [
--       { "objectId":"P:R80S1AJ1E0SZP", "type":"UPDATE", "ts":1786188969179 } ] } }
--
-- No amount, no status, no card. Whatever happened has to be fetched back from
-- the API with that merchant's token. So this table records the DELIVERY, and
-- acting on it is a separate step that can fail, be retried, or be left undone
-- without losing the fact that Clover told us something.
--
-- Recording first is also what makes the endpoint safe to answer 200 from. A
-- 4xx makes Clover retry; an event we can never process would retry forever. It
-- is recorded, marked 'ignored' with the reason, and the delivery is over.
--
-- ── IDEMPOTENCY IS A CONSTRAINT, NOT A CONVENTION ─────────────────────────
--
-- Same rule as `payments_processor_identity` (20260807680000), for the same
-- reason: Clover retries, and a retried delivery that acts twice is a phantom
-- refund in somebody's revenue. The unique index makes the second delivery a
-- no-op in the database rather than in whichever handler remembered to check.
--
-- ── THE AUTH HEADER IS A SHARED SECRET, AND THAT IS WORTH SAYING ──────────
--
-- Clover does not sign deliveries. `X-Clover-Auth` is a static UUID from the
-- dashboard, so possession is proof and there is no per-message integrity at
-- all — anyone who learns it can forge deliveries until it is rotated. This
-- table is therefore append-only evidence of what arrived, never a statement
-- that what arrived was true. Nothing here moves money on a webhook's say-so;
-- the handler re-reads the object from Clover's API before believing it.
-- ============================================================================

create table if not exists public.payment_webhook_events (
  id            uuid primary key default gen_random_uuid(),

  processor     text not null default 'clover'
                  check (processor in ('clover')),
  -- Which Clover estate this came from. Sandbox and production deliveries can
  -- reach the same deployment during a cutover and must never be confused.
  environment   text not null check (environment in ('sandbox', 'production')),

  app_id        text,
  merchant_id   text,
  -- Resolved from `payment_connections`, and NULLABLE on purpose: a delivery
  -- for a merchant we do not know is still worth keeping. It is either a
  -- half-finished install or somebody with the auth header, and both are things
  -- you want a record of.
  facility_id   uuid references public.facilities(id) on delete set null,

  -- Clover's objectId is "<kind>:<id>" — P payments, A apps, O orders,
  -- M merchants. Split on arrival so the kind can be indexed and queried;
  -- 'VERIFICATION' is ours, for the handshake POST that carries no object.
  object_kind   text not null,
  object_id     text,
  -- CREATE / UPDATE / DELETE. Clover's word is `type`, which is taken here.
  change        text,
  occurred_at   timestamptz,

  -- The delivery exactly as it arrived. If the parsing above is ever wrong,
  -- this is what lets it be re-derived rather than re-requested.
  payload       jsonb not null,

  status        text not null default 'received'
                  check (status in ('received', 'processed', 'ignored', 'failed')),
  outcome       text,

  received_at   timestamptz not null default now(),
  processed_at  timestamptz,

  -- A terminal status has to say why it is terminal. An 'ignored' row with no
  -- reason is indistinguishable from a bug that dropped an event.
  constraint payment_webhook_terminal_has_reason
    check (status in ('received', 'processed') or outcome is not null)
);

comment on table public.payment_webhook_events is
  'Every delivery Clover made, recorded before it is acted on. Evidence of what arrived — never a statement that it was true.';
comment on column public.payment_webhook_events.payload is
  'The delivery verbatim. Keeps a parsing mistake recoverable without asking Clover to resend.';

-- ── Idempotency ───────────────────────────────────────────────────────────
--
-- A retry repeats (merchant, object, change, ts) exactly. Partial, because the
-- verification handshake has no object and legitimately arrives more than once
-- — a person can press "Send Verification Code" twice, and the second press
-- must not be swallowed as a duplicate of the first.

create unique index if not exists payment_webhook_events_delivery
  on public.payment_webhook_events (processor, merchant_id, object_id, change, occurred_at)
  where object_id is not null and merchant_id is not null;

create index if not exists payment_webhook_events_facility
  on public.payment_webhook_events (facility_id, received_at desc);

-- Finding the work still to do, which is the query an operator actually runs.
create index if not exists payment_webhook_events_unsettled
  on public.payment_webhook_events (received_at desc)
  where status in ('received', 'failed');

-- ── Who may read it ───────────────────────────────────────────────────────
--
-- Same shape as payment_connections: a facility sees its own, a platform admin
-- sees all. NOBODY writes through PostgREST — there are no insert or update
-- policies and no grants, so the only way in is the service role through the
-- functions below.

alter table public.payment_webhook_events enable row level security;

revoke all on public.payment_webhook_events from anon;

drop policy if exists payment_webhook_events_read on public.payment_webhook_events;
create policy payment_webhook_events_read on public.payment_webhook_events
  for select to authenticated
  using (
    private.is_platform_admin()
    or exists (
      select 1 from public.facility_memberships m
       where m.facility_id = payment_webhook_events.facility_id
         and m.profile_id = (select auth.jwt() ->> 'sub')
         and m.is_active
    )
  );

-- ── Recording a delivery ──────────────────────────────────────────────────

create or replace function public.record_payment_webhook(
  p_processor   text,
  p_environment text,
  p_app_id      text,
  p_merchant_id text,
  p_object_kind text,
  p_object_id   text,
  p_change      text,
  p_occurred_at timestamptz,
  p_payload     jsonb
)
returns table (event_id uuid, is_new boolean)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_facility uuid;
  v_id       uuid;
begin
  -- Resolved here rather than by the caller so that the merchant→facility link
  -- is made in the same statement that records the event. A handler that looked
  -- it up separately could record an event against a facility that was
  -- disconnected in between.
  select pc.facility_id into v_facility
    from public.payment_connections pc
   where pc.processor = p_processor
     and pc.merchant_id = p_merchant_id;

  insert into public.payment_webhook_events (
    processor, environment, app_id, merchant_id, facility_id,
    object_kind, object_id, change, occurred_at, payload
  )
  values (
    p_processor, p_environment, p_app_id, p_merchant_id, v_facility,
    p_object_kind, p_object_id, p_change, p_occurred_at, p_payload
  )
  on conflict do nothing
  returning id into v_id;

  if v_id is not null then
    return query select v_id, true;
    return;
  end if;

  -- A retry. Hand back the ORIGINAL row so the caller can see what was decided
  -- the first time rather than deciding again.
  select e.id into v_id
    from public.payment_webhook_events e
   where e.processor = p_processor
     and e.merchant_id = p_merchant_id
     and e.object_id = p_object_id
     and e.change is not distinct from p_change
     and e.occurred_at is not distinct from p_occurred_at;

  return query select v_id, false;
end;
$$;

comment on function public.record_payment_webhook(
  text, text, text, text, text, text, text, timestamptz, jsonb) is
  'Idempotent. Returns the event and whether this delivery was the first one; a retry returns the original row untouched.';

create or replace function public.close_payment_webhook(
  p_event_id uuid,
  p_status   text,
  p_outcome  text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_status not in ('processed', 'ignored', 'failed') then
    raise exception 'A webhook closes as processed, ignored or failed — not %', p_status
      using errcode = '22023';
  end if;

  update public.payment_webhook_events
     set status       = p_status,
         outcome      = p_outcome,
         processed_at = now()
   where id = p_event_id;
end;
$$;

-- ── The connection can finally be revoked ─────────────────────────────────
--
-- Distinct from `record_payment_connection_error` (20260807720000), and the
-- difference matters. An error is a connection that MIGHT still work — the
-- refresh token stays readable precisely so it can repair itself. A revocation
-- is the merchant having removed us: nothing will repair it, and the only way
-- back is for them to authorise again.
--
-- The credentials are still not deleted. A revoked row with dead tokens is a
-- record of a relationship that existed; deleting it would leave the payments
-- that connection took pointing at nothing.

create or replace function public.revoke_payment_connection(
  p_facility_id uuid,
  p_reason      text,
  p_processor   text default 'clover'
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_changed integer;
begin
  update public.payment_connections
     set status     = 'revoked',
         revoked_at = coalesce(revoked_at, now()),
         last_error = p_reason,
         updated_at = now()
   where facility_id = p_facility_id
     and processor = p_processor
     -- Already revoked is not an error and not a change. Saying so lets the
     -- caller record "nothing to do" instead of claiming it revoked something.
     and status is distinct from 'revoked';

  get diagnostics v_changed = row_count;
  return v_changed > 0;
end;
$$;

-- ── The grants ARE the security boundary ──────────────────────────────────

revoke all on function public.record_payment_webhook(
  text, text, text, text, text, text, text, timestamptz, jsonb)
  from public, anon, authenticated;
revoke all on function public.close_payment_webhook(uuid, text, text)
  from public, anon, authenticated;
revoke all on function public.revoke_payment_connection(uuid, text, text)
  from public, anon, authenticated;

grant execute on function public.record_payment_webhook(
  text, text, text, text, text, text, text, timestamptz, jsonb)
  to service_role;
grant execute on function public.close_payment_webhook(uuid, text, text)
  to service_role;
grant execute on function public.revoke_payment_connection(uuid, text, text)
  to service_role;
