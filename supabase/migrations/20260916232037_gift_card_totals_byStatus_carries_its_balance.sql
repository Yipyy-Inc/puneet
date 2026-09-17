-- ============================================================================
-- byStatus carries a balance as well as a count.
--
-- The overview's status breakdown draws a row per status with BOTH — "Active
-- 3 · $75.00", "Voided 6,019 · $31,990.00" — and the first cut of this
-- function returned counts only. The balance on the voided ones is not a
-- rounding detail either: on the e2e facility it is $31,990 sitting on cards
-- nobody can spend, which is exactly the number a breakdown exists to show.
--
-- ── THE LESSON, WHICH COST TWO MIGRATIONS ─────────────────────────────────
--
-- This is the third `create or replace` of this function in one sitting, and
-- all three were adding a number some tile on the screen already displayed.
-- Reading ONE consumer and designing for it, then finding the next, is how a
-- shape gets built in instalments. The audit — every use of the card list on
-- the page, not just the tab in front of me — should have come before the
-- first migration, not between the second and the third.
--
-- Cheap to fix precisely BECAUSE the return is jsonb: no drop, no grants
-- restated, no callers to coordinate. An OUT-parameter signature would have
-- made each of these a drop-and-recreate.
--
-- ── THE SHAPE CHANGES, AND THAT IS DELIBERATE ─────────────────────────────
--
-- `byStatus` was `{"active": 3}` and is now `{"active": {"count": 3,
-- "balance": 75.00}}`. Not an added key beside it: two spellings of the same
-- fact is how one of them goes stale. Its only reader is the route, which is
-- updated in the same change.
-- ============================================================================

create or replace function public.gift_card_totals(
  p_facility_id uuid,
  p_sales_from timestamptz default null,
  p_sales_to timestamptz default null,
  p_redeem_from timestamptz default null,
  p_redeem_to timestamptz default null
)
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $fn$
  with cards as (
    select g.id, g.status, g.kind, g.balance, g.initial_amount, g.issued_at
    from public.gift_cards g
    where g.facility_id = p_facility_id
  ),
  sold as (
    select c.*
    from cards c
    where (p_sales_from is null or c.issued_at >= p_sales_from)
      and (p_sales_to  is null or c.issued_at <  p_sales_to)
  ),
  -- What the screen counts as a redemption, matched exactly: every `redeemed`
  -- entry, plus an `adjusted` one that took money OFF. to-legacy-card.ts makes
  -- the same call, and a total that disagreed with the rows under it would be
  -- the whole defect again in a new place.
  redeemed as (
    select abs(t.amount) as amount, b.service
    from public.gift_card_transactions t
    left join public.bookings b on b.id = t.booking_id
    where t.facility_id = p_facility_id
      and (t.kind = 'redeemed' or (t.kind = 'adjusted' and t.amount < 0))
      and (p_redeem_from is null or t.created_at >= p_redeem_from)
      and (p_redeem_to   is null or t.created_at <  p_redeem_to)
  )
  select jsonb_build_object(
    -- Point in time, never date-ranged: money owed is owed today.
    'liability', (
      select jsonb_build_object(
        'count', count(*),
        'total', coalesce(sum(c.balance), 0)
      )
      from cards c
      where c.status = 'active' and c.balance > 0
    ),
    'cardCount', (select count(*) from cards),
    -- All-time face value: what the facility has ever sold, at issue price.
    'faceValue', (select coalesce(sum(c.initial_amount), 0) from cards c),
    'byStatus', (
      select coalesce(
        jsonb_object_agg(s.status,
          jsonb_build_object('count', s.n, 'balance', s.balance)),
        '{}'::jsonb)
      from (
        select c.status, count(*) as n, coalesce(sum(c.balance), 0) as balance
        from cards c
        group by c.status
      ) s
    ),
    'sales', (
      select jsonb_build_object(
        'count', count(*),
        'value', coalesce(sum(s.initial_amount), 0),
        -- `kind` is 'physical' or 'online'; anything not physical is digital,
        -- so a third kind added later counts as digital rather than vanishing.
        'physical', count(*) filter (where s.kind = 'physical'),
        'digital',  count(*) filter (where s.kind is distinct from 'physical'),
        -- Period-scoped, and deliberately NOT the same as `liability` above:
        -- what is still held on the cards sold in this window.
        'active', count(*) filter (where s.status = 'active'),
        'outstanding', coalesce(
          sum(s.balance) filter (where s.status = 'active'), 0)
      )
      from sold s
    ),
    'salesByMonth', (
      select coalesce(
        jsonb_agg(jsonb_build_object('month', m.month, 'value', m.value)
                  order by m.month),
        '[]'::jsonb)
      from (
        select to_char(date_trunc('month', s.issued_at), 'YYYY-MM') as month,
               sum(s.initial_amount) as value
        from sold s
        group by 1
      ) m
    ),
    'redemptions', (
      select jsonb_build_object(
        'count', count(*),
        'total', coalesce(sum(r.amount), 0)
      )
      from redeemed r
    ),
    'redemptionsByService', (
      select coalesce(
        jsonb_agg(jsonb_build_object('service', x.service, 'value', x.value)
                  order by x.value desc),
        '[]'::jsonb)
      from (
        select coalesce(r.service, 'unattributed') as service,
               sum(r.amount) as value
        from redeemed r
        group by 1
      ) x
    )
  );
$fn$;

-- The grants are read back, not assumed: a privilege that quietly went missing
-- looks exactly like one that is present until a caller is refused.
do $check$
begin
  if has_function_privilege('anon', 'public.gift_card_totals(uuid, timestamptz, timestamptz, timestamptz, timestamptz)', 'execute') then
    raise exception 'anon can still execute gift_card_totals';
  end if;
  if not has_function_privilege('authenticated', 'public.gift_card_totals(uuid, timestamptz, timestamptz, timestamptz, timestamptz)', 'execute') then
    raise exception 'authenticated cannot execute gift_card_totals';
  end if;
end
$check$;
