import { NextResponse, type NextRequest } from "next/server";

import { createServerClient, getCurrentUser } from "@/lib/supabase/server";
import { writeFailure } from "@/lib/api/write-failure";

// ============================================================================
// "Apply the changes to all unconfirmed upcoming appointments?" (2026-09-30)
//
// The question the reference asks after an add-on is edited. An add-on on a
// booking is a bill line carrying its own name, price, tax and minutes, so an
// edit to the add-on does not reach the bookings that already hold it — which
// is right for a confirmed booking, and a choice for one that is not.
//
// GET counts the bookings the answer "yes" would change; POST changes them.
// Both are the database's (`add_on_upcoming_bookings`,
// `apply_add_on_to_upcoming`): they read the facility from the add-on's own
// row and refuse a caller who may not manage its services, so nothing here
// takes a facility from the request.
// ============================================================================

export const dynamic = "force-dynamic";

/** An add-on's id here is always its uuid — see the add-on's own route. */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const REFUSALS = {
  duplicate: "Those appointments could not be changed.",
  denied: "You do not have permission to change this add-on.",
};

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const { id } = await params;
  if (!UUID.test(id)) {
    return NextResponse.json({ error: "No such add-on." }, { status: 404 });
  }

  const supabase = await createServerClient();
  const { data, error } = await supabase.rpc("add_on_upcoming_bookings", {
    p_add_on: id,
  });
  if (error) return writeFailure(error, REFUSALS);

  return NextResponse.json({ bookings: Number(data ?? 0) });
}

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const { id } = await params;
  if (!UUID.test(id)) {
    return NextResponse.json({ error: "No such add-on." }, { status: 404 });
  }

  const supabase = await createServerClient();
  const { data, error } = await supabase.rpc("apply_add_on_to_upcoming", {
    p_add_on: id,
  });
  if (error) return writeFailure(error, REFUSALS);

  return NextResponse.json({ applied: Number(data ?? 0) });
}
