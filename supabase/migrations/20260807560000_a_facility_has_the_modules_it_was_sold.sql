-- ============================================================================
-- What THIS facility has, as distinct from what its plan includes.
--
-- ── A ROW HERE IS AN OVERRIDE, NOT THE STATE ──────────────────────────────
--
-- The obvious design is a row per facility per module saying on or off. It is
-- wrong, and the mock shows why: `resetFacilityModules` exists precisely
-- because the console needs to say "forget the bespoke arrangements and go
-- back to the plan", and it cannot if the plan was copied into rows.
--
-- So the effective answer is computed:
--
--   no row          -> whatever the plan includes
--   row, enabled    -> on, even if the plan does not include it (a sale)
--   row, disabled   -> off, even if the plan does include it (a withdrawal)
--
-- Two things fall out for free. Change what Pack Leader includes and every
-- facility on Pack Leader moves, except the ones with a negotiated exception.
-- And "reset to plan" is a DELETE, which is exactly what it means.
--
-- ── WHAT A MODULE COSTS ───────────────────────────────────────────────────
--
--   included in the plan  -> 0, it is already paid for
--   sold as an add-on     -> modules.price_monthly_cents
--   negotiated            -> price_override_cents, whatever was agreed
--
-- ── EXPIRY ────────────────────────────────────────────────────────────────
--
-- The mock's overrides carried "Trial access granted for 30 days" with an
-- expiry, and nothing anywhere read it. Here an expired override simply stops
-- applying and the facility falls back to its plan — no job to run, nothing to
-- forget. The row stays as the record that the trial happened.
--
-- ── DEPENDENCIES ARE REPORTED, NOT ENFORCED ───────────────────────────────
--
-- Grooming Management needs Booking and Customer Management. If Booking is off
-- and someone sells Grooming anyway, that is worth showing loudly — but it is
-- not the database's place to refuse a deal the platform team has agreed. The
-- resolver returns the missing dependencies; the screen shows them.
--
-- ── NOTHING ENFORCES THIS YET ─────────────────────────────────────────────
--
-- This records what was sold. No screen is gated on it, deliberately: every
-- live facility is on Puppy, which includes three modules, while the demo
-- facility runs grooming, boarding, daycare and training. Turning entitlements
-- into enforcement would lock working businesses out of what they are already
-- using. That is a commercial decision and a separate change; making the
-- record exist has to come first.
-- ============================================================================

create table if not exists public.facility_modules (
  facility_id          uuid not null references public.facilities (id) on delete cascade,
  module_id            text not null references public.modules (id) on delete restrict,
  enabled              boolean not null,
  -- NULL means the catalogue price applies. Zero is a real price: free.
  price_override_cents integer check (price_override_cents >= 0),
  note                 text not null default '',
  granted_by           text references public.profiles (id) on delete set null,
  expires_at           timestamptz,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  primary key (facility_id, module_id)
);

comment on table public.facility_modules is
  'Departures from what the plan includes. No row means the plan decides — see the header of 20260807560000.';
comment on column public.facility_modules.price_override_cents is
  'NULL = use the catalogue price. 0 is a real price meaning free, and is not the same thing.';
comment on column public.facility_modules.expires_at is
  'Past this moment the override stops applying and the plan decides again. Nothing has to run.';

create index if not exists facility_modules_module_idx
  on public.facility_modules (module_id);

alter table public.facility_modules enable row level security;

-- Same shape as facility_subscriptions: a facility can see what it has, only
-- the platform can change it. A facility granting itself a module would be
-- helping itself to inventory.

drop policy if exists facility_modules_read on public.facility_modules;
create policy facility_modules_read on public.facility_modules
  for select to authenticated
  using (
    private.is_platform_admin()
    or exists (
      select 1 from public.facility_memberships m
       where m.facility_id = facility_modules.facility_id
         and m.profile_id = (select auth.jwt() ->> 'sub')
         and m.is_active
    )
  );

drop policy if exists facility_modules_write on public.facility_modules;
create policy facility_modules_write on public.facility_modules
  for all to authenticated
  using (private.is_platform_admin())
  with check (private.is_platform_admin());

drop trigger if exists facility_modules_touch on public.facility_modules;
create trigger facility_modules_touch
  before update on public.facility_modules
  for each row execute function private.set_updated_at();

-- ── The resolver ───────────────────────────────────────────────────────────
--
-- SECURITY INVOKER on purpose. Every table it reads already has the right
-- policy: the catalogue is readable by anyone signed in, the plan and the
-- overrides only by the facility's own people and the platform team. Making it
-- a definer would hand the whole estate's commercial arrangements to any
-- authenticated caller, to save writing a check that RLS already performs.

create or replace function public.facility_module_entitlements(p_facility_id uuid)
returns table (
  module_id            text,
  slug                 text,
  name                 text,
  description          text,
  category             text,
  icon                 text,
  enabled              boolean,
  -- plan | add-on | withdrawn | not included
  source               text,
  price_cents          integer,
  list_price_cents     integer,
  included_in_plan     boolean,
  available_on_plan    boolean,
  is_standalone        boolean,
  min_tier_rank        smallint,
  expires_at           timestamptz,
  note                 text,
  missing_dependencies text[]
)
language sql
stable
set search_path = ''
as $fn$
  with plan as (
    select t.id as tier_id, t.rank
      from public.facility_subscriptions s
      join public.subscription_tiers t on t.id = s.tier_id
     where s.facility_id = p_facility_id
  ),
  override as (
    select fm.module_id, fm.enabled, fm.price_override_cents, fm.expires_at, fm.note
      from public.facility_modules fm
     where fm.facility_id = p_facility_id
       and (fm.expires_at is null or fm.expires_at > now())
  ),
  resolved as (
    select m.id, m.slug, m.name, m.description, m.category, m.icon,
           m.price_monthly_cents, m.min_tier_rank, m.is_standalone, m.sort_order,
           exists (
             select 1 from public.tier_modules tm
              where tm.module_id = m.id
                and tm.tier_id = (select p.tier_id from plan p)
           ) as included,
           o.enabled              as ov_enabled,
           o.price_override_cents as ov_price,
           o.expires_at           as ov_expires,
           o.note                 as ov_note
      from public.modules m
      left join override o on o.module_id = m.id
     where m.is_active
  )
  select
    r.id,
    r.slug,
    r.name,
    r.description,
    r.category,
    r.icon,
    coalesce(r.ov_enabled, r.included) as enabled,
    case
      when not coalesce(r.ov_enabled, r.included)
        then case when r.included then 'withdrawn' else 'not included' end
      when r.included then 'plan'
      else 'add-on'
    end as source,
    coalesce(
      r.ov_price,
      case when r.included then 0 else r.price_monthly_cents end
    )::integer as price_cents,
    r.price_monthly_cents,
    r.included,
    (r.min_tier_rank <= coalesce((select p.rank from plan p), 0)) as available_on_plan,
    r.is_standalone,
    r.min_tier_rank,
    r.ov_expires,
    coalesce(r.ov_note, ''),
    (
      select coalesce(array_agg(d.requires_module_id order by d.requires_module_id), '{}')
        from public.module_dependencies d
       where d.module_id = r.id
         and not coalesce(
               (select coalesce(x.ov_enabled, x.included) from resolved x where x.id = d.requires_module_id),
               false)
    ) as missing_dependencies
  from resolved r
  order by r.sort_order;
$fn$;

comment on function public.facility_module_entitlements(uuid) is
  'The effective module list for one facility: the plan, with this facility''s overrides applied. Reads under the caller''s own permissions.';

-- One boolean, shaped so a future RLS policy can call it. Definer, because a
-- policy runs as the person being checked and must not depend on that person
-- being able to read the subscription table.

create or replace function public.facility_has_module(p_facility_id uuid, p_module_id text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $fn$
  select coalesce(
    (select fm.enabled
       from public.facility_modules fm
      where fm.facility_id = p_facility_id
        and fm.module_id = p_module_id
        and (fm.expires_at is null or fm.expires_at > now())),
    exists (
      select 1
        from public.tier_modules tm
        join public.facility_subscriptions s on s.tier_id = tm.tier_id
       where s.facility_id = p_facility_id
         and tm.module_id = p_module_id),
    false);
$fn$;

-- ── Writing it ─────────────────────────────────────────────────────────────
--
-- Through functions rather than table writes, so a refusal is an error the
-- caller can report rather than an UPDATE that matched no rows and said
-- nothing. The RLS policies above still stand behind them.

create or replace function public.set_facility_module(
  p_facility_id          uuid,
  p_module_id            text,
  p_enabled              boolean,
  p_price_override_cents integer default null,
  p_note                 text default '',
  p_expires_at           timestamptz default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  v_actor text := (select auth.jwt() ->> 'sub');
begin
  if not private.is_platform_admin() then
    raise exception 'Only the platform team can change what a facility is sold.'
      using errcode = '42501';
  end if;

  if not exists (select 1 from public.modules m where m.id = p_module_id and m.is_active) then
    raise exception 'No active module called %', p_module_id using errcode = '23503';
  end if;

  insert into public.facility_modules as fm
    (facility_id, module_id, enabled, price_override_cents, note, granted_by, expires_at)
  values
    (p_facility_id, p_module_id, p_enabled, p_price_override_cents,
     coalesce(p_note, ''), v_actor, p_expires_at)
  on conflict (facility_id, module_id) do update
     set enabled              = excluded.enabled,
         price_override_cents = excluded.price_override_cents,
         note                 = excluded.note,
         granted_by           = excluded.granted_by,
         expires_at           = excluded.expires_at;
end;
$fn$;

-- Back to whatever the plan says. Returns how many exceptions were dropped, so
-- the caller can tell "reset 6 modules" from "there was nothing to reset".

create or replace function public.reset_facility_modules(p_facility_id uuid)
returns integer
language plpgsql
security definer
set search_path = ''
as $fn$
declare v_count integer;
begin
  if not private.is_platform_admin() then
    raise exception 'Only the platform team can change what a facility is sold.'
      using errcode = '42501';
  end if;

  delete from public.facility_modules fm where fm.facility_id = p_facility_id;
  get diagnostics v_count = row_count;
  return v_count;
end;
$fn$;

revoke execute on function public.facility_module_entitlements(uuid) from anon;
revoke execute on function public.facility_has_module(uuid, text) from anon;
revoke execute on function public.set_facility_module(uuid, text, boolean, integer, text, timestamptz) from anon;
revoke execute on function public.reset_facility_modules(uuid) from anon;

-- ── Selling and withdrawing are recorded ───────────────────────────────────
--
-- On the table, not inside set_facility_module, for the same reason the other
-- audit triggers are: a migration, a seed or an engineer with psql can all
-- change what a facility has, and none of them go through the function.

create or replace function private.audit_facility_module()
returns trigger
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  v_row      record;
  v_facility text;
  v_module   text;
  v_action   text;
  v_severity text;
  v_from     text;
  v_to       text;
begin
  if tg_op = 'DELETE' then v_row := old; else v_row := new; end if;

  select f.name into v_facility from public.facilities f where f.id = v_row.facility_id;
  select m.name into v_module   from public.modules m    where m.id = v_row.module_id;

  if tg_op = 'DELETE' then
    v_action   := 'Module exception removed';
    v_severity := 'Medium';
    v_from     := case when old.enabled then 'enabled' else 'disabled' end;
    v_to       := 'plan default';
  else
    if tg_op = 'UPDATE' and new.enabled is not distinct from old.enabled
       and new.price_override_cents is not distinct from old.price_override_cents
       and new.expires_at is not distinct from old.expires_at then
      return null;
    end if;
    v_action   := case when new.enabled then 'Module enabled' else 'Module disabled' end;
    -- Taking a capability away is the one a support call starts with.
    v_severity := case when new.enabled then 'Medium' else 'High' end;
    v_from     := case
                    when tg_op = 'INSERT' then 'plan default'
                    when old.enabled then 'enabled'
                    else 'disabled'
                  end;
    v_to       := case when new.enabled then 'enabled' else 'disabled' end;
  end if;

  perform private.record_audit(
    v_action,
    'Financial',
    v_severity,
    'module', v_row.module_id, coalesce(v_module, v_row.module_id),
    v_row.facility_id, v_facility,
    format('%s: %s %s -> %s',
           coalesce(v_facility, 'facility'), coalesce(v_module, v_row.module_id), v_from, v_to),
    jsonb_build_array(jsonb_build_object('field', 'enabled', 'from', v_from, 'to', v_to)));

  return null;
end;
$fn$;

drop trigger if exists audit_facility_module on public.facility_modules;
create trigger audit_facility_module
  after insert or update or delete on public.facility_modules
  for each row execute function private.audit_facility_module();
