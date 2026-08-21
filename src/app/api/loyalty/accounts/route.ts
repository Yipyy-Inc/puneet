import { NextResponse, type NextRequest } from "next/server";

import { getFacilityContext } from "@/lib/api/facility-context";
import { getViewer } from "@/lib/auth/viewer";
import { createServerClient } from "@/lib/supabase/server";

// ============================================================================
// Who is in the loyalty programme, and what they hold.
//
// ── THE BALANCE IS READ, NEVER SENT ───────────────────────────────────────
//
// There is no way to set `points_balance` here, and there is no way to set it
// anywhere: the column is trigger-maintained from `loyalty_transactions` and a
// second trigger refuses a hand-written change. Points move by posting to the
// ledger (`POST /api/loyalty/transactions`), which is the only route that can.
//
// That is deliberate rather than restrictive. The fixture kept a balance on the
// account AND a list of transactions, so the number and the history explaining
// it were maintained separately and were free to disagree.
//
// ── IT SPEAKS IN `ref`, NOT IN UUIDs ──────────────────────────────────────
//
// The table keys on `clients.id` (a uuid), which is right: a foreign key should
// point at the primary key. But every SCREEN in this app identifies a client by
// `clients.ref` — the small integer in the URL, on the client file, on a
// booking — and `rowToClient` does not even expose the uuid.
//
// So this route takes and returns `clientRef` and resolves it here. The
// alternative was making each screen translate, which is how two id namespaces
// end up half-mixed: the loyalty FIXTURES already had that problem, keyed by a
// `customerId` that matched nothing in Postgres.
//
// ── RLS DOES THE NARROWING ────────────────────────────────────────────────
//
// `loyalty_accounts_read` admits a staff member with `marketing_view`, or the
// CUSTOMER whose account it is (`private.own_client_ids()`). So the same route
// serves the facility's members list and a customer's own balance without
// branching on who is asking — the database already knows.
// ============================================================================

export const dynamic = "force-dynamic";

export interface LoyaltyAccountRow {
  id: string;
  /** The uuid, for anything that joins on it. */
  clientId: string;
  /** The number every screen and URL uses. */
  clientRef: number;
  clientName: string;
  clientEmail: string;
  pointsBalance: number;
  lifetimePointsEarned: number;
  lifetimePointsRedeemed: number;
  creditBalance: number;
  currentTierId: string | null;
  tierJoinedAt: string | null;
  referralCode: string | null;
  /**
   * What this customer has PAID this facility, and how many times.
   *
   * Derived from bookings at read time, never stored on the account — see the
   * view. A cancelled or unsettled booking is not spend.
   */
  totalSpend: number;
  totalVisits: number;
  /** The newest ledger entry, or when the account last changed. */
  lastActivityAt: string;
  createdAt: string;
  updatedAt: string;
}

interface AccountRow {
  id: string;
  client_id: string;
  points_balance: number;
  lifetime_points_earned: number;
  lifetime_points_redeemed: number;
  credit_balance: string | number;
  current_tier_id: string | null;
  tier_joined_at: string | null;
  referral_code: string | null;
  created_at: string;
  updated_at: string;
  client_ref: number;
  client_name: string;
  client_email: string;
  total_spend: string | number;
  total_visits: number;
  last_activity_at: string;
}

// ── READ THROUGH THE VIEW ──────────────────────────────────────────────────
//
// `loyalty_account_overview` joins the client and derives spend, visits and
// last activity from the rows that own them. It is `security_invoker`, so the
// caller's own RLS still decides which accounts come back — a customer sees
// theirs, a staff member with `marketing_view` sees the facility's.
//
// Reading the table directly with an embed would have cost a second round trip
// per screen to work out spend, and there is no way to express it in PostgREST
// at all: it needs an aggregate over bookings.
const VIEW = "loyalty_account_overview";
const SELECT = "*";

/**
 * `clients.ref` -> `clients.id`, within the caller's own facility.
 *
 * The facility filter is not decoration: without it a caller could name another
 * facility's ref and open an account against their client. RLS would refuse the
 * read anyway, which is why this returns undefined rather than throwing — the
 * two failures are the same answer to the caller.
 */
async function resolveClientRef(
  supabase: Awaited<ReturnType<typeof createServerClient>>,
  facilityId: string,
  ref: string,
): Promise<string | undefined> {
  const n = Number(ref);
  if (!Number.isFinite(n)) return undefined;
  const { data } = await supabase
    .from("clients")
    .select("id")
    .eq("facility_id", facilityId)
    .eq("ref", n)
    .maybeSingle();
  return (data as { id: string } | null)?.id ?? undefined;
}

function toRow(row: AccountRow): LoyaltyAccountRow {
  return {
    id: row.id,
    clientId: row.client_id,
    clientRef: row.client_ref,
    clientName: row.client_name,
    clientEmail: row.client_email,
    pointsBalance: row.points_balance,
    lifetimePointsEarned: row.lifetime_points_earned,
    lifetimePointsRedeemed: row.lifetime_points_redeemed,
    creditBalance: Number(row.credit_balance),
    currentTierId: row.current_tier_id,
    tierJoinedAt: row.tier_joined_at,
    referralCode: row.referral_code,
    totalSpend: Number(row.total_spend),
    totalVisits: row.total_visits,
    lastActivityAt: row.last_activity_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
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

  const supabase = await createServerClient();
  const askedRef = new URL(request.url).searchParams.get("clientRef");

  let query = supabase
    .from(VIEW)
    .select(SELECT)
    .eq("facility_id", context.facilityId)
    .order("points_balance", { ascending: false });

  if (askedRef) {
    const clientId = await resolveClientRef(
      supabase,
      context.facilityId,
      askedRef,
    );
    // A ref nobody has is an empty list, not an error: asking whether a client
    // has an account is a legitimate question with "no" as an answer.
    if (!clientId) return NextResponse.json({ accounts: [] });
    query = query.eq("client_id", clientId);
  }

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({
    accounts: ((data ?? []) as unknown as AccountRow[]).map(toRow),
  });
}

/**
 * Open an account for a client.
 *
 * Idempotent by way of the `(facility_id, client_id)` unique constraint: a
 * second call returns the existing account rather than a duplicate or an error.
 * A customer can be enrolled from more than one place — the members screen, a
 * checkout, a booking — and none of them should have to check first.
 */
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
    clientRef?: number | string;
    referralCode?: string;
  } | null;

  if (body?.clientRef === undefined || body.clientRef === null) {
    return NextResponse.json(
      { error: "`clientRef` is required." },
      {
        status: 400,
      },
    );
  }

  const supabase = await createServerClient();

  const clientId = await resolveClientRef(
    supabase,
    context.facilityId,
    String(body.clientRef),
  );
  if (!clientId) {
    return NextResponse.json({ error: "No such client." }, { status: 404 });
  }

  const existing = await supabase
    .from(VIEW)
    .select(SELECT)
    .eq("facility_id", context.facilityId)
    .eq("client_id", clientId)
    .maybeSingle();

  if (existing.data) {
    return NextResponse.json({
      account: toRow(existing.data as unknown as AccountRow),
      created: false,
    });
  }

  // The facility comes from the SESSION, never from the request body. A
  // caller naming their own facility_id is how one facility writes into
  // another's data; `check:facility-from-session` fails the build on it.
  const { data: inserted, error } = await supabase
    .from("loyalty_accounts")
    .insert({
      facility_id: context.facilityId,
      client_id: clientId,
      referral_code: body.referralCode ?? null,
    })
    .select("id")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  // Read it back through the view, so a newly opened account is the same shape
  // as every other one — with spend and visits already on it rather than zeroes
  // the caller would have to refetch to correct.
  const { data } = await supabase
    .from(VIEW)
    .select(SELECT)
    .eq("id", (inserted as { id: string }).id)
    .single();

  return NextResponse.json(
    { account: toRow(data as unknown as AccountRow), created: true },
    { status: 201 },
  );
}
