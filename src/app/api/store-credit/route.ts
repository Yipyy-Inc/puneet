import { NextResponse, type NextRequest } from "next/server";

import { createServerClient, getCurrentUser } from "@/lib/supabase/server";
import { getFacilityContext } from "@/lib/api/facility-context";
import { writeFailure } from "@/lib/api/write-failure";

// ============================================================================
// Prepaid credit is store credit.
//
// ── THERE WERE TWO OF THEM ────────────────────────────────────────────────
//
// `store_credit_entries` is the real ledger: `record_payment` spends from it,
// a refund to store credit writes into it, and `client_store_credit` sums it.
// Meanwhile /facility/services/memberships kept `prepaidCredits` — a fixture
// list whose "Add credits" dialog took a TYPED-IN CUSTOMER NAME and invented an
// id (`cust-${Date.now()}`) to hang it on. So a facility could issue $200 of
// credit to a customer who did not exist, and the customer's real balance —
// the one the till actually honours — never moved.
//
// One ledger, and this is the door to it.
//
// ── WHAT IS NOT HERE, AND WHY ─────────────────────────────────────────────
//
// AN EXPIRY DATE. The fixture had `expiresAt` per credit; the ledger has no
// such column, and that is the better model: `expired` is one of its REASONS,
// so expiry is recorded as a negative entry on the day it happens rather than
// as a promise stored next to the money. A date field would need a job to
// enforce it, and until that job exists the field is a claim the system cannot
// keep.
//
// ── THE PERMISSION SPLIT IS THE POLICY'S, NOT THIS FILE'S ─────────────────
//
// `store_credit_insert` asks for `process_refund` to ADD credit and
// `financial_take_payment` to spend it — giving money away and taking money in
// are different rights. An INSERT refused by `with check` RAISES, so both come
// back as a 403 rather than a silent no-op.
// ============================================================================

export const dynamic = "force-dynamic";

interface IssueInput {
  clientRef?: number;
  amount?: number;
  note?: string;
  /** 'added' to issue, 'adjustment' to correct or zero a balance. */
  reason?: "added" | "adjustment";
}

interface EntryRow {
  id: string;
  client_id: string;
  amount: number | string;
  reason: string;
  note: string;
  author_name: string;
  created_at: string;
}

export async function GET(request: NextRequest) {
  const user = await getCurrentUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const supabase = await createServerClient();
  const url = new URL(request.url);
  const clientRef = url.searchParams.get("clientRef");

  const { data: clientRows, error: clientError } = await supabase
    .from("clients")
    .select("id, ref, name, email");
  if (clientError) {
    return NextResponse.json({ error: clientError.message }, { status: 500 });
  }
  const clients = (clientRows ?? []) as {
    id: string;
    ref: number;
    name: string;
    email: string | null;
  }[];
  const byId = new Map(clients.map((c) => [c.id, c]));

  let query = supabase
    .from("store_credit_entries")
    .select("id, client_id, amount, reason, note, author_name, created_at")
    .order("created_at", { ascending: false });

  if (clientRef) {
    const match = clients.find((c) => c.ref === Number(clientRef));
    if (!match) {
      return NextResponse.json(
        { error: "That client does not exist, or is not yours." },
        { status: 404 },
      );
    }
    query = query.eq("client_id", match.id);
  }

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const entries = (data ?? []) as unknown as EntryRow[];

  // The balance and the totals are THIS SUM, not stored columns. The fixture
  // kept `balance`, `totalPurchased` and `totalUsed` side by side — three
  // numbers for one fact, and nothing keeping them in step.
  const accounts = new Map<
    string,
    {
      clientRef: number;
      clientName: string;
      balance: number;
      totalIssued: number;
      totalSpent: number;
      lastActivityAt: string | null;
      lastSpentAt: string | null;
      entryCount: number;
    }
  >();

  for (const entry of entries) {
    const client = byId.get(entry.client_id);
    if (!client) continue;
    const amount = Number(entry.amount);
    const acc = accounts.get(entry.client_id) ?? {
      clientRef: client.ref,
      clientName: client.name,
      balance: 0,
      totalIssued: 0,
      totalSpent: 0,
      lastActivityAt: null as string | null,
      lastSpentAt: null as string | null,
      entryCount: 0,
    };
    acc.balance += amount;
    if (amount > 0) acc.totalIssued += amount;
    else {
      acc.totalSpent += -amount;
      if (!acc.lastSpentAt) acc.lastSpentAt = entry.created_at;
    }
    if (!acc.lastActivityAt) acc.lastActivityAt = entry.created_at;
    acc.entryCount += 1;
    accounts.set(entry.client_id, acc);
  }

  return NextResponse.json({
    accounts: [...accounts.values()].sort((a, b) => b.balance - a.balance),
    entries: entries.map((e) => ({
      id: e.id,
      clientRef: byId.get(e.client_id)?.ref ?? 0,
      amount: Number(e.amount),
      reason: e.reason,
      note: e.note,
      authorName: e.author_name,
      createdAt: e.created_at,
    })),
  });
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as IssueInput | null;
  if (!body || !Number.isFinite(body.clientRef)) {
    return NextResponse.json({ error: "Which client?" }, { status: 422 });
  }

  const amount = Number(body.amount);
  if (!Number.isFinite(amount) || amount === 0) {
    return NextResponse.json(
      { error: "An entry of zero is not a movement." },
      { status: 422 },
    );
  }

  const reason = body.reason ?? "added";
  // The CHECK enforces this too (`store_credit_sign_matches_reason`); saying it
  // here turns a constraint name into a sentence.
  if (reason === "added" && amount < 0) {
    return NextResponse.json(
      { error: "Adding credit takes a positive amount." },
      { status: 422 },
    );
  }

  const context = await getFacilityContext();
  if (!context) {
    return NextResponse.json(
      { error: "No facility for this session." },
      { status: 403 },
    );
  }

  const supabase = await createServerClient();
  const { data: client } = await supabase
    .from("clients")
    .select("id")
    .eq("ref", body.clientRef!)
    .maybeSingle();

  if (!client) {
    return NextResponse.json(
      { error: "That client does not exist, or is not yours." },
      { status: 404 },
    );
  }

  const { data, error } = await supabase
    .from("store_credit_entries")
    .insert({
      facility_id: context.facilityId,
      client_id: (client as { id: string }).id,
      amount,
      reason,
      note: body.note?.trim() || "",
    } as never)
    .select("id")
    .single();

  if (error) {
    return writeFailure(error, {
      denied:
        amount > 0
          ? "Not allowed to issue store credit at this facility."
          : "Not allowed to spend store credit at this facility.",
      duplicate: "That entry has already been recorded.",
    });
  }

  return NextResponse.json(
    { id: (data as { id: string }).id },
    { status: 201 },
  );
}
