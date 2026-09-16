-- ============================================================================
-- The gift-card numbers, answered by the database.
--
-- ── WHY ───────────────────────────────────────────────────────────────────
--
-- The gift-cards screen read EVERY card with EVERY ledger entry attached and
-- did all of its arithmetic in the browser. Measured 2026-09-16 on the e2e
-- facility: 6,022 cards, 3.46 MB, 6.2 s for the list alone and 24.3 s for the
-- screen to settle — past the 15 s a spec allows, so three specs failed.
--
-- Cards are never deleted. There is no DELETE policy on `gift_cards` and that
-- is deliberate: a gift card is a bearer instrument, so it is voided, not
-- erased. 6,019 of those 6,022 are `cancelled` and still rows. The table only
-- grows, at every facility, forever — so downloading all of it to add numbers
-- up has no ceiling, and the e2e facility merely reached it first.
--
-- ── REDEMPTIONS BY SERVICE ARE REAL NOW ───────────────────────────────────
--
-- The Reports tab drew a "redemptions by service category" chart from this:
--
--   const categoryFor = (id: string) => {
--     let h = 0;
--     for (const ch of id) h = (h + ch.charCodeAt(0)) % SERVICE_CATEGORIES.length;
--     return SERVICE_CATEGORIES[h];        -- ← a CHECKSUM OF THE CARD'S UUID
--   };
--
-- Every dollar was filed under Grooming, Boarding, Daycare, Retail or Training
-- by a hash of the card id. A facility owner reading that chart was reading
-- their own gift-card revenue split by nothing at all.
--
-- The real answer is one join away: a redemption that paid for a booking
-- carries `booking_id`, and the booking knows its service. A redemption with
-- no booking — a counter drain, a manual adjustment — is reported as
-- 'unattributed' rather than assigned to a service that did not earn it.
-- MEASURED on the e2e facility the day this landed: $196,810 unattributed and
-- $2,060 daycare, where the hash would have drawn five confident slices.
--
-- ── SECURITY INVOKER, ON PURPOSE ──────────────────────────────────────────
--
-- No DEFINER. `gift_cards_read` already requires financial_manage_gift_cards
-- (or owning the card, or platform admin), so running as the caller means the
-- totals can only ever cover rows that caller could have read one by one.
-- A caller without the permission aggregates zero rows and gets zeroes, which
-- is the same answer they would assemble by hand.
--
-- ── jsonb, NOT OUT PARAMETERS ─────────────────────────────────────────────
--
-- Postgres refuses to change a function's OUT-parameter row type, so adding a
-- number later would need a drop-and-recreate and a restatement of every grant
-- — which is exactly what my_store_credit needed on 2026-09-16. One jsonb
-- return has no such seam.
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
        'digital',  count(*) filter (where s.kind is distinct from 'physical')
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

comment on function public.gift_card_totals(uuid, timestamptz, timestamptz, timestamptz, timestamptz)
  is 'Gift-card liability, sales and redemptions for one facility, aggregated in SQL rather than by downloading every card. Security invoker: gift_cards RLS decides what it can see.';

-- A signed-in member, and nobody else. `public` and `anon` are DIFFERENT
-- grants and both have to go — see 20260822610000, which exists only because
-- one attempt named a single one of them.
revoke all on function public.gift_card_totals(uuid, timestamptz, timestamptz, timestamptz, timestamptz) from public;
revoke all on function public.gift_card_totals(uuid, timestamptz, timestamptz, timestamptz, timestamptz) from anon;
grant execute on function public.gift_card_totals(uuid, timestamptz, timestamptz, timestamptz, timestamptz) to authenticated;

-- A revoke naming a privilege the role does not hold SUCCEEDS silently and
-- looks identical to one that worked, so it is read back rather than trusted.
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
