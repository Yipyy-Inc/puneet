import { NextResponse, type NextRequest } from "next/server";

import { createServerClient, getCurrentUser } from "@/lib/supabase/server";

// ============================================================================
// Receive what arrived against a purchase order (receive_purchase_order,
// 20260911180840).
//
// The receiving screen changed the fixture's stock in place, computed the
// order's new status and threw it away. Each received line is a `received`
// movement on the stock ledger now, and the order's status — partly received
// or received — is decided by the database from what has arrived in total.
// retail_manage_inventory decides.
// ============================================================================

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }
  const { id } = await params;
  const body = (await request.json().catch(() => null)) as {
    lines?: { index: number; quantity: number; unitCost?: number }[];
    authorName?: string;
  } | null;
  const lines = (body?.lines ?? []).filter(
    (l) => Number.isInteger(l.index) && Number(l.quantity) > 0,
  );
  if (lines.length === 0) {
    return NextResponse.json({ error: "Enter what arrived." }, { status: 422 });
  }
  const supabase = await createServerClient();
  const { data, error } = await supabase.rpc("receive_purchase_order", {
    p_po_id: id,
    p_lines: lines.map((l) => ({
      index: l.index,
      quantity: Math.round(Number(l.quantity)),
      ...(l.unitCost !== undefined && Number.isFinite(l.unitCost)
        ? { unitCost: Number(l.unitCost) }
        : {}),
    })),
    p_author_name: body?.authorName ?? "",
  });
  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: error.code === "42501" ? 403 : 409 },
    );
  }
  return NextResponse.json(data);
}
