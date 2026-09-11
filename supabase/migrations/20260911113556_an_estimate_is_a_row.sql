-- ============================================================================
-- An estimate is a row.
--
-- ── WHAT WAS THERE ────────────────────────────────────────────────────────
--
-- Nothing in the database. Every estimate screen — the facility list, the
-- wizard, the booking modal's estimate mode, the convert dialog, the client
-- file's tab, the customer's list and accept / decline pages — read seven rows
-- from `@/data/estimates`, and every action either showed a toast or edited
-- that array in memory. The wizard's "Send" built an estimate and stored it
-- nowhere, so a created estimate never appeared in the list it was sent from.
--
-- ── THE SHAPE ─────────────────────────────────────────────────────────────
--
-- One row per estimate, its lines as jsonb: an estimate's lines are a
-- snapshot of a quote, read and replaced together, never queried across rows.
-- Money is numeric(12,2), never float. A GUEST estimate (somebody not yet a
-- client) carries their contact in `guest`; one of the two is required.
--
-- Numbering belongs to the facility. `seq` counts per facility under an
-- advisory lock, and `estimate_number` is the facility's own prefix and width
-- from its `estimate_settings` (default "E" + 5 digits, starting at E10001 as
-- the product always has). Both are frozen after insert, as are the facility,
-- the token and the author.
--
-- `token` is the customer's link: 32 random hex characters from two uuids.
--
-- ── WHO ───────────────────────────────────────────────────────────────────
--
--   staff read     `view_estimates`
--   staff write    `create_bookings` — an estimate is a booking not yet made;
--                  a DRAFT may be deleted, anything sent is kept as the record
--   customer read  their own, once it has been sent
--   customer act   `respond_to_estimate` below: view, accept or decline their
--                  own sent estimate, if the facility allows acceptance. It
--                  cannot touch price, lines or dates.
--
-- Converting to a booking stays with staff and goes through the booking
-- pipeline (`create_booking`), which owns every rule a booking obeys.
-- ============================================================================

create table if not exists public.estimates (
  id uuid primary key default gen_random_uuid(),
  facility_id uuid not null references public.facilities(id) on delete cascade,
  seq integer not null,
  estimate_number text not null,

  client_id uuid references public.clients(id) on delete set null,
  guest jsonb,
  pet_ids uuid[] not null default '{}',

  service text not null check (btrim(service) <> ''),
  service_type text,
  start_date date,
  end_date date,
  check_in_time text,
  check_out_time text,
  room_type text,

  line_items jsonb not null default '[]'::jsonb
    check (jsonb_typeof(line_items) = 'array'),
  subtotal numeric(12,2) not null default 0 check (subtotal >= 0),
  discount numeric(12,2) not null default 0 check (discount >= 0),
  discount_reason text,
  tax_rate numeric(6,3) not null default 0 check (tax_rate >= 0),
  tax_amount numeric(12,2) not null default 0 check (tax_amount >= 0),
  total numeric(12,2) not null default 0 check (total >= 0),
  deposit_required numeric(12,2) check (deposit_required is null or deposit_required >= 0),

  status text not null default 'draft'
    check (status in ('draft', 'sent', 'accepted', 'declined', 'expired', 'converted')),
  token text not null unique
    default replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', ''),
  public_note text,
  internal_note text,

  sent_at timestamptz,
  sent_via text check (sent_via is null or sent_via in ('email', 'sms', 'both', 'link')),
  viewed_at timestamptz,
  expires_at timestamptz,
  accepted_at timestamptz,
  accepted_by text,
  accepted_on_behalf boolean not null default false,
  declined_at timestamptz,
  decline_reason text,
  converted_booking_id uuid references public.bookings(id) on delete set null,
  converted_at timestamptz,
  duplicated_from uuid references public.estimates(id) on delete set null,

  revisions jsonb not null default '[]'::jsonb check (jsonb_typeof(revisions) = 'array'),
  current_version integer not null default 1 check (current_version >= 1),
  activity_log jsonb not null default '[]'::jsonb check (jsonb_typeof(activity_log) = 'array'),

  created_by text,
  created_by_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (facility_id, seq),
  check (client_id is not null or guest is not null)
);

comment on table public.estimates is
  'Quotes sent before a booking exists. Lines are a jsonb snapshot; numbering is per facility from estimate_settings; converting goes through create_booking.';

create index if not exists estimates_facility_created_idx
  on public.estimates (facility_id, created_at desc);
create index if not exists estimates_client_idx
  on public.estimates (client_id) where client_id is not null;

-- ── Insert: facility, pets, number ────────────────────────────────────────

create or replace function private.estimate_before_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  v_settings jsonb;
  v_prefix text;
  v_digits int;
  v_floor int;
begin
  -- A client's estimate belongs to the client's facility, whatever was sent.
  if new.client_id is not null then
    select facility_id into new.facility_id
      from public.clients where id = new.client_id;
    if new.facility_id is null then
      raise exception 'no such client' using errcode = '23503';
    end if;
  end if;

  if cardinality(new.pet_ids) > 0 then
    if new.client_id is null then
      raise exception 'A guest estimate names no pets on file.' using errcode = '23514';
    end if;
    if exists (
      select 1 from unnest(new.pet_ids) as p(id)
       where not exists (
         select 1 from public.pets x where x.id = p.id and x.client_id = new.client_id
       )
    ) then
      raise exception 'Every pet on an estimate must be the client''s.' using errcode = '23514';
    end if;
  end if;

  -- One number at a time per facility.
  perform pg_advisory_xact_lock(hashtext('estimates:' || new.facility_id::text));

  select value into v_settings
    from public.facility_settings
   where facility_id = new.facility_id and domain = 'estimate_settings';
  v_prefix := coalesce(nullif(v_settings->>'estimateNumberPrefix', ''), 'E');
  v_digits := greatest(1, least(12, coalesce((v_settings->>'minDigits')::int, 5)));
  -- The default prefix has always started at E10001; a facility's own prefix
  -- starts its own sequence at 1.
  v_floor := case when v_prefix = 'E' then 10000 else 0 end;

  select greatest(coalesce(max(seq), 0), v_floor) + 1 into new.seq
    from public.estimates where facility_id = new.facility_id;
  new.estimate_number := v_prefix || lpad(new.seq::text, v_digits, '0');

  new.created_at := now();
  new.updated_at := now();
  return new;
end;
$fn$;

drop trigger if exists estimates_before_insert on public.estimates;
create trigger estimates_before_insert
  before insert on public.estimates
  for each row execute function private.estimate_before_insert();

-- ── Update: what is frozen ────────────────────────────────────────────────

create or replace function private.estimate_before_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $fn$
begin
  new.facility_id := old.facility_id;
  new.seq := old.seq;
  new.estimate_number := old.estimate_number;
  new.token := old.token;
  new.created_by := old.created_by;
  new.created_by_name := old.created_by_name;
  new.created_at := old.created_at;
  -- A client's estimate cannot be moved to another client's name.
  if old.client_id is not null and new.client_id is distinct from old.client_id then
    raise exception 'An estimate cannot be moved to another client.' using errcode = '23514';
  end if;
  new.updated_at := now();
  return new;
end;
$fn$;

drop trigger if exists estimates_before_update on public.estimates;
create trigger estimates_before_update
  before update on public.estimates
  for each row execute function private.estimate_before_update();

revoke all on function private.estimate_before_insert() from public, anon;
revoke all on function private.estimate_before_update() from public, anon;

-- ── Policies ──────────────────────────────────────────────────────────────

alter table public.estimates enable row level security;

drop policy if exists estimates_read on public.estimates;
create policy estimates_read on public.estimates
  for select to authenticated
  using (
    private.is_platform_admin()
    or private.has_permission(facility_id, 'view_estimates')
    or (status <> 'draft'
        and client_id in (select private.own_client_ids()))
  );

drop policy if exists estimates_insert on public.estimates;
create policy estimates_insert on public.estimates
  for insert to authenticated
  with check (private.has_permission(facility_id, 'create_bookings'));

drop policy if exists estimates_update on public.estimates;
create policy estimates_update on public.estimates
  for update to authenticated
  using (private.has_permission(facility_id, 'create_bookings'))
  with check (private.has_permission(facility_id, 'create_bookings'));

drop policy if exists estimates_delete on public.estimates;
create policy estimates_delete on public.estimates
  for delete to authenticated
  using (status = 'draft' and private.has_permission(facility_id, 'create_bookings'));

revoke all on public.estimates from public, anon;
grant select, insert, update, delete on public.estimates to authenticated;

-- ── A customer answers their own estimate ─────────────────────────────────

create or replace function public.respond_to_estimate(
  p_estimate_id uuid,
  p_action text,
  p_reason text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  v_est public.estimates;
  v_allow boolean;
  v_actor text;
begin
  if p_action not in ('view', 'accept', 'decline') then
    raise exception 'An estimate is viewed, accepted or declined.' using errcode = '22023';
  end if;

  select * into v_est from public.estimates
   where id = p_estimate_id
     and client_id in (select private.own_client_ids())
   for update;
  if not found then
    raise exception 'No such estimate.' using errcode = '42501';
  end if;

  select coalesce(p.full_name, p.email) into v_actor
    from public.profiles p where p.id = (select auth.jwt()->>'sub');

  if p_action = 'view' then
    if v_est.viewed_at is null and v_est.status = 'sent' then
      update public.estimates
         set viewed_at = now(),
             activity_log = activity_log || jsonb_build_array(jsonb_build_object(
               'at', now(), 'type', 'viewed', 'actor', coalesce(v_actor, 'Customer')))
       where id = v_est.id;
    end if;
    return jsonb_build_object('status', v_est.status);
  end if;

  if v_est.status <> 'sent' then
    raise exception 'This estimate is no longer open.' using errcode = '22023';
  end if;
  if v_est.expires_at is not null and v_est.expires_at <= now() then
    raise exception 'This estimate has expired.' using errcode = '22023';
  end if;

  if p_action = 'accept' then
    select coalesce((value->>'allowCustomerAcceptance')::boolean, true) into v_allow
      from public.facility_settings
     where facility_id = v_est.facility_id and domain = 'estimate_settings';
    if coalesce(v_allow, true) is false then
      raise exception 'This business accepts estimates by phone or at the desk.'
        using errcode = '42501';
    end if;
    update public.estimates
       set status = 'accepted', accepted_at = now(), accepted_by = v_actor,
           accepted_on_behalf = false,
           activity_log = activity_log || jsonb_build_array(jsonb_build_object(
             'at', now(), 'type', 'accepted', 'actor', coalesce(v_actor, 'Customer')))
     where id = v_est.id;
    return jsonb_build_object('status', 'accepted');
  end if;

  update public.estimates
     set status = 'declined', declined_at = now(),
         decline_reason = nullif(btrim(coalesce(p_reason, '')), ''),
         activity_log = activity_log || jsonb_build_array(jsonb_build_object(
           'at', now(), 'type', 'declined', 'actor', coalesce(v_actor, 'Customer'),
           'detail', nullif(btrim(coalesce(p_reason, '')), '')))
   where id = v_est.id;
  return jsonb_build_object('status', 'declined');
end;
$fn$;

comment on function public.respond_to_estimate(uuid, text, text) is
  'A signed-in customer views, accepts or declines their own sent estimate. Changes status and the log only.';

revoke all on function public.respond_to_estimate(uuid, text, text) from public, anon;
grant execute on function public.respond_to_estimate(uuid, text, text) to authenticated;

do $verify$
begin
  if has_table_privilege('anon', 'public.estimates', 'select') then
    raise exception 'anon can read estimates';
  end if;
  if has_function_privilege('anon', 'public.respond_to_estimate(uuid, text, text)', 'execute') then
    raise exception 'anon can respond to an estimate';
  end if;
  if not has_function_privilege('authenticated', 'public.respond_to_estimate(uuid, text, text)', 'execute') then
    raise exception 'authenticated cannot respond to an estimate';
  end if;
end $verify$;
