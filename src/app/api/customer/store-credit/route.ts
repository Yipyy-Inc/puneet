import { NextResponse } from "next/server";

import { createServerClient, getCurrentUser } from "@/lib/supabase/server";

// ============================================================================
// The signed-in owner's own store credit — balance and movements.
//
// ── THE WHOLE BOUNDARY IS IN THE DATABASE ─────────────────────────────────
//
// `store_credit_read` admits a platform admin or staff holding
// `financial_view_amounts`, and NOTHING else — there is no owner arm, so the
// person whose money it is cannot read the table. `my_store_credit()` and
// `my_store_credit_entries()` are SECURITY DEFINER projections keyed on
// `private.own_client_ids()`, which reads the caller's subject out of the JWT.
//
// So this route names no client and no facility. It cannot: the functions take
// the caller from the session and there is no argument through which a caller
// could ask about somebody else. Signed out, `own_client_ids()` returns no
// rows and both answer empty rather than refusing — nothing to distinguish,
// nothing to probe.
//
// They also withhold `note` and `author_name`, which are staff writing about a
// customer to other staff. See the migration header.
// ============================================================================

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const supabase = await createServerClient();

  const [accounts, entries] = await Promise.all([
    supabase.rpc("my_store_credit"),
    supabase.rpc("my_store_credit_entries", { p_limit: 200 }),
  ]);

  // A balance whose movements could not be read is not a balance with no
  // history — the same rule the gift-card ledger follows. Fail, rather than
  // render an empty statement beside a number.
  if (accounts.error) {
    return NextResponse.json(
      { error: accounts.error.message },
      { status: 400 },
    );
  }
  if (entries.error) {
    return NextResponse.json({ error: entries.error.message }, { status: 400 });
  }

  return NextResponse.json({
    accounts: (accounts.data ?? []).map((row) => ({
      facilityId: row.facility_id,
      facilityName: row.facility_name,
      balance: Number(row.balance),
      totalIn: Number(row.total_in),
      totalOut: Number(row.total_out),
      entryCount: Number(row.entry_count),
      lastActivityAt: row.last_activity_at,
    })),
    entries: (entries.data ?? []).map((row) => ({
      id: row.id,
      facilityId: row.facility_id,
      amount: Number(row.amount),
      reason: row.reason,
      createdAt: row.created_at,
    })),
  });
}
