import { NextResponse, type NextRequest } from "next/server";

import { createServerClient, getCurrentUser } from "@/lib/supabase/server";
import {
  CLIENT_SELECT,
  clientToRow,
  rowToClient,
} from "@/lib/api/mappers/client";
import { getFacilityContext } from "@/lib/api/facility-context";
import { writeFailure } from "@/lib/api/write-failure";
import type { Client } from "@/types/client";

// ============================================================================
// One client, by the app-facing numeric ref.
//
// PATCH rather than PUT: callers send what they changed, and clientToRow maps
// only what it is given. A full replace would blank every column the caller
// omitted — which on this table means losing an address because a phone number
// was corrected.
//
// WHAT MAY ACTUALLY BE CHANGED is not decided here. `clients_update` admits the
// record's OWNER, and RLS gates rows rather than columns, so the rules live in
// the database (20260803090000) where PostgREST cannot go round them:
//
//   raises   any change of facility_id, profile_id or ref by a caller without
//            edit_clients — a record moved to another business is not an edit
//   reverts  status, is_blocked, blocked_at/reason, outstanding_balance,
//            no_show_count, last_visit_date, and the membership / packages /
//            storeCredit entries in `details`
//
// This handler's job is to merge honestly and report what was actually stored.
// ============================================================================

export const dynamic = "force-dynamic";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ ref: string }> },
) {
  const user = await getCurrentUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const { ref } = await params;
  const numericRef = Number(ref);
  if (!Number.isFinite(numericRef)) {
    return NextResponse.json({ error: "Invalid client id." }, { status: 400 });
  }

  const input = (await request.json()) as Partial<Client>;
  const supabase = await createServerClient();

  // Read the stored row first and merge onto it, because `details` is replaced
  // wholesale rather than deep-merged. Without this, a caller sending only
  // `phone` would drop the saved cards, the additional contacts and everything
  // else in the tail.
  //
  // Merging the FULL stored details is what makes the trigger's revert work as
  // intended rather than as a data-loss bug: a customer who never sees
  // storeCredit sends it back absent, the merge restores it from storage, and
  // the trigger has the same value to preserve either way.
  const { data: existing, error: readError } = await supabase
    .from("clients")
    .select("id, details")
    .eq("ref", numericRef)
    .maybeSingle();

  if (readError) {
    return NextResponse.json({ error: readError.message }, { status: 500 });
  }
  if (!existing) {
    // Unreadable and absent are the same answer here, on purpose: telling a
    // caller that a client they may not see EXISTS is itself a disclosure.
    return NextResponse.json({ error: "Client not found." }, { status: 404 });
  }

  const row = clientToRow(input);
  if (row.details) {
    row.details = {
      ...((existing.details ?? {}) as Record<string, unknown>),
      ...(row.details as Record<string, unknown>),
    } as typeof row.details;
  }

  const { data: updated, error } = await supabase
    .from("clients")
    .update(row as never)
    .eq("id", existing.id)
    .select(CLIENT_SELECT)
    .single();

  if (error) {
    return writeFailure(error, {
      denied: "Not allowed to edit this client.",
      duplicate: "Someone with that email is already a client here.",
    });
  }

  const context = await getFacilityContext();

  // Echoed back from the STORED row, not the request. The trigger may have
  // reverted a balance the caller tried to clear, and a response that repeated
  // the request would show them a zero the database refused.
  return NextResponse.json(
    rowToClient(updated, context?.name ?? "Example Pet Care Facility"),
  );
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ ref: string }> },
) {
  const user = await getCurrentUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const { ref } = await params;
  const numericRef = Number(ref);
  if (!Number.isFinite(numericRef)) {
    return NextResponse.json({ error: "Invalid client id." }, { status: 400 });
  }

  const supabase = await createServerClient();

  // `clients_delete` needs delete_clients — a permission distinct from
  // edit_clients precisely because this is not an edit. A customer cannot
  // delete their own record, and neither can most staff.
  //
  // Pets cascade with the owner (`on delete cascade`), which is the right shape:
  // an animal's record has no meaning without the person responsible for it.
  //
  // A refusal matches ZERO ROWS rather than erroring, so "denied" and "already
  // gone" are indistinguishable from the result alone. Reading back tells them
  // apart — the same shape the roles-override route uses.
  // rls-write-ok: the survivor read-back below turns a zero-row refusal
  // into the 403 it was.
  const { error } = await supabase
    .from("clients")
    .delete()
    .eq("ref", numericRef);

  if (error) {
    return writeFailure(error, {
      denied: "Not allowed to remove this client.",
      duplicate: "",
    });
  }

  const { data: survivor } = await supabase
    .from("clients")
    .select("ref")
    .eq("ref", numericRef)
    .maybeSingle();

  if (survivor) {
    return NextResponse.json(
      { error: "Not allowed to remove this client." },
      { status: 403 },
    );
  }

  return new NextResponse(null, { status: 204 });
}
