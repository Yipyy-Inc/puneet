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
  /** The STORED status. See `effectiveStatus` before rendering it. */
  status: "active" | "used" | "expired" | "cancelled";
  /**
   * What the voucher actually IS right now.
   *
   * Nothing flips a row to `expired` — there is no scheduler here — so a
   * voucher whose `expires_at` has passed still reads `active` in the column
   * while `consume_loyalty_voucher` refuses it. Two answers to one question,
   * and the screen was showing the wrong one: an "Expired" tile that could only
   * ever read zero, next to dead rewards counted as live.
   *
   * Derived here rather than by a job, against the DATABASE's clock — the same
   * reasoning `?spendable=1` already uses. A browser clock is not evidence
   * about whether a reward is still good.
   */
  effectiveStatus: "active" | "used" | "expired" | "cancelled";
  /** Null means every service. */
  appliesToServices: string[] | null;
  pointsSpent: number;
  issuedAt: string;
  expiresAt: string | null;
  usedAt: string | null;
  usedOnBookingId: string | null;
  /** Only with `?withCustomer=1`. Null when the lookup was not asked for. */
  clientRef: number | null;
  clientName: string | null;
  /** The booking's own number, for a reference a person can act on. */
  usedOnBookingRef: number | null;
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

/** What the row is now, expiry included. See the field's own note. */
function effectiveStatusOf(
  row: Row,
  nowMs: number,
): LoyaltyVoucherRow["status"] {
  if (row.status !== "active") return row.status;
  if (row.expires_at && new Date(row.expires_at).getTime() <= nowMs) {
    return "expired";
  }
  return "active";
}

function toRow(row: Row, nowMs: number): LoyaltyVoucherRow {
  return {
    id: row.id,
    accountId: row.account_id,
    rewardType: row.reward_type,
    rewardValue: Number(row.reward_value),
    status: row.status,
    effectiveStatus: effectiveStatusOf(row, nowMs),
    appliesToServices: row.applies_to_services,
    pointsSpent: row.points_spent,
    issuedAt: row.issued_at,
    expiresAt: row.expires_at,
    usedAt: row.used_at,
    usedOnBookingId: row.used_on_booking_id,
    clientRef: null,
    clientName: null,
    usedOnBookingRef: null,
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

  const nowMs = Date.now();
  const vouchers = ((data ?? []) as unknown as Row[]).map((r) =>
    toRow(r, nowMs),
  );

  // ── WHO IT BELONGS TO, ON REQUEST ────────────────────────────────────────
  //
  // Opt-in because the CHECKOUT calls this route on every render of a booking
  // it might discount, and it needs none of this — it has the customer in
  // front of it. The redemption LOG needs a name and a booking number, because
  // "Client #14" and a uuid are not something a person can act on.
  //
  // Two follow-up queries rather than a PostgREST embed: a to-one relation
  // comes back shaped differently depending on how the join is written, and
  // reading one as an array has already emptied a board in this codebase once.
  if (params.get("withCustomer") === "1" && vouchers.length > 0) {
    const accountIds = [...new Set(vouchers.map((v) => v.accountId))];
    const bookingIds = [
      ...new Set(
        vouchers
          .map((v) => v.usedOnBookingId)
          .filter((id): id is string => id !== null),
      ),
    ];

    const [accountResult, bookingResult] = await Promise.all([
      supabase
        .from("loyalty_account_overview")
        .select("id, client_ref, client_name")
        .in("id", accountIds),
      bookingIds.length > 0
        ? supabase.from("bookings").select("id, ref").in("id", bookingIds)
        : Promise.resolve({ data: [] }),
    ]);

    const byAccount = new Map(
      (
        (accountResult.data ?? []) as {
          id: string;
          client_ref: number;
          client_name: string;
        }[]
      ).map((a) => [a.id, a]),
    );
    const bookingRefById = new Map(
      ((bookingResult.data ?? []) as { id: string; ref: number }[]).map((b) => [
        b.id,
        b.ref,
      ]),
    );

    for (const voucher of vouchers) {
      const account = byAccount.get(voucher.accountId);
      voucher.clientRef = account?.client_ref ?? null;
      voucher.clientName = account?.client_name ?? null;
      voucher.usedOnBookingRef = voucher.usedOnBookingId
        ? (bookingRefById.get(voucher.usedOnBookingId) ?? null)
        : null;
    }
  }

  return NextResponse.json({ vouchers });
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
    { voucher: toRow(data as unknown as Row, Date.now()) },
    { status: 201 },
  );
}
