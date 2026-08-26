-- ============================================================================
-- HQ Clients — a client's location is wherever their bookings happened.
--
-- `clients` has no location column, and does not need one: the HQ screen's own
-- mock data already modelled a client visiting SEVERAL branches with separate
-- per-branch visit/spend, which is a derived fact from `bookings.location_id`,
-- not a static attribute a column could hold. Same join `customer-value`
-- already uses in `facility_report_dataset` (bookings left join payments,
-- cancelled excluded), grouped once more by `location_id` for the nested
-- breakdown.
--
-- A SEPARATE function from `facility_report_dataset`, not a seventh branch on
-- it: that RPC's whole shape is a `from`/`to` window, and this screen has no
-- period picker -- every figure here (`firstVisitedAt`, `lastVisitedAt`,
-- `totalSpend`) is lifetime, by design.
--
-- Loyalty tier rides along for free: `loyalty_accounts.current_tier_id` is a
-- real column, settled by `settleTier` after real earn events (see
-- src/lib/api/loyalty-tier.ts) -- not decorative. The tier's display name and
-- colour are resolved client-side from the facility's own configured tiers,
-- because a facility names its own tiers and there is no fixed four here.
-- ============================================================================

create or replace function public.hq_client_network_value(p_facility_id uuid)
returns jsonb
language sql
security invoker
set search_path = ''
as $fn$
  select coalesce(jsonb_agg(row_to_json(x) order by x."totalSpend" desc), '[]'::jsonb)
    from (
      select
        c.ref as "clientId",
        c.name as "clientName",
        coalesce((
          select jsonb_agg(pt.name order by pt.name)
            from public.pets pt
           where pt.client_id = c.id
        ), '[]'::jsonb) as "petNames",
        coalesce(sum(p.grand_total) filter (where p.grand_total > 0), 0) as "totalSpend",
        count(distinct b.id) as "totalVisits",
        min(b.start_at) as "firstVisitedAt",
        max(b.start_at) as "lastVisitedAt",
        la.current_tier_id as "loyaltyTierId",
        coalesce((
          select jsonb_agg(jsonb_build_object(
                   'locationId', v.location_id,
                   'visits', v.visits,
                   'spend', v.spend
                 ) order by v.visits desc)
            from (
              select b2.location_id,
                     count(*) as visits,
                     coalesce(sum(p2.grand_total) filter (where p2.grand_total > 0), 0) as spend
                from public.bookings b2
                left join public.payments p2 on p2.booking_id = b2.id
               where b2.client_id = c.id
                 and b2.status <> 'cancelled'
                 and b2.location_id is not null
               group by b2.location_id
            ) v
        ), '[]'::jsonb) as "locationsVisited"
        from public.clients c
        join public.bookings b on b.client_id = c.id and b.status <> 'cancelled'
        left join public.payments p on p.booking_id = b.id
        left join public.loyalty_accounts la on la.client_id = c.id
       where c.facility_id = p_facility_id
       group by c.id, c.ref, c.name, la.current_tier_id
    ) x
$fn$;

comment on function public.hq_client_network_value(uuid) is
  'Lifetime spend/visits per client, broken down per location they have booked at. security invoker: RLS decides what is visible. No time window -- every HQ Clients figure is lifetime.';

revoke all on function public.hq_client_network_value(uuid) from public, anon;
grant execute on function public.hq_client_network_value(uuid) to authenticated, service_role;
