import { NextResponse, type NextRequest } from "next/server";

import { createServerClient, getCurrentUser } from "@/lib/supabase/server";

// ============================================================================
// A customer views, accepts or declines their own estimate.
//
// One call to `respond_to_estimate` (20260911113556), which checks that the
// estimate is the caller's, still open and not expired, and — for an
// acceptance — that the facility lets customers accept online. It can change
// the status and the history and nothing else; the price is not the
// customer's to touch. This route checks none of that itself.
// ============================================================================

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ key: string }> },
) {
  const user = await getCurrentUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }
  const { key } = await params;
  const body = (await request.json().catch(() => null)) as {
    action?: string;
    reason?: string;
  } | null;
  const action = body?.action;
  if (action !== "view" && action !== "accept" && action !== "decline") {
    return NextResponse.json(
      { error: "An estimate is viewed, accepted or declined." },
      { status: 422 },
    );
  }

  const supabase = await createServerClient();
  const { data, error } = await supabase.rpc(
    "respond_to_estimate" as never,
    {
      p_estimate_id: key,
      p_action: action,
      p_reason: body?.reason ?? null,
    } as never,
  );
  if (error) {
    const status =
      error.code === "42501" ? 403 : error.code === "22023" ? 409 : 500;
    return NextResponse.json({ error: error.message }, { status });
  }
  return NextResponse.json(data);
}
