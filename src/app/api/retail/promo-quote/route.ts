import { NextResponse, type NextRequest } from "next/server";

import { createServerClient, getCurrentUser } from "@/lib/supabase/server";
import { getFacilityContext } from "@/lib/api/facility-context";

// ============================================================================
// What a promo code takes off a basket at the till — asked before the sale,
// so the screen can show it (quote_promo_code, 20260911180840).
//
// The till's "Apply" checked `@/data/retail`'s two promo codes from 2024 and
// said `alert("Invalid promo code")`. This asks the database the same
// question record_retail_sale will ask again, under lock, when the sale is
// rung up — so a code used up between the two is refused then, not honoured.
// ============================================================================

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const user = await getCurrentUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }
  const body = (await request.json().catch(() => null)) as {
    code?: string;
    amount?: number;
    clientRef?: number;
  } | null;
  if (!body?.code?.trim() || !Number.isFinite(body.amount)) {
    return NextResponse.json(
      { error: "Enter a code.", reason: "promo_unknown" },
      { status: 422 },
    );
  }
  const facility = await getFacilityContext();
  if (!facility) {
    return NextResponse.json({ error: "Facility not found." }, { status: 500 });
  }
  const supabase = await createServerClient();
  let clientId: string | null = null;
  if (body.clientRef) {
    const { data: client } = await supabase
      .from("clients")
      .select("id")
      .eq("ref", body.clientRef)
      .eq("facility_id", facility.facilityId)
      .maybeSingle();
    clientId = (client?.id as string | undefined) ?? null;
  }
  const { data, error } = await supabase.rpc("quote_promo_code", {
    p_facility_id: facility.facilityId,
    p_code: body.code,
    p_client_id: clientId,
    p_service: "retail",
    p_amount: Number(body.amount),
  });
  if (error) {
    return NextResponse.json(
      { error: error.message, reason: error.hint || null },
      { status: error.code === "42501" ? 403 : 409 },
    );
  }
  return NextResponse.json(data);
}
