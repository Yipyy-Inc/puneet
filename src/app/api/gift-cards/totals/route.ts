import { NextResponse, type NextRequest } from "next/server";

import { activeFacilityIdForStaff } from "@/lib/api/facility-context";
import { getViewer } from "@/lib/auth/viewer";
import { createServerClient } from "@/lib/supabase/server";

// ============================================================================
// The gift-card numbers: liability, sales, redemptions.
//
// `public.gift_card_totals` (gift_card_totals_come_from_the_database_not_the_
// browser), aggregated in SQL. They were added up in the browser over every
// card the facility had ever issued, with every ledger entry attached — 6,022
// cards and 3.46 MB on the e2e facility, and 24.3 s for the screen to settle.
//
// ── THE FACILITY IS THE SESSION'S ─────────────────────────────────────────
//
// `activeFacilityIdForStaff()`, never the request: for a platform admin or
// somebody in two facilities, RLS admits them all and a merged total is a
// number belonging to nobody. The function is security invoker on top of that,
// so a caller without financial_manage_gift_cards aggregates zero rows.
// ============================================================================

export const dynamic = "force-dynamic";

/** One month of gift-card sales, as the Reports tab's bar chart reads it. */
export interface GiftCardSalesMonth {
  /** `YYYY-MM`, so it sorts as a string and carries no zone. */
  month: string;
  value: number;
}

/**
 * Redemptions filed under the service of the BOOKING they paid for.
 *
 * `service` is `unattributed` when the redemption has no booking behind it — a
 * counter drain, a manual adjustment. Deliberately its own bucket rather than
 * spread across the services: the screen used to assign one by hashing the
 * card's uuid, which is how a facility came to read a five-way split of money
 * nobody had attributed to anything.
 */
export interface GiftCardRedemptionService {
  service: string;
  value: number;
}

export interface GiftCardTotals {
  /** Money the facility still owes: ACTIVE cards holding a balance. */
  liability: { count: number; total: number };
  /** Every card the facility has issued, ever — including the voided ones. */
  cardCount: number;
  /** Face value of every card ever issued. Answers to no window. */
  faceValue: number;
  /**
   * Per status: how many cards, and how much is still on them.
   *
   * The balance matters as much as the count — on the e2e facility $31,990
   * sits on VOIDED cards, money nobody can spend, which is exactly what a
   * breakdown exists to surface.
   */
  byStatus: Record<string, { count: number; balance: number }>;
  /** Cards ISSUED inside the sales window. */
  sales: {
    count: number;
    value: number;
    physical: number;
    digital: number;
    /** How many of those are still active. */
    active: number;
    /**
     * What is still held on the cards sold in this window.
     *
     * NOT `liability` above, and the difference is why both exist: that one is
     * what the facility owes today on every card ever sold, this one is scoped
     * to the period the overview's picker names. A tile using the wrong one
     * reads perfectly plausibly and is wrong.
     */
    outstanding: number;
  };
  salesByMonth: GiftCardSalesMonth[];
  /** Movements that took money OFF, inside the redemption window. */
  redemptions: { count: number; total: number };
  redemptionsByService: GiftCardRedemptionService[];
}

const ZERO: GiftCardTotals = {
  liability: { count: 0, total: 0 },
  cardCount: 0,
  faceValue: 0,
  byStatus: {},
  sales: {
    count: 0,
    value: 0,
    physical: 0,
    digital: 0,
    active: 0,
    outstanding: 0,
  },
  salesByMonth: [],
  redemptions: { count: 0, total: 0 },
  redemptionsByService: [],
};

/** A day the caller named, or null. Anything malformed is dropped, not guessed. */
function day(value: string | null): string | null {
  return value && /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? `${value}T00:00:00Z`
    : null;
}

/**
 * The database returns `numeric`, which PostgREST serialises as a STRING to
 * keep the precision it was stored with. Every consumer here is a displayed
 * dollar amount, so it becomes a number once, in one place — rather than each
 * tile discovering on its own that `"59.00" + 0` is `"59.000"`.
 */
function money(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function count(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? Math.trunc(n) : 0;
}

export async function GET(request: NextRequest) {
  const viewer = await getViewer().catch(() => null);
  if (!viewer || viewer.source !== "session") {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const scope = await activeFacilityIdForStaff();
  // Zeroes rather than a 404: somebody with no facility on screen has no
  // gift-card numbers, and that is a fact rather than a failure.
  if (!scope) return NextResponse.json(ZERO);

  const search = new URL(request.url).searchParams;
  const supabase = await createServerClient();

  const { data, error } = await supabase.rpc(
    "gift_card_totals" as never,
    {
      p_facility_id: scope,
      p_sales_from: day(search.get("salesFrom")),
      p_sales_to: day(search.get("salesTo")),
      p_redeem_from: day(search.get("redeemFrom")),
      p_redeem_to: day(search.get("redeemTo")),
    } as never,
  );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const row = (data ?? {}) as {
    liability?: { count?: unknown; total?: unknown };
    cardCount?: unknown;
    faceValue?: unknown;
    byStatus?: Record<string, { count?: unknown; balance?: unknown }>;
    sales?: {
      count?: unknown;
      value?: unknown;
      physical?: unknown;
      digital?: unknown;
      active?: unknown;
      outstanding?: unknown;
    };
    salesByMonth?: { month?: unknown; value?: unknown }[];
    redemptions?: { count?: unknown; total?: unknown };
    redemptionsByService?: { service?: unknown; value?: unknown }[];
  };

  return NextResponse.json({
    liability: {
      count: count(row.liability?.count),
      total: money(row.liability?.total),
    },
    cardCount: count(row.cardCount),
    faceValue: money(row.faceValue),
    byStatus: Object.fromEntries(
      Object.entries(row.byStatus ?? {}).map(([status, v]) => [
        status,
        { count: count(v?.count), balance: money(v?.balance) },
      ]),
    ),
    sales: {
      count: count(row.sales?.count),
      value: money(row.sales?.value),
      physical: count(row.sales?.physical),
      digital: count(row.sales?.digital),
      active: count(row.sales?.active),
      outstanding: money(row.sales?.outstanding),
    },
    salesByMonth: (row.salesByMonth ?? []).map((m) => ({
      month: String(m.month ?? ""),
      value: money(m.value),
    })),
    redemptions: {
      count: count(row.redemptions?.count),
      total: money(row.redemptions?.total),
    },
    redemptionsByService: (row.redemptionsByService ?? []).map((s) => ({
      service: String(s.service ?? "unattributed"),
      value: money(s.value),
    })),
  } satisfies GiftCardTotals);
}
