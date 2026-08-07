-- ============================================================================
-- The agreed price is returned, not inferred from the effective one.
--
-- `facility_module_entitlements` returned price_cents (what this facility pays)
-- and list_price_cents (the catalogue), and dropped the third number on the
-- floor: whether a bespoke price was agreed at all. The screen needs it,
-- because the price field must show blank for "no arrangement" and 0.00 for
-- "we agreed it was free" — two different states that both bill zero today and
-- diverge the moment the catalogue price moves.
--
-- Trying to recover it from the two returned numbers gets both interesting
-- cases wrong:
--
--   included in the plan, agreed at 0  ->  looks identical to no arrangement
--   agreed at exactly the list price   ->  looks identical to no arrangement
--
-- Both are real things a salesperson does. The value exists in the row the
-- function already reads; returning it is cheaper and truer than any rule for
-- guessing it back.
--
-- The return type changes, so this is a DROP and CREATE rather than a REPLACE.
-- Nothing in the application has shipped against the old shape.
-- ============================================================================

drop function if exists public.facility_module_entitlements(uuid);

create function public.facility_module_entitlements(p_facility_id uuid)
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
  -- NULL when no bespoke price was agreed. 0 is an agreed price of nothing.
  price_override_cents integer,
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
    r.ov_price,
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

revoke execute on function public.facility_module_entitlements(uuid) from anon;
