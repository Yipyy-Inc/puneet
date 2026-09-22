import { NextResponse, type NextRequest } from "next/server";

import { createServerClient } from "@/lib/supabase/server";
import { getViewer } from "@/lib/auth/viewer";

export const dynamic = "force-dynamic";

// ============================================================================
// What a cancellation costs, for the front desk.
//
// The SAME evaluator the customer's own preview reads — `booking_cancel_terms`
// wraps `private.cancellation_terms`, which is the only thing in the product
// that turns a policy into a figure. Two screens showing two numbers for one
// cancellation is the failure this round of work keeps finding, and the way to
// not have it is to not have a second calculation.
//
// The facility is NOT taken from the request: the function looks the booking
// up and checks `edit_bookings` against that booking's own facility, so a
// staff member from somewhere else is answered exactly as a stranger is —
// with null, which this turns into a 404. A refusal that distinguishes "not
// yours" from "not real" tells the caller the booking exists.
// ============================================================================

type UntypedRpc = (
  fn: "booking_cancel_terms",
  args: Record<string, unknown>,
) => PromiseLike<{
  data: unknown;
  error: { message: string } | null;
}>;

export interface StaffCancelTerms {
  status: string;
  cancellable: boolean;
  withdrawal: boolean;
  started: boolean;
  late: boolean;
  noticeHours: number | null;
  noticeGivenHours: number | null;
  feePercentage: number | null;
  source: "policy" | "booking_rules" | "none";
  tierId: string | null;
  tierLabel: string | null;
  charge: "none" | "keep_deposit" | "percentage" | "flat" | "forfeit_pass";
  amount: number;
  refund: "none" | "original" | "store_credit";
  forfeitsPass: boolean;
  customerMayCancel: "instant" | "request";
  totalCost: number;
  amountPaid: number;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ ref: string }> },
) {
  const viewer = await getViewer().catch(() => null);
  if (!viewer || viewer.source !== "session") {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const raw = (await params).ref;
  if (!/^\d{1,12}$/.test(raw)) {
    return NextResponse.json({ error: "No such booking." }, { status: 404 });
  }

  const supabase = await createServerClient();
  const rpc = supabase.rpc.bind(supabase) as unknown as UntypedRpc;
  const { data, error } = await rpc("booking_cancel_terms", {
    p_ref: Number(raw),
  });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: "No such booking." }, { status: 404 });
  }
  return NextResponse.json(data as StaffCancelTerms);
}
