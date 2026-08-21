import { NextResponse, type NextRequest } from "next/server";

import { getViewer } from "@/lib/auth/viewer";
import { createServerClient } from "@/lib/supabase/server";

// ============================================================================
// Giving a reward back when the payment it was spent on never happened.
//
// Checkout consumes the voucher BEFORE it charges — the right order, because
// the alternative is taking money off a bill for a reward that turns out to be
// already spent. The cost of that order is a window: the charge fails and the
// voucher is gone. This is the undo for exactly that window.
//
// `release_loyalty_voucher` only moves a `used` voucher back to `active`. One
// that expired or was cancelled stays where it is — a failed payment nearby is
// not a reason to revive it — and calling this twice is not an error.
// ============================================================================

export const dynamic = "force-dynamic";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const viewer = await getViewer().catch(() => null);
  if (!viewer || viewer.source !== "session") {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const { id } = await params;
  const supabase = await createServerClient();

  const { data, error } = await supabase.rpc("release_loyalty_voucher", {
    p_voucher_id: id,
  });

  if (error) {
    const denied = error.message.includes("permission");
    return NextResponse.json(
      { error: error.message },
      { status: denied ? 403 : 400 },
    );
  }

  const row = data as unknown as { id: string; status: string };
  return NextResponse.json({
    voucher: { id: row.id, status: row.status },
  });
}
