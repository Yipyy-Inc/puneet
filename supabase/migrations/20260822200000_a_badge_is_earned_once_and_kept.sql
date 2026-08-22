-- ============================================================================
-- A badge is earned once, and kept.
--
-- ── WHAT WAS MISSING ──────────────────────────────────────────────────────
--
-- Badge DEFINITIONS became real on 2026-08-21 with the rest of the programme:
-- a facility writes them in the Badges wizard and they live in
-- `facility_settings.loyalty_config`. Nothing has ever AWARDED one.
--
-- The earned records were `src/data/loyalty-badges.ts` — eleven hand-authored
-- rows for `facilityId: 1`, plus an in-memory `push()` from the fixture engine
-- that no server ever ran. A customer could complete fifty bookings against a
-- "Complete 10 bookings" badge and never earn it; the badge gallery in their
-- portal showed somebody else's eleven rows.
--
-- ── ONCE, AND THE DATABASE IS WHAT SAYS SO ────────────────────────────────
--
-- `loyalty_badge_awards_once` is the whole guarantee. A checkout is retried —
-- a missed toast, a refresh, two members of staff closing the same booking —
-- and the evaluation that decides whether a badge is newly unlocked reads the
-- earned set and then writes. Between those two lines is exactly where the
-- second caller arrives, and a badge that awarded twice would issue its reward
-- twice. The unique index makes that unrepresentable rather than unlikely.
--
-- ── AND THE REWARD MOVES WITH IT ──────────────────────────────────────────
--
-- `award_loyalty_badge` issues the reward and records the badge in ONE
-- transaction. Doing it in two statements from the application would leave two
-- ways to be wrong: a reward issued to somebody the table does not say earned
-- it, or a badge recorded with nothing given for it. Here the unique violation
-- rolls the reward back with it.
--
-- ── APPEND-ONLY, WITHOUT THE TRIGGER THAT WOULD BREAK IT ──────────────────
--
-- No UPDATE policy and no DELETE policy, so PostgREST refuses both from every
-- caller. Deliberately NOT an update-refusing trigger: `voucher_id` is
-- `on delete set null`, and that action is an UPDATE run by the system. A
-- trigger would refuse it and make a voucher undeletable — the same trap the
-- ledger's DELETE trigger set before it was removed, arriving from the other
-- direction. The absence of a policy is the enforcement; a trigger here would
-- be enforcement plus a bug.
-- ============================================================================

create table if not exists public.loyalty_badge_awards (
  id           uuid primary key default gen_random_uuid(),
  facility_id  uuid not null
                 references public.facilities(id) on delete cascade,
  account_id   uuid not null
                 references public.loyalty_accounts(id) on delete cascade,
  -- A `Badge.id` from the facility's own `loyalty_config`. Text, not a foreign
  -- key, for the same reason `current_tier_id` is: the badges live in a
  -- settings document, and a constraint against a jsonb array is not one
  -- Postgres can keep.
  --
  -- Which means a badge can be DELETED from the programme while awards for it
  -- remain. That is correct: somebody earned it, and a facility retiring a
  -- badge does not un-earn it. The screens look the id up and skip what they
  -- cannot name, so a retired badge stops being advertised without rewriting
  -- anybody's history.
  badge_id     text not null,
  earned_at    timestamptz not null default now(),
  -- What was given for it. Both empty is a real state — see the function.
  voucher_id   uuid references public.loyalty_vouchers(id) on delete set null,
  points_awarded integer not null default 0 check (points_awarded >= 0),
  constraint loyalty_badge_awards_once unique (account_id, badge_id)
);

create index if not exists loyalty_badge_awards_facility_idx
  on public.loyalty_badge_awards (facility_id, badge_id);
create index if not exists loyalty_badge_awards_account_idx
  on public.loyalty_badge_awards (account_id);

comment on table public.loyalty_badge_awards is
  'One row per (loyalty account, badge), created the first time the account meets the badge''s condition. Append-only against applications: no UPDATE or DELETE policy exists. Award through award_loyalty_badge(), which issues the reward in the same transaction.';

-- ── ROW-LEVEL SECURITY ────────────────────────────────────────────────────
--
-- The same shape the ledger already has: staff with `marketing_view`, or the
-- customer whose account it is. Writing is a loyalty action.
alter table public.loyalty_badge_awards enable row level security;

drop policy if exists loyalty_badge_awards_read on public.loyalty_badge_awards;
create policy loyalty_badge_awards_read on public.loyalty_badge_awards
  for select using (
    private.is_platform_admin()
    or account_id in (
      select a.id from public.loyalty_accounts a
       where a.client_id in (select private.own_client_ids())
    )
    or private.has_permission(facility_id, 'marketing_view')
  );

drop policy if exists loyalty_badge_awards_insert on public.loyalty_badge_awards;
create policy loyalty_badge_awards_insert on public.loyalty_badge_awards
  for insert with check (
    private.has_permission(facility_id, 'marketing_manage_loyalty')
  );

-- ── AWARDING ONE ──────────────────────────────────────────────────────────
--
-- The badge and its reward, together or not at all.
--
-- The CALLER decides that the condition is met — the criteria are a jsonb
-- document interpreted by `badgeCriteriaMet`, seven condition types against
-- three dimensions and a tier ladder, and restating that in plpgsql would be a
-- second implementation of the rules that eventually disagrees with the first.
-- What is guaranteed HERE is the part application code cannot guarantee: that
-- it happens once, and that nothing is issued for a badge that was not
-- recorded.
create or replace function public.award_loyalty_badge(
  p_account_id   uuid,
  p_badge_id     text,
  p_description  text default null,
  -- Null means the badge carries no reward, or carries one this platform
  -- cannot issue. See the note below.
  p_reward_type  text default null,
  p_reward_value numeric default null,
  p_applies_to   text[] default null,
  -- A points reward is not a voucher — points ARE the thing — so it posts a
  -- positive ledger entry instead.
  p_points       integer default 0
)
returns public.loyalty_badge_awards
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_facility uuid;
  v_voucher  public.loyalty_vouchers;
  v_award    public.loyalty_badge_awards;
begin
  select a.facility_id into v_facility
    from public.loyalty_accounts a
   where a.id = p_account_id;

  if v_facility is null then
    raise exception 'That loyalty account does not exist.' using errcode = 'P0002';
  end if;

  if not private.has_permission(v_facility, 'marketing_manage_loyalty') then
    raise exception 'You do not have permission to award a loyalty badge.'
      using errcode = '42501';
  end if;

  if p_points < 0 then
    raise exception 'A badge cannot award negative points.' using errcode = '22023';
  end if;

  -- ── THE REWARD ────────────────────────────────────────────────────────
  --
  -- A badge may award points, or a voucher, or nothing. "Nothing" is a real
  -- configuration — a badge can be recognition on its own — and it is also
  -- what a GIFT CARD badge reward comes to today: the badges wizard offers
  -- one, and there is no gift-card table in this database at all. Recording
  -- the badge and issuing nothing is the honest outcome; inventing account
  -- credit of the same value would quietly change what the facility chose.
  if p_points > 0 then
    insert into public.loyalty_transactions
      (facility_id, account_id, kind, points, description, source)
    values
      (v_facility, p_account_id, 'earned', p_points,
       coalesce(p_description, 'Badge earned'), 'manual');
  elsif p_reward_type is not null then
    -- Through the existing function, so there is ONE implementation of
    -- "issue a voucher" and a badge reward cannot drift from a tier one.
    -- Zero points: a badge is given, not bought.
    v_voucher := public.redeem_loyalty_points(
      p_account_id,
      p_reward_type,
      p_reward_value,
      0,
      null,
      p_applies_to,
      coalesce(p_description, 'Badge earned')
    );
  end if;

  -- LAST, so its unique violation takes the reward with it. A second caller
  -- arriving mid-evaluation gets 23505 and leaves nothing behind.
  insert into public.loyalty_badge_awards
    (facility_id, account_id, badge_id, voucher_id, points_awarded)
  values
    (v_facility, p_account_id, p_badge_id, v_voucher.id, greatest(p_points, 0))
  returning * into v_award;

  return v_award;
end;
$$;

comment on function public.award_loyalty_badge(uuid, text, text, text, numeric, text[], integer) is
  'Record a badge as earned and issue its reward in one transaction. Raises 23505 when the account already holds it, which rolls the reward back — so a retried checkout cannot award twice.';

revoke all on function public.award_loyalty_badge(uuid, text, text, text, numeric, text[], integer) from public;
grant execute on function public.award_loyalty_badge(uuid, text, text, text, numeric, text[], integer)
  to authenticated, service_role;
