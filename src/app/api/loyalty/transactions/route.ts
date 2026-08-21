import { NextResponse, type NextRequest } from "next/server";

import { getFacilityContext } from "@/lib/api/facility-context";
import { ownStaffId } from "@/lib/api/own-staff";
import { getViewer } from "@/lib/auth/viewer";
import { createServerClient } from "@/lib/supabase/server";

// ============================================================================
// The points ledger: what moved, when, and why.
//
// ── POSTING IS THE ONLY WAY POINTS MOVE ───────────────────────────────────
//
// There is no endpoint that sets a balance. An INSERT here fires the trigger
// that applies `points` to the account, refuses an overdraft, and keeps the
// lifetime totals in step. So every balance on the platform has a row
// explaining it, and the two cannot drift.
//
// ── AND NOTHING HERE CAN EDIT THE PAST ────────────────────────────────────
//
// No PATCH, no DELETE, and it is not politeness: `loyalty_transactions` has no
// UPDATE policy and a trigger that refuses one, so the route could not do it
// even if it tried. Correcting a mistake means posting the opposite entry,
// which is what a ledger is for and what leaves the correction visible.
// ============================================================================

export const dynamic = "force-dynamic";

const KINDS = [
  "earned",
  "redeemed",
  "expired",
  "adjusted",
  "referral",
] as const;
const SOURCES = [
  "booking",
  "pos",
  "online_payment",
  "membership",
  "package",
  "referral",
  "manual",
  "expiry",
] as const;

type Kind = (typeof KINDS)[number];
type Source = (typeof SOURCES)[number];

export interface LoyaltyTransactionRow {
  id: string;
  accountId: string;
  kind: Kind;
  /** Signed: positive added points, negative took them away. */
  points: number;
  description: string;
  source: Source;
  sourceId: string | null;
  bookingId: string | null;
  staffName: string | null;
  reason: string | null;
  createdAt: string;
}

interface Row {
  id: string;
  account_id: string;
  kind: Kind;
  points: number;
  description: string;
  source: Source;
  source_id: string | null;
  booking_id: string | null;
  reason: string | null;
  created_at: string;
  // To-one embed: an object, not an array.
  staff: { first_name: string | null; last_name: string | null } | null;
}

const SELECT =
  "id, account_id, kind, points, description, source, source_id, " +
  "booking_id, reason, created_at, staff:staff(first_name, last_name)";

function toRow(row: Row): LoyaltyTransactionRow {
  const name = [row.staff?.first_name, row.staff?.last_name]
    .filter(Boolean)
    .join(" ")
    .trim();
  return {
    id: row.id,
    accountId: row.account_id,
    kind: row.kind,
    points: row.points,
    description: row.description,
    source: row.source,
    sourceId: row.source_id,
    bookingId: row.booking_id,
    staffName: name.length > 0 ? name : null,
    reason: row.reason,
    createdAt: row.created_at,
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
    .from("loyalty_transactions")
    .select(SELECT)
    .eq("facility_id", context.facilityId)
    .order("created_at", { ascending: false })
    .limit(500);

  const account = params.get("account");
  if (account) query = query.eq("account_id", account);

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({
    transactions: ((data ?? []) as unknown as Row[]).map(toRow),
  });
}

/** Post a ledger entry. This is how points move. */
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
    kind?: string;
    points?: number;
    description?: string;
    source?: string;
    sourceId?: string;
    bookingId?: string;
    reason?: string;
  } | null;

  if (!body?.accountId) {
    return NextResponse.json(
      { error: "`accountId` is required." },
      {
        status: 400,
      },
    );
  }
  const points = body.points;
  if (!Number.isInteger(points) || points === 0 || points === undefined) {
    return NextResponse.json(
      { error: "`points` must be a whole number and cannot be zero." },
      { status: 400 },
    );
  }
  if (!body.description?.trim()) {
    return NextResponse.json(
      { error: "`description` is required — a ledger entry says why." },
      { status: 400 },
    );
  }

  const kind = (body.kind ?? "adjusted") as Kind;
  const source = (body.source ?? "manual") as Source;
  if (!KINDS.includes(kind)) {
    return NextResponse.json(
      { error: `Unknown kind '${kind}'.` },
      {
        status: 400,
      },
    );
  }
  if (!SOURCES.includes(source)) {
    return NextResponse.json(
      { error: `Unknown source '${source}'.` },
      {
        status: 400,
      },
    );
  }

  const supabase = await createServerClient();

  // The account decides the facility, not the caller. A caller naming a
  // facility is how one facility writes into another's ledger.
  const account = await supabase
    .from("loyalty_accounts")
    .select("id, facility_id")
    .eq("id", body.accountId)
    .maybeSingle();

  const facilityId = (account.data as { facility_id: string } | null)
    ?.facility_id;
  if (!facilityId || facilityId !== context.facilityId) {
    return NextResponse.json(
      { error: "No such loyalty account." },
      {
        status: 404,
      },
    );
  }

  // Who posted it. Undefined for an admin with no staff row, which is a real
  // state rather than an error — the entry simply has no author.
  const staffId = await ownStaffId(supabase, viewer, context.facilityId);

  const { data, error } = await supabase
    .from("loyalty_transactions")
    .insert({
      facility_id: context.facilityId,
      account_id: body.accountId,
      kind,
      points,
      description: body.description.trim(),
      source,
      source_id: body.sourceId ?? null,
      booking_id: body.bookingId ?? null,
      staff_id: staffId ?? null,
      reason: body.reason?.trim() || null,
    })
    .select(SELECT)
    .single();

  if (error) {
    // An overdraft and a refused permission both land here. The database's
    // own sentence is better than anything this route could invent — it names
    // the balance and what was asked for.
    const denied = error.message.includes("permission");
    return NextResponse.json(
      { error: error.message },
      { status: denied ? 403 : 400 },
    );
  }

  return NextResponse.json(
    { transaction: toRow(data as unknown as Row) },
    { status: 201 },
  );
}
