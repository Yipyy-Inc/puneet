import { NextResponse, type NextRequest } from "next/server";

import { getFacilityContext } from "@/lib/api/facility-context";
import { getViewer } from "@/lib/auth/viewer";
import { createServerClient } from "@/lib/supabase/server";

// ============================================================================
// Rewards a customer holds, and spending one.
//
// ── THE ONE THAT REACHES A CARD ───────────────────────────────────────────
//
// A discount voucher is subtracted from what the checkout charges — the tax and
// the Clover total are computed from the reduced figure. So "has this already
// been spent?" is a question about money, and the answer has to come from
// somewhere two people cannot both get "no" from at once.
//
// It does. `POST /consume` calls `consume_loyalty_voucher`, whose UPDATE
// matches only a row that is still `active` and not past expiry. Two checkouts
// racing for the same voucher both reach it; exactly one changes a row and the
// other is told the reward is spent.
//
// What it replaces mutated an in-memory array, so a refresh brought the voucher
// back and it could be applied to bill after bill.
//
// ── ISSUING GOES THROUGH THE FUNCTION TOO ─────────────────────────────────
//
// `redeem_loyalty_points` posts the negative ledger entry and creates the
// voucher in one transaction. Doing it in two calls from here would leave the
// pair able to half-happen: points taken and no reward, or a reward nobody paid
// for. The ledger entry goes first on purpose, so an account that cannot afford
// the reward is refused before any voucher exists.
// ============================================================================

export const dynamic = "force-dynamic";

const REWARD_TYPES = [
  "discount_pct",
  "discount_fixed",
  "free_service",
  "credit_balance",
] as const;

type RewardType = (typeof REWARD_TYPES)[number];

export interface LoyaltyVoucherRow {
  id: string;
  accountId: string;
  rewardType: RewardType;
  /** A percentage for `discount_pct` (10 = 10%), an amount for the rest. */
  rewardValue: number;
  status: "active" | "used" | "expired" | "cancelled";
  /** Null means every service. */
  appliesToServices: string[] | null;
  pointsSpent: number;
  issuedAt: string;
  expiresAt: string | null;
  usedAt: string | null;
  usedOnBookingId: string | null;
}

interface Row {
  id: string;
  account_id: string;
  reward_type: RewardType;
  reward_value: string | number;
  status: LoyaltyVoucherRow["status"];
  applies_to_services: string[] | null;
  points_spent: number;
  issued_at: string;
  expires_at: string | null;
  used_at: string | null;
  used_on_booking_id: string | null;
}

const SELECT =
  "id, account_id, reward_type, reward_value, status, applies_to_services, " +
  "points_spent, issued_at, expires_at, used_at, used_on_booking_id";

function toRow(row: Row): LoyaltyVoucherRow {
  return {
    id: row.id,
    accountId: row.account_id,
    rewardType: row.reward_type,
    rewardValue: Number(row.reward_value),
    status: row.status,
    appliesToServices: row.applies_to_services,
    pointsSpent: row.points_spent,
    issuedAt: row.issued_at,
    expiresAt: row.expires_at,
    usedAt: row.used_at,
    usedOnBookingId: row.used_on_booking_id,
  };
}

export async function GET(request: NextRequest) {
  const viewer = await getViewer().catch(() => null);
  if (!viewer || viewer.source !== "session") {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const context = await getFacilityContext();
  if (!context) {
    return NextResponse.json({ error: "No facility." }, { status: 404 });
  }

  const params = new URL(request.url).searchParams;
  const supabase = await createServerClient();

  let query = supabase
    .from("loyalty_vouchers")
    .select(SELECT)
    .eq("facility_id", context.facilityId)
    .order("issued_at", { ascending: false })
    .limit(500);

  const account = params.get("account");
  if (account) query = query.eq("account_id", account);

  // `?spendable=1` is what a checkout asks: active, and not past its expiry.
  // Expiry is compared HERE rather than filtered in the browser, because a
  // browser clock is not evidence about whether a discount is still valid.
  if (params.get("spendable") === "1") {
    query = query
      .eq("status", "active")
      .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`);
  }

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({
    vouchers: ((data ?? []) as unknown as Row[]).map(toRow),
  });
}

/** Spend points on a reward. Ledger entry and voucher, together or neither. */
export async function POST(request: NextRequest) {
  const viewer = await getViewer().catch(() => null);
  if (!viewer || viewer.source !== "session") {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const context = await getFacilityContext();
  if (!context) {
    return NextResponse.json({ error: "No facility." }, { status: 404 });
  }

  const body = (await request.json().catch(() => null)) as {
    accountId?: string;
    rewardType?: string;
    rewardValue?: number;
    points?: number;
    expiresAt?: string;
    appliesToServices?: string[];
    description?: string;
  } | null;

  if (!body?.accountId) {
    return NextResponse.json(
      { error: "`accountId` is required." },
      {
        status: 400,
      },
    );
  }

  const rewardType = body.rewardType as RewardType;
  if (!REWARD_TYPES.includes(rewardType)) {
    return NextResponse.json(
      { error: `Unknown reward type '${body.rewardType}'.` },
      { status: 400 },
    );
  }
  if (typeof body.rewardValue !== "number" || body.rewardValue <= 0) {
    return NextResponse.json(
      { error: "`rewardValue` must be a positive number." },
      { status: 400 },
    );
  }
  const points = body.points;
  if (!Number.isInteger(points) || points === undefined || points < 0) {
    return NextResponse.json(
      { error: "`points` must be a whole number, and cannot be negative." },
      { status: 400 },
    );
  }

  const supabase = await createServerClient();

  const { data, error } = await supabase.rpc("redeem_loyalty_points", {
    p_account_id: body.accountId,
    p_reward_type: rewardType,
    p_reward_value: body.rewardValue,
    p_points: points,
    // `undefined` rather than `null`: these are DEFAULT parameters on the
    // function, and PostgREST omits an undefined key so the default applies.
    p_expires_at: body.expiresAt ?? undefined,
    p_applies_to: body.appliesToServices ?? undefined,
    p_description: body.description ?? undefined,
  });

  if (error) {
    const denied = error.message.includes("permission");
    return NextResponse.json(
      { error: error.message },
      { status: denied ? 403 : 400 },
    );
  }

  return NextResponse.json(
    { voucher: toRow(data as unknown as Row) },
    { status: 201 },
  );
}
