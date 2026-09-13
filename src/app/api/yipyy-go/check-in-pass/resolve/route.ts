import { NextResponse, type NextRequest } from "next/server";

import { createServerClient, getCurrentUser } from "@/lib/supabase/server";
import { yipyyGoResolveBodySchema } from "@/lib/api/mappers/yipyy-go";
import { yipyyGoFailure } from "@/lib/yipyy-go/route-helpers";

// ============================================================================
// /api/yipyy-go/check-in-pass/resolve — the desk reads an owner's code.
//
// POST { code } — resolve_yipyy_go_check_in_pass(): the booking, when the code
//      is current and this member may check that service in. Every other
//      answer is the same 404, so a guess learns nothing about which codes
//      exist or where.
// ============================================================================

export const dynamic = "force-dynamic";

const NOT_HERE = "That check-in code is not valid here.";

export async function POST(request: NextRequest) {
  const user = await getCurrentUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const parsed = yipyyGoResolveBodySchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) {
    return NextResponse.json({ error: NOT_HERE }, { status: 404 });
  }

  const supabase = await createServerClient();
  const { data, error } = await supabase.rpc("resolve_yipyy_go_check_in_pass", {
    p_token: parsed.data.code,
  });
  if (error) return yipyyGoFailure(error);

  const match = (data ?? [])[0];
  if (!match) {
    return NextResponse.json({ error: NOT_HERE }, { status: 404 });
  }
  return NextResponse.json({ bookingRef: Number(match.booking_ref) });
}
