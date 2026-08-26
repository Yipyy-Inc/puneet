import { NextResponse } from "next/server";

import { getViewer } from "@/lib/auth/viewer";
import { createServerClient } from "@/lib/supabase/server";

// ============================================================================
// Removing a stored card.
//
// ── IT IS AN UPDATE, NOT A DELETE ─────────────────────────────────────────
//
// `payments.saved_card_id` references these rows and `payments` is append-only.
// Deleting a card would leave a ledger row unable to say what it was charged
// against, and the table has no DELETE grant for anybody — the migration
// asserts that, and `saved-cards.sql` proves it against the catalogue rather
// than believing the migration.
//
// So revoking sets `revoked_at`. The card stops being listed, stops being
// chargeable, and the history stays readable.
//
// ── AND row_count IS CHECKED ──────────────────────────────────────────────
//
// RLS filters rows before the WHERE predicate is evaluated, so an update the
// caller may not perform succeeds and changes NOTHING. That exact shape shipped
// once: `unattached_payments` had an UPDATE policy and no `grant update`, so
// every attach reported success having moved no row, and the screen went on
// offering the payment (20260824190000). A 204 that changed nothing is a lie
// about a stored payment credential, so the count decides the answer.
// ============================================================================

export const dynamic = "force-dynamic";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const viewer = await getViewer().catch(() => null);
  if (!viewer || viewer.source !== "session") {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const { id } = await params;
  const supabase = await createServerClient();

  // As the caller, so `saved_cards_update` is the authorisation — the customer
  // themselves, or somebody who may take a payment at that facility.
  const { data, error } = await supabase
    .from("saved_cards")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", id)
    .is("revoked_at", null)
    .select("id");

  if (error) {
    return NextResponse.json(
      { error: "The card could not be removed." },
      { status: 502 },
    );
  }

  if (!data || data.length === 0) {
    // Either it does not exist, it was already revoked, or the policy filtered
    // it away. Which of the three is not the caller's to learn — but it is
    // emphatically NOT a success, and must never be reported as one.
    return NextResponse.json(
      { error: "That card could not be removed." },
      { status: 404 },
    );
  }

  return NextResponse.json({ removed: data[0].id });
}
