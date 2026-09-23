-- ============================================================================
-- A line on a bill can say whether it is taxed.
--
-- ── WHY ───────────────────────────────────────────────────────────────────
--
-- `taxableFraction` has one rule today: "Whether the SERVICE is taxed. Extras
-- always are." That was right when every extra was a treat, a medication fee
-- or a bag of food — supplies of their own, taxed like anything else sold over
-- a counter.
--
-- A service charge broke it. MoéGo lets a facility configure tax per fee, and
-- there are real fees that are not a supply: a late-payment charge, an
-- administrative penalty, a no-show fee in a jurisdiction that treats it as
-- liquidated damages rather than a sale. "Extras always are" cannot express
-- any of them, and the facility's only recourse was to fold the fee into the
-- service price, which is the very thing 20260806820000 Decision 3 exists to
-- stop.
--
-- ── DEFAULT TRUE, AND THAT IS NOT A COIN TOSS ─────────────────────────────
--
-- `service-tax.ts` states the asymmetry it is built around: charging tax that
-- was not owed is a refund, while NOT charging tax that was owed is the
-- facility's own money, paid to the government out of pocket and discovered at
-- year end. So the column defaults to true and every row that exists becomes
-- taxable — which is exactly what the code already assumed about all of them.
-- Nothing changes for any bill written before today.
--
-- ── A SECOND DERIVED TOTAL, MAINTAINED THE SAME WAY ───────────────────────
--
-- `bookings.extras_total` is derived by `private.derive_booking_extras()` and
-- carries a comment saying never to write it. The taxable share has to be
-- derived identically or the two drift, and a drifting pair is worse than one
-- number: `amount_due` is GENERATED from `extras_total`, so a hand-written
-- taxable total would disagree with the money it is a share of.
--
-- Deliberately NOT a generated column: a stored generated column cannot read
-- another table, which is why `extras_total` is a trigger in the first place.
-- ============================================================================

-- ── The flag ──────────────────────────────────────────────────────────────

alter table public.booking_line_items
  add column if not exists taxable boolean not null default true;

comment on column public.booking_line_items.taxable is
  'Whether this line is subject to the facility tax. TRUE for everything that existed before 20260923200000, which is what taxableFraction already assumed. A fee sets it from custom_fee.taxable.';

-- ── The derived share ─────────────────────────────────────────────────────

alter table public.bookings
  add column if not exists taxable_extras_total numeric(10,2) not null default 0;

comment on column public.bookings.taxable_extras_total is
  'DERIVED from public.booking_line_items, like extras_total. The part of extras_total that tax applies to. Never write it: private.derive_booking_extras() overwrites any value on every insert and update.';

create or replace function private.booking_taxable_extras_total(p_booking_id uuid)
returns numeric
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(sum(li.price), 0)::numeric(10,2)
    from public.booking_line_items li
   where li.booking_id = p_booking_id
     and li.taxable;
$$;

revoke execute on function private.booking_taxable_extras_total(uuid) from public;
revoke execute on function private.booking_taxable_extras_total(uuid) from anon;
revoke execute on function private.booking_taxable_extras_total(uuid) from authenticated;

-- ── Both totals move together ─────────────────────────────────────────────
--
-- Rewritten rather than added beside, so there is ONE trigger function
-- deciding both numbers. Two functions on the same table would leave the order
-- to the name, and the pair would eventually be derived from different reads.

create or replace function private.derive_booking_extras()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.extras_total := private.booking_extras_total(new.id);
  new.taxable_extras_total := private.booking_taxable_extras_total(new.id);
  return new;
end;
$$;

-- ── Backfill ──────────────────────────────────────────────────────────────
--
-- Every existing line is taxable by the column default, so this is simply
-- `extras_total` for every booking that has any. Written as a direct update
-- rather than by touching the rows: the trigger fires on UPDATE, but making
-- 2,000 bookings pass through the whole derived-payment chain to copy one
-- number is a lot of work to reach an answer already known.
update public.bookings b
   set taxable_extras_total = b.extras_total
 where b.extras_total <> 0
   and b.taxable_extras_total = 0;
