-- ============================================================================
-- What the members screen asks about an account.
--
-- ── WHY A VIEW AND NOT COLUMNS ────────────────────────────────────────────
--
-- `loyalty_accounts` deliberately does NOT carry `total_spend` or
-- `total_visits`: bookings already know both, and a denormalised copy of a fact
-- another table owns is the drift the points balance was designed to avoid.
--
-- But the members screen shows them, sorts by them, and the tier engine reads
-- them — so "we do not store that" cannot be the end of the sentence. They are
-- DERIVED here, at read time, from the rows that own them.
--
-- `last_activity_at` likewise: the newest ledger entry, falling back to when
-- the account itself last changed. The fixture stored it as a column somebody
-- had to remember to update.
--
-- ── security_invoker, WHICH IS THE WHOLE POINT ────────────────────────────
--
-- Without it a view runs as its OWNER and quietly becomes a hole around every
-- policy underneath — a staff member with no `marketing_view` would read every
-- account through it, and a customer would read everybody's. With it the
-- caller's own RLS applies to `loyalty_accounts`, `clients` and `bookings`
-- exactly as if they had written the joins themselves.
-- ============================================================================
create or replace view public.loyalty_account_overview
with (security_invoker = true) as
select
  a.id,
  a.facility_id,
  a.client_id,
  a.points_balance,
  a.lifetime_points_earned,
  a.lifetime_points_redeemed,
  a.credit_balance,
  a.current_tier_id,
  a.tier_joined_at,
  a.referral_code,
  a.created_at,
  a.updated_at,
  c.ref   as client_ref,
  c.name  as client_name,
  c.email as client_email,
  -- What they have actually PAID this facility, not what was quoted. A booking
  -- that was cancelled or never settled is not spend.
  coalesce(spend.total_spend, 0)::numeric(12,2) as total_spend,
  coalesce(spend.total_visits, 0)::integer      as total_visits,
  -- The newest thing that happened on the account. `updated_at` alone would
  -- move on any edit; the ledger is what says they were active.
  greatest(a.updated_at, coalesce(activity.last_at, a.created_at)) as last_activity_at
from public.loyalty_accounts a
join public.clients c
  on c.id = a.client_id
left join lateral (
  select
    sum(b.amount_paid)                  as total_spend,
    count(*) filter (where b.amount_paid > 0) as total_visits
  from public.bookings b
  where b.client_id = a.client_id
    and b.facility_id = a.facility_id
    and b.amount_paid > 0
) spend on true
left join lateral (
  select max(t.created_at) as last_at
  from public.loyalty_transactions t
  where t.account_id = a.id
) activity on true;

comment on view public.loyalty_account_overview is
  'A loyalty account with the facts the members screen asks for. total_spend and total_visits are DERIVED from bookings rather than stored — see the migration. security_invoker, so the caller''s own RLS applies.';

grant select on public.loyalty_account_overview to authenticated, service_role;
