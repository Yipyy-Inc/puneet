-- ============================================================================
-- What Yipyy sells to a facility, written down once.
--
-- ── FOUR CATALOGUES THAT DISAGREE ─────────────────────────────────────────
--
-- "Module" currently means four different things in four files:
--
--   src/data/facilities.ts     availableModules   8, SHORT ids (booking)
--   src/data/feature-toggles.ts availableModules 12, LONG ids  (module-booking)
--   src/data/modules.ts        modules           17, LONG ids, with prices,
--                                                   dependencies and min tier
--   src/data/service-modules.ts builtInModules   what the FACILITY sells to a
--                                                   pet owner — a different
--                                                   thing entirely
--
-- They disagree on the count and on the price: facilities.ts prices Booking at
-- $29.99/mo, modules.ts at $0. Both are "right" under their own reading —
-- one means "what this module is worth", the other "what it adds to the bill".
-- A bridge already exists in the app to paper over the first two
-- (SHORT_TO_LONG, in three separate files).
--
-- The database takes ONE reading, the only one that can be charged for:
--
--   price_monthly_cents is what this module ADDS to the monthly bill on top
--   of the plan. A module the plan already includes adds nothing, so it is 0.
--
-- The catalogue comes from src/data/modules.ts because it is the only source
-- carrying prices, dependencies and a minimum tier — the three facts you need
-- to answer "can this facility have this, and what does it cost".
--
-- ── WHAT IS NOT HERE ──────────────────────────────────────────────────────
--
-- `modules.features` — the marketing bullets — stay in the mock. This table
-- records what is SOLD, not how it is described; nothing charges or entitles
-- on a bullet list. Tier features[] IS here, because the plan's promises are
-- shown on the facility's own billing page and are part of what was bought.
--
-- Two names in this catalogue are close enough to be misread, and both are
-- carried across as they are because renaming them here would break the tier
-- lists that reference them:
--
--   module-training-education   staff training, enterprise
--   module-training             pet training classes, pro
--
-- ── NULL IS UNLIMITED ─────────────────────────────────────────────────────
--
-- The mock encodes "no limit" as -1. That means every consumer must remember
-- the sentinel, and one that forgets reports a facility as capped at minus one
-- user. Here the absence of a limit is the absence of a value.
-- ============================================================================

-- ── The plans ──────────────────────────────────────────────────────────────

create table if not exists public.subscription_tiers (
  id                     text primary key,
  name                   text not null,
  tier_type              text not null
                           check (tier_type in ('beginner', 'pro', 'enterprise', 'custom')),
  -- Ordering, not identity: a module states the LOWEST rank that may have it.
  rank                   smallint not null check (rank between 0 and 9),
  description            text not null default '',

  price_monthly_cents    integer not null default 0 check (price_monthly_cents >= 0),
  price_quarterly_cents  integer not null default 0 check (price_quarterly_cents >= 0),
  price_yearly_cents     integer not null default 0 check (price_yearly_cents >= 0),
  currency               text not null default 'USD',
  -- Basis points, so 2.9% is 290 and no float ever rounds a fee.
  transaction_fee_bps    integer not null default 0 check (transaction_fee_bps between 0 and 10000),

  -- NULL means unlimited. See the header.
  max_users              integer check (max_users > 0),
  max_locations          integer check (max_locations > 0),
  max_clients            integer check (max_clients > 0),
  max_bookings_per_month integer check (max_bookings_per_month > 0),
  storage_gb             integer check (storage_gb > 0),

  features               text[] not null default '{}',
  is_active              boolean not null default true,
  is_public              boolean not null default false,
  is_customizable        boolean not null default false,
  sort_order             integer not null default 0,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);

comment on table public.subscription_tiers is
  'The plans Yipyy sells. A NULL limit column means unlimited, not unknown — see the header of 20260807540000.';
comment on column public.subscription_tiers.rank is
  'Ordering only. A module names the lowest rank allowed to have it; tier ids are never compared.';

-- ── The catalogue ──────────────────────────────────────────────────────────

create table if not exists public.modules (
  id                    text primary key check (id ~ '^module-[a-z0-9-]+$'),
  slug                  text not null unique,
  name                  text not null,
  description           text not null default '',
  category              text not null
                          check (category in ('core', 'advanced', 'premium', 'addon')),
  icon                  text not null default 'Puzzle',

  -- What this ADDS to the monthly bill. Zero for anything a plan includes.
  price_monthly_cents   integer not null default 0 check (price_monthly_cents >= 0),
  price_quarterly_cents integer not null default 0 check (price_quarterly_cents >= 0),
  price_yearly_cents    integer not null default 0 check (price_yearly_cents >= 0),
  currency              text not null default 'USD',

  -- 0 = any plan. Otherwise the lowest subscription_tiers.rank permitted.
  min_tier_rank         smallint not null default 0 check (min_tier_rank between 0 and 9),
  -- Can be bought on its own, on top of a plan that does not include it.
  is_standalone         boolean not null default false,
  is_active             boolean not null default true,
  sort_order            integer not null default 0,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

comment on table public.modules is
  'What Yipyy sells to a facility. Not to be confused with service modules (daycare, boarding) — those are what a facility sells to a pet owner.';
comment on column public.modules.price_monthly_cents is
  'What this module ADDS to the bill on top of the plan. Zero for a module every plan includes.';

-- ── What needs what ────────────────────────────────────────────────────────
--
-- A join table rather than a text[] column, so a dependency can only name a
-- module that exists. `on delete restrict` on the right-hand side: a module
-- something else depends on cannot be quietly removed from the catalogue.

create table if not exists public.module_dependencies (
  module_id          text not null references public.modules (id) on delete cascade,
  requires_module_id text not null references public.modules (id) on delete restrict,
  primary key (module_id, requires_module_id),
  constraint module_dependency_not_self check (module_id <> requires_module_id)
);

-- ── What each plan includes at no extra cost ───────────────────────────────

create table if not exists public.tier_modules (
  tier_id   text not null references public.subscription_tiers (id) on delete cascade,
  module_id text not null references public.modules (id) on delete cascade,
  primary key (tier_id, module_id)
);

comment on table public.tier_modules is
  'Included in the plan. Absence does not mean forbidden — a standalone module above the tier floor can still be sold as an add-on.';

create index if not exists tier_modules_module_idx on public.tier_modules (module_id);

-- ── Reference data everyone may read, only the platform may change ─────────
--
-- A facility must be able to see the catalogue: it is the price list, and the
-- billing page shows what the plan promised. Writing it is a commercial act.

alter table public.subscription_tiers enable row level security;
alter table public.modules            enable row level security;
alter table public.module_dependencies enable row level security;
alter table public.tier_modules       enable row level security;

drop policy if exists subscription_tiers_read on public.subscription_tiers;
create policy subscription_tiers_read on public.subscription_tiers
  for select to authenticated using (true);

drop policy if exists subscription_tiers_write on public.subscription_tiers;
create policy subscription_tiers_write on public.subscription_tiers
  for all to authenticated
  using (private.is_platform_admin())
  with check (private.is_platform_admin());

drop policy if exists modules_read on public.modules;
create policy modules_read on public.modules
  for select to authenticated using (true);

drop policy if exists modules_write on public.modules;
create policy modules_write on public.modules
  for all to authenticated
  using (private.is_platform_admin())
  with check (private.is_platform_admin());

drop policy if exists module_dependencies_read on public.module_dependencies;
create policy module_dependencies_read on public.module_dependencies
  for select to authenticated using (true);

drop policy if exists module_dependencies_write on public.module_dependencies;
create policy module_dependencies_write on public.module_dependencies
  for all to authenticated
  using (private.is_platform_admin())
  with check (private.is_platform_admin());

drop policy if exists tier_modules_read on public.tier_modules;
create policy tier_modules_read on public.tier_modules
  for select to authenticated using (true);

drop policy if exists tier_modules_write on public.tier_modules;
create policy tier_modules_write on public.tier_modules
  for all to authenticated
  using (private.is_platform_admin())
  with check (private.is_platform_admin());

drop trigger if exists subscription_tiers_touch on public.subscription_tiers;
create trigger subscription_tiers_touch
  before update on public.subscription_tiers
  for each row execute function private.set_updated_at();

drop trigger if exists modules_touch on public.modules;
create trigger modules_touch
  before update on public.modules
  for each row execute function private.set_updated_at();

-- ============================================================================
-- Seed — transcribed from src/data/subscription-tiers.ts and
-- src/data/modules.ts. Dollars become cents; -1 becomes NULL; percentages
-- become basis points.
--
-- tier-custom-1 gets rank 2 because its module list is identical to Pack
-- Leader's; it is a differently-priced pro bundle, not a fourth level.
-- ============================================================================

insert into public.subscription_tiers
  (id, name, tier_type, rank, description,
   price_monthly_cents, price_quarterly_cents, price_yearly_cents, transaction_fee_bps,
   max_users, max_bookings_per_month, storage_gb, max_locations, max_clients,
   features, is_public, is_customizable, sort_order)
values
  ('tier-beginner', 'Puppy', 'beginner', 1,
   'Perfect for small facilities just getting started',
   2900, 7900, 29900, 290,
   5, 100, 5, 1, 50,
   array['Basic booking management', 'Up to 5 staff users', 'Client database',
         'Email notifications', 'Basic reporting', 'Mobile app access',
         '1 location support'],
   true, false, 1),

  ('tier-pro', 'Pack Leader', 'pro', 2,
   'Advanced features for growing pet care businesses',
   7900, 21900, 84900, 250,
   20, 500, 25, 3, 300,
   array['Advanced booking & scheduling', 'Up to 20 staff users',
         'Staff scheduling & time tracking', 'Client portal access',
         'Advanced analytics & reports', 'Financial management tools',
         'API access', 'Priority email support', 'Up to 3 locations'],
   true, false, 2),

  ('tier-enterprise', 'Alpha Enterprise', 'enterprise', 3,
   'Complete solution for large-scale operations',
   19900, 54900, 214900, 190,
   null, null, 100, null, null,
   array['Unlimited bookings & reservations', 'Unlimited staff users',
         'Multi-location management', 'Custom integrations',
         'Dedicated account manager', '24/7 phone & chat support',
         'Advanced security & compliance', 'Custom training programs',
         'White-label options', 'API & webhook access'],
   true, true, 3),

  ('tier-custom-1', 'Custom Enterprise', 'custom', 2,
   'Custom package for premium grooming facilities',
   14900, 40900, 159900, 220,
   15, 400, 50, 5, 500,
   array['Grooming-focused features', 'Up to 15 staff users',
         'Grooming appointment management',
         'Inventory tracking for grooming supplies', 'Client photo galleries',
         'Before/after photo management', 'Custom pricing & packages',
         'SMS & email notifications', 'Up to 5 locations'],
   false, true, 4)
on conflict (id) do nothing;

insert into public.modules
  (id, slug, name, description, category, icon,
   price_monthly_cents, price_quarterly_cents, price_yearly_cents,
   min_tier_rank, is_standalone, sort_order)
values
  ('module-booking', 'booking-reservation', 'Booking & Reservation',
   'Complete booking and reservation management system', 'core', 'Calendar',
   0, 0, 0, 0, false, 1),

  ('module-staff-scheduling', 'staff-scheduling', 'Staff Scheduling',
   'Comprehensive staff scheduling and management tools', 'core', 'Users',
   1900, 4900, 18900, 2, true, 2),

  ('module-customer-management', 'customer-management', 'Customer Management',
   'Advanced client and pet profile management', 'core', 'UserCircle',
   0, 0, 0, 0, false, 3),

  ('module-financial-reporting', 'financial-reporting', 'Financial Reporting',
   'Complete financial management and reporting suite', 'advanced', 'DollarSign',
   2900, 7900, 29900, 2, true, 4),

  ('module-communication', 'communication', 'Communication Hub',
   'Multi-channel communication with clients and staff', 'core', 'MessageSquare',
   1500, 3900, 14900, 0, true, 5),

  ('module-training-education', 'training-education', 'Training & Education',
   'Staff training and pet education management', 'premium', 'GraduationCap',
   3900, 10900, 41900, 3, true, 6),

  ('module-grooming-management', 'grooming-management', 'Grooming Management',
   'Specialized grooming service management tools', 'advanced', 'Scissors',
   2500, 6900, 26900, 2, true, 7),

  ('module-inventory-management', 'inventory-management', 'Inventory Management',
   'Complete inventory and supply chain management', 'advanced', 'Package',
   3500, 9500, 36900, 2, true, 8),

  ('module-daycare-boarding', 'daycare-boarding', 'Daycare/Boarding',
   'Complete daycare and boarding management system', 'core', 'Home',
   0, 0, 0, 0, false, 9),

  ('module-training', 'training', 'Training',
   'Pet training program and class management', 'advanced', 'Target',
   2900, 7900, 29900, 2, true, 10),

  ('module-ai-receptionist', 'ai-receptionist', 'AI Receptionist',
   'AI-powered virtual receptionist for 24/7 customer support', 'premium', 'Bot',
   4900, 13500, 52900, 2, true, 11),

  ('module-loyalty-program', 'loyalty-program', 'Loyalty Program',
   'Customer loyalty and rewards program management', 'advanced', 'Gift',
   2500, 6900, 26900, 2, true, 12),

  ('module-email-sms-marketing', 'email-sms-marketing', 'Email/SMS Marketing',
   'Advanced email and SMS marketing automation', 'advanced', 'Mail',
   3500, 9500, 36900, 2, true, 13),

  ('module-voip', 'voip', 'VOIP',
   'Voice over IP phone system integration', 'premium', 'Phone',
   4500, 12500, 48900, 2, true, 14),

  ('module-advanced-analytics', 'advanced-analytics', 'Advanced Analytics',
   'In-depth business intelligence and analytics', 'premium', 'BarChart3',
   5500, 14900, 57900, 3, true, 15),

  ('module-community-forum', 'community-forum', 'Community Forum',
   'Online community and discussion forum for pet owners', 'addon', 'MessagesSquare',
   1900, 4900, 18900, 2, true, 16),

  ('module-gamification', 'gamification', 'Gamification (Badges)',
   'Gamification system with badges and achievements', 'addon', 'Award',
   1500, 3900, 14900, 2, true, 17)
on conflict (id) do nothing;

insert into public.module_dependencies (module_id, requires_module_id)
values
  ('module-staff-scheduling',    'module-booking'),
  ('module-financial-reporting', 'module-booking'),
  ('module-training-education',  'module-staff-scheduling'),
  ('module-grooming-management', 'module-booking'),
  ('module-grooming-management', 'module-customer-management'),
  ('module-daycare-boarding',    'module-booking'),
  ('module-training',            'module-booking'),
  ('module-training',            'module-customer-management'),
  ('module-ai-receptionist',     'module-communication'),
  ('module-loyalty-program',     'module-customer-management'),
  ('module-email-sms-marketing', 'module-communication'),
  ('module-email-sms-marketing', 'module-customer-management'),
  ('module-advanced-analytics',  'module-financial-reporting'),
  ('module-community-forum',     'module-customer-management'),
  ('module-gamification',        'module-customer-management'),
  ('module-gamification',        'module-loyalty-program')
on conflict do nothing;

-- Exactly the availableModules lists in src/data/subscription-tiers.ts, and
-- nothing more. Notably: no plan includes Daycare/Boarding, which every one of
-- our facilities uses. That is the tier data as written, carried across
-- unchanged rather than corrected here — a commercial decision, not a
-- migration's to make.

insert into public.tier_modules (tier_id, module_id)
values
  ('tier-beginner',   'module-booking'),
  ('tier-beginner',   'module-customer-management'),
  ('tier-beginner',   'module-communication'),

  ('tier-pro',        'module-booking'),
  ('tier-pro',        'module-staff-scheduling'),
  ('tier-pro',        'module-customer-management'),
  ('tier-pro',        'module-financial-reporting'),
  ('tier-pro',        'module-communication'),
  ('tier-pro',        'module-grooming-management'),
  ('tier-pro',        'module-inventory-management'),

  ('tier-enterprise', 'module-booking'),
  ('tier-enterprise', 'module-staff-scheduling'),
  ('tier-enterprise', 'module-customer-management'),
  ('tier-enterprise', 'module-financial-reporting'),
  ('tier-enterprise', 'module-communication'),
  ('tier-enterprise', 'module-training-education'),
  ('tier-enterprise', 'module-grooming-management'),
  ('tier-enterprise', 'module-inventory-management'),

  ('tier-custom-1',   'module-booking'),
  ('tier-custom-1',   'module-staff-scheduling'),
  ('tier-custom-1',   'module-customer-management'),
  ('tier-custom-1',   'module-financial-reporting'),
  ('tier-custom-1',   'module-communication'),
  ('tier-custom-1',   'module-grooming-management'),
  ('tier-custom-1',   'module-inventory-management')
on conflict do nothing;

-- ── A subscription must name a plan that exists ───────────────────────────
--
-- facility_subscriptions.tier_id has been free text since it was created. All
-- three live rows say tier-beginner, which is now a real row, so the reference
-- can be made real without touching any data.

alter table public.facility_subscriptions
  drop constraint if exists facility_subscriptions_tier_id_fkey;

alter table public.facility_subscriptions
  add constraint facility_subscriptions_tier_id_fkey
  foreign key (tier_id) references public.subscription_tiers (id) on delete restrict;
