-- ============================================================================
-- Three more numbers on gift_card_totals, for the overview tiles.
--
-- ── WHY THEY ARE NOT THE ONES ALREADY THERE ───────────────────────────────
--
-- The gift-cards overview has its own date range, and its comment is explicit
-- that two of its tiles are PERIOD-scoped: "Liability & Revenue Sold are
-- period-scoped (cards sold in range)". That is a different question from the
-- Reports tab's liability, which is point in time — what the facility owes
-- today, on every card, whenever it was sold.
--
-- Both are legitimate and they are not interchangeable, so rather than quietly
-- repoint a tile at the total that already existed:
--
--   sales.outstanding  balance still held by cards ISSUED in the window
--   sales.active       how many of those cards are still active
--   faceValue          sum of initial_amount over EVERY card, ever
--
-- `faceValue` is the "Total issued: N cards / $X face value" line under the
-- status breakdown, which is all-time and therefore answers to no window.
--
-- ── WHY THIS IS A PLAIN REPLACE ───────────────────────────────────────────
--
-- The return is jsonb, so adding keys needs no drop, no grant restatement and
-- no coordination with the callers that do not read them yet. That was the
-- reason for jsonb over OUT parameters the day this function was written, and
-- this migration is the first time it paid.
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
      select coalesce(jsonb_object_agg(s.status, s.n), '{}'::jsonb)
      from (select c.status, count(*) as n from cards c group by c.status) s
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

-- `create or replace` keeps the existing grants, but they are read back anyway:
-- a privilege that quietly went missing looks exactly like one that is present
-- until a caller is refused in production.
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
